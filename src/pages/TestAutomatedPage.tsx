import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { storage } from '../lib/storage';
import PrintOS from '../components/PrintOS';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { Play, CheckCircle2, Loader2, FileText, Download } from 'lucide-react';
import { SefazService } from '../lib/sefazService';

export default function TestAutomatedPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [salesToPrint, setSalesToPrint] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const runTests = async () => {
    setRunning(true);
    setLogs([]);
    try {
      addLog('Carregando configurações...');
      const sysSettings = await storage.getSettings();
      setSettings(sysSettings);

      addLog('Verificando Caixa...');
      let caixa = await storage.getCaixaAtual();
      if (!caixa) {
        addLog('Abrindo caixa de testes...');
        caixa = await storage.abrirCaixa(100);
      }

      const generatedSales = [];

      for (let i = 1; i <= 15; i++) {
        addLog(`--- Iniciando Fluxo do Cliente ${i} ---`);
        
        // 1. Cadastrar Cliente
        addLog(`Cadastrando Cliente ${i}...`);
        const client = await storage.saveClient({
          nome_completo: `Cliente Teste Automático ${i}`,
          cpf: `000.000.000-0${i}`,
          whatsapp: `6299999999${i}`,
        });

        // 2. Gerar O.S / Venda
        addLog(`Gerando Ordem de Serviço ${i}...`);
        const saleData = {
          cliente_id: client.id,
          cliente_nome: client.nome_completo,
          paciente_cpf: client.cpf,
          paciente_whatsapp: client.whatsapp,
          tecnico: 'Sistema Auto-Teste',
          tipo_lente: 'Lente Teste Premium',
          tratamento: 'Antirreflexo',
          od_esferico: -1.0,
          od_cilindrico: -0.5,
          od_eixo: 180,
          oe_esferico: -1.0,
          oe_cilindrico: -0.5,
          oe_eixo: 180,
          valor_base: 500,
          desconto: 0,
          valor_total: 500,
          forma_pagamento: 'Dinheiro',
          criado_em: new Date().toISOString()
        };
        const sale = await storage.registrarVenda(saleData);

        // 3. Gerar Nota Fiscal
        addLog(`Gerando Nota Fiscal para O.S. ${sale.os_number}...`);
        const nota = {
          cliente: client.nome_completo,
          cliente_doc: client.cpf,
          valor_total: 500,
          itens: [{
            produto_nome: `O.S. ${sale.os_number} - Lente Teste Premium`,
            quantidade: 1,
            valor_unitario: 500,
            ncm: '90031100'
          }],
          venda_id: sale.id,
          status: 'AUTORIZADA',
          natureza: 'Venda de Mercadoria Teste',
          cfop: '5102',
          chave_acesso: `TESTE${Math.random().toString().slice(2, 10)}`,
        };
        await storage.registrarNotaFiscal(nota);
        await storage.atualizarVendaFiscal(sale.id, nota.chave_acesso, 'https://sefaz.go.gov.br/danfe');

        generatedSales.push(sale);
        addLog(`Fluxo ${i} concluído!`);
      }

      setSalesToPrint(generatedSales);
      addLog('Iniciando o arquivamento em PDF (Processamento Visual)...');

      // Aguarda renderização do componente
      setTimeout(async () => {
        for (let i = 0; i < generatedSales.length; i++) {
          const s = generatedSales[i];
          const element = document.getElementById(`print-os-teste-${s.id}`);
          if (element) {
            addLog(`Arquivando e baixando PDF: O.S. ${s.os_number}...`);
            const opt = {
              margin: [10, 10, 10, 10], // Margens do A4
              filename: `OS_${s.os_number}_Teste.pdf`,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            // @ts-ignore
            await html2pdf().set(opt).from(element).save();
          }
        }
        addLog('✅ Bateria de testes e arquivamento em PDF concluída com sucesso!');
        setRunning(false);
        toast.success('Testes finalizados e PDFs arquivados!');
      }, 1500);

    } catch (e: any) {
      addLog(`Erro: ${e.message}`);
      setRunning(false);
    }
  };

  const runTestsAvulsos = async () => {
    setRunning(true);
    setLogs([]);
    try {
      addLog('Carregando configurações de Notas Avulsas...');
      const sysSettings = await storage.getSettings();
      setSettings(sysSettings);

      addLog('Verificando Caixa...');
      let caixa = await storage.getCaixaAtual();
      if (!caixa) {
        addLog('Abrindo caixa de testes...');
        caixa = await storage.abrirCaixa(100);
      }

      for (let i = 1; i <= 5; i++) {
        addLog(`--- Iniciando Emissão de Nota Avulsa ${i} ---`);
        
        const nomeCliente = `Cliente Avulso Teste ${i}`;
        const cpfCliente = `123.456.789-0${i}`;
        const itensAvulsos = [
          {
            descricao: `Armação Ótica Lìs Premium Teste ${i}`,
            quantidade: 1,
            valor_unitario: 189.90,
            ncm: '9003.11.00'
          }
        ];
        const totalNotaAvulsa = 189.90;

        const salePayload = {
          id: 'avulsa_teste_' + Math.random().toString(36).substr(2, 9),
          paciente_nome: nomeCliente,
          paciente_cpf: cpfCliente,
          valor_total: totalNotaAvulsa,
          criado_em: new Date().toISOString(),
          forma_pagamento: 'Dinheiro',
          status: 'PRONTA',
          items: itensAvulsos.map(item => ({
            produto_nome: item.descricao,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            ncm: item.ncm
          }))
        };

        addLog(`Transmitindo Nota Avulsa ${i} à SEFAZ-GO...`);
        const result = await SefazService.emitirNotaFiscal(salePayload);

        if (result.sucesso) {
          addLog(`Nota Avulsa ${i} AUTORIZADA! Chave: ${result.chave_acesso}`);
          
          const notaFaturamento = {
            id: salePayload.id,
            cliente: nomeCliente,
            cliente_doc: cpfCliente,
            valor_total: totalNotaAvulsa,
            itens: itensAvulsos.map(item => ({
              produto_nome: item.descricao,
              quantidade: item.quantidade,
              valor_unitario: item.valor_unitario,
              ncm: item.ncm
            })),
            status: 'AUTORIZADA',
            natureza: 'Venda Fiscal Avulsa Teste',
            cfop: '5102',
            chave_acesso: result.chave_acesso,
            danfe_url: result.danfe_url,
            protocolo: result.protocolo,
            xml: result.xml
          };

          await storage.registrarNotaFiscal(notaFaturamento);
          addLog(`Nota Avulsa ${i} registrada no banco com sucesso!`);
          addLog(`Visualizador DANFE: ${result.danfe_url}`);
        } else {
          addLog(`❌ Rejeição SEFAZ na Nota ${i}: ${result.motivo_rejeicao}`);
        }
      }

      addLog('✅ Bateria de testes de Notas Fiscais Avulsas concluída com sucesso!');
      setRunning(false);
      toast.success('Bateria de notas avulsas concluída!');
    } catch (e: any) {
      addLog(`Erro: ${e.message}`);
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="text-primary" /> Painel de Testes
          </h2>
          <p className="text-white/40 text-sm">Automação de cadastro, O.S, faturamento e PDF</p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-white/5 p-8 shadow-2xl">
        <div className="text-center space-y-4 mb-8">
          <p className="text-white/60">
            Este painel executa baterias de testes automatizados para validar a consistência fiscal e operacional do sistema.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
            <button 
              onClick={runTests}
              disabled={running}
              className="bg-primary text-black px-8 py-4 rounded-xl font-black text-sm shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {running ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
              {running ? 'Executando...' : 'Bateria de O.S. (15 itens)'}
            </button>
            <button 
              onClick={runTestsAvulsos}
              disabled={running}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-xl font-black text-sm shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {running ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
              {running ? 'Executando...' : 'Bateria de Notas Avulsas (5 itens)'}
            </button>
          </div>
        </div>

        <div className="bg-black/40 rounded-xl border border-white/5 p-4 h-[300px] overflow-y-auto font-mono text-sm space-y-2">
          {logs.length === 0 && <p className="text-white/20 italic text-center mt-32">Aguardando início dos testes...</p>}
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2 text-white/70">
              <span className="text-primary">{'>'}</span> {log}
            </div>
          ))}
        </div>
      </div>

      {/* Renderização oculta estática para o html2pdf capturar sem a classe print:block interferindo */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0 }}>
        {settings && salesToPrint.map(sale => (
          <div key={sale.id} id={`print-os-teste-${sale.id}`} style={{ width: '210mm', backgroundColor: 'white', padding: '10mm', color: 'black' }}>
             {/* Renderizamos o layout manualmente aqui ou usamos o PrintOS sem restrição de mídia */}
            <PrintOS sale={sale} settings={settings} />
          </div>
        ))}
      </div>
    </div>
  );
}

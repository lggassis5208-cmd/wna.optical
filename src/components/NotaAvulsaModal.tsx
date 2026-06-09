import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Send, CheckCircle, ExternalLink, RefreshCw, Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { SefazService } from '../lib/sefazService';
import { storage } from '../lib/storage';
import PrintNFe from './PrintNFe';
import PrintNFCe from './PrintNFCe';

interface NotaAvulsaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ItemAvulso {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  ncm: string;
}

export default function NotaAvulsaModal({ isOpen, onClose }: NotaAvulsaModalProps) {
  const [nome, setNome] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [ie, setIe] = useState('');
  const [itens, setItens] = useState<ItemAvulso[]>([
    { id: '1', descricao: 'Armação Ótica Lìs Premium', quantidade: 1, valor_unitario: 189.90, ncm: '9003.11.00' }
  ]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [danfeUrl, setDanfeUrl] = useState('');
  const [notaInfo, setNotaInfo] = useState<{ xml: string, chave: string } | null>(null);

  const [tipoImpressaoFisco, setTipoImpressaoFisco] = useState<'55' | '65' | null>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      storage.getSettings().then(setSettings);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItens([
      ...itens,
      {
        id: Math.random().toString(36).substr(2, 9),
        descricao: '',
        quantidade: 1,
        valor_unitario: 0,
        ncm: '9003.11.00'
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (itens.length === 1) {
      toast.warning('A nota deve conter pelo menos um item.');
      return;
    }
    setItens(itens.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof ItemAvulso, value: any) => {
    setItens(
      itens.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const totalNota = itens.reduce((acc, item) => acc + (item.quantidade * item.valor_unitario), 0);

  const handleEmitirNota = async () => {
    if (!nome) return toast.error('Nome do cliente é obrigatório.');
    if (!cpfCnpj) return toast.error('CPF/CNPJ do cliente é obrigatório.');
    
    const tokenCpf = cpfCnpj.replace(/\D/g, '');
    if (tokenCpf.length !== 11 && tokenCpf.length !== 14) {
      return toast.error('CPF ou CNPJ inválido. Digite 11 dígitos para CPF ou 14 para CNPJ.');
    }

    // Validar itens
    for (const item of itens) {
      if (!item.descricao.trim()) {
        return toast.error('Descrição do produto é obrigatória.');
      }
      if (item.quantidade <= 0) {
        return toast.error('A quantidade deve ser maior que 0.');
      }
      if (item.valor_unitario <= 0) {
        return toast.error('O valor unitário deve ser maior que 0.');
      }
      if (!item.ncm.trim()) {
        return toast.error('NCM do produto é obrigatório.');
      }
    }

    setLoading(true);

    try {
      // Monta objeto simulando venda simplificada para o SefazService
      const salePayload = {
        id: 'avulsa_' + Math.random().toString(36).substr(2, 9),
        paciente_nome: nome,
        paciente_cpf: cpfCnpj,
        valor_total: totalNota,
        criado_em: new Date().toISOString(),
        forma_pagamento: 'Dinheiro',
        status: 'PRONTA',
        items: itens.map(item => ({
          produto_nome: item.descricao,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          ncm: item.ncm
        }))
      };

      const result = await SefazService.emitirNotaFiscal(salePayload);
      
      if (result.sucesso) {
        setSuccess(true);
        setDanfeUrl(result.danfe_url || '');
        setNotaInfo({
          xml: result.xml || '',
          chave: result.chave_acesso || ''
        });

        // Registrar a nota fiscal emitida com sucesso no storage do sistema
        const notaFaturamento = {
          id: salePayload.id,
          cliente: nome,
          cliente_doc: cpfCnpj,
          valor_total: totalNota,
          itens: itens.map(item => ({
            produto_nome: item.descricao,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            ncm: item.ncm
          })),
          status: 'AUTORIZADA',
          natureza: 'Venda Fiscal Avulsa',
          cfop: '5102',
          chave_acesso: result.chave_acesso,
          danfe_url: result.danfe_url,
          protocolo: result.protocolo,
          xml: result.xml
        };

        try {
          await storage.registrarNotaFiscal(notaFaturamento);
        } catch (storageErr) {
          console.warn('Nota emitida mas caixa não estava aberto para registro contábil:', storageErr);
        }

        // Abre automaticamente em uma nova aba o PDF do DANFE oficial gerado pela API/governo
        if (result.danfe_url) {
          SefazService.abrirDanfe(result.danfe_url);
        }

        // Ativa a impressão local e dispara a janela do navegador
        const modelo = cpfCnpj.replace(/\D/g, '').length === 14 ? '55' : '65';
        setTipoImpressaoFisco(modelo);
        setTimeout(() => window.print(), 800);

        toast.success('Nota Fiscal Avulsa emitida com sucesso!');
      } else {
        toast.error(`Rejeição SEFAZ: ${result.motivo_rejeicao || 'Erro desconhecido junto à SEFAZ.'}`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao processar emissão.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setNome('');
    setCpfCnpj('');
    setIe('');
    setItens([{ id: '1', descricao: 'Armação Ótica Lìs Premium', quantidade: 1, valor_unitario: 189.90, ncm: '9003.11.00' }]);
    setSuccess(false);
    setDanfeUrl('');
    setNotaInfo(null);
    setTipoImpressaoFisco(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-surface w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Send size={20} className="text-primary" />
              Emitir Nota Fiscal Avulsa (Sefaz-GO)
            </h3>
            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-0.5">Emissão direta sem ordem de serviço</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {success ? (
            <div className="py-8 text-center space-y-6">
              <div className="w-16 h-16 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle size={36} />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-black text-white">Nota Fiscal Autorizada!</h4>
                <p className="text-xs text-white/40 max-w-sm mx-auto">
                  A nota fiscal avulsa foi gerada, assinada digitalmente e autorizada pela SEFAZ-GO.
                </p>
              </div>

              {danfeUrl && (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => SefazService.abrirDanfe(danfeUrl)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-black rounded-xl hover:scale-105 transition-all text-sm shadow-lg shadow-primary/10"
                    >
                      <ExternalLink size={16} />
                      Ver DANFE Oficial
                    </button>
                    <button
                      onClick={() => {
                        const modelo = cpfCnpj.replace(/\D/g, '').length === 14 ? '55' : '65';
                        setTipoImpressaoFisco(modelo);
                        setTimeout(() => window.print(), 300);
                      }}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#FFD700] text-black font-black rounded-xl hover:scale-105 transition-all text-sm shadow-lg shadow-[#FFD700]/10"
                    >
                      <Printer size={16} />
                      Imprimir / Gerar PDF
                    </button>
                    {notaInfo?.xml && (
                      <button
                        onClick={() => SefazService.baixarXML(notaInfo.chave, notaInfo.xml)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white font-black rounded-xl hover:scale-105 transition-all text-sm"
                      >
                        <Download size={16} />
                        Baixar XML
                      </button>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handleReset}
                className="text-xs text-white/40 hover:text-white underline font-medium block mx-auto pt-2"
              >
                Emitir Outra Nota Avulsa
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dados do Cliente */}
              <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-primary">Identificação do Destinatário</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Nome Completo / Razão Social</label>
                    <input
                      type="text"
                      placeholder="Ex: Lucas Souza"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">CPF ou CNPJ</label>
                    <input
                      type="text"
                      placeholder="Apenas números"
                      value={cpfCnpj}
                      onChange={(e) => setCpfCnpj(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-primary/50 transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Inscrição Estadual (I.E.)</label>
                    <input
                      type="text"
                      placeholder="Isento ou Nº"
                      value={ie}
                      onChange={(e) => setIe(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Itens da Nota */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary">Itens e Produtos</h4>
                  <button
                    onClick={handleAddItem}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl hover:bg-primary/20 transition-all"
                  >
                    <Plus size={12} />
                    Adicionar Item
                  </button>
                </div>

                <div className="space-y-3">
                  {itens.map((item, idx) => (
                    <div key={item.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3 relative group">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-white/30 uppercase">Item #{idx + 1}</span>
                        {itens.length > 1 && (
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-400/60 hover:text-red-400 p-1 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Remover Item"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-6 space-y-1.5">
                          <label className="text-[9px] font-bold text-white/40">Descrição</label>
                          <input
                            type="text"
                            placeholder="Nome da Armação/Lente/Acessório"
                            value={item.descricao}
                            onChange={(e) => handleUpdateItem(item.id, 'descricao', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-primary/50 transition-colors"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[9px] font-bold text-white/40 font-mono">Qtd</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantidade}
                            onChange={(e) => handleUpdateItem(item.id, 'quantidade', parseInt(e.target.value) || 1)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-primary/50 transition-colors font-mono"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[9px] font-bold text-white/40">Valor Un.</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.valor_unitario}
                            onChange={(e) => handleUpdateItem(item.id, 'valor_unitario', parseFloat(e.target.value) || 0)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-primary/50 transition-colors font-mono"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[9px] font-bold text-white/40">NCM</label>
                          <input
                            type="text"
                            placeholder="9003.11.00"
                            value={item.ncm}
                            onChange={(e) => handleUpdateItem(item.id, 'ncm', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-primary/50 transition-colors font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="p-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/30 uppercase font-black">Total da Nota</p>
              <p className="text-xl font-black text-white">R$ {totalNota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <button
              onClick={handleEmitirNota}
              disabled={loading}
              className="px-6 py-3 bg-primary text-black font-black rounded-xl hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50 text-xs shadow-lg shadow-primary/10"
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  Transmitindo Sefaz...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Emitir Nota Oficial
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {success && settings && tipoImpressaoFisco && (
        tipoImpressaoFisco === '55' ? (
          <PrintNFe 
            sale={{
              paciente_nome: nome,
              paciente_cpf: cpfCnpj,
              cliente_endereco: 'Não Informado',
              cliente_bairro: 'Não Informado',
              cliente_cep: '00000-000',
              valor_total: totalNota,
              criado_em: new Date().toISOString(),
              forma_pagamento: 'Dinheiro',
              itens: itens.map((item, idx) => ({
                id: String(idx + 1).padStart(3, '0'),
                nome: item.descricao,
                ncm: item.ncm,
                qtd: item.quantidade,
                vUn: item.valor_unitario,
                vTot: item.quantidade * item.valor_unitario,
              }))
            }}
            settings={settings}
            chaveAcesso={notaInfo?.chave || ''}
            protocolo={notaInfo?.protocolo || ''}
          />
        ) : (
          <PrintNFCe 
            sale={{
              paciente_nome: nome,
              paciente_cpf: cpfCnpj,
              valor_total: totalNota,
              criado_em: new Date().toISOString(),
              forma_pagamento: 'Dinheiro',
              itens: itens.map((item, idx) => ({
                id: String(idx + 1).padStart(3, '0'),
                nome: item.descricao,
                ncm: item.ncm,
                qtd: item.quantidade,
                vUn: item.valor_unitario,
                vTot: item.quantidade * item.valor_unitario,
              }))
            }}
            settings={settings}
            chaveAcesso={notaInfo?.chave || ''}
            protocolo={notaInfo?.protocolo || ''}
          />
        )
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Download, Share2, Calendar, DollarSign, ArrowUpCircle, ArrowDownCircle, CheckCircle2, AlertCircle, FileText, Loader2, Phone } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { movimentosService } from '../lib/services/movimentosService';
import { openWhatsApp } from '../lib/whatsappUtils';
import { toast } from 'sonner';

interface RelatorioCaixaModalProps {
  isOpen: boolean;
  onClose: () => void;
  caixa: any | null;
  movimentosInicial?: any[];
}

export default function RelatorioCaixaModal({ isOpen, onClose, caixa, movimentosInicial }: RelatorioCaixaModalProps) {
  const [movimentos, setMovimentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const relatorioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && caixa) {
      carregarMovimentos();
    }
  }, [isOpen, caixa]);

  const carregarMovimentos = async () => {
    if (!caixa) return;
    
    // Se recebemos movimentos iniciais da página pai e pertencem a este caixa, usamos logo
    if (movimentosInicial && movimentosInicial.length > 0 && movimentosInicial[0]?.caixa_id === caixa.id) {
      setMovimentos(movimentosInicial);
      return;
    }

    setLoading(true);
    try {
      const movs = await movimentosService.buscarMovimentosPorCaixa(caixa.id);
      setMovimentos(movs || []);
    } catch (e: any) {
      console.error('Erro ao carregar movimentos para relatório:', e);
      toast.error('Erro ao carregar movimentações do caixa: ' + e.message);
      setMovimentos(movimentosInicial || []);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !caixa) return null;

  // Cálculos financeiros do caixa
  const saldoInicial = Number(caixa.valor_inicial || 0);
  const entradas = movimentos
    .filter(m => m.tipo === 'ENTRADA' || m.tipo === 'SUPRIMENTO')
    .reduce((sum, m) => sum + Number(m.valor || 0), 0);
  const saidas = movimentos
    .filter(m => m.tipo === 'SAIDA' || m.tipo === 'DESPESA' || m.tipo === 'SANGRIA')
    .reduce((sum, m) => sum + Number(m.valor || 0), 0);
  const saldoFinal = saldoInicial + entradas - saidas;

  // Formas de pagamento nas Entradas
  const entradasPorForma = () => {
    const itens = movimentos.filter(m => m.tipo === 'ENTRADA' || m.tipo === 'SUPRIMENTO');
    const dinheiro = itens.filter(m => (m.forma_pagamento || '').toLowerCase().includes('dinheiro')).reduce((sum, m) => sum + Number(m.valor || 0), 0);
    const pix = itens.filter(m => (m.forma_pagamento || '').toLowerCase().includes('pix')).reduce((sum, m) => sum + Number(m.valor || 0), 0);
    const cartao = itens.filter(m => {
      const f = (m.forma_pagamento || '').toLowerCase();
      return f.includes('cartão') || f.includes('cartao') || f.includes('crédito') || f.includes('débito');
    }).reduce((sum, m) => sum + Number(m.valor || 0), 0);
    const outros = itens.filter(m => {
      const f = (m.forma_pagamento || '').toLowerCase();
      return !f.includes('dinheiro') && !f.includes('pix') && !f.includes('cartão') && !f.includes('cartao') && !f.includes('crédito') && !f.includes('débito');
    }).reduce((sum, m) => sum + Number(m.valor || 0), 0);

    return { dinheiro, pix, cartao, outros };
  };

  // Formas nas Saídas
  const saidasPorForma = () => {
    const itens = movimentos.filter(m => m.tipo === 'SAIDA' || m.tipo === 'DESPESA' || m.tipo === 'SANGRIA');
    const dinheiro = itens.filter(m => (m.forma_pagamento || '').toLowerCase().includes('dinheiro')).reduce((sum, m) => sum + Number(m.valor || 0), 0);
    const pix = itens.filter(m => (m.forma_pagamento || '').toLowerCase().includes('pix')).reduce((sum, m) => sum + Number(m.valor || 0), 0);
    const outros = itens.filter(m => {
      const f = (m.forma_pagamento || '').toLowerCase();
      return !f.includes('dinheiro') && !f.includes('pix');
    }).reduce((sum, m) => sum + Number(m.valor || 0), 0);

    return { dinheiro, pix, outros };
  };

  const formEntradas = entradasPorForma();
  const formSaidas = saidasPorForma();

  const dataAberturaFmt = caixa.data_abertura ? format(parseISO(caixa.data_abertura), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-';
  const dataFechamentoFmt = caixa.data_fechamento ? format(parseISO(caixa.data_fechamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Caixa Em Operação (Aberto)';
  const dataAtualFmt = format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR });

  // 1. Função para Imprimir no Navegador / Salvar como PDF nativo
  const handlePrint = () => {
    window.print();
  };

  // 2. Função para Gerar arquivo PDF e Baixar (html2pdf)
  const handleDownloadPDF = async () => {
    if (!relatorioRef.current) return;
    setGeneratingPdf(true);
    toast.info('Gerando arquivo PDF de auditoria...');

    try {
      const opt = {
        margin:       10,
        filename:     `Relatorio_Caixa_${caixa.data_abertura ? caixa.data_abertura.split('T')[0] : 'Diario'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set(opt).from(relatorioRef.current).save();
      
      toast.success('Relatório PDF baixado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Não foi possível gerar o PDF. Tente usar a opção "Imprimir / PDF nativo".');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // 3. Compartilhar por WhatsApp
  const handleShareWhatsApp = () => {
    const texto = `*📊 RELATÓRIO DE FECHAMENTO DE CAIXA — ÓTICA LIS*\n` +
      `-----------------------------------------\n` +
      `🕒 *Abertura:* ${dataAberturaFmt}\n` +
      `🕒 *Fechamento:* ${dataFechamentoFmt}\n` +
      `📋 *Status:* ${caixa.status === 'ABERTO' ? '🟢 ABERTO' : '🔴 FECHADO'}\n` +
      `-----------------------------------------\n` +
      `💼 *Saldo Inicial:* R$ ${saldoInicial.toFixed(2)}\n` +
      `📈 *Entradas (+) :* R$ ${entradas.toFixed(2)}\n` +
      `📉 *Saídas (-)   :* R$ ${saidas.toFixed(2)}\n` +
      `💰 *SALDO FINAL  :* *R$ ${saldoFinal.toFixed(2)}*\n` +
      `-----------------------------------------\n` +
      `*DETALHE DE ENTRADAS:*\n` +
      `💵 Dinheiro: R$ ${formEntradas.dinheiro.toFixed(2)}\n` +
      `⚡ PIX: R$ ${formEntradas.pix.toFixed(2)}\n` +
      `💳 Cartão: R$ ${formEntradas.cartao.toFixed(2)}\n` +
      `-----------------------------------------\n` +
      `📌 _Relatório gerado em ${dataAtualFmt}_`;

    // Pergunta o número ou abre sem número no WhatsApp do computador/celular para escolher o contato
    const numero = window.prompt('Digite o número do WhatsApp com DDD para enviar (ou deixe em branco para escolher no WhatsApp):', '');
    if (numero !== null) {
      openWhatsApp(numero ? numero.replace(/\D/g, '') : '', texto);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300 print:p-0 print:bg-white print:static">
      <div className="bg-surface w-full max-w-4xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:max-w-none print:border-none print:shadow-none print:rounded-none print:w-full">
        
        {/* BARRA SUPERIOR DE AÇÕES (Oculta na impressão) */}
        <div className="p-5 border-b border-white/10 bg-black/40 flex justify-between items-center shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-wide">
                Relatório de Auditoria e Fechamento de Caixa
              </h3>
              <p className="text-xs text-white/50 font-medium">
                Sincronizado com os lançamentos em tempo real do Supabase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm"
              title="Imprimir na impressora térmica ou salvar como PDF nativo do navegador"
            >
              <Printer size={16} /> Imprimir / PDF Nativo
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={generatingPdf}
              className="px-4 py-2 bg-primary hover:bg-amber-400 text-black font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(255,191,0,0.3)] disabled:opacity-50"
            >
              {generatingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} 
              Baixar PDF
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
              title="Compartilhar resumo via WhatsApp"
            >
              <Share2 size={16} /> WhatsApp
            </button>

            <button 
              onClick={onClose} 
              className="p-2 ml-2 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CORPO DO RELATÓRIO (Renderizado na tela E exportado no PDF / Print) */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 custom-scrollbar bg-[#0f1115] print:bg-white text-white print:text-black print:p-8" ref={relatorioRef}>
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-center gap-4">
              <Loader2 size={40} className="animate-spin text-primary" />
              <p className="text-sm font-bold text-white/60">Carregando movimentações do caixa...</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto bg-black/40 print:bg-white p-6 sm:p-8 rounded-2xl border border-white/10 print:border-neutral-300 print:shadow-none">
              
              {/* CABEÇALHO OFICIAL DA EMPRESA */}
              <div className="border-b border-white/10 print:border-neutral-300 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-black tracking-wider text-white print:text-black uppercase">
                    ÓTICA LIS <span className="text-primary print:text-neutral-700 font-bold text-sm ml-2">ERP GESTÃO FINANCEIRA</span>
                  </h1>
                  <p className="text-xs text-white/50 print:text-neutral-500 font-medium mt-0.5">
                    Relatório Detalhado de Operação e Auditoria do Caixa Diário
                  </p>
                </div>
                <div className="text-left sm:text-right text-xs space-y-1 bg-white/5 print:bg-neutral-100 p-3 rounded-xl border border-white/10 print:border-neutral-300">
                  <p className="font-bold">
                    <span className="text-white/50 print:text-neutral-500">Status: </span>
                    <span className={caixa.status === 'ABERTO' ? 'text-green-400 print:text-green-700 font-black' : 'text-red-400 print:text-red-700 font-black'}>
                      {caixa.status === 'ABERTO' ? '🟢 ABERTO EM OPERAÇÃO' : '🔴 CAIXA FECHADO'}
                    </span>
                  </p>
                  <p className="text-white/70 print:text-neutral-700">
                    <span className="text-white/40 print:text-neutral-500">Abertura: </span> {dataAberturaFmt}
                  </p>
                  <p className="text-white/70 print:text-neutral-700">
                    <span className="text-white/40 print:text-neutral-500">Fechamento: </span> {dataFechamentoFmt}
                  </p>
                </div>
              </div>

              {/* RESUMO DE KPIS EM CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-white/5 print:bg-neutral-50 p-4 rounded-xl border border-white/10 print:border-neutral-300">
                  <p className="text-[10px] uppercase font-black text-white/50 print:text-neutral-500 tracking-wider">Saldo Inicial</p>
                  <p className="text-lg font-black text-white print:text-neutral-900 mt-1">
                    R$ {saldoInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-green-500/10 print:bg-green-50 p-4 rounded-xl border border-green-500/20 print:border-green-300">
                  <p className="text-[10px] uppercase font-black text-green-400 print:text-green-700 tracking-wider">(+) Entradas</p>
                  <p className="text-lg font-black text-green-400 print:text-green-700 mt-1">
                    R$ {entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-red-500/10 print:bg-red-50 p-4 rounded-xl border border-red-500/20 print:border-red-300">
                  <p className="text-[10px] uppercase font-black text-red-400 print:text-red-700 tracking-wider">(-) Saídas / Sangrias</p>
                  <p className="text-lg font-black text-red-400 print:text-red-700 mt-1">
                    R$ {saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-primary/10 print:bg-amber-50 p-4 rounded-xl border border-primary/30 print:border-amber-300">
                  <p className="text-[10px] uppercase font-black text-primary print:text-amber-800 tracking-wider">(=) Saldo Final</p>
                  <p className="text-lg font-black text-primary print:text-amber-900 mt-1">
                    R$ {saldoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* DETALHAMENTO POR MEIO DE PAGAMENTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-white/5 print:bg-neutral-50 p-4 rounded-xl border border-white/10 print:border-neutral-300 space-y-2.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-green-400 print:text-green-700 border-b border-white/10 print:border-neutral-200 pb-2 flex items-center justify-between">
                    <span>Recebimentos (Entradas)</span>
                    <span>R$ {entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/70 print:text-neutral-600">💵 Dinheiro (Gaveta):</span>
                      <span className="font-bold">R$ {formEntradas.dinheiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70 print:text-neutral-600">⚡ PIX:</span>
                      <span className="font-bold">R$ {formEntradas.pix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70 print:text-neutral-600">💳 Cartão (Crédito/Débito):</span>
                      <span className="font-bold">R$ {formEntradas.cartao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {formEntradas.outros > 0 && (
                      <div className="flex justify-between">
                        <span className="text-white/70 print:text-neutral-600">📋 Outros / Crediário:</span>
                        <span className="font-bold">R$ {formEntradas.outros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 print:bg-neutral-50 p-4 rounded-xl border border-white/10 print:border-neutral-300 space-y-2.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-red-400 print:text-red-700 border-b border-white/10 print:border-neutral-200 pb-2 flex items-center justify-between">
                    <span>Retiradas (Saídas / Sangrias)</span>
                    <span>R$ {saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/70 print:text-neutral-600">💵 Dinheiro (Retirada da Gaveta):</span>
                      <span className="font-bold text-red-300 print:text-red-700">R$ {formSaidas.dinheiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70 print:text-neutral-600">⚡ PIX (Transferência):</span>
                      <span className="font-bold text-red-300 print:text-red-700">R$ {formSaidas.pix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {formSaidas.outros > 0 && (
                      <div className="flex justify-between">
                        <span className="text-white/70 print:text-neutral-600">📋 Outras Retiradas:</span>
                        <span className="font-bold text-red-300 print:text-red-700">R$ {formSaidas.outros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* TABELA DE EXTRATO DE MOVIMENTAÇÕES */}
              <div className="pt-2 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-white/80 print:text-neutral-800 flex items-center justify-between">
                  <span>Extrato Detalhado de Operações ({movimentos.length} lançamentos)</span>
                </h4>

                {movimentos.length === 0 ? (
                  <div className="bg-white/5 print:bg-neutral-50 p-6 rounded-xl text-center text-xs text-white/50 print:text-neutral-500 font-bold border border-white/5 print:border-neutral-200">
                    Nenhuma movimentação registrada neste caixa ainda.
                  </div>
                ) : (
                  <div className="border border-white/10 print:border-neutral-300 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-white/5 print:bg-neutral-100 text-[10px] font-black uppercase text-white/50 print:text-neutral-600 border-b border-white/10 print:border-neutral-300">
                          <th className="py-2.5 px-3">Hora</th>
                          <th className="py-2.5 px-3">Tipo</th>
                          <th className="py-2.5 px-3">Descrição / Origem</th>
                          <th className="py-2.5 px-3">Forma</th>
                          <th className="py-2.5 px-3 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 print:divide-neutral-200 font-medium">
                        {movimentos.map((mov) => {
                          const isEntrada = mov.tipo === 'ENTRADA' || mov.tipo === 'SUPRIMENTO';
                          const horaFmt = mov.data_movimento ? format(parseISO(mov.data_movimento), 'HH:mm') : '--:--';
                          
                          return (
                            <tr key={mov.id} className="hover:bg-white/[0.02] print:hover:bg-transparent transition-colors">
                              <td className="py-2.5 px-3 font-mono text-white/70 print:text-neutral-700">{horaFmt}</td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                                  isEntrada 
                                    ? 'bg-green-500/20 text-green-400 print:bg-green-100 print:text-green-800 border border-green-500/30 print:border-green-300' 
                                    : 'bg-red-500/20 text-red-400 print:bg-red-100 print:text-red-800 border border-red-500/30 print:border-red-300'
                                }`}>
                                  {mov.tipo}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-white print:text-neutral-900">
                                {mov.descricao || 'Sem descrição'}
                              </td>
                              <td className="py-2.5 px-3 text-white/80 print:text-neutral-700 font-bold">
                                {mov.forma_pagamento || 'Dinheiro'}
                              </td>
                              <td className={`py-2.5 px-3 text-right font-black ${isEntrada ? 'text-green-400 print:text-green-700' : 'text-red-400 print:text-red-700'}`}>
                                {isEntrada ? '+ ' : '- '} R$ {Number(mov.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* BLOCO DE ASSINATURA E AUDITORIA (Perfeito na Impressão/PDF) */}
              <div className="pt-10 pb-4 grid grid-cols-2 gap-8 border-t border-white/10 print:border-neutral-300 text-center text-xs">
                <div className="space-y-1">
                  <div className="w-48 mx-auto border-b border-white/40 print:border-neutral-600 mb-1" />
                  <p className="font-bold text-white print:text-neutral-900">Operador / Responsável pelo Caixa</p>
                  <p className="text-[10px] text-white/40 print:text-neutral-500">Conferência de Saldo Diário</p>
                </div>
                <div className="space-y-1">
                  <div className="w-48 mx-auto border-b border-white/40 print:border-neutral-600 mb-1" />
                  <p className="font-bold text-white print:text-neutral-900">Gerente / Auditor Financeiro</p>
                  <p className="text-[10px] text-white/40 print:text-neutral-500">Aprovação Ótica Lis</p>
                </div>
              </div>

              {/* RODAPÉ DO RELATÓRIO */}
              <div className="text-[10px] text-center text-white/30 print:text-neutral-400 pt-3 border-t border-white/5 print:border-neutral-200">
                Relatório gerado em {dataAtualFmt} • Sistema de Gestão Ótica Lis • Documento de Uso Interno e Auditoria
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}

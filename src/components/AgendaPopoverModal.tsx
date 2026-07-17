import React, { useState } from 'react';
import { 
  X, Clock, User, Phone, CheckCircle2, XCircle, AlertTriangle, 
  DollarSign, Calendar, MessageSquare, Copy, Check, Eye, EyeOff,
  ExternalLink, Edit3, ShieldCheck, Tag, Loader2
} from 'lucide-react';
import { agendaService, parseUtcToSaoPaulo } from '../lib/services/agendaService';
import { openWhatsApp } from '../lib/whatsappUtils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgendaPopoverModalProps {
  agendamento: any | null;
  onClose: () => void;
  onRefresh: () => void;
  onViewClientProfile?: (clienteId: string) => void;
}

export const AgendaPopoverModal: React.FC<AgendaPopoverModalProps> = ({
  agendamento,
  onClose,
  onRefresh,
  onViewClientProfile
}) => {
  if (!agendamento) return null;

  const [loading, setLoading] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState(agendamento.forma_pagamento || 'Pix');
  const [valorInput, setValorInput] = useState(String(agendamento.valor || '0'));

  const saoPaulo = parseUtcToSaoPaulo(agendamento.inicio_em);
  const telefone = agendamento.paciente_whatsapp || agendamento.telefone || '';
  const isAvulso = !agendamento.cliente_id && agendamento.nome_avulso;

  const handleCopyPhone = () => {
    if (!telefone) return;
    navigator.clipboard.writeText(telefone);
    setCopied(true);
    toast.success('Telefone copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    if (!telefone) {
      toast.error('O paciente não possui WhatsApp cadastrado.');
      return;
    }
    const nome = agendamento.paciente_nome?.split(' ')[0] || 'Cliente';
    const msg = `Olá *${nome}*! Tudo bem? Aqui é da *Ótica Lìs*. Passando sobre o seu compromisso agendado para ${format(saoPaulo.dateObj, "dd/MM 'às' HH:mm", { locale: ptBR })} Hrs. Qualquer dúvida estamos à disposição!`;
    openWhatsApp(telefone, msg);
  };

  const handleStatusChange = async (novoStatus: string) => {
    setLoading(true);
    try {
      await agendaService.atualizarStatus(agendamento.id, novoStatus);
      toast.success(`Status alterado para "${novoStatus.toUpperCase()}" com sucesso!`);
      onRefresh();
      if (novoStatus === 'compareceu' || novoStatus === 'concluído') {
        toast.info('Última consulta do cliente atualizada no CRM para automação de Pós-Venda.');
      }
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao alterar status.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (statusPagamento: 'nao_pago' | 'pago' | 'isento') => {
    setLoading(true);
    try {
      const valorNumerico = parseFloat(valorInput.replace(',', '.')) || 0;
      await agendaService.atualizarPagamento(
        agendamento.id,
        statusPagamento,
        statusPagamento === 'pago' ? formaPagamento : undefined,
        valorNumerico
      );
      toast.success(statusPagamento === 'pago' ? 'Pagamento registrado e auditado com sucesso!' : 'Status de pagamento atualizado!');
      setShowPaymentModal(false);
      onRefresh();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar pagamento.');
    } finally {
      setLoading(false);
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo?.toLowerCase()) {
      case 'exame':
        return <span className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5"><Eye size={13} /> Exame Optométrico</span>;
      case 'entrega':
        return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5"><Tag size={13} /> Entrega de Óculos</span>;
      case 'ajuste':
        return <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5"><Edit3 size={13} /> Ajuste / Manutenção</span>;
      case 'retorno':
        return <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5"><Calendar size={13} /> Retorno de Rotina</span>;
      default:
        return <span className="bg-white/10 text-white border border-white/20 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5"><Tag size={13} /> {tipo || 'Outro'}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmado':
        return <span className="bg-blue-500 text-black px-3 py-1 rounded-full text-xs font-black tracking-wide">CONFIRMADO</span>;
      case 'compareceu':
      case 'concluído':
        return <span className="bg-green-500 text-black px-3 py-1 rounded-full text-xs font-black tracking-wide">COMPARECEU</span>;
      case 'faltou':
        return <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-black tracking-wide">FALTOU / IMPEDITIVO</span>;
      case 'cancelado':
        return <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-black tracking-wide">CANCELADO</span>;
      default:
        return <span className="bg-primary text-black px-3 py-1 rounded-full text-xs font-black tracking-wide">AGENDADO</span>;
    }
  };

  const getPagamentoBadge = (statusPag: string) => {
    switch (statusPag?.toLowerCase()) {
      case 'pago':
        return <span className="bg-green-500/20 text-green-400 border border-green-500/40 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1"><Check size={14} /> PAGO (R$ {Number(agendamento.valor || 0).toFixed(2)})</span>;
      case 'isento':
        return <span className="bg-white/10 text-white/70 border border-white/20 px-2.5 py-1 rounded-md text-xs font-bold">ISENTO</span>;
      default:
        return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1"><AlertTriangle size={14} /> NÃO PAGO</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-surface w-full max-w-xl rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        
        {/* Header do Modal */}
        <div className="p-6 bg-gradient-to-r from-white/10 to-transparent border-b border-white/10 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {getTipoBadge(agendamento.tipo)}
              {getStatusBadge(agendamento.status)}
            </div>
            <h3 className="text-2xl font-black text-white flex items-center gap-2 mt-1">
              {agendamento.paciente_nome || 'Paciente sem Nome'}
              {isAvulso && <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded uppercase font-bold">Avulso</span>}
            </h3>
            <p className="text-xs text-white/50 font-medium mt-0.5 flex items-center gap-1.5">
              <Clock size={14} className="text-primary" />
              {format(saoPaulo.dateObj, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })} • <strong className="text-white">{saoPaulo.horario}</strong> ({agendamento.duracao_min || 30} min)
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={22} />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
          
          {/* Dados do Paciente e Proteção LGPD */}
          <div className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-primary" /> Dados de Contato & Proteção LGPD
              </span>
              {agendamento.cliente_id && (
                <button
                  onClick={() => {
                    if (onViewClientProfile) onViewClientProfile(agendamento.cliente_id);
                    onClose();
                  }}
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                >
                  Ver Ficha Completa <ExternalLink size={12} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                <div>
                  <p className="text-[10px] text-white/40 uppercase font-bold">Telefone / WhatsApp</p>
                  <p className="text-sm font-bold text-white tracking-wider font-mono">
                    {showPhone ? (telefone || 'Não cadastrado') : (telefone ? '(••) •••••-••••' : 'Sem número')}
                  </p>
                </div>
                {telefone && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setShowPhone(!showPhone)} 
                      title={showPhone ? "Ocultar dado pessoal (LGPD)" : "Revelar dado pessoal (LGPD)"}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                    >
                      {showPhone ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button 
                      onClick={handleCopyPhone}
                      title="Copiar Telefone"
                      className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                    >
                      {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                <div>
                  <p className="text-[10px] text-white/40 uppercase font-bold">Ação Direta</p>
                  <p className="text-xs text-white/70">Contato via WhatsApp</p>
                </div>
                <button 
                  onClick={handleOpenWhatsApp}
                  disabled={!telefone}
                  className="bg-green-500 hover:bg-green-400 disabled:opacity-30 disabled:pointer-events-none text-black font-black px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-green-500/20 active:scale-95"
                >
                  <MessageSquare size={14} /> Enviar Zap
                </button>
              </div>
            </div>
          </div>

          {/* Status Financeiro & Toggle de Pagamento */}
          <div className="bg-gradient-to-r from-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                <DollarSign size={13} /> Status de Pagamento (Auditado)
              </p>
              <div className="flex items-center gap-2">
                {getPagamentoBadge(agendamento.status_pagamento)}
                {agendamento.forma_pagamento && (
                  <span className="text-xs text-white/60 font-medium">({agendamento.forma_pagamento})</span>
                )}
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex-1 sm:flex-initial bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-white/10 transition-all"
              >
                <DollarSign size={14} className="text-primary" /> Mudar Pagamento
              </button>
            </div>
          </div>

          {/* Observações e Profissional */}
          {(agendamento.observacoes || agendamento.profissional_id) && (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2">
              {agendamento.observacoes && (
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Observações do Agendamento</p>
                  <p className="text-sm text-white/80 whitespace-pre-wrap">{agendamento.observacoes}</p>
                </div>
              )}
            </div>
          )}

          {/* Ações Rápidas do Popover */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-white/40 border-b border-white/5 pb-2">Ações Operacionais no Agendamento</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                disabled={loading || agendamento.status === 'confirmado'}
                onClick={() => handleStatusChange('confirmado')}
                className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold p-3 rounded-xl text-xs flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-40"
              >
                <CheckCircle2 size={18} /> Confirmar Presença
              </button>

              <button
                disabled={loading || agendamento.status === 'compareceu'}
                onClick={() => handleStatusChange('compareceu')}
                className="bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 font-bold p-3 rounded-xl text-xs flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-40"
              >
                <Check size={18} /> Compareceu (Concluído)
              </button>

              <button
                disabled={loading || agendamento.status === 'faltou'}
                onClick={() => handleStatusChange('faltou')}
                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold p-3 rounded-xl text-xs flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-40"
              >
                <AlertTriangle size={18} /> Marcar Falta
              </button>

              <button
                disabled={loading || agendamento.status === 'cancelado'}
                onClick={() => handleStatusChange('cancelado')}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white font-bold p-3 rounded-xl text-xs flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-40"
              >
                <XCircle size={18} /> Cancelar OS/Agenda
              </button>
            </div>
          </div>

        </div>

        {/* Submodal para Registrar Pagamento */}
        {showPaymentModal && (
          <div className="absolute inset-0 z-20 bg-surface/95 backdrop-blur-lg p-6 flex flex-col justify-center animate-in fade-in">
            <div className="max-w-sm mx-auto w-full space-y-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h4 className="text-lg font-black text-white flex items-center gap-2">
                  <DollarSign className="text-primary" /> Registrar Pagamento
                </h4>
                <button onClick={() => setShowPaymentModal(false)}><X size={18} className="text-white/40" /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-white/60 mb-1 block">Valor Previsto / Cobrado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={valorInput}
                    onChange={(e) => setValorInput(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-bold text-lg focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/60 mb-1 block">Forma de Pagamento</label>
                  <select
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-primary"
                  >
                    <option value="Pix">Pix</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Convenio / Plano">Convênio / Plano</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    disabled={loading}
                    onClick={() => handlePaymentSubmit('pago')}
                    className="flex-1 bg-green-500 hover:bg-green-400 text-black font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95 transition-all"
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Check size={18} />} Marcar como PAGO
                  </button>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    disabled={loading}
                    onClick={() => handlePaymentSubmit('nao_pago')}
                    className="flex-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 py-2 rounded-xl text-xs font-bold hover:bg-amber-500/30 transition-all"
                  >
                    Marcar NÃO PAGO
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => handlePaymentSubmit('isento')}
                    className="flex-1 bg-white/10 text-white/70 border border-white/20 py-2 rounded-xl text-xs font-bold hover:bg-white/20 transition-all"
                  >
                    Isentar (R$ 0,00)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

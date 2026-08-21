import React, { useState } from 'react';
import { 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  Tag, 
  User, 
  CheckCircle2, 
  XCircle, 
  MessageCircle,
  TrendingUp,
  X
} from 'lucide-react';
import { 
  crmModuleService, 
  type CrmFunil, 
  type CrmEtapa, 
  type CrmLead, 
  type MotivoPerda,
  type LeadOrigem 
} from '../../lib/services/crmModuleService';
import { toast } from 'sonner';

interface CrmKanbanBoardProps {
  funil: CrmFunil;
  leads: CrmLead[];
  onLeadClick: (lead: CrmLead) => void;
  onRefresh: () => void;
}

const MOTIVOS_PERDA_LIST: { id: MotivoPerda; label: string }[] = [
  { id: 'preco', label: 'Preço elevado' },
  { id: 'achou_caro', label: 'Achou caro' },
  { id: 'comprou_concorrente', label: 'Comprou no concorrente' },
  { id: 'so_pesquisando', label: 'Só pesquisando' },
  { id: 'sem_resposta', label: 'Sem resposta / Sumiu' },
  { id: 'fora_perfil', label: 'Fora do perfil' },
  { id: 'outro', label: 'Outro motivo' }
];

export default function CrmKanbanBoard({ funil, leads, onLeadClick, onRefresh }: CrmKanbanBoardProps) {
  const [draggedLead, setDraggedLead] = useState<CrmLead | null>(null);

  // Modal de Motivo de Perda
  const [perdaModalOpen, setPerdaModalOpen] = useState(false);
  const [targetLeadPerda, setTargetLeadPerda] = useState<CrmLead | null>(null);
  const [targetEtapaPerda, setTargetEtapaPerda] = useState<CrmEtapa | null>(null);
  const [motivoPerda, setMotivoPerda] = useState<MotivoPerda>('preco');
  const [motivoDetalhe, setMotivoDetalhe] = useState('');

  const etapas = funil.etapas || [];

  // Drag & Drop Handlers
  const handleDragStart = (lead: CrmLead) => {
    setDraggedLead(lead);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (etapaAlvo: CrmEtapa) => {
    if (!draggedLead) return;
    if (draggedLead.etapa_id === etapaAlvo.id) return;

    // Se estiver movendo para a etapa 'Perdido', abre modal para exigir o motivo
    if (etapaAlvo.tipo === 'perdido') {
      setTargetLeadPerda(draggedLead);
      setTargetEtapaPerda(etapaAlvo);
      setPerdaModalOpen(true);
      setDraggedLead(null);
      return;
    }

    try {
      await crmModuleService.moverLeadEtapa(draggedLead, etapaAlvo);
      toast.success(`Lead movido para "${etapaAlvo.nome}"`);
      onRefresh();
    } catch (e: any) {
      toast.error('Erro ao mover lead');
    } finally {
      setDraggedLead(null);
    }
  };

  const handleConfirmarPerda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLeadPerda || !targetEtapaPerda) return;

    try {
      await crmModuleService.moverLeadEtapa(
        targetLeadPerda,
        targetEtapaPerda,
        motivoPerda,
        motivoDetalhe,
        'Operador'
      );
      toast.success('Lead movido para Perdido. Fila de follow-up atualizada.');
      setPerdaModalOpen(false);
      setTargetLeadPerda(null);
      setTargetEtapaPerda(null);
      onRefresh();
    } catch (e: any) {
      toast.error('Erro ao registrar perda');
    }
  };

  // Helper para verificar dias na etapa (Alerta visual)
  const getDiasNaEtapa = (entrouEm?: string): number => {
    if (!entrouEm) return 0;
    const diffTime = Math.abs(Date.now() - new Date(entrouEm).getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getBadgeOrigemColor = (origem: LeadOrigem) => {
    switch (origem) {
      case 'whatsapp': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'indicacao': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'convenio': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'instagram': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      case 'walk_in': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="flex-1 overflow-x-auto p-2 scroll-smooth snap-x">
      <div className="flex gap-4 min-w-max h-full items-start pb-4">
        {etapas.map(etapa => {
          const leadsDaEtapa = leads.filter(l => l.etapa_id === etapa.id);
          const isOrcamentoStage = etapa.tipo === 'orcamento';
          const totalValor = leadsDaEtapa.reduce((acc, l) => acc + (l.valor_estimado || 0), 0);

          return (
            <div 
              key={etapa.id}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(etapa)}
              className={`w-[290px] shrink-0 snap-start flex flex-col max-h-full rounded-3xl overflow-hidden border transition-all ${
                isOrcamentoStage 
                  ? 'bg-amber-500/[0.03] border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.05)]' 
                  : etapa.tipo === 'perdido'
                  ? 'bg-red-500/[0.02] border-red-500/20'
                  : 'bg-surface/50 border-white/5'
              }`}
            >
              {/* Header da Coluna da Etapa */}
              <div 
                className={`p-3.5 border-b flex items-center justify-between ${
                  isOrcamentoStage 
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-500/20' 
                    : etapa.tipo === 'perdido'
                    ? 'bg-red-500/10 border-red-500/20'
                    : 'bg-white/[0.02] border-white/5'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: etapa.cor || '#3B82F6' }} />
                    <h3 className="font-extrabold text-xs text-white">{etapa.nome}</h3>
                    {isOrcamentoStage && (
                      <span className="bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-500/30">
                        Momento Decisivo
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/40 mt-0.5 font-semibold">
                    R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-white/10 text-white font-bold text-xs px-2.5 py-0.5 rounded-full">
                  {leadsDaEtapa.length}
                </div>
              </div>

              {/* Lista de Cards da Etapa */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 min-h-[350px]">
                {leadsDaEtapa.length === 0 ? (
                  <div className="h-20 border border-dashed border-white/5 rounded-2xl flex items-center justify-center text-white/20 italic text-[11px]">
                    Sem leads nesta etapa
                  </div>
                ) : (
                  leadsDaEtapa.map(lead => {
                    const diasParado = getDiasNaEtapa(lead.entrou_etapa_em);
                    const temAlerta = isOrcamentoStage && etapa.alerta_dias_parado > 0 && diasParado >= etapa.alerta_dias_parado;

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => handleDragStart(lead)}
                        onClick={() => onLeadClick(lead)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer group hover:scale-[1.01] ${
                          temAlerta 
                            ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10' 
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {/* Alerta de Lead Parado (Orçamento) */}
                        {temAlerta && (
                          <div className="mb-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1.5 animate-pulse">
                            <AlertTriangle size={12} />
                            <span>Parado há {diasParado}d em Orçamento!</span>
                          </div>
                        )}

                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <h4 className="font-bold text-xs text-white group-hover:text-primary transition-colors leading-snug">
                            {lead.titulo}
                          </h4>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase ${getBadgeOrigemColor(lead.origem)}`}>
                            {lead.origem}
                          </span>
                        </div>

                        {/* Nome do Contato ERP */}
                        <div className="text-[11px] text-white/70 mb-2 flex items-center justify-between font-medium">
                          <span className="flex items-center gap-1">
                            <User size={12} className="text-white/40" />
                            {lead.cliente?.nome || 'Contato ERP'}
                          </span>

                          {lead.responsavel_nome && (
                            <span className="text-[9px] bg-white/5 border border-white/10 text-white/50 px-1.5 py-0.5 rounded font-mono">
                              {lead.responsavel_nome}
                            </span>
                          )}
                        </div>

                        {/* Footer do Card */}
                        <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[10px]">
                          <span className="font-extrabold text-emerald-400 flex items-center gap-0.5">
                            <DollarSign size={11} />
                            R$ {(lead.valor_estimado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>

                          <span className="text-white/40 flex items-center gap-1">
                            <Clock size={10} />
                            {diasParado === 0 ? 'Hoje' : `${diasParado}d`}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Exigir Motivo de Perda */}
      {perdaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface border border-white/10 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-red-400 font-black text-lg">
                <XCircle size={22} />
                <span>Motivo da Perda</span>
              </div>
              <button onClick={() => setPerdaModalOpen(false)} className="p-1 text-white/40 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmarPerda} className="space-y-4">
              <p className="text-xs text-white/60">
                Para métricas e fila de follow-up, informe por que o lead <strong>"{targetLeadPerda?.titulo}"</strong> não fechou:
              </p>

              <div>
                <label className="text-xs font-bold text-white/60 mb-1 block">Motivo Principal *</label>
                <select 
                  value={motivoPerda}
                  onChange={e => setMotivoPerda(e.target.value as MotivoPerda)}
                  className="w-full bg-surface border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500"
                >
                  {MOTIVOS_PERDA_LIST.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-white/60 mb-1 block">Observação Adicional</label>
                <textarea 
                  rows={3}
                  placeholder="Ex: Achou o valor da lente multifocal muito alto, disse que iria pensar..."
                  value={motivoDetalhe}
                  onChange={e => setMotivoDetalhe(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => setPerdaModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-white/10 text-white/70 hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white transition-all shadow-lg"
                >
                  Confirmar Perda & Agendar Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

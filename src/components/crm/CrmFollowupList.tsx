import React, { useState, useEffect } from 'react';
import { RefreshCw, MessageCircle, AlertTriangle, Clock } from 'lucide-react';
import { crmModuleService, type CrmFollowupFila } from '../../lib/services/crmModuleService';
import { openWhatsApp } from '../../lib/whatsappUtils';
import { toast } from 'sonner';

export default function CrmFollowupList() {
  const [fila, setFila] = useState<CrmFollowupFila[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarFila();
  }, []);

  const carregarFila = async () => {
    setLoading(true);
    const data = await crmModuleService.getFollowupFila();
    setFila(data);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <RefreshCw size={20} className="text-primary" />
            Fila de Follow-up de Perdidos
          </h3>
          <p className="text-xs text-white/40">Leads que saíram da etapa de orçamento sem fechar para repescagem manual.</p>
        </div>

        <button 
          onClick={carregarFila}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 flex items-center gap-2"
        >
          <RefreshCw size={14} /> Atualizar Fila
        </button>
      </div>

      <div className="space-y-3">
        {fila.length === 0 ? (
          <div className="p-8 text-center text-white/20 italic text-sm border border-dashed border-white/5 rounded-2xl">
            Nenhum lead pendente na fila de follow-up de perdidos.
          </div>
        ) : (
          fila.map(item => (
            <div key={item.id} className="p-5 rounded-2xl bg-surface/50 border border-white/10 hover:border-amber-500/30 transition-all space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      Motivo: {item.motivo_perda}
                    </span>
                    <h4 className="font-bold text-sm text-white">{item.cliente?.nome || 'Cliente sem Nome'}</h4>
                  </div>
                  <p className="text-xs text-white/40 mt-1">Lead: {item.lead?.titulo || 'Sem título'}</p>
                </div>

                <span className="text-xs text-white/50 flex items-center gap-1">
                  <Clock size={12} /> Agendado: {new Date(item.agendado_para).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <div className="bg-black/30 p-3 rounded-xl border border-white/5 text-xs text-white/70 italic">
                "{item.mensagem_sugerida}"
              </div>

              <div className="flex justify-end">
                {item.cliente?.whatsapp && (
                  <button 
                    onClick={() => openWhatsApp(item.cliente!.whatsapp, item.mensagem_sugerida)}
                    className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-all shadow-lg"
                  >
                    <MessageCircle size={14} /> Recontactar via WhatsApp (Manual)
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowRight, Clock, CheckCircle, Truck, AlertCircle, FileText, Send } from 'lucide-react';
import { vendasService } from '../lib/services/vendasService';
import { storage } from '../lib/storage';

const KANBAN_COLUMNS = [
  { id: 'ABERTA', title: 'Aberta', icon: <FileText size={18} className="text-yellow-500" /> },
  { id: 'ENVIADA_LAB', title: 'Laboratório', icon: <AlertCircle size={18} className="text-blue-500" /> },
  { id: 'PRONTA', title: 'Pronta p/ Retirada', icon: <CheckCircle size={18} className="text-green-500" /> },
  { id: 'ENTREGUE', title: 'Entregue', icon: <Truck size={18} className="text-white/40" /> }
];

export default function OsKanbanBoard({ sales, onUpdate }: { sales: any[], onUpdate: () => void }) {
  const [loading, setLoading] = useState<string | null>(null);

  const getNextStatus = (current: string) => {
    const idx = KANBAN_COLUMNS.findIndex(c => c.id === current || (current === 'LABORATORIO' && c.id === 'ENVIADA_LAB'));
    if (idx >= 0 && idx < KANBAN_COLUMNS.length - 1) {
      return KANBAN_COLUMNS[idx + 1].id;
    }
    return null;
  };

  const handleAdvanceStatus = async (sale: any) => {
    // Current status fallback
    let currentStatus = sale.status || 'ABERTA';
    if (currentStatus === 'LABORATORIO') currentStatus = 'ENVIADA_LAB';
    if (currentStatus === 'CONCLUIDA') currentStatus = 'ABERTA'; // compat
    
    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) return;

    setLoading(sale.id);
    try {
      // Usar a nossa nova função que salva a data e registra o log (pode falhar se o Supabase não estiver rodando localmente)
      try {
        await vendasService.atualizarStatusOS(
          sale.id,
          currentStatus,
          nextStatus,
          '00000000-0000-0000-0000-000000000000' // mock user ID for frontend mock unless auth exists
        );
      } catch (dbError) {
        console.warn('Supabase DB error, caindo para fallback de local storage...', dbError);
      }

      // Compatibilidade legada com storage mock se o Supabase falhar
      const s = await storage.getSales();
      const updated = s.map((x:any) => x.id === sale.id ? { ...x, status: nextStatus } : x);
      localStorage.setItem('wna_sales', JSON.stringify(updated));

      toast.success(`O.S. ${sale.os_number || 'S/N'} avançou para ${nextStatus}`);
      onUpdate();

      // Alerta de Mensagem de Retirada
      if (nextStatus === 'PRONTA') {
        toast('Lembrete: Avisar Cliente!', {
          description: 'A O.S. está pronta. Notifique o cliente.',
          action: {
            label: 'WhatsApp',
            onClick: () => window.open(`https://wa.me/${sale.cliente_whatsapp?.replace(/\D/g, '')}?text=Olá ${sale.cliente_nome}! Boas notícias: seu óculos já está pronto na Ótica Lìs. Pode vir buscar! 👓`, '_blank')
          }
        });
      }

    } catch (e) {
      console.error(e);
      toast.error('Erro ao avançar status.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar items-start min-h-[500px]">
      {KANBAN_COLUMNS.map(col => {
        // Filtra as OS que estão nesta coluna
        const colSales = sales.filter(s => {
          let st = s.status || 'ABERTA';
          if (st === 'LABORATORIO') st = 'ENVIADA_LAB';
          if (st === 'CONCLUIDA') st = 'ABERTA';
          return st === col.id;
        });

        return (
          <div key={col.id} className="min-w-[300px] w-[300px] bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col shrink-0 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-2">
                {col.icon}
                <h3 className="font-bold text-white/80">{col.title}</h3>
              </div>
              <span className="bg-white/10 text-xs font-bold px-2 py-1 rounded-full text-white/60">
                {colSales.length}
              </span>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh] custom-scrollbar flex-1">
              {colSales.map(sale => (
                <div key={sale.id} className="bg-surface border border-white/10 rounded-xl p-4 shadow-lg hover:border-primary/30 transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      OS: {sale.os_number || '---'}
                    </span>
                    <span className="text-[10px] text-white/40 flex items-center gap-1">
                      <Clock size={10} /> {new Date(sale.criado_em || sale.data_venda).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <p className="font-bold text-sm text-white mb-1 truncate">{sale.cliente_nome}</p>
                  <p className="text-xs text-white/40 line-clamp-1">{sale.items?.[0]?.produto_nome || 'Lentes / Armação'}</p>

                  {/* Ações */}
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs font-medium text-white/30">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.valor_liquido || sale.valor_total || 0)}
                    </span>
                    
                    {col.id !== 'ENTREGUE' && (
                      <button 
                        onClick={() => handleAdvanceStatus(sale)}
                        disabled={loading === sale.id}
                        className="bg-white/5 hover:bg-primary/20 hover:text-primary text-white/60 border border-white/10 hover:border-primary/30 p-1.5 rounded-lg transition-all flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider disabled:opacity-50"
                        title="Avançar Etapa"
                      >
                        {loading === sale.id ? '...' : (
                          <>
                            Avançar <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {colSales.length === 0 && (
                <div className="text-center p-6 text-white/20 text-sm italic border-2 border-dashed border-white/5 rounded-xl">
                  Vazio
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

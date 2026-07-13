import { useState, useEffect } from 'react';
import { MessageCircle, Plus, Send, RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { campanhasService, type Campanha } from '../lib/services/campanhasService';
import CampaignBuilderModal from '../components/CampaignBuilderModal';
import { formatDate } from '../lib/dateUtils';

export default function CampanhasPage() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulando, setSimulando] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadCampanhas = async () => {
    setLoading(true);
    const data = await campanhasService.getCampanhas();
    setCampanhas(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCampanhas();
  }, []);

  const handleSimularDisparo = async () => {
    setSimulando(true);
    toast.info('Iniciando processamento da fila em background...');
    const processados = await campanhasService.simularDisparoLote(10); // Processa 10 por vez
    if (processados > 0) {
      toast.success(`${processados} mensagens enviadas!`);
      loadCampanhas(); // Atualiza a tela
    } else {
      toast.error('Nenhuma mensagem pendente na fila.');
    }
    setSimulando(false);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <MessageCircle className="text-green-500" size={32} />
            Campanhas WhatsApp
          </h1>
          <p className="text-white/40 mt-1">
            Gestão e motor de disparo de campanhas para listas segmentadas.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Botão temporário para simular o Cron / Edge Function da Vercel */}
          <button 
            onClick={handleSimularDisparo}
            disabled={simulando}
            className="bg-white/5 border border-white/10 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
            title="Simular o Cron Job de envio"
          >
            <RefreshCw size={18} className={simulando ? 'animate-spin' : ''} />
            {simulando ? 'Processando Lote...' : 'Worker: Forçar Disparo'}
          </button>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-500 text-black font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-green-500/20 transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus size={20} />
            Nova Campanha
          </button>
        </div>
      </div>

      <CampaignBuilderModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={loadCampanhas} 
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard 
          icon={<Send />}
          title="Total Agendado"
          value={campanhas.reduce((acc, curr) => acc + (curr.disparos?.total || 0), 0).toString()}
        />
        <MetricCard 
          icon={<CheckCircle2 />}
          title="Mensagens Entregues"
          value={campanhas.reduce((acc, curr) => acc + (curr.disparos?.enviados || 0), 0).toString()}
          valueClass="text-green-500"
        />
        <MetricCard 
          icon={<Clock />}
          title="Fila Pendente"
          value={campanhas.reduce((acc, curr) => acc + (curr.disparos?.pendentes || 0), 0).toString()}
          valueClass="text-primary"
        />
        <MetricCard 
          icon={<AlertCircle />}
          title="Falhas de Envio"
          value={campanhas.reduce((acc, curr) => acc + (curr.disparos?.falhas || 0), 0).toString()}
          valueClass="text-red-500"
        />
      </div>

      <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-white/40 text-xs uppercase tracking-widest font-semibold">
                <th className="px-6 py-4">Campanha</th>
                <th className="px-6 py-4">Público (Segmento)</th>
                <th className="px-6 py-4 text-center">Progresso / Fila</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Agendado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/40">
                     Carregando fila de campanhas...
                  </td>
                </tr>
              ) : campanhas.length === 0 ? (
                <tr>
                   <td colSpan={5} className="px-6 py-10 text-center text-white/20 italic">
                      Nenhuma campanha encontrada.
                   </td>
                </tr>
              ) : campanhas.map((camp) => {
                const total = camp.disparos?.total || 0;
                const processados = (camp.disparos?.enviados || 0) + (camp.disparos?.falhas || 0);
                const percentual = total === 0 ? 0 : Math.round((processados / total) * 100);
                
                return (
                  <tr key={camp.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white text-sm">{camp.nome}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-white/10 text-white/70 text-[10px] uppercase font-bold px-2 py-1 rounded-md">
                          {camp.segmentos?.nome || 'Desconhecido'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 w-full max-w-[200px] mx-auto">
                        <div className="flex justify-between text-[10px] font-bold text-white/40">
                          <span>{processados} / {total} processados</span>
                          <span>{percentual}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-green-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentual}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                        ${camp.status === 'concluida' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                          camp.status === 'processando' ? 'bg-primary/10 text-primary border-primary/20 animate-pulse' :
                          'bg-white/10 text-white/40 border-white/20'}
                      `}>
                        {camp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-medium text-white/40">
                        {camp.criado_em ? formatDate(camp.criado_em) : '---'}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, valueClass = "text-white" }: any) {
  return (
    <div className="bg-surface p-6 rounded-2xl border border-white/5 flex items-start gap-4">
      <div className="p-3 bg-white/5 text-white/60 rounded-xl shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">{title}</h3>
        <p className={`text-2xl font-black mt-1 ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}

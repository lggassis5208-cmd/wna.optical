import { useState, useEffect } from 'react';
import { Filter, Plus, Trash2, Users, Search, Activity, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { segmentosService, type Segmento } from '../lib/services/segmentosService';
import { wahaStatusService, type WahaStatus } from '../lib/services/wahaStatusService';
import SegmentBuilderModal from '../components/SegmentBuilderModal';
import { formatDate } from '../lib/dateUtils';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function SegmentosPage() {
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [wahaStatus, setWahaStatus] = useState<WahaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadSegmentos = async () => {
    setLoading(true);
    try {
      const data = await segmentosService.getSegmentos();
      
      const countPromises = data.map(async (seg) => {
        try {
          // Backward compatibility para segmentos antigos que eram um array
          const regrasSeguras = Array.isArray(seg.regras) 
            ? { type: 'group', condition: 'AND', rules: seg.regras } as any
            : seg.regras;
            
          const result = await segmentosService.evaluateSegmentoCount(regrasSeguras);
          return { ...seg, count: result.count };
        } catch (e) {
          console.error(`Erro ao processar segmento ${seg.id}:`, e);
          return { ...seg, count: 0 };
        }
      });
      
      const dataWithCounts = await Promise.all(countPromises);
      setSegmentos(dataWithCounts as any);
    } catch (error) {
      console.error('Erro ao carregar segmentos:', error);
      toast.error('Falha ao carregar lista de segmentos.');
    } finally {
      setLoading(false);
    }
  };

  const loadWahaStatus = async () => {
    const status = await wahaStatusService.getLatestStatus();
    setWahaStatus(status);
  };

  useEffect(() => {
    loadSegmentos();
    loadWahaStatus();

    const interval = setInterval(() => {
      loadWahaStatus();
    }, 30000); // Poll de status a cada 30s

    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir este segmento?')) return;
    
    const success = await segmentosService.deleteSegmento(id);
    if (success) {
      toast.success('Segmento excluído com sucesso.');
      loadSegmentos();
    } else {
      toast.error('Erro ao excluir segmento.');
    }
  };

  const filtered = segmentos.filter(s => 
    s.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cálculo do status dinâmico da Engine WAHA
  let engineStatusText = "Online (SQL Engine)";
  let engineStatusClass = "text-green-500";
  let engineStatusSub = "Consultas SQL em tempo real ativas";

  if (wahaStatus) {
    const diffMin = Math.round((Date.now() - new Date(wahaStatus.checado_em).getTime()) / (1000 * 60));
    const isStale = diffMin > 15;

    if (wahaStatus.estado === 'WORKING' && !isStale) {
      engineStatusText = "Online (WORKING)";
      engineStatusClass = "text-green-500";
      engineStatusSub = `WAHA conectado há ${diffMin} min (${wahaStatus.sessao})`;
    } else if (wahaStatus.estado === 'WORKING' && isStale) {
      engineStatusText = "Stale (Sem resposta)";
      engineStatusClass = "text-yellow-500";
      engineStatusSub = `Última checagem há ${diffMin} min (> 15m)`;
    } else {
      engineStatusText = `Desconectado (${wahaStatus.estado})`;
      engineStatusClass = "text-red-500";
      engineStatusSub = `${wahaStatus.detalhe || 'Sessão indisponível'}. Checado há ${diffMin} min`;
    }
  } else {
    engineStatusText = "Aguardando Health Check";
    engineStatusClass = "text-yellow-500";
    engineStatusSub = "Nenhum status recente gravado pelo Worker";
  }

  return (
    <ErrorBoundary fallbackMessage="Erro ao renderizar a página de Segmentos.">
      <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Filter className="text-primary" size={26} />
            Motor de Segmentação (CRM)
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Crie públicos dinâmicos com filtros combinados sobre a base única de pacientes
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-black font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 whitespace-nowrap"
        >
          <Plus size={20} />
          Criar Segmento
        </button>
      </div>

      <ErrorBoundary fallbackMessage="O construtor de segmentos encontrou um problema e falhou ao carregar.">
        <SegmentBuilderModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={loadSegmentos} 
        />
      </ErrorBoundary>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          icon={<Filter />}
          title="Segmentos Ativos"
          value={segmentos.length.toString()}
        />
        <MetricCard 
          icon={<Users />}
          title="Total Segmentado"
          value={segmentos.reduce((acc, curr: any) => acc + (curr.count || 0), 0).toString()}
          subtitle="Soma de clientes (com possíveis repetições)"
        />
        <MetricCard 
          icon={<Activity />}
          title="Engine Status"
          value={engineStatusText}
          valueClass={engineStatusClass}
          subtitle={engineStatusSub}
        />
      </div>

      {/* Lista */}
      <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input 
              type="text" 
              placeholder="Buscar segmento..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-white/40 text-xs uppercase tracking-widest font-semibold">
                <th className="px-6 py-4">Nome do Segmento</th>
                <th className="px-6 py-4">Regras</th>
                <th className="px-6 py-4 text-center">Público (Real-time)</th>
                <th className="px-6 py-4">Criado em</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                     <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                     <p className="text-white/40">Carregando e executando engine de segmentação...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                   <td colSpan={5} className="px-6 py-10 text-center text-white/20 italic">
                      Nenhum segmento encontrado.
                   </td>
                </tr>
              ) : filtered.map((seg: any) => (
                <tr key={seg.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <p className="font-bold text-white text-sm">{seg.nome}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1 bg-white/10 text-white/70 text-[10px] uppercase font-bold px-2 py-1 rounded-md">
                        <Filter size={14} />
                        {seg.regras.rules?.length || 0} Regras ({seg.regras.condition === 'AND' ? 'E' : 'OU'})
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full">
                      <Users size={14} className="text-primary" />
                      <span className="font-black text-primary">{seg.count || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-white/40">
                      {seg.criado_em ? formatDate(seg.criado_em) : '---'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={(e) => handleDelete(seg.id!, e)}
                      className="p-2 bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </ErrorBoundary>
  );
}

function MetricCard({ title, value, subtitle, icon, valueClass = "text-white" }: any) {
  return (
    <div className="bg-surface p-6 rounded-2xl border border-white/5 flex items-start gap-4">
      <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">{title}</h3>
        <p className={`text-2xl font-black mt-1 ${valueClass}`}>{value}</p>
        {subtitle && <p className="text-xs text-white/30 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

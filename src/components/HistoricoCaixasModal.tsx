import { useState, useEffect } from 'react';
import { X, Calendar, Search, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { caixaService, type Caixa } from '../lib/services/caixaService';
import { toast } from 'sonner';

interface HistoricoCaixasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HistoricoCaixasModal({ isOpen, onClose }: HistoricoCaixasModalProps) {
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (isOpen) {
      carregarHistorico();
    }
  }, [isOpen, currentDate]);

  const carregarHistorico = async () => {
    setLoading(true);
    try {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const data = await caixaService.buscarHistoricoCaixas(start.toISOString(), end.toISOString());
      setCaixas(data);
    } catch (e: any) {
      toast.error('Erro ao buscar histórico de caixas: ' + e.message);
    }
    setLoading(false);
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // Generate calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Find start day of the week to pad the calendar (Sunday = 0)
  const startDay = monthStart.getDay();
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const paddedDays = Array(startDay).fill(null).concat(daysInMonth);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-surface w-full max-w-4xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-xl text-primary">
              <Calendar size={24} />
            </div>
            Histórico de Caixas
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-white capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all">
                <ChevronLeft size={20} />
              </button>
              <button onClick={nextMonth} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[10px] font-black text-white/40 uppercase tracking-widest">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="py-2">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-3">
            {paddedDays.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="bg-white/[0.01] rounded-2xl border border-transparent aspect-square" />;
              }

              // Find caixas for this date
              const caixasDoDia = caixas.filter(c => isSameDay(parseISO(c.data_abertura), date));
              const isTodayDate = isToday(date);
              const hasCaixas = caixasDoDia.length > 0;

              return (
                <div 
                  key={date.toISOString()} 
                  className={`
                    relative rounded-2xl p-3 border aspect-square flex flex-col hover:border-primary/50 transition-colors cursor-pointer group
                    ${isTodayDate ? 'border-primary bg-primary/5' : 'border-white/5 bg-white/[0.02]'}
                    ${!isSameMonth(date, currentDate) ? 'opacity-30' : ''}
                  `}
                >
                  <span className={`text-sm font-bold ${isTodayDate ? 'text-primary' : 'text-white/60'}`}>
                    {format(date, 'd')}
                  </span>
                  
                  <div className="mt-auto space-y-1">
                    {caixasDoDia.map((caixa, cIdx) => (
                      <div 
                        key={caixa.id} 
                        className={`text-[10px] p-1.5 rounded-lg truncate flex items-center gap-1 font-bold ${
                          caixa.status === 'ABERTO' 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-white/10 text-white/80 border border-white/5'
                        }`}
                        title={`Caixa ${caixa.status}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${caixa.status === 'ABERTO' ? 'bg-green-400 animate-pulse' : 'bg-white/40'}`} />
                        R$ {caixa.valor_inicial.toFixed(2)}
                      </div>
                    ))}
                  </div>

                  {hasCaixas && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-2xl flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex">
                      <FileText size={20} className="text-white mb-2" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">Ver Detalhes</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}

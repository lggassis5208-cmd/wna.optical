import { useState, useEffect } from 'react';
import { 
  Plus, ChevronLeft, ChevronRight, MessageSquare, Search, User, Clock, 
  X, Loader2, Phone, CheckCircle2, Calendar as CalendarIcon, 
  List, LayoutGrid, Kanban, Filter, Download
} from 'lucide-react';
import { storage } from '../lib/storage';
import { openWhatsApp } from '../lib/whatsappUtils';
import { toast } from 'sonner';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, addMonths, subMonths, 
  isSameMonth, isToday, parseISO, getDay, isBefore, isSameDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ViewMode = 'list' | 'calendar' | 'kanban';

export default function AgendaPage() {
  const [currentView, setCurrentView] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [exames, setExames] = useState<any[]>([]);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExameForPush, setSelectedExameForPush] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [examesData, financeiroData] = await Promise.all([
        storage.getExames(),
        storage.getFinanceiro ? storage.getFinanceiro() : Promise.resolve({ pagar: [], receber: [] })
      ]);
      setExames(examesData);
      
      const allTransacoes = [
        ...(financeiroData.receber || []).map((t: any) => ({ ...t, tipo: 'receita' })),
        ...(financeiroData.pagar || []).map((t: any) => ({ ...t, tipo: 'despesa' }))
      ];
      setTransacoes(allTransacoes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Logic
  const term = searchTerm.toLowerCase();
  const filteredExames = exames.filter(e => 
    e.paciente_nome?.toLowerCase().includes(term) || 
    e.paciente_cpf?.includes(term) ||
    e.status?.toLowerCase().includes(term)
  );

  // Stats for the top counters
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayExames = filteredExames.filter(e => e.data === todayStr).length;
  const overdueExames = filteredExames.filter(e => isBefore(parseISO(e.data), new Date()) && e.status !== 'CONCLUÍDO' && e.status !== 'CANCELADO').length;
  const openExames = filteredExames.filter(e => e.status === 'AGENDADO' || !e.status).length;
  const inProgressExames = filteredExames.filter(e => e.status === 'CONFIRMADO').length;

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
      
      {/* HEADER PRINCIPAL DA PLATAFORMA */}
      <div className="bg-surface border-b border-white/5 shrink-0 px-6 py-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black shadow-[0_0_15px_rgba(255,191,0,0.2)]">
              AL
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">Agenda Global</h2>
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Ótica Lìs</p>
            </div>
          </div>
          
          <div className="flex-1 max-w-xl px-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              <input 
                type="text" 
                placeholder="Buscar cliente, CPF, status..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button className="bg-white/5 border border-white/10 text-white/70 px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-white/10 transition-all text-sm font-bold">
              <Download size={16} /> Exportar
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-black font-black px-6 py-2.5 rounded-xl flex items-center gap-2 hover:shadow-[0_0_20px_rgba(255,191,0,0.3)] transition-all active:scale-95 text-sm"
            >
              <Plus size={18} /> Novo Agendamento
            </button>
          </div>
        </div>

        {/* TOOLBAR SECUNDÁRIA (TABS) */}
        <div className="flex items-center gap-6 mt-2">
          <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
            <button 
              onClick={() => setCurrentView('list')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${currentView === 'list' ? 'bg-surface text-primary shadow' : 'text-white/40 hover:text-white'}`}
            >
              <List size={14} /> List
            </button>
            <button 
              onClick={() => setCurrentView('calendar')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${currentView === 'calendar' ? 'bg-surface text-primary shadow' : 'text-white/40 hover:text-white'}`}
            >
              <CalendarIcon size={14} /> Calendar
            </button>
            <button 
              onClick={() => setCurrentView('kanban')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${currentView === 'kanban' ? 'bg-surface text-primary shadow' : 'text-white/40 hover:text-white'}`}
            >
              <Kanban size={14} /> Kanban
            </button>
          </div>
          
          {currentView === 'calendar' && (
            <div className="flex items-center gap-4 ml-auto">
              <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold border border-white/10 rounded-md hover:bg-white/5">Hoje</button>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:bg-white/5 rounded-md"><ChevronLeft size={16}/></button>
                <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:bg-white/5 rounded-md"><ChevronRight size={16}/></button>
              </div>
              <span className="text-sm font-bold capitalize min-w-[120px]">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
            </div>
          )}
        </div>

        {/* COUNTERS STRIP */}
        <div className="flex justify-between items-center pt-4 border-t border-white/5">
          <StatBox label="OVERDUE" value={overdueExames} color="text-red-500" />
          <div className="w-px h-8 bg-white/5"></div>
          <StatBox label="OPEN" value={openExames} color="text-white" />
          <div className="w-px h-8 bg-white/5"></div>
          <StatBox label="TODAY" value={todayExames} color="text-primary" />
          <div className="w-px h-8 bg-white/5"></div>
          <StatBox label="IN PROGRESS" value={inProgressExames} color="text-blue-400" />
          <div className="w-px h-8 bg-white/5"></div>
          <StatBox label="FINISHED" value={filteredExames.filter(e => e.status === 'CONCLUÍDO').length} color="text-green-500" />
        </div>
      </div>

      {/* VIEWS RENDERER */}
      <div className="flex-1 overflow-hidden bg-[#0A0A0B]">
        {loading ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <>
            {currentView === 'list' && (
              <AgendaListView 
                exames={filteredExames} 
                onExameClick={setSelectedExameForPush} 
              />
            )}
            {currentView === 'calendar' && (
              <AgendaCalendarView 
                exames={filteredExames} 
                transacoes={transacoes} 
                currentDate={currentDate} 
                onExameClick={setSelectedExameForPush} 
              />
            )}
            {currentView === 'kanban' && (
              <AgendaKanbanView 
                exames={filteredExames} 
                onExameClick={setSelectedExameForPush} 
              />
            )}
          </>
        )}
      </div>

      {/* Modals globais */}
      <AgendamentoModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); fetchData(); }} />
      {selectedExameForPush && <PushNotificationModal exame={selectedExameForPush} onClose={() => setSelectedExameForPush(null)} />}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{label}</span>
      <span className={`text-2xl font-black ${color}`}>{value}</span>
    </div>
  );
}

// ==========================================
// VIEW 1: LIST
// ==========================================
function AgendaListView({ exames, onExameClick }: { exames: any[], onExameClick: (e: any) => void }) {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6">
      <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-black/20 text-white/40 text-[10px] uppercase tracking-widest font-bold border-b border-white/5">
              <th className="px-6 py-4">Data/Hora</th>
              <th className="px-6 py-4">Paciente</th>
              <th className="px-6 py-4">CPF</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {exames.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-white/20 text-sm">Nenhum registro encontrado.</td></tr>
            ) : exames.map((exame) => (
              <tr key={exame.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => onExameClick(exame)}>
                <td className="px-6 py-4 font-mono font-bold text-white/70 text-xs">
                  {format(parseISO(exame.data), 'dd/MM/yyyy')} <span className="text-primary ml-2">{exame.horario}</span>
                </td>
                <td className="px-6 py-4 font-bold text-sm text-white">{exame.paciente_nome}</td>
                <td className="px-6 py-4 font-mono text-xs text-white/50">{exame.paciente_cpf || '---'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border
                    ${exame.status === 'AGENDADO' ? 'bg-white/10 text-white border-white/20' : 
                      exame.status === 'CONFIRMADO' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                      exame.status === 'CONCLUÍDO' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                      'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                    {exame.status || 'AGENDADO'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-primary hover:text-white p-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                    <MessageSquare size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// VIEW 2: CALENDAR (GOOGLE STYLE)
// ==========================================
function AgendaCalendarView({ exames, transacoes, currentDate, onExameClick }: { exames: any[], transacoes: any[], currentDate: Date, onExameClick: (e: any) => void }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="h-full flex flex-col p-6">
      <div className="bg-surface border border-white/5 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl">
        <div className="grid grid-cols-7 border-b border-white/5 bg-black/20 shrink-0">
          {weekDays.map(day => (
            <div key={day} className="py-2 text-center text-[10px] font-black uppercase tracking-widest text-white/40">{day}</div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 grid-rows-5 overflow-y-auto custom-scrollbar">
          {days.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isTodayDate = isToday(day);
            const dayExames = exames.filter(e => e.data === dayStr && e.status !== 'CANCELADO');
            const dayTransacoes = transacoes.filter(t => t.data_vencimento === dayStr);

            return (
              <div key={dayStr} className={`border-r border-b border-white/5 p-1.5 flex flex-col gap-1 min-h-[100px] ${!isCurrentMonth ? 'bg-black/40' : 'bg-transparent'}`}>
                <div className="flex justify-center mb-1">
                  <span className={`text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full ${isTodayDate ? 'bg-primary text-black' : (isCurrentMonth ? 'text-white/70' : 'text-white/20')}`}>
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                  {dayExames.map((exame) => (
                    <div 
                      key={exame.id} onClick={() => onExameClick(exame)}
                      className="bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded px-1.5 py-0.5 text-[9px] font-bold cursor-pointer transition-colors truncate flex items-center gap-1 shadow-sm"
                    >
                      <span>{exame.horario}</span>
                      <span className="truncate">{exame.paciente_nome}</span>
                    </div>
                  ))}
                  {dayTransacoes.map((transacao) => {
                    const isReceita = transacao.tipo === 'receita';
                    return (
                      <div key={transacao.id} className={`rounded px-1.5 py-0.5 text-[9px] font-bold truncate flex items-center gap-1 border shadow-sm ${isReceita ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                        <span className="truncate">{transacao.descricao}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// VIEW 3: KANBAN
// ==========================================
function AgendaKanbanView({ exames, onExameClick }: { exames: any[], onExameClick: (e: any) => void }) {
  const columns = [
    { id: 'AGENDADO', title: 'ABERTA / AGENDADA', color: 'bg-white/20', borderColor: 'border-white/20' },
    { id: 'CONFIRMADO', title: 'CONFIRMADOS', color: 'bg-blue-500', borderColor: 'border-blue-500' },
    { id: 'CONCLUÍDO', title: 'FINALIZADO', color: 'bg-green-500', borderColor: 'border-green-500' },
    { id: 'FALTOU', title: 'IMPEDITIVO / FALTOU', color: 'bg-red-500', borderColor: 'border-red-500' },
  ];

  return (
    <div className="h-full flex overflow-x-auto custom-scrollbar p-6 gap-6">
      {columns.map(col => {
        const columnExames = exames.filter(e => (e.status || 'AGENDADO') === col.id);
        
        return (
          <div key={col.id} className="flex-1 min-w-[300px] flex flex-col">
            <div className={`py-3 px-4 rounded-t-xl ${col.color} flex justify-between items-center shadow-lg border border-b-0 ${col.borderColor}`}>
              <h3 className="text-xs font-black uppercase tracking-widest text-white shadow-black drop-shadow-md">{col.title}</h3>
              <span className="bg-black/30 text-white text-[10px] font-black px-2 py-0.5 rounded-md">{columnExames.length}</span>
            </div>
            
            <div className={`flex-1 bg-surface border border-t-0 rounded-b-xl ${col.borderColor} p-3 overflow-y-auto custom-scrollbar flex flex-col gap-3`}>
              {columnExames.length === 0 ? (
                <div className="flex-1 flex justify-center p-6 border-2 border-dashed border-white/5 rounded-xl">
                  <p className="text-white/20 text-xs font-bold uppercase">Vazio</p>
                </div>
              ) : (
                columnExames.map(exame => (
                  <div 
                    key={exame.id} 
                    onClick={() => onExameClick(exame)}
                    className="bg-black/40 border border-white/10 rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:bg-white/5 transition-all group shadow-xl"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        {format(parseISO(exame.data), 'dd/MM')} às {exame.horario}
                      </span>
                    </div>
                    <p className="font-bold text-white text-sm group-hover:text-primary transition-colors">{exame.paciente_nome}</p>
                    <div className="flex items-center gap-2 mt-3 text-[10px] text-white/40">
                      <Phone size={12} />
                      {exame.paciente_whatsapp || 'Sem número'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// PUSH NOTIFICATION MODAL (Confirmação)
// ==========================================
function PushNotificationModal({ exame, onClose }: { exame: any, onClose: () => void }) {
  const dateObj = parseISO(exame.data);
  const dayOfWeek = getDay(dateObj); // 3 = Quarta, 5 = Sexta

  const handleConfirm = () => {
    if (!exame.paciente_whatsapp) return toast.error('Paciente não possui WhatsApp.');
    let mensagem = '';
    const firstName = exame.paciente_nome?.split(' ')[0] || 'Cliente';

    if (dayOfWeek === 3) {
      mensagem = `*Ótica Lìs*\nOlá tudo bem?\n📌 *${firstName}*\nlembre-se que você tem compromisso *QUARTA-FEIRA,* às ${exame.horario} Hrs\n\n*OTICA LÌS*\nAvenida Anápolis\nQd 03 LT 01 Nª 2134 (em frente a clínica gedda)\nVila Concórdia - Goiânia/Go\nFone: 62 99285-8280`;
    } else if (dayOfWeek === 5) {
      mensagem = `*Ótica Lìs*\nOlá tudo bem?\n📌 *${firstName}*\nlembre-se que você tem compromisso *SEXTA-FEIRA,* às ${exame.horario} Hrs\n\n*OTICA LÌS*\nAvenida das Esmeraldas\nQd 42 LT 14 Sala 04 (em frente a feira)\nRecanto das minas gerais - Goiânia/Go\nFone: 62 99283-1198`;
    } else {
      mensagem = `*Ótica Lìs*\nOlá tudo bem?\n📌 *${firstName}*\nlembre-se que você tem compromisso para o dia ${format(dateObj, 'dd/MM')} às ${exame.horario} Hrs.`;
    }

    openWhatsApp(exame.paciente_whatsapp, mensagem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-md rounded-3xl border border-white/10 shadow-2xl p-6 flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-500/10 text-green-500 rounded-2xl shrink-0"><MessageSquare size={24} /></div>
          <div>
            <h3 className="text-lg font-black text-white">Confirmação Automática</h3>
            <p className="text-sm text-white/40">Deseja enviar a mensagem via WhatsApp?</p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3"><User size={16} className="text-primary" /><span className="text-sm font-bold">{exame.paciente_nome}</span></div>
          <div className="flex items-center gap-3"><Phone size={16} className="text-primary" /><span className="text-sm font-bold">{exame.paciente_whatsapp || 'Não cadastrado'}</span></div>
          <div className="flex items-center gap-3"><CalendarIcon size={16} className="text-primary" /><span className="text-sm font-bold">{format(dateObj, 'dd/MM/yyyy')} às {exame.horario}</span></div>
          <div className="mt-4 p-3 bg-black/30 rounded-xl border border-white/5">
            <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Gatilho Detectado:</p>
            <p className="text-xs text-green-400 font-medium">{dayOfWeek === 3 ? '📍 Vila Concórdia (Quarta)' : dayOfWeek === 5 ? '📍 Recanto (Sexta)' : '📍 Unidade Padrão'}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-2">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-white/40 hover:text-white bg-white/5 rounded-xl">Cancelar</button>
          <button onClick={handleConfirm} className="flex-1 bg-green-500 hover:bg-green-400 text-black py-3 text-sm font-black rounded-xl shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"><MessageSquare size={18} /> Enviar ZAP</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MODAL DE NOVO AGENDAMENTO (Bloqueio Quartas e Sextas)
// ==========================================
function AgendamentoModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [searchCpf, setSearchCpf] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  
  const [formData, setFormData] = useState({ data: '', horario: '' });

  useEffect(() => {
    if (isOpen) {
      storage.getClients().then(setClients);
      setSelectedClient(null);
      setSearchCpf('');
      setFormData({ data: '', horario: '' });
    }
  }, [isOpen]);

  const filteredClients = searchCpf.length > 1 ? clients.filter(c => c.cpf?.includes(searchCpf) || (c.name || c.nome_completo || '').toLowerCase().includes(searchCpf.toLowerCase())) : [];

  const handleSave = async () => {
    if (!selectedClient) return toast.error('Selecione um cliente.');
    if (!formData.data) return toast.error('Selecione uma data.');
    
    const dateObj = parseISO(formData.data);
    const dayOfWeek = getDay(dateObj); // 3=Qua, 5=Sex
    if (dayOfWeek !== 3 && dayOfWeek !== 5) {
      toast.error('Alerta de Agendamento', { description: 'Só podemos agendar consultas nas QUARTAS e SEXTAS feiras. Favor agendar novamente.', duration: 8000 });
      return; 
    }

    setLoading(true);
    try {
      await storage.saveExame({
        cliente_id: selectedClient.id,
        data: formData.data,
        horario: formData.horario,
        status: 'AGENDADO',
        paciente_nome: selectedClient.name || selectedClient.nome_completo,
        paciente_cpf: selectedClient.cpf,
        paciente_whatsapp: selectedClient.whatsapp?.replace(/\D/g, '') || ''
      });
      toast.success('Agendado com sucesso!');
      onClose();
    } catch (e) {
      toast.error('Erro ao agendar.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl flex flex-col">
        <div className="p-6 border-b border-white/5 flex justify-between"><h3 className="text-xl font-bold">Novo Agendamento</h3><button onClick={onClose}><X size={24} className="text-white/40 hover:text-white" /></button></div>
        <div className="p-6 space-y-6">
          {!selectedClient ? (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input type="text" placeholder="Buscar paciente..." value={searchCpf} onChange={(e) => setSearchCpf(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary/50 text-white" />
              {searchCpf.length > 1 && (
                <div className="bg-white/5 border border-white/10 rounded-xl mt-2 max-h-[300px] overflow-auto">
                  {filteredClients.map(c => (
                    <div key={c.id} onClick={() => setSelectedClient(c)} className="p-4 border-b border-white/5 hover:bg-white/10 cursor-pointer">
                      <p className="font-bold">{c.name || c.nome_completo}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-primary/10 p-4 rounded-xl flex justify-between"><div><p className="text-xs text-primary font-bold uppercase">Selecionado</p><p className="font-bold">{selectedClient.name || selectedClient.nome_completo}</p></div><button onClick={() => setSelectedClient(null)} className="text-sm underline text-white/40 hover:text-white">Trocar</button></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-bold block mb-1">Data</label><input type="date" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} className="w-full bg-white/5 rounded-xl p-3 border border-white/10 color-scheme-dark" /></div>
                <div><label className="text-sm font-bold block mb-1">Hora</label><input type="time" value={formData.horario} onChange={e => setFormData({...formData, horario: e.target.value})} className="w-full bg-white/5 rounded-xl p-3 border border-white/10 color-scheme-dark" /></div>
              </div>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-white/5 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 rounded-xl bg-white/5 font-bold text-white/40 hover:text-white">Cancelar</button>
          <button onClick={handleSave} disabled={loading || !selectedClient} className="px-8 py-2 rounded-xl bg-primary text-black font-black flex gap-2">{loading ? <Loader2 className="animate-spin" size={20}/> : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
}

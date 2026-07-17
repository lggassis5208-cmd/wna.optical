import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, ChevronLeft, ChevronRight, MessageSquare, Search, User, Clock, 
  X, Loader2, Phone, CheckCircle2, Calendar as CalendarIcon, 
  List, LayoutGrid, Kanban, Filter, Download, AlertTriangle, 
  DollarSign, Check, Eye, Tag, Edit3, RefreshCw, Layers
} from 'lucide-react';
import { storage } from '../lib/storage';
import { agendaService, parseUtcToSaoPaulo } from '../lib/services/agendaService';
import { openWhatsApp } from '../lib/whatsappUtils';
import { toast } from 'sonner';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, addMonths, subMonths, addDays, subDays, addWeeks, subWeeks,
  isSameMonth, isToday, parseISO, getDay, isBefore, isSameDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { AgendaPopoverModal } from '../components/AgendaPopoverModal';

type ViewMode = 'dia' | 'semana' | 'mes' | 'list' | 'kanban';

// Padrão de faixas horárias do Google Calendar (08h às 19h)
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const SLOT_HEIGHT = 60; // 60 pixels por hora

export default function AgendaPage() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<ViewMode>('dia');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPagamento, setFilterPagamento] = useState<'todos' | 'nao_pago' | 'pago'>('todos');
  const [filterTipo, setFilterTipo] = useState<'todos' | 'exame' | 'entrega' | 'ajuste' | 'retorno'>('todos');
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [exames, setExames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Modals e Popover
  const [selectedForPopover, setSelectedForPopover] = useState<any | null>(null);
  const [isModalNovoOpen, setIsModalNovoOpen] = useState(false);
  const [selectedExameForPush, setSelectedExameForPush] = useState<any | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // Busca agendamentos direto do Supabase via agendaService (sem fallback silencioso)
      const data = await agendaService.buscarAgendamentos();
      setExames(data);
    } catch (e: any) {
      console.error('Erro de busca no AgendaPage:', e);
      setErrorMessage(e.message || 'Erro de conexão com o Supabase ao carregar agenda.');
      toast.error(e.message || 'Não foi possível carregar os agendamentos do servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtragem
  const term = searchTerm.toLowerCase();
  const filteredExames = useMemo(() => {
    return exames.filter(e => {
      const matchTerm = !term || 
        (e.paciente_nome?.toLowerCase().includes(term)) || 
        (e.paciente_cpf?.includes(term)) ||
        (e.observacoes?.toLowerCase().includes(term));
      
      const matchPag = filterPagamento === 'todos' || e.status_pagamento === filterPagamento;
      const matchTipo = filterTipo === 'todos' || e.tipo === filterTipo;

      return matchTerm && matchPag && matchTipo;
    });
  }, [exames, term, filterPagamento, filterTipo]);

  // Estatísticas Financeiras e Operacionais do dia atual selecionado (currentDate)
  const currentDateStr = format(currentDate, 'yyyy-MM-dd');
  const dailyStats = useMemo(() => {
    const agsHoje = filteredExames.filter(e => e.data === currentDateStr && e.status !== 'cancelado');
    const totalAgendados = agsHoje.length;
    const pagos = agsHoje.filter(e => e.status_pagamento === 'pago');
    const naoPagos = agsHoje.filter(e => e.status_pagamento !== 'pago' && e.status_pagamento !== 'isento');
    const compareceram = agsHoje.filter(e => e.status === 'compareceu' || e.status === 'concluído').length;
    const faltaram = agsHoje.filter(e => e.status === 'faltou').length;

    const valorTotalPrevisto = agsHoje.reduce((acc, e) => acc + Number(e.valor || 0), 0);
    const valorRecebido = pagos.reduce((acc, e) => acc + Number(e.valor || 0), 0);

    return {
      totalAgendados,
      totalPagos: pagos.length,
      totalNaoPagos: naoPagos.length,
      compareceram,
      faltaram,
      valorTotalPrevisto,
      valorRecebido
    };
  }, [filteredExames, currentDateStr]);

  // Navegação do Calendário
  const handlePrevDate = () => {
    if (currentView === 'dia') setCurrentDate(subDays(currentDate, 1));
    else if (currentView === 'semana') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextDate = () => {
    if (currentView === 'dia') setCurrentDate(addDays(currentDate, 1));
    else if (currentView === 'semana') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  // Cálculo de Posição da Linha Vermelha de Horário Atual
  const [nowMinuteOffset, setNowMinuteOffset] = useState<number | null>(null);
  useEffect(() => {
    const updateTimeLine = () => {
      const now = new Date();
      const ptBrFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', minute: 'numeric', hour12: false });
      const parts = ptBrFormat.formatToParts(now);
      const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
      const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
      
      if (h >= 8 && h <= 19) {
        setNowMinuteOffset((h - 8) * SLOT_HEIGHT + (m / 60) * SLOT_HEIGHT);
      } else {
        setNowMinuteOffset(null);
      }
    };
    updateTimeLine();
    const interval = setInterval(updateTimeLine, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-300">
      
      {/* 1. HEADER E TOOLBAR PRINCIPAL */}
      <div className="bg-surface border-b border-white/10 shrink-0 px-6 py-4 flex flex-col gap-4 shadow-md">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary/10 rounded-2xl border border-primary/30 flex items-center justify-center text-primary font-black text-lg shadow-[0_0_20px_rgba(255,191,0,0.2)]">
              <CalendarIcon size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
                Agenda Global <span className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-full font-bold uppercase">Google Calendar Style</span>
              </h2>
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">
                Multi-Loja Auditada • {format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
          
          <div className="flex-1 max-w-xl w-full">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              <input 
                type="text" 
                placeholder="Buscar cliente, CPF ou observações..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:border-primary transition-colors text-white placeholder:text-white/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
            <button 
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              title="Sincronizar com Servidor"
            >
              <RefreshCw size={18} className={loading ? "animate-spin text-primary" : ""} />
            </button>
            <button 
              onClick={() => setIsModalNovoOpen(true)}
              className="bg-primary hover:bg-amber-400 text-black font-black px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(255,191,0,0.3)] transition-all active:scale-95 text-sm"
            >
              <Plus size={18} /> Novo Agendamento
            </button>
          </div>
        </div>

        {/* 2. RESUMO DO DIA E FILTROS FINANCEIROS/OPERACIONAIS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
          <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold"><Clock size={16} /></div>
            <div>
              <p className="text-[10px] text-white/40 uppercase font-bold">Agendados Hoje</p>
              <p className="text-sm font-black text-white">{dailyStats.totalAgendados}</p>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 font-bold"><Check size={16} /></div>
            <div>
              <p className="text-[10px] text-green-400 uppercase font-bold">Pagos ({dailyStats.totalPagos})</p>
              <p className="text-sm font-black text-green-400">R$ {dailyStats.valorRecebido.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold"><AlertTriangle size={16} /></div>
            <div>
              <p className="text-[10px] text-amber-400 uppercase font-bold">Não Pagos ({dailyStats.totalNaoPagos})</p>
              <p className="text-sm font-black text-amber-400">R$ {(dailyStats.valorTotalPrevisto - dailyStats.valorRecebido).toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold"><User size={16} /></div>
            <div>
              <p className="text-[10px] text-blue-400 uppercase font-bold">Compareceram</p>
              <p className="text-sm font-black text-blue-400">{dailyStats.compareceram}</p>
            </div>
          </div>

          {/* Filtro de Pagamento */}
          <div className="sm:col-span-1 lg:col-span-1">
            <select
              value={filterPagamento}
              onChange={(e: any) => setFilterPagamento(e.target.value)}
              className="w-full h-full bg-black border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:border-primary focus:outline-none"
            >
              <option value="todos">Todos Pagamentos</option>
              <option value="nao_pago">🟡 Não Pagos</option>
              <option value="pago">🟢 Pagos</option>
            </select>
          </div>

          {/* Filtro de Tipo */}
          <div className="sm:col-span-1 lg:col-span-1">
            <select
              value={filterTipo}
              onChange={(e: any) => setFilterTipo(e.target.value)}
              className="w-full h-full bg-black border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:border-primary focus:outline-none"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="exame">👁️ Exames</option>
              <option value="entrega">📦 Entregas</option>
              <option value="ajuste">🛠️ Ajustes</option>
              <option value="retorno">📋 Retornos</option>
            </select>
          </div>

          {/* TABS DE VISUALIZAÇÃO */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 col-span-2 sm:col-span-2 lg:col-span-1 justify-between">
            <button 
              onClick={() => setCurrentView('dia')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'dia' ? 'bg-surface text-primary shadow' : 'text-white/40 hover:text-white'}`}
            >
              Dia
            </button>
            <button 
              onClick={() => setCurrentView('semana')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'semana' ? 'bg-surface text-primary shadow' : 'text-white/40 hover:text-white'}`}
            >
              Semana
            </button>
            <button 
              onClick={() => setCurrentView('mes')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'mes' ? 'bg-surface text-primary shadow' : 'text-white/40 hover:text-white'}`}
            >
              Mês
            </button>
            <button 
              onClick={() => setCurrentView('list')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'list' ? 'bg-surface text-primary shadow' : 'text-white/40 hover:text-white'}`}
            >
              Lista
            </button>
            <button 
              onClick={() => setCurrentView('kanban')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'kanban' ? 'bg-surface text-primary shadow' : 'text-white/40 hover:text-white'}`}
            >
              Kanban
            </button>
          </div>
        </div>

        {/* 3. BARRA DE NAVEGAÇÃO DE DATA */}
        <div className="flex justify-between items-center bg-black/20 px-4 py-2 rounded-xl border border-white/5">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCurrentDate(new Date())} 
              className="px-3 py-1 text-xs font-black bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors uppercase tracking-wider"
            >
              Hoje
            </button>
            <div className="flex items-center gap-1">
              <button onClick={handlePrevDate} className="p-1 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"><ChevronLeft size={18}/></button>
              <button onClick={handleNextDate} className="p-1 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"><ChevronRight size={18}/></button>
            </div>
            <span className="text-sm font-black text-white capitalize">
              {currentView === 'dia' && format(currentDate, "EEEE, dd 'de' MMMM yyyy", { locale: ptBR })}
              {currentView === 'semana' && `Semana de ${format(startOfWeek(currentDate), 'dd/MM')} a ${format(endOfWeek(currentDate), 'dd/MM/yyyy')}`}
              {currentView === 'mes' && format(currentDate, "MMMM yyyy", { locale: ptBR })}
              {(currentView === 'list' || currentView === 'kanban') && format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </span>
          </div>

          <div className="text-xs text-white/70 font-bold hidden sm:flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-[#137333] border-l-2 border-[#5bb974] inline-block"></span> Pago</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-[#1a73e8] border-l-2 border-[#8ab4f8] inline-block"></span> Não Pago / Padrão</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-[#5f6368] border-l-2 border-[#9aa0a6] inline-block"></span> Isento / Neutro</span>
          </div>
        </div>
      </div>

      {/* 4. CORPO DO CALENDÁRIO */}
      <div className="flex-1 overflow-hidden relative">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-white/50">
            <Loader2 className="animate-spin text-primary" size={40} />
            <p className="text-sm font-bold tracking-widest uppercase">Carregando Agenda do Supabase...</p>
          </div>
        ) : errorMessage ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center max-w-md mx-auto">
            <div className="p-4 bg-red-500/10 text-red-500 rounded-3xl border border-red-500/30"><AlertTriangle size={48} /></div>
            <h3 className="text-xl font-black text-white">Falha ao Carregar Agenda</h3>
            <p className="text-sm text-white/60">{errorMessage}</p>
            <button 
              onClick={fetchData}
              className="bg-primary hover:bg-amber-400 text-black font-black px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <>
            {currentView === 'dia' && (
              <AgendaDayOrWeekView 
                mode="dia" 
                currentDate={currentDate} 
                exames={filteredExames} 
                nowMinuteOffset={nowMinuteOffset}
                onChipClick={(ag) => setSelectedForPopover(ag)}
              />
            )}
            {currentView === 'semana' && (
              <AgendaDayOrWeekView 
                mode="semana" 
                currentDate={currentDate} 
                exames={filteredExames} 
                nowMinuteOffset={nowMinuteOffset}
                onChipClick={(ag) => setSelectedForPopover(ag)}
              />
            )}
            {currentView === 'mes' && (
              <AgendaCalendarMonthView 
                exames={filteredExames} 
                currentDate={currentDate} 
                onChipClick={(ag) => setSelectedForPopover(ag)} 
              />
            )}
            {currentView === 'list' && (
              <AgendaListView 
                exames={filteredExames} 
                onExameClick={(ag) => setSelectedForPopover(ag)} 
                onPushClick={(ag) => setSelectedExameForPush(ag)} 
              />
            )}
            {currentView === 'kanban' && (
              <AgendaKanbanView 
                exames={filteredExames} 
                onExameClick={(ag) => setSelectedForPopover(ag)} 
              />
            )}
          </>
        )}
      </div>

      {/* Popover Interativo (Google Calendar Style) */}
      <AgendaPopoverModal
        agendamento={selectedForPopover}
        onClose={() => setSelectedForPopover(null)}
        onRefresh={fetchData}
        onViewClientProfile={(id) => navigate(`/clientes?id=${id}`)}
      />

      {/* Modal de Confirmação Automática WhatsApp */}
      {selectedExameForPush && (
        <PushNotificationModal exame={selectedExameForPush} onClose={() => setSelectedExameForPush(null)} />
      )}

      {/* Modal Novo Agendamento V2 */}
      <AgendamentoModalV2 
        isOpen={isModalNovoOpen} 
        onClose={() => setIsModalNovoOpen(false)} 
        onSaveSuccess={fetchData} 
      />
    </div>
  );
}

// =========================================================================
// COMPONENTE: GRADE HORÁRIA DIA / SEMANA (COM SOBREPOSIÇÃO LADO A LADO)
// =========================================================================
function AgendaDayOrWeekView({
  mode,
  currentDate,
  exames,
  nowMinuteOffset,
  onChipClick
}: {
  mode: 'dia' | 'semana';
  currentDate: Date;
  exames: any[];
  nowMinuteOffset: number | null;
  onChipClick: (ag: any) => void;
}) {
  const days = useMemo(() => {
    if (mode === 'dia') return [currentDate];
    const start = startOfWeek(currentDate);
    return eachDayOfInterval({ start, end: endOfWeek(currentDate) });
  }, [mode, currentDate]);

  // Função helper que calcula o posicionamento de eventos sobrepostos (side-by-side)
  const getOverlappingLayout = (dayEvents: any[]) => {
    // Ordenar por horário de início
    const sorted = [...dayEvents].sort((a, b) => (a.horario || '08:00').localeCompare(b.horario || '08:00'));
    
    // Alocar em colunas para não sobrepor
    const columns: any[][] = [];
    sorted.forEach((event) => {
      const [h, m] = (event.horario || '08:00').split(':').map(Number);
      const startMin = (h - 8) * 60 + (m || 0);
      const endMin = startMin + (event.duracao_min || 30);

      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const lastInCol = columns[i][columns[i].length - 1];
        const [lh, lm] = (lastInCol.horario || '08:00').split(':').map(Number);
        const lastEndMin = (lh - 8) * 60 + (lm || 0) + (lastInCol.duracao_min || 30);
        
        if (startMin >= lastEndMin) {
          columns[i].push(event);
          event._colIndex = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([event]);
        event._colIndex = columns.length - 1;
      }
    });

    const totalCols = Math.max(1, columns.length);
    sorted.forEach(e => {
      e._totalCols = totalCols;
    });
    return sorted;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-surface/50">
      {/* Cabeçalho com dias da semana */}
      <div className="flex border-b border-white/10 bg-black/40 shrink-0">
        <div className="w-16 shrink-0 border-r border-white/5"></div>
        {days.map((day) => {
          const isTodayDate = isToday(day);
          return (
            <div key={day.toISOString()} className="flex-1 py-3 text-center border-r border-white/5 last:border-none">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{format(day, 'EEE', { locale: ptBR })}</p>
              <p className={`text-base font-black inline-flex items-center justify-center w-8 h-8 rounded-full mt-0.5 ${isTodayDate ? 'bg-primary text-black shadow-[0_0_15px_rgba(255,191,0,0.4)]' : 'text-white'}`}>
                {format(day, 'd')}
              </p>
            </div>
          );
        })}
      </div>

      {/* Grade de Horários com Scroll */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative flex">
        {/* Coluna de Horas */}
        <div className="w-16 shrink-0 border-r border-white/10 bg-black/20 select-none">
          {HOURS.map((h) => (
            <div key={h} className="h-[60px] border-b border-white/5 text-right pr-3 pt-1 text-[11px] font-bold text-white/40 font-mono">
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Colunas de Dias */}
        {days.map((day) => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayEvents = exames.filter(e => e.data === dayStr && e.status !== 'cancelado');
          const laidOutEvents = getOverlappingLayout(dayEvents);
          const isTodayDate = isToday(day);

          return (
            <div key={dayStr} className="flex-1 border-r border-white/5 relative min-h-[720px] bg-transparent">
              {/* Linhas Horizontais das horas e meias-horas */}
              {HOURS.map((h) => (
                <div key={h} className="h-[60px] border-b border-white/5 relative">
                  <div className="absolute top-1/2 w-full border-b border-white/[0.03] border-dashed"></div>
                </div>
              ))}

              {/* Linha Vermelha do Horário Atual (só aparece no dia de Hoje) */}
              {isTodayDate && nowMinuteOffset !== null && (
                <div 
                  style={{ top: `${nowMinuteOffset}px` }} 
                  className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                  <div className="flex-1 border-b-2 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                </div>
              )}

              {/* Blocos de Agendamento (Chips Posicionados) */}
              {laidOutEvents.map((ag) => {
                const [h, m] = (ag.horario || '08:00').split(':').map(Number);
                const topPx = (h - 8) * SLOT_HEIGHT + (m / 60) * SLOT_HEIGHT;
                const heightPx = Math.max(28, ((ag.duracao_min || 30) / 60) * SLOT_HEIGHT);
                
                const colIdx = ag._colIndex || 0;
                const totalCols = ag._totalCols || 1;
                const leftPct = (colIdx * 100) / totalCols;
                const widthPct = 100 / totalCols;

                // Estilo visual idêntico ao Google Calendar
                let bgStyle = 'bg-[#1a73e8] border-l-4 border-l-[#8ab4f8] text-white hover:bg-[#1557b0] shadow-md';
                if (ag.status_pagamento === 'pago') {
                  bgStyle = 'bg-[#137333] border-l-4 border-l-[#5bb974] text-white hover:bg-[#0d5324] shadow-md';
                } else if (ag.status_pagamento === 'isento') {
                  bgStyle = 'bg-[#5f6368] border-l-4 border-l-[#9aa0a6] text-white hover:bg-[#4a4d51] shadow-md';
                }

                const isCompareceu = ag.status === 'compareceu' || ag.status === 'concluído';
                const fimHorario = ag.fim_em ? parseUtcToSaoPaulo(ag.fim_em).horario : '';

                return (
                  <div
                    key={ag.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChipClick(ag);
                    }}
                    style={{
                      top: `${Math.max(0, topPx)}px`,
                      height: `${heightPx}px`,
                      left: `calc(${leftPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`
                    }}
                    className={`absolute z-20 rounded-lg p-2 cursor-pointer transition-all overflow-hidden flex flex-col justify-between ${bgStyle} ${isCompareceu ? 'opacity-85 ring-2 ring-white/60' : ''}`}
                  >
                    <div>
                      {/* 1. NOME E ÍCONE DO CLIENTE NO TOPO (IGUAL GOOGLE CALENDAR) */}
                      <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-white leading-tight truncate">
                        <User size={14} className="shrink-0 text-white/95 drop-shadow-sm" />
                        <span className="truncate font-black tracking-tight">{ag.paciente_nome || 'Cliente sem Nome'}</span>
                      </div>

                      {/* 2. HORÁRIO E TIPO LOGO ABAIXO DO NOME */}
                      <div className="text-[10px] sm:text-[11px] font-mono text-white/90 truncate mt-1 flex items-center gap-1">
                        <span>{ag.horario}{fimHorario ? ` - ${fimHorario}` : ''}</span>
                        <span>•</span>
                        <span className="uppercase font-bold tracking-wider text-[9px] bg-black/25 px-1.5 py-0.5 rounded">{ag.tipo || 'exame'}</span>
                      </div>
                    </div>

                    {heightPx > 50 && (
                      <div className="flex items-center justify-between text-[10px] font-bold text-white/90 mt-auto pt-1 border-t border-white/20">
                        <span className="flex items-center gap-1">
                          {ag.status_pagamento === 'pago' ? '✅ Pago' : '⏳ Pendente'}
                          {ag.valor ? ` (R$ ${Number(ag.valor).toFixed(0)})` : ''}
                        </span>
                        <span>{ag.paciente_whatsapp ? '📱 WhatsApp' : ''}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =========================================================================
// COMPONENTE: VIEW MÊS
// =========================================================================
function AgendaCalendarMonthView({ exames, currentDate, onChipClick }: { exames: any[], currentDate: Date, onChipClick: (ag: any) => void }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="h-full flex flex-col p-6">
      <div className="bg-surface border border-white/10 rounded-3xl flex-1 flex flex-col overflow-hidden shadow-2xl">
        <div className="grid grid-cols-7 border-b border-white/10 bg-black/30 shrink-0">
          {weekDays.map(day => (
            <div key={day} className="py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-white/40">{day}</div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 grid-rows-5 overflow-y-auto custom-scrollbar">
          {days.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isTodayDate = isToday(day);
            const dayExames = exames.filter(e => e.data === dayStr && e.status !== 'cancelado');

            return (
              <div key={dayStr} className={`border-r border-b border-white/5 p-2 flex flex-col gap-1 min-h-[110px] ${!isCurrentMonth ? 'bg-black/50 opacity-40' : 'bg-transparent'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full ${isTodayDate ? 'bg-primary text-black shadow-[0_0_10px_rgba(255,191,0,0.5)]' : 'text-white/70'}`}>
                    {format(day, 'd')}
                  </span>
                  {dayExames.length > 0 && (
                    <span className="text-[9px] font-bold bg-white/10 text-white/60 px-1.5 py-0.5 rounded">
                      {dayExames.length}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                  {dayExames.map((exame) => {
                    const isPago = exame.status_pagamento === 'pago';
                    const isIsento = exame.status_pagamento === 'isento';
                    
                    let pillStyle = 'bg-[#1a73e8] hover:bg-[#1557b0] border-l-4 border-l-[#8ab4f8] text-white';
                    if (isPago) pillStyle = 'bg-[#137333] hover:bg-[#0d5324] border-l-4 border-l-[#5bb974] text-white';
                    if (isIsento) pillStyle = 'bg-[#5f6368] hover:bg-[#4a4d51] border-l-4 border-l-[#9aa0a6] text-white';

                    return (
                      <div 
                        key={exame.id} 
                        onClick={(e) => {
                          e.stopPropagation();
                          onChipClick(exame);
                        }}
                        className={`rounded-md px-2 py-1 text-xs font-bold cursor-pointer transition-all truncate flex items-center gap-1.5 shadow-sm ${pillStyle}`}
                        title={`${exame.horario} - ${exame.paciente_nome || 'Cliente'} (${exame.tipo || 'exame'})`}
                      >
                        <User size={12} className="shrink-0 text-white/95" />
                        <span className="font-mono font-black text-[10px] shrink-0">{exame.horario}</span>
                        <span className="truncate font-extrabold tracking-tight">{exame.paciente_nome || 'Cliente sem Nome'}</span>
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

// =========================================================================
// COMPONENTE: VIEW LISTA
// =========================================================================
function AgendaListView({ exames, onExameClick, onPushClick }: { exames: any[], onExameClick: (ag: any) => void, onPushClick: (ag: any) => void }) {
  if (exames.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-white/40">
        <CalendarIcon size={48} className="mb-3 opacity-30" />
        <p className="text-sm font-bold uppercase tracking-widest">Nenhum agendamento encontrado no período ou filtro selecionado</p>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto h-full custom-scrollbar">
      <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-black/40 text-[10px] font-black uppercase text-white/40 tracking-widest">
              <th className="py-3 px-4">Horário / Data</th>
              <th className="py-3 px-4">Paciente</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Pagamento</th>
              <th className="py-3 px-4">Contato / Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {exames.map((exame) => (
              <tr key={exame.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onExameClick(exame)}>
                <td className="py-3.5 px-4 font-mono font-bold text-primary">
                  {exame.data ? format(parseISO(`${exame.data}T12:00:00`), 'dd/MM/yyyy') : ''} • {exame.horario}
                </td>
                <td className="py-3.5 px-4 font-bold text-white">
                  {exame.paciente_nome}
                </td>
                <td className="py-3.5 px-4 uppercase text-xs font-bold text-white/70">
                  {exame.tipo || 'exame'}
                </td>
                <td className="py-3.5 px-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${exame.status === 'confirmado' ? 'bg-blue-500/20 text-blue-400' : exame.status === 'compareceu' ? 'bg-green-500/20 text-green-400' : exame.status === 'faltou' ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary'}`}>
                    {exame.status}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${exame.status_pagamento === 'pago' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                    {exame.status_pagamento === 'pago' ? `✅ R$ ${Number(exame.valor || 0).toFixed(2)}` : '⏳ Não Pago'}
                  </span>
                </td>
                <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => onPushClick(exame)}
                    className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <MessageSquare size={15} /> Zap
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

// =========================================================================
// COMPONENTE: VIEW KANBAN
// =========================================================================
function AgendaKanbanView({ exames, onExameClick }: { exames: any[], onExameClick: (ag: any) => void }) {
  const columns = [
    { id: 'agendado', title: 'ABERTA / AGENDADA', color: 'bg-white/20', borderColor: 'border-white/20' },
    { id: 'confirmado', title: 'CONFIRMADOS', color: 'bg-blue-500', borderColor: 'border-blue-500' },
    { id: 'compareceu', title: 'COMPARECEU', color: 'bg-green-500', borderColor: 'border-green-500' },
    { id: 'faltou', title: 'FALTOU / IMPEDITIVO', color: 'bg-red-500', borderColor: 'border-red-500' },
  ];

  return (
    <div className="h-full flex overflow-x-auto custom-scrollbar p-6 gap-6">
      {columns.map(col => {
        const columnExames = exames.filter(e => (e.status || 'agendado').toLowerCase() === col.id);
        
        return (
          <div key={col.id} className="flex-1 min-w-[280px] flex flex-col">
            <div className={`py-3 px-4 rounded-t-2xl ${col.color} flex justify-between items-center shadow-lg border border-b-0 ${col.borderColor}`}>
              <h3 className="text-xs font-black uppercase tracking-widest text-white shadow-black drop-shadow-md">{col.title}</h3>
              <span className="bg-black/40 text-white text-[10px] font-black px-2 py-0.5 rounded-md">{columnExames.length}</span>
            </div>
            
            <div className={`flex-1 bg-surface border border-t-0 rounded-b-2xl ${col.borderColor} p-3 overflow-y-auto custom-scrollbar flex flex-col gap-3`}>
              {columnExames.length === 0 ? (
                <div className="flex-1 flex justify-center items-center p-6 border-2 border-dashed border-white/5 rounded-xl">
                  <p className="text-white/20 text-xs font-bold uppercase">Vazio</p>
                </div>
              ) : (
                columnExames.map(ag => (
                  <div 
                    key={ag.id} 
                    onClick={() => onExameClick(ag)}
                    className="bg-black/40 border border-white/10 rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:bg-white/5 transition-all group shadow-xl"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        {ag.data ? format(parseISO(`${ag.data}T12:00:00`), 'dd/MM') : ''} às {ag.horario}
                      </span>
                      <span className="text-[9px] uppercase font-bold text-white/50">{ag.tipo || 'exame'}</span>
                    </div>
                    <p className="font-bold text-white text-sm group-hover:text-primary transition-colors">{ag.paciente_nome}</p>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5 text-[10px]">
                      <span className={ag.status_pagamento === 'pago' ? 'text-green-400 font-bold' : 'text-amber-400'}>
                        {ag.status_pagamento === 'pago' ? `R$ ${Number(ag.valor || 0).toFixed(0)}` : 'Não Pago'}
                      </span>
                      <span className="text-white/40">{ag.duracao_min || 30} min</span>
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

// =========================================================================
// MODAL: NOVO AGENDAMENTO V2 (SEM FALLBACK SILENCIOSO, COM SUPORTE AVULSO)
// =========================================================================
function AgendamentoModalV2({ isOpen, onClose, onSaveSuccess }: { isOpen: boolean, onClose: () => void, onSaveSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [isAvulsoMode, setIsAvulsoMode] = useState(false);
  const [liberarOutrosDias, setLiberarOutrosDias] = useState(false);

  const [formData, setFormData] = useState({
    data: format(new Date(), 'yyyy-MM-dd'),
    horario: '14:00',
    duracao_min: 30,
    tipo: 'exame' as any,
    nome_avulso: '',
    telefone: '',
    status_pagamento: 'nao_pago' as any,
    valor: '',
    observacoes: ''
  });

  useEffect(() => {
    if (isOpen) {
      storage.getClients().then(setClients).catch(() => {});
      setSelectedClient(null);
      setSearchQuery('');
      setIsAvulsoMode(false);
      setLiberarOutrosDias(false);
      setFormData({
        data: format(new Date(), 'yyyy-MM-dd'),
        horario: '14:00',
        duracao_min: 30,
        tipo: 'exame',
        nome_avulso: '',
        telefone: '',
        status_pagamento: 'nao_pago',
        valor: '',
        observacoes: ''
      });
    }
  }, [isOpen]);

  const filteredClients = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return clients.filter(c => 
      c.cpf?.includes(q) || 
      (c.name || c.nome_completo || '').toLowerCase().includes(q) ||
      (c.whatsapp || '').includes(q)
    );
  }, [clients, searchQuery]);

  const handleSave = async () => {
    if (!isAvulsoMode && !selectedClient) {
      return toast.error('Selecione um cliente ou ative a opção "Agendamento Avulso".');
    }
    if (isAvulsoMode && !formData.nome_avulso.trim()) {
      return toast.error('Informe o Nome do cliente avulso.');
    }
    if (!formData.data || !formData.horario) {
      return toast.error('Informe a Data e o Horário do agendamento.');
    }

    // Regra de Quarta e Sexta apenas quando tipo for Exame (e se não foi liberado)
    if (formData.tipo === 'exame' && !liberarOutrosDias) {
      const dateObj = parseISO(`${formData.data}T12:00:00`);
      const dayOfWeek = getDay(dateObj); // 3=Qua, 5=Sex
      if (dayOfWeek !== 3 && dayOfWeek !== 5) {
        toast.error('Regra de Exames Ótica Lis', { 
          description: 'Os exames optométricos ocorrem de padrão nas QUARTAS e SEXTAS feiras. Se necessário agendar em outro dia, marque a caixa "Liberar agendamento em outros dias".', 
          duration: 6000 
        });
        return; 
      }
    }

    setLoading(true);
    try {
      await agendaService.salvarAgendamento({
        cliente_id: isAvulsoMode ? null : selectedClient.id,
        nome_avulso: isAvulsoMode ? formData.nome_avulso : undefined,
        telefone: isAvulsoMode ? formData.telefone : (selectedClient?.whatsapp || ''),
        tipo: formData.tipo,
        data: formData.data,
        horario: formData.horario,
        duracao_min: Number(formData.duracao_min || 30),
        status_pagamento: formData.status_pagamento,
        valor: parseFloat(formData.valor.replace(',', '.')) || 0,
        observacoes: formData.observacoes || undefined
      });

      toast.success('Agendamento salvo no Supabase com sucesso!');
      onSaveSuccess();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Erro ao salvar agendamento no Supabase.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="bg-surface w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/30">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Plus className="text-primary" /> Novo Agendamento V2
          </h3>
          <button onClick={onClose}><X size={24} className="text-white/40 hover:text-white" /></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* Seletor Cliente vs Avulso */}
          <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => { setIsAvulsoMode(false); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${!isAvulsoMode ? 'bg-surface text-primary shadow' : 'text-white/50 hover:text-white'}`}
            >
              👤 Cliente Cadastrado
            </button>
            <button
              type="button"
              onClick={() => { setIsAvulsoMode(true); setSelectedClient(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${isAvulsoMode ? 'bg-surface text-primary shadow' : 'text-white/50 hover:text-white'}`}
            >
              ⚡ Cliente Avulso / Rápido
            </button>
          </div>

          {!isAvulsoMode ? (
            !selectedClient ? (
              <div className="space-y-3">
                <label className="text-xs font-bold text-white/60">Pesquisar Cliente no Cadastro</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                  <input
                    type="text"
                    placeholder="Digite Nome, CPF ou WhatsApp..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white text-sm focus:border-primary focus:outline-none"
                  />
                </div>

                {searchQuery.length >= 2 && (
                  <div className="bg-black/60 border border-white/10 rounded-2xl max-h-48 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
                    {filteredClients.length > 0 ? (
                      filteredClients.map(c => (
                        <div
                          key={c.id}
                          onClick={() => setSelectedClient(c)}
                          className="p-3.5 hover:bg-white/10 cursor-pointer transition-colors flex justify-between items-center"
                        >
                          <div>
                            <p className="font-bold text-white text-sm">{c.name || c.nome_completo}</p>
                            <p className="text-xs text-white/40">{c.cpf ? `CPF: ${c.cpf}` : ''} {c.whatsapp ? `• 📱 ${c.whatsapp}` : ''}</p>
                          </div>
                          <Plus size={16} className="text-primary" />
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-white/40 font-bold">Nenhum cliente encontrado. Tente a opção "Cliente Avulso".</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-primary/10 border border-primary/30 p-4 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-primary font-black uppercase tracking-widest">Cliente Selecionado</p>
                  <p className="text-lg font-black text-white">{selectedClient.name || selectedClient.nome_completo}</p>
                  <p className="text-xs text-white/60">{selectedClient.whatsapp ? `📱 ${selectedClient.whatsapp}` : ''}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  className="bg-black/50 hover:bg-black text-white/80 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                >
                  Trocar
                </button>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div>
                <label className="text-xs font-bold text-white/60 mb-1 block">Nome do Paciente Avulso *</label>
                <input
                  type="text"
                  placeholder="Nome Completo"
                  value={formData.nome_avulso}
                  onChange={(e) => setFormData({...formData, nome_avulso: e.target.value})}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-white/60 mb-1 block">WhatsApp / Telefone</label>
                <input
                  type="text"
                  placeholder="Ex: 62 99999-9999"
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Tipo e Duração */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-white/60 mb-1 block">Tipo de Agendamento</label>
              <select
                value={formData.tipo}
                onChange={(e: any) => setFormData({...formData, tipo: e.target.value})}
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm font-bold focus:border-primary focus:outline-none"
              >
                <option value="exame">👁️ Exame Optométrico</option>
                <option value="entrega">📦 Entrega de Óculos</option>
                <option value="ajuste">🛠️ Ajuste / Manutenção</option>
                <option value="retorno">📋 Retorno</option>
                <option value="outro">🏷️ Outro Compromisso</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-white/60 mb-1 block">Duração Estimada</label>
              <select
                value={formData.duracao_min}
                onChange={(e: any) => setFormData({...formData, duracao_min: Number(e.target.value)})}
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm font-bold focus:border-primary focus:outline-none"
              >
                <option value={30}>30 minutos (Padrão)</option>
                <option value={45}>45 minutos</option>
                <option value={60}>1 hora (60 min)</option>
                <option value={90}>1 hora e meia (90 min)</option>
              </select>
            </div>
          </div>

          {/* Data e Horário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-white/60 mb-1 block">Data do Compromisso</label>
              <input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({...formData, data: e.target.value})}
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm font-bold focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-white/60 mb-1 block">Horário</label>
              <input
                type="time"
                value={formData.horario}
                onChange={(e) => setFormData({...formData, horario: e.target.value})}
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm font-bold focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {formData.tipo === 'exame' && (
            <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex items-center justify-between">
              <span className="text-xs text-white/60 font-medium">Liberar agendamento em outros dias (além de Qua/Sex)?</span>
              <input
                type="checkbox"
                checked={liberarOutrosDias}
                onChange={(e) => setLiberarOutrosDias(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 text-primary focus:ring-0"
              />
            </div>
          )}

          {/* Pagamento Previsto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
            <div>
              <label className="text-xs font-bold text-white/60 mb-1 block">Status de Pagamento</label>
              <select
                value={formData.status_pagamento}
                onChange={(e: any) => setFormData({...formData, status_pagamento: e.target.value})}
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm font-bold focus:border-primary focus:outline-none"
              >
                <option value="nao_pago">🟡 Não Pago / Cobrar Depois</option>
                <option value="pago">🟢 Pago / Adiantado</option>
                <option value="isento">⚪ Isento (Grátis)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-white/60 mb-1 block">Valor Previsto (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 50.00 ou 0.00"
                value={formData.valor}
                onChange={(e) => setFormData({...formData, valor: e.target.value})}
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm font-bold focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="text-xs font-bold text-white/60 mb-1 block">Observações Adicionais</label>
            <textarea
              rows={2}
              placeholder="Ex: Paciente com dificuldade de locomoção, trazer receita anterior..."
              value={formData.observacoes}
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm focus:border-primary focus:outline-none"
            />
          </div>

        </div>

        <div className="p-6 border-t border-white/10 bg-black/40 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-sm font-bold text-white/50 hover:text-white hover:bg-white/5 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="bg-primary hover:bg-amber-400 text-black font-black px-8 py-3 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading && <Loader2 className="animate-spin" size={16} />}
            Confirmar Agendamento no Servidor
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// PUSH NOTIFICATION MODAL (Confirmação)
// ==========================================
function PushNotificationModal({ exame, onClose }: { exame: any, onClose: () => void }) {
  const dateObj = parseISO(exame.data || format(new Date(), 'yyyy-MM-dd'));
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
        </div>
        <div className="flex gap-3 mt-2">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-white/40 hover:text-white bg-white/5 rounded-xl">Cancelar</button>
          <button onClick={handleConfirm} className="flex-1 bg-green-500 hover:bg-green-400 text-black py-3 text-sm font-black rounded-xl shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"><MessageSquare size={18} /> Enviar ZAP</button>
        </div>
      </div>
    </div>
  );
}

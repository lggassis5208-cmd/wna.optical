import { useState, useEffect } from 'react';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  Search,
  User,
  Clock,
  X,
  Loader2,
  Phone,
  CheckCircle2,
  Calendar as CalendarIcon
} from 'lucide-react';
import { storage } from '../lib/storage';
import { openWhatsApp } from '../lib/whatsappUtils';
import { toast } from 'sonner';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, addMonths, subMonths, 
  isSameMonth, isSameDay, parseISO, getDay, isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AgendaPage() {
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

  // Navegação no calendário
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToday = () => setCurrentDate(new Date());

  // Geração dos dias do calendário
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Função para abrir o Push Notification Modal
  const handleExameClick = (exame: any) => {
    setSelectedExameForPush(exame);
  };

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
      {/* Header do Google Calendar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-surface shrink-0">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="text-primary" /> Agenda Global
          </h2>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={goToday}
              className="px-4 py-2 text-sm font-semibold border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
            >
              Hoje
            </button>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <ChevronLeft size={20} />
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
            <h3 className="text-xl font-medium capitalize min-w-[150px]">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h3>
          </div>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-black font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
        >
          <Plus size={20} /> Criar
        </button>
      </div>

      {/* Grade do Calendário */}
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        <div className="bg-surface border border-white/5 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl">
          
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 border-b border-white/5 bg-black/20 shrink-0">
            {weekDays.map(day => (
              <div key={day} className="py-3 text-center text-xs font-bold uppercase tracking-widest text-white/40">
                {day}
              </div>
            ))}
          </div>

          {/* Células dos dias */}
          <div className="flex-1 grid grid-cols-7 grid-rows-5 overflow-y-auto custom-scrollbar">
            {days.map((day, i) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isTodayDate = isToday(day);
              
              // Filtra os eventos deste dia
              const dayExames = exames.filter(e => e.data === dayStr && e.status !== 'CANCELADO');
              const dayTransacoes = transacoes.filter(t => t.data_vencimento === dayStr);

              return (
                <div 
                  key={dayStr} 
                  className={`border-r border-b border-white/5 p-2 flex flex-col gap-1 min-h-[120px] ${!isCurrentMonth ? 'bg-black/40' : 'bg-transparent'}`}
                >
                  {/* Número do Dia */}
                  <div className="flex justify-center mb-1">
                    <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full ${isTodayDate ? 'bg-primary text-black' : (isCurrentMonth ? 'text-white/70' : 'text-white/20')}`}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Lista de Minicards */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                    {/* 1. Minicards de Exames */}
                    {dayExames.map((exame) => (
                      <div 
                        key={exame.id}
                        onClick={() => handleExameClick(exame)}
                        className="bg-primary/20 hover:bg-primary/30 border border-primary/20 text-primary rounded px-2 py-1 text-[10px] font-bold cursor-pointer transition-colors truncate flex items-center gap-1"
                        title={`${exame.horario} - ${exame.paciente_nome}`}
                      >
                        <Clock size={10} className="shrink-0" />
                        <span className="shrink-0">{exame.horario}</span>
                        <span className="truncate">{exame.paciente_nome}</span>
                      </div>
                    ))}

                    {/* 2. Minicards Financeiros */}
                    {dayTransacoes.map((transacao) => {
                      const isReceita = transacao.tipo === 'receita';
                      return (
                        <div 
                          key={transacao.id}
                          className={`rounded px-2 py-1 text-[10px] font-bold truncate flex items-center gap-1 border
                            ${isReceita 
                              ? 'bg-green-500/10 hover:bg-green-500/20 text-green-500 border-green-500/20' 
                              : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20'}
                          `}
                          title={`${isReceita ? 'Receber' : 'Pagar'}: ${transacao.descricao} - R$ ${transacao.valor}`}
                        >
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

      {/* Modals */}
      <AgendamentoModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          fetchData();
        }} 
      />

      {selectedExameForPush && (
        <PushNotificationModal 
          exame={selectedExameForPush} 
          onClose={() => setSelectedExameForPush(null)} 
        />
      )}
    </div>
  );
}

// ============================================================
// PUSH NOTIFICATION MODAL (Confirmação de WhatsApp)
// ============================================================
function PushNotificationModal({ exame, onClose }: { exame: any, onClose: () => void }) {
  
  // Identifica o dia da semana (0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab)
  const dateObj = parseISO(exame.data);
  const dayOfWeek = getDay(dateObj); // 3 = Quarta, 5 = Sexta

  const handleConfirm = () => {
    if (!exame.paciente_whatsapp) {
      toast.error('Paciente não possui WhatsApp cadastrado.');
      return;
    }

    let mensagem = '';
    const firstName = exame.paciente_nome?.split(' ')[0] || 'Cliente';

    if (dayOfWeek === 3) {
      // Quarta-feira
      mensagem = `*Ótica Lìs*
Olá tudo bem?
 📌 *${firstName}* 
lembre-se que você tem compromisso *Quarta-FEIRA,* às ${exame.horario} Hrs

*OTICA LÌS*
Avenida Anápolis
Qd 03 LT 01 Nª 2134 (em frente a clínica gedda)
Vila Concórdia - Goiânia/Go
Fone: 62 99285-8280`;

    } else if (dayOfWeek === 5) {
      // Sexta-feira
      mensagem = `*Ótica Lìs*
Olá tudo bem?
 📌 *${firstName}* 
lembre-se que você tem compromisso *SEXTA-FEIRA,* às ${exame.horario} Hrs

*OTICA LÌS*
Avenida das Esmeraldas 
Qd 42 LT 14 Sala 04 (em frente a feira de quarta feira)
Recanto das minas gerais - Goiânia/Go
Fone: 62 99283-1198`;
    } else {
      // Fallback genérico caso exista um agendamento antigo em outro dia
      mensagem = `*Ótica Lìs*
Olá tudo bem?
 📌 *${firstName}* 
lembre-se que você tem compromisso agendado para o dia ${format(dateObj, 'dd/MM/yyyy')} às ${exame.horario} Hrs.
Qualquer dúvida, entre em contato conosco!`;
    }

    openWhatsApp(exame.paciente_whatsapp, mensagem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-surface w-full max-w-md rounded-3xl border border-white/10 shadow-2xl p-6 flex flex-col gap-6">
        
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-500/10 text-green-500 rounded-2xl shrink-0">
            <MessageSquare size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Confirmação Automática</h3>
            <p className="text-sm text-white/40">Deseja enviar a mensagem de confirmação via WhatsApp para este paciente?</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <User size={16} className="text-primary" />
            <span className="text-sm font-bold text-white">{exame.paciente_nome}</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone size={16} className="text-primary" />
            <span className="text-sm font-bold text-white">{exame.paciente_whatsapp || 'Não cadastrado'}</span>
          </div>
          <div className="flex items-center gap-3">
            <CalendarIcon size={16} className="text-primary" />
            <span className="text-sm font-bold text-white">
              {format(parseISO(exame.data), 'dd/MM/yyyy')} às {exame.horario}
            </span>
          </div>
          
          <div className="mt-4 p-3 bg-black/30 rounded-xl border border-white/5">
            <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Gatilho Detectado:</p>
            <p className="text-xs text-green-400 font-medium">
              {dayOfWeek === 3 
                ? '📍 Unidade: Vila Concórdia (Quarta-feira)' 
                : dayOfWeek === 5 
                  ? '📍 Unidade: Recanto (Sexta-feira)' 
                  : '📍 Unidade: Matriz (Padrão)'}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <button 
            onClick={onClose}
            className="flex-1 py-3 text-sm font-bold text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleConfirm}
            className="flex-1 bg-green-500 hover:bg-green-400 text-black py-3 text-sm font-black rounded-xl transition-all shadow-lg shadow-green-500/20 active:scale-95 flex items-center justify-center gap-2"
          >
            <MessageSquare size={18} />
            Enviar WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}


// ============================================================
// MODAL DE AGENDAMENTO INTELIGENTE (Com bloqueio de dias)
// ============================================================
function AgendamentoModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [searchCpf, setSearchCpf] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showMiniCadastro, setShowMiniCadastro] = useState(false);
  const [showWhatsAppConfirm, setShowWhatsAppConfirm] = useState(false);
  const [savedAgendamento, setSavedAgendamento] = useState<any>(null);

  // Mini-cadastro fields
  const [novoNome, setNovoNome] = useState('');
  const [novoCpf, setNovoCpf] = useState('');
  const [novoWhatsapp, setNovoWhatsapp] = useState('');
  const [novoNascimento, setNovoNascimento] = useState('');

  const [formData, setFormData] = useState({
    data: '',
    horario: '',
  });

  useEffect(() => {
    if (isOpen) {
      storage.getClients().then(setClients);
      // Reset state
      setSelectedClient(null);
      setSearchCpf('');
      setShowMiniCadastro(false);
      setShowWhatsAppConfirm(false);
      setSavedAgendamento(null);
      setNovoNome('');
      setNovoCpf('');
      setNovoWhatsapp('');
      setNovoNascimento('');
      setFormData({ data: '', horario: '' });
    }
  }, [isOpen]);

  const filteredClients = searchCpf.length > 1 
    ? clients.filter(c => 
        c.cpf?.includes(searchCpf) || 
        (c.name || c.nome_completo || '').toLowerCase().includes(searchCpf.toLowerCase())
      )
    : [];

  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    setSearchCpf('');
    setShowMiniCadastro(false);
  };

  const handleCadastrarNovo = async () => {
    if (!novoNome.trim()) return toast.error('Nome é obrigatório.');
    const whatsappLimpo = novoWhatsapp.replace(/\D/g, '');
    if (!whatsappLimpo || whatsappLimpo.length < 10) return toast.error('WhatsApp inválido.');

    setLoading(true);
    try {
      const newClient = await storage.saveClient({
        nome_completo: novoNome.trim(),
        cpf: novoCpf.replace(/\D/g, ''),
        whatsapp: whatsappLimpo,
        data_nascimento: novoNascimento || null,
        lis_score: 850
      });
      setSelectedClient({ ...newClient, name: newClient.nome_completo || novoNome });
      setShowMiniCadastro(false);
      const updatedClients = await storage.getClients();
      setClients(updatedClients);
      toast.success('Cliente cadastrado com sucesso!');
    } catch (e: any) {
      toast.error('Erro ao cadastrar cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedClient) return toast.error('Selecione um cliente para agendar.');
    if (!formData.data) return toast.error('Selecione uma data.');
    if (!formData.horario) return toast.error('Selecione um horário.');

    // VALIDAÇÃO DA REGRA DE NEGÓCIO: Só Quarta e Sexta
    const dateObj = parseISO(formData.data);
    const dayOfWeek = getDay(dateObj); // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
    
    if (dayOfWeek !== 3 && dayOfWeek !== 5) {
      toast.error('Alerta de Agendamento', {
        description: 'Só podemos agendar consultas nas QUARTAS e SEXTAS feiras. Favor agendar novamente.',
        duration: 8000,
      });
      return; // CANCELA E BLOQUEIA A SALVAGEM
    }

    const clientWhatsapp = selectedClient.whatsapp?.replace(/\D/g, '') || '';

    setLoading(true);
    try {
      const result = await storage.saveExame({
        cliente_id: selectedClient.id,
        data: formData.data,
        horario: formData.horario,
        status: 'AGENDADO',
        paciente_nome: selectedClient.name || selectedClient.nome_completo,
        paciente_cpf: selectedClient.cpf,
        paciente_whatsapp: clientWhatsapp
      });

      setSavedAgendamento({
        ...result,
        paciente_nome: selectedClient.name || selectedClient.nome_completo,
        paciente_whatsapp: clientWhatsapp
      });

      setShowWhatsAppConfirm(true);
      toast.success('Agendamento realizado com sucesso!');
    } catch (e) {
      toast.error('Erro ao salvar agendamento.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Tela Final após salvar (Confirmação opcional)
  if (showWhatsAppConfirm && savedAgendamento) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-surface w-full max-w-md rounded-3xl border border-white/10 shadow-2xl p-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Agendado com Sucesso!</h3>
          <p className="text-white/60 mb-8">
            O exame de {savedAgendamento.paciente_nome} foi marcado. O card já aparece na sua agenda!
          </p>
          <button 
            onClick={onClose}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl transition-colors"
          >
            Voltar para Agenda
          </button>
        </div>
      </div>
    );
  }

  // Tela de Criação
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h3 className="text-xl font-bold">Novo Agendamento</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {/* Seleção de Cliente */}
          {!selectedClient ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                <input 
                  type="text"
                  placeholder="Buscar paciente por nome ou CPF..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-lg focus:outline-none focus:border-primary/50 transition-colors text-white"
                  value={searchCpf}
                  onChange={(e) => setSearchCpf(e.target.value)}
                  autoFocus
                />
              </div>

              {searchCpf.length > 1 && (
                <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-top-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {filteredClients.length > 0 ? (
                    filteredClients.map(client => (
                      <div 
                        key={client.id}
                        onClick={() => handleSelectClient(client)}
                        className="p-4 border-b border-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                      >
                        <p className="font-bold text-white">{client.name || client.nome_completo}</p>
                        <p className="text-xs text-white/40 mt-1 flex items-center gap-2">
                          <span className="font-mono">{client.cpf}</span>
                          <span>•</span>
                          <span>WhatsApp: {client.whatsapp || 'Não cadastrado'}</span>
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-white/40 mb-4">Nenhum paciente encontrado.</p>
                      <button 
                        onClick={() => setShowMiniCadastro(true)}
                        className="bg-primary/20 text-primary font-bold px-4 py-2 rounded-lg hover:bg-primary/30 transition-colors"
                      >
                        Cadastrar Novo Paciente Rápido
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Mini Cadastro */}
              {showMiniCadastro && (
                <div className="bg-white/5 border border-primary/30 rounded-xl p-6 space-y-4 animate-in slide-in-from-top-4">
                  <h4 className="font-bold text-primary flex items-center gap-2">
                    <User size={18} /> Cadastro Rápido
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-white/40 uppercase mb-1 block">Nome Completo *</label>
                      <input type="text" className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-primary/50 outline-none" value={novoNome} onChange={e => setNovoNome(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-white/40 uppercase mb-1 block">WhatsApp *</label>
                      <input type="text" placeholder="(DD) 90000-0000" className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-primary/50 outline-none" value={novoWhatsapp} onChange={e => setNovoWhatsapp(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button onClick={handleCadastrarNovo} disabled={loading} className="bg-primary text-black font-bold px-6 py-2 rounded-lg hover:brightness-110 flex items-center gap-2">
                      {loading ? <Loader2 size={16} className="animate-spin" /> : 'Salvar Paciente e Continuar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Cliente Selecionado - Passando para Data e Hora */
            <div className="space-y-6">
              <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Paciente Selecionado</p>
                  <p className="font-bold text-white text-lg">{selectedClient.name || selectedClient.nome_completo}</p>
                </div>
                <button 
                  onClick={() => setSelectedClient(null)}
                  className="text-white/40 hover:text-white text-sm underline transition-colors"
                >
                  Trocar
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-white/70 block mb-2">Data do Exame</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    <input 
                      type="date" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-primary/50 transition-colors text-white color-scheme-dark"
                      value={formData.data}
                      onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    />
                  </div>
                  <p className="text-[10px] text-white/40 mt-1 ml-1">Atenção: Apenas Quartas e Sextas.</p>
                </div>

                <div>
                  <label className="text-sm font-bold text-white/70 block mb-2">Horário</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    <input 
                      type="time" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-primary/50 transition-colors text-white color-scheme-dark"
                      value={formData.horario}
                      onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white/40 hover:text-white hover:bg-white/5 transition-colors">
            Cancelar
          </button>
          <button 
            disabled={loading || !selectedClient}
            onClick={handleSave}
            className="bg-primary text-black px-8 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Confirmar Agendamento'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  Clock, 
  X, 
  Loader2,
  RefreshCw,
  MessageSquare,
  UserPlus,
  CheckCircle2,
  Phone,
  User
} from 'lucide-react';
import { storage } from '../lib/storage';
import { openWhatsApp } from '../lib/whatsappUtils';
import { toast } from 'sonner';
import { formatDate } from '../lib/dateUtils';

export default function AgendaPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exames, setExames] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchExames = async () => {
    const data = await storage.getExames();
    setExames(data);
  };

  useEffect(() => {
    fetchExames();
  }, []);

  const handleSyncGoogle = () => {
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 2000)),
      {
        loading: 'Sincronizando com Google Calendar...',
        success: 'Agenda sincronizada com sucesso!',
        error: 'Erro ao sincronizar',
      }
    );
  };

  const isWithin12h = (data: string, horario: string) => {
    const examDate = new Date(`${data}T${horario}:00`);
    const now = new Date();
    const diff = examDate.getTime() - now.getTime();
    return diff > 0 && diff <= 12 * 60 * 60 * 1000;
  };

  const filteredExames = exames.filter(e => 
    e.paciente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.paciente_cpf?.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Agenda de Exames</h2>
          <p className="text-white/40 text-sm italic">Gestão de horários e pacientes</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSyncGoogle}
            className="bg-white/5 border border-white/10 text-white/70 px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-white/10 transition-all text-sm font-bold"
          >
            <RefreshCw size={18} />
            Sincronizar Google
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-black font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
          >
            <Plus size={20} />
            Novo Agendamento
          </button>
        </div>
      </div>

      <AgendamentoModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          fetchExames();
        }} 
      />

      <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between gap-4 bg-white/[0.01]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por paciente ou CPF..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/20 text-white/40 text-xs uppercase tracking-widest font-semibold">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Horário</th>
                <th className="px-6 py-4">Paciente</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredExames.length === 0 ? (
                <tr>
                   <td colSpan={4} className="px-6 py-10 text-center text-white/20 italic">
                      Nenhum agendamento encontrado.
                   </td>
                </tr>
              ) : filteredExames.map((exame) => (
                <tr key={exame.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 font-mono font-bold text-white/70">
                    {formatDate(exame.data)}
                  </td>
                  <td className="px-6 py-4 flex items-center gap-2 font-medium">
                    <Clock size={14} className="text-primary" />
                    {exame.horario}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-white">{exame.paciente_nome}</p>
                    <p className="text-xs text-white/30">{exame.paciente_cpf}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <StatusBadge status={exame.status} />
                       {isWithin12h(exame.data, exame.horario) && exame.status === 'AGENDADO' && (
                          <button 
                            onClick={() => {
                              if (!exame.paciente_whatsapp) {
                                toast.error('Telefone não cadastrado.');
                                return;
                              }
                              openWhatsApp(
                                exame.paciente_whatsapp, 
                                `Olá ${exame.paciente_nome}, confirmamos seu exame na Ótica Lìs para amanhã às ${exame.horario}? Vila Concórdia aguarda você!`
                              )
                            }}
                            disabled={!exame.paciente_whatsapp}
                            title={!exame.paciente_whatsapp ? 'Cadastre o Zap primeiro' : 'Enviar Lembrete 12h'}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all border text-[10px] font-black uppercase tracking-widest ${
                              !exame.paciente_whatsapp 
                                ? 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed' 
                                : 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'
                            }`}
                          >
                             <MessageSquare size={14} />
                             {!exame.paciente_whatsapp ? 'Sem Zap' : 'Avisar Cliente'}
                          </button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL DE AGENDAMENTO INTELIGENTE
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

  // Filtra clientes conforme o termo de busca
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
    if (!whatsappLimpo || whatsappLimpo.length < 10) return toast.error('WhatsApp inválido. Digite o número completo com DDD.');

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
      // Refresh clients list
      const updatedClients = await storage.getClients();
      setClients(updatedClients);
      toast.success('Cliente cadastrado com sucesso!');
    } catch (e: any) {
      toast.error('Erro ao cadastrar cliente: ' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedClient) return toast.error('Selecione um cliente para agendar.');
    if (!formData.data) return toast.error('Selecione uma data.');
    if (!formData.horario) return toast.error('Selecione um horário.');

    const clientWhatsapp = selectedClient.whatsapp?.replace(/\D/g, '') || '';
    if (!clientWhatsapp || clientWhatsapp.length < 10) {
      return toast.error('Este cliente não possui WhatsApp válido. Atualize o cadastro antes de agendar.');
    }

    setLoading(true);
    try {
      const result = await storage.saveExame({
        cliente_id: selectedClient.id,
        data: formData.data,
        horario: formData.horario,
        status: 'AGENDADO',
        // Campos de fallback para localStorage
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

  // ---- TELA DE CONFIRMAÇÃO WHATSAPP ----
  if (showWhatsAppConfirm && savedAgendamento) {
    const dataFormatada = new Date(savedAgendamento.data + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long'
    });

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-surface w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95">
          <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center animate-in zoom-in duration-500">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Agendamento Confirmado!</h3>
              <p className="text-white/50 text-sm mt-2">
                <span className="font-bold text-white">{savedAgendamento.paciente_nome}</span> agendado para{' '}
                <span className="text-primary font-bold">{dataFormatada}</span> às{' '}
                <span className="text-primary font-bold">{savedAgendamento.horario}</span>
              </p>
            </div>

            <button
              onClick={() => {
                openWhatsApp(
                  savedAgendamento.paciente_whatsapp,
                  `Olá, ${savedAgendamento.paciente_nome}! Seu exame de vista na Ótica Lìs foi agendado com sucesso para o dia ${dataFormatada} às ${savedAgendamento.horario}. Te aguardamos na Vila Concórdia! Qualquer dúvida, fale conosco.`
                );
              }}
              className="w-full bg-green-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-green-600 transition-all active:scale-95 shadow-lg shadow-green-500/30 text-lg"
            >
              <MessageSquare size={24} />
              Enviar Confirmação de Agendamento
            </button>

            <button
              onClick={onClose}
              className="text-white/30 hover:text-white text-sm font-bold transition-colors"
            >
              Fechar sem enviar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- FORMULÁRIO PRINCIPAL DE AGENDAMENTO ----
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <CalendarIcon size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">Novo Agendamento</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* STEP 1: Selecionar ou Cadastrar Cliente */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-white/20 uppercase tracking-widest ml-1 flex items-center gap-2">
              <User size={14} />
              Paciente
            </label>

            {selectedClient ? (
              <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                  {(selectedClient.name || selectedClient.nome_completo || 'C').charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">{selectedClient.name || selectedClient.nome_completo}</p>
                  <p className="text-xs text-white/40">{selectedClient.cpf} • <Phone size={10} className="inline" /> {selectedClient.whatsapp}</p>
                </div>
                <button 
                  onClick={() => setSelectedClient(null)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
                    <Search size={18} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Buscar por nome ou CPF..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    value={searchCpf}
                    onChange={(e) => {
                      setSearchCpf(e.target.value);
                      setShowMiniCadastro(false);
                    }}
                  />
                </div>

                {/* Dropdown de resultados */}
                {filteredClients.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                    {filteredClients.slice(0, 5).map(client => (
                      <button
                        key={client.id}
                        onClick={() => handleSelectClient(client)}
                        className="w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors flex items-center gap-3 border-b border-white/5 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {(client.name || client.nome_completo || 'C').charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{client.name || client.nome_completo}</p>
                          <p className="text-[10px] text-white/30">{client.cpf} • {client.whatsapp}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Botão para cadastrar novo */}
                {searchCpf.length > 2 && filteredClients.length === 0 && !showMiniCadastro && (
                  <button
                    onClick={() => {
                      setShowMiniCadastro(true);
                      setNovoNome(searchCpf.replace(/[0-9.-]/g, '').trim());
                      setNovoCpf(searchCpf.replace(/\D/g, ''));
                    }}
                    className="w-full p-4 bg-primary/5 border border-primary/20 border-dashed rounded-xl text-sm font-bold text-primary hover:bg-primary/10 transition-all flex items-center justify-center gap-2"
                  >
                    <UserPlus size={18} />
                    Cadastrar Novo Paciente
                  </button>
                )}

                {/* Mini-formulário de cadastro rápido */}
                {showMiniCadastro && (
                  <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl space-y-3 animate-in slide-in-from-top duration-300">
                    <p className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                      <UserPlus size={14} />
                      Cadastro Rápido
                    </p>
                    <input 
                      type="text" 
                      placeholder="Nome Completo *"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="text" 
                        placeholder="CPF"
                        className="bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                        value={novoCpf}
                        onChange={(e) => setNovoCpf(e.target.value)}
                      />
                      <input 
                        type="text" 
                        placeholder="WhatsApp (obrigatório) *"
                        className="bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                        value={novoWhatsapp}
                        onChange={(e) => setNovoWhatsapp(e.target.value)}
                      />
                    </div>
                    <input 
                      type="date" 
                      placeholder="Data de Nascimento"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white/60"
                      value={novoNascimento}
                      onChange={(e) => setNovoNascimento(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowMiniCadastro(false)}
                        className="flex-1 py-2 rounded-xl text-sm font-bold text-white/40 hover:text-white bg-white/5 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        disabled={loading}
                        onClick={handleCadastrarNovo}
                        className="flex-1 py-2 rounded-xl text-sm font-black bg-primary text-black hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <><UserPlus size={16} /> Cadastrar</>}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* STEP 2: Data e Horário */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/20 uppercase tracking-widest ml-1">Data</label>
              <input 
                type="date" 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white"
                value={formData.data}
                onChange={(e) => setFormData({...formData, data: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/20 uppercase tracking-widest ml-1">Horário</label>
              <input 
                type="time" 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white"
                value={formData.horario}
                onChange={(e) => setFormData({...formData, horario: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white/40 hover:text-white transition-colors">
            Cancelar
          </button>
          <button 
            disabled={loading || !selectedClient}
            onClick={handleSave}
            className="bg-primary text-black px-8 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Agendar Exame'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    AGENDADO: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    REALIZADO: 'bg-green-500/10 text-green-500 border-green-500/20',
    CANCELADO: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status] || styles.AGENDADO}`}>
      {status}
    </span>
  );
}

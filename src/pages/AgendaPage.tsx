import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  Clock, 
  X, 
  Loader2
} from 'lucide-react';
import { storage } from '../lib/storage';
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
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-black font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
        >
          <Plus size={20} />
          Novo Agendamento
        </button>
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
                    <StatusBadge status={exame.status} />
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

function AgendamentoModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    paciente_nome: '',
    paciente_cpf: '',
    data: '',
    horario: '',
    status: 'AGENDADO'
  });

  useEffect(() => {
    if (isOpen) {
      storage.getClients().then(setClients);
    }
  }, [isOpen]);


  const handleSave = async () => {
    if (!formData.data || !formData.horario || !formData.paciente_nome) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      await storage.saveExame(formData);
      toast.success('Agendamento realizado com sucesso!');
      onClose();
    } catch (e) {
      toast.error('Erro ao salvar agendamento');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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
          <div className="space-y-4">
            <label className="text-xs font-bold text-white/20 uppercase tracking-widest ml-1">Buscar Paciente (CPF)</label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
                <Search size={18} />
              </div>
              <input 
                type="text" 
                placeholder="000.000.000-00"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                value={formData.paciente_cpf}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({...formData, paciente_cpf: val});
                  const found = clients.find(c => c.cpf?.includes(val));
                  if (found && val.length > 5) setFormData(prev => ({ ...prev, paciente_nome: found.name, paciente_cpf: found.cpf }));
                }}
              />
            </div>
            <input 
              type="text" 
              placeholder="Nome do Paciente"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              value={formData.paciente_nome}
              onChange={(e) => setFormData({...formData, paciente_nome: e.target.value})}
            />
          </div>

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
            disabled={loading}
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

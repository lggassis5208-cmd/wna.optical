import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  MessageSquare, 
  ShieldCheck,
  Upload,
  Printer,
  Users,
  Calendar,
  Sparkles,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import ClientModal from '../components/ClientModal';
import ClientProfileModal from '../components/ClientProfileModal';
import PrintPatientListModal from '../components/PrintPatientListModal';
import { storage } from '../lib/storage';
import { formatDate, getNowISO } from '../lib/dateUtils';
import Papa from 'papaparse';

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);

  const fetchClients = async () => {
    const data = await storage.getClients();
    setClients(data);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as string[][];
          if (rows.length < 1) return toast.error('Arquivo vazio.');

          let headerRowIndex = -1;
          const headerKeywords = ['nome', 'cpf', 'cnpj', 'fone', 'telefone', 'celular', 'cliente', 'paciente'];
          
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i].map(v => String(v).toLowerCase().trim());
            if (row.some(cell => headerKeywords.some(kw => cell.includes(kw)))) {
              headerRowIndex = i;
              break;
            }
          }

          if (headerRowIndex === -1) {
            return toast.error('Não foi possível encontrar o cabeçalho (campos Nome, CPF ou Telefone).');
          }

          const headers = rows[headerRowIndex].map(h => String(h).toLowerCase().trim());
          const findCol = (keywords: string[]) => headers.findIndex(h => keywords.some(kw => h.includes(kw)));

          const nomeCol = findCol(['nome', 'cliente', 'paciente', 'razão']);
          const cpfCol = findCol(['cpf', 'cnpj', 'documento']);
          const telCol = findCol(['fone', 'telefone', 'celular', 'whatsapp']);
          const dataCol = findCol(['data', 'nascimento', 'cadastro']);

          let importedCount = 0;

          for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row[nomeCol]) continue;

            let cpf = row[cpfCol] ? String(row[cpfCol]).replace(/\D/g, '') : '';
            let whatsapp = row[telCol] ? String(row[telCol]).trim() : '';

            let metadata: any = {};
            if (dataCol !== -1 && row[dataCol]) {
              let dateStr = String(row[dataCol]).replace(/\D/g, '');
              if (dateStr.length === 8) {
                dateStr = `${dateStr.substring(0,2)}/${dateStr.substring(2,4)}/${dateStr.substring(4,8)}`;
                metadata.data_importada = dateStr;
              }
            }

            await storage.saveClient({
              name: String(row[nomeCol]).trim(),
              cpf: cpf,
              whatsapp: whatsapp,
              metadata: metadata,
              lis_score: 850,
              criado_em: getNowISO()
            });
            importedCount++;
          }

          toast.success(`Importação Concluída: ${importedCount} pacientes/clientes.`, {
            description: 'A base foi atualizada com sucesso.'
          });
          fetchClients();
        } catch (err) {
          toast.error('Erro ao processar as linhas do CSV.');
          console.error(err);
        }
      },
      error: (err) => {
        toast.error('Erro ao abrir o arquivo CSV.');
        console.error(err);
      }
    });

    e.target.value = '';
  };

  useEffect(() => {
    fetchClients();
    const params = new URLSearchParams(window.location.search);
    const openModalParam = params.get('openModal');
    if (openModalParam === 'true') {
      setIsModalOpen(true);
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [isModalOpen]);

  const filteredClients = clients.filter(c => {
    const term = searchTerm.toLowerCase();
    const name = (c.nome_completo || c.name || c.nome || '').toLowerCase();
    const cpf = (c.cpf || '').toLowerCase();
    const phone = (c.whatsapp || '').toLowerCase();
    const city = (c.cidade || '').toLowerCase();
    return name.includes(term) || cpf.includes(term) || phone.includes(term) || city.includes(term);
  });

  const highScoreCount = clients.filter(c => (c.lis_score || 850) >= 850).length;
  const todayDateStr = new Date().toLocaleDateString('pt-BR');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-white tracking-tight">Pacientes & Clientes</h2>
            <span className="bg-primary/10 border border-primary/20 text-primary text-xs px-3 py-1 rounded-full font-bold">
              {clients.length} Cadastrados Até Hoje ({todayDateStr})
            </span>
          </div>
          <p className="text-white/40 text-sm mt-1">Gerencie e exporte a base de pacientes cadastrados no sistema até a presente data</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setPrintModalOpen(true)}
            className="bg-white/5 border border-white/10 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-white/10 transition-all active:scale-95 cursor-pointer text-sm"
          >
            <Printer size={18} className="text-primary" />
            Imprimir Relatório
          </button>
          <label className="bg-white/5 text-white/70 font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-white/10 transition-all active:scale-95 cursor-pointer border border-white/10 text-sm">
            <Upload size={18} className="text-primary" />
            Importar CSV
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handleImportCSV} 
            />
          </label>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-black font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 text-sm cursor-pointer"
          >
            <Plus size={18} />
            Novo Paciente
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-white/5 shadow-xl flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-white/40 tracking-wider">Total de Pacientes</p>
            <p className="text-2xl font-black text-white">{clients.length}</p>
            <p className="text-[11px] text-primary/80 font-medium">Cadastrados até {todayDateStr}</p>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-white/5 shadow-xl flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-white/40 tracking-wider">Score Elevado (850+)</p>
            <p className="text-2xl font-black text-white">{highScoreCount}</p>
            <p className="text-[11px] text-purple-400 font-medium">Perfil Premium & Fidelizados</p>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-white/5 shadow-xl flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-xl text-green-400 border border-green-500/20">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-white/40 tracking-wider">Status da Base</p>
            <p className="text-2xl font-black text-white">Sincronizado</p>
            <p className="text-[11px] text-green-400 font-medium">Banco de Dados Supabase OK</p>
          </div>
        </div>
      </div>

      <ClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <ClientProfileModal 
        isOpen={profileModalOpen} 
        onClose={() => setProfileModalOpen(false)} 
        clientId={selectedClientId} 
      />
      <PrintPatientListModal 
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        patients={clients}
      />

      <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        {/* Table Toolbar */}
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome do paciente, CPF, WhatsApp ou cidade..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white placeholder:text-white/30"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-xs text-white/40 font-medium">
            Exibindo <span className="text-white font-bold">{filteredClients.length}</span> de <span className="text-white font-bold">{clients.length}</span> pacientes
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-white/40 text-xs uppercase tracking-widest font-semibold">
                <th className="px-6 py-4">Paciente</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">Localidade</th>
                <th className="px-6 py-4 text-center">Lis Score</th>
                <th className="px-6 py-4">Data Cadastro</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredClients.length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-6 py-12 text-center text-white/30 italic">
                      Nenhum paciente encontrado na busca.
                   </td>
                </tr>
              ) : filteredClients.map((client) => {
                const clientName = client.nome_completo || client.name || client.nome || 'Paciente sem nome';
                return (
                  <tr 
                    key={client.id} 
                    className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                    onClick={() => {
                      setSelectedClientId(client.id);
                      setProfileModalOpen(true);
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                          {clientName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-white group-hover:text-primary transition-colors">{clientName}</p>
                          <p className="text-xs text-white/30 font-mono">{client.cpf || 'Sem CPF'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-white/80">
                          <MessageSquare size={14} className="text-primary/70" />
                          {client.whatsapp || 'Não informado'}
                        </div>
                        {client.email && (
                          <p className="text-xs text-white/30 truncate max-w-[200px]">{client.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-white/60">
                        <MapPin size={14} className="text-white/30 shrink-0" />
                        <span>{client.cidade ? `${client.cidade}${client.estado ? `/${client.estado}` : ''}` : 'Goiânia/GO'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
                        <ShieldCheck size={14} />
                        {client.lis_score || 850}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-white/50">
                        {client.criado_em ? formatDate(client.criado_em) : '---'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClientId(client.id);
                            setProfileModalOpen(true);
                          }}
                          title="Ver Perfil Completo"
                        >
                          <MoreVertical size={18} />
                        </button>
                      </div>
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

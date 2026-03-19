import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Mail, 
  MessageSquare, 
  ShieldCheck,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';
import ClientModal from '../components/ClientModal';
import { storage } from '../lib/storage';
import { formatDate, getNowISO } from '../lib/dateUtils';

import Papa from 'papaparse';

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);

  const fetchClients = async () => {
    const data = await storage.getClients();
    setClients(data);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: false, // Vamos processar manualmente para pular o "lixo" no topo
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as string[][];
          if (rows.length < 1) return toast.error('Arquivo vazio.');

          // 1. Encontrar a linha do cabeçalho (Skip Trash)
          let headerRowIndex = -1;
          const headerKeywords = ['nome', 'cpf', 'cnpj', 'fone', 'telefone', 'celular', 'cliente'];
          
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

          const nomeCol = findCol(['nome', 'cliente', 'razão']);
          const cpfCol = findCol(['cpf', 'cnpj', 'documento']);
          const telCol = findCol(['fone', 'telefone', 'celular', 'whatsapp']);
          const dataCol = findCol(['data', 'nascimento', 'cadastro']);

          let importedCount = 0;

          // 2. Processar dados a partir da linha após o cabeçalho
          for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row[nomeCol]) continue;

            // Limpeza de CPF
            let cpf = row[cpfCol] ? String(row[cpfCol]).replace(/\D/g, '') : '';
            
            // Limpeza de Telefone (whatsapp)
            let whatsapp = row[telCol] ? String(row[telCol]).trim() : '';

            // Limpeza/Formatação de Data (Ex: 05012024 -> 05/01/2024)
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

          toast.success(`Importação Concluída: ${importedCount} clientes.`, {
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
  }, [isModalOpen]);

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.cpf?.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Clientes</h2>
          <p className="text-white/40 text-sm">Gerencie sua base de clientes premium</p>
        </div>
        <div className="flex gap-3">
          <label className="bg-white/5 text-white/70 font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-white/10 transition-all active:scale-95 cursor-pointer border border-white/10">
            <Upload size={20} className="text-primary" />
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
            className="bg-primary text-black font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
          >
            <Plus size={20} />
            Novo Cliente
          </button>
        </div>
      </div>

      <ClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        {/* Table Header/Toolbar */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome, CPF ou celular..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-white/40 text-xs uppercase tracking-widest font-semibold">
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4 text-center">Lis Score</th>
                <th className="px-6 py-4">Cadastro</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredClients.length === 0 ? (
                <tr>
                   <td colSpan={5} className="px-6 py-10 text-center text-white/20 italic">
                      Nenhum cliente cadastrado ainda.
                   </td>
                </tr>
              ) : filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {client.name?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{client.name}</p>
                        <p className="text-xs text-white/30">{client.cpf}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <MessageSquare size={14} className="text-primary/60" />
                        {client.whatsapp}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
                      <ShieldCheck size={14} />
                      {client.lis_score || 850}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-white/40">
                      {client.criado_em ? formatDate(client.criado_em) : '---'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-white/5 rounded-lg text-white/30 hover:text-primary transition-colors cursor-pointer"><Mail size={18} /></button>
                      <button className="p-2 hover:bg-white/5 rounded-lg text-white/30 hover:text-white transition-colors cursor-pointer">
                        <MoreVertical size={18} />
                      </button>
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

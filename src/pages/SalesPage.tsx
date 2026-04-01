import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  Truck, 
  AlertCircle,
  MoreVertical,
  FileText,
  Printer,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import SaleModal from '../components/SaleModal';
import PrintOS from '../components/PrintOS';
import { storage } from '../lib/storage';
import { formatDate } from '../lib/dateUtils';
import { openWhatsApp } from '../lib/whatsappUtils';

export default function SalesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sales, setSales] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState<any>(null);
  const [activeSale, setActiveSale] = useState<any>(null);

  const fetchSales = async () => {
    const [salesData, settingsData, clientsData] = await Promise.all([
      storage.getSales(),
      storage.getSettings(),
      storage.getClients()
    ]);

    // Enriquecer vendas com dados do cliente
    const enrichedSales = salesData.map((s: any) => {
      const client = clientsData.find((c: any) => c.id === s.cliente_id || c.cpf === s.paciente_cpf);
      return {
        ...s,
        cliente_nome: client?.name || s.paciente_nome || s.tecnico || 'Cliente',
        cliente_whatsapp: client?.whatsapp || s.paciente_whatsapp || ''
      };
    });

    setSales(enrichedSales);
    setSettings(settingsData);
  };

  useEffect(() => {
    fetchSales();
  }, [isModalOpen]);

  const filteredSales = sales.filter(s => 
    s.os_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.tecnico?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = (sale: any) => {
    setActiveSale(sale);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Vendas & O.S.</h2>
          <p className="text-white/40 text-sm">Controle suas ordens de serviço e faturamento</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-black font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
        >
          <Plus size={20} />
          Nova Venda / O.S.
        </button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusCard title="Abertas" count={sales.filter(s => s.status === 'ABERTA' || !s.status).length} icon={<Clock className="text-yellow-500" size={20} />} color="border-yellow-500/20" />
        <StatusCard title="Laboratório" count={sales.filter(s => s.status === 'LABORATORIO').length} icon={<AlertCircle className="text-blue-500" size={20} />} color="border-blue-500/20" />
        <StatusCard title="Prontas" count={sales.filter(s => s.status === 'PRONTA').length} icon={<CheckCircle className="text-green-500" size={20} />} color="border-green-500/20" />
        <StatusCard title="Entregues" count={sales.filter(s => s.status === 'ENTREGUE').length} icon={<Truck className="text-white/40" size={20} />} color="border-white/5" />
      </div>

      <SaleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      
      {activeSale && settings && (
        <PrintOS sale={activeSale} settings={settings} />
      )}

      <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between gap-4 bg-white/[0.01]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por O.S, cliente ou técnico..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-sm text-white/60 hover:text-white transition-colors">
            <Filter size={18} />
            Filtros
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/20 text-white/40 text-xs uppercase tracking-widest font-semibold">
                <th className="px-6 py-4">Nº O.S</th>
                <th className="px-6 py-4">Técnico/OS</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSales.length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-6 py-10 text-center text-white/20 italic">
                      Nenhuma ordem de serviço registrada ainda.
                   </td>
                </tr>
              ) : filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 font-mono text-primary text-sm font-bold">{sale.os_number || 'S/N'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{sale.cliente_nome}</span>
                      {(sale.status === 'PRONTA' || sale.status === 'ENTREGUE' || sale.status === 'CONCLUIDO') && sale.cliente_whatsapp && (
                        <button 
                          onClick={() => openWhatsApp(
                            sale.cliente_whatsapp, 
                            `Olá ${sale.cliente_nome}, aqui é da Ótica Lis! 👓 Seu óculos já está pronto e te esperando. Pode vir buscar quando quiser!`
                          )}
                          className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-all border border-green-500/20 text-[10px] font-black uppercase tracking-widest"
                          title="Avisar Cliente via WhatsApp"
                        >
                          <MessageSquare size={14} />
                          Avisar Cliente
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-white/30 italic">Técnico: {sale.tecnico || 'N/A'}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/60">{formatDate(sale.criado_em)}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={sale.status || 'ABERTA'} />
                  </td>
                  <td className="px-6 py-4 font-bold text-white">R$ {parseFloat(sale.valor_total || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {sale.status !== 'PRONTA' && sale.status !== 'ENTREGUE' && sale.status !== 'CONCLUIDO' && (
                        <button 
                          onClick={async () => {
                            try {
                              await storage.darBaixaVenda(sale.id);
                              toast.success('Venda Baixada!', {
                                description: 'Status atualizado e financeiro registrado.'
                              });
                              if (sale.cliente_whatsapp) {
                                openWhatsApp(
                                  sale.cliente_whatsapp, 
                                  `Olá ${sale.cliente_nome}, aqui é da Ótica Lìs! 👓 Seu óculos já está pronto e ficou maravilhoso! Pode passar aqui para buscar. ✅`
                                );
                              }
                              fetchSales();
                            } catch (e: any) {
                              toast.error('Erro ao dar baixa', { description: e.message });
                            }
                          }}
                          className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg transition-all border border-green-500/20"
                          title="Dar Baixa (Pronto)"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      {(sale.status === 'PRONTA' || sale.status === 'ENTREGUE' || sale.status === 'CONCLUIDO' || sale.status === 'FINALIZADO') && (
                        <button 
                          onClick={async () => {
                            try {
                              await storage.gerarNotaDeVenda(sale.id);
                              toast.success('Nota Fiscal Gerada!', {
                                description: `A NF para o cliente ${sale.cliente_nome} já está disponível no módulo Fiscal.`,
                                action: {
                                  label: 'Ver Notas',
                                  onClick: () => window.location.href = '/fiscal'
                                }
                              });
                            } catch (e: any) {
                              toast.error('Erro ao gerar NF', { description: e.message });
                            }
                          }}
                          className="p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-all border border-primary/20"
                          title="Gerar Nota Fiscal"
                        >
                          <FileText size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => handlePrint(sale)}
                        className="p-2 hover:bg-white/5 rounded-lg text-white/30 hover:text-primary transition-colors cursor-pointer"
                        title="Imprimir O.S."
                      >
                        <Printer size={18} />
                      </button>
                      <button className="p-2 hover:bg-white/5 rounded-lg text-white/30 hover:text-white transition-colors cursor-pointer"><MoreVertical size={18} /></button>
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

function StatusCard({ title, count, icon, color }: { title: string, count: number, icon: React.ReactNode, color: string }) {
  return (
    <div className={`bg-surface p-4 rounded-xl border ${color} flex items-center justify-between shadow-lg shadow-black/20`}>
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium text-white/60">{title}</span>
      </div>
      <span className="text-xl font-bold">{count}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ABERTA: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    LABORATORIO: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    PRONTA: 'bg-green-500/10 text-green-500 border-green-500/20',
    ENTREGUE: 'bg-white/5 text-white/40 border-white/10',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status] || styles.ABERTA}`}>
      {status}
    </span>
  );
}

import { useState, useEffect } from 'react';
import { 
  Search, 
  FileText, 
  Printer, 
  XCircle, 
  CheckCircle2, 
  Clock,
  Filter,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { storage } from '../lib/storage';

export default function FiscalPage() {
  const [notas, setNotas] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNota, setSelectedNota] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotas();
  }, []);

  const fetchNotas = async () => {
    try {
      const data = await storage.getNotasFiscais();
      setNotas(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async (id: string) => {
    if (confirm('Deseja realmente cancelar esta Nota Fiscal?')) {
      await storage.cancelarNotaFiscal(id);
      toast.error('Nota Fiscal Cancelada', {
        description: 'O status da nota foi atualizado no sistema.'
      });
      fetchNotas();
    }
  };

  const openNota = (nota: any) => {
    setSelectedNota(nota);
    setIsModalOpen(true);
  };

  const filteredNotas = notas.filter(n => 
    (n.numero || '').includes(searchTerm) || 
    (n.cliente || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white">Notas <span className="text-primary italic">Fiscais</span></h2>
          <p className="text-white/40 text-sm italic">Gestão de Documentos Fiscais Eletrônicos</p>
        </div>
        <button className="bg-primary text-black font-black px-6 py-2.5 rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95">
          <Plus size={20} />
          Nova Nota Avulsa
        </button>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-surface border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por número ou nome do cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none px-4 py-2.5 bg-white/5 rounded-xl text-sm font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2 border border-white/5">
            <Filter size={16} /> Filtros Avançados
          </button>
        </div>
      </div>

      {/* Tabela de Notas */}
      <div className="bg-surface border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#0A1931] text-[10px] uppercase tracking-widest text-white/70 font-black">
                <th className="px-6 py-5">Número</th>
                <th className="px-6 py-5">Cliente</th>
                <th className="px-6 py-5 text-center">Data Emissão</th>
                <th className="px-6 py-5 text-right">Valor Total</th>
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-6 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredNotas.map((n) => (
                <tr key={n.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 font-mono font-bold text-primary">
                    #{n.numero}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-sm text-white group-hover:text-primary transition-colors">{n.cliente}</p>
                    <p className="text-[10px] text-white/20 font-medium uppercase">{n.cliente_doc}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <p className="text-xs font-bold text-white/60">
                      {new Date(n.data_emissao).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-[10px] text-white/20">
                      {new Date(n.data_emissao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-black text-sm text-white">R$ {Number(n.valor_total).toFixed(2)}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={n.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openNota(n)}
                        className="p-2 bg-white/5 hover:bg-primary/20 hover:text-primary rounded-lg transition-all"
                        title="Visualizar Espelho"
                      >
                        <FileText size={18} />
                      </button>
                      <button 
                        onClick={() => { openNota(n); setTimeout(() => window.print(), 100); }}
                        className="p-2 bg-white/5 hover:bg-blue-500/20 hover:text-blue-400 rounded-lg transition-all"
                        title="Imprimir"
                      >
                        <Printer size={18} />
                      </button>
                      {n.status !== 'CANCELADA' && (
                        <button 
                          onClick={() => handleCancelar(n.id)}
                          className="p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all"
                          title="Cancelar Nota"
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredNotas.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-white/20 italic text-sm">
                    Nenhuma nota fiscal encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Espelho da NF */}
      {isModalOpen && selectedNota && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white text-black w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl print:p-0 print:shadow-none print:m-0 print:w-full print:rounded-none">
            <div className="p-8 space-y-8 print:p-6 bg-white">
              {/* Cabeçalho Ótica Lìs */}
              <div className="flex justify-between items-start border-b-4 border-black pb-8">
                <div className="space-y-1">
                  <h1 className="text-3xl font-black uppercase text-black">Ótica Lìs</h1>
                  <p className="text-sm font-bold text-black/80">CNPJ: 39.156.577/0001-22</p>
                  <p className="text-xs text-black/60 leading-relaxed max-w-xs">
                    Avenida Anápolis Qd 03 Lt 01 - Nª 2134 - Vila Concórdia - Cep 74770-270
                  </p>
                </div>
                <div className="text-right space-y-1 border-2 border-black p-4 rounded-xl bg-[#FFD700] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] print:[print-color-adjust:exact]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/60">Nota Fiscal Eletrônica</p>
                  <p className="text-2xl font-black text-black">#{selectedNota.numero}</p>
                  <p className="text-[10px] font-bold text-black/40 italic">SÉRIE 001</p>
                </div>
              </div>

              {/* Dados Destinatário */}
              <div className="grid grid-cols-2 gap-8 border-b border-black/10 pb-8">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Destinatário</p>
                  <p className="font-black text-xl text-black">{selectedNota.cliente}</p>
                  <p className="text-sm font-bold text-black/60">{selectedNota.cliente_doc}</p>
                </div>
                <div className="text-right space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Data de Emissão</p>
                  <p className="font-black text-xl text-black">{new Date(selectedNota.data_emissao).toLocaleDateString('pt-BR')}</p>
                  <p className="text-xs font-bold text-black/40">{new Date(selectedNota.data_emissao).toLocaleTimeString('pt-BR')}</p>
                </div>
              </div>

              {/* Tabela de Itens (Zebreada) */}
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Produtos / Serviços Detalhados</p>
                <div className="border-2 border-black rounded-lg overflow-hidden">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-[#FFD700] print:[print-color-adjust:exact]">
                      <tr>
                        <th className="p-3 border-b border-black text-left font-black text-black uppercase tracking-wider">Descritivo do Item</th>
                        <th className="p-3 border-b border-black text-center font-black text-black uppercase tracking-wider">Qtd</th>
                        <th className="p-3 border-b border-black text-right font-black text-black uppercase tracking-wider">V. Unit</th>
                        <th className="p-3 border-b border-black text-right font-black text-black uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      <tr className="bg-white">
                        <td className="p-3 font-bold text-black uppercase">Venda de Mercadorias (Ref. Ordem de Serviço)</td>
                        <td className="p-3 text-center text-black font-medium">1</td>
                        <td className="p-3 text-right text-black font-medium">R$ {Number(selectedNota.valor_total).toFixed(2)}</td>
                        <td className="p-3 text-right font-black text-black italic">R$ {Number(selectedNota.valor_total).toFixed(2)}</td>
                      </tr>
                      <tr className="bg-[#F2F2F2] print:[print-color-adjust:exact]">
                        <td colSpan={4} className="p-2 text-[10px] text-center text-black/20 italic">--- Fim da Listagem ---</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totais e Assinatura */}
              <div className="flex justify-between items-end pt-8">
                 <div className="flex-1 max-w-xs border-t border-dashed border-black/30 pt-4">
                    <p className="text-[10px] font-bold text-black/40 uppercase mb-8">Assinatura do Cliente</p>
                    <div className="border-t-2 border-black w-full"></div>
                 </div>

                 <div className="bg-[#FFD700] text-black p-6 rounded-2xl space-y-1 w-72 text-right border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] print:[print-color-adjust:exact]">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Valor Total a Pagar</p>
                    <p className="text-4xl font-black">R$ {Number(selectedNota.valor_total).toFixed(2)}</p>
                 </div>
              </div>
            </div>

            <div className="p-8 border-t border-black/5 bg-black/[0.02] flex justify-between items-center print:hidden">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 bg-black/5 rounded-xl text-sm font-bold hover:bg-black/10 transition-colors"
              >
                Fechar Visualização
              </button>
              <button 
                onClick={() => window.print()}
                className="px-8 py-3 bg-[#FFD700] text-black font-black rounded-xl shadow-lg shadow-[#FFD700]/20 hover:scale-[1.02] transition-all flex items-center gap-2 border border-black/10"
              >
                <Printer size={18} />
                Confirmar Impressão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: any = {
    'EMITIDA': { color: 'bg-[#00DF81]/20 text-[#00DF81] border-[#00DF81]/30', label: 'Emitida', icon: <CheckCircle2 size={12} /> },
    'PENDENTE': { color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', label: 'Pendente', icon: <Clock size={12} /> },
    'CANCELADA': { color: 'bg-red-500/20 text-red-500 border-red-500/30', label: 'Cancelada', icon: <XCircle size={12} /> }
  };

  const config = configs[status] || configs['PENDENTE'];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

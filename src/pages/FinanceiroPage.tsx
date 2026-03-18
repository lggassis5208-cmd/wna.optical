import { useState, useEffect } from 'react';
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter, 
  Search,
  CheckCircle2,
  Clock,
  MoreVertical,
  X,
  Calendar
} from 'lucide-react';
import { storage } from '../lib/storage';
import { toast } from 'sonner';

export default function FinanceiroPage() {
  const [tab, setTab] = useState<'pagar' | 'receber'>('receber');
  const [data, setData] = useState<{ pagar: any[], receber: any[] }>({ pagar: [], receber: [] });
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [novaConta, setNovaConta] = useState({
    descricao: '',
    valor: '',
    vencimento: new Date().toISOString().split('T')[0],
    categoria: 'Outros'
  });

  const fetchFinanceiro = async () => {
    setLoading(true);
    const result = await storage.getFinanceiro();
    setData(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchFinanceiro();
  }, []);

  const handleSalvarConta = async () => {
    if (!novaConta.descricao || !novaConta.valor) return toast.error('Preencha todos os campos');
    
    if (tab === 'pagar') {
      await storage.saveContaPagar(novaConta);
      toast.success('Conta a pagar registrada');
    } else {
      await storage.saveContaReceber(novaConta);
      toast.success('Recebível registrado');
    }
    
    setModalAberto(false);
    fetchFinanceiro();
  };

  const currentData = tab === 'pagar' ? data.pagar : data.receber;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white">Gestão <span className="text-primary italic">Financeira</span></h2>
          <p className="text-white/40 text-sm italic">Fluxo de caixa, contas a pagar e receber</p>
        </div>
        <button 
          onClick={() => setModalAberto(true)}
          className="bg-primary text-black font-black px-6 py-2.5 rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
        >
          <Plus size={20} />
          {tab === 'pagar' ? 'Nova Conta a Pagar' : 'Novo Recebível'}
        </button>
      </div>

      <div className="flex gap-4 border-b border-white/5 pb-px">
        <TabButton 
          active={tab === 'receber'} 
          onClick={() => setTab('receber')} 
          label="Contas a Receber" 
          icon={<ArrowUpRight size={18} />} 
          color="text-green-500"
        />
        <TabButton 
          active={tab === 'pagar'} 
          onClick={() => setTab('pagar')} 
          label="Contas a Pagar" 
          icon={<ArrowDownLeft size={18} />} 
          color="text-red-400"
        />
      </div>

      <div className="bg-surface rounded-3xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between gap-4 bg-white/[0.01]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input 
              type="text" 
              placeholder={`Buscar em ${tab === 'receber' ? 'recebíveis' : 'contas'}...`} 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white"
            />
          </div>
          <button className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-white transition-colors">
            <Filter size={18} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/20 text-white/40 text-[10px] uppercase tracking-[0.2em] font-black">
                <th className="px-8 py-5">Vencimento</th>
                <th className="px-8 py-5">Descrição / Origem</th>
                <th className="px-8 py-5">Valor</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-white/10 italic font-medium">
                    Nenhum registro encontrado nesta categoria.
                  </td>
                </tr>
              ) : currentData.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                       <div className={`p-2 rounded-lg bg-white/5 ${new Date(item.vencimento) < new Date() ? 'text-red-500' : 'text-white/20'}`}>
                          <Clock size={16} />
                       </div>
                       <span className="font-mono font-bold text-white/70">{new Date(item.vencimento).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-bold text-white mb-0.5">{item.descricao}</p>
                    <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">{item.categoria}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-lg font-black ${tab === 'receber' ? 'text-green-500' : 'text-white'}`}>
                      R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                      item.status === 'PAGO' 
                        ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                        : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 text-white/20 hover:text-white transition-colors">
                       <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova Conta */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus size={20} className="text-primary" />
                Novo Lançamento
              </h3>
              <button onClick={() => setModalAberto(false)} className="p-2 hover:bg-white/5 rounded-full text-white/40">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                 <FinanceInput 
                    label="Descrição" 
                    placeholder="Ex: Aluguel, Provisão..." 
                    value={novaConta.descricao}
                    onChange={(e: any) => setNovaConta({...novaConta, descricao: e.target.value})}
                 />
                 <FinanceInput 
                    label="Valor (R$)" 
                    placeholder="0.00" 
                    type="number"
                    value={novaConta.valor}
                    onChange={(e: any) => setNovaConta({...novaConta, valor: e.target.value})}
                 />
                 <FinanceInput 
                    label="Data de Vencimento" 
                    type="date"
                    value={novaConta.vencimento}
                    onChange={(e: any) => setNovaConta({...novaConta, vencimento: e.target.value})}
                 />
              </div>
            </div>
            <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
              <button 
                onClick={handleSalvarConta}
                className="w-full bg-primary text-black font-black py-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95"
              >
                Salvar Lançamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FinanceInput({ label, placeholder, type = "text", value, onChange }: { label: string, placeholder?: string, type?: string, value: string, onChange: any }) {
  return (
    <div className="space-y-2">
       <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">{label}</label>
       <input 
         type={type} 
         placeholder={placeholder}
         value={value}
         onChange={onChange}
         className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white"
       />
    </div>
  );
}

function TabButton({ active, onClick, label, icon, color }: { active: boolean, onClick: () => void, label: string, icon: any, color: string }) {
  return (
    <button 
      onClick={onClick}
      className={`
        flex items-center gap-2 px-6 py-4 border-b-2 transition-all text-sm font-black uppercase tracking-widest
        ${active ? `border-primary text-white` : 'border-transparent text-white/20 hover:text-white/40'}
      `}
    >
      <span className={active ? color : 'text-inherit opacity-50'}>{icon}</span>
      {label}
    </button>
  );
}

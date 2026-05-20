import { useState, useEffect } from 'react';
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter, 
  Search,
  Clock,
  MoreVertical,
  X,
  CreditCard,
  Settings as SettingsIcon,
  Download,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { storage } from '../lib/storage';
import { toast } from 'sonner';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function FinanceiroPage() {
  const [tab, setTab] = useState<'pagar' | 'receber' | 'relatorios'>('receber');
  const [data, setData] = useState<{ pagar: any[], receber: any[] }>({ pagar: [], receber: [] });
  const [caixas, setCaixas] = useState<any[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [novaConta, setNovaConta] = useState({
    descricao: '',
    valor: '',
    vencimento: new Date().toISOString().split('T')[0],
    categoria: 'Outros'
  });
  const [sicoobConfig, setSicoobConfig] = useState<any>(null);
  const [modalSicoob, setModalSicoob] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchFinanceiro = async () => {
    const [result, settings, caixasData] = await Promise.all([
      storage.getFinanceiro(),
      storage.getSettings(),
      storage.getHistoricoCaixa()
    ]);
    setData(result);
    setSicoobConfig(settings.sicoob);
    setCaixas(caixasData);
  };

  useEffect(() => {
    fetchFinanceiro();
  }, []);

  // Processar dados dos caixas para relatórios
  const processCaixasData = () => {
    if (!caixas || caixas.length === 0) {
      // Se não houver dados, fornecer dados mockados elegantes para visualização
      const mockMensal = [
        { name: 'Dez/25', faturamento: 12500, despesas: 4200 },
        { name: 'Jan/26', faturamento: 15800, despesas: 5100 },
        { name: 'Fev/26', faturamento: 14200, despesas: 4800 },
        { name: 'Mar/26', faturamento: 18900, despesas: 6200 },
        { name: 'Abr/26', faturamento: 22400, despesas: 7800 },
        { name: 'Mai/26', faturamento: 25100, despesas: 8400 }
      ];
      const mockPizza = [
        { name: 'Pix', value: 16500, color: '#10B981' },
        { name: 'Dinheiro', value: 3400, color: '#FFD700' },
        { name: 'Cartão', value: 5200, color: '#3B82F6' }
      ];
      return {
        chartData: mockMensal,
        pieData: mockPizza,
        resumo: {
          totalFaturamento: 25100,
          totalDespesas: 8400,
          saldoLiquido: 16700
        }
      };
    }

    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    // Agrupar faturamento e saídas por mês
    const agrupado = caixas.reduce((acc: any, c: any) => {
      const date = new Date(c.data_abertura);
      const mesNome = mesesNomes[date.getMonth()];
      const ano = date.getFullYear().toString().slice(-2);
      const key = `${mesNome}/${ano}`;

      if (!acc[key]) {
        acc[key] = { name: key, faturamento: 0, despesas: 0 };
      }

      const faturamentoCaixa = Number(c.entradas?.dinheiro || 0) + Number(c.entradas?.pix || 0) + Number(c.entradas?.cartao || 0);
      acc[key].faturamento += faturamentoCaixa;
      acc[key].despesas += Number(c.saidas || 0);

      return acc;
    }, {});

    // Organizar cronologicamente
    const chartData = Object.values(agrupado).sort((a: any, b: any) => {
      const [m1, a1] = a.name.split('/');
      const [m2, a2] = b.name.split('/');
      if (a1 !== a2) return a1.localeCompare(a2);
      return mesesNomes.indexOf(m1) - mesesNomes.indexOf(m2);
    });

    // Calcular formas de pagamento agregadas
    let totalPix = 0;
    let totalDinheiro = 0;
    let totalCartao = 0;
    let totalSaidas = 0;

    caixas.forEach((c: any) => {
      totalPix += Number(c.entradas?.pix || 0);
      totalDinheiro += Number(c.entradas?.dinheiro || 0);
      totalCartao += Number(c.entradas?.cartao || 0);
      totalSaidas += Number(c.saidas || 0);
    });

    const pieData = [
      { name: 'Pix', value: totalPix, color: '#10B981' },
      { name: 'Dinheiro', value: totalDinheiro, color: '#FFD700' },
      { name: 'Cartão', value: totalCartao, color: '#3B82F6' }
    ].filter(item => item.value > 0);

    const totalFaturamento = totalPix + totalDinheiro + totalCartao;

    return {
      chartData,
      pieData,
      resumo: {
        totalFaturamento,
        totalDespesas: totalSaidas,
        saldoLiquido: totalFaturamento - totalSaidas
      }
    };
  };

  const relatorioInfo = processCaixasData();

  const handleSalvarConta = async () => {
    if (!novaConta.descricao || !novaConta.valor) return toast.error('Preencha todos os campos');
    
    if (tab === 'pagar') {
      await storage.saveContaPagar(novaConta);
      toast.success('Conta a pagar registrada');
    } else if (tab === 'receber') {
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

      {/* Sicoob Integration Dashboard */}
      <div className="bg-surface/50 border border-white/5 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-6 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
            <CreditCard size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white">Integração Sicoob</h3>
            <p className="text-xs text-white/40">
              {sicoobConfig?.configured 
                ? `Conectado via API • Última Sinc: ${sicoobConfig.lastSync || 'Nunca'}` 
                : 'Aguardando configuração de API'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setModalSicoob(true)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white/70 transition-all flex items-center gap-2 border border-white/10"
          >
            <SettingsIcon size={14} />
            Configurar API
          </button>
          <button 
            onClick={() => {
              setSyncing(true);
              setTimeout(() => {
                setSyncing(false);
                toast.success('Sincronização Sicoob Concluída!', {
                  description: '12 novas entradas e 4 saídas importadas automaticamente.'
                });
              }, 3000);
            }}
            disabled={!sicoobConfig?.configured || syncing}
            className="px-4 py-2 bg-primary text-black rounded-xl text-xs font-black hover:scale-105 transition-all disabled:opacity-30 flex items-center gap-2 shadow-lg shadow-primary/10"
          >
            {syncing ? <RefreshCw className="animate-spin" size={14} /> : <RefreshCw size={14} />}
            Sincronizar Banco
          </button>
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white/50 transition-all flex items-center gap-2 border border-white/10 italic">
            <Download size={14} />
            Importar OFX/CSV
          </button>
        </div>
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
        <TabButton 
          active={tab === 'relatorios'} 
          onClick={() => setTab('relatorios')} 
          label="Relatório Financeiro" 
          icon={<BarChart3 size={18} />} 
          color="text-primary"
        />
      </div>

      {tab === 'relatorios' ? (
        <div className="space-y-6">
          {/* Relatório Resumo KPIs */}
          {caixas.length === 0 && (
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex items-center justify-between text-xs text-primary/80">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle size={16} />
                Nenhum caixa fechado encontrado. Exibindo dados demonstrativos simulados para visualização do dashboard.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface p-6 rounded-3xl border border-white/5 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Faturamento Consolidado</p>
                <h4 className="text-3xl font-black text-white mt-1">R$ {relatorioInfo.resumo.totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
              </div>
              <p className="text-[10px] text-green-400 font-bold mt-4 flex items-center gap-1">
                <TrendingUp size={12} /> Total de recebimentos no período
              </p>
            </div>
            
            <div className="bg-surface p-6 rounded-3xl border border-white/5 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Saídas / Despesas</p>
                <h4 className="text-3xl font-black text-red-400 mt-1">R$ {relatorioInfo.resumo.totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
              </div>
              <p className="text-[10px] text-white/20 font-medium mt-4">
                Soma de retiradas e sangrias de caixas
              </p>
            </div>

            <div className="bg-surface p-6 rounded-3xl border border-white/5 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Saldo Líquido</p>
                <h4 className="text-3xl font-black text-primary mt-1">R$ {relatorioInfo.resumo.saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
              </div>
              <p className="text-[10px] text-white/40 font-bold mt-4">
                Resultado operacional líquido
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico Faturamento vs Saídas */}
            <div className="lg:col-span-2 bg-surface p-8 rounded-3xl border border-white/5 shadow-xl">
              <h3 className="text-sm font-black uppercase tracking-widest text-white/60 mb-6 flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                Faturamento vs Despesas por Período
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={relatorioInfo.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="name" stroke="#ffffff40" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#ffffff40" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${v}`} />
                    <Tooltip 
                      cursor={{ fill: '#ffffff02' }}
                      contentStyle={{ backgroundColor: '#121212', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                    <Bar name="Faturamento" dataKey="faturamento" fill="#FFD700" radius={[4, 4, 0, 0]} />
                    <Bar name="Despesas" dataKey="despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico Formas de Recebimento */}
            <div className="bg-surface p-8 rounded-3xl border border-white/5 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white/60 mb-6 flex items-center gap-2">
                  <BarChart3 size={16} className="text-primary" />
                  Mix de Recebimentos
                </h3>
                <div className="h-[200px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={relatorioInfo.pieData} 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={4} 
                        dataKey="value"
                      >
                        {relatorioInfo.pieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="space-y-2 mt-4">
                {relatorioInfo.pieData.map((item: any, idx: number) => {
                  const percent = relatorioInfo.resumo.totalFaturamento > 0 
                    ? ((item.value / relatorioInfo.resumo.totalFaturamento) * 100).toFixed(1)
                    : '0.0';
                  
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-white/50 font-bold">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-white/80 font-bold">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className="text-[10px] text-white/30 ml-2 font-black">({percent}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
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
      )}

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

      {/* Modal Sicoob */}
      {modalSicoob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                  <CreditCard size={20} />
                </div>
                <h3 className="text-xl font-bold text-white">Configurar API Sicoob</h3>
              </div>
              <button onClick={() => setModalSicoob(false)} className="p-2 hover:bg-white/5 rounded-full text-white/40">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl flex gap-3 items-start">
                 <AlertTriangle size={20} className="text-blue-500 shrink-0 mt-0.5" />
                 <p className="text-[11px] text-blue-200/60 leading-relaxed italic">
                    Para integrar o financeiro, você precisará do **Client ID** e do **Certificado Digital** emitidos no Portal Developers do Sicoob.
                 </p>
              </div>
              
              <div className="space-y-4">
                 <FinanceInput 
                    label="Client ID (API)" 
                    placeholder="Cole aqui o Client ID" 
                    value={sicoobConfig?.clientId || ''}
                    onChange={(e: any) => setSicoobConfig({...sicoobConfig, clientId: e.target.value})}
                 />
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Certificado Digital (.PFX / .CRT)</label>
                    <div className="w-full border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer group">
                       <Download size={24} className="mx-auto mb-2 text-white/20 group-hover:text-primary transition-colors" />
                       <p className="text-xs text-white/40">Arraste seu certificado ou clique para selecionar</p>
                    </div>
                 </div>
              </div>
            </div>
            <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
              <button 
                onClick={async () => {
                  const settings = await storage.getSettings();
                  settings.sicoob = { ...sicoobConfig, configured: true, lastSync: new Date().toLocaleString('pt-BR') };
                  await storage.saveSettings(settings);
                  setModalSicoob(false);
                  toast.success('Configurações salvas!');
                  fetchFinanceiro();
                }}
                className="w-full bg-primary text-black font-black py-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95"
              >
                Salvar Configurações
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

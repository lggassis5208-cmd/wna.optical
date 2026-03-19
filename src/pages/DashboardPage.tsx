import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  UserPlus, 
  Package,
  Clock,
  ArrowRight,
  ChevronRight,
  Gift,
  Sparkles,
  UserX,
  MessageSquare
} from 'lucide-react';
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
  Cell
} from 'recharts';
import { storage } from '../lib/storage';
import { formatDate, formatDateTime } from '../lib/dateUtils';
import { useNavigate } from 'react-router-dom';
import { openWhatsApp } from '../lib/whatsappUtils';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<any[]>([]);
  const [stats, setStats] = useState({
    vendasHoje: 0,
    osAbertas: 0,
    novosClientesMes: 0,
    estoqueBaixo: 0
  });

  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [aniversariantes, setAniversariantes] = useState<any[]>([]);
  const [reativar, setReativar] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [allSales, allClients, allProducts] = await Promise.all([
        storage.getSales(),
        storage.getClients(),
        storage.getProducts()
      ]);

      setSales(allSales);

      // 1. KPIs
      const hoje = new Date().toLocaleDateString();
      const vendasHoje = allSales
        .filter((s: any) => new Date(s.criado_em).toLocaleDateString() === hoje)
        .reduce((acc: number, s: any) => acc + (Number(s.valor_total) || 0), 0);

      const osAbertas = allSales.filter((s: any) => s.status === 'ABERTA' || !s.status).length;
      
      const hojeDate = new Date();
      const inicioMes = new Date();
      inicioMes.setDate(1);
      const novosClientes = allClients.filter((c: any) => new Date(c.criado_em) >= inicioMes).length;

      const estoqueBaixo = allProducts.filter((p: any) => Number(p.estoque) < 5).length;

      setStats({ vendasHoje, osAbertas, novosClientesMes: novosClientes, estoqueBaixo });

      // 1.1 Aniversariantes do Dia
      const mesHoje = hojeDate.getMonth() + 1;
      const diaHoje = hojeDate.getDate();
      const niverHoje = allClients.filter((c: any) => {
        if (!c.data_nascimento) return false;
        const [, m, d] = c.data_nascimento.split('-');
        return parseInt(m) === mesHoje && parseInt(d) === diaHoje;
      });
      setAniversariantes(niverHoje);

      // 1.2 Clientes para Reativar (> 1 ano)
      const umAnoAtras = new Date();
      umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
      
      const inativos = allClients.filter((c: any) => {
        const clientSales = allSales.filter((s: any) => s.cliente_id === c.id || s.paciente_cpf === c.cpf);
        if (clientSales.length === 0) return false; // Nunca comprou ou dado incompleto
        
        const ultimaVenda = clientSales.reduce((latest: Date, s: any) => {
          const sd = new Date(s.criado_em);
          return sd > latest ? sd : latest;
        }, new Date(0));
        
        return ultimaVenda < umAnoAtras;
      }).slice(0, 5); // Mostra top 5
      setReativar(inativos);

      // 2. Gráfico de Vendas (Últimos 6 meses)
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthIndex = d.getMonth();
        const year = d.getFullYear();
        
        const total = allSales
          .filter((s: any) => {
            const sd = new Date(s.criado_em);
            return sd.getMonth() === monthIndex && sd.getFullYear() === year;
          })
          .reduce((acc: number, s: any) => acc + (Number(s.valor_total) || 0), 0);
          
        monthlyData.push({ name: months[monthIndex], total });
      }
      setChartData(monthlyData);

      // 3. Gráfico de Pizza (Categorias)
      setPieData([
        { name: 'Armações', value: 50, color: '#FFBF00' },
        { name: 'Lentes', value: 30, color: '#3B82F6' },
        { name: 'Solares', value: 20, color: '#10B981' },
      ]);
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-white">Ótica <span className="text-primary italic">Lis</span> Dashboard</h2>
          <p className="text-white/40 text-sm mt-1">Visão geral do seu império óptico</p>
        </div>
        <div className="text-right">
           <p className="text-[10px] font-black text-primary uppercase tracking-widest">Data do Sistema</p>
           <p className="text-sm font-bold text-white/60">{formatDate(new Date())}</p>
        </div>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Vendas Hoje" 
          value={`R$ ${stats.vendasHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={<Wallet className="text-primary" size={24} />} 
          subtext="Faturamento do dia"
          color="border-l-primary"
        />
        <KPICard 
          title="O.S. em Aberto" 
          value={stats.osAbertas.toString()} 
          icon={<Clock className="text-yellow-500" size={24} />} 
          subtext="Aguardando produção"
          color="border-l-yellow-500"
        />
        <KPICard 
          title="Novos Clientes" 
          value={stats.novosClientesMes.toString()} 
          icon={<UserPlus className="text-blue-400" size={24} />} 
          subtext="Este mês"
          color="border-l-blue-400"
        />
        <KPICard 
          title="Estoque Baixo" 
          value={stats.estoqueBaixo.toString()} 
          icon={<Package className="text-red-400" size={24} />} 
          subtext="Abaixo de 5 un."
          color="border-l-red-400"
          highlight={stats.estoqueBaixo > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-surface p-8 rounded-3xl border border-white/5 shadow-xl">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" />
            Vendas Mensais (R$)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${value}`} />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#121212', border: '1px solid #ffffff10', borderRadius: '12px' }}
                />
                <Bar dataKey="total" fill="#FFBF00" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface p-8 rounded-3xl border border-white/5 shadow-xl">
          <h3 className="text-lg font-bold mb-6">Mix de Vendas</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
            {pieData.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-white/60 font-medium">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </div>
                <span className="font-bold">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Aniversariantes */}
        {aniversariantes.length > 0 && (
          <div className="bg-gradient-to-br from-primary/10 to-transparent p-8 rounded-3xl border border-primary/20 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Sparkles size={120} />
            </div>
            <h3 className="text-xl font-black mb-4 flex items-center gap-2">
              <Gift className="text-primary" />
              Aniversariantes do Dia 🎂
            </h3>
            <div className="space-y-4 relative z-10">
              {aniversariantes.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div>
                    <p className="font-bold text-white">{c.name}</p>
                    <p className="text-xs text-white/40">Fez {new Date().getFullYear() - new Date(c.data_nascimento).getFullYear()} anos hoje!</p>
                  </div>
                  <button 
                    onClick={() => openWhatsApp(
                      c.whatsapp,
                      `Olá, ${c.name}! Feliz aniversário de toda a equipe da Ótica Lis! 🥳🎂 Como presente, você ganhou 10% de desconto na sua próxima compra ou serviço conosco. Esperamos você!`
                    )}
                    className="flex items-center gap-2 bg-primary text-black px-4 py-2 rounded-xl text-xs font-black hover:scale-105 transition-transform"
                  >
                    <MessageSquare size={14} />
                    Enviar Desconto
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clientes para Reativar */}
        {reativar.length > 0 && (
          <div className="bg-surface p-8 rounded-3xl border border-white/5 shadow-xl">
            <h3 className="text-xl font-black mb-4 flex items-center gap-2">
              <UserX className="text-red-400" />
              Clientes para Reativar
            </h3>
            <p className="text-xs text-white/30 mb-6 uppercase font-black tracking-widest">Inativos há mais de 1 ano</p>
            <div className="space-y-4">
              {reativar.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20 font-bold group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white/80 group-hover:text-white transition-colors">{c.name}</p>
                      <p className="text-[10px] text-white/20 uppercase font-black tracking-tighter">Última compra em {formatDate(sales.filter((s: any) => s.cliente_id === c.id || s.paciente_cpf === c.cpf).sort((a: any, b: any) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())[0]?.criado_em)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => openWhatsApp(
                      c.whatsapp,
                      `Olá, ${c.name}, tudo bem? Sentimos sua falta aqui na Ótica Lis! 🤗 Faz tempo que você não vem nos visitar. Que tal passar aqui para fazer uma manutenção gratuita nos seus óculos e conferir as novidades? Aguardamos você!`
                    )}
                    className="p-2 bg-white/5 text-white/30 rounded-xl hover:bg-white/10 hover:text-white transition-all"
                    title="Mandar convite"
                  >
                    <MessageSquare size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <section className="bg-surface rounded-3xl border border-white/5 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <div>
            <h3 className="text-lg font-bold">Últimas Ordens de Serviço</h3>
            <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-1">Processamento recente</p>
          </div>
          <button 
            onClick={() => navigate('/vendas')}
            className="flex items-center gap-2 text-primary font-bold text-sm hover:underline group"
          >
            Ver Tudo
            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02] text-[10px] uppercase tracking-widest text-white/40 font-bold">
                <th className="px-6 py-4">ID / O.S.</th>
                <th className="px-6 py-4">Cliente / Técnico</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sales.slice(-5).reverse().map((s: any) => (
                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 font-mono text-primary text-sm font-bold">{s.os_number || 'S/N'}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-sm text-white">{s.tecnico || 'Cliente'}</p>
                    <p className="text-[10px] text-white/30 italic">Unidade Matriz</p>
                  </td>
                  <td className="px-6 py-4 text-xs text-white/60">{formatDateTime(s.criado_em)}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={s.status || 'ABERTA'} />
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-white">
                    R$ {Number(s.valor_total || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                   <td colSpan={5} className="px-6 py-12 text-center text-white/10 italic text-sm">Nenhuma O.S. recente para exibir.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KPICard({ title, value, icon, subtext, color, highlight = false }: any) {
  return (
    <div className={`bg-surface p-6 rounded-3xl border border-white/5 border-l-4 ${color} transition-all duration-300 hover:translate-y-[-4px] group relative overflow-hidden ${highlight ? 'bg-red-500/[0.02]' : 'bg-white/[0.01]'}`}>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="p-3 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <ArrowRight size={16} className="text-white/10 group-hover:text-white/30 transition-colors" />
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">{title}</p>
        <h4 className="text-2xl font-black mt-1">{value}</h4>
        <p className="text-[10px] text-white/30 mt-2 font-medium">{subtext}</p>
      </div>
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
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${styles[status] || styles.ABERTA}`}>
      {status}
    </span>
  );
}

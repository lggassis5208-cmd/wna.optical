import { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
import { formatDate } from '../lib/dateUtils';
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

      // 0. Seed de Produtos de Exemplo se estiver vazio
      if (allProducts.length === 0) {
        await storage.seedDemoProducts();
      }

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

      // 1.1 Aniversariantes do Mês (ordenado por dia)
      const mesHoje = hojeDate.getMonth() + 1;
      const diaHoje = hojeDate.getDate();
      
      const niverMes = allClients
        .filter((c: any) => {
          if (!c.data_nascimento) return false;
          const [, m] = c.data_nascimento.split('-');
          return parseInt(m) === mesHoje;
        })
        .map((c: any) => {
          const [, , d] = c.data_nascimento.split('-');
          return {
            ...c,
            dia: parseInt(d),
            idade: hojeDate.getFullYear() - new Date(c.data_nascimento).getFullYear()
          };
        })
        .sort((a: any, b: any) => a.dia - b.dia);

      setAniversariantes(niverMes);

      // 1.2 Clientes para Reativar (Alerta de Retorno: última compra há mais de 1 ano)
      const umAnoAtras = new Date();
      umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
      
      const inativos = allClients.map((c: any) => {
        const clientSales = allSales.filter((s: any) => s.cliente_id === c.id || s.paciente_cpf === c.cpf);
        if (clientSales.length === 0) return { ...c, diasInativo: -1 }; // Sem compras
        
        const ultimaVendaDate = clientSales.reduce((latest: Date, s: any) => {
          const sd = new Date(s.criado_em);
          return sd > latest ? sd : latest;
        }, new Date(0));

        const diffTime = Math.abs(hojeDate.getTime() - ultimaVendaDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          ...c,
          diasInativo: diffDays,
          dataUltimaVenda: ultimaVendaDate
        };
      })
      .filter((c: any) => c.diasInativo > 365) // mais de 1 ano
      .sort((a: any, b: any) => b.diasInativo - a.diasInativo)
      .slice(0, 5); // top 5 mais urgentes

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

    // Sincronização em tempo real (Fase 1)
    const handleUpdate = () => fetchData();
    window.addEventListener('lis_sale_updated', handleUpdate);
    return () => window.removeEventListener('lis_sale_updated', handleUpdate);
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Vendas Hoje" 
          value={`R$ ${stats.vendasHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={<Wallet className="text-primary" size={24} />} 
          subtext="Faturamento do dia"
          color="border-l-primary"
          onClick={() => navigate('/vendas')}
        />
        <KPICard 
          title="O.S. em Aberto" 
          value={stats.osAbertas.toString()} 
          icon={<Clock className="text-yellow-500" size={24} />} 
          subtext="Aguardando produção"
          color="border-l-yellow-500"
          onClick={() => navigate('/vendas')}
        />
        <KPICard 
          title="Novos Clientes" 
          value={stats.novosClientesMes.toString()} 
          icon={<UserPlus className="text-blue-400" size={24} />} 
          subtext="Este mês"
          color="border-l-blue-400"
          onClick={() => navigate('/clientes')}
        />
        <KPICard 
          title="Estoque Baixo" 
          value={stats.estoqueBaixo.toString()} 
          icon={<Package className="text-red-400" size={24} />} 
          subtext="Abaixo de 5 un."
          color="border-l-red-400"
          highlight={stats.estoqueBaixo > 0}
          onClick={() => navigate('/estoque')}
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
        {/* Aniversariantes do Mês */}
        <div className="bg-gradient-to-br from-primary/10 to-transparent p-8 rounded-3xl border border-primary/20 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sparkles size={120} />
          </div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black flex items-center gap-2">
              <Gift className="text-primary" />
              Aniversariantes do Mês 🎂
            </h3>
            <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-xl text-[10px] font-black uppercase tracking-widest">
              Mês {new Date().getMonth() + 1}
            </span>
          </div>
          <div className="space-y-4 relative z-10 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {aniversariantes.length > 0 ? (
              aniversariantes.map((c: any) => {
                const hojeDate = new Date();
                const isHoje = c.dia === hojeDate.getDate();
                
                return (
                  <div 
                    key={c.id} 
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      isHoje 
                        ? 'bg-primary/20 border-primary/40 shadow-[0_0_15px_rgba(255,215,0,0.15)] animate-pulse' 
                        : 'bg-white/5 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white text-sm">{c.name}</p>
                        {isHoje && (
                          <span className="px-2 py-0.5 rounded-full bg-primary text-black font-black text-[9px] uppercase animate-bounce">
                            Hoje! 🎉
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mt-0.5">
                        Dia {c.dia} • {c.idade} anos
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        if (!c.whatsapp) {
                          toast.error('Número de Telefone não encontrado.');
                          return;
                        }
                        openWhatsApp(
                          c.whatsapp,
                          `Olá, ${c.name}! A Ótica Lìs deseja a você um feliz aniversário repleto de saúde e conquistas! 🎂✨ E para comemorar, preparamos um presente especial para você: 10% de desconto exclusivo em qualquer armação ou lente durante este mês. Venha nos fazer uma visita! 👓🎁`
                        );
                      }}
                      disabled={!c.whatsapp}
                      title={!c.whatsapp ? 'Cadastre o Zap primeiro' : 'Enviar Presente'}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                        !c.whatsapp 
                          ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                          : 'bg-primary text-black hover:scale-105 active:scale-95'
                      }`}
                    >
                      <MessageSquare size={14} />
                      {!c.whatsapp ? 'Sem Zap' : 'Enviar Desconto'}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-white/10 italic text-sm">Nenhum cliente faz aniversário este mês.</div>
            )}
          </div>
        </div>

        {/* Clientes para Reativar (Alerta de Retorno) */}
        <div className="bg-surface p-8 rounded-3xl border border-white/5 shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-black flex items-center gap-2">
                <UserX className="text-red-400" />
                Alerta de Retorno
              </h3>
              <p className="text-xs text-white/30 uppercase font-black tracking-widest mt-1">Última compra há mais de 1 ano</p>
            </div>
            <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse">
              Reativação
            </span>
          </div>
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {reativar.length > 0 ? (
              reativar.map((c: any) => {
                const meses = Math.floor(c.diasInativo / 30);
                
                return (
                  <div key={c.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20 font-bold group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white/80 group-hover:text-white transition-colors">{c.name}</p>
                        <p className="text-[10px] text-red-400/80 font-black uppercase tracking-widest mt-0.5">
                          Inativo há {c.diasInativo} dias ({meses} meses)
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if (!c.whatsapp) {
                          toast.error('Número de Telefone não encontrado.');
                          return;
                        }
                        openWhatsApp(
                          c.whatsapp,
                          `Olá, ${c.name}! Tudo bem? Sentimos sua falta aqui na Ótica Lìs! 🤗 Faz mais de 1 ano que você adquiriu seus últimos óculos conosco. A saúde dos seus olhos é muito importante! Que tal agendar um novo exame de vista gratuito para manutenção dos seus óculos e conferir os novos lançamentos? Aguardamos você! 👓✨`
                        );
                      }}
                      disabled={!c.whatsapp}
                      className={`p-2.5 rounded-xl transition-all ${
                        !c.whatsapp 
                          ? 'bg-white/5 text-white/10 cursor-not-allowed' 
                          : 'bg-white/5 text-white/50 hover:bg-primary hover:text-black hover:scale-105'
                      }`}
                      title="Mandar convite de retorno"
                    >
                      <MessageSquare size={16} />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-white/10 italic text-sm">Nenhum cliente precisa de reativação no momento.</div>
            )}
          </div>
        </div>
      </div>

      <section className="bg-surface rounded-3xl border border-white/5 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <div>
            <h3 className="text-lg font-bold">Últimas Ordens de Serviço</h3>
            <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-1">Processamento recente • Clique para ver detalhes</p>
          </div>
          <button 
            onClick={() => navigate('/vendas')}
            className="flex items-center gap-2 text-primary font-bold text-sm hover:underline group"
          >
            Ver Tudo
            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sales.slice(-6).reverse().map((s: any) => {
            const treatmentColors: Record<string, string> = {
              'Crizal': 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.05)]',
              'Video Filter': 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.05)]',
              'Sapphire': 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.05)]',
              'Easy': 'border-slate-400 shadow-[0_0_15px_rgba(148,163,184,0.05)]',
            };
            const borderColor = treatmentColors[s.tratamento] || 'border-white/10';

            return (
              <div 
                key={s.id} 
                onClick={() => navigate(`/vendas?search=${s.os_number || s.id}`)}
                className={`bg-white/[0.02] p-5 rounded-2xl border-2 ${borderColor} transition-all hover:scale-[1.02] hover:bg-white/[0.04] cursor-pointer flex flex-col justify-between group shadow-lg`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-[10px] font-black text-primary uppercase tracking-tighter">#{s.os_number || (s.id?.slice(-6) || 'S/N').toUpperCase()}</span>
                    <StatusBadge status={s.status || 'ABERTA'} />
                  </div>
                  <h4 className="font-bold text-white group-hover:text-primary transition-colors text-sm truncate">{s.cliente_nome || s.tecnico || 'Cliente Final'}</h4>
                  <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-1">
                    {s.tipo_lente || 'LENTE'} {s.tratamento ? `+ ${s.tratamento}` : ''}
                  </p>
                </div>
                
                <div className="mt-6 flex justify-between items-end border-t border-white/5 pt-4">
                  <div>
                    <p className="text-[10px] text-white/20 uppercase font-bold">Valor OS</p>
                    <p className="font-black text-white">R$ {Number(s.valor_total || 0).toFixed(2)}</p>
                  </div>
                  <p className="text-[9px] text-white/20 font-medium">{formatDate(s.criado_em)}</p>
                </div>
              </div>
            );
          })}
          {sales.length === 0 && (
             <div className="col-span-full py-12 text-center text-white/10 italic text-sm font-medium">Nenhuma O.S. recente para exibir.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function KPICard({ title, value, icon, subtext, color, highlight = false, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`bg-surface p-6 rounded-3xl border border-white/5 border-l-4 ${color} transition-all duration-300 hover:translate-y-[-4px] group relative overflow-hidden cursor-pointer ${highlight ? 'bg-red-500/[0.02]' : 'bg-white/[0.01]'}`}
    >
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

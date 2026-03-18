import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  UserPlus, 
  Gift,
  LayoutDashboard,
  Users,
  MessageSquare,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { storage } from '../lib/storage';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [returnAlerts, setReturnAlerts] = useState<any[]>([]);
  const [caixaHistorico, setCaixaHistorico] = useState<any[]>([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      const sales = await storage.getSales();
      const clients = await storage.getClients();
      
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const alerts = sales.filter((sale: any) => {
        const saleDate = new Date(sale.criado_em);
        return saleDate <= oneYearAgo;
      }).map((sale: any) => {
        // Find client by technician name or search if we had a proper ID (fallback to sale meta)
        const client = clients.find((c: any) => c.name === sale.tecnico || c.cpf === sale.paciente_cpf);
        return {
          ...sale,
          client_name: client?.name || sale.tecnico || 'Cliente Premium',
          whatsapp: client?.whatsapp || '(00) 00000-0000'
        };
      });

      // Avoid duplicates from same client (only most recent expired sale)
      const uniqueAlerts = Array.from(new Map(alerts.map((a: any) => [a.client_name, a])).values());
      
      const historico = await storage.getHistoricoCaixa();
      setCaixaHistorico(historico.slice(-7));
      setReturnAlerts(uniqueAlerts);

      if (uniqueAlerts.length > 0) {
        toast(`Ótica Lis: ${uniqueAlerts.length} Clientes para Retorno`, {
          description: 'Receitas vencidas há mais de 1 ano detectadas.',
          icon: <AlertTriangle className="text-primary" />
        });
      }

      setReturnAlerts(uniqueAlerts);
    };

    fetchAlerts();
  }, []);

  const sendWhatsApp = (name: string, phone: string) => {
    const message = `Olá ${name}, aqui é da Ótica Lis! 💎 Notamos que faz 1 ano do seu último exame. Vamos agendar seu retorno para garantir sua saúde visual e conferir nossas novas coleções?`;
    const url = `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const [stats, setStats] = useState({
    hoje: 0,
    pagar: 0,
    clientes: 0,
    agenda: 0,
    trend: '+0%'
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [sales, financeiro, clients, exames] = await Promise.all([
        storage.getSales(),
        storage.getFinanceiro(),
        storage.getClients(),
        storage.getExames()
      ]);

      const hoje = new Date().toLocaleDateString();
      const vendasHoje = sales
        .filter((s: any) => new Date(s.criado_em).toLocaleDateString() === hoje)
        .reduce((acc: number, s: any) => acc + (Number(s.valor_total) || 0), 0);
      
      const pagarHoje = financeiro.pagar
        .filter((c: any) => c.status === 'PENDENTE')
        .reduce((acc: number, c: any) => acc + (Number(c.valor) || 0), 0);

      setStats({
        hoje: vendasHoje,
        pagar: pagarHoje,
        clientes: clients.length,
        agenda: exames.filter((e: any) => e.status === 'Pendente').length,
        trend: '+12% em relação a ontem'
      });
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section>
        <div className="flex justify-between items-end mb-6">
          <div>
             <h2 className="text-3xl font-black tracking-tight text-white mb-1">Painel de <span className="text-primary italic">Controle</span></h2>
             <p className="text-white/40 text-sm">Bem-vindo à excelência visual Ótica Lis</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-right">
             <p className="text-[10px] font-black text-primary uppercase tracking-widest">Status do Sistema</p>
             <p className="text-sm font-bold text-green-500 flex items-center gap-2 justify-end">
               <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
               Operacional
             </p>
          </div>
        </div>
        
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard 
            title="Vendas de Hoje" 
            value={`R$ ${stats.hoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
            icon={<Wallet className="text-primary" size={24} />} 
            trend={stats.trend} 
            color="border-primary/30"
          />
          <KPICard 
            title="Contas a Pagar" 
            value={`R$ ${stats.pagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
            icon={<TrendingUp className="text-red-400" size={24} />} 
            trend={`Total pendente: R$ ${stats.pagar.toFixed(2)}`} 
            color="border-red-400/30"
          />
          <KPICard 
            title="Total de Clientes" 
            value={stats.clientes.toString()} 
            icon={<UserPlus className="text-blue-400" size={24} />} 
            trend="Base de dados ativa" 
            color="border-blue-400/30"
          />
          <KPICard 
            title="Consultas Pendentes" 
            value={stats.agenda.toString().padStart(2, '0')} 
            icon={<Clock className="text-purple-400" size={24} />} 
            trend="Clique para ver horários" 
            color="border-purple-400/30"
          />
        </div>
      </section>

      {/* Daily Cash Flow Chart */}
      <section className="bg-surface rounded-3xl border border-white/5 p-8">
        <div className="flex justify-between items-center mb-10">
            <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <TrendingUp className="text-primary" size={20} />
                    Fluxo de Caixa Diário
                </h3>
                <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-1">Últimos 7 fechamentos</p>
            </div>
            <div className="flex gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-[10px] font-bold text-white/40">ENTRADAS</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500/50" />
                    <span className="text-[10px] font-bold text-white/40">SAÍDAS</span>
                </div>
            </div>
        </div>

        <div className="h-[200px] flex items-end justify-between gap-4 px-4">
            {caixaHistorico.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-white/10 italic text-sm">
                    Aguardando dados de fechamento de caixa...
                </div>
            ) : caixaHistorico.map((c: any, i: number) => {
                const totalEntradas = Object.values(c.entradas).reduce((acc: any, val: any) => acc + val, 0) as number;
                const totalSaidas = c.saidas || 0;
                const max = Math.max(...caixaHistorico.map((h: any) => Math.max(Object.values(h.entradas).reduce((a:any,b:any)=>a+b,0) as number, h.saidas || 0))) || 100;
                
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-3 group relative">
                      <div className="w-full flex justify-center items-end gap-1 h-full">
                          <div 
                            className="w-3 bg-primary rounded-t-sm hover:opacity-80 transition-all cursor-help relative"
                            style={{ height: `${(totalEntradas / max) * 100}%` }}
                          >
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  R$ {totalEntradas.toFixed(0)}
                              </div>
                          </div>
                          <div 
                            className="w-3 bg-red-500/30 rounded-t-sm hover:opacity-80 transition-all cursor-help"
                            style={{ height: `${(totalSaidas / max) * 100}%` }}
                          />
                      </div>
                      <span className="text-[9px] font-black text-white/20 uppercase tracking-tighter">
                          {new Date(c.data_abertura).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                      </span>
                  </div>
                );
            })}
        </div>
      </section>

      {/* Post-Sales Alerts */}
      <section className="relative">
        <div className="absolute -top-12 right-0 flex gap-2">
            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full border border-primary/20 tracking-widest uppercase">Inteligência Ótica Lis</span>
        </div>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
            <AlertTriangle size={20} />
          </div>
          <h3 className="text-xl font-bold">Lembretes de Retorno (Pós-Venda)</h3>
        </div>

        {returnAlerts.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-white/5 p-12 text-center border-dashed">
            <Users size={48} className="mx-auto text-white/10 mb-4" />
            <p className="text-white/20 italic font-medium">Nenhum cliente com receita vencida (365 dias) no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {returnAlerts.slice(0, 6).map((alert) => (
              <div key={alert.id} className="bg-surface p-6 rounded-3xl border border-white/5 hover:border-primary/30 transition-all group relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Users size={24} />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black bg-white/5 text-white/40 px-2 py-0.5 rounded-full uppercase tracking-widest border border-white/10">365+ dias</span>
                    <span className="text-[10px] font-bold text-red-500 mt-1">RECEITA VENCIDA</span>
                  </div>
                </div>

                <div className="relative z-10">
                  <h4 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{alert.client_name}</h4>
                  <p className="text-xs text-white/30 mb-6 flex items-center gap-1">
                    <Clock size={12} />
                    Última Visita: {new Date(alert.criado_em).toLocaleDateString()}
                  </p>
                  
                  <button 
                    onClick={() => sendWhatsApp(alert.client_name, alert.whatsapp)}
                    className="w-full bg-primary text-black font-black py-3 rounded-2xl flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:shadow-primary/20 active:scale-95"
                  >
                    <MessageSquare size={18} />
                    Convidar para Retorno
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Actions / Recent Activity Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface rounded-2xl border border-white/5 p-6 h-64 flex flex-col justify-center items-center text-white/20 border-dashed hover:border-primary/20 transition-colors">
          <LayoutDashboard size={48} className="mb-4 opacity-50" />
          <p>Gráfico de Desempenho (Em breve)</p>
        </div>
        <div className="bg-surface rounded-2xl border border-white/5 p-6 h-64 flex flex-col justify-center items-center text-white/20 border-dashed hover:border-primary/20 transition-colors">
          <Users size={48} className="mb-4 opacity-50" />
          <p>Últimas Ordens de Serviço (Em breve)</p>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, trend, color }: { title: string, value: string, icon: React.ReactNode, trend: string, color: string }) {
  return (
    <div className={`bg-surface p-6 rounded-2xl border-l-4 ${color} shadow-lg hover:translate-y-[-4px] transition-all duration-300 group`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-white/5 rounded-xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <TrendingUp size={16} className="text-white/20" />
      </div>
      <div>
        <p className="text-white/40 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold mt-1">{value}</h3>
        <p className="text-xs text-white/30 mt-2 font-medium">{trend}</p>
      </div>
    </div>
  );
}

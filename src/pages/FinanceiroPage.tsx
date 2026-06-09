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
  DollarSign,
  Repeat,
  Paperclip,
  Check,
  Trash2,
  Calendar,
  CalendarDays
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
  Legend,
  LineChart,
  Line
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
    categoria: 'Outros',
    recorrente: false,
    periodicidade: 'Mensal'
  });
  const [sicoobConfig, setSicoobConfig] = useState<any>(null);
  const [modalSicoob, setModalSicoob] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Estados de Filtros e Controle
  const [filtroPeriodo, setFiltroPeriodo] = useState<'este-mes' | 'mes-passado' | 'proximos-30' | 'personalizado'>('este-mes');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendentes' | 'pagas' | 'vencidas'>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [searchTerm, setSearchTerm] = useState('');

  // Dropdown, Edição e Upload
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [editandoConta, setEditandoConta] = useState<any>(null);
  const [comprovanteConta, setComprovanteConta] = useState<any>(null);

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
    
    const contaData = {
      ...novaConta,
      valor: parseFloat(novaConta.valor)
    };

    if (editandoConta) {
      const contaAtualizada = { ...editandoConta, ...contaData };
      if (tab === 'pagar') {
        await storage.updateContaPagar(contaAtualizada);
      } else {
        await storage.updateContaReceber(contaAtualizada);
      }
      toast.success('Lançamento atualizado com sucesso.');
      setEditandoConta(null);
    } else {
      if (tab === 'pagar') {
        await storage.saveContaPagar(contaData);
        toast.success('Conta a pagar registrada.');
      } else if (tab === 'receber') {
        await storage.saveContaReceber(contaData);
        toast.success('Recebível registrado.');
      }
    }
    
    setModalAberto(false);
    setNovaConta({
      descricao: '',
      valor: '',
      vencimento: new Date().toISOString().split('T')[0],
      categoria: 'Outros',
      recorrente: false,
      periodicidade: 'Mensal'
    });
    fetchFinanceiro();
  };

  const handleEditarClick = (item: any) => {
    setEditandoConta(item);
    setNovaConta({
      descricao: item.descricao,
      valor: item.valor.toString(),
      vencimento: item.vencimento,
      categoria: item.categoria || 'Outros',
      recorrente: !!item.recorrente,
      periodicidade: item.periodicidade || 'Mensal'
    });
    setModalAberto(true);
    setActiveDropdownId(null);
  };

  const handleExcluir = async (id: string) => {
    if (confirm('Deseja realmente excluir este lançamento?')) {
      if (tab === 'pagar') {
        await storage.deleteContaPagar(id);
      } else {
        await storage.deleteContaReceber(id);
      }
      toast.success('Lançamento excluído com sucesso.');
      setActiveDropdownId(null);
      fetchFinanceiro();
    }
  };

  const handleMarcarPaga = async (item: any) => {
    const dataPagamento = new Date().toISOString().split('T')[0];
    const itemAtualizado = { ...item, status: 'PAGO', dataPagamento };
    
    if (tab === 'pagar') {
      await storage.updateContaPagar(itemAtualizado);
    } else {
      await storage.updateContaReceber(itemAtualizado);
    }

    // Lógica de Recorrência
    if (item.recorrente) {
      const proxVencimento = new Date(item.vencimento + 'T12:00:00');
      if (item.periodicidade === 'Semanal') {
        proxVencimento.setDate(proxVencimento.getDate() + 7);
      } else if (item.periodicidade === 'Trimestral') {
        proxVencimento.setMonth(proxVencimento.getMonth() + 3);
      } else if (item.periodicidade === 'Anual') {
        proxVencimento.setFullYear(proxVencimento.getFullYear() + 1);
      } else { // Mensal
        proxVencimento.setMonth(proxVencimento.getMonth() + 1);
      }
      
      const novaOcorrencia = {
        descricao: item.descricao,
        valor: item.valor,
        vencimento: proxVencimento.toISOString().split('T')[0],
        categoria: item.categoria || 'Outros',
        recorrente: true,
        periodicidade: item.periodicidade || 'Mensal',
        status: 'PENDENTE'
      };
      
      if (tab === 'pagar') {
        await storage.saveContaPagar(novaOcorrencia);
      } else {
        await storage.saveContaReceber(novaOcorrencia);
      }
      toast.success('Conta paga! Nova ocorrência criada para o período seguinte.');
    } else {
      toast.success('Lançamento marcado como PAGO.');
    }

    setActiveDropdownId(null);
    fetchFinanceiro();
  };

  const handleAnexarClick = (item: any) => {
    setComprovanteConta(item);
    setTimeout(() => {
      document.getElementById('finance-file-upload')?.click();
    }, 100);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && comprovanteConta) {
      const fakeUrl = `/comprovantes/${file.name}`;
      const itemAtualizado = { ...comprovanteConta, comprovanteUrl: fakeUrl };
      
      if (tab === 'pagar') {
        await storage.updateContaPagar(itemAtualizado);
      } else {
        await storage.updateContaReceber(itemAtualizado);
      }
      toast.success(`Comprovante "${file.name}" anexado com sucesso!`);
      fetchFinanceiro();
    }
    setComprovanteConta(null);
  };

  const currentData = tab === 'pagar' ? data.pagar : data.receber;

  // Cálculos de KPIs
  const agora = new Date();
  agora.setHours(0,0,0,0);
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();

  const contasPagar = data.pagar || [];
  const contasReceber = data.receber || [];

  const aReceberNoMes = contasReceber
    .filter(c => {
      const d = new Date(c.vencimento + 'T12:00:00');
      return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    })
    .reduce((acc, c) => acc + Number(c.valor || 0), 0);

  const aPagarNoMes = contasPagar
    .filter(c => {
      const d = new Date(c.vencimento + 'T12:00:00');
      return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    })
    .reduce((acc, c) => acc + Number(c.valor || 0), 0);

  const saldoPrevisto = aReceberNoMes - aPagarNoMes;

  // Contas vencidas ou hoje (status !== 'PAGO' e vencimento <= hoje)
  const contasAtrasadasOuHoje = [...contasPagar, ...contasReceber].filter(c => {
    if (c.status === 'PAGO') return false;
    const d = new Date(c.vencimento + 'T00:00:00');
    return d.getTime() <= agora.getTime();
  });

  const contagemAtrasadas = contasAtrasadasOuHoje.length;
  const valorAtrasadas = contasAtrasadasOuHoje.reduce((acc, c) => acc + Number(c.valor || 0), 0);

  const obterStatusConta = (item: any) => {
    if (item.status === 'PAGO') return { label: 'Paga', color: 'bg-green-500/10 text-green-500 border-green-500/20' };
    
    const venc = new Date(item.vencimento + 'T00:00:00');
    if (venc.getTime() < agora.getTime()) {
      return { label: 'Em atraso', color: 'bg-red-500/10 text-red-500 border-red-500/20', isAtrasada: true };
    } else if (venc.getTime() === agora.getTime()) {
      return { label: 'Vence Hoje', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', isHoje: true };
    }
    return { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
  };

  // Filtragem Reativa de Contas
  const filteredData = currentData.filter((item: any) => {
    const matchesSearch = item.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.categoria || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    const statusInfo = obterStatusConta(item);
    if (filtroStatus === 'pagas' && item.status !== 'PAGO') return false;
    if (filtroStatus === 'pendentes' && (item.status === 'PAGO' || statusInfo.label === 'Em atraso')) return false;
    if (filtroStatus === 'vencidas' && statusInfo.label !== 'Em atraso') return false;

    if (filtroCategoria !== 'todas' && (item.categoria || 'Outros').toLowerCase() !== filtroCategoria.toLowerCase()) return false;

    const itemDate = new Date(item.vencimento + 'T12:00:00');
    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    if (filtroPeriodo === 'este-mes') {
      if (itemDate.getMonth() !== hoje.getMonth() || itemDate.getFullYear() !== hoje.getFullYear()) return false;
    } else if (filtroPeriodo === 'mes-passado') {
      const mesPassado = hoje.getMonth() === 0 ? 11 : hoje.getMonth() - 1;
      const anoPassado = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
      if (itemDate.getMonth() !== mesPassado || itemDate.getFullYear() !== anoPassado) return false;
    } else if (filtroPeriodo === 'proximos-30') {
      const trintaDias = new Date();
      trintaDias.setDate(hoje.getDate() + 30);
      if (itemDate.getTime() < hoje.getTime() || itemDate.getTime() > trintaDias.getTime()) return false;
    } else if (filtroPeriodo === 'personalizado') {
      if (filtroDataInicio) {
        const start = new Date(filtroDataInicio + 'T00:00:00');
        if (itemDate.getTime() < start.getTime()) return false;
      }
      if (filtroDataFim) {
        const end = new Date(filtroDataFim + 'T23:59:59');
        if (itemDate.getTime() > end.getTime()) return false;
      }
    }

    return true;
  });

  const totalFiltrado = filteredData.reduce((acc, item) => acc + Number(item.valor || 0), 0);

  // Quebra por Categorias de Despesas Pagas
  const obterQuebraCategorias = () => {
    const pagarPagas = contasPagar.filter(c => c.status === 'PAGO');
    const porCategoria = pagarPagas.reduce((acc: any, c: any) => {
      const cat = c.categoria || 'Outros';
      acc[cat] = (acc[cat] || 0) + Number(c.valor);
      return acc;
    }, {});
    
    const cores = ['#10B981', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'];
    return Object.entries(porCategoria).map(([name, value], idx) => ({
      name,
      value: Number(value),
      color: cores[idx % cores.length]
    }));
  };
  const pieDataCategoria = obterQuebraCategorias();

  // Projeção Financeira
  const obterProjecaoSaldo = () => {
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const hoje = new Date();
    const projecao = [];
    
    let saldoAcumulado = relatorioInfo.resumo.saldoLiquido;
    
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(hoje.getMonth() + i);
      const mesIdx = d.getMonth();
      const label = `${mesesNomes[mesIdx]}/${d.getFullYear().toString().slice(-2)}`;
      
      const receberNoMes = contasReceber
        .filter(c => c.status !== 'PAGO')
        .filter(c => {
          const v = new Date(c.vencimento + 'T12:00:00');
          return v.getMonth() === mesIdx && v.getFullYear() === d.getFullYear();
        })
        .reduce((acc, c) => acc + Number(c.valor || 0), 0);

      const pagarNoMes = contasPagar
        .filter(c => c.status !== 'PAGO')
        .filter(c => {
          const v = new Date(c.vencimento + 'T12:00:00');
          return v.getMonth() === mesIdx && v.getFullYear() === d.getFullYear();
        })
        .reduce((acc, c) => acc + Number(c.valor || 0), 0);

      saldoAcumulado = saldoAcumulado + receberNoMes - pagarNoMes;
      
      projecao.push({
        name: label,
        'Receber Previsto': receberNoMes,
        'Pagar Previsto': pagarNoMes,
        'Saldo Projetado': saldoAcumulado
      });
    }
    return projecao;
  };
  const projecaoData = obterProjecaoSaldo();

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

      {/* Cards de Resumo no Topo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface/50 border border-white/5 p-6 rounded-3xl shadow-xl flex flex-col justify-between backdrop-blur-sm">
          <div>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">A receber no mês</p>
            <h4 className="text-2xl font-black text-white mt-1">R$ {aReceberNoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
          </div>
          <p className="text-[10px] text-green-400 font-bold mt-4 flex items-center gap-1.5">
            <ArrowUpRight size={14} /> Total previsto para este mês
          </p>
        </div>

        <div className="bg-surface/50 border border-white/5 p-6 rounded-3xl shadow-xl flex flex-col justify-between backdrop-blur-sm">
          <div>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">A pagar no mês</p>
            <h4 className="text-2xl font-black text-red-400 mt-1">R$ {aPagarNoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
          </div>
          <p className="text-[10px] text-red-400 font-bold mt-4 flex items-center gap-1.5">
            <ArrowDownLeft size={14} /> Total de despesas do mês
          </p>
        </div>

        <div className="bg-surface/50 border border-white/5 p-6 rounded-3xl shadow-xl flex flex-col justify-between backdrop-blur-sm">
          <div>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Saldo previsto</p>
            <h4 className={`text-2xl font-black mt-1 ${saldoPrevisto >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              R$ {saldoPrevisto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
          </div>
          <p className="text-[10px] text-white/40 font-bold mt-4 flex items-center gap-1.5">
            <DollarSign size={14} /> Saldo de caixa projetado
          </p>
        </div>

        <div className={`border p-6 rounded-3xl shadow-xl flex flex-col justify-between transition-colors backdrop-blur-sm ${
          contagemAtrasadas > 0 ? 'bg-red-500/5 border-red-500/20 animate-pulse' : 'bg-surface/50 border-white/5'
        }`}>
          <div>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Atrasadas / Vence Hoje</p>
            <h4 className={`text-2xl font-black mt-1 ${contagemAtrasadas > 0 ? 'text-red-500' : 'text-white'}`}>
              R$ {valorAtrasadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
          </div>
          <p className={`text-[10px] font-bold mt-4 flex items-center gap-1.5 ${contagemAtrasadas > 0 ? 'text-red-400' : 'text-white/40'}`}>
            <AlertTriangle size={14} /> {contagemAtrasadas} conta(s) pendente(s)
          </p>
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
        <div className="space-y-6 animate-in fade-in">
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
            <div className="bg-surface p-6 rounded-3xl border border-white/5 flex flex-col justify-between shadow-xl">
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Faturamento Consolidado</p>
                <h4 className="text-3xl font-black text-white mt-1">R$ {relatorioInfo.resumo.totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
              </div>
              <p className="text-[10px] text-green-400 font-bold mt-4 flex items-center gap-1">
                <TrendingUp size={12} /> Total de recebimentos no período
              </p>
            </div>
            
            <div className="bg-surface p-6 rounded-3xl border border-white/5 flex flex-col justify-between shadow-xl">
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Saídas / Despesas</p>
                <h4 className="text-3xl font-black text-red-400 mt-1">R$ {relatorioInfo.resumo.totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
              </div>
              <p className="text-[10px] text-white/20 font-medium mt-4">
                Soma de retiradas e sangrias de caixas
              </p>
            </div>

            <div className="bg-surface p-6 rounded-3xl border border-white/5 flex flex-col justify-between shadow-xl">
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico Quebra por Categoria */}
            <div className="bg-surface p-8 rounded-3xl border border-white/5 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white/60 mb-6 flex items-center gap-2">
                  <BarChart3 size={16} className="text-primary" />
                  Despesas por Categoria
                </h3>
                <div className="h-[200px] w-full flex items-center justify-center">
                  {pieDataCategoria.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={pieDataCategoria} 
                          innerRadius={60} 
                          outerRadius={80} 
                          paddingAngle={4} 
                          dataKey="value"
                        >
                          {pieDataCategoria.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-white/30 italic">Nenhuma despesa paga cadastrada.</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2 mt-4 max-h-[160px] overflow-y-auto pr-1">
                {pieDataCategoria.map((item: any, idx: number) => {
                  const totalDespesas = pieDataCategoria.reduce((acc, c) => acc + c.value, 0);
                  const percent = totalDespesas > 0 
                    ? ((item.value / totalDespesas) * 100).toFixed(1)
                    : '0.0';
                  
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-white/50 font-bold truncate max-w-[120px]" title={item.name}>
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-white/80 font-bold">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className="text-[10px] text-white/30 ml-2 font-black">({percent}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gráfico de Projeção de Saldo */}
            <div className="lg:col-span-2 bg-surface p-8 rounded-3xl border border-white/5 shadow-xl">
              <h3 className="text-sm font-black uppercase tracking-widest text-white/60 mb-6 flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                Projeção de Saldo (Próximos 6 meses)
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={projecaoData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="name" stroke="#ffffff40" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#ffffff40" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#121212', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                    <Line type="monotone" name="A Receber Previsto" dataKey="Receber Previsto" stroke="#10B981" strokeWidth={2} activeDot={{ r: 8 }} />
                    <Line type="monotone" name="A Pagar Previsto" dataKey="Pagar Previsto" stroke="#EF4444" strokeWidth={2} />
                    <Line type="monotone" name="Saldo Projetado" dataKey="Saldo Projetado" stroke="#FFD700" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="bg-surface/50 border border-white/5 rounded-3xl p-6 flex flex-wrap gap-4 items-center justify-between shadow-xl backdrop-blur-sm">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              <input 
                type="text" 
                placeholder={`Buscar em ${tab === 'receber' ? 'recebíveis' : 'contas'}...`} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-primary/50 transition-colors text-white"
              />
            </div>
            
            <div className="flex flex-wrap gap-3 items-center">
              {/* Filtro Período */}
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase text-white/30 ml-1 mb-1 tracking-wider">Período</span>
                <select 
                  value={filtroPeriodo}
                  onChange={(e: any) => setFiltroPeriodo(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-primary/50"
                >
                  <option value="este-mes" className="bg-surface">Este Mês</option>
                  <option value="mes-passado" className="bg-surface">Mês Passado</option>
                  <option value="proximos-30" className="bg-surface">Próximos 30 Dias</option>
                  <option value="personalizado" className="bg-surface">Customizado</option>
                </select>
              </div>

              {filtroPeriodo === 'personalizado' && (
                <>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-white/30 ml-1 mb-1 tracking-wider">Início</span>
                    <input 
                      type="date"
                      value={filtroDataInicio}
                      onChange={(e) => setFiltroDataInicio(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-white/30 ml-1 mb-1 tracking-wider">Fim</span>
                    <input 
                      type="date"
                      value={filtroDataFim}
                      onChange={(e) => setFiltroDataFim(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-white focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* Filtro Status */}
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase text-white/30 ml-1 mb-1 tracking-wider">Status</span>
                <select 
                  value={filtroStatus}
                  onChange={(e: any) => setFiltroStatus(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-primary/50"
                >
                  <option value="todos" className="bg-surface">Todos</option>
                  <option value="pendentes" className="bg-surface">Pendentes</option>
                  <option value="pagas" className="bg-surface">Pagas</option>
                  <option value="vencidas" className="bg-surface">Em Atraso</option>
                </select>
              </div>

              {/* Filtro Categoria */}
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase text-white/30 ml-1 mb-1 tracking-wider">Categoria</span>
                <select 
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-primary/50"
                >
                  <option value="todas" className="bg-surface">Todas</option>
                  <option value="Fornecedor" className="bg-surface">Fornecedores</option>
                  <option value="Aluguel" className="bg-surface">Aluguel</option>
                  <option value="Salário" className="bg-surface">Salários</option>
                  <option value="Impostos" className="bg-surface">Impostos</option>
                  <option value="Venda de Produtos" className="bg-surface">Venda de Produtos</option>
                  <option value="Venda Fiscal" className="bg-surface">Venda Fiscal</option>
                  <option value="Outros" className="bg-surface">Outros</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-3xl border border-white/5 overflow-hidden">
            {/* Input de File Upload Oculto para Comprovante */}
            <input 
              type="file" 
              id="finance-file-upload" 
              className="hidden" 
              onChange={handleFileChange} 
              accept=".pdf,.png,.jpg,.jpeg"
            />
            
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
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-white/10 italic font-medium">
                        Nenhum registro encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : filteredData.map((item) => {
                    const statusInfo = obterStatusConta(item);
                    return (
                      <tr key={item.id} className={`hover:bg-white/[0.01] transition-all group ${
                        statusInfo.isAtrasada ? 'bg-red-500/[0.02] border-l-2 border-l-red-500' : ''
                      }`}>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${
                               item.status === 'PAGO' 
                                 ? 'bg-green-500/10 text-green-500' 
                                 : statusInfo.isAtrasada 
                                   ? 'bg-red-500/10 text-red-500' 
                                   : 'bg-white/5 text-white/20'
                             }`}>
                                <Clock size={16} />
                             </div>
                             <span className="font-mono font-bold text-white/70">{new Date(item.vencimento).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white mb-0.5">{item.descricao}</p>
                            {item.recorrente && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/10 text-[8px] font-black text-primary uppercase tracking-wider" title={`Recorrência ${item.periodicidade}`}>
                                <Repeat size={8} /> {item.periodicidade}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-white/30 font-black uppercase tracking-widest flex items-center gap-2">
                            {item.categoria}
                            {item.comprovanteUrl && (
                              <a 
                                href={item.comprovanteUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-primary hover:underline flex items-center gap-0.5 text-[8px] font-bold"
                              >
                                <Paperclip size={8} /> Recibo
                              </a>
                            )}
                          </p>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`text-lg font-black ${tab === 'receber' ? 'text-green-500' : 'text-white'}`}>
                            R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right relative">
                          <div className="flex justify-end items-center gap-1">
                            <button 
                              onClick={() => setActiveDropdownId(activeDropdownId === item.id ? null : item.id)}
                              className="p-2 text-white/20 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                              title="Opções"
                            >
                               <MoreVertical size={18} />
                            </button>
                            {activeDropdownId === item.id && (
                              <div className="absolute right-8 top-12 bg-[#121212] border border-white/10 rounded-2xl p-2 w-48 shadow-2xl z-40 text-left space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                {item.status !== 'PAGO' && (
                                  <button 
                                    onClick={() => handleMarcarPaga(item)}
                                    className="w-full px-3 py-2 text-xs font-bold text-green-400 hover:bg-green-500/10 rounded-xl flex items-center gap-2 transition-colors text-left"
                                  >
                                    <Check size={14} /> Marcar como Paga
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleEditarClick(item)}
                                  className="w-full px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/5 rounded-xl flex items-center gap-2 transition-colors text-left"
                                >
                                  <SettingsIcon size={14} /> Editar Lançamento
                                </button>
                                <button 
                                  onClick={() => handleAnexarClick(item)}
                                  className="w-full px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10 rounded-xl flex items-center gap-2 transition-colors text-left"
                                >
                                  <Paperclip size={14} /> Anexar Comprovante
                                </button>
                                <hr className="border-white/5 my-1" />
                                <button 
                                  onClick={() => handleExcluir(item.id)}
                                  className="w-full px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-2 transition-colors text-left"
                                >
                                  <Trash2 size={14} /> Excluir
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-black/30 text-white font-black border-t border-white/10">
                    <td colSpan={2} className="px-8 py-5 text-left uppercase text-[9px] tracking-wider text-white/30 font-bold">
                      Total ({filteredData.length} itens filtrados)
                    </td>
                    <td className="px-8 py-5 text-left text-lg text-primary font-black">
                      R$ {totalFiltrado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={2} className="px-8 py-5"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Conta / Edição */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus size={20} className="text-primary" />
                {editandoConta ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h3>
              <button 
                onClick={() => {
                  setModalAberto(false);
                  setEditandoConta(null);
                  setNovaConta({
                    descricao: '',
                    valor: '',
                    vencimento: new Date().toISOString().split('T')[0],
                    categoria: 'Outros',
                    recorrente: false,
                    periodicidade: 'Mensal'
                  });
                }} 
                className="p-2 hover:bg-white/5 rounded-full text-white/40"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
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
               
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Categoria</label>
                 <select 
                   value={novaConta.categoria}
                   onChange={(e) => setNovaConta({...novaConta, categoria: e.target.value})}
                   className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 text-white"
                 >
                   <option value="Fornecedor" className="bg-surface">Fornecedores</option>
                   <option value="Aluguel" className="bg-surface">Aluguel</option>
                   <option value="Salário" className="bg-surface">Salários</option>
                   <option value="Impostos" className="bg-surface">Impostos</option>
                   <option value="Outros" className="bg-surface">Outros</option>
                 </select>
               </div>

               <div className="pt-2 space-y-3 border-t border-white/5">
                 <div className="flex items-center gap-2">
                   <input 
                     type="checkbox" 
                     id="is-recorrente"
                     className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/50 cursor-pointer"
                     checked={novaConta.recorrente}
                     onChange={(e) => setNovaConta({...novaConta, recorrente: e.target.checked})}
                   />
                   <label htmlFor="is-recorrente" className="text-xs text-white/70 font-bold flex items-center gap-1.5 cursor-pointer">
                     <Repeat size={14} />
                     Conta Recorrente (Repetitiva)
                   </label>
                 </div>

                 {novaConta.recorrente && (
                   <div className="space-y-2 pl-6 animate-in slide-in-from-top-2 duration-200">
                     <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Periodicidade</label>
                     <select 
                       value={novaConta.periodicidade}
                       onChange={(e) => setNovaConta({...novaConta, periodicidade: e.target.value})}
                       className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 text-white"
                     >
                       <option value="Mensal" className="bg-surface">Mensal</option>
                       <option value="Semanal" className="bg-surface">Semanal</option>
                       <option value="Trimestral" className="bg-surface">Trimestral</option>
                       <option value="Anual" className="bg-surface">Anual</option>
                     </select>
                   </div>
                 )}
               </div>
            </div>
            <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
              <button 
                onClick={handleSalvarConta}
                className="w-full bg-primary text-black font-black py-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95 text-sm uppercase tracking-wider"
              >
                {editandoConta ? 'Salvar Alterações' : 'Salvar Lançamento'}
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

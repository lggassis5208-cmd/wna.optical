import { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Calendar, 
  DollarSign, 
  Trash2, 
  MessageSquare, 
  TrendingUp, 
  Award,
  FileText,
  ChevronRight,
  User,
  HeartCrack,
  Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// Enums da especificação
const ORIGENS = ['whatsapp', 'formulario', 'indicacao', 'instagram', 'anuncio', 'walk_in', 'outro'] as const;
const ESTAGIOS = ['novo', 'contatado', 'exame_agendado', 'compareceu', 'orcamento', 'ganho', 'perdido'] as const;
const MOTIVOS_PERDA = ['preco', 'so_pesquisando', 'comprou_concorrente', 'sem_resposta', 'fora_perfil', 'outro'] as const;

export interface Lead {
  id: string;
  tenant_id: string;
  nome: string;
  telefone: string;
  email: string | null;
  origem: typeof ORIGENS[number];
  origem_detalhe: string | null;
  estagio: typeof ESTAGIOS[number];
  responsavel_id: string | null;
  valor_estimado: number | null;
  interesse: string | null;
  motivo_perda: typeof MOTIVOS_PERDA[number] | null;
  opt_in: boolean;
  consentimento_em: string | null;
  criado_em: string;
  atualizado_em: string;
  ultimo_contato_em: string;
  cliente_id: string | null;
}

export interface LeadEvento {
  id: string;
  lead_id: string;
  tenant_id: string;
  tipo: 'criado' | 'mudou_estagio' | 'mensagem_enviada' | 'mensagem_recebida' | 'nota' | 'agendamento';
  de_estagio: string | null;
  para_estagio: string | null;
  conteudo: string | null;
  por_usuario: string | null;
  em: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'funil' | 'dashboard'>('funil');
  const [tenantId, setTenantId] = useState('00000000-0000-0000-0000-000000000000');
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrigem, setSelectedOrigem] = useState<string>('');
  const [showFrios, setShowFrios] = useState(false);
  const [diasFrio, setDiasFrio] = useState(3);

  // Modal Novo Lead
  const [isNovoLeadOpen, setIsNovoLeadOpen] = useState(false);
  const [novoLead, setNovoLead] = useState({
    nome: '',
    telefone: '',
    email: '',
    origem: 'formulario' as typeof ORIGENS[number],
    origem_detalhe: '',
    valor_estimado: '',
    interesse: ''
  });

  // Modal Perda
  const [isPerdaOpen, setIsPerdaOpen] = useState(false);
  const [perdaLeadId, setPerdaLeadId] = useState<string | null>(null);
  const [motivoPerda, setMotivoPerda] = useState<typeof MOTIVOS_PERDA[number]>('preco');

  // Modal Ganho (Conversão)
  const [isGanhoOpen, setIsGanhoOpen] = useState(false);
  const [ganhoLeadId, setGanhoLeadId] = useState<string | null>(null);
  const [clientesDisponiveis, setClientesDisponiveis] = useState<any[]>([]);
  const [associarClienteExistente, setAssociarClienteExistente] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState('');

  // Detalhe Lateral (Timeline)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadEventos, setLeadEventos] = useState<LeadEvento[]>([]);
  const [novaNota, setNovaNota] = useState('');
  
  // Modal Novo Agendamento (a partir da timeline)
  const [isAgendamentoOpen, setIsAgendamentoOpen] = useState(false);
  const [novoAgendamento, setNovoAgendamento] = useState({
    data: '',
    horario: '',
    observacao: ''
  });

  const fetchTenantAndLeads = async () => {
    setLoading(true);
    try {
      const { data: tenantData } = await supabase.from('tenants').select('id').order('criado_em', { ascending: true }).limit(1);
      const activeTenant = tenantData?.[0]?.id || '00000000-0000-0000-0000-000000000000';
      setTenantId(activeTenant);

      const { data: leadsData, error } = await supabase
        .from('leads')
        .select('*')
        .eq('tenant_id', activeTenant)
        .order('atualizado_em', { ascending: false });

      if (error) throw error;
      setLeads(leadsData || []);

      const { data: clientsData } = await supabase
        .from('clientes')
        .select('id, nome_completo, cpf, whatsapp')
        .eq('tenant_id', activeTenant)
        .order('nome_completo');
      setClientesDisponiveis(clientsData || []);

    } catch (e: any) {
      toast.error('Erro ao carregar leads: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantAndLeads();
  }, []);

  const loadLeadEventos = async (leadId: string) => {
    try {
      const { data, error } = await supabase
        .from('lead_eventos')
        .select('*')
        .eq('lead_id', leadId)
        .order('em', { ascending: false });
      if (error) throw error;
      setLeadEventos(data || []);
    } catch (e: any) {
      toast.error('Erro ao carregar timeline: ' + e.message);
    }
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    loadLeadEventos(lead.id);
  };

  // --- Ações de Lead ---
  const handleCriarLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoLead.nome || !novoLead.telefone) {
      return toast.error('Nome e Telefone são obrigatórios');
    }
    
    // Normalizar telefone no padrão WAHA: 55DDDNUM@c.us
    let cleaned = novoLead.telefone.replace(/\D/g, '');
    if (!cleaned.startsWith('55')) cleaned = '55' + cleaned;
    const formattedTelefone = cleaned + '@c.us';

    try {
      // Deduplicação rígida por telefone + tenant_id
      const { data: existente } = await supabase
        .from('leads')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('telefone', formattedTelefone)
        .limit(1);

      if (existente && existente.length > 0) {
        return toast.error('Já existe um lead cadastrado com este telefone nesta loja.');
      }

      const { data: createdLead, error } = await supabase
        .from('leads')
        .insert([{
          tenant_id: tenantId,
          nome: novoLead.nome,
          telefone: formattedTelefone,
          email: novoLead.email || null,
          origem: novoLead.origem,
          origem_detalhe: novoLead.origem_detalhe || null,
          valor_estimado: novoLead.valor_estimado ? parseFloat(novoLead.valor_estimado) : null,
          interesse: novoLead.interesse || null,
          estagio: 'novo',
          opt_in: true,
          consentimento_em: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // Gravar evento criado
      await supabase.from('lead_eventos').insert([{
        lead_id: createdLead.id,
        tenant_id: tenantId,
        tipo: 'criado',
        conteudo: `Lead cadastrado manualmente. Origem: ${novoLead.origem}.`,
        em: new Date().toISOString()
      }]);

      toast.success('Lead cadastrado com sucesso!');
      setIsNovoLeadOpen(false);
      setNovoLead({
        nome: '',
        telefone: '',
        email: '',
        origem: 'formulario',
        origem_detalhe: '',
        valor_estimado: '',
        interesse: ''
      });
      fetchTenantAndLeads();
    } catch (e: any) {
      toast.error('Erro ao cadastrar lead: ' + e.message);
    }
  };

  const updateLeadEstagio = async (leadId: string, deEstagio: string, paraEstagio: string, extraData: any = {}) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          estagio: paraEstagio,
          atualizado_em: new Date().toISOString(),
          ultimo_contato_em: new Date().toISOString(),
          ...extraData
        })
        .eq('id', leadId);

      if (error) throw error;

      await supabase.from('lead_eventos').insert([{
        lead_id: leadId,
        tenant_id: tenantId,
        tipo: 'mudou_estagio',
        de_estagio: deEstagio,
        para_estagio: paraEstagio,
        conteudo: paraEstagio === 'perdido' ? `Marcado como Perdido. Motivo: ${extraData.motivo_perda}` : `Estágio atualizado no funil Kanban.`,
        em: new Date().toISOString()
      }]);

      toast.success('Estágio atualizado!');
      fetchTenantAndLeads();
      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, estagio: paraEstagio, ...extraData } : null);
        loadLeadEventos(leadId);
      }
    } catch (e: any) {
      toast.error('Erro ao atualizar estágio: ' + e.message);
    }
  };

  // Drag & Drop HTML5 Nativo
  const handleDragStart = (e: React.DragEvent, leadId: string, deEstagio: string) => {
    e.dataTransfer.setData('leadId', leadId);
    e.dataTransfer.setData('deEstagio', deEstagio);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, paraEstagio: typeof ESTAGIOS[number]) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    const deEstagio = e.dataTransfer.getData('deEstagio');
    
    if (deEstagio === paraEstagio) return;

    if (paraEstagio === 'perdido') {
      setPerdaLeadId(leadId);
      setIsPerdaOpen(true);
    } else if (paraEstagio === 'ganho') {
      setGanhoLeadId(leadId);
      setIsGanhoOpen(true);
    } else {
      updateLeadEstagio(leadId, deEstagio, paraEstagio);
    }
  };

  const handleConfirmarPerda = async () => {
    if (!perdaLeadId) return;
    const targetLead = leads.find(l => l.id === perdaLeadId);
    if (!targetLead) return;

    await updateLeadEstagio(perdaLeadId, targetLead.estagio, 'perdido', {
      motivo_perda: motivoPerda
    });

    setIsPerdaOpen(false);
    setPerdaLeadId(null);
  };

  const handleConfirmarGanho = async () => {
    if (!ganhoLeadId) return;
    const lead = leads.find(l => l.id === ganhoLeadId);
    if (!lead) return;

    try {
      let finalClienteId = '';

      if (associarClienteExistente) {
        if (!selectedClienteId) return toast.error('Selecione um cliente existente');
        finalClienteId = selectedClienteId;
      } else {
        // Criar novo cliente
        const rawPhone = lead.telefone.replace('@c.us', '').replace('55', '');
        const { data: novoCliente, error: cliErr } = await supabase
          .from('clientes')
          .insert([{
            tenant_id: tenantId,
            nome_completo: lead.nome,
            whatsapp: rawPhone,
            email: lead.email,
            consentimento_marketing: lead.opt_in,
            lis_score: 850
          }])
          .select()
          .single();

        if (cliErr || !novoCliente) throw cliErr || new Error('Erro ao criar cliente');
        finalClienteId = novoCliente.id;
      }

      // Atualiza o lead
      await updateLeadEstagio(ganhoLeadId, lead.estagio, 'ganho', {
        cliente_id: finalClienteId
      });

      // Disparar início do fluxo de pós-venda (Opcional - agenda mensagem automática do dia 15)
      await supabase.from('pos_venda_envios').insert([{
        tenant_id: tenantId,
        cliente_id: finalClienteId,
        venda_id: null, // Venda avulsa/conversão lead
        marco_dia: 15,
        status: 'pendente',
        agendado_para: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        tipo_gatilho: 'conversao_lead'
      }]);

      toast.success('Lead convertido em cliente e pós-venda agendado!');
      setIsGanhoOpen(false);
      setGanhoLeadId(null);
      setSelectedClienteId('');
    } catch (e: any) {
      toast.error('Erro na conversão: ' + e.message);
    }
  };

  const handleAdicionarNota = async () => {
    if (!selectedLead || !novaNota.trim()) return;

    try {
      const { error } = await supabase.from('lead_eventos').insert([{
        lead_id: selectedLead.id,
        tenant_id: tenantId,
        tipo: 'nota',
        conteudo: novaNota,
        em: new Date().toISOString()
      }]);

      if (error) throw error;
      
      await supabase.from('leads').update({
        ultimo_contato_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      }).eq('id', selectedLead.id);

      toast.success('Nota adicionada!');
      setNovaNota('');
      loadLeadEventos(selectedLead.id);
      fetchTenantAndLeads();
    } catch (e: any) {
      toast.error('Erro ao adicionar nota: ' + e.message);
    }
  };

  const handleCriarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !novoAgendamento.data || !novoAgendamento.horario) {
      return toast.error('Preencha a data e o horário');
    }

    try {
      // 1. Criar agendamento no banco
      const { data: agData, error: agErr } = await supabase
        .from('agendamentos')
        .insert([{
          tenant_id: tenantId,
          lead_id: selectedLead.id,
          data: novoAgendamento.data,
          horario: novoAgendamento.horario,
          status: 'AGENDADO',
          observacao: novoAgendamento.observacao || 'Exame agendado via timeline do lead'
        }])
        .select()
        .single();

      if (agErr) throw agErr;

      // 2. Mudar o estágio do lead para exame_agendado
      await updateLeadEstagio(selectedLead.id, selectedLead.estagio, 'exame_agendado');

      // 3. Registrar o evento
      await supabase.from('lead_eventos').insert([{
        lead_id: selectedLead.id,
        tenant_id: tenantId,
        tipo: 'agendamento',
        conteudo: `Exame de vista agendado para ${novoAgendamento.data} às ${novoAgendamento.horario}. Obs: ${novoAgendamento.observacao}`,
        em: new Date().toISOString()
      }]);

      toast.success('Exame agendado com sucesso!');
      setIsAgendamentoOpen(false);
      setNovoAgendamento({ data: '', horario: '', observacao: '' });
      loadLeadEventos(selectedLead.id);
    } catch (e: any) {
      toast.error('Erro ao agendar exame: ' + e.message);
    }
  };

  // --- Filtros ---
  const leadsFiltrados = leads.filter(lead => {
    const matchesSearch = lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          lead.telefone.includes(searchTerm);
    const matchesOrigem = selectedOrigem ? lead.origem === selectedOrigem : true;
    
    let matchesFrio = true;
    if (showFrios) {
      const limiteFrio = new Date(Date.now() - diasFrio * 24 * 60 * 60 * 1000);
      matchesFrio = new Date(lead.ultimo_contato_em) < limiteFrio && 
                    lead.estagio !== 'ganho' && lead.estagio !== 'perdido';
    }

    return matchesSearch && matchesOrigem && matchesFrio;
  });

  // --- Dashboard Data (Calculada em tempo real) ---
  const getDashboardData = () => {
    const total = leads.length;
    const ganhos = leads.filter(l => l.estagio === 'ganho').length;
    const perdidos = leads.filter(l => l.estagio === 'perdido').length;
    const ativos = total - ganhos - perdidos;

    const conversaoGeral = total > 0 ? (ganhos / total) * 100 : 0;

    // Por Origem
    const porOrigemMap: Record<string, { total: number, ganhos: number }> = {};
    ORIGENS.forEach(o => porOrigemMap[o] = { total: 0, ganhos: 0 });
    leads.forEach(l => {
      if (porOrigemMap[l.origem]) {
        porOrigemMap[l.origem].total++;
        if (l.estagio === 'ganho') porOrigemMap[l.origem].ganhos++;
      }
    });

    // Motivos de Perda
    const motivosPerdaMap: Record<string, number> = {};
    MOTIVOS_PERDA.forEach(m => motivosPerdaMap[m] = 0);
    leads.forEach(l => {
      if (l.estagio === 'perdido' && l.motivo_perda && motivosPerdaMap[l.motivo_perda] !== undefined) {
        motivosPerdaMap[l.motivo_perda]++;
      }
    });

    // Valor estimado no funil
    const valorNoFunil = leads
      .filter(l => l.estagio !== 'ganho' && l.estagio !== 'perdido')
      .reduce((acc, l) => acc + (l.valor_estimado || 0), 0);

    // Leads frios
    const limiteFrio = new Date(Date.now() - diasFrio * 24 * 60 * 60 * 1000);
    const friosTotal = leads.filter(l => 
      l.estagio !== 'ganho' && l.estagio !== 'perdido' && new Date(l.ultimo_contato_em) < limiteFrio
    ).length;

    return {
      total,
      ganhos,
      perdidos,
      ativos,
      conversaoGeral,
      porOrigem: Object.entries(porOrigemMap).map(([origem, val]) => ({
        origem,
        total: val.total,
        ganhos: val.ganhos,
        taxa: val.total > 0 ? (val.ganhos / val.total) * 100 : 0
      })),
      motivosPerda: Object.entries(motivosPerdaMap).sort((a, b) => b[1] - a[1]),
      valorNoFunil,
      friosTotal
    };
  };

  const dash = getDashboardData();

  if (loading) {
    return <div className="flex h-full items-center justify-center font-black animate-pulse">CARREGANDO LEADS...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white">CRM & <span className="text-primary italic">Funil de Leads</span></h2>
          <p className="text-white/40 text-sm italic">Captação, qualificação e automação de pré-vendas</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-black/40 rounded-2xl p-1 border border-white/10 shrink-0 h-fit">
            <button 
              onClick={() => setActiveView('funil')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeView === 'funil' ? 'bg-primary text-black' : 'text-white/40 hover:text-white'}`}
            >
              Pipeline Kanban
            </button>
            <button 
              onClick={() => setActiveView('dashboard')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeView === 'dashboard' ? 'bg-primary text-black' : 'text-white/40 hover:text-white'}`}
            >
              Dashboard
            </button>
          </div>
          
          <button 
            onClick={() => setIsNovoLeadOpen(true)}
            className="bg-primary text-black font-black px-6 py-2.5 rounded-2xl flex items-center gap-2 hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-95 text-sm"
          >
            <Plus size={18} />
            Novo Lead
          </button>
        </div>
      </div>

      {/* Filtros */}
      {activeView === 'funil' && (
        <div className="bg-surface p-6 rounded-3xl border border-white/5 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por nome ou telefone..." 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <select
              className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 appearance-none"
              value={selectedOrigem}
              onChange={(e) => setSelectedOrigem(e.target.value)}
            >
              <option value="">Todas as origens...</option>
              {ORIGENS.map(o => (
                <option key={o} value={o}>{o.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5">
              <span className="text-xs text-white/60 font-bold">Leads Frios ({diasFrio}d):</span>
              <input 
                type="checkbox" 
                className="w-4 h-4 accent-primary rounded cursor-pointer"
                checked={showFrios}
                onChange={(e) => setShowFrios(e.target.checked)}
              />
            </div>
            {showFrios && (
              <input 
                type="number" 
                min="1"
                className="w-16 bg-white/5 border border-white/10 rounded-2xl py-2 px-3 text-center text-sm focus:outline-none"
                value={diasFrio}
                onChange={(e) => setDiasFrio(parseInt(e.target.value) || 3)}
              />
            )}
          </div>
        </div>
      )}

      {/* Conteúdo Ativo */}
      {activeView === 'funil' ? (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 overflow-x-auto pb-4">
          {ESTAGIOS.map(estagio => {
            const leadsNoEstagio = leadsFiltrados.filter(l => l.estagio === estagio);
            
            return (
              <div 
                key={estagio} 
                className="bg-surface/50 border border-white/5 rounded-3xl p-4 min-w-[250px] flex flex-col max-h-[70vh] overflow-hidden"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, estagio)}
              >
                {/* Nome do Estágio */}
                <div className="pb-3 mb-3 border-b border-white/5 flex justify-between items-center shrink-0">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-white/60">{estagio.replace('_', ' ')}</h4>
                  <span className="bg-white/5 text-white/80 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                    {leadsNoEstagio.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {leadsNoEstagio.length === 0 ? (
                    <div className="h-20 border border-dashed border-white/5 rounded-2xl flex items-center justify-center text-[10px] text-white/10 italic">
                      Arraste leads aqui
                    </div>
                  ) : (
                    leadsNoEstagio.map(lead => {
                      const diasNoEstagio = Math.floor((Date.now() - new Date(lead.atualizado_em).getTime()) / (24 * 60 * 60 * 1000));
                      const isFrio = Date.now() - new Date(lead.ultimo_contato_em).getTime() >= diasFrio * 24 * 60 * 60 * 1000 && lead.estagio !== 'ganho' && lead.estagio !== 'perdido';

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id, estagio)}
                          onClick={() => handleSelectLead(lead)}
                          className={`bg-surface p-4 rounded-2xl border transition-all cursor-grab active:cursor-grabbing hover:border-primary/50 group relative overflow-hidden ${
                            isFrio ? 'border-red-500/20 bg-red-500/[0.01]' : 'border-white/5'
                          }`}
                        >
                          {isFrio && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" title="Lead Frio: sem contato recente" />
                          )}
                          <h5 className="font-bold text-sm text-white group-hover:text-primary transition-colors truncate">{lead.nome}</h5>
                          <p className="text-[10px] text-white/30 font-mono mt-1">{lead.telefone.replace('@c.us', '')}</p>
                          
                          {/* Badges */}
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            <span className="text-[8px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-white/50 px-2 py-0.5 rounded-md">
                              {lead.origem}
                            </span>
                            {lead.valor_estimado && (
                              <span className="text-[8px] font-black uppercase tracking-widest bg-green-500/10 text-green-400 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                                R$ {Number(lead.valor_estimado).toFixed(0)}
                              </span>
                            )}
                          </div>

                          <div className="h-px bg-white/5 my-3" />

                          {/* Footer do Card */}
                          <div className="flex justify-between items-center text-[9px] text-white/30 font-bold">
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {diasNoEstagio === 0 ? 'Hoje' : `${diasNoEstagio}d`}
                            </span>
                            <span className="italic">
                              {lead.interesse ? lead.interesse.slice(0, 12) : 'Sem interesse'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Dashboard View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Métricas Principais */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard title="Leads Ativos" value={dash.ativos} desc="Trabalhando no funil" icon={<Users className="text-blue-400" />} />
            <MetricCard title="Taxa de Conversão" value={`${dash.conversaoGeral.toFixed(1)}%`} desc="Vendas ganhas" icon={<CheckCircle2 className="text-green-500" />} />
            <MetricCard title="Leads Frios Pendentes" value={dash.friosTotal} desc="Aguardando contato" icon={<AlertTriangle className="text-red-500" />} />
            <MetricCard title="Valor Estimado no Funil" value={`R$ ${dash.valorNoFunil.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} desc="Oportunidade total" icon={<DollarSign className="text-primary" />} />
          </div>

          {/* Gráfico/Origens */}
          <div className="bg-surface p-6 rounded-3xl border border-white/5 lg:col-span-2 space-y-6">
            <h4 className="font-bold flex items-center gap-2">
              <TrendingUp className="text-primary" size={18} />
              Performance por Origem de Leads
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-black/20 text-white/40 text-[10px] uppercase tracking-[0.2em] font-black">
                    <th className="px-6 py-4">Origem</th>
                    <th className="px-6 py-4 text-center">Total Captados</th>
                    <th className="px-6 py-4 text-center">Convertidos (Ganho)</th>
                    <th className="px-6 py-4 text-right">Taxa de Conversão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {dash.porOrigem.map(item => (
                    <tr key={item.origem} className="hover:bg-white/[0.01]">
                      <td className="px-6 py-4 capitalize font-bold text-white">{item.origem}</td>
                      <td className="px-6 py-4 text-center text-white/60">{item.total}</td>
                      <td className="px-6 py-4 text-center text-green-500">{item.ganhos}</td>
                      <td className="px-6 py-4 text-right font-black text-primary">{item.taxa.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Motivos de Perda */}
          <div className="bg-surface p-6 rounded-3xl border border-white/5 space-y-6">
            <h4 className="font-bold flex items-center gap-2">
              <HeartCrack className="text-red-500" size={18} />
              Motivos de Perda (Ranking)
            </h4>
            <div className="space-y-4">
              {dash.motivosPerda.map(([motivo, count], idx) => {
                const totalPerdidos = dash.perdidos || 1;
                const percent = (count / totalPerdidos) * 100;
                
                return (
                  <div key={motivo} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-white/80">
                      <span className="capitalize">{idx + 1}. {motivo.replace('_', ' ')}</span>
                      <span>{count}x ({percent.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500/80 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
              {dash.perdidos === 0 && (
                <div className="text-center text-white/20 italic text-xs py-8">Nenhum lead marcado como perdido ainda.</div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Gaveta Detalhe do Lead (Lateral) */}
      {selectedLead && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md z-40 bg-surface border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-white/5 bg-white/[0.01] flex justify-between items-center shrink-0">
            <div>
              <h3 className="font-black text-lg text-white">{selectedLead.nome}</h3>
              <p className="text-[10px] text-white/30 font-mono mt-0.5">{selectedLead.telefone.replace('@c.us', '')}</p>
            </div>
            <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-white/5 rounded-full text-white/40">
              <X size={20} />
            </button>
          </div>

          {/* Timeline & Detalhes */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Informações Básicas */}
            <div className="bg-black/20 rounded-2xl p-4 space-y-3 text-xs border border-white/5">
              <div className="flex justify-between"><span className="text-white/40">Estágio:</span> <span className="font-black text-primary capitalize">{selectedLead.estagio}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Origem:</span> <span className="capitalize font-bold">{selectedLead.origem} {selectedLead.origem_detalhe && `(${selectedLead.origem_detalhe})`}</span></div>
              {selectedLead.valor_estimado && (
                <div className="flex justify-between"><span className="text-white/40">Valor Estimado:</span> <span className="font-bold text-green-400">R$ {Number(selectedLead.valor_estimado).toFixed(2)}</span></div>
              )}
              {selectedLead.interesse && (
                <div className="flex justify-between"><span className="text-white/40">Interesse:</span> <span className="font-bold">{selectedLead.interesse}</span></div>
              )}
              <div className="flex justify-between"><span className="text-white/40">Último Contato:</span> <span>{new Date(selectedLead.ultimo_contato_em).toLocaleString('pt-BR')}</span></div>
            </div>

            {/* Agendar Exame Rápido */}
            {selectedLead.estagio !== 'ganho' && selectedLead.estagio !== 'perdido' && (
              <button 
                onClick={() => setIsAgendamentoOpen(true)}
                className="w-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-xs"
              >
                <Calendar size={16} className="text-primary" />
                Agendar Exame de Vista
              </button>
            )}

            {/* Add Nota */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Adicionar Nota Interna</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ex: Ligou pesquisando óculos solar..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none text-white"
                  value={novaNota}
                  onChange={(e) => setNovaNota(e.target.value)}
                />
                <button 
                  onClick={handleAdicionarNota}
                  className="bg-primary text-black font-black px-4 py-2.5 rounded-xl text-xs hover:scale-95 transition-all"
                >
                  Salvar
                </button>
              </div>
            </div>

            {/* Eventos da Timeline */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Timeline de Eventos</h4>
              <div className="relative pl-4 border-l border-white/10 space-y-6 ml-2.5">
                {leadEventos.map(evt => (
                  <div key={evt.id} className="relative space-y-1">
                    {/* Marcador do ponto */}
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-primary rounded-full ring-4 ring-surface" />
                    
                    <div className="flex justify-between items-center text-[10px] font-bold text-white/40">
                      <span className="uppercase tracking-wider text-primary">{evt.tipo}</span>
                      <span>{new Date(evt.em).toLocaleDateString('pt-BR')} {new Date(evt.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-white/80 leading-relaxed">{evt.conteudo}</p>
                    {evt.de_estagio && (
                      <p className="text-[10px] text-white/30 italic">Estágio: {evt.de_estagio} ➔ {evt.para_estagio}</p>
                    )}
                  </div>
                ))}
                {leadEventos.length === 0 && (
                  <div className="text-white/20 italic text-xs pl-2">Nenhum evento registrado.</div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal Novo Lead */}
      {isNovoLeadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users size={18} className="text-primary" />
                Cadastrar Novo Lead
              </h3>
              <button onClick={() => setIsNovoLeadOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-white/40">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCriarLead} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: João da Silva"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 text-white"
                  value={novoLead.nome}
                  onChange={(e) => setNovoLead({ ...novoLead, nome: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">WhatsApp (DDD + Número)</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: 62999999999"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 text-white"
                  value={novoLead.telefone}
                  onChange={(e) => setNovoLead({ ...novoLead, telefone: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Origem do Lead</label>
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 text-white appearance-none"
                  value={novoLead.origem}
                  onChange={(e) => setNovoLead({ ...novoLead, origem: e.target.value as any })}
                >
                  {ORIGENS.map(o => (
                    <option key={o} value={o}>{o.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Origem Detalhe (Nome de quem indicou, etc.)</label>
                <input 
                  type="text" 
                  placeholder="Ex: Campanha de Inverno, Google Ads"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 text-white"
                  value={novoLead.origem_detalhe}
                  onChange={(e) => setNovoLead({ ...novoLead, origem_detalhe: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Valor Estimado (R$)</label>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 text-white"
                    value={novoLead.valor_estimado}
                    onChange={(e) => setNovoLead({ ...novoLead, valor_estimado: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Interesse / Produto</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Multifocal Crizal"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 text-white"
                    value={novoLead.interesse}
                    onChange={(e) => setNovoLead({ ...novoLead, interesse: e.target.value })}
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-primary text-black font-black py-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95 mt-4"
              >
                Cadastrar Lead
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Perda */}
      {isPerdaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <HeartCrack size={18} className="text-red-500" />
                Motivo da Perda do Lead
              </h3>
              <button onClick={() => { setIsPerdaOpen(false); setPerdaLeadId(null); }} className="p-2 hover:bg-white/5 rounded-full text-white/40">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Por que o lead foi perdido?</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-red-500/50 text-white appearance-none"
                value={motivoPerda}
                onChange={(e) => setMotivoPerda(e.target.value as any)}
              >
                {MOTIVOS_PERDA.map(m => (
                  <option key={m} value={m}>{m.toUpperCase().replace('_', ' ')}</option>
                ))}
              </select>
              <button 
                onClick={handleConfirmarPerda}
                className="w-full bg-red-500 text-white font-black py-3 rounded-2xl hover:scale-95 transition-all"
              >
                Confirmar e Arquivar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ganho / Conversão */}
      {isGanhoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Award size={18} className="text-green-500" />
                Converter Lead em Venda/Cliente
              </h3>
              <button onClick={() => { setIsGanhoOpen(false); setGanhoLeadId(null); }} className="p-2 hover:bg-white/5 rounded-full text-white/40">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              
              <div className="flex bg-black/30 rounded-xl p-1 border border-white/10">
                <button
                  onClick={() => setAssociarClienteExistente(false)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!associarClienteExistente ? 'bg-primary text-black' : 'text-white/40 hover:text-white'}`}
                >
                  Criar Novo Cliente
                </button>
                <button
                  onClick={() => setAssociarClienteExistente(true)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${associarClienteExistente ? 'bg-primary text-black' : 'text-white/40 hover:text-white'}`}
                >
                  Associar a Existente
                </button>
              </div>

              {associarClienteExistente ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Selecione o Cliente</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-green-500/50 text-white"
                    value={selectedClienteId}
                    onChange={(e) => setSelectedClienteId(e.target.value)}
                  >
                    <option value="">Selecione o cadastro...</option>
                    {clientesDisponiveis.map(c => (
                      <option key={c.id} value={c.id}>{c.nome_completo} - {c.cpf || 'S/CPF'}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bg-black/20 border border-white/5 rounded-2xl p-4 space-y-2 text-xs">
                  <p className="text-white/60">O lead será convertido em um novo cliente utilizando os dados de cadastro:</p>
                  <div className="flex gap-2 justify-between mt-2 font-bold"><span className="text-white/30">Nome:</span> <span className="text-white">{leads.find(l => l.id === ganhoLeadId)?.nome}</span></div>
                  <div className="flex gap-2 justify-between font-bold"><span className="text-white/30">WhatsApp:</span> <span className="text-white">{leads.find(l => l.id === ganhoLeadId)?.telefone.replace('@c.us','')}</span></div>
                </div>
              )}

              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex gap-3 items-center text-xs text-green-400">
                <Info size={16} />
                <p>Isso disparará o motor de pós-venda (pesquisa de satisfação agendada para 15 dias) automaticamente para o cliente.</p>
              </div>

              <button 
                onClick={handleConfirmarGanho}
                className="w-full bg-primary text-black font-black py-4 rounded-2xl hover:scale-[1.02] transition-all"
              >
                Confirmar Conversão e Ganho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Agendamento (Timeline) */}
      {isAgendamentoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar size={18} className="text-primary" />
                Agendar Exame de Vista
              </h3>
              <button onClick={() => setIsAgendamentoOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-white/40">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCriarAgendamento} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Data do Exame</label>
                <input 
                  type="date" 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 text-white"
                  value={novoAgendamento.data}
                  onChange={(e) => setNovoAgendamento({ ...novoAgendamento, data: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Horário</label>
                <input 
                  type="time" 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 text-white"
                  value={novoAgendamento.horario}
                  onChange={(e) => setNovoAgendamento({ ...novoAgendamento, horario: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Observações / Médico</label>
                <input 
                  type="text" 
                  placeholder="Ex: Dr. Paulo - Oftalmologista"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 text-white"
                  value={novoAgendamento.observacao}
                  onChange={(e) => setNovoAgendamento({ ...novoAgendamento, observacao: e.target.value })}
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-primary text-black font-black py-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all mt-4"
              >
                Confirmar Agendamento
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function MetricCard({ title, value, desc, icon }: { title: string, value: string | number, desc: string, icon: React.ReactNode }) {
  return (
    <div className="bg-surface p-6 rounded-3xl border border-white/5 space-y-4">
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold text-white/30 uppercase tracking-wider">{title}</span>
        <div className="p-2 bg-white/5 rounded-xl">{icon}</div>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-black text-white">{value}</p>
        <p className="text-[10px] text-white/40 italic">{desc}</p>
      </div>
    </div>
  );
}

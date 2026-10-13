import { useState, useEffect, useRef } from 'react';
import { 
  RefreshCw, 
  Search, 
  Send, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  MessageCircle, 
  Calendar, 
  Flame, 
  Sparkles,
  Pause,
  Play,
  Sliders
} from 'lucide-react';
import { recompraService, type CandidatoRecompra, type RecompraResumo } from '../lib/services/recompraService';
import { formatDate } from '../lib/dateUtils';
import { maskCpf } from '../lib/cryptoUtils';
import { openWhatsApp } from '../lib/whatsappUtils';
import { toast } from 'sonner';

export default function RecompraPage() {
  const [candidatos, setCandidatos] = useState<CandidatoRecompra[]>([]);
  const [resumo, setResumo] = useState<RecompraResumo>({
    total_candidatos: 0,
    vence_em_breve: 0,
    vencida_recente: 0,
    vencida_antiga: 0,
    contatados_no_ciclo: 0,
    bloqueados_lgpd: 0
  });
  const [loading, setLoading] = useState(true);
  const [disparosHoje, setDisparosHoje] = useState(0);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [faixaFilter, setFaixaFilter] = useState<string>('todas');
  const [lojaFilter, setLojaFilter] = useState<string>('loja_principal');
  const [apenasNaoContatados, setApenasNaoContatados] = useState(false);

  // Seleção Múltipla & Disparo em Lote
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Estado do Lote
  const [selectedVariationId, setSelectedVariationId] = useState<number>(1);
  const [delaySeconds, setDelaySeconds] = useState<number>(8);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const killSwitchRef = useRef<boolean>(false);

  const fetchDados = async () => {
    setLoading(true);
    try {
      const result = await recompraService.getCandidatos(lojaFilter);
      setCandidatos(result.candidatos);
      setResumo(result.resumo);

      const hoje = await recompraService.getDisparosHoje(lojaFilter);
      setDisparosHoje(hoje);
    } catch (e) {
      toast.error('Erro ao carregar dados do painel de recompra.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDados();
  }, [lojaFilter]);

  // Filtragem dos candidatos na tabela
  const filteredCandidatos = candidatos.filter(c => {
    const term = searchTerm.toLowerCase();
    const matchSearch = 
      c.nome.toLowerCase().includes(term) ||
      c.telefone.includes(term) ||
      (c.cpf && c.cpf.includes(term));

    if (!matchSearch) return false;

    if (faixaFilter !== 'todas' && c.faixa !== faixaFilter) return false;
    if (apenasNaoContatados && c.contatado_no_ciclo) return false;

    return true;
  });

  // Toggle de Seleção de Todos
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const elegiveis = filteredCandidatos
        .filter(c => c.elegivel_lgpd && !c.contatado_no_ciclo)
        .map(c => c.cliente_id);
      setSelectedIds(new Set(elegiveis));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Toggle individual
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Disparo Individual Manual
  const handleDisparoIndividual = async (cand: CandidatoRecompra) => {
    if (!cand.elegivel_lgpd) {
      return toast.error(`Cliente impedido por LGPD: ${cand.motivo_bloqueio_lgpd}`);
    }

    const variacoes = recompraService.getMensagemVariacoes();
    const templateObj = variacoes.find(v => v.id === selectedVariationId) || variacoes[0];
    const primeiroNome = cand.nome.trim().split(' ')[0];
    const mensagemFinal = templateObj.template.replace(/\{\{nome\}\}/g, primeiroNome);

    openWhatsApp(cand.telefone, mensagemFinal);

    // Registrar no Histórico & CRM
    await recompraService.registrarNotificacao({
      cliente_id: cand.cliente_id,
      ficha_id: cand.ficha_id,
      loja_id: cand.loja_id,
      canal: 'whatsapp',
      status_envio: 'enviado',
      mensagem_variacao_id: selectedVariationId,
      mensagem_texto: mensagemFinal,
      usuario_nome: 'Operador Ótica Lìs'
    });

    toast.success(`Disparo registrado para ${cand.nome}!`, {
      description: 'Linha do tempo do CRM e histórico de recompra atualizados.'
    });

    fetchDados();
  };

  // Iniciar Disparo em Lote Sequencial (Manual com Anti-Ban e Kill Switch)
  const handleStartBatch = async () => {
    const alvos = candidatos.filter(c => selectedIds.has(c.cliente_id));
    if (alvos.length === 0) return toast.error('Nenhum paciente selecionado para disparo.');

    if (disparosHoje >= 50) {
      return toast.error('Teto Diário de Envio Atingido (50/dia por loja).', {
        description: 'Aguarde o próximo dia para evitar bloqueios no WhatsApp.'
      });
    }

    setIsProcessingBatch(true);
    killSwitchRef.current = false;
    setBatchProgress({ current: 0, total: alvos.length });

    const variacoes = recompraService.getMensagemVariacoes();
    const templateObj = variacoes.find(v => v.id === selectedVariationId) || variacoes[0];

    let enviadosSucesso = 0;

    for (let i = 0; i < alvos.length; i++) {
      if (killSwitchRef.current) {
        toast.warning('Disparo em lote pausado pelo operador (Kill Switch acionado).');
        break;
      }

      const cand = alvos[i];
      setBatchProgress({ current: i + 1, total: alvos.length });

      if (!cand.elegivel_lgpd) {
        await recompraService.registrarNotificacao({
          cliente_id: cand.cliente_id,
          ficha_id: cand.ficha_id,
          loja_id: cand.loja_id,
          canal: 'whatsapp',
          status_envio: 'bloqueado_lgpd',
          mensagem_variacao_id: selectedVariationId,
          mensagem_texto: `Bloqueado: ${cand.motivo_bloqueio_lgpd}`,
          usuario_nome: 'Sistema Anti-Ban LGPD'
        });
        continue;
      }

      const primeiroNome = cand.nome.trim().split(' ')[0];
      const mensagemFinal = templateObj.template.replace(/\{\{nome\}\}/g, primeiroNome);

      // Abrir a conversa no WhatsApp para revisão manual do operador
      openWhatsApp(cand.telefone, mensagemFinal);

      await recompraService.registrarNotificacao({
        cliente_id: cand.cliente_id,
        ficha_id: cand.ficha_id,
        loja_id: cand.loja_id,
        canal: 'whatsapp',
        status_envio: 'enviado',
        mensagem_variacao_id: selectedVariationId,
        mensagem_texto: mensagemFinal,
        usuario_nome: 'Operador Ótica Lìs'
      });

      enviadosSucesso++;

      // Aguarda o Delay Anti-ban antes do próximo item (se houver próximo e não for cancelado)
      if (i < alvos.length - 1 && !killSwitchRef.current) {
        await new Promise(r => setTimeout(r, delaySeconds * 1000));
      }
    }

    setIsProcessingBatch(false);
    toast.success(`Disparo em Lote finalizado! ${enviadosSucesso} notificações processadas.`);
    setSelectedIds(new Set());
    fetchDados();
  };

  const handleKillSwitch = () => {
    killSwitchRef.current = true;
  };

  const isHorarioOk = recompraService.isHorarioComercial();

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Superior */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20">
              <RefreshCw size={28} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Painel de Recompra por Receita Vencida</h1>
              <p className="text-xs text-white/50">
                Notificações preventivas e de reativação óptica (Anti-Ban & LGPD integrados)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Seletor de Loja */}
          <select
            value={lojaFilter}
            onChange={(e) => setLojaFilter(e.target.value)}
            className="bg-surface border border-white/10 text-white text-xs font-bold rounded-xl px-4 py-2.5 focus:border-primary focus:outline-none"
          >
            <option value="loja_principal">Matriz — Vila Concórdia</option>
            <option value="loja_secundaria">Filial — Recanto das Minas Gerais</option>
            <option value="todas">Todas as Lojas (Multi-Tenant)</option>
          </select>

          <button
            onClick={fetchDados}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/10"
            title="Atualizar Dados"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* CARDS DE RESUMO DAS FAIXAS DE VENCIMENTO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* CARD 1: VENCE EM BREVE (PRIORIDADE OURO) */}
        <div 
          onClick={() => setFaixaFilter('vence_em_breve')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer space-y-2 ${
            faixaFilter === 'vence_em_breve'
              ? 'bg-yellow-500/10 border-yellow-500/40 shadow-lg shadow-yellow-500/10'
              : 'bg-surface border-white/10 hover:border-yellow-500/30'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-yellow-400 bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/20 flex items-center gap-1">
              <Flame size={12} /> Prioridade Ouro (30-60d)
            </span>
            <Sparkles size={16} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-3xl font-black text-white">{resumo.vence_em_breve}</p>
            <p className="text-xs font-bold text-yellow-300/80">Vence em Breve (Preventivo)</p>
          </div>
          <p className="text-[11px] text-white/40">Notificar ANTES do vencimento da visão</p>
        </div>

        {/* CARD 2: VENCIDA RECENTE (ATÉ 90 DIAS) */}
        <div 
          onClick={() => setFaixaFilter('vencida_recente')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer space-y-2 ${
            faixaFilter === 'vencida_recente'
              ? 'bg-orange-500/10 border-orange-500/40 shadow-lg shadow-orange-500/10'
              : 'bg-surface border-white/10 hover:border-orange-500/30'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20">
              Vencida Recente
            </span>
            <Clock size={16} className="text-orange-400" />
          </div>
          <div>
            <p className="text-3xl font-black text-white">{resumo.vencida_recente}</p>
            <p className="text-xs font-bold text-orange-300/80">Venceu há até 90 dias</p>
          </div>
          <p className="text-[11px] text-white/40">Alta conversão de retorno para loja</p>
        </div>

        {/* CARD 3: VENCIDA ANTIGA (+90 DIAS) */}
        <div 
          onClick={() => setFaixaFilter('vencida_antiga')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer space-y-2 ${
            faixaFilter === 'vencida_antiga'
              ? 'bg-purple-500/10 border-purple-500/40 shadow-lg shadow-purple-500/10'
              : 'bg-surface border-white/10 hover:border-purple-500/30'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
              Reativação (+90d)
            </span>
            <Calendar size={16} className="text-purple-400" />
          </div>
          <div>
            <p className="text-3xl font-black text-white">{resumo.vencida_antiga}</p>
            <p className="text-xs font-bold text-purple-300/80">Vencida Antiga</p>
          </div>
          <p className="text-[11px] text-white/40">Campanha de reativação de carteira</p>
        </div>

        {/* CARD 4: TOTAL & STATUS DE ENVIOS HOJE */}
        <div className="p-5 bg-surface border border-white/10 rounded-3xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
              Disparos Hoje
            </span>
            <ShieldCheck size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-3xl font-black text-white">{disparosHoje} / 50</p>
            <p className="text-xs font-bold text-white/70">Teto Diário Anti-Ban</p>
          </div>
          <p className="text-[11px] text-white/40">
            {resumo.contatados_no_ciclo} contatados nos últimos 30 dias
          </p>
        </div>

      </div>

      {/* BANNER DE AVISO DE HORÁRIO COMERCIAL E ANTI-BAN */}
      {!isHorarioOk && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-amber-300 text-xs">
          <AlertTriangle size={18} className="shrink-0" />
          <span>
            <strong>Atenção:</strong> Você está fora do horário comercial ideal (08:00 às 19:00). Recomenda-se realizar disparos apenas em horário comercial para evitar desconfiança e denúncias de spam.
          </span>
        </div>
      )}

      {/* BARRA DE FILTROS & AÇÕES EM LOTE */}
      <div className="bg-surface border border-white/10 rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row justify-between items-center gap-4">
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Pesquisa */}
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por paciente, CPF..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Toggle Apenas Não Contatados */}
          <label className="flex items-center gap-2 text-xs font-bold text-white/80 cursor-pointer select-none">
            <input 
              type="checkbox"
              checked={apenasNaoContatados}
              onChange={(e) => setApenasNaoContatados(e.target.checked)}
              className="rounded bg-white/5 border-white/10 text-primary focus:ring-0"
            />
            <span>Apenas não contatados no ciclo</span>
          </label>
        </div>

        {/* Abas de Faixa & Botão Disparo em Lote */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            {[
              { id: 'todas', label: 'Todas' },
              { id: 'vence_em_breve', label: 'Vence em Breve' },
              { id: 'vencida_recente', label: 'Até 90d' },
              { id: 'vencida_antiga', label: '+90d' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFaixaFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  faixaFilter === f.id ? 'bg-primary text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {selectedIds.size > 0 && (
            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-green-500/20 flex items-center gap-2 animate-bounce"
            >
              <Send size={14} /> Disparar em Lote ({selectedIds.size})
            </button>
          )}
        </div>

      </div>

      {/* TABELA DE PACIENTES CANDIDATOS A RECOMPRA */}
      <div className="bg-surface border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/[0.03] text-white/50 font-black uppercase text-[10px] tracking-widest border-b border-white/5">
                <th className="p-4 w-12 text-center">
                  <input 
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === filteredCandidatos.filter(c => c.elegivel_lgpd && !c.contatado_no_ciclo).length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded bg-white/5 border-white/10 text-primary focus:ring-0"
                  />
                </th>
                <th className="p-4">Paciente</th>
                <th className="p-4">WhatsApp / Telefone</th>
                <th className="p-4">Validade da Receita</th>
                <th className="p-4">Último Grau (OD / OE)</th>
                <th className="p-4">Status de Contato</th>
                <th className="p-4 text-right">Ação Manual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-white/40 italic">
                    Carregando fila de recompra e regras LGPD...
                  </td>
                </tr>
              ) : filteredCandidatos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-white/40 italic">
                    Nenhum paciente encontrado para esta faixa ou filtro.
                  </td>
                </tr>
              ) : (
                filteredCandidatos.map(cand => {
                  const isSelected = selectedIds.has(cand.cliente_id);
                  const isBreve = cand.faixa === 'vence_em_breve';

                  return (
                    <tr 
                      key={cand.cliente_id} 
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="p-4 text-center">
                        <input 
                          type="checkbox"
                          disabled={!cand.elegivel_lgpd || cand.contatado_no_ciclo}
                          checked={isSelected}
                          onChange={() => handleToggleSelect(cand.cliente_id)}
                          className="rounded bg-white/5 border-white/10 text-primary focus:ring-0 disabled:opacity-30"
                        />
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs border ${
                            isBreve ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-primary/10 text-primary border-primary/20'
                          }`}>
                            {cand.nome.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{cand.nome}</p>
                            <p className="text-[10px] font-mono text-white/40">CPF: {maskCpf(cand.cpf)}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 font-mono text-white/80">
                        {cand.telefone || 'Sem número'}
                      </td>

                      <td className="p-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-white">{formatDate(cand.validade_receita)}</p>
                          <p className={`text-[10px] font-bold ${
                            cand.dias_para_vencer >= 0 
                              ? 'text-yellow-400' 
                              : cand.dias_para_vencer >= -90 
                              ? 'text-orange-400' 
                              : 'text-purple-400'
                          }`}>
                            {cand.dias_para_vencer >= 0 
                              ? `Vence em ${cand.dias_para_vencer} dias` 
                              : `Venceu há ${Math.abs(cand.dias_para_vencer)} dias`}
                          </p>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-white/5 rounded-lg font-mono text-[11px] text-white/80 border border-white/5">
                          {cand.grau_resumido}
                        </span>
                      </td>

                      <td className="p-4">
                        {cand.status_contato === 'bloqueado_lgpd' ? (
                          <span 
                            className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit"
                            title={cand.motivo_bloqueio_lgpd}
                          >
                            <XCircle size={12} /> Bloqueado LGPD
                          </span>
                        ) : cand.contatado_no_ciclo ? (
                          <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                            <CheckCircle size={12} /> Contatado ({cand.ultimo_contato_em ? formatDate(cand.ultimo_contato_em) : 'Recente'})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-white/5 text-white/50 rounded-full text-[10px] font-bold w-fit">
                            Nunca contatado no ciclo
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDisparoIndividual(cand)}
                          disabled={!cand.elegivel_lgpd || cand.contatado_no_ciclo}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 ml-auto"
                          title="Enviar notificação manual pelo WhatsApp"
                        >
                          <MessageCircle size={14} /> Notificar WAHA
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL / GAVETA DE DISPARO EM LOTE MANUAL COM ANTI-BAN */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="bg-surface border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-6 p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-500/10 text-green-400 rounded-xl border border-green-500/20">
                  <Send size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Disparo Manual em Lote ({selectedIds.size} Pacientes)</h3>
                  <p className="text-xs text-white/50">Disparo sequencial manual com salvaguardas Anti-Ban</p>
                </div>
              </div>
              <button 
                onClick={() => setIsBatchModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Configuração de Variação de Texto */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-white/70">1. Selecione a Variação da Mensagem (Anti-Spam)</label>
              <div className="grid grid-cols-1 gap-2">
                {recompraService.getMensagemVariacoes().map(v => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVariationId(v.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedVariationId === v.id
                        ? 'bg-primary/10 border-primary text-white'
                        : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <p className="text-xs font-bold text-primary mb-1">{v.titulo}</p>
                    <p className="text-[11px] text-white/70 italic leading-relaxed">"{v.template}"</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Configuração Anti-Ban (Delay & Teto Diário) */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-white/80 flex items-center gap-1.5">
                  <Sliders size={14} className="text-primary" /> Delay Anti-Ban entre envios:
                </span>
                <span className="text-primary font-mono">{delaySeconds} segundos</span>
              </div>
              <input 
                type="range"
                min="5"
                max="15"
                step="1"
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(parseInt(e.target.value))}
                className="w-full accent-primary bg-white/10 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between items-center text-[10px] text-white/40">
                <span>5s (Rápido)</span>
                <span>10s (Recomendado)</span>
                <span>15s (Máxima Segurança)</span>
              </div>
            </div>

            {/* Progresso do Lote */}
            {isProcessingBatch && (
              <div className="space-y-2 bg-green-500/10 border border-green-500/20 p-4 rounded-2xl">
                <div className="flex justify-between items-center text-xs font-bold text-green-300">
                  <span>Enviando mensagens em lote...</span>
                  <span>{batchProgress.current} de {batchProgress.total}</span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-green-500 h-full transition-all duration-300"
                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Footer Ações */}
            <div className="flex justify-between items-center border-t border-white/5 pt-4">
              <div className="text-[11px] text-white/40 flex items-center gap-1">
                <ShieldCheck size={14} className="text-green-400" />
                <span>Inclusão de opt-out ("SAIR") obrigatória em todas as mensagens</span>
              </div>

              <div className="flex items-center gap-3">
                {isProcessingBatch ? (
                  <button
                    onClick={handleKillSwitch}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-red-500/20"
                  >
                    <Pause size={16} /> Pausar / Kill Switch
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsBatchModalOpen(false)}
                      className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleStartBatch}
                      className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-green-500/20 flex items-center gap-2"
                    >
                      <Play size={16} /> Iniciar Disparo Manual
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

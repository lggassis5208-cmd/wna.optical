import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Clock, MessageCircle, AlertCircle, Check, Plus, Bot, UserCheck } from 'lucide-react';
import { crmModuleService, type CrmTarefa, type TarefaTipo } from '../../lib/services/crmModuleService';
import { openWhatsApp } from '../../lib/whatsappUtils';
import { toast } from 'sonner';

export default function CrmTarefasList() {
  const [filtro, setFiltro] = useState<'hoje' | 'vencidas' | 'todas'>('hoje');
  const [tarefas, setTarefas] = useState<CrmTarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaTarefaOpen, setNovaTarefaOpen] = useState(false);

  // Form Nova Tarefa Rápida
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TarefaTipo>('retornar_orcamento');
  const [vencimento, setVencimento] = useState('');
  const [responsavel, setResponsavel] = useState('Atendente');

  useEffect(() => {
    carregarTarefas();
  }, [filtro]);

  const carregarTarefas = async () => {
    setLoading(true);
    // Executa verificação de regras de tarefas automáticas em background
    await crmModuleService.executarRegrasTarefasAutomaticas();
    const data = await crmModuleService.getTarefas(filtro);
    setTarefas(data);
    setLoading(false);
  };

  const handleConcluir = async (id: string) => {
    try {
      await crmModuleService.concluirTarefa(id);
      toast.success('Tarefa marcada como concluída!');
      carregarTarefas();
    } catch (e) {
      toast.error('Erro ao concluir tarefa');
    }
  };

  const handleCriarTarefaManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !vencimento) return toast.error('Preencha título e prazo');

    try {
      await crmModuleService.criarTarefa({
        tipo,
        origem_regra: 'manual',
        titulo: titulo.trim(),
        data_vencimento: new Date(vencimento).toISOString(),
        responsavel_nome: responsavel.trim() || 'Atendente'
      });

      toast.success('Tarefa manual criada com sucesso!');
      setTitulo('');
      setVencimento('');
      setNovaTarefaOpen(false);
      carregarTarefas();
    } catch (err) {
      toast.error('Erro ao criar tarefa');
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-nav de Filtros e Nova Tarefa */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <CheckCircle2 size={20} className="text-primary" />
            Minhas Tarefas & Automações
          </h3>
          <p className="text-xs text-white/40">Tarefas manuais da equipe + tarefas geradas automaticamente por regras.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-surface border border-white/10 p-1 rounded-xl">
            <button
              onClick={() => setFiltro('hoje')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtro === 'hoje' ? 'bg-primary text-black shadow-md' : 'text-white/60 hover:text-white'
              }`}
            >
              Tarefas de Hoje
            </button>
            <button
              onClick={() => setFiltro('vencidas')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtro === 'vencidas' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-white/60 hover:text-white'
              }`}
            >
              Atrasadas
            </button>
            <button
              onClick={() => setFiltro('todas')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtro === 'todas' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              Todas
            </button>
          </div>

          <button
            onClick={() => setNovaTarefaOpen(true)}
            className="bg-primary hover:bg-primary/90 text-black font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={16} /> + Nova Tarefa
          </button>
        </div>
      </div>

      {/* Modal Nova Tarefa Rápida */}
      {novaTarefaOpen && (
        <form onSubmit={handleCriarTarefaManual} className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4 animate-in fade-in">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h4 className="font-bold text-sm text-white">+ Criar Tarefa Manual</h4>
            <button type="button" onClick={() => setNovaTarefaOpen(false)} className="text-white/40 hover:text-white text-xs">
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-white/60 mb-1 block">Título da Tarefa *</label>
              <input 
                type="text"
                placeholder="Ex: Ligar para confirmar se aprovou o orçamento da armação"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-white/60 mb-1 block">Tipo de Tarefa</label>
              <select 
                value={tipo}
                onChange={e => setTipo(e.target.value as TarefaTipo)}
                className="w-full bg-surface border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
              >
                <option value="retornar_orcamento">Retornar Orçamento</option>
                <option value="ligar">Ligar para Cliente</option>
                <option value="mensagem">Enviar WhatsApp</option>
                <option value="reuniao">Reunião / Apresentação</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-white/60 mb-1 block">Prazo / Vencimento *</label>
              <input 
                type="datetime-local"
                value={vencimento}
                onChange={e => setVencimento(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-white/60 mb-1 block">Responsável</label>
              <input 
                type="text"
                value={responsavel}
                onChange={e => setResponsavel(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="submit"
              className="bg-primary text-black font-bold px-5 py-2 rounded-xl text-xs hover:bg-primary/90 transition-all shadow-md"
            >
              Salvar Tarefa
            </button>
          </div>
        </form>
      )}

      {/* Grid de Tarefas */}
      <div className="space-y-3">
        {tarefas.length === 0 ? (
          <div className="p-8 text-center text-white/20 italic text-sm border border-dashed border-white/5 rounded-2xl">
            Nenhuma tarefa pendente neste filtro. Bom trabalho!
          </div>
        ) : (
          tarefas.map(t => {
            const isVencida = !t.concluida && new Date(t.data_vencimento) < new Date();
            const isAutomatica = t.origem_regra && t.origem_regra !== 'manual';

            return (
              <div 
                key={t.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                  t.concluida 
                    ? 'bg-white/5 border-white/5 opacity-50' 
                    : isVencida 
                    ? 'bg-red-500/10 border-red-500/30 shadow-lg shadow-red-500/5' 
                    : 'bg-surface/50 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold bg-primary/20 text-primary px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {t.tipo}
                    </span>

                    {/* Badge indicando se foi criada manualmente ou por Regra Automática */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                      isAutomatica 
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }`}>
                      {isAutomatica ? <Bot size={10} /> : <UserCheck size={10} />}
                      {isAutomatica ? `Regra Automática (${t.origem_regra})` : 'Manual'}
                    </span>

                    <h4 className={`font-bold text-sm text-white ${t.concluida ? 'line-through' : ''}`}>
                      {t.titulo}
                    </h4>
                  </div>

                  {t.descricao && (
                    <p className="text-xs text-white/60 bg-black/20 p-2 rounded-xl border border-white/5 mt-1">
                      {t.descricao}
                    </p>
                  )}

                  <p className="text-xs text-white/40 flex items-center gap-3 pt-1">
                    {t.cliente?.nome && <span>Cliente: <strong>{t.cliente.nome}</strong></span>}
                    <span className={`flex items-center gap-1 font-semibold ${isVencida ? 'text-red-400' : 'text-white/60'}`}>
                      <Clock size={12} />
                      Vencimento: {new Date(t.data_vencimento).toLocaleString('pt-BR')}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {t.cliente?.whatsapp && (
                    <button 
                      onClick={() => openWhatsApp(t.cliente!.whatsapp, `Olá ${t.cliente!.nome}, sobre ${t.titulo}...`)}
                      className="bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <MessageCircle size={14} /> Zap
                    </button>
                  )}

                  {!t.concluida && (
                    <button 
                      onClick={() => handleConcluir(t.id)}
                      className="bg-primary text-black hover:bg-primary/90 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Check size={14} /> Concluir
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

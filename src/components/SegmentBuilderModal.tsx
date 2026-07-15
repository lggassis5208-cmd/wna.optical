import { useState, useMemo } from 'react';
import { X, Plus, Trash2, Filter, Loader2, AlertTriangle, CheckCircle, ShieldAlert, Users, Search, Calendar, Clock, Star } from 'lucide-react';
import { toast } from 'sonner';
import { 
  segmentosService, 
  type Rule, 
  type RuleGroup, 
  type Operator, 
  type FieldDefinition,
  FIELD_DEFINITIONS,
  OPERATORS_BY_TYPE,
  type EvaluationResult
} from '../lib/services/segmentosService';

interface SegmentBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TEMPLATES = [
  {
    id: 'inativos',
    title: 'Inativos há X dias',
    description: 'Encontre clientes que não compram há algum tempo.',
    icon: <Clock className="text-blue-400" size={24} />,
    hasRelativeDays: true,
    defaultDays: 180,
    buildRule: (days: number): RuleGroup => ({
      type: 'group', condition: 'AND', rules: [
        { type: 'rule', field: 'dias_ultima_compra', operator: 'gte', value: days },
        { type: 'rule', field: 'status', operator: 'neq', value: 'inativo' }
      ]
    })
  },
  {
    id: 'recall_receita',
    title: 'Receitas Vencendo',
    description: 'Clientes cujas receitas vencem nos próximos X dias.',
    icon: <Calendar className="text-red-400" size={24} />,
    hasRelativeDays: true,
    defaultDays: 30,
    buildRule: (days: number): RuleGroup => ({
      type: 'group', condition: 'AND', rules: [
        { type: 'rule', field: 'validade_receita', operator: 'next_x_days', value: days },
        { type: 'rule', field: 'tipo_lente', operator: 'is_not_null', value: null }
      ]
    })
  },
  {
    id: 'vip',
    title: 'Clientes VIP',
    description: 'Compradores com alto Ticket Médio e LTV.',
    icon: <Star className="text-yellow-400" size={24} />,
    hasRelativeDays: false,
    buildRule: (): RuleGroup => ({
      type: 'group', condition: 'AND', rules: [
        { type: 'rule', field: 'ticket_medio', operator: 'gte', value: 1000 },
        { type: 'rule', field: 'num_compras', operator: 'gte', value: 2 }
      ]
    })
  }
];

export default function SegmentBuilderModal({ isOpen, onClose, onSuccess }: SegmentBuilderModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [nome, setNome] = useState('');
  const [baseLegal, setBaseLegal] = useState<'consentimento' | 'legitimo_interesse'>('legitimo_interesse');
  const [finalidade, setFinalidade] = useState('');
  
  const [rootGroup, setRootGroup] = useState<RuleGroup>({ type: 'group', condition: 'AND', rules: [] });
  const [tipoCampanha, setTipoCampanha] = useState<'marketing' | 'relacionamento'>('marketing');
  const [matchResult, setMatchResult] = useState<EvaluationResult | null>(null);

  // States for template selection
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateDays, setTemplateDays] = useState<number>(30);

  const hasSensitiveData = useMemo(() => {
    let sensitive = false;
    const checkNode = (node: Rule | RuleGroup) => {
      if (node.type === 'rule') {
        const fieldDef = FIELD_DEFINITIONS.find(f => f.value === node.field);
        if (fieldDef?.sensitive) sensitive = true;
      } else if (node.type === 'group' && node.rules) {
        node.rules.forEach(checkNode);
      }
    };
    checkNode(rootGroup);
    return sensitive;
  }, [rootGroup]);

  // Reset on open
  useMemo(() => {
    if (isOpen) {
      setStep(1);
      setNome('');
      setRootGroup({ type: 'group', condition: 'AND', rules: [] });
      setMatchResult(null);
      setSelectedTemplateId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartCustom = () => {
    setRootGroup({ type: 'group', condition: 'AND', rules: [] });
    setNome('');
    setStep(2);
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tpl = TEMPLATES.find(t => t.id === templateId);
    if (tpl) {
      if (tpl.hasRelativeDays) {
        setTemplateDays(tpl.defaultDays || 30);
      } else {
        // Go straight to step 2 if no relative days needed
        setRootGroup(tpl.buildRule(0));
        setNome(tpl.title);
        setStep(2);
      }
    }
  };

  const handleConfirmTemplate = () => {
    const tpl = TEMPLATES.find(t => t.id === selectedTemplateId);
    if (tpl) {
      setRootGroup(tpl.buildRule(templateDays));
      setNome(`${tpl.title} (${templateDays} dias)`);
      setStep(2);
    }
  };

  const handleEvaluate = async () => {
    if (rootGroup.rules.length === 0) return;
    setEvaluating(true);
    try {
      const result = await segmentosService.evaluateSegmentoCount(rootGroup, tipoCampanha);
      setMatchResult(result);
    } catch (e) {
      toast.error('Erro ao calcular público.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error('Dê um nome para o segmento.');
      return;
    }
    if (rootGroup.rules.length === 0) {
      toast.error('Adicione pelo menos uma regra.');
      return;
    }
    if (hasSensitiveData && baseLegal !== 'consentimento') {
      toast.error('Campos sensíveis de saúde exigem base legal de CONSENTIMENTO.');
      return;
    }

    setLoading(true);
    try {
      await segmentosService.saveSegmento({
        nome,
        regras: rootGroup,
        base_legal: baseLegal,
        finalidade,
        tipo_campanha: tipoCampanha
      } as any);
      toast.success('Segmento salvo com sucesso!');
      onSuccess();
      onClose();
    } catch (e) {
      toast.error('Erro ao salvar segmento.');
    } finally {
      setLoading(false);
    }
  };

  const updateNode = (path: number[], newValue: Rule | RuleGroup | null) => {
    const newRoot = JSON.parse(JSON.stringify(rootGroup));
    let current = newRoot;
    
    // Percorre até o pai do nó alvo
    for (let i = 0; i < path.length - 1; i++) {
      current = current.rules[path[i]];
    }
    
    const lastIndex = path[path.length - 1];
    
    if (newValue === null) {
      // Excluir nó
      current.rules.splice(lastIndex, 1);
    } else {
      // Atualizar nó
      current.rules[lastIndex] = newValue;
    }
    
    setRootGroup(newRoot);
    setMatchResult(null); // Invalida o cálculo anterior
  };

  const addRuleToGroup = (path: number[], isGroup: boolean = false) => {
    const newRoot = JSON.parse(JSON.stringify(rootGroup));
    
    let current = newRoot;
    if (path.length > 0) {
      for (let i = 0; i < path.length; i++) {
        current = current.rules[path[i]];
      }
    }
    
    if (isGroup) {
      current.rules.push({ type: 'group', condition: 'AND', rules: [] });
    } else {
      current.rules.push({ type: 'rule', field: FIELD_DEFINITIONS[0].value, operator: 'eq', value: '' });
    }
    
    setRootGroup(newRoot);
    setMatchResult(null);
  };

  const renderNode = (node: Rule | RuleGroup, path: number[]) => {
    if (node.type === 'group') {
      return (
        <div key={path.join('-')} className={`border border-white/10 rounded-xl p-4 space-y-4 ${path.length > 0 ? 'bg-black/20 ml-6' : 'bg-transparent'}`}>
          <div className="flex items-center gap-4">
            <select
              value={node.condition}
              onChange={(e) => updateNode(path, { ...node, condition: e.target.value as 'AND' | 'OR' })}
              className="bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-primary/50"
            >
              <option value="AND">E (AND)</option>
              <option value="OR">OU (OR)</option>
            </select>
            
            <div className="flex-1 flex gap-2 justify-end">
              <button onClick={() => addRuleToGroup(path, false)} className="text-xs text-primary font-bold hover:underline flex items-center gap-1"><Plus size={14}/> Regra</button>
              <button onClick={() => addRuleToGroup(path, true)} className="text-xs text-blue-400 font-bold hover:underline flex items-center gap-1"><Plus size={14}/> Grupo</button>
              {path.length > 0 && (
                <button onClick={() => updateNode(path, null)} className="text-white/40 hover:text-red-500 ml-2"><Trash2 size={16}/></button>
              )}
            </div>
          </div>
          
          <div className="space-y-3 relative">
            {node.rules.map((child, i) => renderNode(child, [...path, i]))}
          </div>
        </div>
      );
    }

    // É uma Regra (Rule)
    const fieldDef = FIELD_DEFINITIONS.find(f => f.value === node.field) || FIELD_DEFINITIONS[0];
    const operators = OPERATORS_BY_TYPE[fieldDef.type];

    return (
      <div key={path.join('-')} className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-lg relative">
        <select
          value={node.field}
          onChange={(e) => {
            const newField = FIELD_DEFINITIONS.find(f => f.value === e.target.value)!;
            updateNode(path, { 
              ...node, 
              field: newField.value, 
              operator: OPERATORS_BY_TYPE[newField.type][0].value,
              value: newField.type === 'boolean' ? true : ''
            });
          }}
          className="bg-black border border-white/10 rounded-md p-2 text-sm text-white flex-1"
        >
          {FIELD_DEFINITIONS.map(f => (
            <option key={f.value} value={f.value}>{f.label} {f.sensitive ? '⚠️' : ''}</option>
          ))}
        </select>

        <select
          value={node.operator}
          onChange={(e) => updateNode(path, { ...node, operator: e.target.value as Operator })}
          className="bg-black border border-white/10 rounded-md p-2 text-sm text-white flex-1"
        >
          {operators.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {!['is_null', 'is_not_null', 'is_true', 'is_false'].includes(node.operator) && (
          fieldDef.type === 'enum' && fieldDef.options ? (
            <select
              value={node.value}
              onChange={(e) => updateNode(path, { ...node, value: e.target.value })}
              className="bg-black border border-white/10 rounded-md p-2 text-sm text-white flex-1"
            >
              <option value="">Selecione...</option>
              {fieldDef.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : fieldDef.type === 'date' ? (
            <input
              type="date"
              value={node.value}
              onChange={(e) => updateNode(path, { ...node, value: e.target.value })}
              className="bg-black border border-white/10 rounded-md p-2 text-sm text-white flex-1"
            />
          ) : (
            <input
              type={['last_x_days', 'last_x_months', 'next_x_days'].includes(node.operator) ? 'number' : fieldDef.type === 'number' ? 'number' : 'text'}
              value={node.value}
              onChange={(e) => updateNode(path, { ...node, value: e.target.value })}
              className="bg-black border border-white/10 rounded-md p-2 text-sm text-white flex-1"
              placeholder="Valor..."
            />
          )
        )}

        <button onClick={() => updateNode(path, null)} className="text-white/40 hover:text-red-500 p-2"><Trash2 size={16}/></button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface w-full max-w-4xl max-h-[90vh] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary"><Filter size={24} /></div>
            <div>
              <h3 className="text-xl font-bold">Construtor de Segmentos (AST Engine)</h3>
              <p className="text-xs text-white/40">Motor multi-tenant seguro com adequação à LGPD</p>
            </div>
          </div>
          <button onClick={onClose}><X size={24} className="text-white/40 hover:text-white transition-colors" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TEMPLATES.map(tpl => (
                  <div 
                    key={tpl.id} 
                    className={`bg-white/5 border ${selectedTemplateId === tpl.id ? 'border-primary' : 'border-white/10'} p-5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group relative`}
                    onClick={() => handleSelectTemplate(tpl.id)}
                  >
                    <div className="flex gap-4">
                      <div className="p-3 bg-black/40 rounded-xl group-hover:scale-110 transition-transform">{tpl.icon}</div>
                      <div>
                        <h4 className="font-bold text-white mb-1">{tpl.title}</h4>
                        <p className="text-xs text-white/50 leading-relaxed">{tpl.description}</p>
                      </div>
                    </div>
                    {selectedTemplateId === tpl.id && <div className="absolute inset-0 bg-primary/5 rounded-2xl pointer-events-none" />}
                  </div>
                ))}
              </div>
              
              {selectedTemplateId && TEMPLATES.find(t => t.id === selectedTemplateId)?.hasRelativeDays && (
                <div className="mt-2 p-6 bg-primary/10 border border-primary/20 rounded-2xl animate-in fade-in slide-in-from-bottom-4">
                  <h4 className="font-bold text-primary mb-2">Configurar {TEMPLATES.find(t => t.id === selectedTemplateId)?.title}</h4>
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-primary/70 uppercase tracking-widest block mb-1">Período (em dias)</label>
                      <input 
                        type="number" 
                        value={templateDays} 
                        onChange={e => setTemplateDays(Number(e.target.value))} 
                        className="w-full bg-black/40 border border-primary/30 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>
                    <button onClick={handleConfirmTemplate} className="bg-primary text-black font-black px-6 py-3 rounded-xl hover:bg-yellow-400 transition-colors">
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-center pt-8 border-t border-white/5">
                <button 
                  onClick={handleStartCustom}
                  className="px-8 py-4 border-2 border-primary/20 text-primary font-bold rounded-xl hover:bg-primary/10 hover:border-primary/40 transition-all flex items-center gap-3"
                >
                  <Plus size={24} />
                  Criar Novo Público Personalizado
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5 mb-6">
            <div className="flex-1">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Nome do Segmento</label>
              <input 
                type="text" 
                value={nome} 
                onChange={e => setNome(e.target.value)} 
                placeholder="Ex: Inativos +6 meses"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 focus:outline-none transition-colors"
              />
            </div>
            <button 
              onClick={() => setStep(1)} 
              className="ml-4 px-4 py-3 mt-6 text-sm bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-white/70"
            >
              Trocar Template
            </button>
          </div>

          {hasSensitiveData && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-4 items-start">
              <ShieldAlert className="text-red-500 shrink-0" size={24} />
              <div>
                <h4 className="text-red-500 font-bold text-sm">Alerta de Dados Sensíveis (LGPD)</h4>
                <p className="text-xs text-white/60 mt-1 mb-3">
                  Você incluiu um campo de saúde (ex: Grau, Receita). O uso destes dados para marketing ou remarketing 
                  requer obrigatoriamente a base legal de <b>Consentimento Específico</b>.
                </p>
                <div className="flex items-center gap-3">
                  <select 
                    value={baseLegal} 
                    onChange={e => setBaseLegal(e.target.value as any)}
                    className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="legitimo_interesse">Legítimo Interesse (Bloqueado)</option>
                    <option value="consentimento">Consentimento do Titular Coletado</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Finalidade (Obrigatório)"
                    value={finalidade}
                    onChange={e => setFinalidade(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white flex-1"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-4 flex items-center justify-between">
              <span>Árvore de Regras</span>
            </label>
            {renderNode(rootGroup, [])}
          </div>

          {/* Tipo de Campanha & Consentimento LGPD */}
          <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white/60 uppercase tracking-widest">Finalidade e Regras de Remarketing (LGPD)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-white/40 font-bold uppercase">Tipo de Campanha</label>
                <select
                  value={tipoCampanha}
                  onChange={(e) => {
                    setTipoCampanha(e.target.value as any);
                    setMatchResult(null);
                  }}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="marketing">Campanha de Marketing / Promoção (Exige Opt-in)</option>
                  <option value="relacionamento">Relacionamento / Pós-Venda (Legítimo Interesse)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-white/40 font-bold uppercase">Base Legal do Público</label>
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-primary font-black capitalize">
                  {tipoCampanha === 'marketing' ? 'Consentimento Livre (Opt-in)' : 'Legítimo Interesse Comercial'}
                </div>
              </div>
            </div>
          </div>

          {matchResult && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                <CheckCircle size={20} /> Preview de Elegibilidade do Público
              </div>
              
              {/* Box de Estatísticas de Transparência */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-black/40 p-4 rounded-xl text-center border border-white/5">
                <div className="space-y-1">
                  <p className="text-[10px] text-white/40 uppercase font-black">No Filtro</p>
                  <p className="text-lg font-black text-white">{matchResult.totalFiltro || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-red-400/60 uppercase font-black">Opt-out/Supressão</p>
                  <p className="text-lg font-black text-red-400">-{matchResult.excluidosSupressao || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-yellow-500/60 uppercase font-black">Sem Consentimento</p>
                  <p className="text-lg font-black text-yellow-500">-{matchResult.excluidosConsentimento || 0}</p>
                </div>
                <div className="space-y-1 border-l border-white/10">
                  <p className="text-[10px] text-primary uppercase font-black">Elegíveis</p>
                  <p className="text-lg font-black text-primary">{matchResult.count || 0}</p>
                </div>
              </div>
              
              <p className="text-[10px] text-green-500/60 uppercase font-bold flex items-center gap-1.5">
                <ShieldAlert size={12} /> A supressão global e os critérios de opt-in foram aplicados no cálculo automaticamente.
              </p>
              
              {matchResult.sample && matchResult.sample.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-xs font-bold text-white/40 mb-2">Amostra Mascarada de Contatos (LGPD Minimization)</p>
                  <div className="space-y-2">
                    {matchResult.sample.slice(0, 5).map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs bg-black/20 p-2.5 rounded-lg border border-white/5">
                        <span className="text-white/80 font-bold">{s.nome}</span>
                        <div className="flex gap-4">
                          <span className="text-white/40 font-mono">{s.email_mascarado}</span>
                          <span className="text-white/40 font-mono">{s.whatsapp_mascarado}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 flex justify-between items-center bg-black/20">
          {step === 2 ? (
            <button 
              onClick={handleEvaluate} 
              disabled={evaluating || rootGroup.rules.length === 0}
              className="px-6 py-2.5 rounded-xl bg-white/5 font-bold text-white hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              {evaluating ? <Loader2 className="animate-spin" size={18}/> : <Users size={18} />}
              Calcular Público
            </button>
          ) : <div />}
          
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-transparent font-bold text-white/40 hover:text-white transition-colors">Cancelar</button>
            {step === 2 && (
              <button onClick={handleSave} disabled={loading} className="px-8 py-2.5 rounded-xl bg-primary hover:bg-yellow-400 text-black font-black flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(255,191,0,0.2)]">
                {loading ? <Loader2 className="animate-spin" size={20}/> : 'Salvar Segmento'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

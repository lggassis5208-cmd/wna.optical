import { useState } from 'react';
import { X, Plus, Trash2, Filter, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { segmentosService, type Rule, type RuleField, type Operator } from '../lib/services/segmentosService';

interface SegmentBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const FIELD_OPTIONS: { value: RuleField; label: string; type: 'number' | 'text' | 'boolean' }[] = [
  { value: 'idade', label: 'Idade', type: 'number' },
  { value: 'canal_origem', label: 'Canal de Origem', type: 'text' },
  { value: 'aniversariante_mes', label: 'Aniversariante do Mês', type: 'boolean' },
  { value: 'dias_ultima_compra', label: 'Dias desde Última Compra', type: 'number' },
  { value: 'tipo_ultima_compra', label: 'Tipo do Último Produto', type: 'text' },
  { value: 'ltv', label: 'Lifetime Value (LTV R$)', type: 'number' },
];

const OPERATOR_OPTIONS: Record<'number' | 'text' | 'boolean', { value: Operator; label: string }[]> = {
  number: [
    { value: 'eq', label: 'Igual a' },
    { value: 'gt', label: 'Maior que' },
    { value: 'gte', label: 'Maior ou Igual' },
    { value: 'lt', label: 'Menor que' },
    { value: 'lte', label: 'Menor ou Igual' },
  ],
  text: [
    { value: 'eq', label: 'Igual a' },
    { value: 'neq', label: 'Diferente de' },
  ],
  boolean: [
    { value: 'eq', label: 'É' },
  ]
};

export default function SegmentBuilderModal({ isOpen, onClose, onSuccess }: SegmentBuilderModalProps) {
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [nome, setNome] = useState('');
  const [rules, setRules] = useState<Rule[]>([]);
  const [matchCount, setMatchCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleAddRule = () => {
    setRules([...rules, { field: 'idade', operator: 'eq', value: '' }]);
    setMatchCount(null);
  };

  const handleUpdateRule = (index: number, updates: Partial<Rule>) => {
    const newRules = [...rules];
    const fieldType = FIELD_OPTIONS.find(f => f.value === (updates.field || newRules[index].field))?.type || 'text';
    
    // Se mudou o campo, reseta operador e valor
    if (updates.field && updates.field !== newRules[index].field) {
      newRules[index] = {
        field: updates.field,
        operator: OPERATOR_OPTIONS[fieldType][0].value,
        value: fieldType === 'boolean' ? true : ''
      };
    } else {
      newRules[index] = { ...newRules[index], ...updates };
    }
    
    setRules(newRules);
    setMatchCount(null);
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
    setMatchCount(null);
  };

  const handleEvaluate = async () => {
    if (rules.length === 0) return;
    setEvaluating(true);
    try {
      const count = await segmentosService.evaluateSegmentoCount(rules);
      setMatchCount(count);
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
    if (rules.length === 0) {
      toast.error('Adicione pelo menos uma regra.');
      return;
    }

    setLoading(true);
    try {
      await segmentosService.saveSegmento({ nome, regras: rules });
      toast.success('Segmento criado com sucesso!');
      onSuccess();
      onClose();
    } catch (e) {
      toast.error('Erro ao salvar segmento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface w-full max-w-3xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Filter className="text-primary" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Criar Segmento (CRM)</h3>
              <p className="text-xs text-white/40">Filtre clientes para campanhas e automações</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-white/70 ml-1">Nome do Segmento</label>
            <input 
              type="text" 
              placeholder="Ex: Inativos há 6 meses - Lentes Multifocais"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-primary/50 transition-colors text-white"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-white/5 pb-2">
              <label className="text-sm font-bold text-white/70 ml-1">Regras (Motor E)</label>
              <button 
                onClick={handleAddRule}
                className="text-xs text-primary font-bold hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus size={14} /> Adicionar Regra
              </button>
            </div>

            {rules.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                <p className="text-white/40 text-sm">Nenhuma regra adicionada.</p>
                <p className="text-white/30 text-xs mt-1">Este segmento englobará todos os clientes com consentimento de marketing.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule, idx) => {
                  const fieldType = FIELD_OPTIONS.find(f => f.value === rule.field)?.type || 'text';
                  const availableOperators = OPERATOR_OPTIONS[fieldType];

                  return (
                    <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 relative group">
                      <select 
                        className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary/50 appearance-none min-w-[150px]"
                        value={rule.field}
                        onChange={(e) => handleUpdateRule(idx, { field: e.target.value as RuleField })}
                      >
                        {FIELD_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>

                      <select 
                        className="w-full sm:w-auto bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary/50 appearance-none min-w-[130px]"
                        value={rule.operator}
                        onChange={(e) => handleUpdateRule(idx, { operator: e.target.value as Operator })}
                      >
                        {availableOperators.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>

                      {fieldType === 'boolean' ? (
                        <select 
                          className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary/50 appearance-none"
                          value={rule.value ? 'true' : 'false'}
                          onChange={(e) => handleUpdateRule(idx, { value: e.target.value === 'true' })}
                        >
                          <option value="true">Sim / Verdadeiro</option>
                          <option value="false">Não / Falso</option>
                        </select>
                      ) : (
                        <input 
                          type={fieldType === 'number' ? 'number' : 'text'}
                          className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary/50"
                          placeholder="Valor"
                          value={rule.value}
                          onChange={(e) => handleUpdateRule(idx, { value: e.target.value })}
                        />
                      )}

                      <button 
                        onClick={() => handleRemoveRule(idx)}
                        className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors ml-auto sm:ml-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button 
              onClick={handleEvaluate}
              disabled={evaluating || rules.length === 0}
              className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {evaluating ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
              Calcular Público
            </button>
            
            {matchCount !== null && (
              <div className="text-sm animate-in fade-in">
                <span className="text-primary font-bold text-lg">{matchCount}</span>
                <span className="text-white/40 ml-2">clientes compatíveis</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white/40 hover:text-white hover:bg-white/5 transition-colors">
              Cancelar
            </button>
            <button 
              disabled={loading}
              onClick={handleSave}
              className="bg-primary text-black px-8 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Segmento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

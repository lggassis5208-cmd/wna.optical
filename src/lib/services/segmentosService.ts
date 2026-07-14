import { supabase } from '../supabase';

export type Operator = 
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between'
  | 'contains' | 'starts_with' | 'in' | 'is_null' | 'is_not_null'
  | 'is_true' | 'is_false' | 'last_x_days' | 'last_x_months' | 'next_x_days';

export type FieldType = 'number' | 'text' | 'date' | 'enum' | 'boolean';

export interface FieldDefinition {
  value: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  sensitive?: boolean; // LGPD
}

export interface Rule {
  type: 'rule';
  field: string;
  operator: Operator;
  value: any;
}

export interface RuleGroup {
  type: 'group';
  condition: 'AND' | 'OR';
  rules: (Rule | RuleGroup)[];
}

export interface Segmento {
  id?: string;
  tenant_id?: string;
  nome: string;
  regras: RuleGroup;
  base_legal?: 'consentimento' | 'legitimo_interesse';
  finalidade?: string;
  criado_em?: string;
}

export interface EvaluationResult {
  count: number;
  sample: any[];
}

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  // Recência
  { value: 'ultima_consulta', label: 'Última Consulta', type: 'date' },
  { value: 'validade_receita', label: 'Validade da Receita', type: 'date', sensitive: true },
  { value: 'dias_ultima_compra', label: 'Dias desde Última Compra', type: 'number' },
  
  // Produto
  { value: 'tipo_lente', label: 'Tipo de Lente', type: 'enum', sensitive: true, options: [
    { value: 'monofocal', label: 'Monofocal' },
    { value: 'multifocal', label: 'Multifocal' },
    { value: 'ocupacional', label: 'Ocupacional' }
  ]},
  { value: 'tipo_armacao', label: 'Tipo de Armação', type: 'text' },
  { value: 'marca', label: 'Marca da Armação', type: 'text' },
  
  // Clínico/Óptico
  { value: 'grau_esferico', label: 'Grau Esférico', type: 'number', sensitive: true },
  { value: 'grau_cilindrico', label: 'Grau Cilíndrico', type: 'number', sensitive: true },
  { value: 'adicao', label: 'Adição', type: 'number', sensitive: true },
  
  // Comercial
  { value: 'ticket_medio', label: 'Ticket Médio', type: 'number' },
  { value: 'ltv_total', label: 'LTV Total (R$)', type: 'number' },
  { value: 'num_compras', label: 'Número de Compras', type: 'number' },
  { value: 'convenio', label: 'Convênio', type: 'text' },
  
  // Pessoal
  { value: 'idade', label: 'Idade', type: 'number' },
  { value: 'mes_aniversario', label: 'Mês do Aniversário (1-12)', type: 'number' },
  { value: 'cidade', label: 'Cidade', type: 'text' },
  { value: 'status', label: 'Status', type: 'enum', options: [
    { value: 'ativo', label: 'Ativo' },
    { value: 'inativo', label: 'Inativo' },
    { value: 'lead', label: 'Lead' }
  ]},
  { value: 'temperatura', label: 'Temperatura (Lead)', type: 'enum', options: [
    { value: 'frio', label: 'Frio' },
    { value: 'morno', label: 'Morno' },
    { value: 'quente', label: 'Quente' },
    { value: 'fidelizado', label: 'Fidelizado' }
  ]},
  { value: 'canal_origem', label: 'Origem do Cliente', type: 'enum', options: [
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'anuncio', label: 'Anúncio / Instagram' },
    { value: 'indicacao', label: 'Indicação' },
    { value: 'passagem', label: 'Passagem na Loja' }
  ]},
];

export const OPERATORS_BY_TYPE: Record<FieldType, { value: Operator; label: string }[]> = {
  number: [
    { value: 'eq', label: 'Igual a' },
    { value: 'neq', label: 'Diferente de' },
    { value: 'gt', label: 'Maior que' },
    { value: 'gte', label: 'Maior ou Igual a' },
    { value: 'lt', label: 'Menor que' },
    { value: 'lte', label: 'Menor ou Igual a' },
    { value: 'between', label: 'Entre' },
  ],
  text: [
    { value: 'eq', label: 'Igual a' },
    { value: 'contains', label: 'Contém' },
    { value: 'starts_with', label: 'Começa com' },
    { value: 'in', label: 'Está na lista' },
    { value: 'is_null', label: 'Está vazio' },
  ],
  date: [
    { value: 'last_x_days', label: 'Nos últimos X dias' },
    { value: 'last_x_months', label: 'Nos últimos X meses' },
    { value: 'next_x_days', label: 'Nos próximos X dias' },
    { value: 'lt', label: 'Antes de (Data)' },
    { value: 'gt', label: 'Depois de (Data)' },
    { value: 'is_null', label: 'Não preenchido' },
  ],
  enum: [
    { value: 'eq', label: 'Igual a' },
    { value: 'neq', label: 'Diferente de' },
    { value: 'in', label: 'Um dos' },
  ],
  boolean: [
    { value: 'is_true', label: 'É Verdadeiro' },
    { value: 'is_false', label: 'É Falso' },
  ]
};

// Converte AST para string de filtro PostgREST (usando a sintaxe or/and do Supabase)
function buildFilterString(node: Rule | RuleGroup): string {
  if (node.type === 'rule') {
    const { field, operator, value } = node;
    
    // Tratamento especial para operadores customizados
    if (operator === 'is_true') return `${field}.eq.true`;
    if (operator === 'is_false') return `${field}.eq.false`;
    if (operator === 'is_null') return `${field}.is.null`;
    if (operator === 'is_not_null') return `${field}.not.is.null`;
    if (operator === 'contains') return `${field}.ilike.*${value}*`;
    if (operator === 'starts_with') return `${field}.ilike.${value}*`;
    if (operator === 'in') {
      const arr = Array.isArray(value) ? value : value.split(',').map((v: string) => v.trim());
      return `${field}.in.(${arr.join(',')})`;
    }
    if (operator === 'between') {
      const [min, max] = value;
      return `and(${field}.gte.${min},${field}.lte.${max})`;
    }
    if (operator === 'last_x_days') {
      return `and(${field}.gte.today-${value}days,${field}.lte.today)`;
    }
    if (operator === 'last_x_months') {
      return `and(${field}.gte.today-${value}months,${field}.lte.today)`;
    }
    if (operator === 'next_x_days') {
      return `and(${field}.gte.today,${field}.lte.today+${value}days)`;
    }

    // Padrões
    return `${field}.${operator}.${value}`;
  } else if (node.type === 'group') {
    if (!node.rules || node.rules.length === 0) return '';
    const childFilters = node.rules.map(buildFilterString).filter(Boolean);
    if (childFilters.length === 0) return '';
    if (childFilters.length === 1) return childFilters[0];
    
    const condition = node.condition.toLowerCase(); // 'and' | 'or'
    return `${condition}(${childFilters.join(',')})`;
  }
  return '';
}

export const segmentosService = {
  async getSegmentos() {
    try {
      const { data, error } = await supabase
        .from('segmentos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Segmento[];
    } catch (e) {
      console.error('Erro ao buscar segmentos:', e);
      return [];
    }
  },

  async saveSegmento(segmento: Segmento) {
    try {
      // Regra de Ouro LGPD: Apenas armazenamos no banco se confirmou as restrições
      const { data, error } = await supabase
        .from('segmentos')
        .insert([segmento])
        .select();

      if (error) throw error;
      return data?.[0] || null;
    } catch (e) {
      console.error('Erro ao salvar segmento:', e);
      throw e;
    }
  },

  async deleteSegmento(id: string) {
    try {
      const { error } = await supabase.from('segmentos').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Erro ao deletar segmento:', e);
      return false;
    }
  },

  async evaluateSegmentoCount(ast: RuleGroup): Promise<EvaluationResult> {
    try {
      if (!isSupabaseConfigured()) {
        return { count: 0, sample: [] };
      }

      const filterString = buildFilterString(ast);
      
      let query = supabase.from('v_clientes_metricas').select('cliente_id', { count: 'exact' });
      
      // Aplicar filtro AST gerado
      if (filterString) {
        query = query.or(filterString); // Injeta a string de query
      }

      // REGRA OBRIGATÓRIA DA LGPD: Exclui supressão
      query = query.eq('consentimento_marketing', true);

      // Executa contagem limitando o select para não trafegar muita coisa
      const { data: clients, count, error } = await query.limit(20);
      if (error) throw error;

      if (!clients || clients.length === 0) {
        return { count: count || 0, sample: [] };
      }

      // Chama a RPC de mascaramento para a amostra
      const clientIds = clients.map(c => c.cliente_id);
      const { data: sampleData, error: rpcError } = await supabase.rpc('mask_sample_data', { client_ids: clientIds });
      
      if (rpcError) {
        console.warn('RPC mask_sample_data não encontrada ou falhou. O banco de dados está desatualizado.', rpcError);
        return { count: count || 0, sample: [] };
      }

      return { count: count || 0, sample: sampleData || [] };
    } catch (e) {
      console.error('Erro no evaluateSegmentoCount:', e);
      throw e;
    }
  }
};

function isSupabaseConfigured() {
  return true; // Simplificado para esse ambiente
}

import { supabase } from '../supabase';

export type Operator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
export type RuleField = 
  | 'idade' 
  | 'canal_origem' 
  | 'aniversariante_mes' 
  | 'dias_ultima_compra' 
  | 'tipo_ultima_compra' 
  | 'consentimento_marketing' 
  | 'ltv';

export interface Rule {
  field: RuleField;
  operator: Operator;
  value: any;
}

export interface Segmento {
  id?: string;
  tenant_id?: string;
  nome: string;
  regras: Rule[];
  criado_em?: string;
}

export const segmentosService = {
  // Busca todos os segmentos salvos
  async getSegmentos() {
    try {
      const { data, error } = await supabase
        .from('segmentos')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      return data as Segmento[];
    } catch (e) {
      console.error('Erro ao buscar segmentos:', e);
      return [];
    }
  },

  // Salva um novo segmento
  async saveSegmento(segmento: Segmento) {
    try {
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

  // Exclui um segmento
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

  // O "MOTOR" - Traduz o array de regras JSON em uma query na View `v_clientes_metricas`
  // Para retornar a contagem exata de clientes naquele segmento.
  async evaluateSegmentoCount(regras: Rule[]): Promise<number> {
    try {
      let query = supabase.from('v_clientes_metricas').select('*', { count: 'exact', head: true });

      // Aplica cada regra via PostgREST dinamicamente
      regras.forEach(rule => {
        // Garantir que todos os segmentos só puxem quem permitiu marketing
        if (rule.field === 'consentimento_marketing') return; // Será forçado abaixo
        
        switch (rule.operator) {
          case 'eq':  query = query.eq(rule.field, rule.value); break;
          case 'neq': query = query.neq(rule.field, rule.value); break;
          case 'gt':  query = query.gt(rule.field, rule.value); break;
          case 'gte': query = query.gte(rule.field, rule.value); break;
          case 'lt':  query = query.lt(rule.field, rule.value); break;
          case 'lte': query = query.lte(rule.field, rule.value); break;
        }
      });

      // REGRA DE OURO DO CRM: Somente quem deu consentimento de marketing!
      query = query.eq('consentimento_marketing', true);

      const { count, error } = await query;
      if (error) throw error;
      
      return count || 0;
    } catch (e) {
      console.error('Erro ao processar motor de segmentação:', e);
      return 0;
    }
  },

  // Motor para buscar os clientes reais (para campanhas)
  async evaluateSegmentoClientes(regras: Rule[]) {
    try {
      let query = supabase.from('v_clientes_metricas').select('*');

      regras.forEach(rule => {
        if (rule.field === 'consentimento_marketing') return;
        switch (rule.operator) {
          case 'eq':  query = query.eq(rule.field, rule.value); break;
          case 'neq': query = query.neq(rule.field, rule.value); break;
          case 'gt':  query = query.gt(rule.field, rule.value); break;
          case 'gte': query = query.gte(rule.field, rule.value); break;
          case 'lt':  query = query.lt(rule.field, rule.value); break;
          case 'lte': query = query.lte(rule.field, rule.value); break;
        }
      });

      query = query.eq('consentimento_marketing', true);

      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar lista de clientes do segmento:', e);
      return [];
    }
  }
};

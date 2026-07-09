import { supabase } from '../supabase';
import { subDays, subMonths, startOfDay, endOfDay, format } from 'date-fns';

export interface CrmCliente {
  id: string;
  nome: string;
  whatsapp: string;
  data_nascimento?: string;
  lis_score?: number;
}

export interface CrmVenda {
  id: string;
  data_venda: string;
  cliente_id: string;
  valor_bruto: number;
  status: string;
  cliente?: CrmCliente;
}

export const crmService = {
  /**
   * Busca clientes que fazem aniversário no mês atual.
   * Utiliza o filtro text 'like' para pegar o mês na string ISO (YYYY-MM-DD).
   */
  async buscarAniversariantesMes(): Promise<CrmCliente[]> {
    const currentMonth = format(new Date(), 'MM');
    
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .like('data_nascimento', `%-${currentMonth}-%`)
      .order('nome');

    if (error) {
      console.error('Erro ao buscar aniversariantes:', error);
      throw error;
    }

    return data as CrmCliente[];
  },

  /**
   * Busca vendas realizadas há exatos X dias (padrão 7) para acompanhamento de adaptação.
   */
  async buscarPosVendaRecente(dias: number = 7): Promise<CrmVenda[]> {
    const targetDate = subDays(new Date(), dias);
    const start = startOfDay(targetDate).toISOString();
    const end = endOfDay(targetDate).toISOString();

    const { data, error } = await supabase
      .from('vendas')
      .select(`
        *,
        cliente:cliente_id ( id, nome, whatsapp )
      `)
      .gte('data_venda', start)
      .lte('data_venda', end)
      .eq('status', 'CONCLUIDA');

    if (error) {
      console.error('Erro ao buscar pós-venda recente:', error);
      throw error;
    }

    // Filtra vendas que tenham cliente vinculado
    return (data as any[]).filter(v => v.cliente) as CrmVenda[];
  },

  /**
   * Busca vendas realizadas há exatos X meses (padrão 11 meses) para renovação de receita.
   */
  async buscarReceitasVencendo(meses: number = 11): Promise<CrmVenda[]> {
    const targetDate = subMonths(new Date(), meses);
    const start = startOfDay(targetDate).toISOString();
    const end = endOfDay(targetDate).toISOString();

    const { data, error } = await supabase
      .from('vendas')
      .select(`
        *,
        cliente:cliente_id ( id, nome, whatsapp )
      `)
      .gte('data_venda', start)
      .lte('data_venda', end)
      .eq('status', 'CONCLUIDA');

    if (error) {
      console.error('Erro ao buscar receitas vencendo:', error);
      throw error;
    }

    return (data as any[]).filter(v => v.cliente) as CrmVenda[];
  }
};

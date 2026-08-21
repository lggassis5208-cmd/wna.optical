import { supabase } from '../supabase';
import { subDays, subMonths, startOfDay, endOfDay, format } from 'date-fns';
import { fichasMedicasService } from './fichasMedicasService';

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
   * Busca receitas cuja data real de validade_receita está vencendo (Ótica Lìs CRM).
   * Alimenta o gatilho "Renovação de Receita" do Robô de Pós-Venda.
   */
  async buscarReceitasVencendo(diasParaVencer: number = 30): Promise<any[]> {
    try {
      // 1. Tentar buscar por validade_receita real das fichas médicas finalizadas
      const fichasVencendo = await fichasMedicasService.buscarReceitasVencendoReais(diasParaVencer);
      if (fichasVencendo && fichasVencendo.length > 0) {
        return fichasVencendo.map(f => ({
          id: f.id,
          cliente_id: f.cliente_id,
          data_venda: f.data_exame,
          validade_receita: f.validade_receita,
          valor_bruto: 0,
          status: 'CONCLUIDA',
          cliente: f.cliente || { id: f.cliente_id, nome: f.nome, whatsapp: f.telefone }
        }));
      }
    } catch (e) {
      console.warn('Erro ao buscar fichas médicas vencendo, usando aproximação de vendas legadas:', e);
    }

    // 2. Fallback para estimativa legada de 11 meses baseada em vendas
    const targetDate = subMonths(new Date(), 11);
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
      return [];
    }

    return (data as any[]).filter(v => v.cliente) as CrmVenda[];
  },

  /**
   * Puxa a fila atual do novo Motor de Pós-Venda Automático.
   */
  async buscarEnviosPosVenda() {
    const { data, error } = await supabase
      .from('pos_venda_envios')
      .select(`
        id,
        marco_dia,
        status,
        agendado_para,
        enviado_em,
        erro_log,
        clientes ( nome, whatsapp )
      `)
      .order('agendado_para', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Erro ao buscar envios de pós-venda:', error);
      throw error;
    }

    return data;
  }
};

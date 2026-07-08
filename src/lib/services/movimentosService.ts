import { supabase } from '../supabase';

export interface MovimentoCaixaInput {
  caixa_id: string;
  tipo: 'SANGRIA' | 'SUPRIMENTO' | 'DESPESA';
  descricao: string;
  valor: number;
  usuario_id: string;
  categoria_id?: string | null;
  forma_pagamento: string;
}

export const movimentosService = {
  async registrarMovimento(movimento: MovimentoCaixaInput) {
    const { data, error } = await supabase
      .from('movimentos_caixa')
      .insert([movimento])
      .select()
      .single();

    if (error) {
      console.error('Erro ao registrar movimento de caixa:', error);
      throw error;
    }

    return data;
  },

  async buscarMovimentosPorCaixa(caixaId: string) {
    const { data, error } = await supabase
      .from('movimentos_caixa')
      .select(`
        *,
        categorias (nome)
      `)
      .eq('caixa_id', caixaId)
      .order('data_movimento', { ascending: false });

    if (error) {
      console.error('Erro ao buscar movimentos por caixa:', error);
      throw error;
    }

    return data;
  }
};

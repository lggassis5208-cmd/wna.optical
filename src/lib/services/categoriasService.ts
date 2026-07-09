import { supabase } from '../supabase';

export interface Categoria {
  id: string;
  nome: string;
  tipo: 'PRODUTO' | 'DESPESA' | 'RECEITA';
  ativo: boolean;
}

export const categoriasService = {
  async buscarCategorias(tipo?: 'PRODUTO' | 'DESPESA' | 'RECEITA'): Promise<Categoria[]> {
    let query = supabase.from('categorias').select('*').eq('ativo', true).order('nome');
    if (tipo) {
      query = query.eq('tipo', tipo);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Erro ao buscar categorias:', error);
      throw error;
    }
    return data as Categoria[];
  },

  async criarCategoria(nome: string, tipo: 'PRODUTO' | 'DESPESA' | 'RECEITA'): Promise<Categoria> {
    const { data, error } = await supabase
      .from('categorias')
      .insert([{ nome, tipo, ativo: true }])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar categoria:', error);
      throw error;
    }
    return data as Categoria;
  }
};

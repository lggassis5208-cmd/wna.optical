import { supabase } from '../supabase';

export interface PagamentoVenda {
  id?: string;
  forma_pagamento: string;
  valor: number;
}

export interface ItemVenda {
  id?: string;
  categoria_id: string;
  produto_id?: string | null;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export interface VendaInput {
  os_number?: string;
  caixa_id: string;
  cliente_id?: string | null;
  usuario_id: string;
  valor_bruto: number;
  desconto: number;
  valor_liquido: number;
  metadata?: any;
  itens: ItemVenda[];
  pagamentos: PagamentoVenda[];
}

export const vendasService = {
  async salvarVenda(vendaInput: VendaInput) {
    // Iniciar a transação através de uma function RPC seria ideal, mas como não temos uma garantida,
    // faremos as inserções sequenciais ou adaptaremos dependendo da API.
    // Para simplificar, faremos inserções múltiplas:
    
    // 1. Inserir a Venda
    const { data: vendaData, error: vendaError } = await supabase
      .from('vendas')
      .insert([{
        os_number: vendaInput.os_number,
        caixa_id: vendaInput.caixa_id,
        cliente_id: vendaInput.cliente_id,
        usuario_id: vendaInput.usuario_id,
        valor_bruto: vendaInput.valor_bruto,
        desconto: vendaInput.desconto,
        valor_liquido: vendaInput.valor_liquido,
        metadata: vendaInput.metadata,
        status: 'CONCLUIDA'
      }])
      .select()
      .single();

    if (vendaError) {
      console.error('Erro ao inserir venda:', vendaError);
      throw vendaError;
    }

    const vendaId = vendaData.id;

    // 2. Inserir os Itens
    const itensParaInserir = vendaInput.itens.map(item => ({
      venda_id: vendaId,
      categoria_id: item.categoria_id,
      produto_id: item.produto_id,
      descricao: item.descricao,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      valor_total: item.valor_total
    }));

    const { error: itensError } = await supabase
      .from('itens_venda')
      .insert(itensParaInserir);

    if (itensError) {
      console.error('Erro ao inserir itens da venda:', itensError);
      throw itensError;
    }

    // 3. Inserir os Pagamentos e Movimentos de Caixa
    const pagamentosParaInserir = vendaInput.pagamentos.map(pagamento => ({
      venda_id: vendaId,
      forma_pagamento: pagamento.forma_pagamento,
      valor: pagamento.valor
    }));

    const { error: pagamentosError } = await supabase
      .from('pagamentos_venda')
      .insert(pagamentosParaInserir);

    if (pagamentosError) {
      console.error('Erro ao inserir pagamentos da venda:', pagamentosError);
      throw pagamentosError;
    }

    // Registrar no fluxo de caixa
    for (const pagamento of vendaInput.pagamentos) {
      await supabase.from('movimentos_caixa').insert([{
        caixa_id: vendaInput.caixa_id,
        tipo: 'ENTRADA',
        descricao: `Venda OS: ${vendaInput.os_number || 'S/N'}`,
        valor: pagamento.valor,
        forma_pagamento: pagamento.forma_pagamento,
        usuario_id: vendaInput.usuario_id
      }]);
    }

    return vendaData;
  },

  async buscarCategorias() {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error('Erro ao buscar categorias:', error);
      throw error;
    }

    return data;
  },

  async buscarVendasPorCaixa(caixaId: string) {
    const { data, error } = await supabase
      .from('vendas')
      .select(`
        *,
        itens_venda (*),
        pagamentos_venda (*)
      `)
      .eq('caixa_id', caixaId)
      .order('data_venda', { ascending: false });

    if (error) {
      console.error('Erro ao buscar vendas por caixa:', error);
      throw error;
    }

    return data;
  }
};

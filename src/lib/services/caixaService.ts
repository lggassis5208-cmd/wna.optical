import { supabase } from '../supabase';
import { differenceInHours } from 'date-fns';

export interface Caixa {
  id: string;
  data_abertura: string;
  data_fechamento: string | null;
  usuario_abertura_id: string;
  usuario_fechamento_id: string | null;
  valor_inicial: number;
  valor_informado_fechamento: number | null;
  saldo_esperado: number | null;
  diferenca: number | null;
  status: 'ABERTO' | 'FECHADO';
}

export const caixaService = {
  async buscarCaixaAtivo(): Promise<Caixa | null> {
    const { data, error } = await supabase
      .from('caixas')
      .select('*')
      .eq('status', 'ABERTO')
      .order('data_abertura', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is no rows returned
      console.error('Erro ao buscar caixa ativo:', error);
      throw error;
    }

    return data as Caixa | null;
  },

  async abrirCaixa(valorInicial: number, usuarioId: string): Promise<Caixa> {
    const caixaAtivo = await this.buscarCaixaAtivo();
    if (caixaAtivo) {
      throw new Error('Já existe um caixa aberto.');
    }

    const { data, error } = await supabase
      .from('caixas')
      .insert([{
        valor_inicial: valorInicial,
        usuario_abertura_id: usuarioId,
        status: 'ABERTO'
      }])
      .select()
      .single();

    if (error) {
      console.error('Erro ao abrir caixa:', error);
      throw error;
    }

    return data as Caixa;
  },

  async fecharCaixa(caixaId: string, valorInformado: number, saldoEsperado: number, usuarioId: string): Promise<Caixa> {
    const diferenca = valorInformado - saldoEsperado;

    const { data, error } = await supabase
      .from('caixas')
      .update({
        data_fechamento: new Date().toISOString(),
        usuario_fechamento_id: usuarioId,
        valor_informado_fechamento: valorInformado,
        saldo_esperado: saldoEsperado,
        diferenca: diferenca,
        status: 'FECHADO'
      })
      .eq('id', caixaId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao fechar caixa:', error);
      throw error;
    }

    return data as Caixa;
  },

  async checarAlerta24h(): Promise<boolean> {
    const caixaAtivo = await this.buscarCaixaAtivo();
    if (!caixaAtivo) return false;

    const horasAberto = differenceInHours(new Date(), new Date(caixaAtivo.data_abertura));
    return horasAberto >= 24;
  },

  async buscarHistoricoCaixas(dataInicio?: string, dataFim?: string): Promise<Caixa[]> {
    let query = supabase.from('caixas').select('*').order('data_abertura', { ascending: false });
    
    if (dataInicio) {
        query = query.gte('data_abertura', dataInicio);
    }
    if (dataFim) {
        query = query.lte('data_abertura', dataFim);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar histórico de caixas:', error);
      throw error;
    }

    return data as Caixa[];
  }
};

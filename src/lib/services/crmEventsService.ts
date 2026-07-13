import { supabase } from '../supabase';

export interface CrmEvent {
  id?: string;
  cliente_id: string;
  tipo_evento: 'compra' | 'campanha_enviada' | 'lembrete_enviado' | 'nps_respondido' | 'ponto_fidelidade';
  payload?: any;
  criado_em?: string;
}

export const crmEventsService = {
  async getEventsByClient(clientId: string) {
    try {
      const { data, error } = await supabase
        .from('eventos_relacionamento')
        .select('*')
        .eq('cliente_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar eventos do cliente', e);
      return [];
    }
  },

  async registerEvent(event: CrmEvent) {
    try {
      const { data, error } = await supabase
        .from('eventos_relacionamento')
        .insert([event])
        .select();

      if (error) throw error;
      return data?.[0] || null;
    } catch (e) {
      console.error('Erro ao registrar evento de CRM', e);
      return null;
    }
  }
};

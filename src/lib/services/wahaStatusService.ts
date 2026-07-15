import { supabase } from '../supabase';

export interface WahaStatus {
  id?: string;
  tenant_id: string;
  sessao: string;
  estado: 'WORKING' | 'SCAN_QR_CODE' | 'STOPPED' | 'FAILED' | 'desconhecido' | string;
  checado_em: string;
  detalhe?: string;
  ultimo_alerta_em?: string;
}

export const wahaStatusService = {
  /**
   * Busca o status mais recente do motor do WhatsApp (WAHA) para a loja/tenant atual.
   */
  async getLatestStatus(): Promise<WahaStatus | null> {
    try {
      const { data, error } = await supabase
        .from('waha_status')
        .select('*')
        .order('checado_em', { ascending: false })
        .limit(1);

      if (error) {
        // Se a tabela ainda não foi criada no banco local ou der erro de RLS
        console.warn('Não foi possível carregar waha_status do Supabase:', error.message);
        return null;
      }

      return data?.[0] || null;
    } catch (err: any) {
      console.error('Erro de conexão ao buscar waha_status:', err.message);
      return null;
    }
  }
};

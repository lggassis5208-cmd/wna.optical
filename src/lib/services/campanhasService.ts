import { supabase } from '../supabase';
import { segmentosService } from './segmentosService';

export interface Campanha {
  id?: string;
  tenant_id?: string;
  segmento_id: string;
  nome: string;
  canal: 'whatsapp' | 'email';
  template_mensagem: string;
  status?: 'rascunho' | 'agendada' | 'processando' | 'concluida' | 'pausada' | 'cancelada';
  criado_em?: string;
  atualizado_em?: string;
  // Relacionamentos para a UI
  segmentos?: { nome: string };
  disparos?: { total: number; enviados: number; falhas: number; pendentes: number };
}

export const campanhasService = {
  // 1. Lista de campanhas (com métricas)
  async getCampanhas() {
    try {
      const { data, error } = await supabase
        .from('campanhas')
        .select(`
          *,
          segmentos (nome)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Busca estatísticas da fila para cada campanha (Idealmente via Edge Function ou RPC, mas fazemos em lotes aqui para Fase 2)
      const campanhasComMetricas = await Promise.all((data || []).map(async (campanha) => {
        const { data: stats } = await supabase
          .rpc('get_campanha_stats', { p_campanha_id: campanha.id })
          .single();
          
        // Se a RPC não existir ainda, faremos fallback para count manual no banco
        if (!stats) {
            const res = await supabase.from('campanha_disparos').select('status', { count: 'exact' }).eq('campanha_id', campanha.id);
            const total = res.data?.length || 0;
            const enviados = res.data?.filter(d => d.status === 'enviado').length || 0;
            const falhas = res.data?.filter(d => d.status === 'falha').length || 0;
            const pendentes = res.data?.filter(d => d.status === 'pendente').length || 0;
            return { ...campanha, disparos: { total, enviados, falhas, pendentes } };
        }
        
        return { ...campanha, disparos: stats };
      }));

      return campanhasComMetricas as Campanha[];
    } catch (e) {
      console.error('Erro ao buscar campanhas:', e);
      return [];
    }
  },

  // 2. Criar e enfileirar a Campanha
  async agendarCampanha(campanha: Omit<Campanha, 'id'>, regrasSegmento: any[]) {
    try {
      // 2.1 Salvar a Campanha
      const { data: campData, error: campError } = await supabase
        .from('campanhas')
        .insert([{ ...campanha, status: 'processando' }])
        .select()
        .single();

      if (campError) throw campError;
      const campanhaId = campData.id;

      // 2.2 Avaliar Segmento (Puxar IDs dos Clientes)
      const clientes = await segmentosService.evaluateSegmentoClientes(regrasSegmento);
      
      if (!clientes || clientes.length === 0) {
        // Campanha vazia
        await supabase.from('campanhas').update({ status: 'concluida' }).eq('id', campanhaId);
        return campData;
      }

      // 2.3 Criar a fila de disparos (Queue)
      const disparos = clientes.map(cliente => ({
        campanha_id: campanhaId,
        cliente_id: cliente.cliente_id || cliente.id,
        status: 'pendente'
      }));

      // Inserção em lotes de 1000 para alta performance
      const chunkSize = 1000;
      for (let i = 0; i < disparos.length; i += chunkSize) {
        const chunk = disparos.slice(i, i + chunkSize);
        const { error: insertError } = await supabase.from('campanha_disparos').insert(chunk);
        if (insertError) throw insertError;
      }

      return campData;
    } catch (e) {
      console.error('Erro ao agendar campanha:', e);
      throw e;
    }
  },

  // 3. Worker Simulado (Isto no futuro viverá em uma Vercel Edge Function ou Cron Job)
  // Esse método puxa X pendentes e simula o envio do WhatsApp
  async simularDisparoLote(batchSize = 10) {
    try {
      // Pega N disparos pendentes (FIFO)
      const { data: fila, error: filaError } = await supabase
        .from('campanha_disparos')
        .select('*, campanhas(template_mensagem), clientes(nome, whatsapp)')
        .eq('status', 'pendente')
        .order('data_agendamento', { ascending: true })
        .limit(batchSize);

      if (filaError || !fila || fila.length === 0) return 0;

      for (const disparo of fila) {
        const template = disparo.campanhas?.template_mensagem || '';
        const clienteNome = disparo.clientes?.nome || 'Cliente';
        const clienteWhatsapp = disparo.clientes?.whatsapp;

        // Processa as variáveis
        let textoFinal = template.replace(/\{\{nome\}\}/g, clienteNome.split(' ')[0]);

        if (!clienteWhatsapp) {
           await supabase.from('campanha_disparos').update({ 
               status: 'falha', erro_log: 'WhatsApp não cadastrado' 
           }).eq('id', disparo.id);
           continue;
        }

        // SIMULAÇÃO DE ENVIO API META / WAHA
        console.log(`[Worker] Enviando WhatsApp para ${clienteNome} (${clienteWhatsapp}):`, textoFinal);
        
        // Simula latência de rede
        await new Promise(r => setTimeout(r, 500));

        // Marca como sucesso
        await supabase.from('campanha_disparos').update({ 
            status: 'enviado', 
            mensagem_processada: textoFinal,
            data_envio: new Date().toISOString()
        }).eq('id', disparo.id);
      }

      // Atualiza campanhas concluídas
      // Se a campanha não tem mais pendentes nem processando, muda status
      
      return fila.length;
    } catch (e) {
      console.error('Erro no worker de disparo:', e);
      return 0;
    }
  }
};

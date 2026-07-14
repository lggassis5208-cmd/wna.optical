import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { event, payload } = req.body;

    // Ignora eventos que não sejam de mensagem ou mensagens enviadas por nós
    if (event !== 'message' && event !== 'message.waiting' && event !== 'message.received') {
      return res.status(200).json({ status: 'ignored_event' });
    }

    if (!payload || payload.fromMe === true) {
      return res.status(200).json({ status: 'ignored_sent_message' });
    }

    const fromPhone = payload.from; // formato: 55DDDNUM@c.us ou similar
    const messageBody = (payload.body || '').trim();

    // 1. Normalizar telefone no padrão WAHA: 55DDDNUM@c.us
    let cleanedPhone = fromPhone.replace(/\D/g, '');
    if (!cleanedPhone.startsWith('55')) {
      cleanedPhone = '55' + cleanedPhone;
    }
    const wahaPhone = cleanedPhone + '@c.us';

    // 2. Descobrir qual tenant (loja) está ativa
    // Como a requisição vem de fora (do WAHA webhook), não temos a claim JWT.
    // Buscaremos o primeiro tenant ativo como tenant padrão da requisição
    const { data: tenantData } = await supabase.from('tenants').select('id').order('criado_em', { ascending: true }).limit(1);
    const tenantId = tenantData?.[0]?.id || '00000000-0000-0000-0000-000000000000';

    // 3. Caso especial: Comando "PARE" (Descadastro LGPD)
    if (messageBody.toUpperCase() === 'PARE') {
      // Adiciona na lista de supressão
      await supabase.from('lista_supressao').insert([{
        tenant_id: tenantId,
        whatsapp: wahaPhone,
        motivo: 'Descadastro voluntário (PARE)'
      }]);

      // Desativa opt-in em leads
      await supabase.from('leads')
        .update({ opt_in: false, atualizado_em: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('telefone', wahaPhone);

      // Desativa consentimento em clientes
      await supabase.from('clientes')
        .update({ consentimento_marketing: false })
        .eq('tenant_id', tenantId)
        .eq('whatsapp', wahaPhone);

      return res.status(200).json({ status: 'unsubscribed', phone: wahaPhone });
    }

    // 4. Verificar se já é cliente (Se já for cliente, ignorar captação)
    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('whatsapp', wahaPhone)
      .limit(1);

    if (clienteExistente && clienteExistente.length > 0) {
      return res.status(200).json({ status: 'ignored_existing_client' });
    }

    // 5. Verificar se já é lead
    const { data: leadExistente } = await supabase
      .from('leads')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('telefone', wahaPhone)
      .limit(1);

    if (leadExistente && leadExistente.length > 0) {
      const lead = leadExistente[0];

      // Se o lead estava em "novo", movemos para "contatado"
      let novoEstagio = lead.estagio;
      let mudouEstagio = false;
      if (lead.estagio === 'novo') {
        novoEstagio = 'contatado';
        mudouEstagio = true;
        await supabase.from('leads').update({
          estagio: 'contatado',
          ultimo_contato_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        }).eq('id', lead.id);
      } else {
        await supabase.from('leads').update({
          ultimo_contato_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        }).eq('id', lead.id);
      }

      // Se mudou de estágio, grava evento de auditoria
      if (mudouEstagio) {
        await supabase.from('lead_eventos').insert([{
          lead_id: lead.id,
          tenant_id: tenantId,
          tipo: 'mudou_estagio',
          de_estagio: 'novo',
          para_estagio: 'contatado',
          conteudo: 'Lead respondeu a mensagem e avançou de estágio automaticamente.',
          em: new Date().toISOString()
        }]);
      }

      // Grava a mensagem recebida na timeline
      await supabase.from('lead_eventos').insert([{
        lead_id: lead.id,
        tenant_id: tenantId,
        tipo: 'mensagem_recebida',
        conteudo: messageBody,
        em: new Date().toISOString()
      }]);

      return res.status(200).json({ status: 'updated_lead', lead_id: lead.id });
    } else {
      // 6. Criar lead automaticamente
      const { data: novoLead, error: createLeadErr } = await supabase
        .from('leads')
        .insert([{
          tenant_id: tenantId,
          nome: `Lead WhatsApp (${cleanedPhone.slice(-8)})`,
          telefone: wahaPhone,
          origem: 'whatsapp',
          estagio: 'novo',
          opt_in: true,
          consentimento_em: new Date().toISOString(),
          ultimo_contato_em: new Date().toISOString()
        }])
        .select()
        .single();

      if (createLeadErr || !novoLead) {
        throw new Error(createLeadErr?.message || 'Erro ao criar novo lead');
      }

      // Registra evento de criação
      await supabase.from('lead_eventos').insert([{
        lead_id: novoLead.id,
        tenant_id: tenantId,
        tipo: 'criado',
        conteudo: 'Lead capturado automaticamente via mensagem de WhatsApp.',
        em: new Date().toISOString()
      }]);

      // Registra a mensagem recebida
      await supabase.from('lead_eventos').insert([{
        lead_id: novoLead.id,
        tenant_id: tenantId,
        tipo: 'mensagem_recebida',
        conteudo: messageBody,
        em: new Date().toISOString()
      }]);

      return res.status(200).json({ status: 'created_lead', lead_id: novoLead.id });
    }
  } catch (e: any) {
    console.error('Erro no webhook do WAHA:', e);
    return res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
}

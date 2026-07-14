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
    const normalizedBody = messageBody.toUpperCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").trim();

    // 1. Normalizar telefone no padrão WAHA: 55DDDNUM@c.us
    let cleanedPhone = fromPhone.replace(/\D/g, '');
    if (!cleanedPhone.startsWith('55')) {
      cleanedPhone = '55' + cleanedPhone;
    }
    const wahaPhone = cleanedPhone + '@c.us';

    // 2. Descobrir qual tenant (loja) está ativa
    const { data: tenantData } = await supabase.from('tenants').select('id').order('criado_em', { ascending: true }).limit(1);
    const tenantId = tenantData?.[0]?.id || '00000000-0000-0000-0000-000000000000';

    // 3. Caso especial: Comando "PARE" (Revogação LGPD)
    if (normalizedBody === 'PARE') {
      // Adiciona na lista de supressão global
      await supabase.from('lista_supressao').insert([{
        tenant_id: tenantId,
        whatsapp: wahaPhone,
        motivo: 'Descadastro voluntário (PARE)'
      }]);

      // Busca o cliente/lead correspondente na base unificada
      const { data: cliente } = await supabase
        .from('clientes')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('whatsapp', cleanedPhone.replace('55', '')) // Busca sem o prefixo 55 se o banco armazenar cru, ou completo
        .or(`whatsapp.eq.${cleanedPhone},whatsapp.eq.${cleanedPhone.replace('55', '')}`)
        .limit(1);

      if (cliente && cliente.length > 0) {
        const cliId = cliente[0].id;

        // Atualiza a tabela clientes (opt-out e status CRM)
        await supabase.from('clientes')
          .update({
            opt_in_marketing: false,
            consentimento_marketing: false,
            status_crm: 'suprimido',
            base_legal: 'legitimo_interesse',
            canal_consentimento: 'whatsapp_optout',
            termo_versao: 'termo_v1.2',
            consentimento_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
          })
          .eq('id', cliId);

        // Insere no histórico append-only
        await supabase.from('consentimento_historico').insert([{
          cliente_id: cliId,
          tenant_id: tenantId,
          evento: 'revogado',
          base_legal: 'legitimo_interesse',
          canal: 'whatsapp_optout',
          termo_versao: 'termo_v1.2',
          em: new Date().toISOString()
        }]);

        // Registra o evento na timeline (lead_eventos)
        await supabase.from('lead_eventos').insert([{
          lead_id: cliId,
          tenant_id: tenantId,
          tipo: 'nota',
          conteudo: 'Cliente solicitou revogação via WhatsApp (PARE). Número adicionado à lista de supressão global.',
          em: new Date().toISOString()
        }]);
      }

      return res.status(200).json({ status: 'unsubscribed', phone: wahaPhone });
    }

    // 4. Caso especial: Reconfirmação "SIM" / "ACEITO" (Opt-in Digital)
    if (['SIM', 'ACEITO', 'ACEITAR', 'CONFIRMO', 'CONFIRMAR'].includes(normalizedBody)) {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('id')
        .eq('tenant_id', tenantId)
        .or(`whatsapp.eq.${cleanedPhone},whatsapp.eq.${cleanedPhone.replace('55', '')}`)
        .limit(1);

      if (cliente && cliente.length > 0) {
        const cli = cliente[0];
        
        // Atualiza consentimento do cliente no banco
        await supabase.from('clientes')
          .update({
            opt_in_marketing: true,
            consentimento_marketing: true,
            base_legal: 'consentimento',
            canal_consentimento: 'whatsapp_optin',
            consentimento_em: new Date().toISOString(),
            termo_versao: 'termo_v1.2',
            status_crm: 'ativo',
            atualizado_em: new Date().toISOString()
          })
          .eq('id', cli.id);

        // Grava no histórico de consentimento
        await supabase.from('consentimento_historico').insert([{
          cliente_id: cli.id,
          tenant_id: tenantId,
          evento: 'reconfirmado',
          base_legal: 'consentimento',
          canal: 'whatsapp_optin',
          termo_versao: 'termo_v1.2',
          em: new Date().toISOString()
        }]);

        // Grava o evento na timeline
        await supabase.from('lead_eventos').insert([{
          lead_id: cli.id,
          tenant_id: tenantId,
          tipo: 'nota',
          conteudo: 'Cliente concedeu consentimento de marketing via WhatsApp (SIM). Base legal alterada para Consentimento.',
          em: new Date().toISOString()
        }]);

        return res.status(200).json({ status: 'optin_confirmed', phone: wahaPhone });
      }
    }

    // 5. Verificar existência na base unificada de clientes
    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(`whatsapp.eq.${cleanedPhone},whatsapp.eq.${cleanedPhone.replace('55', '')}`)
      .limit(1);

    if (clienteExistente && clienteExistente.length > 0) {
      const cliente = clienteExistente[0];

      if (cliente.tipo === 'cliente') {
        // Se for cliente, apenas registra a mensagem na timeline de relacionamento
        await supabase.from('lead_eventos').insert([{
          lead_id: cliente.id,
          tenant_id: tenantId,
          tipo: 'mensagem_recebida',
          conteudo: messageBody,
          em: new Date().toISOString()
        }]);

        await supabase.from('clientes').update({
          ultimo_contato_em: new Date().toISOString()
        }).eq('id', cliente.id);

        return res.status(200).json({ status: 'registered_message_existing_client', client_id: cliente.id });
      } else {
        // Se for lead, registra mensagem, atualiza contato e move de novo -> contatado
        let novoEstagio = cliente.estagio || 'novo';
        let mudouEstagio = false;

        if (cliente.estagio === 'novo') {
          novoEstagio = 'contatado';
          mudouEstagio = true;
          await supabase.from('clientes').update({
            estagio: 'contatado',
            ultimo_contato_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
          }).eq('id', cliente.id);
        } else {
          await supabase.from('clientes').update({
            ultimo_contato_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
          }).eq('id', cliente.id);
        }

        if (mudouEstagio) {
          await supabase.from('lead_eventos').insert([{
            lead_id: cliente.id,
            tenant_id: tenantId,
            tipo: 'mudou_estagio',
            de_estagio: 'novo',
            para_estagio: 'contatado',
            conteudo: 'Lead respondeu a mensagem e avançou de estágio automaticamente.',
            em: new Date().toISOString()
          }]);
        }

        await supabase.from('lead_eventos').insert([{
          lead_id: cliente.id,
          tenant_id: tenantId,
          tipo: 'mensagem_recebida',
          conteudo: messageBody,
          em: new Date().toISOString()
        }]);

        return res.status(200).json({ status: 'updated_lead', lead_id: cliente.id });
      }
    } else {
      // 6. Criar lead automaticamente na tabela clientes
      const rawPhone = cleanedPhone.replace('55', ''); // Salva formato limpo
      
      const { data: novoLead, error: createLeadErr } = await supabase
        .from('clientes')
        .insert([{
          tenant_id: tenantId,
          nome_completo: `Lead WhatsApp (${cleanedPhone.slice(-8)})`,
          whatsapp: rawPhone,
          tipo: 'lead',
          status_crm: 'ativo',
          origem: 'whatsapp',
          estagio: 'novo',
          opt_in_marketing: false, // Inicia sem opt-in ativo de marketing
          base_legal: 'legitimo_interesse', -- permite apenas resposta inicial
          canal_consentimento: 'cadastro_loja',
          termo_versao: 'termo_v1.2',
          consentimento_em: new Date().toISOString(),
          ultimo_contato_em: new Date().toISOString()
        }])
        .select()
        .single();

      if (createLeadErr || !novoLead) {
        throw new Error(createLeadErr?.message || 'Erro ao criar novo lead na base unificada');
      }

      // Registra evento de criação na timeline
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

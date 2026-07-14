import { createClient } from '@supabase/supabase-js';

// Inicialização do Supabase Server-Side
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltam variáveis de ambiente do Supabase (URL ou Service Role Key).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const WAHA_URL = process.env.WAHA_URL || 'http://localhost:3000';
const WAHA_SESSION = process.env.WAHA_SESSION || 'default';
const WAHA_API_KEY = process.env.WAHA_API_KEY || '';

// Funções Auxiliares
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const formatPhoneWAHA = (phone: string) => {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  return cleaned + '@c.us';
};

const sendWahaMessage = async (chatId: string, text: string) => {
  const headers: any = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (WAHA_API_KEY) {
    headers['X-Api-Key'] = WAHA_API_KEY;
  }

  const response = await fetch(`${WAHA_URL}/api/sendText`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      session: WAHA_SESSION,
      chatId,
      text
    })
  });

  if (!response.ok) {
    throw new Error(`WAHA HTTP Error: ${response.status} - ${await response.text()}`);
  }
  return response.json();
};

const checkBusinessHours = (config: any) => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTotalMins = hours * 60 + minutes;

  // Se dias úteis for verdadeiro e for Fim de semana (0 = Dom, 6 = Sáb)
  if (config.dias_uteis && (now.getDay() === 0 || now.getDay() === 6)) {
    return false;
  }

  if (config.horario_inicio && config.horario_fim) {
    const [startH, startM] = config.horario_inicio.split(':').map(Number);
    const [endH, endM] = config.horario_fim.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    if (currentTotalMins < startMins || currentTotalMins > endMins) {
      return false;
    }
  }

  return true;
};

async function agendarFollowUpLeadsFrios() {
  console.log('[Follow-Up Leads] Verificando leads frios...');
  try {
    const { data: configs, error: configError } = await supabase
      .from('leads_config')
      .select('*')
      .eq('motor_pausado', false);

    if (configError || !configs) {
      console.error('[Follow-Up Leads] Erro ao carregar configurações de leads:', configError);
      return;
    }

    for (const config of configs) {
      const diasFrio = config.dias_frio || 3;
      const dataLimite = new Date(Date.now() - diasFrio * 24 * 60 * 60 * 1000).toISOString();

      // Busca leads sem contato há X dias em estágios ativos
      const { data: leadsFrios } = await supabase
        .from('leads')
        .select('id, estagio, tenant_id')
        .eq('tenant_id', config.tenant_id)
        .in('estagio', ['novo', 'contatado', 'exame_agendado'])
        .lt('ultimo_contato_em', dataLimite);

      if (!leadsFrios || leadsFrios.length === 0) continue;

      for (const lead of leadsFrios) {
        // Verifica se já existe um envio pendente na fila para este lead
        const { data: existente } = await supabase
          .from('pos_venda_envios')
          .select('id')
          .eq('lead_id', lead.id)
          .eq('status', 'pendente')
          .limit(1);

        if (existente && existente.length > 0) continue;

        // Agenda o follow-up
        await supabase.from('pos_venda_envios').insert([{
          tenant_id: lead.tenant_id,
          lead_id: lead.id,
          status: 'pendente',
          agendado_para: new Date().toISOString(),
          tipo_gatilho: 'follow_up_lead_frio',
          ciclo_referencia: `follow_up_${lead.estagio}_${new Date().toISOString().split('T')[0]}`
        }]);

        console.log(`[Follow-Up Leads] Follow-up agendado para o lead frio ${lead.id} no estágio ${lead.estagio}`);
      }
    }
  } catch (err) {
    console.error('[Follow-Up Leads] Erro ao rodar rotina de leads frios:', err);
  }
}

async function processarExamesVencidos() {
  console.log('[Follow-Up Leads] Verificando exames agendados vencidos...');
  try {
    const hoje = new Date().toISOString().split('T')[0];

    // Busca agendamentos de vista no status "AGENDADO" cuja data passou e são associados a um lead
    const { data: examesVencidos, error: examError } = await supabase
      .from('agendamentos')
      .select('id, data, lead_id, leads(id, estagio, tenant_id)')
      .eq('status', 'AGENDADO')
      .lt('data', hoje);

    if (examError || !examesVencidos) {
      console.error('[Follow-Up Leads] Erro ao buscar exames vencidos:', examError);
      return;
    }

    for (const ag of examesVencidos) {
      const lead = ag.leads as any;
      if (lead && lead.estagio === 'exame_agendado') {
        // 1. Atualiza status do agendamento
        await supabase.from('agendamentos').update({ status: 'NAO_COMPARECEU' }).eq('id', ag.id);

        // 2. Retorna o lead para contatado (fila de follow-up de não-apareceu)
        await supabase.from('leads').update({
          estagio: 'contatado',
          ultimo_contato_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        }).eq('id', lead.id);

        // 3. Grava o evento na timeline
        await supabase.from('lead_eventos').insert([{
          lead_id: lead.id,
          tenant_id: lead.tenant_id,
          tipo: 'mudou_estagio',
          de_estagio: 'exame_agendado',
          para_estagio: 'contatado',
          conteudo: 'Exame de vista vencido. Lead não compareceu. Retornado para contatado para nova abordagem de follow-up.',
          em: new Date().toISOString()
        }]);

        console.log(`[Follow-Up Leads] Lead ${lead.id} não compareceu ao exame. Movido de volta para contatado.`);
      }
    }
  } catch (err) {
    console.error('[Follow-Up Leads] Erro ao rodar rotina de exames vencidos:', err);
  }
}

// MOTOR PRINCIPAL
export async function processPosVendaQueue() {
  console.log(`[Pós-Venda] Iniciando processamento da fila... (${new Date().toISOString()})`);

  try {
    // Processamento de regras de Leads
    await processarExamesVencidos();
    await agendarFollowUpLeadsFrios();
    // 1. Puxar Configurações Ativas das Lojas
    const { data: configs, error: configError } = await supabase
      .from('pos_venda_config')
      .select('*')
      .eq('motor_pausado', false);

    if (configError || !configs) {
      console.error('Erro ao puxar configurações:', configError);
      return;
    }

    for (const config of configs) {
      // 2. Verificar horário comercial da loja
      if (!checkBusinessHours(config)) {
        console.log(`[Pós-Venda] Loja ${config.tenant_id} fora do horário comercial. Ignorando.`);
        continue;
      }

      // 3. Verificar cota diária
      // Puxa quantos envios já foram feitos hoje para este tenant
      const today = new Date().toISOString().split('T')[0];
      const { count: dailyCount } = await supabase
        .from('pos_venda_envios')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', config.tenant_id)
        .eq('status', 'enviado')
        .gte('enviado_em', `${today}T00:00:00Z`);

      const currentDailyCount = dailyCount || 0;
      if (currentDailyCount >= config.teto_diario) {
        console.log(`[Pós-Venda] Teto diário de ${config.teto_diario} alcançado para loja ${config.tenant_id}.`);
        continue;
      }

      const availableSlots = config.teto_diario - currentDailyCount;

      // 4. Puxar fila pendente agendada para hoje ou antes
      const { data: pendentes, error: queueError } = await supabase
        .from('pos_venda_envios')
        .select(`
          id, 
          marco_dia,
          cliente_id,
          lead_id,
          tenant_id,
          clientes (
            nome,
            whatsapp,
            consentimento_marketing
          ),
          leads (
            nome,
            telefone,
            opt_in,
            estagio
          )
        `)
        .eq('tenant_id', config.tenant_id)
        .eq('status', 'pendente')
        .lte('agendado_para', new Date().toISOString())
        .limit(availableSlots);

      if (queueError) {
        console.error('Erro ao ler a fila:', queueError);
        continue;
      }

      if (!pendentes || pendentes.length === 0) {
        continue;
      }

      console.log(`[Pós-Venda] Loja ${config.tenant_id} tem ${pendentes.length} mensagens pendentes.`);

      // 5. Processar fila
      for (const envio of pendentes) {
        const isLead = Boolean(envio.lead_id);
        const cliente = envio.clientes as any;
        const lead = envio.leads as any;

        const nome = isLead ? lead?.nome : cliente?.nome;
        const whatsapp = isLead ? lead?.telefone : cliente?.whatsapp;
        const optIn = isLead ? lead?.opt_in : cliente?.consentimento_marketing;

        if (!nome || !whatsapp) {
          await supabase.from('pos_venda_envios').update({
            status: 'falha',
            erro_log: isLead ? 'Lead sem Nome ou Telefone' : 'Cliente sem Nome ou WhatsApp'
          }).eq('id', envio.id);
          continue;
        }

        // Regra LGPD: Consentimento Negado
        if (optIn === false) {
          await supabase.from('pos_venda_envios').update({
            status: 'cancelado',
            motivo_cancelamento: 'Opt-out (Sem consentimento)'
          }).eq('id', envio.id);
          continue;
        }

        // Regra LGPD: Verificar lista de supressão global
        const { data: suprimido } = await supabase
          .from('lista_supressao')
          .select('id')
          .eq('tenant_id', envio.tenant_id)
          .eq('whatsapp', formatPhoneWAHA(whatsapp))
          .limit(1);

        if (suprimido && suprimido.length > 0) {
          await supabase.from('pos_venda_envios').update({
            status: 'cancelado',
            motivo_cancelamento: 'Opt-out (Presente na lista de supressão global)'
          }).eq('id', envio.id);
          continue;
        }

        let texto = '';
        let varIndex = 0;

        if (isLead) {
          // Puxa as configurações de templates do lead para o tenant
          const { data: leadConfig } = await supabase
            .from('leads_config')
            .select('templates')
            .eq('tenant_id', envio.tenant_id)
            .single();

          const templates = leadConfig?.templates?.[lead.estagio] || [];
          if (!templates || templates.length === 0) {
             await supabase.from('pos_venda_envios').update({
              status: 'falha',
              erro_log: `Nenhum template de lead encontrado para o estágio ${lead.estagio}`
            }).eq('id', envio.id);
            continue;
          }

          varIndex = randomInt(0, templates.length - 1);
          texto = templates[varIndex];
        } else {
          // Escolher Template Aleatório de pós-venda para variação (Anti-ban)
          const templates = config.templates[String(envio.marco_dia)];
          if (!templates || templates.length === 0) {
             await supabase.from('pos_venda_envios').update({
              status: 'falha',
              erro_log: `Nenhum template encontrado para marco ${envio.marco_dia}`
            }).eq('id', envio.id);
            continue;
          }

          varIndex = randomInt(0, templates.length - 1);
          texto = templates[varIndex];
        }
        
        // Substituir Variáveis
        texto = texto.replace(/\{\{nome\}\}/g, nome.split(' ')[0]);
        // Opt-out text
        texto += '\n\n*(Responda PARE para não receber mais mensagens)*';

        const chatId = formatPhoneWAHA(whatsapp);

        try {
          // Disparo da API WAHA
          await sendWahaMessage(chatId, texto);

          // Atualiza registro com SUCESSO
          await supabase.from('pos_venda_envios').update({
            status: 'enviado',
            enviado_em: new Date().toISOString(),
            template_usado: texto,
            variacao_index: varIndex
          }).eq('id', envio.id);

          // Se for lead, registrar o evento de mensagem enviada na timeline
          if (isLead) {
            await supabase.from('leads').update({
              ultimo_contato_em: new Date().toISOString(),
              atualizado_em: new Date().toISOString()
            }).eq('id', envio.lead_id);

            await supabase.from('lead_eventos').insert([{
              lead_id: envio.lead_id,
              tenant_id: envio.tenant_id,
              tipo: 'mensagem_enviada',
              conteudo: texto,
              em: new Date().toISOString()
            }]);
          }

          console.log(`✅ [D+${envio.marco_dia}] Enviado para ${cliente.nome} (${chatId})`);

        } catch (err: any) {
          console.error(`❌ Falha ao enviar para ${chatId}:`, err.message);
          // Atualiza registro com FALHA
          await supabase.from('pos_venda_envios').update({
            status: 'falha',
            erro_log: err.message
          }).eq('id', envio.id);
        }

        // DELAY ANTI-BAN ENTRE ENVIOS (ex: 30 a 90 segundos)
        const waitTime = randomInt(config.min_delay_s, config.max_delay_s) * 1000;
        console.log(`[Anti-ban] Aguardando ${waitTime/1000}s até a próxima mensagem...`);
        await delay(waitTime);
      }
    }

  } catch (globalError) {
    console.error('Erro global no Worker do Pós-Venda:', globalError);
  }
}

// Se executado diretamente pelo Node.js
if (typeof require !== 'undefined' && require.main === module) {
  processPosVendaQueue().then(() => {
    console.log('[Pós-Venda] Execução concluída.');
    process.exit(0);
  });
}

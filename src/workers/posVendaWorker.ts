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

      // Busca leads (clientes com tipo = 'lead') sem contato há X dias em estágios ativos na base unificada
      const { data: leadsFrios } = await supabase
        .from('clientes')
        .select('id, estagio, tenant_id')
        .eq('tenant_id', config.tenant_id)
        .eq('tipo', 'lead')
        .in('estagio', ['novo', 'contatado', 'exame_agendado'])
        .lt('ultimo_contato_em', dataLimite);

      if (!leadsFrios || leadsFrios.length === 0) continue;

      for (const lead of leadsFrios) {
        // Verifica se já existe um envio pendente na fila para este lead (cliente_id)
        const { data: existente } = await supabase
          .from('pos_venda_envios')
          .select('id')
          .eq('cliente_id', lead.id)
          .eq('status', 'pendente')
          .limit(1);

        if (existente && existente.length > 0) continue;

        // Agenda o follow-up
        await supabase.from('pos_venda_envios').insert([{
          tenant_id: lead.tenant_id,
          cliente_id: lead.id,
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

    // Busca agendamentos de vista no status "AGENDADO" cuja data passou
    const { data: examesVencidos, error: examError } = await supabase
      .from('agendamentos')
      .select('id, data, cliente_id, clientes(id, estagio, tenant_id, tipo)')
      .eq('status', 'AGENDADO')
      .lt('data', hoje);

    if (examError || !examesVencidos) {
      console.error('[Follow-Up Leads] Erro ao buscar exames vencidos:', examError);
      return;
    }

    for (const ag of examesVencidos) {
      const client = ag.clientes as any;
      if (client && client.tipo === 'lead' && client.estagio === 'exame_agendado') {
        // 1. Atualiza status do agendamento
        await supabase.from('agendamentos').update({ status: 'NAO_COMPARECEU' }).eq('id', ag.id);

        // 2. Retorna o lead para contatado (fila de follow-up de não-apareceu)
        await supabase.from('clientes').update({
          estagio: 'contatado',
          ultimo_contato_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        }).eq('id', client.id);

        // 3. Grava o evento na timeline
        await supabase.from('lead_eventos').insert([{
          lead_id: client.id,
          tenant_id: client.tenant_id,
          tipo: 'mudou_estagio',
          de_estagio: 'exame_agendado',
          para_estagio: 'contatado',
          conteudo: 'Exame de vista vencido. Lead não compareceu. Retornado para contatado para nova abordagem de follow-up.',
          em: new Date().toISOString()
        }]);

        console.log(`[Follow-Up Leads] Lead ${client.id} não compareceu ao exame. Movido de volta para contatado.`);
      }
    }
  } catch (err) {
    console.error('[Follow-Up Leads] Erro ao rodar rotina de exames vencidos:', err);
  }
}

// FILA DE DISPAROS DE CAMPANHAS DE MARKETING / REMARKETING (Parte 4)
async function processarCampanhaDisparosQueue(config: any, slots: number) {
  if (slots <= 0) return 0;
  
  console.log(`[Campanhas] Loja ${config.tenant_id} processando até ${slots} disparos de campanhas...`);
  
  try {
    const { data: disparos, error: queueError } = await supabase
      .from('campanha_disparos')
      .select(`
        id,
        campanha_id,
        cliente_id,
        tenant_id,
        campanhas (
          nome,
          template_mensagem,
          tipo_campanha
        ),
        clientes (
          nome_completo,
          whatsapp,
          email,
          opt_in_marketing,
          base_legal,
          status_crm
        )
      `)
      .eq('tenant_id', config.tenant_id)
      .eq('status', 'pendente')
      .order('criado_em', { ascending: true })
      .limit(slots);

    if (queueError) {
      console.error('[Campanhas] Erro ao ler fila de disparos:', queueError);
      return 0;
    }

    if (!disparos || disparos.length === 0) return 0;

    let enviadosCont = 0;

    for (const disparo of disparos) {
      const cliente = disparo.clientes as any;
      const campanha = disparo.campanhas as any;
      const tipoCampanha = campanha?.tipo_campanha || 'marketing';

      if (!cliente) {
        await supabase.from('campanha_disparos').update({
          status: 'falha',
          erro_log: 'Cliente não encontrado'
        }).eq('id', disparo.id);
        continue;
      }

      // 1. Checagem de Supressão (Opt-out global)
      const formattedPhone = formatPhoneWAHA(cliente.whatsapp);
      const { data: suprimido } = await supabase
        .from('lista_supressao')
        .select('id')
        .eq('tenant_id', disparo.tenant_id)
        .eq('whatsapp', formattedPhone)
        .limit(1);

      const isSuprimido = (suprimido && suprimido.length > 0) || (cliente.status_crm === 'suprimido');

      if (isSuprimido) {
        await supabase.from('campanha_disparos').update({
          status: 'falha',
          erro_log: 'LGPD Bloqueio: Cliente optou por descadastro (Supressão Global)'
        }).eq('id', disparo.id);
        continue;
      }

      // 2. Checagem de Base Legal conforme o tipo da campanha
      let baseLegalValida = false;
      let motivoBloqueio = '';

      if (tipoCampanha === 'marketing') {
        if (cliente.opt_in_marketing === true && cliente.base_legal === 'consentimento') {
          baseLegalValida = true;
        } else {
          motivoBloqueio = 'LGPD Bloqueio: Campanha de Marketing exige Opt-in de Consentimento ativo';
        }
      } else {
        if (cliente.base_legal === 'consentimento' || cliente.base_legal === 'legitimo_interesse') {
          baseLegalValida = true;
        } else {
          motivoBloqueio = 'LGPD Bloqueio: Sem base legal (Consentimento ou Legítimo Interesse) para relacionamento';
        }
      }

      if (!baseLegalValida) {
        await supabase.from('campanha_disparos').update({
          status: 'falha',
          erro_log: motivoBloqueio
        }).eq('id', disparo.id);
        continue;
      }

      if (!cliente.whatsapp) {
        await supabase.from('campanha_disparos').update({
          status: 'falha',
          erro_log: 'Cliente sem WhatsApp cadastrado'
        }).eq('id', disparo.id);
        continue;
      }

      // 3. Montar e Enviar a Mensagem
      let texto = campanha.template_mensagem || '';
      texto = texto.replace(/\{\{nome\}\}/g, cliente.nome_completo.split(' ')[0]);
      texto += '\n\n*(Responda PARE para não receber mais mensagens)*';

      try {
        await sendWahaMessage(formattedPhone, texto);

        await supabase.from('campanha_disparos').update({
          status: 'enviado',
          mensagem_processada: texto,
          data_envio: new Date().toISOString()
        }).eq('id', disparo.id);

        enviadosCont++;
        console.log(`✅ [Campanha: ${campanha.nome}] Enviada para ${cliente.nome_completo} (${formattedPhone})`);

      } catch (err: any) {
        console.error(`❌ Falha no disparo de campanha para ${formattedPhone}:`, err.message);
        await supabase.from('campanha_disparos').update({
          status: 'falha',
          erro_log: err.message
        }).eq('id', disparo.id);
      }

      // Delay anti-ban entre disparos de campanhas
      const waitTime = randomInt(config.min_delay_s, config.max_delay_s) * 1000;
      console.log(`[Anti-ban] Aguardando ${waitTime/1000}s para a próxima mensagem de campanha...`);
      await delay(waitTime);
    }

    // Se processou toda a fila da campanha, atualiza status da campanha para concluída
    for (const d of disparos) {
      const { count: pendentesRestantes } = await supabase
        .from('campanha_disparos')
        .select('id', { count: 'exact', head: true })
        .eq('campanha_id', d.campanha_id)
        .eq('status', 'pendente');
      
      if ((pendentesRestantes || 0) === 0) {
        await supabase
          .from('campanhas')
          .update({ status: 'concluida', atualizado_em: new Date().toISOString() })
          .eq('id', d.campanha_id);
      }
    }

    return enviadosCont;
  } catch (err) {
    console.error('[Campanhas] Erro global na fila de campanhas:', err);
    return 0;
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
      const today = new Date().toISOString().split('T')[0];
      
      // Contar envios de pós-venda hoje
      const { count: posVendaCount } = await supabase
        .from('pos_venda_envios')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', config.tenant_id)
        .eq('status', 'enviado')
        .gte('enviado_em', `${today}T00:00:00Z`);

      // Contar envios de campanhas hoje
      const { count: campanhaCount } = await supabase
        .from('campanha_disparos')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', config.tenant_id)
        .eq('status', 'enviado')
        .gte('data_envio', `${today}T00:00:00Z`);

      const totalEnviosHoje = (posVendaCount || 0) + (campanhaCount || 0);

      if (totalEnviosHoje >= config.teto_diario) {
        console.log(`[Pós-Venda/Campanhas] Teto diário de ${config.teto_diario} alcançado para loja ${config.tenant_id}.`);
        continue;
      }

      const availableSlots = config.teto_diario - totalEnviosHoje;

      // 4. Puxar fila de pós-venda pendente agendada para hoje ou antes
      const { data: pendentes, error: queueError } = await supabase
        .from('pos_venda_envios')
        .select(`
          id, 
          marco_dia,
          cliente_id,
          tenant_id,
          tipo_gatilho,
          clientes (
            id,
            nome_completo,
            whatsapp,
            email,
            opt_in_marketing,
            base_legal,
            status_crm,
            tipo,
            estagio
          )
        `)
        .eq('tenant_id', config.tenant_id)
        .eq('status', 'pendente')
        .lte('agendado_para', new Date().toISOString())
        .limit(availableSlots);

      if (queueError) {
        console.error('Erro ao ler a fila de pós-venda:', queueError);
        continue;
      }

      let enviosEfetuados = 0;

      if (pendentes && pendentes.length > 0) {
        console.log(`[Pós-Venda] Loja ${config.tenant_id} tem ${pendentes.length} mensagens pendentes.`);

        // 5. Processar fila de pós-venda
        for (const envio of pendentes) {
          const cliente = envio.clientes as any;
          if (!cliente) continue;

          const isLead = cliente.tipo === 'lead';
          const nome = cliente.nome_completo;
          const whatsapp = cliente.whatsapp;
          const optIn = cliente.opt_in_marketing;
          const baseLegal = cliente.base_legal;

          const isMarketing = envio.tipo_gatilho === 'campanha_marketing' || envio.tipo_gatilho === 'follow_up_lead_frio';

          // Regra LGPD 1: Verificar se está na lista de supressão global (opt-out)
          const formattedPhone = formatPhoneWAHA(whatsapp);
          const { data: suprimido } = await supabase
            .from('lista_supressao')
            .select('id')
            .eq('tenant_id', envio.tenant_id)
            .eq('whatsapp', formattedPhone)
            .limit(1);

          const isSuprimido = (suprimido && suprimido.length > 0) || (cliente.status_crm === 'suprimido');

          if (isSuprimido) {
            await supabase.from('pos_venda_envios').update({
              status: 'cancelado',
              motivo_cancelamento: 'LGPD Bloqueio: Cliente optou por descadastro (Supressão Global)'
            }).eq('id', envio.id);
            continue;
          }

          // Regra LGPD 2: Verificar base legal conforme o tipo de disparo
          let baseLegalValida = false;
          let motivoBloqueio = '';

          if (isMarketing) {
            if (optIn === true && baseLegal === 'consentimento') {
              baseLegalValida = true;
            } else {
              motivoBloqueio = 'LGPD Bloqueio: Campanha de Marketing exige Opt-in de Consentimento ativo';
            }
          } else {
            if (baseLegal === 'consentimento' || baseLegal === 'legitimo_interesse') {
              baseLegalValida = true;
            } else {
              motivoBloqueio = 'LGPD Bloqueio: Sem base legal (Consentimento ou Legítimo Interesse) para relacionamento';
            }
          }

          if (!baseLegalValida) {
            await supabase.from('pos_venda_envios').update({
              status: 'cancelado',
              motivo_cancelamento: motivoBloqueio
            }).eq('id', envio.id);
            continue;
          }

          if (!whatsapp) {
            await supabase.from('pos_venda_envios').update({
              status: 'falha',
              erro_log: 'WhatsApp não cadastrado'
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

            const templates = leadConfig?.templates?.[cliente.estagio] || [];
            if (!templates || templates.length === 0) {
               await supabase.from('pos_venda_envios').update({
                status: 'falha',
                erro_log: `Nenhum template de lead encontrado para o estágio ${cliente.estagio}`
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
          
          texto = texto.replace(/\{\{nome\}\}/g, nome.split(' ')[0]);
          texto += '\n\n*(Responda PARE para não receber mais mensagens)*';

          try {
            await sendWahaMessage(formattedPhone, texto);

            await supabase.from('pos_venda_envios').update({
              status: 'enviado',
              enviado_em: new Date().toISOString(),
              template_usado: texto,
              variacao_index: varIndex
            }).eq('id', envio.id);

            enviosEfetuados++;

            // Se for lead, registrar o evento de mensagem enviada na timeline
            if (isLead) {
              await supabase.from('clientes').update({
                ultimo_contato_em: new Date().toISOString(),
                atualizado_em: new Date().toISOString()
              }).eq('id', envio.cliente_id);

              await supabase.from('lead_eventos').insert([{
                lead_id: envio.cliente_id,
                tenant_id: envio.tenant_id,
                tipo: 'mensagem_enviada',
                conteudo: texto,
                em: new Date().toISOString()
              }]);
            }

            console.log(`✅ [D+${envio.marco_dia}] Enviado para ${nome} (${formattedPhone})`);

          } catch (err: any) {
            console.error(`❌ Falha ao enviar pós-venda para ${formattedPhone}:`, err.message);
            await supabase.from('pos_venda_envios').update({
              status: 'falha',
              erro_log: err.message
            }).eq('id', envio.id);
          }

          // Delay anti-ban
          const waitTime = randomInt(config.min_delay_s, config.max_delay_s) * 1000;
          await delay(waitTime);
        }
      }

      // 6. Processar a fila de Campanhas de Marketing se restarem slots livres na cota diária
      const remainingSlots = availableSlots - enviosEfetuados;
      if (remainingSlots > 0) {
        await processarCampanhaDisparosQueue(config, remainingSlots);
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

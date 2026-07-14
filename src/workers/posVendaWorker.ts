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

// MOTOR PRINCIPAL
export async function processPosVendaQueue() {
  console.log(`[Pós-Venda] Iniciando processamento da fila... (${new Date().toISOString()})`);

  try {
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
          tenant_id,
          clientes (
            nome,
            whatsapp,
            consentimento_marketing
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
        const cliente = envio.clientes as any;

        // Regra LGPD: Consentimento Negado
        if (cliente.consentimento_marketing === false) {
          await supabase.from('pos_venda_envios').update({
            status: 'cancelado',
            motivo_cancelamento: 'Opt-out (Sem consentimento)'
          }).eq('id', envio.id);
          continue;
        }

        if (!cliente.whatsapp) {
          await supabase.from('pos_venda_envios').update({
            status: 'falha',
            erro_log: 'Cliente sem WhatsApp'
          }).eq('id', envio.id);
          continue;
        }

        // Escolher Template Aleatório para variação (Anti-ban)
        const templates = config.templates[String(envio.marco_dia)];
        if (!templates || templates.length === 0) {
           await supabase.from('pos_venda_envios').update({
            status: 'falha',
            erro_log: `Nenhum template encontrado para marco ${envio.marco_dia}`
          }).eq('id', envio.id);
          continue;
        }

        const varIndex = randomInt(0, templates.length - 1);
        let texto = templates[varIndex];
        
        // Substituir Variáveis
        texto = texto.replace(/\{\{nome\}\}/g, cliente.nome.split(' ')[0]);
        // Opt-out text
        texto += '\n\n*(Responda PARE para não receber mais mensagens)*';

        const chatId = formatPhoneWAHA(cliente.whatsapp);

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

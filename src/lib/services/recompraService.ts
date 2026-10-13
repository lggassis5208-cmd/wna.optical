import { supabase, isSupabaseConfigured } from '../supabase';
import { fichasMedicasService, type FichaMedica } from './fichasMedicasService';
import { isPhoneSuppressed } from '../whatsappUtils';
import { crmEventsService } from './crmEventsService';

export type FaixaVencimento = 'vence_em_breve' | 'vencida_recente' | 'vencida_antiga';
export type StatusContato = 'nunca_contatado' | 'contatado' | 'respondeu' | 'bloqueado_lgpd';

export interface CandidatoRecompra {
  cliente_id: string;
  nome: string;
  telefone: string;
  cpf?: string;
  loja_id: string;
  ficha_id: string;
  data_exame: string;
  validade_receita: string;
  dias_para_vencer: number; // Positivo = faltam X dias; Negativo = venceu há X dias
  faixa: FaixaVencimento;
  grau_resumido: string;
  tipo_lente?: string;
  status_contato: StatusContato;
  ultimo_contato_em?: string;
  contatado_no_ciclo: boolean;
  elegivel_lgpd: boolean;
  motivo_bloqueio_lgpd?: string;
  opt_in_marketing?: boolean;
  base_legal?: string;
}

export interface RecompraResumo {
  total_candidatos: number;
  vence_em_breve: number;
  vencida_recente: number;
  vencida_antiga: number;
  contatados_no_ciclo: number;
  bloqueados_lgpd: number;
}

export interface HistoricoRecompraRegistro {
  id?: string;
  cliente_id: string;
  ficha_id?: string;
  loja_id: string;
  canal: string;
  status_envio: 'enviado' | 'falha' | 'respondeu' | 'bloqueado_lgpd';
  mensagem_variacao_id: number;
  mensagem_texto: string;
  usuario_nome: string;
  enviado_em?: string;
}

const LOCAL_STORAGE_RECOMPRA_LOGS = 'lis_recompra_historico';
const DIAS_CICLO_CONTATO = 30; // 30 dias de janela de proteção anti-duplicação

export const recompraService = {
  /**
   * Templates de mensagem com variações de texto (Anti-Ban & Opt-out LGPD).
   * NUNCA expõem dados clínicos (esférico/cilíndrico).
   */
  getMensagemVariacoes(): { id: number; titulo: string; template: string }[] {
    return [
      {
        id: 1,
        titulo: 'Variação 1 — Preventiva & Amigável',
        template: 'Olá {{nome}}! 👋 Passando para avisar que a validade do seu exame de vista da Ótica Lìs está próxima do vencimento. Que tal agendar um retorno para manter sua visão perfeita? 🕶️✨\n\n(Para não receber mais avisos, responda SAIR)'
      },
      {
        id: 2,
        titulo: 'Variação 2 — Cuidado com a Visão',
        template: 'Olá {{nome}}! Como está a saúde dos seus olhos? 👁️ Notamos que já faz quase 1 ano da sua última receita na Ótica Lìs. Temos horários disponíveis nesta semana para sua renovação!\n\n(Responda SAIR a qualquer momento para cancelar)'
      },
      {
        id: 3,
        titulo: 'Variação 3 — Retorno & Benefício',
        template: 'Oi {{nome}}, tudo bem? Daqui é da Ótica Lìs. Suas lentes e receita médica estão prestes a vencer. Vamos agendar uma consulta de revisão? Estamos com novidades incríveis em armações! 👓\n\n(Responda SAIR se não quiser mais mensagens)'
      }
    ];
  },

  /**
   * Verifica se o horário atual está no intervalo comercial (08:00 às 19:00).
   */
  isHorarioComercial(): boolean {
    const hora = new Date().getHours();
    return hora >= 8 && hora < 19;
  },

  /**
   * Retorna o total de mensagens enviadas hoje para uma loja (Teto Diário Anti-Ban).
   */
  async getDisparosHoje(lojaId: string = 'loja_principal'): Promise<number> {
    const hojeIso = new Date().toISOString().substring(0, 10);
    
    if (isSupabaseConfigured()) {
      try {
        const { count, error } = await supabase
          .from('recompra_historico')
          .select('id', { count: 'exact', head: true })
          .eq('loja_id', lojaId)
          .gte('enviado_em', `${hojeIso}T00:00:00.000Z`);

        if (!error && count !== null) return count;
      } catch (e) {
        console.warn('Erro ao buscar disparos de hoje no Supabase:', e);
      }
    }

    const logs: HistoricoRecompraRegistro[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_RECOMPRA_LOGS) || '[]');
    return logs.filter(l => l.loja_id === lojaId && l.enviado_em && l.enviado_em.startsWith(hojeIso)).length;
  },

  /**
   * Busca e sintetiza os candidatos a recompra a partir da FICHA MAIS RECENTE de cada cliente.
   */
  async getCandidatos(lojaId: string = 'loja_principal'): Promise<{ candidatos: CandidatoRecompra[]; resumo: RecompraResumo }> {
    // 1. Buscar todas as fichas médicas finalizadas
    const todasFichas = await fichasMedicasService.getFichas({ status: 'finalizada' });

    // 2. Filtrar apenas a ficha médica MAIS RECENTE por paciente (cliente_id)
    const fichasMaisRecentesPorCliente = new Map<string, FichaMedica>();

    for (const f of todasFichas) {
      if (lojaId !== 'todas' && f.loja_id && f.loja_id !== lojaId) continue;

      const existente = fichasMaisRecentesPorCliente.get(f.cliente_id);
      if (!existente) {
        fichasMaisRecentesPorCliente.set(f.cliente_id, f);
      } else {
        // Se a atual for mais recente que a já salva
        if (new Date(f.data_exame).getTime() > new Date(existente.data_exame).getTime()) {
          fichasMaisRecentesPorCliente.set(f.cliente_id, f);
        }
      }
    }

    // 3. Buscar histórico de contatos nos últimos 30 dias para anti-duplicação
    const historicoRecente = await this.getHistoricoRecente(DIAS_CICLO_CONTATO);
    const clienteContatadoMap = new Map<string, HistoricoRecompraRegistro>();
    historicoRecente.forEach(h => {
      if (!clienteContatadoMap.has(h.cliente_id)) {
        clienteContatadoMap.set(h.cliente_id, h);
      }
    });

    const candidatos: CandidatoRecompra[] = [];
    const hojeMs = new Date().setHours(0,0,0,0);

    let countBreve = 0;
    let countRecente = 0;
    let countAntiga = 0;
    let countContatados = 0;
    let countBloqueadosLgpd = 0;

    for (const [clienteId, f] of fichasMaisRecentesPorCliente.entries()) {
      if (!f.validade_receita) continue;

      const validadeMs = new Date(f.validade_receita + 'T12:00:00').getTime();
      const diasDiff = Math.floor((validadeMs - hojeMs) / (1000 * 60 * 60 * 24));

      // Classificação nas Faixas
      let faixa: FaixaVencimento;
      if (diasDiff >= -15 && diasDiff <= 60) {
        faixa = 'vence_em_breve'; // Vence nos próximos 60 dias (ou venceu nos últimos 15 dias) -> Prioridade Preventiva
        countBreve++;
      } else if (diasDiff < -15 && diasDiff >= -90) {
        faixa = 'vencida_recente'; // Venceu há 16 a 90 dias
        countRecente++;
      } else if (diasDiff < -90) {
        faixa = 'vencida_antiga'; // Venceu há mais de 90 dias
        countAntiga++;
      } else {
        // Receita muito nova (vence a mais de 60 dias no futuro), não entra na fila de recompra ainda
        continue;
      }

      // Resumo de grau OD / OE
      const rod = f.refracoes?.find(r => r.olho === 'OD');
      const roe = f.refracoes?.find(r => r.olho === 'OE');
      const esfOD = rod?.esferico !== undefined ? (rod.esferico > 0 ? `+${rod.esferico}` : rod.esferico) : '0.00';
      const cilOD = rod?.cilindrico !== undefined ? (rod.cilindrico > 0 ? `+${rod.cilindrico}` : rod.cilindrico) : '0.00';
      const esfOE = roe?.esferico !== undefined ? (roe.esferico > 0 ? `+${roe.esferico}` : roe.esferico) : '0.00';
      const cilOE = roe?.cilindrico !== undefined ? (roe.cilindrico > 0 ? `+${roe.cilindrico}` : roe.cilindrico) : '0.00';
      const grauResumido = `OD: ${esfOD}/${cilOD}x${rod?.eixo ?? 0}° | OE: ${esfOE}/${cilOE}x${roe?.eixo ?? 0}°`;

      // Checagem de contato anterior no ciclo de 30 dias
      const ultimoEnvio = clienteContatadoMap.get(clienteId);
      const contatadoNoCiclo = Boolean(ultimoEnvio);
      if (contatadoNoCiclo) countContatados++;

      let statusContato: StatusContato = 'nunca_contatado';
      if (ultimoEnvio) {
        if (ultimoEnvio.status_envio === 'respondeu') statusContato = 'respondeu';
        else statusContato = 'contatado';
      }

      // Checagem LGPD & Supressão
      const telefoneClean = f.telefone || f.cliente?.whatsapp || '';
      const estaSuprimido = await isPhoneSuppressed(telefoneClean);
      const temBaseLegal = f.cliente?.opt_in_marketing !== false || f.cliente?.base_legal === 'consentimento' || f.cliente?.base_legal === 'legitimo_interesse';

      let elegivelLgpd = true;
      let motivoBloqueio: string | undefined = undefined;

      if (estaSuprimido) {
        elegivelLgpd = false;
        motivoBloqueio = 'Cliente na Lista de Supressão (Opt-Out / PARE)';
        statusContato = 'bloqueado_lgpd';
        countBloqueadosLgpd++;
      } else if (!temBaseLegal) {
        elegivelLgpd = false;
        motivoBloqueio = 'Sem base legal ou opt-in de comunicação LGPD';
        statusContato = 'bloqueado_lgpd';
        countBloqueadosLgpd++;
      } else if (!telefoneClean) {
        elegivelLgpd = false;
        motivoBloqueio = 'Sem número de WhatsApp cadastrado';
      }

      candidatos.push({
        cliente_id: clienteId,
        nome: f.nome || f.cliente?.nome || 'Paciente sem nome',
        telefone: telefoneClean,
        cpf: f.cpf || f.cliente?.cpf,
        loja_id: f.loja_id || 'loja_principal',
        ficha_id: f.id,
        data_exame: f.data_exame,
        validade_receita: f.validade_receita,
        dias_para_vencer: diasDiff,
        faixa,
        grau_resumido: grauResumido,
        tipo_lente: f.cliente?.tipo_lente || 'Óculos Completo',
        status_contato: statusContato,
        ultimo_contato_em: ultimoEnvio?.enviado_em,
        contatado_no_ciclo: contatadoNoCiclo,
        elegivel_lgpd: elegivelLgpd,
        motivo_bloqueio_lgpd: motivoBloqueio,
        opt_in_marketing: f.cliente?.opt_in_marketing,
        base_legal: f.cliente?.base_legal
      });
    }

    // Ordenar por prioridade:
    // 1. "vence_em_breve" primeiro
    // 2. Não contatados no ciclo primeiro
    // 3. Faltando menos dias para vencer primeiro
    candidatos.sort((a, b) => {
      const pesoFaixa = { vence_em_breve: 1, vencida_recente: 2, vencida_antiga: 3 };
      if (pesoFaixa[a.faixa] !== pesoFaixa[b.faixa]) {
        return pesoFaixa[a.faixa] - pesoFaixa[b.faixa];
      }
      if (a.contatado_no_ciclo !== b.contatado_no_ciclo) {
        return a.contatado_no_ciclo ? 1 : -1;
      }
      return b.dias_para_vencer - a.dias_para_vencer;
    });

    return {
      candidatos,
      resumo: {
        total_candidatos: candidatos.length,
        vence_em_breve: countBreve,
        vencida_recente: countRecente,
        vencida_antiga: countAntiga,
        contatados_no_ciclo: countContatados,
        bloqueados_lgpd: countBloqueadosLgpd
      }
    };
  },

  /**
   * Busca registros de histórico dos últimos N dias.
   */
  async getHistoricoRecente(dias: number = 30): Promise<HistoricoRecompraRegistro[]> {
    const dataLimite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('recompra_historico')
          .select('*')
          .gte('enviado_em', dataLimite)
          .order('enviado_em', { ascending: false });

        if (!error && data) return data as HistoricoRecompraRegistro[];
      } catch (e) {
        console.warn('Erro ao buscar histórico no Supabase:', e);
      }
    }

    const logs: HistoricoRecompraRegistro[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_RECOMPRA_LOGS) || '[]');
    return logs.filter(l => l.enviado_em && l.enviado_em >= dataLimite);
  },

  /**
   * Registra notificação enviada no histórico de recompra e na timeline CRM do cliente.
   */
  async registrarNotificacao(registro: HistoricoRecompraRegistro): Promise<void> {
    const nowIso = new Date().toISOString();
    const payload: HistoricoRecompraRegistro = {
      ...registro,
      id: registro.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)),
      enviado_em: nowIso
    };

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('recompra_historico')
          .insert([{
            id: payload.id,
            cliente_id: payload.cliente_id,
            ficha_id: payload.ficha_id || null,
            loja_id: payload.loja_id || 'loja_principal',
            canal: payload.canal,
            status_envio: payload.status_envio,
            mensagem_variacao_id: payload.mensagem_variacao_id,
            mensagem_texto: payload.mensagem_texto,
            usuario_nome: payload.usuario_nome,
            enviado_em: nowIso
          }]);

        if (error) console.warn('Erro ao inserir recompra_historico no Supabase:', error);
      } catch (e) {
        console.warn('Erro registro Supabase:', e);
      }
    }

    // Salvar no LocalStorage
    try {
      const logs: HistoricoRecompraRegistro[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_RECOMPRA_LOGS) || '[]');
      logs.push(payload);
      localStorage.setItem(LOCAL_STORAGE_RECOMPRA_LOGS, JSON.stringify(logs));
    } catch (err) {
      console.error('Erro ao salvar no LocalStorage:', err);
    }

    // Registrar na linha do tempo CRM do cliente
    try {
      await crmEventsService.registerEvent({
        cliente_id: payload.cliente_id,
        tipo_evento: 'lembrete_enviado',
        payload: {
          modulo: 'recompra_receita',
          status: payload.status_envio,
          usuario: payload.usuario_nome,
          mensagem: payload.mensagem_texto
        }
      });
    } catch (e) {
      console.warn('Erro ao registrar evento de CRM:', e);
    }
  }
};

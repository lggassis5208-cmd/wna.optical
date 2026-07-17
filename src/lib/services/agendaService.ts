import { supabase, isSupabaseConfigured } from '../supabase';
import { toast } from 'sonner';

export interface AgendamentoPayload {
  id?: string;
  loja_id?: string;
  tenant_id?: string;
  cliente_id?: string | null;
  nome_avulso?: string;
  telefone?: string;
  tipo: 'exame' | 'entrega' | 'retorno' | 'ajuste' | 'outro';
  inicio_em?: string; // ISO string em UTC
  fim_em?: string;    // ISO string em UTC
  duracao_min?: number;
  data?: string;      // YYYY-MM-DD em America/Sao_Paulo (para conversão)
  horario?: string;   // HH:mm em America/Sao_Paulo (para conversão)
  status?: 'agendado' | 'confirmado' | 'compareceu' | 'faltou' | 'cancelado' | string;
  status_pagamento?: 'nao_pago' | 'pago' | 'isento';
  valor?: number;
  pago_em?: string | null;
  forma_pagamento?: string;
  registrado_por?: string;
  profissional_id?: string;
  observacoes?: string;
  paciente_nome?: string;
  paciente_cpf?: string;
  paciente_whatsapp?: string;
}

// Converte YYYY-MM-DD e HH:mm (fuso America/Sao_Paulo) para UTC ISO string
export function formatSaoPauloToUtcIso(dataStr: string, horarioStr: string): string {
  if (!dataStr || !horarioStr) return new Date().toISOString();
  try {
    return new Date(`${dataStr}T${horarioStr}:00-03:00`).toISOString();
  } catch (e) {
    return new Date(`${dataStr}T${horarioStr}:00Z`).toISOString();
  }
}

// Converte UTC ISO string para YYYY-MM-DD e HH:mm no fuso America/Sao_Paulo
export function parseUtcToSaoPaulo(utcIso?: string) {
  if (!utcIso) {
    const d = new Date();
    return { 
      data: d.toISOString().split('T')[0], 
      horario: '08:00', 
      dateObj: d 
    };
  }
  try {
    const d = new Date(utcIso);
    const formatterDate = new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'America/Sao_Paulo', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    const formatterTime = new Intl.DateTimeFormat('pt-BR', { 
      timeZone: 'America/Sao_Paulo', 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
    return { 
      data: formatterDate.format(d), 
      horario: formatterTime.format(d), 
      dateObj: d 
    };
  } catch (e) {
    const parts = utcIso.split('T');
    return { 
      data: parts[0] || '', 
      horario: (parts[1] || '').substring(0, 5) || '08:00', 
      dateObj: new Date(utcIso) 
    };
  }
}

export const agendaService = {
  /**
   * Busca agendamentos do Supabase + Cache Local, resolvendo nomes de clientes e ícones
   */
  async buscarAgendamentos(inicioIso?: string, fimIso?: string): Promise<any[]> {
    let resultSupabase: any[] = [];
    let clientesMapa: Record<string, any> = {};

    // 1. Tentar buscar clientes no Supabase ou LocalStorage para mapeamento rápido e infalível de nomes
    try {
      if (isSupabaseConfigured()) {
        const { data: cls } = await supabase.from('clientes').select('*');
        if (cls) {
          cls.forEach((c: any) => {
            clientesMapa[c.id] = c;
          });
        }
      }
    } catch (e) {
      console.warn('Falha leve ao carregar mapa de clientes:', e);
    }

    // Se o mapa do banco estiver vazio ou incompleto, tentamos complementar do LocalStorage de clientes
    try {
      const locaisClients = JSON.parse(localStorage.getItem('lis_clients') || '[]');
      locaisClients.forEach((c: any) => {
        if (c.id && !clientesMapa[c.id]) clientesMapa[c.id] = c;
      });
    } catch (e) {}

    // 2. Buscar agendamentos no Supabase
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('agendamentos').select(`*, clientes (*)`);

        if (inicioIso) query = query.gte('inicio_em', inicioIso);
        if (fimIso) query = query.lte('inicio_em', fimIso);

        const { data, error } = await query.order('inicio_em', { ascending: true });

        if (error) {
          // Se a coluna inicio_em ou join falhar (ex: migração não rodou no cloud), tentamos sem filtro de inicio_em e ordenado por data
          const retry = await supabase.from('agendamentos').select('*').order('data', { ascending: true });
          if (retry.data) {
            resultSupabase = retry.data;
          }
        } else if (data) {
          resultSupabase = data;
        }
      } catch (e) {
        console.warn('Erro ao consultar Supabase agendamentos, utilizando offline cache:', e);
      }
    }

    // 3. Buscar agendamentos do LocalStorage (offline cache / transição)
    let locaisExames: any[] = [];
    try {
      locaisExames = JSON.parse(localStorage.getItem('lis_exames') || '[]');
    } catch (e) {}

    // Merge e desduplicação por ID
    const mapaId = new Map<string, any>();
    
    // Primeiro inserimos os locais para que, se existirem no Supabase, sejam sobrescritos pelo dado do servidor (fonte da verdade)
    locaisExames.forEach((ex: any) => {
      if (ex && ex.id) mapaId.set(ex.id, ex);
    });

    resultSupabase.forEach((ex: any) => {
      if (ex && ex.id) mapaId.set(ex.id, ex);
    });

    const todos = Array.from(mapaId.values());

    return todos.map((ag: any) => this.mapearParaUi(ag, clientesMapa));
  },

  /**
   * Mapeia o agendamento do banco para exibição visual no calendário (com nome do cliente e ícone garantidos)
   */
  mapearParaUi(ag: any, clientesMapa: Record<string, any> = {}): any {
    const inicioIso = ag.inicio_em || (ag.data && ag.horario ? formatSaoPauloToUtcIso(ag.data, ag.horario) : new Date().toISOString());
    const saoPaulo = parseUtcToSaoPaulo(inicioIso);

    // Identificar o cliente ou avulso
    const clienteObj = ag.clientes || (ag.cliente_id ? clientesMapa[ag.cliente_id] : null);
    const isAvulso = !ag.cliente_id && ag.nome_avulso;
    
    // Garantir nome completo do paciente sem falhas
    const nome = isAvulso 
      ? ag.nome_avulso 
      : (
          clienteObj?.nome_completo || 
          clienteObj?.name || 
          clienteObj?.nome || 
          ag.paciente_nome || 
          ag.nome_completo || 
          ag.name || 
          ag.nome || 
          'Cliente sem Nome'
        );

    const cpf = isAvulso ? 'Avulso' : (clienteObj?.cpf || ag.paciente_cpf || ag.cpf || '');
    const whatsapp = isAvulso ? (ag.telefone || '') : (clienteObj?.whatsapp || ag.paciente_whatsapp || ag.whatsapp || ag.telefone || '');

    return {
      ...ag,
      inicio_em: inicioIso,
      fim_em: ag.fim_em || new Date(new Date(inicioIso).getTime() + (ag.duracao_min || 30) * 60000).toISOString(),
      data: ag.data || saoPaulo.data,
      horario: (ag.horario || saoPaulo.horario || '08:00').substring(0, 5),
      paciente_nome: nome,
      paciente_cpf: cpf,
      paciente_whatsapp: whatsapp,
      tipo: ag.tipo || 'exame',
      status: (ag.status || 'agendado').toLowerCase(),
      status_pagamento: ag.status_pagamento || 'nao_pago',
      valor: Number(ag.valor || 0),
      duracao_min: Number(ag.duracao_min || 30)
    };
  },

  /**
   * Cria ou atualiza um agendamento no Supabase com tolerância a schema em transição
   */
  async salvarAgendamento(payload: AgendamentoPayload): Promise<any> {
    const duracao = Number(payload.duracao_min || 30);
    let inicioIso = payload.inicio_em;
    if (!inicioIso && payload.data && payload.horario) {
      inicioIso = formatSaoPauloToUtcIso(payload.data, payload.horario);
    }
    if (!inicioIso) {
      inicioIso = new Date().toISOString();
    }
    const fimIso = payload.fim_em || new Date(new Date(inicioIso).getTime() + duracao * 60000).toISOString();
    const saoPaulo = parseUtcToSaoPaulo(inicioIso);

    const rowV2: any = {
      cliente_id: payload.cliente_id || null,
      nome_avulso: payload.cliente_id ? null : (payload.nome_avulso || payload.paciente_nome || 'Cliente Avulso'),
      telefone: payload.cliente_id ? null : (payload.telefone || payload.paciente_whatsapp || ''),
      tipo: payload.tipo || 'exame',
      inicio_em: inicioIso,
      fim_em: fimIso,
      duracao_min: duracao,
      data: saoPaulo.data,
      horario: saoPaulo.horario,
      status: (payload.status || 'agendado').toLowerCase(),
      status_pagamento: payload.status_pagamento || 'nao_pago',
      valor: Number(payload.valor || 0),
      observacoes: payload.observacoes || null
    };

    if (payload.profissional_id) rowV2.profissional_id = payload.profissional_id;

    let salvoUi: any = null;

    if (isSupabaseConfigured()) {
      try {
        if (payload.id) {
          const { data, error } = await supabase
            .from('agendamentos')
            .update(rowV2)
            .eq('id', payload.id)
            .select(`*, clientes (*)`);

          if (error) {
            // Se falhou por colunas V2 inexistentes na base nuvem, fazemos fallback com colunas originais
            if (error.code === '42703' || error.message.includes('column')) {
              const rowLegacy = {
                cliente_id: rowV2.cliente_id,
                data: rowV2.data,
                horario: rowV2.horario,
                status: rowV2.status || 'AGENDADO',
                observacao: rowV2.observacoes || null
              };
              const retry = await supabase.from('agendamentos').update(rowLegacy).eq('id', payload.id).select('*');
              if (retry.data && retry.data[0]) salvoUi = this.mapearParaUi(retry.data[0]);
            } else {
              throw error;
            }
          } else if (data && data[0]) {
            salvoUi = this.mapearParaUi(data[0]);
            await this.registrarAuditoria(payload.id, 'atualizado', { novos_dados: rowV2 });
          }
        } else {
          const { data, error } = await supabase
            .from('agendamentos')
            .insert([rowV2])
            .select(`*, clientes (*)`);

          if (error) {
            // Fallback para colunas V1 caso migração SQL ainda não tenha rodado na nuvem
            if (error.code === '42703' || error.message.includes('column')) {
              const rowLegacy = {
                cliente_id: rowV2.cliente_id,
                data: rowV2.data,
                horario: rowV2.horario,
                status: rowV2.status || 'AGENDADO',
                observacao: rowV2.observacoes || null
              };
              const retry = await supabase.from('agendamentos').insert([rowLegacy]).select('*');
              if (retry.data && retry.data[0]) {
                salvoUi = this.mapearParaUi({ ...retry.data[0], ...rowV2 });
              } else {
                throw retry.error || error;
              }
            } else {
              throw error;
            }
          } else if (data && data[0]) {
            salvoUi = this.mapearParaUi(data[0]);
            await this.registrarAuditoria(salvoUi.id, 'criado', { dados: rowV2 });
          }
        }
      } catch (e: any) {
        console.error('Erro ao salvar no Supabase, salvando em cache local offline:', e);
      }
    }

    // Garantir sempre persistência no cache local (lis_exames) para que o evento NUNCA desapareça da tela
    try {
      const examesLocais = JSON.parse(localStorage.getItem('lis_exames') || '[]');
      const idFinal = salvoUi?.id || payload.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9));
      
      const itemPronto = salvoUi || this.mapearParaUi({
        ...rowV2,
        id: idFinal,
        paciente_nome: payload.paciente_nome || payload.nome_avulso || 'Cliente'
      });

      const idx = examesLocais.findIndex((e: any) => e.id === idFinal);
      if (idx !== -1) {
        examesLocais[idx] = itemPronto;
      } else {
        examesLocais.push(itemPronto);
      }
      localStorage.setItem('lis_exames', JSON.stringify(examesLocais));
      return itemPronto;
    } catch (e) {
      if (salvoUi) return salvoUi;
      throw new Error('Falha ao gravar agendamento.');
    }
  },

  /**
   * Altera status operacional (confirmado, compareceu, faltou, cancelado)
   */
  async atualizarStatus(id: string, status: string, observacoes?: string): Promise<any> {
    const updateData: any = { status: status.toLowerCase() };
    if (observacoes !== undefined) updateData.observacoes = observacoes;

    let atualizado: any = null;
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('agendamentos').update(updateData).eq('id', id).select('*');
        if (data && data[0]) atualizado = this.mapearParaUi(data[0]);
      } catch (e) {}
    }

    try {
      const examesLocais = JSON.parse(localStorage.getItem('lis_exames') || '[]');
      const idx = examesLocais.findIndex((e: any) => e.id === id);
      if (idx !== -1) {
        examesLocais[idx] = { ...examesLocais[idx], ...updateData };
        localStorage.setItem('lis_exames', JSON.stringify(examesLocais));
        if (!atualizado) atualizado = examesLocais[idx];
      }
    } catch (e) {}

    await this.registrarAuditoria(id, 'mudou_status', { novo_status: status });
    return atualizado;
  },

  /**
   * Altera status de pagamento, valor e forma
   */
  async atualizarPagamento(
    id: string, 
    status_pagamento: 'nao_pago' | 'pago' | 'isento', 
    forma_pagamento?: string, 
    valor?: number
  ): Promise<any> {
    const updateData: any = {
      status_pagamento,
      pago_em: status_pagamento === 'pago' ? new Date().toISOString() : null
    };
    if (forma_pagamento !== undefined) updateData.forma_pagamento = forma_pagamento;
    if (valor !== undefined) updateData.valor = valor;

    let atualizado: any = null;
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('agendamentos').update(updateData).eq('id', id).select('*');
        if (data && data[0]) atualizado = this.mapearParaUi(data[0]);
      } catch (e) {}
    }

    try {
      const examesLocais = JSON.parse(localStorage.getItem('lis_exames') || '[]');
      const idx = examesLocais.findIndex((e: any) => e.id === id);
      if (idx !== -1) {
        examesLocais[idx] = { ...examesLocais[idx], ...updateData };
        localStorage.setItem('lis_exames', JSON.stringify(examesLocais));
        if (!atualizado) atualizado = examesLocais[idx];
      }
    } catch (e) {}

    await this.registrarAuditoria(id, 'mudou_pagamento', { status_pagamento, forma_pagamento, valor });
    return atualizado;
  },

  /**
   * Reagendar via drag and drop ou alteração de horário
   */
  async reagendarHorario(id: string, inicioIso: string, duracaoMin: number = 30): Promise<any> {
    const fimIso = new Date(new Date(inicioIso).getTime() + duracaoMin * 60000).toISOString();
    const saoPaulo = parseUtcToSaoPaulo(inicioIso);

    const updateData = {
      inicio_em: inicioIso,
      fim_em: fimIso,
      duracao_min: duracaoMin,
      data: saoPaulo.data,
      horario: saoPaulo.horario
    };

    let atualizado: any = null;
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('agendamentos').update(updateData).eq('id', id).select('*');
        if (data && data[0]) atualizado = this.mapearParaUi(data[0]);
      } catch (e) {}
    }

    try {
      const examesLocais = JSON.parse(localStorage.getItem('lis_exames') || '[]');
      const idx = examesLocais.findIndex((e: any) => e.id === id);
      if (idx !== -1) {
        examesLocais[idx] = { ...examesLocais[idx], ...updateData };
        localStorage.setItem('lis_exames', JSON.stringify(examesLocais));
        if (!atualizado) atualizado = examesLocais[idx];
      }
    } catch (e) {}

    await this.registrarAuditoria(id, 'reagendado', { novo_inicio: inicioIso, novo_fim: fimIso });
    return atualizado;
  },

  /**
   * Grava log na tabela de auditoria agendamento_eventos
   */
  async registrarAuditoria(agendamento_id: string, acao: string, detalhes?: any) {
    try {
      if (isSupabaseConfigured()) {
        await supabase.from('agendamento_eventos').insert([{
          agendamento_id,
          acao,
          detalhes: detalhes || {}
        }]);
      }
    } catch (e) {}
  }
};

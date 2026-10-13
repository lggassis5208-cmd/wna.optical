import { supabase, isSupabaseConfigured } from '../supabase';
import { generateAssinaturaHash } from '../cryptoUtils';

export interface Refracao {
  id?: string;
  ficha_id?: string;
  olho: 'OD' | 'OE';
  esferico: number;
  cilindrico: number;
  eixo: number;
  adicao?: number | null;
  dnp?: number | null;
  altura?: number | null;
}

export interface FichaMedica {
  id: string;
  cliente_id: string;
  loja_id: string;
  nome: string;
  telefone?: string;
  cpf?: string;
  genero?: string;
  data_nascimento?: string;
  motivo_consulta?: string;
  atendido_por: string;
  data_exame: string; // YYYY-MM-DD
  validade_receita: string; // YYYY-MM-DD
  status: 'rascunho' | 'finalizada';
  finalizada_em?: string;
  assinatura_hash?: string;
  ficha_pai_id?: string | null;
  tipo: 'original' | 'retificacao';
  criado_em: string;
  atualizado_em?: string;
  refracoes?: Refracao[];
  cliente?: any;
  retificacoes_filhas?: FichaMedica[];
}

export interface FichaLogAcesso {
  ficha_id?: string;
  cliente_id?: string;
  loja_id?: string;
  usuario_id?: string;
  usuario_nome: string;
  acao: 'visualizacao' | 'impressao' | 'exportacao_pdf' | 'exportacao_massa' | 'anonimizacao_lgpd';
  detalhes?: string;
}

const LOCAL_STORAGE_KEY_FICHAS = 'lis_fichas_medicas';
const LOCAL_STORAGE_KEY_LOGS = 'lis_fichas_acesso_logs';

export const fichasMedicasService = {
  /**
   * Registra log de auditoria LGPD de acesso a dados de saúde.
   */
  async logAcesso(logData: FichaLogAcesso): Promise<void> {
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('fichas_medicas_acesso_log').insert([{
          ficha_id: logData.ficha_id || null,
          cliente_id: logData.cliente_id || null,
          loja_id: logData.loja_id || 'loja_principal',
          usuario_id: logData.usuario_id || null,
          usuario_nome: logData.usuario_nome || 'Usuário do Sistema',
          acao: logData.acao,
          detalhes: logData.detalhes || null,
          ip_address: typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1',
          criado_em: new Date().toISOString()
        }]);
        if (error) {
          console.warn('Erro ao inserir log de acesso LGPD no Supabase:', error);
        }
      }
    } catch (e) {
      console.warn('Erro logAcesso:', e);
    }

    // LocalStorage fallback para logs
    try {
      const logs = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_LOGS) || '[]');
      logs.push({
        ...logData,
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
        criado_em: new Date().toISOString()
      });
      localStorage.setItem(LOCAL_STORAGE_KEY_LOGS, JSON.stringify(logs));
    } catch (err) {
      console.error('Erro ao salvar log localmente:', err);
    }
  },

  /**
   * Busca todas as fichas com suporte a filtros e refrações.
   */
  async getFichas(filters?: { clienteId?: string; status?: string; lojaId?: string }): Promise<FichaMedica[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('fichas_medicas').select(`
          *,
          refracoes (*),
          cliente:clientes ( id, nome, whatsapp, cpf )
        `).order('criado_em', { ascending: false });

        if (filters?.clienteId) query = query.eq('cliente_id', filters.clienteId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.lojaId) query = query.eq('loja_id', filters.lojaId);

        const { data, error } = await query;
        if (!error && data) {
          const fichas = data as FichaMedica[];
          // Anexar refrações caso a query Postgres relacional direta não tenha feito o join
          const fichasSemRefracoes = fichas.filter(f => !f.refracoes || f.refracoes.length === 0);
          if (fichasSemRefracoes.length > 0) {
            const ids = fichasSemRefracoes.map(f => f.id);
            const { data: todasRefracoes } = await supabase.from('refracoes').select('*').in('ficha_id', ids);
            if (todasRefracoes && Array.isArray(todasRefracoes)) {
              for (const f of fichas) {
                if (!f.refracoes || f.refracoes.length === 0) {
                  f.refracoes = todasRefracoes.filter((r: any) => r.ficha_id === f.id);
                }
              }
            }
          }
          return fichas;
        }
        console.warn('Erro no Supabase getFichas, usando fallback local:', error);
      } catch (e) {
        console.error('Erro getFichas Supabase:', e);
      }
    }

    // Fallback LocalStorage
    let fichas: FichaMedica[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_FICHAS) || '[]');
    if (filters?.clienteId) fichas = fichas.filter(f => f.cliente_id === filters.clienteId);
    if (filters?.status) fichas = fichas.filter(f => f.status === filters.status);
    if (filters?.lojaId) fichas = fichas.filter(f => f.loja_id === filters.lojaId);
    return fichas.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
  },

  /**
   * Busca uma ficha por ID com refrações e logs vinculados.
   */
  async getFichaById(id: string, usuarioNome?: string): Promise<FichaMedica | null> {
    let ficha: FichaMedica | null = null;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('fichas_medicas')
          .select(`
            *,
            refracoes (*),
            cliente:clientes (*)
          `)
          .eq('id', id)
          .single();

        if (!error && data) {
          ficha = data as FichaMedica;
          if (!ficha.refracoes || ficha.refracoes.length === 0) {
            const { data: refs } = await supabase.from('refracoes').select('*').eq('ficha_id', id);
            if (refs && Array.isArray(refs)) {
              ficha.refracoes = refs;
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao buscar ficha por ID no Supabase:', e);
      }
    }

    if (!ficha) {
      const fichas: FichaMedica[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_FICHAS) || '[]');
      ficha = fichas.find(f => f.id === id) || null;
    }

    if (ficha && usuarioNome) {
      // Registra acesso ao visualizar detalhes
      await this.logAcesso({
        ficha_id: ficha.id,
        cliente_id: ficha.cliente_id,
        usuario_nome: usuarioNome,
        acao: 'visualizacao',
        detalhes: `Visualizou prontuário de ${ficha.nome} (Status: ${ficha.status})`
      });
    }

    return ficha;
  },

  /**
   * Salva ou atualiza uma ficha médica em RASCUNHO.
   */
  async saveRascunho(
    fichaData: Partial<FichaMedica>,
    refracaoOD: Refracao,
    refracaoOE: Refracao
  ): Promise<FichaMedica> {
    const id = fichaData.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9));
    const nowIso = new Date().toISOString();

    const payload: FichaMedica = {
      id,
      cliente_id: fichaData.cliente_id || '',
      loja_id: fichaData.loja_id || 'loja_principal',
      nome: fichaData.nome || '',
      telefone: fichaData.telefone || '',
      cpf: fichaData.cpf || '',
      genero: fichaData.genero || 'N/I',
      data_nascimento: fichaData.data_nascimento || '',
      motivo_consulta: fichaData.motivo_consulta || '',
      atendido_por: fichaData.atendido_por || 'Optometrista Responsável',
      data_exame: fichaData.data_exame || new Date().toISOString().substring(0, 10),
      validade_receita: fichaData.validade_receita || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      status: 'rascunho',
      ficha_pai_id: fichaData.ficha_pai_id || null,
      tipo: fichaData.tipo || 'original',
      criado_em: fichaData.criado_em || nowIso,
      atualizado_em: nowIso,
      refracoes: [
        { ...refracaoOD, olho: 'OD', ficha_id: id },
        { ...refracaoOE, olho: 'OE', ficha_id: id }
      ]
    };

    if (isSupabaseConfigured()) {
      try {
        // Upsert Ficha
        const { data: insertedFicha, error: errFicha } = await supabase
          .from('fichas_medicas')
          .upsert([{
            id: payload.id,
            cliente_id: payload.cliente_id,
            loja_id: payload.loja_id,
            nome: payload.nome,
            telefone: payload.telefone,
            cpf: payload.cpf,
            genero: payload.genero,
            data_nascimento: payload.data_nascimento,
            motivo_consulta: payload.motivo_consulta,
            atendido_por: payload.atendido_por,
            data_exame: payload.data_exame,
            validade_receita: payload.validade_receita,
            status: 'rascunho',
            ficha_pai_id: payload.ficha_pai_id,
            tipo: payload.tipo,
            atualizado_em: nowIso
          }])
          .select()
          .single();

        if (errFicha) throw errFicha;

        // Limpa e reinsere refrações
        await supabase.from('refracoes').delete().eq('ficha_id', id);
        await supabase.from('refracoes').insert([
          { ...refracaoOD, ficha_id: id, olho: 'OD' },
          { ...refracaoOE, ficha_id: id, olho: 'OE' }
        ]);

        return { ...insertedFicha, refracoes: payload.refracoes };
      } catch (e: any) {
        console.warn('Erro ao salvar rascunho no Supabase, mantendo LocalStorage:', e?.message || e);
      }
    }

    // LocalStorage Fallback
    const fichas: FichaMedica[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_FICHAS) || '[]');
    const existingIndex = fichas.findIndex(f => f.id === id);
    if (existingIndex >= 0) {
      fichas[existingIndex] = payload;
    } else {
      fichas.push(payload);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_FICHAS, JSON.stringify(fichas));
    return payload;
  },

  /**
   * Finaliza o Prontuário Médico tornando-o IMUTÁVEL e gerando a assinatura hash.
   */
  async finalizarFicha(
    id: string,
    usuarioNome: string,
    fichaData: Partial<FichaMedica>,
    refracaoOD: Refracao,
    refracaoOE: Refracao
  ): Promise<FichaMedica> {
    const finalizadaEm = new Date().toISOString();
    
    // Gerar hash de integridade
    const assinaturaHash = await generateAssinaturaHash(
      {
        cliente_id: fichaData.cliente_id || '',
        atendido_por: fichaData.atendido_por || usuarioNome,
        data_exame: fichaData.data_exame || finalizadaEm.substring(0, 10),
        validade_receita: fichaData.validade_receita || finalizadaEm.substring(0, 10),
        motivo_consulta: fichaData.motivo_consulta
      },
      refracaoOD,
      refracaoOE,
      finalizadaEm
    );

    const finalPayload: FichaMedica = {
      id,
      cliente_id: fichaData.cliente_id || '',
      loja_id: fichaData.loja_id || 'loja_principal',
      nome: fichaData.nome || '',
      telefone: fichaData.telefone || '',
      cpf: fichaData.cpf || '',
      genero: fichaData.genero || 'N/I',
      data_nascimento: fichaData.data_nascimento || '',
      motivo_consulta: fichaData.motivo_consulta || '',
      atendido_por: fichaData.atendido_por || usuarioNome,
      data_exame: fichaData.data_exame || finalizadaEm.substring(0, 10),
      validade_receita: fichaData.validade_receita || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      status: 'finalizada',
      finalizada_em: finalizadaEm,
      assinatura_hash: assinaturaHash,
      ficha_pai_id: fichaData.ficha_pai_id || null,
      tipo: fichaData.tipo || 'original',
      criado_em: fichaData.criado_em || finalizadaEm,
      atualizado_em: finalizadaEm,
      refracoes: [
        { ...refracaoOD, olho: 'OD', ficha_id: id },
        { ...refracaoOE, olho: 'OE', ficha_id: id }
      ]
    };

    if (isSupabaseConfigured()) {
      try {
        // Salva/Atualiza primeiro como rascunho se ainda não existir
        await this.saveRascunho(fichaData, refracaoOD, refracaoOE);

        // Transição para finalizada
        const { data: updated, error } = await supabase
          .from('fichas_medicas')
          .update({
            status: 'finalizada',
            finalizada_em: finalizadaEm,
            assinatura_hash: assinaturaHash,
            atendido_por: finalPayload.atendido_por,
            data_exame: finalPayload.data_exame,
            validade_receita: finalPayload.validade_receita
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        // Registrar log de finalização
        await this.logAcesso({
          ficha_id: id,
          cliente_id: finalPayload.cliente_id,
          usuario_nome: usuarioNome,
          acao: 'visualizacao',
          detalhes: `Prontuário Finalizado e Assinado (${assinaturaHash})`
        });

        return { ...updated, refracoes: finalPayload.refracoes };
      } catch (e: any) {
        console.warn('Erro ao finalizar ficha no Supabase:', e?.message || e);
      }
    }

    // LocalStorage Fallback
    const fichas: FichaMedica[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_FICHAS) || '[]');
    const existingIndex = fichas.findIndex(f => f.id === id);
    if (existingIndex >= 0) {
      fichas[existingIndex] = finalPayload;
    } else {
      fichas.push(finalPayload);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_FICHAS, JSON.stringify(fichas));

    await this.logAcesso({
      ficha_id: id,
      cliente_id: finalPayload.cliente_id,
      usuario_nome: usuarioNome,
      acao: 'visualizacao',
      detalhes: `Prontuário Finalizado e Assinado via LocalStorage (${assinaturaHash})`
    });

    return finalPayload;
  },

  /**
   * Cria uma Retificação por Adendo a partir de um prontuário pai já finalizado.
   * O prontuário original permanece 100% íntegro.
   */
  async criarRetificacao(
    fichaPaiId: string,
    dadosNovos: Partial<FichaMedica>,
    refracaoOD: Refracao,
    refracaoOE: Refracao,
    usuarioNome: string
  ): Promise<FichaMedica> {
    const fichaPai = await this.getFichaById(fichaPaiId);
    if (!fichaPai) throw new Error('Prontuário original não encontrado.');
    if (fichaPai.status !== 'finalizada') {
      throw new Error('Apenas prontuários finalizados podem receber retificação por adendo.');
    }

    const novaFicha: Partial<FichaMedica> = {
      cliente_id: fichaPai.cliente_id,
      loja_id: fichaPai.loja_id,
      nome: fichaPai.nome,
      telefone: fichaPai.telefone,
      cpf: fichaPai.cpf,
      genero: fichaPai.genero,
      data_nascimento: fichaPai.data_nascimento,
      motivo_consulta: dadosNovos.motivo_consulta || `Adendo/Retificação referente ao prontuário #${fichaPai.id.substring(0, 8)}`,
      atendido_por: dadosNovos.atendido_por || usuarioNome,
      data_exame: dadosNovos.data_exame || new Date().toISOString().substring(0, 10),
      validade_receita: dadosNovos.validade_receita || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      ficha_pai_id: fichaPaiId,
      tipo: 'retificacao'
    };

    const rascunhoCriado = await this.saveRascunho(novaFicha, refracaoOD, refracaoOE);
    
    await this.logAcesso({
      ficha_id: rascunhoCriado.id,
      cliente_id: fichaPai.cliente_id,
      usuario_nome: usuarioNome,
      acao: 'visualizacao',
      detalhes: `Criou Adendo/Retificação para o prontuário pai #${fichaPaiId.substring(0, 8)}`
    });

    return rascunhoCriado;
  },

  /**
   * Busca receitas cuja validade real esteja vencendo no período (para o Robô de Pós-Venda CRM).
   */
  async buscarReceitasVencendoReais(diasParaVencer: number = 30): Promise<FichaMedica[]> {
    const hoje = new Date();
    const dataLimite = new Date(hoje.getTime() + diasParaVencer * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    const hojeIso = hoje.toISOString().substring(0, 10);

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('fichas_medicas')
          .select(`
            *,
            cliente:clientes ( id, nome, whatsapp )
          `)
          .eq('status', 'finalizada')
          .gte('validade_receita', hojeIso)
          .lte('validade_receita', dataLimite)
          .order('validade_receita', { ascending: true });

        if (!error && data) return data as FichaMedica[];
      } catch (e) {
        console.warn('Erro ao buscar receitas vencendo no Supabase:', e);
      }
    }

    const fichas: FichaMedica[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_FICHAS) || '[]');
    return fichas.filter(f => 
      f.status === 'finalizada' &&
      f.validade_receita >= hojeIso &&
      f.validade_receita <= dataLimite
    );
  }
};

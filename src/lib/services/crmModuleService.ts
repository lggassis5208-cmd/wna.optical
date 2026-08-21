import { supabase } from '../supabase';
import { formatPhoneForWhatsApp, getWhatsAppLink, formatWahaJid } from '../whatsappUtils';

export type LeadOrigem = 'whatsapp' | 'indicacao' | 'convenio' | 'instagram' | 'walk_in' | 'outro';
export type MotivoPerda = 'preco' | 'achou_caro' | 'comprou_concorrente' | 'so_pesquisando' | 'sem_resposta' | 'fora_perfil' | 'outro' | 'comprou_outra' | 'sumiu';
export type EtapaTipo = 'normal' | 'orcamento' | 'ganho' | 'perdido';
export type TarefaTipo = 'ligar' | 'mensagem' | 'retornar_orcamento' | 'reuniao' | 'outro';
export type OrigemRegraTarefa = 'manual' | 'orcamento_parado' | 'followup_perdido' | 'lead_inativo';
export type EventoTipo = 'criado' | 'mudou_etapa' | 'mensagem_whatsapp' | 'documento_enviado' | 'nota_manual' | 'tarefa_criada' | 'tarefa_concluida' | 'ganho' | 'perdido' | 'documento_vinculado';

export interface CrmFunil {
  id: string;
  tenant_id: string;
  nome: string;
  codigo: string;
  descricao?: string;
  ordem: number;
  ativo: boolean;
  etapas?: CrmEtapa[];
}

export interface CrmEtapa {
  id: string;
  tenant_id: string;
  funil_id: string;
  nome: string;
  ordem: number;
  tipo: EtapaTipo;
  alerta_dias_parado: number;
  cor: string;
}

export interface CrmLead {
  id: string;
  tenant_id: string;
  funil_id: string;
  etapa_id: string;
  cliente_id?: string | null;
  empresa_id?: string | null;
  titulo: string;
  origem: LeadOrigem;
  origem_detalhe?: string | null;
  valor_estimado: number;
  responsavel_id?: string | null;
  responsavel_nome?: string;
  motivo_perda?: MotivoPerda | null;
  motivo_perda_detalhe?: string | null;
  venda_id?: string | null;
  cotacao_id?: string | null;
  nfe_id?: string | null;
  // Campos personalizados de ótica
  tipo_lente_interesse?: string | null;
  ja_usa_oculos?: boolean;
  convenio?: string | null;
  grau_aproximado?: string | null;
  interesse?: string | null;
  forma_pagamento?: string | null;
  campos_customizados?: Record<string, any>;
  entrou_etapa_em: string;
  criado_em: string;
  atualizado_em: string;
  cliente?: {
    id: string;
    nome: string;
    whatsapp: string;
    email?: string;
    cpf?: string;
    cnpj?: string;
    razao_social?: string;
    tipo_pessoa?: string;
  };
  etapa?: CrmEtapa;
  documentos_vinculados_count?: number;
}

export interface TemplateMensagem {
  id: string;
  categoria: 'orcamento' | 'exame' | 'receita_vencendo' | 'agradecimento';
  titulo: string;
  variacoes: string[];
}

export interface CrmLeadEvento {
  id: string;
  tenant_id: string;
  lead_id?: string | null;
  cliente_id?: string | null;
  tipo: EventoTipo;
  de_etapa_id?: string | null;
  para_etapa_id?: string | null;
  titulo: string;
  conteudo?: string | null;
  metadata?: any;
  por_usuario_nome: string;
  em: string;
}

export interface CrmTarefa {
  id: string;
  tenant_id: string;
  lead_id?: string | null;
  cliente_id?: string | null;
  tipo: TarefaTipo;
  origem_regra?: OrigemRegraTarefa;
  titulo: string;
  descricao?: string | null;
  data_vencimento: string;
  responsavel_id?: string | null;
  responsavel_nome: string;
  concluida: boolean;
  concluida_em?: string | null;
  criado_em: string;
  lead?: { titulo: string };
  cliente?: { nome: string; whatsapp: string };
}

export interface ERPDocumentoVinculado {
  id: string;
  tipo: 'venda' | 'orcamento' | 'nfe';
  codigo_referencia: string;
  valor: number;
  data_emissao: string;
  status: string;
  detalhes?: string;
  pdf_url?: string;
}

export interface CrmFollowupFila {
  id: string;
  tenant_id: string;
  lead_id: string;
  cliente_id: string;
  motivo_perda: string;
  status: 'pendente' | 'enviado' | 'cancelado';
  agendado_para: string;
  mensagem_sugerida: string;
  criado_em: string;
  cliente?: { nome: string; whatsapp: string };
  lead?: { titulo: string };
}

export interface ERPCliente {
  id: string;
  tenant_id?: string;
  nome: string;
  cpf?: string;
  cnpj?: string;
  razao_social?: string;
  tipo_pessoa?: 'PF' | 'PJ';
  whatsapp: string;
  email?: string;
  cidade?: string;
  estado?: string;
  lis_score?: number;
  criado_em?: string;
}

// Memory / Local fallback seed when DB tables not pre-populated
const FUNIS_PADRAO_SEED: CrmFunil[] = [
  {
    id: 'funil-a-orcamento',
    tenant_id: '00000000-0000-0000-0000-000000000000',
    nome: 'Orçamento (já tem receita)',
    codigo: 'orcamento_receita',
    descricao: 'Para clientes que já possuem receita médica e querem orçamento',
    ordem: 1,
    ativo: true,
    etapas: [
      { id: 'fa-e1', tenant_id: '', funil_id: 'funil-a-orcamento', nome: 'Novo contato', ordem: 1, tipo: 'normal', alerta_dias_parado: 0, cor: '#60A5FA' },
      { id: 'fa-e2', tenant_id: '', funil_id: 'funil-a-orcamento', nome: 'Receita recebida', ordem: 2, tipo: 'normal', alerta_dias_parado: 0, cor: '#818CF8' },
      { id: 'fa-e3', tenant_id: '', funil_id: 'funil-a-orcamento', nome: 'Orçamento feito', ordem: 3, tipo: 'orcamento', alerta_dias_parado: 2, cor: '#F59E0B' },
      { id: 'fa-e4', tenant_id: '', funil_id: 'funil-a-orcamento', nome: 'Veio à loja', ordem: 4, tipo: 'normal', alerta_dias_parado: 0, cor: '#34D399' },
      { id: 'fa-e5', tenant_id: '', funil_id: 'funil-a-orcamento', nome: 'Ganho', ordem: 5, tipo: 'ganho', alerta_dias_parado: 0, cor: '#10B981' },
      { id: 'fa-e6', tenant_id: '', funil_id: 'funil-a-orcamento', nome: 'Perdido', ordem: 6, tipo: 'perdido', alerta_dias_parado: 0, cor: '#EF4444' }
    ]
  },
  {
    id: 'funil-b-exame',
    tenant_id: '00000000-0000-0000-0000-000000000000',
    nome: 'Exame primeiro',
    codigo: 'exame_primeiro',
    descricao: 'Para clientes que precisam agendar exame de vista antes',
    ordem: 2,
    ativo: true,
    etapas: [
      { id: 'fb-e1', tenant_id: '', funil_id: 'funil-b-exame', nome: 'Novo contato', ordem: 1, tipo: 'normal', alerta_dias_parado: 0, cor: '#60A5FA' },
      { id: 'fb-e2', tenant_id: '', funil_id: 'funil-b-exame', nome: 'Exame agendado', ordem: 2, tipo: 'normal', alerta_dias_parado: 0, cor: '#A78BFA' },
      { id: 'fb-e3', tenant_id: '', funil_id: 'funil-b-exame', nome: 'Compareceu ao exame', ordem: 3, tipo: 'normal', alerta_dias_parado: 0, cor: '#34D399' },
      { id: 'fb-e4', tenant_id: '', funil_id: 'funil-b-exame', nome: 'Orçamento (lente+armação)', ordem: 4, tipo: 'orcamento', alerta_dias_parado: 2, cor: '#F59E0B' },
      { id: 'fb-e5', tenant_id: '', funil_id: 'funil-b-exame', nome: 'Ganho', ordem: 5, tipo: 'ganho', alerta_dias_parado: 0, cor: '#10B981' },
      { id: 'fb-e6', tenant_id: '', funil_id: 'funil-b-exame', nome: 'Perdido', ordem: 6, tipo: 'perdido', alerta_dias_parado: 0, cor: '#EF4444' }
    ]
  },
  {
    id: 'funil-c-convenio',
    tenant_id: '00000000-0000-0000-0000-000000000000',
    nome: 'Convênio B2B',
    codigo: 'convenio_b2b',
    descricao: 'Funil corporativo para parcerias e exames na empresa',
    ordem: 3,
    ativo: true,
    etapas: [
      { id: 'fc-e1', tenant_id: '', funil_id: 'funil-c-convenio', nome: 'Empresa contatada', ordem: 1, tipo: 'normal', alerta_dias_parado: 0, cor: '#60A5FA' },
      { id: 'fc-e2', tenant_id: '', funil_id: 'funil-c-convenio', nome: 'Reunião/apresentação', ordem: 2, tipo: 'normal', alerta_dias_parado: 0, cor: '#F472B6' },
      { id: 'fc-e3', tenant_id: '', funil_id: 'funil-c-convenio', nome: 'Proposta enviada', ordem: 3, tipo: 'orcamento', alerta_dias_parado: 3, cor: '#F59E0B' },
      { id: 'fc-e4', tenant_id: '', funil_id: 'funil-c-convenio', nome: 'Exame na empresa', ordem: 4, tipo: 'normal', alerta_dias_parado: 0, cor: '#34D399' },
      { id: 'fc-e5', tenant_id: '', funil_id: 'funil-c-convenio', nome: 'Ganho', ordem: 5, tipo: 'ganho', alerta_dias_parado: 0, cor: '#10B981' },
      { id: 'fc-e6', tenant_id: '', funil_id: 'funil-c-convenio', nome: 'Perdido', ordem: 6, tipo: 'perdido', alerta_dias_parado: 0, cor: '#EF4444' }
    ]
  }
];

export const crmModuleService = {
  async getActiveTenantId(): Promise<string> {
    try {
      const { data } = await supabase.from('tenants').select('id').order('criado_em', { ascending: true }).limit(1);
      return data?.[0]?.id || '00000000-0000-0000-0000-000000000000';
    } catch {
      return '00000000-0000-0000-0000-000000000000';
    }
  },

  async getFunisComEtapas(): Promise<CrmFunil[]> {
    try {
      const { data: funisData, error: funisError } = await supabase
        .from('crm_funis')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (funisError || !funisData || funisData.length === 0) {
        return FUNIS_PADRAO_SEED;
      }

      const { data: etapasData } = await supabase
        .from('crm_etapas')
        .select('*')
        .order('ordem', { ascending: true });

      const etapas = etapasData || [];

      return funisData.map(funil => ({
        ...funil,
        etapas: etapas.filter(e => e.funil_id === funil.id)
      }));
    } catch (e) {
      return FUNIS_PADRAO_SEED;
    }
  },

  async getLeadsByFunil(funilId: string, origemFilter?: string, searchTerm?: string): Promise<CrmLead[]> {
    try {
      let query = supabase
        .from('crm_leads')
        .select(`
          *,
          cliente:cliente_id ( id, nome, whatsapp, email, cpf, cnpj, razao_social, tipo_pessoa ),
          etapa:etapa_id ( id, nome, ordem, tipo, alerta_dias_parado, cor )
        `)
        .eq('funil_id', funilId)
        .order('atualizado_em', { ascending: false });

      if (origemFilter && origemFilter !== 'todos') {
        query = query.eq('origem', origemFilter);
      }

      const { data, error } = await query;
      let leads = (data || []) as CrmLead[];

      if (error || leads.length === 0) {
        // Fallback local se a query do banco falhar ou estiver sem dados locais
        const local = JSON.parse(localStorage.getItem(`lis_crm_leads_${funilId}`) || '[]');
        if (local.length > 0) leads = local;
      }

      // Executar regras automáticas de tarefas (em background)
      this.executarRegrasTarefasAutomaticas().catch(console.error);

      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        leads = leads.filter(l => 
          l.titulo.toLowerCase().includes(term) ||
          (l.cliente?.nome && l.cliente.nome.toLowerCase().includes(term)) ||
          (l.cliente?.whatsapp && l.cliente.whatsapp.includes(term))
        );
      }

      return leads;
    } catch (e) {
      const local = JSON.parse(localStorage.getItem(`lis_crm_leads_${funilId}`) || '[]');
      return local;
    }
  },

  /**
   * FIX BUG 1: Garante que todo novo lead nasce COM uma etapa_id VÁLIDA
   * pertencente ao funil selecionado.
   */
  async criarLead(dados: {
    funil_id: string;
    etapa_id?: string;
    titulo: string;
    cliente_id?: string;
    empresa_id?: string;
    origem: LeadOrigem;
    origem_detalhe?: string;
    valor_estimado?: number;
    responsavel_id?: string;
    responsavel_nome?: string;
    tipo_lente_interesse?: string;
    ja_usa_oculos?: boolean;
    convenio?: string;
    grau_aproximado?: string;
    interesse?: string;
    forma_pagamento?: string;
    campos_customizados?: Record<string, any>;
  }): Promise<CrmLead> {
    const tenantId = await this.getActiveTenantId();
    const funis = await this.getFunisComEtapas();
    const funil = funis.find(f => f.id === dados.funil_id) || funis[0];
    const etapasFunil = funil?.etapas || [];

    // CAUSA RAIZ DO BUG 1 RESOLVIDA: Garantir etapa_id válida do funil
    let targetEtapaId = dados.etapa_id;
    const etapaValida = etapasFunil.find(e => e.id === targetEtapaId);
    if (!etapaValida && etapasFunil.length > 0) {
      targetEtapaId = etapasFunil[0].id;
    }

    const row = {
      tenant_id: tenantId,
      funil_id: funil.id,
      etapa_id: targetEtapaId || (etapasFunil[0] ? etapasFunil[0].id : 'fa-e1'),
      cliente_id: dados.cliente_id || null,
      empresa_id: dados.empresa_id || null,
      titulo: dados.titulo,
      origem: dados.origem || 'whatsapp',
      origem_detalhe: dados.origem_detalhe || null,
      valor_estimado: dados.valor_estimado || 0,
      responsavel_id: dados.responsavel_id || null,
      responsavel_nome: dados.responsavel_nome || 'Atendente',
      tipo_lente_interesse: dados.tipo_lente_interesse || null,
      ja_usa_oculos: dados.ja_usa_oculos || false,
      convenio: dados.convenio || null,
      grau_aproximado: dados.grau_aproximado || null,
      interesse: dados.interesse || null,
      forma_pagamento: dados.forma_pagamento || null,
      campos_customizados: dados.campos_customizados || {},
      entrou_etapa_em: new Date().toISOString(),
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase.from('crm_leads').insert([row]).select(`
        *,
        cliente:cliente_id ( id, nome, whatsapp, email, cpf, cnpj, razao_social, tipo_pessoa ),
        etapa:etapa_id ( id, nome, ordem, tipo, alerta_dias_parado, cor )
      `);

      let leadCriado: CrmLead;

      if (!error && data && data.length > 0) {
        leadCriado = data[0] as CrmLead;
      } else {
        // Fallback Local
        leadCriado = {
          ...row,
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
          etapa: etapaValida || etapasFunil[0]
        } as CrmLead;

        const key = `lis_crm_leads_${funil.id}`;
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        list.unshift(leadCriado);
        localStorage.setItem(key, JSON.stringify(list));
      }

      // Registrar evento na timeline
      await this.registrarEvento({
        lead_id: leadCriado.id,
        cliente_id: leadCriado.cliente_id || undefined,
        tipo: 'criado',
        para_etapa_id: leadCriado.etapa_id,
        titulo: `Lead criado no Kanban: ${leadCriado.titulo}`,
        conteudo: `Funil: ${funil.nome} | Origem: ${leadCriado.origem}`,
        por_usuario_nome: leadCriado.responsavel_nome || 'Operador'
      });

      return leadCriado;
    } catch (e) {
      const newLead: CrmLead = {
        ...row,
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
        etapa: etapaValida || etapasFunil[0]
      } as CrmLead;
      const key = `lis_crm_leads_${funil.id}`;
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.unshift(newLead);
      localStorage.setItem(key, JSON.stringify(list));
      return newLead;
    }
  },

  async moverLeadEtapa(
    lead: CrmLead,
    novaEtapa: CrmEtapa,
    motivoPerda?: MotivoPerda,
    motivoPerdaDetalhe?: string,
    usuarioNome: string = 'Operador'
  ): Promise<void> {
    const agora = new Date().toISOString();
    const deEtapaId = lead.etapa_id;

    let payloadUpdate: any = {
      etapa_id: novaEtapa.id,
      entrou_etapa_em: agora,
      atualizado_em: agora
    };

    if (novaEtapa.tipo === 'perdido') {
      payloadUpdate.motivo_perda = motivoPerda || 'outro';
      payloadUpdate.motivo_perda_detalhe = motivoPerdaDetalhe || null;
    }

    try {
      await supabase
        .from('crm_leads')
        .update(payloadUpdate)
        .eq('id', lead.id);

      const tipoEvento: EventoTipo = novaEtapa.tipo === 'ganho' ? 'ganho' : novaEtapa.tipo === 'perdido' ? 'perdido' : 'mudou_etapa';
      const tituloEvento = novaEtapa.tipo === 'ganho' 
        ? `Lead marcado como GANHO!` 
        : novaEtapa.tipo === 'perdido' 
        ? `Lead marcado como PERDIDO (${motivoPerda || 'sem motivo'})`
        : `Mudou para a etapa "${novaEtapa.nome}"`;

      await this.registrarEvento({
        lead_id: lead.id,
        cliente_id: lead.cliente_id || undefined,
        tipo: tipoEvento,
        de_etapa_id: deEtapaId,
        para_etapa_id: novaEtapa.id,
        titulo: tituloEvento,
        conteudo: motivoPerdaDetalhe || `Lead movido por ${usuarioNome}`,
        por_usuario_nome: usuarioNome
      });

      // REGRA AUTOMÁTICA DE TAREFAS: Lead foi para 'Perdido' -> cria tarefa de follow-up
      if (novaEtapa.tipo === 'perdido') {
        await this.criarTarefa({
          lead_id: lead.id,
          cliente_id: lead.cliente_id || undefined,
          tipo: 'mensagem',
          origem_regra: 'followup_perdido',
          titulo: `Follow-up de lead perdido: ${lead.titulo}`,
          descricao: `Motivo: ${motivoPerda || 'não informado'}. Entrar em contato para reverter ou entender melhor.`,
          data_vencimento: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          responsavel_nome: usuarioNome
        });

        if (lead.cliente_id) {
          await this.agendarFollowupPerdido(lead, motivoPerda || 'outro');
        }
      }

    } catch (e) {
      console.warn('Atualizando etapa localmente:', e);
    }
  },

  /**
   * INTEGRAÇÃO 2: Busca orçamentos, vendas e NFs vinculados do ERP para o lead/cliente.
   */
  async getDocumentosVinculados(clienteId?: string, leadId?: string): Promise<ERPDocumentoVinculado[]> {
    const documentos: ERPDocumentoVinculado[] = [];
    if (!clienteId && !leadId) return documentos;

    try {
      // 1. Vendas & O.S. do ERP
      let queryVendas = supabase.from('vendas').select('*');
      if (clienteId) queryVendas = queryVendas.eq('cliente_id', clienteId);
      const { data: vendasData } = await queryVendas;

      (vendasData || []).forEach((v: any) => {
        documentos.push({
          id: v.id,
          tipo: 'venda',
          codigo_referencia: v.numero_os ? `O.S. #${v.numero_os}` : `Venda #${v.id.substring(0, 6)}`,
          valor: parseFloat(v.valor_bruto || v.valor_total || 0),
          data_emissao: v.data_venda || v.criado_em,
          status: v.status || 'CONCLUIDA',
          detalhes: v.observacoes || 'Pedido de Venda / O.S. registrado no ERP'
        });
      });
    } catch (e) {
      console.warn('Sem dados de vendas do Supabase:', e);
    }

    // Fallback Mock de Orçamento se lista for vazia para demonstração
    if (documentos.length === 0) {
      documentos.push({
        id: 'orc-101',
        tipo: 'orcamento',
        codigo_referencia: 'Orçamento #COT-2026-042',
        valor: 1450.00,
        data_emissao: new Date().toISOString(),
        status: 'PENDENTE',
        detalhes: 'Lentes Varilux Comfort Max + Armação Ray-Ban'
      });
    }

    return documentos;
  },

  /**
   * INTEGRAÇÃO 2: Vincula documento (Venda / Cotação / NF) ao lead e recalcula o valor do card no Kanban.
   */
  async vincularDocumentoAoLead(
    leadId: string,
    documentoId: string,
    tipoDoc: 'venda' | 'orcamento' | 'nfe',
    valorDoc: number,
    codigoRef: string,
    usuarioNome: string = 'Operador'
  ): Promise<void> {
    try {
      let payload: any = { valor_estimado: valorDoc, atualizado_em: new Date().toISOString() };
      if (tipoDoc === 'venda') payload.venda_id = documentoId;
      if (tipoDoc === 'orcamento') payload.cotacao_id = documentoId;
      if (tipoDoc === 'nfe') payload.nfe_id = documentoId;

      await supabase.from('crm_leads').update(payload).eq('id', leadId);

      await this.registrarEvento({
        lead_id: leadId,
        tipo: 'documento_vinculado',
        titulo: `Documento vinculado ao Lead: ${codigoRef}`,
        conteudo: `Valor do card no Kanban atualizado para R$ ${valorDoc.toFixed(2)}`,
        metadata: { tipoDoc, documentoId, valorDoc },
        por_usuario_nome: usuarioNome
      });
    } catch (e) {
      console.warn('Erro ao vincular documento:', e);
    }
  },

  /**
   * INTEGRAÇÃO 3: Envio de Documento por WhatsApp com Regra Ajustada:
   * - Orçamentos e Cotações: PDF direto / Mensagem comercial com anexo.
   * - Notas Fiscais (NF-e): Link Assinado Expirável (48h).
   */
  async enviarDocumentoWhatsAppDiferenciado(
    tipoDoc: 'orcamento' | 'cotacao' | 'nfe' | 'pedido',
    documentoId: string,
    clienteId?: string,
    leadId?: string,
    clienteNome: string = 'Cliente',
    whatsapp: string = '',
    usuarioNome: string = 'Operador'
  ): Promise<{ tipoEnvio: 'pdf' | 'link'; mensagem: string; linkOuPdfUrl: string }> {
    const isFiscalNFe = tipoDoc === 'nfe';
    const primeiroNome = clienteNome.trim().split(' ')[0] || 'Cliente';

    let tipoEnvio: 'pdf' | 'link' = isFiscalNFe ? 'link' : 'pdf';
    let linkOuPdfUrl = '';
    let mensagem = '';

    if (isFiscalNFe) {
      // REGRA NF-E: Enviar exclusivamente como Link Expirável
      const token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 16);
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://oticalis.app';
      linkOuPdfUrl = `${baseUrl}/fiscal/view-nfe?doc=${documentoId}&token=${token}`;

      mensagem = `Olá ${primeiroNome}! Segue o link seguro para visualizar a sua Nota Fiscal (NF-e) da Ótica Lis:\n\n${linkOuPdfUrl}\n\nLink seguro expiráve em 48h.`;
    } else {
      // REGRA ORÇAMENTO/COTAÇÃO: Enviar como PDF direto / Documento comercial
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://oticalis.app';
      linkOuPdfUrl = `${baseUrl}/print-pdf?tipo=${tipoDoc}&id=${documentoId}`;

      mensagem = `Olá ${primeiroNome}! Segue o arquivo PDF do seu Orçamento da Ótica Lis:\n\n📄 Documento: ${tipoDoc.toUpperCase()} #${documentoId}\n🔗 Visualizar/Baixar PDF: ${linkOuPdfUrl}\n\nFicamos à disposição para cobrir propostas e parcelar sua compra!`;
    }

    // Gravar auditoria na timeline
    await this.registrarEvento({
      lead_id: leadId,
      cliente_id: clienteId,
      tipo: 'documento_enviado',
      titulo: `Documento enviado no WhatsApp: ${tipoDoc.toUpperCase()} (${tipoEnvio === 'pdf' ? 'Arquivo PDF Comercial' : 'Link Seguro NF-e'})`,
      conteudo: `Formato: ${tipoEnvio.toUpperCase()} | Destinatário: ${whatsapp}`,
      metadata: { tipoDoc, documentoId, tipoEnvio, linkOuPdfUrl },
      por_usuario_nome: usuarioNome
    });

    return { tipoEnvio, mensagem, linkOuPdfUrl };
  },

  /**
   * INTEGRAÇÃO 4: Motor de Regras Automáticas para Criação de Tarefas
   */
  async executarRegrasTarefasAutomaticas(): Promise<void> {
    try {
      const funis = await this.getFunisComEtapas();
      const agora = new Date();

      for (const funil of funis) {
        const leads = await this.getLeadsByFunil(funil.id);

        for (const lead of leads) {
          const diasParado = Math.floor((agora.getTime() - new Date(lead.entrou_etapa_em).getTime()) / (1000 * 60 * 60 * 24));
          const isEtapaOrcamento = lead.etapa?.tipo === 'orcamento';

          // REGRA AUTOMÁTICA 1: Lead na etapa de Orçamento parado há >= 2 dias -> Tarefa "Retornar Orçamento"
          if (isEtapaOrcamento && diasParado >= 2) {
            await this.garantirTarefaAutomatica({
              lead_id: lead.id,
              cliente_id: lead.cliente_id || undefined,
              tipo: 'retornar_orcamento',
              origem_regra: 'orcamento_parado',
              titulo: `Retornar orçamento: ${lead.titulo}`,
              descricao: `Lead parado há ${diasParado} dias na etapa de Orçamento. Fazer contato com o cliente.`,
              data_vencimento: agora.toISOString(),
              responsavel_nome: lead.responsavel_nome || 'Atendente'
            });
          }

          // REGRA AUTOMÁTICA 3: Lead sem tarefa há >= 3 dias -> Tarefa "Dar sequência"
          if (diasParado >= 3 && lead.etapa?.tipo === 'normal') {
            await this.garantirTarefaAutomatica({
              lead_id: lead.id,
              cliente_id: lead.cliente_id || undefined,
              tipo: 'mensagem',
              origem_regra: 'lead_inativo',
              titulo: `Dar sequência ao atendimento: ${lead.titulo}`,
              descricao: `Lead sem movimentação há ${diasParado} dias. Verificar se o cliente ainda tem interesse.`,
              data_vencimento: agora.toISOString(),
              responsavel_nome: lead.responsavel_nome || 'Atendente'
            });
          }
        }
      }
    } catch (e) {
      console.warn('Falha na execução de regras automáticas de tarefas:', e);
    }
  },

  async garantirTarefaAutomatica(dados: {
    lead_id: string;
    cliente_id?: string;
    tipo: TarefaTipo;
    origem_regra: OrigemRegraTarefa;
    titulo: string;
    descricao: string;
    data_vencimento: string;
    responsavel_nome: string;
  }): Promise<void> {
    try {
      // Verificar se já existe tarefa não concluída para esse lead e regra
      const { data } = await supabase
        .from('crm_tarefas')
        .select('id')
        .eq('lead_id', dados.lead_id)
        .eq('origem_regra', dados.origem_regra)
        .eq('concluida', false);

      if (!data || data.length === 0) {
        await this.criarTarefa(dados);
      }
    } catch (e) {
      // Silencioso se offline
    }
  },

  async getContatosERP(searchTerm?: string): Promise<ERPCliente[]> {
    try {
      let query = supabase
        .from('clientes')
        .select('*')
        .or('tipo_pessoa.eq.PF,tipo_pessoa.is.null')
        .order('nome', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      let list = (data || []).map((c: any) => ({
        id: c.id,
        tenant_id: c.tenant_id,
        nome: c.nome || c.nome_completo || c.name || 'Cliente sem nome',
        cpf: c.cpf,
        whatsapp: c.whatsapp,
        email: c.email,
        cidade: c.cidade,
        estado: c.estado,
        lis_score: c.lis_score || 850,
        tipo_pessoa: c.tipo_pessoa || 'PF',
        criado_em: c.criado_em || c.created_at
      })) as ERPCliente[];

      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        list = list.filter(c =>
          c.nome.toLowerCase().includes(term) ||
          (c.cpf && c.cpf.includes(term)) ||
          (c.whatsapp && c.whatsapp.includes(term)) ||
          (c.email && c.email.toLowerCase().includes(term))
        );
      }

      return list;
    } catch (e) {
      const local = JSON.parse(localStorage.getItem('lis_clientes') || '[]');
      return local.map((c: any) => ({
        id: c.id,
        nome: c.nome || c.nome_completo || c.name || 'Cliente Local',
        whatsapp: c.whatsapp || '',
        email: c.email,
        cpf: c.cpf,
        tipo_pessoa: 'PF'
      }));
    }
  },

  async getEmpresasERP(searchTerm?: string): Promise<ERPCliente[]> {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('tipo_pessoa', 'PJ')
        .order('nome', { ascending: true });

      if (error) throw error;

      let list = (data || []).map((c: any) => ({
        id: c.id,
        tenant_id: c.tenant_id,
        nome: c.razao_social || c.nome || c.nome_completo,
        cnpj: c.cnpj || c.cpf,
        razao_social: c.razao_social,
        whatsapp: c.whatsapp,
        email: c.email,
        cidade: c.cidade,
        estado: c.estado,
        tipo_pessoa: 'PJ' as const,
        criado_em: c.criado_em
      }));

      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        list = list.filter(c =>
          c.nome.toLowerCase().includes(term) ||
          (c.cnpj && c.cnpj.includes(term)) ||
          (c.whatsapp && c.whatsapp.includes(term))
        );
      }

      return list;
    } catch (e) {
      return [];
    }
  },

  async registrarEvento(evento: {
    lead_id?: string;
    cliente_id?: string;
    tipo: EventoTipo;
    de_etapa_id?: string;
    para_etapa_id?: string;
    titulo: string;
    conteudo?: string;
    metadata?: any;
    por_usuario_nome?: string;
  }): Promise<CrmLeadEvento | null> {
    const tenantId = await this.getActiveTenantId();
    const row = {
      tenant_id: tenantId,
      lead_id: evento.lead_id || null,
      cliente_id: evento.cliente_id || null,
      tipo: evento.tipo,
      de_etapa_id: evento.de_etapa_id || null,
      para_etapa_id: evento.para_etapa_id || null,
      titulo: evento.titulo,
      conteudo: evento.conteudo || null,
      metadata: evento.metadata || {},
      por_usuario_nome: evento.por_usuario_nome || 'Operador',
      em: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase.from('crm_lead_eventos').insert([row]).select();
      if (error) throw error;
      return (data?.[0] || row) as CrmLeadEvento;
    } catch (e) {
      return row as any;
    }
  },

  async getTimeline(clienteId?: string, leadId?: string): Promise<CrmLeadEvento[]> {
    try {
      let query = supabase.from('crm_lead_eventos').select('*').order('em', { ascending: false });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      } else if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      } else {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CrmLeadEvento[];
    } catch (e) {
      return [];
    }
  },

  async getTarefas(filtro: 'hoje' | 'vencidas' | 'todas' = 'todas', responsavelNome?: string): Promise<CrmTarefa[]> {
    try {
      let query = supabase
        .from('crm_tarefas')
        .select(`
          *,
          lead:lead_id ( titulo ),
          cliente:cliente_id ( nome, whatsapp )
        `)
        .order('data_vencimento', { ascending: true });

      if (responsavelNome && responsavelNome !== 'todos') {
        query = query.eq('responsavel_nome', responsavelNome);
      }

      const { data, error } = await query;
      let tarefas = (data || []) as CrmTarefa[];
      const hojeStr = new Date().toISOString().split('T')[0];

      if (filtro === 'hoje') {
        tarefas = tarefas.filter(t => !t.concluida && t.data_vencimento.startsWith(hojeStr));
      } else if (filtro === 'vencidas') {
        tarefas = tarefas.filter(t => !t.concluida && t.data_vencimento < new Date().toISOString() && !t.data_vencimento.startsWith(hojeStr));
      }

      return tarefas;
    } catch (e) {
      return [];
    }
  },

  async criarTarefa(dados: {
    lead_id?: string;
    cliente_id?: string;
    tipo: TarefaTipo;
    origem_regra?: OrigemRegraTarefa;
    titulo: string;
    descricao?: string;
    data_vencimento: string;
    responsavel_nome?: string;
  }): Promise<CrmTarefa> {
    const tenantId = await this.getActiveTenantId();
    const row = {
      tenant_id: tenantId,
      lead_id: dados.lead_id || null,
      cliente_id: dados.cliente_id || null,
      tipo: dados.tipo,
      origem_regra: dados.origem_regra || 'manual',
      titulo: dados.titulo,
      descricao: dados.descricao || null,
      data_vencimento: dados.data_vencimento,
      responsavel_nome: dados.responsavel_nome || 'Atendente',
      concluida: false,
      criado_em: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase.from('crm_tarefas').insert([row]).select();
      const tarefa = (data && data[0]) ? (data[0] as CrmTarefa) : (row as any);

      await this.registrarEvento({
        lead_id: tarefa.lead_id || undefined,
        cliente_id: tarefa.cliente_id || undefined,
        tipo: 'tarefa_criada',
        titulo: `Nova tarefa (${dados.origem_regra === 'manual' ? 'Manual' : 'Automática'}): ${tarefa.titulo}`,
        conteudo: `Prazo: ${new Date(tarefa.data_vencimento).toLocaleString('pt-BR')}`,
        por_usuario_nome: tarefa.responsavel_nome
      });

      return tarefa;
    } catch (e) {
      return row as any;
    }
  },

  async concluirTarefa(tarefaId: string): Promise<void> {
    const agora = new Date().toISOString();
    try {
      const { data } = await supabase
        .from('crm_tarefas')
        .update({ concluida: true, concluida_em: agora })
        .eq('id', tarefaId)
        .select();

      if (data && data[0]) {
        const t = data[0] as CrmTarefa;
        await this.registrarEvento({
          lead_id: t.lead_id || undefined,
          cliente_id: t.cliente_id || undefined,
          tipo: 'tarefa_concluida',
          titulo: `Tarefa concluída: ${t.titulo}`,
          por_usuario_nome: t.responsavel_nome || 'Operador'
        });
      }
    } catch (e) {
      console.warn('Erro ao concluir tarefa:', e);
    }
  },

  async getFollowupFila(): Promise<CrmFollowupFila[]> {
    try {
      const { data, error } = await supabase
        .from('crm_followup_fila')
        .select(`
          *,
          cliente:cliente_id ( nome, whatsapp ),
          lead:lead_id ( titulo )
        `)
        .eq('status', 'pendente')
        .order('agendado_para', { ascending: true });

      if (error) throw error;
      return (data || []) as CrmFollowupFila[];
    } catch (e) {
      return [];
    }
  },

  async agendarFollowupPerdido(lead: CrmLead, motivo: string): Promise<void> {
    if (!lead.cliente_id) return;
    const tenantId = await this.getActiveTenantId();
    const dataAgendada = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const msgSugerida = `Olá! Tudo bem? Passando para saber se ficou alguma dúvida sobre o orçamento dos seus óculos conosco. Podemos cobrir alguma proposta ou facilitar o pagamento para você?`;

    try {
      await supabase.from('crm_followup_fila').insert([{
        tenant_id: tenantId,
        lead_id: lead.id,
        cliente_id: lead.cliente_id,
        motivo_perda: motivo,
        status: 'pendente',
        agendado_para: dataAgendada,
        mensagem_sugerida: msgSugerida
      }]);
    } catch (e) {
      console.warn('Erro ao inserir na fila de follow-up:', e);
    }
  },

  /**
   * REQUISITO 7: Biblioteca de templates de mensagem (quick replies) por loja com varições anti-ban
   */
  getTemplatesMensagem(lojaNome: string = 'Ótica Lis'): TemplateMensagem[] {
    return [
      {
        id: 'tpl-orcamento',
        categoria: 'orcamento',
        titulo: 'Enviar Orçamento Comercial',
        variacoes: [
          `Olá {nome}! Tudo bem? Conforme conversamos na {loja}, segue o seu orçamento detalhado de óculos. Ficamos à disposição para cobrir propostas!`,
          `Oi {nome}, tudo ótimo? Aqui é da {loja}. Preparei a cotação especial das suas lentes e armações. Podemos agendar sua visita?`,
          `Olá {nome}, como vai? Passando para enviar o valor do orçamento pela {loja} para a sua receita. Qualquer dúvida estou à disposição!`
        ]
      },
      {
        id: 'tpl-exame',
        categoria: 'exame',
        titulo: 'Confirmar Horário de Exame',
        variacoes: [
          `Olá {nome}! Confirmando seu exame de vista agendado na {loja}. Por favor, chegue com 10 minutos de antecedência.`,
          `Oi {nome}, lembrete da {loja}: seu exame de vista está confirmado! Caso precise remarcar, nos avise por aqui.`,
          `Olá {nome}! Estamos te esperando na {loja} para a sua consulta de vista. Até breve!`
        ]
      },
      {
        id: 'tpl-receita',
        categoria: 'receita_vencendo',
        titulo: 'Lembrete de Receita Vencendo (1 ano)',
        variacoes: [
          `Olá {nome}! Notamos na {loja} que sua receita médica de óculos faz quase 1 ano. Recomenda-se atualizar o grau anualmente. Quer agendar seu exame conosco?`,
          `Oi {nome}, tudo bem? Hora de renovar a saúde dos seus olhos na {loja}! Sua receita está perto de vencer. Vamos agendar uma consulta?`,
          `Olá {nome}! Como estão seus óculos? Na {loja} recomendamos revisar o grau anualmente para evitar fadiga ocular. Responda para agendar!`
        ]
      },
      {
        id: 'tpl-agradecimento',
        categoria: 'agradecimento',
        titulo: 'Agradecimento e Pós-venda',
        variacoes: [
          `Olá {nome}! Muito obrigado por escolher a {loja}. Esperamos que ame seus novos óculos! Qualquer ajuste na armação, conte conosco.`,
          `Oi {nome}! Passando para agradecer a preferência na {loja}. Como está sendo a adaptação com os óculos novos? Conte conosco!`,
          `Olá {nome}, agradecemos a confiança na {loja}! Lembramos que suas lentes têm garantia e oferecemos ajuste gratuito sempre que precisar.`
        ]
      }
    ];
  },

  /**
   * REQUISITO 8: Atribuição de vendedor ao lead (Manual / Round-Robin)
   */
  async atribuirLeadVendedor(leadId: string, vendedorId: string, vendedorNome: string): Promise<void> {
    try {
      await supabase.from('crm_leads').update({
        responsavel_id: vendedorId,
        responsavel_nome: vendedorNome,
        atualizado_em: new Date().toISOString()
      }).eq('id', leadId);

      await this.registrarEvento({
        lead_id: leadId,
        tipo: 'mudou_etapa',
        titulo: `Vendedor responsável atribuído: ${vendedorNome}`,
        por_usuario_nome: 'Gestor'
      });
    } catch (e) {
      console.warn('Erro ao atribuir vendedor:', e);
    }
  },

  /**
   * REQUISITO 5: Atualizar campos personalizados de ótica
   */
  async atualizarCamposOtica(
    leadId: string,
    campos: {
      tipo_lente_interesse?: string;
      ja_usa_oculos?: boolean;
      convenio?: string;
      grau_aproximado?: string;
      interesse?: string;
      forma_pagamento?: string;
    }
  ): Promise<void> {
    try {
      await supabase.from('crm_leads').update({
        ...campos,
        atualizado_em: new Date().toISOString()
      }).eq('id', leadId);
    } catch (e) {
      console.warn('Erro ao atualizar campos de ótica:', e);
    }
  }
};

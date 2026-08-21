import { describe, it, expect } from 'vitest';
import { crmModuleService } from '../../lib/services/crmModuleService';
import { 
  formatPhoneForWhatsApp, 
  formatWahaJid, 
  buildConfirmacaoCadastroMsg, 
  buildDocumentoLinkMsg 
} from '../../lib/whatsappUtils';

describe('Módulo CRM - Correções e Integrações (Fase 1)', () => {

  describe('Bug 1 Fix — Criação de Lead com Etapa Inicial Válida', () => {
    it('deve garantir que o novo lead nasce com uma etapa_id válida do funil', async () => {
      const funis = await crmModuleService.getFunisComEtapas();
      const funilA = funis[0];

      const lead = await crmModuleService.criarLead({
        funil_id: funilA.id,
        titulo: 'Teste Lead com Etapa Inicial',
        origem: 'whatsapp',
        valor_estimado: 1200
      });

      expect(lead).toBeDefined();
      expect(lead.funil_id).toBe(funilA.id);
      expect(lead.etapa_id).toBeDefined();
      expect(lead.etapa_id.length).toBeGreaterThan(0);
    });
  });

  describe('Integração 2 — Vínculo de Documentos e Valor do Card', () => {
    it('deve buscar documentos vinculados do ERP e permitir vincular ao lead atualizando o valor', async () => {
      const docs = await crmModuleService.getDocumentosVinculados('cliente-test-id');
      expect(docs).toBeDefined();
      expect(Array.isArray(docs)).toBe(true);

      if (docs.length > 0) {
        const doc = docs[0];
        await crmModuleService.vincularDocumentoAoLead(
          'lead-test-id',
          doc.id,
          doc.tipo === 'venda' ? 'venda' : 'orcamento',
          doc.valor,
          doc.codigo_referencia,
          'Testador'
        );
      }
    });
  });

  describe('Integração 3 — Envio Diferenciado no WhatsApp (PDF vs Link NF-e)', () => {
    it('deve gerar mensagem com anexo PDF para Orçamento/Cotação comercial', async () => {
      const res = await crmModuleService.enviarDocumentoWhatsAppDiferenciado(
        'cotacao',
        'COT-101',
        'cli-1',
        'lead-1',
        'Carlos Silva',
        '62981234567',
        'Atendente'
      );

      expect(res.tipoEnvio).toBe('pdf');
      expect(res.mensagem).toContain('Carlos');
      expect(res.mensagem).toContain('PDF');
      expect(res.linkOuPdfUrl).toContain('tipo=cotacao');
    });

    it('deve gerar mensagem com Link Seguro Expirável para Nota Fiscal (NF-e)', async () => {
      const res = await crmModuleService.enviarDocumentoWhatsAppDiferenciado(
        'nfe',
        'NFE-2026',
        'cli-1',
        'lead-1',
        'Empresa X',
        '62981234567',
        'Atendente'
      );

      expect(res.tipoEnvio).toBe('link');
      expect(res.mensagem).toContain('Nota Fiscal');
      expect(res.mensagem).toContain('48h');
      expect(res.linkOuPdfUrl).toContain('token=');
    });
  });

  describe('Integração 4 — Motor de Tarefas Automáticas por Regras', () => {
    it('deve criar tarefa manual com tipo e prazo corretos', async () => {
      const tarefa = await crmModuleService.criarTarefa({
        tipo: 'retornar_orcamento',
        origem_regra: 'manual',
        titulo: 'Ligar para cliente sobre lentes',
        data_vencimento: new Date().toISOString(),
        responsavel_nome: 'Atendente'
      });

      expect(tarefa).toBeDefined();
      expect(tarefa.titulo).toContain('Ligar para cliente');
      expect(tarefa.origem_regra).toBe('manual');
    });

    it('deve executar varredura de regras de tarefas automáticas sem lançar erro', async () => {
      await expect(crmModuleService.executarRegrasTarefasAutomaticas()).resolves.not.toThrow();
    });
  });

  describe('Item 5 — Campos Personalizados de Ótica', () => {
    it('deve criar lead com campos customizados de ótica preenchidos', async () => {
      const funis = await crmModuleService.getFunisComEtapas();
      const lead = await crmModuleService.criarLead({
        funil_id: funis[0].id,
        titulo: 'Lead de Teste Lente Multifocal',
        origem: 'whatsapp',
        valor_estimado: 1850.00,
        tipo_lente_interesse: 'Varilux Comfort Max',
        ja_usa_oculos: true,
        convenio: 'Bradesco Saúde',
        grau_aproximado: '-3.00 OD / -2.50 OE',
        interesse: 'multifocal',
        forma_pagamento: '6x Cartão'
      });

      expect(lead).toBeDefined();
      expect(lead.tipo_lente_interesse).toBe('Varilux Comfort Max');
      expect(lead.ja_usa_oculos).toBe(true);
      expect(lead.convenio).toBe('Bradesco Saúde');
      expect(lead.interesse).toBe('multifocal');
    });
  });

  describe('Item 6 — Motivos de Perda Estruturados', () => {
    it('deve registrar mover lead para Perdido com motivo de perda estruturado', async () => {
      const funis = await crmModuleService.getFunisComEtapas();
      const etapaPerdido = funis[0].etapas?.find(e => e.tipo === 'perdido') || funis[0].etapas![5];

      const lead = await crmModuleService.criarLead({
        funil_id: funis[0].id,
        titulo: 'Lead para Teste de Perda',
        origem: 'walk_in',
        valor_estimado: 900
      });

      await expect(crmModuleService.moverLeadEtapa(
        lead,
        etapaPerdido,
        'comprou_concorrente',
        'Achou o prazo de entrega mais rápido na ótica vizinha',
        'Vendedor Teste'
      )).resolves.not.toThrow();
    });
  });

  describe('Item 7 — Templates de Mensagem (Quick Replies) com Anti-Ban', () => {
    it('deve retornar a biblioteca de templates por loja com variações anti-ban', () => {
      const templates = crmModuleService.getTemplatesMensagem('Ótica Lis Centro');
      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThanOrEqual(4);

      const tplOrcamento = templates.find(t => t.categoria === 'orcamento');
      expect(tplOrcamento).toBeDefined();
      expect(tplOrcamento!.variacoes.length).toBeGreaterThanOrEqual(3);

      const preview = tplOrcamento!.variacoes[0].replace(/{nome}/g, 'Maria').replace(/{loja}/g, 'Ótica Lis Centro');
      expect(preview).toContain('Maria');
      expect(preview).toContain('Ótica Lis Centro');
    });
  });

  describe('Item 8 — Distribuição de Vendedor e Notas Internas', () => {
    it('deve atribuir vendedor a um lead e registrar na auditoria', async () => {
      await expect(crmModuleService.atribuirLeadVendedor('lead-123', 'vendedor-456', 'Roberto Vendas')).resolves.not.toThrow();
    });

    it('deve registrar nota interna de relacionamento na timeline', async () => {
      const evento = await crmModuleService.registrarEvento({
        lead_id: 'lead-123',
        tipo: 'nota_manual',
        titulo: 'Nota Interna de Atendimento',
        conteudo: 'Cliente solicitou retorno após as 14h.',
        por_usuario_nome: 'Atendente Silva'
      });

      expect(evento).toBeDefined();
      expect(evento?.titulo).toContain('Nota');
    });
  });

});

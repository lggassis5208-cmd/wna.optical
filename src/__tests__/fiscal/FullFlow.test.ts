import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../../lib/storage';
import { SefazService } from '../../lib/sefazService';

describe('Bateria de Testes E2E - Fluxo Completo (Ótica Lìs)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('deve realizar o fluxo completo: abrir caixa, cadastrar cliente, cadastrar produto, registrar venda O.S., emitir nota e registrar impressões na timeline', async () => {
    // 1. Abrir caixa
    const caixa = await storage.abrirCaixa(200.0);
    expect(caixa).toBeDefined();
    expect(caixa.status).toBe('ABERTO');
    expect(caixa.saldo_inicial).toBe(200.0);

    // 2. Cadastrar cliente
    const client = await storage.saveClient({
      nome_completo: 'Julio de Castilhos E2E Test',
      cpf: '987.654.321-99',
      whatsapp: '62988887777',
    });
    expect(client.id).toBeDefined();
    expect(client.nome_completo).toBe('Julio de Castilhos E2E Test');

    // 3. Cadastrar produto
    const product = await storage.saveProduct({
      nome: 'Lente Filtro Azul BlueCut',
      categoria: 'Lente',
      material: 'Resina 1.60',
      preco_venda: 350.00,
      preco_custo: 150.00,
      estoque: 5,
      stock_minimo: 1,
      unidade: 'Par'
    });
    expect(product.id).toBeDefined();
    expect(product.preco_venda).toBe(350.00);

    // 4. Registrar venda (O.S.)
    const saleData = {
      cliente_id: client.id,
      cliente_nome: client.nome_completo,
      paciente_cpf: client.cpf,
      paciente_whatsapp: client.whatsapp,
      tecnico: 'Auditor Vitest',
      tipo_lente: 'Filtro Azul',
      tratamento: 'BlueCut',
      od_esferico: -1.0,
      od_cilindrico: 0.0,
      od_eixo: 0,
      oe_esferico: -1.0,
      oe_cilindrico: 0.0,
      oe_eixo: 0,
      valor_base: 350.00,
      desconto: 0,
      valor_total: 350.00,
      forma_pagamento: 'Pix',
      criado_em: new Date().toISOString()
    };
    const sale = await storage.registrarVenda(saleData);
    expect(sale.id).toBeDefined();
    expect(sale.os_number).toBeDefined();
    expect(sale.valor_total).toBe(350.00);

    // 5. Emitir nota fiscal simulada
    const result = await SefazService.emitirNotaFiscal(sale);
    expect(result.sucesso).toBe(true);
    expect(result.chave_acesso).toHaveLength(44);

    // 6. Registrar Nota Fiscal no storage fiscal
    const notaFaturamento = {
      cliente: client.nome_completo,
      cliente_doc: client.cpf,
      valor_total: 350.00,
      itens: [{
        produto_nome: `O.S. ${sale.os_number} - Lente Filtro Azul`,
        quantidade: 1,
        valor_unitario: 350.00,
        ncm: '90031100'
      }],
      status: 'EMITIDA',
      natureza: 'Venda de Mercadoria',
      cfop: '5102',
      chave_acesso: result.chave_acesso,
      danfe_url: result.danfe_url,
      protocolo: result.protocolo,
      xml: result.xml,
      venda_id: sale.id
    };
    
    const novaNota = await storage.saveNotaFiscal(notaFaturamento);
    expect(novaNota.id).toBeDefined();
    expect(novaNota.status).toBe('EMITIDA');

    // 7. Simular ações de impressão na timeline
    await storage.registrarAcaoNotaFiscal(novaNota.id, 'Emissão e autorização da nota fiscal');
    await storage.registrarAcaoNotaFiscal(novaNota.id, 'Impressão do DANFE (NF-e modelo 55)');
    await storage.registrarAcaoNotaFiscal(novaNota.id, 'Impressão do cupom fiscal (NFC-e modelo 65)');
    await storage.registrarAcaoNotaFiscal(novaNota.id, 'Impressão do comprovante de venda interno');

    // 8. Recuperar nota do storage e validar a timeline
    const notas = await storage.getNotasFiscais();
    const finalNota = notas.find((n: any) => n.id === novaNota.id);
    
    expect(finalNota).toBeDefined();
    expect(finalNota.timeline).toHaveLength(4);
    expect(finalNota.timeline[0].acao).toBe('Emissão e autorização da nota fiscal');
    expect(finalNota.timeline[1].acao).toBe('Impressão do DANFE (NF-e modelo 55)');
    expect(finalNota.timeline[2].acao).toBe('Impressão do cupom fiscal (NFC-e modelo 65)');
    expect(finalNota.timeline[3].acao).toBe('Impressão do comprovante de venda interno');
  }, 20000);
});

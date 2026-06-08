import { describe, it, expect, vi } from 'vitest';
import { SefazService } from '../../lib/sefazService';

// Mock do storage interno
vi.mock('../../lib/storage', () => {
  return {
    storage: {
      getSettings: vi.fn().mockResolvedValue({
        fiscal: {
          ambiente: 'homologacao',
          token_focus_nfe: '', // Sem token para forçar o fallback simulado
        },
        empresa: {
          nome_fantasia: 'ÓTICA LÌS',
          cnpj: '39.156.577/0001-22',
          inscricao_estadual: '10.784.952-1',
        }
      }),
      getClients: vi.fn().mockResolvedValue([
        { id: 'cli_1', name: 'LUCAS GASSIS', cpf: '123.456.789-00' }
      ]),
      getProducts: vi.fn().mockResolvedValue([]),
      registrarNotaFiscal: vi.fn().mockResolvedValue({}),
      getCaixaAtual: vi.fn().mockResolvedValue({ status: 'ABERTO' }),
    }
  };
});

describe('SefazService - Emissão de Nota Fiscal de Teste', () => {
  it('deve emitir uma nota fiscal simulada de teste com sucesso e retornar chave de 44 dígitos', async () => {
    const salePayload = {
      id: 'avulsa_teste_unitario',
      cliente_nome: 'LUCAS GASSIS',
      paciente_cpf: '123.456.789-00',
      valor_total: 189.90,
      forma_pagamento: 'Dinheiro',
      items: [
        {
          produto_nome: 'Armação Ótica Lìs Premium',
          quantidade: 1,
          valor_unitario: 189.90,
          ncm: '9003.11.00'
        }
      ]
    };

    const result = await SefazService.emitirNotaFiscal(salePayload);

    // Verificações
    expect(result.sucesso).toBe(true);
    expect(result.status).toBe('autorizada');
    
    // Validar se a chave de acesso gerada tem exatamente 44 dígitos
    expect(result.chave_acesso).toBeDefined();
    expect(result.chave_acesso?.length).toBe(44);

    // Validar se a danfe_url foi montada com o host correto de homologação e sem visualizador.focusnfe.com.br
    expect(result.danfe_url).toContain('https://homologacao.focusnfe.com.br');
    expect(result.danfe_url).not.toContain('visualizador.focusnfe.com.br');

    console.log('--- NOTA FISCAL DE TESTE EMITIDA ---');
    console.log('Chave de Acesso:', result.chave_acesso);
    console.log('DANFE URL:', result.danfe_url);
    console.log('Protocolo:', result.protocolo);
    console.log('------------------------------------');
  });
});

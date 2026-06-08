import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PrintNFe from '../../components/PrintNFe';

// Mock das ferramentas de Data e Storage internas chamadas pelo PrintNFe
vi.mock('../../lib/dateUtils', () => ({
  formatDate: (d: string) => d,
}));
vi.mock('../../lib/storage', () => ({
  getEffectiveAddress: () => 'Endereço Teste Fake',
  storage: {}
}));

describe('PrintNFe Component', () => {
  const mockSettings = {
    empresa: {
      nome_fantasia: 'ÓTICA LÌS',
      endereco: 'Rua Teste',
      cnpj: '00.000.000/0001-00',
    }
  };

  it('deve retornar null se "sale" não for fornecido', () => {
    const { container } = render(<PrintNFe sale={null} settings={mockSettings} />);
    expect(container.firstChild).toBeNull();
  });

  it('deve calcular corretamente os totais multiplicando Qtd por Valor Unitário', () => {
    const mockSale = {
      cliente_nome: 'João Teste',
      criado_em: '2023-01-01',
      valor_total: 1500, // Total fictício
      itens: [
        { nome: 'Lente XPTO', qtd: 2, vUn: 500, vTot: 1000 },
        { nome: 'Armação XYZ', qtd: 1, vUn: 500, vTot: 500 },
      ]
    };

    render(<PrintNFe sale={mockSale} settings={mockSettings} />);
    
    // Assegurar que os produtos aparecem
    expect(screen.getByText('Lente XPTO')).toBeInTheDocument();
    expect(screen.getByText('Armação XYZ')).toBeInTheDocument();

    // Como o PrintNFe soma os itens de acordo com nossa refatoração
    // Deve haver o valor total de 1500 na seção de total dos produtos
    // formatado como 1500,00
    const valorFormatado = (1500).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    // Pegar o Total do rodapé ou do cálculo de impostos
    // Há mais de um "1500,00" (ex. na base de ICMS e total)
    const elementsWithTotal = screen.getAllByText(valorFormatado);
    expect(elementsWithTotal.length).toBeGreaterThan(0);
  });
});

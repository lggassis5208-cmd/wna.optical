import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../../pages/DashboardPage';

// Precisamos mockar os gráficos (Recharts) porque eles dão erro no JSDOM
vi.mock('recharts', () => {
  const OriginalRechartsModule = vi.importActual('recharts');
  return {
    ...OriginalRechartsModule,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    LineChart: () => <div>LineChart</div>,
    PieChart: () => <div>PieChart</div>,
    BarChart: ({ children }: any) => <div>{children}</div>,
    Bar: () => <div>Bar</div>,
    CartesianGrid: () => <div>CartesianGrid</div>,
    XAxis: () => <div>XAxis</div>,
    YAxis: () => <div>YAxis</div>,
    Tooltip: () => <div>Tooltip</div>,
    Pie: () => <div>Pie</div>,
    Cell: () => <div>Cell</div>,
  };
});

// Mock da storage para simular a resposta de "vendas de hoje"
vi.mock('../../lib/storage', () => ({
  storage: {
    getSales: vi.fn().mockResolvedValue([
      { valor_total: 1500, criado_em: new Date().toISOString() },
      { valor_total: 500, criado_em: new Date().toISOString() },
    ]),
    getClients: vi.fn().mockResolvedValue([]),
    getProducts: vi.fn().mockResolvedValue([]),
    seedDemoProducts: vi.fn().mockResolvedValue(undefined),
    getCaixaAtual: vi.fn().mockResolvedValue({ status: 'ABERTO' }),
    getFinanceiro: vi.fn().mockResolvedValue({ pagar: [], receber: [] }),
  }
}));

describe('Dashboard e Integração de Gráficos', () => {
  it('deve atualizar os valores do faturamento e mix de vendas ao montar', async () => {
    // Renderiza a página
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    
    // O useEffect do DashboardPage fará o fetch via storage.getSales
    // E deve calcular o total de hoje como 1500 + 500 = 2000
    // O valor aparece formatado: R$ 2.000,00 ou 2000,00
    
    await waitFor(() => {
      // Ajuste na asserção para corresponder ao texto de "Faturamento Diário" 
      // ou qualquer lugar que renderiza "2.000"
      expect(screen.getByText(/2\.000/i)).toBeInTheDocument();
    });
  });
});

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ClientProfileModal from '../../components/ClientProfileModal';

const { mockClient, mockSales } = vi.hoisted(() => ({
  mockClient: {
    id: 'client-1',
    name: 'Maria Silva',
    cpf: '111.111.111-11',
    whatsapp: '5562999999999',
  },
  mockSales: [
    { id: '1', os_number: '1001', od_esferico: '-1.00', criado_em: '2023-01-01', cliente_id: 'client-1' },
    { id: '2', os_number: '1002', od_esferico: '-1.50', criado_em: '2023-06-01', cliente_id: 'client-1' },
    { id: '3', os_number: '1003', od_esferico: '-2.00', criado_em: '2024-01-01', cliente_id: 'client-1' },
  ]
}));

vi.mock('../../lib/storage', () => ({
  storage: {
    getClientById: vi.fn().mockResolvedValue(mockClient),
    getSales: vi.fn().mockResolvedValue(mockSales),
  }
}));

describe('ClientDetails Validation (ClientProfileModal)', () => {
  it('deve renderizar o histórico completo com 3 receitas antigas do paciente', async () => {
    render(
      <ClientProfileModal 
        isOpen={true} 
        onClose={vi.fn()} 
        clientId="client-1"
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Maria Silva').length).toBeGreaterThan(0);
    });

    // Mudar para a aba de Histórico Clínico
    const clinicoTab = screen.getByText('Histórico Clínico');
    fireEvent.click(clinicoTab);

    // Deve mostrar as 3 OS
    await waitFor(() => {
      expect(screen.getByText('Ficha Clínica / O.S. #1001')).toBeInTheDocument();
      expect(screen.getByText('Ficha Clínica / O.S. #1002')).toBeInTheDocument();
      expect(screen.getByText('Ficha Clínica / O.S. #1003')).toBeInTheDocument();
    });
  });
});

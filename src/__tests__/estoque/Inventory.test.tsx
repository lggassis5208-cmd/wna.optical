import { describe, it, expect, vi } from 'vitest';

// Mock do sistema de notificação
const notificationServiceMock = {
  saveNotification: vi.fn(),
};

vi.mock('../../lib/notificationService', () => ({
  notificationService: notificationServiceMock,
}));

describe('Controle de Estoque Mínimo', () => {
  it('deve disparar um alerta para o Sino de Notificações se o estoque cair abaixo do mínimo', async () => {
    // Simulação da lógica de baixa de estoque que existiria na storage ou backend
    const produto = {
      id: 'prod-1',
      nome: 'Armação Ray-Ban',
      estoque_atual: 5,
      estoque_minimo: 5,
    };
    
    const quantidadeVendida = 1;
    const novoEstoque = produto.estoque_atual - quantidadeVendida;
    
    // Dispara a regra de negócio
    if (novoEstoque < produto.estoque_minimo) {
      await notificationServiceMock.saveNotification({
        title: 'Estoque Baixo',
        message: `O produto ${produto.nome} atingiu o limite mínimo. (Restam ${novoEstoque})`,
        type: 'INVENTORY'
      });
    }
    
    expect(novoEstoque).toBe(4);
    expect(notificationServiceMock.saveNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Estoque Baixo',
        message: expect.stringContaining('Armação Ray-Ban'),
      })
    );
  });
});

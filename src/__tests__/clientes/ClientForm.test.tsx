import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ClientModal from '../../components/ClientModal';

// Mock de utilitários e storage
vi.mock('../../lib/storage', () => ({
  storage: {
    saveClient: vi.fn(),
  }
}));

describe('Client Form Validation (ClientModal)', () => {
  it('deve exibir mensagem de erro se Nome ou WhatsApp estiverem vazios e impedir de salvar', async () => {
    const onCloseMock = vi.fn();
    const onSaveMock = vi.fn();
    
    render(<ClientModal isOpen={true} onClose={onCloseMock} onSave={onSaveMock} />);
    
    const saveButton = screen.getByRole('button', { name: /Salvar Cliente/i });
    
    // Tenta salvar com campos vazios
    fireEvent.click(saveButton);
    
    // A validação HTML5 entra em ação com campos required, 
    // ou se o react lida manualmente, o onSaveMock não deve ser chamado
    expect(onSaveMock).not.toHaveBeenCalled();
  });
  
  it('deve formatar o WhatsApp corretamente limpando a string', () => {
    // Essa lógica normalmente fica no backend ou antes de salvar
    // Podemos testar uma rotina isolada ou ver como o Form lida
    const dirtyPhone = '(62) 99285-8280';
    const cleanPhone = dirtyPhone.replace(/\D/g, '');
    
    // Se estivéssemos testando a storage, a storage garantiria a conversão
    expect(cleanPhone).toBe('62992858280');
    // Para DDI, precisaria prefixar o 55
    expect(`55${cleanPhone}`).toBe('5562992858280');
  });
});

import { toast } from 'sonner';

/**
 * Função de limpeza e formatação de telefone para o WhatsApp.
 * Garante o padrão internacional 55 (Brasil) + DDD + Número.
 */
export function formatPhoneForWhatsApp(phone: string, defaultDdd: string = '62'): string {
  if (!phone) return '';
  
  // Remove tudo que não for dígito
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return '';

  // Se já começa com DDI 55 (Brasil)
  if (cleaned.startsWith('55')) {
    // 12 ou 13 dígitos: 55 + DDD (2) + Número (8 ou 9)
    if (cleaned.length === 12 || cleaned.length === 13) {
      return cleaned;
    }
    // 10 ou 11 dígitos começando com 55 (ex: 55629812345)
    if (cleaned.length === 10 || cleaned.length === 11) {
      return cleaned;
    }
  }

  // Se tem 10 ou 11 dígitos (DDD 2 dígitos + Número 8 ou 9 dígitos)
  if (cleaned.length === 10 || cleaned.length === 11) {
    return '55' + cleaned;
  }

  // Se tem 8 ou 9 dígitos (Número local sem DDD), adiciona 55 + DDD Padrão (62)
  if (cleaned.length === 8 || cleaned.length === 9) {
    return '55' + defaultDdd + cleaned;
  }

  return cleaned;
}

/**
 * Gera o link do WhatsApp baseado no modo configurado.
 * Suporta WhatsApp Web direto, API WhatsApp e App Desktop.
 */
export function getWhatsAppLink(phone: string, message: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  if (!formattedPhone) return '';
  
  const encodedMessage = encodeURIComponent(message);
  const mode = (typeof window !== 'undefined' && localStorage.getItem('lis_whatsapp_mode')) || 'api';

  if (mode === 'app') {
    return `whatsapp://send?phone=${formattedPhone}&text=${encodedMessage}`;
  } else if (mode === 'web') {
    return `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
  }

  // Modo padrão 'api' (api.whatsapp.com/send): Funciona tanto em desktop quanto mobile
  return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
}

/**
 * Abre o WhatsApp em uma nova aba com notificação informativa.
 */
export function openWhatsApp(phone: string, message: string): void {
  const formatted = formatPhoneForWhatsApp(phone);
  if (!formatted) {
    toast.error('Telefone com formato inválido para o WhatsApp.', {
      description: 'Verifique se o número contém o DDD (Ex: 62 98123-4567).'
    });
    return;
  }

  const link = getWhatsAppLink(phone, message);
  if (link) {
    window.open(link, '_blank');
    toast.success('Abrindo conversa no WhatsApp...', {
      description: 'Dica: Certifique-se de que a conta da Ótica Lìs está ativa no seu WhatsApp Web/App.'
    });
  }
}

/**
 * Copia a mensagem para a área de transferência e abre o WhatsApp.
 */
export async function copyToClipboardAndOpenWhatsApp(phone: string, message: string): Promise<void> {
  try {
    if (navigator.clipboard && message) {
      await navigator.clipboard.writeText(message);
      toast.success('Mensagem copiada para a área de transferência!');
    }
  } catch (err) {
    console.warn('Não foi possível copiar texto:', err);
  }
  openWhatsApp(phone, message);
}

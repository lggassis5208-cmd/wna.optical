/**
 * Função de limpeza de dados (CLEANER).
 * Remove ( ) - [ ] e espaços.
 * Garante que comece com 55 (Brasil) + DDD + Número.
 */
export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  
  // Remove tudo que não for número
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 0) return '';
  
  // Se tiver 10 ou 11 dígitos, é DDD + Número, adiciona o 55
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }
  
  // Se começar com DDD sem o 55 e tiver 10 ou 11 dígitos, o if acima resolve.
  // Se já tiver o 55 mas faltar o restante, ou tiver a formatacão errada, o Replace inicial limpou.
  
  return cleaned;
}

/**
 * Gera o link do WhatsApp com a mensagem pré-definida.
 */
export function getWhatsAppLink(phone: string, message: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  if (!formattedPhone) return '';
  
  const encodedMessage = encodeURIComponent(message);
  return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
}

/**
 * Abre o WhatsApp em uma nova aba.
 */
export function openWhatsApp(phone: string, message: string): void {
  const link = getWhatsAppLink(phone, message);
  if (link) {
    window.open(link, '_blank');
  }
}

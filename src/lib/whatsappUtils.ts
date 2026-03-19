/**
 * Limpa o número de telefone removendo caracteres não numéricos.
 * Garante que comece com o código do país (55 para Brasil) se não houver.
 */
export function formatWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 0) return '';
  
  // Se tiver 10 ou 11 dígitos (DDD + número), adiciona o 55
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }
  
  return cleaned;
}

/**
 * Gera o link do WhatsApp com a mensagem pré-definida.
 */
export function getWhatsAppLink(phone: string, message: string): string {
  const formattedPhone = formatWhatsAppNumber(phone);
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

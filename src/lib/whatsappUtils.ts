import { toast } from 'sonner';
import { supabase } from './supabase';

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
    if (cleaned.length === 12 || cleaned.length === 13 || cleaned.length === 10 || cleaned.length === 11) {
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
 * Normaliza o telefone no formato estrito WAHA (55DDDNUM@c.us)
 */
export function formatWahaJid(phone: string): string {
  const formatted = formatPhoneForWhatsApp(phone);
  if (!formatted) return '';
  return `${formatted}@c.us`;
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

  // Modo padrão 'api' (api.whatsapp.com/send)
  return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
}

/**
 * Abre o WhatsApp em uma nova aba com notificação informativa.
 * DISPARO SEMPRE MANUAL (O operador clica).
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
      description: 'Disparo manual acionado pelo operador com sucesso.'
    });
  }
}

/**
 * Mensagem pré-preenchida para confirmação de cadastro (Parte 4 da especificação)
 */
export function buildConfirmacaoCadastroMsg(nomeCliente: string): string {
  const primeiroNome = (nomeCliente || '').trim().split(' ')[0] || 'Cliente';
  return `Olá ${primeiroNome}! Essa mensagem é uma confirmação do seu cadastro aqui conosco na Ótica Lis. Seja muito bem-vindo(a)! Qualquer dúvida sobre suas lentes ou óculos, estamos à disposição.`;
}

/**
 * Mensagem pré-preenchida para envio de documento transacional por link (Parte 5 da especificação)
 */
export function buildDocumentoLinkMsg(nomeCliente: string, tipoDocLabel: string, signedUrl: string): string {
  const primeiroNome = (nomeCliente || '').trim().split(' ')[0] || 'Cliente';
  return `Olá ${primeiroNome}! Segue o link para visualizar o seu ${tipoDocLabel} da Ótica Lis:\n\n${signedUrl}\n\nEste é um link seguro e expira em 48 horas.`;
}

/**
 * Verificação rápida de lista de supressão (Opt-Out / PARE)
 */
export async function isPhoneSuppressed(phone: string): Promise<boolean> {
  const formatted = formatPhoneForWhatsApp(phone);
  if (!formatted) return false;

  try {
    const { data } = await supabase
      .from('lista_supressao')
      .select('id')
      .eq('whatsapp', formatted)
      .limit(1);

    return (data && data.length > 0) || false;
  } catch (e) {
    return false;
  }
}

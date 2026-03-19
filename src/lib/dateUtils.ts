import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata uma data para o padrão brasileiro DD/MM/AAAA
 */
export const formatDate = (date: string | Date | number): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return format(d, 'dd/MM/yyyy', { locale: ptBR });
};

/**
 * Formata a hora para o padrão 24h HH:mm
 */
export const formatTime = (date: string | Date | number): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return format(d, 'HH:mm', { locale: ptBR });
};

/**
 * Formata data e hora completas DD/MM/YYYY HH:mm
 */
export const formatDateTime = (date: string | Date | number): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return format(d, 'dd/MM/yyyy HH:mm', { locale: ptBR });
};

/**
 * Retorna a data/hora atual no formato ISO, pronta para o storage
 */
export const getNowISO = (): string => {
  return new Date().toISOString();
};

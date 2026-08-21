/**
 * Utilitários de Criptografia, Hash de Imutabilidade do Prontuário,
 * Validação Clínica e Tokens Expiráveis para WhatsApp (LGPD / Ótica Lis).
 */

export interface ClinicalValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Máscara formatada para exibição de CPF preservando dados sensíveis.
 */
export function maskCpf(cpf?: string | null): string {
  if (!cpf) return 'Sem CPF';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return `${clean.substring(0, 3)}.***.***-${clean.substring(9)}`;
}

/**
 * Validação clínica de parâmetros de refração (Grau por olho).
 */
export function validateRefractionClinical(refracao: {
  esferico: number;
  cilindrico: number;
  eixo: number;
  adicao?: number | null;
}): ClinicalValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validação de Eixo (0 a 180 graus)
  if (refracao.eixo < 0 || refracao.eixo > 180 || !Number.isInteger(Number(refracao.eixo))) {
    errors.push('O eixo de refração deve ser um número inteiro entre 0 e 180 graus.');
  }

  // 2. Passo de 0.25 para esférico e cilíndrico
  const isStepQuarter = (val: number) => Math.abs(val * 100) % 25 === 0;
  
  if (!isStepQuarter(refracao.esferico)) {
    warnings.push(`Esférico (${refracao.esferico}) não está em passos padrão de 0.25.`);
  }

  if (!isStepQuarter(refracao.cilindrico)) {
    warnings.push(`Cilíndrico (${refracao.cilindrico}) não está em passos padrão de 0.25.`);
  }

  // 3. Alerta de Cilíndrico Positivo (atípico em refração oftálmica/óptica)
  if (refracao.cilindrico > 0) {
    warnings.push(`Cilíndrico positivo (${refracao.cilindrico > 0 ? '+' : ''}${refracao.cilindrico}) detectado. Geralmente prescrições utilizam cilindro negativo.`);
  }

  // 4. Validação de Adição (presbiopia/multifocal)
  if (refracao.adicao !== undefined && refracao.adicao !== null) {
    if (refracao.adicao < 0) {
      errors.push('A adição deve ser um valor positivo.');
    }
    if (!isStepQuarter(refracao.adicao)) {
      warnings.push(`Adição (${refracao.adicao}) não está em passos padrão de 0.25.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Gera um Hash SHA-256 de integridade da ficha finalizada (Assinatura do Prontuário).
 * Unifica: dados clínicos + refracoes OD e OE + optometrista + timestamp de finalização.
 */
export async function generateAssinaturaHash(
  fichaData: {
    cliente_id: string;
    atendido_por: string;
    data_exame: string;
    validade_receita: string;
    motivo_consulta?: string;
  },
  refracaoOD: any,
  refracaoOE: any,
  timestampIso: string
): Promise<string> {
  const contentToHash = JSON.stringify({
    cliente_id: fichaData.cliente_id,
    atendido_por: fichaData.atendido_por,
    data_exame: fichaData.data_exame,
    validade_receita: fichaData.validade_receita,
    motivo: fichaData.motivo_consulta || '',
    od: {
      esf: refracaoOD.esferico,
      cil: refracaoOD.cilindrico,
      eixo: refracaoOD.eixo,
      add: refracaoOD.adicao || null,
    },
    oe: {
      esf: refracaoOE.esferico,
      cil: refracaoOE.cilindrico,
      eixo: refracaoOE.eixo,
      add: refracaoOE.adicao || null,
    },
    finalizada_em: timestampIso,
  });

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(contentToHash);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `LIS-SHA256:${hashHex}`;
  }

  // Fallback simples
  let hash = 0;
  for (let i = 0; i < contentToHash.length; i++) {
    const char = contentToHash.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `LIS-HASH:${Math.abs(hash).toString(16)}-${Date.now().toString(36)}`;
}

/**
 * Gera um link temporário com token expirável para compartilhamento de receita via WhatsApp.
 */
export function generateExpirableWhatsAppLink(fichaId: string, clienteNome: string, expiryHours: number = 48): { token: string; link: string; expiresAt: string } {
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
  const tokenPayload = btoa(JSON.stringify({ fid: fichaId, nome: clienteNome, exp: expiresAt }));
  const token = `exp_${tokenPayload.replace(/=/g, '')}`;
  
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://oticalis.app';
  const link = `${baseUrl}/fichas-medicas?token=${token}&fichaId=${fichaId}`;

  return { token, link, expiresAt };
}

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import ReciboInterno from './ReciboInterno';

export function normalizarTelefoneBR(tel: string): string {
  if (!tel) return '';
  // Remove tudo que não for dígito
  let cleaned = tel.replace(/\D/g, '');
  if (cleaned.length === 0) return '';
  
  // Se já começar com 55 e tiver 12 ou 13 dígitos, está completo
  if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
    return cleaned;
  }
  
  // Se tiver 10 ou 11 dígitos, é DDD + Número, adiciona o 55
  if (cleaned.length === 10 || cleaned.length === 11) {
    return '55' + cleaned;
  }
  
  // Rejeita números sem DDD (menos de 10 dígitos)
  return '';
}

export interface MensagemProps {
  clienteNome: string;
  numeroNota: string;
  valorTotal: number;
  rotuloDocumento: string;
}

export function montarMensagemComprovante({
  clienteNome,
  numeroNota,
  valorTotal,
  rotuloDocumento,
}: MensagemProps): string {
  const valorFormatado = Number(valorTotal || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  return `Olá, *${clienteNome}*! Segue em anexo o seu *${rotuloDocumento}* da *Ótica Lìs*.\n\n📄 *Documento:* #${numeroNota}\n💰 *Valor:* ${valorFormatado}\n\n(Favor arrastar o arquivo PDF baixado para esta conversa para concluir o envio.)\n\nAgradecemos a preferência! 😊`;
}

export function montarLinkWhatsApp(tel: string, msg: string): string {
  const normalizedTel = normalizarTelefoneBR(tel);
  if (!normalizedTel) return '';
  const encodedMsg = encodeURIComponent(msg);
  return `https://wa.me/${normalizedTel}?text=${encodedMsg}`;
}

export function baixarPdf(url: string, filename: string): void {
  if (!url) return;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function gerarPdfRecibo(reciboData: any): Promise<string> {
  return new Promise((resolve, reject) => {
    // 1. Cria uma div temporária oculta fora da tela
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '190mm'; // Largura do A4
    document.body.appendChild(tempDiv);

    // 2. Renderiza o componente ReciboInterno nela
    const root = createRoot(tempDiv);
    root.render(<ReciboInterno data={reciboData} />);

    // 3. Aguarda a renderização no DOM do cliente
    setTimeout(async () => {
      try {
        const opt = {
          margin:       10,
          filename:     'recibo.pdf',
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // 4. Executa html2pdf dinamicamente para evitar problemas de build/SSR
        // @ts-ignore
        const html2pdf = (await import('html2pdf.js')).default;
        const pdfBlob = await html2pdf().set(opt).from(tempDiv).output('blob');
        
        // 5. Limpa a div e desmonta o root do React
        root.unmount();
        document.body.removeChild(tempDiv);

        // 6. Retorna a URL do blob temporário
        resolve(URL.createObjectURL(pdfBlob));
      } catch (err) {
        try { root.unmount(); } catch(_) {}
        try { document.body.removeChild(tempDiv); } catch(_) {}
        reject(err);
      }
    }, 150);
  });
}

interface BotaoEnviarComprovanteProps {
  telefoneCliente: string;
  clienteNome: string;
  numeroNota: string;
  valorTotal: number;
  pdfUrl: string | null | undefined;
  rotuloDocumento: string;
  nomeArquivo: string;
  textoBotao: string;
  onSendSuccess?: () => void;
}

export const BotaoEnviarComprovante: React.FC<BotaoEnviarComprovanteProps> = ({
  telefoneCliente,
  clienteNome,
  numeroNota,
  valorTotal,
  pdfUrl,
  rotuloDocumento,
  nomeArquivo,
  textoBotao,
  onSendSuccess,
}) => {
  const telValido = normalizarTelefoneBR(telefoneCliente).length >= 12;
  const pdfValido = !!pdfUrl && (pdfUrl.startsWith('http') || pdfUrl.startsWith('blob:') || pdfUrl.startsWith('data:'));
  const canSend = telValido && pdfValido;

  const getTooltipText = () => {
    if (!telValido && !pdfValido) return `Falta o telefone do cliente e o arquivo do ${rotuloDocumento}.`;
    if (!telValido) return 'Telefone do cliente é inválido ou sem DDD.';
    if (!pdfValido) return `O PDF do ${rotuloDocumento} ainda não está pronto ou não foi gerado.`;
    return `Enviar ${rotuloDocumento} pelo WhatsApp`;
  };

  const handleSend = () => {
    if (!canSend) return;
    
    // 1. Baixar o PDF
    baixarPdf(pdfUrl, nomeArquivo);

    // 2. Abrir o WhatsApp
    const msg = montarMensagemComprovante({
      clienteNome,
      numeroNota,
      valorTotal,
      rotuloDocumento,
    });
    const link = montarLinkWhatsApp(telefoneCliente, msg);
    if (link) {
      window.open(link, '_blank');
      if (onSendSuccess) {
        onSendSuccess();
      }
    }
  };

  return (
    <div className="relative group w-full">
      <button
        onClick={handleSend}
        disabled={!canSend}
        type="button"
        className={`w-full py-4 font-black rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg text-white ${
          canSend
            ? 'bg-[#25D366] hover:bg-[#25D366]/90 border border-[#25D366]/50 shadow-[#25D366]/10 hover:scale-[1.02] cursor-pointer'
            : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed shadow-none'
        }`}
      >
        <MessageSquare size={18} />
        {textoBotao}
      </button>
      {!canSend && (
        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[280px] bg-black/90 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg opacity-0 transition-opacity group-hover:opacity-100 border border-white/10 text-center shadow-xl z-50">
          {getTooltipText()}
        </span>
      )}
    </div>
  );
};

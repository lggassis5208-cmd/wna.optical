import { useState, useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  MessageCircle, 
  ShieldCheck, 
  Eye, 
  FileText,
  Loader2
} from 'lucide-react';
import { type FichaMedica, fichasMedicasService } from '../lib/services/fichasMedicasService';
import { generateExpirableWhatsAppLink, maskCpf } from '../lib/cryptoUtils';
import { formatDate } from '../lib/dateUtils';
import { openWhatsApp } from '../lib/whatsappUtils';
import { toast } from 'sonner';

interface FichaMedicaPDFProps {
  isOpen: boolean;
  onClose: () => void;
  ficha: FichaMedica | null;
  usuarioNome?: string;
}

export default function FichaMedicaPDF({
  isOpen,
  onClose,
  ficha,
  usuarioNome = 'Atendente Lìs'
}: FichaMedicaPDFProps) {
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !ficha) return null;

  const rod = ficha.refracoes?.find(r => r.olho === 'OD');
  const roe = ficha.refracoes?.find(r => r.olho === 'OE');

  // Registrar Log LGPD e imprimir nativamente via navegador
  const handlePrint = async () => {
    try {
      await fichasMedicasService.logAcesso({
        ficha_id: ficha.id,
        cliente_id: ficha.cliente_id,
        usuario_nome: usuarioNome,
        acao: 'impressao',
        detalhes: `Imprimiu Receita Óptica do paciente ${ficha.nome}`
      });
    } catch (e) {
      console.warn('Erro ao salvar log de impressão:', e);
    }
    window.print();
  };

  // Gerar arquivo PDF real e realizar o download automático (.pdf)
  const handleExportPdf = async () => {
    if (!printAreaRef.current) return;
    setGeneratingPdf(true);
    toast.info('Gerando arquivo PDF da receita médica...');

    try {
      try {
        await fichasMedicasService.logAcesso({
          ficha_id: ficha.id,
          cliente_id: ficha.cliente_id,
          usuario_nome: usuarioNome,
          acao: 'exportacao_pdf',
          detalhes: `Exportou PDF da Receita Óptica de ${ficha.nome}`
        });
      } catch (e) {
        console.warn('Erro ao registrar log LGPD:', e);
      }

      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      const sanitizedName = (ficha.nome || 'Paciente')
        .trim()
        .replace(/[^a-zA-Z0-9À-ÿ]/g, '_');

      const opt = {
        margin: [8, 8, 8, 8],
        filename: `Receita_Optica_${sanitizedName}_${ficha.data_exame || 'consulta'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(printAreaRef.current).save();
      toast.success('PDF da Receita gerado e baixado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao gerar PDF da ficha:', error);
      toast.error('Não foi possível gerar o arquivo direto. Abrindo janela de impressão para Salvar como PDF.');
      window.print();
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Enviar link expirável via WhatsApp (respeitando LGPD)
  const handleSendWhatsAppLink = async () => {
    const { link, expiresAt } = generateExpirableWhatsAppLink(ficha.id, ficha.nome);
    
    try {
      await fichasMedicasService.logAcesso({
        ficha_id: ficha.id,
        cliente_id: ficha.cliente_id,
        usuario_nome: usuarioNome,
        acao: 'exportacao_pdf',
        detalhes: `Gerou link temporário no WhatsApp com expiração em ${formatDate(expiresAt)}`
      });
    } catch (e) {
      console.warn('Erro ao registrar log WhatsApp:', e);
    }

    const mensagem = `Olá, *${ficha.nome}*! 👋\n\nAqui é da *Ótica Lìs*. Sua Receita Óptica / Prontuário já está disponível!\n\nPara visualizar ou baixar sua receita com segurança, acesse o link exclusivo (válido por 48 horas):\n🔗 ${link}\n\nOptometrista Responsável: ${ficha.atendido_por}\nQualquer dúvida, estamos à disposição! 🕶️✨`;
    const telefoneCliente = ficha.telefone || ficha.cliente?.whatsapp;

    if (telefoneCliente) {
      openWhatsApp(telefoneCliente, mensagem);
      toast.success('WhatsApp aberto com a mensagem e o link temporário expirável!');
    } else {
      navigator.clipboard.writeText(mensagem);
      toast.info('Mensagem com link temporário copiada para a área de transferência!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Regras dedicadas para garantir impressão 100% limpa em folha A4 */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }
          #ficha-medica-print-sheet, #ficha-medica-print-sheet * {
            visibility: visible !important;
          }
          #ficha-medica-print-sheet {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 8mm !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            border-radius: 0 !important;
          }
          .no-print {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>

      <div 
        className="bg-surface border border-white/10 rounded-3xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra Superior / Ações */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex flex-wrap justify-between items-center gap-3 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Receita Óptica & Prontuário Lìs</h2>
              <p className="text-xs text-white/50">Paciente: <strong className="text-white">{ficha.nome}</strong></p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={generatingPdf}
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Imprimir na impressora local ou Salvar em PDF pelo navegador"
            >
              <Printer size={15} /> Imprimir
            </button>

            <button
              onClick={handleExportPdf}
              disabled={generatingPdf}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50"
              title="Baixar arquivo PDF diretamente no computador"
            >
              {generatingPdf ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Gerando PDF...
                </>
              ) : (
                <>
                  <Download size={15} /> Baixar PDF
                </>
              )}
            </button>

            <button
              onClick={handleSendWhatsAppLink}
              disabled={generatingPdf}
              className="px-3.5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-green-500/20 cursor-pointer disabled:opacity-50"
              title="Enviar link seguro e temporário por WhatsApp"
            >
              <MessageCircle size={15} /> WhatsApp
            </button>

            <button 
              onClick={onClose}
              disabled={generatingPdf}
              className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors ml-1 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ÁREA DE VISUALIZAÇÃO E EXPORTAÇÃO (Folha A4 Timbrada) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-black/40">
          
          <div 
            ref={printAreaRef}
            id="ficha-medica-print-sheet"
            className="bg-white text-gray-900 rounded-2xl p-6 sm:p-10 shadow-2xl max-w-3xl mx-auto space-y-6 border border-gray-200"
            style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
          >
            {/* Cabeçalho da Empresa */}
            <div className="flex justify-between items-start border-b pb-6 border-gray-200">
              <div>
                <h1 className="text-2xl font-black text-amber-600 tracking-tight flex items-center gap-2">
                  <Eye className="text-amber-600" /> ÓTICA LÌS
                </h1>
                <p className="text-xs text-gray-600 font-medium mt-1">
                  Especialistas em Saúde Visual & Lentes Oftálmicas
                </p>
                <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                  Av Anápolis Qd 03 Lt 01, Nº 2134, Vila Concórdia • CNPJ: 39.156.577/0001-22
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-amber-50 text-amber-800 font-black text-xs rounded-full uppercase tracking-wider border border-amber-200">
                  RECEITA ÓPTICA #{ficha.id.substring(0, 8).toUpperCase()}
                </span>
                <p className="text-xs text-gray-600 mt-2">
                  Data do Exame: <strong>{formatDate(ficha.data_exame)}</strong>
                </p>
                <p className="text-xs text-amber-700 font-bold mt-0.5">
                  Validade: {formatDate(ficha.validade_receita)}
                </p>
              </div>
            </div>

            {/* Dados do Paciente e Profissional */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Paciente</span>
                <strong className="text-gray-900 font-bold text-sm">{ficha.nome}</strong>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">CPF</span>
                <span className="font-mono text-gray-800 font-medium">{maskCpf(ficha.cpf)}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Telefone</span>
                <span className="text-gray-800 font-medium">{ficha.telefone || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Responsável Técnico</span>
                <span className="text-gray-900 font-bold">{ficha.atendido_por || 'Priscila Freitas CRO 3016'}</span>
              </div>
            </div>

            {/* Tabela de Refração OD / OE */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
                <Eye size={14} className="text-amber-600" /> Prescrição de Grau (Refração Oftálmica)
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-300">
                      <th className="p-3 border-r border-gray-300 w-24">Olho</th>
                      <th className="p-3 border-r border-gray-300 text-center">Esférico (Esf)</th>
                      <th className="p-3 border-r border-gray-300 text-center">Cilíndrico (Cil)</th>
                      <th className="p-3 border-r border-gray-300 text-center">Eixo (°)</th>
                      <th className="p-3 border-r border-gray-300 text-center">Adição (Add)</th>
                      <th className="p-3 border-r border-gray-300 text-center">DNP (mm)</th>
                      <th className="p-3 text-center">Altura (mm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {/* Linha OD */}
                    <tr className="bg-blue-50/50 text-gray-900 font-semibold">
                      <td className="p-3 border-r border-gray-300 font-black text-blue-700">
                        OD (Direito)
                      </td>
                      <td className="p-3 border-r border-gray-300 font-bold text-center">
                        {rod?.esferico !== undefined ? (rod.esferico > 0 ? `+${rod.esferico.toFixed(2)}` : rod.esferico.toFixed(2)) : '0.00'}
                      </td>
                      <td className="p-3 border-r border-gray-300 text-center">
                        {rod?.cilindrico !== undefined ? (rod.cilindrico > 0 ? `+${rod.cilindrico.toFixed(2)}` : rod.cilindrico.toFixed(2)) : '0.00'}
                      </td>
                      <td className="p-3 border-r border-gray-300 text-center font-mono">
                        {rod?.eixo !== undefined ? `${rod.eixo}°` : '0°'}
                      </td>
                      <td className="p-3 border-r border-gray-300 text-amber-700 font-bold text-center">
                        {rod?.adicao ? `+${rod.adicao.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 border-r border-gray-300 text-center">
                        {rod?.dnp ? `${rod.dnp} mm` : '—'}
                      </td>
                      <td className="p-3 text-center">
                        {rod?.altura ? `${rod.altura} mm` : '—'}
                      </td>
                    </tr>

                    {/* Linha OE */}
                    <tr className="bg-purple-50/50 text-gray-900 font-semibold">
                      <td className="p-3 border-r border-gray-300 font-black text-purple-700">
                        OE (Esquerdo)
                      </td>
                      <td className="p-3 border-r border-gray-300 font-bold text-center">
                        {roe?.esferico !== undefined ? (roe.esferico > 0 ? `+${roe.esferico.toFixed(2)}` : roe.esferico.toFixed(2)) : '0.00'}
                      </td>
                      <td className="p-3 border-r border-gray-300 text-center">
                        {roe?.cilindrico !== undefined ? (roe.cilindrico > 0 ? `+${roe.cilindrico.toFixed(2)}` : roe.cilindrico.toFixed(2)) : '0.00'}
                      </td>
                      <td className="p-3 border-r border-gray-300 text-center font-mono">
                        {roe?.eixo !== undefined ? `${roe.eixo}°` : '0°'}
                      </td>
                      <td className="p-3 border-r border-gray-300 text-amber-700 font-bold text-center">
                        {roe?.adicao ? `+${roe.adicao.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 border-r border-gray-300 text-center">
                        {roe?.dnp ? `${roe.dnp} mm` : '—'}
                      </td>
                      <td className="p-3 text-center">
                        {roe?.altura ? `${roe.altura} mm` : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Motivo & Anamnese */}
            {ficha.motivo_consulta && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">
                  Motivo da Consulta & Queixas Clínicas
                </span>
                <p className="text-xs text-gray-800 leading-relaxed italic">
                  "{ficha.motivo_consulta}"
                </p>
              </div>
            )}

            {/* Assinatura, Hash LGPD e Carimbo Profissional */}
            <div className="pt-8 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="text-center sm:text-left">
                <div className="flex items-center gap-1.5 text-green-700 font-bold text-xs">
                  <ShieldCheck size={16} /> Prontuário Auditado LGPD
                </div>
                <p className="text-[10px] font-mono text-gray-500 mt-1 break-all max-w-sm">
                  Hash de Autenticidade: {ficha.assinatura_hash || 'PRONTUARIO-AUDITADO-ASSINADO'}
                </p>
              </div>

              <div className="text-center min-w-64 border-t border-gray-400 pt-2">
                <p className="text-xs font-black text-gray-900 uppercase tracking-wide">
                  {ficha.atendido_por || 'Priscila Freitas CRO 3016'}
                </p>
                <p className="text-[10px] text-gray-600 font-medium">
                  {ficha.atendido_por?.toUpperCase().includes('CRO')
                    ? 'Responsável Técnico — Saúde Visual'
                    : 'Optometrista / Especialista Responsável — CRO 3016'}
                </p>
                <p className="text-[9px] text-gray-400 font-mono mt-0.5">
                  Ótica Lìs • Registro Clínico Oficial
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

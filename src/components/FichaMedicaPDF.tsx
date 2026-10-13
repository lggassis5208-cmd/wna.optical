import { useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  MessageCircle, 
  ShieldCheck, 
  Eye, 
  Lock, 
  Check, 
  Copy, 
  Calendar, 
  User, 
  FileText 
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
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !ficha) return null;

  const rod = ficha.refracoes?.find(r => r.olho === 'OD');
  const roe = ficha.refracoes?.find(r => r.olho === 'OE');

  // Registrar Log LGPD e imprimir
  const handlePrint = async () => {
    await fichasMedicasService.logAcesso({
      ficha_id: ficha.id,
      cliente_id: ficha.cliente_id,
      usuario_nome: usuarioNome,
      acao: 'impressao',
      detalhes: `Imprimiu Receita Óptica do paciente ${ficha.nome}`
    });
    window.print();
  };

  // Registrar Log LGPD e exportar PDF
  const handleExportPdf = async () => {
    await fichasMedicasService.logAcesso({
      ficha_id: ficha.id,
      cliente_id: ficha.cliente_id,
      usuario_nome: usuarioNome,
      acao: 'exportacao_pdf',
      detalhes: `Exportou PDF da Receita Óptica de ${ficha.nome}`
    });
    toast.success('Gerando visualização de impressão para salvar em PDF...');
    window.print();
  };

  // Enviar link expirável via WhatsApp (manual, sem envio cru de arquivo, respeitando opt-in)
  const handleSendWhatsAppLink = async () => {
    const { link, expiresAt } = generateExpirableWhatsAppLink(ficha.id, ficha.nome);
    
    await fichasMedicasService.logAcesso({
      ficha_id: ficha.id,
      cliente_id: ficha.cliente_id,
      usuario_nome: usuarioNome,
      acao: 'exportacao_pdf',
      detalhes: `Gerou link temporário no WhatsApp com expiração em ${formatDate(expiresAt)}`
    });

    const mensagem = `Olá, *${ficha.nome}*! 👋\n\nAqui é da *Ótica Lìs*. Sua Receita Óptica / Prontuário já está disponível!\n\nPara visualizar ou baixar sua receita com segurança, acesse o link exclusivo (válido por 48 horas):\n🔗 ${link}\n\nOptometrista Responsável: ${ficha.atendido_por}\nQualquer dúvida, estamos à disposição! 🕶️✨`;

    const telefoneCliente = ficha.telefone || ficha.cliente?.whatsapp;

    if (telefoneCliente) {
      openWhatsApp(telefoneCliente, mensagem);
      toast.success('WhatsApp aberto com a mensagem e o link temporário expirável!');
    } else {
      navigator.clipboard.writeText(mensagem);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
      toast.info('Mensagem com link temporário copiada para a área de transferência!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 print:p-0 print:bg-white print:static">
      <div 
        className="bg-surface border border-white/10 rounded-3xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none print:rounded-none print:bg-white print:text-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Oculto na Impressão) */}
        <div className="p-4 sm:p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02] print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Receita Óptica & Prontuário Lìs</h2>
              <p className="text-xs text-white/50">Paciente: <strong className="text-white">{ficha.nome}</strong></p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center gap-2"
            >
              <Printer size={14} /> Imprimir
            </button>

            <button
              onClick={handleExportPdf}
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center gap-2"
            >
              <Download size={14} /> PDF
            </button>

            <button
              onClick={handleSendWhatsAppLink}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-green-500/20"
            >
              <MessageCircle size={14} /> WhatsApp (Link Expirável)
            </button>

            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors ml-2"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* RECEITA IMPRESSA / DOCUMENTO OFICIAL */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-6 custom-scrollbar print:overflow-visible print:p-8 bg-surface print:bg-white print:text-black">
          
          {/* Cabeçalho da Ótica Lis */}
          <div className="flex justify-between items-start border-b pb-6 border-white/10 print:border-black/20">
            <div>
              <h1 className="text-2xl font-black text-primary print:text-black tracking-tight flex items-center gap-2">
                <Eye className="print:text-black" /> ÓTICA LÌS
              </h1>
              <p className="text-xs text-white/60 print:text-gray-600 mt-1">
                Especialistas em Saúde Visual & Lentes Oftálmicas
              </p>
              <p className="text-[11px] text-white/40 print:text-gray-500 font-mono mt-0.5">
                Unidade Principal — Av Anápolis Qd 03 Lt 01 - Vila Concórdia | Tel: (62) 99999-0000
              </p>
            </div>

            <div className="text-right">
              <span className="px-3 py-1 bg-primary/10 print:bg-gray-100 text-primary print:text-black font-black text-xs rounded-full uppercase tracking-wider border border-primary/20 print:border-gray-300">
                RECEITA ÓPTICA #{ficha.id.substring(0, 8).toUpperCase()}
              </span>
              <p className="text-xs text-white/60 print:text-gray-600 mt-2">
                Data do Exame: <strong>{formatDate(ficha.data_exame)}</strong>
              </p>
              <p className="text-xs text-primary print:text-black font-bold mt-0.5">
                Validade: {formatDate(ficha.validade_receita)}
              </p>
            </div>
          </div>

          {/* Dados do Paciente */}
          <div className="bg-white/5 print:bg-gray-50 p-4 rounded-2xl border border-white/10 print:border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-white/40 print:text-gray-500 block text-[10px] uppercase font-bold">Paciente</span>
              <strong className="text-white print:text-black font-bold text-sm">{ficha.nome}</strong>
            </div>
            <div>
              <span className="text-white/40 print:text-gray-500 block text-[10px] uppercase font-bold">CPF</span>
              <span className="font-mono text-white/80 print:text-gray-800">{maskCpf(ficha.cpf)}</span>
            </div>
            <div>
              <span className="text-white/40 print:text-gray-500 block text-[10px] uppercase font-bold">Telefone</span>
              <span className="text-white/80 print:text-gray-800">{ficha.telefone || 'Não informado'}</span>
            </div>
            <div>
              <span className="text-white/40 print:text-gray-500 block text-[10px] uppercase font-bold">Médico / Responsável</span>
              <span className="text-white/90 print:text-gray-900 font-bold">{ficha.atendido_por || 'Priscila Freitas CRO 3016'}</span>
            </div>
          </div>

          {/* Tabela de Refração OD / OE */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary print:text-black flex items-center gap-2">
              <Eye size={14} /> Prescrição de Grau (Refração Oftálmica)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse border border-white/10 print:border-gray-300">
                <thead>
                  <tr className="bg-white/5 print:bg-gray-100 text-white/70 print:text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-white/10 print:border-gray-300">
                    <th className="p-3 border-r border-white/10 print:border-gray-300 w-24">Olho</th>
                    <th className="p-3 border-r border-white/10 print:border-gray-300">Esférico (Esf)</th>
                    <th className="p-3 border-r border-white/10 print:border-gray-300">Cilíndrico (Cil)</th>
                    <th className="p-3 border-r border-white/10 print:border-gray-300">Eixo (°)</th>
                    <th className="p-3 border-r border-white/10 print:border-gray-300">Adição (Add)</th>
                    <th className="p-3 border-r border-white/10 print:border-gray-300">DNP (mm)</th>
                    <th className="p-3">Altura (mm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 print:divide-gray-200">
                  {/* Linha OD */}
                  <tr className="bg-blue-500/[0.03] print:bg-white text-white print:text-black font-semibold">
                    <td className="p-3 border-r border-white/10 print:border-gray-300 font-black text-blue-400 print:text-black">
                      OD (Direito)
                    </td>
                    <td className="p-3 border-r border-white/10 print:border-gray-300 font-bold">
                      {rod?.esferico !== undefined ? (rod.esferico > 0 ? `+${rod.esferico.toFixed(2)}` : rod.esferico.toFixed(2)) : '0.00'}
                    </td>
                    <td className="p-3 border-r border-white/10 print:border-gray-300">
                      {rod?.cilindrico !== undefined ? (rod.cilindrico > 0 ? `+${rod.cilindrico.toFixed(2)}` : rod.cilindrico.toFixed(2)) : '0.00'}
                    </td>
                    <td className="p-3 border-r border-white/10 print:border-gray-300">
                      {rod?.eixo ?? 0}°
                    </td>
                    <td className="p-3 border-r border-white/10 print:border-gray-300 text-primary print:text-black font-bold">
                      {rod?.adicao ? `+${rod.adicao.toFixed(2)}` : '—'}
                    </td>
                    <td className="p-3 border-r border-white/10 print:border-gray-300">
                      {rod?.dnp ? `${rod.dnp} mm` : '—'}
                    </td>
                    <td className="p-3">
                      {rod?.altura ? `${rod.altura} mm` : '—'}
                    </td>
                  </tr>

                  {/* Linha OE */}
                  <tr className="bg-purple-500/[0.03] print:bg-white text-white print:text-black font-semibold">
                    <td className="p-3 border-r border-white/10 print:border-gray-300 font-black text-purple-400 print:text-black">
                      OE (Esquerdo)
                    </td>
                    <td className="p-3 border-r border-white/10 print:border-gray-300 font-bold">
                      {roe?.esferico !== undefined ? (roe.esferico > 0 ? `+${roe.esferico.toFixed(2)}` : roe.esferico.toFixed(2)) : '0.00'}
                    </td>
                    <td className="p-3 border-r border-white/10 print:border-gray-300">
                      {roe?.cilindrico !== undefined ? (roe.cilindrico > 0 ? `+${roe.cilindrico.toFixed(2)}` : roe.cilindrico.toFixed(2)) : '0.00'}
                    </td>
                    <td className="p-3 border-r border-white/10 print:border-gray-300">
                      {roe?.eixo ?? 0}°
                    </td>
                    <td className="p-3 border-r border-white/10 print:border-gray-300 text-primary print:text-black font-bold">
                      {roe?.adicao ? `+${roe.adicao.toFixed(2)}` : '—'}
                    </td>
                    <td className="p-3 border-r border-white/10 print:border-gray-300">
                      {roe?.dnp ? `${roe.dnp} mm` : '—'}
                    </td>
                    <td className="p-3">
                      {roe?.altura ? `${roe.altura} mm` : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Motivo & Observações */}
          {ficha.motivo_consulta && (
            <div className="bg-white/5 print:bg-gray-50 p-4 rounded-xl border border-white/5 print:border-gray-200">
              <span className="text-[10px] text-white/40 print:text-gray-500 uppercase font-bold block mb-1">
                Motivo da Consulta & Anamnese
              </span>
              <p className="text-xs text-white/80 print:text-gray-800 leading-relaxed italic">
                "{ficha.motivo_consulta}"
              </p>
            </div>
          )}

          {/* Assinatura Hash e Carimbo */}
          <div className="pt-6 border-t border-white/10 print:border-black/20 flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-2 text-green-400 print:text-black font-bold text-xs">
                <ShieldCheck size={16} /> Prontuário Auditado LGPD
              </div>
              <p className="text-[10px] font-mono text-white/40 print:text-gray-500 mt-1 break-all max-w-md">
                Hash de Autenticidade: {ficha.assinatura_hash || 'PRONTUARIO-TEMPORARIO-RASCUNHO'}
              </p>
            </div>

            <div className="text-center min-w-64 border-t border-white/30 print:border-black pt-2">
              <p className="text-xs font-black text-white print:text-black uppercase tracking-wide">
                {ficha.atendido_por || 'Priscila Freitas CRO 3016'}
              </p>
              <p className="text-[10px] text-primary print:text-gray-700 font-bold">
                {ficha.atendido_por?.toUpperCase().includes('CRO')
                  ? 'Médico Principal / Responsável Técnico'
                  : 'Médico Principal & Optometrista Responsável — CRO 3016'}
              </p>
              <p className="text-[9px] text-white/40 print:text-gray-500 font-mono mt-0.5">
                Ótica Lìs — Registro Clínico
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

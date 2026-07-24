import { useRef } from 'react';
import { X, Printer, Download, Users, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { formatDate } from '../lib/dateUtils';

interface PrintPatientListModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: any[];
}

export default function PrintPatientListModal({ isOpen, onClose, patients }: PrintPatientListModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Nome Completo', 'CPF', 'RG', 'Data Nasc.', 'WhatsApp', 'Email', 'Cidade', 'UF', 'Data Cadastro', 'Lis Score', 'Origem'];
    const rows = patients.map((p, idx) => [
      `"${p.nome_completo || p.name || ''}"`,
      `"${p.cpf || ''}"`,
      `"${p.rg || ''}"`,
      `"${p.data_nascimento ? formatDate(p.data_nascimento) : ''}"`,
      `"${p.whatsapp || ''}"`,
      `"${p.email || ''}"`,
      `"${p.cidade || ''}"`,
      `"${p.estado || ''}"`,
      `"${p.criado_em ? formatDate(p.criado_em) : ''}"`,
      `"${p.lis_score || 850}"`,
      `"${p.canal_origem || p.origem || 'loja_fisica'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pacientes_cadastrados_ate_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Container Principal */}
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header da Modal */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02] print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Relatório de Pacientes Cadastrados</h3>
              <p className="text-xs text-white/50">Lista completa dos pacientes registrados no sistema até hoje ({todayStr})</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download size={16} className="text-primary" />
              Exportar CSV
            </button>
            <button
              onClick={handlePrint}
              className="bg-primary text-black font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer"
            >
              <Printer size={16} />
              Imprimir Relatório
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Área Visualizável & Impressa */}
        <div className="p-8 overflow-y-auto flex-1 bg-neutral-900 text-white print:bg-white print:text-black print:p-0 print:overflow-visible" ref={printRef}>
          {/* Cabeçalho de Impressão */}
          <div className="border-b border-white/10 print:border-black/20 pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-primary print:text-black uppercase">ÓTICA LIS - SISTEMA OPTICAL</h1>
                <p className="text-sm text-white/60 print:text-neutral-600 font-medium">Relatório Geral de Pacientes & Clientes Cadastrados</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary print:border-black print:text-black text-xs font-bold">
                  <CheckCircle2 size={14} /> Total: {patients.length} Pacientes
                </span>
                <p className="text-xs text-white/40 print:text-neutral-500 mt-1">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-3 gap-4 mb-6 print:grid-cols-3">
            <div className="bg-white/5 print:bg-neutral-100 p-4 rounded-xl border border-white/10 print:border-neutral-300">
              <p className="text-xs text-white/50 print:text-neutral-600 uppercase font-semibold">Total Cadastrados</p>
              <p className="text-2xl font-extrabold text-white print:text-black">{patients.length}</p>
            </div>
            <div className="bg-white/5 print:bg-neutral-100 p-4 rounded-xl border border-white/10 print:border-neutral-300">
              <p className="text-xs text-white/50 print:text-neutral-600 uppercase font-semibold">Período de Registros</p>
              <p className="text-sm font-bold text-primary print:text-black mt-1">Até Hoje ({todayStr.split('de')[0].trim()}/{new Date().getMonth() + 1}/{new Date().getFullYear()})</p>
            </div>
            <div className="bg-white/5 print:bg-neutral-100 p-4 rounded-xl border border-white/10 print:border-neutral-300">
              <p className="text-xs text-white/50 print:text-neutral-600 uppercase font-semibold">Status da Base</p>
              <p className="text-sm font-bold text-green-400 print:text-green-700 mt-1">✓ 100% Sincronizada</p>
            </div>
          </div>

          {/* Tabela de Pacientes */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/5 print:bg-neutral-200 text-white/60 print:text-neutral-800 uppercase tracking-wider border-b border-white/10 print:border-neutral-300">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Paciente / Nome</th>
                  <th className="py-3 px-3">CPF</th>
                  <th className="py-3 px-3">WhatsApp</th>
                  <th className="py-3 px-3">Cidade / UF</th>
                  <th className="py-3 px-3">Data Cadastro</th>
                  <th className="py-3 px-3 text-center">Score Lis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 print:divide-neutral-300">
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-white/30 italic">Nenhum paciente encontrado.</td>
                  </tr>
                ) : (
                  patients.map((patient, index) => (
                    <tr key={patient.id || index} className="hover:bg-white/[0.02] print:hover:bg-transparent">
                      <td className="py-3 px-3 text-white/40 print:text-neutral-500 font-mono">{index + 1}</td>
                      <td className="py-3 px-3 font-semibold text-white print:text-black">
                        {patient.nome_completo || patient.name || patient.nome || 'Paciente sem nome'}
                        {patient.email && <div className="text-[10px] text-white/40 print:text-neutral-500 font-normal">{patient.email}</div>}
                      </td>
                      <td className="py-3 px-3 text-white/70 print:text-neutral-700 font-mono">{patient.cpf || '---'}</td>
                      <td className="py-3 px-3 text-white/70 print:text-neutral-700">{patient.whatsapp || '---'}</td>
                      <td className="py-3 px-3 text-white/70 print:text-neutral-700">
                        {patient.cidade ? `${patient.cidade}${patient.estado ? `/${patient.estado}` : ''}` : '---'}
                      </td>
                      <td className="py-3 px-3 text-white/70 print:text-neutral-700">
                        {patient.criado_em ? formatDate(patient.criado_em) : '---'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-primary print:text-black">
                          {patient.lis_score || 850}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Rodapé do Relatório */}
          <div className="mt-8 pt-4 border-t border-white/10 print:border-black/20 flex justify-between items-center text-[10px] text-white/40 print:text-neutral-500">
            <p>Ótica Lis ERP - Relatório Gerado Automaticamente</p>
            <p>Página 1 de 1</p>
          </div>
        </div>

      </div>
    </div>
  );
}

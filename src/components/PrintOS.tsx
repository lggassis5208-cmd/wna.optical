import React from 'react';

interface PrintOSProps {
  sale: any;
  settings: any;
}

const PrintOS: React.FC<PrintOSProps> = ({ sale, settings }) => {
  if (!sale || !settings) return null;

  return (
    <div className="print-container hidden print:block bg-white text-black p-10 font-sans leading-relaxed min-h-screen">
      <style>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-container { 
            display: block !important;
            visibility: visible !important;
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            height: auto;
            margin: 0;
            padding: 1.5cm;
            background: white !important;
          }
          #root > :not(.print-container) { display: none !important; }
        }
      `}</style>
      
      {/* Header Ótica Lìs */}
      <div className="border-b-4 border-black pb-8 mb-8 flex justify-between items-start">
        <div className="space-y-1.5">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Ótica Lìs</h1>
          <p className="text-sm font-bold text-black/80">CNPJ: 39.156.577/0001-22</p>
          <p className="text-xs text-black/60 leading-relaxed max-w-sm">
            Avenida Anápolis Qd 03 Lt 01 - Nª 2134 - Vila Concórdia - Cep 74770-270
          </p>
        </div>
        <div className="text-right space-y-1 border-2 border-black p-5 rounded-xl bg-[#FFD700] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[11px] font-black uppercase tracking-widest text-black/60">Ordem de Serviço</p>
          <p className="text-3xl font-black text-black">#{(sale.id?.slice(-6) || '000000').toUpperCase()}</p>
          <p className="text-[10px] font-bold text-black/40 italic uppercase">{new Date(sale.data || Date.now()).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* Client Data Section */}
      <div className="mb-8 p-4 bg-[#F2F2F2] rounded-xl border-l-8 border-[#FFD700]">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2">Dados do Cliente</h3>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <p><strong className="text-black/60 uppercase text-[10px]">Nome Completo:</strong><br/><span className="font-bold text-base">{sale.cliente_nome}</span></p>
          <p><strong className="text-black/60 uppercase text-[10px]">CPF / Documento:</strong><br/><span className="font-bold text-base">{sale.cliente_cpf || '---.---.--- --'}</span></p>
        </div>
      </div>

      {/* Prescription Table */}
      <div className="mb-8">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2">Dados Técnicos da Receita</h3>
        <div className="border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
          <table className="w-full border-collapse text-center text-sm">
            <thead>
              <tr className="bg-[#FFD700] uppercase text-[10px] font-black text-black border-b-2 border-black">
                <th className="p-2 border-r border-black/20">Olho</th>
                <th className="p-2 border-r border-black/20">Esférico</th>
                <th className="p-2 border-r border-black/20">Cilíndrico</th>
                <th className="p-2 border-r border-black/20">Eixo</th>
                <th className="p-2 border-r border-black/20">DNP</th>
                <th className="p-2">Adição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              <tr className="bg-white">
                <td className="p-3 font-black bg-[#F2F2F2] text-[10px]">LONGE OD</td>
                <td className="p-3 border-x border-black/5">{sale.od_esferico || '0.00'}</td>
                <td className="p-3 border-r border-black/5">{sale.od_cilindrico || '0.00'}</td>
                <td className="p-3 border-r border-black/5">{sale.od_eixo || '0'}°</td>
                <td className="p-3 border-r border-black/5">{sale.dnp_od || '--'} mm</td>
                <td className="p-3 font-bold" rowSpan={2}>{sale.adicao || '--'}</td>
              </tr>
              <tr className="bg-[#F2F2F2]/30">
                <td className="p-3 font-black bg-[#F2F2F2] text-[10px]">LONGE OE</td>
                <td className="p-3 border-x border-black/5">{sale.oe_esferico || '0.00'}</td>
                <td className="p-3 border-r border-black/5">{sale.oe_cilindrico || '0.00'}</td>
                <td className="p-3 border-r border-black/5">{sale.oe_eixo || '0'}°</td>
                <td className="p-3 border-r border-black/5">{sale.dnp_oe || '--'} mm</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Frame & Lens Detail Section */}
      <div className="grid grid-cols-2 gap-8 mb-10">
        <div className="space-y-4">
          <div className="border-b-2 border-black pb-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40">Especificação da Armação</h3>
            <p className="text-sm font-bold mt-1 text-black">{sale.produto_nome || '--'}</p>
          </div>
          <div className="bg-[#F2F2F2] p-3 rounded-lg text-xs italic text-black/60 min-h-[40px]">
            {sale.observacoes || 'Nenhuma observação técnica adicional registrada.'}
          </div>
        </div>
        <div className="space-y-4">
          <div className="border-b-2 border-black pb-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40">Status do Laboratório</h3>
            <p className="text-sm font-bold mt-1 text-black uppercase">{sale.status || 'EM PROCESSAMENTO'}</p>
          </div>
          <p className="text-xs font-medium text-black/60">O.S. validada conforme especificações técnicas Ótica Lìs.</p>
        </div>
      </div>

      {/* Financial Highlight */}
      <div className="bg-[#FFD700] p-8 border-4 border-black mb-12 flex justify-between items-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-black/60">Forma de Pagamento</p>
          <p className="text-xl font-bold text-black uppercase">{sale.forma_pagamento || 'A DEFINIR'}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-black/60">Total Líquido a Pagar</p>
          <p className="text-5xl font-black text-black leading-none">R$ {Number(sale.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Footer & Signature */}
      <div className="space-y-12">
        <div className="text-center w-full max-w-md mx-auto border-t-2 border-black pt-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-black/30">Assinatura de Conformidade do Cliente</p>
          <p className="text-[8px] mt-1 italic text-black/20">Autorizo a Ótica Lìs a executar o serviço conforme parâmetros técnicos acima.</p>
        </div>
        
        <div className="flex justify-between items-center text-[8px] text-black/20 uppercase font-bold tracking-[0.2em]">
           <span>Ótica Lìs ERP</span>
           <span>Página 1 / 1</span>
           <span>Gerado em {new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    </div>
  );
};

export default PrintOS;

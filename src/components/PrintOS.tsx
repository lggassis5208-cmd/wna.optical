import React from 'react';

interface PrintOSProps {
  sale: any;
  settings: any;
}

const PrintOS: React.FC<PrintOSProps> = ({ sale, settings }) => {
  if (!sale || !settings) return null;

  const { empresa, sistema } = settings;

  return (
    <div className="print-container hidden print:block bg-white text-black p-8 font-serif leading-tight">
      <style>{`
        @media print {
          body { background: white !important; }
          .print-container { 
            display: block !important;
            visibility: visible !important;
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            height: auto;
            margin: 0;
            padding: 2cm;
          }
          #root > :not(.print-container),
          .animate-in,
          aside,
          header,
          button:not(.print-only) { 
            display: none !important; 
          }
        }
      `}</style>
      
      {/* Header */}
      <div className="border-b-2 border-black pb-6 mb-6 flex justify-between items-start">
        <div className="flex items-center gap-6">
          <img src="/otica.png" alt="Logo" className="w-32 h-auto object-contain" />
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">{empresa.nome_fantasia || 'Ótica Lis'}</h1>
            <p className="text-xs font-bold">{empresa.razao_social}</p>
            <p className="text-xs mt-1">CNPJ: {empresa.cnpj} | IE: {empresa.ie}</p>
            <p className="text-xs">{empresa.endereco}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-black">ORDEM DE SERVIÇO</p>
          <p className="text-2xl font-black">#{(sale.id?.slice(-6) || '000000').toUpperCase()}</p>
          <p className="text-xs mt-1">{new Date(sale.data || Date.now()).toLocaleDateString('pt-BR')} às {new Date(sale.data || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      {/* Client Data */}
      <div className="mb-6">
        <h3 className="text-xs font-black uppercase border-b border-black mb-2 bg-gray-100 px-1">Dados do Cliente</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p><strong>Nome:</strong> {sale.cliente_nome}</p>
          <p><strong>CPF:</strong> {sale.cliente_cpf}</p>
        </div>
      </div>

      {/* Prescription / Receita */}
      <div className="mb-6">
        <h3 className="text-xs font-black uppercase border-b border-black mb-2 bg-gray-100 px-1">Dados da Receita</h3>
        <table className="w-full border-collapse border border-black text-center text-sm">
          <thead>
            <tr className="bg-gray-50 uppercase text-[10px] font-black">
              <th className="border border-black p-1">Olho</th>
              <th className="border border-black p-1">Esférico</th>
              <th className="border border-black p-1">Cilíndrico</th>
              <th className="border border-black p-1">Eixo</th>
              <th className="border border-black p-1">DNP</th>
              <th className="border border-black p-1">Adição</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-2 font-black">LONGE OD</td>
              <td className="border border-black p-2">{sale.od_esferico || '0.00'}</td>
              <td className="border border-black p-2">{sale.od_cilindrico || '0.00'}</td>
              <td className="border border-black p-2">{sale.od_eixo || '0'}°</td>
              <td className="border border-black p-2">{sale.dnp_od || '--'} mm</td>
              <td className="border border-black p-2" rowSpan={2}>{sale.adicao || '--'}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-black">LONGE OE</td>
              <td className="border border-black p-2">{sale.oe_esferico || '0.00'}</td>
              <td className="border border-black p-2">{sale.oe_cilindrico || '0.00'}</td>
              <td className="border border-black p-2">{sale.oe_eixo || '0'}°</td>
              <td className="border border-black p-2">{sale.dnp_oe || '--'} mm</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Frame & Lens */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-xs font-black uppercase border-b border-black mb-2 bg-gray-100 px-1">Armação</h3>
          <div className="text-sm space-y-1">
            <p><strong>Marca/Modelo:</strong> {sale.produto_nome || '--'}</p>
            <p><strong>Cor/Detalhes:</strong> {sale.observacoes || 'Nenhuma observação'}</p>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-black uppercase border-b border-black mb-2 bg-gray-100 px-1">Lentes / Tratamentos</h3>
          <div className="text-sm space-y-1">
            <p><strong>Especificação:</strong> Lentes de Grau Personalizadas</p>
            <p><strong>Tratamentos:</strong> {sale.status === 'Pronto' ? 'Conferido no Laboratório' : 'Pendente de Processamento'}</p>
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="bg-gray-100 p-4 border border-black mb-8 flex justify-between items-center">
        <div className="text-sm">
          <p><strong>Forma de Pagamento:</strong> {sale.forma_pagamento}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-widest">Documento não fiscal para uso interno e laboratorial</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-black uppercase">Valor Total</p>
          <p className="text-3xl font-black">R$ {Number(sale.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Warranty & Footer */}
      <div className="grid grid-cols-1 gap-8">
        <div>
          <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1">Termos de Garantia</p>
          <p className="text-xs italic leading-relaxed text-gray-600">
            {sistema.termos_garantia}
          </p>
        </div>
        <div className="flex justify-between items-end mt-12">
          <div className="text-center w-64 border-t border-black pt-2">
            <p className="text-[10px] font-black uppercase">Responsável Ótica Lis</p>
          </div>
          <div className="text-center w-72 border-t border-black pt-2">
            <p className="text-[10px] font-black uppercase">Assinatura do Cliente</p>
            <p className="text-[8px] mt-1 italic">Autorizo a execução do serviço conforme prescrição acima.</p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-[8px] text-center text-gray-400 border-t border-dashed border-gray-200 pt-4 grayscale opacity-50 no-print">
        Ótica Lis ERP - Documento gerado eletronicamente em {new Date().toLocaleString('pt-BR')}
      </div>
    </div>
  );
};

export default PrintOS;

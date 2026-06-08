import { formatDate } from '../lib/dateUtils';
import { storage, getEffectiveAddress } from '../lib/storage';
import { QRCodeSVG } from 'qrcode.react';

interface PrintNFCeProps {
  sale: any;
  settings: any;
  chaveAcesso?: string;
  protocolo?: string;
}

export default function PrintNFCe({ sale, settings, chaveAcesso, protocolo }: PrintNFCeProps) {
  if (!sale) return null;

  const getBarcode = () => {
    return chaveAcesso ? chaveAcesso.replace(/(.{4})/g, '$1 ').trim() : '0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000';
  };

  const getAddress = () => {
    if (settings?.empresa?.endereco) return settings.empresa.endereco;
    return getEffectiveAddress(sale.criado_em);
  };

  const urlConsulta = 'http://nfe.sefaz.go.gov.br/nfeweb/sites/nfce/danfeNFCe';

  const items = sale.itens && sale.itens.length > 0 ? sale.itens : [
    {
      id: '001',
      nome: `LENTE ${sale.tipo_lente || ''} ${sale.tratamento || ''}`.trim(),
      qtd: 1,
      vUn: Number(sale.valor_total || 0),
      vTot: Number(sale.valor_total || 0)
    }
  ];

  const totalGeral = items.reduce((acc: number, item: any) => acc + Number(item.vTot || 0), 0);
  const totalQtd = items.reduce((acc: number, item: any) => acc + Number(item.qtd || 1), 0);

  return (
    <div className="print-nfce-container hidden print:flex bg-white text-black font-sans text-[12px] w-full min-h-screen justify-center pt-2">
      <style>
        {`
          @media print {
            @page { size: auto; margin: 0mm; }
            body { 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
              background: white !important; 
              margin: 0;
            }
            .print-nfce-container {
              display: flex !important;
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              height: auto;
              background: white !important;
              z-index: 999999;
              justify-content: center;
              padding-top: 10px;
            }
            #root > :not(.print-nfce-container) { display: none !important; }
            * { box-sizing: border-box; }
          }
        `}
      </style>

      {/* Container simulando a bobina */}
      <div className="w-[80mm] border border-dashed border-gray-400 p-2 mx-auto">
        <div className="text-center font-bold mb-2">
           <h1 className="text-sm uppercase">{settings?.empresa?.nome_fantasia || 'ÓTICA LÌS'}</h1>
           <p className="text-[10px] font-normal mt-1">CNPJ: {settings?.empresa?.cnpj || '39.156.577/0001-22'}</p>
           <p className="text-[10px] font-normal">{getAddress()}</p>
           <p className="text-[10px] font-normal">Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</p>
        </div>

        <div className="border-t border-b border-dashed border-black py-2 my-2 text-[10px]">
           <table className="w-full text-left">
             <thead>
               <tr>
                 <th className="pb-1 w-10">Cód.</th>
                 <th className="pb-1">Desc.</th>
                 <th className="pb-1 text-right w-6">Qtd</th>
                 <th className="pb-1 text-right w-12">Vl.Un</th>
                 <th className="pb-1 text-right w-12">Vl.Tot</th>
               </tr>
             </thead>
             <tbody>
               {items.map((item: any, i: number) => (
                 <tr key={i}>
                   <td className="align-top py-0.5">{item.id || item.codigo || `00${i+1}`}</td>
                   <td className="align-top py-0.5">{item.nome}</td>
                   <td className="text-right align-top py-0.5">{Number(item.qtd || 1)}</td>
                   <td className="text-right align-top py-0.5">{Number(item.vUn || 0).toFixed(2)}</td>
                   <td className="text-right align-top py-0.5">{Number(item.vTot || 0).toFixed(2)}</td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>

        <div className="text-[12px] font-bold">
           <div className="flex justify-between">
              <span>Qtd Total de Itens</span>
              <span>{totalQtd}</span>
           </div>
           <div className="flex justify-between mt-1 text-sm">
              <span>VALOR TOTAL R$</span>
              <span>{totalGeral.toFixed(2).replace('.', ',')}</span>
           </div>
           <div className="flex justify-between mt-1 text-[10px] font-normal">
              <span>Forma de Pagamento</span>
              <span>Valor Pago R$</span>
           </div>
           <div className="flex justify-between text-[11px]">
              <span>{sale.forma_pagamento || 'Cartão'}</span>
              <span>{totalGeral.toFixed(2).replace('.', ',')}</span>
           </div>
        </div>

        <div className="text-center text-[10px] border-t border-dashed border-black pt-2 mt-2">
           <p>Consulte pela Chave de Acesso em</p>
           <p className="underline">{urlConsulta}</p>
           <p className="font-bold my-2 font-mono tracking-wider break-words">{getBarcode()}</p>
        </div>

        <div className="flex justify-center my-4">
           {chaveAcesso ? (
             <QRCodeSVG 
                value={`${urlConsulta}?p=${chaveAcesso}|2|1|1|`}
                size={120}
             />
           ) : (
             <div className="w-[120px] h-[120px] bg-gray-200 border flex items-center justify-center text-[10px] text-center">
               QR Code<br/>NFC-e
             </div>
           )}
        </div>

        <div className="text-center text-[9px] mt-2 border-t border-dashed border-black pt-2">
           <p><strong>CONSUMIDOR CPF:</strong> {sale.paciente_cpf || 'Não Informado'}</p>
           <p>{sale.paciente_nome || sale.cliente_nome}</p>
           <p className="mt-2 font-bold">NFC-e nº 000123 Série 1</p>
           <p>Data de Emissão: {formatDate(new Date().toISOString())}</p>
           <p>Protocolo de Autorização: {protocolo || '152260000000000'}</p>
        </div>
      </div>
    </div>
  );
}

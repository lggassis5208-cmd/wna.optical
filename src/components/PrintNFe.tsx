import { formatDate } from '../lib/dateUtils';
import { storage, getEffectiveAddress } from '../lib/storage';
import { QRCodeSVG } from 'qrcode.react';

interface PrintNFeProps {
  sale: any;
  settings: any;
  chaveAcesso?: string;
  protocolo?: string;
}

export default function PrintNFe({ sale, settings, chaveAcesso, protocolo }: PrintNFeProps) {
  if (!sale) return null;

  const getBarcode = () => {
    return chaveAcesso ? chaveAcesso.replace(/(.{4})/g, '$1 ').trim() : '0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000';
  };

  const getAddress = () => {
    if (sale.cliente_endereco) return sale.cliente_endereco;
    if (settings?.empresa?.endereco) return settings.empresa.endereco;
    return getEffectiveAddress(sale.criado_em);
  };

  const getBairro = () => sale.cliente_bairro || 'Não Informado';
  const getCep = () => sale.cliente_cep || '00000-000';

  const items = sale.itens && sale.itens.length > 0 ? sale.itens : [
    {
      id: '001',
      nome: `LENTE ${sale.tipo_lente || ''} ${sale.tratamento || ''}`.trim(),
      ncm: '90031100',
      qtd: 1,
      vUn: Number(sale.valor_total || 0),
      vTot: Number(sale.valor_total || 0)
    }
  ];

  const totalGeral = items.reduce((acc: number, item: any) => acc + Number(item.vTot || 0), 0);

  return (
    <div className="print-nfe-container hidden print:block absolute inset-0 bg-white text-black font-sans text-[10px] w-full min-h-screen">
      <style>
        {`
          @media print {
            @page { size: A4 portrait; margin: 5mm; }
            body { 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
              background: white !important; 
              margin: 0;
            }
            .print-nfe-container {
              display: block !important;
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              height: auto;
              background: white !important;
              z-index: 999999;
            }
            #root > :not(.print-nfe-container) { display: none !important; }
            * { box-sizing: border-box; }
          }
        `}
      </style>

      <div className="w-[190mm] mx-auto border border-black p-1">
        
        {/* CABEÇALHO DANFE */}
        <div className="flex border border-black mb-1">
          {/* Quadro 1: Emitente */}
          <div className="w-[45%] border-r border-black p-2 flex flex-col justify-center">
            <h1 className="font-bold text-sm uppercase text-center">{settings?.empresa?.nome_fantasia || 'ÓTICA LÌS'}</h1>
            <p className="text-center mt-1">{getAddress()}</p>
            <p className="text-center">GOIÂNIA - GO | Fone: (62) 9999-9999</p>
          </div>
          
          {/* Quadro 2: Título DANFE */}
          <div className="w-[15%] border-r border-black p-2 flex flex-col items-center justify-center text-center">
            <h2 className="font-bold text-lg">DANFE</h2>
            <p>Documento Auxiliar da Nota Fiscal Eletrônica</p>
            <div className="mt-2 text-left w-full">
              <p>0 - Entrada</p>
              <p>1 - Saída <span className="float-right border border-black px-1 font-bold">1</span></p>
            </div>
            <p className="mt-2 font-bold text-xs">Nº 000.001.234</p>
            <p className="font-bold text-xs">SÉRIE: 1</p>
            <p>Página 1 de 1</p>
          </div>

          {/* Quadro 3: Código de Barras */}
          <div className="w-[40%] p-2 flex flex-col justify-between">
            <div>
               <p className="uppercase font-bold text-[8px] mb-1">Controle do Fisco</p>
               <div className="h-10 w-full border border-gray-300 flex items-center justify-center bg-gray-100">
                  <span className="font-mono text-xs tracking-widest">||||| | |||| |||| || | || ||||| |</span>
               </div>
            </div>
            <div className="mt-2">
               <p className="uppercase text-[8px]">Chave de Acesso</p>
               <p className="font-mono text-xs font-bold">{getBarcode()}</p>
            </div>
            <div className="mt-2 text-center text-[9px]">
               Consulta de autenticidade no portal nacional da NF-e www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora
            </div>
          </div>
        </div>

        {/* NATUREZA DA OPERAÇÃO */}
        <div className="flex border border-black mb-1">
          <div className="w-[60%] border-r border-black p-1">
            <p className="uppercase text-[7px]">Natureza da Operação</p>
            <p className="font-bold">VENDA DE MERCADORIA</p>
          </div>
          <div className="w-[40%] p-1">
            <p className="uppercase text-[7px]">Protocolo de Autorização de Uso</p>
            <p className="font-bold">{protocolo || '152260000000000'} - {formatDate(new Date().toISOString())}</p>
          </div>
        </div>

        {/* INSCRIÇÕES */}
        <div className="flex border border-black mb-2">
          <div className="w-[33.3%] border-r border-black p-1">
             <p className="uppercase text-[7px]">Inscrição Estadual</p>
             <p className="font-bold">{settings?.empresa?.inscricao_estadual || '10.784.952-1'}</p>
          </div>
          <div className="w-[33.3%] border-r border-black p-1">
             <p className="uppercase text-[7px]">Inscr. Estadual do Subst. Trib.</p>
             <p className="font-bold"></p>
          </div>
          <div className="w-[33.3%] p-1">
             <p className="uppercase text-[7px]">CNPJ</p>
             <p className="font-bold">{settings?.empresa?.cnpj || '39.156.577/0001-22'}</p>
          </div>
        </div>

        {/* DESTINATÁRIO */}
        <p className="font-bold text-[9px] mb-0.5 uppercase">Destinatário / Remetente</p>
        <div className="border border-black mb-2">
          <div className="flex border-b border-black">
             <div className="w-[60%] border-r border-black p-1">
                <p className="uppercase text-[7px]">Nome / Razão Social</p>
                <p className="font-bold truncate">{sale.paciente_nome || sale.cliente_nome || 'Consumidor Final'}</p>
             </div>
             <div className="w-[25%] border-r border-black p-1">
                <p className="uppercase text-[7px]">CNPJ/CPF</p>
                <p className="font-bold">{sale.paciente_cpf || '000.000.000-00'}</p>
             </div>
             <div className="w-[15%] p-1">
                <p className="uppercase text-[7px]">Data da Emissão</p>
                <p className="font-bold">{formatDate(sale.criado_em).split(' ')[0]}</p>
             </div>
          </div>
          <div className="flex">
              <div className="w-[45%] border-r border-black p-1">
                <p className="uppercase text-[7px]">Endereço</p>
                <p className="font-bold truncate">{getAddress()}</p>
             </div>
             <div className="w-[25%] border-r border-black p-1">
                <p className="uppercase text-[7px]">Bairro/Distrito</p>
                <p className="font-bold truncate">{getBairro()}</p>
             </div>
             <div className="w-[10%] border-r border-black p-1">
                <p className="uppercase text-[7px]">CEP</p>
                <p className="font-bold">{getCep()}</p>
             </div>
             <div className="w-[20%] p-1">
                <p className="uppercase text-[7px]">Data Saída/Entrada</p>
                <p className="font-bold">{formatDate(sale.criado_em).split(' ')[0]}</p>
             </div>
          </div>
        </div>

        {/* RECEITA CLÍNICA TÉCNICA (ESPECÍFICO DE ERP ÓPTICO) */}
        <p className="font-bold text-[9px] mb-0.5 uppercase text-primary">Receita / Ficha Clínica Vinculada</p>
        <div className="border border-black mb-2 flex flex-col text-[8px] bg-white/[0.02]">
          <div className="flex border-b border-black font-bold bg-gray-100">
             <div className="w-[20%] border-r border-black p-1">Olho</div>
             <div className="w-[16%] border-r border-black p-1 text-center">Esférico</div>
             <div className="w-[16%] border-r border-black p-1 text-center">Cilíndrico</div>
             <div className="w-[16%] border-r border-black p-1 text-center">Eixo</div>
             <div className="w-[16%] border-r border-black p-1 text-center">Adição</div>
             <div className="w-[16%] p-1 text-center">DNP</div>
          </div>
          <div className="flex border-b border-black">
             <div className="w-[20%] border-r border-black p-1 font-bold">OD (Direito)</div>
             <div className="w-[16%] border-r border-black p-1 text-center">{sale.od_esferico || '0.00'}</div>
             <div className="w-[16%] border-r border-black p-1 text-center">{sale.od_cilindrico || '0.00'}</div>
             <div className="w-[16%] border-r border-black p-1 text-center">{sale.od_eixo || '0'}°</div>
             <div className="w-[16%] border-r border-black p-1 text-center">{sale.od_adicao || '0.00'}</div>
             <div className="w-[16%] p-1 text-center">{sale.od_dnp || '0'}</div>
          </div>
          <div className="flex">
             <div className="w-[20%] border-r border-black p-1 font-bold">OE (Esquerdo)</div>
             <div className="w-[16%] border-r border-black p-1 text-center">{sale.oe_esferico || '0.00'}</div>
             <div className="w-[16%] border-r border-black p-1 text-center">{sale.oe_cilindrico || '0.00'}</div>
             <div className="w-[16%] border-r border-black p-1 text-center">{sale.oe_eixo || '0'}°</div>
             <div className="w-[16%] border-r border-black p-1 text-center">{sale.oe_adicao || '0.00'}</div>
             <div className="w-[16%] p-1 text-center">{sale.oe_dnp || '0'}</div>
          </div>
        </div>

        {/* CÁLCULO DO IMPOSTO */}
        <p className="font-bold text-[9px] mb-0.5 uppercase">Cálculo do Imposto</p>
        <div className="border border-black mb-2 flex">
           <div className="flex-1 border-r border-black p-1">
              <p className="uppercase text-[7px]">Base Cálculo ICMS</p>
              <p className="font-bold text-right">0,00</p>
           </div>
           <div className="flex-1 border-r border-black p-1">
              <p className="uppercase text-[7px]">Valor do ICMS</p>
              <p className="font-bold text-right">0,00</p>
           </div>
           <div className="flex-1 border-r border-black p-1">
              <p className="uppercase text-[7px]">Base Cálculo ICMS ST</p>
              <p className="font-bold text-right">0,00</p>
           </div>
           <div className="flex-1 border-r border-black p-1">
              <p className="uppercase text-[7px]">Valor do ICMS ST</p>
              <p className="font-bold text-right">0,00</p>
           </div>
           <div className="flex-1 p-1">
              <p className="uppercase text-[7px]">Valor Total dos Produtos</p>
              <p className="font-bold text-right">{totalGeral.toFixed(2).replace('.', ',')}</p>
           </div>
        </div>

        {/* DADOS DOS PRODUTOS */}
        <p className="font-bold text-[9px] mb-0.5 uppercase">Dados do Produto/Serviço</p>
        <div className="border border-black min-h-[75mm] mb-2">
          <table className="w-full text-[8px]">
            <thead>
              <tr className="border-b border-black">
                <th className="border-r border-black p-1 text-left">CÓD. PROD.</th>
                <th className="border-r border-black p-1 text-left">DESCRIÇÃO DO PROD./SERV.</th>
                <th className="border-r border-black p-1">NCM/SH</th>
                <th className="border-r border-black p-1">CST</th>
                <th className="border-r border-black p-1">CFOP</th>
                <th className="border-r border-black p-1">UNID.</th>
                <th className="border-r border-black p-1">QUANT.</th>
                <th className="border-r border-black p-1">V. UNIT.</th>
                <th className="p-1">V. TOTAL</th>
              </tr>
            </thead>
            <tbody>
               {items.map((item: any, i: number) => (
                 <tr key={i}>
                    <td className="border-r border-black p-1">{item.id || item.codigo || `00${i+1}`}</td>
                    <td className="border-r border-black p-1">{item.nome}</td>
                    <td className="border-r border-black p-1 text-center">{item.ncm || '90031100'}</td>
                    <td className="border-r border-black p-1 text-center">0102</td>
                    <td className="border-r border-black p-1 text-center">5102</td>
                    <td className="border-r border-black p-1 text-center">UN</td>
                    <td className="border-r border-black p-1 text-right">{Number(item.qtd || 1).toFixed(2)}</td>
                    <td className="border-r border-black p-1 text-right">{Number(item.vUn || 0).toFixed(2).replace('.', ',')}</td>
                    <td className="p-1 text-right">{Number(item.vTot || 0).toFixed(2).replace('.', ',')}</td>
                 </tr>
               ))}
            </tbody>
          </table>
        </div>

        {/* DADOS ADICIONAIS */}
        <p className="font-bold text-[9px] mb-0.5 uppercase">Dados Adicionais</p>
        <div className="border border-black flex min-h-[25mm]">
           <div className="w-[60%] border-r border-black p-1">
              <p className="uppercase text-[7px]">Informações Complementares</p>
              <p className="text-[8px] mt-1">
                DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. 
                NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI. 
                O.S. REFERÊNCIA: {sale.os_number}
              </p>
           </div>
           <div className="w-[40%] p-1">
              <p className="uppercase text-[7px]">Reservado ao Fisco</p>
           </div>
        </div>

      </div>
    </div>
  );
}

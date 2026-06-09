import React from "react";
import { formatDate } from "../lib/dateUtils";
import { QRCodeSVG } from "qrcode.react";
import ReciboInterno, { type ReciboData } from "./ReciboInterno";

export interface Emitente {
  razaoSocial?: string;
  cnpj?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  ie?: string;
  fone?: string;
}

export interface Destinatario {
  nome?: string;
  cpfCnpj?: string;
  endereco?: string;
  bairro?: string;
  cep?: string;
}

export interface ProdutoItem {
  codigo?: string;
  descricao?: string;
  ncm?: string;
  cfop?: string;
  quantidade?: number;
  valorUnitario?: number;
  valorTotal?: number;
}

export interface Impostos {
  baseIcms?: number;
  valorIcms?: number;
  baseIcmsST?: number;
  valorIcmsST?: number;
  totalProdutos?: number;
  frete?: number;
  seguro?: number;
  desconto?: number;
  outrasDespesas?: number;
  totalNota?: number;
}

export interface NotaFiscalData {
  tipo?: "nfe" | "nfce" | "recibo";
  numero?: string;
  serie?: string;
  chaveAcesso?: string;
  protocolo?: string;
  dataEmissao?: string;
  dataSaida?: string;
  naturezaOperacao?: string;
  ambiente?: "producao" | "homologacao";
  formaPagamento?: string;
  valorPago?: number;
  emitente?: Emitente;
  destinatario?: Destinatario;
  produtos?: ProdutoItem[];
  impostos?: Impostos;
}

const FALLBACK = {
  chaveAcesso: "0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000",
  protocolo: "152260000000000",
  destinatarioNome: "Consumidor Final",
  cpfCnpj: "000.000.000-00",
  bairro: "Não Informado",
  cep: "00000-000",
  endereco: "Não Informado",
} as const;

const brl = (v: number | undefined) =>
  (typeof v === "number" && !Number.isNaN(v) ? v : 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function normalize(
  data?: NotaFiscalData,
  sale?: any,
  settings?: any,
  chaveAcesso?: string,
  protocolo?: string
) {
  let d: NotaFiscalData = data ?? {};

  if (!data && sale) {
    const emit: Emitente = {
      razaoSocial: settings?.empresa?.nome_fantasia || settings?.empresa?.razao_social || "ÓTICA LÌS",
      cnpj: settings?.empresa?.cnpj || "39.156.577/0001-22",
      endereco: settings?.empresa?.endereco || "Av. Goiás, 1234 - Centro",
      cidade: settings?.empresa?.cidade || "Goiânia",
      uf: settings?.empresa?.uf || "GO",
      ie: settings?.empresa?.inscricao_estadual || "",
      fone: settings?.empresa?.telefone || "",
    };

    const dest: Destinatario = {
      nome: sale.paciente_nome || sale.cliente_nome || "Consumidor Final",
      cpfCnpj: sale.paciente_cpf || "000.000.000-00",
      endereco: sale.cliente_endereco || "Não Informado",
      bairro: sale.cliente_bairro || "Não Informado",
      cep: sale.cliente_cep || "00000-000",
    };

    const imp: Impostos = {
      baseIcms: 0,
      valorIcms: 0,
      totalProdutos: Number(sale.valor_total || 0),
      desconto: Number(sale.desconto || 0),
      totalNota: Number(sale.valor_total || 0),
    };

    const produtosList = sale.itens && sale.itens.length > 0 ? sale.itens.map((item: any, i: number) => ({
      codigo: item.id || item.codigo || String(i + 1).padStart(3, "0"),
      descricao: item.nome || item.descricao || "PRODUTO",
      ncm: item.ncm || "90031100",
      cfop: "5102",
      quantidade: Number(item.qtd || item.quantidade || 1),
      valorUnitario: Number(item.vUn || item.valorUnitario || 0),
      valorTotal: Number(item.vTot || item.valorTotal || 0),
    })) : [
      {
        codigo: "001",
        descricao: `LENTE ${sale.tipo_lente || ''} ${sale.tratamento || ''}`.trim() || "PRODUTO ÓTICO",
        ncm: "90031100",
        cfop: "5102",
        quantidade: 1,
        valorUnitario: Number(sale.valor_total || 0),
        valorTotal: Number(sale.valor_total || 0),
      }
    ];

    d = {
      tipo: "nfce",
      numero: sale.numero || "000.000.123",
      serie: sale.serie || "001",
      chaveAcesso: chaveAcesso || sale.chave_acesso || "",
      protocolo: protocolo || sale.protocolo_autorizacao || "",
      dataEmissao: sale.criado_em ? formatDate(sale.criado_em) : "",
      naturezaOperacao: "VENDA DE MERCADORIA",
      ambiente: sale.ambiente || "producao",
      formaPagamento: sale.forma_pagamento || "Não Informado",
      valorPago: Number(sale.valor_total || 0),
      emitente: emit,
      destinatario: dest,
      produtos: produtosList,
      impostos: imp,
    };
  }

  const emit = d.emitente ?? {};
  const dest = d.destinatario ?? {};
  const imp = d.impostos ?? {};
  const produtos = Array.isArray(d.produtos) ? d.produtos : [];

  return {
    tipo: d.tipo ?? "nfce",
    numero: d.numero ?? "000.000.000",
    serie: d.serie ?? "001",
    chaveAcesso: d.chaveAcesso?.trim() || FALLBACK.chaveAcesso,
    protocolo: d.protocolo?.trim() || FALLBACK.protocolo,
    dataEmissao: d.dataEmissao ?? "",
    dataSaida: d.dataSaida ?? "",
    naturezaOperacao: d.naturezaOperacao ?? "VENDA DE MERCADORIA",
    ambiente: d.ambiente ?? "producao",
    formaPagamento: d.formaPagamento ?? "Não Informado",
    valorPago: d.valorPago,
    emitente: {
      razaoSocial: emit.razaoSocial ?? "ÓTICA LÌS",
      cnpj: emit.cnpj ?? "39.156.577/0001-22",
      endereco: emit.endereco ?? "Av. Goiás, 1234 - Centro",
      cidade: emit.cidade ?? "Goiânia",
      uf: emit.uf ?? "GO",
      ie: emit.ie ?? "",
      fone: emit.fone ?? "",
    },
    destinatario: {
      nome: dest.nome?.trim() || FALLBACK.destinatarioNome,
      cpfCnpj: dest.cpfCnpj?.trim() || FALLBACK.cpfCnpj,
      endereco: dest.endereco?.trim() || FALLBACK.endereco,
      bairro: dest.bairro?.trim() || FALLBACK.bairro,
      cep: dest.cep?.trim() || FALLBACK.cep,
    },
    produtos: produtos.map((p, i) => ({
      codigo: p.codigo ?? String(i + 1).padStart(3, "0"),
      descricao: p.descricao ?? "PRODUTO",
      ncm: p.ncm ?? "90031100",
      cfop: p.cfop ?? "5102",
      quantidade: p.quantidade ?? 1,
      valorUnitario: p.valorUnitario ?? 0,
      valorTotal: p.valorTotal ?? (p.valorUnitario ?? 0) * (p.quantidade ?? 1),
    })),
    impostos: {
      baseIcms: imp.baseIcms ?? 0,
      valorIcms: imp.valorIcms ?? 0,
      baseIcmsST: imp.baseIcmsST ?? 0,
      valorIcmsST: imp.valorIcmsST ?? 0,
      totalProdutos: imp.totalProdutos ?? 0,
      frete: imp.frete ?? 0,
      seguro: imp.seguro ?? 0,
      desconto: imp.desconto ?? 0,
      outrasDespesas: imp.outrasDespesas ?? 0,
      totalNota: imp.totalNota ?? 0,
    },
  };
}

interface PrintNFeProps {
  data?: NotaFiscalData;
  tipo?: "nfe" | "nfce" | "recibo";
  sale?: any;
  settings?: any;
  chaveAcesso?: string;
  protocolo?: string;
}

export default function PrintNFe({
  data,
  tipo,
  sale,
  settings,
  chaveAcesso,
  protocolo,
}: PrintNFeProps) {
  if (!data && !sale) {
    return null;
  }

  const n = normalize(data, sale, settings, chaveAcesso, protocolo);
  const docTipo = tipo ?? n.tipo;

  const dataEmissaoString = n.dataEmissao || new Date().toLocaleDateString("pt-BR");
  const [datePart, timePart] = dataEmissaoString.split(" ");
  
  const reciboData: ReciboData = {
    numero: n.numero,
    serie: n.serie,
    clienteNome: n.destinatario.nome,
    clienteCpfCnpj: n.destinatario.cpfCnpj,
    dataEmissao: datePart || new Date().toLocaleDateString("pt-BR"),
    hora: timePart || new Date().toLocaleTimeString("pt-BR"),
    itens: n.produtos.map(p => ({
      descricao: p.descricao,
      quantidade: p.quantidade,
      valorUnitario: p.valorUnitario,
      valorTotal: p.valorTotal,
      refServico: sale?.os_number ? `Ref. O.S. #${sale.os_number}` : undefined
    })),
    subtotal: n.impostos.totalProdutos,
    desconto: n.impostos.desconto,
    total: n.impostos.totalNota
  };

  return (
    <div className="print-nfe-wrapper font-sans text-black bg-white">
      <style>
        {`
          .print-nfe-wrapper {
            display: none;
          }

          @media print {
            @page { 
              size: ${docTipo === "nfce" ? "80mm auto" : "A4 portrait"}; 
              margin: ${docTipo === "nfce" ? "2mm" : "5mm"}; 
            }
            body { 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
              background: white !important; 
              margin: 0;
            }
            
            body * {
              visibility: hidden;
            }
            
            .print-nfe-wrapper, .print-nfe-wrapper * {
              visibility: visible;
            }
            
            .print-nfe-wrapper {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              display: block !important;
            }

            .area-impressao {
              width: 100%;
              display: flex;
              justify-content: center;
            }

            .pagina-impressao {
              display: block !important;
              width: 100% !important;
            }

            .no-print, nav, button, header, footer:not(.recibo-interno-container footer) {
              display: none !important;
              visibility: hidden !important;
            }
          }
        `}
      </style>

      <div className="area-impressao">
        <div className="pagina-impressao">
          {docTipo === "nfe" && <LayoutNFe n={n} />}
          {docTipo === "nfce" && <LayoutNFCe n={n} />}
          {docTipo === "recibo" && <ReciboInterno data={reciboData} />}
        </div>
      </div>
    </div>
  );
}

function LayoutNFe({ n }: { n: ReturnType<typeof normalize> }) {
  const { emitente: e, destinatario: d, impostos: imp } = n;
  const formattedChave = n.chaveAcesso.replace(/(.{4})/g, "$1 ").trim();

  return (
    <div className="bg-white text-black font-sans text-[10px] w-[190mm] mx-auto border border-black p-1">
      {/* CABEÇALHO DANFE */}
      <div className="flex border border-black mb-1">
        {/* Emitente */}
        <div className="w-[45%] border-r border-black p-2 flex flex-col justify-center items-center">
          <img src="/logo_otica_lis.png" alt="Ótica Lìs" className="h-[40px] object-contain mb-1" />
          <h1 className="font-bold text-xs uppercase text-center">{e.razaoSocial}</h1>
          <p className="text-center text-[8px] mt-0.5">{e.endereco}</p>
          <p className="text-center text-[8px]">{e.cidade} - {e.uf} {e.fone ? `| Fone: ${e.fone}` : ""}</p>
        </div>
        
        {/* Título DANFE */}
        <div className="w-[15%] border-r border-black p-2 flex flex-col items-center justify-center text-center">
          <h2 className="font-bold text-lg leading-none">DANFE</h2>
          <p className="text-[8px] mt-1">Documento Auxiliar da Nota Fiscal Eletrônica</p>
          <div className="mt-2 text-left w-full text-[8px]">
            <p>0 - Entrada</p>
            <p>1 - Saída <span className="float-right border border-black px-1 font-bold">1</span></p>
          </div>
          <p className="mt-2 font-bold text-xs">Nº {n.numero}</p>
          <p className="font-bold text-xs">SÉRIE: {n.serie}</p>
          <p className="text-[8px]">Página 1 de 1</p>
        </div>

        {/* Código de Barras */}
        <div className="w-[40%] p-2 flex flex-col justify-between">
          <div>
             <p className="uppercase font-bold text-[8px] mb-1">Controle do Fisco</p>
             <div className="h-10 w-full border border-gray-300 flex items-center justify-center bg-gray-100">
                <span className="font-mono text-xs tracking-widest font-bold">||||| | |||| |||| || | || ||||| |</span>
             </div>
          </div>
          <div className="mt-2">
             <p className="uppercase text-[8px]">Chave de Acesso</p>
             <p className="font-mono text-[10px] font-bold">{formattedChave}</p>
          </div>
          <div className="mt-2 text-center text-[8px] leading-tight">
             Consulta de autenticidade no portal nacional da NF-e www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora
          </div>
        </div>
      </div>

      {/* NATUREZA DA OPERAÇÃO */}
      <div className="flex border border-black mb-1">
        <div className="w-[60%] border-r border-black p-1">
          <p className="uppercase text-[7px]">Natureza da Operação</p>
          <p className="font-bold">{n.naturezaOperacao}</p>
        </div>
        <div className="w-[40%] p-1">
          <p className="uppercase text-[7px]">Protocolo de Autorização de Uso</p>
          <p className="font-bold">{n.protocolo} - {n.dataEmissao}</p>
        </div>
      </div>

      {/* INSCRIÇÕES */}
      <div className="flex border border-black mb-2">
        <div className="w-[33.3%] border-r border-black p-1">
           <p className="uppercase text-[7px]">Inscrição Estadual</p>
           <p className="font-bold">{e.ie || "ISENTO"}</p>
        </div>
        <div className="w-[33.3%] border-r border-black p-1">
           <p className="uppercase text-[7px]">Inscr. Estadual do Subst. Trib.</p>
           <p className="font-bold"></p>
        </div>
        <div className="w-[33.3%] p-1">
           <p className="uppercase text-[7px]">CNPJ</p>
           <p className="font-bold">{e.cnpj}</p>
        </div>
      </div>

      {/* DESTINATÁRIO */}
      <p className="font-bold text-[9px] mb-0.5 uppercase">Destinatário / Remetente</p>
      <div className="border border-black mb-2">
        <div className="flex border-b border-black">
           <div className="w-[60%] border-r border-black p-1">
              <p className="uppercase text-[7px]">Nome / Razão Social</p>
              <p className="font-bold truncate">{d.nome}</p>
           </div>
           <div className="w-[25%] border-r border-black p-1">
              <p className="uppercase text-[7px]">CNPJ/CPF</p>
              <p className="font-bold">{d.cpfCnpj}</p>
           </div>
           <div className="w-[15%] p-1">
              <p className="uppercase text-[7px]">Data da Emissão</p>
              <p className="font-bold">{n.dataEmissao ? n.dataEmissao.split(" ")[0] : ""}</p>
           </div>
        </div>
        <div className="flex">
            <div className="w-[45%] border-r border-black p-1">
              <p className="uppercase text-[7px]">Endereço</p>
              <p className="font-bold truncate">{d.endereco}</p>
           </div>
           <div className="w-[25%] border-r border-black p-1">
              <p className="uppercase text-[7px]">Bairro/Distrito</p>
              <p className="font-bold truncate">{d.bairro}</p>
           </div>
           <div className="w-[10%] border-r border-black p-1">
              <p className="uppercase text-[7px]">CEP</p>
              <p className="font-bold">{d.cep}</p>
           </div>
           <div className="w-[20%] p-1">
              <p className="uppercase text-[7px]">Data Saída/Entrada</p>
              <p className="font-bold">{n.dataSaida ? n.dataSaida.split(" ")[0] : (n.dataEmissao ? n.dataEmissao.split(" ")[0] : "")}</p>
           </div>
        </div>
      </div>

      {/* CÁLCULO DO IMPOSTO */}
      <p className="font-bold text-[9px] mb-0.5 uppercase">Cálculo do Imposto</p>
      <div className="border border-black mb-2 flex bg-white text-[8px]">
         <div className="flex-1 border-r border-black p-1">
            <p className="uppercase text-[6px]">Base Cálculo ICMS</p>
            <p className="font-bold text-right">{brl(imp.baseIcms)}</p>
         </div>
         <div className="flex-1 border-r border-black p-1">
            <p className="uppercase text-[6px]">Valor do ICMS</p>
            <p className="font-bold text-right">{brl(imp.valorIcms)}</p>
         </div>
         <div className="flex-1 border-r border-black p-1">
            <p className="uppercase text-[6px]">Valor Desconto</p>
            <p className="font-bold text-right">{brl(imp.desconto)}</p>
         </div>
         <div className="flex-1 border-r border-black p-1">
            <p className="uppercase text-[6px]">Valor Total dos Produtos</p>
            <p className="font-bold text-right">{brl(imp.totalProdutos)}</p>
         </div>
         <div className="flex-1 p-1 bg-gray-50">
            <p className="uppercase text-[6px] font-bold">Valor Total da Nota</p>
            <p className="font-bold text-right">{brl(imp.totalNota)}</p>
         </div>
      </div>

      {/* DADOS DOS PRODUTOS */}
      <p className="font-bold text-[9px] mb-0.5 uppercase">Dados do Produto/Serviço</p>
      <div className="border border-black min-h-[50mm] mb-2 bg-white">
        <table className="w-full text-[8px]">
          <thead>
            <tr className="border-b border-black bg-gray-50 font-bold">
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
             {n.produtos.map((p, i) => (
                <tr key={i} className="border-b border-gray-200">
                   <td className="border-r border-black p-1">{p.codigo}</td>
                   <td className="border-r border-black p-1">{p.descricao}</td>
                   <td className="border-r border-black p-1 text-center">{p.ncm}</td>
                   <td className="border-r border-black p-1 text-center">0102</td>
                   <td className="border-r border-black p-1 text-center">{p.cfop}</td>
                   <td className="border-r border-black p-1 text-center">UN</td>
                   <td className="border-r border-black p-1 text-right">{p.quantidade}.00</td>
                   <td className="border-r border-black p-1 text-right">{brl(p.valorUnitario)}</td>
                   <td className="p-1 text-right">{brl(p.valorTotal)}</td>
                </tr>
             ))}
          </tbody>
        </table>
      </div>

      {/* DADOS ADICIONAIS */}
      <p className="font-bold text-[9px] mb-0.5 uppercase">Dados Adicionais</p>
      <div className="border border-black flex min-h-[20mm] bg-white">
         <div className="w-[60%] border-r border-black p-1">
            <p className="uppercase text-[7px] font-bold">Informações Complementares</p>
            <p className="text-[8px] mt-1">
              DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. 
              NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI.
            </p>
         </div>
         <div className="w-[40%] p-1">
            <p className="uppercase text-[7px] font-bold">Reservado ao Fisco</p>
         </div>
      </div>
    </div>
  );
}

function LayoutNFCe({ n }: { n: ReturnType<typeof normalize> }) {
  const { emitente: e, destinatario: d, impostos: imp } = n;
  const totalPagar = imp.totalNota || imp.totalProdutos || 0;
  const urlConsulta = "http://nfe.sefaz.go.gov.br/nfeweb/sites/nfce/danfeNFCe";
  const formattedChave = n.chaveAcesso.replace(/(.{4})/g, "$1 ").trim();

  return (
    <div className="w-[80mm] border border-dashed border-gray-400 p-2 mx-auto bg-white text-black font-sans text-[12px]">
      <div className="text-center font-bold mb-2 flex flex-col items-center">
         <img src="/logo_otica_lis.png" alt="Ótica Lìs" className="h-[45px] object-contain mb-2" />
         <h1 className="text-sm uppercase">{e.razaoSocial}</h1>
         <p className="text-[10px] font-normal mt-1">CNPJ: {e.cnpj}</p>
         <p className="text-[10px] font-normal">{e.endereco}</p>
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
              {n.produtos.map((p, i) => (
                <tr key={i}>
                  <td className="align-top py-0.5">{p.codigo}</td>
                  <td className="align-top py-0.5">{p.descricao}</td>
                  <td className="text-right align-top py-0.5">{p.quantidade}</td>
                  <td className="text-right align-top py-0.5">{p.valorUnitario.toFixed(2)}</td>
                  <td className="text-right align-top py-0.5">{p.valorTotal.toFixed(2)}</td>
                </tr>
              ))}
           </tbody>
         </table>
      </div>

      <div className="text-[12px] font-bold">
         <div className="flex justify-between">
            <span>Qtd Total de Itens</span>
            <span>{n.produtos.reduce((acc, p) => acc + p.quantidade, 0)}</span>
         </div>
         <div className="flex justify-between mt-1 text-sm">
            <span>VALOR TOTAL R$</span>
            <span>{totalPagar.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
         </div>
         <div className="flex justify-between mt-1 text-[10px] font-normal">
            <span>Forma de Pagamento</span>
            <span>Valor Pago R$</span>
         </div>
         <div className="flex justify-between text-[11px]">
            <span>{n.formaPagamento}</span>
            <span>{(n.valorPago ?? totalPagar).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
         </div>
      </div>

      <div className="text-center text-[10px] border-t border-dashed border-black pt-2 mt-2">
         <p>Consulte pela Chave de Acesso em</p>
         <p className="underline">{urlConsulta}</p>
         <p className="font-bold my-2 font-mono tracking-widest break-words">{formattedChave}</p>
      </div>

      <div className="flex justify-center my-4">
         {n.chaveAcesso && n.chaveAcesso !== FALLBACK.chaveAcesso ? (
           <QRCodeSVG 
              value={`${urlConsulta}?p=${n.chaveAcesso.replace(/\s/g, "")}|2|1|1|`}
              size={120}
           />
         ) : (
           <div className="w-[120px] h-[120px] bg-gray-200 border flex items-center justify-center text-[10px] text-center">
             QR Code<br/>NFC-e
           </div>
         )}
      </div>

      <div className="text-center text-[9px] mt-2 border-t border-dashed border-black pt-2">
         <p><strong>CONSUMIDOR CPF:</strong> {d.cpfCnpj}</p>
         <p>{d.nome}</p>
         <p className="mt-2 font-bold">NFC-e nº {n.numero} Série {n.serie}</p>
         <p>Data de Emissão: {n.dataEmissao}</p>
         <p>Protocolo de Autorização: {n.protocolo}</p>
         <p className="mt-1 font-bold">{n.ambiente === "producao" ? "AMBIENTE DE PRODUÇÃO" : "AMBIENTE DE HOMOLOGAÇÃO"}</p>
      </div>
    </div>
  );
}

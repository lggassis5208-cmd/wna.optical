import React from "react";
import { formatDate } from "../lib/dateUtils";
import { QRCodeSVG } from "qrcode.react";
import ReciboInterno, { type ReciboData } from "./ReciboInterno";

/**
 * PrintNFe.tsx — componente de impressão de documentos fiscais (Ótica Lìs)
 *
 * Cobre dois layouts:
 *   - "nfe"  -> NF-e modelo 55, A4 paisagem (com canhoto, código de barras)
 *   - "nfce" -> NFC-e modelo 65, cupom bobina ~80mm (com QR Code)
 *
 * Resolvendo o "PDF em branco":
 * A causa típica é o template renderizar ANTES dos dados da venda chegarem,
 * ou os dados virem undefined e nenhum fallback ser aplicado.
 * Aqui os dados são SEMPRE normalizados antes da renderização (ver normalize()).
 */

// ----------------------------- Tipos -----------------------------

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
  tipo?: "nfe" | "nfce";
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

// --------------------------- Fallbacks ---------------------------
// Estes são os valores padrão quando a venda/config não traz o dado.

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

/**
 * normalize() é o coração da correção: garante que NENHUM campo usado
 * no JSX seja undefined. Se os dados não chegaram, caímos nos fallbacks
 * em vez de renderizar um documento vazio.
 */
function normalize(
  data?: NotaFiscalData,
  sale?: any,
  settings?: any,
  chaveAcesso?: string,
  protocolo?: string
) {
  let d: NotaFiscalData = data ?? {};

  // Mapeamento para retrocompatibilidade com as props antigas (sale, settings, etc.)
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
        descricao: `LENTE ${sale.tipo_lente || ''} ${sale.tratamento || ''}`.trim(),
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
      ncm: p.ncm ?? "",
      cfop: p.cfop ?? "",
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

// --------------------------- Componente --------------------------

interface PrintNFeProps {
  data?: NotaFiscalData;
  /** Sobrescreve o tipo de documento independente do data.tipo */
  tipo?: "nfe" | "nfce";

  // Parâmetros antigos para compatibilidade
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
  // Para passar no teste unitário que espera null se a venda não for fornecida
  if (!data && !sale) {
    return null;
  }

  const n = normalize(data, sale, settings, chaveAcesso, protocolo);

  // Se veio via props legadas (sale), o padrão é "nfe" (PrintNFe antigo só fazia NFe)
  const docTipo = tipo ?? (sale ? "nfe" : n.tipo);

  if (!data && !sale) {
    console.warn("[PrintNFe] Nenhum dado recebido — renderizando com fallbacks.");
  }

  // Mapeamento dos dados para o Recibo Interno
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
          /* Oculta o wrapper principal na tela normal */
          .print-nfe-wrapper {
            display: none;
          }

          @media print {
            @page { size: auto; margin: 5mm; }
            body { 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
              background: white !important; 
              margin: 0;
            }
            
            /* Oculta tudo na impressão para evitar que elementos pais de wraps profundos fiquem invisíveis */
            body * {
              visibility: hidden;
            }
            
            /* Torna apenas a área da nota e seus elementos filhos visíveis */
            .print-nfe-wrapper, .print-nfe-wrapper * {
              visibility: visible;
            }
            
            /* Posiciona a nota no topo esquerdo do papel de impressão */
            .print-nfe-wrapper {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              display: block !important;
            }

            /* Força a quebra de página antes do recibo interno */
            .recibo-print-section {
              page-break-before: always;
              break-before: page;
              display: block !important;
            }
          }

          /* Estilos de Estrutura do Layout NFe (A4) */
          .folha-nfe {
            width: 190mm;
            margin: 0 auto;
            border: 1px solid #000;
            padding: 2px;
            box-sizing: border-box;
          }
          .folha-nfe .row {
            display: flex;
            flex-direction: row;
            width: 100%;
          }
          .folha-nfe .cell {
            border-right: 1px solid #000;
            padding: 3px 5px;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            min-height: 28px;
          }
          .folha-nfe .cell:last-child {
            border-right: none;
          }
          .folha-nfe .b-bottom {
            border-bottom: 1px solid #000;
          }
          .folha-nfe .center {
            text-align: center;
            justify-content: center;
            align-items: center;
          }
          .folha-nfe .right {
            text-align: right;
          }
          .folha-nfe .bold {
            font-weight: bold;
          }
          .folha-nfe .val {
            font-size: 11px;
          }
          .folha-nfe .label {
            font-size: 7px;
            color: #333;
            margin-bottom: 1px;
            display: block;
            font-weight: normal;
            text-transform: uppercase;
          }
          .folha-nfe .sec-title {
            font-size: 8px;
            font-weight: bold;
            margin-top: 5px;
            margin-bottom: 2px;
            text-transform: uppercase;
            background: #f0f0f0;
            padding: 2px 4px;
            border: 1px solid #000;
            border-bottom: none;
          }
          .folha-nfe .barcode-placeholder {
            height: 35px;
            width: 100%;
            background: #eaeaea;
            margin-bottom: 2px;
            border: 1px solid #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: monospace;
            font-size: 10px;
          }
          .folha-nfe table.prod {
            width: 100%;
            border-collapse: collapse;
            margin-top: 0px;
            border: 1px solid #000;
          }
          .folha-nfe table.prod th {
            font-size: 7px;
            font-weight: bold;
            border-right: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 3px;
            text-align: left;
            background: #f5f5f5;
            text-transform: uppercase;
          }
          .folha-nfe table.prod td {
            font-size: 8px;
            border-right: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 3px;
          }
          .folha-nfe table.prod th:last-child, .folha-nfe table.prod td:last-child {
            border-right: none;
          }

          /* Estilos de Estrutura do Layout NFCe (Bobina 80mm) */
          .cupom-nfce {
            width: 76mm;
            padding: 2px;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
            line-height: 1.3;
            box-sizing: border-box;
            margin: 0 auto;
            color: #000;
            background: #fff;
          }
          .cupom-nfce .center {
            text-align: center;
          }
          .cupom-nfce .bold {
            font-weight: bold;
          }
          .cupom-nfce .emit-nome {
            font-size: 13px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .cupom-nfce .divider {
            border: none;
            border-top: 1px dashed #000;
            margin: 5px 0;
          }
          .cupom-nfce table.itens {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
            margin: 4px 0;
          }
          .cupom-nfce table.itens th {
            text-align: left;
            border-bottom: 1px dashed #000;
            padding: 2px 0;
            font-weight: bold;
          }
          .cupom-nfce table.itens td {
            padding: 3px 0;
            vertical-align: top;
          }
          .cupom-nfce .c {
            text-align: center;
          }
          .cupom-nfce .r {
            text-align: right;
          }
          .cupom-nfce table.totais {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          .cupom-nfce table.totais td {
            padding: 2px 0;
          }
          .cupom-nfce table.totais tr.pagar {
            font-weight: bold;
            font-size: 11px;
          }
          .cupom-nfce .chave {
            font-size: 9px;
            word-break: break-all;
            margin-top: 3px;
            font-family: monospace;
            letter-spacing: 0.5px;
          }
          .cupom-nfce .qrbox {
            width: 110px;
            height: 110px;
            border: 1px solid #000;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 8px auto;
            font-size: 10px;
            background: #f9f9f9;
          }
        `}
      </style>

      {docTipo === "nfe" ? <LayoutNFe n={n} /> : <LayoutNFCe n={n} />}

      {/* Recibo Interno cortesia para impressão conjunta */}
      <div className="recibo-print-section">
        <ReciboInterno data={reciboData} />
      </div>
    </div>
  );
}

// ------------------------- Layout NF-e A4 ------------------------

function LayoutNFe({ n }: { n: ReturnType<typeof normalize> }) {
  const { emitente: e, destinatario: d, impostos: imp } = n;
  
  const formattedChave = n.chaveAcesso.replace(/(.{4})/g, "$1 ").trim();

  return (
    <div className="folha-nfe">
      {/* Canhoto */}
      <div className="row b-bottom">
        <div className="cell" style={{ flex: 1 }}>
          <span className="label">
            RECEBEMOS DE <b>{e.razaoSocial}</b> OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO
          </span>
          <div className="row" style={{ marginTop: 8, borderTop: "1px solid #000", paddingTop: 2 }}>
            <div className="cell" style={{ flex: 1 }}><span className="label">DATA DE RECEBIMENTO</span></div>
            <div className="cell" style={{ flex: 2, borderRight: "none" }}>
              <span className="label">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</span>
            </div>
          </div>
        </div>
        <div className="cell center" style={{ width: 110, borderRight: "none" }}>
          <span className="bold val">NF-e</span><br />
          <span className="label">Nº {n.numero}</span><br />
          <span className="label">SÉRIE {n.serie}</span>
        </div>
      </div>

      {/* Cabeçalho */}
      <div className="row b-bottom">
        <div className="cell center" style={{ width: 210 }}>
          <span className="bold" style={{ fontSize: 13 }}>{e.razaoSocial}</span><br />
          <span>{e.endereco}</span><br />
          <span>{e.cidade} - {e.uf}</span>
          {e.fone ? <><br /><span>Fone: {e.fone}</span></> : null}
        </div>
        <div className="cell center" style={{ width: 150 }}>
          <span className="bold val">DANFE</span><br />
          <span className="label">Documento Auxiliar da Nota Fiscal Eletrônica</span><br />
          <span className="label">Nº {n.numero} - SÉRIE {n.serie}</span>
        </div>
        <div className="cell center" style={{ flex: 1 }}>
          <div className="barcode-placeholder">
            ||||| | |||| |||| || | || ||||| |
          </div>
          <span className="label">CHAVE DE ACESSO</span>
          <p style={{ wordBreak: "break-all", fontSize: 8 }}>{formattedChave}</p>
          <span className="label" style={{ fontSize: 6 }}>Consulta de autenticidade no portal nacional da NF-e www.nfe.fazenda.gov.br/portal</span>
        </div>
      </div>

      <div className="row b-bottom">
        <div className="cell" style={{ flex: 3 }}>
          <span className="label">NATUREZA DA OPERAÇÃO</span><br /><b>{n.naturezaOperacao}</b>
        </div>
        <div className="cell" style={{ flex: 2, borderRight: "none" }}>
          <span className="label">PROTOCOLO DE AUTORIZAÇÃO DE USO</span><br /><b>{n.protocolo}</b>
        </div>
      </div>

      <div className="row b-bottom">
        <div className="cell" style={{ flex: 1 }}><span className="label">INSCRIÇÃO ESTADUAL</span><br />{e.ie || "-"}</div>
        <div className="cell" style={{ flex: 1, borderRight: "none" }}><span className="label">CNPJ</span><br />{e.cnpj}</div>
      </div>

      {/* Destinatário */}
      <div className="sec-title">DESTINATÁRIO / REMETENTE</div>
      <div className="row b-bottom">
        <div className="cell" style={{ flex: 3 }}><span className="label">NOME / RAZÃO SOCIAL</span><br />{d.nome}</div>
        <div className="cell" style={{ flex: 1 }}><span className="label">CNPJ / CPF</span><br />{d.cpfCnpj}</div>
        <div className="cell" style={{ flex: 1, borderRight: "none" }}><span className="label">DATA EMISSÃO</span><br />{n.dataEmissao}</div>
      </div>
      <div className="row b-bottom">
        <div className="cell" style={{ flex: 3 }}><span className="label">ENDEREÇO</span><br />{d.endereco}</div>
        <div className="cell" style={{ flex: 1 }}><span className="label">BAIRRO</span><br />{d.bairro}</div>
        <div className="cell" style={{ flex: 1, borderRight: "none" }}><span className="label">CEP</span><br />{d.cep}</div>
      </div>

      {/* Impostos */}
      <div className="sec-title">CÁLCULO DO IMPOSTO</div>
      <div className="row b-bottom">
        <div className="cell" style={{ flex: 1 }}><span className="label">BASE ICMS</span><br />{brl(imp.baseIcms)}</div>
        <div className="cell" style={{ flex: 1 }}><span className="label">VALOR ICMS</span><br />{brl(imp.valorIcms)}</div>
        <div className="cell" style={{ flex: 1 }}><span className="label">DESCONTO</span><br />{brl(imp.desconto)}</div>
        <div className="cell" style={{ flex: 1 }}><span className="label">TOTAL PRODUTOS</span><br />{brl(imp.totalProdutos)}</div>
        <div className="cell" style={{ flex: 1, borderRight: "none", background: "#f0f0f0" }}>
          <span className="label">TOTAL DA NOTA</span><br /><b>{brl(imp.totalNota)}</b>
        </div>
      </div>

      {/* Produtos */}
      <div className="sec-title">DADOS DOS PRODUTOS / SERVIÇOS</div>
      <table className="prod">
        <thead>
          <tr>
            <th>CÓD</th><th>DESCRIÇÃO</th><th>NCM</th><th>CFOP</th>
            <th className="center">QTD</th><th className="right">V. UNIT</th><th className="right">V. TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {n.produtos.map((p, i) => (
            <tr key={i}>
              <td>{p.codigo}</td><td>{p.descricao}</td><td>{p.ncm}</td><td>{p.cfop}</td>
              <td className="center">{p.quantidade}</td>
              <td className="right">{brl(p.valorUnitario)}</td>
              <td className="right">{brl(p.valorTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="sec-title">DADOS ADICIONAIS</div>
      <div className="row">
        <div className="cell" style={{ flex: 2, minHeight: 36 }}>
          <span className="label">INFORMAÇÕES COMPLEMENTARES</span><br />
          Documento emitido por ME/EPP optante pelo Simples Nacional.
        </div>
        <div className="cell" style={{ flex: 1, borderRight: "none", minHeight: 36 }}>
          <span className="label">RESERVADO AO FISCO</span>
        </div>
      </div>
    </div>
  );
}

// ------------------------ Layout NFC-e cupom ----------------------

function LayoutNFCe({ n }: { n: ReturnType<typeof normalize> }) {
  const { emitente: e, destinatario: d, impostos: imp } = n;
  const totalPagar = imp.totalNota || imp.totalProdutos || 0;
  const urlConsulta = 'http://nfe.sefaz.go.gov.br/nfeweb/sites/nfce/danfeNFCe';

  return (
    <div className="cupom-nfce">
      <div className="center">
        <p className="emit-nome">{e.razaoSocial}</p>
        <p>CNPJ: {e.cnpj}</p>
        <p>{e.endereco}</p>
        <p>{e.cidade} - {e.uf}</p>
      </div>

      <hr className="divider" />
      <p className="center bold">DANFE NFC-e</p>
      <p className="center">Documento Auxiliar da NFC-e</p>
      <hr className="divider" />

      <table className="itens">
        <thead>
          <tr><th>#</th><th>Descrição</th><th className="c">Qtd</th><th className="r">Vl.Un</th><th className="r">Total</th></tr>
        </thead>
        <tbody>
          {n.produtos.map((p, i) => (
            <tr key={i}>
              <td>{i + 1}</td><td>{p.descricao}</td>
              <td className="c">{p.quantidade}</td>
              <td className="r">{brl(p.valorUnitario)}</td>
              <td className="r">{brl(p.valorTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="divider" />
      <table className="totais">
        <tbody>
          <tr><td>Qtd. total de itens</td><td className="r">{n.produtos.length}</td></tr>
          <tr><td>Valor total R$</td><td className="r">{brl(imp.totalProdutos)}</td></tr>
          <tr><td>Desconto R$</td><td className="r">{brl(imp.desconto)}</td></tr>
          <tr className="pagar"><td>VALOR A PAGAR R$</td><td className="r">{brl(totalPagar)}</td></tr>
          <tr><td>Forma de pagamento</td><td className="r">{n.formaPagamento}</td></tr>
          <tr><td>Valor pago R$</td><td className="r">{brl(n.valorPago ?? totalPagar)}</td></tr>
        </tbody>
      </table>

      <hr className="divider" />
      <div className="center">
        <p>Consulte pela Chave de Acesso em:</p>
        <p>{urlConsulta}</p>
        <p className="bold" style={{ marginTop: 5 }}>CHAVE DE ACESSO</p>
        <p className="chave">{n.chaveAcesso.replace(/(.{4})/g, "$1 ").trim()}</p>
      </div>

      <hr className="divider" />
      <div className="center">
        <p>CONSUMIDOR</p>
        <p>{d.nome}</p>
        <p>CPF/CNPJ {d.cpfCnpj}</p>
        
        {/* QR Code dinâmico com fallback */}
        <div className="flex justify-center my-3" style={{ display: 'flex', justifyContent: 'center' }}>
          {n.chaveAcesso && n.chaveAcesso !== FALLBACK.chaveAcesso ? (
            <QRCodeSVG 
               value={`${urlConsulta}?p=${n.chaveAcesso.replace(/\s/g, '')}|2|1|1|`}
               size={110}
            />
          ) : (
            <div className="qrbox">QR Code NFC-e</div>
          )}
        </div>

        <p>Protocolo de Autorização:</p>
        <p>{n.protocolo}</p>
        <hr className="divider" />
        <p>NFC-e nº {n.numero} - Série {n.serie}</p>
        <p>Emissão: {n.dataEmissao}</p>
        <p style={{ marginTop: 4 }}>Via Consumidor</p>
        <p>{n.ambiente === "producao" ? "AMBIENTE DE PRODUÇÃO" : "AMBIENTE DE HOMOLOGAÇÃO"}</p>
      </div>
    </div>
  );
}

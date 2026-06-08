import React, { useState } from "react";
import PrintNFe, { NotaFiscalData } from "./PrintNFe";

/**
 * SimularImpressaoNota.tsx
 *
 * Módulo isolado para TESTAR a renderização/impressão do DANFE sem depender
 * do fluxo real (sem validações de cliente, sem chamada à SEFAZ).
 *
 * Objetivo: provar que a parte de RENDER + IMPRESSÃO funciona, separando-a
 * do botão "Gerar nota avulsa" que está sem resposta. Se este módulo imprime
 * corretamente, o problema está no handler/abertura do módulo real — não na
 * geração do documento.
 *
 * Uso:
 *   <SimularImpressaoNota />            // abre com dados mock de NFC-e
 *   <SimularImpressaoNota tipo="nfe" /> // dados mock de NF-e A4
 *
 * Para acesso rápido em DEV, monte numa rota tipo /dev/print-test.
 */

const MOCK_NFCE: NotaFiscalData = {
  tipo: "nfce",
  numero: "000.000.123",
  serie: "001",
  chaveAcesso: "5226 0539 1565 7700 0122 6500 1123 4561 1234 5678",
  protocolo: "152260000000000",
  dataEmissao: "08/06/2026 14:31:58",
  formaPagamento: "Cartão Crédito",
  ambiente: "homologacao",
  emitente: {
    razaoSocial: "ÓTICA LÌS",
    cnpj: "39.156.577/0001-22",
    endereco: "Av. Goiás, 1234 - Centro",
    cidade: "Goiânia",
    uf: "GO",
  },
  destinatario: { nome: "LUCAS GASSIS", cpfCnpj: "123.456.789-00" },
  produtos: [
    {
      codigo: "001",
      descricao: "LENTE VISÃO SIMPLES C/ ANTIRREFLEXO",
      quantidade: 1,
      valorUnitario: 350.0,
      valorTotal: 350.0,
    },
  ],
  impostos: { totalProdutos: 350.0, desconto: 0, totalNota: 350.0 },
};

const MOCK_NFE: NotaFiscalData = {
  tipo: "nfe",
  numero: "000.000.123",
  serie: "001",
  chaveAcesso: "5226 0639 1565 7700 0122 5500 1000 0001 2315 2260 0001",
  protocolo: "152260000123456 - 08/06/2026 20:30:00",
  dataEmissao: "08/06/2026",
  naturezaOperacao: "VENDA DE MERCADORIA",
  emitente: {
    razaoSocial: "ÓTICA LÌS",
    cnpj: "39.156.577/0001-22",
    endereco: "Av. Goiás, 1234 - Centro",
    cidade: "Goiânia",
    uf: "GO",
    ie: "10.987.654-3",
  },
  destinatario: {
    nome: "JOÃO DA SILVA",
    cpfCnpj: "123.456.789-00",
    endereco: "Rua das Flores, 56",
    bairro: "Setor Sul",
    cep: "74080-000",
  },
  produtos: [
    { codigo: "001", descricao: "LENTE VARILUX LIBERTY ORMA C/ CRIZAL EASY", ncm: "9001.40", cfop: "5102", quantidade: 1, valorUnitario: 850.0, valorTotal: 850.0 },
    { codigo: "002", descricao: "ARMAÇÃO RAY-BAN RX7140", ncm: "9003.11", cfop: "5102", quantidade: 1, valorUnitario: 650.0, valorTotal: 650.0 },
  ],
  impostos: { baseIcms: 1500.0, valorIcms: 255.0, totalProdutos: 1500.0, desconto: 0, totalNota: 1500.0 },
};

interface Props {
  tipo?: "nfe" | "nfce";
}

export default function SimularImpressaoNota({ tipo: tipoInicial = "nfce" }: Props) {
  const [tipo, setTipo] = useState<"nfe" | "nfce">(tipoInicial);
  const data = tipo === "nfe" ? MOCK_NFE : MOCK_NFCE;

  const handleImprimir = () => {
    // Simulação direta: pula validações e SEFAZ, vai direto pra impressão.
    window.print();
  };

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <div className="no-print" style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <strong style={{ marginRight: 8 }}>Simulação de impressão (modo teste)</strong>
        <button
          onClick={() => setTipo("nfce")}
          style={btnStyle(tipo === "nfce")}
        >
          NFC-e (cupom)
        </button>
        <button
          onClick={() => setTipo("nfe")}
          style={btnStyle(tipo === "nfe")}
        >
          NF-e (A4)
        </button>
        <button onClick={handleImprimir} style={{ ...btnStyle(false), marginLeft: "auto", fontWeight: 600 }}>
          Imprimir / Gerar PDF
        </button>
      </div>

      {/* Área impressa: renderiza o documento direto com os dados mock */}
      <div className="area-impressao">
        <PrintNFe data={data} tipo={tipo} />
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .area-impressao { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}

function btnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #ccc",
    background: active ? "#1d9e75" : "#fff",
    color: active ? "#fff" : "#333",
    cursor: "pointer",
  };
}

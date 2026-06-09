import React from "react";

export interface ReciboItem {
  descricao: string;
  refServico?: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface ReciboData {
  numero: string;
  serie: string;
  clienteNome: string;
  clienteCpfCnpj: string;
  dataEmissao: string;
  hora: string;
  itens: ReciboItem[];
  subtotal: number;
  desconto: number;
  total: number;
}

interface ReciboInternoProps {
  data?: ReciboData;
}

const FALLBACK = {
  clienteNome: "Consumidor Final",
  clienteCpfCnpj: "000.000.000-00",
  numero: "000000",
  serie: "001",
  dataEmissao: new Date().toLocaleDateString("pt-BR"),
  hora: new Date().toLocaleTimeString("pt-BR"),
} as const;

const formatBrl = (v: number | undefined) =>
  (typeof v === "number" && !Number.isNaN(v) ? v : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function ReciboInterno({ data }: ReciboInternoProps) {
  const r = data ?? {
    numero: FALLBACK.numero,
    serie: FALLBACK.serie,
    clienteNome: FALLBACK.clienteNome,
    clienteCpfCnpj: FALLBACK.clienteCpfCnpj,
    dataEmissao: FALLBACK.dataEmissao,
    hora: FALLBACK.hora,
    itens: [],
    subtotal: 0,
    desconto: 0,
    total: 0,
  };

  const numero = r.numero || FALLBACK.numero;
  const serie = r.serie || FALLBACK.serie;
  const clienteNome = r.clienteNome?.trim() || FALLBACK.clienteNome;
  const clienteCpfCnpj = r.clienteCpfCnpj?.trim() || FALLBACK.clienteCpfCnpj;
  const dataEmissao = r.dataEmissao || FALLBACK.dataEmissao;
  const hora = r.hora || FALLBACK.hora;
  const itens = Array.isArray(r.itens) ? r.itens : [];
  const subtotal = typeof r.subtotal === "number" ? r.subtotal : 0;
  const desconto = typeof r.desconto === "number" ? r.desconto : 0;
  const total = typeof r.total === "number" ? r.total : 0;

  return (
    <div
      className="recibo-interno-container"
      style={{
        width: "100%",
        maxWidth: "190mm",
        minHeight: "272mm",
        backgroundColor: "#ffffff",
        border: "3px solid #2d3142",
        padding: "20px",
        boxSizing: "border-box",
        fontFamily: "'Inter', Arial, sans-serif",
        color: "#2d3142",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        {/* Cabeçalho Luxuoso */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "2px solid #c5a880",
            paddingBottom: "15px",
            marginBottom: "20px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: "900",
                letterSpacing: "2px",
                color: "#2d3142",
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              Ótica <span style={{ color: "#c5a880", fontStyle: "italic" }}>Lìs</span>
            </h1>
            <p style={{ fontSize: "10px", color: "#8e8d97", margin: "4px 0 0 0", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase" }}>
              Estilo e Precisão Visual
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span
              style={{
                backgroundColor: "#2d3142",
                color: "#c5a880",
                fontSize: "10px",
                fontWeight: "900",
                padding: "4px 10px",
                borderRadius: "5px",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
              }}
            >
              Recibo Interno
            </span>
            <p style={{ fontSize: "11px", fontWeight: "bold", margin: "6px 0 0 0" }}>
              Nº {numero} | Série {serie}
            </p>
          </div>
        </div>

        {/* Título Principal do Comprovante */}
        <div style={{ textAlign: "center", marginBottom: "25px" }}>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "800",
              color: "#2d3142",
              margin: 0,
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            Comprovante de Venda
          </h2>
          <div
            style={{
              width: "40px",
              height: "3px",
              backgroundColor: "#c5a880",
              margin: "8px auto 0 auto",
            }}
          />
        </div>

        {/* Dados da Venda e do Destinatário */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            marginBottom: "30px",
            backgroundColor: "#fcfcfd",
            border: "1px solid #eaeaea",
            borderRadius: "8px",
            padding: "15px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "9px", fontWeight: "800", color: "#8e8d97", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Identificação do Cliente
            </span>
            <span style={{ fontSize: "13px", fontWeight: "bold", color: "#2d3142" }}>{clienteNome}</span>
            <span style={{ fontSize: "11px", color: "#5c5c64" }}>CPF/CNPJ: {clienteCpfCnpj}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px", textAlign: "right" }}>
            <span style={{ fontSize: "9px", fontWeight: "800", color: "#8e8d97", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Dados de Emissão
            </span>
            <span style={{ fontSize: "12px", fontWeight: "bold", color: "#2d3142" }}>
              Data: {dataEmissao}
            </span>
            <span style={{ fontSize: "11px", color: "#5c5c64" }}>Hora: {hora}</span>
          </div>
        </div>

        {/* Itens e Serviços */}
        <div style={{ marginBottom: "30px" }}>
          <h3
            style={{
              fontSize: "11px",
              fontWeight: "900",
              textTransform: "uppercase",
              letterSpacing: "1px",
              color: "#c5a880",
              marginBottom: "10px",
              borderBottom: "1px solid #eaeaea",
              paddingBottom: "5px",
            }}
          >
            Produtos / Serviços Detalhados
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #2d3142" }}>
                <th style={{ textAlign: "left", fontSize: "10px", fontWeight: "800", padding: "8px 5px", textTransform: "uppercase" }}>Descritivo do Item</th>
                <th style={{ textAlign: "center", fontSize: "10px", fontWeight: "800", padding: "8px 5px", textTransform: "uppercase", width: "80px" }}>Qtd</th>
                <th style={{ textAlign: "right", fontSize: "10px", fontWeight: "800", padding: "8px 5px", textTransform: "uppercase", width: "120px" }}>V. Unitário</th>
                <th style={{ textAlign: "right", fontSize: "10px", fontWeight: "800", padding: "8px 5px", textTransform: "uppercase", width: "120px" }}>V. Total</th>
              </tr>
            </thead>
            <tbody>
              {itens.length > 0 ? (
                itens.map((item, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom: "1px solid #eaeaea",
                      backgroundColor: index % 2 === 0 ? "transparent" : "#fcfcfd",
                    }}
                  >
                    <td style={{ padding: "10px 5px" }}>
                      <div style={{ fontSize: "12px", fontWeight: "bold", color: "#2d3142" }}>{item.descricao}</div>
                      {item.refServico && (
                        <div style={{ fontSize: "10px", color: "#c5a880", marginTop: "2px", fontWeight: "600" }}>
                          {item.refServico}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: "center", fontSize: "12px", padding: "10px 5px", color: "#2d3142" }}>{item.quantidade}</td>
                    <td style={{ textAlign: "right", fontSize: "12px", padding: "10px 5px", color: "#2d3142" }}>{formatBrl(item.valorUnitario)}</td>
                    <td style={{ textAlign: "right", fontSize: "12px", padding: "10px 5px", fontWeight: "bold", color: "#2d3142" }}>
                      {formatBrl(item.valorTotal)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ padding: "20px", textAlign: "center", color: "#8e8d97", fontSize: "12px", fontStyle: "italic" }}>
                    Nenhum produto cadastrado na venda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totais da Venda */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "30px" }}>
          <div
            style={{
              width: "300px",
              backgroundColor: "#fcfcfd",
              border: "1px solid #eaeaea",
              borderRadius: "8px",
              padding: "15px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
              <span style={{ color: "#8e8d97", fontWeight: "600", textTransform: "uppercase" }}>Subtotal:</span>
              <span style={{ fontWeight: "bold", color: "#2d3142" }}>{formatBrl(subtotal)}</span>
            </div>
            {desconto > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                <span style={{ color: "#8e8d97", fontWeight: "600", textTransform: "uppercase" }}>Desconto:</span>
                <span style={{ fontWeight: "bold", color: "#b44" }}>- {formatBrl(desconto)}</span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "13px",
                borderTop: "2px solid #c5a880",
                paddingTop: "8px",
                marginTop: "4px",
              }}
            >
              <span style={{ fontWeight: "900", color: "#2d3142", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Geral:</span>
              <span style={{ fontWeight: "900", color: "#2d3142", fontSize: "15px" }}>{formatBrl(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé Luxuoso com Aviso Obrigatório */}
      <div
        style={{
          borderTop: "1px solid #eaeaea",
          paddingTop: "15px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "10px",
            fontWeight: "700",
            color: "#8e8d97",
            margin: "0 0 8px 0",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Ótica Lìs - Todos os direitos reservados
        </p>
        <div
          style={{
            backgroundColor: "#2d3142",
            border: "1.5px solid #c5a880",
            borderRadius: "6px",
            padding: "8px 12px",
            display: "inline-block",
            maxWidth: "90%",
          }}
        >
          <p
            style={{
              fontSize: "9px",
              fontWeight: "800",
              color: "#c5a880",
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Importante: Este documento é um comprovante de venda interno cortesia e NÃO substitui o DANFE fiscal oficial.
          </p>
        </div>
      </div>
    </div>
  );
}

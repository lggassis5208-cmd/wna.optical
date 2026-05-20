import React from 'react';
import { getEffectiveAddress } from '../lib/storage';

interface PrintOSProps {
  sale: any;
  settings: any;
}

const PrintOS: React.FC<PrintOSProps> = ({ sale, settings }) => {
  if (!sale || !settings) return null;

  const osNumberFormatted = (sale.os_number || sale.id?.slice(-6) || '000000').toUpperCase();
  const dataEmissao = new Date(sale.criado_em || sale.data || Date.now());
  const endereco = getEffectiveAddress(sale.criado_em || sale.data);

  const formatGrau = (val: any) => {
    if (!val && val !== 0) return '0.00';
    const num = Number(val);
    return num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
  };

  return (
    <div className="print-os-container hidden print:block bg-white text-black font-sans min-h-screen" id="print-os">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body { 
            background: white !important; 
            color: black !important;
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
            font-size: 11px;
          }
          .print-os-container { 
            display: block !important;
            visibility: visible !important;
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            height: auto;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          #root > :not(.print-os-container) { display: none !important; }
        }
        .os-border { border: 1px solid #e5e7eb; }
        .os-border-light { border: 1px solid #f3f4f6; }
        .os-section-title {
          font-weight: 800;
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 0.05em;
          color: #333;
          background-color: #f9fafb;
          padding: 6px 10px;
          border-bottom: 1px solid #e5e7eb;
          margin: 0;
        }
        .os-label { font-size: 8px; color: #6b7280; font-weight: 600; text-transform: uppercase; }
        .os-value { font-size: 10px; color: #111; font-weight: 700; margin-top: 2px; }
      `}</style>
      
      {/* =========================================== */}
      {/* CABEÇALHO — Logo + Dados da Loja + Nº O.S. */}
      {/* =========================================== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '16px' }}>
        {/* ESQUERDA: LOGOTIPO OFICIAL E NOME */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            width: '48px', height: '48px', borderRadius: '8px', 
            backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: '24px'
          }}>
            LÌS
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1, color: '#000' }}>
              ÓTICA LÌS
            </div>
            <div style={{ fontSize: '10px', color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>
              Ordem de Serviço #{osNumberFormatted}
            </div>
            <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '4px' }}>
              Emissão: {dataEmissao.toLocaleDateString('pt-BR')} às {dataEmissao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* DIREITA: DADOS DA LOJA */}
        <div style={{ textAlign: 'right', fontSize: '10px', color: '#374151', lineHeight: 1.6 }}>
          <strong>ÓTICA LIS LTDA</strong><br />
          CNPJ: 39.156.577/0001-22<br />
          {endereco}, Nº 2134<br />
          Vila Concórdia - Goiânia/GO<br />
          Fone/WhatsApp: (62) 99285-8280
        </div>
      </div>

      {/* =========================================== */}
      {/* DADOS DO CLIENTE                           */}
      {/* =========================================== */}
      <div className="os-border" style={{ borderRadius: '8px', marginBottom: '16px', overflow: 'hidden' }}>
        <div className="os-section-title">Identificação do Cliente</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', padding: '12px' }}>
          <div>
            <div className="os-label">Nome Completo</div>
            <div className="os-value">{sale.cliente_nome || 'Cliente Consumidor'}</div>
          </div>
          <div>
            <div className="os-label">CPF</div>
            <div className="os-value" style={{ fontFamily: 'monospace' }}>{sale.cliente_cpf || sale.paciente_cpf || 'Não informado'}</div>
          </div>
          <div>
            <div className="os-label">WhatsApp / Telefone</div>
            <div className="os-value" style={{ fontFamily: 'monospace' }}>{sale.cliente_whatsapp || sale.paciente_whatsapp || 'Não informado'}</div>
          </div>
        </div>
      </div>

      {/* =========================================== */}
      {/* PRODUTOS E SERVIÇOS                        */}
      {/* =========================================== */}
      <div className="os-border" style={{ borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
        <div className="os-section-title">
          Produtos Escolhidos
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
          <thead>
            <tr style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 800, borderRight: '1px solid #d1d5db' }}>CÓD.</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 800, borderRight: '1px solid #d1d5db' }}>DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 800, borderRight: '1px solid #d1d5db' }}>NCM</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 800, borderRight: '1px solid #d1d5db' }}>CFOP</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 800, borderRight: '1px solid #d1d5db' }}>QTD</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800, borderRight: '1px solid #d1d5db' }}>VLR. UNIT.</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800 }}>VLR. TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {sale.armacao_nome && (
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: '8px', borderRight: '1px solid #e5e7eb' }}>ARM-{(sale.id || '').slice(-4).toUpperCase()}</td>
                <td style={{ padding: '6px 8px', fontWeight: 700, textTransform: 'uppercase', borderRight: '1px solid #e5e7eb' }}>Armação: {sale.armacao_nome}</td>
                <td style={{ padding: '6px 8px', textAlign: 'center', fontFamily: 'monospace', borderRight: '1px solid #e5e7eb' }}>9003.11.00</td>
                <td style={{ padding: '6px 8px', textAlign: 'center', fontFamily: 'monospace', borderRight: '1px solid #e5e7eb' }}>5102</td>
                <td style={{ padding: '6px 8px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>1</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', borderRight: '1px solid #e5e7eb' }}>R$ {Number(sale.armacao_preco || 0).toFixed(2)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>R$ {Number(sale.armacao_preco || 0).toFixed(2)}</td>
              </tr>
            )}
            {sale.tipo_lente && (
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: '8px', borderRight: '1px solid #e5e7eb' }}>LNT-{(sale.id || '').slice(-4).toUpperCase()}</td>
                <td style={{ padding: '6px 8px', fontWeight: 700, textTransform: 'uppercase', borderRight: '1px solid #e5e7eb' }}>
                  Lente: {sale.tipo_lente} {sale.tratamento ? `• ${sale.tratamento}` : ''}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'center', fontFamily: 'monospace', borderRight: '1px solid #e5e7eb' }}>9001.50.00</td>
                <td style={{ padding: '6px 8px', textAlign: 'center', fontFamily: 'monospace', borderRight: '1px solid #e5e7eb' }}>5102</td>
                <td style={{ padding: '6px 8px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>1</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', borderRight: '1px solid #e5e7eb' }}>R$ {Number(sale.lente_preco || sale.valor_base || sale.valor_total).toFixed(2)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>R$ {Number(sale.lente_preco || sale.valor_base || sale.valor_total).toFixed(2)}</td>
              </tr>
            )}
            {!sale.armacao_nome && !sale.tipo_lente && (
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: '8px', borderRight: '1px solid #e5e7eb' }}>SERV-OS</td>
                <td style={{ padding: '6px 8px', fontWeight: 700, textTransform: 'uppercase', borderRight: '1px solid #e5e7eb' }}>Serviço Óptico / Venda Geral Ref. O.S. #{osNumberFormatted}</td>
                <td style={{ padding: '6px 8px', textAlign: 'center', fontFamily: 'monospace', borderRight: '1px solid #e5e7eb' }}>9003.11.00</td>
                <td style={{ padding: '6px 8px', textAlign: 'center', fontFamily: 'monospace', borderRight: '1px solid #e5e7eb' }}>5102</td>
                <td style={{ padding: '6px 8px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>1</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', borderRight: '1px solid #e5e7eb' }}>R$ {Number(sale.valor_total).toFixed(2)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>R$ {Number(sale.valor_total).toFixed(2)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* =========================================== */}
      {/* RECEITA TÉCNICA                             */}
      {/* =========================================== */}
      <div className="os-border" style={{ borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
        <div className="os-section-title">
          Dados Técnicos da Receita
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', textAlign: 'center' }}>
          <thead>
            <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #d1d5db' }}>
              <th style={{ padding: '8px', fontWeight: 800, fontSize: '8px', borderRight: '1px solid #d1d5db', color: '#555' }}>OLHO</th>
              <th style={{ padding: '8px', fontWeight: 800, fontSize: '8px', borderRight: '1px solid #d1d5db', color: '#555' }}>ESFÉRICO</th>
              <th style={{ padding: '8px', fontWeight: 800, fontSize: '8px', borderRight: '1px solid #d1d5db', color: '#555' }}>CILÍNDRICO</th>
              <th style={{ padding: '8px', fontWeight: 800, fontSize: '8px', borderRight: '1px solid #d1d5db', color: '#555' }}>EIXO</th>
              <th style={{ padding: '8px', fontWeight: 800, fontSize: '8px', borderRight: '1px solid #d1d5db', color: '#555' }}>DNP</th>
              <th style={{ padding: '8px', fontWeight: 800, fontSize: '8px', color: '#555' }}>ADIÇÃO</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '8px', backgroundColor: '#f9fafb', fontWeight: 900, fontSize: '8px', borderRight: '1px solid #d1d5db', color: '#111' }}>OD (Direito)</td>
              <td style={{ padding: '8px', fontWeight: 700, fontFamily: 'monospace', borderRight: '1px solid #e5e7eb' }}>{formatGrau(sale.od_esferico)}</td>
              <td style={{ padding: '8px', fontWeight: 700, fontFamily: 'monospace', borderRight: '1px solid #e5e7eb' }}>{formatGrau(sale.od_cilindrico)}</td>
              <td style={{ padding: '8px', fontFamily: 'monospace', borderRight: '1px solid #e5e7eb' }}>{sale.od_eixo || '0'}°</td>
              <td style={{ padding: '8px', fontFamily: 'monospace', borderRight: '1px solid #e5e7eb' }}>{sale.od_dnp || '--'} mm</td>
              <td style={{ padding: '8px', fontWeight: 700, fontFamily: 'monospace' }} rowSpan={2}>{sale.od_adicao || sale.adicao || '--'}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px', backgroundColor: '#f9fafb', fontWeight: 900, fontSize: '8px', borderRight: '1px solid #d1d5db', color: '#111' }}>OE (Esquerdo)</td>
              <td style={{ padding: '8px', fontWeight: 700, fontFamily: 'monospace', borderRight: '1px solid #e5e7eb' }}>{formatGrau(sale.oe_esferico)}</td>
              <td style={{ padding: '8px', fontWeight: 700, fontFamily: 'monospace', borderRight: '1px solid #e5e7eb' }}>{formatGrau(sale.oe_cilindrico)}</td>
              <td style={{ padding: '8px', fontFamily: 'monospace', borderRight: '1px solid #e5e7eb' }}>{sale.oe_eixo || '0'}°</td>
              <td style={{ padding: '8px', fontFamily: 'monospace', borderRight: '1px solid #e5e7eb' }}>{sale.oe_dnp || '--'} mm</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* =========================================== */}
      {/* OBSERVAÇÕES + TOTAIS                       */}
      {/* =========================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '16px', marginBottom: '16px' }}>
        {/* Observações */}
        <div className="os-border" style={{ borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="os-section-title">Condições e Observações</div>
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
            <p style={{ fontSize: '9px', color: '#4b5563', lineHeight: 1.6 }}>
              A garantia das lentes é de 90 dias para erros de fabricação ou adaptação. Armações têm garantia de 1 ano. Mau uso ou quebra não estão cobertos.
            </p>
          </div>
        </div>

        {/* Totais */}
        <div className="os-border" style={{ borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="os-section-title" style={{ textAlign: 'right' }}>Total e Pagamento</div>
          <div style={{ padding: '12px', textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
            <div style={{ fontSize: '9px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ color: '#888' }}>VALOR BASE:</span>
                <strong>R$ {Number(sale.valor_base || sale.valor_total).toFixed(2)}</strong>
              </div>
              {Number(sale.desconto) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', color: '#dc2626' }}>
                  <span>DESCONTO:</span>
                  <strong>- R$ {Number(sale.desconto).toFixed(2)}</strong>
                </div>
              )}
              {sale.is_birthday_discount && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', color: '#16a34a' }}>
                  <span>DESC. ANIV. (10%):</span>
                  <strong>Aplicado</strong>
                </div>
              )}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb', fontSize: '10px', marginTop: '8px' }}>
              <span style={{ fontWeight: 600, color: '#6b7280' }}>CONDIÇÃO:</span>
              <strong style={{ textTransform: 'uppercase', color: '#111' }}>{sale.forma_pagamento || 'Não informada'}</strong>
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '8px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>VALOR TOTAL</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#000' }}>R$ {Number(sale.valor_total || 0).toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* =========================================== */}
      {/* ASSINATURAS                                */}
      {/* =========================================== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '24px', marginTop: '24px' }}>
        <div style={{ width: '45%', borderTop: '1px solid #d1d5db', paddingTop: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#374151' }}>Assinatura do Cliente</div>
          <div style={{ fontSize: '8px', color: '#6b7280' }}>Autorizo a confecção conforme especificações</div>
        </div>
        <div style={{ width: '45%', borderTop: '1px solid #d1d5db', paddingTop: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#374151' }}>Ótica Lìs</div>
          <div style={{ fontSize: '8px', color: '#6b7280' }}>Responsável pela venda</div>
        </div>
      </div>
    </div>
  );
};

export default PrintOS;

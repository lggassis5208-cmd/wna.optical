import React from 'react';
import { getEffectiveAddress } from '../lib/storage';

interface PrintOSProps {
  sale: any;
  settings: any;
}

const PrintOS: React.FC<PrintOSProps> = ({ sale, settings }) => {
  if (!sale || !settings) return null;

  // Gerar ID ou código fictício
  const osNumberFormatted = (sale.os_number || sale.id?.slice(-6) || '000000').toUpperCase();

  return (
    <div className="print-container hidden print:block bg-white text-black p-6 font-sans leading-tight min-h-screen text-xs">
      <style>{`
        @media print {
          body { 
            background: white !important; 
            color: black !important;
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          .print-container { 
            display: block !important;
            visibility: visible !important;
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            height: auto;
            margin: 0;
            padding: 1cm;
            background: white !important;
          }
          #root > :not(.print-container) { display: none !important; }
        }
        .danfe-border {
          border: 1px solid #000;
        }
        .danfe-title {
          font-weight: 900;
          text-transform: uppercase;
          font-size: 9px;
          color: #333;
        }
      `}</style>
      
      {/* CABEÇALHO DANFE ESTILO NFe */}
      <div className="grid grid-cols-12 gap-2 mb-4">
        {/* LOGO E EMITENTE */}
        <div className="col-span-7 p-3 danfe-border rounded-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white font-black text-lg">👓</div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tighter leading-none text-black">Ótica Lìs</h1>
                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Excelência em Visão</p>
              </div>
            </div>
            <p className="font-bold text-[10px] text-black">ÓTICA LIS LTDA</p>
            <p className="text-[9px] text-gray-700 leading-normal">
              Avenida Anápolis Qd 03 Lt 01 - Nª 2134 - Vila Concórdia<br />
              Goiânia - GO | CEP: 74770-270<br />
              Fone: (62) 99285-8280
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200">
            <span className="font-bold">CNPJ:</span> 39.156.577/0001-22 | <span className="font-bold">I.E.:</span> 10.784.952-1
          </div>
        </div>

        {/* IDENTIFICAÇÃO DO DOCUMENTO */}
        <div className="col-span-5 danfe-border rounded-lg flex flex-col justify-between text-center overflow-hidden">
          <div className="bg-black text-[#FFD700] py-2 font-black uppercase text-[10px] tracking-widest">
            Documento Auxiliar de Ordem de Serviço
          </div>
          <div className="p-3 flex-1 flex flex-col justify-center">
            <p className="text-[9px] text-gray-500 uppercase font-black">NÚMERO DA O.S.</p>
            <p className="text-2xl font-black text-black">#{osNumberFormatted}</p>
            <p className="text-[8px] text-gray-400 font-mono mt-1">EMISSÃO: {new Date(sale.criado_em || sale.data || Date.now()).toLocaleDateString('pt-BR')} {new Date(sale.criado_em || sale.data || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="bg-[#FFD700] text-black py-2 font-bold text-[9px] uppercase border-t border-black">
            Via do Cliente & Laboratório
          </div>
        </div>
      </div>

      {/* DADOS DO CLIENTE */}
      <div className="danfe-border rounded-lg p-3 mb-4">
        <span className="danfe-title block mb-2 border-b pb-1 border-gray-200">Identificação do Destinatário / Cliente</span>
        <div className="grid grid-cols-12 gap-2 text-[10px]">
          <div className="col-span-6">
            <p><span className="text-gray-500 font-medium">NOME / RAZÃO SOCIAL:</span></p>
            <p className="font-bold text-black text-[11px]">{sale.cliente_nome || 'Cliente Consumidor'}</p>
          </div>
          <div className="col-span-3">
            <p><span className="text-gray-500 font-medium">CPF / CNPJ:</span></p>
            <p className="font-bold text-black font-mono">{sale.cliente_cpf || sale.paciente_cpf || '---.---.------'}</p>
          </div>
          <div className="col-span-3">
            <p><span className="text-gray-500 font-medium">TELEFONE:</span></p>
            <p className="font-bold text-black font-mono">{sale.cliente_whatsapp || sale.paciente_whatsapp || '(62) 99285-8280'}</p>
          </div>
        </div>
      </div>

      {/* DADOS DOS PRODUTOS / LENTES */}
      <div className="danfe-border rounded-lg overflow-hidden mb-4">
        <div className="bg-black text-white p-2">
          <span className="font-black text-[9px] uppercase tracking-wider">Produtos e Serviços da Ordem de Serviço</span>
        </div>
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-black text-left font-bold">
              <th className="p-2 border-r border-gray-300">CÓDIGO</th>
              <th className="p-2 border-r border-gray-300">DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
              <th className="p-2 border-r border-gray-300 text-center">NCM</th>
              <th className="p-2 border-r border-gray-300 text-center">CFOP</th>
              <th className="p-2 border-r border-gray-300 text-center">QTD</th>
              <th className="p-2 border-r border-gray-300 text-right">VALOR UNIT.</th>
              <th className="p-2 text-right">VALOR TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Linha da Armação se existir */}
            {sale.produto_nome && (
              <tr>
                <td className="p-2 border-r border-gray-300 font-mono text-[9px]">ARM-{sale.id?.slice(-4).toUpperCase() || '0021'}</td>
                <td className="p-2 border-r border-gray-300 font-bold uppercase">Armação: {sale.produto_nome}</td>
                <td className="p-2 border-r border-gray-300 text-center font-mono">9003.11.00</td>
                <td className="p-2 border-r border-gray-300 text-center font-mono">5102</td>
                <td className="p-2 border-r border-gray-300 text-center">1</td>
                <td className="p-2 border-r border-gray-300 text-right">R$ {Number(sale.valor_base || sale.valor_total).toFixed(2)}</td>
                <td className="p-2 text-right font-bold">R$ {Number(sale.valor_base || sale.valor_total).toFixed(2)}</td>
              </tr>
            )}
            {/* Linha das Lentes se existir */}
            {sale.tipo_lente && (
              <tr>
                <td className="p-2 border-r border-gray-300 font-mono text-[9px]">LNT-{sale.id?.slice(-4).toUpperCase() || '0022'}</td>
                <td className="p-2 border-r border-gray-300 font-bold uppercase">
                  Lentes: {sale.tipo_lente} {sale.tratamento && `• Tratamento: ${sale.tratamento}`}
                </td>
                <td className="p-2 border-r border-gray-300 text-center font-mono">9001.50.00</td>
                <td className="p-2 border-r border-gray-300 text-center font-mono">5102</td>
                <td className="p-2 border-r border-gray-300 text-center">1</td>
                <td className="p-2 border-r border-gray-300 text-right">R$ {Number(sale.desconto > 0 ? (Number(sale.valor_total) - (sale.produto_nome ? Number(sale.valor_base) : 0)) : sale.valor_total).toFixed(2)}</td>
                <td className="p-2 text-right font-bold">R$ {Number(sale.desconto > 0 ? (Number(sale.valor_total) - (sale.produto_nome ? Number(sale.valor_base) : 0)) : sale.valor_total).toFixed(2)}</td>
              </tr>
            )}
            {/* Fallback caso não tenha nenhum dos dois detalhado */}
            {!sale.produto_nome && !sale.tipo_lente && (
              <tr>
                <td className="p-2 border-r border-gray-300 font-mono text-[9px]">SERV-OS</td>
                <td className="p-2 border-r border-gray-300 font-bold uppercase">Serviço Óptico / Venda Geral Ref. O.S. #{osNumberFormatted}</td>
                <td className="p-2 border-r border-gray-300 text-center font-mono">9003.11.00</td>
                <td className="p-2 border-r border-gray-300 text-center font-mono">5102</td>
                <td className="p-2 border-r border-gray-300 text-center">1</td>
                <td className="p-2 border-r border-gray-300 text-right">R$ {Number(sale.valor_total).toFixed(2)}</td>
                <td className="p-2 text-right font-bold">R$ {Number(sale.valor_total).toFixed(2)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* QUADRO DE RECEITA TÉCNICA */}
      <div className="danfe-border rounded-lg overflow-hidden mb-4">
        <div className="bg-[#FFD700] text-black p-2 border-b border-black font-black text-[9px] uppercase tracking-wider">
          Dados Técnicos da Receita Óptica
        </div>
        <table className="w-full text-[10px] text-center border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300 font-bold text-gray-700">
              <th className="p-2 border-r border-gray-300">OLHO</th>
              <th className="p-2 border-r border-gray-300">ESFÉRICO</th>
              <th className="p-2 border-r border-gray-300">CILÍNDRICO</th>
              <th className="p-2 border-r border-gray-300">EIXO</th>
              <th className="p-2 border-r border-gray-300">DNP</th>
              <th className="p-2">ADIÇÃO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="p-2 border-r border-gray-300 bg-gray-100 font-black text-black text-[9px]">OD (Olho Direito)</td>
              <td className="p-2 border-r border-gray-300 font-bold font-mono">{sale.od_esferico ? (sale.od_esferico > 0 ? `+${Number(sale.od_esferico).toFixed(2)}` : Number(sale.od_esferico).toFixed(2)) : '0.00'}</td>
              <td className="p-2 border-r border-gray-300 font-bold font-mono">{sale.od_cilindrico ? (sale.od_cilindrico > 0 ? `+${Number(sale.od_cilindrico).toFixed(2)}` : Number(sale.od_cilindrico).toFixed(2)) : '0.00'}</td>
              <td className="p-2 border-r border-gray-300 font-mono">{sale.od_eixo || '0'}°</td>
              <td className="p-2 border-r border-gray-300 font-mono">{sale.od_dnp || '--'} mm</td>
              <td className="p-2 font-bold font-mono" rowSpan={2}>{sale.od_adicao || sale.adicao || '--'}</td>
            </tr>
            <tr>
              <td className="p-2 border-r border-gray-300 bg-gray-100 font-black text-black text-[9px]">OE (Olho Esquerdo)</td>
              <td className="p-2 border-r border-gray-300 font-bold font-mono">{sale.oe_esferico ? (sale.oe_esferico > 0 ? `+${Number(sale.oe_esferico).toFixed(2)}` : Number(sale.oe_esferico).toFixed(2)) : '0.00'}</td>
              <td className="p-2 border-r border-gray-300 font-bold font-mono">{sale.oe_cilindrico ? (sale.oe_cilindrico > 0 ? `+${Number(sale.oe_cilindrico).toFixed(2)}` : Number(sale.oe_cilindrico).toFixed(2)) : '0.00'}</td>
              <td className="p-2 border-r border-gray-300 font-mono">{sale.oe_eixo || '0'}°</td>
              <td className="p-2 border-r border-gray-300 font-mono">{sale.oe_dnp || '--'} mm</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* OBSERVAÇÕES E DADOS ADICIONAIS */}
      <div className="grid grid-cols-12 gap-2 mb-4">
        <div className="col-span-8 danfe-border rounded-lg p-3 flex flex-col justify-between">
          <div>
            <span className="danfe-title block border-b pb-1 border-gray-200 mb-1">Observações Técnicas / Laboratório</span>
            <p className="text-[10px] text-gray-700 italic">
              {sale.observacoes || 'Nenhum detalhe adicional de montagem registrado.'}
            </p>
          </div>
          <div className="mt-2 text-[8px] text-gray-400">
            Técnico responsável: <span className="font-bold text-gray-700">{sale.tecnico || 'Balcão Ótica Lìs'}</span>
          </div>
        </div>
        
        {/* TOTAIS E PAGAMENTO */}
        <div className="col-span-4 danfe-border rounded-lg p-3 bg-gray-50 flex flex-col justify-between text-right">
          <div>
            <span className="danfe-title block border-b pb-1 border-gray-200 mb-1">Cálculo de Totais</span>
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-gray-500">VALOR BASE:</span>
                <span className="font-bold">R$ {Number(sale.valor_base || sale.valor_total).toFixed(2)}</span>
              </div>
              {Number(sale.desconto) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span className="text-red-500">DESCONTO:</span>
                  <span className="font-bold">- R$ {Number(sale.desconto).toFixed(2)}</span>
                </div>
              )}
              {sale.is_birthday_discount && (
                <div className="flex justify-between text-green-600">
                  <span className="text-green-500">DESCONTO ANIV (10%):</span>
                  <span className="font-bold">Aplicado</span>
                </div>
              )}
              <div className="flex justify-between text-[11px] pt-1 border-t">
                <span className="font-bold text-gray-700">PAGO EM:</span>
                <span className="font-mono font-bold uppercase text-black">{sale.forma_pagamento || 'Cartão'}</span>
              </div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-300">
            <span className="text-[8px] text-gray-500 font-bold block uppercase tracking-widest">TOTAL OS A PAGAR</span>
            <span className="text-xl font-black text-black">R$ {Number(sale.valor_total || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* TERMO DE GARANTIA E ASSINATURAS */}
      <div className="danfe-border rounded-lg p-3 mb-4 bg-gray-50/50">
        <span className="danfe-title block border-b pb-1 border-gray-200 mb-1">Termo de Garantia e Responsabilidade</span>
        <p className="text-[8px] text-gray-500 leading-normal text-justify">
          A Ótica Lìs assegura garantia de adaptação das lentes pelo período de 90 dias a contar da data de entrega, desde que constatada a incorreção da receita ou erro de fabricação. A garantia das armações cobre defeitos de fabricação pelo prazo de 1 ano. Não cobrimos riscos nas lentes ou danos por mau uso, quebras acidentais ou ajustes efetuados por terceiros.
        </p>
      </div>

      {/* ASSINATURA CLIENTE */}
      <div className="flex justify-between items-end pt-4 mt-6">
        <div className="w-1/2 border-t border-black pt-2 text-center">
          <p className="text-[8px] font-black uppercase text-gray-600">Assinatura do Cliente</p>
          <p className="text-[7px] text-gray-400">Autorizo a execução das lentes conforme especificações acima</p>
        </div>
        <div className="w-1/3 text-right text-[8px] text-gray-400 font-mono">
          <p>Ótica Lìs ERP v4.0</p>
          <p>Chave OS: {sale.id || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
};

export default PrintOS;

import { useState, useEffect } from 'react';
import { 
  Wallet, 
  Lock, 
  Unlock, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Clock,
  Printer,
  X,
  MessageCircle
} from 'lucide-react';
import { storage } from '../lib/storage';
import { toast } from 'sonner';
import { openWhatsApp } from '../lib/whatsappUtils';

export default function CaixaPage() {
  const [caixaAtivo, setCaixaAtivo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [abrirModal, setAbrirModal] = useState(false);
  const [saidaModal, setSaidaModal] = useState(false);
  const [valorAbertura, setValorAbertura] = useState('');
  const [novaSaida, setNovaSaida] = useState({ descricao: '', valor: '', forma: 'Dinheiro' });

  const carregarCaixa = async () => {
    setLoading(true);
    const caixa = await storage.getCaixaAtual();
    setCaixaAtivo(caixa);
    setLoading(false);
  };

  useEffect(() => {
    carregarCaixa();
  }, []);

  const handleAbrirCaixa = async () => {
    try {
      if (!valorAbertura) return toast.error('Informe o valor de abertura');
      await storage.abrirCaixa(Number(valorAbertura));
      toast.success('Caixa aberto com sucesso!');
      setAbrirModal(false);
      carregarCaixa();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleFecharCaixa = async () => {
    if (!caixaAtivo) return;
    if (confirm('Deseja realmente fechar o caixa de hoje?')) {
      await storage.fecharCaixa(caixaAtivo.id);
      toast.success('Caixa fechado com sucesso!');
      carregarCaixa();
    }
  };

  const handleRegistrarSaida = async () => {
    if (!caixaAtivo) return;
    if (!novaSaida.descricao || !novaSaida.valor) {
      return toast.error('Preencha a descrição e o valor');
    }
    try {
      await storage.registrarSaida(
        caixaAtivo.id,
        novaSaida.descricao,
        Number(novaSaida.valor),
        novaSaida.forma
      );
      toast.success('Saída registrada com sucesso!');
      setSaidaModal(false);
      setNovaSaida({ descricao: '', valor: '', forma: 'Dinheiro' });
      carregarCaixa();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Calcula totais em tempo real a partir das movimentações
  const totaisPorForma = () => {
    const movs = caixaAtivo?.movimentacoes || [];
    const entradas = movs.filter((m: any) => m.tipo === 'ENTRADA');
    return {
      dinheiro: entradas
        .filter((m: any) => (m.forma_pagamento || '').toLowerCase().includes('dinheiro'))
        .reduce((sum: number, m: any) => sum + Number(m.valor), 0),
      pix: entradas
        .filter((m: any) => (m.forma_pagamento || '').toLowerCase().includes('pix'))
        .reduce((sum: number, m: any) => sum + Number(m.valor), 0),
      cartao: entradas
        .filter((m: any) => !(m.forma_pagamento || '').toLowerCase().includes('dinheiro') && !(m.forma_pagamento || '').toLowerCase().includes('pix'))
        .reduce((sum: number, m: any) => sum + Number(m.valor), 0),
    };
  };

  const totalEntradas = () => {
    const movs = caixaAtivo?.movimentacoes || [];
    return movs.filter((m: any) => m.tipo === 'ENTRADA').reduce((sum: number, m: any) => sum + Number(m.valor), 0);
  };

  const totalSaidas = () => {
    const movs = caixaAtivo?.movimentacoes || [];
    return movs.filter((m: any) => m.tipo === 'SAIDA').reduce((sum: number, m: any) => sum + Number(m.valor), 0);
  };

  const saldoAtual = () => {
    return (caixaAtivo?.saldo_inicial || 0) + totalEntradas() - totalSaidas();
  };

  if (loading) return <div className="flex h-full items-center justify-center font-black animate-pulse">CARREGANDO...</div>;

  const formas = totaisPorForma();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white">Caixa <span className="text-primary italic">Diário</span></h2>
          <p className="text-white/40 text-sm italic">Controle de entradas e saídas do dia</p>
        </div>
        {!caixaAtivo ? (
          <button
            onClick={() => setAbrirModal(true)}
            className="bg-primary text-black font-black px-8 py-3 rounded-2xl flex items-center gap-3 hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-95"
          >
            <Unlock size={20} />
            Abrir Caixa Hoje
          </button>
        ) : (
          <div className="flex gap-3">
            <button className="bg-white/5 border border-white/10 text-white font-bold px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-white/10 transition-all">
              <Printer size={18} />
              Gerar Relatório
            </button>
            <button
              onClick={handleFecharCaixa}
              className="bg-red-500 text-white font-black px-8 py-3 rounded-2xl flex items-center gap-2 hover:shadow-xl hover:shadow-red-500/20 transition-all active:scale-95"
            >
              <Lock size={20} />
              Fechar Caixa
            </button>
          </div>
        )}
      </div>

      {!caixaAtivo ? (
        <div className="bg-surface rounded-3xl border border-dashed border-white/10 p-20 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 text-white/20">
            <Lock size={40} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2 text-primary">Caixa Fechado</h3>
          <p className="text-white/40 max-w-sm mb-8">É necessário abrir o caixa para iniciar as operações de venda e lançamentos financeiros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">

            {/* KPIs do Topo */}
            <div className="grid grid-cols-3 gap-6">
              <FinancialMetric
                label="Saldo Inicial"
                value={caixaAtivo.saldo_inicial}
                icon={<Wallet size={20} />}
                color="text-white/40"
              />
              <FinancialMetric
                label="Entradas (Total)"
                value={totalEntradas()}
                icon={<ArrowUpCircle size={20} />}
                color="text-green-500"
              />
              <FinancialMetric
                label="Saídas / Sangrias"
                value={totalSaidas()}
                icon={<ArrowDownCircle size={20} />}
                color="text-red-500"
              />
            </div>

            {/* Tabela de Movimentações */}
            <div className="bg-surface rounded-3xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                <h4 className="font-bold flex items-center gap-2">
                  <Clock size={18} className="text-primary" />
                  Movimentações do Dia
                  {caixaAtivo.movimentacoes?.length > 0 && (
                    <span className="ml-2 text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {caixaAtivo.movimentacoes.length}
                    </span>
                  )}
                </h4>
                <button
                  onClick={() => setSaidaModal(true)}
                  className="text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                >
                  + Registrar Saída
                </button>
              </div>

              {(!caixaAtivo.movimentacoes || caixaAtivo.movimentacoes.length === 0) ? (
                <div className="p-16 text-center flex flex-col items-center gap-3">
                  <Clock size={32} className="text-white/10" />
                  <p className="text-white/20 italic text-sm">Aguardando lançamentos...</p>
                  <p className="text-white/10 text-xs">As vendas registradas aparecerão aqui automaticamente.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-black/20 text-white/40 text-[10px] uppercase tracking-[0.2em] font-black">
                        <th className="px-6 py-4">Horário</th>
                        <th className="px-6 py-4">Tipo</th>
                        <th className="px-6 py-4">Cliente / Descrição</th>
                        <th className="px-6 py-4">Forma</th>
                        <th className="px-6 py-4">Valor</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {[...caixaAtivo.movimentacoes].reverse().map((m: any) => (
                        <tr key={m.id} className="hover:bg-white/[0.02] transition-colors group">
                          {/* Horário */}
                          <td className="px-6 py-4">
                            <span className="font-mono text-[11px] font-bold text-white/30">{m.horario}</span>
                          </td>
                          {/* Tipo */}
                          <td className="px-6 py-4">
                            {m.tipo === 'ENTRADA' ? (
                              <ArrowUpCircle size={18} className="text-green-500" />
                            ) : (
                              <ArrowDownCircle size={18} className="text-red-500" />
                            )}
                          </td>
                          {/* Cliente / Descrição */}
                          <td className="px-6 py-4 max-w-[200px]">
                            <p className="text-sm font-bold text-white/80 truncate">{m.descricao}</p>
                            {m.tipo === 'ENTRADA' && (
                              <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Venda</p>
                            )}
                            {m.tipo === 'SAIDA' && (
                              <p className="text-[10px] text-red-500/50 font-black uppercase tracking-widest">Saída</p>
                            )}
                          </td>
                          {/* Badge de Forma de Pagamento */}
                          <td className="px-6 py-4">
                            <PaymentBadge forma={m.forma_pagamento} />
                          </td>
                          {/* Valor */}
                          <td className="px-6 py-4">
                            <span className={`font-black text-sm ${m.tipo === 'ENTRADA' ? 'text-green-500' : 'text-red-500'}`}>
                              {m.tipo === 'SAIDA' ? '- ' : '+ '}
                              R$ {Number(m.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          {/* Ação WhatsApp (apenas para entradas/vendas) */}
                          <td className="px-6 py-4">
                            {m.tipo === 'ENTRADA' && m.cliente_whatsapp ? (
                              <button
                                onClick={() => {
                                  const nomeCliente = m.descricao.split(' - ')[1] || 'Cliente';
                                  openWhatsApp(
                                    m.cliente_whatsapp,
                                    `Olá ${nomeCliente}, confirmamos o recebimento do seu pedido na Ótica Lìs. Obrigado pela preferência! 👓`
                                  );
                                }}
                                title="Enviar confirmação pelo WhatsApp"
                                className="p-2 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                              >
                                <MessageCircle size={15} />
                              </button>
                            ) : m.tipo === 'ENTRADA' ? (
                              <span
                                title="Sem WhatsApp cadastrado"
                                className="p-2 rounded-xl bg-white/5 text-white/10 cursor-not-allowed opacity-0 group-hover:opacity-100 inline-flex"
                              >
                                <MessageCircle size={15} />
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Coluna Lateral - Resumo */}
          <div className="space-y-6">
            <div className="bg-surface p-8 rounded-3xl border border-primary/20 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
              <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-6">Resumo por Pagamento</h4>
              <div className="space-y-4">
                <PaymentRow label="💵 Dinheiro" value={formas.dinheiro} />
                <PaymentRow label="⚡ PIX" value={formas.pix} />
                <PaymentRow label="💳 Cartão" value={formas.cartao} />
                <div className="h-px bg-white/5 my-4" />
                <div className="flex justify-between items-center">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Total Entradas</p>
                  <p className="font-black text-green-500">
                    R$ {totalEntradas().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Total Saídas</p>
                  <p className="font-black text-red-500">
                    - R$ {totalSaidas().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="h-px bg-white/5 my-2" />
                <div className="flex justify-between items-end">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Saldo em Caixa</p>
                  <p className={`text-2xl font-black ${saldoAtual() >= 0 ? 'text-white' : 'text-red-500'}`}>
                    R$ {saldoAtual().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Mini estatísticas */}
            <div className="bg-surface p-6 rounded-3xl border border-white/5">
              <h4 className="text-xs font-black text-white/30 uppercase tracking-widest mb-4">Estatísticas do Dia</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Nº de Vendas</span>
                  <span className="font-bold text-white">
                    {(caixaAtivo.movimentacoes || []).filter((m: any) => m.tipo === 'ENTRADA').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Ticket Médio</span>
                  <span className="font-bold text-white">
                    {(() => {
                      const entradas = (caixaAtivo.movimentacoes || []).filter((m: any) => m.tipo === 'ENTRADA');
                      if (entradas.length === 0) return 'R$ 0,00';
                      const total = entradas.reduce((s: number, m: any) => s + Number(m.valor), 0);
                      return `R$ ${(total / entradas.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Sangrias</span>
                  <span className="font-bold text-red-400">
                    {(caixaAtivo.movimentacoes || []).filter((m: any) => m.tipo === 'SAIDA').length}x
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Abertura */}
      {abrirModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Unlock size={20} className="text-primary" />
                Abertura de Caixa
              </h3>
              <button onClick={() => setAbrirModal(false)} className="p-2 hover:bg-white/5 rounded-full text-white/40">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-4">
              <label className="text-xs font-black text-white/20 uppercase tracking-widest ml-1">Saldo Inicial em Dinheiro</label>
              <input
                type="number"
                placeholder="R$ 0,00"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-2xl font-black text-white focus:outline-none focus:border-primary/50 transition-colors"
                value={valorAbertura}
                onChange={(e) => setValorAbertura(e.target.value)}
              />
              <p className="text-xs text-white/30 italic">Lembre-se de conferir os valores físicos na gaveta.</p>
            </div>
            <div className="p-6 border-t border-white/5 bg-white/[0.02]">
              <button
                onClick={handleAbrirCaixa}
                className="w-full bg-primary text-black font-black py-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95"
              >
                Confirmar e Abrir Caixa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Saída / Sangria */}
      {saidaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <ArrowDownCircle size={20} className="text-red-500" />
                Registrar Saída de Caixa
              </h3>
              <button onClick={() => setSaidaModal(false)} className="p-2 hover:bg-white/5 rounded-full text-white/40">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Descrição do Gasto</label>
                  <input
                    type="text"
                    placeholder="Ex: Pagamento de Energia, Almoço..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-red-500/50"
                    value={novaSaida.descricao}
                    onChange={(e) => setNovaSaida({ ...novaSaida, descricao: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Valor da Retirada (R$)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-red-500/50"
                    value={novaSaida.valor}
                    onChange={(e) => setNovaSaida({ ...novaSaida, valor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Forma de Retirada</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-red-500/50 appearance-none"
                    value={novaSaida.forma}
                    onChange={(e) => setNovaSaida({ ...novaSaida, forma: e.target.value })}
                  >
                    <option value="Dinheiro">Dinheiro (Gaveta)</option>
                    <option value="PIX">PIX</option>
                    <option value="Cartão">Cartão / Outros</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-white/5 bg-white/[0.02]">
              <button
                onClick={handleRegistrarSaida}
                className="w-full bg-red-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-red-500/20 hover:scale-[1.02] transition-all active:scale-95"
              >
                Confirmar Retirada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentBadge({ forma }: { forma: string }) {
  const f = (forma || '').toLowerCase();
  if (f.includes('pix')) {
    return (
      <span className="text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full">
        ⚡ PIX
      </span>
    );
  }
  if (f.includes('cartão') || f.includes('cartao') || f.includes('crédito') || f.includes('débito')) {
    return (
      <span className="text-[9px] font-black uppercase tracking-widest bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-full">
        💳 Cartão
      </span>
    );
  }
  if (f.includes('crediário') || f.includes('crediario')) {
    return (
      <span className="text-[9px] font-black uppercase tracking-widest bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2.5 py-1 rounded-full">
        📋 Crediário
      </span>
    );
  }
  return (
    <span className="text-[9px] font-black uppercase tracking-widest bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-full">
      💵 Dinheiro
    </span>
  );
}

function FinancialMetric({ label, value, icon, color }: { label: string, value: number, icon: any, color: string }) {
  return (
    <div className="bg-surface p-6 rounded-3xl border border-white/5">
      <div className={`p-2 w-fit rounded-lg bg-white/5 mb-4 ${color}`}>
        {icon}
      </div>
      <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg font-black text-white">R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
    </div>
  );
}

function PaymentRow({ label, value }: { label: string, value: number }) {
  return (
    <div className="flex justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-white/40 font-medium text-sm">{label}</span>
      <span className="text-white font-bold text-sm">R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
    </div>
  );
}

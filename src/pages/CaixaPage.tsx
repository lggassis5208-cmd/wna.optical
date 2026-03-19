import { useState, useEffect } from 'react';
import { 
  Wallet, 
  Lock, 
  Unlock, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Clock,
  Printer,
  X
} from 'lucide-react';
import { storage } from '../lib/storage';
import { toast } from 'sonner';

export default function CaixaPage() {
  const [caixaAtivo, setCaixaAtivo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [abrirModal, setAbrirModal] = useState(false);
  const [valorAbertura, setValorAbertura] = useState('');

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

  if (loading) return <div className="flex h-full items-center justify-center font-black animate-pulse">CARREGANDO...</div>;

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
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <FinancialMetric 
                label="Saldo Inicial" 
                value={caixaAtivo.saldo_inicial} 
                icon={<Wallet size={20} />} 
                color="text-white/40"
              />
              <FinancialMetric 
                label="Entradas (Total)" 
                value={Object.values(caixaAtivo.entradas).reduce((a: number, b: any) => a + Number(b), 0)} 
                icon={<ArrowUpCircle size={20} />} 
                color="text-green-500"
              />
              <FinancialMetric 
                label="Saídas / Sangrias" 
                value={caixaAtivo.saidas} 
                icon={<ArrowDownCircle size={20} />} 
                color="text-red-500"
              />
            </div>

            <div className="bg-surface rounded-3xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                    <h4 className="font-bold flex items-center gap-2">
                        <Clock size={18} className="text-primary" />
                        Movimentações do Dia
                    </h4>
                </div>
                <div className="p-12 text-center text-white/20 italic">
                    Aguardando lançamentos...
                </div>
            </div>
          </div>

          <div className="space-y-6">
             <div className="bg-surface p-8 rounded-3xl border border-primary/20 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-6">Resumo por Pagamento</h4>
                <div className="space-y-4">
                   <PaymentRow label="Dinheiro" value={caixaAtivo.entradas.dinheiro} />
                   <PaymentRow label="PIX" value={caixaAtivo.entradas.pix} />
                   <PaymentRow label="Cartão" value={caixaAtivo.entradas.cartao} />
                   <div className="h-px bg-white/5 my-4" />
                   <div className="flex justify-between items-end">
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Saldo em Caixa</p>
                      <p className="text-2xl font-black text-white">R$ {(caixaAtivo.saldo_inicial + Object.values(caixaAtivo.entradas).reduce((a: number, b: any) => a + Number(b), 0) - caixaAtivo.saidas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
            <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
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
    </div>
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
       <span className="text-white/40 font-medium">{label}</span>
       <span className="text-white font-bold">R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
    </div>
  );
}

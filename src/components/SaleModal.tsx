import { useState, useEffect } from 'react';
import { 
  X, 
  Glasses, 
  Activity, 
  ChevronRight,
  ChevronLeft,
  Save,
  Search,
  Loader2,
  Lock,
  Printer,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { storage } from '../lib/storage';
import PrintOS from './PrintOS';

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SaleModal({ isOpen, onClose }: SaleModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [caixaAberto, setCaixaAberto] = useState<any>(null);
  const [checkingCaixa, setCheckingCaixa] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [savedSale, setSavedSale] = useState<any>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const initialState = {
    cliente_id: '',
    tecnico: '',
    od_esferico: '',
    od_cilindrico: '',
    od_eixo: '',
    od_dnp: '',
    od_adicao: '',
    oe_esferico: '',
    oe_cilindrico: '',
    oe_eixo: '',
    oe_dnp: '',
    oe_adicao: '',
    valor_base: '1000.00',
    desconto: '0.00',
    valor_total: '1000.00',
    forma_pagamento: 'Cartão de Crédito'
  };

  const [formData, setFormData] = useState(initialState);

  // Auto-calculate total when base or discount changes
  useEffect(() => {
    const base = parseFloat(formData.valor_base) || 0;
    const desc = parseFloat(formData.desconto) || 0;
    const total = Math.max(0, base - desc).toFixed(2);
    setFormData(prev => ({ ...prev, valor_total: total }));
  }, [formData.valor_base, formData.desconto]);

  const checkCaixa = async () => {
    setCheckingCaixa(true);
    const [settingsData, caixa] = await Promise.all([
      storage.getSettings(),
      storage.getCaixaAtual()
    ]);
    setSettings(settingsData);
    
    // Bloqueia apenas se a trava for obrigatória nas configurações
    if (settingsData.sistema.trava_caixa) {
      setCaixaAberto(caixa);
    } else {
      setCaixaAberto(true); // Se não for obrigatória, "finge" que está aberto
    }
    setCheckingCaixa(false);
  };

  useState(() => {
    if (isOpen) checkCaixa();
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const saleToSave = {
        ...formData,
        od_esferico: parseFloat(formData.od_esferico) || 0,
        od_cilindrico: parseFloat(formData.od_cilindrico) || 0,
        od_eixo: parseInt(formData.od_eixo) || 0,
        od_dnp: parseFloat(formData.od_dnp) || 0,
        od_adicao: parseFloat(formData.od_adicao) || 0,
        oe_esferico: parseFloat(formData.oe_esferico) || 0,
        oe_cilindrico: parseFloat(formData.oe_cilindrico) || 0,
        oe_eixo: parseInt(formData.oe_eixo) || 0,
        oe_dnp: parseFloat(formData.oe_dnp) || 0,
        oe_adicao: parseFloat(formData.oe_adicao) || 0,
        valor_total: parseFloat(formData.valor_total) || 0,
        criado_em: new Date().toISOString()
      };

      const result = await storage.registrarVenda(saleToSave);

      toast.success('Venda Salva com Sucesso');
      setSavedSale(result);
      setIsSuccess(true);
    } catch (error: any) {
      toast.error('Erro ao salvar venda');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(initialState);
    setStep(1);
    setIsSuccess(false);
    setSavedSale(null);
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface w-full max-w-4xl rounded-3xl border border-white/10 shadow-2xl flex flex-col h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Glasses className="text-primary" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{isSuccess ? 'Venda Concluída!' : 'Nova Ordem de Serviço'}</h3>
              <p className="text-xs text-white/40">{isSuccess ? 'O.S. registrada com sucesso no sistema' : `Passo ${step} de 3: ${step === 1 ? 'Cliente & Armação' : step === 2 ? 'Prescrição Técnica' : 'Pagamento'}`}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="flex h-1 bg-white/5">
          <div className={`h-full bg-primary transition-all duration-500 ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`} />
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-b from-transparent to-black/20">
          {!caixaAberto && !checkingCaixa ? (
             <div className="h-full flex flex-col items-center justify-center text-center p-12 animate-in zoom-in-95">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 border border-red-500/20">
                  <Lock size={32} />
                </div>
                <h4 className="text-xl font-bold text-white mb-2">Caixa Fechado</h4>
                <p className="text-white/40 max-w-xs text-sm italic mb-6">
                  Não é possível realizar vendas ou lançamentos com o caixa fechado. Por favor, realize a abertura do caixa do dia.
                </p>
                <button 
                  onClick={onClose}
                  className="bg-white/5 border border-white/10 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-white/10 transition-colors"
                >
                  Voltar e Abrir Caixa
                </button>
             </div>
          ) : checkingCaixa ? (
             <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={40} />
             </div>
          ) : (
            <>
              {step === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <section className="space-y-4">
                <h4 className="text-xs font-bold text-white/20 uppercase tracking-widest border-b border-white/5 pb-2">Identificação do Cliente</h4>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar cliente por nome ou CPF..." 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-white/20 uppercase tracking-widest border-b border-white/5 pb-2">Técnico / Responsável</h4>
                  <InputGroup 
                    label="Nome do Técnico" 
                    placeholder="Ex: Roberto Silva" 
                    value={formData.tecnico}
                    onChange={(e) => setFormData({...formData, tecnico: e.target.value})}
                  />
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-white/20 uppercase tracking-widest border-b border-white/5 pb-2">Observações</h4>
                  <textarea 
                    className="w-full h-[100px] bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
                    placeholder="Detalhes adicionais..."
                  />
                </div>
              </section>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
               <PrescriptionGrid 
                  side="Olho Direito (OD)" 
                  values={{
                    esf: formData.od_esferico,
                    cil: formData.od_cilindrico,
                    eixo: formData.od_eixo,
                    ad: formData.od_adicao,
                    dnp: formData.od_dnp
                  }}
                  onChange={(field, val) => setFormData({...formData, [`od_${field}`]: val})}
               />
               <PrescriptionGrid 
                  side="Olho Esquerdo (OE)" 
                  values={{
                    esf: formData.oe_esferico,
                    cil: formData.oe_cilindrico,
                    eixo: formData.oe_eixo,
                    ad: formData.oe_adicao,
                    dnp: formData.oe_dnp
                  }}
                  onChange={(field, val) => setFormData({...formData, [`oe_${field}`]: val})}
               />
            </div>
          )}

          {step === 3 && !isSuccess && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center space-y-2 mb-8">
                <p className="text-xs text-primary/60 uppercase font-black tracking-widest">Resumo da Venda</p>
                <p className="text-4xl font-black text-white">R$ {formData.valor_total}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                    <h4 className="text-xs font-bold text-white/20 uppercase tracking-widest border-b border-white/5 pb-2">Forma de Pagamento</h4>
                    <select 
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 text-white"
                      value={formData.forma_pagamento}
                      onChange={(e) => setFormData({...formData, forma_pagamento: e.target.value})}
                    >
                      <option className="bg-surface">Cartão de Crédito</option>
                      <option className="bg-surface">Cartão de Débito</option>
                      <option className="bg-surface">Pix</option>
                      <option className="bg-surface">Dinheiro</option>
                      <option className="bg-surface">Crediário Lis</option>
                    </select>
                 </div>
                 <div className="space-y-4">
                    <h4 className="text-xs font-bold text-white/20 uppercase tracking-widest border-b border-white/5 pb-2">Valores e Ajustes</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup 
                        label="Valor Base (R$)" 
                        value={formData.valor_base} 
                        onChange={(e) => setFormData({...formData, valor_base: e.target.value})}
                      />
                      <InputGroup 
                        label="Desconto (R$)" 
                        value={formData.desconto} 
                        onChange={(e) => setFormData({...formData, desconto: e.target.value})}
                      />
                    </div>
                    <div className="pt-2">
                       <p className="text-[10px] font-black text-primary uppercase tracking-widest ml-1 mb-1">Total a Pagar</p>
                       <p className="text-2xl font-black text-white">R$ {formData.valor_total}</p>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {isSuccess && (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 animate-in zoom-in-95">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-6 border border-green-500/20">
                <CheckCircle2 size={40} />
              </div>
              <h4 className="text-2xl font-black text-white mb-2">Venda Salva!</h4>
              <p className="text-white/40 max-w-sm text-sm italic mb-10">
                A Ordem de Serviço foi gerada e os lançamentos financeiros foram realizados. Deseja imprimir o recibo para o laboratório agora?
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={handlePrint}
                  className="bg-primary text-black px-8 py-4 rounded-2xl text-sm font-black shadow-lg shadow-primary/20 flex items-center gap-3 hover:scale-105 transition-all active:scale-95"
                >
                  <Printer size={20} />
                  Imprimir O.S. / Recibo
                </button>
                <button 
                  onClick={handleClose}
                  className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-2xl text-sm font-black hover:bg-white/10 transition-all uppercase tracking-widest"
                >
                  Concluir
                </button>
              </div>

              {savedSale && settings && (
                <PrintOS sale={savedSale} settings={settings} />
              )}
            </div>
          )}
          </>
        )}
        </div>

        {/* Footer */}
        {!isSuccess && (
          <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-between items-center shrink-0">
            <button 
              disabled={loading}
              onClick={() => step > 1 ? setStep(step - 1) : handleClose()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white/40 hover:text-white transition-colors disabled:opacity-50"
            >
              {step > 1 ? <ChevronLeft size={20} /> : null}
              {step > 1 ? 'Voltar' : 'Cancelar'}
            </button>
            
            <button 
              disabled={loading}
              onClick={() => step < 3 ? setStep(step + 1) : handleSave()}
              className="bg-primary text-black px-8 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : step < 3 ? 'Próximo' : 'Finalizar O.S.'}
              {step < 3 && !loading ? <ChevronRight size={20} /> : !loading && <Save size={20} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PrescriptionGrid({ side, values, onChange }: { side: string, values: any, onChange: (field: string, val: string) => void }) {
  return (
    <div className="space-y-4 bg-white/[0.02] p-6 rounded-2xl border border-white/5">
      <h4 className="text-sm font-bold text-primary flex items-center gap-2">
        <Activity size={18} />
        {side}
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
        <InputGroup label="Esférico" placeholder="+0.00" value={values.esf} onChange={(e) => onChange('esferico', e.target.value)} />
        <InputGroup label="Cilíndrico" placeholder="-0.00" value={values.cil} onChange={(e) => onChange('cilindrico', e.target.value)} />
        <InputGroup label="Eixo" placeholder="180°" value={values.eixo} onChange={(e) => onChange('eixo', e.target.value)} />
        <InputGroup label="Adição" placeholder="+2.00" value={values.ad} onChange={(e) => onChange('adicao', e.target.value)} />
        <InputGroup label="DNP" placeholder="31.5" value={values.dnp} onChange={(e) => onChange('dnp', e.target.value)} />
      </div>
    </div>
  );
}

function InputGroup({ label, icon, placeholder, value, onChange }: { label: string, icon?: React.ReactNode, placeholder?: string, value?: string, onChange?: (e: any) => void }) {
  return (
    <div className="space-y-2 flex-1">
      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20">
            {icon}
          </div>
        )}
        <input 
          type="text" 
          placeholder={placeholder}
          className={`w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors ${icon ? 'pl-10' : 'pl-4'}`}
          value={value}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { X, Package, ShieldCheck, Info, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { storage } from '../lib/storage';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: any;
}

export default function ProductModal({ isOpen, onClose, product }: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    marca: '',
    unidade: 'UN',
    preco_custo: '',
    preco_venda: '',
    ncm: '',
    cest: '',
    cfop_padrao: '5102',
    origem: '0',
    csosn: '102',
    icms: '0.00',
    pis: '0.00',
    cofins: '0.00',
    estoque: '0'
  });

  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        preco_custo: String(product.preco_custo || ''),
        preco_venda: String(product.preco_venda || ''),
        estoque: String(product.estoque || '0')
      });
    } else {
      setFormData({
        nome: '',
        marca: '',
        unidade: 'UN',
        preco_custo: '',
        preco_venda: '',
        ncm: '',
        cest: '',
        cfop_padrao: '5102',
        origem: '0',
        csosn: '102',
        icms: '0.00',
        pis: '0.00',
        cofins: '0.00',
        estoque: '0'
      });
    }
  }, [product, isOpen]);

  const validate = () => {
    if (!formData.nome.trim()) {
      toast.error('O nome do produto é obrigatório.');
      return false;
    }
    const ncmClean = formData.ncm.replace(/\D/g, '');
    if (ncmClean.length !== 8) {
      toast.error('O NCM deve ter exatamente 8 dígitos.');
      return false;
    }
    if (!formData.preco_venda || Number(formData.preco_venda) <= 0) {
      toast.error('Informe um preço de venda válido.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await storage.saveProduct({
        ...formData,
        preco_custo: Number(formData.preco_custo),
        preco_venda: Number(formData.preco_venda),
        estoque: Number(formData.estoque)
      });
      toast.success(product ? 'Produto atualizado!' : 'Produto cadastrado com sucesso!');
      onClose();
    } catch (err) {
      toast.error('Erro ao salvar produto.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="sticky top-0 bg-surface/80 backdrop-blur-md p-6 border-b border-white/5 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{product ? 'Editar Produto' : 'Novo Produto Profissional'}</h2>
              <p className="text-xs text-white/40 italic">Configuração Fiscal NFe & Estoque</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={20} className="text-white/40" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Sessão 1: Dados Básicos */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-primary">
              <Package size={18} />
              <h3 className="text-sm font-black uppercase tracking-widest">Dados Básicos e Comercial</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Nome do Produto" value={formData.nome} onChange={(v) => setFormData({...formData, nome: v})} placeholder="Ex: Armação Lis Premium Gold" />
              <Input label="Marca / Fabricante" value={formData.marca} onChange={(v) => setFormData({...formData, marca: v})} placeholder="Ex: Lis Eyewear" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Select 
                label="Unidade" 
                value={formData.unidade} 
                onChange={(v) => setFormData({...formData, unidade: v})}
                options={[
                  { value: 'UN', label: 'Unidade (UN)' },
                  { value: 'PAR', label: 'Par (PAR)' },
                  { value: 'PC', label: 'Peça (PC)' },
                ]}
              />
              <Input label="Preço Custo (R$)" type="number" step="0.01" value={formData.preco_custo} onChange={(v) => setFormData({...formData, preco_custo: v})} placeholder="0.00" />
              <Input label="Preço Venda (R$)" type="number" step="0.01" value={formData.preco_venda} onChange={(v) => setFormData({...formData, preco_venda: v})} placeholder="0.00" />
              <Input label="Estoque Inicial" type="number" value={formData.estoque} onChange={(v) => setFormData({...formData, estoque: v})} placeholder="0" />
            </div>
          </section>

          {/* Sessão 2: Fiscal Obrigatório */}
          <section className="space-y-6 pt-6 border-t border-white/5">
            <div className="flex items-center gap-2 text-blue-400">
              <ShieldCheck size={18} />
              <h3 className="text-sm font-black uppercase tracking-widest">Informações Fiscais (NFe)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1 flex items-center gap-1">
                  NCM 
                  <Info size={12} className="text-white/20" />
                </label>
                <input 
                  type="text" 
                  maxLength={10}
                  placeholder="9003.11.00"
                  value={formData.ncm}
                  onChange={(e) => setFormData({...formData, ncm: e.target.value})}
                  className={`w-full bg-white/5 border ${formData.ncm.replace(/\D/g, '').length === 8 ? 'border-white/10' : 'border-red-500/30'} rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white font-medium`}
                />
              </div>
              <Input label="CEST" value={formData.cest} onChange={(v) => setFormData({...formData, cest: v})} placeholder="Código CEST" />
              <Input label="CFOP Padrão" value={formData.cfop_padrao} onChange={(v) => setFormData({...formData, cfop_padrao: v})} placeholder="Ex: 5102" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select 
                label="Origem da Mercadoria" 
                value={formData.origem} 
                onChange={(v) => setFormData({...formData, origem: v})}
                options={[
                  { value: '0', label: '0 - Nacional' },
                  { value: '1', label: '1 - Estrangeira (Importação Direta)' },
                  { value: '2', label: '2 - Estrangeira (Mercado Interno)' },
                ]}
              />
              <Select 
                label="CST / CSOSN" 
                value={formData.csosn} 
                onChange={(v) => setFormData({...formData, csosn: v})}
                options={[
                  { value: '101', label: '101 - Tributada com crédito' },
                  { value: '102', label: '102 - Tributada sem crédito' },
                  { value: '400', label: '400 - Não tributada' },
                  { value: '500', label: '500 - ICMS cobrado anteriormente' },
                ]}
              />
            </div>

            <div className="grid grid-cols-3 gap-6 bg-white/[0.02] p-6 rounded-2xl border border-white/5">
              <Input label="ICMS (%)" type="number" step="0.01" value={formData.icms} onChange={(v) => setFormData({...formData, icms: v})} />
              <Input label="PIS (%)" type="number" step="0.01" value={formData.pis} onChange={(v) => setFormData({...formData, pis: v})} />
              <Input label="COFINS (%)" type="number" step="0.01" value={formData.cofins} onChange={(v) => setFormData({...formData, cofins: v})} />
            </div>
          </section>

          <div className="flex justify-end gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-8 py-3 rounded-xl border border-white/10 text-white/60 font-bold hover:bg-white/5 transition-all outline-none"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="bg-primary text-black font-black px-12 py-3 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Salvando...' : 'Salvar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = 'text', step }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">{label}</label>
      <input 
        type={type} 
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white font-medium shadow-inner"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">{label}</label>
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white font-medium appearance-none cursor-pointer shadow-inner"
      >
        {options.map((opt: any) => <option key={opt.value} value={opt.value} className="bg-surface">{opt.label}</option>)}
      </select>
    </div>
  );
}

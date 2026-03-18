import { useState, useEffect } from 'react';
import { 
  Send, 
  Info,
  ShieldCheck,
  Building2,
  Hash,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { storage } from '../lib/storage';

export default function FiscalPage() {
  const [caixaAtivo, setCaixaAtivo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    natureza: 'Venda de Mercadoria',
    cfop: '5102',
    ncm: '9003.11.00',
    cest: '20.007.00',
    unidade: 'UN',
    icms: '17.00',
    pis: '0.65',
    cofins: '3.00',
    valor_total: '',
    emitente_cnpj: '',
    emitente_ie: ''
  });

  useEffect(() => {
    const checkStatus = async () => {
      const settings = await storage.getSettings();
      const caixa = await storage.getCaixaAtual();
      setCaixaAtivo(!!caixa);
      
      setFormData(prev => ({
        ...prev,
        emitente_cnpj: settings.empresa.cnpj || '',
        emitente_ie: settings.empresa.ie || ''
      }));

      setLoading(false);
      
      if (!settings.certificado.configurado) {
        toast.warning('Certificado Digital A1 não configurado', {
          description: 'Acesse Configurações > Certificado Digital para realizar o upload.',
          duration: 6000,
          action: {
            label: 'Configurar',
            onClick: () => window.location.href = '/settings?tab=certificado'
          }
        });
      }

      if (settings.sistema.trava_caixa && !caixa) {
        toast.error('Ação bloqueada: Abra o caixa do dia para emitir documentos fiscais', {
          duration: 5000,
          icon: <AlertCircle className="text-red-500" />
        });
      }
    };
    checkStatus();
  }, []);

  const handleTransmitir = async () => {
    try {
      if (!caixaAtivo) {
        return toast.error('Ação bloqueada: Abra o caixa do dia para emitir documentos fiscais');
      }

      if (!formData.valor_total || Number(formData.valor_total) <= 0) {
        return toast.error('Informe o valor total da nota.');
      }

      setLoading(true);
      await storage.registrarNotaFiscal(formData);
      
      toast.success('NF-e Emitida e Transmitida com Sucesso!', {
        description: `Nota registrada e título gerado no Contas a Receber.`
      });

      // Limpa formulário
      setFormData({ ...formData, valor_total: '' });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const totalImpostos = (Number(formData.valor_total || 0) * (Number(formData.icms) + Number(formData.pis) + Number(formData.cofins)) / 100).toFixed(2);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {!caixaAtivo && !loading && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-4 text-red-500 animate-pulse">
           <AlertCircle size={24} />
           <div>
              <p className="font-black text-xs uppercase tracking-widest">Caixa Fechado</p>
              <p className="text-sm font-bold">Abra o caixa diário para habilitar a emissão de notas.</p>
           </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white">Módulo <span className="text-primary italic">Fiscal</span></h2>
          <p className="text-white/40 text-sm italic">Emissão de Nota Fiscal Eletrônica (NF-e)</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl text-blue-500 text-[10px] font-black uppercase tracking-widest">
           <ShieldCheck size={16} />
           Homologação SEFAZ-GO
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <section className="bg-surface rounded-3xl border border-white/5 p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                 <Building2 className="text-primary" size={24} />
                 <h3 className="text-xl font-bold">Dados da Operação</h3>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <FiscalInput 
                   label="Natureza da Operação" 
                   value={formData.natureza} 
                   onChange={(v) => setFormData({...formData, natureza: v})}
                 />
                 <FiscalInput 
                   label="CFOP" 
                   value={formData.cfop} 
                   onChange={(v) => setFormData({...formData, cfop: v})}
                 />
              </div>

              <div className="grid grid-cols-3 gap-6">
                 <FiscalInput 
                  label="NCM do Produto" 
                  value={formData.ncm} 
                  onChange={(v) => setFormData({...formData, ncm: v})}
                 />
                 <FiscalInput 
                  label="CEST" 
                  value={formData.cest} 
                  onChange={(v) => setFormData({...formData, cest: v})}
                 />
                 <FiscalInput 
                  label="Unidade" 
                  value={formData.unidade} 
                  onChange={(v) => setFormData({...formData, unidade: v})}
                 />
              </div>
           </section>

           <section className="bg-surface rounded-3xl border border-white/5 p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                 <Hash className="text-primary" size={24} />
                 <h3 className="text-xl font-bold">Impostos e Tributação</h3>
              </div>

              <div className="grid grid-cols-3 gap-6">
                 <FiscalInput 
                  label="Alíquota ICMS (%)" 
                  value={formData.icms} 
                  onChange={(v) => setFormData({...formData, icms: v})}
                 />
                 <FiscalInput 
                  label="PIS (%)" 
                  value={formData.pis} 
                  onChange={(v) => setFormData({...formData, pis: v})}
                 />
                 <FiscalInput 
                  label="COFINS (%)" 
                  value={formData.cofins} 
                  onChange={(v) => setFormData({...formData, cofins: v})}
                 />
              </div>
           </section>
        </div>

        <div className="space-y-6">
           <div className="bg-surface p-8 rounded-3xl border border-white/5 h-fit sticky top-8">
              <div className="flex items-center gap-2 mb-6">
                 <Info size={16} className="text-primary" />
                 <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Resumo do Documento</p>
              </div>
              
              <div className="space-y-4 mb-8">
                 <div className="space-y-2 mb-4">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Valor Total da Nota (R$)</label>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-2xl font-black text-white focus:outline-none focus:border-primary/50 transition-colors"
                      value={formData.valor_total}
                      onChange={(e) => setFormData({...formData, valor_total: e.target.value})}
                    />
                 </div>
                 <SummaryLine label="Base Declaração" value={`R$ ${formData.valor_total || '0,00'}`} />
                 <SummaryLine label="Total Impostos" value={`R$ ${totalImpostos}`} />
              </div>

              <button 
                disabled={!caixaAtivo || loading}
                onClick={handleTransmitir}
                className="w-full bg-primary text-black font-black py-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
              >
                <Send size={18} />
                {loading ? 'Transmitindo...' : 'Transmitir para SEFAZ'}
              </button>
              
              <p className="mt-4 text-[10px] text-center text-white/20 italic leading-relaxed font-medium">
                Ao transmitir, o documento será validado perante a Secretaria da Fazenda de Goiás.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}

function FiscalInput({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) {
  return (
    <div className="space-y-2">
       <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">{label}</label>
       <input 
         type="text" 
         placeholder={placeholder}
         value={value}
         onChange={(e) => onChange(e.target.value)}
         className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white font-medium"
       />
    </div>
  );
}

function SummaryLine({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
       <span className="text-white/40 text-sm font-medium">{label}</span>
       <span className="text-white font-black">{value}</span>
    </div>
  );
}

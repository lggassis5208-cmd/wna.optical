import { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Settings2, 
  FileKey, 
  Eye, 
  EyeOff, 
  Upload, 
  Save, 
  AlertTriangle,
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';
import { storage } from '../lib/storage';
import { toast } from 'sonner';

type SettingsTab = 'empresa' | 'fiscal' | 'certificado' | 'sistema';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('empresa');
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const load = async () => {
      const s = await storage.getSettings();
      setSettings(s);
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    await storage.saveSettings(settings);
    toast.success('Configurações salvas com sucesso!', {
      description: 'As alterações foram aplicadas globalmente no sistema.'
    });
    setLoading(false);
  };

  if (loading || !settings) return <div className="flex h-full items-center justify-center font-black animate-pulse">CARREGANDO...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white">Configurações <span className="text-primary italic">do Sistema</span></h2>
          <p className="text-white/40 text-sm italic">Personalização, fiscal e segurança</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="bg-primary text-black font-black px-8 py-3 rounded-2xl flex items-center gap-3 hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
        >
          <Save size={20} />
          Salvar Alterações
        </button>
      </div>

      <div className="flex gap-4 border-b border-white/5 pb-px">
        <TabButton icon={<Building2 size={18}/>} label="Empresa" active={activeTab === 'empresa'} onClick={() => setActiveTab('empresa')} />
        <TabButton icon={<ShieldCheck size={18}/>} label="Fiscal" active={activeTab === 'fiscal'} onClick={() => setActiveTab('fiscal')} />
        <TabButton icon={<FileKey size={18}/>} label="Certificado Digital" active={activeTab === 'certificado'} onClick={() => setActiveTab('certificado')} />
        <TabButton icon={<Settings2 size={18}/>} label="Sistema" active={activeTab === 'sistema'} onClick={() => setActiveTab('sistema')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           {activeTab === 'empresa' && (
             <section className="bg-surface rounded-3xl border border-white/5 p-8 space-y-6 animate-in slide-in-from-left-4 duration-300">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                   <Building2 className="text-primary" size={24} />
                   <h3 className="text-xl font-bold text-white">Dados da Empresa</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                   <ConfigInput 
                    label="Nome Fantasia" 
                    value={settings.empresa.nome_fantasia} 
                    onChange={(v) => setSettings({...settings, empresa: {...settings.empresa, nome_fantasia: v}})}
                   />
                   <ConfigInput 
                    label="Razão Social" 
                    value={settings.empresa.razao_social} 
                    onChange={(v) => setSettings({...settings, empresa: {...settings.empresa, razao_social: v}})}
                   />
                </div>
                <div className="grid grid-cols-2 gap-6">
                   <ConfigInput 
                    label="CNPJ" 
                    value={settings.empresa.cnpj} 
                    onChange={(v) => setSettings({...settings, empresa: {...settings.empresa, cnpj: v}})}
                   />
                   <ConfigInput 
                    label="Inscrição Estadual" 
                    value={settings.empresa.ie} 
                    onChange={(v) => setSettings({...settings, empresa: {...settings.empresa, ie: v}})}
                   />
                </div>
                <ConfigInput 
                    label="Endereço Completo" 
                    value={settings.empresa.endereco} 
                    onChange={(v) => setSettings({...settings, empresa: {...settings.empresa, endereco: v}})}
                />
             </section>
           )}

           {activeTab === 'fiscal' && (
             <section className="bg-surface rounded-3xl border border-white/5 p-8 space-y-6 animate-in slide-in-from-left-4 duration-300">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                   <ShieldCheck className="text-primary" size={24} />
                   <h3 className="text-xl font-bold text-white">Configurações Fiscais</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                   <ConfigInput 
                    label="Série da Nota Fiscal" 
                    value={settings.fiscal.serie} 
                    onChange={(v) => setSettings({...settings, fiscal: {...settings.fiscal, serie: v}})}
                   />
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Ambiente de Transmissão</label>
                      <select 
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 text-white"
                        value={settings.fiscal.ambiente}
                        onChange={(e) => setSettings({...settings, fiscal: {...settings.fiscal, ambiente: e.target.value}})}
                      >
                        <option value="homologacao">Homologação (Testes)</option>
                        <option value="producao">Produção (Real)</option>
                      </select>
                   </div>
                </div>
             </section>
           )}

           {activeTab === 'certificado' && (
             <section className="bg-surface rounded-3xl border border-white/5 p-8 space-y-6 animate-in slide-in-from-left-4 duration-300">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                   <FileKey className="text-primary" size={24} />
                   <div className="flex-1">
                      <h3 className="text-xl font-bold text-white">Certificado Digital</h3>
                      <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-0.5">Assinatura Eletrônica A1</p>
                   </div>
                   <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                     settings.certificado.configurado 
                       ? 'bg-primary/10 text-primary border-primary/20' 
                       : 'bg-red-500/10 text-red-500 border-red-500/20'
                   }`}>
                     {settings.certificado.configurado ? 'Ativo' : 'Não Configurado'}
                   </span>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 text-center space-y-4">
                   <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/20">
                      <Upload size={32} />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-white">Fazer upload do certificado (.pfx ou .p12)</p>
                      <p className="text-xs text-white/30 mt-1">Seu certificado A1 é essencial para emitir NF-e.</p>
                   </div>
                   <input type="file" id="cert-upload" className="hidden" accept=".pfx,.p12" onChange={() => setSettings({...settings, certificado: {...settings.certificado, configurado: true, arquivo_nome: 'certificado_otica_lis.pfx'}})} />
                   <label htmlFor="cert-upload" className="inline-block bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer transition-all">
                      Selecionar Arquivo
                   </label>
                   {settings.certificado.arquivo_nome && <p className="text-xs text-primary font-bold italic">{settings.certificado.arquivo_nome}</p>}
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2 relative">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Senha do Certificado</label>
                      <div className="relative">
                        <input 
                          type={showPass ? 'text' : 'password'} 
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 text-white pr-12"
                          placeholder="********"
                        />
                        <button 
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                        >
                          {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                   </div>
                   <ConfigInput 
                    label="Data de Validade" 
                    type="date"
                    value={settings.certificado.data_validade} 
                    onChange={(v) => setSettings({...settings, certificado: {...settings.certificado, data_validade: v}})}
                   />
                </div>

                <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl flex gap-4 items-start">
                   <Info size={20} className="text-blue-500 mt-1 shrink-0" />
                   <p className="text-xs text-blue-500/70 leading-relaxed font-medium">
                     <strong>Segurança Ótica Lis:</strong> O certificado A1 é necessário para assinar digitalmente suas notas fiscais junto à SEFAZ-GO. Seus dados são armazenados de forma criptografada localmente e nunca deixam o sistema sem sua autorização.
                   </p>
                </div>
             </section>
           )}

           {activeTab === 'sistema' && (
             <section className="bg-surface rounded-3xl border border-white/5 p-8 space-y-8 animate-in slide-in-from-left-4 duration-300">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                   <Settings2 className="text-primary" size={24} />
                   <h3 className="text-xl font-bold text-white">Preferências do Sistema</h3>
                </div>

                <div className="flex items-center justify-between p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                   <div className="space-y-1">
                      <h4 className="font-bold text-white">Trava de Caixa Obrigatória</h4>
                      <p className="text-xs text-white/30">Bloqueia vendas e faturamento se o caixa diário não estiver aberto.</p>
                   </div>
                   <button 
                    onClick={() => setSettings({...settings, sistema: {...settings.sistema, trava_caixa: !settings.sistema.trava_caixa}})}
                    className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${settings.sistema.trava_caixa ? 'bg-primary' : 'bg-white/10'}`}
                   >
                     <div className={`w-6 h-6 rounded-full bg-white transition-all shadow-md ${settings.sistema.trava_caixa ? 'translate-x-6' : 'translate-x-0'}`} />
                   </button>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-2">
                     <ImageIcon size={18} className="text-primary" />
                     <h4 className="font-bold text-white">Personalização da O.S.</h4>
                   </div>
                   <div className="grid grid-cols-1 gap-6">
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 text-center border-dashed">
                        <img src="/otica.png" className="w-32 h-auto mx-auto mb-4 object-contain rounded-lg shadow-lg" alt="Logo Atual" />
                        <p className="text-xs text-white/30 mb-4">Logo atual do Recibo/O.S.</p>
                        <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Alterar Logo</button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Termos de Garantia (Rodapé)</label>
                        <textarea 
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 text-white h-32 resize-none"
                          value={settings.sistema.termos_garantia}
                          onChange={(e) => setSettings({...settings, sistema: {...settings.sistema, termos_garantia: e.target.value}})}
                        />
                      </div>
                   </div>
                </div>
             </section>
           )}
        </div>

        <div className="space-y-6">
           <div className="bg-surface p-8 rounded-3xl border border-white/5 h-fit sticky top-8 text-center space-y-6">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary border border-primary/20">
                 <Building2 size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{settings.empresa.nome_fantasia || 'Ótica Lis'}</h3>
                <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-black">Identidade Visual & Fiscal</p>
              </div>
              <div className="h-px bg-white/5" />
              <div className="text-left space-y-4">
                 <div className="flex items-center gap-3 text-white/40">
                    <CheckCircle2 size={16} className="text-green-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Módulos Integrados</span>
                 </div>
                 <p className="text-xs text-white/30 leading-relaxed italic">
                   Os dados aqui configurados são usados automaticamente na emissão de NF-e, recibos laboratoriais e relatórios financeiros.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`
        flex items-center gap-2 px-6 py-4 border-b-2 transition-all text-sm font-black uppercase tracking-widest
        ${active ? 'border-primary text-white' : 'border-transparent text-white/20 hover:text-white/40'}
      `}
    >
      <span className={active ? 'text-primary' : 'text-inherit'}>{icon}</span>
      {label}
    </button>
  );
}

function ConfigInput({ label, value, onChange, type = "text", placeholder }: { label: string, value: string, onChange: (v: string) => void, type?: string, placeholder?: string }) {
  return (
    <div className="space-y-2">
       <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">{label}</label>
       <input 
         type={type} 
         placeholder={placeholder}
         value={value}
         onChange={(e) => onChange(e.target.value)}
         className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white font-medium"
       />
    </div>
  );
}

function Info({ size, className }: { size: number, className?: string }) {
  return (
    <div className={className}>
       <AlertTriangle size={size} />
    </div>
  );
}

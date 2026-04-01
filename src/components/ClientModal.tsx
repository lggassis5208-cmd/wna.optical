import { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  FileText, 
  MapPin, 
  Phone, 
  ShieldCheck,
  Search,
  Loader2,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { storage } from '../lib/storage';
import { formatPhoneForWhatsApp } from '../lib/whatsappUtils';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ClientModal({ isOpen, onClose }: ClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [cep, setCep] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    whatsapp: '',
    logradouro: '',
    bairro: '',
    cidade: '',
    uf: '',
    numero: '',
    data_nascimento: ''
  });

  useEffect(() => {
    if (cep.length === 8) {
      const fetchCEP = async () => {
        setLoading(true);
        try {
          const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
          const data = await response.json();
          if (!data.erro) {
            setFormData(prev => ({
              ...prev,
              logradouro: data.logradouro,
              bairro: data.bairro,
              cidade: data.localidade,
              uf: data.uf
            }));
            toast.success('Endereço preenchido!');
          }
        } catch (error) {
          toast.error('Erro ao buscar CEP');
        } finally {
          setLoading(false);
        }
      };
      fetchCEP();
    }
  }, [cep]);

  const maskPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3').substring(0, 14);
    }
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').substring(0, 15);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.whatsapp) {
      toast.error('Preencha Nome e WhatsApp');
      return;
    }

    setLoading(true);
    try {
      // Garantir prefixo 55 e apenas números ao salvar
      const cleanData = {
        ...formData,
        whatsapp: formatPhoneForWhatsApp(formData.whatsapp)
      };
      
      await storage.saveClient(cleanData);
      toast.success('Cliente cadastrado com sucesso!');
      onClose();
    } catch (error) {
      toast.error('Erro ao salvar cliente');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl shadow-black overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <User className="text-primary" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Novo Cliente Premium</h3>
              <p className="text-xs text-white/40">Cadastre um novo cliente na Ótica Lis</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
          {/* Lis Score Highlight */}
          <div className="bg-gradient-to-r from-primary/20 to-transparent p-4 rounded-2xl border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-primary" size={28} />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary/80">Lis Score Eligibility</p>
                <p className="text-sm text-white/70">Este cliente será avaliado para o selo de fidelidade Gold.</p>
              </div>
            </div>
            <div className="bg-primary text-black px-4 py-1.5 rounded-full text-xs font-black shadow-lg shadow-primary/20">
              LIS GOLD: 850
            </div>
          </div>

          <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info Group */}
            <div className="space-y-4 md:col-span-2">
              <h4 className="text-xs font-bold text-white/20 uppercase tracking-widest border-b border-white/5 pb-2">Informações Básicas</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup 
                  label="Nome Completo (Obrigatório)" 
                  icon={<User size={16} />} 
                  placeholder="Ex: João Silva" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
                <InputGroup 
                  label="CPF" 
                  icon={<FileText size={16} />} 
                  placeholder="000.000.000-00" 
                  value={formData.cpf}
                  onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                />
                <InputGroup 
                  label="WhatsApp (Obrigatório)" 
                  icon={<Phone size={16} />} 
                  placeholder="(11) 99999-9999" 
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({...formData, whatsapp: maskPhone(e.target.value)})}
                />
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/40 ml-1">Data de Nascimento</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20">
                      <Clock size={16} />
                    </div>
                    <input 
                      type="date" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white"
                      value={formData.data_nascimento}
                      onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Address Group */}
            <div className="space-y-4 md:col-span-2 pt-4">
              <h4 className="text-xs font-bold text-white/20 uppercase tracking-widest border-b border-white/5 pb-2">Endereço & Localização</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/40 ml-1">CEP (Auto-fill)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/60" size={16} />
                    {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-primary animate-spin" size={16} />}
                    <input 
                      type="text" 
                      maxLength={8}
                      placeholder="00000000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                      value={cep}
                      onChange={(e) => setCep(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <InputGroup 
                    label="Logradouro" 
                    icon={<MapPin size={16} />} 
                    placeholder="Rua, Avenida..." 
                    value={formData.logradouro}
                    onChange={(e) => setFormData({...formData, logradouro: e.target.value})}
                  />
                </div>
                <InputGroup 
                  label="Bairro" 
                  icon={<MapPin size={16} />} 
                  value={formData.bairro}
                  onChange={(e) => setFormData({...formData, bairro: e.target.value})}
                />
                <InputGroup 
                  label="Cidade" 
                  icon={<MapPin size={16} />} 
                  value={formData.cidade}
                  onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                />
                <InputGroup 
                  label="Número" 
                  icon={<Search size={16} />} 
                  placeholder="123" 
                  value={formData.numero}
                  onChange={(e) => setFormData({...formData, numero: e.target.value})}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button 
            disabled={loading}
            onClick={handleSave}
            className="bg-primary text-black px-8 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InputGroup({ label, icon, placeholder, value, onChange }: { label: string, icon: React.ReactNode, placeholder?: string, value?: string, onChange?: (e: any) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-white/40 ml-1">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20">
          {icon}
        </div>
        <input 
          type="text" 
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
          value={value}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { X, Send, Users, MessageSquare, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { campanhasService } from '../lib/services/campanhasService';
import { segmentosService, type Segmento } from '../lib/services/segmentosService';

interface CampaignBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CampaignBuilderModal({ isOpen, onClose, onSuccess }: CampaignBuilderModalProps) {
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState('');
  const [segmentoId, setSegmentoId] = useState('');
  const [template, setTemplate] = useState('');
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [segmentoSelecionado, setSegmentoSelecionado] = useState<Segmento | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSegmentos();
    }
  }, [isOpen]);

  const loadSegmentos = async () => {
    const data = await segmentosService.getSegmentos();
    setSegmentos(data);
  };

  const handleSegmentoChange = (id: string) => {
    setSegmentoId(id);
    const seg = segmentos.find(s => s.id === id);
    setSegmentoSelecionado(seg || null);
  };

  const handleInsertVariable = (vari: string) => {
    setTemplate(prev => prev + vari);
  };

  const handleSave = async () => {
    if (!nome.trim() || !segmentoId || !template.trim()) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      if (!segmentoSelecionado) throw new Error('Segmento inválido');

      await campanhasService.agendarCampanha({
        nome,
        segmento_id: segmentoId,
        template_mensagem: template,
        canal: 'whatsapp'
      }, segmentoSelecionado.regras);

      toast.success('Campanha agendada e enviada para a fila de processamento!');
      onSuccess();
      onClose();
    } catch (e) {
      toast.error('Erro ao agendar campanha.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface w-full max-w-3xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Send className="text-green-500" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Nova Campanha WhatsApp</h3>
              <p className="text-xs text-white/40">Disparo em massa inteligente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-white/70 ml-1">Nome da Campanha (Interno)</label>
              <input 
                type="text" 
                placeholder="Ex: Oferta Aniversariantes de Julho"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-primary/50 transition-colors text-white"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-white/70 ml-1">Público-Alvo (Segmento)</label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                <select 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-primary/50 transition-colors text-white appearance-none"
                  value={segmentoId}
                  onChange={(e) => handleSegmentoChange(e.target.value)}
                >
                  <option value="" disabled className="bg-black">Selecione um segmento criado na Fase 1...</option>
                  {segmentos.map(seg => (
                    <option key={seg.id} value={seg.id} className="bg-black">{seg.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3 md:col-span-2 pt-4">
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                <label className="text-sm font-bold text-white/70 ml-1 flex items-center gap-2">
                  <MessageSquare size={16} /> Template da Mensagem
                </label>
              </div>
              
              <div className="flex gap-2 mb-2 overflow-x-auto pb-2 custom-scrollbar">
                <span className="text-xs text-white/40 py-1 flex-shrink-0">Variáveis:</span>
                <button onClick={() => handleInsertVariable('{{nome}}')} className="text-xs bg-white/10 hover:bg-white/20 text-white font-mono px-2 py-1 rounded-md transition-colors whitespace-nowrap">{'{{nome}}'}</button>
              </div>

              <textarea 
                rows={6}
                placeholder="Ex: Olá {{nome}}! Preparamos uma oferta especial..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-green-500/50 transition-colors text-white resize-none"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              />
              <p className="text-xs text-white/30">Lembre-se de não fazer SPAM. O sistema garantirá que só os clientes que autorizaram marketing receberão.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white/40 hover:text-white hover:bg-white/5 transition-colors">
            Cancelar
          </button>
          <button 
            disabled={loading}
            onClick={handleSave}
            className="bg-green-500 text-black px-8 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-green-500/20 hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><Play size={18} fill="currentColor" /> Disparar Campanha</>}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { 
  Eye, 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Calendar, 
  ShieldCheck, 
  Lock, 
  Printer, 
  MessageCircle, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle, 
  Sparkles,
  ArrowUpRight,
  UserCheck
} from 'lucide-react';
import { fichasMedicasService, type FichaMedica } from '../lib/services/fichasMedicasService';
import FichaMedicaFormModal from '../components/FichaMedicaFormModal';
import FichaMedicaPDF from '../components/FichaMedicaPDF';
import { formatDate } from '../lib/dateUtils';
import { maskCpf } from '../lib/cryptoUtils';
import { toast } from 'sonner';

export default function FichasMedicasPage() {
  const [fichas, setFichas] = useState<FichaMedica[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedFichaToEdit, setSelectedFichaToEdit] = useState<string | null>(null);
  const [selectedFichaForPdf, setSelectedFichaForPdf] = useState<FichaMedica | null>(null);
  const [fichaPaiForAdendo, setFichaPaiForAdendo] = useState<string | null>(null);

  const fetchFichas = async () => {
    setLoading(true);
    try {
      const data = await fichasMedicasService.getFichas();
      setFichas(data);
    } catch (e) {
      toast.error('Erro ao carregar prontuários médicos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFichas();
  }, []);

  const handleOpenNewFicha = () => {
    setSelectedFichaToEdit(null);
    setFichaPaiForAdendo(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditFicha = (f: FichaMedica) => {
    setSelectedFichaToEdit(f.id);
    setFichaPaiForAdendo(null);
    setIsFormModalOpen(true);
  };

  const handleOpenAdendo = (f: FichaMedica) => {
    setSelectedFichaToEdit(null);
    setFichaPaiForAdendo(f.id);
    setIsFormModalOpen(true);
  };

  const handleOpenPdf = (f: FichaMedica) => {
    setSelectedFichaForPdf(f);
    setIsPdfModalOpen(true);
  };

  // Filtragem dos registros
  const filteredFichas = fichas.filter(f => {
    const term = searchTerm.toLowerCase();
    const matchSearch = 
      (f.nome || '').toLowerCase().includes(term) ||
      (f.cpf || '').includes(term) ||
      (f.atendido_por || '').toLowerCase().includes(term) ||
      (f.id || '').toLowerCase().includes(term);

    if (!matchSearch) return false;

    if (statusFilter === 'rascunho') return f.status === 'rascunho';
    if (statusFilter === 'finalizada') return f.status === 'finalizada';
    if (statusFilter === 'retificacao') return f.tipo === 'retificacao';
    if (statusFilter === 'vencendo') {
      const hoje = new Date().toISOString().substring(0, 10);
      const em30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
      return f.status === 'finalizada' && f.validade_receita >= hoje && f.validade_receita <= em30Dias;
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20">
              <Eye size={28} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Prontuário Médico Óptico</h1>
              <p className="text-xs text-white/50">
                Fichas médicas, refração por olho (OD/OE) e receitas com imutabilidade (Ótica Lìs ERP)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenNewFicha}
          className="px-6 py-3 bg-primary hover:bg-primary/90 text-black font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
        >
          <Plus size={18} /> Nova Ficha Médica / Receita
        </button>
      </div>

      {/* Bar de Pesquisa & Filtros */}
      <div className="bg-surface border border-white/10 rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Input Pesquisa */}
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por paciente, CPF ou optometrista..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-2.5 text-xs text-white placeholder:text-white/40 focus:border-primary focus:outline-none"
          />
        </div>

        {/* Filtros de Status */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto custom-scrollbar">
          {[
            { id: 'todos', label: 'Todas as Fichas' },
            { id: 'rascunho', label: 'Rascunhos' },
            { id: 'finalizada', label: 'Finalizadas' },
            { id: 'retificacao', label: 'Adendos / Retificações' },
            { id: 'vencendo', label: 'Receitas Vencendo (30d)' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                statusFilter === tab.id
                  ? 'bg-primary text-black border-primary'
                  : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela / Grid de Fichas Médicas */}
      {loading ? (
        <div className="text-center py-20 bg-surface border border-white/10 rounded-3xl">
          <RefreshCw size={32} className="animate-spin mx-auto text-primary mb-3" />
          <p className="text-xs text-white/50">Carregando prontuários de refração...</p>
        </div>
      ) : filteredFichas.length === 0 ? (
        <div className="text-center py-20 bg-surface border border-white/10 rounded-3xl space-y-4">
          <Eye size={48} className="mx-auto text-white/20" />
          <p className="text-sm font-bold text-white/60">Nenhum prontuário médico encontrado com os filtros selecionados.</p>
          <button
            onClick={handleOpenNewFicha}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all"
          >
            Cadastrar Primeira Ficha Médica
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFichas.map(f => {
            const rod = f.refracoes?.find(r => r.olho === 'OD');
            const roe = f.refracoes?.find(r => r.olho === 'OE');

            return (
              <div 
                key={f.id} 
                className="bg-surface border border-white/10 rounded-3xl p-6 space-y-4 hover:border-primary/40 transition-all group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  
                  {/* Top Header Card */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-white text-base group-hover:text-primary transition-colors">
                        {f.nome}
                      </h3>
                      <p className="text-[11px] font-mono text-white/40">CPF: {maskCpf(f.cpf)}</p>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      f.status === 'finalizada'
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    }`}>
                      {f.status === 'finalizada' ? 'Finalizada' : 'Rascunho'}
                    </span>
                  </div>

                  {/* Resumo de Refração OD / OE */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-xl">
                      <span className="font-black text-blue-400 block text-[10px]">OD (Direito)</span>
                      <p className="font-mono text-white/90 text-xs">
                        Esf {rod?.esferico ?? 0} | Cil {rod?.cilindrico ?? 0} | Eixo {rod?.eixo ?? 0}°
                      </p>
                    </div>

                    <div className="bg-purple-500/10 border border-purple-500/20 p-2.5 rounded-xl">
                      <span className="font-black text-purple-400 block text-[10px]">OE (Esquerdo)</span>
                      <p className="font-mono text-white/90 text-xs">
                        Esf {roe?.esferico ?? 0} | Cil {roe?.cilindrico ?? 0} | Eixo {roe?.eixo ?? 0}°
                      </p>
                    </div>
                  </div>

                  {/* Info de Atendimento e Data */}
                  <div className="flex justify-between items-center text-[11px] text-white/50 pt-2 border-t border-white/5">
                    <span>Exame: <strong>{formatDate(f.data_exame)}</strong></span>
                    <span className="text-primary font-bold">Validade: {formatDate(f.validade_receita)}</span>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenEditFicha(f)}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10 flex-1 flex justify-center items-center gap-1.5"
                  >
                    {f.status === 'finalizada' ? <Lock size={12} /> : <FileText size={12} />}
                    {f.status === 'finalizada' ? 'Ver Prontuário' : 'Editar Rascunho'}
                  </button>

                  {f.status === 'finalizada' && (
                    <>
                      <button
                        onClick={() => handleOpenPdf(f)}
                        className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-xl transition-all border border-green-500/30"
                        title="Imprimir / WhatsApp Receita"
                      >
                        <Printer size={16} />
                      </button>

                      <button
                        onClick={() => handleOpenAdendo(f)}
                        className="p-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-xl transition-all border border-yellow-500/30"
                        title="Criar Adendo / Retificação"
                      >
                        <Plus size={16} />
                      </button>
                    </>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modais */}
      <FichaMedicaFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        fichaToEditId={selectedFichaToEdit}
        fichaPaiIdForAdendo={fichaPaiForAdendo}
        onSaved={fetchFichas}
        onOpenPdf={(ficha) => {
          setSelectedFichaForPdf(ficha);
          setIsPdfModalOpen(true);
        }}
      />

      <FichaMedicaPDF
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        ficha={selectedFichaForPdf}
      />

    </div>
  );
}

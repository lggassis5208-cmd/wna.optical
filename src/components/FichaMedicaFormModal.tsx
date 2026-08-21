import { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  CheckCircle, 
  AlertTriangle, 
  Copy, 
  History, 
  ShieldCheck, 
  Lock, 
  UserCheck,
  Eye,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import { fichasMedicasService, type FichaMedica, type Refracao } from '../lib/services/fichasMedicasService';
import { validateRefractionClinical } from '../lib/cryptoUtils';
import { formatDate } from '../lib/dateUtils';
import { toast } from 'sonner';

interface FichaMedicaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId?: string | null;
  clientData?: any;
  fichaToEditId?: string | null;
  fichaPaiIdForAdendo?: string | null;
  onSaved?: () => void;
}

export default function FichaMedicaFormModal({
  isOpen,
  onClose,
  clienteId,
  clientData,
  fichaToEditId,
  fichaPaiIdForAdendo,
  onSaved
}: FichaMedicaFormModalProps) {
  const [fichaId, setFichaId] = useState<string | null>(fichaToEditId || null);
  const [loading, setLoading] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [isAdendo, setIsAdendo] = useState(Boolean(fichaPaiIdForAdendo));
  const [assinaturaHash, setAssinaturaHash] = useState<string | null>(null);
  const [showHistoryCompare, setShowHistoryCompare] = useState(false);
  const [previousFichas, setPreviousFichas] = useState<FichaMedica[]>([]);

  // Dados do Paciente
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [genero, setGenero] = useState('Outro');
  const [dataNascimento, setDataNascimento] = useState('');

  // Dados da Consulta
  const [motivoConsulta, setMotivoConsulta] = useState('');
  const [atendidoPor, setAtendidoPor] = useState('Dr. Optometrista Lìs');
  const [dataExame, setDataExame] = useState(new Date().toISOString().substring(0, 10));
  const [validadeReceita, setValidadeReceita] = useState('');

  // Refração OD
  const [od, setOd] = useState<Refracao>({
    olho: 'OD',
    esferico: 0.00,
    cilindrico: 0.00,
    eixo: 0,
    adicao: null,
    dnp: null,
    altura: null
  });

  // Refração OE
  const [oe, setOe] = useState<Refracao>({
    olho: 'OE',
    esferico: 0.00,
    cilindrico: 0.00,
    eixo: 0,
    adicao: null,
    dnp: null,
    altura: null
  });

  // Validações em tempo real
  const odValidation = validateRefractionClinical(od);
  const oeValidation = validateRefractionClinical(oe);

  useEffect(() => {
    if (isOpen) {
      initModal();
    }
  }, [isOpen, fichaToEditId, clienteId, fichaPaiIdForAdendo]);

  // Atualiza a validade default (12 meses) quando a data do exame muda e validade não foi customizada
  const handleDataExameChange = (newDate: string) => {
    setDataExame(newDate);
    if (newDate) {
      const d = new Date(newDate);
      d.setFullYear(d.getFullYear() + 1);
      setValidadeReceita(d.toISOString().substring(0, 10));
    }
  };

  const initModal = async () => {
    setLoading(true);
    try {
      // 1. Preencher com dados do cliente se fornecido
      if (clientData) {
        setNome(clientData.nome || clientData.name || clientData.nome_completo || '');
        setCpf(clientData.cpf || '');
        setTelefone(clientData.whatsapp || clientData.telefone || '');
        setGenero(clientData.genero || 'Outro');
        setDataNascimento(clientData.data_nascimento || '');
      }

      // Default validade receita (12 meses)
      const defaultValid = new Date();
      defaultValid.setFullYear(defaultValid.getFullYear() + 1);
      setValidadeReceita(defaultValid.toISOString().substring(0, 10));

      const cid = clienteId || clientData?.id;
      if (cid) {
        // Carregar fichas anteriores para historico
        const history = await fichasMedicasService.getFichas({ clienteId: cid });
        setPreviousFichas(history);
      }

      // 2. Se for edição de ficha existente
      if (fichaToEditId) {
        const f = await fichasMedicasService.getFichaById(fichaToEditId, 'Sistema Lìs ERP');
        if (f) {
          setFichaId(f.id);
          setNome(f.nome || '');
          setCpf(f.cpf || '');
          setTelefone(f.telefone || '');
          setGenero(f.genero || 'Outro');
          setDataNascimento(f.data_nascimento || '');
          setMotivoConsulta(f.motivo_consulta || '');
          setAtendidoPor(f.atendido_por || 'Dr. Optometrista Lìs');
          setDataExame(f.data_exame || new Date().toISOString().substring(0, 10));
          setValidadeReceita(f.validade_receita || '');
          setIsFinalized(f.status === 'finalizada');
          setAssinaturaHash(f.assinatura_hash || null);
          setIsAdendo(f.tipo === 'retificacao');

          if (f.refracoes) {
            const rod = f.refracoes.find(r => r.olho === 'OD');
            const roe = f.refracoes.find(r => r.olho === 'OE');
            if (rod) setOd(rod);
            if (roe) setOe(roe);
          }
        }
      } else if (fichaPaiIdForAdendo) {
        // Modo criação de Adendo / Retificação
        const fPai = await fichasMedicasService.getFichaById(fichaPaiIdForAdendo);
        if (fPai) {
          setIsAdendo(true);
          setFichaId(null);
          setIsFinalized(false);
          setMotivoConsulta(`Retificação / Adendo referente à ficha #${fPai.id.substring(0, 8)}`);
          if (fPai.refracoes) {
            const rod = fPai.refracoes.find(r => r.olho === 'OD');
            const roe = fPai.refracoes.find(r => r.olho === 'OE');
            if (rod) setOd({ ...rod, id: undefined, ficha_id: undefined });
            if (roe) setOe({ ...roe, id: undefined, ficha_id: undefined });
          }
        }
      } else {
        // Nova Ficha do Zero
        setFichaId(null);
        setIsFinalized(false);
        setAssinaturaHash(null);
        setIsAdendo(false);
      }
    } catch (e) {
      toast.error('Erro ao inicializar formulário de prontuário.');
    } finally {
      setLoading(false);
    }
  };

  // Repetir valores da última refração cadastrada do cliente
  const handleRepetirUltimaRefracao = () => {
    if (previousFichas.length === 0) {
      toast.info('Nenhuma refração anterior cadastrada para este paciente.');
      return;
    }
    const ultima = previousFichas[0];
    if (ultima.refracoes) {
      const rod = ultima.refracoes.find(r => r.olho === 'OD');
      const roe = ultima.refracoes.find(r => r.olho === 'OE');
      if (rod) setOd({ ...rod, id: undefined, ficha_id: undefined });
      if (roe) setOe({ ...roe, id: undefined, ficha_id: undefined });
      toast.success('Graus da última refração copiados com sucesso!', {
        description: `Copiado da consulta realizada em ${formatDate(ultima.data_exame)}.`
      });
    }
  };

  // Salvar Rascunho
  const handleSaveRascunho = async () => {
    if (!clienteId && !clientData?.id) {
      return toast.error('Vincule a ficha a um cliente/paciente do ERP.');
    }
    if (!dataExame) {
      return toast.error('A Data do Exame é obrigatória.');
    }

    try {
      const saved = await fichasMedicasService.saveRascunho(
        {
          id: fichaId || undefined,
          cliente_id: clienteId || clientData?.id,
          nome,
          cpf,
          telefone,
          genero,
          data_nascimento: dataNascimento,
          motivo_consulta: motivoConsulta,
          atendido_por: atendidoPor,
          data_exame: dataExame,
          validade_receita: validadeReceita,
          ficha_pai_id: fichaPaiIdForAdendo || null,
          tipo: isAdendo ? 'retificacao' : 'original'
        },
        od,
        oe
      );
      setFichaId(saved.id);
      toast.success('Rascunho de Prontuário salvo com sucesso.');
      if (onSaved) onSaved();
    } catch (e) {
      toast.error('Erro ao salvar rascunho de prontuário.');
    }
  };

  // Finalizar Prontuário
  const handleFinalizar = async () => {
    if (!odValidation.isValid || !oeValidation.isValid) {
      return toast.error('Corrija os erros de validação clínica antes de finalizar.');
    }
    if (!atendidoPor.trim()) {
      return toast.error('Informe o Optometrista responsável.');
    }
    if (!dataExame) {
      return toast.error('A Data do Exame é obrigatória.');
    }

    const cid = clienteId || clientData?.id;
    if (!cid) {
      return toast.error('Vincule a ficha a um paciente do ERP.');
    }

    try {
      setLoading(true);
      const targetId = fichaId || crypto.randomUUID();
      const finalized = await fichasMedicasService.finalizarFicha(
        targetId,
        atendidoPor,
        {
          id: targetId,
          cliente_id: cid,
          nome,
          cpf,
          telefone,
          genero,
          data_nascimento: dataNascimento,
          motivo_consulta: motivoConsulta,
          atendido_por: atendidoPor,
          data_exame: dataExame,
          validade_receita: validadeReceita,
          ficha_pai_id: fichaPaiIdForAdendo || null,
          tipo: isAdendo ? 'retificacao' : 'original'
        },
        od,
        oe
      );

      setIsFinalized(true);
      setAssinaturaHash(finalized.assinatura_hash || null);
      toast.success('Prontuário Médico Finalizado & Assinado com sucesso!', {
        description: `Hash de imutabilidade gerado: ${finalized.assinatura_hash?.substring(0, 20)}...`
      });
      if (onSaved) onSaved();
    } catch (e: any) {
      toast.error('Erro ao finalizar prontuário: ' + (e?.message || 'Falha de gravação'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-surface border border-white/10 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20">
              <Eye size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {isFinalized ? 'Prontuário Médico (Finalizado)' : isAdendo ? 'Criar Retificação por Adendo' : 'Ficha Médica & Refração Óptica'}
                </h2>
                {isFinalized && (
                  <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-bold flex items-center gap-1">
                    <Lock size={12} /> Imutável
                  </span>
                )}
                {isAdendo && (
                  <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full text-xs font-bold">
                    Adendo
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50">
                Ótica Lìs — Registro Clínico Sensível (LGPD Dado de Saúde)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {previousFichas.length > 0 && !isFinalized && (
              <button
                type="button"
                onClick={handleRepetirUltimaRefracao}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-white/10"
                title="Copiar refração do exame anterior"
              >
                <Copy size={14} /> Repetir Última Refração
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowHistoryCompare(!showHistoryCompare)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                showHistoryCompare 
                  ? 'bg-primary text-black border-primary' 
                  : 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10'
              }`}
            >
              <History size={14} /> Comparar Histórico ({previousFichas.length})
            </button>

            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 custom-scrollbar">

          {/* Banner de Hash de Imutabilidade quando finalizado */}
          {isFinalized && assinaturaHash && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck size={24} className="text-green-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-green-300">Assinatura Digital & Imutabilidade Ativa</p>
                  <p className="text-[11px] font-mono text-green-400/70 break-all">{assinaturaHash}</p>
                </div>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 bg-green-500/20 text-green-300 rounded-md shrink-0">
                Imutável
              </span>
            </div>
          )}

          {/* Alertas de validação clínica */}
          {(odValidation.warnings.length > 0 || oeValidation.warnings.length > 0) && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl space-y-1">
              <div className="flex items-center gap-2 text-yellow-400 font-bold text-xs">
                <AlertTriangle size={16} /> Avisos Clínicos de Refração:
              </div>
              {odValidation.warnings.map((w, idx) => (
                <p key={`od-w-${idx}`} className="text-xs text-yellow-300/80 pl-6">• [OD] {w}</p>
              ))}
              {oeValidation.warnings.map((w, idx) => (
                <p key={`oe-w-${idx}`} className="text-xs text-yellow-300/80 pl-6">• [OE] {w}</p>
              ))}
            </div>
          )}

          {/* Painel comparativo com histórico anterior (se expandido) */}
          {showHistoryCompare && (
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-4 duration-300">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <Sparkles size={16} /> Evolução Histórica de Refração do Paciente
              </h3>
              {previousFichas.length === 0 ? (
                <p className="text-xs text-white/40 italic">Nenhum exame prévio registrado para este paciente.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto custom-scrollbar">
                  {previousFichas.map((pf) => {
                    const odPrev = pf.refracoes?.find(r => r.olho === 'OD');
                    const oePrev = pf.refracoes?.find(r => r.olho === 'OE');
                    return (
                      <div key={pf.id} className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-white">{formatDate(pf.data_exame)}</span>
                          <span className="text-[10px] text-white/50 font-mono">Por: {pf.atendido_por}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                            <span className="font-bold text-blue-400">OD:</span> Esf {odPrev?.esferico} | Cil {odPrev?.cilindrico} | Eixo {odPrev?.eixo}° {odPrev?.adicao ? `| Add ${odPrev.adicao}` : ''}
                          </div>
                          <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20">
                            <span className="font-bold text-purple-400">OE:</span> Esf {oePrev?.esferico} | Cil {oePrev?.cilindrico} | Eixo {oePrev?.eixo}° {oePrev?.adicao ? `| Add ${oePrev.adicao}` : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SEÇÃO 1: DADOS DO PACIENTE */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <UserCheck size={16} /> 1. Dados Pessoais do Paciente (ERP)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-white/60 mb-1">Nome Completo</label>
                <input 
                  type="text" 
                  disabled={isFinalized}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-primary focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/60 mb-1">CPF (Dado Sensível)</label>
                <input 
                  type="text" 
                  disabled={isFinalized}
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-primary focus:outline-none disabled:opacity-50 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/60 mb-1">WhatsApp / Telefone</label>
                <input 
                  type="text" 
                  disabled={isFinalized}
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-primary focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/60 mb-1">Data de Nascimento</label>
                <input 
                  type="date" 
                  disabled={isFinalized}
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-primary focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: REFRAÇÃO POR OLHO (OD E OE LADO A LADO) */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Eye size={16} /> 2. Refração Óptica (Grau por Olho - Separação Estrita OD / OE)
              </h3>
              <span className="text-[10px] text-white/40 italic">Passo clínico de 0.25 | Eixo 0-180°</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* BLOCO OLHO DIREITO (OD) */}
              <div className="bg-blue-500/[0.04] border border-blue-500/20 rounded-2xl p-5 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 px-4 py-1 bg-blue-500 text-black font-black text-xs rounded-bl-xl uppercase tracking-widest">
                  OD — Olho Direito
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-blue-300 mb-1">Esférico</label>
                    <input 
                      type="number" 
                      step="0.25"
                      disabled={isFinalized}
                      value={od.esferico}
                      onChange={(e) => setOd({ ...od, esferico: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-blue-500/30 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-blue-300 mb-1">Cilíndrico</label>
                    <input 
                      type="number" 
                      step="0.25"
                      disabled={isFinalized}
                      value={od.cilindrico}
                      onChange={(e) => setOd({ ...od, cilindrico: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-blue-500/30 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-blue-300 mb-1">Eixo (°)</label>
                    <input 
                      type="number" 
                      min="0"
                      max="180"
                      disabled={isFinalized}
                      value={od.eixo}
                      onChange={(e) => setOd({ ...od, eixo: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-blue-500/30 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1 border-t border-blue-500/10">
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 mb-1">Adição (Opcional)</label>
                    <input 
                      type="number" 
                      step="0.25"
                      disabled={isFinalized}
                      value={od.adicao ?? ''}
                      onChange={(e) => setOd({ ...od, adicao: e.target.value === '' ? null : parseFloat(e.target.value) })}
                      placeholder="Ex: 2.00"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-blue-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/50 mb-1">DNP (mm)</label>
                    <input 
                      type="number" 
                      step="0.5"
                      disabled={isFinalized}
                      value={od.dnp ?? ''}
                      onChange={(e) => setOd({ ...od, dnp: e.target.value === '' ? null : parseFloat(e.target.value) })}
                      placeholder="Ex: 32.5"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-blue-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/50 mb-1">Altura (mm)</label>
                    <input 
                      type="number" 
                      step="0.5"
                      disabled={isFinalized}
                      value={od.altura ?? ''}
                      onChange={(e) => setOd({ ...od, altura: e.target.value === '' ? null : parseFloat(e.target.value) })}
                      placeholder="Ex: 18.0"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                </div>

                {odValidation.errors.length > 0 && (
                  <p className="text-[11px] text-red-400 font-bold">{odValidation.errors.join(' ')}</p>
                )}
              </div>

              {/* BLOCO OLHO ESQUERDO (OE) */}
              <div className="bg-purple-500/[0.04] border border-purple-500/20 rounded-2xl p-5 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 px-4 py-1 bg-purple-500 text-white font-black text-xs rounded-bl-xl uppercase tracking-widest">
                  OE — Olho Esquerdo
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-purple-300 mb-1">Esférico</label>
                    <input 
                      type="number" 
                      step="0.25"
                      disabled={isFinalized}
                      value={oe.esferico}
                      onChange={(e) => setOe({ ...oe, esferico: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-purple-500/30 rounded-xl px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-purple-300 mb-1">Cilíndrico</label>
                    <input 
                      type="number" 
                      step="0.25"
                      disabled={isFinalized}
                      value={oe.cilindrico}
                      onChange={(e) => setOe({ ...oe, cilindrico: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-purple-500/30 rounded-xl px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-purple-300 mb-1">Eixo (°)</label>
                    <input 
                      type="number" 
                      min="0"
                      max="180"
                      disabled={isFinalized}
                      value={oe.eixo}
                      onChange={(e) => setOe({ ...oe, eixo: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-purple-500/30 rounded-xl px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1 border-t border-purple-500/10">
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 mb-1">Adição (Opcional)</label>
                    <input 
                      type="number" 
                      step="0.25"
                      disabled={isFinalized}
                      value={oe.adicao ?? ''}
                      onChange={(e) => setOe({ ...oe, adicao: e.target.value === '' ? null : parseFloat(e.target.value) })}
                      placeholder="Ex: 2.00"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-purple-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/50 mb-1">DNP (mm)</label>
                    <input 
                      type="number" 
                      step="0.5"
                      disabled={isFinalized}
                      value={oe.dnp ?? ''}
                      onChange={(e) => setOe({ ...oe, dnp: e.target.value === '' ? null : parseFloat(e.target.value) })}
                      placeholder="Ex: 32.5"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-purple-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/50 mb-1">Altura (mm)</label>
                    <input 
                      type="number" 
                      step="0.5"
                      disabled={isFinalized}
                      value={oe.altura ?? ''}
                      onChange={(e) => setOe({ ...oe, altura: e.target.value === '' ? null : parseFloat(e.target.value) })}
                      placeholder="Ex: 18.0"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-purple-400 focus:outline-none"
                    />
                  </div>
                </div>

                {oeValidation.errors.length > 0 && (
                  <p className="text-[11px] text-red-400 font-bold">{oeValidation.errors.join(' ')}</p>
                )}
              </div>

            </div>
          </div>

          {/* SEÇÃO 3: DETALHES CONSULTA & DATES */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <Calendar size={16} /> 3. Detalhes da Consulta, Responsável & Validade
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-white/60 mb-1">Optometrista Responsável *</label>
                <input 
                  type="text" 
                  disabled={isFinalized}
                  value={atendidoPor}
                  onChange={(e) => setAtendidoPor(e.target.value)}
                  placeholder="Nome do Optometrista"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-primary focus:outline-none disabled:opacity-50 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/60 mb-1">Data Real do Exame * (Sem now() fixo)</label>
                <input 
                  type="date" 
                  disabled={isFinalized}
                  value={dataExame}
                  onChange={(e) => handleDataExameChange(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-primary focus:outline-none disabled:opacity-50 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/60 mb-1">Validade da Receita * (Gatilho Pós-Venda)</label>
                <input 
                  type="date" 
                  disabled={isFinalized}
                  value={validadeReceita}
                  onChange={(e) => setValidadeReceita(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-primary focus:outline-none disabled:opacity-50 font-bold text-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-white/60 mb-1">Motivo da Consulta & Queixas Clínicas</label>
              <textarea 
                rows={2}
                disabled={isFinalized}
                value={motivoConsulta}
                onChange={(e) => setMotivoConsulta(e.target.value)}
                placeholder="Descreva o motivo do exame (ex: visão embaçada para perto, dores de cabeça ao ler, renovação anual...)"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-primary focus:outline-none disabled:opacity-50 custom-scrollbar"
              />
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-white/5 bg-white/[0.02] flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Info size={14} className="text-primary" />
            <span>Dados gravados sob a LGPD. Leitura e impressão são auditadas.</span>
          </div>

          <div className="flex items-center gap-3">
            {!isFinalized ? (
              <>
                <button
                  type="button"
                  onClick={handleSaveRascunho}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center gap-2"
                >
                  <Save size={16} /> Salvar Rascunho
                </button>

                <button
                  type="button"
                  onClick={handleFinalizar}
                  disabled={loading}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-green-500/20 flex items-center gap-2"
                >
                  <CheckCircle size={16} /> Finalizar Prontuário & Assinar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
              >
                Fechar Prontuário
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

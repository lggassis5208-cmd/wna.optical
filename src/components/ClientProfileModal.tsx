import { useState, useEffect } from 'react';
import { X, User, Activity, ShoppingBag, Phone, FileText, Plus, Printer, Lock, MessageCircle, Star } from 'lucide-react';
import { storage } from '../lib/storage';
import { formatDate } from '../lib/dateUtils';
import { openWhatsApp } from '../lib/whatsappUtils';
import { crmEventsService, type CrmEvent } from '../lib/services/crmEventsService';
import { fichasMedicasService, type FichaMedica } from '../lib/services/fichasMedicasService';
import FichaMedicaFormModal from './FichaMedicaFormModal';
import FichaMedicaPDF from './FichaMedicaPDF';
import { maskCpf } from '../lib/cryptoUtils';

interface ClientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string | null;
}

export default function ClientProfileModal({ isOpen, onClose, clientId }: ClientProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'dados' | 'clinico' | 'compras' | 'crm'>('dados');
  const [client, setClient] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [fichas, setFichas] = useState<FichaMedica[]>([]);
  const [crmEvents, setCrmEvents] = useState<CrmEvent[]>([]);

  // Submodais de Ficha Médica
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedFichaId, setSelectedFichaId] = useState<string | null>(null);
  const [selectedPdfFicha, setSelectedPdfFicha] = useState<FichaMedica | null>(null);
  const [adendoPaiId, setAdendoPaiId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && clientId) {
      loadClientData(clientId);
    }
  }, [isOpen, clientId]);

  const loadClientData = async (id: string) => {
    const c = await storage.getClientById(id);
    if (c) setClient(c);
    
    const allSales = await storage.getSales();
    const clientSales = allSales.filter((s: any) => s.cliente_id === id || s.paciente_cpf === c?.cpf);
    clientSales.sort((a: any, b: any) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
    setSales(clientSales);

    // Carregar Prontuários Médicos Reais do Paciente
    const clientFichas = await fichasMedicasService.getFichas({ clienteId: id });
    setFichas(clientFichas);

    const events = await crmEventsService.getEventsByClient(id);
    setCrmEvents(events);
  };

  const handleOpenNovaFicha = () => {
    setSelectedFichaId(null);
    setAdendoPaiId(null);
    setFormModalOpen(true);
  };

  const handleOpenEditFicha = (f: FichaMedica) => {
    setSelectedFichaId(f.id);
    setAdendoPaiId(null);
    setFormModalOpen(true);
  };

  const handleOpenAdendo = (f: FichaMedica) => {
    setSelectedFichaId(null);
    setAdendoPaiId(f.id);
    setFormModalOpen(true);
  };

  const handleOpenPdf = (f: FichaMedica) => {
    setSelectedPdfFicha(f);
    setPdfModalOpen(true);
  };

  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-surface border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-start bg-white/[0.02]">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-2xl sm:text-3xl border border-primary/20 shadow-[0_0_20px_rgba(255,191,0,0.1)]">
              {client.name?.charAt(0).toUpperCase() || 'C'}
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">{client.name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-bold text-white/60 font-mono">
                  {maskCpf(client.cpf)}
                </span>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-black uppercase tracking-widest border border-primary/20">
                  Score: {client.lis_score || 850}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 sm:px-8 border-b border-white/5 overflow-x-auto custom-scrollbar shrink-0">
          <TabButton 
            active={activeTab === 'dados'} 
            onClick={() => setActiveTab('dados')} 
            icon={<User size={18} />} 
            label="Dados Pessoais" 
          />
          <TabButton 
            active={activeTab === 'clinico'} 
            onClick={() => setActiveTab('clinico')} 
            icon={<Activity size={18} />} 
            label={`Prontuário Médico (${fichas.length})`} 
          />
          <TabButton 
            active={activeTab === 'compras'} 
            onClick={() => setActiveTab('compras')} 
            icon={<ShoppingBag size={18} />} 
            label={`Compras (${sales.length})`} 
          />
          <TabButton 
            active={activeTab === 'crm'} 
            onClick={() => setActiveTab('crm')} 
            icon={<MessageCircle size={18} />} 
            label="CRM & Relacionamento" 
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          
          {/* ABA 1: DADOS PESSOAIS */}
          {activeTab === 'dados' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DataCard label="Nome Completo" value={client.name} />
                <DataCard label="CPF (Dado Protegido)" value={maskCpf(client.cpf)} fontMono />
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2">WhatsApp</p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-sm">{client.whatsapp || 'Não informado'}</p>
                    {client.whatsapp && (
                      <button 
                        onClick={() => openWhatsApp(client.whatsapp, `Olá, ${client.name}! Tudo bem? Aqui é da Ótica Lìs.`)}
                        className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors"
                      >
                        <Phone size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <DataCard label="Data de Nascimento" value={client.data_nascimento ? formatDate(client.data_nascimento) : 'Não informado'} />
                
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2">Consentimento & Marketing</p>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm">Origem: <span className="font-bold text-primary">{client.canal_origem || 'Loja Física'}</span></p>
                    <p className="text-sm">Marketing: {client.consentimento_marketing ? <span className="text-green-500 font-bold">Autorizado</span> : <span className="text-red-500 font-bold">Negado</span>}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: HISTÓRICO CLÍNICO & PRONTUÁRIOS MÉDICOS */}
          {activeTab === 'clinico' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              
              <div className="flex justify-between items-center bg-white/[0.02] p-4 rounded-2xl border border-white/10">
                <div>
                  <h3 className="font-bold text-white text-sm">Histórico de Refração & Prontuários Médicos</h3>
                  <p className="text-xs text-white/50">Append-only, imutável e auditado conforme exigências LGPD/CFM</p>
                </div>
                <button
                  onClick={handleOpenNovaFicha}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-black font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-primary/10"
                >
                  <Plus size={16} /> Nova Ficha Médica
                </button>
              </div>

              {fichas.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-3xl space-y-3">
                  <Activity size={48} className="mx-auto text-white/20" />
                  <p className="text-white/40 text-sm">Nenhum prontuário médico registrado para este paciente.</p>
                  <button
                    onClick={handleOpenNovaFicha}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Registrar Primeira Ficha Médica
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {fichas.map((f) => {
                    const rod = f.refracoes?.find(r => r.olho === 'OD');
                    const roe = f.refracoes?.find(r => r.olho === 'OE');

                    return (
                      <div key={f.id} className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-4">
                        
                        <div className="flex flex-wrap justify-between items-center gap-2 border-b border-white/5 pb-3">
                          <div className="flex items-center gap-3">
                            <FileText className="text-primary" size={20} />
                            <div>
                              <span className="font-bold text-sm text-white">Exame Realizado em {formatDate(f.data_exame)}</span>
                              <p className="text-[11px] text-white/50">Optometrista: {f.atendido_por}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              f.status === 'finalizada'
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            }`}>
                              {f.status === 'finalizada' ? 'Finalizada & Imutável' : 'Rascunho'}
                            </span>

                            {f.tipo === 'retificacao' && (
                              <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-[10px] font-bold">
                                Adendo
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Tabela Resumo OD / OE */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl">
                            <strong className="text-blue-400 block text-xs font-black mb-1">OD (Olho Direito)</strong>
                            <p className="font-mono text-white/90">
                              Esf: {rod?.esferico ?? 0} | Cil: {rod?.cilindrico ?? 0} | Eixo: {rod?.eixo ?? 0}°
                            </p>
                            {rod?.adicao ? <p className="text-[11px] text-blue-300/80 font-mono mt-0.5">Adição: +{rod.adicao}</p> : null}
                          </div>

                          <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl">
                            <strong className="text-purple-400 block text-xs font-black mb-1">OE (Olho Esquerdo)</strong>
                            <p className="font-mono text-white/90">
                              Esf: {roe?.esferico ?? 0} | Cil: {roe?.cilindrico ?? 0} | Eixo: {roe?.eixo ?? 0}°
                            </p>
                            {roe?.adicao ? <p className="text-[11px] text-purple-300/80 font-mono mt-0.5">Adição: +{roe.adicao}</p> : null}
                          </div>
                        </div>

                        {/* Footer Ações */}
                        <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-white/5 text-xs text-white/50">
                          <span>Validade Receita: <strong className="text-primary">{formatDate(f.validade_receita)}</strong></span>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEditFicha(f)}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all text-xs font-bold border border-white/10 flex items-center gap-1"
                            >
                              {f.status === 'finalizada' ? <Lock size={12} /> : <FileText size={12} />}
                              {f.status === 'finalizada' ? 'Ver Ficha' : 'Editar'}
                            </button>

                            {f.status === 'finalizada' && (
                              <>
                                <button
                                  onClick={() => handleOpenPdf(f)}
                                  className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-all text-xs font-bold border border-green-500/30 flex items-center gap-1"
                                >
                                  <Printer size={12} /> Imprimir / Receita
                                </button>

                                <button
                                  onClick={() => handleOpenAdendo(f)}
                                  className="px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-all text-xs font-bold border border-yellow-500/30 flex items-center gap-1"
                                >
                                  <Plus size={12} /> Retificar por Adendo
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ABA 3: HISTÓRICO DE COMPRAS */}
          {activeTab === 'compras' && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              {sales.length === 0 ? (
                 <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-3xl">
                  <ShoppingBag size={48} className="mx-auto text-white/20 mb-4" />
                  <p className="text-white/40">Nenhuma compra registrada para este cliente.</p>
                </div>
              ) : (
                sales.map(s => (
                  <div key={s.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all group">
                    <div className="mb-4 sm:mb-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          #{s.os_number || s.id?.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-xs text-white/40 font-medium">{formatDate(s.criado_em)}</span>
                      </div>
                      <p className="font-bold text-sm">
                        {s.tipo_lente || 'Óculos Completo'} {s.tratamento ? `+ ${s.tratamento}` : ''}
                      </p>
                      <p className="text-xs text-white/50 mt-1">
                        Pagamento: {s.forma_pagamento || 'Não especificado'}
                      </p>
                    </div>
                    <div className="text-left sm:text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between items-center sm:items-end">
                      <p className="text-lg font-black text-white group-hover:text-primary transition-colors">
                        R$ {Number(s.valor_total || 0).toFixed(2)}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest mt-2 border inline-block
                        ${s.status === 'PRONTA' || s.status === 'ENTREGUE' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}
                      `}>
                        {s.status || 'ABERTA'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ABA 4: CRM & RELACIONAMENTO */}
          {activeTab === 'crm' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex justify-between items-center bg-primary/5 p-4 rounded-2xl border border-primary/20">
                <div className="flex items-center gap-3">
                  <Star className="text-primary" size={24} />
                  <div>
                    <p className="font-bold text-white">Linha do Tempo CRM</p>
                    <p className="text-xs text-white/50">Histórico de comunicações e relacionamento</p>
                  </div>
                </div>
              </div>

              {crmEvents.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-3xl">
                  <MessageCircle size={48} className="mx-auto text-white/20 mb-4" />
                  <p className="text-white/40">Nenhum evento de CRM registrado.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {crmEvents.map(e => (
                    <div key={e.id || Math.random().toString()} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm text-white uppercase tracking-wider font-mono">{(e as any).titulo || e.tipo_evento}</span>
                        <span className="text-xs text-white/40 font-mono">{formatDate((e as any).em || e.criado_em)}</span>
                      </div>
                      {((e as any).conteudo || e.payload) && (
                        <p className="text-xs text-white/70 italic">"{(e as any).conteudo || JSON.stringify(e.payload)}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Submodais de Ficha Médica */}
      <FichaMedicaFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        clienteId={clientId}
        clientData={client}
        fichaToEditId={selectedFichaId}
        fichaPaiIdForAdendo={adendoPaiId}
        onSaved={() => clientId && loadClientData(clientId)}
        onOpenPdf={(ficha) => {
          setSelectedPdfFicha(ficha);
          setPdfModalOpen(true);
        }}
      />

      <FichaMedicaPDF
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        ficha={selectedPdfFicha}
      />

    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-4 font-bold text-xs transition-all border-b-2 whitespace-nowrap ${
        active 
          ? 'border-primary text-primary bg-primary/5' 
          : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function DataCard({ label, value, fontMono }: { label: string; value?: string; fontMono?: boolean }) {
  return (
    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
      <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-sm text-white ${fontMono ? 'font-mono' : 'font-semibold'}`}>
        {value || 'Não informado'}
      </p>
    </div>
  );
}

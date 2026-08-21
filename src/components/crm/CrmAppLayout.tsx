import React, { useState, useEffect } from 'react';
import { 
  Kanban, 
  Users, 
  Building2, 
  CheckSquare, 
  RefreshCw, 
  Plus, 
  Search, 
  Filter, 
  Sparkles,
  Layers
} from 'lucide-react';
import { 
  crmModuleService, 
  type CrmFunil, 
  type CrmLead, 
  type LeadOrigem 
} from '../../lib/services/crmModuleService';
import CrmKanbanBoard from './CrmKanbanBoard';
import CrmContatosList from './CrmContatosList';
import CrmEmpresasList from './CrmEmpresasList';
import CrmTarefasList from './CrmTarefasList';
import CrmFollowupList from './CrmFollowupList';
import NovoLeadModal from './NovoLeadModal';
import CrmContactSheet from './CrmContactSheet';

export default function CrmAppLayout() {
  const [activeTab, setActiveTab] = useState<'kanban' | 'contatos' | 'empresas' | 'tarefas' | 'followup'>('kanban');
  const [funis, setFunis] = useState<CrmFunil[]>([]);
  const [funilSelecionadoId, setFunilSelecionadoId] = useState<string>('');
  const [origemFiltro, setOrigemFiltro] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [novoLeadOpen, setNovoLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    carregarFunis();
  }, []);

  const carregarFunis = async () => {
    const fList = await crmModuleService.getFunisComEtapas();
    setFunis(fList);
    if (fList.length > 0 && !funilSelecionadoId) {
      setFunilSelecionadoId(fList[0].id);
    }
  };

  useEffect(() => {
    if (funilSelecionadoId && activeTab === 'kanban') {
      carregarLeads();
    }
  }, [funilSelecionadoId, origemFiltro, searchTerm, activeTab]);

  const carregarLeads = async () => {
    setLoading(true);
    const lList = await crmModuleService.getLeadsByFunil(funilSelecionadoId, origemFiltro, searchTerm);
    setLeads(lList);
    setLoading(false);
  };

  // FIX BUG 1: Callback após criação de novo lead com atualização instantânea do estado do Kanban sem F5
  const handleLeadCriado = (newLead?: CrmLead) => {
    if (newLead) {
      if (newLead.funil_id && newLead.funil_id !== funilSelecionadoId) {
        setFunilSelecionadoId(newLead.funil_id);
      } else {
        setLeads(prev => [newLead, ...prev.filter(l => l.id !== newLead.id)]);
        carregarLeads();
      }
    } else {
      carregarLeads();
    }
  };

  const funilAtual = funis.find(f => f.id === funilSelecionadoId) || funis[0];

  const handleOpenLeadDetails = (lead: CrmLead) => {
    setSelectedLead(lead);
    setSheetOpen(true);
  };

  return (
    <div className="flex-1 overflow-hidden bg-background flex flex-col h-full relative">
      
      {/* CRM Topbar / Header (Kommo UX Inspired) */}
      <header className="flex-none p-6 pb-4 border-b border-white/5 bg-surface/40 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Título & Badge de Módulo CRM */}
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-primary/20 to-primary/5 text-primary rounded-2xl border border-primary/20 shadow-lg shadow-primary/5">
              <Sparkles size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-tight">CRM de Vendas</h1>
                <span className="text-[10px] font-black bg-primary/20 text-primary px-3 py-1 rounded-full uppercase tracking-widest border border-primary/20">
                  Fase 1 Operacional
                </span>
              </div>
              <p className="text-xs text-white/40 mt-0.5">Gestão de relacionamento e pipeline lendo a base do ERP.</p>
            </div>
          </div>

          {/* Controles do CRM (Funil, Origem, Busca, Botão Novo Lead) */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Seletor de Funil */}
            {activeTab === 'kanban' && funis.length > 0 && (
              <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl px-3 py-1.5 gap-2">
                <Layers size={16} className="text-primary" />
                <select 
                  value={funilSelecionadoId}
                  onChange={e => setFunilSelecionadoId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  {funis.map(f => (
                    <option key={f.id} value={f.id} className="bg-surface text-white">
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtro Transversal por Origem */}
            {activeTab === 'kanban' && (
              <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl px-3 py-1.5 gap-2">
                <Filter size={16} className="text-white/40" />
                <select 
                  value={origemFiltro}
                  onChange={e => setOrigemFiltro(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="todos" className="bg-surface text-white">Todas as Origens</option>
                  <option value="whatsapp" className="bg-surface text-white">WhatsApp</option>
                  <option value="indicacao" className="bg-surface text-white">Indicação</option>
                  <option value="convenio" className="bg-surface text-white">Convênio B2B</option>
                  <option value="instagram" className="bg-surface text-white">Instagram</option>
                  <option value="walk_in" className="bg-surface text-white">Presencial (Loja)</option>
                  <option value="outro" className="bg-surface text-white">Outro</option>
                </select>
              </div>
            )}

            {/* Busca */}
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
              <input 
                type="text"
                placeholder="Buscar lead ou cliente..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-1.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Botão Novo Lead */}
            <button 
              onClick={() => setNovoLeadOpen(true)}
              className="bg-primary hover:bg-primary/90 text-black font-extrabold text-xs px-4 py-2 rounded-2xl shadow-lg shadow-primary/20 flex items-center gap-1.5 transition-all"
            >
              <Plus size={16} /> Novo Lead
            </button>
          </div>
        </div>

        {/* Abas de Navegação Principal do CRM */}
        <div className="flex gap-2 mt-5 border-t border-white/5 pt-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'kanban' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Kanban size={16} /> Funis Kanban
          </button>

          <button
            onClick={() => setActiveTab('contatos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'contatos' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={16} /> Contatos (ERP)
          </button>

          <button
            onClick={() => setActiveTab('empresas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'empresas' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building2 size={16} /> Empresas B2B (ERP)
          </button>

          <button
            onClick={() => setActiveTab('tarefas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'tarefas' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <CheckSquare size={16} /> Minhas Tarefas
          </button>

          <button
            onClick={() => setActiveTab('followup')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'followup' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <RefreshCw size={16} /> Fila de Follow-up
          </button>
        </div>
      </header>

      {/* ÁREA PRINCIPAL DAS ABAS DO CRM */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'kanban' && funilAtual && (
          <CrmKanbanBoard 
            funil={funilAtual}
            leads={leads}
            onLeadClick={handleOpenLeadDetails}
            onRefresh={carregarLeads}
          />
        )}

        {activeTab === 'contatos' && <CrmContatosList />}
        {activeTab === 'empresas' && <CrmEmpresasList />}
        {activeTab === 'tarefas' && <CrmTarefasList />}
        {activeTab === 'followup' && <CrmFollowupList />}
      </div>

      {/* Modais */}
      {novoLeadOpen && (
        <NovoLeadModal 
          isOpen={novoLeadOpen}
          onClose={() => setNovoLeadOpen(false)}
          funis={funis}
          funilIdAtual={funilSelecionadoId}
          onLeadCriado={handleLeadCriado}
        />
      )}

      {sheetOpen && selectedLead && (
        <CrmContactSheet 
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          lead={selectedLead}
          onUpdate={carregarLeads}
        />
      )}

    </div>
  );
}

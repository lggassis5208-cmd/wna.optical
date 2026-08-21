import React, { useState, useEffect } from 'react';
import { Search, User, MessageCircle, ExternalLink, ShieldCheck, Mail, MapPin } from 'lucide-react';
import { crmModuleService, type ERPCliente } from '../../lib/services/crmModuleService';
import { openWhatsApp, buildConfirmacaoCadastroMsg } from '../../lib/whatsappUtils';
import CrmContactSheet from './CrmContactSheet';

export default function CrmContatosList() {
  const [contatos, setContatos] = useState<ERPCliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCliente, setSelectedCliente] = useState<ERPCliente | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    carregarContatos();
  }, [searchTerm]);

  const carregarContatos = async () => {
    setLoading(true);
    const data = await crmModuleService.getContatosERP(searchTerm);
    setContatos(data);
    setLoading(false);
  };

  const handleOpenContact = (cliente: ERPCliente) => {
    setSelectedCliente(cliente);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header & Busca */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
        <div>
          <h3 className="text-lg font-black text-white">Base Única de Contatos (ERP)</h3>
          <p className="text-xs text-white/40">Clientes cadastrados na Ótica Lis integrados ao CRM.</p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
          <input 
            type="text"
            placeholder="Buscar por nome, telefone, CPF ou e-mail..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Lista de Contatos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contatos.map(c => (
          <div 
            key={c.id}
            onClick={() => handleOpenContact(c)}
            className="bg-surface/50 border border-white/10 hover:border-primary/40 p-5 rounded-2xl transition-all cursor-pointer group space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                {(c.nome || 'C')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-white truncate group-hover:text-primary transition-colors">
                  {c.nome}
                </h4>
                <p className="text-xs text-white/40 truncate">{c.cpf ? `CPF: ${c.cpf}` : 'Sem CPF'}</p>
              </div>
            </div>

            <div className="space-y-1 text-xs text-white/60">
              {c.whatsapp && (
                <div className="flex items-center gap-2">
                  <MessageCircle size={14} className="text-green-400 shrink-0" />
                  <span className="truncate">{c.whatsapp}</span>
                </div>
              )}
              {c.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-blue-400 shrink-0" />
                  <span className="truncate">{c.email}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[11px]">
              <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                Score: {c.lis_score || 850}
              </span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  c.whatsapp && openWhatsApp(c.whatsapp, buildConfirmacaoCadastroMsg(c.nome));
                }}
                className="bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1"
              >
                <MessageCircle size={12} /> Zap
              </button>
            </div>
          </div>
        ))}
      </div>

      {sheetOpen && selectedCliente && (
        <CrmContactSheet 
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          clienteERP={selectedCliente}
          onUpdate={carregarContatos}
        />
      )}
    </div>
  );
}

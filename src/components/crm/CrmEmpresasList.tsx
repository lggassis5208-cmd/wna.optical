import React, { useState, useEffect } from 'react';
import { Search, Building2, MessageCircle, Mail, MapPin } from 'lucide-react';
import { crmModuleService, type ERPCliente } from '../../lib/services/crmModuleService';
import { openWhatsApp, buildConfirmacaoCadastroMsg } from '../../lib/whatsappUtils';
import CrmContactSheet from './CrmContactSheet';

export default function CrmEmpresasList() {
  const [empresas, setEmpresas] = useState<ERPCliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEmpresa, setSelectedEmpresa] = useState<ERPCliente | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    carregarEmpresas();
  }, [searchTerm]);

  const carregarEmpresas = async () => {
    setLoading(true);
    const data = await crmModuleService.getEmpresasERP(searchTerm);
    setEmpresas(data);
    setLoading(false);
  };

  const handleOpenEmpresa = (empresa: ERPCliente) => {
    setSelectedEmpresa(empresa);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header & Busca */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
        <div>
          <h3 className="text-lg font-black text-white">Empresas & Convênios B2B (ERP)</h3>
          <p className="text-xs text-white/40">Pessoas Jurídicas e parceiros cadastrados na base do ERP.</p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
          <input 
            type="text"
            placeholder="Buscar por Razão Social, Nome Fantasia ou CNPJ..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Lista de Empresas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {empresas.length === 0 ? (
          <div className="col-span-full p-8 text-center text-white/20 italic text-sm border border-dashed border-white/5 rounded-2xl">
            Nenhuma empresa B2B encontrada na base do ERP.
          </div>
        ) : (
          empresas.map(emp => (
            <div 
              key={emp.id}
              onClick={() => handleOpenEmpresa(emp)}
              className="bg-surface/50 border border-white/10 hover:border-blue-500/40 p-5 rounded-2xl transition-all cursor-pointer group space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-lg">
                  <Building2 size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-white truncate group-hover:text-blue-400 transition-colors">
                    {emp.nome}
                  </h4>
                  <p className="text-xs text-white/40 truncate">{emp.cnpj ? `CNPJ: ${emp.cnpj}` : 'Sem CNPJ'}</p>
                </div>
              </div>

              <div className="space-y-1 text-xs text-white/60">
                {emp.whatsapp && (
                  <div className="flex items-center gap-2">
                    <MessageCircle size={14} className="text-green-400 shrink-0" />
                    <span className="truncate">{emp.whatsapp}</span>
                  </div>
                )}
                {emp.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-blue-400 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[11px]">
                <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-bold">
                  Convênio B2B
                </span>
                {emp.whatsapp && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      openWhatsApp(emp.whatsapp, buildConfirmacaoCadastroMsg(emp.nome));
                    }}
                    className="bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1"
                  >
                    <MessageCircle size={12} /> Zap
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {sheetOpen && selectedEmpresa && (
        <CrmContactSheet 
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          clienteERP={selectedEmpresa}
          onUpdate={carregarEmpresas}
        />
      )}
    </div>
  );
}

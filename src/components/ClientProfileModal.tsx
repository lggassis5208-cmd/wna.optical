import { useState, useEffect } from 'react';
import { X, User, Activity, ShoppingBag, Phone, FileText, ChevronRight } from 'lucide-react';
import { storage } from '../lib/storage';
import { formatDate } from '../lib/dateUtils';
import { openWhatsApp } from '../lib/whatsappUtils';

interface ClientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string | null;
}

export default function ClientProfileModal({ isOpen, onClose, clientId }: ClientProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'dados' | 'clinico' | 'compras'>('dados');
  const [client, setClient] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);

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
    // Ordenar por data decrescente
    clientSales.sort((a: any, b: any) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
    setSales(clientSales);
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
                  {client.cpf || 'Sem CPF'}
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
            label="Histórico Clínico" 
          />
          <TabButton 
            active={activeTab === 'compras'} 
            onClick={() => setActiveTab('compras')} 
            icon={<ShoppingBag size={18} />} 
            label="Histórico de Compras" 
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          
          {/* ABA 1: DADOS PESSOAIS */}
          {activeTab === 'dados' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DataCard label="Nome Completo" value={client.name} />
                <DataCard label="CPF" value={client.cpf} fontMono />
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
              </div>
            </div>
          )}

          {/* ABA 2: HISTÓRICO CLÍNICO */}
          {activeTab === 'clinico' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              {sales.filter(s => s.od_esferico || s.oe_esferico).length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-3xl">
                  <Activity size={48} className="mx-auto text-white/20 mb-4" />
                  <p className="text-white/40">Nenhuma ficha clínica com dados de receita encontrada.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {sales.filter(s => s.od_esferico || s.oe_esferico).map(s => (
                    <div key={s.id} className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                      <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                          <FileText className="text-primary" size={20} />
                          <span className="font-bold">Ficha Clínica / O.S. #{s.os_number}</span>
                        </div>
                        <span className="text-sm text-white/40 font-medium">{formatDate(s.criado_em)}</span>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-center text-sm border-collapse">
                          <thead>
                            <tr className="bg-black/20 text-[10px] text-white/40 uppercase tracking-widest font-black">
                              <th className="p-2">Olho</th>
                              <th className="p-2">Esférico</th>
                              <th className="p-2">Cilíndrico</th>
                              <th className="p-2">Eixo</th>
                              <th className="p-2">DNP</th>
                              <th className="p-2">Altura</th>
                              <th className="p-2">Adição</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            <tr className="hover:bg-white/5 transition-colors">
                              <td className="p-3 font-bold text-white/70">OD (Direito)</td>
                              <td className="p-3 font-mono">{s.od_esferico || '---'}</td>
                              <td className="p-3 font-mono">{s.od_cilindrico || '---'}</td>
                              <td className="p-3 font-mono">{s.od_eixo || '---'}</td>
                              <td className="p-3 font-mono">{s.dnp_od || '---'}</td>
                              <td className="p-3 font-mono">{s.altura_od || '---'}</td>
                              <td className="p-3 font-mono" rowSpan={2}>{s.adicao || '---'}</td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors">
                              <td className="p-3 font-bold text-white/70">OE (Esquerdo)</td>
                              <td className="p-3 font-mono">{s.oe_esferico || '---'}</td>
                              <td className="p-3 font-mono">{s.oe_cilindrico || '---'}</td>
                              <td className="p-3 font-mono">{s.oe_eixo || '---'}</td>
                              <td className="p-3 font-mono">{s.dnp_oe || '---'}</td>
                              <td className="p-3 font-mono">{s.altura_oe || '---'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
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

        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-4 font-bold text-sm transition-all border-b-2 ${
        active 
          ? 'border-primary text-primary bg-primary/5' 
          : 'border-transparent text-white/40 hover:text-white/80 hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function DataCard({ label, value, fontMono = false }: any) {
  return (
    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
      <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-sm ${fontMono ? 'font-mono' : 'font-medium'} text-white`}>{value || '---'}</p>
    </div>
  );
}

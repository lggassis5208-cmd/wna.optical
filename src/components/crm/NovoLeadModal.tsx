import React, { useState, useEffect } from 'react';
import { X, UserPlus, DollarSign, Tag, Users } from 'lucide-react';
import { crmModuleService, type CrmFunil, type CrmEtapa, type LeadOrigem, type ERPCliente, type CrmLead } from '../../lib/services/crmModuleService';
import { toast } from 'sonner';

interface NovoLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  funis: CrmFunil[];
  funilIdAtual: string;
  onLeadCriado: (newLead?: CrmLead) => void;
}

const ORIGENS: { id: LeadOrigem; label: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'indicacao', label: 'Indicação' },
  { id: 'convenio', label: 'Convênio B2B' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'walk_in', label: 'Presencial (Loja)' },
  { id: 'outro', label: 'Outro' }
];

export default function NovoLeadModal({ isOpen, onClose, funis, funilIdAtual, onLeadCriado }: NovoLeadModalProps) {
  const [funilId, setFunilId] = useState(funilIdAtual);
  const [etapaId, setEtapaId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [origem, setOrigem] = useState<LeadOrigem>('whatsapp');
  const [origemDetalhe, setOrigemDetalhe] = useState('');
  const [valorEstimado, setValorEstimado] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [responsavelNome, setResponsavelNome] = useState('Atendente');
  
  // Campos de Ótica
  const [tipoLenteInteresse, setTipoLenteInteresse] = useState('');
  const [jaUsaOculos, setJaUsaOculos] = useState(false);
  const [convenio, setConvenio] = useState('');
  const [grauAproximado, setGrauAproximado] = useState('');
  const [interesse, setInteresse] = useState('grau');
  const [formaPagamento, setFormaPagamento] = useState('');

  const [clientesERP, setClientesERP] = useState<ERPCliente[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFunilId(funilIdAtual || (funis.length > 0 ? funis[0].id : ''));
      carregarClientes();
    }
  }, [isOpen, funilIdAtual, funis]);

  const carregarClientes = async () => {
    const data = await crmModuleService.getContatosERP();
    setClientesERP(data);
  };

  const funilSelecionado = funis.find(f => f.id === funilId) || funis[0];
  const etapasDisponiveis = funilSelecionado?.etapas || [];

  // FIX BUG 1: Garantir que a primeira etapa válida do funil seja selecionada por padrão
  useEffect(() => {
    if (etapasDisponiveis.length > 0) {
      setEtapaId(etapasDisponiveis[0].id);
    }
  }, [funilId, funis, etapasDisponiveis]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return toast.error('Digite o título ou identificação do lead');

    setSaving(true);
    try {
      // Garantir etapa inicial do funil
      const etapaInicialId = etapaId || (etapasDisponiveis.length > 0 ? etapasDisponiveis[0].id : undefined);

      const novoLead = await crmModuleService.criarLead({
        funil_id: funilId || funilSelecionado.id,
        etapa_id: etapaInicialId,
        titulo: titulo.trim(),
        cliente_id: clienteId || undefined,
        origem,
        origem_detalhe: origemDetalhe.trim() || undefined,
        valor_estimado: parseFloat(valorEstimado) || 0,
        responsavel_nome: responsavelNome || 'Atendente',
        tipo_lente_interesse: tipoLenteInteresse || undefined,
        ja_usa_oculos: jaUsaOculos,
        convenio: convenio || undefined,
        grau_aproximado: grauAproximado || undefined,
        interesse: interesse || undefined,
        forma_pagamento: formaPagamento || undefined
      });

      toast.success('Lead criado com sucesso no pipeline!');
      onLeadCriado(novoLead);
      onClose();
      // Reset form
      setTitulo('');
      setOrigemDetalhe('');
      setValorEstimado('');
      setClienteId('');
      setTipoLenteInteresse('');
      setJaUsaOculos(false);
      setConvenio('');
      setGrauAproximado('');
    } catch (err: any) {
      toast.error('Erro ao criar lead: ' + (err.message || 'Tente novamente'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-surface border border-white/10 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 my-8">
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <UserPlus size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Novo Lead de Venda</h3>
              <p className="text-xs text-white/40">Insira a oportunidade no funil comercial</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-white/60 mb-1 block">Título / Oportunidade *</label>
            <input 
              type="text" 
              placeholder="Ex: Óculos Varilux + Armação Ray-Ban" 
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-white/60 mb-1 block">Funil</label>
              <select 
                value={funilId}
                onChange={e => setFunilId(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary text-white"
              >
                {funis.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-white/60 mb-1 block">Etapa Inicial</label>
              <select 
                value={etapaId}
                onChange={e => setEtapaId(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary text-white"
              >
                {etapasDisponiveis.map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-white/60 mb-1 block flex items-center gap-2">
              <Users size={14} /> Cliente do ERP (opcional)
            </label>
            <select 
              value={clienteId}
              onChange={e => setClienteId(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary text-white"
            >
              <option value="">-- Selecione ou deixe em branco --</option>
              {clientesERP.map(c => (
                <option key={c.id} value={c.id}>{c.nome} {c.whatsapp ? `(${c.whatsapp})` : ''}</option>
              ))}
            </select>
            <p className="text-[11px] text-white/30 mt-1 italic">Usa a mesma base de clientes do ERP (nunca duplica).</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-white/60 mb-1 block flex items-center gap-1">
                <Tag size={14} /> Origem do Lead
              </label>
              <select 
                value={origem}
                onChange={e => setOrigem(e.target.value as LeadOrigem)}
                className="w-full bg-surface border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary text-white"
              >
                {ORIGENS.map(o => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-white/60 mb-1 block flex items-center gap-1">
                <DollarSign size={14} /> Valor Estimado (R$)
              </label>
              <input 
                type="number"
                step="0.01"
                placeholder="1200.00"
                value={valorEstimado}
                onChange={e => setValorEstimado(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary text-white"
              />
            </div>
          </div>

          {/* Seção de Campos Customizados de Ótica */}
          <div className="border-t border-white/10 pt-3 space-y-3">
            <h4 className="text-xs font-black text-primary uppercase tracking-wider">Perfil de Ótica do Lead</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-white/60 mb-1 block">Interesse</label>
                <select 
                  value={interesse}
                  onChange={e => setInteresse(e.target.value)}
                  className="w-full bg-surface border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
                >
                  <option value="grau">Óculos de Grau</option>
                  <option value="solar">Óculos Solar</option>
                  <option value="multifocal">Lente Multifocal</option>
                  <option value="lente_contato">Lente de Contato</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-white/60 mb-1 block">Tipo de Lente</label>
                <input 
                  type="text"
                  placeholder="Ex: Varilux, Crizal, Bifocal"
                  value={tipoLenteInteresse}
                  onChange={e => setTipoLenteInteresse(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-white/60 mb-1 block">Convênio / Parceria</label>
                <input 
                  type="text"
                  placeholder="Ex: Bradesco, Unimed, OAB"
                  value={convenio}
                  onChange={e => setConvenio(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white/60 mb-1 block">Grau Aproximado</label>
                <input 
                  type="text"
                  placeholder="Ex: -2.50 OD / -2.00 OE"
                  value={grauAproximado}
                  onChange={e => setGrauAproximado(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="text-xs font-bold text-white/60 mb-1 block">Vendedor Responsável</label>
                <input 
                  type="text"
                  value={responsavelNome}
                  onChange={e => setResponsavelNome(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input 
                  type="checkbox"
                  id="jaUsaOculos"
                  checked={jaUsaOculos}
                  onChange={e => setJaUsaOculos(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
                <label htmlFor="jaUsaOculos" className="text-xs font-bold text-white/80 cursor-pointer">
                  Já usa óculos atualmente
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-white/60 mb-1 block">Detalhes da Origem</label>
            <input 
              type="text" 
              placeholder="Ex: Indicado por Dr. Roberto / Empresa X"
              value={origemDetalhe}
              onChange={e => setOrigemDetalhe(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary text-white"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-white/5">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-black font-bold text-sm transition-all flex items-center gap-2"
            >
              {saving ? 'Salvando...' : 'Criar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

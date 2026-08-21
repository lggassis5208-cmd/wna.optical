import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageCircle, 
  CheckCircle2, 
  FileText, 
  Clock, 
  Calendar, 
  Plus, 
  ShieldAlert, 
  User, 
  ExternalLink,
  DollarSign,
  AlertTriangle,
  Send,
  FileCode,
  Link,
  Paperclip
} from 'lucide-react';
import { 
  crmModuleService, 
  type CrmLead, 
  type CrmLeadEvento, 
  type CrmTarefa, 
  type ERPCliente,
  type ERPDocumentoVinculado,
  type TarefaTipo
} from '../../lib/services/crmModuleService';
import { 
  openWhatsApp, 
  buildConfirmacaoCadastroMsg, 
  isPhoneSuppressed 
} from '../../lib/whatsappUtils';
import { toast } from 'sonner';
import ClientProfileModal from '../ClientProfileModal';

interface CrmContactSheetProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: CrmLead | null;
  clienteERP?: ERPCliente | null;
  onUpdate?: () => void;
}

export default function CrmContactSheet({ isOpen, onClose, lead, clienteERP, onUpdate }: CrmContactSheetProps) {
  const [activeTab, setActiveTab] = useState<'documentos' | 'timeline' | 'tarefas' | 'nota' | 'templates' | 'otica'>('documentos');

  // Campos de Ótica no Lead
  const [tipoLente, setTipoLente] = useState(lead?.tipo_lente_interesse || '');
  const [usaOculos, setUsaOculos] = useState(lead?.ja_usa_oculos || false);
  const [convenioOpt, setConvenioOpt] = useState(lead?.convenio || '');
  const [grauAprox, setGrauAprox] = useState(lead?.grau_aproximado || '');
  const [interesseOpt, setInteresseOpt] = useState(lead?.interesse || 'grau');
  const [vendedorResp, setVendedorResp] = useState(lead?.responsavel_nome || 'Atendente');

  // Modal Vincular Documento
  const [vincularModalOpen, setVincularModalOpen] = useState(false);
  const [docRef, setDocRef] = useState('');
  const [docTipo, setDocTipo] = useState<'venda' | 'orcamento' | 'nfe'>('orcamento');
  const [docValor, setDocValor] = useState('');

  // Templates
  const templatesList = crmModuleService.getTemplatesMensagem('Ótica Lis');
  const [timelineEvents, setTimelineEvents] = useState<CrmLeadEvento[]>([]);
  const [documentosVinculados, setDocumentosVinculados] = useState<ERPDocumentoVinculado[]>([]);
  const [isSuppressed, setIsSuppressed] = useState(false);
  const [erpModalOpen, setErpModalOpen] = useState(false);

  // Form de Tarefa Manual
  const [novaTarefaTitulo, setNovaTarefaTitulo] = useState('');
  const [novaTarefaTipo, setNovaTarefaTipo] = useState<TarefaTipo>('retornar_orcamento');
  const [novaTarefaData, setNovaTarefaData] = useState('');
  const [novaTarefaResponsavel, setNovaTarefaResponsavel] = useState('Atendente');

  // Form de Nota
  const [notaTexto, setNotaTexto] = useState('');

  const cliente = lead?.cliente || clienteERP;
  const clienteId = cliente?.id;
  const leadId = lead?.id;

  useEffect(() => {
    if (isOpen && (clienteId || leadId)) {
      carregarDados();
      checarSupressao();
    }
  }, [isOpen, clienteId, leadId]);

  const carregarDados = async () => {
    const [events, docs] = await Promise.all([
      crmModuleService.getTimeline(clienteId, leadId),
      crmModuleService.getDocumentosVinculados(clienteId, leadId)
    ]);
    setTimelineEvents(events);
    setDocumentosVinculados(docs);
  };

  const checarSupressao = async () => {
    if (cliente?.whatsapp) {
      const suppressed = await isPhoneSuppressed(cliente.whatsapp);
      setIsSuppressed(suppressed);
    }
  };

  if (!isOpen) return null;

  // INTEGRAÇÃO 3: Envio de Documentos no WhatsApp com Regra Diferenciada
  // - Orçamentos / Cotações => Formato PDF comercial direto
  // - Nota Fiscal (NF-e) => Formato Link Assinado Expirável (48h)
  const handleEnviarDocumentoDiferenciado = async (doc: ERPDocumentoVinculado) => {
    if (!cliente?.whatsapp) return toast.error('Contato não possui WhatsApp cadastrado');
    if (isSuppressed) {
      return toast.error('Contato em lista de supressão (Opt-out). Envio bloqueado.');
    }

    try {
      const { tipoEnvio, mensagem } = await crmModuleService.enviarDocumentoWhatsAppDiferenciado(
        doc.tipo === 'venda' ? 'pedido' : doc.tipo,
        doc.id,
        clienteId,
        leadId,
        cliente.nome,
        cliente.whatsapp,
        'Operador'
      );

      // Disparo SEMPRE manual
      openWhatsApp(cliente.whatsapp, mensagem);

      toast.success(
        tipoEnvio === 'pdf' 
          ? `Mensagem com PDF de ${doc.codigo_referencia} aberta para envio manual!`
          : `Link Seguro (NF-e) gerado e aberto no WhatsApp para envio manual!`
      );

      // Se houver lead, atualiza o valor do card no Kanban
      if (leadId && doc.valor > 0) {
        await crmModuleService.vincularDocumentoAoLead(
          leadId,
          doc.id,
          doc.tipo === 'venda' ? 'venda' : doc.tipo === 'nfe' ? 'nfe' : 'orcamento',
          doc.valor,
          doc.codigo_referencia,
          'Operador'
        );
        onUpdate?.();
      }

      carregarDados();
    } catch (e: any) {
      toast.error('Erro ao processar envio do documento: ' + e.message);
    }
  };

  const handleCriarTarefa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaTarefaTitulo.trim() || !novaTarefaData) {
      return toast.error('Preencha título e data de vencimento da tarefa');
    }

    try {
      await crmModuleService.criarTarefa({
        lead_id: leadId,
        cliente_id: clienteId,
        tipo: novaTarefaTipo,
        origem_regra: 'manual',
        titulo: novaTarefaTitulo.trim(),
        data_vencimento: new Date(novaTarefaData).toISOString(),
        responsavel_nome: novaTarefaResponsavel.trim() || 'Atendente'
      });

      toast.success('Tarefa manual agendada com sucesso!');
      setNovaTarefaTitulo('');
      setNovaTarefaData('');
      carregarDados();
      onUpdate?.();
    } catch (err: any) {
      toast.error('Erro ao criar tarefa');
    }
  };

  const handleAdicionarNota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notaTexto.trim()) return;

    try {
      await crmModuleService.registrarEvento({
        lead_id: leadId,
        cliente_id: clienteId,
        tipo: 'nota_manual',
        titulo: 'Nota de atendimento adicionada',
        conteudo: notaTexto.trim(),
        por_usuario_nome: 'Operador'
      });

      toast.success('Nota gravada na timeline');
      setNotaTexto('');
      carregarDados();
    } catch (err: any) {
      toast.error('Erro ao salvar nota');
    }
  };

  const handleSalvarCamposOtica = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId) return;
    try {
      await crmModuleService.atualizarCamposOtica(leadId, {
        tipo_lente_interesse: tipoLente,
        ja_usa_oculos: usaOculos,
        convenio: convenioOpt,
        grau_aproximado: grauAprox,
        interesse: interesseOpt
      });
      if (vendedorResp) {
        await crmModuleService.atribuirLeadVendedor(leadId, 'vendedor-1', vendedorResp);
      }
      toast.success('Perfil de ótica do lead atualizado!');
      onUpdate?.();
    } catch (err) {
      toast.error('Erro ao atualizar perfil de ótica');
    }
  };

  const handleVincularNovoDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId || !docRef.trim() || !docValor) {
      return toast.error('Preencha a referência e o valor do documento');
    }

    try {
      const val = parseFloat(docValor);
      await crmModuleService.vincularDocumentoAoLead(
        leadId,
        `doc-${Date.now()}`,
        docTipo,
        val,
        docRef.trim(),
        'Operador'
      );
      toast.success(`Documento ${docRef} vinculado ao lead! Valor do card atualizado.`);
      setDocRef('');
      setDocValor('');
      setVincularModalOpen(false);
      carregarDados();
      onUpdate?.();
    } catch (err) {
      toast.error('Erro ao vincular documento');
    }
  };

  const handleEnviarQuickReply = (templateTxt: string) => {
    if (!cliente?.whatsapp) return toast.error('Cliente sem WhatsApp');
    if (isSuppressed) return toast.error('Cliente em lista de supressão');

    const primeiroNome = cliente.nome.split(' ')[0] || 'Cliente';
    const msg = templateTxt.replace(/{nome}/g, primeiroNome).replace(/{loja}/g, 'Ótica Lis');

    openWhatsApp(cliente.whatsapp, msg);
    crmModuleService.registrarEvento({
      lead_id: leadId,
      cliente_id: clienteId,
      tipo: 'mensagem_whatsapp',
      titulo: 'Mensagem enviada via Template (Quick Reply)',
      conteudo: msg,
      por_usuario_nome: 'Operador'
    });
  };

  const totalDocumentosValor = documentosVinculados.reduce((acc, d) => acc + d.valor, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface border-l border-white/10 w-full max-w-2xl h-full flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header da Ficha do Contato */}
        <div className="p-6 border-b border-white/10 bg-white/[0.02]">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center font-black text-xl">
                {(cliente?.nome || 'C')[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-black text-white">{cliente?.nome || 'Contato sem Nome'}</h2>
                <p className="text-xs text-white/50 flex items-center gap-2 mt-0.5">
                  <span>{cliente?.whatsapp || 'Sem Zap'}</span>
                  {cliente?.email && <span>• {cliente.email}</span>}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full">
              <X size={20} />
            </button>
          </div>

          {/* Badges e Ações Rápidas */}
          <div className="flex flex-wrap items-center gap-2">
            {lead && (
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs px-3 py-1 rounded-full font-bold">
                Card Kanban: {lead.titulo} ({lead.valor_estimado ? `R$ ${lead.valor_estimado.toFixed(2)}` : `R$ ${totalDocumentosValor.toFixed(2)}`})
              </span>
            )}
            {cliente?.lis_score && (
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-3 py-1 rounded-full font-bold">
                Score Lìs: {cliente.lis_score}
              </span>
            )}
            
            {/* Botão Ver Ficha Completa no ERP */}
            {clienteId && (
              <button 
                onClick={() => setErpModalOpen(true)}
                className="ml-auto bg-white/5 hover:bg-white/10 text-white text-xs px-3 py-1.5 rounded-xl border border-white/10 font-bold flex items-center gap-1.5 transition-all"
              >
                <ExternalLink size={12} />
                Ficha no ERP
              </button>
            )}
          </div>

          {/* Warning de Lista de Supressão */}
          {isSuppressed && (
            <div className="mt-3 bg-red-500/10 border border-red-500/30 p-2.5 rounded-xl flex items-center gap-2 text-red-400 text-xs font-bold">
              <ShieldAlert size={16} />
              <span>Cliente em Lista de Supressão (Opt-out/PARE). Evite contato.</span>
            </div>
          )}
        </div>

        {/* Barra de Ações Rápidas de WhatsApp (DISPARO MANUAL) */}
        <div className="p-4 border-b border-white/10 bg-surface/50 grid grid-cols-2 gap-3">
          <button 
            onClick={() => cliente?.whatsapp && openWhatsApp(cliente.whatsapp, `Olá ${cliente.nome}, como podemos ajudar hoje?`)}
            disabled={!cliente?.whatsapp}
            className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-600/20"
          >
            <MessageCircle size={16} />
            WhatsApp (Manual)
          </button>

          <button 
            onClick={() => {
              if (cliente?.whatsapp) {
                openWhatsApp(cliente.whatsapp, buildConfirmacaoCadastroMsg(cliente.nome));
                crmModuleService.registrarEvento({
                  lead_id: leadId,
                  cliente_id: clienteId,
                  tipo: 'mensagem_whatsapp',
                  titulo: 'Confirmação de cadastro enviada (Manual)',
                  por_usuario_nome: 'Operador'
                });
              }
            }}
            disabled={!cliente?.whatsapp}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <CheckCircle2 size={16} className="text-primary" />
            Confirmar Cadastro
          </button>
        </div>

        {/* Abas de Navegação Interna */}
        <div className="flex border-b border-white/10 bg-black/20 overflow-x-auto">
          <button
            onClick={() => setActiveTab('documentos')}
            className={`py-3 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'documentos' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-white/50 hover:text-white'}`}
          >
            Documentos ({documentosVinculados.length})
          </button>
          <button
            onClick={() => setActiveTab('otica')}
            className={`py-3 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'otica' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-white/50 hover:text-white'}`}
          >
            Perfil Ótica & Vendedor
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-3 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'templates' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-white/50 hover:text-white'}`}
          >
            Templates (Quick Replies)
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'timeline' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-white/50 hover:text-white'}`}
          >
            Timeline & Auditoria
          </button>
          <button
            onClick={() => setActiveTab('tarefas')}
            className={`py-3 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'tarefas' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-white/50 hover:text-white'}`}
          >
            + Tarefa
          </button>
          <button
            onClick={() => setActiveTab('nota')}
            className={`py-3 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'nota' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-white/50 hover:text-white'}`}
          >
            + Nota Interna
          </button>
        </div>

        {/* Conteúdo da Aba */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* TAB 1: DOCUMENTOS VINCULADOS & REGRAS DE ENVIO DIFERENCIADO */}
          {activeTab === 'documentos' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-xl border border-white/5">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Orçamentos, Vendas e NFs do ERP</h4>
                  <p className="text-[11px] text-white/40">Regra: Orçamentos em PDF direto • NFs em Link Seguro Expirável (48h).</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-extrabold text-emerald-400">
                    Total: R$ {totalDocumentosValor.toFixed(2)}
                  </span>
                  <button
                    onClick={() => setVincularModalOpen(!vincularModalOpen)}
                    className="bg-primary/20 text-primary border border-primary/30 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-primary/30 transition-all flex items-center gap-1"
                  >
                    <Plus size={14} /> Vincular Doc
                  </button>
                </div>
              </div>

              {/* Form de Vincular Documento */}
              {vincularModalOpen && (
                <form onSubmit={handleVincularNovoDoc} className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3 animate-in fade-in">
                  <h5 className="text-xs font-bold text-white">+ Vincular Novo Documento do ERP</h5>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-white/60 font-bold block mb-1">Tipo</label>
                      <select 
                        value={docTipo} 
                        onChange={e => setDocTipo(e.target.value as any)}
                        className="w-full bg-surface border border-white/10 text-xs text-white p-2 rounded-xl"
                      >
                        <option value="orcamento">Orçamento</option>
                        <option value="venda">Venda / O.S.</option>
                        <option value="nfe">Nota Fiscal (NF-e)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/60 font-bold block mb-1">Código / Ref</label>
                      <input 
                        type="text" 
                        placeholder="Ex: COT-2026-099" 
                        value={docRef}
                        onChange={e => setDocRef(e.target.value)}
                        className="w-full bg-surface border border-white/10 text-xs text-white p-2 rounded-xl"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/60 font-bold block mb-1">Valor (R$)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="1450.00" 
                        value={docValor}
                        onChange={e => setDocValor(e.target.value)}
                        className="w-full bg-surface border border-white/10 text-xs text-white p-2 rounded-xl"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button 
                      type="button" 
                      onClick={() => setVincularModalOpen(false)}
                      className="px-3 py-1.5 text-xs text-white/60 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="bg-primary text-black font-bold text-xs px-4 py-1.5 rounded-xl hover:bg-primary/90 transition-all"
                    >
                      Salvar & Atualizar Card
                    </button>
                  </div>
                </form>
              )}

              {documentosVinculados.length === 0 ? (
                <p className="text-center text-white/30 text-xs py-8 italic">Nenhum documento do ERP vinculado a este contato.</p>
              ) : (
                documentosVinculados.map(doc => {
                  const isNfe = doc.tipo === 'nfe';

                  return (
                    <div key={doc.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3 hover:border-white/20 transition-all">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-xl ${isNfe ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {isNfe ? <Link size={18} /> : <FileText size={18} />}
                          </div>
                          <div>
                            <h5 className="font-bold text-sm text-white">{doc.codigo_referencia}</h5>
                            <p className="text-[11px] text-white/40">
                              Emissão: {new Date(doc.data_emissao).toLocaleDateString('pt-BR')} • Status: {doc.status}
                            </p>
                          </div>
                        </div>

                        <span className="font-extrabold text-emerald-400 text-sm">
                          R$ {doc.valor.toFixed(2)}
                        </span>
                      </div>

                      {doc.detalhes && (
                        <p className="text-xs text-white/60 bg-black/20 p-2.5 rounded-xl border border-white/5">
                          {doc.detalhes}
                        </p>
                      )}

                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleEnviarDocumentoDiferenciado(doc)}
                          className={`text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-all shadow-md ${
                            isNfe 
                              ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                              : 'bg-green-600 hover:bg-green-500 text-white'
                          }`}
                        >
                          {isNfe ? <Link size={14} /> : <Paperclip size={14} />}
                          {isNfe ? 'Enviar Link Seguro (NF-e Expirável 48h)' : 'Enviar PDF Comercial (WhatsApp Manual)'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB: PERFIL DE ÓTICA & ATRIBUIÇÃO DE VENDEDOR */}
          {activeTab === 'otica' && (
            <form onSubmit={handleSalvarCamposOtica} className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/10">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white">Perfil de Ótica do Lead</h4>
                  <p className="text-xs text-white/40">Informações técnicas de preferências de armação, lentes e convênio.</p>
                </div>
                <button type="submit" className="bg-primary text-black font-bold text-xs px-4 py-2 rounded-xl hover:bg-primary/90">
                  Salvar Perfil
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white/60 mb-1 block">Interesse Comercial</label>
                  <select 
                    value={interesseOpt} 
                    onChange={e => setInteresseOpt(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
                  >
                    <option value="grau">Óculos de Grau</option>
                    <option value="solar">Óculos Solar</option>
                    <option value="multifocal">Lente Multifocal</option>
                    <option value="lente_contato">Lente de Contato</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/60 mb-1 block">Tipo de Lente de Interesse</label>
                  <input 
                    type="text"
                    placeholder="Ex: Varilux Comfort, Crizal, Antirreflexo"
                    value={tipoLente}
                    onChange={e => setTipoLente(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white/60 mb-1 block">Convênio / Parceria</label>
                  <input 
                    type="text"
                    placeholder="Ex: Unimed, OAB, Bradesco"
                    value={convenioOpt}
                    onChange={e => setConvenioOpt(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/60 mb-1 block">Grau Aproximado</label>
                  <input 
                    type="text"
                    placeholder="Ex: OD -2.50 / OE -2.00"
                    value={grauAprox}
                    onChange={e => setGrauAprox(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-xs font-bold text-white/60 mb-1 block">Vendedor Responsável</label>
                  <input 
                    type="text"
                    value={vendedorResp}
                    onChange={e => setVendedorResp(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input 
                    type="checkbox"
                    id="sheetUsaOculos"
                    checked={usaOculos}
                    onChange={e => setUsaOculos(e.target.checked)}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                  <label htmlFor="sheetUsaOculos" className="text-xs font-bold text-white/80 cursor-pointer">
                    Já usa óculos atualmente
                  </label>
                </div>
              </div>
            </form>
          )}

          {/* TAB: TEMPLATES DE MENSAGEM (QUICK REPLIES COM ANTI-BAN) */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest">Biblioteca de Respostas Rápidas (Anti-Ban)</h4>
                <p className="text-xs text-white/60 mt-1">Variáveis &#123;nome&#125; e &#123;loja&#125; são inseridas automaticamente. Selecione a variação para disparar via WhatsApp.</p>
              </div>

              {templatesList.map(tpl => (
                <div key={tpl.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <h5 className="font-bold text-xs text-primary uppercase tracking-wider">{tpl.titulo}</h5>
                    <span className="text-[10px] text-white/40 font-mono">{tpl.variacoes.length} variações anti-ban</span>
                  </div>

                  <div className="space-y-2">
                    {tpl.variacoes.map((v, vIdx) => {
                      const primeiroNome = cliente?.nome ? cliente.nome.split(' ')[0] : 'Cliente';
                      const preview = v.replace(/{nome}/g, primeiroNome).replace(/{loja}/g, 'Ótica Lis');

                      return (
                        <div key={vIdx} className="bg-black/20 border border-white/5 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <p className="text-xs text-white/80 leading-relaxed italic flex-1">
                            "{preview}"
                          </p>
                          <button
                            onClick={() => handleEnviarQuickReply(v)}
                            className="bg-green-600 hover:bg-green-500 text-white font-bold text-xs py-1.5 px-3 rounded-xl shrink-0 flex items-center gap-1.5 transition-all shadow-md"
                          >
                            <Send size={12} />
                            Enviar Variação {vIdx + 1}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: TIMELINE DE AUDITORIA */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest">Histórico de Auditoria & Eventos</h4>
              {timelineEvents.length === 0 ? (
                <p className="text-center text-white/30 text-xs py-8 italic">Nenhuma atividade registrada na timeline deste contato.</p>
              ) : (
                timelineEvents.map(evt => (
                  <div key={evt.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        {evt.tipo === 'mudou_etapa' && <Clock size={14} className="text-blue-400" />}
                        {evt.tipo === 'mensagem_whatsapp' && <MessageCircle size={14} className="text-green-400" />}
                        {evt.tipo === 'documento_enviado' && <FileText size={14} className="text-yellow-400" />}
                        {evt.tipo === 'documento_vinculado' && <Paperclip size={14} className="text-emerald-400" />}
                        {evt.tipo === 'ganho' && <CheckCircle2 size={14} className="text-emerald-400" />}
                        {evt.tipo === 'perdido' && <AlertTriangle size={14} className="text-red-400" />}
                        {evt.titulo}
                      </span>
                      <span className="text-[10px] text-white/40">
                        {new Date(evt.em).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    {evt.conteudo && (
                      <p className="text-xs text-white/70 leading-relaxed bg-black/20 p-2.5 rounded-xl border border-white/5">
                        {evt.conteudo}
                      </p>
                    )}

                    <div className="flex justify-between text-[10px] text-white/30">
                      <span>Por: {evt.por_usuario_nome || 'Operador'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: CRIAR TAREFA MANUAL */}
          {activeTab === 'tarefas' && (
            <form onSubmit={handleCriarTarefa} className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/10">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Criar Nova Tarefa Manual</h4>
                <p className="text-xs text-white/40 mb-4">Defina o tipo, responsável e prazo para garantir o follow-up.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-white/60 mb-1 block">Tipo de Tarefa</label>
                <select 
                  value={novaTarefaTipo}
                  onChange={e => setNovaTarefaTipo(e.target.value as TarefaTipo)}
                  className="w-full bg-surface border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary"
                >
                  <option value="retornar_orcamento">Retornar Orçamento</option>
                  <option value="ligar">Ligar para o Cliente</option>
                  <option value="mensagem">Mandar Mensagem no WhatsApp</option>
                  <option value="reuniao">Reunião / Apresentação</option>
                  <option value="outro">Outro Compromisso</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-white/60 mb-1 block">Título da Tarefa *</label>
                <input 
                  type="text"
                  placeholder="Ex: Ligar para confirmar se aprovou as lentes multifocais"
                  value={novaTarefaTitulo}
                  onChange={e => setNovaTarefaTitulo(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white/60 mb-1 block">Data / Hora de Vencimento *</label>
                  <input 
                    type="datetime-local"
                    value={novaTarefaData}
                    onChange={e => setNovaTarefaData(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white/60 mb-1 block">Responsável</label>
                  <input 
                    type="text"
                    value={novaTarefaResponsavel}
                    onChange={e => setNovaTarefaResponsavel(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <Calendar size={16} />
                Salvar Tarefa Manual
              </button>
            </form>
          )}

          {/* TAB 4: ADICIONAR NOTA MANUAL */}
          {activeTab === 'nota' && (
            <form onSubmit={handleAdicionarNota} className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/10">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Nova Nota de Observação</h4>
                <p className="text-xs text-white/40 mb-4">Registre impressões, dúvidas ou dados adicionais sobre o atendimento.</p>
              </div>

              <textarea 
                rows={4}
                placeholder="Ex: Cliente prefere lentes antirreflexo Crizal, achou o valor um pouco acima mas aceita dividir em 6x..."
                value={notaTexto}
                onChange={e => setNotaTexto(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary"
                required
              />

              <button 
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-3 rounded-xl text-sm transition-all"
              >
                Salvar Nota na Timeline
              </button>
            </form>
          )}

        </div>
      </div>

      {/* Modal Perfil de Cliente no ERP */}
      {erpModalOpen && clienteId && (
        <ClientProfileModal 
          isOpen={erpModalOpen}
          onClose={() => setErpModalOpen(false)}
          clientId={clienteId}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Gift, Glasses, Clock, MessageCircle, AlertCircle, Loader2 } from 'lucide-react';
import { crmService, type CrmCliente, type CrmVenda } from '../lib/services/crmService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function CrmPage() {
  const [loading, setLoading] = useState(true);
  const [aniversariantes, setAniversariantes] = useState<CrmCliente[]>([]);
  const [posVenda, setPosVenda] = useState<CrmVenda[]>([]);
  const [renovacao, setRenovacao] = useState<CrmVenda[]>([]);
  const [filaRobo, setFilaRobo] = useState<any[]>([]);

  useEffect(() => {
    carregarCRM();
  }, []);

  const carregarCRM = async () => {
    setLoading(true);
    try {
      const [anivers, pv, ren, fila] = await Promise.all([
        crmService.buscarAniversariantesMes(),
        crmService.buscarPosVendaRecente(7), // 7 dias
        crmService.buscarReceitasVencendo(11), // 11 meses
        crmService.buscarEnviosPosVenda()
      ]);
      setAniversariantes(anivers);
      setPosVenda(pv);
      setRenovacao(ren);
      setFilaRobo(fila || []);
    } catch (e: any) {
      toast.error('Erro ao carregar dados do CRM');
    }
    setLoading(false);
  };

  const getWhatsAppLink = (phone: string, text: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10 || cleaned.length === 11) cleaned = '55' + cleaned;
    return `https://api.whatsapp.com/send?phone=${cleaned}&text=${encodeURIComponent(text)}`;
  };

  const abrirWhatsApp = (phone: string, text: string) => {
    if (!phone) return toast.error('Cliente não possui telefone cadastrado');
    window.open(getWhatsAppLink(phone, text), '_blank');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-primary/50" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background flex flex-col relative">
      {/* Header */}
      <header className="flex-none p-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
              Robô de Pós-Venda
              <span className="text-xs font-bold bg-primary/20 text-primary px-3 py-1 rounded-full uppercase tracking-widest border border-primary/20">
                CRM Ativo
              </span>
            </h1>
            <p className="text-white/40 mt-2 text-lg">Acompanhe seus clientes e maximize a recorrência de vendas.</p>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="flex-1 p-8 pt-4 overflow-x-auto">
        <div className="flex gap-6 min-w-max h-full">
          
          {/* Coluna 1: Aniversariantes */}
          <div className="w-[380px] flex flex-col bg-surface/50 border border-white/5 rounded-3xl overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center gap-3 bg-gradient-to-r from-purple-500/10 to-transparent">
              <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
                <Gift size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Aniversariantes</h3>
                <p className="text-xs text-white/40">Fazem aniversário este mês</p>
              </div>
              <div className="ml-auto bg-purple-500/20 text-purple-400 px-3 py-1 text-sm font-bold rounded-full">
                {aniversariantes.length}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {aniversariantes.length === 0 && (
                <p className="text-center text-white/30 text-sm mt-4 italic">Nenhum aniversariante encontrado.</p>
              )}
              {aniversariantes.map(cliente => (
                <div key={cliente.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:border-purple-500/30 transition-all group">
                  <h4 className="font-bold text-white">{cliente.nome}</h4>
                  <p className="text-xs text-white/50 mb-3 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Nasceu dia: {cliente.data_nascimento ? format(new Date(cliente.data_nascimento), 'dd/MM') : '--'}
                  </p>
                  <button 
                    onClick={() => abrirWhatsApp(cliente.whatsapp, `Parabéns ${cliente.nome.split(' ')[0]}! Feliz Aniversário da WNA Optical! Preparamos um presente especial para você: um voucher de 20% de desconto na sua próxima compra!`)}
                    className="w-full bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white border border-green-500/30 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <MessageCircle size={16} />
                    Enviar Voucher
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna 2: Adaptação (7 Dias) */}
          <div className="w-[380px] flex flex-col bg-surface/50 border border-white/5 rounded-3xl overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center gap-3 bg-gradient-to-r from-blue-500/10 to-transparent">
              <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
                <Glasses size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Adaptação (7 dias)</h3>
                <p className="text-xs text-white/40">Compraram há 1 semana</p>
              </div>
              <div className="ml-auto bg-blue-500/20 text-blue-400 px-3 py-1 text-sm font-bold rounded-full">
                {posVenda.length}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {posVenda.length === 0 && (
                <p className="text-center text-white/30 text-sm mt-4 italic">Nenhum pós-venda para hoje.</p>
              )}
              {posVenda.map(venda => (
                <div key={venda.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:border-blue-500/30 transition-all group">
                  <h4 className="font-bold text-white">{venda.cliente?.nome || 'Cliente não identificado'}</h4>
                  <p className="text-xs text-white/50 mb-3 flex items-center gap-1">
                    <Clock size={12} />
                    Venda dia: {format(new Date(venda.data_venda), 'dd/MM/yyyy')}
                  </p>
                  <button 
                    onClick={() => abrirWhatsApp(venda.cliente?.whatsapp || '', `Olá ${venda.cliente?.nome.split(' ')[0]}, aqui é da WNA Optical! Seus óculos chegaram há 1 semana. Como está a adaptação com as novas lentes? Está tudo confortável?`)}
                    className="w-full bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white border border-green-500/30 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <MessageCircle size={16} />
                    Perguntar Adaptação
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna 3: Renovação de Receita (11 Meses) */}
          <div className="w-[380px] flex flex-col bg-surface/50 border border-white/5 rounded-3xl overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center gap-3 bg-gradient-to-r from-orange-500/10 to-transparent">
              <div className="p-3 bg-orange-500/20 text-orange-400 rounded-xl">
                <Clock size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Renovação de Receita</h3>
                <p className="text-xs text-white/40">Compraram há 11 meses</p>
              </div>
              <div className="ml-auto bg-orange-500/20 text-orange-400 px-3 py-1 text-sm font-bold rounded-full">
                {renovacao.length}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {renovacao.length === 0 && (
                <p className="text-center text-white/30 text-sm mt-4 italic">Nenhuma receita vencendo agora.</p>
              )}
              {renovacao.map(venda => (
                <div key={venda.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:border-orange-500/30 transition-all group">
                  <h4 className="font-bold text-white">{venda.cliente?.nome || 'Cliente não identificado'}</h4>
                  <p className="text-xs text-white/50 mb-3 flex items-center gap-1">
                    <Clock size={12} />
                    Última compra: {format(new Date(venda.data_venda), 'MMMM / yyyy', { locale: ptBR })}
                  </p>
                  <button 
                    onClick={() => abrirWhatsApp(venda.cliente?.whatsapp || '', `Olá ${venda.cliente?.nome.split(' ')[0]}, sabia que sua receita oftalmológica está perto de vencer (quase 1 ano)? Que tal agendarmos uma nova consulta para conferir como está seu grau?`)}
                    className="w-full bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white border border-green-500/30 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <MessageCircle size={16} />
                    Sugerir Consulta
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna 4: Fila do Robô WAHA */}
          <div className="w-[380px] flex flex-col bg-surface/50 border border-white/5 rounded-3xl overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center gap-3 bg-gradient-to-r from-green-500/10 to-transparent">
              <div className="p-3 bg-green-500/20 text-green-400 rounded-xl">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Robô WAHA (Automático)</h3>
                <p className="text-xs text-white/40">Próximos disparos agendados</p>
              </div>
              <div className="ml-auto bg-green-500/20 text-green-400 px-3 py-1 text-sm font-bold rounded-full">
                {filaRobo.length}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filaRobo.length === 0 && (
                <p className="text-center text-white/30 text-sm mt-4 italic">Fila de envio vazia.</p>
              )}
              {filaRobo.map(envio => (
                <div key={envio.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:border-green-500/30 transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-md">
                      D+{envio.marco_dia}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase
                      ${envio.status === 'enviado' ? 'bg-green-500/10 text-green-500' :
                        envio.status === 'pendente' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-red-500/10 text-red-500'}
                    `}>
                      {envio.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-white mb-1">{envio.clientes?.nome || 'Desconhecido'}</h4>
                  <p className="text-xs text-white/50 mb-2">
                    Agendado: {format(new Date(envio.agendado_para), 'dd/MM/yyyy HH:mm')}
                  </p>
                  {envio.erro_log && (
                    <p className="text-[10px] text-red-400 bg-red-400/10 p-2 rounded-lg mt-2">
                      Erro: {envio.erro_log}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Glasses, 
  Activity, 
  ChevronRight,
  ChevronLeft,
  Save,
  Search,
  Loader2,
  Lock,
  Printer,
  CheckCircle2,
  User,
  MessageSquare,
  Gift,
  ExternalLink,
  Send,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { storage } from '../lib/storage';
import { getNowISO } from '../lib/dateUtils';
import { openWhatsApp } from '../lib/whatsappUtils';
import { SefazService } from '../lib/sefazService';
import PrintOS from './PrintOS';
import PrintNFe from './PrintNFe';
import { BotaoEnviarComprovante, gerarPdfRecibo } from './WhatsAppComprovante';
import { caixaService } from '../lib/services/caixaService';
import { vendasService, VendaInput } from '../lib/services/vendasService';

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SaleModal({ isOpen, onClose }: SaleModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [caixaAberto, setCaixaAberto] = useState<any>(null);
  const [checkingCaixa, setCheckingCaixa] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [savedSale, setSavedSale] = useState<any>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [client, setClient] = useState<any>(null);
  const [comprovanteVendaPdfUrl, setComprovanteVendaPdfUrl] = useState<string>('');

  // --- Estados de busca inteligente de clientes ---
  const [clients, setClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clienteNome, setClienteNome] = useState('');
  const [clienteCpf, setClienteCpf] = useState('');
  const [clienteWhatsapp, setClienteWhatsapp] = useState('');
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // --- Estados de produtos do estoque ---
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedArmacaoId, setSelectedArmacaoId] = useState('');

  const [sefazLoading, setSefazLoading] = useState(false);
  const [sefazSuccess, setSefazSuccess] = useState(false);
  const [sefazError, setSefazError] = useState('');
  const [danfeUrl, setDanfeUrl] = useState('');
  const [notaInfo, setNotaInfo] = useState<{ xml: string, chave: string, protocolo: string, id?: string } | null>(null);
  const [tipoImpressaoFisco, setTipoImpressaoFisco] = useState<'os' | '55' | '65' | 'recibo'>('os');

  const handlePrint = async (tipo: 'os' | '55' | '65' | 'recibo' = 'os') => {
    setTipoImpressaoFisco(tipo);
    if (notaInfo?.id && (tipo === '55' || tipo === '65' || tipo === 'recibo')) {
      let acao = '';
      if (tipo === '55') acao = 'Impressão do DANFE (NF-e modelo 55)';
      else if (tipo === '65') acao = 'Impressão do cupom fiscal (NFC-e modelo 65)';
      else if (tipo === 'recibo') acao = 'Impressão do comprovante de venda interno';
      await storage.registrarAcaoNotaFiscal(notaInfo.id, acao);
    }
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleVerDanfe = async () => {
    if (danfeUrl) {
      if (notaInfo?.id) {
        await storage.registrarAcaoNotaFiscal(notaInfo.id, 'Visualização do DANFE oficial');
      }
      SefazService.abrirDanfe(danfeUrl);
    }
  };

  const handleBaixarXML = async () => {
    if (notaInfo?.xml && notaInfo?.chave && notaInfo?.id) {
      await storage.registrarAcaoNotaFiscal(notaInfo.id, 'Download do arquivo XML');
      SefazService.baixarXML(notaInfo.chave, notaInfo.xml);
    }
  };

  const [lenteSearch, setLenteSearch] = useState('');
  const [showLenteDropdown, setShowLenteDropdown] = useState(false);
  const lenteDropdownRef = useRef<HTMLDivElement>(null);

  const [armacaoSearch, setArmacaoSearch] = useState('');
  const [showArmacaoDropdown, setShowArmacaoDropdown] = useState(false);
  const armacaoDropdownRef = useRef<HTMLDivElement>(null);

  const handleEmitirNfe = async (sale: any, modelo: '55' | '65') => {
    if (!sale) return;
    setSefazLoading(true);
    setSefazError('');
    try {
      const result = await SefazService.emitirNotaFiscal(sale);
      if (result.sucesso) {
        setSefazSuccess(true);
        setDanfeUrl(result.danfe_url || '');

        const notaFaturamento = {
          cliente: sale.cliente_nome || sale.paciente_nome || 'Consumidor Final',
          cliente_doc: sale.paciente_cpf || '',
          valor_total: Number(sale.valor_total || 0),
          itens: [
            {
              produto_nome: `LENTE ${sale.tipo_lente || ''} ${sale.tratamento || ''}`.trim() || 'PRODUTO ÓTICO',
              quantidade: 1,
              valor_unitario: Number(sale.valor_total || 0),
              ncm: '90031100'
            }
          ],
          status: 'EMITIDA',
          natureza: 'Venda de Mercadoria',
          cfop: '5102',
          chave_acesso: result.chave_acesso,
          danfe_url: result.danfe_url,
          protocolo: result.protocolo,
          xml: result.xml,
          venda_id: sale.id
        };

        const novaNota = await storage.saveNotaFiscal(notaFaturamento);

        setNotaInfo({
          xml: result.xml || '',
          chave: result.chave_acesso || '',
          protocolo: result.protocolo || '',
          id: novaNota.id
        });
        
        if (sale.id && result.chave_acesso) {
          await storage.atualizarVendaFiscal(sale.id, result.chave_acesso, result.danfe_url || '');
        }

        await storage.registrarAcaoNotaFiscal(novaNota.id, 'Emissão e autorização da nota fiscal');
        const acaoImpressao = modelo === '55' ? 'Impressão do DANFE (NF-e modelo 55)' : 'Impressão do cupom fiscal (NFC-e modelo 65)';
        await storage.registrarAcaoNotaFiscal(novaNota.id, acaoImpressao);

        setTipoImpressaoFisco(modelo);
        setTimeout(() => window.print(), 800);

        toast.success('Nota Fiscal emitida com sucesso!', {
          description: `Chave de Acesso vinculada à venda.`
        });
      } else {
        setSefazError(result.motivo_rejeicao || 'Erro desconhecido junto à SEFAZ.');
        toast.error(`Falha na emissão: ${result.motivo_rejeicao}`);
      }
    } catch (e: any) {
      setSefazError(e.message || 'Erro de conexão.');
      toast.error('Erro ao emitir nota fiscal.');
    } finally {
      setSefazLoading(false);
    }
  };
  
  const initialState = {
    cliente_id: '',
    tecnico: '',
    od_esferico: '',
    od_cilindrico: '',
    od_eixo: '',
    od_dnp: '',
    od_adicao: '',
    oe_esferico: '',
    oe_cilindrico: '',
    oe_eixo: '',
    oe_dnp: '',
    oe_adicao: '',
    tipo_lente: '', // LP ou BVS
    tratamento: '', // Blue, Crizal, etc
    is_birthday_discount: false,
    valor_base: '0.00',
    desconto: '0.00',
    valor_total: '0.00'
  };

  const [formData, setFormData] = useState(initialState);
  
  const [pagamentos, setPagamentos] = useState<{forma_pagamento: string, valor: number}[]>([{ forma_pagamento: 'Cartão de Crédito', valor: 0 }]);

  // Auto-calculate total when base or discount changes
  useEffect(() => {
    const base = parseFloat(formData.valor_base) || 0;
    const desc = parseFloat(formData.desconto) || 0;
    let total = Math.max(0, base - desc);
    
    if (formData.is_birthday_discount) {
      total = total * 0.9; // 10% off
    }
    
    setFormData(prev => ({ ...prev, valor_total: total.toFixed(2) }));
    
    // Auto-atualiza o primeiro pagamento para cobrir o total se houver só 1
    if (pagamentos.length === 1) {
      setPagamentos([{ forma_pagamento: pagamentos[0].forma_pagamento, valor: total }]);
    }
  }, [formData.valor_base, formData.desconto, formData.is_birthday_discount]);

  // Carrega clientes e produtos quando o modal abre
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        const [clientsData, productsData] = await Promise.all([
          storage.getClients(),
          storage.getProducts()
        ]);
        setClients(clientsData || []);
        setProducts(productsData || []);
      };
      loadData();
    }
  }, [isOpen]);

  // Fecha dropdown de cliente ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
      if (lenteDropdownRef.current && !lenteDropdownRef.current.contains(e.target as Node)) {
        setShowLenteDropdown(false);
      }
      if (armacaoDropdownRef.current && !armacaoDropdownRef.current.contains(e.target as Node)) {
        setShowArmacaoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isSuccess && savedSale) {
      const formatarItens = () => {
        return [
          {
            descricao: `LENTE ${savedSale.tipo_lente || ''} ${savedSale.tratamento || ''}`.trim() || 'PRODUTO ÓTICO',
            quantidade: 1,
            valorUnitario: Number(savedSale.valor_total || 0),
            valorTotal: Number(savedSale.valor_total || 0),
            refServico: savedSale.os_number ? `Ref. O.S. #${savedSale.os_number}` : undefined
          }
        ];
      };
      
      const dataEmissaoString = savedSale.criado_em ? new Date(savedSale.criado_em).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
      const horaString = savedSale.criado_em ? new Date(savedSale.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const reciboData = {
        numero: savedSale.numero || savedSale.os_number || '000000',
        serie: '001',
        clienteNome: client?.nome_completo || client?.name || 'Consumidor Final',
        clienteCpfCnpj: client?.cpf || '000.000.000-00',
        dataEmissao: dataEmissaoString,
        hora: horaString,
        itens: formatarItens(),
        subtotal: Number(savedSale.valor_total || 0),
        desconto: Number(savedSale.desconto || 0),
        total: Number(savedSale.valor_total || 0)
      };

      gerarPdfRecibo(reciboData).then(url => {
        setComprovanteVendaPdfUrl(url);
      }).catch(err => {
        console.error("Erro ao gerar PDF do comprovante de venda:", err);
      });
    } else {
      setComprovanteVendaPdfUrl('');
    }
  }, [isSuccess, savedSale, client]);

  // Filtra clientes conforme busca
  const filteredClients = clients.filter((c: any) => {
    if (!clientSearch.trim()) return false;
    const term = clientSearch.toLowerCase();
    const nome = (c.nome_completo || c.name || '').toLowerCase();
    const cpf = (c.cpf || '').replace(/\D/g, '');
    const searchClean = term.replace(/\D/g, '');
    return nome.includes(term) || (searchClean && cpf.includes(searchClean));
  }).slice(0, 5);

  // Seleciona um cliente do dropdown
  const handleSelectClient = (c: any) => {
    setFormData(prev => ({ ...prev, cliente_id: c.id }));
    setClienteNome(c.nome_completo || c.name || '');
    setClienteCpf(c.cpf || '');
    setClienteWhatsapp(c.whatsapp || '');
    setClient(c);
    setClientSearch('');
    setShowClientDropdown(false);
  };

  // Remove cliente selecionado
  const handleClearClient = () => {
    setFormData(prev => ({ ...prev, cliente_id: '' }));
    setClienteNome('');
    setClienteCpf('');
    setClienteWhatsapp('');
    setClient(null);
    setClientSearch('');
  };

  // Seleciona produto (lente) do dropdown
  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
    const prod = products.find((p: any) => p.id === productId);
    if (prod) {
      const nomeParts = (prod.nome || '').split(' ');
      const tipoLente = nomeParts.find((p: string) => ['LP', 'BVS', 'MULTIFOCAL'].includes(p.toUpperCase())) || prod.categoria || prod.nome;
      const tratamento = nomeParts.filter((p: string) => !['Lente', 'LP', 'BVS', 'MULTIFOCAL'].includes(p)).join(' ') || '';
      setFormData(prev => ({
        ...prev,
        tipo_lente: tipoLente,
        tratamento: tratamento,
        valor_base: (prod.preco_venda || 0).toString()
      }));
      toast.info(`Produto selecionado: ${prod.nome} - R$ ${Number(prod.preco_venda || 0).toFixed(2)}`);
    } else {
      setFormData(prev => ({ ...prev, tipo_lente: '', tratamento: '', valor_base: '0.00' }));
    }
  };

  // Seleciona armação do dropdown
  const handleSelectArmacao = (armacaoId: string) => {
    setSelectedArmacaoId(armacaoId);
    const arm = products.find((p: any) => p.id === armacaoId);
    if (arm) {
      const currentBase = parseFloat(formData.valor_base) || 0;
      // Soma o valor da armação ao valor base
      setFormData(prev => ({
        ...prev,
        valor_base: (currentBase + (arm.preco_venda || 0)).toString()
      }));
      toast.info(`Armação adicionada: ${arm.nome} - R$ ${Number(arm.preco_venda || 0).toFixed(2)}`);
    }
  };

  // Listas derivadas de produtos
  const lentesProducts = products.filter((p: any) => {
    const cat = (p.categoria || '').toLowerCase();
    const matchesSearch = lenteSearch ? p.nome.toLowerCase().includes(lenteSearch.toLowerCase()) : true;
    return !cat.includes('arma') && !cat.includes('acessório') && matchesSearch;
  });

  const armacaoProducts = products.filter((p: any) => {
    const cat = (p.categoria || '').toLowerCase();
    const nome = (p.nome || '').toLowerCase();
    const isArmacao = cat.includes('arma') || nome.includes('arma');
    const matchesSearch = armacaoSearch ? p.nome.toLowerCase().includes(armacaoSearch.toLowerCase()) : true;
    return isArmacao && matchesSearch;
  });



  const checkCaixa = async () => {
    setCheckingCaixa(true);
    const [settingsData, caixa] = await Promise.all([
      storage.getSettings(),
      caixaService.buscarCaixaAtivo()
    ]);
    setSettings(settingsData);
    
    // Bloqueia apenas se a trava for obrigatória nas configurações (mas agora é exigência do cliente ter o caixa aberto)
    setCaixaAberto(caixa); 
    setCheckingCaixa(false);
  };

  useEffect(() => {
    if (isOpen) checkCaixa();
  }, [isOpen]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const saleToSave = {
        ...formData,
        cliente_nome: clienteNome,
        paciente_cpf: clienteCpf,
        cliente_whatsapp: clienteWhatsapp,
        paciente_nome: clienteNome,
        paciente_whatsapp: clienteWhatsapp,
        od_esferico: parseFloat(formData.od_esferico) || 0,
        od_cilindrico: parseFloat(formData.od_cilindrico) || 0,
        od_eixo: parseInt(formData.od_eixo) || 0,
        od_dnp: parseFloat(formData.od_dnp) || 0,
        od_adicao: parseFloat(formData.od_adicao) || 0,
        oe_esferico: parseFloat(formData.oe_esferico) || 0,
        oe_cilindrico: parseFloat(formData.oe_cilindrico) || 0,
        oe_eixo: parseInt(formData.oe_eixo) || 0,
        oe_dnp: parseFloat(formData.oe_dnp) || 0,
        oe_adicao: parseFloat(formData.oe_adicao) || 0,
        valor_total: parseFloat(formData.valor_total) || 0,
        criado_em: getNowISO()
      };
      
      const valorTotalRecebido = pagamentos.reduce((acc, p) => acc + Number(p.valor), 0);
      if (Math.abs(valorTotalRecebido - saleToSave.valor_total) > 0.05) {
        setLoading(false);
        return toast.error(`A soma dos pagamentos (R$ ${valorTotalRecebido.toFixed(2)}) difere do total (R$ ${saleToSave.valor_total.toFixed(2)})`);
      }

      // Prepara o VendaInput
      const vendaInput: VendaInput = {
        os_number: `OS-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        caixa_id: caixaAberto.id,
        cliente_id: formData.cliente_id || null,
        usuario_id: '00000000-0000-0000-0000-000000000000', // Mock do usuário logado
        valor_bruto: parseFloat(formData.valor_base) || 0,
        desconto: parseFloat(formData.desconto) || 0,
        valor_liquido: saleToSave.valor_total,
        metadata: {
          paciente_nome: clienteNome,
          paciente_cpf: clienteCpf,
          paciente_whatsapp: clienteWhatsapp,
          od_esferico: saleToSave.od_esferico,
          od_cilindrico: saleToSave.od_cilindrico,
          od_eixo: saleToSave.od_eixo,
          od_dnp: saleToSave.od_dnp,
          od_adicao: saleToSave.od_adicao,
          oe_esferico: saleToSave.oe_esferico,
          oe_cilindrico: saleToSave.oe_cilindrico,
          oe_eixo: saleToSave.oe_eixo,
          oe_dnp: saleToSave.oe_dnp,
          oe_adicao: saleToSave.oe_adicao,
          tipo_lente: formData.tipo_lente,
          tratamento: formData.tratamento
        },
        itens: [
          {
            categoria_id: '00000000-0000-0000-0000-000000000000', // Categoria de Venda Geral
            descricao: `LENTE ${formData.tipo_lente} ${formData.tratamento}`.trim() || 'PRODUTO ÓTICO',
            quantidade: 1,
            valor_unitario: saleToSave.valor_total,
            valor_total: saleToSave.valor_total
          }
        ],
        pagamentos: pagamentos.map(p => ({
          forma_pagamento: p.forma_pagamento,
          valor: p.valor
        }))
      };

      const result = await vendasService.salvarVenda(vendaInput);
      
      // Armazena a venda com formato compatível com o recibo
      const saved = { ...saleToSave, id: result.id, os_number: result.os_number };
      setSavedSale(saved);
      
      // Usa diretamente o client já selecionado (não precisa buscar de novo)
      // O state `client` já foi setado em handleSelectClient

      setIsSuccess(true);
      
      // Impressão obrigatória em PDF A4 ao finalizar
      setTimeout(() => {
        window.print();
      }, 500);
    } catch (error: any) {
      toast.error('Erro ao salvar venda');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(initialState);
    setStep(1);
    setIsSuccess(false);
    setSavedSale(null);
    setSefazLoading(false);
    setSefazSuccess(false);
    setSefazError('');
    setDanfeUrl('');
    setNotaInfo(null);
    setTipoImpressaoFisco('os');
    // Reset estados de cliente e produto
    setClientSearch('');
    setShowClientDropdown(false);
    handleClearClient();
    setSelectedProductId('');
    setSelectedArmacaoId('');
    setLenteSearch('');
    setArmacaoSearch('');
    setShowLenteDropdown(false);
    setShowArmacaoDropdown(false);
    setPagamentos([{ forma_pagamento: 'Cartão de Crédito', valor: 0 }]);
    onClose();
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface w-full max-w-4xl rounded-3xl border border-white/10 shadow-2xl flex flex-col h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Glasses className="text-primary" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{isSuccess ? 'Venda Concluída!' : 'Nova Ordem de Serviço'}</h3>
              <p className="text-xs text-white/40">{isSuccess ? 'O.S. registrada com sucesso no sistema' : `Passo ${step} de 3: ${step === 1 ? 'Cliente & Armação' : step === 2 ? 'Prescrição Técnica' : 'Pagamento'}`}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="flex h-1 bg-white/5">
          <div className={`h-full bg-primary transition-all duration-500 ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`} />
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-b from-transparent to-black/20">
          {!caixaAberto && !checkingCaixa ? (
             <div className="h-full flex flex-col items-center justify-center text-center p-12 animate-in zoom-in-95">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 border border-red-500/20">
                  <Lock size={32} />
                </div>
                <h4 className="text-xl font-bold text-white mb-2">Caixa Fechado</h4>
                <p className="text-white/40 max-w-xs text-sm italic mb-6">
                  Não é possível realizar vendas ou lançamentos com o caixa fechado. Por favor, realize a abertura do caixa do dia.
                </p>
                <button 
                  onClick={onClose}
                  className="bg-white/5 border border-white/10 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-white/10 transition-colors"
                >
                  Voltar e Abrir Caixa
                </button>
             </div>
          ) : checkingCaixa ? (
             <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={40} />
             </div>
          ) : (
            <>
              {step === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              {/* === BUSCA INTELIGENTE DE CLIENTES === */}
              <section className="space-y-4">
                <h4 className="text-xs font-bold text-white/20 uppercase tracking-widest border-b border-white/5 pb-2">Identificação do Cliente</h4>
                
                {formData.cliente_id && clienteNome ? (
                  // Card do cliente selecionado
                  <div className="flex items-center gap-4 bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                      <User size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{clienteNome}</p>
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        {clienteCpf && <span>CPF: {clienteCpf}</span>}
                        {clienteWhatsapp && <span>WhatsApp: {clienteWhatsapp}</span>}
                      </div>
                    </div>
                    <button 
                      onClick={handleClearClient}
                      className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-red-400 shrink-0"
                      title="Remover cliente"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  // Combobox de busca
                  <div className="relative" ref={clientDropdownRef}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    <input 
                      type="text" 
                      placeholder="Buscar cliente por nome ou CPF..." 
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setShowClientDropdown(true);
                      }}
                      onFocus={() => clientSearch.trim() && setShowClientDropdown(true)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    {/* Dropdown de resultados */}
                    {showClientDropdown && filteredClients.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-surface border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                        {filteredClients.map((c: any) => (
                          <button
                            key={c.id}
                            onClick={() => handleSelectClient(c)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-b-0"
                          >
                            <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-white/30 shrink-0">
                              <User size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{c.nome_completo || c.name}</p>
                              <p className="text-xs text-white/30">
                                {c.cpf && `CPF: ${c.cpf}`}
                                {c.cpf && c.whatsapp && ' · '}
                                {c.whatsapp && `WhatsApp: ${c.whatsapp}`}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {showClientDropdown && clientSearch.trim() && filteredClients.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-surface border border-white/10 rounded-xl shadow-2xl p-4 text-center">
                        <p className="text-xs text-white/30 italic">Nenhum cliente encontrado para "{clientSearch}"</p>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="grid grid-cols-1 gap-6 pb-8">
                {/* === SELEÇÃO DE PRODUTOS DO ESTOQUE === */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-white/20 uppercase tracking-widest border-b border-white/5 pb-2">Lente do Estoque</h4>
                  
                  {selectedProductId ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-4 bg-primary/5 border border-primary/20 rounded-xl p-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{products.find(p => p.id === selectedProductId)?.nome}</p>
                          <p className="text-xs text-white/40">R$ {Number(products.find(p => p.id === selectedProductId)?.preco_venda || 0).toFixed(2)}</p>
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedProductId('');
                            setFormData(prev => ({ ...prev, tipo_lente: '', tratamento: '', valor_base: selectedArmacaoId ? products.find(p => p.id === selectedArmacaoId)?.preco_venda?.toString() || '0' : '0' }));
                          }}
                          className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-red-400 shrink-0"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 text-xs text-white/40 space-y-1">
                        <p><span className="text-white/60 font-semibold">Tipo:</span> {formData.tipo_lente}</p>
                        <p><span className="text-white/60 font-semibold">Tratamento:</span> {formData.tratamento || '—'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative" ref={lenteDropdownRef}>
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                      <input 
                        type="text" 
                        placeholder="Buscar lente no estoque..." 
                        value={lenteSearch}
                        onChange={(e) => {
                          setLenteSearch(e.target.value);
                          setShowLenteDropdown(true);
                        }}
                        onFocus={() => setShowLenteDropdown(true)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                      />
                      {showLenteDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-surface border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                          {lentesProducts.length > 0 ? lentesProducts.map((p: any) => (
                            <button
                              key={p.id}
                              onClick={() => {
                                handleSelectProduct(p.id);
                                setShowLenteDropdown(false);
                                setLenteSearch('');
                              }}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-b-0"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{p.nome}</p>
                                <p className="text-xs text-white/30">Estoque: {p.estoque ?? 0}</p>
                              </div>
                              <div className="text-right pl-3">
                                <p className="text-sm font-bold text-primary">R$ {Number(p.preco_venda || 0).toFixed(2)}</p>
                              </div>
                            </button>
                          )) : (
                            <div className="p-4 text-center text-xs text-white/30 italic">Nenhuma lente encontrada</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* === SELEÇÃO DE ARMAÇÃO === */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-white/20 uppercase tracking-widest border-b border-white/5 pb-2">Armação do Estoque</h4>
                  
                  {selectedArmacaoId ? (
                    <div className="flex items-center gap-4 bg-primary/5 border border-primary/20 rounded-xl p-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{products.find(p => p.id === selectedArmacaoId)?.nome}</p>
                        <p className="text-xs text-white/40">R$ {Number(products.find(p => p.id === selectedArmacaoId)?.preco_venda || 0).toFixed(2)}</p>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedArmacaoId('');
                          const currentLente = products.find(p => p.id === selectedProductId);
                          setFormData(prev => ({ ...prev, valor_base: currentLente ? currentLente.preco_venda?.toString() : '0' }));
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-red-400 shrink-0"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative" ref={armacaoDropdownRef}>
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                      <input 
                        type="text" 
                        placeholder="Buscar armação no estoque..." 
                        value={armacaoSearch}
                        onChange={(e) => {
                          setArmacaoSearch(e.target.value);
                          setShowArmacaoDropdown(true);
                        }}
                        onFocus={() => setShowArmacaoDropdown(true)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                      />
                      {showArmacaoDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-surface border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                          {armacaoProducts.length > 0 ? armacaoProducts.map((p: any) => (
                            <button
                              key={p.id}
                              onClick={() => {
                                handleSelectArmacao(p.id);
                                setShowArmacaoDropdown(false);
                                setArmacaoSearch('');
                              }}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-b-0"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{p.nome}</p>
                                <p className="text-xs text-white/30">Estoque: {p.estoque ?? 0}</p>
                              </div>
                              <div className="text-right pl-3">
                                <p className="text-sm font-bold text-primary">R$ {Number(p.preco_venda || 0).toFixed(2)}</p>
                              </div>
                            </button>
                          )) : (
                            <div className="p-4 text-center text-xs text-white/30 italic">Nenhuma armação encontrada</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
               <PrescriptionGrid 
                  side="Olho Direito (OD)" 
                  values={{
                    esf: formData.od_esferico,
                    cil: formData.od_cilindrico,
                    eixo: formData.od_eixo,
                    ad: formData.od_adicao,
                    dnp: formData.od_dnp
                  }}
                  onChange={(field, val) => setFormData({...formData, [`od_${field}`]: val})}
               />
               <PrescriptionGrid 
                  side="Olho Esquerdo (OE)" 
                  values={{
                    esf: formData.oe_esferico,
                    cil: formData.oe_cilindrico,
                    eixo: formData.oe_eixo,
                    ad: formData.oe_adicao,
                    dnp: formData.oe_dnp
                  }}
                  onChange={(field, val) => setFormData({...formData, [`oe_${field}`]: val})}
               />
            </div>
          )}

          {step === 3 && !isSuccess && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center space-y-2 mb-8">
                <p className="text-xs text-primary/60 uppercase font-black tracking-widest">Resumo da Venda</p>
                <p className="text-4xl font-black text-white">R$ {formData.valor_total}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                    <h4 className="text-xs font-bold text-white/20 uppercase tracking-widest border-b border-white/5 pb-2">Formas de Pagamento</h4>
                    
                    {pagamentos.map((pagamento, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <select 
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 text-white"
                          value={pagamento.forma_pagamento}
                          onChange={(e) => {
                            const newPags = [...pagamentos];
                            newPags[index].forma_pagamento = e.target.value;
                            setPagamentos(newPags);
                          }}
                        >
                          <option className="bg-surface">Cartão de Crédito</option>
                          <option className="bg-surface">Cartão de Débito</option>
                          <option className="bg-surface">Pix</option>
                          <option className="bg-surface">Dinheiro</option>
                          <option className="bg-surface">Crediário Lis</option>
                        </select>
                        <input
                          type="number"
                          className="w-32 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 text-white"
                          value={pagamento.valor}
                          onChange={(e) => {
                            const newPags = [...pagamentos];
                            newPags[index].valor = parseFloat(e.target.value) || 0;
                            setPagamentos(newPags);
                          }}
                          placeholder="0.00"
                        />
                        {pagamentos.length > 1 && (
                          <button 
                            className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20"
                            onClick={() => {
                              setPagamentos(pagamentos.filter((_, i) => i !== index));
                            }}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    
                    <button 
                      onClick={() => setPagamentos([...pagamentos, { forma_pagamento: 'Pix', valor: 0 }])}
                      className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      + Adicionar outro pagamento
                    </button>

                    <div className="flex items-center gap-2 pt-2">
                       <input 
                         type="checkbox" 
                         id="birthday-discount"
                         className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/50"
                         checked={formData.is_birthday_discount}
                         onChange={(e) => setFormData({...formData, is_birthday_discount: e.target.checked})}
                       />
                       <label htmlFor="birthday-discount" className="text-sm text-primary font-bold flex items-center gap-1.5">
                         <Gift size={16} />
                         Desconto Aniversário (10%)
                       </label>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <h4 className="text-xs font-bold text-white/20 uppercase tracking-widest border-b border-white/5 pb-2">Valores e Ajustes</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup 
                        label="Valor Base (R$)" 
                        value={formData.valor_base} 
                        onChange={(e) => setFormData({...formData, valor_base: e.target.value})}
                      />
                      <InputGroup 
                        label="Desconto (R$)" 
                        value={formData.desconto} 
                        onChange={(e) => setFormData({...formData, desconto: e.target.value})}
                      />
                    </div>
                    <div className="pt-2">
                       <p className="text-[10px] font-black text-primary uppercase tracking-widest ml-1 mb-1">Total a Pagar</p>
                       <p className="text-2xl font-black text-white">R$ {formData.valor_total}</p>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {isSuccess && (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 animate-in zoom-in-95">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-6 border border-green-500/20">
                <CheckCircle2 size={40} />
              </div>
              <h4 className="text-2xl font-black text-white mb-2">Venda Salva!</h4>
              <p className="text-white/40 max-w-sm text-sm italic mb-10">
                A Ordem de Serviço foi gerada e os lançamentos financeiros foram realizados. Deseja imprimir o recibo para o laboratório agora?
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={handlePrint}
                  className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-2xl text-sm font-black hover:bg-white/10 transition-all uppercase tracking-widest"
                >
                  Fechar
                </button>
              </div>

              {/* Módulo de Faturamento SEFAZ */}
              <div className="w-full max-w-md bg-white/[0.02] border border-white/5 rounded-3xl p-6 mt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Faturamento Fiscal</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                    sefazSuccess ? 'bg-green-500/10 text-green-500' : sefazLoading ? 'bg-yellow-500/10 text-yellow-500' : 'bg-white/5 text-white/40'
                  }`}>
                    {sefazSuccess ? 'Autorizada' : sefazLoading ? 'Processando' : 'Pendente'}
                  </span>
                </div>

                {!sefazSuccess && !sefazLoading && (
                  <div className="space-y-4">
                    <p className="text-xs text-white/40 leading-relaxed italic">
                      Selecione o documento de saída desejado para esta venda:
                    </p>
                    {sefazError && (
                      <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-xl text-[10px] text-red-400 font-bold leading-normal">
                        {sefazError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={() => handlePrint('os')}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                      >
                        <Printer size={14} />
                        Imprimir NF (O.S. / Gerencial)
                      </button>
                      <button
                        onClick={() => handleEmitirNfe(savedSale, '55')}
                        className="w-full py-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                      >
                        <Send size={14} />
                        Emitir e Imprimir NF-e (Mod. 55)
                      </button>
                      <button
                        onClick={() => handleEmitirNfe(savedSale, '65')}
                        className="w-full py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                      >
                        <Send size={14} />
                        Emitir e Imprimir DANFE/NFC-e
                      </button>
                    </div>
                  </div>
                )}

                {sefazLoading && (
                  <div className="py-4 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="animate-spin text-primary" size={24} />
                    <p className="text-xs font-bold text-white/60">Processando junto à SEFAZ-GO...</p>
                    <p className="text-[9px] text-white/30 italic">Assinando XML com certificado A1 e transmitindo...</p>
                  </div>
                )}

                {sefazSuccess && (
                  <div className="space-y-4">
                    <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-xl text-xs text-green-400 font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 size={16} />
                      Nota Fiscal Autorizada com Sucesso!
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {danfeUrl && (
                        <button
                          onClick={handleVerDanfe}
                          className="py-2.5 bg-primary text-black font-black rounded-xl text-center text-xs flex items-center justify-center gap-1.5 hover:scale-105 transition-all shadow-lg shadow-primary/10 md:col-span-2"
                        >
                          <ExternalLink size={14} />
                          Ver DANFE Oficial
                        </button>
                      )}
                      <button
                        onClick={() => handlePrint('55')}
                        className="py-2.5 bg-[#FFD700] text-black font-black rounded-xl text-center text-xs flex items-center justify-center gap-1.5 hover:scale-105 transition-all shadow-lg shadow-[#FFD700]/10"
                      >
                        <Printer size={14} />
                        Imprimir DANFE
                      </button>
                      <button
                        onClick={() => handlePrint('65')}
                        className="py-2.5 bg-blue-500 text-white font-black rounded-xl text-center text-xs flex items-center justify-center gap-1.5 hover:scale-105 transition-all shadow-lg shadow-blue-500/10"
                      >
                        <Printer size={14} />
                        Imprimir NFC-e
                      </button>
                      <button
                        onClick={() => handlePrint('recibo')}
                        className="py-2.5 bg-gray-800 text-[#c5a880] border border-[#c5a880]/30 font-black rounded-xl text-center text-xs flex items-center justify-center gap-1.5 hover:scale-105 transition-all shadow-lg shadow-gray-800/10 md:col-span-2"
                      >
                        <Printer size={14} />
                        Comprovante de Venda
                      </button>
                      {notaInfo?.xml && (
                        <button
                          onClick={handleBaixarXML}
                          className="py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all md:col-span-2"
                        >
                          <Download size={14} />
                          Baixar XML
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 animate-in slide-in-from-bottom-4 duration-500 w-full max-w-md flex flex-col gap-3">
                {/* 1) Comprovante de venda (interno, não-fiscal) — sempre disponível */}
                <BotaoEnviarComprovante
                  telefoneCliente={client?.whatsapp || ''}
                  clienteNome={client?.nome_completo || client?.name || 'Cliente'}
                  numeroNota={savedSale?.numero || savedSale?.os_number || '000000'}
                  valorTotal={Number(savedSale?.valor_total || 0)}
                  pdfUrl={comprovanteVendaPdfUrl}
                  rotuloDocumento="comprovante de venda"
                  nomeArquivo={`Comprovante-${savedSale?.numero || savedSale?.os_number || '000000'}.pdf`}
                  textoBotao="Enviar comprovante por WhatsApp"
                />

                {/* 2) DANFE / NF-e (fiscal) — habilita só quando a nota foi autorizada */}
                <BotaoEnviarComprovante
                  telefoneCliente={client?.whatsapp || ''}
                  clienteNome={client?.nome_completo || client?.name || 'Cliente'}
                  numeroNota={notaInfo?.id ? String(notaInfo.id).slice(-6).toUpperCase() : (savedSale?.os_number || '000000').toUpperCase()}
                  valorTotal={Number(savedSale?.valor_total || 0)}
                  pdfUrl={danfeUrl}
                  rotuloDocumento="comprovante fiscal (DANFE)"
                  nomeArquivo={`DANFE-${notaInfo?.id ? String(notaInfo.id).slice(-6).toUpperCase() : '000000'}.pdf`}
                  textoBotao="Enviar DANFE por WhatsApp"
                />
              </div>

              {savedSale && settings && tipoImpressaoFisco === 'os' && (
                <PrintOS sale={savedSale} settings={settings} />
              )}
              {savedSale && settings && tipoImpressaoFisco && tipoImpressaoFisco !== 'os' && (
                <PrintNFe 
                  tipo={tipoImpressaoFisco === '55' ? 'nfe' : (tipoImpressaoFisco === '65' ? 'nfce' : 'recibo')}
                  sale={savedSale} 
                  settings={settings} 
                  chaveAcesso={notaInfo?.chave} 
                  protocolo={notaInfo?.protocolo} 
                />
              )}
            </div>
          )}
          </>
        )}
        </div>

        {/* Footer */}
        {!isSuccess && (
          <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-between items-center shrink-0">
            <button 
              disabled={loading}
              onClick={() => step > 1 ? setStep(step - 1) : handleClose()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white/40 hover:text-white transition-colors disabled:opacity-50"
            >
              {step > 1 ? <ChevronLeft size={20} /> : null}
              {step > 1 ? 'Voltar' : 'Cancelar'}
            </button>
            
            <button 
              disabled={loading}
              onClick={() => step < 3 ? setStep(step + 1) : handleSave()}
              className="bg-primary text-black px-8 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : step < 3 ? 'Próximo' : 'Finalizar O.S.'}
              {step < 3 && !loading ? <ChevronRight size={20} /> : !loading && <Save size={20} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PrescriptionGrid({ side, values, onChange }: { side: string, values: any, onChange: (field: string, val: string) => void }) {
  return (
    <div className="space-y-4 bg-white/[0.02] p-6 rounded-2xl border border-white/5">
      <h4 className="text-sm font-bold text-primary flex items-center gap-2">
        <Activity size={18} />
        {side}
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
        <InputGroup label="Esférico" placeholder="+0.00" value={values.esf} onChange={(e) => onChange('esferico', e.target.value)} />
        <InputGroup label="Cilíndrico" placeholder="-0.00" value={values.cil} onChange={(e) => onChange('cilindrico', e.target.value)} />
        <InputGroup label="Eixo" placeholder="180°" value={values.eixo} onChange={(e) => onChange('eixo', e.target.value)} />
        <InputGroup label="Adição" placeholder="+2.00" value={values.ad} onChange={(e) => onChange('adicao', e.target.value)} />
        <InputGroup label="DNP" placeholder="31.5" value={values.dnp} onChange={(e) => onChange('dnp', e.target.value)} />
      </div>
    </div>
  );
}

function InputGroup({ label, icon, placeholder, value, onChange }: { label: string, icon?: React.ReactNode, placeholder?: string, value?: string, onChange?: (e: any) => void }) {
  return (
    <div className="space-y-2 flex-1">
      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20">
            {icon}
          </div>
        )}
        <input 
          type="text" 
          placeholder={placeholder}
          className={`w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors ${icon ? 'pl-10' : 'pl-4'}`}
          value={value}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

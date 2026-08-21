import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '../Button/Button';
import { pacientesService, Paciente } from '../../services/pacientesService';
import { documentosService, TipoDocumento, DocumentoModelo, PacienteDocumentoEmitido } from '../../services/documentosService';
import { useAuth } from '../../hooks/useAuth';
import { FormReceita } from './FormReceita';
import { FormLaudo } from './FormLaudo';
import { 
  MdClose, MdSend, MdArrowBack, MdArrowForward, MdPrint, MdCheckCircle,
  MdFormatBold, MdFormatItalic, MdFormatUnderlined, MdFormatAlignLeft, 
  MdFormatAlignCenter, MdFormatAlignRight, MdFormatAlignJustify, MdList, 
  MdFormatListNumbered, MdGridOn, MdDescription, MdContentCopy, MdReceiptLong 
} from 'react-icons/md';
import './ModalEmissao.css';

import { configuracoesService } from '../../services/configuracoesService';

interface ModalEmissaoProps {
  onClose: () => void;
  onEmissaoSucesso: () => void;
  documentoExistente?: PacienteDocumentoEmitido | null;
}

// ── Helpers de busca por prefixo ─────────────────────────────────────
function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function filtrarPacientesPorPrefixo(pacientes: Paciente[], termo: string): Paciente[] {
  const q = normalizar(termo);
  if (!q) return [];
  return pacientes.filter((p) => {
    const nome = normalizar(p.nome);
    return nome.startsWith(q) || nome.split(/\s+/).some((palavra) => palavra.startsWith(q));
  });
}

export function ModalEmissao({ onClose, onEmissaoSucesso, documentoExistente }: ModalEmissaoProps) {
  const { usuario } = useAuth();
  
  // Logotipo da Clínica
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoTimestamp, setLogoTimestamp] = useState<string>('');

  // Passo 1: Seleção de Paciente e Modelo
  const [todosPacientes, setTodosPacientes] = useState<Paciente[]>([]);
  const [buscaPaciente, setBuscaPaciente] = useState('');
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(
    documentoExistente?.paciente ? (documentoExistente.paciente as any) : null
  );
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('RECEITA');
  const [modelos, setModelos] = useState<DocumentoModelo[]>([]);
  const [modeloSelecionado, setModeloSelecionado] = useState<DocumentoModelo | null>(null);
  
  // Passo 2: Formulário Clínico (FormReceita ou FormLaudo)
  // Passo 3: Pré-visualização e Edição do HTML Final (Revisão Visual WYSIWYG)
  const [conteudoFinalHtml, setConteudoFinalHtml] = useState('');
  const [dadosEstruturadosJson, setDadosEstruturadosJson] = useState<any>({});
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  
  // Impressão isolada, formatos e confirmação
  type FormatoImpressao = 'a4' | 'a5' | 'bobina';
  const [formatoImpressao, setFormatoImpressao] = useState<FormatoImpressao>('a4');
  const [documentoEmitidoSucesso, setDocumentoEmitidoSucesso] = useState<PacienteDocumentoEmitido | null>(
    documentoExistente || null
  );
  const [modoImpressao, setModoImpressao] = useState<boolean>(!!documentoExistente);
  const editorRef = useRef<HTMLDivElement>(null);

  const handleImprimirFormato = (formato?: FormatoImpressao) => {
    if (formato) {
      setFormatoImpressao(formato);
    }
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Carrega configurações da clínica para obter a logoUrl
  useEffect(() => {
    async function carregarLogoClinica() {
      try {
        const res = await configuracoesService.obterConfiguracoes();
        if (res.sucesso && res.dados?.logoUrl) {
          setLogoUrl(res.dados.logoUrl);
          // cache-bust: versiona a URL da logo com o timestamp de atualização
          setLogoTimestamp(res.dados.atualizadoEm ?? String(Date.now()));
        }
      } catch (e) {
        console.warn('Não foi possível carregar o logotipo da clínica:', e);
      }
    }
    carregarLogoClinica();
  }, []);

  const logoSrc = logoUrl
    ? `${logoUrl}?v=${logoTimestamp}`
    : undefined;

  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [loadingEmissao, setLoadingEmissao] = useState(false);
  
  const [erro, setErro] = useState('');
  const [sucessoMsg, setSucessoMsg] = useState('');

  // Sincroniza o editorRef com o conteudoFinalHtml quando o passo 3 for aberto
  useEffect(() => {
    if (passo === 3 && editorRef.current && conteudoFinalHtml) {
      if (editorRef.current.innerHTML !== conteudoFinalHtml) {
        editorRef.current.innerHTML = conteudoFinalHtml;
      }
    }
  }, [passo, conteudoFinalHtml]);

  // Carrega TODOS os pacientes uma única vez com debounce de 300ms
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      setLoadingPacientes(true);
      try {
        const res = await pacientesService.listarPacientes('');
        if (res.sucesso && res.dados) {
          setTodosPacientes(res.dados);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingPacientes(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, []);

  // Filtragem front-end por prefixo (não chama a API a cada tecla)
  const pacientesFiltrados = useMemo(
    () => filtrarPacientesPorPrefixo(todosPacientes, buscaPaciente),
    [todosPacientes, buscaPaciente]
  );

  // Carregar modelos de documentos da clínica
  useEffect(() => {
    const carregarModelos = async () => {
      setLoadingModelos(true);
      try {
        const res = await documentosService.listarModelos();
        if (res.sucesso && res.dados) {
          const filtrados = res.dados.filter(m => m.tipo === tipoDocumento);
          setModelos(filtrados);
          setModeloSelecionado(filtrados[0] || null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingModelos(false);
      }
    };

    carregarModelos();
  }, [tipoDocumento]);

  const handleAvancar = () => {
    setErro('');
    if (!pacienteSelecionado) {
      setErro('Por favor, selecione um paciente para o documento');
      return;
    }

    // Se for Receita ou Laudo, avança para o preenchimento clínico (Passo 2)
    if (tipoDocumento === 'RECEITA' || tipoDocumento === 'LAUDO') {
      setPasso(2);
      return;
    }

    // Para outros documentos (Atestado, Encaminhamento, Declaração), vai direto para a Revisão (Passo 3)
    let templateOriginal = '';
    if (modeloSelecionado) {
      templateOriginal = modeloSelecionado.conteudoHtml;
    } else {
      templateOriginal = `<div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; padding: 20px;">
  <h2 style="text-align: center; color: #00A8CC;">DOCUMENTO CLÍNICO</h2>
  <p><strong>Paciente:</strong> {{nome_paciente}}</p>
  <p><strong>Data:</strong> {{data_hoje}}</p>
  <p>Escreva o conteúdo clínico aqui...</p>
</div>`;
    }

    let htmlPreenchido = templateOriginal;
    
    const dadosSubstituicao = {
      nome_paciente: pacienteSelecionado.nome,
      cpf_paciente: pacienteSelecionado.cpf || '',
      data_nascimento: pacienteSelecionado.dataNascimento ? new Date(pacienteSelecionado.dataNascimento).toLocaleDateString('pt-BR') : '',
      idade: pacienteSelecionado.dataNascimento ? calcularIdade(pacienteSelecionado.dataNascimento) : '',
      data_hoje: new Date().toLocaleDateString('pt-BR'),
      clinica_nome: usuario?.clinicaNome || '',
      optometrista_nome: usuario?.nome || ''
    };

    for (const [chave, valor] of Object.entries(dadosSubstituicao)) {
      const regex = new RegExp(`{{\\s*${chave}\\s*}}`, 'gi');
      htmlPreenchido = htmlPreenchido.replace(regex, valor);
    }

    setConteudoFinalHtml(htmlPreenchido);
    setDadosEstruturadosJson({});
    setPasso(3);
  };

  const calcularIdade = (dataNascStr: string): string => {
    const dataNasc = new Date(dataNascStr);
    const hoje = new Date();
    let idade = hoje.getFullYear() - dataNasc.getFullYear();
    const mes = hoje.getMonth() - dataNasc.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < dataNasc.getDate())) {
      idade--;
    }
    return `${idade} anos`;
  };

  // Recebe dados estruturados e HTML gerado do FormReceita ou FormLaudo
  const handleFormClinicoEmitir = (dadosEstruturados: any, htmlGerado: string) => {
    let htmlPreenchido = htmlGerado;
    const dadosSubstituicao = {
      nome_paciente: pacienteSelecionado!.nome,
      cpf_paciente: pacienteSelecionado!.cpf || '',
      data_nascimento: pacienteSelecionado!.dataNascimento ? new Date(pacienteSelecionado!.dataNascimento).toLocaleDateString('pt-BR') : '',
      idade: pacienteSelecionado!.dataNascimento ? calcularIdade(pacienteSelecionado!.dataNascimento) : '',
      data_hoje: new Date().toLocaleDateString('pt-BR'),
      clinica_nome: usuario?.clinicaNome || '',
      optometrista_nome: usuario?.nome || ''
    };

    for (const [chave, valor] of Object.entries(dadosSubstituicao)) {
      const regex = new RegExp(`{{\\s*${chave}\\s*}}`, 'gi');
      htmlPreenchido = htmlPreenchido.replace(regex, valor);
    }

    setConteudoFinalHtml(htmlPreenchido);
    setDadosEstruturadosJson(dadosEstruturados);
    setPasso(3);
  };

  const aplicarFormatacao = (comando: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(comando, false, undefined);
      setConteudoFinalHtml(editorRef.current.innerHTML);
    }
  };

  const inserirTabela = () => {
    const tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Parâmetro</th>
          <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Olho Direito (OD)</th>
          <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Olho Esquerdo (OE)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">Esférico</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">+0.00</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">+0.00</td>
        </tr>
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">Cilíndrico</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">-0.00</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">-0.00</td>
        </tr>
      </tbody>
    </table><p></p>`;
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertHTML', false, tableHtml);
      setConteudoFinalHtml(editorRef.current.innerHTML);
    }
  };

  const handleVoltarRevisao = () => {
    if (tipoDocumento === 'RECEITA' || tipoDocumento === 'LAUDO') {
      setPasso(2);
    } else {
      setPasso(1);
    }
  };

  const handleEmitir = async () => {
    setErro('');
    setSucessoMsg('');
    setLoadingEmissao(true);

    try {
      const res = await documentosService.emitirDocumento({
        pacienteId: pacienteSelecionado!.id,
        modeloId: modeloSelecionado?.id || null,
        tipo: tipoDocumento,
        conteudoFinalHtml,
        dadosEstruturadosJson
      });

      if (res.sucesso && res.dados) {
        setSucessoMsg('Documento emitido com sucesso e gravado no cadastro do paciente!');
        setDocumentoEmitidoSucesso(res.dados);
        setModoImpressao(true);
        setTimeout(() => {
          window.print();
        }, 500);
      }
    } catch (e: any) {
      setErro(e.response?.data?.mensagem || 'Erro ao registrar emissão do documento');
    } finally {
      setLoadingEmissao(false);
    }
  };

  return (
    <div className="modal-emissao-backdrop">
      <div className="modal-emissao animate-scaleUp">
        <div className="modal-emissao__header">
          <h3 className="modal-emissao__titulo">
            {passo === 1 
              ? 'Nova Emissão de Documento Clínico' 
              : passo === 2 
                ? `Formulário de ${tipoDocumento === 'RECEITA' ? 'Receita' : 'Laudo'}`
                : modoImpressao
                  ? 'Documento Emitido — Impressão / PDF'
                  : 'Revisão do Documento Clínico'}
          </h3>
          <button className="modal-emissao__close-btn" onClick={onClose} aria-label="Fechar">
            <MdClose />
          </button>
        </div>

        {erro && <div className="modal-emissao__alerta modal-emissao__alerta--erro">{erro}</div>}
        {sucessoMsg && <div className="modal-emissao__alerta modal-emissao__alerta--sucesso">{sucessoMsg}</div>}

        <div className="modal-emissao__body">
          {modoImpressao && documentoEmitidoSucesso ? (
            /* TELA DE CONFIRMAÇÃO E FOLHA TIMBRADA ISOLADA PARA IMPRESSÃO */
            <div className="emissao-concluida-tela animate-fadeIn">
              <div className="emissao-concluida-header no-print">
                <MdCheckCircle className="emissao-sucesso-icon" />
                <h4>Documento Registrado e Emitido!</h4>
                <p>O registro foi arquivado com sucesso no prontuário de <strong>{pacienteSelecionado?.nome}</strong>.</p>
                
                {/* SELETOR DE FORMATOS DE IMPRESSÃO */}
                <div className="seletor-impressao-container no-print">
                  <div className="seletor-impressao__titulo">
                    <MdPrint style={{ color: '#00A8CC', fontSize: '18px' }} />
                    <span>Selecione o Formato de Impressão</span>
                  </div>
                  <div className="seletor-impressao__grid">
                    <button
                      type="button"
                      className={`formato-card-btn ${formatoImpressao === 'a4' ? 'formato-card-btn--ativo' : ''}`}
                      onClick={() => setFormatoImpressao('a4')}
                    >
                      <span className="formato-card-btn__icon"><MdDescription /></span>
                      <div className="formato-card-btn__info">
                        <span className="formato-card-btn__nome">A4 Tradicional</span>
                        <span className="formato-card-btn__desc">Folha inteira (Padrão)</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`formato-card-btn ${formatoImpressao === 'a5' ? 'formato-card-btn--ativo' : ''}`}
                      onClick={() => setFormatoImpressao('a5')}
                    >
                      <span className="formato-card-btn__icon"><MdContentCopy /></span>
                      <div className="formato-card-btn__info">
                        <span className="formato-card-btn__nome">A5 / Meia Folha</span>
                        <span className="formato-card-btn__desc">Formato compacto</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`formato-card-btn ${formatoImpressao === 'bobina' ? 'formato-card-btn--ativo' : ''}`}
                      onClick={() => setFormatoImpressao('bobina')}
                    >
                      <span className="formato-card-btn__icon"><MdReceiptLong /></span>
                      <div className="formato-card-btn__info">
                        <span className="formato-card-btn__nome">Bobina Térmica</span>
                        <span className="formato-card-btn__desc">Estreito (80mm / 58mm)</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="emissao-concluida-acoes">
                  <Button 
                    variante="secundario" 
                    icone={<MdPrint />} 
                    onClick={() => handleImprimirFormato()}
                  >
                    Imprimir ({formatoImpressao === 'a4' ? 'A4' : formatoImpressao === 'a5' ? 'A5' : 'Bobina'})
                  </Button>
                  <Button variante="primario" onClick={onEmissaoSucesso}>
                    Concluir e Voltar ao Prontuário
                  </Button>
                </div>
              </div>

              {/* Folha Timbrada Pronta para @media print */}
              <div className={`folha-timbrada-modal folha-timbrada--${formatoImpressao}`}>
                <header className="folha-timbrada__cabecalho">
                  <div className="folha-timbrada__logo">
                    {logoSrc ? (
                      <img src={logoSrc} alt={usuario?.clinicaNome || 'Logo'} style={{ maxHeight: '60px', objectFit: 'contain' }} />
                    ) : (
                      <>
                        <h2>{usuario?.clinicaNome || 'CTRL VISION'}</h2>
                        <p>Clínica de Saúde Ocular Integrada</p>
                      </>
                    )}
                  </div>
                  <div className="folha-timbrada__clinica-dados">
                    <p>Profissional: {usuario?.nome || 'Optometrista Responsável'}</p>
                    <p>Data de Emissão: {new Date(documentoEmitidoSucesso.criadoEm || new Date()).toLocaleDateString('pt-BR')}</p>
                  </div>
                </header>

                <main className="folha-timbrada__conteudo">
                  <div
                    className="folha-timbrada__corpo-renderizado"
                    dangerouslySetInnerHTML={{ __html: documentoEmitidoSucesso.conteudoFinalHtml }}
                  />
                  <div className="folha-timbrada__aviso-legal no-print">
                    <p>Documento assinado digitalmente e registrado no prontuário eletrônico do paciente em conformidade com as diretrizes da LGPD.</p>
                  </div>
                </main>

                <footer className="folha-timbrada__rodape">
                  <div className="folha-timbrada__assinatura-linha" />
                  <p>Assinatura do Profissional Responsável</p>
                  {documentoEmitidoSucesso.tokenAutenticidadeUuid && (
                    <div className="folha-timbrada__autenticidade">
                      <span>Chave de Autenticidade: {documentoEmitidoSucesso.tokenAutenticidadeUuid}</span>
                    </div>
                  )}
                </footer>
              </div>
            </div>
          ) : (
            <>
              {passo === 1 && (
                /* PASSO 1: SELEÇÃO */
                <div className="emissao-step-1">
                  <div className="form-field select-field">
                    <label className="form-label" htmlFor="tipo-doc-select">1. Tipo de Documento</label>
                    <select
                      id="tipo-doc-select"
                      value={tipoDocumento}
                      onChange={(e) => setTipoDocumento(e.target.value as TipoDocumento)}
                      className="form-input form-input--large"
                    >
                      <option value="RECEITA">Receita / Prescrição de Óculos</option>
                      <option value="LAUDO">Laudo Optométrico</option>
                      <option value="ATESTADO">Atestado de Comparecimento</option>
                      <option value="ENCAMINHAMENTO">Encaminhamento Clínico</option>
                      <option value="DECLARACAO">Declaração Escolar</option>
                    </select>
                  </div>

                  <div className="form-field text-field">
                    <label className="form-label" htmlFor="paciente-search-input">2. Selecione o Paciente</label>
                    <input
                      id="paciente-search-input"
                      type="text"
                      placeholder="Busque por nome (ex: Wesley)..."
                      value={buscaPaciente}
                      onChange={(e) => {
                        setBuscaPaciente(e.target.value);
                        setPacienteSelecionado(null); // limpa seleção ao digitar
                      }}
                      className="form-input form-input--large"
                      autoComplete="off"
                    />
                    
                    {pacienteSelecionado && (
                      <div className="paciente-selecionado-badge">
                        ✅ <strong>{pacienteSelecionado.nome}</strong>
                        {pacienteSelecionado.cpf && <span> — CPF: {pacienteSelecionado.cpf}</span>}
                      </div>
                    )}

                    <div className="pacientes-lista">
                      {loadingPacientes ? (
                        <div className="pacientes-lista__status">Buscando pacientes...</div>
                      ) : buscaPaciente.trim().length > 0 ? (
                        pacientesFiltrados.length > 0 ? (
                          pacientesFiltrados.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setPacienteSelecionado(p);
                                setBuscaPaciente(p.nome);
                              }}
                              className={`paciente-card-btn ${pacienteSelecionado?.id === p.id ? 'paciente-card-btn--ativo' : ''}`}
                            >
                              <span className="paciente-card-btn__nome">{p.nome}</span>
                              {p.cpf && <span className="paciente-card-btn__cpf">CPF: {p.cpf}</span>}
                            </button>
                          ))
                        ) : (
                          <div className="pacientes-lista__status">Nenhum paciente encontrado com "{buscaPaciente}".</div>
                        )
                      ) : (
                        <div className="pacientes-lista__status">Digite para buscar um paciente pelo nome.</div>
                      )}
                    </div>
                  </div>

                  <div className="form-field select-field">
                    <label className="form-label" htmlFor="modelo-doc-select">3. Selecione o Modelo (Opcional)</label>
                    {loadingModelos ? (
                      <div className="form-input">Carregando templates...</div>
                    ) : (
                      <select
                        id="modelo-doc-select"
                        value={modeloSelecionado?.id || ''}
                        onChange={(e) => {
                          const id = Number(e.target.value);
                          const mod = modelos.find(m => m.id === id);
                          setModeloSelecionado(mod || null);
                        }}
                        className="form-input form-input--large"
                      >
                        {modelos.length > 0 ? (
                          modelos.map(m => (
                            <option key={m.id} value={m.id}>{m.titulo}</option>
                          ))
                        ) : (
                          <option value="">Nenhum modelo cadastrado (Usar template em branco)</option>
                        )}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {passo === 2 && (
                /* PASSO 2: FORMULÁRIOS CLÍNICOS E TÁTEIS */
                <div className="emissao-step-form-clinico">
                  {tipoDocumento === 'RECEITA' ? (
                    <FormReceita
                      pacienteId={pacienteSelecionado!.id}
                      onEmitir={handleFormClinicoEmitir}
                      onCancelar={() => setPasso(1)}
                      loading={loadingEmissao}
                    />
                  ) : (
                    <FormLaudo
                      pacienteId={pacienteSelecionado!.id}
                      onEmitir={handleFormClinicoEmitir}
                      onCancelar={() => setPasso(1)}
                      loading={loadingEmissao}
                    />
                  )}
                </div>
              )}

              {passo === 3 && (
                /* PASSO 3: REVISÃO WYSIWYG */
                <div className="emissao-step-revisao">
                  <div className="editor-toolbar no-print">
                    <button type="button" onClick={() => aplicarFormatacao('bold')} title="Negrito" aria-label="Negrito"><MdFormatBold /></button>
                    <button type="button" onClick={() => aplicarFormatacao('italic')} title="Itálico" aria-label="Itálico"><MdFormatItalic /></button>
                    <button type="button" onClick={() => aplicarFormatacao('underline')} title="Sublinhado" aria-label="Sublinhado"><MdFormatUnderlined /></button>
                    <span className="editor-toolbar__separator" />
                    <button type="button" onClick={() => aplicarFormatacao('justifyLeft')} title="Alinhar à esquerda" aria-label="Alinhar à esquerda"><MdFormatAlignLeft /></button>
                    <button type="button" onClick={() => aplicarFormatacao('justifyCenter')} title="Centralizar" aria-label="Centralizar"><MdFormatAlignCenter /></button>
                    <button type="button" onClick={() => aplicarFormatacao('justifyRight')} title="Alinhar à direita" aria-label="Alinhar à direita"><MdFormatAlignRight /></button>
                    <button type="button" onClick={() => aplicarFormatacao('justifyFull')} title="Justificar" aria-label="Justificar"><MdFormatAlignJustify /></button>
                    <span className="editor-toolbar__separator" />
                    <button type="button" onClick={() => aplicarFormatacao('insertUnorderedList')} title="Lista" aria-label="Lista"><MdList /></button>
                    <button type="button" onClick={() => aplicarFormatacao('insertOrderedList')} title="Lista numerada" aria-label="Lista numerada"><MdFormatListNumbered /></button>
                    <button type="button" onClick={inserirTabela} title="Inserir tabela" aria-label="Inserir tabela"><MdGridOn /></button>
                  </div>

                  <div
                    ref={editorRef}
                    contentEditable={true}
                    suppressContentEditableWarning
                    className="editor-wysiwyg"
                    onInput={() => {
                      if (editorRef.current) {
                        setConteudoFinalHtml(editorRef.current.innerHTML);
                      }
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer de Ações por Passo */}
        {!modoImpressao && (
          <div className="modal-emissao__footer no-print">
            {passo === 1 && (
              <>
                <Button variante="secundario" onClick={onClose}>Cancelar</Button>
                <Button variante="primario" icone={<MdArrowForward />} onClick={handleAvancar} disabled={!pacienteSelecionado}>
                  Avançar
                </Button>
              </>
            )}
            {passo === 3 && (
              <>
                <Button variante="secundario" icone={<MdArrowBack />} onClick={handleVoltarRevisao}>Voltar</Button>
                <Button variante="primario" icone={<MdSend />} onClick={handleEmitir} carregando={loadingEmissao}>
                  Emitir Documento
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

-- ====================================================
-- BANCO DE DADOS: ÓTICA LIS — NEON POSTGRESQL CONSOLIDADO
-- ====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Função trigger de atualização automática de timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. TENANTS (MULTI-EMPRESA / LOJAS)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir Tenant padrão
INSERT INTO tenants (id, nome)
VALUES ('00000000-0000-0000-0000-000000000000', 'Ótica Lis (Matriz)')
ON CONFLICT (id) DO NOTHING;

-- 2. USUÁRIOS (SUBSTITUI SUPABASE AUTH)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CONFIGURAÇÕES FISCAIS
CREATE TABLE IF NOT EXISTS configuracoes_fiscais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id),
    cnpj VARCHAR(18),
    razao_social VARCHAR(150),
    nome_fantasia VARCHAR(150),
    inscricao_estadual VARCHAR(30),
    regime_tributario VARCHAR(20) DEFAULT 'SIMPLES_NACIONAL',
    ambiente VARCHAR(20) DEFAULT 'HOMOLOGACAO',
    serie_nfe INTEGER DEFAULT 1,
    ultimo_numero_nfe INTEGER DEFAULT 0,
    serie_nfce INTEGER DEFAULT 1,
    ultimo_numero_nfce INTEGER DEFAULT 0,
    csc VARCHAR(100),
    csc_id VARCHAR(10),
    certificado_a1 BYTEA,
    certificado_senha VARCHAR(100),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CATEGORIAS
CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id),
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'PRODUTO', 'DESPESA', 'RECEITA'
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO categorias (tenant_id, nome, tipo) VALUES
('00000000-0000-0000-0000-000000000000', 'Óculos de grau', 'PRODUTO'),
('00000000-0000-0000-0000-000000000000', 'Lentes (de grau)', 'PRODUTO'),
('00000000-0000-0000-0000-000000000000', 'Óculos de sol', 'PRODUTO'),
('00000000-0000-0000-0000-000000000000', 'Lentes de contato', 'PRODUTO'),
('00000000-0000-0000-0000-000000000000', 'Serviços', 'PRODUTO'),
('00000000-0000-0000-0000-000000000000', 'Aluguel', 'DESPESA'),
('00000000-0000-0000-0000-000000000000', 'Energia', 'DESPESA'),
('00000000-0000-0000-0000-000000000000', 'Internet', 'DESPESA'),
('00000000-0000-0000-0000-000000000000', 'Salários', 'DESPESA'),
('00000000-0000-0000-0000-000000000000', 'Fornecedor', 'DESPESA'),
('00000000-0000-0000-0000-000000000000', 'Outras Despesas', 'DESPESA'),
('00000000-0000-0000-0000-000000000000', 'Receita Avulsa', 'RECEITA')
ON CONFLICT DO NOTHING;

-- 5. PRODUTOS / ESTOQUE
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id),
    codigo_barras VARCHAR(50),
    referencia VARCHAR(50),
    nome VARCHAR(150) NOT NULL,
    categoria_id UUID REFERENCES categorias(id),
    tipo VARCHAR(50) DEFAULT 'ARMAÇÃO',
    marca VARCHAR(100),
    modelo VARCHAR(100),
    cor VARCHAR(50),
    preco_custo DECIMAL(10,2) DEFAULT 0,
    preco_venda DECIMAL(10,2) NOT NULL DEFAULT 0,
    estoque_atual INTEGER DEFAULT 0,
    estoque_minimo INTEGER DEFAULT 2,
    ncm VARCHAR(10) DEFAULT '9003.11.00',
    cest VARCHAR(10),
    cfop_padrao VARCHAR(4) DEFAULT '5102',
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. CLIENTES (BASE UNIFICADA ERP + CRM)
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id),
    nome_completo VARCHAR(150) NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    rg VARCHAR(20),
    tipo_pessoa VARCHAR(2) DEFAULT 'PF' CHECK (tipo_pessoa IN ('PF', 'PJ')),
    cnpj VARCHAR(18),
    razao_social VARCHAR(150),
    data_nascimento DATE,
    whatsapp VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    -- Endereço
    cep VARCHAR(9) DEFAULT '00000000',
    logradouro VARCHAR(150),
    numero VARCHAR(20),
    complemento VARCHAR(50),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    -- Score & Fidelidade
    lis_score INTEGER DEFAULT 850,
    limite_credito DECIMAL(10,2) DEFAULT 0,
    -- CRM & Consentimento
    canal_origem VARCHAR(50) DEFAULT 'loja_fisica',
    temperatura VARCHAR(20) DEFAULT 'frio',
    consentimento_marketing BOOLEAN DEFAULT TRUE,
    tipo VARCHAR(20) DEFAULT 'cliente',
    status_crm VARCHAR(20) DEFAULT 'ativo',
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp ON clientes(whatsapp);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome_completo);

-- 7. CAIXAS
CREATE TABLE IF NOT EXISTS caixas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id),
    data_abertura TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_fechamento TIMESTAMP WITH TIME ZONE,
    usuario_abertura_id UUID,
    usuario_fechamento_id UUID,
    valor_inicial DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_informado_fechamento DECIMAL(10,2),
    saldo_esperado DECIMAL(10,2),
    diferenca DECIMAL(10,2),
    status VARCHAR(20) NOT NULL DEFAULT 'ABERTO' -- 'ABERTO', 'FECHADO'
);

-- 8. VENDAS
CREATE TABLE IF NOT EXISTS vendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id),
    os_number VARCHAR(50),
    caixa_id UUID REFERENCES caixas(id),
    cliente_id UUID REFERENCES clientes(id),
    usuario_id UUID,
    data_venda TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    valor_bruto DECIMAL(10,2) NOT NULL DEFAULT 0,
    desconto DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_liquido DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'CONCLUIDA',
    metadata JSONB DEFAULT '{}'::jsonb,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. PAGAMENTOS_VENDA
CREATE TABLE IF NOT EXISTS pagamentos_venda (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id),
    venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    forma_pagamento VARCHAR(50) NOT NULL,
    valor DECIMAL(10,2) NOT NULL DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. ITENS_VENDA
CREATE TABLE IF NOT EXISTS itens_venda (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id),
    venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    categoria_id UUID REFERENCES categorias(id),
    produto_id UUID REFERENCES produtos(id),
    descricao VARCHAR(255) NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1,
    valor_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. MOVIMENTOS_CAIXA
CREATE TABLE IF NOT EXISTS movimentos_caixa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id),
    caixa_id UUID REFERENCES caixas(id),
    tipo VARCHAR(50) NOT NULL, -- 'SANGRIA', 'SUPRIMENTO', 'DESPESA'
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10,2) NOT NULL DEFAULT 0,
    data_movimento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    usuario_id UUID,
    categoria_id UUID REFERENCES categorias(id),
    forma_pagamento VARCHAR(50) NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. AGENDAMENTOS (EXAMES DE VISTA)
CREATE TABLE IF NOT EXISTS agendamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    paciente_nome VARCHAR(150),
    paciente_cpf VARCHAR(20),
    paciente_whatsapp VARCHAR(30),
    telefone VARCHAR(30),
    data DATE NOT NULL,
    horario TIME NOT NULL,
    tipo VARCHAR(50) DEFAULT 'CONSULTA',
    status VARCHAR(30) NOT NULL DEFAULT 'AGENDADO',
    observacao TEXT,
    origem VARCHAR(50) DEFAULT 'balcao',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data);

-- 13. AGENDAMENTO_EVENTOS (AUDITORIA / HISTÓRICO)
CREATE TABLE IF NOT EXISTS agendamento_eventos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id),
    agendamento_id UUID REFERENCES agendamentos(id) ON DELETE CASCADE,
    status_anterior VARCHAR(30),
    status_novo VARCHAR(30) NOT NULL,
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. FICHAS MÉDICAS (PRONTUÁRIOS)
CREATE TABLE IF NOT EXISTS fichas_medicas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    loja_id VARCHAR(50) NOT NULL DEFAULT 'loja_principal',
    nome VARCHAR(150),
    telefone VARCHAR(30),
    cpf VARCHAR(20),
    genero VARCHAR(20),
    data_nascimento DATE,
    motivo_consulta TEXT,
    atendido_por VARCHAR(100) NOT NULL,
    data_exame DATE NOT NULL,
    validade_receita DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizada')),
    finalizada_em TIMESTAMP WITH TIME ZONE,
    assinatura_hash TEXT,
    ficha_pai_id UUID REFERENCES fichas_medicas(id) ON DELETE SET NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'original' CHECK (tipo IN ('original', 'retificacao')),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. REFRAÇÕES
CREATE TABLE IF NOT EXISTS refracoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ficha_id UUID NOT NULL REFERENCES fichas_medicas(id) ON DELETE CASCADE,
    olho VARCHAR(2) NOT NULL CHECK (olho IN ('OD', 'OE')),
    esferico DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    cilindrico DECIMAL(4,2) DEFAULT 0.00,
    eixo INTEGER DEFAULT 0 CHECK (eixo >= 0 AND eixo <= 180),
    adicao DECIMAL(4,2) DEFAULT NULL,
    dnp DECIMAL(4,1) DEFAULT NULL,
    altura DECIMAL(4,1) DEFAULT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_ficha_olho UNIQUE (ficha_id, olho)
);

-- 16. AUDIT LOG FICHAS
CREATE TABLE IF NOT EXISTS fichas_medicas_acesso_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ficha_id UUID REFERENCES fichas_medicas(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    loja_id VARCHAR(50) DEFAULT 'loja_principal',
    usuario_id VARCHAR(100),
    usuario_nome VARCHAR(150),
    acao VARCHAR(40) NOT NULL,
    detalhes TEXT,
    ip_address VARCHAR(45),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. CRM FUNIS E ETAPAS
CREATE TABLE IF NOT EXISTS crm_funis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id),
    nome VARCHAR(100) NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    descricao TEXT,
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uk_crm_funis_tenant_codigo UNIQUE (tenant_id, codigo)
);

CREATE TABLE IF NOT EXISTS crm_etapas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id),
    funil_id UUID NOT NULL REFERENCES crm_funis(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    tipo VARCHAR(20) DEFAULT 'normal' CHECK (tipo IN ('normal', 'orcamento', 'ganho', 'perdido')),
    alerta_dias_parado INTEGER DEFAULT 0,
    cor VARCHAR(30) DEFAULT '#3B82F6',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. CRM LEADS
CREATE TABLE IF NOT EXISTS crm_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id),
    funil_id UUID NOT NULL REFERENCES crm_funis(id) ON DELETE RESTRICT,
    etapa_id UUID NOT NULL REFERENCES crm_etapas(id) ON DELETE RESTRICT,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    empresa_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    titulo VARCHAR(150) NOT NULL,
    origem VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
    origem_detalhe TEXT,
    valor_estimado DECIMAL(12,2) DEFAULT 0.00,
    responsavel_id UUID,
    responsavel_nome VARCHAR(100) DEFAULT 'Vendedor',
    motivo_perda VARCHAR(50),
    motivo_perda_detalhe TEXT,
    venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
    cotacao_id UUID,
    nfe_id UUID,
    tipo_lente_interesse VARCHAR(100),
    ja_usa_oculos BOOLEAN DEFAULT false,
    convenio VARCHAR(100),
    grau_aproximado VARCHAR(100),
    interesse VARCHAR(100),
    forma_pagamento VARCHAR(100),
    campos_customizados JSONB DEFAULT '{}'::jsonb,
    entrou_etapa_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. CRM EVENTOS E TAREFAS
CREATE TABLE IF NOT EXISTS crm_lead_eventos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id),
    lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    de_etapa_id UUID REFERENCES crm_etapas(id) ON DELETE SET NULL,
    para_etapa_id UUID REFERENCES crm_etapas(id) ON DELETE SET NULL,
    titulo VARCHAR(150) NOT NULL,
    conteudo TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    por_usuario_id UUID,
    por_usuario_nome VARCHAR(100) DEFAULT 'Operador',
    em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_tarefas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id),
    lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(30) NOT NULL DEFAULT 'whatsapp',
    prazo_em TIMESTAMP WITH TIME ZONE NOT NULL,
    responsavel_id UUID,
    responsavel_nome VARCHAR(100) DEFAULT 'Operador',
    concluida BOOLEAN DEFAULT false,
    concluida_em TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_followup_fila (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id),
    lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
    etapa_id UUID REFERENCES crm_etapas(id) ON DELETE CASCADE,
    agendado_para TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente',
    tentativas INTEGER DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. CAMPANHAS, SEGMENTOS E SUPRESSÃO
CREATE TABLE IF NOT EXISTS segmentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    filtros JSONB NOT NULL DEFAULT '{}'::jsonb,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campanhas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id),
    nome VARCHAR(150) NOT NULL,
    canal VARCHAR(50) DEFAULT 'whatsapp',
    mensagem_template TEXT NOT NULL,
    segmento_id UUID REFERENCES segmentos(id),
    status VARCHAR(30) DEFAULT 'rascunho',
    total_destinatarios INTEGER DEFAULT 0,
    total_enviados INTEGER DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campanha_disparos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campanha_id UUID REFERENCES campanhas(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    telefone VARCHAR(30) NOT NULL,
    mensagem TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'pendente',
    enviado_em TIMESTAMP WITH TIME ZONE,
    resposta_em TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lista_supressao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES tenants(id),
    whatsapp VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    motivo VARCHAR(100) DEFAULT 'Descadastro voluntário (PARE)',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. VIEW DE MÉTRICAS CRM / SEGMENTOS
CREATE OR REPLACE VIEW v_clientes_metricas AS
SELECT 
  c.id AS cliente_id,
  c.tenant_id,
  c.nome_completo AS nome,
  c.whatsapp,
  c.email,
  c.canal_origem,
  c.tipo,
  c.status_crm,
  c.consentimento_marketing,
  c.criado_em,
  EXISTS (
    SELECT 1 FROM lista_supressao s 
    WHERE s.tenant_id = c.tenant_id 
      AND (s.whatsapp = '55' || c.whatsapp || '@c.us' OR s.whatsapp = c.whatsapp OR (c.email IS NOT NULL AND s.email = c.email))
  ) OR (c.status_crm = 'suprimido') AS esta_suprimido,
  EXTRACT(YEAR FROM age(CURRENT_DATE, c.data_nascimento))::INTEGER AS idade,
  (EXTRACT(MONTH FROM c.data_nascimento) = EXTRACT(MONTH FROM CURRENT_DATE)) AS aniversariante_mes,
  (CURRENT_DATE - MAX(v.criado_em)::date)::INTEGER AS dias_ultima_compra,
  COUNT(v.id)::INTEGER AS total_compras,
  COALESCE(SUM(v.valor_liquido), 0)::NUMERIC AS ltv
FROM clientes c
LEFT JOIN vendas v ON v.cliente_id = c.id
GROUP BY c.id;

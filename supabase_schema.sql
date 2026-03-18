-- Ótica Lis ERP - Supabase Schema (Fase 1)

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA: configuracoes_fiscais
-- Armazena configurações padrão de impostos para a SEFAZ-GO
CREATE TABLE IF NOT EXISTS configuracoes_fiscais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_produto VARCHAR(50) NOT NULL, -- ex: 'ARMACAO', 'LENTE_CONTATO', 'LENTE_OFTALMICA'
    ncm VARCHAR(8) NOT NULL,
    cest VARCHAR(7),
    cfop_interno VARCHAR(4) NOT NULL,
    cfop_externo VARCHAR(4) NOT NULL,
    aliquota_icms DECIMAL(5,2) DEFAULT 17.00, -- GO padrão
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA: produtos
-- Cadastro de Armações e Lentes (Estoque Fiscal)
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_barras VARCHAR(50) UNIQUE,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'ARMACAO', 'LENTE', 'ACESSORIO'
    marca VARCHAR(50),
    modelo VARCHAR(50),
    cor VARCHAR(30),
    preco_custo DECIMAL(10,2) NOT NULL DEFAULT 0,
    preco_venda DECIMAL(10,2) NOT NULL DEFAULT 0,
    estoque_atual INTEGER NOT NULL DEFAULT 0,
    estoque_minimo INTEGER NOT NULL DEFAULT 1,
    configuracao_fiscal_id UUID REFERENCES configuracoes_fiscais(id),
    ncm_excecao VARCHAR(8), -- Caso seja diferente do padrão
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA: clientes
-- CRM de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    rg VARCHAR(20),
    data_nascimento DATE,
    whatsapp VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    -- Endereço
    cep VARCHAR(9) NOT NULL,
    logradouro VARCHAR(100),
    numero VARCHAR(20),
    complemento VARCHAR(50),
    bairro VARCHAR(50),
    cidade VARCHAR(50),
    estado VARCHAR(2),
    -- Lis Score (Crédito Visual)
    lis_score INTEGER DEFAULT 0, -- ex: 0 a 1000
    limite_credito DECIMAL(10,2) DEFAULT 0,
    -- Controle
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TRIGGERS PARA ATUALIZAR 'atualizado_em' automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clientes_modtime
    BEFORE UPDATE ON clientes
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_produtos_modtime
    BEFORE UPDATE ON produtos
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_configuracoes_fiscais_modtime
    BEFORE UPDATE ON configuracoes_fiscais
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

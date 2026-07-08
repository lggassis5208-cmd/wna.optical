-- Criação do módulo de Caixa e Vendas

-- 1. TABELA: categorias
CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'PRODUTO', 'DESPESA', 'RECEITA'
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir categorias padrão
INSERT INTO categorias (nome, tipo) VALUES
('Óculos de grau', 'PRODUTO'),
('Lentes (de grau)', 'PRODUTO'),
('Óculos de sol', 'PRODUTO'),
('Lentes de contato', 'PRODUTO'),
('Serviços', 'PRODUTO'),
('Aluguel', 'DESPESA'),
('Energia', 'DESPESA'),
('Internet', 'DESPESA'),
('Salários', 'DESPESA'),
('Fornecedor', 'DESPESA'),
('Outras Despesas', 'DESPESA'),
('Receita Avulsa', 'RECEITA')
ON CONFLICT DO NOTHING;

-- 2. TABELA: caixas
CREATE TABLE IF NOT EXISTS caixas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_abertura TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_fechamento TIMESTAMP WITH TIME ZONE,
    usuario_abertura_id UUID NOT NULL, -- referenciar auth.users no Supabase
    usuario_fechamento_id UUID,
    valor_inicial DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_informado_fechamento DECIMAL(10,2),
    saldo_esperado DECIMAL(10,2),
    diferenca DECIMAL(10,2),
    status VARCHAR(20) NOT NULL DEFAULT 'ABERTO' -- 'ABERTO', 'FECHADO'
);

-- 3. TABELA: vendas
CREATE TABLE IF NOT EXISTS vendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    os_number VARCHAR(50),
    caixa_id UUID NOT NULL REFERENCES caixas(id),
    cliente_id UUID REFERENCES clientes(id), -- assume que a tabela clientes existe
    usuario_id UUID NOT NULL, -- vendedor
    data_venda TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    valor_bruto DECIMAL(10,2) NOT NULL DEFAULT 0,
    desconto DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_liquido DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'CONCLUIDA', -- 'CONCLUIDA', 'CANCELADA'
    metadata JSONB, -- Para salvar campos de ótica (od_esferico, tipo_lente, paciente_nome, etc)
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA: pagamentos_venda
CREATE TABLE IF NOT EXISTS pagamentos_venda (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    forma_pagamento VARCHAR(50) NOT NULL, -- 'DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', etc.
    valor DECIMAL(10,2) NOT NULL DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABELA: itens_venda
CREATE TABLE IF NOT EXISTS itens_venda (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES categorias(id),
    produto_id UUID REFERENCES produtos(id), -- assume que a tabela produtos existe
    descricao VARCHAR(255) NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1,
    valor_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABELA: movimentos_caixa
CREATE TABLE IF NOT EXISTS movimentos_caixa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caixa_id UUID NOT NULL REFERENCES caixas(id),
    tipo VARCHAR(50) NOT NULL, -- 'SANGRIA', 'SUPRIMENTO', 'DESPESA'
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10,2) NOT NULL DEFAULT 0,
    data_movimento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    usuario_id UUID NOT NULL,
    categoria_id UUID REFERENCES categorias(id), -- Obrigatorio se tipo = 'DESPESA'
    forma_pagamento VARCHAR(50) NOT NULL, -- 'DINHEIRO', 'PIX', etc.
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers para atualizado_em
CREATE TRIGGER update_categorias_modtime
    BEFORE UPDATE ON categorias
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_vendas_modtime
    BEFORE UPDATE ON vendas
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Habilitar RLS (Opcional: dependendo da politica do projeto, se todas as tabelas tiverem RLS)
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentos_caixa ENABLE ROW LEVEL SECURITY;

-- Politicas basicas (Permitir tudo para auth anon/authenticated ou baseado em roles do projeto)
CREATE POLICY "Permitir tudo para usuarios autenticados em categorias" ON categorias FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir tudo para usuarios autenticados em caixas" ON caixas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir tudo para usuarios autenticados em vendas" ON vendas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir tudo para usuarios autenticados em pagamentos_venda" ON pagamentos_venda FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir tudo para usuarios autenticados em itens_venda" ON itens_venda FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir tudo para usuarios autenticados em movimentos_caixa" ON movimentos_caixa FOR ALL USING (auth.role() = 'authenticated');

-- ====================================================
-- MIGRAÇÃO: MÓDULO DE FICHAS MÉDICAS / PRONTUÁRIO (ÓTICA LIS)
-- ====================================================

-- 1. TABELA PRINCIPAL: fichas_medicas
CREATE TABLE IF NOT EXISTS fichas_medicas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    loja_id VARCHAR(50) NOT NULL DEFAULT 'loja_principal',
    
    -- Dados do Paciente (preenchidos do cliente ERP ou completados)
    nome VARCHAR(150),
    telefone VARCHAR(30),
    cpf VARCHAR(20),
    genero VARCHAR(20),
    data_nascimento DATE,
    
    -- Dados Clínicos & Consulta
    motivo_consulta TEXT,
    atendido_por VARCHAR(100) NOT NULL, -- Optometrista responsável
    data_exame DATE NOT NULL, -- Data REAL do exame (obrigatória)
    validade_receita DATE NOT NULL, -- Data de validade para gatilho CRM
    
    -- Imutabilidade & Assinatura
    status VARCHAR(20) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizada')),
    finalizada_em TIMESTAMP WITH TIME ZONE,
    assinatura_hash TEXT, -- SHA-256 (conteudo + usuario + timestamp)
    
    -- Suporte a Retificação por Adendo
    ficha_pai_id UUID REFERENCES fichas_medicas(id) ON DELETE SET NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'original' CHECK (tipo IN ('original', 'retificacao')),
    
    -- Controle de Data
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE REFRAÇÕES (GRAU POR OLHO — SEPARADO OD / OE)
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

-- 3. TABELA DE AUDIT LOG DE LEITURA E ACESSO (LGPD DADO DE SAÚDE)
CREATE TABLE IF NOT EXISTS fichas_medicas_acesso_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ficha_id UUID REFERENCES fichas_medicas(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    loja_id VARCHAR(50) DEFAULT 'loja_principal',
    usuario_id VARCHAR(100),
    usuario_nome VARCHAR(150),
    acao VARCHAR(40) NOT NULL CHECK (acao IN (
        'visualizacao', 
        'impressao', 
        'exportacao_pdf', 
        'exportacao_massa', 
        'anonimizacao_lgpd'
    )),
    detalhes TEXT,
    ip_address VARCHAR(45),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ÍNDICES DE DESEMPENHO
CREATE INDEX IF NOT EXISTS idx_fichas_medicas_cliente ON fichas_medicas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_fichas_medicas_loja ON fichas_medicas(loja_id);
CREATE INDEX IF NOT EXISTS idx_fichas_medicas_validade ON fichas_medicas(validade_receita);
CREATE INDEX IF NOT EXISTS idx_refracoes_ficha ON refracoes(ficha_id);
CREATE INDEX IF NOT EXISTS idx_fichas_log_cliente ON fichas_medicas_acesso_log(cliente_id);

-- 5. TRIGGER DE IMUTABILIDADE (IMPEDE UPDATE/DELETE APÓS FINALIZADA)
CREATE OR REPLACE FUNCTION prevent_finalized_ficha_edits()
RETURNS TRIGGER AS $$
BEGIN
    -- Permitir transição de 'rascunho' para 'finalizada' no UPDATE
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'finalizada' THEN
            RAISE EXCEPTION 'Prontuário Médico finalizado é imutável e não pode ser alterado. Para correções, crie um adendo/retificação.';
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.status = 'finalizada' THEN
            RAISE EXCEPTION 'Prontuário Médico finalizado é imutável e não pode ser excluído por exigência legal (CFM/LGPD).';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_finalized_ficha_edits ON fichas_medicas;
CREATE TRIGGER trg_prevent_finalized_ficha_edits
    BEFORE UPDATE OR DELETE ON fichas_medicas
    FOR EACH ROW
    EXECUTE PROCEDURE prevent_finalized_ficha_edits();

-- 6. TRIGGER DE IMUTABILIDADE PARA TABELA REFRAÇÕES
CREATE OR REPLACE FUNCTION prevent_finalized_refraction_edits()
RETURNS TRIGGER AS $$
DECLARE
    v_status VARCHAR(20);
BEGIN
    SELECT status INTO v_status FROM fichas_medicas WHERE id = OLD.ficha_id;
    IF v_status = 'finalizada' THEN
        RAISE EXCEPTION 'Não é permitido alterar ou excluir refração de um prontuário finalizado.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_finalized_refraction_edits ON refracoes;
CREATE TRIGGER trg_prevent_finalized_refraction_edits
    BEFORE UPDATE OR DELETE ON refracoes
    FOR EACH ROW
    EXECUTE PROCEDURE prevent_finalized_refraction_edits();

-- 7. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE fichas_medicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE refracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas_medicas_acesso_log ENABLE ROW LEVEL SECURITY;

-- POLICIES DE ACESSO
DROP POLICY IF EXISTS "Acesso Fichas Médicas por Loja" ON fichas_medicas;
CREATE POLICY "Acesso Fichas Médicas por Loja" ON fichas_medicas
    FOR ALL
    USING (true);

DROP POLICY IF EXISTS "Acesso Refrações por Loja" ON refracoes;
CREATE POLICY "Acesso Refrações por Loja" ON refracoes
    FOR ALL
    USING (true);

DROP POLICY IF EXISTS "Acesso Log de Leitura" ON fichas_medicas_acesso_log;
CREATE POLICY "Acesso Log de Leitura" ON fichas_medicas_acesso_log
    FOR ALL
    USING (true);

-- 8. TRIGGER AUTOMÁTICO DE ATUALIZAÇÃO DO 'atualizado_em'
CREATE TRIGGER update_fichas_medicas_modtime
    BEFORE UPDATE ON fichas_medicas
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

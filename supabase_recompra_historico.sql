-- ====================================================
-- MIGRAÇÃO: HISTÓRICO DE RECOMPRA DE RECEITAS (ÓTICA LIS)
-- ====================================================

-- 1. TABELA DE HISTÓRICO DE RECOMPRA (ANTI-DUPLICAÇÃO E AUDITORIA)
CREATE TABLE IF NOT EXISTS recompra_historico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    ficha_id UUID REFERENCES fichas_medicas(id) ON DELETE SET NULL,
    loja_id VARCHAR(50) NOT NULL DEFAULT 'loja_principal',
    
    canal VARCHAR(30) NOT NULL DEFAULT 'whatsapp',
    status_envio VARCHAR(30) NOT NULL DEFAULT 'enviado' CHECK (status_envio IN ('enviado', 'falha', 'respondeu', 'bloqueado_lgpd')),
    mensagem_variacao_id INTEGER DEFAULT 1,
    mensagem_texto TEXT NOT NULL,
    usuario_nome VARCHAR(150),
    
    enviado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ÍNDICES DE DESEMPENHO E FILTROS DE CICLO
CREATE INDEX IF NOT EXISTS idx_recompra_cliente_envio ON recompra_historico(cliente_id, enviado_em);
CREATE INDEX IF NOT EXISTS idx_recompra_loja_envio ON recompra_historico(loja_id, enviado_em);

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE recompra_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso Historico Recompra por Loja" ON recompra_historico;
CREATE POLICY "Acesso Historico Recompra por Loja" ON recompra_historico
    FOR ALL
    USING (true);

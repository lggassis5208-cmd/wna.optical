-- ==============================================================================
-- MIGRAÇÃO: Health Check e Resiliência da Sessão WAHA (Multi-tenant)
-- Ótica Lis ERP — Monitoramento ativo, histórico de status, cooldown de alertas
-- e suporte a retries com backoff exponencial no motor de envios.
-- ==============================================================================

-- 1. Criação da Tabela de Status do WAHA (waha_status)
CREATE TABLE IF NOT EXISTS waha_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sessao VARCHAR(50) NOT NULL,
    estado VARCHAR(30) NOT NULL CHECK (estado IN ('WORKING', 'SCAN_QR_CODE', 'STOPPED', 'FAILED', 'desconhecido')),
    checado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    detalhe TEXT,
    ultimo_alerta_em TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint única para permitir UPSERT de status recente sem inchar a tabela
    CONSTRAINT unique_tenant_sessao UNIQUE (tenant_id, sessao)
);

-- 2. Ativação de Row Level Security (RLS) para Isolamento Multi-tenant
ALTER TABLE waha_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Isolamento por Tenant Waha Status" ON waha_status;
CREATE POLICY "Isolamento por Tenant Waha Status" ON waha_status
    FOR ALL USING (tenant_id = current_tenant_id());

-- 3. Adição da coluna 'tentativas' para suporte ao Backoff Exponencial no motor
DO $$ 
BEGIN 
    -- Em pos_venda_envios
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pos_venda_envios' AND column_name='tentativas') THEN
        ALTER TABLE pos_venda_envios ADD COLUMN tentativas INTEGER DEFAULT 0 NOT NULL;
    END IF;

    -- Em campanha_disparos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campanha_disparos' AND column_name='tentativas') THEN
        ALTER TABLE campanha_disparos ADD COLUMN tentativas INTEGER DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- 4. Conceder permissões para os roles do Supabase
GRANT ALL ON waha_status TO authenticated, service_role;

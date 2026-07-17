-- ====================================================
-- MIGRAÇÃO: MÓDULO AGENDA V2 (GOOGLE CALENDAR STYLE)
-- ====================================================

-- 1. Adicionar colunas do novo modelo à tabela agendamentos
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES tenants(id);
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS nome_avulso VARCHAR(100);
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS tipo VARCHAR(30) DEFAULT 'exame';
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS inicio_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS fim_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS duracao_min INTEGER DEFAULT 30;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS status_pagamento VARCHAR(20) DEFAULT 'nao_pago';
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS valor DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS pago_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(50);
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS registrado_por UUID;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS profissional_id UUID;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS criado_por UUID;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Tornar cliente_id nullable (para permitir agendamentos avulsos)
ALTER TABLE agendamentos ALTER COLUMN cliente_id DROP NOT NULL;

-- Sincronizar loja_id com tenant_id (garante que ambos estejam sempre preenchidos e válidos)
UPDATE agendamentos SET loja_id = tenant_id WHERE loja_id IS NULL AND tenant_id IS NOT NULL;
UPDATE agendamentos SET tenant_id = current_tenant_id() WHERE tenant_id IS NULL;
UPDATE agendamentos SET loja_id = tenant_id WHERE loja_id IS NULL;

ALTER TABLE agendamentos ALTER COLUMN loja_id SET DEFAULT current_tenant_id();
ALTER TABLE agendamentos ALTER COLUMN loja_id SET NOT NULL;

-- Migrar dados antigos (data + horario -> inicio_em + fim_em em UTC)
DO $$
BEGIN
    UPDATE agendamentos 
    SET inicio_em = (data::text || ' ' || horario::text)::timestamptz,
        fim_em = (data::text || ' ' || horario::text)::timestamptz + interval '30 minutes'
    WHERE inicio_em IS NULL AND data IS NOT NULL AND horario IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Aviso ao migrar data+horario antigas: %', SQLERRM;
END $$;

-- Permitir null temporariamente ou setar default se ainda houver nulos
UPDATE agendamentos SET inicio_em = NOW(), fim_em = NOW() + interval '30 minutes' WHERE inicio_em IS NULL;
ALTER TABLE agendamentos ALTER COLUMN inicio_em SET NOT NULL;
ALTER TABLE agendamentos ALTER COLUMN fim_em SET NOT NULL;

-- Atualizar CHECKs de tipo, status e status_pagamento
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS agendamentos_tipo_check;
ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_tipo_check 
    CHECK (tipo IN ('exame', 'entrega', 'retorno', 'ajuste', 'outro'));

ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS agendamentos_status_check;
ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_status_check 
    CHECK (status IN ('agendado', 'confirmado', 'compareceu', 'faltou', 'cancelado', 'AGENDADO', 'CONFIRMADO', 'CONCLUÍDO', 'FALTOU', 'CANCELADO'));

ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS agendamentos_status_pagamento_check;
ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_status_pagamento_check 
    CHECK (status_pagamento IN ('nao_pago', 'pago', 'isento'));

-- 2. Índices de performance solicitados
CREATE INDEX IF NOT EXISTS idx_agendamentos_loja_inicio ON agendamentos (loja_id, inicio_em);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON agendamentos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status_pagamento ON agendamentos (loja_id, status_pagamento);

-- 3. Tabela de Auditoria (agendamento_eventos)
CREATE TABLE IF NOT EXISTS agendamento_eventos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agendamento_id UUID NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
    loja_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id),
    acao VARCHAR(50) NOT NULL, -- ex: 'criado', 'mudou_status', 'mudou_pagamento', 'reagendado'
    detalhes JSONB,
    por_usuario UUID,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE agendamento_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Isolamento da Auditoria por Loja" ON agendamento_eventos FOR ALL USING (loja_id = current_tenant_id());

-- 4. Trigger de Sincronização entre loja_id e tenant_id e Atualização do Pós-Venda
CREATE OR REPLACE FUNCTION public.trg_agendamentos_sync_e_auditoria()
RETURNS TRIGGER AS $$
BEGIN
    -- Sincroniza loja_id com tenant_id
    IF NEW.loja_id IS NULL AND NEW.tenant_id IS NOT NULL THEN
        NEW.loja_id := NEW.tenant_id;
    ELSIF NEW.tenant_id IS NULL AND NEW.loja_id IS NOT NULL THEN
        NEW.tenant_id := NEW.loja_id;
    END IF;

    NEW.atualizado_em := NOW();

    -- Se o status mudou para 'compareceu' e é exame, atualiza ultima_consulta_em no cliente
    IF (NEW.status = 'compareceu' OR NEW.status = 'CONCLUÍDO') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
        IF NEW.cliente_id IS NOT NULL THEN
            UPDATE clientes SET ultima_consulta_em = NOW() WHERE id = NEW.cliente_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_agendamentos_sync ON agendamentos;
CREATE TRIGGER trg_agendamentos_sync
    BEFORE INSERT OR UPDATE ON agendamentos
    FOR EACH ROW EXECUTE PROCEDURE public.trg_agendamentos_sync_e_auditoria();

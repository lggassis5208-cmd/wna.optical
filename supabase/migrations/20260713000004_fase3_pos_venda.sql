-- ====================================================
-- MIGRAÇÃO: CRM FASE 3 - RASTREAMENTO OS E PÓS-VENDA
-- ====================================================

-- 1. Evolução da Tabela Vendas (OS)
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS enviada_lab_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS pronta_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS entregue_em TIMESTAMP WITH TIME ZONE;

-- 2. Tabela de Auditoria de Eventos da OS
CREATE TABLE IF NOT EXISTS os_eventos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id),
    de_status VARCHAR(50),
    para_status VARCHAR(50) NOT NULL,
    em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    por_usuario UUID -- Opcional, referência para auth.users
);

CREATE INDEX idx_os_eventos_venda_id ON os_eventos(venda_id);

-- 3. Configurações do Motor de Pós-Venda
CREATE TABLE IF NOT EXISTS pos_venda_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id) UNIQUE,
    marcos_dias INTEGER[] DEFAULT '{15,30,60,90,180}',
    canal VARCHAR(20) DEFAULT 'whatsapp',
    templates JSONB DEFAULT '{"15": ["Olá {{nome}}, adaptou bem ao óculos novo?", "Tudo certo com sua visão, {{nome}}?"], "180": ["{{nome}}, já faz 6 meses! Hora da revisão."]}',
    horario_inicio TIME DEFAULT '09:00:00',
    horario_fim TIME DEFAULT '18:00:00',
    dias_uteis BOOLEAN DEFAULT true,
    teto_diario INTEGER DEFAULT 50,
    motor_pausado BOOLEAN DEFAULT false,
    min_delay_s INTEGER DEFAULT 30,
    max_delay_s INTEGER DEFAULT 90,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir config padrão para tenants existentes
INSERT INTO pos_venda_config (tenant_id)
SELECT id FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- 4. Fila de Envios do Pós-Venda
CREATE TABLE IF NOT EXISTS pos_venda_envios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id),
    venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    marco_dia INTEGER NOT NULL,
    status VARCHAR(30) DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'falha', 'cancelado')),
    agendado_para TIMESTAMP WITH TIME ZONE NOT NULL,
    enviado_em TIMESTAMP WITH TIME ZONE,
    motivo_cancelamento VARCHAR(100),
    erro_log TEXT,
    template_usado TEXT,
    variacao_index INTEGER,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pos_venda_envios_queue ON pos_venda_envios(tenant_id, status, agendado_para);

-- 5. Função e Trigger para Auto-Agendamento
CREATE OR REPLACE FUNCTION public.agendar_pos_venda()
RETURNS TRIGGER AS $$
DECLARE
    marco INTEGER;
    config pos_venda_config%ROWTYPE;
BEGIN
    -- Se o status mudou para 'ENTREGUE'
    IF NEW.status = 'ENTREGUE' AND (OLD.status IS DISTINCT FROM 'ENTREGUE') THEN
        
        -- Atualiza entregue_em se não foi passado pela aplicação
        IF NEW.entregue_em IS NULL THEN
            NEW.entregue_em := NOW();
        END IF;

        -- Busca a config do tenant
        SELECT * INTO config FROM pos_venda_config WHERE tenant_id = NEW.tenant_id LIMIT 1;
        
        -- Cria os envios baseados nos marcos
        IF config.id IS NOT NULL AND NEW.cliente_id IS NOT NULL THEN
            FOREACH marco IN ARRAY config.marcos_dias
            LOOP
                INSERT INTO pos_venda_envios (tenant_id, venda_id, cliente_id, marco_dia, agendado_para, status)
                VALUES (NEW.tenant_id, NEW.id, NEW.cliente_id, marco, NEW.entregue_em + (marco || ' days')::INTERVAL, 'pendente');
            END LOOP;
        END IF;
    END IF;

    -- Lidar com Cancelamento da Venda
    IF NEW.status = 'CANCELADA' AND (OLD.status IS DISTINCT FROM 'CANCELADA') THEN
        UPDATE pos_venda_envios 
        SET status = 'cancelado', motivo_cancelamento = 'OS Cancelada'
        WHERE venda_id = NEW.id AND status = 'pendente';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_agendar_pos_venda ON vendas;
CREATE TRIGGER trigger_agendar_pos_venda
    BEFORE UPDATE ON vendas
    FOR EACH ROW EXECUTE PROCEDURE public.agendar_pos_venda();

-- 6. RLS Policies
ALTER TABLE os_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Isolamento de OS Eventos" ON os_eventos FOR ALL USING (tenant_id = current_tenant_id());

ALTER TABLE pos_venda_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Isolamento de PV Config" ON pos_venda_config FOR ALL USING (tenant_id = current_tenant_id());

ALTER TABLE pos_venda_envios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Isolamento de PV Envios" ON pos_venda_envios FOR ALL USING (tenant_id = current_tenant_id());

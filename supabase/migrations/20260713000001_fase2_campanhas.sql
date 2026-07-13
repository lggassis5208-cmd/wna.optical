-- ====================================================
-- MIGRAÇÃO: CRM FASE 2 - CAMPANHAS E FILA DE DISPARO
-- ====================================================

-- 1. Criação da Tabela de Campanhas
CREATE TABLE IF NOT EXISTS campanhas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id),
    segmento_id UUID NOT NULL REFERENCES segmentos(id),
    nome VARCHAR(100) NOT NULL,
    canal VARCHAR(20) DEFAULT 'whatsapp' NOT NULL,
    template_mensagem TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'rascunho' NOT NULL CHECK (status IN ('rascunho', 'agendada', 'processando', 'concluida', 'pausada', 'cancelada')),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Fila de Disparos (Queue de alta performance)
CREATE TABLE IF NOT EXISTS campanha_disparos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    
    -- O tenant_id é duplicado aqui para facilitar o RLS sem precisar fazer JOIN nas regras de segurança
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id),
    
    status VARCHAR(30) DEFAULT 'pendente' NOT NULL CHECK (status IN ('pendente', 'processando', 'enviado', 'falha')),
    mensagem_processada TEXT, -- O texto final exato que foi enviado ao cliente (já com as variáveis trocadas)
    erro_log TEXT,
    data_agendamento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_envio TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Índices de performance para os "Workers" do Background
-- Quando um worker (cron) for puxar a fila, ele fará um select onde status = pendente. Este índice faz isso ser instantâneo.
CREATE INDEX idx_campanha_disparos_queue ON campanha_disparos(campanha_id, status, data_agendamento);

-- 4. Habilitar RLS e criar políticas de isolamento
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Isolamento de Campanhas" ON campanhas FOR ALL USING (tenant_id = current_tenant_id());

ALTER TABLE campanha_disparos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Isolamento de Fila" ON campanha_disparos FOR ALL USING (tenant_id = current_tenant_id());

-- ====================================================
-- MIGRAÇÃO: MÓDULO DE LEADS E PIPELINE DE VENDAS
-- ====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA: lista_supressao (Caso não exista)
CREATE TABLE IF NOT EXISTS lista_supressao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id),
    whatsapp VARCHAR(20) NOT NULL,
    motivo VARCHAR(100) DEFAULT 'Descadastro voluntário (PARE)',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uk_lista_supressao_tenant_wa UNIQUE (tenant_id, whatsapp)
);

-- 2. TABELA: pos_venda_config (Caso não exista)
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

-- 3. TABELA: pos_venda_envios (Caso não exista)
CREATE TABLE IF NOT EXISTS pos_venda_envios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id),
    venda_id UUID REFERENCES vendas(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    marco_dia INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'falha', 'cancelado', 'respondido')),
    agendado_para TIMESTAMP WITH TIME ZONE NOT NULL,
    enviado_em TIMESTAMP WITH TIME ZONE,
    motivo_cancelamento VARCHAR(100),
    erro_log TEXT,
    template_usado TEXT,
    variacao_index INTEGER,
    tipo_gatilho VARCHAR(50) DEFAULT 'recompra_entrega',
    ciclo_referencia VARCHAR(100),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Se pos_venda_envios já existir, garantir que venda_id e cliente_id sejam nullable
ALTER TABLE pos_venda_envios ALTER COLUMN venda_id DROP NOT NULL;
ALTER TABLE pos_venda_envios ALTER COLUMN cliente_id DROP NOT NULL;

-- 4. TABELA: leads
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id),
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(30) NOT NULL, -- normalizado: 55DDDNUM@c.us
    email VARCHAR(100),
    origem VARCHAR(50) NOT NULL CHECK (origem IN ('whatsapp', 'formulario', 'indicacao', 'instagram', 'anuncio', 'walk_in', 'outro')),
    origem_detalhe TEXT,
    estagio VARCHAR(50) NOT NULL DEFAULT 'novo' CHECK (estagio IN ('novo', 'contatado', 'exame_agendado', 'compareceu', 'orcamento', 'ganho', 'perdido')),
    responsavel_id UUID,
    valor_estimado DECIMAL(10,2),
    interesse TEXT,
    motivo_perda VARCHAR(50) CHECK (motivo_perda IN ('preco', 'so_pesquisando', 'comprou_concorrente', 'sem_resposta', 'fora_perfil', 'outro')),
    opt_in BOOLEAN DEFAULT TRUE,
    consentimento_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ultimo_contato_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL
);

-- Adicionar FK de lead_id na tabela pos_venda_envios
ALTER TABLE pos_venda_envios ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE CASCADE;

-- Alterar a tabela agendamentos para aceitar leads
ALTER TABLE agendamentos ALTER COLUMN cliente_id DROP NOT NULL;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE CASCADE;

-- 5. TABELA: lead_eventos (Timeline e Auditoria)
CREATE TABLE IF NOT EXISTS lead_eventos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id),
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('criado', 'mudou_estagio', 'mensagem_enviada', 'mensagem_recebida', 'nota', 'agendamento')),
    de_estagio VARCHAR(50),
    para_estagio VARCHAR(50),
    conteudo TEXT,
    por_usuario UUID,
    em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABELA: leads_config (Regra de Follow-up de Lead Frio por Loja)
CREATE TABLE IF NOT EXISTS leads_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id) UNIQUE,
    dias_frio INTEGER DEFAULT 3,
    templates JSONB DEFAULT '{"novo": ["Olá {{nome}}, vimos que você tem interesse em nossos óculos. Como podemos te ajudar hoje?"], "contatado": ["Olá {{nome}}, tudo bem? Ficou alguma dúvida sobre o orçamento?"], "exame_agendado": ["Olá {{nome}}, lembrando do seu exame de vista amanhã! Confirmado?"]}',
    motor_pausado BOOLEAN DEFAULT false,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir configuração padrão de leads para as lojas existentes
INSERT INTO leads_config (tenant_id)
SELECT id FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- 7. Índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_tenant_estagio ON leads(tenant_id, estagio);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_ultimo_contato ON leads(tenant_id, ultimo_contato_em);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_telefone ON leads(tenant_id, telefone);
CREATE INDEX IF NOT EXISTS idx_lead_eventos_lead_id ON lead_eventos(lead_id);

-- 8. Habilitar RLS nas novas tabelas
ALTER TABLE lista_supressao ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_venda_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_venda_envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_config ENABLE ROW LEVEL SECURITY;

-- 9. Políticas de RLS
DROP POLICY IF EXISTS "Isolamento da Lista de Supressão" ON lista_supressao;
CREATE POLICY "Isolamento da Lista de Supressão" ON lista_supressao FOR ALL USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Isolamento de PV Config" ON pos_venda_config;
CREATE POLICY "Isolamento de PV Config" ON pos_venda_config FOR ALL USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Isolamento de PV Envios" ON pos_venda_envios;
CREATE POLICY "Isolamento de PV Envios" ON pos_venda_envios FOR ALL USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Isolamento de Leads" ON leads;
CREATE POLICY "Isolamento de Leads" ON leads FOR ALL USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Isolamento de Lead Eventos" ON lead_eventos;
CREATE POLICY "Isolamento de Lead Eventos" ON lead_eventos FOR ALL USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Isolamento de Leads Config" ON leads_config;
CREATE POLICY "Isolamento de Leads Config" ON leads_config FOR ALL USING (tenant_id = current_tenant_id());

-- 10. Políticas de permissão pública para acesso anônimo do App
DROP POLICY IF EXISTS "Permitir tudo em leads" ON leads;
CREATE POLICY "Permitir tudo em leads" ON leads FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir tudo em lead_eventos" ON lead_eventos;
CREATE POLICY "Permitir tudo em lead_eventos" ON lead_eventos FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir tudo em leads_config" ON leads_config;
CREATE POLICY "Permitir tudo em leads_config" ON leads_config FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir tudo em lista_supressao" ON lista_supressao;
CREATE POLICY "Permitir tudo em lista_supressao" ON lista_supressao FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir tudo em pos_venda_envios" ON pos_venda_envios;
CREATE POLICY "Permitir tudo em pos_venda_envios" ON pos_venda_envios FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir tudo em pos_venda_config" ON pos_venda_config;
CREATE POLICY "Permitir tudo em pos_venda_config" ON pos_venda_config FOR ALL USING (true);

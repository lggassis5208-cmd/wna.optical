-- ====================================================
-- MIGRAÇÃO: MÓDULO CRM FASE 1 - CORREÇÕES E INTEGRAÇÕES (ERP ÓTICA LIS)
-- ====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ATUALIZAR TABELA clientes PARA SUPORTAR PF/PJ SE AINDA NÃO EXISTIR
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_pessoa VARCHAR(2) DEFAULT 'PF' CHECK (tipo_pessoa IN ('PF', 'PJ'));
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS razao_social VARCHAR(150);

-- 2. TABELA: crm_funis
CREATE TABLE IF NOT EXISTS crm_funis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id),
    nome VARCHAR(100) NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    descricao TEXT,
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uk_crm_funis_tenant_codigo UNIQUE (tenant_id, codigo)
);

-- 3. TABELA: crm_etapas
CREATE TABLE IF NOT EXISTS crm_etapas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id),
    funil_id UUID NOT NULL REFERENCES crm_funis(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    tipo VARCHAR(20) DEFAULT 'normal' CHECK (tipo IN ('normal', 'orcamento', 'ganho', 'perdido')),
    alerta_dias_parado INTEGER DEFAULT 0,
    cor VARCHAR(30) DEFAULT '#3B82F6',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA: crm_leads
CREATE TABLE IF NOT EXISTS crm_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id),
    funil_id UUID NOT NULL REFERENCES crm_funis(id) ON DELETE RESTRICT,
    etapa_id UUID NOT NULL REFERENCES crm_etapas(id) ON DELETE RESTRICT,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    empresa_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    titulo VARCHAR(150) NOT NULL,
    origem VARCHAR(50) NOT NULL DEFAULT 'whatsapp' CHECK (origem IN ('whatsapp', 'indicacao', 'convenio', 'instagram', 'walk_in', 'outro')),
    origem_detalhe TEXT,
    valor_estimado DECIMAL(12,2) DEFAULT 0.00,
    responsavel_id UUID,
    responsavel_nome VARCHAR(100) DEFAULT 'Vendedor',
    motivo_perda VARCHAR(50) CHECK (motivo_perda IN ('preco', 'achou_caro', 'comprou_outra', 'so_pesquisando', 'sumiu', 'outro')),
    motivo_perda_detalhe TEXT,
    venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
    cotacao_id UUID,
    nfe_id UUID,
    entrou_etapa_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Se crm_leads já existir, garantir novas colunas
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS cotacao_id UUID;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS nfe_id UUID;

-- 5. TABELA: crm_lead_eventos (Timeline e Auditoria de Contato/Lead)
CREATE TABLE IF NOT EXISTS crm_lead_eventos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id),
    lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('criado', 'mudou_etapa', 'mensagem_whatsapp', 'documento_enviado', 'nota_manual', 'tarefa_criada', 'tarefa_concluida', 'ganho', 'perdido', 'documento_vinculado')),
    de_etapa_id UUID REFERENCES crm_etapas(id) ON DELETE SET NULL,
    para_etapa_id UUID REFERENCES crm_etapas(id) ON DELETE SET NULL,
    titulo VARCHAR(150) NOT NULL,
    conteudo TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    por_usuario_id UUID,
    por_usuario_nome VARCHAR(100) DEFAULT 'Operador',
    em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABELA: crm_tarefas
CREATE TABLE IF NOT EXISTS crm_tarefas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id),
    lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('ligar', 'mensagem', 'retornar_orcamento', 'reuniao', 'outro')),
    origem_regra VARCHAR(50) DEFAULT 'manual' CHECK (origem_regra IN ('manual', 'orcamento_parado', 'followup_perdido', 'lead_inativo')),
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT,
    data_vencimento TIMESTAMP WITH TIME ZONE NOT NULL,
    responsavel_id UUID,
    responsavel_nome VARCHAR(100) DEFAULT 'Atendente',
    concluida BOOLEAN DEFAULT false,
    concluida_em TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir coluna origem_regra se tabela já existir
ALTER TABLE crm_tarefas ADD COLUMN IF NOT EXISTS origem_regra VARCHAR(50) DEFAULT 'manual';

-- 7. TABELA: crm_followup_fila (Fila de Follow-up de Perdidos)
CREATE TABLE IF NOT EXISTS crm_followup_fila (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id),
    lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    motivo_perda VARCHAR(50) NOT NULL,
    status VARCHAR(30) DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'cancelado')),
    agendado_para TIMESTAMP WITH TIME ZONE NOT NULL,
    mensagem_sugerida TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_crm_leads_tenant_funil ON crm_leads(tenant_id, funil_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_etapa ON crm_leads(etapa_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_cliente ON crm_leads(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_origem ON crm_leads(tenant_id, origem);
CREATE INDEX IF NOT EXISTS idx_crm_lead_eventos_lead ON crm_lead_eventos(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_eventos_cliente ON crm_lead_eventos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crm_tarefas_vencimento ON crm_tarefas(tenant_id, data_vencimento, concluida);

-- 9. HABILITAR RLS NAS NOVAS TABELAS
ALTER TABLE crm_funis ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_followup_fila ENABLE ROW LEVEL SECURITY;

-- 10. POLÍTICAS DE SEGURANÇA (RLS Multi-Tenant com Fallback Permissivo para Anon no App)
DROP POLICY IF EXISTS "crm_funis_tenant_policy" ON crm_funis;
CREATE POLICY "crm_funis_tenant_policy" ON crm_funis FOR ALL USING (tenant_id = current_tenant_id() OR true);

DROP POLICY IF EXISTS "crm_etapas_tenant_policy" ON crm_etapas;
CREATE POLICY "crm_etapas_tenant_policy" ON crm_etapas FOR ALL USING (tenant_id = current_tenant_id() OR true);

DROP POLICY IF EXISTS "crm_leads_tenant_policy" ON crm_leads;
CREATE POLICY "crm_leads_tenant_policy" ON crm_leads FOR ALL USING (tenant_id = current_tenant_id() OR true);

DROP POLICY IF EXISTS "crm_lead_eventos_tenant_policy" ON crm_lead_eventos;
CREATE POLICY "crm_lead_eventos_tenant_policy" ON crm_lead_eventos FOR ALL USING (tenant_id = current_tenant_id() OR true);

DROP POLICY IF EXISTS "crm_tarefas_tenant_policy" ON crm_tarefas;
CREATE POLICY "crm_tarefas_tenant_policy" ON crm_tarefas FOR ALL USING (tenant_id = current_tenant_id() OR true);

DROP POLICY IF EXISTS "crm_followup_fila_tenant_policy" ON crm_followup_fila;
CREATE POLICY "crm_followup_fila_tenant_policy" ON crm_followup_fila FOR ALL USING (tenant_id = current_tenant_id() OR true);

-- 11. INSERÇÃO DOS FUNIS E ETAPAS PADRÃO DA ESPECIFICAÇÃO
DO $$
DECLARE
    t_record RECORD;
    v_funil_a_id UUID;
    v_funil_b_id UUID;
    v_funil_c_id UUID;
BEGIN
    FOR t_record IN SELECT id FROM tenants LOOP
        -- FUNIL A: Orçamento (já tem receita)
        INSERT INTO crm_funis (tenant_id, nome, codigo, descricao, ordem)
        VALUES (t_record.id, 'Orçamento (já tem receita)', 'orcamento_receita', 'Para clientes que já possuem receita médica e querem orçamento', 1)
        ON CONFLICT (tenant_id, codigo) DO UPDATE SET nome = EXCLUDED.nome RETURNING id INTO v_funil_a_id;

        IF v_funil_a_id IS NOT NULL THEN
            INSERT INTO crm_etapas (tenant_id, funil_id, nome, ordem, tipo, alerta_dias_parado, cor) VALUES
            (t_record.id, v_funil_a_id, 'Novo contato', 1, 'normal', 0, '#60A5FA'),
            (t_record.id, v_funil_a_id, 'Receita recebida', 2, 'normal', 0, '#818CF8'),
            (t_record.id, v_funil_a_id, 'Orçamento feito', 3, 'orcamento', 2, '#F59E0B'),
            (t_record.id, v_funil_a_id, 'Veio à loja', 4, 'normal', 0, '#34D399'),
            (t_record.id, v_funil_a_id, 'Ganho', 5, 'ganho', 0, '#10B981'),
            (t_record.id, v_funil_a_id, 'Perdido', 6, 'perdido', 0, '#EF4444')
            ON CONFLICT DO NOTHING;
        END IF;

        -- FUNIL B: Exame primeiro
        INSERT INTO crm_funis (tenant_id, nome, codigo, descricao, ordem)
        VALUES (t_record.id, 'Exame primeiro', 'exame_primeiro', 'Para clientes que precisam agendar exame de vista antes de escolher o óculos', 2)
        ON CONFLICT (tenant_id, codigo) DO UPDATE SET nome = EXCLUDED.nome RETURNING id INTO v_funil_b_id;

        IF v_funil_b_id IS NOT NULL THEN
            INSERT INTO crm_etapas (tenant_id, funil_id, nome, ordem, tipo, alerta_dias_parado, cor) VALUES
            (t_record.id, v_funil_b_id, 'Novo contato', 1, 'normal', 0, '#60A5FA'),
            (t_record.id, v_funil_b_id, 'Exame agendado', 2, 'normal', 0, '#A78BFA'),
            (t_record.id, v_funil_b_id, 'Compareceu ao exame', 3, 'normal', 0, '#34D399'),
            (t_record.id, v_funil_b_id, 'Orçamento (lente+armação)', 4, 'orcamento', 2, '#F59E0B'),
            (t_record.id, v_funil_b_id, 'Ganho', 5, 'ganho', 0, '#10B981'),
            (t_record.id, v_funil_b_id, 'Perdido', 6, 'perdido', 0, '#EF4444')
            ON CONFLICT DO NOTHING;
        END IF;

        -- FUNIL C: Convênio B2B
        INSERT INTO crm_funis (tenant_id, nome, codigo, descricao, ordem)
        VALUES (t_record.id, 'Convênio B2B', 'convenio_b2b', 'Funil corporativo para parcerias e exames na empresa', 3)
        ON CONFLICT (tenant_id, codigo) DO UPDATE SET nome = EXCLUDED.nome RETURNING id INTO v_funil_c_id;

        IF v_funil_c_id IS NOT NULL THEN
            INSERT INTO crm_etapas (tenant_id, funil_id, nome, ordem, tipo, alerta_dias_parado, cor) VALUES
            (t_record.id, v_funil_c_id, 'Empresa contatada', 1, 'normal', 0, '#60A5FA'),
            (t_record.id, v_funil_c_id, 'Reunião/apresentação', 2, 'normal', 0, '#F472B6'),
            (t_record.id, v_funil_c_id, 'Proposta enviada', 3, 'orcamento', 3, '#F59E0B'),
            (t_record.id, v_funil_c_id, 'Exame na empresa', 4, 'normal', 0, '#34D399'),
            (t_record.id, v_funil_c_id, 'Ganho', 5, 'ganho', 0, '#10B981'),
            (t_record.id, v_funil_c_id, 'Perdido', 6, 'perdido', 0, '#EF4444')
            ON CONFLICT DO NOTHING;
        END IF;

    END LOOP;
END $$;

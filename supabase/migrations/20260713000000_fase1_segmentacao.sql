-- ====================================================
-- MIGRAÇÃO: CRM FASE 1 - MOTOR DE SEGMENTAÇÃO
-- ====================================================

-- 1. Criação da Tabela de Segmentos
CREATE TABLE IF NOT EXISTS segmentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id),
    nome VARCHAR(100) NOT NULL,
    regras JSONB NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS e criar política de isolamento
ALTER TABLE segmentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Isolamento por Tenant" ON segmentos FOR ALL USING (tenant_id = current_tenant_id());

-- 3. Criar VIEW de Métricas Consolidadas dos Clientes
-- Esta View de alta performance cruza dados clínicos e de vendas
-- para permitir filtros dinâmicos via Supabase PostgREST (Frontend/Node.js).
-- É mais escalável que uma Materialized View porque aproveita os índices do Postgres.
CREATE OR REPLACE VIEW v_clientes_metricas AS
SELECT 
  c.id AS cliente_id,
  c.tenant_id,
  c.nome,
  c.whatsapp,
  c.email,
  c.canal_origem,
  c.consentimento_marketing,
  
  -- Idade calculada
  EXTRACT(YEAR FROM age(CURRENT_DATE, c.data_nascimento))::INTEGER AS idade,
  
  -- Flag de Aniversariante do Mês
  (EXTRACT(MONTH FROM c.data_nascimento) = EXTRACT(MONTH FROM CURRENT_DATE)) AS aniversariante_mes,
  
  -- Recência: Dias desde a última compra
  (CURRENT_DATE - MAX(v.criado_em)::date)::INTEGER AS dias_ultima_compra,
  
  -- Frequência: Total de compras
  COUNT(v.id)::INTEGER AS total_compras,

  -- Valor Monetário (LTV - Lifetime Value)
  COALESCE(SUM(v.valor_total), 0)::NUMERIC AS ltv,
  
  -- Último produto comprado (Subquery rápida para extrair o tipo da última venda)
  (
    SELECT tipo 
    FROM vendas v2 
    WHERE v2.cliente_id = c.id 
    ORDER BY v2.criado_em DESC 
    LIMIT 1
  ) AS tipo_ultima_compra

FROM clientes c
LEFT JOIN vendas v ON v.cliente_id = c.id
GROUP BY c.id;

-- Como Views herdam o RLS das tabelas base no Postgres, 
-- a VIEW v_clientes_metricas já respeita o isolamento multi-tenant automaticamente!

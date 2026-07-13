-- ====================================================
-- MIGRAÇÃO: CRM FASE 2 - MOTOR LGPD E AST
-- ====================================================

-- 1. Novos campos em Clientes (Domínio Clínico/Óptico e Comercial)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ultima_consulta DATE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS validade_receita DATE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_lente VARCHAR(50);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_armacao VARCHAR(50);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS marca_armacao VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS grau_esferico NUMERIC;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS grau_cilindrico NUMERIC;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS adicao NUMERIC;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS convenio VARCHAR(100);

-- 2. Atualizar tabela de Segmentos (Auditoria e LGPD)
ALTER TABLE segmentos ADD COLUMN IF NOT EXISTS base_legal VARCHAR(50) DEFAULT 'legitimo_interesse';
ALTER TABLE segmentos ADD COLUMN IF NOT EXISTS finalidade TEXT;
ALTER TABLE segmentos ADD COLUMN IF NOT EXISTS criado_por UUID;
ALTER TABLE segmentos ADD COLUMN IF NOT EXISTS atualizado_por UUID;
ALTER TABLE segmentos ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Atualizar VIEW v_clientes_metricas com novos campos
DROP VIEW IF EXISTS v_clientes_metricas CASCADE;
CREATE OR REPLACE VIEW v_clientes_metricas AS
SELECT 
  c.id AS cliente_id,
  c.tenant_id,
  c.nome,
  c.whatsapp,
  c.email,
  c.canal_origem,
  c.consentimento_marketing,
  c.ultima_consulta,
  c.validade_receita,
  c.tipo_lente,
  c.tipo_armacao,
  c.marca_armacao AS marca,
  c.grau_esferico,
  c.grau_cilindrico,
  c.adicao,
  c.convenio,
  
  EXTRACT(YEAR FROM age(CURRENT_DATE, c.data_nascimento))::INTEGER AS idade,
  EXTRACT(MONTH FROM c.data_nascimento)::INTEGER AS mes_aniversario,
  (EXTRACT(MONTH FROM c.data_nascimento) = EXTRACT(MONTH FROM CURRENT_DATE)) AS aniversariante_mes,
  
  (CURRENT_DATE - MAX(v.criado_em)::date)::INTEGER AS dias_ultima_compra,
  COUNT(v.id)::INTEGER AS num_compras,
  COALESCE(SUM(v.valor_total), 0)::NUMERIC AS ltv_total,
  
  CASE WHEN COUNT(v.id) > 0 THEN COALESCE(SUM(v.valor_total), 0)::NUMERIC / COUNT(v.id) ELSE 0 END AS ticket_medio,
  
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

-- 4. Função RPC Segura para Mascarar Dados na Amostra (LGPD)
CREATE OR REPLACE FUNCTION mask_sample_data(client_ids UUID[])
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', c.cliente_id,
      'nome', c.nome,
      'cpf_mascarado', '***.***.***-XX',
      'whatsapp_mascarado', 
        CASE 
          WHEN c.whatsapp IS NOT NULL AND length(c.whatsapp) >= 10 
          THEN '(XX) ****-' || right(c.whatsapp, 4)
          ELSE 'Sem WhatsApp'
        END
    )
  ), '[]'::jsonb)
  FROM v_clientes_metricas c
  WHERE c.cliente_id = ANY(client_ids)
  AND c.tenant_id = current_tenant_id(); -- Proteção Extra multi-tenant
$$;

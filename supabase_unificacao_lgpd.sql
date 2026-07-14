-- ====================================================
-- MIGRAÇÃO: UNIFICAÇÃO DE CLIENTES/CRM E EVIDÊNCIA LGPD
-- ====================================================

-- 1. Evolução da Tabela Clientes (Unificação com CRM e Registro de Consentimento)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'cliente' CHECK (tipo IN ('cliente', 'lead'));
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS status_crm VARCHAR(20) DEFAULT 'ativo' CHECK (status_crm IN ('ativo', 'inativo', 'suprimido'));
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS origem VARCHAR(50) DEFAULT 'outro';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS origem_detalhe TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS estagio VARCHAR(50) DEFAULT 'novo';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS responsavel_id UUID;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS valor_estimado DECIMAL(10,2);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS interesse TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS motivo_perda VARCHAR(50);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS opt_in_marketing BOOLEAN DEFAULT false;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS base_legal VARCHAR(50) CHECK (base_legal IN ('consentimento', 'legitimo_interesse'));
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS consentimento_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS canal_consentimento VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS termo_versao VARCHAR(50);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ultima_compra_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ultima_consulta_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ultimo_contato_em TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Tabela append-only para Histórico de Evidências LGPD
CREATE TABLE IF NOT EXISTS consentimento_historico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id),
    evento VARCHAR(30) NOT NULL CHECK (evento IN ('concedido', 'revogado', 'reconfirmado')),
    base_legal VARCHAR(50) CHECK (base_legal IN ('consentimento', 'legitimo_interesse')),
    canal VARCHAR(100),
    termo_versao VARCHAR(50),
    em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    por_usuario UUID,
    origem TEXT
);

ALTER TABLE consentimento_historico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolamento de Consentimento Historico" ON consentimento_historico;
CREATE POLICY "Isolamento de Consentimento Historico" ON consentimento_historico FOR ALL USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Permitir tudo em consentimento_historico" ON consentimento_historico;
CREATE POLICY "Permitir tudo em consentimento_historico" ON consentimento_historico FOR ALL USING (true);

-- 3. Adicionar Colunas na Tabela de Segmentos para LGPD
ALTER TABLE segmentos ADD COLUMN IF NOT EXISTS base_legal VARCHAR(50) DEFAULT 'legitimo_interesse';
ALTER TABLE segmentos ADD COLUMN IF NOT EXISTS tipo_campanha VARCHAR(50) DEFAULT 'marketing';

-- 4. View de Supressão (Para compatibilidade com consultas que pedem a tabela supressao)
CREATE OR REPLACE VIEW supressao AS 
SELECT id, tenant_id, whatsapp AS telefone, email, motivo, criado_em AS em 
FROM lista_supressao;

-- 5. Trigger para Automação de Cadastro -> CRM & Consentimento Inicial
CREATE OR REPLACE FUNCTION public.registrar_consentimento_inicial()
RETURNS TRIGGER AS $$
BEGIN
  -- Definir valores padrão se não informados
  NEW.tipo := COALESCE(NEW.tipo, 'cliente');
  NEW.status_crm := COALESCE(NEW.status_crm, 'ativo');
  NEW.origem := COALESCE(NEW.origem, 'outro');
  NEW.opt_in_marketing := COALESCE(NEW.opt_in_marketing, false);

  -- Se opt_in_marketing for true, a base legal é consentimento
  IF NEW.opt_in_marketing = true THEN
    NEW.base_legal := 'consentimento';
    NEW.consentimento_em := COALESCE(NEW.consentimento_em, NOW());
    NEW.canal_consentimento := COALESCE(NEW.canal_consentimento, 'cadastro_loja');
    NEW.termo_versao := COALESCE(NEW.termo_versao, 'v1.0');
    
    INSERT INTO consentimento_historico (cliente_id, tenant_id, evento, base_legal, canal, termo_versao, em)
    VALUES (NEW.id, NEW.tenant_id, 'concedido', 'consentimento', NEW.canal_consentimento, NEW.termo_versao, NOW());
  ELSE
    -- Se opt_in_marketing for false, a base legal padrão para relacionamento/pós-venda é legitimo_interesse
    NEW.base_legal := 'legitimo_interesse';
    NEW.consentimento_em := COALESCE(NEW.consentimento_em, NOW());
    NEW.canal_consentimento := COALESCE(NEW.canal_consentimento, 'cadastro_loja');
    NEW.termo_versao := COALESCE(NEW.termo_versao, 'v1.0_padrao');
    
    INSERT INTO consentimento_historico (cliente_id, tenant_id, evento, base_legal, canal, termo_versao, em)
    VALUES (NEW.id, NEW.tenant_id, 'concedido', 'legitimo_interesse', NEW.canal_consentimento, NEW.termo_versao, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_registrar_consentimento_inicial ON clientes;
CREATE TRIGGER trg_registrar_consentimento_inicial
  BEFORE INSERT ON clientes
  FOR EACH ROW EXECUTE PROCEDURE public.registrar_consentimento_inicial();

-- 6. Recriação da View de Segmentação v_clientes_metricas
CREATE OR REPLACE VIEW v_clientes_metricas AS
SELECT 
  c.id AS cliente_id,
  c.tenant_id,
  c.nome_completo AS nome,
  c.whatsapp,
  c.email,
  c.canal_origem,
  c.tipo,
  c.status_crm,
  c.opt_in_marketing,
  c.base_legal,
  c.termo_versao,
  c.ultimo_contato_em,
  c.criado_em,
  
  -- Checagem de Supressão
  EXISTS (
    SELECT 1 FROM lista_supressao s 
    WHERE s.tenant_id = c.tenant_id 
      AND (s.whatsapp = '55' || c.whatsapp || '@c.us' OR s.whatsapp = c.whatsapp OR (c.email IS NOT NULL AND s.email = c.email))
  ) OR (c.status_crm = 'suprimido') AS esta_suprimido,
  
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
  
  -- Último produto comprado (Subquery rápida)
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

-- 7. Script de Backfill único da base existente
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Atualizar registros existentes na tabela clientes
  UPDATE clientes
  SET 
    tipo = COALESCE(tipo, 'cliente'),
    status_crm = COALESCE(status_crm, 'ativo'),
    opt_in_marketing = COALESCE(opt_in_marketing, false),
    base_legal = COALESCE(base_legal, 'legitimo_interesse'),
    canal_consentimento = COALESCE(canal_consentimento, 'backfill_legitimo_interesse'),
    termo_versao = COALESCE(termo_versao, 'v1.0_backfill'),
    consentimento_em = COALESCE(consentimento_em, NOW());

  -- Inserir registros no histórico para o backfill das evidências
  FOR r IN SELECT id, tenant_id, base_legal, canal_consentimento, termo_versao FROM clientes LOOP
    INSERT INTO consentimento_historico (cliente_id, tenant_id, evento, base_legal, canal, termo_versao, em)
    VALUES (r.id, r.tenant_id, 'concedido', r.base_legal, r.canal_consentimento, r.termo_versao, NOW())
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

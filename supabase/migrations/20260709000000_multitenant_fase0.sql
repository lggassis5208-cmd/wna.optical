-- ====================================================
-- MIGRAÇÃO: MULTI-TENANT E CRM FASE 0
-- ====================================================

-- 1. Criação da Tabela de Tenants (Óticas)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criação da Tabela de Vínculo (Usuário -> Tenant)
CREATE TABLE IF NOT EXISTS tenant_users (
    user_id UUID NOT NULL, -- será FK para auth.users quando houver
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'admin',
    PRIMARY KEY (user_id, tenant_id)
);

-- 3. Função para Injetar a Claim no JWT via Trigger
-- Isso garante que auth.jwt()->>'tenant_id' funcione
CREATE OR REPLACE FUNCTION public.set_tenant_claim()
RETURNS TRIGGER AS $$
BEGIN
  NEW.raw_app_meta_data := jsonb_set(
    COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
    '{tenant_id}',
    COALESCE((SELECT to_jsonb(tenant_id) FROM tenant_users WHERE user_id = NEW.id LIMIT 1), 'null'::jsonb)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auto-atribuir novos usuários ao primeiro tenant (default)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_tenant UUID;
BEGIN
  SELECT id INTO default_tenant FROM tenants ORDER BY criado_em ASC LIMIT 1;
  INSERT INTO tenant_users (user_id, tenant_id, role)
  VALUES (NEW.id, default_tenant, 'admin');
  
  -- Atualiza o app_meta_data com o tenant_id logo no cadastro
  UPDATE auth.users SET raw_app_meta_data = 
    jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{tenant_id}', to_jsonb(default_tenant))
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- OBS: Em um ambiente real Supabase, atrelaríamos este trigger a auth.users.
-- Como estamos refatorando sem acesso shell admin a auth.users agora,
-- usaremos RLS baseado em uma função current_tenant_id() se o JWT falhar.
CREATE OR REPLACE FUNCTION public.current_tenant_id() RETURNS UUID AS $$
  -- Tenta pegar do JWT (padrão SaaS)
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::UUID,
    -- Se falhar (desenvolvimento/banco direto), usa uma variável de sessão temporária
    current_setting('app.current_tenant_id', true)::UUID
  );
$$ LANGUAGE SQL STABLE;


-- 4. Inserir Tenant Padrão para não perder dados existentes
DO $$ 
DECLARE
  default_tenant UUID;
BEGIN
  INSERT INTO tenants (nome) VALUES ('Ótica Lis (Matriz)') RETURNING id INTO default_tenant;

  -- 5. Adicionar tenant_id em TODAS as tabelas existentes
  -- e atualizar para o default_tenant
  
  -- configuracoes_fiscais
  ALTER TABLE configuracoes_fiscais ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
  UPDATE configuracoes_fiscais SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  ALTER TABLE configuracoes_fiscais ALTER COLUMN tenant_id SET DEFAULT current_tenant_id();
  ALTER TABLE configuracoes_fiscais ALTER COLUMN tenant_id SET NOT NULL;

  -- produtos
  ALTER TABLE produtos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
  UPDATE produtos SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  ALTER TABLE produtos ALTER COLUMN tenant_id SET DEFAULT current_tenant_id();
  ALTER TABLE produtos ALTER COLUMN tenant_id SET NOT NULL;

  -- clientes (Também adicionando campos da FASE 0 CRM)
  ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
  ALTER TABLE clientes ADD COLUMN IF NOT EXISTS canal_origem VARCHAR(50);
  ALTER TABLE clientes ADD COLUMN IF NOT EXISTS consentimento_marketing BOOLEAN DEFAULT true;
  UPDATE clientes SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  ALTER TABLE clientes ALTER COLUMN tenant_id SET DEFAULT current_tenant_id();
  ALTER TABLE clientes ALTER COLUMN tenant_id SET NOT NULL;

  -- agendamentos
  ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
  UPDATE agendamentos SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  ALTER TABLE agendamentos ALTER COLUMN tenant_id SET DEFAULT current_tenant_id();
  ALTER TABLE agendamentos ALTER COLUMN tenant_id SET NOT NULL;

  -- categorias
  ALTER TABLE categorias ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
  UPDATE categorias SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  ALTER TABLE categorias ALTER COLUMN tenant_id SET DEFAULT current_tenant_id();
  ALTER TABLE categorias ALTER COLUMN tenant_id SET NOT NULL;

  -- caixas
  ALTER TABLE caixas ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
  UPDATE caixas SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  ALTER TABLE caixas ALTER COLUMN tenant_id SET DEFAULT current_tenant_id();
  ALTER TABLE caixas ALTER COLUMN tenant_id SET NOT NULL;

  -- vendas (Também adicionando campo da FASE 0 CRM)
  ALTER TABLE vendas ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
  ALTER TABLE vendas ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'oculos_completo';
  ALTER TABLE vendas ADD COLUMN IF NOT EXISTS garantia_meses INTEGER;
  ALTER TABLE vendas ADD COLUMN IF NOT EXISTS observacao TEXT;
  UPDATE vendas SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  ALTER TABLE vendas ALTER COLUMN tenant_id SET DEFAULT current_tenant_id();
  ALTER TABLE vendas ALTER COLUMN tenant_id SET NOT NULL;

  -- pagamentos_venda
  ALTER TABLE pagamentos_venda ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
  UPDATE pagamentos_venda SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  ALTER TABLE pagamentos_venda ALTER COLUMN tenant_id SET DEFAULT current_tenant_id();
  ALTER TABLE pagamentos_venda ALTER COLUMN tenant_id SET NOT NULL;

  -- itens_venda
  ALTER TABLE itens_venda ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
  UPDATE itens_venda SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  ALTER TABLE itens_venda ALTER COLUMN tenant_id SET DEFAULT current_tenant_id();
  ALTER TABLE itens_venda ALTER COLUMN tenant_id SET NOT NULL;

  -- movimentos_caixa
  ALTER TABLE movimentos_caixa ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
  UPDATE movimentos_caixa SET tenant_id = default_tenant WHERE tenant_id IS NULL;
  ALTER TABLE movimentos_caixa ALTER COLUMN tenant_id SET DEFAULT current_tenant_id();
  ALTER TABLE movimentos_caixa ALTER COLUMN tenant_id SET NOT NULL;
END $$;

-- 6. Tabela de Eventos de Relacionamento (Timeline CRM FASE 0)
CREATE TABLE IF NOT EXISTS eventos_relacionamento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    tipo_evento VARCHAR(50) NOT NULL, -- compra, campanha_enviada, lembrete_enviado, nps_respondido, ponto_fidelidade
    payload JSONB,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Criar Índices Exigidos (Performance e RLS)
CREATE INDEX IF NOT EXISTS idx_clientes_tenant_id ON clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp ON clientes(whatsapp);

CREATE INDEX IF NOT EXISTS idx_vendas_tenant_id ON vendas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eventos_tenant_id ON eventos_relacionamento(tenant_id);

-- ====================================================
-- 8. POLÍTICAS DE RLS (ROW LEVEL SECURITY)
-- ====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE configuracoes_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentos_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_relacionamento ENABLE ROW LEVEL SECURITY;

-- Aplicar Política de Isolamento Multi-tenant usando a função current_tenant_id()
-- configuracoes_fiscais
CREATE POLICY "Isolamento por Tenant" ON configuracoes_fiscais FOR ALL USING (tenant_id = current_tenant_id());
-- produtos
CREATE POLICY "Isolamento por Tenant" ON produtos FOR ALL USING (tenant_id = current_tenant_id());
-- clientes
CREATE POLICY "Isolamento por Tenant" ON clientes FOR ALL USING (tenant_id = current_tenant_id());
-- agendamentos
CREATE POLICY "Isolamento por Tenant" ON agendamentos FOR ALL USING (tenant_id = current_tenant_id());
-- categorias
CREATE POLICY "Isolamento por Tenant" ON categorias FOR ALL USING (tenant_id = current_tenant_id());
-- caixas
CREATE POLICY "Isolamento por Tenant" ON caixas FOR ALL USING (tenant_id = current_tenant_id());
-- vendas
CREATE POLICY "Isolamento por Tenant" ON vendas FOR ALL USING (tenant_id = current_tenant_id());
-- pagamentos_venda
CREATE POLICY "Isolamento por Tenant" ON pagamentos_venda FOR ALL USING (tenant_id = current_tenant_id());
-- itens_venda
CREATE POLICY "Isolamento por Tenant" ON itens_venda FOR ALL USING (tenant_id = current_tenant_id());
-- movimentos_caixa
CREATE POLICY "Isolamento por Tenant" ON movimentos_caixa FOR ALL USING (tenant_id = current_tenant_id());
-- eventos_relacionamento
CREATE POLICY "Isolamento por Tenant" ON eventos_relacionamento FOR ALL USING (tenant_id = current_tenant_id());

-- Migração de Performance: Índices Estratégicos (Não-Destrutivos)
-- Sistema ERP Ótica LIS

-- 1. Vendas e Ordens de Serviço
CREATE INDEX IF NOT EXISTS idx_vendas_criado_em ON vendas(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_caixa_id ON vendas(caixa_id);

-- 2. Itens de Venda e Pagamentos
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON itens_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_produto_id ON itens_venda(produto_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_venda_venda_id ON pagamentos_venda(venda_id);

-- 3. Caixa Diário e Movimentações
CREATE INDEX IF NOT EXISTS idx_caixas_status_data_abertura ON caixas(status, data_abertura DESC);
CREATE INDEX IF NOT EXISTS idx_movimentos_caixa_caixa_id ON movimentos_caixa(caixa_id);

-- 4. Fichas Clínicas e Refrações
CREATE INDEX IF NOT EXISTS idx_fichas_medicas_cliente_id ON fichas_medicas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_refracoes_ficha_id ON refracoes(ficha_id);

-- 5. CRM e Funil de Vendas
CREATE INDEX IF NOT EXISTS idx_crm_leads_funil_etapa ON crm_leads(funil_id, etapa_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_cliente_id ON crm_leads(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_eventos_lead_id ON crm_lead_eventos(lead_id);

-- 6. Agendamentos
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente_id ON agendamentos(cliente_id);

-- SCRIPT DE REVERSÃO:
-- DROP INDEX IF EXISTS idx_vendas_criado_em, idx_vendas_cliente_id, idx_vendas_caixa_id, idx_itens_venda_venda_id, idx_itens_venda_produto_id, idx_pagamentos_venda_venda_id, idx_caixas_status_data_abertura, idx_movimentos_caixa_caixa_id, idx_fichas_medicas_cliente_id, idx_refracoes_ficha_id, idx_crm_leads_funil_etapa, idx_crm_leads_cliente_id, idx_crm_lead_eventos_lead_id, idx_agendamentos_cliente_id;

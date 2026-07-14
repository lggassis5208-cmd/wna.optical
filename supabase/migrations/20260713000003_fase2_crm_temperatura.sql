-- ====================================================
-- MIGRAÇÃO: CRM FASE 2 - TEMPERATURA DO LEAD
-- ====================================================

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS temperatura VARCHAR(20) DEFAULT 'frio' CHECK (temperatura IN ('frio', 'morno', 'quente', 'fidelizado'));

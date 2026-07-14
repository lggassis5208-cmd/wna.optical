-- ====================================================
-- MIGRAÇÃO: CRM FASE 4 - ROBÔ DE PÓS-VENDA COMPLETO
-- ====================================================

-- 1. Tabela de Supressão (Opt-outs e Descadastros LGPD)
CREATE TABLE IF NOT EXISTS lista_supressao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT current_tenant_id() NOT NULL REFERENCES tenants(id),
    whatsapp VARCHAR(20) NOT NULL,
    motivo VARCHAR(100) DEFAULT 'Descadastro voluntário (PARE)',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uk_lista_supressao_tenant_wa UNIQUE (tenant_id, whatsapp)
);

ALTER TABLE lista_supressao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Isolamento da Lista de Supressão" ON lista_supressao FOR ALL USING (tenant_id = current_tenant_id());

-- 2. Evolução da Tabela Clientes (Consentimento de Saúde LGPD - Art. 11)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS consentimento_saude BOOLEAN DEFAULT false;

-- 3. Evolução da Tabela pos_venda_envios (Suporte a Múltiplos Gatilhos e Idempotência)
ALTER TABLE pos_venda_envios ADD COLUMN IF NOT EXISTS tipo_gatilho VARCHAR(50) DEFAULT 'recompra_entrega';
ALTER TABLE pos_venda_envios ADD COLUMN IF NOT EXISTS ciclo_referencia VARCHAR(100);
ALTER TABLE pos_venda_envios ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Atualizar CHECK de status para aceitar 'respondido'
ALTER TABLE pos_venda_envios DROP CONSTRAINT IF EXISTS pos_venda_envios_status_check;
ALTER TABLE pos_venda_envios ADD CONSTRAINT pos_venda_envios_status_check 
    CHECK (status IN ('pendente', 'enviado', 'falha', 'respondido', 'cancelado'));

-- Índice único de Idempotência (garante que um cliente nunca receba 2x a mesma régua no mesmo ciclo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_venda_envios_idempotencia 
    ON pos_venda_envios (tenant_id, cliente_id, tipo_gatilho, ciclo_referencia)
    WHERE ciclo_referencia IS NOT NULL;

-- 4. Evolução da Tabela pos_venda_config (Réguas Ativas, Prazos e Variações Anti-ban)
ALTER TABLE pos_venda_config ADD COLUMN IF NOT EXISTS reguas_ativas JSONB DEFAULT '{
  "aniversario": true,
  "adaptacao_7d": true,
  "renovacao_11m": true,
  "recompra_entrega": true,
  "inativo": true,
  "recall_exame": true
}'::jsonb;

ALTER TABLE pos_venda_config ADD COLUMN IF NOT EXISTS prazos JSONB DEFAULT '{
  "adaptacao_dias": 7,
  "renovacao_meses": 11,
  "inativo_meses": 18,
  "recall_meses": 12
}'::jsonb;

-- Atualizar templates padrão com variações anti-ban
UPDATE pos_venda_config SET templates = '{
  "aniversario": [
    "🎂 Parabéns {{nome}}! A equipe da Ótica Lis te deseja um feliz aniversário! Preparamos um presente especial para você: um voucher de 20% de desconto na sua próxima compra. Aproveite o seu mês!",
    "🎉 Feliz aniversário, {{nome}}! Muita paz, saúde e visão nítida! Passando para lembrar que você tem 20% OFF de presente de aniversário aqui na Ótica Lis. Venha nos visitar!",
    "🎈 {{nome}}, hoje o dia é todo seu! Parabéns! Que tal comemorar com óculos novos? Apresente esta mensagem e ganhe 20% de desconto de aniversário!"
  ],
  "adaptacao_7d": [
    "👓 Olá {{nome}}, tudo bem? Já faz 1 semana que você retirou seus óculos novos aqui na Ótica Lis. Como está a adaptação com as lentes? Está tudo confortável?",
    "✨ Oi {{nome}}, aqui é da Ótica Lis! Passando para saber como têm sido os primeiros 7 dias com seu óculos novo. A visão está nítida e a armação confortável?",
    "Ola {{nome}}, como vai a adaptação ao óculos entregue há uma semana? Se precisar de qualquer ajuste na armação ou limpeza, estamos à disposição na Ótica Lis!"
  ],
  "renovacao_11m": [
    "📋 Olá {{nome}}, como está sua visão? Notamos que já faz quase 1 ano da sua última compra/consulta conosco. A receita oftalmológica costuma vencer em 12 meses. Que tal agendar sua revisão?",
    "👁️ Oi {{nome}}, tudo bem? Com o passar dos meses, nosso grau pode mudar sem percebermos. Já faz 11 meses do seu último óculos na Ótica Lis. Vamos agendar uma nova verificação de grau?",
    "Olá {{nome}}! Cuidar da saúde visual é fundamental. Como sua última consulta/óculos já tem quase 1 ano, recomendamos fazer uma revisão. Podemos agendar um horário?"
  ],
  "recompra_entrega": [
    "✨ Olá {{nome}}, passando para saber como estão seus óculos da Ótica Lis! Lembre-se que você tem manutenção e ajustes gratuitos sempre que precisar.",
    "👓 Oi {{nome}}! Tudo certo com seus óculos? Se precisar de limpeza ultrassônica ou ajuste nas hastes, passe na Ótica Lis, teremos prazer em atender!",
    "Olá {{nome}}, esperamos que esteja aproveitando muito seus óculos! Quando quiser conhecer os novos lançamentos de solares ou grau, estaremos esperando por você!"
  ],
  "inativo": [
    "Saudades de você, {{nome}}! Notamos que faz um tempo desde sua última visita à Ótica Lis. Recebemos coleções incríveis e separamos uma condição exclusiva para o seu retorno!",
    "Olá {{nome}}, tudo bem? Há quanto tempo não renova o visual? Venha tomar um café conosco na Ótica Lis e conferir as novas armações tendência da estação com desconto especial!",
    "Oi {{nome}}! A Ótica Lis está com novidades maravilhosas em lentes de alta tecnologia e armações ultraleves. Venha conferir e aproveite nosso check-up visual grátis!"
  ],
  "recall_exame": [
    "🔬 Olá {{nome}}! A saúde dos seus olhos precisa de cuidado contínuo. Como já se passou mais de um ano desde sua última consulta, convidamos você para um exame de rotina.",
    "👁️ Oi {{nome}}, a prevenção é o melhor remédio para a visão. Já faz mais de 12 meses do seu último exame na Ótica Lis. Vamos agendar uma revisão com nosso optometrista/oftalmologista?",
    "Olá {{nome}}, você sabia que exames anuais evitam o agravamento de problemas oculares? Sua última consulta completa completou mais de um ano. Fale conosco para agendar sua revisão!"
  ]
}'::jsonb WHERE templates->>'aniversario' IS NULL OR templates->>'15' IS NOT NULL;

-- 5. Atualizar Trigger agendar_pos_venda para calcular a partir de entregue_em
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
        
        -- Cria os envios baseados nos marcos a partir de entregue_em
        IF config.id IS NOT NULL AND NEW.cliente_id IS NOT NULL THEN
            -- 1. Agendar Régua de Recompra (marcos_dias: 15, 30, 60, 90, 180)
            IF COALESCE((config.reguas_ativas->>'recompra_entrega')::boolean, true) THEN
                FOREACH marco IN ARRAY config.marcos_dias
                LOOP
                    INSERT INTO pos_venda_envios (
                        tenant_id, venda_id, cliente_id, marco_dia, 
                        tipo_gatilho, agendado_para, status, ciclo_referencia
                    )
                    VALUES (
                        NEW.tenant_id, NEW.id, NEW.cliente_id, marco, 
                        'recompra_entrega', NEW.entregue_em + (marco || ' days')::INTERVAL, 
                        'pendente', NEW.id || '_recompra_' || marco
                    )
                    ON CONFLICT (tenant_id, cliente_id, tipo_gatilho, ciclo_referencia) 
                    WHERE ciclo_referencia IS NOT NULL DO NOTHING;
                END LOOP;
            END IF;

            -- 2. Agendar Régua de Adaptação (D+7 contados da entrega)
            IF COALESCE((config.reguas_ativas->>'adaptacao_7d')::boolean, true) THEN
                INSERT INTO pos_venda_envios (
                    tenant_id, venda_id, cliente_id, marco_dia, 
                    tipo_gatilho, agendado_para, status, ciclo_referencia
                )
                VALUES (
                    NEW.tenant_id, NEW.id, NEW.cliente_id, COALESCE((config.prazos->>'adaptacao_dias')::int, 7), 
                    'adaptacao_7d', NEW.entregue_em + (COALESCE((config.prazos->>'adaptacao_dias')::int, 7) || ' days')::INTERVAL, 
                    'pendente', NEW.id || '_adaptacao'
                )
                ON CONFLICT (tenant_id, cliente_id, tipo_gatilho, ciclo_referencia) 
                WHERE ciclo_referencia IS NOT NULL DO NOTHING;
            END IF;

            -- 3. Agendar Régua de Renovação de Receita (D+11 meses contados da entrega/venda)
            IF COALESCE((config.reguas_ativas->>'renovacao_11m')::boolean, true) THEN
                INSERT INTO pos_venda_envios (
                    tenant_id, venda_id, cliente_id, marco_dia, 
                    tipo_gatilho, agendado_para, status, ciclo_referencia
                )
                VALUES (
                    NEW.tenant_id, NEW.id, NEW.cliente_id, COALESCE((config.prazos->>'renovacao_meses')::int, 11) * 30, 
                    'renovacao_11m', NEW.entregue_em + (COALESCE((config.prazos->>'renovacao_meses')::int, 11) || ' months')::INTERVAL, 
                    'pendente', NEW.id || '_renovacao'
                )
                ON CONFLICT (tenant_id, cliente_id, tipo_gatilho, ciclo_referencia) 
                WHERE ciclo_referencia IS NOT NULL DO NOTHING;
            END IF;
        END IF;
    END IF;

    -- Lidar com Cancelamento da Venda
    IF NEW.status = 'CANCELADA' AND (OLD.status IS DISTINCT FROM 'CANCELADA') THEN
        UPDATE pos_venda_envios 
        SET status = 'cancelado', motivo_cancelamento = 'OS Cancelada', atualizado_em = NOW()
        WHERE venda_id = NEW.id AND status = 'pendente';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Função RPC de Sincronização Sob Demanda para Aniversariantes, Inativos e Recall
CREATE OR REPLACE FUNCTION public.sincronizar_filas_pos_venda(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
    config pos_venda_config%ROWTYPE;
    v_inseridos INTEGER := 0;
    v_row RECORD;
    v_ano_atual TEXT := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_mes_ano_atual TEXT := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
BEGIN
    SELECT * INTO config FROM pos_venda_config WHERE tenant_id = p_tenant_id LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('sucesso', false, 'erro', 'Configuração não encontrada para o tenant');
    END IF;

    -- 1. Aniversariantes do Mês Atual
    IF COALESCE((config.reguas_ativas->>'aniversario')::boolean, true) THEN
        FOR v_row IN 
            SELECT c.id AS cliente_id
            FROM clientes c
            WHERE c.tenant_id = p_tenant_id
              AND c.data_nascimento IS NOT NULL
              AND TO_CHAR(c.data_nascimento, 'MM') = TO_CHAR(CURRENT_DATE, 'MM')
              AND c.whatsapp IS NOT NULL
              AND c.consentimento_marketing = true
              AND NOT EXISTS (SELECT 1 FROM lista_supressao s WHERE s.tenant_id = p_tenant_id AND s.whatsapp = c.whatsapp)
        LOOP
            INSERT INTO pos_venda_envios (
                tenant_id, cliente_id, venda_id, marco_dia, 
                tipo_gatilho, agendado_para, status, ciclo_referencia
            )
            VALUES (
                p_tenant_id, v_row.cliente_id, (SELECT id FROM vendas WHERE cliente_id = v_row.cliente_id ORDER BY criado_em DESC LIMIT 1), 0,
                'aniversario', CURRENT_DATE + TIME '10:00:00',
                'pendente', v_row.cliente_id || '_aniversario_' || v_ano_atual
            )
            ON CONFLICT (tenant_id, cliente_id, tipo_gatilho, ciclo_referencia) 
            WHERE ciclo_referencia IS NOT NULL DO NOTHING;
            
            IF FOUND THEN v_inseridos := v_inseridos + 1; END IF;
        END LOOP;
    END IF;

    -- 2. Clientes Inativos (> X meses sem compra)
    IF COALESCE((config.reguas_ativas->>'inativo')::boolean, true) THEN
        FOR v_row IN 
            SELECT c.id AS cliente_id, MAX(v.criado_em) AS ultima_compra
            FROM clientes c
            JOIN vendas v ON v.cliente_id = c.id AND v.tenant_id = p_tenant_id AND v.status = 'ENTREGUE'
            WHERE c.tenant_id = p_tenant_id
              AND c.whatsapp IS NOT NULL
              AND c.consentimento_marketing = true
              AND NOT EXISTS (SELECT 1 FROM lista_supressao s WHERE s.tenant_id = p_tenant_id AND s.whatsapp = c.whatsapp)
            GROUP BY c.id
            HAVING MAX(v.criado_em) < (CURRENT_DATE - (COALESCE((config.prazos->>'inativo_meses')::int, 18) || ' months')::INTERVAL)
        LOOP
            INSERT INTO pos_venda_envios (
                tenant_id, cliente_id, venda_id, marco_dia, 
                tipo_gatilho, agendado_para, status, ciclo_referencia
            )
            VALUES (
                p_tenant_id, v_row.cliente_id, (SELECT id FROM vendas WHERE cliente_id = v_row.cliente_id ORDER BY criado_em DESC LIMIT 1), COALESCE((config.prazos->>'inativo_meses')::int, 18) * 30,
                'inativo', CURRENT_DATE + TIME '11:00:00',
                'pendente', v_row.cliente_id || '_inativo_' || v_mes_ano_atual
            )
            ON CONFLICT (tenant_id, cliente_id, tipo_gatilho, ciclo_referencia) 
            WHERE ciclo_referencia IS NOT NULL DO NOTHING;
            
            IF FOUND THEN v_inseridos := v_inseridos + 1; END IF;
        END LOOP;
    END IF;

    -- 3. Recall de Exame (> X meses desde a última consulta/exame - REQUER CONSENTIMENTO DE SAÚDE)
    IF COALESCE((config.reguas_ativas->>'recall_exame')::boolean, true) THEN
        FOR v_row IN 
            SELECT c.id AS cliente_id, MAX(v.criado_em) AS ultima_consulta
            FROM clientes c
            JOIN vendas v ON v.cliente_id = c.id AND v.tenant_id = p_tenant_id AND v.status = 'ENTREGUE'
            WHERE c.tenant_id = p_tenant_id
              AND c.whatsapp IS NOT NULL
              AND c.consentimento_marketing = true
              AND c.consentimento_saude = true
              AND NOT EXISTS (SELECT 1 FROM lista_supressao s WHERE s.tenant_id = p_tenant_id AND s.whatsapp = c.whatsapp)
            GROUP BY c.id
            HAVING MAX(v.criado_em) < (CURRENT_DATE - (COALESCE((config.prazos->>'recall_meses')::int, 12) || ' months')::INTERVAL)
        LOOP
            INSERT INTO pos_venda_envios (
                tenant_id, cliente_id, venda_id, marco_dia, 
                tipo_gatilho, agendado_para, status, ciclo_referencia
            )
            VALUES (
                p_tenant_id, v_row.cliente_id, (SELECT id FROM vendas WHERE cliente_id = v_row.cliente_id ORDER BY criado_em DESC LIMIT 1), COALESCE((config.prazos->>'recall_meses')::int, 12) * 30,
                'recall_exame', CURRENT_DATE + TIME '14:00:00',
                'pendente', v_row.cliente_id || '_recall_' || TO_CHAR(CURRENT_DATE, 'YYYY-Q')
            )
            ON CONFLICT (tenant_id, cliente_id, tipo_gatilho, ciclo_referencia) 
            WHERE ciclo_referencia IS NOT NULL DO NOTHING;
            
            IF FOUND THEN v_inseridos := v_inseridos + 1; END IF;
        END LOOP;
    END IF;

    RETURN jsonb_build_object('sucesso', true, 'novos_enfileirados', v_inseridos);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

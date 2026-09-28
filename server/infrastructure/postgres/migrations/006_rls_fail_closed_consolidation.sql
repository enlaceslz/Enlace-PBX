-- ====================================================================
-- Enlace-PBX Enterprise — Migração 006
-- Consolidação RLS Fail-Closed em 100% das Tabelas Multi-Tenant
-- Proíbe acesso quando tenant_id for nulo (Fail-Closed estrito)
-- ====================================================================

-- 1. Assegurar que current_app_tenant() e is_app_super_admin() existam e sejam imutáveis por transação
CREATE OR REPLACE FUNCTION current_app_tenant() RETURNS VARCHAR AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '');
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_app_super_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(current_setting('app.is_super_admin', true) = 'true', false);
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Habilitação de RLS em todas as tabelas que possuem coluna tenant_id
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dids ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ring_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ivrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_session_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_tool_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cdr ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cel ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customer_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS omnichannel_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS billing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quality_audits ENABLE ROW LEVEL SECURITY;

-- 3. Aplicação das Políticas RLS Fail-Closed (Sem bypass por tenant nulo)
DO $$
DECLARE
    tbl text;
    tenant_tables text[] := ARRAY[
        'users', 'extensions', 'trunks', 'dids', 'routes', 'queues',
        'ring_groups', 'ivrs', 'ai_agents', 'ai_tools', 'ai_sessions', 
        'ai_session_turns', 'ai_session_events', 'ai_tool_executions',
        'ai_knowledge', 'ai_providers', 'cdr', 'cel', 'recordings',
        'audit_logs', 'billing', 'campaigns', 'crm_contacts',
        'customer_memories', 'omnichannel_conversations',
        'billing_transactions', 'billing_invoices', 'quality_audits'
    ];
BEGIN
    FOREACH tbl IN ARRAY tenant_tables LOOP
        -- Verifica se a tabela existe antes de criar a política
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
            EXECUTE format('DROP POLICY IF EXISTS rls_%I_tenant ON %I', tbl, tbl);
            EXECUTE format('
                CREATE POLICY rls_%I_tenant ON %I FOR ALL
                USING (
                    is_app_super_admin() 
                    OR (current_app_tenant() IS NOT NULL AND tenant_id = current_app_tenant())
                )
                WITH CHECK (
                    is_app_super_admin() 
                    OR (current_app_tenant() IS NOT NULL AND tenant_id = current_app_tenant())
                )
            ', tbl, tbl);
        END IF;
    END LOOP;
END $$;

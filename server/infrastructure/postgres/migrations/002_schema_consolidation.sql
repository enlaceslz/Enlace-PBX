-- ====================================================================
-- ENLACE-PBX ENTERPRISE - MIGRATION 002: CONSOLIDAÇÃO E RLS
-- RLS (Row Level Security), Tabela de Migrações e Knowledge RAG
-- ====================================================================

-- 1. Tabela para rastreabilidade de migrações executadas
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Conhecimento RAG para a MaIA (ai_knowledge)
CREATE TABLE IF NOT EXISTS ai_knowledge (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT 'Geral',
    content TEXT NOT NULL,
    file_name VARCHAR(255),
    file_type VARCHAR(64),
    file_size_bytes BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_tenant ON ai_knowledge(tenant_id);

-- 3. Tabela de Provedores de IA (ai_providers)
CREATE TABLE IF NOT EXISTS ai_providers (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    provider_type VARCHAR(64) NOT NULL DEFAULT 'gemini_api',
    base_url VARCHAR(512),
    api_key_masked VARCHAR(255) NOT NULL,
    google_project_id VARCHAR(128),
    google_location VARCHAR(64),
    default_model VARCHAR(64) NOT NULL DEFAULT 'gemini-flash-latest',
    default_voice VARCHAR(64) NOT NULL DEFAULT 'pt-BR-Wavenet-A',
    default_temperature NUMERIC(3, 2) NOT NULL DEFAULT 0.70,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_providers_tenant ON ai_providers(tenant_id);

-- 4. Função auxiliar para verificar tenant na sessão PostgreSQL
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

-- 5. Habilitar RLS em tabelas multi-tenant com segurança em profundidade
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dids ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE ring_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ivrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdr ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Usuário só enxerga o tenant autenticado, a menos que seja super_admin ou sessão interna
DO $$
BEGIN
    -- Extensions
    DROP POLICY IF EXISTS rls_extensions_tenant ON extensions;
    CREATE POLICY rls_extensions_tenant ON extensions FOR ALL
    USING (
        current_app_tenant() IS NULL 
        OR is_app_super_admin() 
        OR tenant_id = current_app_tenant()
    );

    -- Trunks
    DROP POLICY IF EXISTS rls_trunks_tenant ON trunks;
    CREATE POLICY rls_trunks_tenant ON trunks FOR ALL
    USING (
        current_app_tenant() IS NULL 
        OR is_app_super_admin() 
        OR tenant_id = current_app_tenant()
    );

    -- Dids
    DROP POLICY IF EXISTS rls_dids_tenant ON dids;
    CREATE POLICY rls_dids_tenant ON dids FOR ALL
    USING (
        current_app_tenant() IS NULL 
        OR is_app_super_admin() 
        OR tenant_id = current_app_tenant()
    );

    -- Routes
    DROP POLICY IF EXISTS rls_routes_tenant ON routes;
    CREATE POLICY rls_routes_tenant ON routes FOR ALL
    USING (
        current_app_tenant() IS NULL 
        OR is_app_super_admin() 
        OR tenant_id = current_app_tenant()
    );

    -- Queues
    DROP POLICY IF EXISTS rls_queues_tenant ON queues;
    CREATE POLICY rls_queues_tenant ON queues FOR ALL
    USING (
        current_app_tenant() IS NULL 
        OR is_app_super_admin() 
        OR tenant_id = current_app_tenant()
    );

    -- CDR
    DROP POLICY IF EXISTS rls_cdr_tenant ON cdr;
    CREATE POLICY rls_cdr_tenant ON cdr FOR ALL
    USING (
        current_app_tenant() IS NULL 
        OR is_app_super_admin() 
        OR tenant_id = current_app_tenant()
    );

    -- Audit Logs
    DROP POLICY IF EXISTS rls_audit_logs_tenant ON audit_logs;
    CREATE POLICY rls_audit_logs_tenant ON audit_logs FOR ALL
    USING (
        current_app_tenant() IS NULL 
        OR is_app_super_admin() 
        OR tenant_id = current_app_tenant()
    );

    -- AI Agents
    DROP POLICY IF EXISTS rls_ai_agents_tenant ON ai_agents;
    CREATE POLICY rls_ai_agents_tenant ON ai_agents FOR ALL
    USING (
        current_app_tenant() IS NULL 
        OR is_app_super_admin() 
        OR tenant_id = current_app_tenant()
    );

    -- AI Knowledge
    DROP POLICY IF EXISTS rls_ai_knowledge_tenant ON ai_knowledge;
    CREATE POLICY rls_ai_knowledge_tenant ON ai_knowledge FOR ALL
    USING (
        current_app_tenant() IS NULL 
        OR is_app_super_admin() 
        OR tenant_id = current_app_tenant()
    );
END $$;

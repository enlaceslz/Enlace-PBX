-- ====================================================================
-- Enlace-PBX Enterprise — Migração 007
-- Hardening RLS (FORCE ROW LEVEL SECURITY), Imutabilidade de Auditoria
-- e Função de Autenticação Segura (Identity Lookup)
-- ====================================================================

-- 1. FORCE ROW LEVEL SECURITY em todas as 28 tabelas de tenant
-- Garante que o isolamento RLS seja aplicado obrigatoriamente inclusive para o dono da tabela
ALTER TABLE IF EXISTS users FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS extensions FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trunks FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dids FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS routes FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS queues FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ring_groups FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ivrs FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_agents FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_tools FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_session_turns FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_session_events FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_tool_executions FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_knowledge FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_providers FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cdr FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cel FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recordings FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS billing FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS campaigns FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm_contacts FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customer_memories FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS omnichannel_conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS billing_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS billing_invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quality_audits FORCE ROW LEVEL SECURITY;

-- 2. Coluna previous_hash para encadeamento criptográfico dos logs de auditoria (Blockchain-style)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='previous_hash') THEN
        ALTER TABLE audit_logs ADD COLUMN previous_hash VARCHAR(64) DEFAULT '0000000000000000000000000000000000000000000000000000000000000000';
    END IF;
END $$;

-- 3. Trigger Append-Only estrito na tabela audit_logs (Proíbe UPDATE e DELETE)
CREATE OR REPLACE FUNCTION trg_audit_logs_append_only() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'AUDIT_LOG_IMMUTABLE: Registros de auditoria do Enlace-PBX são estritamente append-only. Operações de UPDATE ou DELETE são proibidas por segurança e conformidade LGPD.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_no_update_delete ON audit_logs;
CREATE TRIGGER trg_audit_logs_no_update_delete
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION trg_audit_logs_append_only();

-- 4. Função controlada de busca de identidade para Login (Identity Lookup)
-- Permite localizar credenciais e tenantId com segurança sem necessidade de abrir RLS global
CREATE OR REPLACE FUNCTION authenticate_user_identity(p_email VARCHAR)
RETURNS TABLE (
    id VARCHAR,
    tenant_id VARCHAR,
    name VARCHAR,
    email VARCHAR,
    password_hash VARCHAR,
    role VARCHAR,
    extension VARCHAR,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.tenant_id, u.name, u.email, u.password_hash, u.role, u.extension, u.is_active
    FROM users u
    WHERE LOWER(u.email) = LOWER(p_email)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Definição do Papel da Aplicação (DB_APP sem privilégios de bypass RLS ou DDL)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'enlace_app') THEN
        CREATE ROLE enlace_app WITH LOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
    ELSE
        ALTER ROLE enlace_app WITH NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
END $$;

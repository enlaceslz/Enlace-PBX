-- ====================================================================
-- Enlace-PBX Enterprise — Migração 008
-- Hardening Estrito de Funções SECURITY DEFINER e Separação de Papéis DB
-- Previne Search-Path Injection, revoga permissões públicas e restringe DB_APP
-- ====================================================================

-- 1. Hardening da função authenticate_user_identity (Search-Path Injection Defense)
-- Define explicitamente search_path imutável para evitar ataques de injeção de esquemas maliciosos
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
) 
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.tenant_id, u.name, u.email, u.password_hash, u.role, u.extension, u.is_active
    FROM users u
    WHERE LOWER(u.email) = LOWER(p_email)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 2. Restrição de Execução da Função (Princípio do Menor Privilégio)
-- Nenhuma função sensível de autenticação deve ser acessível publicamente
REVOKE ALL ON FUNCTION authenticate_user_identity(VARCHAR) FROM PUBLIC;

-- 3. Definição e Hardening do Papel da Aplicação em Produção (DB_APP: enlace_app)
-- enlace_app NÃO PODE: ignorar RLS, alterar esquema, criar papéis ou bancos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'enlace_app') THEN
        CREATE ROLE enlace_app WITH LOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
    ELSE
        ALTER ROLE enlace_app WITH NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
END $$;

-- 4. Concessão de Privilégios Mínimos Operacionais para o DB_APP
GRANT CONNECT ON DATABASE enlace_pbx TO enlace_app;
GRANT USAGE ON SCHEMA public TO enlace_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO enlace_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO enlace_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO enlace_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO enlace_app;

-- Concede execução da função controlada de autenticação para o usuário de aplicação
GRANT EXECUTE ON FUNCTION authenticate_user_identity(VARCHAR) TO enlace_app;

-- Proíbe expressamente DDL para enlace_app (apenas DB_OWNER pode executar DDL)
REVOKE CREATE ON SCHEMA public FROM enlace_app;

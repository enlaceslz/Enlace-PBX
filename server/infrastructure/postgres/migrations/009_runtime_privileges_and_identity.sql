-- A autenticação usa e-mail sem seletor de empresa: identidades devem ser únicas.
-- Duplicidades existentes bloqueiam esta migração e exigem revisão administrativa.
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_global ON public.users (LOWER(email));

-- O processo HTTP apenas consulta o histórico. DDL e migrações são administrativos.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.schema_migrations FROM enlace_app;
GRANT SELECT ON public.schema_migrations TO enlace_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- Resolve a identidade em contexto controlado, mesmo quando o dono está sujeito a FORCE RLS.
ALTER FUNCTION public.authenticate_user_identity(VARCHAR) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.authenticate_user_identity(VARCHAR) SET app.is_super_admin = 'true';
REVOKE ALL ON FUNCTION public.authenticate_user_identity(VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authenticate_user_identity(VARCHAR) TO enlace_app;

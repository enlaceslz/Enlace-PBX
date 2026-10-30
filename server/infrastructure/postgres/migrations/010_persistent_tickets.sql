-- Chamados locais da MaIA: confirmação só depois de persistência, com idempotência por empresa.
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES public.tenants(id),
  request_id VARCHAR(128) NOT NULL,
  protocol VARCHAR(64) NOT NULL UNIQUE,
  caller_number VARCHAR(64) NOT NULL,
  category VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  urgency VARCHAR(16) NOT NULL CHECK (urgency IN ('baixa', 'media', 'alta')),
  status VARCHAR(16) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_atendimento', 'fechado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, request_id)
);
CREATE INDEX IF NOT EXISTS support_tickets_tenant_created ON public.support_tickets(tenant_id, created_at DESC);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS support_tickets_isolation ON public.support_tickets;
CREATE POLICY support_tickets_isolation ON public.support_tickets FOR ALL
  USING (public.is_app_super_admin() OR (public.current_app_tenant() IS NOT NULL AND tenant_id = public.current_app_tenant()))
  WITH CHECK (public.is_app_super_admin() OR (public.current_app_tenant() IS NOT NULL AND tenant_id = public.current_app_tenant()));
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO enlace_app;

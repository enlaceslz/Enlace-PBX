-- Webhooks de teste e tentativas reais, sempre vinculados à empresa.
CREATE TABLE public.outbound_webhooks (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES public.tenants(id),
  name VARCHAR(120) NOT NULL,
  endpoint VARCHAR(2048) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id, tenant_id)
);
CREATE TABLE public.webhook_deliveries (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES public.tenants(id),
  webhook_id VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL CHECK (status IN ('PENDING','ACKNOWLEDGED','UNKNOWN')),
  http_status INTEGER,
  duration_ms INTEGER,
  error_message VARCHAR(240),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  FOREIGN KEY (webhook_id, tenant_id) REFERENCES public.outbound_webhooks(id, tenant_id)
);
CREATE INDEX webhook_deliveries_tenant_created ON public.webhook_deliveries(tenant_id, webhook_id, created_at DESC);
ALTER TABLE public.outbound_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_webhooks FORCE ROW LEVEL SECURITY;
CREATE POLICY outbound_webhooks_isolation ON public.outbound_webhooks FOR ALL
 USING (public.is_app_super_admin() OR tenant_id = public.current_app_tenant())
 WITH CHECK (public.is_app_super_admin() OR tenant_id = public.current_app_tenant());
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries FORCE ROW LEVEL SECURITY;
CREATE POLICY webhook_deliveries_isolation ON public.webhook_deliveries FOR ALL
 USING (public.is_app_super_admin() OR tenant_id = public.current_app_tenant())
 WITH CHECK (public.is_app_super_admin() OR tenant_id = public.current_app_tenant());
GRANT SELECT, INSERT, UPDATE ON public.outbound_webhooks, public.webhook_deliveries TO enlace_app;

-- Preparação persistente, sem ativar discagem ou reinterpretar contadores antigos.
ALTER TABLE public.campaigns ADD COLUMN plan_version INTEGER NOT NULL DEFAULT 0 CHECK(plan_version>=0);
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_id_tenant_unique UNIQUE(id,tenant_id);
CREATE TABLE public.campaign_leads (
 campaign_id VARCHAR(64) NOT NULL,
 tenant_id VARCHAR(64) NOT NULL,
 phone VARCHAR(13) NOT NULL CHECK(phone ~ '^55[1-9][0-9]{9,10}$'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(campaign_id,phone),
 FOREIGN KEY(campaign_id,tenant_id) REFERENCES public.campaigns(id,tenant_id) ON DELETE CASCADE
);
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_leads FORCE ROW LEVEL SECURITY;
CREATE POLICY campaign_leads_isolation ON public.campaign_leads FOR ALL
 USING(public.is_app_super_admin() OR tenant_id=public.current_app_tenant())
 WITH CHECK(public.is_app_super_admin() OR tenant_id=public.current_app_tenant());
GRANT SELECT,INSERT,DELETE ON public.campaign_leads TO enlace_app;

-- Não validar silenciosamente vínculos antigos; novos vínculos precisam ser da empresa.
ALTER TABLE public.ai_agents ADD CONSTRAINT ai_agents_id_tenant_unique UNIQUE(id,tenant_id);
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_agent_tenant_fk FOREIGN KEY(ai_agent_id,tenant_id) REFERENCES public.ai_agents(id,tenant_id) NOT VALID;

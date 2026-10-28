-- Esquemas de extração pertencem à empresa; não reutilizar a configuração global antiga.
CREATE TABLE public.entity_extraction_schemas (
 id VARCHAR(64) PRIMARY KEY,
 tenant_id VARCHAR(64) NOT NULL REFERENCES public.tenants(id),
 name VARCHAR(120) NOT NULL,
 description VARCHAR(2000) NOT NULL DEFAULT '',
 fields JSONB NOT NULL CHECK(jsonb_typeof(fields)='array'),
 is_active BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public.entity_extraction_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_extraction_schemas FORCE ROW LEVEL SECURITY;
CREATE POLICY entity_extraction_schemas_isolation ON public.entity_extraction_schemas FOR ALL
 USING(public.is_app_super_admin() OR tenant_id=public.current_app_tenant())
 WITH CHECK(public.is_app_super_admin() OR tenant_id=public.current_app_tenant());
GRANT SELECT,INSERT,UPDATE ON public.entity_extraction_schemas TO enlace_app;

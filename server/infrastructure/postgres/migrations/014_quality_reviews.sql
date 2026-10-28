-- Revisões assistidas com evidências; sem pontuação ou conformidade automática.
CREATE TABLE public.quality_reviews (
 id VARCHAR(64) PRIMARY KEY,
 tenant_id VARCHAR(64) NOT NULL REFERENCES public.tenants(id),
 source_reference VARCHAR(128),
 channel VARCHAR(16) NOT NULL CHECK(channel IN ('voice','whatsapp','webrtc')),
 evidence JSONB NOT NULL,
 rejected_fields JSONB NOT NULL,
 model VARCHAR(128) NOT NULL,
 provider VARCHAR(64) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','REVIEWED')),
 created_by VARCHAR(64) NOT NULL,
 reviewed_by VARCHAR(64),
 review_note VARCHAR(2000),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 reviewed_at TIMESTAMPTZ,
 CHECK((status='PENDING' AND reviewed_by IS NULL AND review_note IS NULL AND reviewed_at IS NULL)
 OR (status='REVIEWED' AND reviewed_by IS NOT NULL AND review_note IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE INDEX quality_reviews_tenant_created ON public.quality_reviews(tenant_id,created_at DESC);
ALTER TABLE public.quality_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_reviews FORCE ROW LEVEL SECURITY;
CREATE POLICY quality_reviews_isolation ON public.quality_reviews FOR ALL
 USING(public.is_app_super_admin() OR tenant_id=public.current_app_tenant())
 WITH CHECK(public.is_app_super_admin() OR tenant_id=public.current_app_tenant());
REVOKE UPDATE,DELETE ON public.quality_reviews FROM enlace_app;
GRANT SELECT,INSERT ON public.quality_reviews TO enlace_app;
GRANT UPDATE(status,reviewed_by,review_note,reviewed_at) ON public.quality_reviews TO enlace_app;

-- A revisão humana só pode ser registrada uma vez; a evidência nunca é editada nesse fluxo.
CREATE FUNCTION public.protect_quality_review() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF OLD.status <> 'PENDING' OR NEW.status <> 'REVIEWED' OR
 ROW(NEW.id,NEW.tenant_id,NEW.source_reference,NEW.channel,NEW.evidence,NEW.rejected_fields,NEW.model,NEW.provider,NEW.created_by,NEW.created_at)
 IS DISTINCT FROM ROW(OLD.id,OLD.tenant_id,OLD.source_reference,OLD.channel,OLD.evidence,OLD.rejected_fields,OLD.model,OLD.provider,OLD.created_by,OLD.created_at)
 THEN RAISE EXCEPTION 'Revisão não pode ser sobrescrita'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER quality_review_protection BEFORE UPDATE ON public.quality_reviews FOR EACH ROW EXECUTE FUNCTION public.protect_quality_review();

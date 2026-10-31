-- Pré-requisito da migração histórica 006. Ordenação lexical após 004 e antes de 005/006.
-- Preserva os checksums históricos e permite instalar em banco vazio.
ALTER TABLE public.cel ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_cel_tenant ON public.cel(tenant_id);

-- Somente o CDR com o mesmo identificador comprova o vínculo do evento à empresa.
-- Eventos sem correspondência continuam nulos e invisíveis sob RLS fail-closed.
UPDATE public.cel AS event
SET tenant_id = cdr_record.tenant_id
FROM public.cdr AS cdr_record
WHERE event.tenant_id IS NULL AND event.uniqueid = cdr_record.uniqueid;

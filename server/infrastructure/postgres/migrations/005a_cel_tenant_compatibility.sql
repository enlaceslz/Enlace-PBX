-- Compatibilidade anterior à migração 006, que cria políticas sobre cel.tenant_id.
-- Não alterar a migração histórica: instalações novas e atualizações recebem a coluna.
-- Eventos legados sem vínculo comprovado permanecem sem tenant e invisíveis sob RLS.
ALTER TABLE public.cel ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_cel_tenant ON public.cel(tenant_id);

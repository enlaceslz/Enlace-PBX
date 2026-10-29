-- Revisão explícita, separada da classificação original de privacidade/origem.
ALTER TABLE public.ai_knowledge ADD COLUMN review_state VARCHAR(32) NOT NULL
 DEFAULT 'LEGACY_NOT_REVIEWED' CHECK(review_state IN ('LEGACY_NOT_REVIEWED','REVIEWED_TEXT'));

-- Preserva sessões e bilhetagem ao excluir configuração de agente, inclusive
-- referências legadas que a RLS da empresa proprietária pode não enxergar.
-- NOT VALID mantém vínculos antigos para revisão e protege novas gravações.
ALTER TABLE public.ai_sessions DROP CONSTRAINT IF EXISTS ai_sessions_agent_id_fkey;
ALTER TABLE public.ai_sessions DROP CONSTRAINT IF EXISTS ai_sessions_agent_tenant_fk;
ALTER TABLE public.cdr DROP CONSTRAINT IF EXISTS cdr_ai_agent_id_fkey;

ALTER TABLE public.ai_sessions ADD CONSTRAINT ai_sessions_agent_id_fkey
 FOREIGN KEY(agent_id) REFERENCES public.ai_agents(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE public.ai_sessions ADD CONSTRAINT ai_sessions_agent_tenant_fk
 FOREIGN KEY(agent_id,tenant_id) REFERENCES public.ai_agents(id,tenant_id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE public.cdr ADD CONSTRAINT cdr_ai_agent_id_fkey
 FOREIGN KEY(ai_agent_id) REFERENCES public.ai_agents(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE public.cdr ADD CONSTRAINT cdr_agent_tenant_fk
 FOREIGN KEY(ai_agent_id,tenant_id) REFERENCES public.ai_agents(id,tenant_id) ON DELETE RESTRICT NOT VALID;

-- Sustenta a checagem de retenção sem percorrer todo o histórico por agente.
CREATE INDEX IF NOT EXISTS idx_ai_sessions_agent_tenant ON public.ai_sessions(agent_id,tenant_id);
CREATE INDEX IF NOT EXISTS idx_cdr_agent_tenant ON public.cdr(ai_agent_id,tenant_id) WHERE ai_agent_id IS NOT NULL;

DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_constraint WHERE contype='f'
   AND confrelid='public.ai_agents'::regclass
   AND conrelid IN ('public.ai_sessions'::regclass,'public.cdr'::regclass)
   AND confdeltype IN ('c','n','d')) THEN
  RAISE EXCEPTION 'FK adicional destrutiva para agentes exige revisão manual antes de atualizar';
 END IF;
END $$;

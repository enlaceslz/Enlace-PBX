-- A prévia não possui canal telefônico. O identificador legado é preservado.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_sessions' AND column_name='channel_id') THEN
    ALTER TABLE ai_sessions ALTER COLUMN channel_id DROP NOT NULL;
    UPDATE ai_sessions SET asterisk_channel_id=channel_id
      WHERE asterisk_channel_id IS NULL AND NULLIF(btrim(channel_id),'') IS NOT NULL;
  END IF;
END $$;

-- Protege novas gravações sem certificar vínculos antigos automaticamente.
ALTER TABLE ai_sessions ADD CONSTRAINT ai_sessions_agent_tenant_fk
  FOREIGN KEY (agent_id,tenant_id) REFERENCES ai_agents(id,tenant_id) ON DELETE CASCADE NOT VALID;

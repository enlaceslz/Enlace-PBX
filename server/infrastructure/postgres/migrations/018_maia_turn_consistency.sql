-- Uma sessão não pode executar dois turnos simultâneos, inclusive em processos distintos.
ALTER TABLE ai_sessions ADD COLUMN active_turn_id UUID;
ALTER TABLE ai_sessions ADD CONSTRAINT ai_sessions_id_tenant_unique UNIQUE(id,tenant_id);
-- Preserva linhas antigas sem certificar vínculos históricos; protege novas gravações.
ALTER TABLE ai_session_turns ADD CONSTRAINT ai_session_turns_session_tenant_fk
 FOREIGN KEY(session_id,tenant_id) REFERENCES ai_sessions(id,tenant_id) ON DELETE CASCADE NOT VALID;

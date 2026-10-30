-- Estado de atendimento separado das mensagens e das etiquetas legadas.
ALTER TABLE public.omnichannel_conversations
 ADD COLUMN workflow_version INTEGER NOT NULL DEFAULT 0 CHECK(workflow_version>=0),
 ADD COLUMN assigned_user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
 ADD COLUMN notes JSONB NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(notes)='array');

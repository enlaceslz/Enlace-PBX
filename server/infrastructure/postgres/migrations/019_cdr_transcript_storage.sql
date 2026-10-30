-- Campos antes utilizados pelo código sem existir no esquema inicial.
-- Nenhum texto é sintetizado para chamadas sem transcrição registrada.
ALTER TABLE cdr ADD COLUMN IF NOT EXISTS transcription TEXT;
ALTER TABLE cdr ADD COLUMN IF NOT EXISTS summary TEXT;

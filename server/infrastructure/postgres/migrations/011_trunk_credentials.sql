-- O segredo real do tronco nunca pertence ao DTO de listagem ou ao campo de máscara.
ALTER TABLE public.trunks ADD COLUMN IF NOT EXISTS secret_encrypted TEXT;

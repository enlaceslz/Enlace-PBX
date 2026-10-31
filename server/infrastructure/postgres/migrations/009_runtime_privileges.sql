-- O usuário operacional consulta o histórico, mas não pode forjar versões ou hashes.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.schema_migrations FROM enlace_app;
GRANT SELECT ON public.schema_migrations TO enlace_app;

-- A aplicação registra auditoria, mas não altera nem apaga os registros existentes.
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.audit_logs FROM enlace_app;
GRANT SELECT, INSERT ON public.audit_logs TO enlace_app;

-- Em clusters antigos, CREATE concedido a PUBLIC também alcança enlace_app.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM enlace_app;

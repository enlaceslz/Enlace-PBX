-- Revisão monotônica evita revalidar tokens antigos ao reativar conta ou restaurar perfil.
ALTER TABLE users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0 CHECK(auth_version>=0);
CREATE FUNCTION bump_user_auth_version() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  IF ROW(NEW.password_hash,NEW.role,NEW.is_active,NEW.email,NEW.extension,NEW.tenant_id,NEW.id)
    IS DISTINCT FROM ROW(OLD.password_hash,OLD.role,OLD.is_active,OLD.email,OLD.extension,OLD.tenant_id,OLD.id) THEN
    NEW.auth_version=OLD.auth_version+1;
  ELSE NEW.auth_version=OLD.auth_version;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER users_auth_revision BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION bump_user_auth_version();

#!/usr/bin/env bash
# Isolated PostgreSQL round-trip smoke test. Requires a dedicated disposable database
# and a dedicated test role with CREATE privileges. Never point at production.
set -Eeuo pipefail
umask 077

if [ "$#" -ne 1 ]; then
  echo "Uso: $0 postgresql://usuario_teste@127.0.0.1:5432/enlace_pbx_restore_test" >&2
  exit 2
fi
target_url="$1"
app_dir="${APP_DIR:-/opt/enlace-pbx}"
tmpdir="$(mktemp -d)"
trap 'rm -rf -- "$tmpdir"' EXIT

# Guard target before creating anything.
python3 - "$target_url" <<'PY'
import sys
from urllib.parse import urlsplit, unquote
url = urlsplit(sys.argv[1])
name = unquote(url.path.lstrip('/'))
if url.scheme not in ('postgres', 'postgresql') or url.hostname not in ('127.0.0.1', 'localhost', '::1'):
    raise SystemExit('ERRO: apenas PostgreSQL local e permitido')
if not (name.endswith('_restore_test') or name.endswith('_homologacao')):
    raise SystemExit('ERRO: banco deve ter sufixo de homologacao')
if not url.username or url.username in ('postgres', 'enlace_app'):
    raise SystemExit('ERRO: use uma conta exclusiva de homologacao')
PY

command -v psql >/dev/null
command -v pg_dump >/dev/null
command -v pg_restore >/dev/null
# This smoke test requires an existing EMPTY disposable database.
objects="$(psql "$target_url" -XAt -v ON_ERROR_STOP=1 -c "
SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog','information_schema')
AND n.nspname NOT LIKE 'pg_toast%'
AND c.relkind IN ('r','p','v','m','S','f');")"
[ "$objects" = "0" ] || { echo "ERRO: banco de homologacao nao esta vazio." >&2; exit 1; }

psql "$target_url" -X -v ON_ERROR_STOP=1 -c "CREATE TABLE pbx_backup_smoke (id integer PRIMARY KEY, payload text NOT NULL); INSERT INTO pbx_backup_smoke VALUES (1, 'enlace-backup-check');"
pg_dump --dbname="$target_url" --format=custom --no-owner --no-acl --file="$tmpdir/smoke.dump"
pg_restore --list "$tmpdir/smoke.dump" >/dev/null
psql "$target_url" -X -v ON_ERROR_STOP=1 -c "DROP TABLE pbx_backup_smoke;"
bash "$app_dir/scripts/restore-postgres-test.sh" "$tmpdir/smoke.dump" "$target_url"
result="$(psql "$target_url" -XAt -v ON_ERROR_STOP=1 -c "SELECT payload FROM pbx_backup_smoke WHERE id=1;")"
[ "$result" = "enlace-backup-check" ] || { echo "ERRO: divergencia de dados apos restauracao." >&2; exit 1; }
echo "SUCESSO: backup e restauracao PostgreSQL com integridade verificada."

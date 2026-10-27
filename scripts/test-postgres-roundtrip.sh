#!/usr/bin/env bash
# Isolated PostgreSQL round-trip smoke test. Requires a dedicated disposable database
# and a dedicated test role with CREATE privileges. Never point at production.
set -Eeuo pipefail
umask 077

if [ "$#" -ne 1 ] || [ "$1" != "--stdin" ]; then
  echo "Uso: printf %s URL_TESTE | $0 --stdin" >&2
  exit 2
fi
target_url="$(cat)"
[ -n "$target_url" ] || { echo "ERRO: URL de homologacao ausente na entrada padrao." >&2; exit 1; }
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
tmpdir="$(mktemp -d)"
trap 'rm -rf -- "$tmpdir"' EXIT

# Guard target before creating anything.
printf '%s' "$target_url" | python3 "$script_dir/validate-restore-target.py" --stdin >/dev/null || exit 1
# libpq does not parse a connection URI supplied via PGDATABASE. Split the
# validated URI into dedicated libpq environment variables without argv leaks.
mapfile -d '' -t connection_parts < <(printf '%s' "$target_url" | python3 -c '
import sys
from urllib.parse import unquote, urlsplit
u = urlsplit(sys.stdin.read())
values = (u.hostname, str(u.port or 5432), unquote(u.username), unquote(u.password), unquote(u.path[1:]))
sys.stdout.buffer.write(("\\0".join(values) + "\\0").encode())
')
[ "${#connection_parts[@]}" -eq 5 ] || { echo "ERRO: conexao de teste invalida." >&2; exit 1; }
export PGHOST="${connection_parts[0]}" PGPORT="${connection_parts[1]}"
export PGUSER="${connection_parts[2]}" PGPASSWORD="${connection_parts[3]}"
export PGDATABASE="${connection_parts[4]}"
unset connection_parts


command -v psql >/dev/null
command -v pg_dump >/dev/null
command -v pg_restore >/dev/null
# This smoke test requires an existing EMPTY disposable database.
objects="$(psql -XAt -v ON_ERROR_STOP=1 -c "
SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog','information_schema')
AND n.nspname NOT LIKE 'pg_toast%'
AND c.relkind IN ('r','p','v','m','S','f');")"
[ "$objects" = "0" ] || { echo "ERRO: banco de homologacao nao esta vazio." >&2; exit 1; }

psql -X -v ON_ERROR_STOP=1 -c "CREATE TABLE pbx_backup_smoke (id integer PRIMARY KEY, payload text NOT NULL); INSERT INTO pbx_backup_smoke VALUES (1, 'enlace-backup-check');"
pg_dump --format=custom --no-owner --no-acl --file="$tmpdir/smoke.dump"
pg_restore --list "$tmpdir/smoke.dump" >/dev/null
psql -X -v ON_ERROR_STOP=1 -c "DROP TABLE pbx_backup_smoke;"
printf '%s' "$target_url" | bash "$script_dir/restore-postgres-test.sh" "$tmpdir/smoke.dump" --stdin
result="$(psql -XAt -v ON_ERROR_STOP=1 -c "SELECT payload FROM pbx_backup_smoke WHERE id=1;")"
[ "$result" = "enlace-backup-check" ] || { echo "ERRO: divergencia de dados apos restauracao." >&2; exit 1; }
echo "SUCESSO: backup e restauracao PostgreSQL com integridade verificada."

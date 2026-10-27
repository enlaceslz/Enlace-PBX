#!/usr/bin/env bash
# Restore a PostgreSQL custom-format archive into an explicitly named, EMPTY test database.
# This script never creates a database and refuses production-like database names.
set -Eeuo pipefail
umask 077

usage() {
  echo "Uso: printf %s URL_TESTE | $0 /caminho/backup.dump --stdin" >&2
  exit 2
}
[ "$#" -eq 2 ] || usage
archive="$1"
[ "$2" = "--stdin" ] || usage
target_url="$(cat)"
[ -n "$target_url" ] || { echo "ERRO: URL de homologacao ausente na entrada padrao." >&2; exit 1; }

[ -f "$archive" ] && [ ! -L "$archive" ] || { echo "ERRO: arquivo de backup invalido." >&2; exit 1; }
command -v pg_restore >/dev/null 2>&1 || { echo "ERRO: pg_restore ausente." >&2; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "ERRO: psql ausente." >&2; exit 1; }
pg_restore --list "$archive" >/dev/null || { echo "ERRO: arquivo nao e um backup PostgreSQL valido." >&2; exit 1; }

# Parse with Python to reject malformed URLs and non-test database names.
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
target_db="$(printf '%s' "$target_url" | python3 "$script_dir/validate-restore-target.py" --stdin)" || exit 1
# libpq does not parse a connection URI supplied via PGDATABASE. Split the
# validated URI into dedicated libpq environment variables without argv leaks.
mapfile -d '' -t connection_parts < <(printf '%s' "$target_url" | python3 -c '
import sys
from urllib.parse import unquote, urlsplit
u = urlsplit(sys.stdin.read())
values = (u.hostname, str(u.port or 5432), unquote(u.username), unquote(u.password), unquote(u.path[1:]))
sys.stdout.buffer.write(("\0".join(values) + "\0").encode())
')
[ "${#connection_parts[@]}" -eq 5 ] || { echo "ERRO: conexao de teste invalida." >&2; exit 1; }
export PGHOST="${connection_parts[0]}" PGPORT="${connection_parts[1]}"
export PGUSER="${connection_parts[2]}" PGPASSWORD="${connection_parts[3]}"
export PGDATABASE="${connection_parts[4]}"
unset target_url connection_parts


# Refuse a populated database, including existing tables outside the public schema.
existing_objects="$(psql -X -A -t -v ON_ERROR_STOP=1 -c "
SELECT count(*)
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%'
  AND c.relkind IN ('r','p','v','m','S','f');
")" || { echo "ERRO: banco de destino inacessivel." >&2; exit 1; }
if [ "$existing_objects" != "0" ]; then
  echo "ERRO: banco de destino nao esta vazio ($existing_objects objetos). Restauração recusada." >&2
  exit 1
fi

echo "Restaurando backup em banco isolado: $target_db"
pg_restore --no-owner --no-acl --exit-on-error --single-transaction "$archive"
echo "Restauracao concluida em $target_db. Execute testes funcionais antes de considerar o backup homologado."

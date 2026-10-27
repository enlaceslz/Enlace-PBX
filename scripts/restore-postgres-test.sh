#!/usr/bin/env bash
# Restore a PostgreSQL custom-format archive into an explicitly named, EMPTY test database.
# This script never creates a database and refuses production-like database names.
set -Eeuo pipefail
umask 077

usage() {
  echo "Uso: $0 /caminho/backup.dump postgresql://usuario@host:5432/enlace_pbx_restore_test" >&2
  exit 2
}
[ "$#" -eq 2 ] || usage
archive="$1"
target_url="$2"

[ -f "$archive" ] && [ ! -L "$archive" ] || { echo "ERRO: arquivo de backup invalido." >&2; exit 1; }
command -v pg_restore >/dev/null 2>&1 || { echo "ERRO: pg_restore ausente." >&2; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "ERRO: psql ausente." >&2; exit 1; }
pg_restore --list "$archive" >/dev/null || { echo "ERRO: arquivo nao e um backup PostgreSQL valido." >&2; exit 1; }

# Parse with Python to reject malformed URLs and non-test database names.
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
target_db="$(python3 "$script_dir/validate-restore-target.py" "$target_url")" || exit 1

# Refuse a populated database, including existing tables outside the public schema.
existing_objects="$(PGDATABASE="$target_url" psql -X -A -t -v ON_ERROR_STOP=1 -c "
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
PGDATABASE="$target_url" pg_restore --no-owner --no-acl --exit-on-error --single-transaction "$archive"
echo "Restauracao concluida em $target_db. Execute testes funcionais antes de considerar o backup homologado."

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
target_db="$(python3 - "$target_url" <<'PY'
from urllib.parse import urlsplit, unquote
import sys
try:
    url = urlsplit(sys.argv[1])
    name = unquote(url.path.lstrip('/'))
    if url.scheme not in ('postgres', 'postgresql') or not url.hostname or not name or '/' in name:
        raise ValueError('URL invalida')
    if not (name.endswith('_restore_test') or name.endswith('_homologacao')):
        raise ValueError('O nome do banco deve terminar em _restore_test ou _homologacao')
    if url.hostname not in ('127.0.0.1', 'localhost', '::1'):
        raise ValueError('Restauracao permitida apenas para PostgreSQL local (loopback)')
    if url.username in ('postgres', 'enlace_app'):
        raise ValueError('Use uma conta exclusiva de homologacao, nunca postgres ou enlace_app')
    print(name)
except ValueError as error:
    print(f'ERRO: {error}', file=sys.stderr)
    sys.exit(1)
PY
)" || exit 1

# Refuse a populated database, including existing tables outside the public schema.
existing_objects="$(psql "$target_url" -X -A -t -v ON_ERROR_STOP=1 -c "
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
pg_restore --dbname="$target_url" --no-owner --no-acl --exit-on-error --single-transaction "$archive"
echo "Restauracao concluida em $target_db. Execute testes funcionais antes de considerar o backup homologado."

#!/usr/bin/env bash
# PostgreSQL-only logical backup. Does not include Asterisk media or application files.
set -Eeuo pipefail
umask 077

APP_DIR="${APP_DIR:-/opt/enlace-pbx}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/enlace-pbx}"
ENV_FILE="$APP_DIR/.env"

if [ ! -f "$ENV_FILE" ] || [ -L "$ENV_FILE" ]; then
  echo "ERRO: .env ausente ou link simbolico." >&2
  exit 1
fi
if ! command -v pg_dump >/dev/null 2>&1 || ! command -v pg_restore >/dev/null 2>&1; then
  echo "ERRO: ferramentas PostgreSQL pg_dump e pg_restore obrigatorias." >&2
  exit 1
fi

# Read DATABASE_URL without sourcing arbitrary shell code from .env.
DATABASE_URL="$(python3 - "$ENV_FILE" <<'PY'
import pathlib
import sys
for line in pathlib.Path(sys.argv[1]).read_text().splitlines():
    if line.startswith('DATABASE_URL='):
        value = line.split('=', 1)[1].strip().strip('"').strip("'")
        print(value)
        break
PY
)"
if [ -z "$DATABASE_URL" ]; then
  echo "ERRO: DATABASE_URL nao configurada." >&2
  exit 1
fi

install -d -m 700 "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
destination="$BACKUP_DIR/enlace-pbx-postgres-$stamp.dump"
if [ -e "$destination" ]; then
  echo "ERRO: backup ja existe: $destination" >&2
  exit 1
fi
temporary="$(mktemp "$BACKUP_DIR/.postgres-backup.XXXXXXXX")"
trap 'rm -f -- "$temporary"' EXIT

# Custom format supports pg_restore --list and selective restore.
# libpq does not interpret a URI stored in PGDATABASE as a connection string.
# Keep credentials out of process arguments by using libpq environment fields.
mapfile -d '' -t connection_parts < <(printf '%s' "$DATABASE_URL" | python3 -c '
import sys
from urllib.parse import unquote, urlsplit
u = urlsplit(sys.stdin.read())
if u.scheme not in ("postgresql", "postgres") or not u.hostname or not u.username or not u.path.strip("/"):
    sys.exit(1)
values = (u.hostname, str(u.port or 5432), unquote(u.username), unquote(u.password or ""), unquote(u.path[1:]))
sys.stdout.buffer.write(("\0".join(values) + "\0").encode())
')
[ "${#connection_parts[@]}" -eq 5 ] || { echo "ERRO: DATABASE_URL invalida." >&2; exit 1; }
export PGHOST="${connection_parts[0]}" PGPORT="${connection_parts[1]}"
export PGUSER="${connection_parts[2]}" PGPASSWORD="${connection_parts[3]}"
export PGDATABASE="${connection_parts[4]}"
unset DATABASE_URL connection_parts

if ! pg_dump --format=custom --file="$temporary" --no-owner --no-acl; then
  echo "ERRO: pg_dump falhou; nenhum backup foi publicado." >&2
  exit 1
fi
if ! pg_restore --list "$temporary" >/dev/null; then
  echo "ERRO: arquivo de backup invalido." >&2
  exit 1
fi
chmod 600 "$temporary"
mv -n -- "$temporary" "$destination"
if [ -e "$temporary" ]; then
  echo "ERRO: backup nao foi publicado (arquivo destino existente)." >&2
  exit 1
fi
trap - EXIT
echo "Backup PostgreSQL criado e validado: $destination"
echo "ATENCAO: gravações, arquivos de mídia, .env e configurações Asterisk NÃO estão incluídos."

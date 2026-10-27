#!/usr/bin/env bash
# Coordinated logical PostgreSQL + PBX filesystem backup.
# Run only during a maintenance window with PBX writers stopped.
set -Eeuo pipefail
umask 077

if [ "$(id -u)" -ne 0 ]; then
  echo "ERRO: execute como root." >&2
  exit 1
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/enlace-pbx}"
install -d -m 700 "$BACKUP_DIR"
command -v flock >/dev/null || { echo "ERRO: flock ausente." >&2; exit 1; }
command -v sha256sum >/dev/null || { echo "ERRO: sha256sum ausente." >&2; exit 1; }

# Prevent concurrent coordinated runs. The lock is not a service-stop mechanism.
exec 9>"$BACKUP_DIR/.backup-coordinated.lock"
flock -n 9 || { echo "ERRO: outro backup coordenado esta em andamento." >&2; exit 1; }

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
manifest="$BACKUP_DIR/enlace-pbx-backup-$stamp.manifest"
if [ -e "$manifest" ]; then
  echo "ERRO: manifesto ja existe." >&2
  exit 1
fi

# Capture files created by this invocation only; never remove older backups.
before="$(mktemp)"
after="$(mktemp)"
trap 'rm -f -- "$before" "$after"' EXIT
find "$BACKUP_DIR" -maxdepth 1 -type f -printf '%f\n' | sort > "$before"

echo "Executando backup PostgreSQL..."
if ! bash "$script_dir/backup-postgres.sh"; then
  echo "ERRO: falha no backup PostgreSQL; manifesto nao publicado." >&2
  exit 1
fi
echo "Executando backup de arquivos do PBX..."
if ! bash "$script_dir/backup-pbx-files.sh"; then
  echo "ERRO: falha no backup dos arquivos; manifesto nao publicado." >&2
  exit 1
fi

find "$BACKUP_DIR" -maxdepth 1 -type f -printf '%f\n' | sort > "$after"
newfiles="$(comm -13 "$before" "$after")"
db_file="$(printf '%s\n' "$newfiles" | grep -E '^enlace-pbx-postgres-[0-9TZ]+\.dump$' | head -n 1 || true)"
pbx_file="$(printf '%s\n' "$newfiles" | grep -E '^enlace-pbx-files-[0-9TZ]+\.tar\.gz$' | head -n 1 || true)"
if [ -z "$db_file" ] || [ -z "$pbx_file" ]; then
  echo "ERRO: backups nao identificados; manifesto nao publicado." >&2
  exit 1
fi
if [ ! -f "$BACKUP_DIR/$pbx_file.sha256" ]; then
  echo "ERRO: checksum do PBX ausente." >&2
  exit 1
fi

# Manifest only certifies that both archives were produced and checksummed.
# It does NOT certify application consistency or a successful restoration.
temporary="$(mktemp "$BACKUP_DIR/.manifest.XXXXXXXX")"
trap 'rm -f -- "$before" "$after" "$temporary"' EXIT
(
  cd -- "$BACKUP_DIR"
  sha256sum -- "$db_file" "$pbx_file" > "$temporary"
)
chmod 600 "$temporary"
mv -n -- "$temporary" "$manifest"
if [ -e "$temporary" ]; then
  echo "ERRO: manifesto nao publicado." >&2
  exit 1
fi
if ! bash "$script_dir/verify-backup-manifest.sh" "$manifest"; then
  rm -f -- "$manifest"
  echo "ERRO: manifesto nao passou na verificacao; publicacao cancelada." >&2
  exit 1
fi
trap - EXIT
rm -f -- "$before" "$after"
echo "Manifesto publicado: $manifest"
echo "ATENCAO: consistencia entre banco e arquivos requer janela de manutencao e teste de restauracao."

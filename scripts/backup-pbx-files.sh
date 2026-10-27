#!/usr/bin/env bash
# Enlace-PBX filesystem backup. PostgreSQL is NOT included; run backup-postgres.sh separately.
# Produces a private tar archive with Asterisk config, recordings and app persistent storage.
set -Eeuo pipefail
umask 077

if [ "$(id -u)" -ne 0 ]; then
  echo "ERRO: execute como root para preservar permissoes e acessar arquivos do PBX." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-/var/backups/enlace-pbx}"
install -d -m 700 "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
destination="$BACKUP_DIR/enlace-pbx-files-$stamp.tar.gz"
if [ -e "$destination" ]; then
  echo "ERRO: arquivo de destino ja existe." >&2
  exit 1
fi
temporary="$(mktemp "$BACKUP_DIR/.pbx-files.XXXXXXXX")"
trap 'rm -f -- "$temporary"' EXIT

# Paths are fixed intentionally. Do not include .env or credentials in this archive.
paths=()
for path in etc/asterisk var/spool/asterisk/recording var/lib/enlace-pbx; do
  if [ -e "/$path" ] && [ ! -L "/$path" ]; then
    paths+=("$path")
  fi
done
if [ "${#paths[@]}" -eq 0 ]; then
  echo "ERRO: nenhum diretorio persistente encontrado." >&2
  exit 1
fi

tar -C / -czpf "$temporary" -- "${paths[@]}"
tar -tzf "$temporary" >/dev/null
chmod 600 "$temporary"
mv -n -- "$temporary" "$destination"
if [ -e "$temporary" ]; then
  echo "ERRO: arquivo de backup nao publicado." >&2
  exit 1
fi
# Publish the archive and checksum together as far as possible. On failure,
# remove the published archive so it cannot be mistaken for a complete backup.
trap 'rm -f -- "$temporary" "$destination.sha256"; if [ -f "$destination" ]; then rm -f -- "$destination"; fi' ERR
# The digest detects accidental corruption, but is not an authenticity signature.
sha256sum -- "$destination" > "$destination.sha256"
chmod 600 "$destination.sha256"
trap - ERR
trap - EXIT
echo "Backup de arquivos do PBX criado: $destination"
echo "SHA-256 registrado: $destination.sha256"
echo "ATENCAO: PostgreSQL e .env nao incluidos. Para consistencia, execute com servicos parados ou em janela de manutencao."

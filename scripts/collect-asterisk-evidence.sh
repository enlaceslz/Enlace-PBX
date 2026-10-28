#!/usr/bin/env bash
# Read-only Asterisk/SIP evidence collector. No calls, registrations or reloads.
set -Eeuo pipefail
export LC_ALL=C
umask 077

usage() { echo "Uso: $0 DIRETORIO_NOVO" >&2; exit 2; }
[ "$#" -eq 1 ] || usage
target="$1"
[ -n "$target" ] && [ "$target" != "/" ] || usage
command -v asterisk >/dev/null 2>&1 || { echo "ERRO: asterisk indisponivel." >&2; exit 2; }
command -v python3 >/dev/null 2>&1 || { echo "ERRO: python3 indisponivel." >&2; exit 2; }
# Refuse existing targets, including symlinks. No overwrites.
if [ -e "$target" ] || [ -L "$target" ]; then
  echo "ERRO: destino ja existe." >&2
  exit 2
fi
mkdir -m 700 -- "$target"
cleanup_on_error() {
  echo "ERRO: coleta incompleta; verificar arquivos no diretorio restrito." >&2
}
trap cleanup_on_error ERR
# Store only allowlisted aggregate commands; never dump SIP endpoint details,
# auth secrets, channel identifiers, caller IDs, dialplan or configuration.
capture() {
  local filename="$1" command="$2"
  if timeout 8 asterisk -rx "$command" > "$target/$filename" 2>&1; then
    printf 'OK: %s\n' "$command"
  else
    printf 'FALHA: %s\n' "$command" >&2
    return 1
  fi
}
capture asterisk-uptime.txt 'core show uptime'
capture asterisk-version.txt 'core show version'
capture asterisk-modules.txt 'module show like res_pjsip.so'
capture asterisk-channels-count.txt 'core show channels count'
# Manifest hashes allow integrity checks; not proof of source authenticity.
(
  cd "$target"
  sha256sum asterisk-uptime.txt asterisk-version.txt asterisk-modules.txt asterisk-channels-count.txt > SHA256SUMS
)
echo "Coleta concluida. Nao inclui testes de chamadas ou RTP."

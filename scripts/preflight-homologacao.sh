#!/usr/bin/env bash
# Read-only preflight for an isolated Debian 12 Enlace-PBX homologation VM.
set -Eeuo pipefail
export LC_ALL=C
fail=0
warn=0
check() {
  local label="$1"; shift
  if "$@" >/dev/null 2>&1; then
    printf 'OK: %s\n' "$label"
  else
    printf 'FALHA: %s\n' "$label" >&2
    fail=$((fail + 1))
  fi
}
notice() { printf 'AVISO: %s\n' "$1" >&2; warn=$((warn + 1)); }
if [ -r /etc/os-release ]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  [ "${ID:-}" = debian ] && [ "${VERSION_ID:-}" = 12 ] || notice "Sistema nao identificado como Debian 12."
else
  notice "/etc/os-release indisponivel."
fi
check "Python 3 disponivel" command -v python3
check "Node.js disponivel" command -v node
check "Asterisk CLI disponivel" command -v asterisk
check "PostgreSQL pg_isready disponivel" command -v pg_isready
check "Systemd disponivel" command -v systemctl
check "NGINX disponivel" command -v nginx
check "Configuracao Asterisk presente" test -d /etc/asterisk
check "Aplicacao instalada" test -d /opt/enlace-pbx
if command -v systemctl >/dev/null 2>&1; then
  check "Asterisk ativo" systemctl is-active --quiet asterisk
  check "PostgreSQL ativo" systemctl is-active --quiet postgresql
  check "NGINX ativo" systemctl is-active --quiet nginx
  check "Aplicacao Enlace-PBX ativa" systemctl is-active --quiet enlace-pbx.service
fi
if command -v pg_isready >/dev/null 2>&1; then
  check "PostgreSQL local aceita conexoes" pg_isready -h 127.0.0.1
fi
if command -v asterisk >/dev/null 2>&1; then
  check "Asterisk responde ao CLI" asterisk -rx 'core show uptime'
fi
printf 'Resumo: %s falha(s), %s aviso(s).\n' "$fail" "$warn"
if [ "$fail" -gt 0 ]; then exit 1; fi
exit 0

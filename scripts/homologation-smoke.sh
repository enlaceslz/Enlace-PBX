#!/usr/bin/env bash
# Read-only smoke checks. Run on an isolated Debian 12 homologation VM.
set -uo pipefail

PASS=0
FAIL=0
WARN=0
pass() { printf 'PASS %s\n' "$1"; PASS=$((PASS + 1)); }
fail() { printf 'FAIL %s\n' "$1"; FAIL=$((FAIL + 1)); }
warn() { printf 'WARN %s\n' "$1"; WARN=$((WARN + 1)); }
check_command() {
  if command -v "$1" >/dev/null 2>&1; then pass "$1 installed"; else fail "$1 missing"; fi
}

if [ -r /etc/os-release ]; then
  . /etc/os-release
  if [ "${ID:-}" = debian ] && [ "${VERSION_ID:-}" = 12 ]; then
    pass "Debian 12 detected"
  else
    warn "Target is Debian 12; found ${PRETTY_NAME:-unknown}"
  fi
else
  warn "OS release not readable"
fi

for binary in python3 node npm psql asterisk systemctl curl; do check_command "$binary"; done

if command -v systemctl >/dev/null 2>&1; then
  for service in postgresql asterisk; do
    if systemctl is-active --quiet "$service"; then pass "$service active"; else fail "$service inactive"; fi
  done
fi

if command -v asterisk >/dev/null 2>&1; then
  if asterisk -rx "core show version" 2>/dev/null | grep -q "Asterisk"; then
    pass "Asterisk CLI responsive"
  else
    fail "Asterisk CLI unavailable"
  fi
  if asterisk -rx "module show like res_pjsip.so" 2>/dev/null | grep -Eq 'res_pjsip\.so.*Running'; then
    pass "PJSIP module running"
  else
    fail "PJSIP module not confirmed"
  fi
fi

if [ -L .env ]; then
  fail ".env is a symlink"
elif [ -f .env ]; then
  if [ ! -r .env ]; then
    fail ".env not readable by current user"
  elif [ "$(stat -c '%a' .env)" = 600 ]; then
    pass ".env permissions 600"
  else
    fail ".env permissions are not 600"
  fi
else
  fail ".env missing in working directory"
fi

if command -v curl >/dev/null 2>&1; then
  if curl --fail --silent --show-error --max-time 5 --output /dev/null http://127.0.0.1:8088/ari/api-docs/resources.json; then
    pass "Local Asterisk HTTP endpoint reachable"
  else
    warn "Asterisk ARI HTTP endpoint unavailable (check service and credentials)"
  fi
fi

printf '\nRESULT pass=%d fail=%d warn=%d\n' "$PASS" "$FAIL" "$WARN"
if [ "$FAIL" -gt 0 ]; then exit 1; fi

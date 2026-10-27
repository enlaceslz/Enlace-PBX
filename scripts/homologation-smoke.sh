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

if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet asterisk.service; then
  unit_user="$(systemctl show asterisk.service --property=User --value 2>/dev/null)"
  unit_group="$(systemctl show asterisk.service --property=Group --value 2>/dev/null)"
  if [ "$unit_user" = asterisk ] && [ "$unit_group" = asterisk ]; then
    pass "Asterisk systemd unit uses dedicated account"
  else
    fail "Asterisk systemd unit User/Group mismatch"
  fi
  main_pid="$(systemctl show asterisk.service --property=MainPID --value 2>/dev/null)"
  if [[ "$main_pid" =~ ^[1-9][0-9]*$ ]] && [ -r "/proc/$main_pid/status" ] && id -u asterisk >/dev/null 2>&1; then
    runtime_uid="$(awk '/^Uid:/ {print $3}' "/proc/$main_pid/status")"
    if [ "$runtime_uid" = "$(id -u asterisk)" ]; then
      pass "Asterisk runtime effective UID matches service account"
    else
      fail "Asterisk runtime effective UID mismatch"
    fi
  else
    fail "Asterisk runtime process identity unavailable"
  fi
else
  fail "Asterisk runtime identity checks skipped: systemd unavailable or service inactive"
fi

# Verify application service identity independently of Asterisk.
if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet enlace-pbx.service; then
  app_user="$(systemctl show enlace-pbx.service --property=User --value 2>/dev/null)"
  app_group="$(systemctl show enlace-pbx.service --property=Group --value 2>/dev/null)"
  if [ "$app_user" = enlace-pbx ] && [ "$app_group" = enlace-pbx ]; then
    pass "Enlace-PBX systemd unit uses dedicated account"
  else
    fail "Enlace-PBX systemd unit User/Group mismatch"
  fi
  app_pid="$(systemctl show enlace-pbx.service --property=MainPID --value 2>/dev/null)"
  if [[ "$app_pid" =~ ^[1-9][0-9]*$ ]] && [ -r "/proc/$app_pid/status" ] && id -u enlace-pbx >/dev/null 2>&1; then
    app_uid="$(awk '/^Uid:/ {print $3}' "/proc/$app_pid/status")"
    if [ "$app_uid" = "$(id -u enlace-pbx)" ]; then
      pass "Enlace-PBX runtime effective UID matches service account"
    else
      fail "Enlace-PBX runtime effective UID mismatch"
    fi
  else
    fail "Enlace-PBX runtime process identity unavailable"
  fi
else
  fail "Enlace-PBX service inactive or systemd unavailable"
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
  elif [ "$(stat -c '%a:%U:%G' .env)" = "640:root:enlace-pbx" ]; then
    pass ".env permissions 640 root:enlace-pbx"
  else
    fail ".env permissions/ownership must be 640 root:enlace-pbx"
  fi
else
  fail ".env missing in working directory"
fi

# Validate reverse proxy configuration and the application's local HTTP health.
if command -v nginx >/dev/null 2>&1; then
  if nginx -t >/dev/null 2>&1; then
    pass "NGINX configuration syntax valid"
  else
    fail "NGINX configuration syntax invalid"
  fi
else
  fail "nginx missing"
fi

if command -v curl >/dev/null 2>&1; then
  if curl --fail --silent --show-error --max-time 5 --output /dev/null http://127.0.0.1:3000/api/v1/health; then
    pass "Enlace-PBX local HTTP health responsive"
  else
    fail "Enlace-PBX local HTTP health unavailable"
  fi
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

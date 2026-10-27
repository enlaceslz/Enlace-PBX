#!/usr/bin/env python3
"""Static regression checks: installer must fail before apt-get on unsafe input."""
from pathlib import Path
import re
import unittest

SCRIPT = (Path(__file__).resolve().parent.parent / "install-enlace-pbx.sh").read_text()
DEPLOY = (Path(__file__).resolve().parent.parent / "deploy.sh").read_text()


class InstallerSafetyTests(unittest.TestCase):
    def test_strict_shell_mode(self):
        self.assertIn("set -euo pipefail", SCRIPT)

    def test_version_is_validated_before_apt(self):
        self.assertRegex(SCRIPT, r'\[\[ ! "\$ASTERISK_VER" =~ \^20')
        self.assertLess(SCRIPT.index('if [[ ! "$ASTERISK_VER"'), SCRIPT.index("apt-get update"))

    def test_checksum_is_mandatory_before_apt(self):
        self.assertIn('EXPECTED_SHA256="${ASTERISK_EXPECTED_SHA256:-', SCRIPT)
        self.assertIn('if [[ ! "${EXPECTED_SHA256}" =~ ^[a-fA-F0-9]{64}$ ]]; then', SCRIPT)
        self.assertLess(SCRIPT.index('if [[ ! "${EXPECTED_SHA256}"'), SCRIPT.index("apt-get update"))

    def test_reconciler_exists_before_apt(self):
        self.assertIn('if [ ! -f "${INSTALL_SCRIPT_DIR}/scripts/reconcile-asterisk-config.py" ]; then', SCRIPT)
        self.assertLess(SCRIPT.index('if [ ! -f "${INSTALL_SCRIPT_DIR}/scripts/reconcile-asterisk-config.py"'), SCRIPT.index("apt-get update"))

    def test_prerequisite_installation_must_fail_closed(self):
        self.assertNotIn('contrib/scripts/install_prereq install || true', SCRIPT)
        self.assertIn('if [ ! -f "contrib/scripts/install_prereq" ]; then', SCRIPT)
        self.assertIn('if ! contrib/scripts/install_prereq install; then', SCRIPT)
        self.assertLess(SCRIPT.index('if ! contrib/scripts/install_prereq install; then'),
                        SCRIPT.index('./configure'))

    def test_systemd_override_is_created_without_overwriting_existing_file(self):
        self.assertIn('ASTERISK_DROPIN_FILE=', SCRIPT)
        self.assertIn('if [ -L "${ASTERISK_DROPIN_DIR}" ]; then', SCRIPT)
        self.assertIn('if [ -e "${ASTERISK_DROPIN_DIR}" ] && [ ! -d "${ASTERISK_DROPIN_DIR}" ]; then', SCRIPT)
        self.assertLess(SCRIPT.index('if [ -L "${ASTERISK_DROPIN_DIR}" ]; then'),
                        SCRIPT.index('mkdir -p "${ASTERISK_DROPIN_DIR}"'))
        self.assertIn('User=asterisk', SCRIPT)
        self.assertIn('Group=asterisk', SCRIPT)
        self.assertIn('if [ ! -e "${ASTERISK_DROPIN_FILE}" ] && [ ! -L "${ASTERISK_DROPIN_FILE}" ]; then', SCRIPT)
        self.assertLess(SCRIPT.index('ASTERISK_DROPIN_DIR='), SCRIPT.index('systemctl daemon-reload'))

    def test_asterisk_runtime_uid_matches_service_account(self):
        self.assertIn('systemctl show asterisk.service --property=MainPID --value', SCRIPT)
        self.assertIn('ASTERISK_RUNTIME_UID=', SCRIPT)
        self.assertIn("awk '/^Uid:/ {print $3}'", SCRIPT)
        self.assertLess(SCRIPT.index('if ! systemctl is-active --quiet asterisk.service; then'),
                        SCRIPT.index('ASTERISK_RUNTIME_UID='))
        self.assertIn('if [ "${ASTERISK_RUNTIME_UID}" != "$(id -u asterisk)" ]; then', SCRIPT)
        self.assertLess(SCRIPT.index('systemctl restart asterisk'),
                        SCRIPT.index('ASTERISK_RUNTIME_UID='))

    def test_systemd_service_is_active_after_restart(self):
        self.assertIn('if ! systemctl is-active --quiet asterisk.service; then', SCRIPT)
        self.assertLess(SCRIPT.index('systemctl restart asterisk'),
                        SCRIPT.index('if ! systemctl is-active --quiet asterisk.service; then'))

    def test_systemd_unit_must_exist_before_restart(self):
        self.assertIn('if ! systemctl cat asterisk.service >/dev/null 2>&1; then', SCRIPT)
        self.assertLess(SCRIPT.index('if ! systemctl cat asterisk.service'),
                        SCRIPT.index('systemctl restart asterisk'))

    def test_systemd_service_must_use_unprivileged_account(self):
        self.assertIn('systemctl show asterisk.service --property=User --value', SCRIPT)
        self.assertIn('systemctl show asterisk.service --property=Group --value', SCRIPT)
        self.assertLess(SCRIPT.index('if [ "$ASTERISK_UNIT_USER" != "asterisk" ]'),
                        SCRIPT.index('systemctl restart asterisk'))

    def test_existing_account_must_use_asterisk_primary_group(self):
        self.assertIn('if [ "$(id -gn asterisk)" != "asterisk" ]; then', SCRIPT)
        self.assertIn('usuario asterisk existente nao possui grupo primario asterisk', SCRIPT)

    def test_asterisk_account_creation_is_not_silently_ignored(self):
        self.assertNotIn("groupadd -r asterisk 2>/dev/null || true", SCRIPT)
        self.assertNotIn("useradd -r -g asterisk -d /var/lib/asterisk -s /usr/sbin/nologin -c \"Asterisk PBX Daemon\" asterisk 2>/dev/null || true", SCRIPT)
        self.assertIn("if ! id -u asterisk", SCRIPT)
        self.assertIn("if ! getent group asterisk", SCRIPT)

    def test_existing_config_ownership_and_modes_are_preserved(self):
        self.assertNotIn("chown -R asterisk:asterisk /etc/asterisk", SCRIPT)
        self.assertNotIn("chmod -R 750", SCRIPT)
        self.assertNotIn('find /etc/asterisk -maxdepth 1 -type f -name "*.conf" -exec chmod 640 {} +', SCRIPT)
        self.assertIn("chown asterisk:asterisk /var/{lib,log,run,spool}/asterisk", SCRIPT)
        self.assertIn("chmod 750 /var/{lib,log,run,spool}/asterisk", SCRIPT)

    def test_service_account_can_read_reconciled_configuration(self):
        self.assertIn('runuser -u asterisk -- test -r /etc/asterisk/manager.conf', SCRIPT)
        self.assertIn('runuser -u asterisk -- test -r /etc/asterisk/http.conf', SCRIPT)
        self.assertIn('runuser -u asterisk -- test -r /etc/asterisk/ari.conf', SCRIPT)
        self.assertIn('chgrp asterisk "$config_file"', SCRIPT)
        self.assertLess(SCRIPT.index('runuser -u asterisk -- test -r'),
                        SCRIPT.index('systemctl restart asterisk'))

    def test_webrtc_proxy_uses_local_asterisk_http_and_no_public_8089(self):
        self.assertIn('location = /ws {', DEPLOY)
        self.assertIn('proxy_pass http://127.0.0.1:8088/ws;', DEPLOY)
        self.assertNotIn('proxy_pass http://127.0.0.1:8089/ws;', DEPLOY)
        self.assertNotIn('ufw allow 8089/tcp', DEPLOY)

    def test_postgres_grants_fail_closed(self):
        self.assertIn('psql -v ON_ERROR_STOP=1 -d enlace_pbx', DEPLOY)
        self.assertIn('ERRO: nao foi possivel configurar os privilegios PostgreSQL', DEPLOY)
        self.assertNotIn('REVOKE CREATE ON SCHEMA public FROM enlace_app;" 2>/dev/null || true', DEPLOY)

    def test_samples_are_not_installed_on_existing_config(self):
        self.assertIn('if [ -L /etc/asterisk ]; then', SCRIPT)
        self.assertIn('if [ ! -d /etc/asterisk ]; then', SCRIPT)
        self.assertIn('if [ -e /etc/asterisk ]; then', SCRIPT)
        self.assertIn('ASTERISK_CONFIG_PREEXISTED=1', SCRIPT)
        self.assertLess(SCRIPT.index('ASTERISK_CONFIG_PREEXISTED=1'), SCRIPT.index('\nmake install\n'))
        self.assertIn('if [ "${ASTERISK_CONFIG_PREEXISTED}" -eq 1 ]; then', SCRIPT)
        self.assertRegex(SCRIPT, r'else\s+make samples\s+fi')


if __name__ == "__main__":
    unittest.main()

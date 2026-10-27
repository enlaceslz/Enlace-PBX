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

    def test_deploy_must_fail_when_nginx_or_application_health_fails(self):
        self.assertIn('if nginx -t >/dev/null 2>&1; then', DEPLOY)
        self.assertIn('Erro no arquivo de configuração do NGINX', DEPLOY)
        self.assertIn('ERRO: aplicação não respondeu ao health check HTTP', DEPLOY)
        self.assertNotIn('INICIANDO (Aguarde alguns segundos)', DEPLOY)
        self.assertIn('systemctl status enlace-pbx.service --no-pager >&2 || true', DEPLOY)

    def test_application_runs_as_unprivileged_systemd_user(self):
        self.assertIn('User=enlace-pbx', DEPLOY)
        self.assertIn('Group=enlace-pbx', DEPLOY)
        self.assertIn('NoNewPrivileges=true', DEPLOY)
        self.assertIn('ProtectSystem=strict', DEPLOY)
        self.assertIn('runuser -u enlace-pbx -- test -r', DEPLOY)
        self.assertIn('systemctl restart enlace-pbx.service', DEPLOY)
        self.assertNotIn('pm2 start dist/server.cjs', DEPLOY)
        self.assertNotIn('pm2 startup systemd -u root', DEPLOY)

    def test_legacy_pm2_migration_is_explicit(self):
        self.assertIn('pm2 pid enlace-pbx', DEPLOY)
        self.assertIn('ERRO: Enlace-PBX ainda executa sob PM2', DEPLOY)
        self.assertNotIn('npm install -g pm2', DEPLOY)
        self.assertNotIn('pm2 delete enlace-pbx', DEPLOY)

    def test_deploy_has_no_duplicate_installation_or_broken_shell_fragment(self):
        self.assertEqual(DEPLOY.count('apt-get update -y'), 1)
        self.assertEqual(DEPLOY.count('systemctl restart enlace-pbx.service'), 1)
        self.assertEqual(DEPLOY.count('# 2. Identificação do Sistema Operacional'), 1)
        self.assertNotIn('\n; then\n', DEPLOY)
        self.assertEqual(DEPLOY.count('if command -v pm2 >/dev/null'), 1)

    def test_deploy_has_one_configuration_and_one_summary(self):
        self.assertEqual(DEPLOY.count('# 6. Parâmetros de Configuração de Rede'), 1)
        self.assertEqual(DEPLOY.count('# 13. Resumo Final'), 1)
        self.assertIn('pm2 pid enlace-pbx', DEPLOY)

    def test_media_and_backup_directories_are_not_group_writable(self):
        self.assertIn('install -d -m 750 /var/backups/enlace-pbx', DEPLOY)
        self.assertIn('install -d -o asterisk -g asterisk -m 750 /var/spool/asterisk/recording', DEPLOY)
        self.assertNotIn('chmod 775 /var/spool/asterisk/recording', DEPLOY)

    def test_nginx_configuration_is_backed_up_and_restored_on_failure(self):
        self.assertIn('NGINX_BACKUP=$(mktemp /etc/nginx/sites-available/.enlace-pbx.backup.', DEPLOY)
        self.assertIn('cp -p "$NGINX_SITE" "$NGINX_BACKUP"', DEPLOY)
        self.assertIn('configuracao anterior restaurada', DEPLOY)
        self.assertLess(DEPLOY.index('if nginx -t >/dev/null 2>&1; then'), DEPLOY.index('rm -f /etc/nginx/sites-enabled/default'))

    def test_pm2_conflict_is_checked_before_host_changes(self):
        self.assertEqual(DEPLOY.count('pm2 pid enlace-pbx'), 1)
        self.assertLess(DEPLOY.index('pm2 pid enlace-pbx'), DEPLOY.index('apt-get update -y'))
        self.assertLess(DEPLOY.index('ERRO: Enlace-PBX ainda executa sob PM2'), DEPLOY.index('apt-get update -y'))

    def test_deploy_preflight_rejects_unsafe_location_and_env_symlink(self):
        self.assertEqual(DEPLOY.count('APP_DIR="$(pwd -P)"'), 1)
        self.assertIn('if [[ "${APP_DIR}" != /opt/* && "${APP_DIR}" != /srv/* ]]; then', DEPLOY)
        self.assertIn('if [ -L .env ]; then', DEPLOY)
        self.assertLess(DEPLOY.index('APP_DIR="$(pwd -P)"'), DEPLOY.index('apt-get update -y'))
        self.assertLess(DEPLOY.index('if [ -L .env ]; then'), DEPLOY.index('apt-get update -y'))

    def test_network_input_is_validated_before_config_generation(self):
        self.assertIn('ERRO: dominio/FQDN invalido.', DEPLOY)
        self.assertIn('ERRO: IP publico deve ser um endereco IPv4 valido.', DEPLOY)
        self.assertIn('octeto IPv4 fora do intervalo permitido', DEPLOY)
        self.assertLess(DEPLOY.index('ERRO: dominio/FQDN invalido.'), DEPLOY.index('CORS_ALLOWED_ORIGINS=https://'))
        self.assertLess(DEPLOY.index('ERRO: IP publico deve ser um endereco IPv4 valido.'), DEPLOY.index('PBX_PUBLIC_IP=${PUBLIC_IP}'))

    def test_health_check_retries_before_declaring_deploy_failure(self):
        self.assertIn('for attempt in $(seq 1 30); do', DEPLOY)
        self.assertIn('if ! systemctl is-active --quiet enlace-pbx.service; then', DEPLOY)
        self.assertIn('journalctl -u enlace-pbx.service -n 30 --no-pager', DEPLOY)
        self.assertNotIn('sleep 2\necho -e', DEPLOY)

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

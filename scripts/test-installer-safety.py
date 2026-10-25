#!/usr/bin/env python3
"""Static regression checks: installer must fail before apt-get on unsafe input."""
from pathlib import Path
import re
import unittest

SCRIPT = (Path(__file__).resolve().parent.parent / "install-enlace-pbx.sh").read_text()


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

    def test_asterisk_account_creation_is_not_silently_ignored(self):
        self.assertNotIn("groupadd -r asterisk 2>/dev/null || true", SCRIPT)
        self.assertNotIn("useradd -r -g asterisk -d /var/lib/asterisk -s /usr/sbin/nologin -c \"Asterisk PBX Daemon\" asterisk 2>/dev/null || true", SCRIPT)
        self.assertIn("if ! id -u asterisk", SCRIPT)
        self.assertIn("if ! getent group asterisk", SCRIPT)

    def test_no_recursive_chmod_of_asterisk_data(self):
        self.assertNotIn("chmod -R 750", SCRIPT)
        self.assertIn('find /etc/asterisk -maxdepth 1 -type f -name "*.conf" -exec chmod 640 {} +', SCRIPT)

    def test_samples_are_not_installed_on_existing_config(self):
        self.assertIn('if [ -e /etc/asterisk ] || [ -L /etc/asterisk ]; then', SCRIPT)
        self.assertRegex(SCRIPT, r'else\s+make samples\s+fi')


if __name__ == "__main__":
    unittest.main()

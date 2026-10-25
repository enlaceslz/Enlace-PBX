#!/usr/bin/env python3
"""Static regression checks for read-only homologation smoke tests."""
from pathlib import Path
import unittest

SCRIPT = (Path(__file__).resolve().parent / "homologation-smoke.sh").read_text()


class HomologationSmokeTests(unittest.TestCase):
    def test_identity_check_fails_closed(self):
        self.assertIn('else\n  fail "Asterisk runtime identity checks skipped: systemd unavailable or service inactive"\nfi', SCRIPT)
        self.assertIn('systemctl is-active --quiet asterisk.service; then', SCRIPT)

    def test_runtime_effective_uid_is_checked(self):
        self.assertIn("awk '/^Uid:/ {print $3}'", SCRIPT)
        self.assertIn('runtime_uid', SCRIPT)
        self.assertIn('id -u asterisk', SCRIPT)

    def test_failure_causes_nonzero_exit(self):
        self.assertIn('if [ "$FAIL" -gt 0 ]; then exit 1; fi', SCRIPT)

    def test_read_only(self):
        for forbidden in ('systemctl restart', 'systemctl stop', 'systemctl enable', 'apt-get install', 'chmod ', 'chown '):
            self.assertNotIn(forbidden, SCRIPT)


if __name__ == "__main__":
    unittest.main()

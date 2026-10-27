#!/usr/bin/env python3
"""Static regression checks for read-only homologation smoke tests."""
from pathlib import Path
import unittest
import os
import subprocess
import tempfile

SCRIPT = (Path(__file__).resolve().parent / "homologation-smoke.sh").read_text()


class HomologationSmokeTests(unittest.TestCase):
    def test_inactive_asterisk_reports_failure_at_runtime(self):
        with tempfile.TemporaryDirectory() as temp:
            fake_systemctl = Path(temp) / "systemctl"
            fake_systemctl.write_text("#!/bin/sh\nexit 3\n")
            fake_systemctl.chmod(0o755)
            env = os.environ.copy()
            env["PATH"] = temp + os.pathsep + env.get("PATH", "")
            result = subprocess.run(
                ["bash", str(Path(__file__).resolve().parent / "homologation-smoke.sh")],
                cwd=temp, env=env, capture_output=True, text=True, timeout=20,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("FAIL Asterisk runtime identity checks skipped", result.stdout)
            self.assertIn("FAIL asterisk inactive", result.stdout)

    def test_identity_check_fails_closed(self):
        self.assertIn('else\n  fail "Asterisk runtime identity checks skipped: systemd unavailable or service inactive"\nfi', SCRIPT)
        self.assertIn('systemctl is-active --quiet asterisk.service; then', SCRIPT)

    def test_runtime_effective_uid_is_checked(self):
        self.assertIn("awk '/^Uid:/ {print $3}'", SCRIPT)
        self.assertIn('runtime_uid', SCRIPT)
        self.assertIn('id -u asterisk', SCRIPT)

    def test_node_service_identity_is_verified(self):
        self.assertIn('systemctl is-active --quiet enlace-pbx.service', SCRIPT)
        self.assertIn('Enlace-PBX systemd unit User/Group mismatch', SCRIPT)
        self.assertIn('Enlace-PBX runtime effective UID mismatch', SCRIPT)
        self.assertIn('Enlace-PBX service inactive or systemd unavailable', SCRIPT)

    def test_failure_causes_nonzero_exit(self):
        self.assertIn('if [ "$FAIL" -gt 0 ]; then exit 1; fi', SCRIPT)

    def test_read_only(self):
        for forbidden in ('systemctl restart', 'systemctl stop', 'systemctl enable', 'apt-get install', 'chmod ', 'chown '):
            self.assertNotIn(forbidden, SCRIPT)


if __name__ == "__main__":
    unittest.main()

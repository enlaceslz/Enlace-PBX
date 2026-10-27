#!/usr/bin/env python3
"""Check the installer's existing-PBX safety gate without executing installation."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


INSTALLER = Path(__file__).resolve().parents[1] / "install-enlace-pbx.sh"


class InstallerSafetyTests(unittest.TestCase):
    def test_existing_pbx_gate_precedes_package_installation(self):
        source = INSTALLER.read_text(encoding="utf-8")
        self.assertIn('ENLACE_ALLOW_EXISTING_PBX', source)
        self.assertIn('I_UNDERSTAND_THE_RISK', source)
        self.assertLess(source.index('ENLACE_ALLOW_EXISTING_PBX'), source.index('apt-get update -q'))

    def test_missing_credentials_fail_before_any_package_install(self):
        env = os.environ.copy()
        env.pop("ASTERISK_AMI_PASSWORD", None)
        env.pop("ASTERISK_ARI_PASSWORD", None)
        result = subprocess.run(
            ["bash", str(INSTALLER)], env=env,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, timeout=10,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("ASTERISK_AMI_PASSWORD", result.stderr)

    def test_invalid_password_fails_before_any_package_install(self):
        env = os.environ.copy()
        env["ASTERISK_AMI_PASSWORD"] = "bad"
        env["ASTERISK_ARI_PASSWORD"] = "B" * 32
        result = subprocess.run(
            ["bash", str(INSTALLER)], env=env,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, timeout=10,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("pelo menos 24", result.stderr)


if __name__ == "__main__":
    unittest.main()

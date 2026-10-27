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

    def run_existing_pbx_guard(self, allow=False):
        source = INSTALLER.read_text(encoding="utf-8")
        start = source.index("# Installation compiles and restarts Asterisk.")
        end = source.index("# 2. Instalação de dependências do sistema", start)
        guard = source[start:end]
        # Simulate an installed Asterisk without touching the host filesystem.
        harness = (
            """set -e
command() { if [ "$1" = -v ] && [ "$2" = asterisk ]; then return 0; fi; builtin command "$@"; }
"""
            + guard + "\necho GUARD_CONTINUED\n"
        )
        env = os.environ.copy()
        if allow:
            env["ENLACE_ALLOW_EXISTING_PBX"] = "I_UNDERSTAND_THE_RISK"
        else:
            env.pop("ENLACE_ALLOW_EXISTING_PBX", None)
        return subprocess.run(
            ["bash", "-c", harness], env=env,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, timeout=5,
        )

    def test_existing_pbx_gate_denies_without_opt_in_in_isolated_shell(self):
        result = self.run_existing_pbx_guard()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("instalacao existente", result.stderr)
        self.assertNotIn("GUARD_CONTINUED", result.stdout)

    def test_existing_pbx_gate_allows_explicit_opt_in_in_isolated_shell(self):
        result = self.run_existing_pbx_guard(allow=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("GUARD_CONTINUED", result.stdout)
        self.assertIn("autorizacao explicita recebida", result.stderr)

    def test_os_gate_rejects_unsupported_distribution_in_isolated_shell(self):
        source = INSTALLER.read_text(encoding="utf-8")
        start = source.index("# Reject unsupported operating systems")
        end = source.index("# Resolve installer dependencies", start)
        gate = source[start:end]
        # Source the original gate, but replace the system release file in
        # the extracted shell snippet with a temporary test fixture.
        with tempfile.TemporaryDirectory() as directory:
            release = Path(directory) / "os-release"
            release.write_text('ID=arch\nVERSION_ID=rolling\n', encoding="utf-8")
            gate = gate.replace("/etc/os-release", str(release))
            result = subprocess.run(
                ["bash", "-c", "set -e\n" + gate + "\necho GATE_CONTINUED\n"],
                capture_output=True, text=True, timeout=5,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("nao suportado", result.stderr)
            self.assertNotIn("GATE_CONTINUED", result.stdout)

    def test_os_gate_accepts_debian_12_in_isolated_shell(self):
        source = INSTALLER.read_text(encoding="utf-8")
        start = source.index("# Reject unsupported operating systems")
        end = source.index("# Resolve installer dependencies", start)
        gate = source[start:end]
        with __import__("tempfile").TemporaryDirectory() as directory:
            release = Path(directory) / "os-release"
            release.write_text('ID=debian\nVERSION_ID="12"\n', encoding="utf-8")
            gate = gate.replace("/etc/os-release", str(release))
            result = subprocess.run(
                ["bash", "-c", "set -e\n" + gate + "\necho GATE_CONTINUED\n"],
                capture_output=True, text=True, timeout=5,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("GATE_CONTINUED", result.stdout)

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

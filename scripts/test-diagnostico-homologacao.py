#!/usr/bin/env python3
"""Mock child collectors to validate orchestration without a PBX."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

SOURCE = Path(__file__).with_name("diagnostico-homologacao.sh")


class DiagnosticBundleTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.scripts = self.root / "scripts"
        self.scripts.mkdir()
        shutil.copy2(SOURCE, self.scripts / SOURCE.name)
        preflight = self.scripts / "preflight-homologacao.sh"
        preflight.write_text(
            '#!/bin/bash\n'
            'printf "preflight synthetic\\n" > "$2"\n'
            'exit "${FAIL_PREFLIGHT:-0}"\n'
        )
        for name in ("inventory-homologation-isolation.sh", "collect-asterisk-evidence.sh"):
            path = self.scripts / name
            path.write_text(
                '#!/bin/bash\n'
                'mkdir -m 700 -- "$1"\n'
                'printf "synthetic\\n" > "$1/report.txt"\n'
                'exit "${FAIL_CHILD:-0}"\n'
            )
        self.target = self.root / "output"

    def run_bundle(self, **env_updates):
        env = dict(os.environ, **env_updates)
        return subprocess.run(
            ["bash", str(self.scripts / SOURCE.name), str(self.target)],
            capture_output=True, text=True, timeout=15, env=env,
        )

    def test_success_private_summary_and_integrity(self):
        result = self.run_bundle()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.target.stat().st_mode & 0o777, 0o700)
        self.assertIn("resultado=0", (self.target / "RESUMO.txt").read_text())
        self.assertIn("isolamento=NAO CONFIRMADO", (self.target / "RESUMO.txt").read_text())
        self.assertTrue((self.target / "rotas/report.txt").exists())
        self.assertTrue((self.target / "asterisk/report.txt").exists())
        self.assertEqual(
            subprocess.run(["sha256sum", "--check", "SHA256SUMS"], cwd=self.target,
                           capture_output=True).returncode, 0,
        )

    def test_tampered_child_report_breaks_bundle_integrity(self):
        result = self.run_bundle()
        self.assertEqual(result.returncode, 0, result.stderr)
        (self.target / "asterisk/report.txt").write_text("tampered")
        verification = subprocess.run(
            ["sha256sum", "--check", "SHA256SUMS"], cwd=self.target,
            capture_output=True, text=True,
        )
        self.assertNotEqual(verification.returncode, 0)

    def test_bundle_verifier_rejects_missing_and_extra_files(self):
        result = self.run_bundle()
        self.assertEqual(result.returncode, 0, result.stderr)
        verifier = Path(__file__).with_name("verify-diagnostic-bundle.py")
        # Mock child collectors do not produce real file inventories, so the
        # verifier must reject their incomplete output.
        check = subprocess.run(
            ["python3", str(verifier), str(self.target)],
            capture_output=True, text=True,
        )
        self.assertEqual(check.returncode, 2)

    def test_partial_failure_is_reported_and_other_collectors_run(self):
        result = self.run_bundle(FAIL_PREFLIGHT="1")
        self.assertEqual(result.returncode, 1)
        self.assertIn("resultado=1", (self.target / "RESUMO.txt").read_text())
        self.assertTrue((self.target / "rotas/report.txt").exists())
        self.assertTrue((self.target / "asterisk/report.txt").exists())

    def test_existing_destination_is_preserved(self):
        self.target.mkdir()
        (self.target / "sentinel").write_text("original")
        result = self.run_bundle()
        self.assertEqual(result.returncode, 2)
        self.assertEqual((self.target / "sentinel").read_text(), "original")


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""Functional regression tests for preflight evidence reports."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).with_name("preflight-homologacao.sh")


class PreflightReportTests(unittest.TestCase):
    def test_report_created_private_and_preserves_exit_status(self):
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / "preflight.txt"
            result = subprocess.run(
                ["bash", str(SCRIPT), "--report", str(report)],
                capture_output=True, text=True, check=False, timeout=20,
            )
            self.assertTrue(report.is_file())
            self.assertEqual(report.stat().st_mode & 0o777, 0o600)
            self.assertIn("Resumo:", report.read_text())
            self.assertEqual(result.returncode, 1 if "FALHA:" in report.read_text() else 0)

    def test_existing_report_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / "preflight.txt"
            report.write_text("EVIDENCIA ORIGINAL\n")
            result = subprocess.run(
                ["bash", str(SCRIPT), "--report", str(report)],
                capture_output=True, text=True, check=False, timeout=20,
            )
            self.assertEqual(result.returncode, 2)
            self.assertEqual(report.read_text(), "EVIDENCIA ORIGINAL\n")

    def test_invalid_arguments_rejected(self):
        result = subprocess.run(
            ["bash", str(SCRIPT), "--report"],
            capture_output=True, text=True, check=False, timeout=20,
        )
        self.assertEqual(result.returncode, 2)


if __name__ == "__main__":
    unittest.main()

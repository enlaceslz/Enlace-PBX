#!/usr/bin/env python3
"""Functional checks for the read-only homologation route inventory."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).with_name("inventory-homologation-isolation.sh")


class IsolationInventoryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        bindir = self.root / "bin"
        bindir.mkdir()
        fake = bindir / "ip"
        fake.write_text(
            "#!/bin/sh\n"
            'case "$*" in\n'
            '  "-4 route show default") [ "$FAKE_IPV4" = yes ] && echo "default via synthetic";;\n'
            '  "-6 route show default") [ "$FAKE_IPV6" = yes ] && echo "default via synthetic";;\n'
            '  *) exit 44;;\n'
            'esac\n'
        )
        fake.chmod(0o700)
        self.env = dict(os.environ, PATH=str(bindir) + os.pathsep + os.environ["PATH"],
                        FAKE_IPV4="yes", FAKE_IPV6="no")
        self.target = self.root / "report"

    def run_inventory(self):
        return subprocess.run(["bash", str(SCRIPT), str(self.target)],
                              env=self.env, capture_output=True, text=True, timeout=15)

    def test_routes_report_is_private_and_sanitized(self):
        result = self.run_inventory()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.target.stat().st_mode & 0o777, 0o700)
        report = (self.target / "rotas.txt").read_text()
        self.assertIn("rota IPv4 padrao presente", report)
        self.assertIn("nenhuma rota IPv6 padrao", report)
        self.assertNotIn("synthetic", report)
        self.assertEqual(
            subprocess.run(["sha256sum", "--check", "SHA256SUMS"],
                           cwd=self.target, capture_output=True).returncode, 0,
        )

    def test_existing_directory_is_not_modified(self):
        self.target.mkdir()
        sentinel = self.target / "sentinel"
        sentinel.write_text("original")
        result = self.run_inventory()
        self.assertEqual(result.returncode, 2)
        self.assertEqual(sentinel.read_text(), "original")


if __name__ == "__main__":
    unittest.main()

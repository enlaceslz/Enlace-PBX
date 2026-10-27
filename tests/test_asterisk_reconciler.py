#!/usr/bin/env python3
"""Regression tests for the Asterisk configuration reconciler (no PBX required)."""
import os
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "reconcile-asterisk-config.py"
AMI_SECRET = "A" * 32
ARI_SECRET = "B" * 32


class ReconcilerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / "manager.conf").write_text(
            "[general]\nenabled = no\n\n[existing_trunk]\nsecret = preserve-me\n",
            encoding="utf-8",
        )

    def run_reconciler(self, **overrides):
        env = os.environ.copy()
        env.update({
            "ASTERISK_CONFIG_DIR": str(self.root),
            "ASTERISK_AMI_USER": "enlace_ami",
            "ASTERISK_ARI_USER": "enlace_ari",
            "ASTERISK_AMI_PASSWORD": AMI_SECRET,
            "ASTERISK_ARI_PASSWORD": ARI_SECRET,
        })
        env.update(overrides)
        return subprocess.run(
            [sys.executable, str(SCRIPT)], env=env,
            capture_output=True, text=True, check=False,
        )

    def test_provisions_credentials_and_preserves_unmanaged_sections(self):
        result = self.run_reconciler()
        self.assertEqual(result.returncode, 0, result.stderr)
        manager = (self.root / "manager.conf").read_text(encoding="utf-8")
        ari = (self.root / "ari.conf").read_text(encoding="utf-8")
        self.assertIn("[existing_trunk]\nsecret = preserve-me", manager)
        self.assertIn("[enlace_ami]\nsecret = " + AMI_SECRET, manager)
        self.assertIn("[enlace_ari]\ntype = user", ari)
        self.assertIn("password = " + ARI_SECRET, ari)
        self.assertIn("bindaddr = 127.0.0.1", manager)

    def test_backup_is_private_even_when_original_is_world_readable(self):
        manager = self.root / "manager.conf"
        manager.chmod(0o644)
        result = self.run_reconciler()
        self.assertEqual(result.returncode, 0, result.stderr)
        backups = list(self.root.glob("manager.conf.bak.*"))
        self.assertTrue(backups)
        for backup in backups:
            with self.subTest(backup=backup.name):
                self.assertEqual(stat.S_IMODE(backup.stat().st_mode), 0o600)

    def test_second_run_is_idempotent(self):
        self.assertEqual(self.run_reconciler().returncode, 0)
        before = {p.name: p.read_bytes() for p in self.root.glob("*.conf")}
        backups_before = sorted(p.name for p in self.root.glob("*.bak.*"))
        result = self.run_reconciler()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(before, {p.name: p.read_bytes() for p in self.root.glob("*.conf")})
        self.assertEqual(backups_before, sorted(p.name for p in self.root.glob("*.bak.*")))

    def test_rejects_shared_password_without_writing_files(self):
        original = (self.root / "manager.conf").read_bytes()
        result = self.run_reconciler(ASTERISK_ARI_PASSWORD=AMI_SECRET)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("distinct", result.stderr)
        self.assertEqual((self.root / "manager.conf").read_bytes(), original)
        self.assertFalse((self.root / "ari.conf").exists())

    def test_rejects_shared_username_without_writing_files(self):
        original = (self.root / "manager.conf").read_bytes()
        result = self.run_reconciler(ASTERISK_ARI_USER="enlace_ami")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("distinct", result.stderr)
        self.assertEqual((self.root / "manager.conf").read_bytes(), original)
        self.assertFalse((self.root / "ari.conf").exists())

    def test_rejects_unsafe_password(self):
        result = self.run_reconciler(ASTERISK_AMI_PASSWORD="bad\n[admin]\n" + "x" * 24)
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("[enlace_ami]", (self.root / "manager.conf").read_text())

    def test_rejects_symlink_configuration(self):
        target = self.root / "target.conf"
        target.write_text("[general]\nenabled = no\n", encoding="utf-8")
        (self.root / "ari.conf").symlink_to(target)
        result = self.run_reconciler()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(target.read_text(), "[general]\nenabled = no\n")

    def test_late_symlink_does_not_modify_manager(self):
        original = (self.root / "manager.conf").read_bytes()
        target = self.root / "target.conf"
        target.write_text("[general]\nenabled = no\n", encoding="utf-8")
        (self.root / "ari.conf").symlink_to(target)
        result = self.run_reconciler()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((self.root / "manager.conf").read_bytes(), original)

    def test_late_duplicate_does_not_modify_manager(self):
        original = (self.root / "manager.conf").read_bytes()
        (self.root / "ari.conf").write_text(
            "[general]\nenabled = yes\n[general]\nenabled = no\n",
            encoding="utf-8",
        )
        result = self.run_reconciler()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((self.root / "manager.conf").read_bytes(), original)

    def test_rejects_duplicate_managed_section(self):
        (self.root / "manager.conf").write_text(
            "[enlace_ami]\nsecret = old\n[enlace_ami]\nsecret = other\n",
            encoding="utf-8",
        )
        result = self.run_reconciler()
        self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()

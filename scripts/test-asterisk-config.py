#!/usr/bin/env python3
"""Regression tests for AMI/ARI config reconciliation (no Asterisk required)."""
import importlib.util
import os
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("reconcile-asterisk-config.py")
spec = importlib.util.spec_from_file_location("asterisk_reconcile", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ReconcileTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.file = Path(self.tmp.name) / "manager.conf"

    def test_create_then_repeat_is_idempotent(self):
        module.reconcile(self.file, "enlace_ami", "secret = abc123")
        first = self.file.read_bytes()
        module.reconcile(self.file, "enlace_ami", "secret = abc123")
        self.assertEqual(first, self.file.read_bytes())
        self.assertEqual(len(list(self.file.parent.glob("*.bak.*"))), 0)

    def test_replaces_only_owned_section_and_backs_up(self):
        self.file.write_text("[general]\nenabled = yes\n\n[enlace_ami]\nsecret = old\n\n[other]\nsecret = untouched\n")
        module.reconcile(self.file, "enlace_ami", "secret = new")
        text = self.file.read_text()
        self.assertIn("[general]\nenabled = yes", text)
        self.assertIn("[other]\nsecret = untouched", text)
        self.assertIn("[enlace_ami]\nsecret = new", text)
        self.assertNotIn("secret = old", text)
        self.assertEqual(len(list(self.file.parent.glob("*.bak.*"))), 1)

    def test_duplicate_section_fails_without_change(self):
        original = "[enlace_ami]\nsecret = a\n[enlace_ami]\nsecret = b\n"
        self.file.write_text(original)
        with self.assertRaises(ValueError):
            module.reconcile(self.file, "enlace_ami", "secret = new")
        self.assertEqual(self.file.read_text(), original)

    def test_invalid_secret_is_rejected(self):
        with self.assertRaises(ValueError):
            module.require_secret("UNSET_TEST_SECRET")
        os.environ["UNSAFE_TEST_SECRET"] = "x" * 24 + "\n[general]"
        self.addCleanup(os.environ.pop, "UNSAFE_TEST_SECRET", None)
        with self.assertRaises(ValueError):
            module.require_secret("UNSAFE_TEST_SECRET")

if __name__ == "__main__":
    unittest.main()

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

    def test_general_options_are_updated_without_losing_other_settings(self):
        self.file.write_text("[general]\nenabled = no\ncustom = retained\n\n[other]\nvalue = untouched\n")
        module.ensure_general(self.file, {"enabled": "yes", "bindaddr": "127.0.0.1"})
        first = self.file.read_text()
        self.assertIn("enabled = yes", first)
        self.assertIn("custom = retained", first)
        self.assertIn("[other]\nvalue = untouched", first)
        module.ensure_general(self.file, {"enabled": "yes", "bindaddr": "127.0.0.1"})
        self.assertEqual(first, self.file.read_text())

    def test_general_duplicates_fail_closed(self):
        original = "[general]\na = 1\n[general]\na = 2\n"
        self.file.write_text(original)
        with self.assertRaises(ValueError):
            module.ensure_general(self.file, {"enabled": "yes"})
        self.assertEqual(original, self.file.read_text())

    def test_symlinked_config_is_rejected_without_changing_target(self):
        target = Path(self.tmp.name) / "original.conf"
        target.write_text("[general]\nenabled = no\n")
        self.file.symlink_to(target)
        with self.assertRaises(ValueError):
            module.reconcile(self.file, "general", "enabled = yes")
        with self.assertRaises(ValueError):
            module.ensure_general(self.file, {"enabled": "yes"})
        self.assertEqual(target.read_text(), "[general]\nenabled = no\n")

    def test_nonregular_config_is_rejected(self):
        self.file.mkdir()
        with self.assertRaises(ValueError):
            module.reconcile(self.file, "general", "enabled = yes")

    def test_symlinked_parent_directory_is_rejected(self):
        real_dir = Path(self.tmp.name) / "real"
        real_dir.mkdir()
        link_dir = Path(self.tmp.name) / "linked"
        link_dir.symlink_to(real_dir, target_is_directory=True)
        with self.assertRaises(ValueError):
            module.reconcile(link_dir / "manager.conf", "enlace_ami", "secret = test")
        self.assertFalse((real_dir / "manager.conf").exists())

    def test_sip_and_dialplan_files_are_untouched(self):
        config_dir = Path(self.tmp.name)
        pjsip = config_dir / "pjsip.conf"
        dialplan = config_dir / "extensions.conf"
        pjsip.write_text("[provider-trunk]\\ntype = endpoint\\ncontext = inbound\\n")
        dialplan.write_text("[inbound]\\nexten => s,1,Answer()\\n")
        before = {p.name: p.read_bytes() for p in (pjsip, dialplan)}
        manager = config_dir / "manager.conf"
        module.ensure_general(manager, {"enabled": "yes", "bindaddr": "127.0.0.1"})
        module.reconcile(manager, "enlace_ami", "secret = example")
        module.ensure_general(manager, {"enabled": "yes", "bindaddr": "127.0.0.1"})
        module.reconcile(manager, "enlace_ami", "secret = example")
        self.assertEqual(before, {p.name: p.read_bytes() for p in (pjsip, dialplan)})

    def test_invalid_secret_is_rejected(self):
        with self.assertRaises(ValueError):
            module.require_secret("UNSET_TEST_SECRET")
        os.environ["UNSAFE_TEST_SECRET"] = "x" * 24 + "\n[general]"
        self.addCleanup(os.environ.pop, "UNSAFE_TEST_SECRET", None)
        with self.assertRaises(ValueError):
            module.require_secret("UNSAFE_TEST_SECRET")

if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""Regression tests for deploy environment preservation."""
import importlib.util
import tempfile
import unittest
from unittest import mock
from pathlib import Path

spec = importlib.util.spec_from_file_location("merge_env", Path(__file__).with_name("merge-env.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class MergeEnvTests(unittest.TestCase):
    def test_preserves_unmanaged_and_overwrites_managed(self):
        old = "DATABASE_URL=old\nCUSTOM_TOKEN=abc=123\nJWT_SECRET=old-secret\n"
        generated = "DATABASE_URL=new\nJWT_SECRET=new-secret\n"
        result = module.merge(old, generated)
        self.assertIn("DATABASE_URL=new\n", result)
        self.assertNotIn("DATABASE_URL=old", result)
        self.assertIn("CUSTOM_TOKEN=abc=123\n", result)
        self.assertNotIn("JWT_SECRET=old-secret", result)

    def test_no_shell_execution_or_comment_copy(self):
        old = "# comment\nDANGEROUS=$(touch /tmp/should-not-run)\n"
        result = module.merge(old, "SAFE=yes\n")
        self.assertNotIn("# comment", result)
        self.assertIn("DANGEROUS=$(touch /tmp/should-not-run)", result)

    def test_duplicate_custom_keys_are_not_reintroduced(self):
        result = module.merge("EXTRA=first\nEXTRA=second\n", "SAFE=yes\n")
        self.assertEqual(result.count("EXTRA="), 1)

    def test_rejects_symlink_input_without_modifying_generated(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            original = root / "original.env"
            original.write_text("CUSTOM=kept\\n")
            symlink = root / "linked.env"
            symlink.symlink_to(original)
            generated = root / "generated.env"
            generated.write_text("SAFE=yes\\n")
            with self.assertRaises(ValueError):
                with mock.patch.object(module.sys, "argv", ["merge-env.py", str(symlink), str(generated)]):
                    module.main()
            self.assertEqual(generated.read_text(), "SAFE=yes\\n")

    def test_merge_is_idempotent(self):
        initial = "SAFE=yes\n"
        once = module.merge("EXTRA=kept\n", initial)
        self.assertEqual(once, module.merge("EXTRA=kept\n", once))


if __name__ == "__main__":
    unittest.main()

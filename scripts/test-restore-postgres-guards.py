#!/usr/bin/env python3
"""Exercise the exact URI validator used by restore-postgres-test.sh."""
from pathlib import Path
import subprocess
import sys
import unittest

VALIDATOR = Path(__file__).resolve().with_name("validate-restore-target.py")


class RestorePostgresGuardTests(unittest.TestCase):
    def validate(self, uri):
        return subprocess.run(
            [sys.executable, str(VALIDATOR), "--stdin"],
            input=uri, capture_output=True, text=True, check=False,
        )

    def test_missing_username(self):
        self.assertNotEqual(self.validate("postgresql://localhost/enlace_restore_test").returncode, 0)

    def test_query_override(self):
        self.assertNotEqual(self.validate("postgresql://tester:pw@localhost/enlace_restore_test?host=remote").returncode, 0)

    def test_fragment(self):
        self.assertNotEqual(self.validate("postgresql://tester:pw@localhost/enlace_restore_test#override").returncode, 0)

    def test_privileged_role(self):
        self.assertNotEqual(self.validate("postgresql://postgres:pw@localhost/enlace_restore_test").returncode, 0)

    def test_remote_host(self):
        self.assertNotEqual(self.validate("postgresql://tester:pw@db.example/enlace_restore_test").returncode, 0)

    def test_production_db(self):
        self.assertNotEqual(self.validate("postgresql://tester:pw@localhost/enlace_pbx").returncode, 0)

    def test_missing_password(self):
        self.assertNotEqual(self.validate("postgresql://tester@localhost/enlace_restore_test").returncode, 0)

    def test_valid_local_target(self):
        result = self.validate("postgresql://tester:pw@127.0.0.1/enlace_restore_test")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), "enlace_restore_test")


if __name__ == "__main__":
    unittest.main()

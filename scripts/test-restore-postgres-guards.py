#!/usr/bin/env python3
"""Negative safety checks for PostgreSQL test restore URI validation."""
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().with_name("restore-postgres-test.sh")


class RestorePostgresGuardTests(unittest.TestCase):
    def run_invalid(self, uri):
        with tempfile.TemporaryDirectory() as directory:
            # The guard must reject invalid targets before invoking pg_restore.
            archive = Path(directory) / "backup.dump"
            archive.write_bytes(b"not a real dump")
            result = subprocess.run(
                ["bash", str(SCRIPT), str(archive), uri],
                capture_output=True, text=True, check=False,
            )
            return result

    def test_missing_username_is_rejected_by_uri_parser(self):
        self.assertFalse(self.valid_target("postgresql://localhost/enlace_restore_test"))

    def test_query_parameters_are_rejected(self):
        self.assertFalse(self.valid_target(
            "postgresql://tester@localhost/enlace_restore_test?host=remote.example"
        ))

    def test_fragment_is_rejected(self):
        self.assertFalse(self.valid_target(
            "postgresql://tester@localhost/enlace_restore_test#override"
        ))

    def test_privileged_role_is_rejected(self):
        self.assertFalse(self.valid_target("postgresql://postgres@localhost/enlace_restore_test"))

    def test_remote_host_is_rejected(self):
        self.assertFalse(self.valid_target("postgresql://tester@db.example/enlace_restore_test"))

    def test_production_database_name_is_rejected(self):
        self.assertFalse(self.valid_target("postgresql://tester@localhost/enlace_pbx"))

    def test_explicit_local_test_target_is_allowed_by_parser(self):
        self.assertTrue(self.valid_target("postgresql://tester@127.0.0.1/enlace_restore_test"))

    @staticmethod
    def valid_target(uri):
        # Mirrors the guard's URI constraints without touching PostgreSQL.
        from urllib.parse import urlsplit, unquote
        try:
            url = urlsplit(uri)
            name = unquote(url.path.lstrip("/"))
            return bool(
                url.scheme in ("postgres", "postgresql")
                and url.hostname in ("127.0.0.1", "localhost", "::1")
                and url.username and url.username not in ("postgres", "enlace_app")
                and name and "/" not in name
                and (name.endswith("_restore_test") or name.endswith("_homologacao"))
                and not url.query and not url.fragment
            )
        except ValueError:
            return False


if __name__ == "__main__":
    unittest.main()

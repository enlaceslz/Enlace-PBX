#!/usr/bin/env python3
"""Functional checks for coordinated backup manifest verification."""
import hashlib
import pathlib
import subprocess
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).resolve().with_name("verify-backup-manifest.sh")


class BackupManifestTests(unittest.TestCase):
    def check_manifest(self, *, tamper=False, traversal=False, missing=False):
        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            db = root / "enlace-pbx-postgres-20261026T010101Z.dump"
            pbx = root / "enlace-pbx-files-20261026T010101Z.tar.gz"
            db.write_bytes(b"postgres-backup-fixture")
            pbx.write_bytes(b"pbx-backup-fixture")
            names = [db.name, pbx.name]
            if traversal:
                names[1] = "../" + names[1]
            manifest = root / "enlace-pbx-backup-20261026T010101Z.manifest"
            manifest.write_text("".join(
                hashlib.sha256((root / filename).read_bytes()).hexdigest() +
                "  " + name + "\n"
                for filename, name in zip([db.name, pbx.name], names)
            ))
            if tamper:
                pbx.write_bytes(b"corrupted")
            if missing:
                db.unlink()
            return subprocess.run(
                ["bash", str(SCRIPT), str(manifest)],
                capture_output=True, text=True, check=False,
            )

    def test_valid_manifest(self):
        result = self.check_manifest()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_tampered_archive_rejected(self):
        result = self.check_manifest(tamper=True)
        self.assertNotEqual(result.returncode, 0)

    def test_path_traversal_rejected(self):
        result = self.check_manifest(traversal=True)
        self.assertNotEqual(result.returncode, 0)

    def test_missing_archive_rejected(self):
        result = self.check_manifest(missing=True)
        self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()

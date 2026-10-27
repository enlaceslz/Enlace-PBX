#!/usr/bin/env python3
"""Functional regression tests for isolated PBX archive staging restore."""
import io
import hashlib
import os
import pathlib
import subprocess
import tarfile
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).resolve().with_name("restore-pbx-files-staging.sh")


def archive_at(path, entries):
    with tarfile.open(path, "w:gz") as tar:
        for name, kind in entries:
            data = b"restored-content"
            info = tarfile.TarInfo(name)
            if kind == "file":
                info.size = len(data)
                tar.addfile(info, io.BytesIO(data))
            elif kind == "symlink":
                info.type = tarfile.SYMTYPE
                info.linkname = "/etc/passwd"
                tar.addfile(info)
            elif kind == "hardlink":
                info.type = tarfile.LNKTYPE
                info.linkname = "etc/asterisk/test.conf"
                tar.addfile(info)
            elif kind == "directory":
                info.type = tarfile.DIRTYPE
                tar.addfile(info)


class RestorePbxArchiveTests(unittest.TestCase):
    def run_restore(self, entries, existing=False):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            archive = root / "backup.tar.gz"
            destination = root / "staging"
            destination.mkdir()
            archive_at(archive, entries)
            checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
            (root / "backup.tar.gz.sha256").write_text(f"{checksum}  backup.tar.gz\n")
            if existing:
                (destination / "keep").write_text("original")
            result = subprocess.run(
                ["bash", str(SCRIPT), str(archive), str(destination)],
                text=True, capture_output=True, check=False,
            )
            names = [str(p.relative_to(destination)) for p in destination.rglob("*")]
            return result, names

    def test_valid_archive(self):
        result, names = self.run_restore([
            ("etc/asterisk", "directory"),
            ("etc/asterisk/test.conf", "file"),
        ])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("etc/asterisk/test.conf", names)

    def test_reject_path_traversal(self):
        result, names = self.run_restore([("etc/asterisk/../../../tmp/escape", "file")])
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(names)

    def test_reject_absolute_path(self):
        result, names = self.run_restore([("/etc/asterisk/test.conf", "file")])
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(names)

    def test_reject_unexpected_path(self):
        result, names = self.run_restore([("etc/shadow", "file")])
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(names)

    def test_reject_symlink(self):
        result, names = self.run_restore([("etc/asterisk/link", "symlink")])
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(names)

    def test_reject_hardlink(self):
        result, names = self.run_restore([("etc/asterisk/link", "hardlink")])
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(names)

    def test_reject_duplicate_archive_member(self):
        result, names = self.run_restore([
            ("etc/asterisk/test.conf", "file"),
            ("etc/asterisk/test.conf", "file"),
        ])
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("entrada duplicada", result.stderr)
        self.assertFalse(names)

    def test_reject_nonempty_staging(self):
        result, names = self.run_restore([("etc/asterisk/test.conf", "file")], existing=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(names, ["keep"])

    def test_reject_symlinked_staging_parent(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            actual = root / "actual"
            actual.mkdir()
            parent = root / "linked"
            parent.symlink_to(actual, target_is_directory=True)
            destination = parent / "staging"
            destination.mkdir()
            archive = root / "backup.tar.gz"
            archive_at(archive, [("etc/asterisk/test.conf", "file")])
            checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
            (root / "backup.tar.gz.sha256").write_text(f"{checksum}  backup.tar.gz\n")
            result = subprocess.run(
                ["bash", str(SCRIPT), str(archive), str(destination)],
                text=True, capture_output=True, check=False,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("componente de caminho simbolico", result.stderr)
            self.assertFalse(list(destination.iterdir()))

    def test_reject_empty_archive(self):
        result, names = self.run_restore([])
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(names)


if __name__ == "__main__":
    unittest.main()

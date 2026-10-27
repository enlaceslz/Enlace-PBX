#!/usr/bin/env python3
"""Positive and negative cases for the strict diagnostic bundle verifier."""
import hashlib
import os
from pathlib import Path
import shutil
import tempfile
import unittest

from importlib.machinery import SourceFileLoader

VERIFIER = Path(__file__).with_name("verify-diagnostic-bundle.py")
# Import the actual validator, not a mock implementation.
import importlib.util
spec = importlib.util.spec_from_loader("diagnostic_verifier", SourceFileLoader("diagnostic_verifier", str(VERIFIER)))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class BundleVerifierTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "bundle"
        self.root.mkdir()
        for name in module.EXPECTED:
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("synthetic evidence: " + name + "\n")
        self.write_manifest()

    def write_manifest(self):
        lines = []
        for name in sorted(module.EXPECTED):
            digest = hashlib.sha256((self.root / name).read_bytes()).hexdigest()
            lines.append(f"{digest}  ./{name}\n")
        (self.root / "SHA256SUMS").write_text("".join(lines))

    def test_valid_complete_bundle(self):
        self.assertTrue(module.validate(self.root))

    def test_tampered_file(self):
        (self.root / "asterisk/asterisk-version.txt").write_text("tampered")
        with self.assertRaisesRegex(ValueError, "Hash divergente"):
            module.validate(self.root)

    def test_missing_file(self):
        (self.root / "rotas/rotas.txt").unlink()
        with self.assertRaises(ValueError):
            module.validate(self.root)

    def test_extra_file(self):
        (self.root / "unexpected.txt").write_text("extra")
        with self.assertRaisesRegex(ValueError, "extras"):
            module.validate(self.root)

    def test_oversized_evidence_is_rejected(self):
        path = self.root / "asterisk/asterisk-version.txt"
        with path.open("wb") as stream:
            stream.truncate(8 * 1024 * 1024 + 1)
        self.write_manifest()
        with self.assertRaisesRegex(ValueError, "excessivamente grande"):
            module.validate(self.root)

    def test_oversized_manifest_is_rejected(self):
        manifest = self.root / "SHA256SUMS"
        manifest.write_text("x" * 16385)
        with self.assertRaisesRegex(ValueError, "excessivamente grande"):
            module.validate(self.root)

    def test_unexpected_empty_directory(self):
        (self.root / "untracked-empty").mkdir()
        with self.assertRaisesRegex(ValueError, "Diretorios extras"):
            module.validate(self.root)

    def test_fifo_is_rejected_without_blocking(self):
        path = self.root / "rotas/rotas.txt"
        path.unlink()
        os.mkfifo(path)
        with self.assertRaises(ValueError):
            module.validate(self.root)

    def test_symlink(self):
        (self.root / "rotas/rotas.txt").unlink()
        (self.root / "rotas/rotas.txt").symlink_to(self.root / "RESUMO.txt")
        with self.assertRaisesRegex(ValueError, "simbolico"):
            module.validate(self.root)

    def test_duplicate_manifest_entry(self):
        manifest = self.root / "SHA256SUMS"
        first = manifest.read_text().splitlines()[0]
        manifest.write_text(manifest.read_text() + first + "\n")
        with self.assertRaisesRegex(ValueError, "duplicado"):
            module.validate(self.root)


if __name__ == "__main__":
    unittest.main()

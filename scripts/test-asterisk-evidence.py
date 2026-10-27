#!/usr/bin/env python3
"""Functional tests for the read-only Asterisk evidence collector."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

COLLECTOR = Path(__file__).with_name("collect-asterisk-evidence.sh")
COMMANDS = {
    "core show uptime",
    "core show version",
    "module show like res_pjsip.so",
    "core show channels count",
}


class CollectorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.bin = root / "bin"
        self.bin.mkdir()
        self.log = root / "commands.log"
        fake = self.bin / "asterisk"
        fake.write_text(
            "#!/bin/sh\n"
            'printf "%s\\n" "$*" >> "$FAKE_AST_LOG"\n'
            'case "$*" in\n'
            '  "-rx core show uptime"|"-rx core show version"|'
            '"-rx module show like res_pjsip.so"|"-rx core show channels count") '
            'printf "synthetic aggregate\\n";;\n'
            '  *) exit 40;;\n'
            'esac\n'
        )
        fake.chmod(0o700)
        self.env = dict(os.environ, PATH=str(self.bin) + os.pathsep + os.environ["PATH"],
                        FAKE_AST_LOG=str(self.log))
        self.target = root / "evidence"

    def run_collector(self):
        return subprocess.run(
            ["bash", str(COLLECTOR), str(self.target)],
            env=self.env, capture_output=True, text=True, timeout=20, check=False,
        )

    def test_allowlisted_commands_private_files_and_hashes(self):
        result = self.run_collector()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.target.stat().st_mode & 0o777, 0o700)
        files = list(self.target.iterdir())
        self.assertEqual(len(files), 5)
        for file in files:
            self.assertEqual(file.stat().st_mode & 0o777, 0o600)
        self.assertEqual(
            set(self.log.read_text().splitlines()),
            {"-rx " + command for command in COMMANDS},
        )
        check = subprocess.run(["sha256sum", "--check", "SHA256SUMS"],
                               cwd=self.target, capture_output=True, text=True)
        self.assertEqual(check.returncode, 0, check.stderr)

    def test_refuses_existing_directory_without_running_commands(self):
        self.target.mkdir()
        (self.target / "sentinel").write_text("keep")
        result = self.run_collector()
        self.assertEqual(result.returncode, 2)
        self.assertEqual((self.target / "sentinel").read_text(), "keep")
        self.assertFalse(self.log.exists())


if __name__ == "__main__":
    unittest.main()

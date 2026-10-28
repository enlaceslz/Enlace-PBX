#!/usr/bin/env python3
"""Preserve unmanaged .env keys without interpreting their contents."""
import os
import stat
import re
import sys
import tempfile
from pathlib import Path

KEY = re.compile(r"^([A-Za-z_][A-Za-z0-9_]*)=")


def merge(previous: str, generated: str) -> str:
    managed = {match.group(1) for line in generated.splitlines()
               if (match := KEY.match(line))}
    seen = set()
    preserved = []
    for line in previous.splitlines(keepends=True):
        match = KEY.match(line)
        if match and match.group(1) not in managed and match.group(1) not in seen:
            preserved.append(line if line.endswith("\n") else line + "\n")
            seen.add(match.group(1))
    if not preserved:
        return generated
    return (generated.rstrip("\n") + "\n\n"
            + "# Custom environment variables preserved from previous deployment\n"
            + "".join(preserved))


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: merge-env.py OLD_ENV GENERATED_ENV")
    old, new = map(Path, sys.argv[1:])
    if old.is_symlink() or new.is_symlink():
        raise ValueError("Refusing symlink environment files")
    if not stat.S_ISREG(old.stat().st_mode) or not stat.S_ISREG(new.stat().st_mode):
        raise ValueError("Environment inputs must be regular files")
    merged = merge(old.read_text(encoding="utf-8"), new.read_text(encoding="utf-8"))
    fd, temp = tempfile.mkstemp(prefix=".env.", dir=new.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(merged)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temp, 0o600)
        os.replace(temp, new)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Idempotent local AMI/ARI provisioning; preserves unrelated Asterisk sections."""
import os
import re
import shutil
import stat
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(os.environ.get("ASTERISK_CONFIG_DIR", "/etc/asterisk"))
HEADER = re.compile(r"(?m)^\s*\[([^\]\r\n]+)\]\s*$")

def require_secret(name: str) -> str:
    value = os.environ.get(name, "")
    if len(value) < 24 or not re.fullmatch(r"[A-Za-z0-9_-]+", value):
        raise ValueError(f"{name} must contain at least 24 safe characters")
    return value

def reconcile(path: Path, section: str, body: str) -> None:
    original = path.read_text(encoding="utf-8") if path.exists() else ""
    matches = list(HEADER.finditer(original))
    owned = [i for i, m in enumerate(matches) if m.group(1).strip().lower() == section.lower()]
    if len(owned) > 1:
        raise ValueError(f"{path}: duplicate [{section}] sections; manual reconciliation required")
    new_section = f"[{section}]\n{body.rstrip()}\n"
    if owned:
        idx = owned[0]
        begin = matches[idx].start()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(original)
        updated = original[:begin] + new_section + "\n" + original[end:]
    else:
        updated = original.rstrip() + ("\n\n" if original.strip() else "") + new_section
    if updated == original:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        backup = path.with_name(path.name + ".bak." + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ"))
        shutil.copy2(path, backup)
        os.chmod(backup, 0o600)
    fd, tmp = tempfile.mkstemp(prefix=f".{path.name}.", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as out:
            out.write(updated)
            out.flush()
            os.fsync(out.fileno())
        mode = stat.S_IMODE(path.stat().st_mode) if path.exists() else 0o640
        os.chmod(tmp, mode)
        if path.exists():
            st = path.stat()
            os.chown(tmp, st.st_uid, st.st_gid)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)

def main() -> None:
    ami = require_secret("ASTERISK_AMI_PASSWORD")
    ari = require_secret("ASTERISK_ARI_PASSWORD")
    ami_user = os.environ.get("ASTERISK_AMI_USER", "enlace_ami")
    ari_user = os.environ.get("ASTERISK_ARI_USER", "enlace_ari")
    for name in (ami_user, ari_user):
        if not re.fullmatch(r"[A-Za-z0-9_-]+", name):
            raise ValueError("Invalid Asterisk account name")
    reconcile(ROOT / "manager.conf", ami_user,
              "secret = " + ami + "\n"
              "deny = 0.0.0.0/0.0.0.0\n"
              "permit = 127.0.0.1/255.255.255.255\n"
              "read = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan,originate\n"
              "write = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan,originate")
    reconcile(ROOT / "ari.conf", ari_user,
              "type = user\nread_only = no\npassword = " + ari)
    print("AMI and ARI account sections reconciled successfully")

if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError) as exc:
        print(f"Asterisk configuration error: {exc}", file=sys.stderr)
        sys.exit(1)

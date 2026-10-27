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
HEADER = re.compile(r"(?m)^[ \t]*\[([^\]\r\n]+)\][ \t]*$")

def require_secret(name: str) -> str:
    value = os.environ.get(name, "")
    if len(value) < 24 or not re.fullmatch(r"[A-Za-z0-9_-]+", value):
        raise ValueError(f"{name} must contain at least 24 safe characters")
    return value

def reject_unsafe_config_path(path: Path) -> None:
    """Never read, back up or replace a symlink or non-regular config file."""
    if path.is_symlink():
        raise ValueError(f"{path}: symbolic links are not supported")
    if path.exists() and not path.is_file():
        raise ValueError(f"{path}: expected a regular configuration file")
    if path.parent.is_symlink():
        raise ValueError(f"{path.parent}: symbolic link configuration directory")
    if path.parent.resolve(strict=False) != path.parent.absolute():
        raise ValueError(f"{path.parent}: symbolic link in configuration directory ancestry")
    if path.parent.exists() and not path.parent.is_dir():
        raise ValueError(f"{path.parent}: expected a configuration directory")


def reconcile(path: Path, section: str, body: str) -> None:
    reject_unsafe_config_path(path)
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
        updated = original[:begin] + new_section + ("\n" if end < len(original) else "") + original[end:]
    else:
        updated = original.rstrip() + ("\n\n" if original.strip() else "") + new_section
    if updated == original:
        # Idempotence includes permissions: correct unsafe existing modes
        # without rewriting contents or creating a redundant backup.
        if path.exists():
            current_mode = stat.S_IMODE(path.stat().st_mode)
            safe_mode = current_mode & 0o640
            if safe_mode != current_mode:
                os.chmod(path, safe_mode)
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        backup = path.with_name(path.name + ".bak." + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ"))
        # Create the backup private from the first byte: copy2() can briefly
        # expose credentials when the source configuration is world-readable.
        with path.open("rb") as source, open(backup, "xb", opener=lambda p, flags: os.open(p, flags, 0o600)) as destination:
            shutil.copyfileobj(source, destination)
            destination.flush()
            os.fsync(destination.fileno())
    fd, tmp = tempfile.mkstemp(prefix=f".{path.name}.", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as out:
            out.write(updated)
            out.flush()
            os.fsync(out.fileno())
        # Credential-bearing managed files must never remain group/world writable or world readable.
        mode = (stat.S_IMODE(path.stat().st_mode) & 0o640) if path.exists() else 0o640
        os.chmod(tmp, mode)
        if path.exists():
            st = path.stat()
            os.chown(tmp, st.st_uid, st.st_gid)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)

def ensure_general(path: Path, options: dict[str, str]) -> None:
    """Set required general options while preserving unrelated keys and comments."""
    reject_unsafe_config_path(path)
    original = path.read_text(encoding="utf-8") if path.exists() else ""
    matches = list(HEADER.finditer(original))
    sections = [i for i, m in enumerate(matches) if m.group(1).strip().lower() == "general"]
    if len(sections) > 1:
        raise ValueError(f"{path}: duplicate [general] sections")
    body = ""
    if sections:
        idx = sections[0]
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(original)
        body = original[matches[idx].end():end].strip("\n")
    lines = body.splitlines() if body else []
    for key, value in options.items():
        pattern = re.compile(r"^\s*" + re.escape(key) + r"\s*=", re.IGNORECASE)
        indices = [i for i, line in enumerate(lines) if pattern.match(line)]
        if indices:
            lines[indices[0]] = f"{key} = {value}"
            for i in reversed(indices[1:]):
                del lines[i]
        else:
            lines.append(f"{key} = {value}")
    reconcile(path, "general", "\n".join(lines))

def main() -> None:
    ami = require_secret("ASTERISK_AMI_PASSWORD")
    ari = require_secret("ASTERISK_ARI_PASSWORD")
    ami_user = os.environ.get("ASTERISK_AMI_USER", "enlace_ami")
    ari_user = os.environ.get("ASTERISK_ARI_USER", "enlace_ari")
    if ami == ari or ami_user == ari_user:
        raise ValueError("AMI and ARI must use distinct users and passwords")
    for name in (ami_user, ari_user):
        if not re.fullmatch(r"[A-Za-z0-9_-]+", name):
            raise ValueError("Invalid Asterisk account name")
    # Preflight all managed files before writing any of them. This prevents
    # predictable partial updates caused by invalid paths or duplicate sections.
    for filename, owned_sections in (
        ("manager.conf", ("general", ami_user)),
        ("http.conf", ("general",)),
        ("ari.conf", ("general", ari_user)),
    ):
        path = ROOT / filename
        reject_unsafe_config_path(path)
        if path.exists():
            sections = [m.group(1).strip().lower() for m in HEADER.finditer(
                path.read_text(encoding="utf-8")
            )]
            for section in owned_sections:
                if sections.count(section.lower()) > 1:
                    raise ValueError(f"{path}: duplicate [{section}] sections")

    ensure_general(ROOT / "manager.conf", {"enabled": "yes", "port": "5038", "bindaddr": "127.0.0.1"})
    ensure_general(ROOT / "http.conf", {"enabled": "yes", "bindaddr": "127.0.0.1", "bindport": "8088"})
    ensure_general(ROOT / "ari.conf", {"enabled": "yes", "pretty": "yes", "allowed_origins": "http://127.0.0.1:3000"})
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

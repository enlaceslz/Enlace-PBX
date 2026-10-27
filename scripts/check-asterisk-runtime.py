#!/usr/bin/env python3
"""Read-only Asterisk lab preflight. Never reads configuration secrets."""
import re
import subprocess
import sys
import time


def run(*argv):
    try:
        result = subprocess.run(argv, capture_output=True, text=True, timeout=10, check=False)
        return result.returncode == 0, result.stdout.strip()
    except (OSError, subprocess.TimeoutExpired):
        return False, ""


def evaluate(active, properties, listeners, cli_ok):
    findings = []
    findings.append(("service-active", active))
    props = dict(re.findall(r"(?m)^(User|Group|MainPID|NRestarts)=(.*)$", properties))
    findings.append(("service-user", props.get("User") == "asterisk"))
    findings.append(("service-group", props.get("Group") == "asterisk"))
    findings.append(("service-pid", props.get("MainPID", "0").isdigit() and int(props.get("MainPID", "0")) > 0))
    findings.append(("asterisk-cli", cli_ok))
    for port in (5038, 8088):
        bound = []
        for line in listeners.splitlines():
            if not line.startswith("LISTEN"):
                continue
            parts = line.split()
            if len(parts) < 5:
                continue
            local = parts[3]
            if re.search(r":" + str(port) + r"$", local):
                bound.append(local)
        findings.append((f"tcp-{port}-loopback-only", bool(bound) and all(
            address.startswith("127.0.0.1:") for address in bound
        )))
    return findings


def snapshot():
    active, _ = run("systemctl", "is-active", "--quiet", "asterisk.service")
    _, properties = run("systemctl", "show", "asterisk.service",
                        "-p", "User", "-p", "Group", "-p", "MainPID", "-p", "NRestarts")
    return active, properties


def stable(before, after):
    first = dict(re.findall(r"(?m)^(MainPID|NRestarts)=(.*)$", before[1]))
    second = dict(re.findall(r"(?m)^(MainPID|NRestarts)=(.*)$", after[1]))
    return (before[0] and after[0]
            and first.get("MainPID", "0").isdigit()
            and int(first.get("MainPID", "0")) > 0
            and first.get("MainPID") == second.get("MainPID")
            and first.get("NRestarts") is not None
            and first.get("NRestarts") == second.get("NRestarts"))


def main():
    first = snapshot()
    active, properties = first
    ss_ok, listeners = run("ss", "-lnt")
    cli_ok, _ = run("asterisk", "-rx", "core show uptime")
    findings = evaluate(active, properties, listeners if ss_ok else "", cli_ok)
    print("INFO observing service stability for 60 seconds")
    time.sleep(60)
    findings.append(("service-stable-60s", stable(first, snapshot())))
    for name, passed in findings:
        print(f"{'PASS' if passed else 'FAIL'} {name}")
    print("NOTE: static runtime preflight only; SIP/RTP/AI and rollback require lab testing.")
    return 0 if all(passed for _, passed in findings) else 1


if __name__ == "__main__":
    sys.exit(main())

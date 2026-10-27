#!/usr/bin/env python3
"""Validate homologation evidence statuses without accepting implicit approval."""
import argparse
from pathlib import Path
import re
import sys

EXPECTED = [
    "INF-01", "INF-02", "DB-01", "DB-02", "DB-03", "PBX-01",
    "APP-01", "APP-02", "TEL-01 a TEL-10", "OPS-01", "OPS-02", "SEC-01",
]
VALID = {"APROVADO", "REPROVADO", "NÃO EXECUTADO"}


def validate(text):
    found = {}
    for line in text.splitlines():
        if not line.startswith("| "):
            continue
        cells = [part.strip() for part in line.strip().strip("|").split("|")]
        if len(cells) < 4 or cells[0] not in EXPECTED:
            continue
        identifier, status = cells[0], cells[2]
        if identifier in found:
            raise ValueError(f"ID duplicado: {identifier}")
        if status not in VALID:
            raise ValueError(f"Estado invalido para {identifier}: {status}")
        found[identifier] = status
    missing = sorted(set(EXPECTED) - set(found))
    if missing:
        raise ValueError("Itens ausentes: " + ", ".join(missing))
    if any(status != "APROVADO" for status in found.values()):
        return False
    # The status table alone cannot authorize production.
    return True


def main():
    parser = argparse.ArgumentParser(description="Audita estados do termo; nao autoriza producao.")
    parser.add_argument("document", type=Path)
    args = parser.parse_args()
    try:
        all_approved = validate(args.document.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, ValueError) as exc:
        print(f"ERRO: {exc}", file=sys.stderr)
        return 2
    if all_approved:
        print("ESTADOS APROVADOS; evidencias e autorizacao humana ainda obrigatorias.")
    else:
        print("NAO HOMOLOGADO: existem itens pendentes ou reprovados.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

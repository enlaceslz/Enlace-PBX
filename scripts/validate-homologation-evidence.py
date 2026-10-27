#!/usr/bin/env python3
"""Validate homologation evidence statuses without accepting implicit approval."""
import argparse
import datetime
import re
from pathlib import Path
import sys

EXPECTED = [
    "INF-01", "INF-02", "DB-01", "DB-02", "DB-03", "PBX-01",
    "APP-01", "APP-02", *(f"TEL-{n:02d}" for n in range(1, 11)),
    "OPS-01", "OPS-02", "SEC-01",
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
        identifier, status, evidence = cells[0], cells[2], cells[3]
        if identifier in found:
            raise ValueError(f"ID duplicado: {identifier}")
        if status not in VALID:
            raise ValueError(f"Estado invalido para {identifier}: {status}")
        if status == "APROVADO" and (
            not evidence or evidence.startswith("Log sanitizado,")
            or evidence.startswith("Resultado do ")
            or evidence.startswith("Relatório ")
            or evidence.startswith("Status e ")
            or evidence.startswith("Logs sanitizados")
            or evidence.startswith("Versão de ")
            or evidence.startswith("Inventário ")
            or evidence.startswith("Cenários ")
            or evidence.startswith("Casos de ")
            or evidence.startswith("Bloqueio de ")
            or evidence.startswith("Cronologia ")
        ):
            raise ValueError(f"Evidencia nao preenchida para {identifier}")
        found[identifier] = status
    evidence = {}
    pattern = re.compile(
        r"^EVIDENCIA: (\\S+) \\| artefato=([^|]+) \\| data=(\\d{4}-\\d{2}-\\d{2}) \\| responsavel=([^|]+)$"
    )
    for line in text.splitlines():
        if not line.startswith("EVIDENCIA: "):
            continue
        match = pattern.fullmatch(line.strip())
        if not match:
            raise ValueError("Registro EVIDENCIA malformado")
        identifier, artifact, date, owner = (item.strip() for item in match.groups())
        if identifier not in EXPECTED or identifier in evidence:
            raise ValueError(f"Evidencia duplicada ou ID desconhecido: {identifier}")
        if not artifact or artifact.startswith(("/", "http:", "https:")) or ".." in artifact.split("/") or any(ch.isspace() for ch in artifact):
            raise ValueError(f"Referencia de artefato invalida: {identifier}")
        if not owner or len(owner) > 80 or any(ch.isspace() for ch in owner):
            raise ValueError(f"Responsavel invalido: {identifier}")
        try:
            datetime.date.fromisoformat(date)
        except ValueError as exc:
            raise ValueError(f"Data invalida: {identifier}") from exc
        evidence[identifier] = (artifact, date, owner)
    for identifier, status in found.items():
        if status == "APROVADO" and identifier not in evidence:
            raise ValueError(f"Evidencia estruturada ausente: {identifier}")
        if status != "APROVADO" and identifier in evidence:
            raise ValueError(f"Evidencia sem aprovacao: {identifier}")
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

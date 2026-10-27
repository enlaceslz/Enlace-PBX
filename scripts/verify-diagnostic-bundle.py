#!/usr/bin/env python3
"""Validate diagnostic bundle structure and SHA-256 without trusting symlinks."""
import argparse
import hashlib
from pathlib import Path
import re
import sys

EXPECTED = {
    "RESUMO.txt", "preflight.txt",
    "rotas/rotas.txt", "rotas/isolamento.txt", "rotas/SHA256SUMS",
    "asterisk/asterisk-uptime.txt", "asterisk/asterisk-version.txt",
    "asterisk/asterisk-modules.txt", "asterisk/asterisk-channels-count.txt",
    "asterisk/SHA256SUMS",
}
HASH_LINE = re.compile(r"^([a-f0-9]{64})  (.+)$")


def validate(directory: Path):
    if not directory.is_dir() or directory.is_symlink():
        raise ValueError("Diretorio ausente ou simbolico")
    manifest = directory / "SHA256SUMS"
    if not manifest.is_file() or manifest.is_symlink():
        raise ValueError("Manifesto ausente ou simbolico")
    lines = manifest.read_text(encoding="utf-8").splitlines()
    listed = {}
    for line in lines:
        match = HASH_LINE.fullmatch(line)
        if not match:
            raise ValueError("Linha de hash invalida")
        digest, name = match.groups()
        if name.startswith("./"):
            name = name[2:]
        if name not in EXPECTED or name in listed:
            raise ValueError("Arquivo inesperado ou duplicado")
        listed[name] = digest
    if set(listed) != EXPECTED:
        raise ValueError("Arquivos obrigatorios ausentes")
    observed = set()
    for path in directory.rglob("*"):
        name = path.relative_to(directory).as_posix()
        if path.is_symlink():
            raise ValueError("Link simbolico rejeitado")
        if path.is_file():
            observed.add(name)
        elif not path.is_dir():
            raise ValueError("Tipo de arquivo nao suportado")
    if observed != EXPECTED | {"SHA256SUMS"}:
        raise ValueError("Arquivos extras ou ausentes no pacote")
    for name, expected_digest in listed.items():
        path = directory / name
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != expected_digest:
            raise ValueError("Hash divergente: " + name)
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    try:
        validate(args.directory)
    except (ValueError, OSError) as exc:
        print("PACOTE INVALIDO: " + str(exc), file=sys.stderr)
        return 2
    print("PACOTE INTEGRO: estrutura e hashes conferidos; homologacao pendente.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

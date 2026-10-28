#!/usr/bin/env python3
"""Validate PostgreSQL restore target URI without connecting to the database."""
import sys
from urllib.parse import unquote, urlsplit


def validate_target(raw):
    try:
        url = urlsplit(raw)
        name = unquote(url.path.lstrip("/"))
        if url.scheme not in ("postgres", "postgresql") or not url.hostname or not name or "/" in name or url.query or url.fragment:
            raise ValueError("URL invalida")
        if not (name.endswith("_restore_test") or name.endswith("_homologacao")):
            raise ValueError("O nome do banco deve terminar em _restore_test ou _homologacao")
        if url.hostname not in ("127.0.0.1", "localhost", "::1"):
            raise ValueError("Restauracao permitida apenas para PostgreSQL local (loopback)")
        username = unquote(url.username or "")
        if not username or username in ("postgres", "enlace_app") or "/" in username or chr(0) in username:
            raise ValueError("Use uma conta exclusiva de homologacao, nunca postgres ou enlace_app")
        if not url.password:
            raise ValueError("Senha explicita de homologacao obrigatoria")
        if url.port is not None and not (1 <= url.port <= 65535):
            raise ValueError("Porta invalida")
        return name
    except (ValueError, TypeError) as error:
        raise ValueError(str(error)) from error


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: validate-restore-target.py --stdin | URL", file=sys.stderr)
        sys.exit(2)
    try:
        if sys.argv[1] != "--stdin":
            raise ValueError("Use --stdin para impedir exposicao de credenciais nos argumentos")
        raw = sys.stdin.read()
        print(validate_target(raw))
    except ValueError as error:
        print(f"ERRO: {error}", file=sys.stderr)
        sys.exit(1)

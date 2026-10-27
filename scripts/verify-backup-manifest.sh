#!/usr/bin/env bash
# Verify a coordinated backup manifest without restoring or modifying any data.
set -Eeuo pipefail
if [ "$#" -ne 1 ]; then
  echo "Uso: $0 /var/backups/enlace-pbx/enlace-pbx-backup-YYYYMMDDTHHMMSSZ.manifest" >&2
  exit 2
fi
manifest="$1"
[ -f "$manifest" ] && [ ! -L "$manifest" ] || { echo "ERRO: manifesto invalido." >&2; exit 1; }
command -v sha256sum >/dev/null || { echo "ERRO: sha256sum ausente." >&2; exit 1; }
command -v python3 >/dev/null || { echo "ERRO: python3 ausente." >&2; exit 1; }

# Reject absolute paths, traversal, unexpected file counts and malformed digests.
python3 - "$manifest" <<'PY'
from pathlib import Path
import re
import sys

manifest = Path(sys.argv[1])
try:
    lines = manifest.read_text(encoding='ascii').splitlines()
    if len(lines) != 2:
        raise ValueError('manifesto deve conter exatamente dois arquivos')
    names = []
    for line in lines:
        match = re.fullmatch(r'([0-9a-f]{64})  (enlace-pbx-(?:postgres-[0-9TZ]+\.dump|files-[0-9TZ]+\.tar\.gz))', line)
        if not match:
            raise ValueError('linha invalida ou caminho nao permitido')
        names.append(match.group(2))
    if sum(n.startswith('enlace-pbx-postgres-') for n in names) != 1:
        raise ValueError('backup PostgreSQL ausente ou duplicado')
    if sum(n.startswith('enlace-pbx-files-') for n in names) != 1:
        raise ValueError('backup de arquivos ausente ou duplicado')
except (OSError, UnicodeError, ValueError) as error:
    print('ERRO: ' + str(error), file=sys.stderr)
    sys.exit(1)
PY

( cd -- "$(dirname -- "$manifest")" && sha256sum --check --status -- "$(basename -- "$manifest")" ) || {
  echo "ERRO: checksum do conjunto de backup divergente." >&2
  exit 1
}
echo "SUCESSO: hashes dos dois arquivos conferem com o manifesto."
echo "ATENCAO: integridade SHA-256 nao comprova autenticidade nem restaurabilidade."

#!/usr/bin/env bash
# Safe extraction of Enlace-PBX filesystem backup into a staging directory.
# Never writes directly to /etc, /var/lib or /var/spool.
set -Eeuo pipefail
umask 077

if [ "$#" -ne 2 ]; then
  echo "Uso: $0 /caminho/backup.tar.gz /diretorio/staging-vazio" >&2
  exit 2
fi
archive="$1"
destination="$2"
[ -f "$archive" ] && [ ! -L "$archive" ] || { echo "ERRO: backup invalido." >&2; exit 1; }
[ -f "$archive.sha256" ] && [ ! -L "$archive.sha256" ] || { echo "ERRO: checksum SHA-256 obrigatorio e ausente." >&2; exit 1; }
# Verify the checksum in the archive directory, not from an arbitrary working directory.
( cd -- "$(dirname -- "$archive")" && sha256sum --check --status -- "$(basename -- "$archive").sha256" ) || {
  echo "ERRO: checksum SHA-256 divergente." >&2
  exit 1
}
[ -d "$destination" ] && [ ! -L "$destination" ] || { echo "ERRO: staging deve existir e nao ser link simbolico." >&2; exit 1; }
[ -z "$(ls -A -- "$destination")" ] || { echo "ERRO: staging nao esta vazio." >&2; exit 1; }

# Prevent traversal, absolute paths, links and unexpected top-level entries.
python3 - "$archive" <<'PY'
import sys
import tarfile
from pathlib import PurePosixPath

allowed = (
    'etc/asterisk',
    'var/spool/asterisk/recording',
    'var/lib/enlace-pbx',
)
try:
    with tarfile.open(sys.argv[1], 'r:gz') as archive:
        members = archive.getmembers()
        if not members:
            raise ValueError('arquivo vazio')
        seen_paths = set()
        for item in members:
            raw = item.name
            path = PurePosixPath(raw)
            if raw.startswith('/') or '..' in path.parts or '\\' in raw:
                raise ValueError('caminho inseguro')
            if not (item.isfile() or item.isdir()):
                raise ValueError('links e arquivos especiais proibidos')
            normalized = str(path)
            if normalized in seen_paths:
                raise ValueError('entrada duplicada no arquivo: ' + normalized)
            seen_paths.add(normalized)
            if not any(normalized == root or normalized.startswith(root + '/') for root in allowed):
                raise ValueError('caminho fora da lista permitida: ' + normalized)
        print('Arquivo validado: %d entradas.' % len(members))
except (tarfile.TarError, OSError, ValueError) as error:
    print('ERRO: backup inseguro ou invalido: ' + str(error), file=sys.stderr)
    sys.exit(1)
PY

tar -xzf "$archive" -C "$destination" --no-same-owner --no-same-permissions
echo "Arquivos extraidos em staging: $destination"
echo "Revise o conteudo antes de qualquer restauracao manual. Nenhum servico foi alterado."

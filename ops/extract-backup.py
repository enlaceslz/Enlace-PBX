"""Extração restrita para diretório privado: não admite links ou caminhos externos."""
import pathlib
import shutil
import sys
import tarfile

root = pathlib.Path(sys.argv[2]).resolve()
allowed = {'database.dump', 'manifest.json', 'configuration', 'asterisk', 'recordings'}
with tarfile.open(sys.argv[1], 'r:') as archive:
    members = archive.getmembers()
    for member in members:
        name = pathlib.PurePosixPath(member.name)
        if name.is_absolute() or '..' in name.parts or not name.parts or name.parts[0] not in allowed:
            raise ValueError('Caminho inválido no backup')
        if not member.isfile() and not member.isdir():
            raise ValueError('Links e tipos especiais não são permitidos')
    for member in members:
        target = root.joinpath(*pathlib.PurePosixPath(member.name).parts)
        if member.isdir():
            target.mkdir(parents=True, exist_ok=True, mode=0o700)
        else:
            target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            with archive.extractfile(member) as source, target.open('xb') as destination:
                shutil.copyfileobj(source, destination, length=1024 * 1024)

"""Verifica a posse e os vínculos do checkout antes de copiá-lo para provisionamento."""
import os
import stat
import sys

EXCLUDED = {'.git', 'node_modules', 'dist'}

def verify_tree(source, trusted_uid=0, check_ancestors=True):
    source = os.path.abspath(source)
    if not stat.S_ISDIR(os.lstat(source).st_mode):
        raise ValueError('Checkout deve ser diretório real.')
    def check(name):
        info = os.lstat(name)
        if stat.S_ISLNK(info.st_mode) or info.st_uid != trusted_uid or info.st_mode & 0o022:
            raise ValueError('Checkout deve ter proprietário confiável, sem links ou escrita de grupo/outros.')
        if not (stat.S_ISDIR(info.st_mode) or stat.S_ISREG(info.st_mode)):
            raise ValueError('Tipo de arquivo inesperado no checkout.')
        if stat.S_ISREG(info.st_mode) and info.st_nlink != 1:
            raise ValueError('Arquivo vinculado exige revisão independente.')
    current = source
    while True:
        check(current)
        if not check_ancestors or current == '/':
            break
        current = os.path.dirname(current)
    for directory, children, files in os.walk(source, followlinks=False):
        children[:] = [name for name in children if name not in EXCLUDED]
        for name in children + files:
            check(os.path.join(directory, name))

if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Informe o checkout revisado.')
    try:
        verify_tree(sys.argv[1])
    except (OSError, ValueError):
        raise SystemExit('Checkout não confiável para provisionamento. Revise uma cópia independente root-owned antes de repetir.')

"""Verifica a posse e os vínculos do checkout antes de copiá-lo para provisionamento."""
import os
import re
import stat
import sys

EXCLUDED = {'.git', 'node_modules', 'dist'}

def verify_installation(root='/', trusted_uid=0, check_ancestors=True):
    """Confere destinos existentes sem criar, corrigir permissões ou ler segredos."""
    root = os.path.abspath(root)

    def protected(info, directory=False, link=False):
        if info.st_uid != trusted_uid:
            raise ValueError('Proprietário inesperado.')
        if link:
            if not stat.S_ISLNK(info.st_mode) or info.st_nlink != 1:
                raise ValueError('Vínculo inesperado.')
        elif directory:
            if not stat.S_ISDIR(info.st_mode) or info.st_mode & 0o022:
                raise ValueError('Diretório desprotegido.')
        elif not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_mode & 0o022 or info.st_size == 0:
            raise ValueError('Arquivo desprotegido, vazio ou vinculado.')

    current = root
    while True:
        protected(os.lstat(current), directory=True)
        if not check_ancestors or current == '/':
            break
        current = os.path.dirname(current)

    def location(relative):
        return os.path.join(root, relative.lstrip('/'))

    def directory(relative, required=False):
        current = root
        for component in relative.strip('/').split('/'):
            if component in ('', '.', '..'):
                raise ValueError('Destino inesperado.')
            current = os.path.join(current, component)
            try:
                info = os.lstat(current)
            except FileNotFoundError:
                if required:
                    raise ValueError('Diretório obrigatório ausente.')
                return False
            protected(info, directory=True)
        return True

    def entry(relative):
        try:
            return os.lstat(location(relative))
        except FileNotFoundError:
            return None

    for name in ['/opt/enlace-pbx', '/opt/enlace-pbx/releases', '/opt/enlace-pbx/provisioning',
                 '/etc/enlace-pbx', '/var/backups/enlace-pbx', '/etc/systemd/system',
                 '/etc/nginx/sites-available', '/etc/nginx/sites-enabled', '/var/lib', '/var/log']:
        directory(name)
    if entry('/opt/enlace-pbx/.activation.lock') is not None:
        raise ValueError('Recuperação pendente exige revisão manual.')

    current = entry('/opt/enlace-pbx/current')
    unit = entry('/etc/systemd/system/enlace-pbx.service')
    if (current is None) != (unit is None):
        raise ValueError('Instalação anterior incompleta.')
    if unit is not None:
        protected(unit)
    if current is not None:
        protected(current, link=True)
        target = os.readlink(location('/opt/enlace-pbx/current'))
        if not re.fullmatch(r'(?:/opt/enlace-pbx/)?releases/[-a-zA-Z0-9_]{1,80}', target):
            raise ValueError('Release anterior fora do padrão.')
        release = '/opt/enlace-pbx/releases/' + target.rsplit('/', 1)[1]
        directory(release + '/dist', required=True)
        binary = entry(release + '/dist/server.cjs')
        if binary is None:
            raise ValueError('Backend anterior ausente.')
        protected(binary)

    for name in ['runtime.json', 'backup.key']:
        value = entry('/etc/enlace-pbx/' + name)
        if current is not None and value is None:
            raise ValueError('Configuração ou chave anterior ausente; não será regenerada.')
        if value is not None:
            protected(value)
            if name == 'backup.key' and stat.S_IMODE(value.st_mode) not in (0o400, 0o600):
                raise ValueError('Chave de backup deve ser privada do proprietário confiável.')

    proxy = entry('/etc/nginx/sites-available/enlace-pbx')
    enabled = entry('/etc/nginx/sites-enabled/enlace-pbx')
    if proxy is not None:
        protected(proxy)
    if enabled is not None:
        if stat.S_ISLNK(enabled.st_mode):
            protected(enabled, link=True)
            target = os.readlink(location('/etc/nginx/sites-enabled/enlace-pbx'))
            if target not in ('/etc/nginx/sites-available/enlace-pbx', '../sites-available/enlace-pbx') or proxy is None:
                raise ValueError('Vínculo de proxy inesperado.')
        else:
            protected(enabled)
    if current is None and (proxy is not None or enabled is not None):
        raise ValueError('Proxy existente sem instalação rastreada exige revisão.')
    return 'UPDATE' if current is not None else 'INITIAL'

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
        if sys.argv[1] == '--installation':
            print(verify_installation())
        else:
            verify_tree(sys.argv[1])
    except (OSError, ValueError):
        raise SystemExit('Checkout ou instalação não confiável/incompleta. Revise posse, vínculos, configuração, chaves e recuperação pendente antes de repetir.')

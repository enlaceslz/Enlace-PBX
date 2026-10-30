"""Verifica a posse e os vínculos do checkout antes de copiá-lo para provisionamento."""
import os
import pwd
import grp
import re
import stat
import sys

EXCLUDED = {'.git', 'node_modules', 'dist'}

def verify_service_identity(identity, required=False):
    """Valida conta dedicada sem alterar usuários, grupos ou credenciais do host."""
    uid, gid = identity.get('uid'), identity.get('gid')
    asterisk_gid = identity.get('asterisk_gid')
    if asterisk_gid is not None and (type(asterisk_gid) is not int or asterisk_gid <= 0 or asterisk_gid == gid):
        raise ValueError('Grupo Asterisk privilegiado ou compartilhado exige revisão.')
    if uid is None and gid is None and not required:
        return None
    if type(gid) is not int or gid <= 0 or identity.get('gid_shared'):
        raise ValueError('Grupo de serviço ausente, privilegiado ou compartilhado.')
    if uid is None and not required:
        return None
    if type(uid) is not int or uid <= 0 or identity.get('uid_shared') or identity.get('primary_gid') != gid:
        raise ValueError('Usuário de serviço ausente, privilegiado ou compartilhado.')
    if identity.get('home') != '/var/lib/enlace-pbx' or identity.get('shell') not in ('/usr/sbin/nologin', '/sbin/nologin', '/bin/false', '/usr/bin/false'):
        raise ValueError('Home ou shell da conta de serviço exige manutenção.')
    allowed = {gid}
    if type(asterisk_gid) is int and asterisk_gid > 0:
        allowed.add(asterisk_gid)
    membership = identity.get('groups', [])
    if not isinstance(membership, (list, tuple)) or any(type(item) is not int for item in membership) or gid not in membership or set(membership) - allowed:
        raise ValueError('Grupos suplementares da conta de serviço exigem revisão.')
    return identity

def service_access_identity(required=False):
    try:
        user = pwd.getpwnam('enlace-pbx')
    except KeyError:
        user = None
    try:
        group = grp.getgrnam('enlace-pbx')
    except KeyError:
        group = None
    groups = grp.getgrall()
    users = pwd.getpwall() if user else []
    asterisk = next((item for item in groups if item.gr_name == 'asterisk'), None)
    # Um alias de grupo privilegiado não passa a ser permitido apenas por mudar de nome.
    if asterisk and (asterisk.gr_gid <= 0 or sum(item.gr_gid == asterisk.gr_gid for item in groups) != 1 or sum(item.gr_name == 'asterisk' for item in groups) != 1):
        raise ValueError('Grupo Asterisk privilegiado ou compartilhado exige revisão antes de associar o serviço.')
    asterisk_gid = asterisk.gr_gid if asterisk else None
    identity = {
        'uid': user.pw_uid if user else None,
        'gid': group.gr_gid if group else None,
        'primary_gid': user.pw_gid if user else None,
        'home': user.pw_dir if user else None,
        'shell': user.pw_shell if user else None,
        'groups': os.getgrouplist('enlace-pbx', user.pw_gid) if user else [],
        'asterisk_gid': asterisk_gid,
        'uid_shared': bool(user and (sum(item.pw_uid == user.pw_uid for item in users) != 1 or sum(item.pw_name == 'enlace-pbx' for item in users) != 1)),
        'gid_shared': bool(group and (sum(item.gr_gid == group.gr_gid for item in groups) != 1 or sum(item.gr_name == 'enlace-pbx' for item in groups) != 1)),
    }
    return verify_service_identity(identity, required)

def verify_installation(root='/', trusted_uid=0, check_ancestors=True, identity_provider=None):
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
    release = None
    binary = None
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

    runtime = entry('/etc/enlace-pbx/runtime.json')
    # O provedor padrão resolve e valida NSS; a injeção existe para fixtures isoladas.
    identity = (identity_provider or service_access_identity)(current is not None or runtime is not None)
    for name in ['runtime.json', 'backup.key']:
        value = entry('/etc/enlace-pbx/' + name)
        if current is not None and value is None:
            raise ValueError('Configuração ou chave anterior ausente; não será regenerada.')
        if value is not None:
            protected(value)
            if name == 'backup.key' and stat.S_IMODE(value.st_mode) not in (0o400, 0o600):
                raise ValueError('Chave de backup deve ser privada do proprietário confiável.')

    def accessible(info, permission):
        if info.st_uid == identity['uid']:
            bits = (info.st_mode >> 6) & 7
        elif info.st_gid in set(identity['groups']) | {identity['gid']}:
            bits = (info.st_mode >> 3) & 7
        else:
            bits = info.st_mode & 7
        return bool(bits & permission)

    def traversable(relative):
        current_path = root
        if check_ancestors and not accessible(os.lstat(current_path), 1):
            raise ValueError('Raiz sem acesso de travessia para o serviço.')
        for component in relative.strip('/').split('/'):
            current_path = os.path.join(current_path, component)
            if not accessible(os.lstat(current_path), 1):
                raise ValueError('Diretório sem acesso de travessia para o serviço.')

    if runtime is not None:
        configuration_directory = entry('/etc/enlace-pbx')
        if identity is None or runtime.st_gid != identity['gid'] or stat.S_IMODE(runtime.st_mode) != 0o640 or configuration_directory.st_gid != identity['gid'] or stat.S_IMODE(configuration_directory.st_mode) != 0o750:
            raise ValueError('Runtime exige root:enlace-pbx 0640 e diretório root:enlace-pbx 0750.')
        traversable('/etc/enlace-pbx')
    if release is not None:
        if identity is None or not accessible(binary, 4):
            raise ValueError('Backend anterior não pode ser lido pelo serviço.')
        traversable(release + '/dist')

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

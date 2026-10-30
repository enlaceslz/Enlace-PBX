#!/usr/bin/env bash
# Instalação e atualização do Enlace-PBX com processo sem privilégios de root.
set -euo pipefail
umask 077
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
unset NODE_OPTIONS NODE_PATH BASH_ENV ENV PYTHONPATH PYTHONHOME PYTHONSTARTUP

[[ $EUID -eq 0 ]] || { echo 'Execute como root para provisionar o serviço.' >&2; exit 1; }
ASTERISK_UPDATE=0
MANAGED_OPTIONS=()
command -v flock >/dev/null || { echo 'flock obrigatório para serializar deploys.' >&2; exit 1; }
[[ ! -L /run && $(stat -c %u /run) == 0 ]] || { echo 'Diretório de trava inválido.' >&2; exit 1; }
run_mode=$(stat -c %a /run)
(( (8#$run_mode & 8#022) == 0 )) || { echo 'Diretório de trava gravável por terceiros.' >&2; exit 1; }
DEPLOY_LOCK=/run/enlace-pbx-deploy.lock
if [[ -e "$DEPLOY_LOCK" || -L "$DEPLOY_LOCK" ]]; then
  [[ ! -L "$DEPLOY_LOCK" && -f "$DEPLOY_LOCK" && $(stat -c %u "$DEPLOY_LOCK") == 0 && $(stat -c %h "$DEPLOY_LOCK") == 1 ]] || { echo 'Trava de deploy inválida.' >&2; exit 1; }
fi
exec 9>>"$DEPLOY_LOCK"
flock -n 9 || { echo 'Outro deploy está em andamento.' >&2; exit 1; }
SOURCE_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
NODE_BIN=$(command -v node) || { echo 'Instale Node.js 22 ou 24 antes de continuar.' >&2; exit 1; }
[[ "$NODE_BIN" =~ ^/[a-zA-Z0-9_./-]+$ ]] || { echo 'Caminho do Node inválido.' >&2; exit 1; }
NODE_BIN=$(readlink -f -- "$NODE_BIN")
NPM_BIN=$(command -v npm) || { echo 'npm obrigatório.' >&2; exit 1; }
NPM_BIN=$(readlink -f -- "$NPM_BIN")
for tool_path in "$NODE_BIN" "$NPM_BIN"; do
  while [[ "$tool_path" != / ]]; do
    tool_uid=$(stat -c %u -- "$tool_path")
    tool_mode=$(stat -c %a -- "$tool_path")
    [[ "$tool_uid" == 0 ]] && (( (8#$tool_mode & 8#022) == 0 )) || { echo 'Node/npm e ancestrais precisam de posse root e proteção contra escrita.' >&2; exit 1; }
    tool_path=$(dirname -- "$tool_path")
  done
done
NODE_MAJOR=$("$NODE_BIN" -p 'process.versions.node.split(".")[0]')
[[ "$NODE_MAJOR" == 22 || "$NODE_MAJOR" == 24 ]] || { echo 'Este instalador exige Node.js 22 ou 24.' >&2; exit 1; }
command -v systemctl >/dev/null || { echo 'Host com systemd obrigatório.' >&2; exit 1; }

command -v python3 >/dev/null || { echo 'Instale python3 antes de iniciar o deploy; a pré-checagem não instala pacotes.' >&2; exit 1; }
# O checkout revisado é a raiz de confiança, não a árvore gravável do build.
python3 -I - "$SOURCE_DIR" <<'PYTRUST'
import os,stat,sys
source=os.path.abspath(sys.argv[1])
def check(name):
    info=os.lstat(name)
    if stat.S_ISLNK(info.st_mode) or info.st_uid!=0 or info.st_mode&0o022:
        raise SystemExit('Bootstrap deve pertencer ao root e recusar links/escrita de grupo/outros.')
    if stat.S_ISREG(info.st_mode) and info.st_nlink!=1:
        raise SystemExit('Bootstrap vinculado exige revisão independente.')
current=source
while True:
    check(current)
    if current=='/': break
    current=os.path.dirname(current)
check(os.path.join(source,'scripts'))
check(os.path.join(source,'scripts','trusted-source.py'))
for target in ['/opt','/opt/enlace-pbx','/opt/enlace-pbx/releases','/opt/enlace-pbx/provisioning']:
    if os.path.lexists(target): check(target)
PYTRUST
python3 -I "$SOURCE_DIR/scripts/trusted-source.py" "$SOURCE_DIR"
DEPLOY_MODE=$(python3 -I "$SOURCE_DIR/scripts/trusted-source.py" --installation)
[[ "$DEPLOY_MODE" == INITIAL || "$DEPLOY_MODE" == UPDATE ]] || { echo 'Modo de deploy não reconhecido.' >&2; exit 1; }
if [[ "$DEPLOY_MODE" == UPDATE ]]; then
  ASTERISK_UPDATE=1
  MANAGED_OPTIONS=(--verify)
  [[ "${INSTALL_ASTERISK:-0}" != 1 ]] || { echo 'Atualização de Asterisk exige manutenção separada; INSTALL_ASTERISK=1 não pode acompanhar uma atualização de código.' >&2; exit 1; }
fi

# Migração PM2 exige procedimento próprio; o deploy não apaga o estado legado.
if command -v pm2 >/dev/null && pm2 pid enlace-pbx 2>/dev/null | grep -Eq '[1-9][0-9]*'; then
  echo 'Instância PM2 ativa: migre em procedimento separado antes de usar este deploy.' >&2; exit 1
fi
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y --no-install-recommends nginx curl ca-certificates rsync build-essential postgresql-client postgresql openssl
getent group enlace-pbx >/dev/null || groupadd --system enlace-pbx
id enlace-pbx >/dev/null 2>&1 || useradd --system --gid enlace-pbx --home-dir /var/lib/enlace-pbx --shell /usr/sbin/nologin enlace-pbx
install -d -m 0755 -o root -g root /opt/enlace-pbx /opt/enlace-pbx/releases
install -d -m 0750 -o root -g enlace-pbx /etc/enlace-pbx
install -d -m 2750 -o root -g enlace-pbx /var/backups/enlace-pbx
for data_path in /var/lib/enlace-pbx /var/log/enlace-pbx; do
  if [[ -L "$data_path" || ( -e "$data_path" && ! -d "$data_path" ) ]]; then echo "Diretório de dados inválido." >&2; exit 1; fi
done
install -d -m 0750 -o enlace-pbx -g enlace-pbx /var/lib/enlace-pbx /var/log/enlace-pbx


# O Asterisk lê somente o diretório gerenciado, sem acesso à configuração secreta do serviço.
if getent group asterisk >/dev/null; then
  usermod -aG asterisk enlace-pbx
  chmod 0751 /var/lib/enlace-pbx

fi

# Cópia privilegiada independente, criada antes de executar qualquer build como serviço.
PROVISIONING="/opt/enlace-pbx/provisioning/$(date -u +%Y%m%dT%H%M%S)-$(openssl rand -hex 4)"
install -d -m 0750 -o root -g postgres /opt/enlace-pbx/provisioning "$PROVISIONING"
rsync -a --exclude=.git --exclude=node_modules --exclude=dist --exclude='.env*' "$SOURCE_DIR/" "$PROVISIONING/"
chown root:postgres "$PROVISIONING"
chmod 0750 "$PROVISIONING"
python3 -I "$SOURCE_DIR/scripts/trusted-source.py" "$PROVISIONING"
# Dependências administrativas vêm do lockfile revisado; nenhum lifecycle de pacote roda como root.
(cd "$PROVISIONING" && env -i PATH="$PATH" HOME=/root NODE_ENV=production "$NODE_BIN" "$NPM_BIN" ci --ignore-scripts --include=dev --no-audit --no-fund)
"$NODE_BIN" "$PROVISIONING/scripts/prepare-managed-asterisk.mjs" "${MANAGED_OPTIONS[@]}"

# A instalação anterior continua atendendo enquanto a nova versão é compilada.
RELEASE="/opt/enlace-pbx/releases/$(date -u +%Y%m%dT%H%M%S)-$(openssl rand -hex 4)"
install -d -m 0755 -o enlace-pbx -g enlace-pbx "$RELEASE"
rsync -a --exclude=.git --exclude=node_modules --exclude=dist --exclude='.env*' "$SOURCE_DIR/" "$RELEASE/"
chown -R enlace-pbx:enlace-pbx "$RELEASE"
cd "$RELEASE"
# Dependências e scripts de build nunca são executados como root.
runuser -u enlace-pbx -- env -i PATH="$(dirname "$NODE_BIN"):/usr/bin:/bin" NODE_ENV=test npm ci --no-fund
runuser -u enlace-pbx -- env -i PATH="$(dirname "$NODE_BIN"):/usr/bin:/bin" NODE_ENV=test npm run lint
runuser -u enlace-pbx -- env -i PATH="$(dirname "$NODE_BIN"):/usr/bin:/bin" NODE_ENV=test npm run test:security
runuser -u enlace-pbx -- env -i PATH="$(dirname "$NODE_BIN"):/usr/bin:/bin" NODE_ENV=test npm run build
# O usuário de serviço pode ler o programa, mas não modificá-lo.
chown -R root:root "$RELEASE"
chmod -R a+rX,u+w,go-w "$RELEASE"

BOOTSTRAP=$(mktemp /run/enlace-pbx-bootstrap.XXXXXX)
trap 'rm -f -- "$BOOTSTRAP"' EXIT
if [[ "$DEPLOY_MODE" == INITIAL && ! -f "$SOURCE_DIR/.env" ]]; then
  if [[ ! -f /etc/enlace-pbx/runtime.json && -z "${PBX_DOMAIN:-}" ]]; then read -r -p 'Domínio HTTPS do PBX: ' PBX_DOMAIN; fi
  if [[ -z "${ADMIN_INITIAL_EMAIL:-}" ]]; then read -r -p 'E-mail do primeiro administrador: ' ADMIN_INITIAL_EMAIL; fi
  if [[ -z "${ADMIN_INITIAL_PASSWORD:-}" ]]; then read -r -s -p 'Senha do primeiro administrador (mínimo 12 caracteres): ' ADMIN_INITIAL_PASSWORD; echo; fi
  export PBX_DOMAIN ADMIN_INITIAL_EMAIL ADMIN_INITIAL_PASSWORD
fi
export PBX_LEGACY_ENV="$SOURCE_DIR/.env"
"$NODE_BIN" "$PROVISIONING/scripts/configure-production.mjs" /etc/enlace-pbx/runtime.json "$BOOTSTRAP" --preserve-existing
chown root:enlace-pbx /etc/enlace-pbx/runtime.json
DOMAIN=$("$NODE_BIN" -p "JSON.parse(require('fs').readFileSync('/etc/enlace-pbx/runtime.json','utf8')).PBX_DOMAIN")
# TLS é pré-requisito; o instalador não aceita contratos ACME nem anuncia HTTPS sem certificado.
[[ -s "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" && -s "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]] || {
  echo "Provisione o certificado de $DOMAIN e repita o deploy. O serviço anterior não foi substituído." >&2; exit 1;
}
if [[ "${INSTALL_ASTERISK:-0}" == 1 ]]; then
  PBX_CONFIG_FILE=/etc/enlace-pbx/runtime.json bash "$PROVISIONING/install-enlace-pbx.sh"
fi
if getent passwd asterisk >/dev/null && [[ -d /etc/asterisk ]]; then
  usermod -aG asterisk enlace-pbx
  chmod 0751 /var/lib/enlace-pbx
  "$NODE_BIN" "$PROVISIONING/scripts/prepare-managed-asterisk.mjs" "${MANAGED_OPTIONS[@]}"
  if [[ "$ASTERISK_UPDATE" == 1 ]]; then
    PBX_CONFIG_FILE=/etc/enlace-pbx/runtime.json "$NODE_BIN" "$PROVISIONING/scripts/asterisk-settings.mjs" --verify
  else
    PBX_CONFIG_FILE=/etc/enlace-pbx/runtime.json "$NODE_BIN" "$PROVISIONING/scripts/asterisk-settings.mjs"
    asterisk -rx "manager reload"
  fi
fi
LOCAL_DATABASE=$("$NODE_BIN" -p "const c=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); const u=new URL(c.DATABASE_URL); ['127.0.0.1','localhost'].includes(u.hostname) && !process.env.DATABASE_MIGRATION_URL" "$BOOTSTRAP")
if [[ "$LOCAL_DATABASE" == true ]]; then
  chown postgres:postgres "$BOOTSTRAP"
  runuser -u postgres -- env -i PATH="$PATH" PBX_CONFIG_FILE="$BOOTSTRAP" "$NODE_BIN" "$PROVISIONING/scripts/provision-database.mjs"
  (cd "$PROVISIONING" && runuser -u postgres -- env -i PATH="$PATH" PBX_CONFIG_FILE="$BOOTSTRAP" "$NODE_BIN" --import tsx scripts/migrate.ts)
else
  [[ -n "${DATABASE_MIGRATION_URL:-}" ]] || { echo 'Defina DATABASE_MIGRATION_URL para migrar o PostgreSQL externo.' >&2; exit 1; }
  (cd "$PROVISIONING" && env -i PATH="$PATH" PBX_CONFIG_FILE="$BOOTSTRAP" "$NODE_BIN" --import tsx scripts/migrate.ts)
fi
rm -f -- "$BOOTSTRAP"
unset DATABASE_MIGRATION_URL ADMIN_INITIAL_PASSWORD

# Backup usa chave independente. Ela deve ser guardada fora do servidor e dos arquivos de backup.
if [[ ! -f /etc/enlace-pbx/backup.key ]]; then
  openssl rand -hex 32 > /etc/enlace-pbx/backup.key
  chmod 0400 /etc/enlace-pbx/backup.key
fi

NGINX_CANDIDATE=$(mktemp "$PROVISIONING/nginx-candidate.XXXXXX")
cat > "$NGINX_CANDIDATE" <<NGINX
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}
server {
    listen 443 ssl;
    server_name $DOMAIN;
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    client_max_body_size 1m;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }
    # TLS termina no NGINX; WS/ARI do Asterisk permanece restrito ao loopback.
    location = /ws {
        proxy_pass http://127.0.0.1:8088/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 3600s;
    }
}
NGINX
UNIT_CANDIDATE=$(mktemp "$PROVISIONING/unit-candidate.XXXXXX")
RELEASE_ID=$(basename -- "$RELEASE")
sed -e "s|/usr/bin/node|$NODE_BIN|g" -e "/^ExecStart=/i Environment=PBX_RELEASE_ID=$RELEASE_ID" "$PROVISIONING/ops/enlace-pbx.service" > "$UNIT_CANDIDATE"
"$NODE_BIN" "$PROVISIONING/scripts/release-activation.mjs" "$RELEASE" "$UNIT_CANDIDATE" "$NGINX_CANDIDATE"
printf 'Versão instalada: %s\nServiço: enlace-pbx.service (usuário enlace-pbx)\nPainel: https://%s\n' "$RELEASE" "$DOMAIN"

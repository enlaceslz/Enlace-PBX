#!/usr/bin/env bash
# Instalação e atualização do Enlace-PBX com processo sem privilégios de root.
set -euo pipefail
umask 077

[[ $EUID -eq 0 ]] || { echo 'Execute como root para provisionar o serviço.' >&2; exit 1; }
SOURCE_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
NODE_BIN=$(command -v node) || { echo 'Instale Node.js 22 ou 24 antes de continuar.' >&2; exit 1; }
[[ "$NODE_BIN" =~ ^/[a-zA-Z0-9_./-]+$ ]] || { echo 'Caminho do Node inválido.' >&2; exit 1; }
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[[ "$NODE_MAJOR" == 22 || "$NODE_MAJOR" == 24 ]] || { echo 'Este instalador exige Node.js 22 ou 24.' >&2; exit 1; }
command -v systemctl >/dev/null || { echo 'Host com systemd obrigatório.' >&2; exit 1; }

export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y --no-install-recommends nginx curl ca-certificates rsync build-essential postgresql-client postgresql openssl python3
getent group enlace-pbx >/dev/null || groupadd --system enlace-pbx
id enlace-pbx >/dev/null 2>&1 || useradd --system --gid enlace-pbx --home-dir /var/lib/enlace-pbx --shell /usr/sbin/nologin enlace-pbx
install -d -m 0755 -o root -g root /opt/enlace-pbx /opt/enlace-pbx/releases
install -d -m 0750 -o root -g enlace-pbx /etc/enlace-pbx
install -d -m 2750 -o root -g enlace-pbx /var/backups/enlace-pbx
install -d -m 0750 -o enlace-pbx -g enlace-pbx /var/lib/enlace-pbx /var/log/enlace-pbx /var/lib/enlace-pbx/asterisk

# O Asterisk lê somente o diretório gerenciado, sem acesso à configuração secreta do serviço.
if getent group asterisk >/dev/null; then
  usermod -aG asterisk enlace-pbx
  chmod 0751 /var/lib/enlace-pbx
  chgrp asterisk /var/lib/enlace-pbx/asterisk
fi

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
if [[ ! -f /etc/enlace-pbx/runtime.json && ! -f "$SOURCE_DIR/.env" ]]; then
  if [[ -z "${PBX_DOMAIN:-}" ]]; then read -r -p 'Domínio HTTPS do PBX: ' PBX_DOMAIN; fi
  if [[ -z "${ADMIN_INITIAL_EMAIL:-}" ]]; then read -r -p 'E-mail do primeiro administrador: ' ADMIN_INITIAL_EMAIL; fi
  if [[ -z "${ADMIN_INITIAL_PASSWORD:-}" ]]; then read -r -s -p 'Senha do primeiro administrador (mínimo 12 caracteres): ' ADMIN_INITIAL_PASSWORD; echo; fi
  export PBX_DOMAIN ADMIN_INITIAL_EMAIL ADMIN_INITIAL_PASSWORD
fi
export PBX_LEGACY_ENV="$SOURCE_DIR/.env"
"$NODE_BIN" scripts/configure-production.mjs /etc/enlace-pbx/runtime.json "$BOOTSTRAP"
chown root:enlace-pbx /etc/enlace-pbx/runtime.json
DOMAIN=$("$NODE_BIN" -p "JSON.parse(require('fs').readFileSync('/etc/enlace-pbx/runtime.json','utf8')).PBX_DOMAIN")
if [[ "${INSTALL_ASTERISK:-0}" == 1 ]]; then
  PBX_CONFIG_FILE=/etc/enlace-pbx/runtime.json bash install-enlace-pbx.sh
fi
if getent passwd asterisk >/dev/null && [[ -d /etc/asterisk ]]; then
  usermod -aG asterisk enlace-pbx
  chmod 0751 /var/lib/enlace-pbx
  chown enlace-pbx:asterisk /var/lib/enlace-pbx/asterisk
  if [[ ! -f /var/lib/enlace-pbx/asterisk/pjsip.conf ]]; then
    install -m 0640 -o enlace-pbx -g asterisk /dev/null /var/lib/enlace-pbx/asterisk/pjsip.conf
  fi
  PBX_CONFIG_FILE=/etc/enlace-pbx/runtime.json "$NODE_BIN" scripts/asterisk-settings.mjs
  chown root:asterisk /etc/asterisk/{manager,ari,http,asterisk,pjsip}.conf
  asterisk -rx "manager reload"
fi
# TLS é pré-requisito; o instalador não aceita contratos ACME nem anuncia HTTPS sem certificado.
[[ -s "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" && -s "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]] || {
  echo "Provisione o certificado de $DOMAIN e repita o deploy. O serviço anterior não foi substituído." >&2; exit 1;
}
LOCAL_DATABASE=$("$NODE_BIN" -p "const c=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); const u=new URL(c.DATABASE_URL); ['127.0.0.1','localhost'].includes(u.hostname) && !process.env.DATABASE_MIGRATION_URL" "$BOOTSTRAP")
if [[ "$LOCAL_DATABASE" == true ]]; then
  chown postgres:postgres "$BOOTSTRAP"
  runuser -u postgres -- env PBX_CONFIG_FILE="$BOOTSTRAP" "$NODE_BIN" scripts/provision-database.mjs
  runuser -u postgres -- env PBX_CONFIG_FILE="$BOOTSTRAP" "$NODE_BIN" --import tsx scripts/migrate.ts
else
  [[ -n "${DATABASE_MIGRATION_URL:-}" ]] || { echo 'Defina DATABASE_MIGRATION_URL para migrar o PostgreSQL externo.' >&2; exit 1; }
  PBX_CONFIG_FILE="$BOOTSTRAP" "$NODE_BIN" --import tsx scripts/migrate.ts
fi
rm -f -- "$BOOTSTRAP"
unset DATABASE_MIGRATION_URL ADMIN_INITIAL_PASSWORD

# Backup usa chave independente. Ela deve ser guardada fora do servidor e dos arquivos de backup.
if [[ ! -f /etc/enlace-pbx/backup.key ]]; then
  openssl rand -hex 32 > /etc/enlace-pbx/backup.key
  chmod 0400 /etc/enlace-pbx/backup.key
fi

cat > /etc/nginx/sites-available/enlace-pbx <<NGINX
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
ln -sfn /etc/nginx/sites-available/enlace-pbx /etc/nginx/sites-enabled/enlace-pbx
nginx -t
# Não remove outros sites, não altera o firewall nem interrompe outro processo PM2.
if command -v pm2 >/dev/null && pm2 pid enlace-pbx 2>/dev/null | grep -Eq '[1-9][0-9]*'; then
  if [[ "${MIGRATE_FROM_PM2:-0}" != 1 ]]; then
    echo 'Há uma instância legada PM2 ativa. Use MIGRATE_FROM_PM2=1 em janela de manutenção para migrar o serviço.' >&2
    exit 1
  fi
  pm2 stop enlace-pbx
  pm2 delete enlace-pbx
  pm2 save
fi
ln -sfn "$RELEASE" /opt/enlace-pbx/current.next
mv -Tf /opt/enlace-pbx/current.next /opt/enlace-pbx/current
sed "s|/usr/bin/node|$NODE_BIN|g" ops/enlace-pbx.service > /etc/systemd/system/enlace-pbx.service
systemctl daemon-reload
systemctl enable enlace-pbx.service
systemctl restart enlace-pbx.service
systemctl reload nginx
READY=false
for attempt in $(seq 1 20); do
  if curl --max-time 4 --silent --fail http://127.0.0.1:3000/health/ready >/dev/null; then READY=true; break; fi
  sleep 1
done
if [[ "$READY" != true ]]; then
  echo 'Prontidão não aprovada: consulte journalctl -u enlace-pbx. Deploy não homologado.' >&2
  exit 1
fi
printf 'Versão instalada: %s\nServiço: enlace-pbx.service (usuário enlace-pbx)\nPainel: https://%s\n' "$RELEASE" "$DOMAIN"

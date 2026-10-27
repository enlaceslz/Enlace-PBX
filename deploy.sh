#!/usr/bin/env bash
# ====================================================================
# Enlace-PBX Enterprise — Script Oficial de Deploy e Produção
# Telefonia Inteligente. Simples, aberta e brasileira.
# Desenvolvido para Debian 11/12 e Ubuntu 20.04/22.04/24.04 LTS
# ====================================================================

set -e

# Cores para terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear 2>/dev/null || true
echo -e "${BLUE}${BOLD}====================================================================${NC}"
echo -e "${CYAN}${BOLD}     🐙  Enlace-PBX Enterprise — Deploy Automatizado Linux  🐙    ${NC}"
echo -e "${CYAN}       Telefonia Asterisk 20 LTS + IA Gemini + NGINX SSL WSS        ${NC}"
echo -e "${CYAN}               Mascote Oficial & Identidade Enlace Telecom          ${NC}"
echo -e "${BLUE}${BOLD}====================================================================${NC}"
echo ""

# 1. Checagem de privilégios ROOT
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ ERRO: Este script deve ser executado com privilégios de superusuário (root).${NC}"
  echo -e "${YELLOW}👉 Por favor, execute: sudo ./deploy.sh${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Privilégios de ROOT validados.${NC}"

# Validate installation location and environment before changing the host.
APP_DIR="$(pwd -P)"
if [[ "${APP_DIR}" != /opt/* && "${APP_DIR}" != /srv/* ]]; then
  echo "ERRO: mova o projeto para /opt/enlace-pbx ou /srv/enlace-pbx antes do deploy." >&2
  exit 1
fi
if [ -L .env ]; then
  echo "ERRO: .env nao pode ser um link simbolico." >&2
  exit 1
fi

# Preflight: prevent conflicting legacy root-owned PM2 processes.
# Migration requires an explicit operator decision to avoid unexpected downtime.
echo -e "\n${BOLD}Verificando processos legados antes de modificar o host...${NC}"
if command -v pm2 >/dev/null 2>&1 && pm2 pid enlace-pbx 2>/dev/null | grep -Eq '^[1-9][0-9]*
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS_NAME=$NAME
  OS_VER=$VERSION_ID
  echo -e "${CYAN}ℹ️  Sistema detectado: ${OS_NAME} (versão ${OS_VER})${NC}"
else
  echo -e "${YELLOW}⚠️ Não foi possível identificar a distribuição Linux com precisão. Prosseguindo em modo Debian-compatível...${NC}"
fi

# 3. Atualização e Instalação de Pacotes Essenciais
echo -e "\n${BOLD}[1/9] Atualizando repositórios e instalando dependências base...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl wget git build-essential ufw nginx certbot python3-certbot-nginx \
  jq openssl net-tools ca-certificates fail2ban wireguard-tools sngrep tcpdump \
  postgresql postgresql-contrib

# Garantir criação de diretórios de mídia, gravações e snapshots do Enlace-PBX
# Create storage with explicit identities; avoid world-writable media and backup directories.
install -d -m 750 /var/backups/enlace-pbx
install -d -m 750 /var/log/enlace-pbx
if id -u asterisk >/dev/null 2>&1; then
  install -d -o asterisk -g asterisk -m 750 /var/spool/asterisk/recording
else
  install -d -m 750 /var/spool/asterisk/recording
fi

# 4. Instalação e Validação do Node.js 20 LTS
echo -e "\n${BOLD}[2/9] Verificando runtime Node.js 20 LTS...${NC}"
NODE_OK=false
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
  if [ "$NODE_MAJOR" -ge 20 ]; then
    NODE_OK=true
    echo -e "${GREEN}✅ Node.js já instalado e compatível: $(node -v)${NC}"
  fi
fi

if [ "$NODE_OK" = false ]; then
  echo -e "${YELLOW}⚙️ Instalando Node.js 20.x LTS via NodeSource...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  echo -e "${GREEN}✅ Node.js instalado com sucesso: $(node -v) (NPM $(npm -v))${NC}"
fi

# 6. Parâmetros de Configuração de Rede, Host e Ambiente
echo -e "\n${BOLD}[4/9] Configuração de Rede, Domínio e Integrações${NC}"
echo -e "${CYAN}Detectando endereço IP público (WAN)...${NC}"
DETECTED_WAN=$(curl -s --connect-timeout 4 https://api.ipify.org || curl -s --connect-timeout 4 https://ifconfig.me || echo "NOT_CONFIGURED")
echo -e "IP Público detectado: ${GREEN}${BOLD}${DETECTED_WAN}${NC}"

read -p "Confirma o IP Público para sinalização SIP e RTP [${DETECTED_WAN}]: " CONF_WAN
PUBLIC_IP="${CONF_WAN:-$DETECTED_WAN}"

read -p "Informe o Domínio/FQDN do PBX (ex: pbx.suaempresa.com.br) [pbx.enlacetelecom.com.br]: " CONF_DOMAIN
DOMAIN="${CONF_DOMAIN:-pbx.enlacetelecom.com.br}"
# Never interpolate unvalidated operator input into NGINX or dotenv configuration.
if [[ ${#DOMAIN} -gt 253 || ! "${DOMAIN}" =~ ^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$ ]]; then
  echo "ERRO: dominio/FQDN invalido." >&2
  exit 1
fi
if [[ ! "${PUBLIC_IP}" =~ ^[0-9]{1,3}(\\.[0-9]{1,3}){3}$ ]]; then
  echo "ERRO: IP publico deve ser um endereco IPv4 valido." >&2
  exit 1
fi
IFS='.' read -r ip1 ip2 ip3 ip4 <<< "${PUBLIC_IP}"
for octet in "$ip1" "$ip2" "$ip3" "$ip4"; do
  if (( 10#$octet > 255 )); then
    echo "ERRO: octeto IPv4 fora do intervalo permitido." >&2
    exit 1
  fi
done

read -p "Informe a Sub-rede LAN local para NAT Traversal [192.168.1.0/24]: " CONF_LAN
LAN_SUBNET="${CONF_LAN:-192.168.1.0/24}"

read -p "Informe o E-mail do Administrador Inicial [noc@enlacetelecom.com.br]: " CONF_EMAIL
ADMIN_EMAIL="${CONF_EMAIL:-noc@enlacetelecom.com.br}"

# Senha inicial segura do Super Admin
read -s -p "Informe a Senha Inicial do Super Admin (deixe em branco para gerar aleatória): " CONF_ADMIN_PASS
echo ""
if [ -z "$CONF_ADMIN_PASS" ]; then
  ADMIN_INITIAL_PASSWORD=$(openssl rand -base64 16 | tr -d '/+=')
  echo -e "${YELLOW}🔑 Senha inicial de Super Admin gerada com segurança:${NC} ${GREEN}${BOLD}${ADMIN_INITIAL_PASSWORD}${NC}"
  echo -e "${YELLOW}⚠️ Anote esta senha! Ela será necessária para o primeiro login e não será exibida novamente.${NC}"
else
  ADMIN_INITIAL_PASSWORD="$CONF_ADMIN_PASS"
fi

# Chave JWT forte (256 bits)
EXISTING_JWT=""
if [ -f .env ]; then
  EXISTING_JWT=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
fi
if [ -n "$EXISTING_JWT" ]; then
  JWT_SECRET="$EXISTING_JWT"
else
  JWT_SECRET=$(openssl rand -hex 32)
fi

# Token seguro do Webhook do WhatsApp (nunca usar padrão previsível)
EXISTING_WHATSAPP=""
if [ -f .env ]; then
  EXISTING_WHATSAPP=$(grep "^WHATSAPP_VERIFY_TOKEN=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
fi
if [ -n "$EXISTING_WHATSAPP" ] && [ "$EXISTING_WHATSAPP" != "enlace_meta_webhook_token_2026" ]; then
  WHATSAPP_VERIFY_TOKEN="$EXISTING_WHATSAPP"
else
  WHATSAPP_VERIFY_TOKEN=$(openssl rand -hex 24)
fi

# Criptografia simétrica AES-256-GCM para segredos SIP e dados confidenciais
EXISTING_ENC=""
if [ -f .env ]; then
  EXISTING_ENC=$(grep "^ENCRYPTION_KEY=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
fi
if [ -n "$EXISTING_ENC" ] && [ ${#EXISTING_ENC} -ge 32 ]; then
  ENCRYPTION_KEY="$EXISTING_ENC"
  echo -e "${GREEN}Chave ENCRYPTION_KEY existente preservada.${NC}"
else
  ENCRYPTION_KEY=$(openssl rand -hex 32)
  echo -e "${YELLOW}🔑 Nova chave ENCRYPTION_KEY (AES-256-GCM 256 bits) gerada com segurança.${NC}"
fi

# Credenciais AMI e ARI (Preservar se já existirem no .env)
EXISTING_AMI_PASS=""
EXISTING_ARI_PASS=""
EXISTING_AMI_USER=""
EXISTING_ARI_USER=""
if [ -f .env ]; then
  EXISTING_AMI_PASS=$(grep -E "^(ASTERISK_AMI_PASSWORD|ASTERISK_AMI_PASS)=" .env | head -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
  EXISTING_ARI_PASS=$(grep -E "^(ASTERISK_ARI_PASSWORD|ASTERISK_ARI_PASS)=" .env | head -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
  EXISTING_AMI_USER=$(grep -E "^(ASTERISK_AMI_USER|ASTERISK_AMI_USERNAME)=" .env | head -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
  EXISTING_ARI_USER=$(grep -E "^(ASTERISK_ARI_USER|ASTERISK_ARI_USERNAME)=" .env | head -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
fi
AMI_PASSWORD="${EXISTING_AMI_PASS:-$(openssl rand -hex 16)}"
ARI_PASSWORD="${EXISTING_ARI_PASS:-$(openssl rand -hex 16)}"
AMI_USER="${EXISTING_AMI_USER:-enlace_ami}"
ARI_USER="${EXISTING_ARI_USER:-enlace_ari}"

# Banco de dados PostgreSQL (Usuário exclusivo operacional enlace_app com privilégios mínimos)
EXISTING_DB=""
if [ -f .env ]; then
  EXISTING_DB=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
fi

DB_APP_PASSWORD=$(openssl rand -hex 16)
DEFAULT_DB_URL="postgresql://enlace_app:${DB_APP_PASSWORD}@127.0.0.1:5432/enlace_pbx"

if [ -n "$EXISTING_DB" ]; then
  DATABASE_URL="$EXISTING_DB"
  echo -e "${GREEN}DATABASE_URL existente preservada do .env.${NC}"
else
  echo -e "\n${BOLD}Configuração do Banco de Dados PostgreSQL:${NC}"
  echo -e "${CYAN}Em produção, o uso do superusuário 'postgres' é bloqueado por segurança (fail-closed).${NC}"
  echo -e "${CYAN}O Enlace-PBX utiliza o usuário restrito operacional 'enlace_app' com privilégios mínimos.${NC}"
  read -p "Informe a URL de conexão PostgreSQL (DATABASE_URL) [${DEFAULT_DB_URL}]: " CONF_DB
  DATABASE_URL="${CONF_DB:-$DEFAULT_DB_URL}"
fi

# Se o PostgreSQL local estiver ativo, provisionar database enlace_pbx e usuário enlace_app se não existirem
if command -v psql >/dev/null 2>&1 && systemctl is-active --quiet postgresql 2>/dev/null; then
  echo -e "${CYAN}Provisionando/validando banco local 'enlace_pbx' e usuário restrito 'enlace_app'...${NC}"
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'enlace_pbx'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE enlace_pbx;"
  if sudo -u postgres psql -Atqc "SELECT 1 FROM pg_roles WHERE rolname = 'enlace_app'" | grep -qx 1; then
    if [ -z "$EXISTING_DB" ]; then
      echo "ERRO: role enlace_app ja existe, mas DATABASE_URL nao foi preservada. Informe credenciais existentes; nao sera gerada senha divergente." >&2
      exit 1
    fi
  else
    sudo -u postgres psql -c "CREATE USER enlace_app WITH NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE ENCRYPTED PASSWORD '${DB_APP_PASSWORD}';"
  fi
  # Fail closed on privilege errors; never report success after a failed GRANT.
  if ! sudo -u postgres psql -v ON_ERROR_STOP=1 -d enlace_pbx -c "GRANT CONNECT ON DATABASE enlace_pbx TO enlace_app; GRANT USAGE ON SCHEMA public TO enlace_app; GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO enlace_app; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO enlace_app; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO enlace_app; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO enlace_app; REVOKE CREATE ON SCHEMA public FROM enlace_app;"; then
    echo "ERRO: nao foi possivel configurar os privilegios PostgreSQL do enlace_app." >&2
    exit 1
  fi
  echo -e "${GREEN}✅ Banco PostgreSQL e role 'enlace_app' verificados.${NC}"
fi

CURRENT_GEMINI=""
if [ -f .env ]; then
  CURRENT_GEMINI=$(grep "^GEMINI_API_KEY=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
fi

if [ -z "$CURRENT_GEMINI" ]; then
  read -p "Chave de API Google Gemini (para agentes cognitivos MaIA - Enter para pular): " CONF_GEMINI
  GEMINI_KEY="${CONF_GEMINI}"
else
  echo -e "${GREEN}Chave GEMINI_API_KEY já configurada no .env.${NC}"
  GEMINI_KEY="$CURRENT_GEMINI"
fi

# Atualizar ou criar o .env com permissões restritas
echo -e "\n${BOLD}[5/9] Escrevendo configurações de ambiente (.env)...${NC}"
if [ ! -f .env.example ]; then
  touch .env.example
fi

if [ -L .env ]; then
  echo -e "${RED}❌ Arquivo .env é um link simbólico; implantação interrompida.${NC}"
  exit 1
fi
if [ -e .env ] && [ ! -f .env ]; then
  echo -e "${RED}❌ Arquivo .env não é um arquivo regular; implantação interrompida.${NC}"
  exit 1
fi
if [ -f .env ] && [ ! -f scripts/merge-env.py ]; then
  echo -e "${RED}❌ Rotina scripts/merge-env.py ausente; deploy interrompido antes de alterar .env.${NC}"
  exit 1
fi

if [ -f .env ]; then
  ENV_BACKUP=$(mktemp "./.env.backup.$(date -u +%Y%m%dT%H%M%SZ).XXXXXXXX")
  cp -p .env "$ENV_BACKUP"
  chmod 600 "$ENV_BACKUP"
  echo "Backup da configuracao anterior: $ENV_BACKUP"
fi
umask 077
ENV_STAGING=$(mktemp ./.env.staging.XXXXXXXX)
trap 'rm -f -- "$ENV_STAGING"' EXIT
chmod 600 "$ENV_STAGING"
cat <<EOF > "$ENV_STAGING"
# ====================================================================
# Enlace-PBX Enterprise — Configuração de Produção
# Gerado automaticamente pelo deploy.sh em $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# ====================================================================
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Segurança e Autenticação Corporativa (Segredos de 256 bits)
JWT_SECRET=${JWT_SECRET}
CORS_ALLOWED_ORIGINS=https://${DOMAIN},http://127.0.0.1:3000

# Criptografia Bidirecional AES-256-GCM de Segredos SIP e Credenciais
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Bootstrap Administrativo Obrigatório (Primeiro Acesso)
ADMIN_INITIAL_EMAIL=${ADMIN_EMAIL}
ADMIN_INITIAL_PASSWORD=${ADMIN_INITIAL_PASSWORD}

# Persistência de Dados Relacional (PostgreSQL)
DATABASE_URL=${DATABASE_URL}

# Infraestrutura de Telefonia e Rede
PBX_DOMAIN=${DOMAIN}
PBX_PUBLIC_IP=${PUBLIC_IP}
PBX_LAN_SUBNET=${LAN_SUBNET}
ADMIN_EMAIL=${ADMIN_EMAIL}

# Asterisk AMI (Asterisk Manager Interface)
ASTERISK_HOST=127.0.0.1
ASTERISK_AMI_HOST=127.0.0.1
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USER=${AMI_USER}
ASTERISK_AMI_USERNAME=${AMI_USER}
ASTERISK_AMI_PASSWORD=${AMI_PASSWORD}

# Asterisk ARI (Asterisk REST Interface)
ASTERISK_ARI_URL=http://127.0.0.1:8088
ASTERISK_ARI_USER=${ARI_USER}
ASTERISK_ARI_USERNAME=${ARI_USER}
ASTERISK_ARI_PASSWORD=${ARI_PASSWORD}

# Inteligência Artificial (Google Gemini)
GEMINI_API_KEY=${GEMINI_KEY}

# Segurança e Webhooks Omnichannel
WHATSAPP_VERIFY_TOKEN=${WHATSAPP_VERIFY_TOKEN}
EOF
chmod 600 "$ENV_STAGING"
# Preserve custom integrations and secrets not managed by the installer.
# Write to a temporary file and replace atomically, keeping the backup for rollback.
if [ -n "${ENV_BACKUP:-}" ] && [ -f "$ENV_BACKUP" ]; then
  python3 scripts/merge-env.py "$ENV_BACKUP" "$ENV_STAGING"
fi
mv -f "$ENV_STAGING" .env
trap - EXIT
chmod 600 .env
echo -e "${GREEN}✅ Arquivo .env gravado e protegido com permissão 600.${NC}"

# 7. Instalação das dependências e compilação do Enlace-PBX
echo -e "\n${BOLD}[6/9] Instalando dependências NPM e compilando produção...${NC}"
npm ci --legacy-peer-deps
npm run build
# Garantir sincronização de logos e assets visuais
if [ -d public ]; then
  cp -r public/* dist/ 2>/dev/null || true
fi
echo -e "${GREEN}✅ Frontend e Backend compilados em dist/server.cjs e dist/!${NC}"
echo -e "${GREEN}✅ Identidade visual e logos oficiais verificados em dist/.${NC}"

# 8. Compilação e Instalação Opcional do Asterisk 20 LTS
echo -e "\n${BOLD}[7/9] Núcleo de Telefonia Asterisk 20 LTS${NC}"
read -p "Deseja compilar e instalar o Asterisk 20 LTS (PJSIP + WebRTC + Opus + AudioSocket) agora? (s/N): " INSTALL_AST
if [[ "$INSTALL_AST" =~ ^[Ss]$ ]]; then
  echo -e "${CYAN}🚀 Iniciando script de compilação do Asterisk 20 LTS...${NC}"
  chmod +x install-enlace-pbx.sh
  ASTERISK_AMI_USER="${AMI_USER}" ASTERISK_AMI_PASSWORD="${AMI_PASSWORD}" ASTERISK_ARI_USER="${ARI_USER}" ASTERISK_ARI_PASSWORD="${ARI_PASSWORD}" ./install-enlace-pbx.sh
  echo -e "${GREEN}✅ Asterisk 20 LTS instalado e serviço habilitado!${NC}"
else
  echo -e "${YELLOW}ℹ️  Compilação do Asterisk ignorada. Caso já esteja instalado, mantenha o serviço ativo.${NC}"
fi

# 9. Configuração do NGINX Reverse Proxy e SSL Let's Encrypt
echo -e "\n${BOLD}[8/9] Configuração do NGINX Reverse Proxy & Certificado SSL${NC}"
read -p "Deseja configurar o NGINX com suporte a WebSockets e SSL para '${DOMAIN}'? (S/n): " CONF_NGINX
if [[ ! "$CONF_NGINX" =~ ^[Nn]$ ]]; then
  echo -e "${CYAN}⚙️ Gerando configuração do NGINX para ${DOMAIN}...${NC}"
  
  cat <<NGINX_CONF > "/etc/nginx/sites-available/enlace-pbx"
# ====================================================================
# Enlace-PBX — NGINX Reverse Proxy com Suporte WebRTC WSS e WebSockets
# Domínio: ${DOMAIN}
# ====================================================================

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    # Limite para gravação de chamadas e arquivos do CRM
    client_max_body_size 50M;

    # Encaminhamento para a aplicação Node.js (Enlace-PBX)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # TLS/WSS terminates at NGINX; Asterisk listens on loopback HTTP 8088.
    location = /ws {
        proxy_pass http://127.0.0.1:8088/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 86400s;
    }
}
NGINX_CONF

  # Habilitar o site
  ln -sf /etc/nginx/sites-available/enlace-pbx /etc/nginx/sites-enabled/enlace-pbx
  rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

  if nginx -t >/dev/null 2>&1; then
    systemctl reload nginx
    echo -e "${GREEN}✅ NGINX configurado e recarregado com sucesso.${NC}"
    
    # Tentativa de emissão do SSL com Certbot se o domínio resolver
    read -p "Deseja emitir certificado SSL Let's Encrypt para '${DOMAIN}' agora? (s/N): " RUN_CERTBOT
    if [[ "$RUN_CERTBOT" =~ ^[Ss]$ ]]; then
      echo -e "${CYAN}🔐 Solicitando certificado SSL Let's Encrypt...${NC}"
      certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${ADMIN_EMAIL}" --redirect || {
        echo -e "${YELLOW}⚠️ Não foi possível emitir o certificado automaticamente via Certbot.${NC}"
        echo -e "${YELLOW}Certifique-se de que o apontamento DNS tipo A de '${DOMAIN}' esteja direcionado para '${PUBLIC_IP}'.${NC}"
        echo -e "${YELLOW}Você pode executar manualmente depois: certbot --nginx -d ${DOMAIN}${NC}"
      }
    fi
  else
    echo -e "${RED}❌ Erro no arquivo de configuração do NGINX. Verifique com: nginx -t${NC}" >&2
    exit 1
  fi
fi

# 10. Firewall UFW (Segurança e Portas de Telefonia)
echo -e "\n${BOLD}[9/9] Configuração do Firewall (UFW)${NC}"
read -p "Deseja configurar as regras recomendadas no Firewall UFW? (S/n): " CONF_UFW
if [[ ! "$CONF_UFW" =~ ^[Nn]$ ]]; then
  echo -e "${CYAN}🛡️ Aplicando regras de firewall...${NC}"
  ufw allow 22/tcp comment "SSH Remote Access"
  ufw allow 80/tcp comment "HTTP Let's Encrypt"
  ufw allow 443/tcp comment "HTTPS Webphone/PWA/WhatsApp"
  ufw allow 5060/udp comment "Asterisk SIP UDP"
  ufw allow 5061/tcp comment "Asterisk SIP TLS"
  # WSS is served via NGINX on 443; Asterisk HTTP 8088 stays on loopback.
  ufw allow 10000:20000/udp comment "Asterisk RTP Audio Media"
  ufw allow 51820/udp comment "WireGuard VPN"
  
  # Habilitar sem travar SSH
  echo "y" | ufw enable || true
  echo -e "${GREEN}✅ Regras do UFW aplicadas e firewall ativado com segurança.${NC}"
fi

# 11. Run the application with a dedicated unprivileged systemd identity.
echo -e "\n${CYAN}🚀 Configurando serviço Enlace-PBX sem privilégios de root...${NC}"
if ! getent group enlace-pbx >/dev/null; then groupadd --system enlace-pbx; fi
if ! id -u enlace-pbx >/dev/null 2>&1; then
  useradd --system --gid enlace-pbx --home-dir /var/lib/enlace-pbx --shell /usr/sbin/nologin enlace-pbx
fi
if [ "$(id -gn enlace-pbx)" != enlace-pbx ]; then
  echo "ERRO: conta enlace-pbx possui grupo primario inesperado." >&2
  exit 1
fi
install -d -o enlace-pbx -g enlace-pbx -m 750 /var/lib/enlace-pbx /var/log/enlace-pbx
# Keep Asterisk recordings private; do not grant the web application blanket filesystem access.
# Knowledge-base uploads are processed in memory and persisted through the repository layer.
chown root:enlace-pbx .env
chmod 640 .env
if ! runuser -u enlace-pbx -- test -r "${APP_DIR}/.env" ||
   ! runuser -u enlace-pbx -- test -r "${APP_DIR}/dist/server.cjs"; then
  echo "ERRO: usuario enlace-pbx nao consegue ler o ambiente ou a aplicacao." >&2
  exit 1
fi
cat > /etc/systemd/system/enlace-pbx.service <<SERVICE
[Unit]
Description=Enlace-PBX application
After=network-online.target postgresql.service
Wants=network-online.target
[Service]
Type=simple
User=enlace-pbx
Group=enlace-pbx
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/env node ${APP_DIR}/dist/server.cjs
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/enlace-pbx /var/log/enlace-pbx
[Install]
WantedBy=multi-user.target
SERVICE
systemctl daemon-reload
systemctl enable enlace-pbx.service
systemctl restart enlace-pbx.service
if ! systemctl is-active --quiet enlace-pbx.service; then
  echo "ERRO: servico enlace-pbx nao iniciou." >&2
  exit 1
fi

# 12. Teste de Saúde (Smoke Test)
echo -e "\n${CYAN}🔍 Executando teste de integridade local (até 60 segundos)...${NC}"
HEALTH_OK=false
for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error --max-time 2 --output /dev/null http://127.0.0.1:3000/api/v1/health 2>/dev/null; then
    HEALTH_OK=true
    break
  fi
  if ! systemctl is-active --quiet enlace-pbx.service; then
    break
  fi
  sleep 2
done
if [ "$HEALTH_OK" = true ]; then
  HEALTH_STATUS="${GREEN}100% OPERACIONAL (HTTP 200 OK)${NC}"
else
  echo -e "${RED}❌ ERRO: aplicação não respondeu ao health check HTTP após inicialização.${NC}" >&2
  systemctl status enlace-pbx.service --no-pager >&2 || true
  journalctl -u enlace-pbx.service -n 30 --no-pager >&2 || true
  exit 1
fi

# 13. Resumo Final
echo ""
echo -e "${GREEN}${BOLD}====================================================================${NC}"
echo -e "${GREEN}${BOLD}       🎉 DEPLOY DO ENLACE-PBX CONCLUÍDO COM SUCESSO! 🎉       ${NC}"
echo -e "${GREEN}${BOLD}====================================================================${NC}"
echo -e "Status da Aplicação: ${HEALTH_STATUS}"
echo ""
echo -e "${BOLD}🌐 URLs de Acesso:${NC}"
echo -e "  • Painel Web / PWA:    ${CYAN}https://${DOMAIN}${NC} (ou ${CYAN}http://${PUBLIC_IP}:3000${NC})"
echo -e "  • Webphone WebRTC:     ${CYAN}https://${DOMAIN}#webphone${NC}"
echo -e "  • Webhook WhatsApp:    ${CYAN}https://${DOMAIN}/api/v1/webhooks/whatsapp${NC}"
echo -e "  • Health Check API:    ${CYAN}https://${DOMAIN}/api/v1/health${NC}"
echo ""
echo -e "${BOLD}📋 Comandos de Gerenciamento:${NC}"
echo -e "  • Ver logs da aplicação:      ${YELLOW}journalctl -u enlace-pbx -f${NC}"
echo -e "  • Reiniciar aplicação:        ${YELLOW}systemctl restart enlace-pbx${NC}"
echo -e "  • Acessar CLI do Asterisk:    ${YELLOW}asterisk -rvvvv${NC}"
echo -e "  • Recarregar NGINX:           ${YELLOW}systemctl reload nginx${NC}"
echo -e "  • Renovar Certificados SSL:   ${YELLOW}certbot renew${NC}"
echo -e "${GREEN}${BOLD}====================================================================${NC}"

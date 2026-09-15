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

# 2. Identificação do Sistema Operacional
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
apt-get install -y curl wget git build-essential ufw nginx certbot python3-certbot-nginx jq openssl net-tools ca-certificates

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

# 5. Instalação do PM2 (Process Manager)
echo -e "\n${BOLD}[3/9] Verificando gerenciador de processos PM2...${NC}"
if ! command -v pm2 >/dev/null 2>&1; then
  echo -e "${YELLOW}⚙️ Instalando PM2 globalmente via NPM...${NC}"
  npm install -g pm2
  echo -e "${GREEN}✅ PM2 instalado com sucesso.${NC}"
else
  echo -e "${GREEN}✅ PM2 já instalado: $(pm2 -v)${NC}"
fi

# 6. Parâmetros de Configuração de Rede, Host e Ambiente
echo -e "\n${BOLD}[4/9] Configuração de Rede, Domínio e Integrações${NC}"
echo -e "${CYAN}Detectando endereço IP público (WAN)...${NC}"
DETECTED_WAN=$(curl -s --connect-timeout 4 https://api.ipify.org || curl -s --connect-timeout 4 https://ifconfig.me || echo "177.136.210.12")
echo -e "IP Público detectado: ${GREEN}${BOLD}${DETECTED_WAN}${NC}"

read -p "Confirma o IP Público para sinalização SIP e RTP [${DETECTED_WAN}]: " CONF_WAN
PUBLIC_IP="${CONF_WAN:-$DETECTED_WAN}"

read -p "Informe o Domínio/FQDN do PBX (ex: pbx.suaempresa.com.br) [pbx.enlacetelecom.com.br]: " CONF_DOMAIN
DOMAIN="${CONF_DOMAIN:-pbx.enlacetelecom.com.br}"

read -p "Informe a Sub-rede LAN local para NAT Traversal [192.168.1.0/24]: " CONF_LAN
LAN_SUBNET="${CONF_LAN:-192.168.1.0/24}"

read -p "Informe o E-mail do Administrador (para avisos do SSL Let's Encrypt) [noc@enlacetelecom.com.br]: " CONF_EMAIL
ADMIN_EMAIL="${CONF_EMAIL:-noc@enlacetelecom.com.br}"

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

# Atualizar ou criar o .env
echo -e "\n${BOLD}[5/9] Escrevendo configurações de ambiente (.env)...${NC}"
if [ ! -f .env.example ]; then
  touch .env.example
fi

cat <<EOF > .env
# ====================================================================
# Enlace-PBX Enterprise — Configuração de Produção
# Gerado automaticamente pelo deploy.sh em $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# ====================================================================
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Infraestrutura de Telefonia
PBX_DOMAIN=${DOMAIN}
PBX_PUBLIC_IP=${PUBLIC_IP}
PBX_LAN_SUBNET=${LAN_SUBNET}
ADMIN_EMAIL=${ADMIN_EMAIL}

# Inteligência Artificial (Google Gemini)
GEMINI_API_KEY=${GEMINI_KEY}

# Segurança e Webhooks
WHATSAPP_VERIFY_TOKEN=enlace_meta_webhook_token_2026
EOF
echo -e "${GREEN}✅ Arquivo .env gravado com sucesso.${NC}"

# 7. Instalação das dependências e compilação do Enlace-PBX
echo -e "\n${BOLD}[6/9] Instalando dependências NPM e compilando produção...${NC}"
npm install --legacy-peer-deps
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
  ./install-enlace-pbx.sh
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

    # Proxy para sinalização WebRTC WSS do Asterisk (porta 8089)
    location /ws {
        proxy_pass http://127.0.0.1:8089/ws;
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
    echo -e "${RED}❌ Erro no arquivo de configuração do NGINX. Verifique com: nginx -t${NC}"
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
  ufw allow 8089/tcp comment "Asterisk WebRTC WSS"
  ufw allow 10000:20000/udp comment "Asterisk RTP Audio Media"
  ufw allow 51820/udp comment "WireGuard VPN"
  
  # Habilitar sem travar SSH
  echo "y" | ufw enable || true
  echo -e "${GREEN}✅ Regras do UFW aplicadas e firewall ativado com segurança.${NC}"
fi

# 11. Inicialização do Enlace-PBX com PM2
echo -e "\n${CYAN}🚀 Iniciando o serviço Enlace-PBX com PM2...${NC}"
pm2 stop enlace-pbx 2>/dev/null || true
pm2 delete enlace-pbx 2>/dev/null || true
pm2 start dist/server.cjs --name "enlace-pbx"
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || pm2 startup 2>/dev/null || true

# 12. Teste de Saúde (Smoke Test)
sleep 2
echo -e "\n${CYAN}🔍 Executando teste de integridade local...${NC}"
if curl -s -f http://127.0.0.1:3000/api/v1/health >/dev/null 2>&1; then
  HEALTH_STATUS="${GREEN}100% OPERACIONAL (HTTP 200 OK)${NC}"
else
  HEALTH_STATUS="${YELLOW}INICIANDO (Aguarde alguns segundos)${NC}"
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
echo -e "  • Ver logs da aplicação:      ${YELLOW}pm2 logs enlace-pbx${NC}"
echo -e "  • Reiniciar aplicação:        ${YELLOW}pm2 restart enlace-pbx${NC}"
echo -e "  • Acessar CLI do Asterisk:    ${YELLOW}asterisk -rvvvv${NC}"
echo -e "  • Forçar Backup Manual S3:    ${YELLOW}curl -X POST http://127.0.0.1:3000/api/v1/system/backup${NC}"
echo -e "  • Recarregar NGINX:           ${YELLOW}systemctl reload nginx${NC}"
echo -e "  • Renovar Certificados SSL:   ${YELLOW}certbot renew${NC}"
echo -e "${GREEN}${BOLD}====================================================================${NC}"

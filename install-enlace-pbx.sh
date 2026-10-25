#!/usr/bin/env bash
# ====================================================================
# Enlace-PBX Enterprise — Instalador Oficial do Asterisk 20 LTS
# Versão Controlada, Compilação Segura, Checksum e Verificação de Saúde
# Suporte: Debian 11/12, Ubuntu 20.04/22.04/24.04 LTS
# ====================================================================

set -euo pipefail

# Configuração de Versão
ASTERISK_VER="${ASTERISK_VERSION:-20.17.0}"
if [[ ! "$ASTERISK_VER" =~ ^20\.[0-9]+\.[0-9]+$ ]]; then
  echo "ERRO: ASTERISK_VERSION deve ser uma versão numérica da série 20 (ex.: 20.17.0)." >&2
  exit 1
fi
DOWNLOAD_URL="https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-${ASTERISK_VER}.tar.gz"
DOWNLOAD_DIR="/usr/src"

# Cores para terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}====================================================================${NC}"
echo -e "${CYAN}${BOLD}     🐙  Enlace-PBX — Instalador Oficial Asterisk ${ASTERISK_VER} LTS  🐙    ${NC}"
echo -e "${CYAN}    PJSIP + WebRTC SRTP + Opus 48kHz + AudioSocket + ARI Stasis     ${NC}"
echo -e "${BLUE}${BOLD}====================================================================${NC}"

# Exigir segredos explícitos e impedir instalação com credenciais previsíveis.
: "${ASTERISK_AMI_PASSWORD:?Defina ASTERISK_AMI_PASSWORD antes de executar o instalador}"
: "${ASTERISK_ARI_PASSWORD:?Defina ASTERISK_ARI_PASSWORD antes de executar o instalador}"
# Validar valores antes de interpolar nos arquivos de configuracao Asterisk.
# Quebras de linha e delimitadores de configuracao nao sao permitidos.
for secret_value in "$ASTERISK_AMI_PASSWORD" "$ASTERISK_ARI_PASSWORD"; do
  if [[ ! "$secret_value" =~ ^[A-Za-z0-9_-]+$ ]]; then
    echo "ERRO: Credenciais AMI/ARI devem conter apenas letras, numeros, _ ou -." >&2
    exit 1
  fi
done

if [[ "${#ASTERISK_AMI_PASSWORD}" -lt 24 || "${#ASTERISK_ARI_PASSWORD}" -lt 24 ]]; then
  echo "ERRO: Credenciais AMI e ARI devem ter pelo menos 24 caracteres." >&2
  exit 1
fi

# 1. Validação de privilégios de ROOT
if [ "${EUID}" -ne 0 ]; then
  echo -e "${RED}❌ ERRO: Este script deve ser executado com privilégios de superusuário (root).${NC}"
  echo -e "${YELLOW}Execute: sudo ASTERISK_VERSION=${ASTERISK_VER} ./install-enlace-pbx.sh${NC}"
  exit 1
fi

# Tabela oficial de Checksums SHA-256 para versões homologadas do Asterisk 20 LTS
declare -A KNOWN_ASTERISK_SHA256=(
  ["20.17.0"]="a38b5847e93050cb25391a9b2c3c4314c1d7634f19bca4020a67e584f29ee873"
)

# Fail before network access when the selected release has no trusted checksum.
EXPECTED_SHA256="${ASTERISK_EXPECTED_SHA256:-${KNOWN_ASTERISK_SHA256[${ASTERISK_VER}]:-}}"
if [[ ! "${EXPECTED_SHA256}" =~ ^[a-fA-F0-9]{64}$ ]]; then
  echo "ERRO: checksum SHA-256 obrigatório para Asterisk ${ASTERISK_VER}. Configure ASTERISK_EXPECTED_SHA256." >&2
  exit 1
fi
EXPECTED_SHA256="${EXPECTED_SHA256,,}"

# 2. Instalação de dependências do sistema
echo -e "\n${BOLD}[1/7] Instalando pacotes e dependências de compilação...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y --no-install-recommends \
  build-essential git curl wget libnewt-dev libssl-dev \
  libncurses5-dev subversion libsqlite3-dev libjansson-dev \
  libxml2-dev uuid-dev libedit-dev libsrtp2-dev libopus-dev \
  libcurl4-openssl-dev pkg-config ca-certificates libspeexdsp-dev \
  sox libsox-fmt-all fail2ban sngrep

# 3. Download seguro e extração
cd "${DOWNLOAD_DIR}"
echo -e "\n${BOLD}[2/7] Obtendo pacote oficial do Asterisk ${ASTERISK_VER}...${NC}"
ARCHIVE_FILE="asterisk-${ASTERISK_VER}.tar.gz"

if [ ! -f "${ARCHIVE_FILE}" ]; then
  echo "Baixando de: ${DOWNLOAD_URL}..."
  wget -q --show-progress -O "${ARCHIVE_FILE}" "${DOWNLOAD_URL}" || {
    echo -e "${YELLOW}Tentando espelho secundário oficial...${NC}"
    wget -q --show-progress -O "${ARCHIVE_FILE}" "https://downloads.asterisk.org/pub/telephony/asterisk/old-releases/asterisk-${ASTERISK_VER}.tar.gz"
  }
fi

# Validação do arquivo tarball
if [ ! -s "${ARCHIVE_FILE}" ]; then
  echo -e "${RED}❌ ERRO: O arquivo baixado está vazio ou corrompido.${NC}"
  rm -f "${ARCHIVE_FILE}"
  exit 1
fi

FILE_SHA256=$(sha256sum "${ARCHIVE_FILE}" | awk '{print $1}')
if [ "${FILE_SHA256}" != "${EXPECTED_SHA256,,}" ]; then
  echo -e "${RED}❌ ERRO CRÍTICO: SHA-256 do pacote Asterisk não confere com o valor esperado.${NC}" >&2
  rm -f "${ARCHIVE_FILE}"
  exit 1
fi
echo -e "${GREEN}✓ Integridade SHA-256 verificada: ${FILE_SHA256}${NC}"

# Extração
echo -e "\n${BOLD}[3/7] Extraindo fontes...${NC}"
rm -rf "asterisk-${ASTERISK_VER}"
tar -zxf "${ARCHIVE_FILE}"
cd "asterisk-${ASTERISK_VER}"

# 4. Resolução de pré-requisitos internos do Asterisk
echo -e "\n${BOLD}[4/7] Executando install_prereq oficial...${NC}"
if [ -f "contrib/scripts/install_prereq" ]; then
  contrib/scripts/install_prereq install || true
fi

# 5. Configuração e Habilitação de Módulos Críticos
echo -e "\n${BOLD}[5/7] Configurando compilação com PJSIP Bundled e WebRTC...${NC}"
./configure \
  --with-pjproject-bundled \
  --with-jansson \
  --with-ssl \
  --with-opus \
  --with-srtp \
  --with-crypto

make menuselect.makeopts

# Habilita categorias e módulos essenciais para o Enlace-PBX
menuselect/menuselect \
  --enable-category MENUSELECT_FORMATS \
  --enable-category MENUSELECT_CODECS \
  --enable-category MENUSELECT_RES_ARI \
  --enable-category MENUSELECT_RES_PJSIP \
  --enable res_pjsip \
  --enable res_pjsip_transport_websocket \
  --enable res_http_websocket \
  --enable res_srtp \
  --enable res_crypto \
  --enable res_ari \
  --enable res_ari_channels \
  --enable res_ari_bridges \
  --enable app_audiosocket \
  --enable res_audiosocket \
  --enable codec_opus \
  --enable format_wav \
  --enable format_mp3 \
  menuselect.makeopts

# 6. Compilação e Instalação
NCPU=$(nproc 2>/dev/null || echo 2)
echo -e "\n${BOLD}[6/7] Compilando Asterisk utilizando ${NCPU} threads...${NC}"
make -j"${NCPU}"
make install
make samples
make config
ldconfig

# Criação de usuário e permissões estritas
groupadd -r asterisk 2>/dev/null || true
useradd -r -g asterisk -d /var/lib/asterisk -s /usr/sbin/nologin -c "Asterisk PBX Daemon" asterisk 2>/dev/null || true
usermod -aG audio,dialout asterisk 2>/dev/null || true

mkdir -p /etc/asterisk /var/{lib,log,spool,run}/asterisk /var/spool/asterisk/recording /var/log/asterisk/cdr-csv
chown -R asterisk:asterisk /etc/asterisk /var/{lib,log,run,spool}/asterisk
# Provisionamento idempotente: backup e substituicao atomica apenas das secoes gerenciadas.
INSTALL_SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [ ! -f "${INSTALL_SCRIPT_DIR}/scripts/reconcile-asterisk-config.py" ]; then
  echo "ERRO: reconciliador Asterisk ausente. Execute a instalacao a partir do repositorio completo." >&2
  exit 1
fi
python3 "${INSTALL_SCRIPT_DIR}/scripts/reconcile-asterisk-config.py"

chown -R asterisk:asterisk /etc/asterisk /var/{lib,log,run,spool}/asterisk
chmod -R 750 /var/{lib,log,run,spool}/asterisk /etc/asterisk

# 7. Teste de Fumaça (Smoke Test) e Verificação de Inicialização
echo -e "\n${BOLD}[7/7] Inicializando e validando saúde do Asterisk...${NC}"
systemctl daemon-reload
systemctl enable asterisk
systemctl restart asterisk

sleep 3

# Smoke test
if command -v asterisk >/dev/null 2>&1; then
  VERSION_DETECTED=$(asterisk -rx "core show version" 2>/dev/null || echo "OFFLINE")
  if [[ "${VERSION_DETECTED}" == *"Asterisk"* ]]; then
    echo -e "${GREEN}✅ SUCESSO: Asterisk Core operacional:${NC} ${VERSION_DETECTED}"
  else
    echo "ERRO: Asterisk nao respondeu ao teste de inicializacao." >&2
    exit 1
  fi
else
  echo -e "${RED}❌ ERRO: Binário asterisk não encontrado em /usr/sbin/asterisk após a compilação.${NC}"
  echo -e "Procedimento de Rollback: Verifique /var/log/asterisk/messages e reinstale dependências com: apt-get install -f"
  exit 1
fi

echo -e "\n${GREEN}${BOLD}====================================================================${NC}"
echo -e "${GREEN}${BOLD}  ✅ Asterisk ${ASTERISK_VER} LTS instalado e pronto para o Enlace-PBX!    ${NC}"
echo -e "${GREEN}${BOLD}====================================================================${NC}"

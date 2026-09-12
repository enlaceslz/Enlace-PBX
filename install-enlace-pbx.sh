#!/bin/bash
# Script de Instalação do Asterisk 20 LTS (Enlace-PBX)
# Executar como root

set -e

echo "=========================================================="
echo "🚀 Compilação Automática do Asterisk 20 LTS (Enlace) 🚀"
echo "=========================================================="

if [ "$EUID" -ne 0 ]; then
  echo "ERRO: Rode como root"
  exit 1
fi

echo "📦 Instalando dependências de compilação..."
apt-get update
apt-get install -y build-essential git curl wget libnewt-dev libssl-dev \
    libncurses5-dev subversion libsqlite3-dev libjansson-dev \
    libxml2-dev uuid-dev libedit-dev libsrtp2-dev libopus-dev \
    libcurl4-openssl-dev pkg-config ca-certificates libspeexdsp-dev

cd /usr/src
echo "⬇️ Baixando Asterisk 20..."
ASTERISK_VER="20.17.0"
if [ ! -f "asterisk-${ASTERISK_VER}.tar.gz" ]; then
    wget -q --show-progress "https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-${ASTERISK_VER}.tar.gz" || \
    wget -q --show-progress "https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-20-current.tar.gz"
fi

if [ -f "asterisk-${ASTERISK_VER}.tar.gz" ]; then
    tar -zxvf "asterisk-${ASTERISK_VER}.tar.gz"
    cd asterisk-${ASTERISK_VER}
else
    tar -zxvf asterisk-20-current.tar.gz
    cd asterisk-20.*/
fi

echo "⚙️ Resolvendo dependências (install_prereq)..."
contrib/scripts/install_prereq install

echo "🔨 Compilando Asterisk 20 com PJSIP, WebRTC SRTP, Opus e AudioSocket..."
./configure --with-pjproject-bundled --with-jansson --with-ssl --with-opus --with-srtp
make menuselect.makeopts
menuselect/menuselect --enable-category MENUSELECT_FORMATS \
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

make -j$(nproc)
make install
make samples
make config
ldconfig

echo "🔐 Configurando Permissões e Diretórios (Enlace-PBX)..."
groupadd -r asterisk 2>/dev/null || true
useradd -r -g asterisk -d /var/lib/asterisk -s /usr/sbin/nologin -c "Asterisk PBX Daemon" asterisk 2>/dev/null || true
usermod -aG audio,dialout asterisk 2>/dev/null || true

mkdir -p /etc/asterisk /var/{lib,log,spool,run}/asterisk /var/spool/asterisk/recording
chown -R asterisk:asterisk /etc/asterisk /var/{lib,log,run,spool}/asterisk
chmod -R 750 /var/{lib,log,run,spool}/asterisk /etc/asterisk

echo "🚀 Iniciando o serviço Asterisk..."
systemctl enable asterisk
systemctl start asterisk

echo "=========================================================="
echo "✅ Asterisk 20 LTS Instalado e Rodando!"
echo "=========================================================="

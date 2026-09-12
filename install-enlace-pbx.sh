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
    libncurses5-dev subversion libsqlite3-dev build-essential libjansson-dev \
    libxml2-dev uuid-dev libedit-dev

cd /usr/src
echo "⬇️ Baixando Asterisk 20..."
wget https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-20-current.tar.gz
tar -zxvf asterisk-20-current.tar.gz
cd asterisk-20.*/

echo "⚙️ Resolvendo dependências (install_prereq)..."
contrib/scripts/install_prereq install

echo "🔨 Compilando Asterisk (Isso pode levar alguns minutos)..."
./configure --with-pjproject-bundled
make menuselect.makeopts
menuselect/menuselect --enable-category MENUSELECT_FORMATS \
                      --enable-category MENUSELECT_CODECS \
                      --enable-category MENUSELECT_RES_ARI \
                      --enable-category MENUSELECT_RES_PJSIP \
                      menuselect.makeopts

make -j$(nproc)
make install
make samples
make config
ldconfig

echo "🔐 Configurando Permissões Básicas (Enlace)..."
groupadd asterisk || true
useradd -r -d /var/lib/asterisk -g asterisk asterisk || true
usermod -aG audio,dialout asterisk
chown -R asterisk.asterisk /etc/asterisk /var/{lib,log,spool,run}/asterisk
chmod -R 750 /var/{lib,log,run,spool}/asterisk /etc/asterisk

echo "🚀 Iniciando o serviço Asterisk..."
systemctl enable asterisk
systemctl start asterisk

echo "=========================================================="
echo "✅ Asterisk 20 LTS Instalado e Rodando!"
echo "=========================================================="

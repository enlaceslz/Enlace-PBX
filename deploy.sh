#!/bin/bash
# Enlace-PBX Auto-Deploy Script for Debian/Ubuntu (Root)
# Executar como root: ./deploy.sh

set -e

echo "=========================================================="
echo "🚀 Iniciando o Deploy do Enlace-PBX (Debian/Ubuntu) 🚀"
echo "=========================================================="

# 1. Checagem de ROOT
if [ "$EUID" -ne 0 ]; then
  echo "❌ ERRO: Este script deve ser executado como root."
  echo "Use: sudo ./deploy.sh"
  exit 1
fi

echo "✅ Executando como ROOT."

# 2. Atualizando Pacotes e Instalando Dependências Básicas
echo "📦 Atualizando pacotes do sistema..."
apt-get update -y
apt-get install -y curl git build-essential ufw

# 3. Instalando Node.js (Versão 20 LTS)
if ! command -v node > /dev/null; then
    echo "⚙️ Instalando Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "✅ Node.js já instalado: $(node -v)"
fi

# 4. Instalando PM2 Globalmente
if ! command -v pm2 > /dev/null; then
    echo "⚙️ Instalando PM2 (Process Manager)..."
    npm install -g pm2
else
    echo "✅ PM2 já instalado."
fi

# 5. Instalando Dependências do Projeto
echo "📦 Instalando dependências NPM do Enlace-PBX..."
npm install

# 6. Compilando o Projeto para Produção
echo "🔨 Compilando a aplicação (Frontend + Backend)..."
npm run build

# 7. Configuração de Variáveis de Ambiente
echo "⚙️ Configuração de Ambiente"
if [ ! -f .env ]; then
    echo "Arquivo .env não encontrado. Criando um novo..."
    cp .env.example .env 2>/dev/null || touch .env
    
    read -p "Digite sua API Key do Google Gemini (ou Enter para pular): " gemini_key
    if [ ! -z "$gemini_key" ]; then
        echo "GEMINI_API_KEY=$gemini_key" >> .env
    fi
    
    # Podemos adicionar outras perguntas aqui futuramente (PostgreSQL, Asterisk IP, etc)
    read -p "Deseja compilar e instalar o Asterisk 20 LTS localmente nesta máquina agora? (s/n): " install_asterisk
    if [[ "$install_asterisk" =~ ^[Ss]$ ]]; then
        echo "🚀 Iniciando instalação silenciosa do Asterisk 20..."
        chmod +x install-enlace-pbx.sh
        ./install-enlace-pbx.sh || echo "⚠️ A instalação do Asterisk encontrou um erro, verifique os logs."
    fi
else
    echo "✅ Arquivo .env já existe. Mantendo configurações atuais."
fi

# 8. Firewall (UFW)
echo "🛡️ Configurando Firewall (UFW)..."
ufw allow 3000/tcp comment "Enlace-PBX Web/API"
ufw allow 5060/udp comment "Asterisk SIP"
ufw allow 10000:20000/udp comment "Asterisk RTP"
# ufw enable (Desativado no script automático para evitar queda de SSH. O usuário deve habilitar manualmente se desejar)
echo "✅ Portas 3000, 5060 e 10000-20000 permitidas no UFW."

# 9. Inicialização com PM2
echo "🚀 Iniciando o serviço Enlace-PBX com PM2..."
pm2 stop enlace-pbx 2>/dev/null || true
pm2 start dist/server.cjs --name "enlace-pbx"

echo "💾 Salvando configuração do PM2 para iniciar com o sistema..."
pm2 save
pm2 startup | grep "sudo env PATH" | bash || true

echo "=========================================================="
echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO! 🎉"
echo "=========================================================="
echo "🌐 Acesse a aplicação em: http://<IP_DO_SERVIDOR>:3000"
echo "📜 Para ver os logs em tempo real, use: pm2 logs enlace-pbx"
echo "=========================================================="

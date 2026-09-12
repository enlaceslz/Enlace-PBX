# Enlace-PBX 📞 🇧🇷

**A Plataforma Omnichannel & AI Gateway Definitiva. Simples, aberta e brasileira.**

O Enlace-PBX evoluiu de um núcleo **Asterisk 20 LTS** (Pure Open Source Core) para se tornar uma plataforma completa de comunicações unificadas, CRM Hub e orquestração de Inteligência Artificial de Voz. 

Nascida para democratizar o acesso à telefonia IP inteligente no Brasil, a plataforma unifica roteamento avançado, WebRTC, PJSIP, Omnichannel e agentes conversacionais (LLMs) em tempo real em uma interface moderna e segura.

## 🚀 Principais Recursos

- **Contact Center Omnichannel & CRM Hub:** Visão 360 do cliente unindo voz, WhatsApp e chat. Integração direta (OAuth) com HubSpot, Pipedrive e RDStation.
- **AI Gateway & Policy Engine:** Orquestre agentes de atendimento virtuais (Gemini, 9Router, Vertex). O motor RAG acopla-se ao *Customer Memory* (memória do CRM), prevendo as necessidades do chamador, tudo protegido por uma validação estrita de funções (RBAC no *function calling*).
- **QA Automático (LLM-as-a-Judge):** Supervisor IA invisível que lê as transcrições das chamadas e calcula risco de churn, pontuação de atendimento e intenção (intent).
- **Motor Multi-Tenant & Snapshots:** Separação estrita de dados (`tenant_id`) por clientes empresariais. O Quick Setup Wizard permite o provisionamento em massa de ramais/troncos com proteção de *rollback* via instantâneos de memória (Snapshots).
- **Webphone Softphone Integrado:** Cliente WebRTC moderno (Opus codec) com discador, suporte a tons DTMF brasileiros (Web Audio API), e chamadas diretas pelo navegador.
- **Discagem Inteligente e Dialplan BR:** Suporte nativo ao plano de numeração nacional (Nono dígito, DDD `_0XX9XXXXXXXX`, rotas 0800, etc.).
- **Auditoria e Conformidade LGPD:** Trilha de auditoria imutável (RBAC) com logs detalhados de acessos e acionamento de inteligências.
- **NOC / Operation Dashboard:** Monitoramento em tempo real do tráfego telefônico e consumo de agentes, visualizando canais ativos simultâneos e infraestrutura.

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite.
- **Backend:** Node.js, Express, WebSockets, Google GenAI SDK (`@google/genai`).
- **Telefonia:** Asterisk 20 LTS, SIP/PJSIP, WebRTC, ARI (Asterisk REST Interface).
- **Tema Visual e Design System:** Interface *Clean Light Canvas* focada em operações de NOC (Network Operations Center). Tema claro de alto contraste (slate-50/blue-600) para máxima legibilidade técnica.
- **Console Asterisk CLI Interativo:** Terminal web conectado ao núcleo do Asterisk (via `asterisk -rvvv`).

## 📦 Estrutura do Projeto

```text
├── src/
│   ├── components/
│   │   ├── views/          # Módulos (Omnichannel, CRM Hub, Setup, Ramais, IA, NOC)
│   │   ├── Navbar.tsx      # Barra de navegação e seletor de tenants
│   │   ├── Sidebar.tsx     # Menu lateral categorizado (NOC, CRM, Telefonia, IA)
│   │   └── WebphoneModal.tsx # Softphone WebRTC embutido
│   ├── types/
│   │   └── pbx.ts          # Definições de tipos do domínio
│   ├── App.tsx             # Orquestrador de visualizações e roteamento
│   └── main.tsx            # Ponto de entrada do React
├── server.ts               # Servidor Express Full-stack (APIs REST) + Vite
├── server/
│   ├── db.ts               # Motor de estado multi-tenant e simulador DB (PostgreSQL)
│   ├── geminiService.ts    # Conector do Gemini, Policy Engine e Memória de Cliente
│   └── asteriskService.ts  # Adaptador e simulador do Asterisk ARI/AMI
└── install-enlace-pbx.sh   # Script gerado de compilação pura para o servidor Linux
```


## ⚙️ Procedimentos de Instalação e Deploy (Produção)

O **Enlace-PBX Enterprise** pode ser instalado em qualquer servidor dedicado ou VPS rodando **Debian 12 (Bookworm)** ou **Ubuntu 22.04/24.04 LTS**.

### 🖥️ Requisitos Recomendados de Infraestrutura
- **CPU:** 2 vCPUs ou mais (para compilação rápida do Asterisk e processamento de áudio DSP).
- **Memória RAM:** 4 GB (mínimo de 2 GB com Swap ativado).
- **Armazenamento:** 25 GB SSD (espaço para gravações de áudio WAV e logs rotacionados).
- **Rede:** 1 Endereço IPv4 Público estático (para sinalização SIP/PJSIP e NAT Traversal).
- **Domínio FQDN:** Ex: `pbx.suaempresa.com.br` com apontamento DNS tipo `A` direcionado ao IP público.

---

### 🛡️ Matriz de Portas e Firewall (UFW / Edge Router)

| Porta / Protocolo | Serviço / Função | Observações |
| :--- | :--- | :--- |
| `22/tcp` | SSH (Administração) | Acesso seguro remoto ao servidor |
| `80/tcp` | HTTP (Let's Encrypt ACME) | Necessário para emissão e renovação automática SSL |
| `443/tcp` | HTTPS (Web UI, PWA & Meta Webhook) | **Obrigatório** para PWA, Webphone e API Oficial do WhatsApp |
| `5060/udp` | Asterisk SIP PJSIP | Sinalização VoIP padrão (telefones IP e operadoras) |
| `5061/tcp` | Asterisk SIP TLS Seguro | Sinalização PJSIP criptografada com TLS |
| `8089/tcp` | Asterisk WebRTC WSS | WebSocket seguro para o Webphone integrado |
| `10000-20000/udp` | Asterisk RTP Media Pool | Fluxos de áudio de voz bidirecionais (G.711, Opus) |
| `51820/udp` | WireGuard VPN | Túneis ponto-a-ponto para interconexão de filiais |

---

### 🚀 Método 1: Deploy Automatizado com `deploy.sh` (Recomendado)

O script `deploy.sh` realiza todo o processo de forma interativa, segura e idempotente:
1. Instala pacotes do sistema, NGINX, Certbot e Node.js 20 LTS.
2. Detecta automaticamente o IP público e solicita o domínio FQDN.
3. Compila e otimiza os assets do Frontend e Backend (`npm run build`).
4. Compila opcionalmente o Asterisk 20 LTS com módulos PJSIP, Opus, WebRTC e AudioSocket.
5. Configura o NGINX Reverse Proxy com cabeçalhos de WebSocket e emite o certificado SSL Let's Encrypt.
6. Aplica regras estritas no Firewall UFW (preservando o SSH).
7. Inicializa a aplicação com **PM2** garantindo reinicialização automática com o sistema operacional.

```bash
# 1. Acesse seu servidor via SSH como root
ssh root@seu-servidor-ip

# 2. Clone ou transfira o repositório para /opt/enlace-pbx
git clone https://github.com/enlace-telecom/enlace-pbx.git /opt/enlace-pbx
cd /opt/enlace-pbx

# 3. Dê permissão e execute o instalador
chmod +x deploy.sh install-enlace-pbx.sh
./deploy.sh
```

---

### 🛠️ Método 2: Deploy Passo a Passo Manual

Se você preferir executar cada etapa manualmente:

#### 1. Instalar Dependências do Sistema e Node.js 20
```bash
apt-get update -y && apt-get install -y curl git build-essential ufw nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2
```

#### 2. Compilar o Asterisk 20 LTS Puro
```bash
chmod +x install-enlace-pbx.sh
./install-enlace-pbx.sh
```

#### 3. Configurar e Compilar o Enlace-PBX
```bash
cp .env.example .env
nano .env # Configure GEMINI_API_KEY, DOMAIN e IP público
npm install --legacy-peer-deps
npm run build
```

#### 4. Configurar o NGINX com Proxy WebSocket
Crie o arquivo `/etc/nginx/sites-available/enlace-pbx`:
```nginx
server {
    listen 80;
    server_name pbx.suaempresa.com.br;
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8089/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```
Ative o site e emita o certificado HTTPS:
```bash
ln -sf /etc/nginx/sites-available/enlace-pbx /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
certbot --nginx -d pbx.suaempresa.com.br --redirect
```

#### 5. Inicializar o Processo com PM2
```bash
pm2 start dist/server.cjs --name "enlace-pbx"
pm2 save
pm2 startup
```

---

### 📋 Checklist de Validação Pós-Deploy

Após o deploy, acesse o painel em `https://pbx.suaempresa.com.br` e verifique:
1. **Infraestrutura e SSL:** Menu *Configurações > Host, Rede & SSL* -> Certifique-se de que o certificado está marcado como **Válido** e que os testes de Webphone, PWA e WhatsApp exibem status **OK**.
2. **Webphone WebRTC:** Clique no ícone de telefone no topo direito e confirme a permissão de microfone. Faça uma chamada de teste para o ramal de teste `9001`.
3. **Agentes de IA (MaIA):** Certifique-se de que `GEMINI_API_KEY` está configurada no `.env` para habilitar a transcrição e o atendimento inteligente em tempo real.
4. **WhatsApp Cloud API:** Cadastre a URL `https://pbx.suaempresa.com.br/api/v1/webhooks/whatsapp` e o Token de Verificação no Meta for Developers.

**Comandos Úteis de Operação:**
- Ver logs em tempo real: `pm2 logs enlace-pbx`
- Reiniciar a aplicação: `pm2 restart enlace-pbx`
- Acessar o console do Asterisk: `asterisk -rvvvv`
- Recarregar módulos do Asterisk: `asterisk -rx "core reload"`
- Verificar status do firewall: `ufw status verbose`

---

## 🛠️ Ambiente de Desenvolvimento (Local)

Se você deseja rodar o projeto localmente para testes ou edições:

```bash
# 1. Instale as dependências
npm install

# 2. Inicie o servidor de desenvolvimento com Hot-Reload (Frontend + Backend)
npm run dev
```
O projeto estará disponível em `http://localhost:3000`.

## 🔒 Segurança e API Keys
O Enlace-PBX opera com arquitetura Server-Side (BFF). As chaves de API, segredos do banco de dados e senhas ARI do Asterisk devem permanecer **exclusivamente no servidor backend**. O frontend consome apenas rotas seguras `/api/v1/`.

## 📜 Licença
Projeto Open Source / Comercial sob a gestão corporativa Enlace Telecom.

---
Feito com 💚 no Brasil.

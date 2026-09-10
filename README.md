# Enlace-PBX 📞 🇧🇷

**Telefonia Inteligente. Simples, aberta e brasileira.**

O Enlace-PBX é uma plataforma avançada de comunicações unificadas e inteligência artificial de voz (Voice AI), construída sobre a robustez do **Asterisk 20 LTS** (Pure Open Source Core) e impulsionada pela **API Google Gemini**. 

Nascida para democratizar o acesso à telefonia IP inteligente no Brasil, a plataforma unifica roteamento avançado, WebRTC, PJSIP, e agentes conversacionais em tempo real em uma interface moderna e segura.

## 🚀 Principais Recursos

- **Webphone Softphone Integrado:** Cliente WebRTC moderno (Opus codec) com discador, suporte a tons DTMF brasileiros (Web Audio API), cancelamento de eco e chamadas diretas pelo navegador.
- **Integração Nativa Asterisk 20 LTS:** Compatibilidade completa com `res_pjsip`, `app_audiosocket`, e Asterisk REST Interface (ARI). Monitoramento em tempo real de bridges e canais.
- **Agentes de Voz Inteligentes (MaIA):** Crie e orquestre agentes de atendimento virtuais impulsionados pelo Google Gemini com suporte a Barge-in (interrupção de voz), TTS neural e chamadas de funções (Function Calling).
- **Discagem Inteligente e Dialplan BR:** Suporte nativo ao plano de numeração nacional (Nono dígito, DDD `_0XX9XXXXXXXX`, rotas 0800, etc.).
- **Centrais de Atendimento (ACD):** Gestão de Filas e Grupos de Toque com métricas de SLA, tempo médio de espera (TME) e estratégias de distribuição (Round Robin, Ring All).
- **Auditoria e Conformidade LGPD:** Trilha de auditoria imutável (RBAC) com logs detalhados de acessos a dados sensíveis, garantindo privacidade e controle de acesso corporativo.
- **Dashboard Analítico:** Visão executiva com dezenas de indicadores operacionais (Canais ativos, Minutos processados, Economia estimada via IA, Uso de CPU/Memória).

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite.
- **Backend:** Node.js, Express, WebSockets, Google GenAI SDK (`@google/genai`).
- **Telefonia:** Asterisk 20 LTS, SIP/PJSIP, WebRTC, ARI (Asterisk REST Interface).
- **Design System:** Tema escuro profissional (`slate-950`) focado em legibilidade técnica, utilizando tipografia *Plus Jakarta Sans* e *JetBrains Mono*.

## 📦 Estrutura do Projeto

```text
├── src/
│   ├── components/
│   │   ├── views/          # Módulos principais (Dashboard, Ramais, IA, Core)
│   │   ├── Navbar.tsx      # Barra de navegação e seletor de tenants
│   │   ├── Sidebar.tsx     # Menu lateral de navegação
│   │   └── WebphoneModal.tsx # Softphone WebRTC embutido
│   ├── lib/
│   │   └── dtmf.ts         # Sintetizador de áudio DTMF (Frequências Brasileiras)
│   ├── types/
│   │   └── pbx.ts          # Definições de tipos do domínio de telefonia
│   ├── App.tsx             # Orquestrador de visualizações e roteamento
│   └── main.tsx            # Ponto de entrada do React
├── server.ts               # Servidor Express Full-stack + Vite Middleware
├── install-enlace-pbx.sh   # Script gerado de compilação pura para o servidor Linux
└── metadata.json           # Configurações do Applet
```

## ⚙️ Como Executar

### 1. Requisitos
- Node.js (v18+)
- Npm ou Yarn
- (Opcional) Chave da API do Google Gemini (`GEMINI_API_KEY`) para habilitar o módulo de Voz IA via Backend.

### 2. Instalação e Execução

```bash
# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento (Frontend + Backend)
npm run dev
```
O projeto estará disponível em `http://localhost:3000`.

### 3. Deploy de Produção

```bash
# Compile a aplicação e o servidor
npm run build

# Inicie o servidor em modo de produção
npm start
```

## 🐧 Configuração do Servidor Asterisk (Linux)

Para conectar o painel a um servidor Asterisk real, utilize o script de instalação oficial gerado na aba **Asterisk Core > Instalador Linux**.

Ele executa a compilação pura do Asterisk 20 LTS, Opus e AudioSocket para Ubuntu 22.04/24.04 ou Debian 12:

```bash
curl -fsSL https://app.enlacepbx.com.br/install.sh | sudo bash
```

## 🔒 Segurança e API Keys
O Enlace-PBX opera com arquitetura Server-Side (BFF). As chaves de API, segredos do banco de dados e senhas ARI do Asterisk devem permanecer **exclusivamente no servidor backend**. O frontend consome apenas rotas seguras `/api/v1/`.

## 📜 Licença
Projeto Open Source / Comercial sob a gestão corporativa Enlace.

---
Feito com 💚 no Brasil.

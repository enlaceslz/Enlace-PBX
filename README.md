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


## ⚙️ Instalação e Deploy (Produção)

Preparamos um script automatizado de deploy, desenhado para rodar em modo `root` em qualquer VPS ou Máquina Virtual rodando **Debian** (ou Ubuntu). 

O script age de forma prudente e autônoma: ele instala o Node.js (caso não exista), compila o projeto, configura variáveis de ambiente (via prompt interativo), libera as portas no firewall (UFW) e sobe a aplicação utilizando o **PM2** (garantindo que o sistema reinicie automaticamente com a máquina).

### Passo a Passo

1. Conecte-se via SSH em seu servidor Debian.
2. Certifique-se de estar como root (use `sudo su`).
3. Clone ou faça o download deste repositório na pasta desejada (ex: `/opt/enlace-pbx`).
4. Dê permissão e execute o script de deploy:

```bash
chmod +x deploy.sh
./deploy.sh
```

5. Durante a execução, o script pode solicitar a sua chave de API do Gemini (opcional) para ativar os recursos de IA.
6. **Pronto!** O script entregará um link `http://<IP_DO_SERVIDOR>:3000` com a plataforma 100% no ar.

**Comandos Úteis Pós-Deploy:**
- Ver logs em tempo real: `pm2 logs enlace-pbx`
- Reiniciar o sistema: `pm2 restart enlace-pbx`
- Parar o sistema: `pm2 stop enlace-pbx`

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
Projeto Open Source / Comercial sob a gestão corporativa Enlace.

---
Feito com 💚 no Brasil.

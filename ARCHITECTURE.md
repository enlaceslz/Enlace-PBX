# Enlace-PBX Enterprise: Documentação de Arquitetura de Software v20.17.0

O **Enlace-PBX Enterprise** é estruturado sobre uma arquitetura modular, escalável e de alta disponibilidade combinando **Single Page Application (SPA / PWA)** em React 19, um **Backend-for-Frontend (BFF)** corporativo em Node.js / Express, um núcleo de telecomunicações puro **Asterisk 20 LTS** e um **AI Gateway Cognitivo** integrado ao Google Gemini.

Criado e mantido por **André LJP** e **Enlace Telecom** (São Luís/MA, Brasil — [enlace.slz.br](https://enlace.slz.br)).

---

## 1. Visão Geral da Arquitetura (Topology)

A arquitetura do sistema adota a separação rigorosa de responsabilidades entre apresentação, orquestração de negócios, sinalização de mídia e inteligência artificial:

```text
                               ┌──────────────────────────────────────────────┐
                               │             Navegador Web / PWA              │
                               │  (React 19 + Tailwind v4 + WebRTC + WSS)     │
                               └──────────────────────┬───────────────────────┘
                                                      │ HTTPS (443) / WSS
                                                      ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       NGINX Reverse Proxy                                        │
│               ├─ Terminação SSL / TLS (Let's Encrypt Certbot Automático)                         │
│               ├─ Proxy Pass HTTP (3000) ──> Express BFF Node.js                                  │
│               ├─ Proxy Pass WSS (8089) ───> Asterisk WebRTC (res_pjsip_transport_websocket)      │
│               └─ Segurança de Borda: Rate Limit, Headers Seguros e Mitigação DDoS                │
└──────────────────────────────────────┬───────────────────────────────┬───────────────────────────┘
                                       │                               │
                                       ▼                               ▼
┌──────────────────────────────────────────────────────┐  ┌────────────────────────────────────────┐
│         Enlace-PBX BFF (Node.js 20/22 Express)       │  │        Asterisk 20.17 LTS Core         │
│  ├─ Multi-Tenant Policy Engine & RBAC                │  │  ├─ res_pjsip (Endpoints & Trunks)    │
│  ├─ Google Gemini AI Gateway (@google/genai)         │  │  ├─ res_http_websocket (WebRTC WSS)   │
│  ├─ Meta Cloud WhatsApp Webhooks & Omnichannel       │  │  ├─ res_srtp & res_crypto (DTLS-SRTP) │
│  ├─ Gestor de Dialplan, URAs e Campanhas Preditivas  │  │  ├─ app_audiosocket (Streaming ARI)   │
│  ├─ Motor de Faturamento, Tarifação & PDF Engine     │  │  ├─ app_queue (Filas ACD & SLA)       │
│  ├─ Snapshots & Rollback de Configuração 1-Clique    │  │  └─ cdr_adaptive_odbc (Bilhetagem)    │
│  └─ SSE Telemetry Stream (Tempo Real para o React)   │  └───────────────────┬────────────────────┘
└──────────────────────────┬───────────────────────────┘                      │
                           │ ARI REST & WebSocket (8088)                      │ RTP Audio (10000-20000)
                           └──────────────────────────────────────────────────┘
```

---

## 2. Camadas do Sistema

### 2.1 Frontend (SPA & PWA)
- **Framework:** React 19 executado via Vite, com transições em Motion (Framer Motion).
- **Estilização:** Tailwind CSS v4 com paleta equilibrada de alta densidade informativa para consoles NOC e Call Centers.
- **Iconografia:** Lucide-React garantindo uniformidade visual.
- **Gráficos & Visualização:** Recharts para curvas de tráfego, MOS (Mean Opinion Score), volume de filas e SLA.
- **Webphone Integrado:** Softphone WebRTC embutido com suporte a chamadas diretas de áudio/vídeo, DTMF, transferência assistida/cega, mudo e espera.
- **PWA (Progressive Web App):** Instalável no desktop e mobile, com suporte a Service Workers e notificações push.

### 2.2 Backend-for-Frontend (BFF)
- **Servidor:** Express rodando no Node.js 20 LTS ou 22 LTS, unificando endpoints de dados e middleware Vite em desenvolvimento.
- **Compilação de Produção:** `esbuild` empacotando o `server.ts` em `dist/server.cjs` com resolução de módulos nativa e sourcemaps para debugging.
- **Segurança:** 
  - `Helmet` para injeção de cabeçalhos Content Security Policy e proteção XSS.
  - `CORS` restrito para origens autorizadas.
  - `express-rate-limit` para proteção contra força bruta nas rotas de autenticação.
  - Autenticação por tokens JWT (JSON Web Tokens) assinados com rotação segura.
  - Segredos (chaves de API do Google Gemini, credenciais de troncos SIP, tokens de webhook Meta) residentes exclusivamente no ambiente do servidor.

### 2.3 Núcleo de Telefonia (Asterisk 20 LTS Puro)
- **PJSIP (Teluu):** Gestão de endpoints SIP locais, troncos corporativos e softphones.
- **WebRTC WSS:** Conexões seguras na porta 8089 com certificados TLS e negociação ICE/STUN/TURN.
- **AudioSocket:** Módulo de streaming de áudio PCM de baixa latência conectando canais de voz diretamente ao agente de IA em milissegundos.
- **ARI (Asterisk REST Interface):** Controle programático de canais em Stasis para direcionamento de chamadas dinâmicas.

### 2.4 Inteligência Artificial Cognitiva (Google Gemini)
- **SDK Oficial:** `@google/genai` utilizando modelos `gemini-flash-latest`, `gemini-2.5-flash` e `gemini-3.1-flash-live-preview`.
- **Customer Memory:** Enriquecimento do prompt do assistente com dados de histórico do cliente recuperados em tempo real do CRM Hub antes do início do diálogo.
- **RAG Semântico:** Busca contextual em bases de conhecimento corporativas pré-carregadas.
- **Supervisor LLM-as-a-Judge:** Análise pós-chamada gerando resumo executivo, sentimento do cliente, identificação de objeções e nota de atendimento.

---

## 3. Mapeamento Estrutural dos 27 Módulos de Interface (`/src/components/views/`)

A interface é segmentada em 6 áreas funcionais:

### Área 1: Operações e NOC em Tempo Real
1. **`DashboardView.tsx`:** Painel executivo consolidado com gráficos de fluxo de chamadas, taxa de atendimento, MOS e ocupação de troncos.
2. **`OperationDashboardView.tsx`:** Console NOC operacional com monitoramento de canais ativos ao vivo, uso de CPU, memória e status dos serviços essenciais.
3. **`VpnMonitoringDashboard.tsx`:** Telemetria de túneis WireGuard e ZeroTier entre matriz e filiais, latência média e perda de pacotes.
4. **`NetworkSecurityView.tsx`:** Painel de segurança com Fail2ban, bloqueio de varreduras SIP maliciosas (SIPVicious), regras UFW e IPs banidos.

### Área 2: Telefonia SIP e Infraestrutura de Mídia
5. **`ExtensionsView.tsx`:** Cadastro e gestão de ramais SIP/PJSIP e WebRTC, senhas seguras, codecs (Opus, G.722, G.711a/u) e status de registro.
6. **`TrunksView.tsx`:** Interconexão com operadoras VoIP nacionais, troncos com registro ou IP fixo, opções de NAT e codecs.
7. **`DidsView.tsx`:** Gestão de DIDs (números virtuais de entrada), mapeamento de DDDs, portabilidade e roteamento direto.
8. **`RoutesView.tsx`:** Plano de discagem E.164 brasileiro, rotas de saída com LCR (Least Cost Routing), rotas de contingência e rotas de entrada.
9. **`AsteriskCoreView.tsx`:** Terminal Asterisk CLI interativo (`asterisk -rvvvv`), status em tempo real de PJSIP e recarga segura de dialplan.

### Área 3: Contact Center e Distribuição de Chamadas
10. **`QueuesAndGroupsView.tsx`:** Filas de atendimento ACD com estratégias de distribuição (ringall, roundrobin, leastrecent), agentes, pausa e SLA.
11. **`CampaignsView.tsx`:** Gerenciador de campanhas ativas de discagem (Preditiva e Power), listas de contatos, taxa de abandono e relatórios.
12. **`IvrView.tsx`:** Editor visual de URA (IVR Flow Builder) multinível arrastar-e-soltar, com simulador interativo e exportação de dialplan.
13. **`OmnichannelView.tsx`:** Console integrado de atendimento multicanal (Voz, WhatsApp oficial via Meta Cloud API e Webchat).

### Área 4: Relacionamento e Inteligência Artificial
14. **`CrmHubView.tsx`:** Conexão e sincronização bidirecional com HubSpot, Pipedrive, RD Station e Salesforce via Webhooks.
15. **`CrmContactsView.tsx`:** Gestão centralizada de contatos, histórico de chamadas vinculadas e visualização 360° do cliente.
16. **`AiGatewayView.tsx`:** Configuração dos agentes MaIA (Google Gemini), definição de personas, prompts de voz, ferramentas (Function Calling) e RAG.

### Área 5: Bilhetagem, Faturamento e Auditoria
17. **`CdrAndRecordingsView.tsx`:** Bilhetagem completa (CDR), busca avançada com filtros, player de gravações WAV/MP3 com transcrição e geração de relatórios.
18. **`BillingView.tsx`:** Tarifador por minuto, planos pré e pós-pago, controle de saldo, faturas e exportação de relatórios em PDF com logotipo oficial.
19. **`SystemLogsView.tsx`:** Trilha de auditoria criptográfica e logs do sistema em conformidade com as exigências da LGPD.

### Área 6: Governança, Infraestrutura e Administração
20. **`HealthCheckView.tsx`:** Painel de diagnóstico de saúde de todos os componentes do ecossistema (Node.js, Asterisk, PostgreSQL, Redis, Gemini).
21. **`InfraSettingsView.tsx`:** Configurações de infraestrutura de rede, IP público (WAN), rede local (LAN), NAT Traversal e certificados SSL.
22. **`BackupRestoreView.tsx`:** Gestão de Snapshots instantâneos, exportação/importação de backups e restauração com rollback em 1 clique.
23. **`QuickSetupView.tsx`:** Assistente wizard para provisionamento massivo e configuração rápida de novas instâncias do Enlace-PBX.
24. **`AdminAndSecurityView.tsx`:** Controle de acesso baseado em funções (RBAC), gestão de usuários, empresas multi-tenant e tokens de API.
25. **`SettingsView.tsx`:** Parâmetros globais da plataforma, dados cadastrais e preferências de idioma e fuso horário.
26. **`HelpManualView.tsx`:** Manual oficial do administrador, tutoriais passo a passo, guias de deploy Linux e FAQ técnico.
27. **`LoginView.tsx`:** Tela de login corporativa com autenticação JWT e mitigação de ataques por força bruta.

---

## 4. Segurança de Rede e Matriz de Portas

| Porta / Protocolo | Serviço | Finalidade |
| :--- | :--- | :--- |
| `22/tcp` | SSH | Administração remota segura via chave SSH |
| `80/tcp` | HTTP ACME | Desafios de renovação de certificados SSL Let's Encrypt |
| `443/tcp` | HTTPS | Acesso Web, PWA, Webphone, Webhooks Meta WhatsApp |
| `5060/udp` | SIP UDP | Sinalização PJSIP padrão de telefones IP e troncos |
| `5061/tcp` | SIP TLS | Sinalização PJSIP criptografada |
| `8089/tcp` | WebRTC WSS | WebSocket seguro do Asterisk para o Webphone no navegador |
| `10000-20000/udp` | RTP Media | Fluxos bidirecionais de áudio de voz |
| `51820/udp` | WireGuard | Túnel VPN de alta velocidade para comunicação inter-filiais |

---

## 5. Conformidade e Governança LGPD
- **Mascaramento de Dados Sensíveis:** Mascaramento automático de dígitos de cartões de crédito e CPFs em transcrições e logs do sistema.
- **Trilha de Auditoria Imutável:** Todos os acessos a gravações telefônicas registram o usuário solicitante, endereço IP, justificativa e carimbo de data/hora.
- **Retenção Configurável:** Políticas automáticas de expurgo de arquivos de áudio após o prazo legal estabelecido pela empresa.


# Enlace-PBX Enterprise: Documentação de Arquitetura de Software v20.17.0 (Produção)

O **Enlace-PBX Enterprise** é estruturado sobre uma arquitetura modular, multi-tenant e de alta disponibilidade combinando **Single Page Application (SPA / PWA)** em React 19, um **Backend-for-Frontend (BFF)** corporativo em Node.js / Express, banco de dados **PostgreSQL 15+ com Row-Level Security (RLS)**, núcleo de telecomunicações puro **Asterisk 20 LTS** e um **AI Gateway Cognitivo** integrado ao Google Gemini.

Criado e mantido por **André LJP** e **Enlace Telecom** (São Luís/MA, Brasil — [enlace.slz.br](https://enlace.slz.br)).

---

## 1. Visão Geral da Arquitetura (Topology)

A arquitetura do sistema adota a separação rigorosa de responsabilidades entre apresentação, orquestração de negócios, persistência isolada por tenant, sinalização de mídia e inteligência artificial:

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
│  ├─ Auth JWT + SSE Tickets + RBAC + TenantContext    │  │  ├─ res_pjsip (Endpoints & Trunks)    │
│  ├─ EncryptionService AES-256-GCM + Key Rotation     │  │  ├─ res_http_websocket (WebRTC WSS)   │
│  ├─ Google Gemini AI Gateway (@google/genai)         │  │  ├─ res_srtp & res_crypto (DTLS-SRTP) │
│  ├─ Meta Cloud WhatsApp (rawBody HMAC + Idempotency) │  │  ├─ app_audiosocket (Streaming ARI)   │
│  ├─ PostgreSQL 15+ (Role enlace_app + RLS Policies)  │  │  ├─ app_queue (Filas ACD & SLA)       │
│  ├─ Sondas /health/{live,ready/web,ready/pbx,deps}   │  │  └─ AMI (5038) & ARI (8088) localhost │
│  └─ Trilha LGPD Imutável com Cadeia SHA-256          │  └───────────────────┬────────────────────┘
└──────────────────────────┬───────────────────────────┘                      │
                           │ ARI REST & WebSocket (8088) / AMI (5038)         │ RTP Audio (10000-20000)
                           └──────────────────────────────────────────────────┘
```

---

## 2. Camadas do Sistema

### 2.1 Frontend (SPA & PWA)
- **Framework:** React 19 executado via Vite 6, com transições em Motion (Framer Motion).
- **Estilização:** Tailwind CSS v4 com paleta equilibrada de alta densidade informativa para consoles NOC e Call Centers.
- **Iconografia & Gráficos:** Lucide-React e Recharts para curvas de tráfego, MOS, volume de filas e SLA.
- **Webphone Integrado (`sip.js`):** Softphone WebRTC embutido com suporte a áudio HD (Opus/G.722/G.711), DTMF, transferência assistida/cega, mudo e espera.
- **Segurança no Cliente:**
  - Registro do Service Worker (`/sw.js`) exclusivamente via módulo ES (`src/main.tsx`), sem scripts inline no `index.html`.
  - Interceptor `installAuthFetchInterceptor()` (`src/utils/api.ts`) injetando `Authorization: Bearer <token>` somente em chamadas same-origin `/api/v1/*`, instalado de forma resiliente via `Object.defineProperty` com verificação de descritor e fallback seguro para ambientes onde `window.fetch` é somente getter.
  - Exportações de arquivos sensíveis (logs, relatórios) via `fetch` autenticado + `Blob` (sem `window.open`).

### 2.2 Backend-for-Frontend (BFF)
- **Servidor:** Express 4 sobre `http.createServer(app)` em Node.js 20/22 LTS, carregando `.env` automaticamente via `import 'dotenv/config'` na inicialização de `server.ts`. Em desenvolvimento, o HMR do Vite compartilha o mesmo servidor HTTP (evitando conflito na porta `24678`) e respeita `DISABLE_HMR=true`.
- **Encerramento Gracioso:** Tratamento de `SIGTERM`/`SIGINT` fechando `viteServer` e encerrando conexões `keep-alive`/SSE pendentes via `closeAllConnections()` com failsafe de 1,5s para reinicializações rápidas sem retenção de porta.
- **Compilação de Produção:** `esbuild` empacotando `server.ts` em `dist/server.cjs` com sourcemaps.
- **Persistência & Isolamento (PostgreSQL + RLS):**
  - Pool gerenciado em `server/infrastructure/postgres/client.ts` operando com a role restrita `enlace_app` (`NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`).
  - Todas as tabelas multi-tenant operam sob políticas Row-Level Security (RLS) ativadas via transações `executeTenantScoped` e `executeGlobalScoped`.
  - `DatabaseMigrator` aplica migrações versionadas com `pg_advisory_lock`, checksum SHA-256 e aborta o boot em produção (*fail-closed*) em caso de falha.
- **Segurança HTTP & API:**
  - `Helmet` com CSP estrita em produção: `script-src 'self'` (sem `unsafe-inline` nem `unsafe-eval`), `object-src 'none'`, `hsts`, `frameguard: sameorigin`, `noSniff` e `connect-src` restrito.
  - `CORS` com lista explícita `CORS_ALLOWED_ORIGINS` em produção (proibido `*`), suportando `x-tenant-id`, `x-target-tenant-id` e `x-request-id`, e retornando `HTTP 403` para origens não autorizadas.
  - Rate limiting segmentado: `apiLimiter` (1000 req/15min em `/api/`) e `authLimiter` (10 req/h exclusivamente em `/api/v1/auth/login`).
  - Middleware global `/api/v1` exigindo JWT + `TenantContext` em todas as rotas, com exceção estrita apenas para `/api/v1/auth/login` e `/api/v1/webhooks/whatsapp`.
  - Tratamento global de erros sanitizado em produção (sem exposição de stack traces ou detalhes internos em respostas `HTTP 500`).

### 2.3 Núcleo de Telefonia (Asterisk 20 LTS Puro)
- **PJSIP (Teluu):** Gestão de endpoints SIP locais, troncos corporativos e softphones.
- **WebRTC WSS:** Conexões seguras na porta 8089 com certificados TLS e negociação ICE/STUN/TURN/DTLS-SRTP.
- **AMI & ARI:** Credenciais geradas criptograficamente e sincronizadas entre `.env`, `manager.conf` e `ari.conf`, com bind estrito em `127.0.0.1` e sondas reais `pingAmi()` / `pingAri()`.
- **AudioSocket:** Streaming de áudio PCM de baixa latência conectando canais de voz ao agente cognitivo MaIA.

### 2.4 Inteligência Artificial Cognitiva (Google Gemini)
- **SDK Oficial:** `@google/genai` utilizando modelos `gemini-flash-latest`, `gemini-2.5-flash` e `gemini-3.1-flash-live-preview`.
- **Customer Memory & RAG:** Enriquecimento contextual com histórico do CRM e bases de conhecimento corporativas.
- **Supervisor LLM-as-a-Judge:** Avaliação pós-chamada gerando resumo executivo, sentimento, risco de churn e nota de qualidade.

---

## 3. Mapeamento Estrutural dos 27 Módulos de Interface (`/src/components/views/`)

A interface é segmentada em 6 áreas funcionais:
1. **Operações e NOC em Tempo Real:** `DashboardView.tsx`, `OperationDashboardView.tsx`, `VpnMonitoringDashboard.tsx`, `NetworkSecurityView.tsx`.
2. **Telefonia SIP e Infraestrutura de Mídia:** `ExtensionsView.tsx`, `TrunksView.tsx`, `DidsView.tsx`, `RoutesView.tsx`, `AsteriskCoreView.tsx`.
3. **Contact Center e Distribuição de Chamadas:** `QueuesAndGroupsView.tsx`, `CampaignsView.tsx`, `IvrView.tsx`, `OmnichannelView.tsx`.
4. **Relacionamento e Inteligência Artificial:** `CrmHubView.tsx`, `CrmContactsView.tsx`, `AiGatewayView.tsx`.
5. **Bilhetagem, Faturamento e Auditoria:** `CdrAndRecordingsView.tsx`, `BillingView.tsx`, `SystemLogsView.tsx`.
6. **Governança, Infraestrutura e Administração:** `HealthCheckView.tsx`, `InfraSettingsView.tsx`, `BackupRestoreView.tsx`, `QuickSetupView.tsx`, `AdminAndSecurityView.tsx`, `SettingsView.tsx`, `HelpManualView.tsx`, `LoginView.tsx`.

---

## 4. Sondas de Observabilidade e Disponibilidade

| Sonda | Autenticação | Comportamento |
| :--- | :--- | :--- |
| `GET /health/live` (`/health`, `/api/health`) | Pública | Confirma que o event loop do processo Node.js está responsivo. |
| `GET /health/ready/web` (`/health/ready`, `/ready`) | Pública | Valida conectividade real com PostgreSQL (`HTTP 200` ou `503`). |
| `GET /health/ready/pbx` | Pública | Valida conectividade real com Asterisk Core e AMI (`HTTP 200` ou `503`). |
| `GET /health/deps` | JWT + RBAC (`super_admin`, `admin`, `supervisor`) | Retorna status detalhado das 11 dependências com cache TTL de 5s. |
| `GET /api/v1/health` | JWT Autenticado | Telemetria completa para o console NOC e `HealthCheckView`. |

---

## 5. Hardening de Segurança Enterprise (Produção)

### 5.1. Autenticação SSE por Tickets Efêmeros
- O JWT permanente de aplicação é estritamente proibido em query strings (`?token=`), retornando `HTTP 401 SSE_PERMANENT_JWT_FORBIDDEN`.
- Conexões SSE utilizam tickets descartáveis emitidos via `POST /api/v1/auth/sse-ticket` com TTL de 30 segundos e uso único.

### 5.2. Isolamento Multi-Tenant e Capacidade `platform:cross_tenant`
- Todas as operações de dados utilizam `resolveTenantContext(req)` + RLS no PostgreSQL.
- O acesso cross-tenant pelo `super_admin` exige capacidade explícita `platform:cross_tenant`, validação do tenant alvo no banco e registro de auditoria.
- Endpoints sensíveis (`GET /api/v1/tenants`, `GET /api/v1/audit-logs`, `POST /api/v1/audit-logs/verify-integrity`) isolam rigorosamente o escopo por tenant.

### 5.3. Criptografia AES-256-GCM e Fail-Fast de Segredos
- `EncryptionService` cifra senhas SIP e tokens de integração (incluindo WhatsApp Cloud API `accessToken`) com IV único de 96 bits e Auth Tag de 128 bits (`enc:v1:...`), com suporte a rotação segura (`rotateKey`).
- Em `NODE_ENV=production`, a ausência ou fraqueza de `JWT_SECRET`, `ENCRYPTION_KEY` (< 32 caracteres) ou `CORS_ALLOWED_ORIGINS` interrompe a inicialização imediatamente (*fail-fast*).

### 5.4. Webhook Meta WhatsApp Cloud API Endurecido
- O parser `express.json` preserva `req.rawBody` para verificação criptográfica HMAC-SHA256 (`x-hub-signature-256`) em tempo constante sobre os bytes brutos recebidos.
- Em produção, se `WHATSAPP_APP_SECRET` não estiver configurado, o endpoint rejeita requisições com `HTTP 503` (*fail-closed*).
- Proteção contra replay (janela máxima de 5 minutos) e idempotência por `message.id` (`ignored_duplicate`).

### 5.5. Auditoria Imutável e Cadeia de Custódia LGPD
- Operações críticas com `AUDIT_REQUIRED` usam `AuditLogRepository.logStrict`: qualquer falha de persistência aborta a mutação com `HTTP 503 AUDIT_REQUIRED_FAILURE`.
- `POST /api/v1/audit-logs/verify-integrity` executa verificação criptográfica real da cadeia de hashes SHA-256 do tenant via `AuditLogRepository.verifyChain`.

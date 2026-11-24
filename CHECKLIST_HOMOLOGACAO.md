# 🐙 Checklist Oficial de Homologação para Produção — Enlace-PBX Enterprise
**Data:** 23/11/2026 | **Ambiente:** Debian 12 (Bookworm) e Ubuntu 22.04/24.04 LTS

---

## 1. Núcleo Asterisk & Sinalização de Telefonia

- [x] **Compilação Asterisk 20 LTS:** Checksum SHA-256 verificado com `pjproject-bundled`, `jansson`, `libsrtp` e codec Opus.
- [x] **Preservação de Configuração:** `make samples` executado apenas quando `/etc/asterisk/asterisk.conf` não existe.
- [x] **Hardening AMI:** Usuário `enlace_ami` restrito a `127.0.0.1`, credenciais criptográficas sincronizadas com `.env` (zero senhas fixas).
- [x] **Hardening ARI:** Usuário `enlace_ari` restrito a `127.0.0.1:8088`, sincronizado com `.env` e `ari.conf`.
- [x] **Sinalização WebRTC WSS:** Suporte a WebSocket seguro na porta 8089 com criptografia DTLS-SRTP.
- [x] **Reinício Fail-Closed:** `systemctl restart asterisk` sem `|| true`, validando status ativo do daemon.

---

## 2. Banco de Dados PostgreSQL & Governança

- [x] **Princípio do Menor Privilégio:** Role `enlace_app` configurada com `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`.
- [x] **Proibição de Superusuário:** Inicialização recusada (*fail-closed*) caso a aplicação conecte como `postgres`.
- [x] **Row-Level Security (RLS):** Políticas multi-tenant ativas sob transações `executeTenantScoped`.
- [x] **Migrações Controladas:** `DatabaseMigrator` com `pg_advisory_lock` e verificação SHA-256 contra *migration drift*.
- [x] **Provisionamento Idempotente:** `deploy.sh` preserva `DATABASE_URL` e senhas existentes sem comandos destrutivos.

---

## 3. Segurança HTTP, Aplicação, APIs & Frontend

- [x] **Carregamento `.env` no PM2:** `import 'dotenv/config'` na linha 1 de `server.ts` garante carregamento em `node dist/server.cjs`.
- [x] **Fail-Fast de Segredos:** Validação bloqueante em produção para `JWT_SECRET`, `ENCRYPTION_KEY` (>= 32 caracteres) e `CORS_ALLOWED_ORIGINS` (sem `*`).
- [x] **Content Security Policy (CSP) Estrita:** `script-src 'self'` (zero `unsafe-inline` em scripts e zero `unsafe-eval`), `object-src 'none'`, Service Worker registrado em `src/main.tsx`.
- [x] **CORS Corporativo:** Origens explícitas, suporte a `x-target-tenant-id`/`x-request-id` e rejeição com `HTTP 403`.
- [x] **Criptografia AES-256-GCM:** Segredos SIP e `accessToken` do WhatsApp cifrados em repouso (`enc:v1:...`), mascarados na API e com rotina `rotateKey`.
- [x] **Permissões e Backup do `.env`:** `chmod 600 .env` e backup automático `.env.backup.<timestamp>`.
- [x] **Rate Limiting Preciso:** `authLimiter` (10 req/h) isolado em `/api/v1/auth/login` e `apiLimiter` (1000 req/15min) em `/api/`.
- [x] **RBAC & Isolamento Multi-Tenant:** Bypass `/api/v1` restrito a `/auth/login` e `/webhooks/whatsapp`; RBAC em webhooks, infra, logs, VPN, fail2ban, setup e `/health/deps`; `audit-logs` e `tenants` isolados por tenant.
- [x] **Verificação Forense Real:** `POST /api/v1/audit-logs/verify-integrity` valida a cadeia SHA-256 via `AuditLogRepository.verifyChain`.
- [x] **Sanitização de Erros:** Sem exposição de stack traces ou `err.message` interno em respostas `HTTP 500` de produção.
- [x] **Ciclo de Vida e Encerramento Gracioso:** `http.createServer(app)` com HMR compartilhado (sem conflito na porta `24678`) e `closeAllConnections()` no `SIGTERM`/`SIGINT` para reinicializações rápidas sem travar a porta `3000`.
- [x] **Frontend Autenticado:** Interceptor same-origin resiliente via `Object.defineProperty` em `src/utils/api.ts` + `src/main.tsx` (compatível com `window.fetch` somente getter) e exportação de logs via `Blob` (sem `window.open`).
- [x] **Dependências Auditadas:** Zero vulnerabilidades críticas ou altas em produção (`npm audit --omit=dev`).

---

## 4. Monitoramento & Sondas de Saúde

- [x] **Liveness Probe (`/health/live`):** Validação imediata e pública do processo Node.js.
- [x] **Readiness Web (`/health/ready/web`):** Prontidão pública do PostgreSQL (usada no smoke test do `deploy.sh`).
- [x] **Readiness PBX (`/health/ready/pbx`):** Prontidão pública do Asterisk Core e socket AMI.
- [x] **Dependency Health (`/health/deps`):** Protegida por JWT + RBAC (`super_admin`, `admin`, `supervisor`), com cache TTL de 5s e `pingAmi`/`pingAri` reais.

---

## 5. Omnichannel & Integrações com IA

- [x] **Assinatura Meta HMAC-SHA256 sobre `rawBody`:** Validação em tempo constante sobre bytes brutos e bloqueio *fail-closed* (`HTTP 503`) em produção caso `WHATSAPP_APP_SECRET` esteja ausente.
- [x] **Anti-Replay & Idempotência WhatsApp:** Janela máxima de 5 minutos e descarte de duplicatas por `message.id` (`ignored_duplicate`).
- [x] **Google Gemini AI & MaIA:** Chave `GEMINI_API_KEY` restrita ao backend, suporte a modelos Flash/Live, Customer Memory e RAG com política fail-closed.

---

## 6. Validação Automatizada Pré-Deploy

- [x] `npm run lint` (`tsc --noEmit`) — **0 erros**
- [x] `npm test` — **76/76 aprovados**
- [x] `npm run build` — **Build completo (`dist/` e `dist/server.cjs`)**
- [x] `bash -n deploy.sh && bash -n install-enlace-pbx.sh` — **Sintaxe válida**

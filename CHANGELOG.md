# Changelog — Enlace-PBX Enterprise

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

## [20.17.0-enterprise-production] - 2026-11-23

### Segurança & Endurecimento de Produção
- **Carregamento `.env` no PM2 e Validação Fail-Fast:** Adicionado `import 'dotenv/config'` na linha 1 de `server.ts` para garantir leitura do `.env` ao rodar `node dist/server.cjs`, e validação *fail-fast* de `ENCRYPTION_KEY` (>= 32 caracteres) no startup em produção (`server/config/env.ts`).
- **CSP Estrita sem `unsafe-inline` em Scripts:** Registro do Service Worker (`/sw.js`) movido de `index.html` para `src/main.tsx`, eliminando scripts inline e restringindo `scriptSrc` para `["'self'"]` em produção.
- **Remoção de Bypasses Amplos e RBAC em Rotas Sensíveis:** Restringido o bypass do middleware `/api/v1` exclusivamente a `/auth/login` e `/webhooks/whatsapp`. Aplicados `requireAuth`/`requireRole` em `/health/deps`, `/api/v1/webhooks`, `/api/v1/infra/config`, `/api/v1/system/logs`, `/api/v1/system/logs/download`, `/api/v1/network/wireguard`, `/api/v1/network/zerotier`, `/api/v1/security/fail2ban`, `/api/v1/setup/snapshots` e `/api/v1/setup/preview`.
- **Isolamento Multi-Tenant em Auditoria e Empresas:** `GET /api/v1/audit-logs` agora aplica filtro por `tenantId` sob transação RLS; `POST /api/v1/audit-logs/verify-integrity` valida pertencimento ao tenant e executa verificação criptográfica real via `AuditLogRepository.verifyChain`; `GET /api/v1/tenants` restringe perfis comuns ao próprio tenant.
- **WhatsApp Cloud API Endurecido:** Captura de `req.rawBody` no `express.json` (`limit: '10mb'`) para validação HMAC-SHA256 sobre bytes brutos com bloqueio *fail-closed* (`HTTP 503`) em produção sem `WHATSAPP_APP_SECRET`; `accessToken` cifrado com `EncryptionService.encrypt` (AES-256-GCM) em repouso e mascarado nas respostas da API.
- **Rate Limiting e Sanitização de Erros:** `authLimiter` montado especificamente em `/api/v1/auth/login` (evitando bloqueio de `/auth/me` e `/auth/sse-ticket`); erros de origem CORS retornam `HTTP 403` (com suporte a `x-target-tenant-id` e `x-request-id`); tratador global de erros e login omitem detalhes internos em produção.
- **Frontend Enterprise:** Ativado interceptor same-origin resiliente `installAuthFetchInterceptor()` (`src/utils/api.ts` + `src/main.tsx`) usando `Object.defineProperty` (compatível com `window.fetch` getter-only) para injeção automática do JWT Bearer em `/api/v1/*`, e substituído `window.open` por download autenticado via `Blob` em `SystemLogsView.tsx`.
- **Estabilidade de Runtime & Ciclo de Vida do Servidor:** Adotado `http.createServer(app)` compartilhado com o HMR do Vite (eliminando conflitos na porta `24678`), encerramento gracioso com `closeAllConnections()` e `viteServer.close()` em `SIGTERM`/`SIGINT`, e liberação controlada de `X-Frame-Options` apenas fora de produção para preview em iframe.
- **Atualização de Dependências:** Atualizados `express` (`4.22.2`), `express-rate-limit` (`8.7.5`), `vite` (`6.4.6`) e dependências transitivas (`proxy-addr@2.0.8`, `body-parser@1.20.9`, `source-map-js@1.2.4`, `dompurify@3.5.0`, `ip-address@10.7.6`), eliminando 100% das vulnerabilidades críticas e altas em runtime.
- **Smoke Test de Deploy & Documentação:** Atualizado `deploy.sh` para validar `/health/ready/web` e `/health/live`; atualizados `AGENTS.md`, `README.md`, `ARCHITECTURE.md`, `AUDITORIA_CORRECOES_ENLACE_PBX.md` e `CHECKLIST_HOMOLOGACAO.md`.
- **Suíte de Testes Expandida (CS-258 a CS-263):** Total de 76 casos de teste automatizados com 100% de aprovação.

---

## [20.17.0-enterprise-hardened] - 2026-10-22

### Adicionado
- **Sincronização Segura AMI/ARI:** Padronização nos nomes das variáveis `ASTERISK_AMI_USER` / `ASTERISK_AMI_USERNAME` e `ASTERISK_ARI_USER` / `ASTERISK_ARI_USERNAME` no `AsteriskAdapter.ts`, `deploy.sh` e `.env.example`.
- **Rotação de Chaves Criptográficas:** Implementação do método `EncryptionService.rotateKey` com decifragem e recifragem atômica utilizando novo IV único de 96 bits e Auth Tag de 128 bits.
- **Sondas Independentes de Monitoramento:** `/health/live`, `/health/ready/web`, `/health/ready/pbx` e `/health/deps` com cache de 5 segundos.
- **Testes de Conectividade em Tempo Real:** Métodos `pingAmi()` e `pingAri()` no `AsteriskAdapter.ts`.
- **Idempotência no Webhook Meta WhatsApp:** Verificação por identificador único de mensagem (`message.id`).
- **Backup e Mesclagem de `.env`:** Criação automática de `.env.backup.<timestamp>` e preservação de configurações customizadas no `deploy.sh`.
- **Novos Testes Automatizados (CS-251 a CS-257):** Suíte expandida de 63 para 70 casos de teste.

### Corrigido
- **P0-01 (Credenciais Asterisk):** Extirpadas as senhas fixas `enlace_ami_secret_2026` e `enlace_ari_secret_2026` no `install-enlace-pbx.sh`.
- **P0-02 (PostgreSQL):** Provisionamento idempotente da role `enlace_app` com privilégios mínimos.
- **P0-03 (Instalador Asterisk):** Removido `systemctl restart asterisk || true` e protegido `/etc/asterisk` contra `make samples` indevido.
- **P0-04 (Content Security Policy):** Ativação de CSP via Helmet em produção.

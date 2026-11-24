# 🐙 Enlace-PBX Enterprise — Relatório Técnico de Auditoria, Correções e Homologação
**Data da Revisão Final:** 23 de Novembro de 2026  
**Versão:** 20.17.0-enterprise-production  
**Desenvolvedor:** André LJP & Enlace Telecom (São Luís, Maranhão, Brasil — https://enlace.slz.br)  
**Status de Homologação:** HOMOLOGADO PARA PRODUÇÃO COM EVIDÊNCIAS (76/76 Testes Aprovados)

---

## 1. Resumo Executivo

O **Enlace-PBX Enterprise** concluiu duas rodadas completas de auditoria técnica, correções de segurança e homologação para produção abrangendo:
- Governança de credenciais Asterisk (AMI/ARI) e instalador fail-closed.
- Provisionamento PostgreSQL idempotente sob a role de privilégios mínimos `enlace_app` com Row-Level Security (RLS).
- Endurecimento de borda HTTP: CSP estrita (`script-src 'self'` sem `unsafe-inline` ou `unsafe-eval`), CORS com `HTTP 403`, rate limiting focado em `/api/v1/auth/login` e sanitização de erros em produção.
- Blindagem de APIs multi-tenant: remoção de bypasses amplos em `/api/v1`, aplicação de RBAC em rotas operacionais/infraestrutura, isolamento rigoroso de `audit-logs` e `tenants`, e verificação criptográfica real da cadeia SHA-256.
- Endurecimento da integração Meta WhatsApp Cloud API: verificação HMAC-SHA256 sobre `rawBody` com política *fail-closed* em produção, criptografia AES-256-GCM e mascaramento de `accessToken`, e idempotência anti-duplicação.
- Atualização de dependências vulneráveis em runtime (eliminando 100% das vulnerabilidades críticas e altas detectadas).

Todas as correções preservaram 100% da arquitetura existente, contratos de API e funcionalidades dos 27 módulos frontend.

---

## 2. Matriz Consolidada de Problemas e Correções

| ID | Classificação | Problema Identificado | Arquivo(s) Afetado(s) | Correção Implementada | Teste Automatizado | Status |
| :---: | :---: | :--- | :--- | :--- | :---: | :---: |
| **P0-01** | Crítico | Divergência de variáveis AMI/ARI e senhas fixas no instalador Asterisk | `deploy.sh`, `install-enlace-pbx.sh`, `.env.example`, `AsteriskAdapter.ts` | Extirpação de senhas fixas; sincronização automática entre `.env`, `manager.conf` e `ari.conf` com suporte retrocompatível a `USER`/`USERNAME`. | CS-251, CS-255 | **CONCLUÍDO** |
| **P0-02** | Crítico | Provisionamento PostgreSQL com risco de credenciais divergentes e uso de superusuário | `deploy.sh`, `client.ts`, migração `008` | Provisionamento idempotente da role restrita `enlace_app` (`NOSUPERUSER NOBYPASSRLS`), preservação de `DATABASE_URL` existente e bloqueio de superusuário. | CS-253 | **CONCLUÍDO** |
| **P0-03** | Crítico | Mascaramento de falhas críticas no instalador Asterisk (`\|\| true`) e `make samples` sem guarda | `install-enlace-pbx.sh` | Remoção de `\|\| true` em `systemctl restart asterisk`; `make samples` condicional à ausência de `/etc/asterisk/asterisk.conf`; validação real de módulos. | CS-255 | **CONCLUÍDO** |
| **P0-04** | Crítico | Ausência de CSP e posterior presença de `unsafe-inline` em `script-src` | `server.ts`, `index.html`, `src/main.tsx` | Ativação de CSP estrita em produção (`script-src 'self'`, `object-src 'none'`, zero `unsafe-inline` em scripts e zero `unsafe-eval`) com migração do registro do Service Worker para `src/main.tsx`. | CS-254, CS-259 | **CONCLUÍDO** |
| **P0-05** | Crítico | Bypass amplo em `/api/v1` expondo `/api/v1/webhooks` e `/api/v1/health` sem autenticação | `server.ts`, `deploy.sh` | Bypass restrito exclusivamente a `/auth/login` e `/webhooks/whatsapp`. `/health/deps`, `/api/v1/webhooks`, `/api/v1/infra/config`, `/api/v1/system/logs*`, `/api/v1/network/*` e `/api/v1/security/fail2ban` protegidos com JWT + RBAC. | CS-260 | **CONCLUÍDO** |
| **P0-06** | Crítico | Vazamento cross-tenant em `GET /api/v1/audit-logs`, `GET /api/v1/tenants` e verificação simulada em `/verify-integrity` | `server.ts`, `AuditLogRepository.ts` | Isolamento estrito por `tenantId` sob RLS em `audit-logs`, restrição de `GET /api/v1/tenants` para perfis comuns e verificação real da cadeia SHA-256 via `AuditLogRepository.verifyChain`. | CS-261 | **CONCLUÍDO** |
| **P0-07** | Crítico | Boot PM2 (`dist/server.cjs`) sem `dotenv/config` e validação tardia de `ENCRYPTION_KEY` | `server.ts`, `server/config/env.ts` | Inclusão de `import 'dotenv/config'` na linha 1 do `server.ts` e validação *fail-fast* de `ENCRYPTION_KEY` (>= 32 caracteres) no startup em produção. | CS-258 | **CONCLUÍDO** |
| **P0-08** | Crítico | Dependências vulneráveis em runtime (`proxy-addr`, `body-parser`, `vite`, `source-map-js`, `ip-address`, `dompurify`) | `package.json`, `package-lock.json` | Atualização de `express` (`4.22.2`), `express-rate-limit` (`8.7.5`), `vite` (`6.4.6`) e correção de transitivas (`proxy-addr@2.0.8`, `body-parser@1.20.9`, `source-map-js@1.2.4`, `dompurify@3.5.0`, `ip-address@10.7.6`). **0 críticas, 0 altas.** | `npm audit --omit=dev` | **CONCLUÍDO** |
| **P1-01** | Alto | Criptografia AES-256-GCM sem rotação e proteção do `.env` | `deploy.sh`, `EncryptionService.ts` | Geração automática de `ENCRYPTION_KEY`, `EncryptionService.rotateKey`, backup `.env.backup.*` e permissões `chmod 600`. | CS-252 | **CONCLUÍDO** |
| **P1-02** | Alto | Falta de segregação de sondas de monitoramento | `server.ts`, `AsteriskAdapter.ts` | Sondas independentes `/health/live`, `/health/ready/web`, `/health/ready/pbx` e `/health/deps` (protegida) com cache TTL 5s e `pingAmi`/`pingAri` reais. | CS-256 | **CONCLUÍDO** |
| **P1-03** | Alto | `authLimiter` aplicado sobre `/api/v1/auth/` bloqueando `/auth/me` e `/auth/sse-ticket` | `server.ts` | Escopo do `authLimiter` restringido exclusivamente a `/api/v1/auth/login`. | CS-260 | **CONCLUÍDO** |
| **P1-04** | Alto | WhatsApp Webhook validando HMAC sobre `JSON.stringify(req.body)` sem fail-closed e `accessToken` exposto sem máscara | `server.ts` | Captura de `req.rawBody` no `express.json`, HMAC-SHA256 sobre bytes brutos, fail-closed (`HTTP 503`) em produção sem `WHATSAPP_APP_SECRET`, idempotência por `message.id`, criptografia AES-256-GCM e mascaramento de `accessToken`. | CS-257, CS-262 | **CONCLUÍDO** |
| **P1-05** | Alto | Vazamento de `err.message` em respostas 500 de produção e rejeição CORS retornando 500 | `server.ts` | Erros CORS retornam `HTTP 403`; tratador global e catch de login omitem detalhes internos em `NODE_ENV=production`. | CS-259 | **CONCLUÍDO** |
| **P1-06** | Alto | Chamadas `fetch('/api/v1/...')` sem cabeçalho JWT em views legadas e download de logs via `window.open` | `src/utils/api.ts`, `src/main.tsx`, `SystemLogsView.tsx` | Interceptor same-origin `installAuthFetchInterceptor()` instalado de forma resiliente via `Object.defineProperty` (compatível com `window.fetch` somente getter) e exportação de logs migrada para `fetch` autenticado + `Blob`. | CS-263 | **CONCLUÍDO** |
| **P1-07** | Alto | Conflito de porta HMR (`24678`), retenção de porta `3000` em restarts e bloqueio de iframe em preview dev | `server.ts` | Compartilhamento do `http.createServer(app)` com o HMR do Vite, encerramento gracioso imediato com `closeAllConnections()` e `viteServer.close()` em `SIGTERM`/`SIGINT`, e remoção de `X-Frame-Options` apenas fora de produção. | Smoke Test Dev | **CONCLUÍDO** |

---

## 3. Evidências de Validação Final

- **Suíte Automatizada (`npm test`):** **76/76 aprovados (100%, 0 falhas)**.
- **Verificação de Tipagem (`npm run lint`):** **0 erros**.
- **Compilação de Produção (`npm run build`):** Sucesso completo (`dist/` e `dist/server.cjs`).
- **Sintaxe dos Scripts Linux (`bash -n`):** `deploy.sh` e `install-enlace-pbx.sh` válidos (`exit 0`).
- **Auditoria de Dependências (`npm audit --omit=dev`):** **0 críticas, 0 altas, 0 baixas** (restam apenas 2 avisos moderados de `qs` vinculados à árvore interna do Express 4.x, sem impacto explorável nos endpoints JSON do BFF).

---

## 4. Riscos Residuais e Recomendações Operacionais

1. **Firewall de Borda na Nuvem:** Liberar apenas as portas da matriz oficial (`443/tcp`, `5060/udp`, `5061/tcp`, `8089/tcp`, `10000-20000/udp`, `51820/udp`). Manter `5432`, `5038`, `8088` e `3000` exclusivamente locais.
2. **Certificado TLS Válido:** Emitir certificado Let's Encrypt antes do registro de ramais WebRTC e antes de ativar o webhook Meta WhatsApp.
3. **Backup de Segredos Críticos:** Armazenar `ENCRYPTION_KEY` em cofre seguro fora do servidor; em caso de rotação, utilizar `EncryptionService.rotateKey`.
4. **Configuração `WHATSAPP_APP_SECRET`:** Definir no `.env` de produção antes de ativar o recebimento de mensagens do Meta WhatsApp Cloud API (política *fail-closed* ativa).

---

## 5. Procedimento de Rollback

1. Restaurar ambiente: `cp .env.backup.<timestamp> .env && chmod 600 .env`
2. Restaurar versão anterior e recompilar: `git checkout <commit_anterior> && npm run build`
3. Reiniciar serviços: `pm2 restart enlace-pbx && systemctl restart asterisk`

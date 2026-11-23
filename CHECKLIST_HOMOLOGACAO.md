# 🐙 Checklist Oficial de Homologação — Enlace-PBX Enterprise
**Data:** 22/10/2026 | **Ambiente:** Debian 11/12 e Ubuntu 20.04/22.04/24.04 LTS

---

## 1. Núcleo Asterisk & Sinalização de Telefonia

- [x] **Compilação Asterisk 20 LTS:** Checksum SHA-256 verificado com pjproject-bundled, jansson, libsrtp e codec Opus.
- [x] **Preservação de Configuração:** `make samples` somente executado quando `/etc/asterisk/asterisk.conf` não existe.
- [x] **Hardening AMI:** Usuário `enlace_ami` restrito a `127.0.0.1`, sem senhas fixas no instalador.
- [x] **Hardening ARI:** Usuário `enlace_ari` com autenticação segura e porta 8088 restrita a localhost.
- [x] **Sinalização WebRTC WSS:** Suporte a WebSocket na porta 8089 com criptografia DTLS-SRTP.
- [x] **Reinício Fail-Closed:** `systemctl restart asterisk` sem `|| true`, validando status ativo do daemon.

---

## 2. Banco de Dados PostgreSQL & Governança

- [x] **Princípio do Menor Privilégio:** Usuário `enlace_app` configurado com `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`.
- [x] **Proibição de Superusuário:** Inicialização recusada (*fail-closed*) caso a aplicação conecte como superuser `postgres`.
- [x] **Migrações Controladas:** `DatabaseMigrator` com `pg_advisory_lock` e verificação SHA-256 contra *migration drift*.
- [x] **Preservação de Dados:** Nenhum comando destrutivo (`DROP DATABASE` / `DROP TABLE`) em rotinas automáticas.
- [x] **Provisionamento Idempotente:** Script de deploy reutiliza senhas e banco existentes sem dessincronização.

---

## 3. Segurança HTTP, Aplicação & APIs

- [x] **Content Security Policy (CSP):** Ativado com bloqueio total de `unsafe-eval`, `object-src: 'none'` e permissões restritas a `'self'`, WSS (8089) e APIs autorizadas.
- [x] **Criptografia AES-256-GCM:** Segredos SIP cifrados com envelopes `enc:v1:<iv>:<tag>:<ciphertext>` e rotina de rotação de chave `rotateKey`.
- [x] **Permissões do Arquivo .env:** Protegido com permissão estrita `chmod 600 .env`.
- [x] **Backup do .env:** Cópia automática com timestamp gerada antes de qualquer modificação.
- [x] **Proteção de Autenticação:** Rate limiting estrito em `/api/v1/auth/login` (10 req/h) e `/api/` (1000 req/15min).
- [x] **Isolamento Multi-Tenant:** `TenantContext` canônico com bloqueio rigoroso contra BOLA/IDOR e RLS ativo.

---

## 4. Monitoramento & Health Checks

- [x] **Liveness Probe (`/health/live`):** Validação imediata do processo Node.js em execução.
- [x] **Readiness Web (`/health/ready/web`):** Verificação de prontidão do banco PostgreSQL para tráfego web.
- [x] **Readiness PBX (`/health/ready/pbx`):** Verificação de prontidão do Asterisk Core e socket AMI para tráfego de voz.
- [x] **Dependency Health (`/health/deps`):** Estados reais (`UP`, `DOWN`, `DEGRADED`, `NOT_CONFIGURED`) para todos os 11 componentes com cache de 5s.
- [x] **Testes de Conectividade:** Sockets AMI e chamadas HTTP ARI reais com medição de latência em milissegundos.

---

## 5. Omnichannel & Integrações com IA

- [x] **Idempotência no WhatsApp:** Descarte de payloads Meta duplicados baseado no `message.id`.
- [x] **Validação de Assinatura Meta:** Suporte a HMAC-SHA256 (`x-hub-signature-256`) com `WHATSAPP_APP_SECRET`.
- [x] **Google Gemini AI:** Suporte a modelos `gemini-flash-latest` e `gemini-3.1-flash-live-preview`.
- [x] **Agente Cognitivo MaIA:** Gateway de voz com memória contextual, RAG e política fail-closed.

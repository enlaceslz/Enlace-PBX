# Changelog — Enlace-PBX Enterprise

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

## [20.17.0-enterprise-hardened] - 2026-10-22

### Adicionado
- **Sincronização Segura AMI/ARI:** Padronização nos nomes das variáveis `ASTERISK_AMI_USER` / `ASTERISK_AMI_USERNAME` e `ASTERISK_ARI_USER` / `ASTERISK_ARI_USERNAME` no `AsteriskAdapter.ts`, `deploy.sh` e `.env.example`.
- **Rotação de Chaves Criptográficas:** Implementação do método `EncryptionService.rotateKey` com decifragem e recifragem atômica utilizando novo IV único de 96 bits e Auth Tag de 128 bits.
- **Sondas Independentes de Monitoramento:**
  - `/health/live`: Liveness probe do processo da aplicação.
  - `/health/ready/web`: Prontidão do banco relacional PostgreSQL.
  - `/health/ready/pbx`: Prontidão da pilha Asterisk 20 e AMI.
  - `/health/deps`: Visão granular de dependências com estados canônicos (`UP`, `DOWN`, `DEGRADED`, `NOT_CONFIGURED`) e cache de 5 segundos.
- **Testes de Conectividade em Tempo Real:** Métodos `pingAmi()` e `pingAri()` no `AsteriskAdapter.ts` para testes reais de handshake de rede.
- **Idempotência no Webhook Meta WhatsApp:** Verificação por identificador único de mensagem (`message.id`) evitando duplicações provocadas por retransmissão de rede.
- **Backup e Mesclagem de .env:** Criação automática de `.env.backup.<timestamp>` e mesclagem de configurações customizadas no `deploy.sh`.
- **Novos Testes Automatizados (CS-251 a CS-257):** Suíte expandida de 63 para 70 casos de teste com 100% de aprovação.

### Corrigido
- **P0-01 (Credenciais Asterisk):** Extirpadas completamente as credenciais fixas `enlace_ami_secret_2026` e `enlace_ari_secret_2026` no `install-enlace-pbx.sh`, substituídas por segredos gerados criptograficamente e sincronizados com `.env`.
- **P0-02 (PostgreSQL):** Resolvida a geração de senhas divergentes no `deploy.sh`. A role `enlace_app` agora é mantida de forma idempotente com privilégios mínimos.
- **P0-03 (Instalador Asterisk):** Removido o mascaramento de erros `systemctl restart asterisk || true` e protegido o diretório `/etc/asterisk` contra `make samples` indevido sobre arquivos de produção.
- **P0-04 (Content Security Policy):** Substituído `contentSecurityPolicy: false` por uma política CSP estrita com bloqueio total de `unsafe-eval` e `object-src: 'none'`.

### Segurança
- Aplicação de permissões estritas `chmod 600 .env` e `chmod 600 .env.backup.*`.
- Restrição do usuário operacional `enlace_app` com `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`.
- Cabeçalhos HTTP defensivos ativados via Helmet: `frameguard: sameorigin`, `noSniff: true`, `xssFilter: true` e `referrerPolicy: strict-origin-when-cross-origin`.

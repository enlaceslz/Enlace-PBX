# Decisão de arquitetura — frontend Vercel e backend Enlace-PBX

**Estado:** decisão técnica proposta para homologação. **Não significa implantação concluída.**

## Contexto verificado

- O frontend React/Vite realiza `POST /api/v1/auth/login` por caminho relativo.
- O endpoint é implementado pelo servidor Express (`server.ts`), que também depende de PostgreSQL e serviços Asterisk.
- O administrador inicial é criado no bootstrap do PostgreSQL com `ADMIN_INITIAL_EMAIL` e `ADMIN_INITIAL_PASSWORD`, quando não existe `super_admin`.
- Publicar somente os arquivos estáticos Vite na Vercel não provisiona automaticamente o servidor Express, PostgreSQL ou Asterisk.

## Decisão

1. **Vercel:** hospedar apenas o frontend estático, sem segredos de banco, JWT, AMI, ARI ou chaves de IA.
2. **Backend:** hospedar Express em serviço persistente com TLS, logs e controles de acesso; preferencialmente VPS/VM administrada para integrar Asterisk.
3. **Persistência:** PostgreSQL persistente, backups, migrações versionadas e verificação de restauração.
4. **PBX:** Asterisk 20 em Debian 12, isolado, com AMI/ARI em loopback ou rede privada estritamente controlada.
5. **Roteamento da API:** configurar proxy/rewrite explícito de `/api/v1/*` para o backend HTTPS, mantendo mesma origem para o navegador. Não publicar credenciais nem usar `VITE_*` para segredos.
6. **Bootstrap:** provisionar o primeiro administrador somente pelo backend e retirar os segredos de bootstrap do ambiente após conclusão verificada, preservando método de recuperação administrativo auditado.
7. **Saúde:** nunca inferir disponibilidade do Asterisk a partir da renderização do frontend. Mostrar estado desconhecido quando a API estiver indisponível.

## Bloqueadores de produção

- Backend Express não implantado ou inacessível.
- PostgreSQL não configurado ou sem migrações e backup comprovados.
- Falta de administrador provisionado e teste real de login/logout e RBAC.
- Ausência de TLS, política de CORS/reverse proxy e proteção de cookies/tokens avaliada.
- Asterisk, SIP/RTP/WebRTC, IA, AMI/ARI, restauração e rollback não homologados.

## Aceitação mínima de implantação

| Verificação | Evidência necessária | Estado |
| --- | --- | --- |
| Frontend Vercel acessível via HTTPS | URL e deploy | PENDENTE |
| `/api/v1/auth/login` alcança Express, não fallback HTML | HTTP e logs sanitizados | PENDENTE |
| Banco PostgreSQL e migrações | Health e versão de schema | PENDENTE |
| Primeiro administrador | Login positivo e negativo, sem senha em logs | PENDENTE |
| RBAC e isolamento | Testes de acesso negado e permitido | PENDENTE |
| Asterisk e fluxos de voz | Evidências de laboratório Debian 12 | PENDENTE |

**Regra:** CI verde não substitui teste de implantação real. Não habilitar bypass de autenticação, credenciais fixas ou modo demonstração como solução para o login.

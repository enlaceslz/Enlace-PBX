# Operação e critérios de produção — Enlace-PBX

Revisão: 31/10/2026. Este documento substitui instruções antigas de inicialização automática de migrações no servidor web.

## Arquitetura de credenciais

| Processo | Credencial | Responsabilidade |
| --- | --- | --- |
| Migrações administrativas | MIGRATION_DATABASE_URL | Instalação/atualização do esquema; SQL históricos exigem superusuário no banco enlace_pbx |
| Bootstrap administrativo | MIGRATION_DATABASE_URL + ADMIN_INITIAL_EMAIL/PASSWORD | Criar primeiro administrador e auditoria na mesma transação |
| Servidor web | DATABASE_URL de enlace_app | Operações sob RLS; validação somente leitura de versões e hashes na inicialização |

Não entregar MIGRATION_DATABASE_URL ou senha inicial ao processo web. As credenciais operacionais e administrativas devem apontar para o mesmo banco. O banco enlace_pbx e a senha do papel enlace_app precisam ser provisionados previamente. Os comandos não trocam a senha operacional.

## Sequência de instalação

1. Preparar PostgreSQL e banco enlace_pbx, papel enlace_app com senha forte, sem superusuário ou bypass de RLS. Fazer backup antes de atualizar banco existente.
2. Instalar dependências com `npm ci`, validar tipos com `npm run lint` e compilar com `npm run build`.
3. No processo administrativo, fornecer MIGRATION_DATABASE_URL e executar `npm run db:migrate`.
4. Fornecer ADMIN_INITIAL_EMAIL e ADMIN_INITIAL_PASSWORD ao processo administrativo e executar `npm run db:bootstrap`. Senha: pelo menos 12 caracteres, máximo 72 bytes e sem prefixos previsíveis. Administrador existente não é alterado.
5. Retirar os segredos administrativos do ambiente do serviço. Configurar DATABASE_URL operacional, JWT_SECRET (mínimo 32 bytes), ENCRYPTION_KEY (mínimo 32 caracteres), CORS_ALLOWED_ORIGINS e conexões de telefonia no ambiente de produção.
6. Iniciar `NODE_ENV=production npm start`. Esquema pendente, hash divergente ou conexão operacional privilegiada impedem inicialização.
7. Homologar login, autorização, ligações e integrações antes de liberar tráfego real.

O deploy.sh executa migrações, bootstrap e verificação operacional antes de trocar o processo PM2. Solicita URLs já provisionadas; não gera senha de banco sem correspondência com o papel existente. A senha inicial é solicitada com confirmação e não é gravada no .env. O instalador altera pacotes, rede e serviços do host: executá-lo primeiro em VM de homologação. Ele ainda inicia o processo web como root e isso deve ser corrigido antes da liberação de produção.

## Verificações automatizadas

O CI usa Node 20/22 para instalação, tipos, testes e build. Um job separado com PostgreSQL 16 descartável aplica migrações duas vezes e verifica bootstrap concorrente, bcrypt, auditoria, identidade, RLS sem contexto e por empresa, bloqueio de escrita cruzada, restrições de DDL e proteção do histórico.

O job PostgreSQL usa credenciais públicas exclusivas do banco descartável, sem acesso ao banco de produção. A aprovação precisa ser conferida no commit atual; testes locais com cliente controlado não substituem esse job.

## Critérios ainda necessários para liberação

- CI do commit final aprovado, inclusive PostgreSQL real.
- Serviço web sob usuário sem privilégios de root, com diretórios mínimos autorizados.
- Login e permissões por perfil homologados no navegador e com API real.
- Duas empresas com dados distintos: API, banco, gravações e eventos sem vazamento.
- Asterisk real: registro SIP/WebRTC, áudio bidirecional, DTMF, transferência, filas, gravação e desligamento.
- Integrações externas habilitadas testadas com credenciais de homologação.
- Backup restaurado em ambiente separado; janela de atualização e reversão definidas. Migrações não possuem reversão automática.
- TLS, firewall e proxy validados na VM; monitoramento e alertas operacionais ativos.
- Teste de carga com volume representativo de ligações e eventos; limites e capacidade registrados.

Uma interface publicada na Vercel não comprova funcionamento do BFF, PostgreSQL ou Asterisk. A validação de telefonia exige o ambiente completo.

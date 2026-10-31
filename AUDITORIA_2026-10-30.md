# Auditoria de instalação e validação — 30/10/2026

Base inspecionada: `4e9af83902999687a0e292c316f1579f54060ba6`.

## Problema corrigido

O `npm ci` rejeitava o repositório porque o lockfile não correspondia ao manifesto: faltavam, entre outros, `pg`, `@types/pg`, `sip.js` e variantes opcionais de plataforma. O lockfile foi sincronizado, sem alterar as faixas de dependências do manifesto. A instalação limpa subsequente passou.

O comando de testes passa a usar `node --import tsx`, evitando a dependência do socket IPC criado pelo executável `tsx`, que recebeu `EPERM` neste ambiente.

Foi adicionada validação de instalação, tipos, suíte local e build em pull requests e pushes para main, nas versões Node 20 e 22 previstas em AGENTS.md. A execução remota dessa matriz precisa ser conferida no GitHub Actions.

## Evidências locais

Ambiente: Node 24.22.1. Validação das versões 20/22 delegada ao workflow, ainda não comprovada localmente.

| Verificação | Resultado |
| --- | --- |
| Instalação limpa com `npm ci` | Aprovada |
| `npm run lint` | Aprovada |
| Suíte local | 64 aprovados, 0 falhas, 3 bloqueados |
| `npm run build` | Aprovado; alerta de bundle grande |

## Pendências para homologação

- Executar migrações contra PostgreSQL real e validar isolamento RLS com conexões independentes. O motor embarcado não comprova as garantias do PostgreSQL.
- Confirmar papel operacional `enlace_app` no banco real e separação do proprietário das migrações.
- Validar Asterisk CLI/AMI com o serviço real; depois testar chamadas, mídia WebRTC e integrações externas no ambiente de homologação.
- Investigar divisão de código do frontend: o bundle principal gerado tem aproximadamente 2,57 MB, ou 659 kB comprimidos com gzip.

Esta rodada cobre instalação e verificações locais existentes. Vários testes usam inspeção textual ou dependências simuladas. O resultado não equivale a auditoria completa de segurança, teste de carga ou aprovação de produção. O CI local permite testes bloqueados e não substitui homologação das integrações.

## Continuação: executor de migrações

O workflow da revisão inicial passou no GitHub Actions em Node 20 e 22 (execução 41080057969).

Foi corrigida a afinidade de conexão no migrador: obtenção e liberação do advisory lock, leitura do histórico e aplicação das migrações usam agora o mesmo cliente reservado do pool. A falha na obtenção do bloqueio interrompe a execução. DDL e registro da versão ficam na mesma transação por arquivo; uma falha reverte ambos. A contagem de migrações já confirmadas é preservada no retorno de erro. Se o desbloqueio falhar, a conexão é descartada.

Quatro testes de regressão com cliente controlado cobrem sucesso, falha de bloqueio, rollback na falha de registro da segunda migração e descarte da conexão após falha de desbloqueio. Eles foram incorporados ao `npm test` e passaram localmente.

A separação das credenciais de migração e de execução ainda exige implementação: o migrador atual usa a conexão operacional, que não deveria receber privilégios DDL em produção. O bootstrap também precisa ser validado contra RLS real. Nenhuma migração SQL histórica foi alterada nesta rodada para evitar quebra de checksums.

## Continuação: inicialização de produção somente leitura

A revisão de atomicidade passou no CI (execução 41080428145). A inicialização em NODE_ENV=production agora valida a saúde do banco e compara todas as versões e hashes SQL disponíveis com schema_migrations. Não executa DDL, não obtém bloqueio de migração e não chama bootstrap. Versão pendente, hash ausente/divergente, manifesto indisponível ou erro de banco impedem a inicialização.

Quatro cenários adicionais verificam o caminho de produção: esquema íntegro, migração pendente, hash divergente e hash ausente. As consultas do teste são restritas à leitura do histórico. Resultado local: oito testes de regressão e 64 verificações da suíte aprovados; três integrações continuam bloqueadas.

**Impacto operacional:** um banco vazio ou antigo precisa ser provisionado antes da inicialização de produção. O instalador atual ainda não implementa um comando independente com credencial administrativa para migrações e bootstrap; portanto, esta proteção não conclui o fluxo de instalação. Não conceder privilégios DDL a enlace_app para contornar a recusa. O pipeline de provisionamento e a homologação PostgreSQL real permanecem bloqueadores de produção. O modo de desenvolvimento conserva o executor anterior.

## Continuação em 31/10: comando administrativo de migração

Adicionado `npm run db:migrate`. O comando exige MIGRATION_DATABASE_URL explícita, recusa o usuário enlace_app inclusive codificado na URL e não usa DATABASE_URL como fallback. A sessão administrativa é confinada ao processo do comando; a inicialização web continua somente leitura em produção.

As migrações históricas 007/008 criam/alteram papéis e a 008 referencia enlace_pbx literalmente. Por isso, o comando verifica superusuário e nome do banco antes de executar SQL. Também prepara enlace_app caso ausente, pois a 007 concede EXECUTE antes da criação desse papel. Os SQL históricos e seus checksums foram preservados. Futuro trabalho: remover a necessidade de superusuário através de um provisionamento de papéis separado.

Uso operacional: executar `npm ci`, disponibilizar MIGRATION_DATABASE_URL apenas ao processo administrativo e executar `npm run db:migrate`. Não armazenar a credencial administrativa no ambiente do serviço web. O banco enlace_pbx deve existir previamente. A senha do papel enlace_app não é definida nem alterada pelo comando; ela deve ser provisionada separadamente e corresponder à DATABASE_URL operacional. Em seguida, retirar a credencial administrativa antes de iniciar o servidor de produção.

O comando não executa bootstrap. A criação transacional e auditável do primeiro administrador permanece pendente, assim como a integração do fluxo no deploy.sh. Não usar este comando como evidência de instalação completa ou de prontidão para produção.

Validação: sete novos testes de seleção da credencial administrativa, oito regressões do migrador e 64 verificações anteriores passaram localmente; zero falhas, três integrações bloqueadas. A revisão anterior passou no CI (41083893266). Não havia PostgreSQL real disponível nesta rodada; execução administrativa, permissões e migrações completas ainda precisam ser homologadas.

## Continuação em 31/10: bootstrap administrativo explícito

Adicionado `npm run db:bootstrap`, usando MIGRATION_DATABASE_URL exclusivamente no processo administrativo e verificando banco enlace_pbx e superusuário antes da criação. A inicialização web de produção permanece sem criação de usuários.

O bootstrap usa uma transação única para tenant, usuário e auditoria. Um advisory lock transacional com o mesmo identificador do migrador serializa execuções administrativas. Um super_admin já existente faz o comando encerrar sem alterar dados, mesmo quando as credenciais iniciais estão ausentes. E-mail em uso por outro usuário é recusado. Nenhuma senha existente é atualizada.

A senha exige pelo menos 12 caracteres, recusa prefixos previsíveis e tem limite explícito de 72 bytes para evitar truncamento do bcrypt. É armazenada com bcrypt de custo 12. A senha não integra logs ou auditoria. O registro de auditoria usa o hash canônico existente, referencia o hash anterior e é obrigatório; sua falha reverte a criação. A tabela de auditoria é bloqueada durante o encadeamento para impedir escrita concorrente entre leitura do último hash e inserção.

Sequência de provisionamento: criar banco e senha operacional; executar `npm run db:migrate`; fornecer ADMIN_INITIAL_EMAIL e ADMIN_INITIAL_PASSWORD apenas ao processo `npm run db:bootstrap`; remover a credencial administrativa e os segredos de bootstrap do ambiente do serviço web; iniciar produção com DATABASE_URL de enlace_app. O deploy.sh ainda precisa incorporar essa sequência.

Seis testes novos com cliente controlado cobrem criação com hash bcrypt, administrador existente, colisão de e-mail, falha de auditoria, ausência de privilégio e limite de bytes da senha. Resultado local: 21 regressões e 64 verificações anteriores aprovadas; zero falhas, três integrações bloqueadas. A revisão anterior passou no CI (41208795126). Concorrência real, permissões, migrações e login ainda exigem homologação em PostgreSQL real.

# Auditoria de preparação para produção — 31/10/2026

Escopo: código da main em 4e9af83 e alterações acumuladas do PR #3. Revisão de provisionamento, migrações, permissões de banco, segredos de inicialização, CI e documentação. Não é certificação integral dos módulos de telefonia.

## Parecer

**Ainda não liberar para produção.** A revisão corrigiu bloqueadores de instalação e acrescentou execução com PostgreSQL real no CI. Asterisk, fluxo no host e serviço web sem root ainda precisam de homologação e ajustes.

## Achados e correções

| Prioridade | Achado | Tratamento |
| --- | --- | --- |
| Crítica | Migração 006 falha em banco vazio: CEL não possui tenant_id | Falha reproduzida no PostgreSQL 16 do CI. Nova migração 0050 cria a coluna antes das políticas; vínculo legado somente por CDR correspondente. Sem vínculo, registros permanecem invisíveis sob RLS |
| Alta | Credencial operacional tentava executar DDL e bootstrap | Separação entre validação web somente leitura e comandos administrativos explícitos |
| Alta | Lock de migração não estava preso à conexão e DDL/histórico podiam divergir | Conexão reservada, transação por arquivo, rollback e descarte de sessão com falha de desbloqueio |
| Alta | Usuário operacional podia alterar histórico de migrações | Nova migração 009 revoga escrita, TRUNCATE e outros privilégios no histórico; preserva SELECT |
| Alta | Auditoria recebia permissões excessivas e PUBLIC podia permitir DDL em clusters antigos | Migração 009 restringe auditoria a SELECT/INSERT e revoga CREATE do esquema public |
| Alta | Deploy não executava os comandos administrativos | Sequência migração, bootstrap e validação operacional incorporada antes de substituir o processo web |
| Alta | Senha inicial era gravada no .env e podia ser exibida em logs | Solicitação oculta com confirmação; senha e URL administrativa apenas no processo de provisionamento e removidas antes de iniciar o serviço |
| Alta | JWT não vazio porém curto era aceito; chave de criptografia podia faltar no boot | Validação de produção exige JWT_SECRET de pelo menos 32 bytes e ENCRYPTION_KEY de pelo menos 32 caracteres |
| Média | Deploy instalava dependências sem respeitar o lockfile e reportava sucesso mesmo sem prontidão | npm ci, checagem de tipos, consulta a /health/ready com prazo e falha explícita; falha de firewall não é ignorada |
| Média | README descrevia homologação sem evidência suficiente | Aviso de estado atual e guia operacional com critérios verificáveis |

Os comprimentos mínimos não comprovam aleatoriedade dos segredos. Gerar valores criptográficos, sem senhas previsíveis. Migrações históricas não foram editadas; as correções SQL são adicionais.

## Evidências e limites

- Validação local: 25 regressões e 64 verificações da suíte anterior aprovadas, zero falhas; três integrações da suíte anterior continuam bloqueadas neste host. Parte da suíte antiga usa inspeção textual e motor embarcado.
- Tipos, build e sintaxe do deploy são verificados. O instalador completo não foi executado neste ambiente, pois altera serviços, firewall e pacotes do host.
- Execução 41212229746 aprovada em Node 20, Node 22 e PostgreSQL 16. Cobertura do job PostgreSQL: instalação em banco vazio, repetição idempotente, bootstrap concorrente, bcrypt, auditoria, isolamento por tenant, rejeição de escrita cruzada, identidade e privilégios operacionais. Conferir também a execução do commit final, que acrescenta as validações de segredos e documentação.
- A primeira execução real (41212119109) encontrou o defeito CEL descrito acima; isso demonstra por que aprovação da suíte local não equivale a prontidão de produção.
- Build ainda gera bundle principal grande; divisão por módulo continua como melhoria de desempenho.

## Bloqueadores restantes

1. Substituir execução PM2 como root por serviço com usuário dedicado e permissões mínimas; validar acesso necessário a mídia e comandos Asterisk.
2. Preservar todas as configurações personalizadas em atualizações: o deploy atual reescreve o .env com conjunto fixo de campos e pode remover integrações não incluídas no modelo. Fazer backup protegido e revisar antes de atualizar instalações existentes.
3. Homologar deploy completo em VM limpa e em atualização de instância, inclusive restauração de backup. O deploy não é atômico: arquivos e configuração podem mudar antes da troca do processo.
4. Validar autenticação, autorização e eventos com API e navegador reais; CI PostgreSQL não cobre todas as rotas nem todos os módulos.
5. Homologar Asterisk/WebRTC, áudio, DTMF, transferência, filas, gravações e integrações externas com tráfego representativo.
6. Definir monitoramento, testes de carga, critérios de capacidade e procedimento operacional de reversão. Não há down migrations automáticas.

A prontidão /health/ready confirma persistência obrigatória, mas não aprova telefonia. Não interpretar HTTP 200 como homologação do PBX completo.

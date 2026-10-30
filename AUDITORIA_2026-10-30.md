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

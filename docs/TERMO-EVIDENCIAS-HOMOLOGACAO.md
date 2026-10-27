# Enlace-PBX — termo de evidências de homologação

**Estado inicial: NÃO HOMOLOGADO.** Este formulário não autoriza implantação,
merge, conexão com troncos reais nem migração de dados de produção.

## Identificação do ambiente

| Campo | Preencher |
| --- | --- |
| Data UTC da execução | PENDENTE |
| Responsável técnico | PENDENTE |
| Commit exato do código | PENDENTE |
| VM Debian 12 / identificador não sensível | PENDENTE |
| Versão Asterisk / Node / PostgreSQL | PENDENTE |
| Topologia isolada, sem troncos externos | PENDENTE |
| Origem dos backups e janela de consistência | PENDENTE |

## Evidências técnicas obrigatórias

Preencher cada resultado com **APROVADO**, **REPROVADO** ou **NÃO EXECUTADO**.
Não marcar APROVADO sem artefato verificável, data e responsável.

| ID | Verificação | Estado inicial | Evidência exigida |
| --- | --- | --- | --- |
| INF-01 | Preflight Debian 12 e serviços | NÃO EXECUTADO | Relatório `--report` e exit code |
| INF-02 | API HTTP local | NÃO EXECUTADO | Status e horário do health check |
| DB-01 | Manifesto e checksums | NÃO EXECUTADO | Resultado do verificador e hashes |
| DB-02 | Restauração em banco descartável | NÃO EXECUTADO | Logs sanitizados e contagens sintéticas |
| DB-03 | Migrações e integridade relacional | NÃO EXECUTADO | Versão de schema e validações |
| PBX-01 | Extração isolada de arquivos | NÃO EXECUTADO | Inventário do staging |
| APP-01 | Autenticação e autorização | NÃO EXECUTADO | Cenários com contas sintéticas |
| APP-02 | Fluxos CRM/filas/histórico | NÃO EXECUTADO | Casos de aceitação e resultados |
| TEL-01 a TEL-10 | Matriz SIP/RTP/WebRTC | NÃO EXECUTADO | Evidência individual para cada TEL |
| OPS-01 | Reinício e recuperação controlada | NÃO EXECUTADO | Logs sanitizados e sequência de eventos |
| OPS-02 | RTO/RPO observado | NÃO EXECUTADO | Cronologia e lacuna medida |
| SEC-01 | Ausência de chamadas externas | NÃO EXECUTADO | Bloqueio de troncos e tentativa negativa |

## Bloqueadores e decisão

- **Bloqueadores atuais:** VM Debian 12 real não homologada; SIP/RTP/WebRTC
  não executados; consistência de backups coordenados exige janela controlada;
  política de retenção/cópia externa/autenticidade dos backups pendente.
- **Decisão padrão:** REPROVADO PARA PRODUÇÃO até evidências completas.
- **Responsável pela aprovação:** PENDENTE.
- **Data e autorização explícita:** PENDENTE.

A aprovação de CI comprova somente os testes automatizados executados.
Nunca substituir testes em ambiente isolado por CI ou por este formulário.

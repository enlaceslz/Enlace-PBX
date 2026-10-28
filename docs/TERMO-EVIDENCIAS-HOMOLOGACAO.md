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
| TEL-01 | Inicialização do Asterisk | NÃO EXECUTADO | Log sanitizado, horário e responsável |
| TEL-02 | Registro SIP sintético A | NÃO EXECUTADO | Log sanitizado, horário e responsável |
| TEL-03 | Registro SIP sintético B | NÃO EXECUTADO | Log sanitizado, horário e responsável |
| TEL-04 | Chamada interna e CDR | NÃO EXECUTADO | Log sanitizado, horário e responsável |
| TEL-05 | Áudio RTP bidirecional | NÃO EXECUTADO | Log sanitizado, horário e responsável |
| TEL-06 | WebRTC WSS e DTLS-SRTP | NÃO EXECUTADO | Log sanitizado, horário e responsável |
| TEL-07 | Fila e URA | NÃO EXECUTADO | Log sanitizado, horário e responsável |
| TEL-08 | Gravação sintética | NÃO EXECUTADO | Log sanitizado, horário e responsável |
| TEL-09 | Reinício controlado | NÃO EXECUTADO | Log sanitizado, horário e responsável |
| TEL-10 | Recuperação após falha do PostgreSQL | NÃO EXECUTADO | Log sanitizado, horário e responsável |
| OPS-01 | Reinício e recuperação controlada | NÃO EXECUTADO | Logs sanitizados e sequência de eventos |
| OPS-02 | RTO/RPO observado | NÃO EXECUTADO | Cronologia e lacuna medida |
| SEC-01 | Ausência de chamadas externas | NÃO EXECUTADO | Bloqueio de troncos e tentativa negativa |

## Registro estruturado de evidências

Para cada item marcado como **APROVADO**, acrescentar um registro abaixo com
o formato exato (uma linha por item, sem dados pessoais ou segredos):

`EVIDENCIA: ID | artefato=<referencia-relativa> | data=<AAAA-MM-DD> | responsavel=<identificador-tecnico>`

A referência deve apontar para artefato rastreável do ambiente isolado;
não usar URLs com tokens, caminhos contendo senhas ou dados reais de clientes.
A validação automática verifica apenas o preenchimento e a consistência
formal, não a existência nem a autenticidade dos artefatos.

## Bloqueadores e decisão

- **Bloqueadores atuais:** VM Debian 12 real não homologada; SIP/RTP/WebRTC
  não executados; consistência de backups coordenados exige janela controlada;
  política de retenção/cópia externa/autenticidade dos backups pendente.
- **Decisão padrão:** REPROVADO PARA PRODUÇÃO até evidências completas.
- **Responsável pela aprovação:** PENDENTE.
- **Data e autorização explícita:** PENDENTE.

A aprovação de CI comprova somente os testes automatizados executados.
Nunca substituir testes em ambiente isolado por CI ou por este formulário.

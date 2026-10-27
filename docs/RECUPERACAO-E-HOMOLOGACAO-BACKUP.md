# Enlace-PBX — recuperação e homologação de backups

> **Estado:** procedimento de homologação, não autorização para produção.
> Executar somente em VM Debian 12 isolada e descartável, com credenciais de teste.
> O manifesto SHA-256 confirma integridade relativa, não autenticidade nem consistência entre componentes.

## Pré-condições

1. Registrar a versão do código e os pacotes instalados (Asterisk, PostgreSQL, Node.js).
2. Separar a VM de homologação da rede e do PBX de produção. **Bloquear SIP trunks, discadores e chamadas externas** até aprovação.
3. Obter os arquivos `enlace-pbx-postgres-*.dump`, `enlace-pbx-files-*.tar.gz`, `*.sha256` e o manifesto correspondente por um canal confiável.
4. Confirmar que o backup foi obtido em janela de manutenção com os serviços que gravam dados parados, ou registrar explicitamente o risco de inconsistência.
5. Preparar um banco **novo, vazio, local**, com usuário dedicado, sem privilégios de superusuário. Nunca reutilizar banco de produção.

## Verificação antes da restauração

```bash
bash scripts/verify-backup-manifest.sh /caminho/seguro/enlace-pbx-backup-YYYYMMDDTHHMMSSZ.manifest
```

Confirmar que o manifesto corresponde ao par de arquivos recebido. A verificação de checksum **não** substitui uma assinatura digital nem prova de origem.

## Recuperação do banco de dados

Use uma variável de ambiente local e temporária para não inserir a senha diretamente no comando ou no histórico do shell. Evite registrar seu conteúdo em logs. O script recebe a URL exclusivamente por **stdin**:

```bash
read -r -s -p 'URL PostgreSQL de homologação: ' RESTORE_TEST_URL
printf '\n'
printf '%s' "$RESTORE_TEST_URL" | bash scripts/restore-postgres-test.sh \
  /caminho/seguro/enlace-pbx-postgres-YYYYMMDDTHHMMSSZ.dump --stdin
unset RESTORE_TEST_URL
```

Para executar o teste de ida e volta em um **banco de teste vazio e descartável**, use:

```bash
read -r -s -p 'URL PostgreSQL de homologação: ' RESTORE_TEST_URL
printf '\n'
printf '%s' "$RESTORE_TEST_URL" | bash scripts/test-postgres-roundtrip.sh --stdin
unset RESTORE_TEST_URL
```

A URL deve apontar para PostgreSQL local, conter usuário e senha de homologação e nome terminado em `_restore_test` ou `_homologacao`. Não usar credenciais de produção. O teste de ida e volta cria e exclui uma tabela temporária no banco de teste; **não execute contra bancos com dados relevantes**.

Verificar no PostgreSQL: tabelas esperadas, contagens de registros, constraints, índices e ausência de erros de restauração. Registrar os resultados, sem exportar dados pessoais para logs públicos.

## Recuperação dos arquivos

```bash
mkdir -p /srv/enlace-pbx-staging-vazio
bash scripts/restore-pbx-files-staging.sh \
  /caminho/seguro/enlace-pbx-files-YYYYMMDDTHHMMSSZ.tar.gz \
  /srv/enlace-pbx-staging-vazio
```

O diretório de staging deve existir e estar vazio. Inspecionar `etc/asterisk`, `var/spool/asterisk/recording` e `var/lib/enlace-pbx` **dentro do staging**. Não copiar automaticamente para os caminhos reais.

## Pré-diagnóstico somente leitura na VM Debian 12

Antes dos testes TEL-01 a TEL-10, executar:

```bash
bash scripts/preflight-homologacao.sh
# Para salvar evidencias em arquivo novo, com permissoes restritas:
bash scripts/preflight-homologacao.sh --report /tmp/enlace-preflight-homologacao.txt
```

O script não instala pacotes, não reinicia serviços, não modifica arquivos e
não cria conexões SIP. Ele confere ferramentas, diretórios, status dos serviços
Asterisk/PostgreSQL/NGINX e enlace-pbx.service, resposta do CLI Asterisk e disponibilidade local
do PostgreSQL. Um resultado aprovado **não** valida mídia, WebRTC, firewall,
credenciais ou configuração completa. O diagnóstico verifica a unidade systemd `enlace-pbx.service` e consulta `http://127.0.0.1:3000/api/v1/health` com timeout de 3 segundos. A resposta HTTP não substitui testes de autenticação, autorização, integrações ou fluxos de negócio.

## Homologação da aplicação e telefonia

1. Conferir arquivos de configuração e permissões antes de qualquer promoção para diretórios ativos.
2. Utilizar configuração de laboratório, com segredos novos e troncos externos desabilitados.
3. Executar verificações estáticas e o smoke test documentado pelo projeto.
4. Iniciar componentes em sequência controlada: PostgreSQL, aplicação, Asterisk; inspecionar logs e status.
5. Validar login, migrações, filas, ramais, histórico e gravações com dados sintéticos.
6. Registrar tempo de recuperação (RTO observado), perda máxima de dados (RPO observado) e evidências.
7. Encerrar serviços e descartar credenciais de teste após homologação.

## Matriz de testes de telefonia (somente laboratório)

Registrar para cada caso: horário UTC, versão/commit, identificação sintética do ramal,
resultado esperado, resultado observado, logs pertinentes sem segredos e responsável.
Não utilizar trunks reais ou destinos externos na VM isolada.

| ID | Cenário | Critério de aceite |
| --- | --- | --- |
| TEL-01 | Asterisk inicia com configuração restaurada | Serviço ativo, configuração carregada sem erros críticos |
| TEL-02 | Registro SIP de dois ramais sintéticos | Ambos registrados, autenticação válida e rejeição de senha inválida |
| TEL-03 | Chamada interna A → B | Estabelece e encerra corretamente; CDR consistente |
| TEL-04 | Áudio RTP A ↔ B | Áudio bidirecional, sem fluxo unidirecional |
| TEL-05 | WebRTC via WSS e DTLS-SRTP | Registro, chamada e mídia segura em navegador de laboratório |
| TEL-06 | Fila/URA interna | Roteamento e eventos corretos, sem acesso a troncos externos |
| TEL-07 | Gravação sintética | Arquivo gerado, metadados corretos, reprodução e permissões conferidas |
| TEL-08 | Reinício controlado | Recuperação de registros e serviços sem intervenção indevida |
| TEL-09 | Falha de PostgreSQL | Aplicação falha de modo observável, sem perda silenciosa; recuperação validada |
| TEL-10 | Troncos externos desabilitados | Nenhuma tentativa de discagem externa possível durante testes |

**Portão de aprovação:** nenhum TEL-01 a TEL-10 pode ser marcado como aprovado
sem evidência coletada na VM. CI de scripts não equivale à homologação SIP/RTP/WebRTC.

O registro formal dos resultados deve utilizar `docs/TERMO-EVIDENCIAS-HOMOLOGACAO.md`, mantendo todos os itens como **NÃO EXECUTADO** até a coleta de evidências reais na VM.

## Critérios de aprovação

- Manifesto e hashes aprovados.
- Restauração do banco concluída sem erros e dados de teste conferidos.
- Arquivos restaurados em staging e inventário conferido.
- Aplicação inicia e passa nos testes de aceitação definidos.
- Asterisk não origina chamadas externas inadvertidamente.
- Evidências revisadas por responsável técnico.

**Bloqueadores conhecidos:** ausência de execução comprovada em VM Debian 12 real; consistência entre PostgreSQL e arquivos durante chamadas ativas não garantida; cópia externa, retenção e assinatura dos backups ainda não implementadas.

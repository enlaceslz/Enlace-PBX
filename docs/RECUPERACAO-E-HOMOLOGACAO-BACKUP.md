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

```bash
bash scripts/restore-postgres-test.sh \
  /caminho/seguro/enlace-pbx-postgres-YYYYMMDDTHHMMSSZ.dump \
  'postgresql://usuario_teste:senha@127.0.0.1:5432/enlace_pbx_restore_test'
```

Substituir as credenciais pelos valores de homologação. **Atenção:** a senha na URL passada como argumento poderá ficar visível na lista de processos; usar apenas credenciais descartáveis. Não copiar credenciais reais para o ambiente de teste.

Verificar no PostgreSQL: tabelas esperadas, contagens de registros, constraints, índices e ausência de erros de restauração. Registrar os resultados, sem exportar dados pessoais para logs públicos.

## Recuperação dos arquivos

```bash
mkdir -p /srv/enlace-pbx-staging-vazio
bash scripts/restore-pbx-files-staging.sh \
  /caminho/seguro/enlace-pbx-files-YYYYMMDDTHHMMSSZ.tar.gz \
  /srv/enlace-pbx-staging-vazio
```

O diretório de staging deve existir e estar vazio. Inspecionar `etc/asterisk`, `var/spool/asterisk/recording` e `var/lib/enlace-pbx` **dentro do staging**. Não copiar automaticamente para os caminhos reais.

## Homologação da aplicação e telefonia

1. Conferir arquivos de configuração e permissões antes de qualquer promoção para diretórios ativos.
2. Utilizar configuração de laboratório, com segredos novos e troncos externos desabilitados.
3. Executar verificações estáticas e o smoke test documentado pelo projeto.
4. Iniciar componentes em sequência controlada: PostgreSQL, aplicação, Asterisk; inspecionar logs e status.
5. Validar login, migrações, filas, ramais, histórico e gravações com dados sintéticos.
6. Registrar tempo de recuperação (RTO observado), perda máxima de dados (RPO observado) e evidências.
7. Encerrar serviços e descartar credenciais de teste após homologação.

## Critérios de aprovação

- Manifesto e hashes aprovados.
- Restauração do banco concluída sem erros e dados de teste conferidos.
- Arquivos restaurados em staging e inventário conferido.
- Aplicação inicia e passa nos testes de aceitação definidos.
- Asterisk não origina chamadas externas inadvertidamente.
- Evidências revisadas por responsável técnico.

**Bloqueadores conhecidos:** ausência de execução comprovada em VM Debian 12 real; consistência entre PostgreSQL e arquivos durante chamadas ativas não garantida; cópia externa, retenção e assinatura dos backups ainda não implementadas.

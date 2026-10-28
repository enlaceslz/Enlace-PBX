# Operação e recuperação do Enlace-PBX

## Implantação

O processo HTTP usa o usuário `enlace-pbx`, serviço systemd e código somente para leitura. O instalador precisa de root para provisionar arquivos e serviços; instalação de dependências, testes e build são executados sem root.

Pré-requisitos: Debian/Ubuntu com systemd, Node.js 22 ou 24, PostgreSQL compatível, domínio e certificado TLS já provisionado em `/etc/letsencrypt/live/DOMINIO/`. Planeje janela de manutenção para alterar configuração de telefonia ou migrar uma instância PM2.

```bash
git clone https://github.com/enlaceslz/Enlace-PBX.git
cd Enlace-PBX
sudo bash deploy.sh
```

O instalador lê a configuração existente em `/etc/enlace-pbx/runtime.json`; na migração inicial também importa `.env` sem executá-lo como shell. Senhas com espaços, aspas, `#`, cifrão e quebras de linha são armazenadas literalmente em JSON. As chaves JWT e de criptografia existentes são preservadas. Chave existente fraca faz a atualização falhar em vez de corromper dados com troca silenciosa.

Não coloque URL administrativa ou senha inicial do administrador no serviço HTTP. O bootstrap é escrito em arquivo temporário restrito e removido após as migrações. Para PostgreSQL externo, forneça a URL administrativa somente ao processo de instalação, usando um meio seguro do host. O runtime usa exclusivamente `enlace_app` em `enlace_pbx`.

Versões compiladas ficam em `/opt/enlace-pbx/releases/`; `/opt/enlace-pbx/current` aponta a versão ativa. O instalador testa `/health/ready` e falha se PostgreSQL, Asterisk ou AMI não estiverem prontos. Uma falha não autoriza considerar o deploy homologado. A troca de versão de aplicação não desfaz migrações de banco; avaliar compatibilidade antes de usar uma versão anterior.

Para migrar a instância legada PM2, use `MIGRATE_FROM_PM2=1` na janela de manutenção. O instalador interrompe apenas o processo denominado `enlace-pbx`, sem desligar outros serviços PM2. Não é configurado nenhum firewall automaticamente.

```bash
systemctl status enlace-pbx
journalctl -u enlace-pbx --since '30 minutes ago'
systemctl restart enlace-pbx
curl --fail http://127.0.0.1:3000/health/ready
```

O NGINX termina TLS e encaminha `/ws` ao WebSocket do Asterisk em loopback `8088`. AMI, ARI e porta HTTP da aplicação não devem ser publicados diretamente. Validar DNS, certificado, WSS e áudio no host real antes de liberar chamadas.

## Asterisk

O instalador não sobrescreve configurações existentes com `make samples`. A configuração gerenciada preserva seções de outras contas e usa as mesmas credenciais AMI/ARI do runtime. Essas credenciais exigem pelo menos 32 caracteres de `A-Z`, `a-z`, números, `_` e `-`, para impedir interpretação como diretivas INI. Credencial incompatível é recusada, não truncada ou alterada silenciosamente.

Para compilar, forneça explicitamente versão 20.x e SHA-256 verificado na distribuição oficial. Nenhum hash não verificado é anunciado como homologado.

```bash
sudo env PBX_CONFIG_FILE=/etc/enlace-pbx/runtime.json \
  ASTERISK_VERSION=20.17.0 ASTERISK_EXPECTED_SHA256=HASH_VERIFICADO \
  bash install-enlace-pbx.sh
```

Alternativamente, `INSTALL_ASTERISK=1` aciona esse instalador durante o deploy, com os mesmos pré-requisitos de versão e hash. A compilação e a configuração real ainda precisam de homologação no host de destino.

PJSIP gerado pela aplicação usa `/var/lib/enlace-pbx/asterisk/pjsip.conf`, incluído pelo arquivo principal. Aplicação sem root não escreve em `/etc/asterisk`. Uma recarga recusada restaura o arquivo anterior e tenta recarregá-lo. Provisionamento de arquivos em PBX remoto exige solução específica; não é confirmado como aplicado após apenas escrever um arquivo local.

O cliente AMI correlaciona respostas por `ActionID`, espera o término de listas, rejeita `Response: Error` e recusa injeção de cabeçalhos. Referência do protocolo: [eventos CoreShowChannel](https://docs.asterisk.org/Certified-Asterisk_20.7_Documentation/API_Documentation/AMI_Events/CoreShowChannel/) e [conclusão da lista](https://docs.asterisk.org/Latest_API/API_Documentation/AMI_Events/CoreShowChannelsComplete/).

## Backup integral criptografado

O backup usa um snapshot consistente do PostgreSQL e inclui runtime JSON, configuração Asterisk e gravações. O arquivo `.epbx` é autenticado e criptografado com AES-256-GCM. A chave independente fica em `/etc/enlace-pbx/backup.key` e deve ser guardada também fora do servidor; perdê-la impede recuperar as cópias.

`DATABASE_BACKUP_URL` é uma credencial operacional separada com leitura de todos os dados, inclusive linhas protegidas por RLS. Nunca usar a URL limitada do serviço HTTP para gerar uma cópia integral. As ferramentas `pg_dump` e `pg_restore` devem corresponder à versão principal do PostgreSQL de origem. O programa seleciona `/usr/lib/postgresql/VERSAO/bin` ou `PBX_POSTGRES_BIN` e recusa uma versão incompatível.

Na sessão administrativa com a credencial de backup configurada no ambiente:

```bash
node scripts/disaster-recovery.mjs create
```

Padrões:

| Item | Local |
| --- | --- |
| Configuração da aplicação | `/etc/enlace-pbx/runtime.json` |
| Configuração Asterisk | `/etc/asterisk` |
| Gravações | `/var/spool/asterisk/recording` |
| Cópias criptografadas | `/var/backups/enlace-pbx` |
| Chave independente | `/etc/enlace-pbx/backup.key` |

Use `--configuration`, `--asterisk`, `--recordings`, `--directory` e `--key` para origens alternativas. Links simbólicos são recusados; materialize as origens que precisam ser incluídas. Diretórios de cópia não podem ficar sob origens de gravações/configuração, para evitar cópias recursivas.

O banco tem consistência transacional. Arquivos de mídia são copiados e podem estar em gravação; para um ponto de recuperação consistente também na mídia, use janela sem chamadas ou snapshot do volume. Não há sincronização S3, retenção ou agendamento ativos por suposição. Configure e monitore a rotina do host após o primeiro ensaio de recuperação.

A tela **Backup e recuperação** lista apenas arquivos com manifesto disponíveis no servidor, permite download administrativo auditado de cópias pequenas e não inventa histórico ou status de nuvem. Cópias maiores que 64 MB devem ser transferidas por canal administrativo seguro, para evitar carregar gravações grandes na memória do navegador.

## Recuperar sem sobrescrever a central em operação

Use uma URL administrativa com criação de banco na sessão de recuperação e a chave externa. O destino deve ser novo e o nome do banco deve começar com `enlace_restore_`:

```bash
node scripts/disaster-recovery.mjs restore \
  --file /var/backups/enlace-pbx/ARQUIVO.epbx \
  --destination /var/backups/enlace-pbx/ensaio-novo \
  --database enlace_restore_ensaio
```

O comando autentica a cópia inteira antes de extrair, rejeita links e caminhos externos, valida o SHA-256 do dump, restaura em uma única transação e compara as contagens de todas as tabelas públicas. Um banco existente não é alterado. A configuração recuperada não é copiada para `/etc` nem substitui automaticamente o serviço ativo.

O papel `enlace_app` precisa existir no cluster de recuperação, com as restrições exigidas pela aplicação. O arquivo não transporta senhas de papéis PostgreSQL do cluster. Reprovisione esses papéis separadamente em um novo servidor. A restauração reaplica os privilégios mínimos no banco recuperado e protege o histórico de migrações.

Depois do ensaio, validar login, isolamento, gravações, permissões de arquivos e telefonia no ambiente recuperado. A promoção do banco e dos arquivos exige plano de corte; o comando de recuperação não realiza esse corte.

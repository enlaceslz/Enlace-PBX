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

PJSIP gerado pela aplicação usa `/var/lib/enlace-pbx/asterisk/pjsip.conf`, incluído pelo arquivo principal. Aplicação sem root não escreve em `/etc/asterisk`. PJSIP e plano de discagem são gravados com substituição atômica por arquivo, sob fila única de aplicação. Se uma recarga falhar, ambos retornam às versões anteriores. Mudanças de transportes podem exigir reinício do Asterisk em janela de manutenção; reload não substitui teste de registro e chamada. Provisionamento de arquivos em PBX remoto exige solução específica; não é confirmado como aplicado após apenas escrever um arquivo local.

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

## Escopo do provisionamento de telefonia

A aplicação automática de configuração global é exclusiva de `super_admin`. Em produção, o gerador recusa ramais/troncos de múltiplas empresas no mesmo host até que os namespaces e contextos SIP sejam homologados. RLS de banco não constitui isolamento de mídia ou dialplan. Utilize uma instância de PBX por empresa nesse fluxo.

Troncos com autenticação exigem recadastro da senha para preencher o campo cifrado introduzido na migração 011; o sistema anterior guardava apenas máscara. Campo de senha vazio em uma atualização preserva a credencial existente. A resposta da API não devolve a senha. Credenciais usadas na versão antiga precisam de rotação, pois o fluxo anterior podia gravá-las em auditoria.

O plano de saída gerado aceita o plano nacional brasileiro e bloqueia DDI e prefixos premium por padrão, inclusive após remoção/adição de prefixo e na contingência. Rotas sem tronco real da empresa são recusadas. Homologue números nacionais, 0300/0800 e serviços de emergência com a operadora antes de habilitar tráfego.

## 9router e destinos HTTP aprovados

No arquivo de configuração do serviço, definir `NINEROUTER_URL` com o caminho base da API compatível (por exemplo, terminado em `/v1`), `NINEROUTER_API_KEY` e `NINEROUTER_MODEL`. Não há servidor nem modelo padrão. Incluir a origem exata (esquema, host e porta, sem caminho) em `OUTBOUND_ALLOWED_ORIGINS`. Múltiplas origens são separadas por vírgula. Essa configuração é administrativa e não é concedida por usuários de uma empresa.

Integrações externas exigem HTTPS. Para serviço privado autorizado, incluir sua origem também em `OUTBOUND_PRIVATE_ORIGINS`; essa exceção permite HTTP e endereços privados daquela origem. Não habilita metadados link-local, multicast, endereços reservados ou redirects. O endereço resolvido é fixado na conexão e a verificação TLS continua usando o nome original. O provedor precisa oferecer `GET /models` e `POST /chat/completions` com JSON compatível; a geração exige contagens reais de tokens.

## Interpretação do monitoramento VPN

O serviço sem root pode não ter permissão para consultar WireGuard ou o daemon ZeroTier. Nesse caso, corrigir o mecanismo de observação no host sem executar todo o PBX como root. Não conceder capacidade de administração de rede ao processo web apenas para contornar essa restrição. Ainda falta homologar um agente de observação com privilégios mínimos.

Handshake WireGuard recente indica atividade do peer, sem assegurar registro SIP ou áudio. RTT, jitter, MOS, perda e contagem de pacotes indisponíveis aparecem sem valor medido. A sonda TCP/5060 é útil apenas para um destino que realmente escute TCP nessa porta; ausência de resposta não prova que o túnel UDP ou o telefone esteja offline. Se uma versão anterior expôs respostas de saúde do WireGuard, avaliar a rotação das chaves no host e nos peers correspondentes.

## Teste real das ferramentas HTTP de IA

A tela de ferramentas possui parâmetros JSON e execução real por `POST /api/v1/ai/tools/:id/test`, exclusiva de `admin` e `super_admin` no contexto da empresa. Selecionar a ferramenta não faz chamadas. O teste consulta o cadastro atual no banco; não usa `mockResponse`, endpoint enviado no pedido nem credenciais do navegador. O cadastro e a edição validam nome, URL absoluta, método e schema, e a consulta para edição/exclusão também respeita a empresa.

Além de autorizar a origem em `OUTBOUND_ALLOWED_ORIGINS`, configure `AI_TOOL_BINDINGS_JSON` no servidor. O valor é uma string contendo um array JSON, com vínculo exato de empresa, ID da ferramenta, URL e método:

```dotenv
AI_TOOL_BINDINGS_JSON='[{"tenantId":"empresa-exemplo","toolId":"tool-ID-CADASTRADO","endpoint":"https://erp.example.invalid/api/consulta","method":"POST","bearerToken":"TOKEN-DO-ERP"}]'
```

O token é opcional e fica somente no arquivo protegido de configuração do serviço. No formato `runtime.json`, essa variável também deve ter um **valor string**, não um array nativo. Não usar senhas na URL, no schema ou em valores de exemplo. Reiniciar o serviço depois da atualização administrativa. Vínculo ausente, duplicado ou divergente bloqueia a chamada. Alterar URL/método no cadastro exige revisar o vínculo no servidor; a credencial não acompanha automaticamente essa alteração.

O schema raiz deve ter `type: object`. Suportam-se `properties`, `required`, objetos fechados (propriedades adicionais são recusadas), arrays com `items`, tipos escalares, `enum` escalar, `minimum`, `maximum`, `minLength`, `maxLength`, `minItems`, `maxItems`, `title` e `description`. Referências, regex, formatos, composições e outros recursos não são aceitos. Há limites de 16 KB, seis níveis de schema e 128 nós; parâmetros também têm limite de 16 KB. Não há coerção de tipos nem preenchimento automático de valores. Parâmetros GET precisam ser escalares e não podem colidir com a query da URL cadastrada; POST envia JSON.

Ferramentas marcadas com `requiresConfirmation` exigem confirmação explícita em cada tentativa. Há limite de dez testes por minuto por IP. A auditoria de tentativa, sem parâmetros, token ou resposta, deve estar persistida antes do envio. Cada tentativa leva `X-Enlace-Request-Id`; isso não garante idempotência no sistema externo. Não há retry automático. Uma falha de rede ou resposta inválida após POST pode ocorrer depois da alteração externa: conferir o destino antes de repetir.

Este fluxo é um teste administrativo HTTP. Não ativa execução autônoma dessas ferramentas nas chamadas do agente MaIA. A homologação do contrato de cada ERP/CRM, das permissões do token e das operações que alteram dados continua obrigatória.

## Webhooks assinados de teste

A migração 012 cria `outbound_webhooks` e `webhook_deliveries`, com RLS forçada por empresa. Administradores da empresa cadastram nome/URL no CRM e habilitam o destino para testes. O cadastro não dispara eventos automáticos nem sincroniza um CRM. A listagem global antiga de `system_settings.webhooks` não é migrada automaticamente: revisar e recadastrar cada destino na empresa correta.

Para permitir o envio, autorizar a origem em `OUTBOUND_ALLOWED_ORIGINS` (e, apenas para serviço interno explicitamente autorizado, em `OUTBOUND_PRIVATE_ORIGINS`) e configurar o vínculo administrativo:

```dotenv
WEBHOOK_BINDINGS_JSON='[{"tenantId":"empresa-exemplo","webhookId":"ID-DO-CADASTRO","endpoint":"https://destino.example.invalid/webhook","signingSecret":"SEGREDO-ALEATORIO-COM-PELO-MENOS-32-CARACTERES"}]'
```

No `runtime.json`, a variável também é uma string contendo o array serializado. O segredo permanece apenas no arquivo protegido de configuração do serviço, nunca na URL, no banco de cadastro ou nas respostas de listagem. Vínculo ausente, duplicado, de outra empresa ou com URL divergente bloqueia o envio. Reiniciar o serviço após alterar a configuração. Desabilitar um destino impede novos testes; não desfaz uma tentativa já iniciada.

`POST /api/v1/webhooks/test` aceita `webhookId` e carrega a URL do banco. O corpo entregue contém `id`, `event: enlace.webhook.test`, `tenantId`, `webhookId`, `timestamp` ISO e `data: {test: true}`. Não há chamada, cliente ou CDR fictícios. O ID também vai em `X-Enlace-Request-Id`. `X-Enlace-Signature-256` contém `sha256=` seguido do HMAC-SHA256 hexadecimal dos **bytes originais** do corpo JSON, usando `signingSecret`. O receptor deve comparar a assinatura em tempo constante, impor janela de tempo ao `timestamp` e deduplicar `id` para prevenir replays; esta aplicação não controla essas verificações no receptor.

A auditoria e o registro `PENDING` precisam estar persistidos antes de qualquer envio. Somente um HTTP 2xx observado e confirmado no banco produz `ACKNOWLEDGED`. Resposta textual ou vazia é aceita; o conteúdo da resposta é descartado. Falha de comunicação, resposta não 2xx ou ausência de confirmação final não prova que o destino deixou de processar: conferir antes de repetir. Estados `UNKNOWN` e `PENDING` não geram retries automáticos. HTTP 2xx confirma recebimento HTTP, sem atestar processamento de negócio. Há timeout de cinco segundos, limites de corpo/resposta, recusa de redirects e limite de dez testes por minuto por IP.

O histórico em `GET /api/v1/webhooks/:id/deliveries` retorna as últimas 25 tentativas da empresa, com estado, HTTP observado quando disponível e duração medida. Não persiste segredo, corpo entregue ou resposta externa. Ainda falta implementar fila/outbox e contratos de eventos automáticos de produção; esta versão entrega cadastro e teste manual assinados.

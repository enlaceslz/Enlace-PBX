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

As antigas rotas `/api/v1/system/backup` e `/api/v1/system/restore` foram retiradas em todos os ambientes (501, `LEGACY_BACKUP_RETIRED`). Não importam JSON nem restauram sobre o banco em uso. Utilize o procedimento abaixo; uma cópia antiga em JSON não é uma cópia integral recuperável.

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

## Extração manual de entidades com evidências

A migração 013 cria esquemas de extração por empresa com RLS forçada. A tela permite cadastrar campos, habilitar/desabilitar o esquema e testar um texto. O cadastro global antigo de `system_settings.entity_schemas` não é copiado automaticamente para empresas; revisar e recadastrar os esquemas. Não há sincronização automática com CRM ou execução dessa extração nas chamadas de voz.

Para permitir envio externo, configurar `NINEROUTER_URL`, `NINEROUTER_API_KEY`, origem HTTP autorizada, `ENTITY_EXTRACTION_MODEL` e `ENTITY_EXTRACTION_ENABLED_TENANTS` com IDs das empresas separados por vírgula. O modelo não tem valor padrão. A autorização administrativa deve refletir o destino e o tratamento de dados acordados para cada empresa. O texto completo será enviado ao provedor configurado; não enviar dados que não devam ser compartilhados com ele. Credenciais permanecem no servidor.

Os esquemas têm até 20 campos, com chave única, rótulo, tipo, obrigatoriedade e descrição. Tipos: `string`, `number`, `currency`, `cpf_cnpj`, `date` e `boolean`. Definições têm limites de comprimento e de 12 KB para o conjunto de campos; textos têm limite de 16 KB. A rota recebe `schemaId` e `text` e carrega o esquema no contexto da empresa. Há limite de dez tentativas por minuto por IP. É necessário registrar auditoria antes de consultar o provedor.

O modelo deve responder somente `{"fields":{"chave":"trecho literal ou null"}}`. O backend recusa chaves desconhecidas e JSON incompatível; trechos inexistentes, valores gerados em vez de trechos e conversões não suportadas ficam nulos, listados em `rejectedFields`. O resultado contém `evidence`, `missingRequired` e `reviewRequired: true`. Não há percentual de confiança inventado nem preenchimento de CPF, ramal, orçamento ou intenção ausentes.

Números e moedas são derivados de literais em formato brasileiro: `15.000,50` vira `15000.5`, e moeda aceita prefixo `R$`. Não se interpretam números por extenso ou valores aproximados. Booleanos aceitam apenas os trechos literais `sim`, `não`, `nao`, `true` e `false`; ausência nunca equivale a falso. Datas e documentos são preservados como escritos, sem validar identidade, dígitos verificadores ou calendário. Campos obrigatórios ausentes continuam nulos; não são inventados para satisfazer o esquema.

**Revisar sempre o contexto.** Um trecho pode existir no texto e ainda ser escolhido para o campo errado, inclusive diante de instruções maliciosas dentro da conversa. A verificação literal limita invenções, sem comprovar correção semântica. Esta função não deve autorizar pagamentos, cadastro, cobrança, identificação ou outras alterações automaticamente. A aplicação não persiste transcrição, resposta ou evidências nessa rota; a auditoria registra somente tentativa, esquema e ID de execução. O provedor externo possui seu próprio tratamento de dados, que deve ser verificado na homologação.

A heurística antiga de qualidade foi retirada do fluxo de produção: a heurística anterior declarava resolução e conformidade sem comprovação. Avaliações históricas precisam de revisão e não são certificação de conformidade. O bloqueio não apaga registros anteriores.

## Supervisor assistido e revisão humana

A migração 014 cria `quality_reviews`, separada do histórico heurístico `quality_audits`. O novo supervisor seleciona trechos literais para saudação, problema relatado, declaração sobre solução, menção à gravação e próximo passo. **Não produz notas, sentimento, consentimento, resolução ou certificação de conformidade.** Uma menção à gravação ou declaração de solução não comprova execução nem autoriza concluir conformidade. Ausência de trecho selecionado também não comprova ausência do evento na conversa.

Configurar `QUALITY_REVIEW_MODEL` e `QUALITY_REVIEW_ENABLED_TENANTS` com IDs separados por vírgula, além das credenciais/URL do 9router e da política HTTP de saída. O modelo não tem valor padrão. A autorização precisa considerar tanto o envio da transcrição ao provedor quanto a persistência dos trechos selecionados na empresa. O servidor não grava a transcrição completa neste fluxo; o provedor externo pode ter suas próprias regras de armazenamento, a verificar na homologação. Trechos e anotações podem conter dados pessoais e precisam seguir a política operacional da empresa.

`POST /api/v1/ai/quality-supervisor/evaluate` recebe `channel` (`voice`, `whatsapp` ou `webrtc`), `transcript` de até 16 KB e `reference` opcional de até 128 caracteres. A referência é informada pelo usuário e não constitui vínculo verificado com CDR ou chamada. Só `admin`, `super_admin` e `supervisor` podem preparar, consultar ou revisar. Há dez análises por minuto por IP. A tentativa precisa de auditoria persistida antes de enviar texto; os registros de auditoria não incluem a transcrição ou os trechos.

Após resposta validada, as evidências literais são persistidas como `PENDING`. A API só confirma criação depois do commit. Trechos inventados são recusados e indicados em `rejected_fields`; a associação semântica do trecho ao critério ainda exige conferência humana da fonte original. Não há sincronização de CRM, mudança no atendimento ou retry automático.

`GET /api/v1/ai/quality-supervisor/reviews` lista as últimas 100 revisões da empresa. O detalhe, em `/reviews/:id`, exige auditoria antes de retornar as evidências. `POST /reviews/:id/review` recebe `note` de até 2000 caracteres e registra o usuário autenticado e o horário, uma única vez. A anotação declara a revisão humana, sem certificar conclusão ou conformidade. O banco protege as evidências contra alteração e impede sobrescrever a revisão concluída. A recuperação integral reaplica as permissões restritas; histórico não pode ser excluído pelo papel operacional nesse fluxo.

Os registros legados não são automaticamente convertidos em revisões verificadas. A API legada identifica o histórico como não verificado e não reapresenta suas notas, sentimento ou conclusões positivas como fatos. Os dados originais permanecem no banco para revisão administrativa.

## Copiloto omnichannel legado

A sugestão antiga foi removida: continha PIX fixo, preços e alegações de ajustes de rede sem execução real. O fluxo foi substituído por seleção de catálogo revisado, descrita abaixo, sem reutilizar o texto livre ou as cobranças do código antigo. Nunca gerar cobrança ou afirmar intervenção a partir de palavras-chave. Se a versão antiga foi utilizada, revisar mensagens efetivamente enviadas pelos operadores. Este bloqueio não apaga o histórico nem comprova que uma sugestão chegou a ser enviada.

## Copiloto com catálogo revisado

Configurar `COPILOT_MODEL` e `COPILOT_ENABLED_TENANTS` (IDs separados por vírgula), além do 9router e das origens HTTP autorizadas. O modelo não tem valor padrão. A autorização permite enviar ao provedor a última mensagem de texto recebida, sem nome/telefone do contato como campos adicionais nem histórico completo. O próprio texto pode conter dados pessoais; avaliar o destino e o tratamento de dados do provedor antes de habilitar cada empresa.

`POST /api/v1/omnichannel/ai-suggest` recebe apenas `conversationId`; campos como `history` fornecidos pelo cliente não são utilizados. O backend busca a conversa da empresa e exige que a última mensagem seja texto recebido de contato/usuário, ainda sem mensagem posterior do atendente/bot. Conversas encerradas, anexos, mensagens vazias ou acima de 8 KB são recusados. A tentativa exige auditoria persistida antes do envio, sem texto da conversa, e tem limite de dez sugestões por minuto por IP. Papéis permitidos: `super_admin`, `admin`, `supervisor` e `operator`.

O modelo responde somente `templateId` e uma evidência literal. O backend recusa catálogo desconhecido, campos extras, texto livre e evidência inexistente; `suggestion` vem exclusivamente das três perguntas revisadas no código. O fluxo não oferece preços, PIX, cobranças ou promessas de intervenção. A evidência não comprova que a escolha foi semanticamente adequada: o operador precisa conferir o contexto. Não há edição do catálogo por usuários nem chamada de ferramenta, alteração de conversa ou envio automático.

A tela apresenta o rascunho separado, vinculado à conversa e ao ID da mensagem. Trocar a conversa ou carregar uma mensagem mais recente impede aplicar o rascunho antigo. O operador pode usar ou descartar a sugestão; ela não substitui uma resposta já em edição. Rascunhos digitados ficam separados por conversa na memória da tela, sem persistência após sair/recarregar. A geração não grava a sugestão na conversa nem comprova qualquer ação no PBX.

O envio manual usa autenticação e o caminho confirmado pela Meta. Em erro, mantém o texto para conferência; não repete automaticamente. A interface passa a reconhecer `content` e `sender: contact` das mensagens recebidas. O backend recusa novas saídas por essa rota para conversas encerradas ou canais diferentes de WhatsApp; outros canais ainda precisam de adaptadores próprios.

Depois do ACK da Meta, a saída é acrescentada sob bloqueio de linha e deduplicada pelo identificador da mensagem, preservando entradas recebidas enquanto o envio estava em andamento. Uma saída humana confirmada promove espera/fila/bot para `active` apenas no estado da conversa, sem alegar transferência de chamada. Falhas de rede ou persistência após o envio podem deixar resultado incerto: consultar o destino antes de reenviar. A entrega real com conta Meta e o comportamento no navegador continuam exigindo homologação.

## Estado e responsável do atendimento omnichannel

A migração 015 separa `workflow_version`, `assigned_user_id` e `notes` das mensagens do cliente. As alterações de atendimento não acrescentam mensagens fictícias de sistema nem substituem o histórico da conversa. A listagem exige papel operacional (`super_admin`, `admin`, `supervisor` ou `operator`) e contexto da empresa.

`PATCH /api/v1/omnichannel/conversations/:id/status` recebe `status` e a `workflowVersion` carregada na conversa. Estados de destino: `active`, `queued` e `closed`. A atualização usa bloqueio de linha e comparação de versão: pedido desatualizado recebe 409, e a tela atualiza a conversa antes de nova tentativa. `active` registra o usuário autenticado como responsável; espera ou encerramento liberam o responsável. Um operador comum não assume nem encerra atendimento atribuído a outro; administradores e supervisores podem administrar essa atribuição explicitamente. Atendimento encerrado só muda manualmente para `active`.

Esses estados dizem respeito ao atendimento textual. Não transferem canais Asterisk nem estabelecem mídia. `queued` significa espera humana genérica, sem atribuição a fila/ramal específico. Encaminhamento omnichannel retorna 501, e a antiga interface com destinos fixos foi removida. `bot_handling` também retorna 501 para novas solicitações: não há worker autônomo homologado para receber essa devolução. Marcadores históricos de automação são apresentados como pendentes, sem alegar execução.

Antes de uma saída WhatsApp com configuração válida, o servidor audita a tentativa e reserva atomicamente um atendimento sem responsável para o operador. Dois operadores comuns não conseguem reservar simultaneamente a mesma conversa. A reserva marca atendimento humano, sem confirmar entrega; em falha posterior da Meta o responsável permanece registrado até uma alteração explícita. Supervisores/administradores podem auxiliar atendimento atribuído, sem substituir automaticamente o responsável. A mensagem só é registrada após confirmação da Meta. Uma mensagem recebida nova, após encerramento, reabre a conversa em `waiting`, sem responsável e com nova versão; repetição do mesmo ID não reabre nem incrementa novamente.

## Anotações internas

`POST /api/v1/omnichannel/conversations/:id/notes` recebe `text` de até 4000 caracteres e `requestId` de 16 a 64 caracteres alfanuméricos/hífens. O navegador usa UUID e reutiliza o identificador ao repetir a mesma tentativa não confirmada. A mesma chave, autor e texto retornam a anotação existente; uso da chave com outro conteúdo ou autor recebe 409. A gravação usa bloqueio de linha, sem substituir mensagens ou etiquetas. Há limite de 1000 anotações por conversa, sem descarte automático de registros.

O autor e o nome vêm da sessão autenticada; `agentName` enviado no corpo não define autoria. A auditoria registra a tentativa e a chave, sem conteúdo da anotação. Rascunhos de notas ficam separados por conversa na memória da tela; falhas não apagam o texto. As antigas notas em etiquetas permanecem como dados legados e não são convertidas automaticamente em registros de autoria confiável. Não há alteração ou exclusão de anotação pela API deste fluxo.

A tela removeu o modal duplicado de configuração WhatsApp, usa sessão/contexto ao configurar e não oferece um token de verificação que a API não grava. Esse segredo é configurado no servidor. Os fluxos continuam exigindo homologação no navegador e na conta Meta real.

## Preparação persistente de campanhas

A migração 016 adiciona versão do planejamento e destinos por empresa com RLS e chave composta. A tela oferece criação/edição de rascunho, importação, consulta paginada e remoção de destinos. **Não existe worker de discagem homologado neste módulo.** O antigo toggle apenas trocava um rótulo: agora retorna 501 sem alterar estado, contador ou chamada. Preparar campanha não origina, pausa nem encerra ligações. Ainda faltam fila de execução, limites operacionais, rastreamento de tentativas, eventos de chamada e recuperação após falha, além da homologação Asterisk/operadora.

Criação aceita somente nome, tipo planejado (`ai_voicebot`, `power_dialer` ou `predictive`) e agente opcional. Identificador, estado e contadores não podem ser fornecidos pelo cliente. Rascunhos novos começam com contadores legados zerados; o total de destinos exibido vem de `campaign_leads`. Os tipos descrevem o planejamento, sem atestar a implementação desses modos de discagem. O agente, quando vinculado, precisa existir na empresa. A nova FK composta protege vínculos novos, sem validar ou corrigir silenciosamente referências antigas (`NOT VALID`); revisão de dados legados continua necessária.

`POST /api/v1/campaigns/:id/leads` recebe `phones`, array de 1 a 500 strings. Telefones aceitam formatação comum, DDD nacional e prefixo opcional `55`/`+55`; são normalizados para dígitos com código do país. Não se aceitam DDI estrangeiro, seleção de prestadora, emergência ou serviços especiais nesse cadastro. Isso verifica formato e política de destino, **sem comprovar existência, titularidade, disponibilidade ou autorização de contato**. Não há consulta de consentimento ou elegibilidade regulatória neste fluxo de preparação.

O lote inteiro é validado antes da importação; qualquer entrada inválida impede gravar o lote. Há deduplicação por campanha/telefone, serialização pelo registro da campanha e limite de 10000 destinos; ultrapassar o limite reverte a transação. Importar novamente o mesmo conjunto não cria duplicatas nem incrementa a versão se nenhum destino novo foi gravado. Não são enviados telefones a um serviço externo.

A consulta `/leads` exige auditoria antes de devolver telefones e usa páginas de 100, com `nextCursor`/`after` por telefone. É paginação de uma lista viva, sem snapshot entre páginas; atualizar a consulta para incluir mudanças anteriores ao cursor. O corpo de `DELETE /leads` recebe `phone` e `planVersion`. Edição de metadados e exclusão do rascunho também exigem versão atual, devolvendo 409 em conflito. Excluir rascunho elimina seus destinos em cascata; não elimina histórico de chamadas porque este fluxo não executa chamadas.

Registros antigos com estado ou contadores não compatíveis com um rascunho limpo são apresentados como `unverified`, preservados no banco e recusados para edição/importação/exclusão por esse fluxo. Os contadores antigos não são usados como métricas de discagem confirmada. Preparar uma nova campanha ou revisar administrativamente o legado antes de qualquer futura ativação. A listagem mostra os últimos 100 registros, sem alegar total global.

Acesso limitado a `super_admin`, `admin` e `supervisor` da empresa. Mutações exigem auditoria prévia; a auditoria não grava a lista de telefones. Recuperação integral inclui os novos registros. O módulo continua sem liberação para discagem de produção.

### Fail2ban: consulta e limites atuais

O painel consulta o binário fixo `/usr/bin/fail2ban-client` com o usuário do serviço Enlace-PBX. É preciso que o Fail2ban esteja instalado e que a consulta já seja permitida pela política operacional do host. Não conceda acesso amplo a sudo ou ao socket apenas para habilitar o painel: o socket pode autorizar também alterações administrativas. Quando a leitura não é permitida, a API retorna 503 e mostra indisponibilidade, sem usar o JSON legado como proteção ativa.

A leitura aceita até 32 jails e usa prazo total de cinco segundos, limite de saída e cache de 15 segundos; apresenta contadores do serviço, sem certificar regras, portas protegidas, geolocalização ou eficácia do firewall. Bloqueio/desbloqueio, reload, whitelist, alteração de regras e simulação de ataque pelo painel permanecem indisponíveis (501) em todos os ambientes. Um agente com autorização mínima e homologação no host ainda é necessário para alterações reais.

### Cache e identificação de erros da API

As respostas de `/api` usam `Cache-Control: no-store`, inclusive autenticação, erros e SSE. O proxy/CDN deve respeitar essa política; não configure cache forçado nas rotas da API. Recursos estáticos mantêm o comportamento próprio do servidor de arquivos.

O servidor gera `X-Request-Id` por requisição; falhas inesperadas também devolvem `requestId` no JSON. Use esse identificador ao investigar uma falha. O handler global registra status/identificador sem copiar o corpo da requisição ou o erro bruto. Isso não substitui a revisão dos logs específicos de cada integração nem comprova a política de um proxy externo.

### Controle administrativo de chamadas e confirmação AMI

As rotas administrativas de canais exigem AMI configurado, inclusive com Asterisk local. Resposta 202 com `accepted: true`, `status: ACCEPTED` e `operationId` significa que o AMI aceitou a ação. Verifique canais e eventos no host para confirmar o resultado; não repita automaticamente após timeout/502, pois o comando pode ter chegado ao Asterisk.

Originação exige empresa selecionada e dois ramais internos cadastrados e sem ambiguidade entre empresas. Este endpoint não habilita discagem externa nem ponte IA. Transferência e supervisão exigem destino na empresa do canal; redirecionamento aceita apenas contexto `from-internal`, prioridade 1. Nomes Local e endpoints não identificados ficam sem empresa inferida; Caller ID nunca é autorização. O superadmin global pode consultar todos os canais, mas uma empresa explicitamente selecionada limita a operação a esse escopo.

O identificador do canal pode ser Uniqueid ou nome na API: uma leitura nova resolve o nome real para AMI. Regras de empresa vêm do endpoint provisionado; namespaces SIP por empresa ainda exigem homologação. Validar chamada atendida, sinalização, encerramento, transferência e áudio de ChanSpy no servidor real antes de liberar esses fluxos ao uso operacional.

### MaIA: prévia e ações em chamadas

A rota autenticada `/api/v1/ai/voice-turn` atende à prévia no navegador e não aceita identidade telefônica fornecida pelo cliente. Campos `channelId`, `asteriskChannelId`, `asteriskUniqueId`, `linkedId` e `callerNumber` causam 400. Sessões de outra empresa/desconhecidas retornam 404; sessões vinculadas a telefonia não podem ser usadas pela prévia. Um adaptador autenticado de eventos ARI/AMI ainda é necessário para estabelecer o vínculo real da chamada.

Executores internos de transferência/encerramento exigem empresa e canal, auditam obrigatoriamente a tentativa e usam o controle protegido de canais. Aceite AMI fica pendente de confirmação operacional e não encerra a sessão da IA como se a chamada já tivesse terminado. Falha após tentativa pode ter resultado desconhecido: consulte o estado real antes de repetir. Áudio, transferência concluída e encerramento observado exigem homologação no Asterisk real.

### Turnos da MaIA: histórico, concorrência e recuperação

O histórico de contexto vem da sessão persistida na empresa, limitado aos últimos seis registros de usuário/assistente. O campo de histórico do navegador não alimenta o modelo. O agente selecionado permanece associado à sessão.

Uma reserva por UUID impede processamento simultâneo da mesma sessão entre instâncias. Pergunta/resposta e contadores são confirmados na mesma transação; falha de persistência não confirma o turno. A reserva é liberada ao terminar normalmente ou ao tratar uma falha. Não há retry nem expiração automática: após queda abrupta do processo, investigue ações/registro da sessão e inicie outra prévia. Liberação manual de reserva exige verificar que o processamento anterior realmente terminou e quais efeitos externos ocorreram.

Encerramento de prévia recusa turno ativo e sessão telefônica. Ele registra apenas o encerramento da prévia, sem inventar nota, sentimento, resumo ou desligamento de chamada. Duração da sessão representa tempo decorrido; não é medição de áudio.

### Gravações originais e análise de CDR

Configure `RECORDINGS_ROOT` com diretório absoluto no host Linux que contenha as gravações vinculadas no CDR. O usuário do serviço precisa de leitura; não amplie permissões de escrita do processo web. Referências relativas são resolvidas nessa raiz; absolutas precisam permanecer nela. URLs externas, links simbólicos e traversal não são aceitos. A leitura verifica o descritor em `/proc/self/fd`, limita arquivos regulares a 50 MB e aceita extensões WAV, MP3, Ogg e Opus. Nenhum arquivo de áudio é criado pela aplicação quando a gravação não existe.

O navegador carrega o arquivo autenticado integralmente em memória, com controles nativos; não há busca HTTP por byte-range nesta versão. O acesso é auditado antes do envio. Reprodução e download do arquivo já carregado ocorrem localmente no navegador. Verifique memória, permissões, arquivos do MixMonitor, formatos e decodificação nos navegadores utilizados. Não há afirmação automática de codec ou qualidade a partir do cadastro.

A análise de transcrição usa `CDR_ANALYSIS_ENABLED_TENANTS`, `CDR_ANALYSIS_MODEL` e configuração 9router/origens já exigida pelo transporte seguro. Exige texto registrado de até 16 KB, autorização de empresa e auditoria antes do envio externo. Retorna trechos literais em prévia para revisão humana; não altera o CDR nem certifica satisfação, resolução ou conformidade. Ingestão/transcrição automática e homologação com provedor/áudio reais continuam pendentes. Endpoint manual de análise não aceita cdrId para alterar bilhetagem.

### Relatórios e operações financeiras disponíveis

CSV de CDR/auditoria exporta apenas a amostra carregada, com proteção de células textuais contra interpretação de fórmulas, escape de aspas e UTF-8. Aplicações de planilha têm comportamentos próprios; mantenha importação de colunas textuais e confira identificadores/números de telefone. PDF de chamada não substitui gravação, perícia ou revisão humana; não cria transcrição ausente nem certifica resumos antigos.

Os PDFs de cobrança são extratos gerenciais de registros existentes. Não emitem nota fiscal, PIX, boleto ou prova independente de pagamento. Não há emissão de cobrança por DID sem fatura persistente. O histórico pode ser limitado pela API; exportação não garante cobertura integral de período. Fonte básica dos PDFs atende texto latino; demais caracteres são representados por [U+...] e o CSV mantém Unicode original.

Recarga e quitação via painel/API estão indisponíveis (501), pois não há confirmação de provedor nem conciliação implementadas. Não habilite pelo retorno de botão ou por payload enviado pelo navegador. Antes de reativar, implementar provedor real, confirmação autenticada no backend, processamento idempotente, conciliação, trilha de auditoria e testes de duplicidade/falha/estorno. Dados financeiros anteriores devem ser revisados; o bloqueio não certifica lançamentos históricos.

### Gestão de contas e atualização das sessões

Após instalar esta revisão, usuários precisam fazer novo login: tokens antigos sem o vínculo de revisão são recusados. Senha, perfil, atividade, e-mail ou ramal alterados invalidam sessões anteriores; reativação/restauração de perfil não recupera o token. Tickets SSE são revalidados no handshake e conexões abertas verificam a revisão antes dos envios, com polling de dois segundos sem sobreposição. Falha ao verificar encerra a conexão.

Admin de empresa não modifica contas superadmin, inclusive senha e e-mail. Apenas superadmin pode atribuir esse papel. A aplicação protege o último superadmin ativo e recusa autoexclusão; administração direta do banco exige o procedimento operacional próprio. Criação requer senha explícita, com no mínimo 12 caracteres e até 72 bytes UTF-8; não há senha temporária escondida ou senha padrão. Espaços fazem parte da senha.

A revisão está no banco e o vínculo JWT usa JWT_SECRET. Ao restaurar backup antigo e preparar o corte, substitua JWT_SECRET por novo segredo forte para invalidar tokens do estado anterior; não altere ENCRYPTION_KEY sem o procedimento de recifragem, pois ela protege credenciais. Dados de backup podem representar revisão de sessão anterior. Nenhum reset global de senhas ou corte de produção foi executado pela auditoria.

O ticket SSE mantém a empresa autorizada na emissão. Query ou cabeçalhos da conexão não alteram esse escopo; para mudar a empresa, emita novo ticket no contexto autorizado correspondente.

### Encerramento local de sessão e telemetria no navegador

O painel verifica /auth/me antes de abrir a área privada. Não há simulação de perfil pela barra superior. Rejeição de autenticação/revogação da API local remove o token e o alias antigo, limpa estados carregados e retorna ao login. Permissão negada comum e falha de rede não significam, por si, que a sessão foi revogada. Logout local não invalida uma cópia externa de JWT ainda válida no servidor; alterações de segurança/revisão de conta e rotação de JWT_SECRET mantêm o comportamento documentado.

Login/logout em outra aba propagam a troca de contexto pelo armazenamento. A seleção de empresa é local à instância do painel, em memória, e as requisições autenticadas recebem esse alvo quando não trazem alvo explícito. Troca de empresa limpa dados carregados e fecha o webphone local; confirmar comportamento de chamada/SIP no host antes do uso operacional. Cancelar uma requisição no navegador não desfaz uma mutação que já chegou ao servidor.

Telemetria para após cinco falhas consecutivas sem frame válido. Cada tentativa usa ticket novo, com timeout de seis segundos; ausência de frame por quinze segundos provoca reconexão controlada. Frame de empresa divergente não é aplicado. Após indisponibilidade persistente, recarregue o painel para tentar novamente. Frontend e backend precisam ser da mesma revisão de contrato SSE; validar reconexão, múltiplas abas e revogação no navegador de produção.

### Leitura segura de cópias pelo painel

Inventário e download abrem arquivo e manifesto por descritor Linux, recusam links, diretórios, referências fora do formato e manifesto acima de 1 MB. O cabeçalho EPBXBK01, nome, tamanho e data precisam ser coerentes. A resposta usa o mesmo descritor validado e limita os bytes ao tamanho observado, sem reabrir o caminho. Auditoria estrita precede a resposta; cancelamento/falha encerra a transferência e fecha o descritor. O inventário identifica o formato, mas não autentica AES-GCM nem certifica recuperação: integrity=not_verified. A validação criptográfica continua exclusiva do procedimento com chave separada.

### Diagnóstico baseado em evidência

/api/v1/health e /api/v1/health/summary são apenas sinais públicos de vida (status e timestamp). Detalhes da plataforma e execução de diagnóstico exigem super_admin. A resposta não inclui erros brutos, inventários globais, endereços internos ou credenciais. Cache compartilhado de 5 segundos e limite de 10 diagnósticos/minuto evitam sondagens excessivas. CLI local não presume conexão AMI: CoreStatus autenticado é consultado separadamente. CoreStatus não informa inventário de canais; contagem fica nula. Prontidão continua exigindo núcleo, AMI e PostgreSQL em produção. ARI/Stasis, PJSIP, WebRTC, mídia e integrações permanecem NOT_TESTED nesta consulta, sem latências fixas, modelos presumidos ou aprovação pela mera presença de chave/configuração. PARTIAL representa somente as sondas cobertas, não homologação integral.

### Eventos HTTP e ausência de coletor do host

O antigo painel vazio de supostos logs do Asterisk foi substituído por falhas HTTP reais registradas ao concluir respostas 400–599 da API. Campos limitados a status, UUID gerado no servidor, horário e rótulos fixos; corpos, cabeçalhos, URLs, erros brutos e credenciais não são ingeridos. Buffer volátil limitado a 600 eventos, consulta de 200 e download autenticado de até 600; perda ao reiniciar é explícita. Não coleta journal, arquivos do Asterisk, Nginx ou VPN nem substitui auditoria. Limpeza e download exigem auditoria estrita e super_admin; limpar o buffer não apaga auditoria persistente nem fabrica evento Asterisk. Simulação retorna 501 em todos os ambientes. Filtros têm limites e estruturas validados. A revisão dos demais emissores de logs do host e dependências permanece pendente.

### Emissores operacionais do backend

Erros e avisos do backend próprio passam por catálogo fechado de eventos, sem serializar exceção, stack, SQL, resposta de IA, comando recusado ou credencial. Metadados aceitos: UUID da requisição gerado pelo servidor, status HTTP válido e duração finita limitada. Consulta lenta registra duração, nunca SQL/parâmetros. Bootstrap não registra e-mail administrativo; contingência de voz não registra identificador de provedor. Falha estrita de auditoria continua interrompendo a operação, com exceção pública opaca e prefixo AUDIT_REQUIRED_FAILURE preservado. Eventos de encerramento fatal e política PostgreSQL têm códigos próprios. Testes verificam o emissor, recusas reais de repositório/auditoria e a ausência de console.error/warn direto no restante do backend. Proteção não intercepta stdout/stderr de bibliotecas, ferramentas administrativas ou serviços do host; estes precisam de revisão própria. Eventos genéricos sacrificam detalhes de diagnóstico para não divulgar dados sensíveis; correlacione o UUID com a resposta HTTP quando disponível.

### Diagnósticos e aplicação de troncos

Sondas legadas ping/test-ip/diagnostics retornam 501 em todos os ambientes após verificar empresa e perfil. Foram removidas sondagem TCP arbitrária apresentada como SIP 200, promoção de status cadastral para registered por OPTIONS e avaliação NOC por score de configuração. O checklist contém 11 roteiros pendentes, sem execução/homologação presumida. Uma futura sonda exige política administrativa de destinos, auditoria anterior e coleta autenticada, sem substituir prova de registro e mídia.

Lookups de tronco respeitam a empresa direcionada inclusive para super_admin; somente contexto explicitamente GLOBAL usa lookup global. Prévia tem configuração mascarada e aguarda o plano de discagem real. Aplicação exige auditoria estrita antes da geração/gravação e limita tentativas. Retorno é projetado em campos fixos, sem caminhos internos, mensagens de CLI ou snapshot JSON vazio. HTTP 502 em aplicação não confirmada; HTTP 200/RELOAD_ACCEPTED apenas para arquivos e recargas aceitos, sem certificar SIP, chamadas, áudio ou ausência de interrupção. Recuperação automática dos arquivos continua no adaptador; recuperação manual de snapshot legado permanece bloqueada em produção.

### Mutação restrita do cadastro de troncos

API aceita apenas campos configuráveis conhecidos com tipos, enumerações, comprimentos e limites explícitos. Identidade, empresa, estados, contadores, máscaras e resultados de sondas não podem ser enviados pelo cliente. Contextos de entrada ficam em from-trunk; parâmetros ainda sem suporte, como outboundProxy, são recusados. Credenciais permanecem cifradas; senha vazia preserva a existente e não significa remoção. Valores zero de qualifyFrequency são preservados.

Auditoria estrita de tentativa precede criação, edição e exclusão, sem valores de credenciais. Mutação PostgreSQL é transacional, serializada por empresa e atualiza somente os campos enviados, preservando edições paralelas em campos diferentes. Nome duplicado, contingência de outra empresa, ciclos e exclusão de tronco referenciado são recusados. Alterar cadastro invalida o último estado de sonda; não aplica configuração no Asterisk. Validações de nomes/ciclos cobrem os escritores desta API; dados legados ou outros escritores precisam de revisão. Nenhum registro SIP ou chamada é anunciado como executado pelo cadastro.

### Cadastro seguro de DIDs

Criação/edição usam campos conhecidos, número normalizado, tronco e ramal explícitos da mesma empresa; não há destino padrão 4101. IA, filas, URA, horários, fallback e cabeçalhos alternativos não são anunciados como implementados. Identidade, normalização derivada e contadores não vêm do cliente. Auditoria estrita de tentativa precede mutação transacional; lote de 1–100 números valida a faixa inteira e recusa duplicidade sem gravação parcial. Campos diferentes de edições paralelas são preservados. Mensalidade zero permanece zero e é apenas dado cadastral.

DIDs e rotas respeitam o escopo direcionado do superadministrador; identidade/empresa de rota não podem ser sobrepostas pelo corpo. A revisão completa dos parâmetros e das mutações de rotas segue pendente. Simulador legado de entrada está indisponível até planejador isolado por empresa. O gerador recusa DIDs ativos legados com destinos/funções não executadas ou referências fora da empresa, em vez de cair no ramal 4101. DDD 55 é preservado e não é removido como DDI. Legados podem ser desativados/excluídos para revisão, sem apagar silenciosamente sua configuração avançada. Cadastro não aplica o plano nem executa chamada.

### Rotas de saída persistidas e geradas

Cadastro agora aceita somente saída, padrão com gramática delimitada, troncos da empresa, prioridade, stripDigits numérico (0–20), prepend de dígitos e isActive booleano. Campos não persistidos/implementados de entrada, horários, CLI/ITX e Caller ID são recusados; simulação CLI retorna 501. Auditoria estrita precede mutações transacionais por empresa, com atualização somente dos campos enviados. Nomes/padrões duplicados nos escritores desta API e troncos externos/iguais na contingência são recusados.

Leitura expõe isActive e stripDigits reais. O gerador omite rotas desativadas, usa a quantidade persistida (12 significa remover 12, não dois caracteres) e mantém a guarda nacional/premium após a transformação do número. Legados CLI/ITX ativos ou padrões inválidos bloqueiam geração; podem ser desativados preservando os campos antigos. Prioridade ordena o arquivo, não substitui a especificidade de padrões do Asterisk e não calcula tarifa. Padrões e transformações legados exigem revisão antes de aplicar, pois o comportamento anterior da remoção estava incorreto.

Entrada sem DID correspondente termina com Hangup(1), sem encaminhamento automático ao ramal 4101. Recursos legados de entrada/horário e CLI foram removidos da geração deste fluxo; não são anunciados como executados. Salvar, desativar ou excluir o cadastro não altera arquivos no host nem executa chamada. Sem prova de autorização de Caller ID pela operadora ou homologação de contingência/chamadas/mídia.

### Filas e grupos de toque

Cadastro aceita campos conhecidos e membros explícitos (1–64 ramais distintos da empresa), sem identidade, empresa, contadores ou métricas no corpo. Grupos executam apenas ringall, encerrando sem fallback; fallback legado requer remoção explícita antes de editar. Filas suportam ringall, rrmemory, leastrecent, fewestcalls, random e linear, com timeout, pós-atendimento (inclusive zero) e classe default do host. Outras classes de música exigem provisionamento/homologação. SLA, espera, abandono e atendimento retornam não apurados, mesmo que existam contadores antigos gravados.

Auditoria estrita antecede mutações transacionais. Número interno de 4–8 dígitos não pode colidir com ramais, filas, grupos ou URAs; escritores desta API compartilham lock por empresa e membros são conferidos no banco. Renumeração/exclusão com referências de DID ou possível referência textual em URA/fallback legado é recusada conservadoramente. Geradores validam membros e numeração novamente para detectar alterações feitas por outros escritores.

A aplicação administrativa inclui pjsip.conf, extensions.conf e queues.conf sob a mesma fila de gravação. Falha em qualquer recarga recupera os arquivos anteriores e tenta recarregá-los; isso não garante ausência de interrupção nem atomicidade do estado em execução. QueueReload solicita Members=yes, Parameters=yes, Rules=no, com contrato fechado e ActionID autenticado. Nenhum QueueReset ou controle dinâmico de agentes é adicionado. Documentação oficial: https://docs.asterisk.org/Asterisk_20_Documentation/API_Documentation/AMI_Actions/QueueReload/ .

queues.conf passa a ser arquivo integralmente gerenciado: revisar filas externas ao cadastro antes de aplicar no host. A aplicação gera os três arquivos sob um snapshot PostgreSQL REPEATABLE READ somente de leitura, exportado e importado por cada transação RLS, incluindo infraestrutura e segredos. Falha de snapshot interrompe a geração antes da gravação; não há fallback em memória. Alterações confirmadas após a abertura ficam para a próxima aplicação. O snapshot é encerrado antes de gravar/recarregar o host; não torna atômico o estado em execução do Asterisk. Cadastro, geração e aceite AMI não certificam atendimento, áudio, música instalada, membros dinâmicos ou SLA. Homologação no host permanece obrigatória.


URA básica: permissões por empresa também no superadmin direcionado, campos limitados e auditoria estrita antes de criar/editar/excluir. Mutações usam transação, bloqueio de linha e a mesma trava de numeração das filas/grupos. Destinos permitidos: número de ramal próprio, número interno de fila própria ou encerramento; identificadores de banco não são números de fila. Referências de DIDs/URAs/grupos impedem renumeração ou exclusão até revisão. Fluxos visuais, submenus e IA são recusados (501); dados legados permanecem preservados até remoção explícita do fluxo.

Cada URA possui contexto exclusivo e prévia usa o mesmo renderizador da configuração aplicada. Som deve ser instalado no host, com nome relativo sem extensão; não existe TTS, upload ou verificação de presença do áudio neste fluxo. Sem entrada, a chamada encerra após a espera; entrada inválida repete o menu até o limite de 0 a 5 repetições e depois encerra. Zero é preservado. Nome/rótulo não é interpolado como comando. A configuração completa recusa URAs legadas incompatíveis antes de gravar arquivos. Prévia é rascunho, não valida execução no Asterisk. Homologar áudios, seleção DTMF e transferência para fila/ramal no host real.


Gestão HTTP de ramais: campos editáveis limitados, identificadores UUID, auditoria estrita anterior sem corpo/senha e transações com trava de numeração compartilhada com filas/grupos/URAs. Exclusão e renumeração recusam referências em usuários, filas, grupos, URAs e DIDs; referências de JSON são conservadoras e podem exigir revisão manual. Alteração parcial não regrava campos concorrentes nem a senha antiga. Senha SIP explícita de 12 a 128 caracteres preserva espaços; vazia na edição preserva o valor cifrado, omitida na criação gera valor aleatório. Consultar a credencial exige auditoria estrita antes da resposta e autorização da empresa; DTO comum permanece sem senha.

Novos ramais não são anunciados como registrados: status armazenado inicia offline e é invalidado na edição, sem sonda SIP implícita. Contexto novo limitado a from-internal, codecs opus/alaw/ulaw/g722, gravação sempre/nunca. DND, correio de voz, NAT desativado e CLI individual são recusados até implementação/homologação; edição não certifica configurações legadas. Assistentes de provisionamento e geração legada ainda exigem auditoria própria; homologação de registro, sinalização e mídia no host permanece pendente.


Assistente de ramais: prévia e cadastro recebem apenas prefixo numérico, quantity inteiro 1..100 e startNumber inteiro 0..999999. Números resultantes passam pela validação de ramal; tronco, IA e campos adicionais são recusados. Cadastro exige auditoria estrita antes de uma única transação: qualquer colisão ou falha desfaz todo o lote, sem anúncio de sucesso parcial. Usa o mesmo escritor/trava dos ramais individuais, UUID, senha aleatória cifrada, gravação nunca, sem correio de voz e sem transferência por IA por padrão. Resposta 201/CREATED_NOT_APPLIED inclui apenas IDs, nomes e números; não aplica arquivos, fornece senhas ou certifica registro. Repetir lote já confirmado resulta em conflito, sem duplicar registros; prévia não reserva números.

Snapshot parcial legado e rollback do assistente foram retirados em todos os ambientes (501/LEGACY_SNAPSHOT_RETIRED), inclusive aliases. Usar backup integral e restauração em destino novo; nenhum snapshot vazio é anunciado. Consulta WebRTC não cria nem troca senha: credencial ausente ou WebRTC desabilitado retorna 409 para correção administrativa. Consulta de credencial própria exige auditoria estrita anterior à resposta. A validação integral dos campos legados no gerador de ramais permanece pendência antes da liberação; esta etapa elimina escritores HTTP alternativos que contornavam a gestão revisada.


Geração de ramais: PJSIP e dialplan revalidam campos persistidos antes da interpolação, inclusive registros antigos. Contexto deve ser from-internal, codecs limitados a opus/alaw/ulaw/g722, booleanos explícitos, gravação always/never e sem correio de voz, DND, NAT desativado ou CLI individual. Caller ID admite número interno simples ou nome simples e número entre < >; expressões e diretivas são recusadas. PJSIP, inclusive prévia mascarada, exige senha SIP presente e válida conforme o contrato de 12..128 caracteres. Falhas impedem a geração completa antes da gravação dos arquivos, sem conversão automática do cadastro ou divulgação do valor inválido. Corrigir dados legados na gestão administrativa antes de aplicar.

Removida discagem PJSIP genérica para números internos não cadastrados. Ramais gerados usam apenas entradas explícitas; tratamento de números sem entrada continua sujeito às rotas/guardas existentes, sem promessa de chamada atendida. Removido ramo VoiceMail sem provisionamento correspondente. Nome de gravação de ramal usa identificador de canal filtrado para caracteres alfanuméricos, sem Caller ID ou número de origem no caminho. Isso não comprova arquivo criado, gravação de todos os fluxos, associação ao CDR ou áudio; validar escrita/permissões e ciclo de vida da gravação no host. Permanecem pendentes a homologação SIP/WebRTC e a revisão dos demais campos legados de infraestrutura/troncos.


PJSIP exige infraestrutura explicitamente salva em system_settings/infra_config; a geração não usa nem persiste configuração de exemplo se estiver ausente. Endereços IPv4, hostname/domínio, portas SIP/TLS e rede local passam por validação. Máscara LAN contígua combinada ao IP LAN vira rede CIDR canônica (ex.: 192.168.3.150 + 255.255.255.0 → 192.168.3.0/24); CIDR explícito também é normalizado. /0, máscara descontínua, porta zero/tipo incorreto e caminhos TLS com diretiva/variável/travessia são recusados. Status TLS cadastrado não comprova existência, permissões ou validade criptográfica dos certificados no host.

Troncos persistidos são revalidados antes de gerar PJSIP: identificador, transporte, host, contexto, codecs, IPs autorizados, flags e modos SIP. Proxy legado sem suporte e modo de identificação legado não reconhecido bloqueiam geração até revisão. Usuário/senha são obrigatórios no modo credenciais; modo IP não permite REGISTER. Senha é validada também na prévia mascarada e nunca é incluída no erro. qualify_frequency=0 é preservado na renderização. O cadastro de infraestrutura e outros geradores ainda exigem revisão de mutações, concorrência e validação própria; esta etapa protege a geração PJSIP e não certifica registro SIP, TLS ou mídia.

Consulta de infraestrutura ausente pode devolver o rascunho da interface, mas não o persiste. Abrir a tela não cria infra_config nem torna seus exemplos elegíveis à geração; salvar configuração permanece ação administrativa distinta, ainda sujeita à próxima revisão de mutação.


Edição de infraestrutura: somente superadmin, campos fechados e expectedRevision obrigatório. GET informa configured/revision/NOT_VERIFIED e projeta apenas campos administrativos, sem tokens WhatsApp, chaves PWA, resultados antigos de teste ou status TLS declaratório. PUT exige auditoria estrita antes da gravação, usa trava global e bloqueio de linha; formulário antigo retorna 409 sem sobrescrever outra sessão. Alterações parciais preservam propriedades não editadas e incrementam revisão; primeira configuração usa revisão zero e precisa conter dados suficientes para validar PJSIP.

Caminhos TLS precisam ser informados em par ou ambos vazios. Mudanças ficam pending/not_configured; o cliente não pode atestar certificado válido ou testes concluídos. Ainda falta verificação de arquivos/certificado no host para habilitação homologada de TLS. Rotas de validação SSL/WebRTC/PWA/WhatsApp e execução push/VAPID sem adaptador retornam 501 em todos os ambientes. A interface deixa explícito que salvar não aplica rede, firewall, NAT, serviços ou certificados. Outros geradores e integrações que consomem infraestrutura ainda exigem revisão própria antes da liberação.

Detecção automática de IP é consulta: valida IPv4 e devolve DRAFT_NOT_SAVED, indicando variável de ambiente ou serviço de saída como fonte. Não grava configuração nem confirma NAT. Corpos legados dos validadores fictícios foram removidos; não há atalho de escrita fora da revisão por esses endpoints.


Prévias auxiliares: ARI exige usuário, senha e origens explícitos do ambiente em todos os modos; não usa credencial/localhost de exemplo. Usuário de seção, senha e lista de até 16 origens são validados antes da máscara. Origens HTTPS exatas, sem curingas, caminho, credenciais ou diretivas; HTTP somente loopback em desenvolvimento. Senha ARI de 12..128 caracteres, sem espaços externos ou caracteres de diretiva, evita normalização silenciosa incompatível com o servidor. A prévia administrativa nunca devolve senha real.

RTP usa faixa persistida e STUN opcional do cadastro, sem servidor público implícito. Não altera firewall, portas do processo em execução ou certifica ICE/mídia. Pacote de prévias usa snapshot comum, aguarda o dialplan e marca DRAFT_NOT_APPLIED. Rotas de arquivo também aguardam geração antes de responder texto. AudioSocket e instalador dinâmico legados retornam 501 em todos os ambientes; foram removidos UUID fixo, promessa de áudio/latência e shell com make samples. Para instalação, usar install-enlace-pbx.sh e procedimento revisado do repositório; nenhum arquivo ou instalador é aplicado pelo download de prévia. O adaptador de áudio real e o alinhamento dos geradores com o instalador mantido ainda precisam de revisão/homologação.

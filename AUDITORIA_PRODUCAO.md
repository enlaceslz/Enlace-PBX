# Auditoria de produção — Enlace-PBX

Data: 28/10/2026. Base: `4e9af83902999687a0e292c316f1579f54060ba6`.

**Decisão: liberação integral bloqueada.** Este conjunto de alterações é candidato a homologação, não certificação de produção. O site público mostrou apenas autenticação; não foram fornecidos acesso ao host de destino, PostgreSQL, operadora SIP ou credenciais Meta/Gemini de homologação.

## Falhas corrigidas no código

| Área | Problema identificado | Alteração |
| --- | --- | --- |
| Arquivos públicos | `dist` continha o cliente, `server.cjs` e seu sourcemap, e era publicado integralmente pelo Express | Cliente isolado em `dist/client`; configuração Vercel publica somente essa pasta |
| Autenticação | Exceções por prefixo liberavam `/webhooks` e outros caminhos sob `/health` | Lista explícita por método e caminho; diagnóstico exige autenticação |
| SSE | Middleware global exigia JWT antes da validação de ticket | Stream alcança o validador próprio de ticket e depois valida o tenant |
| JWT | Resolução de usuário podia recorrer ao e-mail sem vincular identidade e tenant | Validação HS256 e consulta pelo ID e tenant assinados |
| Dados entre empresas | Provedores de IA ignoravam tenant; lista de empresas e auditoria usavam consultas globais para usuários comuns | Consultas escopadas; administração de infraestrutura compartilhada exclusiva do super_admin; capacidades explícitas para faturamento/CDR e restrição de perfis em IA/campanhas |
| WhatsApp | HMAC calculado sobre JSON reserializado; secret ausente aceitava mensagens | Validação dos bytes originais e rejeição quando o segredo não existe |
| WhatsApp | Configuração global expunha token e podia ser substituída por outra empresa | Chave por empresa, token criptografado e respostas sem token; compatibilidade legada limitada à mesma empresa |
| WhatsApp | Apenas primeira mensagem do lote; descartava mensagens atrasadas; duplicava retries; confirmava envio rejeitado | Entrada em transação com lock e deduplicação por ID; processamento do lote; envio com timeout e confirmação Meta antes do registro |
| Migrações | DDL pela role restrita; lock e SQL em conexões diferentes; registro fora da transação | CLI administrativa separada; mesma conexão para lock, SQL e registro; rollback; HTTP apenas verifica checksums |
| Migração CEL | Migração 006 referenciava coluna inexistente | Migração de compatibilidade 005a adiciona tenant_id antes da política, sem atribuição arbitrária de eventos legados |
| Identidade | Login por e-mail sem seletor de empresa, mas e-mail único apenas dentro de cada tenant | Migração 009 exige unicidade global de e-mail normalizado |
| Auditoria | Endpoint retornava integridade verdadeira sem comparar hashes | Comparação canônica e verificação real da cadeia; lock por tenant ao acrescentar registros |
| HTTP | Promises rejeitadas no Express 4 sem encaminhamento; erros internos retornados ao cliente | Tratamento assíncrono, resposta genérica, JSON inválido 400 e corpo excedido 413 |
| Operação | Porta fixa, proxy confiado por quantidade de saltos, processo mantido após erro fatal | Porta validada, bind local em produção, proxies explícitos e encerramento limitado a 20 s |
| Dependências | `npm ci` falhava com lock divergente; dependências vulneráveis | Lock reconciliado, atualizações compatíveis e override de `qs` corrigido |

## Funções indisponíveis em produção

Os controles abaixo retornam HTTP 501, ou resultado de ferramenta `UNAVAILABLE`, porque a implementação anterior confirmava sucesso sem operação real ou sem garantias suficientes. Isso reduz o escopo funcional da versão candidata e deve aparecer no planejamento comercial e de implantação.

- Escrita operacional de WireGuard/ZeroTier e failover; alterações de Fail2ban.
- Validadores de SSL/WebRTC/PWA/WhatsApp que inferiam aprovação de configurações; push e geração VAPID incompleta.
- Conexão/desconexão CRM sem handshake real; teste de webhook; teste de ferramenta IA com mock; extração de entidades fixa.
- Backup/restore JSON legado e rollback/quick setup sem transação global continuam indisponíveis. O fluxo novo entrega cópia integral criptografada e recuperação em banco separado; ver OPERACAO_PRODUCAO.md.
- Consulta de faturas da MaIA sem autorização do cliente individual continua bloqueada. A abertura de chamado agora usa persistência real com protocolo, idempotência e isolamento, e o CRM lista os registros.
- Resposta automática de IA no webhook WhatsApp: removida do processamento síncrono. Mensagens entram na fila humana; automação requer worker durável e tratamento de falhas.

Leitura de configuração não comprova estado do host. Valores demonstrativos antigos já gravados no banco precisam ser revisados; os novos padrões de produção não afirmam serviços ativos ou certificados válidos.

## Validação

- `npm run lint`: tipagem.
- `npm run test:security`: HMAC real, fronteiras públicas, funções indisponíveis, HTTP em processo separado e transações de migração com driver controlado.
- `npm test`: suíte legada. Os testes que apenas inspecionam texto não comprovam controles em infraestrutura real. Bloqueios de PostgreSQL/Asterisk não são aprovações.
- `npm run build`: cliente e backend.
- `npm audit --omit=dev`: dependências de produção.
- `bash -n deploy.sh`: sintaxe, sem executar instalação no host.
- CI: PostgreSQL 16 descartável, migrações administrativas, conexão enlace_app, RLS entre duas empresas, negação de DDL, proteção do histórico e idempotência de entrada WhatsApp. A execução com PostgreSQL real passou após corrigir a compatibilidade CEL. O CI também valida login bcrypt, RBAC e prontidão no backend compilado; conferir a execução correspondente ao commit final.

## Procedimento de homologação

1. Preparar host isolado e backup restaurável; instalar dependências com `npm ci` e executar as validações acima. Não usar a base de clientes para testes de integração.
2. Configurar segredos fortes conforme `.env.example`. Não versionar `.env`. O usuário HTTP agora é dedicado (`enlace-pbx`) e o instalador usa systemd com código somente para leitura. A instalação real no host ainda exige homologação.
3. Em sessão administrativa separada, fornecer `DATABASE_MIGRATION_URL` apenas a `npm run db:migrate`. A credencial precisa criar papéis e aplicar o histórico existente. O banco esperado pelas migrações históricas é `enlace_pbx`. Conflitos de e-mail ou checksums ausentes/diferentes exigem revisão; não alterar migrações históricas para contornar o erro.
4. Remover a URL administrativa do ambiente do serviço. Iniciar com `NODE_ENV=production`, `DATABASE_URL` da role `enlace_app`, `HOST=127.0.0.1` e CORS explícito. O processo HTTP não aplica DDL. Guardar as chaves criptográficas no backup seguro.
5. Configurar proxy HTTPS, AMI/ARI restritos, certificados e RTP. `/health/live` é liveness; `/health/ready` exige PostgreSQL e, em produção, Asterisk e AMI. A configuração Vercel entregue publica o frontend; não provisiona PBX ou backend persistente.
6. Configurar `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` e a versão de Graph API habilitada no aplicativo em `WHATSAPP_GRAPH_API_VERSION`. Vincular o número a uma única empresa, testar assinatura, retries, entrada e saída com número de homologação. Validar na interface o comportamento do token mascarado.

## Bloqueios restantes para liberação

- Homologar em host real: instalação limpa e atualização, reinício, migrações, permissões do processo, TLS, storage, logs, alarmes e restauração completa. Preservação de segredos especiais passou em teste de round-trip JSON; os privilégios e certificados devem ser confirmados no host real.
- Ensaiar chamadas internas e externas, DIDs, rotas, filas, transferências, gravação, DTMF, NAT, WSS, DTLS-SRTP e áudio nos dois sentidos; simular falha de operadora e reconexão.
- Validar Meta e modelos Gemini/9router com credenciais de homologação. Modelos codificados no código não foram homologados contra as APIs externas.
- Reimplementar e homologar as funções indisponíveis antes de anunciar o escopo completo de 27 módulos.
- Evoluir auditoria: o hash legado cobre ID, tenant, usuário, ação, recurso, timestamp e hash anterior; não cobre todos os campos livres. Não constitui certificação LGPD ou proteção contra um administrador do banco.
- Avaliar carga, concorrência, consumo de mídia, limites e retenção. Tickets SSE estão em memória: múltiplas instâncias exigem armazenamento compartilhado ou afinidade.
- Revisar o RBAC funcional de todas as telas com cada perfil e o fluxo de migração da configuração WhatsApp legada. A auditoria aqui não é um pentest exaustivo.

Nenhum merge, deploy ou modificação do servidor de produção foi executado por esta auditoria.

## Continuação — instalação, AMI e recuperação

- Serviço systemd sem root, releases de código somente para leitura e configuração JSON com credenciais administrativas separadas. Scripts NPM executados sem root.
- Instalador Asterisk sem credenciais previsíveis, sem sobrescrever amostras em uma instalação existente e com checksum explicitamente fornecido. Configuração preserva outras contas.
- AMI corrigido: correlação de ActionID, mensagens fragmentadas, lista completa e rejeição de erros/injeção de cabeçalhos; recarga PJSIP recusada restaura a configuração anterior.
- Backup integral AES-256-GCM: snapshot PostgreSQL, configuração com chaves, Asterisk e gravações. Recuperação só para banco/diretório novos, com validação criptográfica, extração restrita e comparação de registros.
- Inventário e download de backups reais; tela sem histórico ou nuvem fictícios. Geração e recuperação completas são operacionais no servidor, não pela antiga rota JSON.
- O ensaio no CI detectou incompatibilidade de cliente PostgreSQL mais novo com servidor de origem; o programa agora seleciona e exige cliente da mesma versão principal. Consultar o CI do commit final para o resultado da recuperação.

Essas alterações não substituem a homologação de chamadas, mídia e serviços no host de destino. Não houve acesso a um servidor de produção nem execução do instalador nesse servidor.

- Chamados MaIA: migração 010 cria suporte persistente com RLS forçada, protocolo único e idempotência por empresa/correlação. O protocolo só é confirmado após commit; o CRM exibe os registros reais. Teste PostgreSQL verifica persistência, retry e isolamento.

- Troncos SIP: migração 011 armazena credencial cifrada; respostas e auditoria deixam de carregar a senha digitada. O gerador interno usa a credencial real, sem placeholders. Recusa quebra de linha em campos de configuração e aplicação de arquivo global por administrador de tenant.
- Segurança de topologia: o provisionamento automático de telefonia em produção recusa múltiplas empresas no mesmo host enquanto os namespaces SIP não forem homologados. Isso evita substituir configuração global de outra empresa; não equivale a suporte multi-tenant de mídia.
- WebRTC usa transporte WS interno ao loopback atrás do NGINX HTTPS e certificados DTLS gerados pelo Asterisk, sem depender de caminhos de certificados inexistentes. Chamada e áudio continuam exigindo teste com navegador/operadora reais.
- Se credenciais SIP foram cadastradas em uma versão anterior, elas devem ser rotacionadas no ambiente real: o fluxo antigo podia registrar a senha nos logs. O histórico imutável não é apagado silenciosamente.

- A aplicação agora grava também o plano de discagem gerado, antes apenas contabilizado na resposta. Falha em uma recarga desfaz os dois arquivos; teste dirigido cobre o rollback conjunto.

- Plano de saída: retira troncos fictícios de fallback, exige vínculo real da rota e inclui subrotina de bloqueio nacional contra DDI/premium antes de discar (inclusive contingência). Os padrões foram testados em código; execução e tarifação exigem ensaio Asterisk/operadora.

## Continuação — VPN e integrações HTTP

- Corrigida interpretação de `wg show all dump`: a coluna da chave privada era interpretada como chave pública e a chave pré-compartilhada como endpoint. O parser agora descarta ambas, preserva a interface de cada peer e recusa respostas inválidas. Erros de subprocesso não devolvem a saída capturada.
- A atividade WireGuard depende de handshake real recente (até 180 segundos), sem herdar o estado de conectividade persistido. Isso indica atividade criptográfica, não disponibilidade SIP. ZeroTier sem resposta real não recebe identificador, versão ou estado online de exemplo.
- Monitoramento deixa de declarar RTT, jitter, perda, MOS e pacotes por segundo sem medição. A sonda existente é descrita como conexão TCP/5060 no endereço virtual do peer; não é ICMP, SIP OPTIONS nem prova de mídia. A rota primária do kernel ainda não é observada.
- 9router exige URL, chave e modelo configurados; saúde consulta `/models`, geração consulta `/chat/completions`. Retirados modelos, latência e consumo inventados. O contrato exige resposta JSON compatível, texto e consumo de tokens válidos; erros do destino não são apresentados como sucesso.
- HTTP de saída limita origens, resolução DNS, endereços, tempo, corpo e resposta; fixa o endereço validado no socket, recusa redirecionamentos e permite rede privada apenas por exceção administrativa explícita. Metadados link-local e endereços reservados permanecem proibidos. Testes locais usam servidores HTTP reais e cobrem inclusive IPv4 mapeado em IPv6.
- Validação local: lint e build aprovados, 20 testes dirigidos aprovados, suíte geral com 64 aprovados e três dependências de infraestrutura bloqueadas; auditoria NPM de produção sem vulnerabilidades conhecidas. O CI executa ainda PostgreSQL e recuperação integral. Credenciais reais do provedor e disponibilidade VPN no host continuam pendentes de homologação.
- Os testes de ferramentas IA e webhooks continuam bloqueados em produção: este lote entrega o transporte seguro usado pelo 9router, sem desbloquear os adaptadores ainda incompletos.

## Continuação — teste HTTP real de ferramentas

- A rota de teste de ferramentas deixou de retornar `mockResponse` e ganhou execução HTTP GET/POST real, respeitando schema, confirmação configurada, RBAC e empresa do cadastro. A tela oferece parâmetros editáveis, informa efeitos reais e mostra resposta ou erro da API.
- A autorização administrativa vincula empresa, ferramenta, URL e método exatos. Token opcional fica no servidor. O transporte continua impondo origem autorizada, validação/fixação DNS, limites, timeout e recusa de redirects. Alteração do cadastro não redireciona automaticamente credenciais.
- Validação usa Ajv com subconjunto de schema limitado, sem regex/referências/composições, sem coerção e com objetos fechados. Inclusão/edição recusam definição inválida; edição/exclusão não consultam mais cadastro global de outra empresa.
- A tentativa exige auditoria persistida antes do envio, sem conteúdo de parâmetros ou resposta. Não há retries automáticos nem promessa de idempotência externa; falhas de POST são apresentadas com resultado possivelmente desconhecido.
- Testes dirigidos utilizam HTTP real e verificam que falta de confirmação, parâmetros incompatíveis, vínculo divergente/duplicado, empresa diferente e falha de auditoria não alcançam o destino. O teste PostgreSQL/HTTP de produção foi ampliado para verificar execução, auditoria anterior e isolamento de ferramentas; resultado final disponível no CI do commit.
- A sonda VPN também deixou de interpretar conexão TCP recusada como conexão estabelecida. Webhooks, controles de rede e demais integrações ainda incompletas continuam bloqueados. Este fluxo não implementa acionamento autônomo de ferramentas HTTP nas chamadas MaIA.

## Continuação — webhooks assinados e CRM

- Substituídos cadastro global e resposta fixa do teste por cadastro por empresa e entrega HTTP real assinada. Migração 012 adiciona duas tabelas com RLS forçada e vínculo composto de empresa/destino; a credencial HMAC fica somente na configuração protegida do servidor.
- Vínculo administrativo exige empresa, ID e URL exatos, além da política HTTP já existente. A API ignora URL/evento arbitrários enviados no pedido e produz apenas `enlace.webhook.test`, sem dados fictícios de chamada. Não ativa eventos automáticos.
- Tentativa exige auditoria e histórico persistidos antes do envio. Confirmação depende de HTTP 2xx e persistência final; falhas ficam sem confirmação, sem retry automático. Receptor pode responder texto ou corpo vazio; a resposta não é exposta nem armazenada.
- CRM agora permite cadastrar, habilitar, testar e consultar tentativas. Removidos números de sincronização/latência fictícios e controles OAuth/configuração que não executavam a ação anunciada. Conectores pendentes são identificados como não homologados.
- Testes HTTP verificam assinatura sobre bytes originais, evento de teste, vínculo, segredo, recusa de destinos divergentes e erros. O teste de produção com PostgreSQL também verifica RLS, auditoria/histórico anteriores ao envio e transição de estados. Resultado final no CI do commit correspondente; homologação do receptor real e eventos automáticos continuam pendentes.

## Continuação — extração de entidades sem preenchimento fictício

- Removidos documentos, ramais, orçamento, intenção e confiança fixos do teste de extração. O fluxo consulta o 9router configurado, exige autorização explícita para envio de texto de cada empresa e deriva valores somente de trechos literais devolvidos pelo modelo e encontrados no texto original.
- Campos ausentes ou evidências inválidas ficam nulos; zero e falso são preservados. A resposta identifica evidências, recusas e obrigatórios ausentes, sempre com revisão humana. Isso não comprova associação semântica do trecho ao campo, validade de documento ou informação de negócio.
- Migração 013 adiciona esquemas por empresa com RLS. Cadastro, edição, listagem e teste respeitam o contexto; não há cópia automática da configuração global anterior nem sincronização de CRM. Tela usa o contrato real e apresenta erros, sem alegar confiança percentual.
- Consulta externa só ocorre após auditoria persistida. A rota não persiste texto, evidências ou resposta; erros do provedor são sanitizados. Modelo, credenciais e autorização de empresa ficam na configuração do servidor.
- A avaliação de qualidade antiga também foi bloqueada em produção: pontuação por palavras-chave não comprova resolução ou conformidade. A interface informa a limitação e apresenta a indisponibilidade; históricos não são apagados automaticamente.
- Testes cobrem evidências inventadas, valores ausentes, zero/falso, formatos, configurações, auditoria e isolamento. O CI PostgreSQL foi ampliado para executar uma chamada HTTP de IA real contra receptor de teste, verificar auditoria anterior e rejeitar valor inventado e acesso entre empresas. Homologação do modelo/receptor real e revisão semântica continuam pendentes.

## Continuação — supervisor assistido e copiloto omnichannel

- Substituída a avaliação heurística por preparação de revisão com evidências literais via 9router. Não há pontuação, sentimento ou alegação automática de resolução/conformidade. Autorização de empresa/modelo é explícita; a auditoria antecede envio e a confirmação só ocorre após persistência.
- Migração 014 cria revisões por empresa com RLS, evidências preservadas e transição única de revisão humana. Identidade do revisor vem da sessão, nunca do corpo. Detalhes exigem auditoria; notas e evidências não são repetidas na trilha de tentativa. A restauração reaplica as permissões restritas e o teste de recuperação verifica esses privilégios.
- Tela substituída por formulário, evidências e anotação humana. Foram retirados indicadores fictícios, declarações de conformidade e pressupostos de consentimento/resolução. O histórico antigo permanece separado e explicitamente não verificado.
- Encontrado e removido conteúdo de sugestão omnichannel com PIX fixo e afirmações de ajustes não executados. A rota agora retorna 501 em qualquer ambiente; a interface apresenta a indisponibilidade. Não houve envio de mensagem ou alteração no ambiente de produção nesta revisão.
- Testes cobrem seleção literal, evidência inventada, configuração, auditoria e sanitização. CI PostgreSQL ampliado para conferir persistência, leitura/registro humano, isolamento, identidade do revisor, proteção contra sobrescrita e bloqueio do copiloto. Homologação do provedor real e processos de revisão/retenção continuam pendentes.

## Continuação — copiloto de catálogo e resposta do operador

- Copiloto substituído por seleção real de rascunho revisado via 9router, com autorização por empresa/modelo, auditoria prévia e evidência literal. Não aceita texto livre do modelo, cobranças, preços ou alegações operacionais. O catálogo atual tem três perguntas neutras; não é geração livre de atendimento.
- A fonte é a última mensagem recebida persistida da empresa; `history` arbitrário no pedido é ignorado. Conversas encerradas, anexos e mensagens já respondidas são recusados. A geração não altera a conversa nem envia mensagem.
- Tela apresenta prévia vinculada à conversa e à mensagem conhecida, exige ação explícita para usar e preserva resposta em edição. Rascunhos ficam separados por conversa, e falha de envio não apaga o texto. Conteúdo recebido em `content`/`contact` passa a ser exibido corretamente.
- Saída manual passa a usar cabeçalhos de autenticação e respeita canal/estado. Após confirmação da Meta, a persistência acrescenta a saída sob bloqueio de linha, sem substituir mensagens concorrentes, com deduplicação e recusa de ID conflitante. Erros não expõem detalhes internos nem geram retries automáticos.
- Testes cobrem catálogo fechado, evidência, estado, empresa, auditoria e ausência de mutação pela sugestão. CI PostgreSQL ampliado para testar chamada real de IA a receptor local, isolamento, recusa de histórico injetado e preservação concorrente de entrada/saída. Sem teste de entrega Meta real ou homologação visual no navegador neste lote.

## Continuação — atendimento humano e anotações internas

- Migração 015 adiciona versão de atendimento, responsável e notas à conversa existente sob RLS. Transições usam bloqueio de linha e versão; operadores não tomam atendimento alheio, enquanto supervisores/administradores podem administrar a atribuição.
- Removidos anúncios de barge-in, transferência para destinos fictícios e devolução automática à IA. Encaminhamento e automação retornam 501 sem alteração da conversa. Estados humanos não são apresentados como ações de telefonia.
- Anotações deixam de ser etiquetas com nome fornecido pelo cliente. Autor vem da sessão; chave de tentativa torna repetições idempotentes. Gravação não substitui histórico e não inclui conteúdo na auditoria. Interface mantém rascunhos separados e apresenta falhas.
- Saída humana reserva atendimento atomicamente após validação da configuração e antes da chamada à Meta, evitando duas reservas de operadores concorrentes. Reserva e entrega são eventos distintos. Nova entrada após encerramento reabre espera com versão atualizada, sem duplicar retries da Meta.
- Interface remove modal de transferência e configuração WhatsApp duplicada, aplica cabeçalhos autenticados e abandona o campo de token de verificação que não era gravado. O segredo continua no servidor.
- Testes locais: lint/build e 36 testes direcionados aprovados, suíte geral com 64 aprovações/três bloqueios de infraestrutura e auditoria NPM de produção sem vulnerabilidades conhecidas. CI PostgreSQL ampliado para versão concorrente, responsável, duas reservas simultâneas, notas idempotentes, mensagens preservadas, reabertura e isolamento. Resultado final no CI do commit; homologação no navegador e entrega Meta real pendentes.

## Continuação — campanhas sem execução fictícia

- Verificado que não havia worker de campanha; o toggle somente gravava `running`/`paused`, e o cliente podia fornecer totais, progresso e sucesso. A execução agora retorna 501 sem mutação, e o cadastro só prepara rascunho com identidade/estado/contadores definidos pelo servidor.
- Migração 016 cria destinos persistentes por empresa/RLS, deduplicação composta e versão de planejamento. Vínculos novos de agente precisam ser da empresa, com FK composta; dados antigos não são corrigidos ou apagados automaticamente.
- Importação nacional limitada a 500 por lote/10000 por campanha, validação integral antes de gravar e rollback quando excede capacidade. Consulta paginada e remoção reais; total exibido deriva dos destinos cadastrados, sem números inventados de chamada/sucesso.
- Estados/contadores legados são preservados como não verificados, fora do fluxo editável. Edição/remoção usam versão e bloqueio de linha. A interface apresenta preparação, sem botões que anunciem início/pausa de um discador inexistente. Erros de API não removem registros da tela como se a operação tivesse ocorrido.
- Testes locais cobrem metadados, formato, limites de lote, duplicidade e legado. CI PostgreSQL ampliado para concorrência, atomicidade, limite de capacidade, paginação, isolamento/FK, deleção em cascata e preservação do legado. Continua pendente implementar/homologar execução e recuperação de chamadas; nenhuma ligação foi originada neste lote.

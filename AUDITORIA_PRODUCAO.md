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

# Enlace-PBX — Evidências de homologação Debian 12

**Natureza:** formulário de coleta; nenhuma verificação operacional foi executada por este documento.
**Ambiente:** somente VM descartável, sem clientes ou troncos de produção.
**Branch de referência:** `chore/producao-hardening-20261023`.

## Identificação da execução

| Campo | Preencher no laboratório |
| --- | --- |
| Responsável / data UTC | PENDENTE |
| Commit exato (`git rev-parse HEAD`) | PENDENTE |
| Debian (`cat /etc/os-release`) | PENDENTE |
| VM / CPU / RAM / disco | PENDENTE |
| Snapshot e ID de restauração | PENDENTE |
| Segmento de rede / firewall | PENDENTE |
| GitHub Actions regressão / quality gate | PENDENTE |

## Checklist de entrada em homologação (go/no-go)

Antes de iniciar os cenários, o responsável técnico deve registrar PASS ou BLOQUEADO para cada pré-requisito. Um item obrigatório BLOQUEADO impede o início de testes destrutivos e a emissão de aprovação.

| Pré-requisito | Critério | Estado |
| --- | --- | --- |
| Ambiente isolado | VM descartável, sem clientes ou troncos reais | BLOQUEADO |
| Snapshot anterior | ID e procedimento de restauração registrados | BLOQUEADO |
| Inventário e versão | Commit, sistema operacional, recursos e rede identificados | BLOQUEADO |
| Acesso restrito | Credenciais de laboratório e firewall revisados | BLOQUEADO |
| Parâmetros aprovados | Limites de IA, RTP, capacidade, RTO e RPO preenchidos | BLOQUEADO |
| Testes controlados | Dois ramais de laboratório e plano de chamadas definido | BLOQUEADO |
| Procedimento de rollback | Responsável, gatilho e passos de recuperação aprovados | BLOQUEADO |
| Evidências protegidas | Local de armazenamento restrito e rotina de higienização | BLOQUEADO |

**Estado inicial: NO-GO — não há evidência de execução de laboratório.** Alterar os estados somente mediante verificação real e registro da evidência. O resultado do GitHub Actions é complementar, não substitui nenhum item acima.

Antes da coleta manual, execute `python3 scripts/check-asterisk-runtime.py` na VM de laboratório. O comando é somente leitura, retorna código 1 quando encontra falhas e não substitui os testes de chamadas, áudio, IA ou rollback. Registre a saída PASS/FAIL sem acrescentar credenciais.

## Captura segura das evidências

Execute os comandos abaixo **somente depois da instalação em laboratório**. Revise as saídas antes de anexá-las: não publique senhas, tokens, endereços pessoais, números telefônicos ou gravações.

```bash
set -o pipefail
date -u
cat /etc/os-release
uname -a
systemctl is-active asterisk.service
systemctl show asterisk.service -p User -p Group -p MainPID -p NRestarts
asterisk -rx 'core show uptime'
asterisk -rx 'core show channels count'
asterisk -rx 'core show version'
asterisk -rx 'module show like res_pjsip'
asterisk -rx 'module show like res_ari'
asterisk -rx 'module show like res_http_websocket'
asterisk -rx 'pjsip show endpoints'
ss -lntup
```

Após 60 segundos, repita `systemctl is-active asterisk.service`, `systemctl show asterisk.service -p MainPID -p NRestarts` e `asterisk -rx 'core show uptime'`. Compare os resultados e registre qualquer reinicialização inesperada.

Confirme acesso de leitura pelo usuário de serviço, **sem imprimir o conteúdo dos arquivos**:

```bash
for config in manager.conf http.conf ari.conf; do
  if runuser -u asterisk -- test -r "/etc/asterisk/$config"; then
    printf '%s: PASS\\n' "$config"
  else
    printf '%s: FAIL\\n' "$config"
  fi
done
```

### Verificação da superfície AMI/ARI

Execute `ss -lntup` e registre as linhas referentes às portas TCP 5038 (AMI) e 8088 (HTTP/ARI). A aprovação exige que ambas escutem **somente em 127.0.0.1**, conforme a configuração padrão do projeto. Não basta que o firewall bloqueie o acesso externo se o serviço estiver vinculado a `0.0.0.0` ou `::`.

Em uma segunda máquina da rede de laboratório, verifique que não é possível estabelecer conexão TCP com essas portas no IP da VM. Documente IPs de laboratório, origem do teste, horário e resultado; não execute varreduras em redes de terceiros ou produção.

**Falha crítica:** listener AMI/ARI em interface pública ou privada não autorizada, conexão externa bem-sucedida ou divergência entre o bind esperado e o observado. Nesse caso, interrompa a homologação até corrigir a exposição.

Para testar AMI/ARI, exporte as quatro variáveis de autenticação no shell **sem imprimir seus valores** e execute `python3 scripts/check-asterisk-auth.py`. Não use `set -x`. Registre somente PASS/FAIL e logs higienizados. Teste também rejeição de senha inválida em laboratório.

## Cenários SIP/PJSIP e RTP em laboratório

Use dois ramais **exclusivamente de laboratório**, em softphones distintos, sem troncos públicos. Registre o horário UTC, o ID da chamada e o resultado de cada cenário, removendo números e identificadores pessoais antes de anexar evidências.

| ID | Cenário | Critério de aprovação | Resultado |
| --- | --- | --- | --- |
| SIP-01 | Registro de dois ramais | Ambos aparecem disponíveis em `pjsip show contacts` | NÃO EXECUTADO |
| SIP-02 | Chamada ramal A → B | B toca, atende e ambos encerram normalmente | NÃO EXECUTADO |
| SIP-03 | Chamada ramal B → A | Mesmo comportamento no sentido inverso | NÃO EXECUTADO |
| RTP-01 | Áudio A → B e B → A | Ambos ouvem e são ouvidos, sem áudio unilateral | NÃO EXECUTADO |
| DTMF-01 | Dígitos DTMF durante chamada | Dígitos recebidos corretamente no destino de teste | NÃO EXECUTADO |
| SIP-04 | Encerramento pelo originador e pelo destino | Canais liberados; sem chamada órfã | NÃO EXECUTADO |
| SIP-05 | Re-registro após interrupção controlada de rede | Ramais recuperam registro sem intervenção indevida | NÃO EXECUTADO |

Comandos de apoio: `asterisk -rx 'pjsip show endpoints'`, `asterisk -rx 'pjsip show contacts'` e `asterisk -rx 'core show channels count'`. Capturas RTP e logs de sinalização só devem ser coletados em rede de laboratório, com autorização e higienização de dados. Para áudio, registre também codec, duração aproximada e eventuais perdas percebidas.

**Falha crítica:** áudio unilateral, chamada órfã, registro instável ou DTMF incorreto em cenário obrigatório. Testes automatizados de configuração não comprovam qualidade de voz nem funcionamento SIP real.

## Cenários de integração com IA e contingência

Execute somente com ramais e destinos de laboratório, sem tráfego de clientes. Registre versão da integração, gateway de IA configurado, horário UTC, ID técnico da sessão (anonimizado), tempo de resposta, estado final dos canais e resultado. Nunca inclua chaves de API, áudio de clientes ou transcrições pessoais nas evidências.

| ID | Cenário | Critério de aprovação | Resultado |
| --- | --- | --- | --- |
| IA-01 | Chamada atendida pela IA | Sessão criada, resposta audível e encerramento controlado | NÃO EXECUTADO |
| IA-02 | Gateway IA indisponível antes do atendimento | Falha detectada; fluxo de contingência executado sem chamada presa | NÃO EXECUTADO |
| IA-03 | Timeout de resposta do gateway | Timeout limitado; mensagem/fallback conforme política configurada | NÃO EXECUTADO |
| IA-04 | Transferência para agente humano | Agente recebe a chamada com contexto autorizado; IA deixa de atuar | NÃO EXECUTADO |
| IA-05 | Agente humano indisponível | Encaminhamento alternativo ou encerramento seguro, sem loop | NÃO EXECUTADO |
| IA-06 | Queda de conexão durante sessão | Recursos e canais liberados; evento de falha registrado | NÃO EXECUTADO |
| IA-07 | Chamadas simultâneas no limite definido | Sessões isoladas, sem vazamento de contexto ou degradação inaceitável | NÃO EXECUTADO |
| IA-08 | Reinício controlado do serviço | Retorno do serviço e novas chamadas funcionais; sessões antigas tratadas | NÃO EXECUTADO |

Após cada cenário, compare `asterisk -rx 'core show channels count'` com a linha de base, inspecione erros de AMI/ARI e confirme que não restaram sessões, canais ou recursos de áudio órfãos. O limite de timeout e a capacidade de simultaneidade devem ser definidos e aprovados antes da execução; não presumir valores não documentados.

**Falha crítica:** chamada presa, ausência de fallback exigido, sessão não encerrada, transferência incorreta, exposição de credenciais ou vazamento de contexto entre chamadas.

## Cenários de recuperação, backup e rollback

Antes de executar qualquer teste destrutivo, registre o identificador do snapshot, o horário UTC, a versão do sistema e o commit instalado. O backup deve permanecer em armazenamento de laboratório com acesso restrito, incluindo configuração e dados necessários para restauração, **sem publicar credenciais**. Uma cópia sem restauração verificada não comprova recuperação.

| ID | Cenário | Critério de aprovação | Resultado |
| --- | --- | --- | --- |
| REC-01 | Backup antes de alteração | Arquivos e inventário registrados; integridade verificável | NÃO EXECUTADO |
| REC-02 | Restauração em VM descartável | Configurações recuperadas, Asterisk inicia e AMI/ARI autenticam | NÃO EXECUTADO |
| REC-03 | Reinicialização completa da VM | Serviços retornam automaticamente; ramais voltam a registrar | NÃO EXECUTADO |
| REC-04 | Falha controlada de serviço | Monitoramento detecta indisponibilidade e recuperação segue procedimento | NÃO EXECUTADO |
| REC-05 | Rollback após alteração simulada | Snapshot anterior restaurado, chamadas de laboratório funcionam | NÃO EXECUTADO |
| REC-06 | Verificação pós-rollback | AMI/ARI permanecem locais, arquivos legíveis e nenhum canal órfão | NÃO EXECUTADO |

Para cada cenário, registre o tempo de interrupção, o tempo até recuperação, a evidência de serviço ativo, os testes de autenticação e ao menos uma chamada SIP bidirecional. O responsável técnico deve definir previamente os limites aceitáveis de RTO e RPO; **não** considerar aprovado sem valores definidos e evidência correspondente.

**Falha crítica:** backup irrestaurável, perda não autorizada de configuração, falha na autenticação após restauração, exposição AMI/ARI, ausência de rollback funcional ou recuperação acima dos limites aprovados.

## Auditoria de privilégios AMI/ARI — pendência de segurança

O provisionador atual concede ao usuário AMI privilégios de leitura e escrita amplos, incluindo `system`, `command`, `config`, `originate` e `dialplan`. O vínculo à interface loopback **não elimina** o risco de uma aplicação local comprometida usar essas capacidades.

Antes da liberação, inventariar as ações AMI realmente utilizadas pelo Enlace-PBX e seus módulos, com evidência de chamadas em laboratório. Reduzir `read` e `write` às classes estritamente necessárias, criar testes de regressão para ações permitidas e negadas e validar novamente os fluxos de atendimento, transferência e chamadas. **Não reduzir permissões às cegas**, pois isso pode interromper operações legítimas.

A conta ARI também requer revisão de escopo: `read_only = no` permite operações de escrita necessárias a determinados fluxos, mas exige autenticação, segregação de credenciais e acesso local controlado. Registrar decisão técnica e responsável.

**Estado: BLOQUEADO — menor privilégio ainda não demonstrado.**

## Parâmetros obrigatórios antes da execução

Os valores abaixo são decisões de operação e **não foram definidos nem medidos pelo CI**. Preencher e aprovar antes dos testes correspondentes; não inferir valores a partir de exemplos ou defaults de bibliotecas.

| Parâmetro | Valor aprovado | Evidência/autoridade |
| --- | --- | --- |
| Timeout máximo de resposta do gateway IA | PENDENTE | PENDENTE |
| Timeout de transferência para humano | PENDENTE | PENDENTE |
| Limite de chamadas simultâneas por instância | PENDENTE | PENDENTE |
| Critério de qualidade RTP (perda, jitter, latência) | PENDENTE | PENDENTE |
| RTO máximo após falha | PENDENTE | PENDENTE |
| RPO máximo após falha | PENDENTE | PENDENTE |
| Janela de observação pós-reinício | PENDENTE | PENDENTE |
| Responsável pela aprovação de homologação | PENDENTE | PENDENTE |

**Regra de bloqueio:** cenários que dependem de um parâmetro pendente não podem receber PASS. Os resultados possíveis são PASS, FAIL, BLOQUEADO ou NÃO EXECUTADO, sempre com evidência vinculada.

## Matriz de aceitação

| Cenário | Esperado | Resultado | Evidência |
| --- | --- | --- | --- |
| Instalação limpa | Exit 0, sem alterações em PBX anterior | NÃO EXECUTADO | — |
| Inicialização | Serviço ativo como usuário `asterisk` | NÃO EXECUTADO | — |
| Estabilidade após 60 segundos | PID estável, sem reinício inesperado, CLI responde | NÃO EXECUTADO | — |
| Leitura das configurações | Usuário `asterisk` lê manager.conf, http.conf e ari.conf | NÃO EXECUTADO | — |
| AMI/ARI | Login válido e credenciais inválidas rejeitadas | NÃO EXECUTADO | — |
| Exposição de rede | AMI/ARI somente loopback, sem acesso externo | NÃO EXECUTADO | — |
| SIP/PJSIP | Dois ramais registrados, chamada e desligamento | NÃO EXECUTADO | — |
| RTP | Áudio bidirecional e DTMF | NÃO EXECUTADO | — |
| WebRTC | WSS, DTLS-SRTP, chamada e áudio | NÃO EXECUTADO | — |
| IA | Resposta, timeout e fallback humano | NÃO EXECUTADO | — |
| Reinício | Serviços recuperados após reboot | NÃO EXECUTADO | — |
| Rollback | Snapshot restaurado e serviços verificados | NÃO EXECUTADO | — |

## Critério de aprovação

Não liberar para produção sem evidência real dos cenários críticos, revisão de segurança, rollback comprovado e aprovação do responsável técnico. Aprovação no GitHub Actions **não** substitui esta matriz.

**Decisão atual: NÃO HOMOLOGADO / NÃO LIBERAR PARA PRODUÇÃO.**

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

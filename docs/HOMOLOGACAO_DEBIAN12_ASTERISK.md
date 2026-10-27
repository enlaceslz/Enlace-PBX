# Enlace-PBX — Plano de homologação Asterisk em Debian 12

**Estado:** roteiro de execução, não evidência de homologação.  
**Ambiente:** VM descartável Debian 12, snapshot antes de qualquer instalação.  
**Branch:** `chore/producao-hardening-20261023`.

## Condições obrigatórias antes do início

- VM isolada de produção, com acesso controlado e snapshot restaurável.
- Registrar commit exato, versão do Debian, recursos da VM, IP de laboratório e responsável.
- Credenciais AMI e ARI distintas, aleatórias, com no mínimo 24 caracteres; não registrar segredos em logs.
- Não executar o instalador em PBX de cliente nem com tráfego ativo.
- Preservar saída do instalador, logs do serviço, resultado dos comandos e horário de cada teste.
- Se houver Asterisk pré-existente, **não** prosseguir sem backup verificado, janela de manutenção e autorização formal. A variável `ENLACE_ALLOW_EXISTING_PBX=I_UNDERSTAND_THE_RISK` não constitui backup.

## Etapa 1 — Preflight e instalação

1. Confirmar `cat /etc/os-release`, `uname -a`, espaço em disco, memória e resolução DNS.
2. Verificar `bash -n install-enlace-pbx.sh` e os testes do GitHub Actions para o commit instalado.
3. Confirmar que a VM está limpa: `command -v asterisk` e `test -e /etc/asterisk` não devem indicar instalação anterior.
4. Executar o instalador conforme instruções oficiais do repositório, usando credenciais geradas para laboratório. Não incluir credenciais na transcrição.
5. Registrar código de saída e verificar `systemctl is-active asterisk`, `systemctl status asterisk --no-pager` e `asterisk -rx 'core show version'`.

**Aprovação:** instalação sem erros; serviço ativo; CLI operacional; processo sob usuário não privilegiado; nenhuma configuração de terceiros sobrescrita.

## Etapa 1A — Estabilidade após inicialização

1. Após a instalação, executar `systemctl is-active --quiet asterisk` e registrar o resultado; confirmar `systemctl show asterisk -p User -p Group -p MainPID -p NRestarts`.
2. Registrar `asterisk -rx 'core show uptime'` e `asterisk -rx 'core show channels count'`. Repetir após 60 segundos para detectar reinicializações e encerramentos prematuros.
3. Executar `runuser -u asterisk -- test -r /etc/asterisk/manager.conf`, repetindo para `http.conf` e `ari.conf`. Registrar somente o resultado, nunca o conteúdo dos arquivos.
4. Confirmar `ss -lntup`: AMI (5038) e HTTP/ARI (8088) devem estar vinculados a 127.0.0.1, salvo arquitetura remota expressamente aprovada e protegida.
5. Registrar `journalctl -u asterisk --since '-5 min' --no-pager` com dados sensíveis removidos. Verificar falhas de carregamento de módulos, autenticação, permissões e reinícios.

**Aprovação:** processo estável durante a observação, usuário de serviço sem privilégios, arquivos legíveis pelo serviço e nenhuma exposição não autorizada. A verificação estática ou CI não substitui estes passos em VM real.

## Etapa 2 — Autenticação e superfície de rede

1. Executar `scripts/check-asterisk-auth.py` com variáveis de ambiente de laboratório, a partir do próprio PBX.
2. Confirmar login e logoff AMI, resposta HTTP 200 em `/ari/asterisk/info` e falha com credenciais inválidas.
3. Inspecionar portas com `ss -lntup` e validar firewall. AMI 5038 e ARI 8088 não devem estar expostos publicamente.
4. Confirmar permissões de `/etc/asterisk/manager.conf`, `ari.conf` e eventuais arquivos de segredo.
5. Inspecionar `journalctl -u asterisk --no-pager -n 200` para erros e vazamento de credenciais.

**Aprovação:** autenticação correta, falha fechada para credenciais inválidas, nenhuma exposição indevida ou segredo em logs.

## Etapa 3 — Telefonia SIP/PJSIP e áudio

1. Criar dois ramais de laboratório, registrar softphones e verificar `asterisk -rx 'pjsip show endpoints'`.
2. Fazer chamadas bidirecionais, validar estabelecimento e encerramento, DTMF, transferência e reconexão após perda de rede.
3. Validar áudio bidirecional (RTP), codec negociado, NAT, ausência de áudio unilateral e qualidade perceptível.
4. Repetir cenários com WebRTC/WSS, TLS e DTLS-SRTP, se habilitados na entrega.
5. Verificar registros e métricas de chamada; nenhum teste deve originar chamadas reais para a rede pública sem autorização.

**Aprovação:** registro estável, áudio bidirecional e sinalização correta nos cenários previstos.

## Etapa 4 — Integrações e IA

1. Verificar conectividade da aplicação ao AMI/ARI com menor privilégio.
2. Exercitar fluxo de atendimento com IA usando destino e números de teste.
3. Confirmar timeout, indisponibilidade do gateway de IA, fallback humano, encerramento e limpeza de sessões.
4. Verificar que transcrições, gravações e credenciais seguem políticas de acesso e retenção definidas.
5. Inspecionar logs e métricas sem registrar dados pessoais desnecessários.

**Aprovação:** fluxos previsíveis, falhas controladas, sem chamadas órfãs ou exposição de segredos.

## Etapa 5 — Recuperação e critérios de liberação

1. Criar snapshot e backup da configuração; restaurar em ambiente de laboratório.
2. Reiniciar a VM e confirmar retorno automático do Asterisk e dos serviços integrados.
3. Testar indisponibilidade de AMI, ARI e gateway IA separadamente; documentar tempo de recuperação.
4. Reexecutar smoke tests após restauração.
5. Anexar evidências: commit, CI, checklist assinado, logs higienizados, resultados SIP/RTP/WebRTC, plano de rollback e responsáveis.

**Bloqueio automático de produção:** qualquer teste crítico falho, exposição pública de AMI/ARI, segredos em logs, ausência de rollback validado ou falta de evidência de chamadas e áudio reais.

## Registro de execução

| Item | Resultado (PASS/FAIL/NÃO EXECUTADO) | Evidência | Responsável/data |
| --- | --- | --- | --- |
| Instalação Debian 12 | NÃO EXECUTADO | — | — |
| Serviço e usuário Asterisk | NÃO EXECUTADO | — | — |
| AMI/ARI autenticados | NÃO EXECUTADO | — | — |
| Firewall e segredos | NÃO EXECUTADO | — | — |
| PJSIP e RTP bidirecional | NÃO EXECUTADO | — | — |
| WebRTC | NÃO EXECUTADO | — | — |
| Integração IA e fallback | NÃO EXECUTADO | — | — |
| Reinício e rollback | NÃO EXECUTADO | — | — |

**Decisão atual: NÃO LIBERAR PARA PRODUÇÃO.**

# Roteiro de laboratório — autenticação AMI/ARI no Debian 12

> **Estado:** procedimento preparado, **não executado**. Não constitui aprovação para produção.

## Pré-condições

- VM descartável Debian 12 com snapshot anterior à instalação e Asterisk instalado pelo projeto.
- Acesso SSH administrativo, console de recuperação e janela autorizada.
- Credenciais AMI/ARI distintas, mantidas exclusivamente em gerenciador de segredos; nunca inserir valores reais em relatórios, tickets ou comandos compartilhados.
- Confirmar versão e configuração de Asterisk e registrar responsável, data e hash do commit testado.
- Usar somente endereço de loopback na própria VM. Não publicar portas 5038 e 8088.

## 1. Inventário sem exposição de segredos

Executar no laboratório:

```bash
cat /etc/debian_version
asterisk -rx 'core show version'
systemctl show asterisk -p ActiveState -p SubState -p User -p Group -p MainPID -p NRestarts
ss -lnt '( sport = :5038 or sport = :8088 )'
```

Registrar a saída sanitizada. Não anexar arquivos `manager.conf` ou `ari.conf` completos: contêm credenciais.

## 2. Teste positivo de autenticação

Executar o verificador local com as variáveis de ambiente definidas por mecanismo seguro, sem registrar os valores:

```bash
python3 scripts/check-asterisk-auth.py
```

Esperado: login e logoff AMI aprovados, endpoint ARI de informações retornando HTTP 200 com `system.version` preenchido. O script não valida chamadas, RTP, permissões de Originate nem ARI de escrita.

## 3. Testes negativos controlados

1. Credencial AMI inválida: o teste deve falhar sem revelar a senha.
2. Credencial ARI inválida: o teste deve falhar com HTTP 401/403, conforme configuração.
3. Mesmo usuário ou mesma senha para AMI e ARI: o verificador deve rejeitar antes da conexão.
4. Acesso remoto a 5038 e 8088 a partir de VM de teste autorizada: deve ser negado. Validar firewall **e** endereço de escuta.
5. Repetir testes de protocolo malformado com os mocks automatizados, separando evidências simuladas de evidências do Asterisk real.

**Atenção:** não provocar respostas malformadas em PBX de produção; executar cenários de injeção apenas em simuladores isolados.

## 4. Matriz de menor privilégio

Para cada fluxo de atendimento, originação, transferência, consulta de canais, encerramento e integração IA, registrar: ação AMI/ARI efetivamente invocada, classe de privilégio requerida, resultado com permissão concedida e resultado com permissão removida. Não alterar a política de permissões da instância de produção sem essa evidência.

## 5. Registro e decisão

Para cada cenário, preencher: identificador, data/hora, responsável, commit, versão do Asterisk, esperado, observado, PASS/FAIL/BLOQUEADO/NÃO EXECUTADO e referência ao artefato sanitizado.

**NO-GO automático:** portas AMI/ARI expostas fora de loopback, credenciais compartilhadas, falha de autenticação, privilégio excessivo sem justificativa, ausência de rollback ou evidência crítica não executada.

Este roteiro complementa `docs/EVIDENCIAS_HOMOLOGACAO_DEBIAN12.md`; não substitui os testes SIP/PJSIP, RTP, WebRTC, voz IA, reinício, restauração e rollback.

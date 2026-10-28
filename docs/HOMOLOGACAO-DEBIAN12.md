# Homologação operacional — Enlace-PBX (Debian 12)

**Ambiente obrigatório:** VM Debian 12 isolada, com snapshot anterior à instalação, acesso ao console e sem tráfego de clientes reais. Este roteiro **não** autoriza instalação em produção.

## 1. Pré-requisitos e segurança
- [ ] Registrar versão do Debian, recursos de CPU/RAM/disco, IP e topologia (sem publicar credenciais).
- [ ] Criar snapshot completo da VM e verificar possibilidade de restauração.
- [ ] Confirmar DNS, certificado TLS, política de firewall, acesso SSH restrito e portas necessárias.
- [ ] Confirmar que segredos AMI/ARI e banco não são expostos em logs ou histórico do shell.
- [ ] Validar cópia recuperável do banco PostgreSQL e configurações Asterisk.

- [ ] Conferir o SHA-256 do pacote Asterisk 20.17.0 com a fonte de distribuição; valor atualmente fixado: `a1c0bfa39b5ff6a5b869a2acc9a749bbd549812f8ab4b37c3e275c18623fe3b9` (referência cruzada: FreeBSD ports `net/asterisk20/distinfo`).
- [ ] Se usar outra versão Asterisk 20, informar `ASTERISK_EXPECTED_SHA256` obtido de fonte confiável antes de executar o instalador.

## 2. Instalação
- [ ] Executar `deploy.sh` **somente na VM de testes**, acompanhando a saída e registrando erros.
- [ ] Confirmar serviços PostgreSQL, aplicação e Asterisk ativos.
- [ ] Conferir `systemctl show asterisk.service -p User -p Group`; ambos devem indicar `asterisk`. Confirmar também o override `10-enlace-pbx-user.conf` e executar a verificação de UID efetivo do smoke test.
- [ ] Executar, a partir da raiz do repositório, `bash scripts/homologation-smoke.sh`. Este script é somente leitura e retorna código 1 em verificações críticas.
- [ ] Verificar o endpoint HTTP(S) da aplicação e o login administrativo sem compartilhar senhas.
- [ ] Validar conectividade AMI e ARI autenticadas e módulos PJSIP/WebSocket no Asterisk.
- [ ] Validar registro SIP, ligação de entrada, saída, transferência, áudio bidirecional e WebRTC (quando configurado).

## 3. Atualização e recuperação
- [ ] Adicionar variável de teste não gerenciada ao `.env`; repetir o deploy e verificar que ela permanece.
- [ ] Confirmar que variáveis gerenciadas recebem os novos valores e o `.env` continua com permissão 600.
- [ ] Fazer duas atualizações consecutivas e verificar backups únicos e restauráveis.
- [ ] Criar uma configuração SIP/dialplan de teste antes da reinstalação do Asterisk; após executar novamente o instalador, verificar que `pjsip.conf`, `extensions.conf` e demais arquivos preexistentes não foram substituídos por exemplos de fábrica.

- [ ] Em snapshot descartável, simular falha de reconciliação e confirmar que o `.env` anterior não é substituído.
- [ ] Restaurar backup de banco e configurações em uma segunda VM isolada; validar integridade e login.
- [ ] Medir tempos de indisponibilidade e recuperação e registrar evidências.

## 4. Critérios de aceite
Aprovado somente se todos os testes críticos passarem, a restauração funcionar, não houver vazamento de segredos e a operação SIP/AMI/ARI for confirmada. Qualquer falha bloqueia o merge e a implantação.

**Limitações:** o CI não simula hardware, telefonia real, rede NAT, certificados, SIP trunk ou restauração PostgreSQL. O script smoke não modifica o servidor, mas não substitui esses testes manuais.

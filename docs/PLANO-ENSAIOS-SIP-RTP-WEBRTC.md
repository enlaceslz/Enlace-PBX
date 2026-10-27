# Plano de ensaios SIP/RTP — Enlace-PBX (ambiente isolado)

**Estado: NÃO EXECUTADO.** Nenhum passo abaixo deve usar tronco de operadora,
número público, dados reais de clientes ou discador de produção.

## Pré-condições bloqueantes

- VM Debian 12 exclusiva, snapshot recuperável, data/hora sincronizadas.
- Asterisk e aplicação ativos; executar preflight e arquivar relatório.
- Dois clientes SIP de teste (A e B), contas e senhas **sintéticas**, sem
  reutilizar credenciais de produção.
- Rede privada isolada, com roteamento para operadoras e PSTN desabilitado.
- Registrar versão do Asterisk, PJSIP, codecs, NAT e topologia sem segredos.
- Confirmação explícita do responsável de que a sessão é de homologação.

## Inventário inicial de rotas (não comprova isolamento)

Na VM isolada, executar:

```bash
bash scripts/inventory-homologation-isolation.sh /tmp/enlace-isolamento-001
(cd /tmp/enlace-isolamento-001 && sha256sum --check SHA256SUMS)
```

O script informa apenas a presença de rotas padrão IPv4/IPv6; não grava
endereços ou interfaces. Mesmo sem rota padrão, conexões diretas a redes
locais, regras NAT, túneis e troncos SIP ainda podem permitir tráfego externo.
A ausência de rota padrão **não autoriza** iniciar testes de chamada sem
revisão humana do isolamento e bloqueio de operadoras.

## Procedimento de execução manual

| ID | Ação | Resultado esperado | Evidência mínima |
| --- | --- | --- | --- |
| TEL-01 | Iniciar Asterisk e coletar uptime/módulo PJSIP | CLI acessível e PJSIP carregado | Coletor e SHA256SUMS |
| TEL-02 | Registrar cliente SIP sintético A | Registro confirmado, sem falhas de autenticação | Hora, status sanitizado |
| TEL-03 | Registrar cliente SIP sintético B | Registro confirmado, sem falhas de autenticação | Hora, status sanitizado |
| TEL-04 | Originar chamada A→B interna | B toca, atende, CDR sintético íntegro | Horários, estado e CDR redigido |
| TEL-05 | Conversar A↔B por 30 s | Áudio bidirecional sem cortes relevantes | Métricas RTP, jitter/perda |
| TEL-06 | Realizar chamada via webphone de teste | WSS e DTLS-SRTP negociados | Estado ICE, DTLS, codec; sem tokens |
| TEL-07 | Encaminhar chamada à fila/URA sintética | Anúncio, DTMF e fila corretos | Eventos e tempos sanitizados |
| TEL-08 | Gravar chamada sintética autorizada | Arquivo gerado, reproduzível e protegido | Hash e metadados, sem publicar áudio |
| TEL-09 | Reiniciar serviço em janela isolada | Serviços recuperam sem perda indevida | Cronologia e health check |
| TEL-10 | Simular indisponibilidade de banco descartável | Falha controlada, recuperação e rastreio | Cronologia, logs sanitizados |

## Critérios de interrupção

Interromper imediatamente se houver tentativa de saída para PSTN, tráfego para
tronco real, credencial de produção, gravação de pessoa não participante,
perda de isolamento, degradação de outro ambiente ou alteração não autorizada.

## Registro e conclusão

Usar `docs/TERMO-EVIDENCIAS-HOMOLOGACAO.md` e registrar **cada TEL**
individualmente. Não inserir tokens, cabeçalhos Authorization, SIP passwords,
números reais, IPs sensíveis, áudio bruto ou dumps de configuração no Git.

Nenhum item deve ser marcado APROVADO somente com CI, coletor ou relatório
de preflight. Exigir observação real e revisão por responsável técnico.

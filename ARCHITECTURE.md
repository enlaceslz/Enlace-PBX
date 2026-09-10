# Enlace-PBX: Documentação de Arquitetura

O Enlace-PBX é estruturado utilizando uma arquitetura moderna e modular de Aplicação de Página Única (SPA) em React, apoiada por um servidor backend em Express (BFF - Backend For Frontend) que atua como proxy e orquestrador de chamadas para a API do Asterisk (ARI/AMI) e API do Google Gemini.

## 1. Arquitetura Geral

A aplicação segue a tipologia **Cliente-Servidor (Full-stack)**:

- **Frontend (SPA):** React 18 empacotado pelo Vite. Renderiza a interface do usuário, orquestra a navegação entre os módulos no menu lateral e mantém o estado global do Webphone (Softphone WebRTC).
- **Backend (Express):** Hospeda endpoints da API REST `/api/v1/*` utilizados para consumo de dados e gerenciamento de PJSIP, Troncos, Agentes de IA e comandos do CLI do Asterisk.
- **Camada de Telefonia (Simulada/Real):** No ambiente de demonstração, o arquivo `server/asteriskService.ts` simula o estado do Asterisk 20. Em produção, ele se conectaria ao Asterisk via ARI e Manager API (AMI), injetando as configurações no PostgreSQL ou diretamente via `res_odbc` e realtime.

## 2. Padrão Visual (NOC Light Canvas)

O design foi concebido focando em operadores de telefonia, administradores de rede (NOC) e analistas:
- **Cor de Fundo / Superfícies:** Utiliza tons neutros claros (Tailwind `slate-50`, `white`) para proporcionar um aspecto "Clean" e reduzir a fadiga visual em leituras diurnas.
- **Acentos e Destaques:** O azul corporativo (`blue-600`) é utilizado para botões de ação primária e navegação, em contraste com `rose-600` (exclusões e erros) e `emerald-500` (status online e conexões).
- **Tipografia:** *Plus Jakarta Sans* para legibilidade geral e *JetBrains Mono* estrita para logs, Caller IDs, IPs, scripts de instalação e terminal Asterisk CLI.

## 3. Módulos do Sistema (Views)

Cada módulo operacional é encapsulado no diretório `/src/components/views/`:

1.  **`DashboardView.tsx`:** Visão geral do PBX com gráficos (Recharts) e cartões de status do sistema (Uptime, Extensões, CPU).
2.  **`ExtensionsView.tsx`:** Gerenciamento de Ramais (PJSIP). Visualização de endpoints, codecs e suporte a cópia rápida do arquivo `pjsip.conf` em modal, além de funcionalidade de discagem via Webphone.
3.  **`TrunksView.tsx`:** Gerenciamento de Troncos SIP e Rotas de Entrada. Oferece validação de status de registro, latência de Qualify (RTT) e configuração de provedores SIP nativos brasileiros.
4.  **`RoutesView.tsx`:** Dialplan e Rotas de Saída (LCR - Least Cost Routing).
5.  **`QueuesAndGroupsView.tsx`:** Estratégias de distribuição de chamadas (ACD), grupos de toque, transbordo e SLAs de atendimento.
6.  **`IvrView.tsx`:** Unidade de Resposta Audível (URA) tradicional com nós navegáveis e TTS básico.
7.  **`AiGatewayView.tsx`:** Painel de Agentes Inteligentes (MaIA). Define personas, integração via *Asterisk AudioSocket*, comportamento de interrupção (Barge-in) e configuração de voz do Google Gemini.
8.  **`AsteriskCoreView.tsx`:** Controle avançado contendo a Monitoração ARI, o Instalador Linux do servidor PBX em Bash e um Console Asterisk CLI embutido (`asterisk -rvvv`).
9.  **`CdrAndRecordingsView.tsx`:** Histórico completo de chamadas. Incorpora um mini-player fixo no rodapé (Floating Audio Toolbar) para simulação de escuta de gravações de chamadas e leitura de transcrições utilizando *Web Speech API*.
10. **`AdminAndSecurityView.tsx`:** RBAC (Role-Based Access Control) e conformidade com auditoria (Logs de eventos do sistema baseados na LGPD).

## 4. O Webphone Integrado (WebRTC)

O módulo `WebphoneModal.tsx` fica ancorado no layout principal (fora do escopo das páginas individuais) para garantir que chamadas continuem ativas durante a navegação.
- Permite uso de atalhos e preenchimento automático.
- Oferece teclado (Dialpad) numérico.
- Possui um sintetizador de som DTMF utilizando a `Web Audio API` brasileira/padrão ITU.
- Integra o microfone via `SpeechRecognition` para envio rápido de instruções por voz (TTS/STT) quando simulando agentes de IA no próprio painel.

## 5. Próximos Passos (Evolução)
- Substituir o banco simulado em memória (`server/db.ts`) por PostgreSQL + Drizzle ORM.
- Conectar a classe `AsteriskService` de fato aos WebSockets do ARI (`ari-client` npm) e AMI para monitoramento real das ligações SIP WSS.
- Refinar as transcrições das chamadas (STT) na view de CDR para suportar streaming chunked.

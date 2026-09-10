# Enlace-PBX: Documentação de Arquitetura

O Enlace-PBX é estruturado utilizando uma arquitetura moderna e modular de Aplicação de Página Única (SPA) em React, apoiada por um servidor backend em Express (BFF - Backend For Frontend) que atua como proxy e orquestrador de chamadas para a API do Asterisk (ARI/AMI) e API do Google Gemini.
Recentemente, a plataforma evoluiu de um simples PBX para um **AI Gateway e Hub Omnichannel de Comunicação Empresarial**.

## 1. Arquitetura Geral

A aplicação segue a tipologia **Cliente-Servidor (Full-stack)**:

- **Frontend (SPA):** React 18 empacotado pelo Vite. Renderiza a interface do usuário, orquestra a navegação entre os módulos no menu lateral e mantém o estado global do Webphone (Softphone WebRTC).
- **Backend (Express):** Hospeda endpoints da API REST `/api/v1/*` utilizados para consumo de dados e gerenciamento de PJSIP, Troncos, Agentes de IA e comandos do CLI do Asterisk.
- **Camada de Telefonia (Simulada/Real):** No ambiente de demonstração, o arquivo `server/asteriskService.ts` simula o estado do Asterisk 20. Em produção, ele se conectaria ao Asterisk via ARI e Manager API (AMI), injetando as configurações no PostgreSQL ou diretamente via `res_odbc` e realtime.
- **CRM Integration Hub:** Endpoints que sincronizam ativamente o Enlace-PBX com sistemas CRM de mercado (HubSpot, Pipedrive, Salesforce, Zoho).
- **Motor Multi-Tenant Avançado:** Todas as entidades possuem a restrição rigorosa e estrutural de `tenant_id` cravada no Banco de Dados para prover segmentação de dados entre clientes corporativos.

## 2. Padrão Visual (NOC Light Canvas)

O design foi concebido focando em operadores de telefonia, administradores de rede (NOC) e analistas:
- **Cor de Fundo / Superfícies:** Utiliza tons neutros claros (Tailwind `slate-50`, `white`) para proporcionar um aspecto "Clean" e reduzir a fadiga visual em leituras diurnas.
- **Acentos e Destaques:** O azul corporativo (`blue-600`) é utilizado para botões de ação primária e navegação, em contraste com `rose-600` (exclusões e erros) e `emerald-500` (status online e conexões).
- **Tipografia:** *Plus Jakarta Sans* para legibilidade geral e *JetBrains Mono* estrita para logs, Caller IDs, IPs, scripts de instalação e terminal Asterisk CLI.

## 3. Módulos do Sistema (Views)

Os módulos foram categorizados e encapsulados no diretório `/src/components/views/`:

**GERAL & NOC:**
1.  **`DashboardView.tsx`:** Visão geral do PBX com gráficos (Recharts).
2.  **`OperationDashboardView.tsx`:** NOC (Network Operations Center) projetado para exibir painéis em tempo real com estado dos canais ao vivo, Uptime e consumo de CPU.

**CONTACT CENTER OMNICHANNEL:**
3.  **`OmnichannelView.tsx`:** Console de atendimento 360 unificando interações (Voz, WebRTC, WhatsApp).
4.  **`CrmHubView.tsx`:** Gestão de provedores e fluxos de conexão/desconexão com Hubspot, Pipedrive e RDStation.

**TELEFONIA ASTERISK 20:**
5.  **`ExtensionsView.tsx`, `TrunksView.tsx`, `RoutesView.tsx`:** Gerenciamento dos fluxos SIP e PJSIP base (Ramais, Provedores, LCR).
6.  **`QueuesAndGroupsView.tsx`, `IvrView.tsx`:** Distribuição (ACD) e Resposta Audível.

**MONITORAMENTO E HISTÓRICO:**
7.  **`CdrAndRecordingsView.tsx`:** Player global flutuante com suporte a Web Speech API para relatórios e transcrições das ligações.
8.  **`AsteriskCoreView.tsx`:** CLI embutido (`asterisk -rvvv`) via WebSocket, console bash interativo de instalação Linux.

**INTELIGÊNCIA ARTIFICIAL E ADMINISTRAÇÃO:**
9.  **`AiGatewayView.tsx`:** Console agnóstico para provedores LLM (Gemini, 9Router, Vertex). Opera a configuração de Voice Agents e RAG (Bases de Conhecimento).
10. **`QuickSetupView.tsx`:** Provisionamento massivo em segundos com Motor de Snapshot para `rollback`.
11. **`AdminAndSecurityView.tsx`:** Logs Auditáveis (LGPD), Empresas Multi-Tenant e controle de acesso RBAC.

## 4. AI Policy Engine & Customer Memory

A arquitetura do `geminiService.ts` implementa:
- **Supervisor (LLM-as-a-Judge):** Um método automatizado (`evaluateSession`) que, após a finalização do atendimento, utiliza LLM offline para calcular o risco de *churn*, intenção (intent) e nota do atendimento (score).
- **Customer Memory:** Antes de cada saudação de voz, o backend puxa o histórico sincronizado pelo CRM Hub do usuário baseando-se no telefone (`callerNumber`). Isso permite um atendimento preditivo e inteligente através do Gemini API (ex: "Olá João, percebi pelo HubSpot que seu boleto está atrasado, deseja renegociar?").
- **Validação de Tools (RBAC):** Restringe ativamente qualquer acionamento do LLM que não conste na política local de ferramentas autorizadas pelo painel de controle.

## 5. Próximos Passos (Evolução)
- Substituir o banco simulado em memória (`server/db.ts`) por PostgreSQL + Drizzle ORM.
- Conectar a classe `AsteriskService` de fato aos WebSockets do ARI (`ari-client` npm) e AMI para monitoramento real das ligações SIP WSS.
- Integrar processamento real assíncrono para transcrições e sumarização de filas.

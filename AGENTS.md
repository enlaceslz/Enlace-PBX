# Instruções para Agentes de IA — Enlace-PBX Enterprise

Você é o assistente técnico especializado do **Enlace-PBX Enterprise**, uma plataforma corporativa brasileira de alta disponibilidade para telefonia IP, contact center omnichannel, segurança de rede e inteligência artificial aplicada à voz humana.

Desenvolvido por **André LJP** e **Enlace Telecom** (São Luís, Maranhão, Brasil — https://enlace.slz.br).

---

## 🇧🇷 Idioma e Comunicação Obrigatória (pt-BR)
- **Toda e qualquer comunicação** com o usuário, respostas, explicações conceituais, diagnósticos técnicos, mensagens de commit, resumos de tarefas e documentações devem ser rigorosamente em **Português Brasileiro (pt-BR)**.
- **Todas as interfaces de usuário** (labels, botões, modais, tooltips, alertas, formulários, tabelas, notificações e relatórios) devem ser redigidas e mantidas exclusivamente em **Português Brasileiro (pt-BR)**.
- **Comentários de código-fonte** e documentações técnicas internas devem ser escritos em **Português Brasileiro (pt-BR)**.

---

## 🏛️ Arquitetura do Sistema & Stack Tecnológica
O Enlace-PBX adota uma arquitetura em camadas **BFF (Backend-for-Frontend)** corporativa:

1. **Frontend (SPA / PWA):**
   - **React 19** com TypeScript estruturado e modular.
   - **Tailwind CSS v4** com paleta corporativa equilibrada (Slate, Blue, Emerald, Rose, Amber).
   - **Lucide-React** para iconografia unificada e consistente em todos os módulos.
   - **Recharts** para telemetria de tráfego, MOS, SLA e análise de chamadas.
   - **Motion (Framer Motion)** para transições suaves de abas e painéis.
   - **Webphone WebRTC Embutido** com suporte a DTMF, Opus 48kHz, G.711 e controle de chamadas ao vivo.

2. **Backend (Express BFF & APIs):**
   - **Node.js 20/22 LTS** com Express.
   - **Server-Sent Events (SSE) & WebSockets** para telemetria em tempo real (estado de ramais, canais ativos, filas e logs do Asterisk).
   - **REST APIs (`/api/v1/*`)** protegidas por autenticação JWT e validação de permissões RBAC.
   - **Compilação de Produção:** `vite build` para o cliente e `esbuild` gerando `dist/server.cjs` com sourcemaps.

3. **Camada de Telefonia & Mídia (Asterisk 20 LTS Puro):**
   - **res_pjsip:** Pilha moderna de sinalização SIP para ramais, telefones IP físicos e troncos VoIP.
   - **res_http_websocket & res_pjsip_transport_websocket:** Sinalização WebRTC WSS (porta 8089) para o Webphone no navegador.
   - **res_srtp & res_crypto:** Criptografia ponta a ponta de áudio (DTLS-SRTP).
   - **Asterisk REST Interface (ARI - porta 8088):** Aplicação Stasis conectando chamadas diretamente ao AI Gateway.
   - **AudioSocket (app_audiosocket / res_audiosocket):** Streaming bidirecional de áudio PCM 8/16kHz para o pipeline de IA com latência inferior a 25ms.

4. **Inteligência Artificial Cognitiva (Google Gemini):**
   - **Google GenAI SDK (`@google/genai`):** Modelos `gemini-flash-latest`, `gemini-2.5-flash` e `gemini-3.1-flash-live-preview`.
   - **Agentes de Voz MaIA:** Atendimento de voz em linguagem natural brasileira, com memória contextual do cliente (Customer Memory) sincronizada do CRM.
   - **RAG & Bases de Conhecimento:** Ingestão de manuais, tabelas de preços e políticas para resposta sem alucinações.
   - **Supervisor LLM-as-a-Judge:** Avaliação automática pós-atendimento com cálculo de índice de satisfação (CSAT/NPS), risco de churn e análise de sentimento.

---

## 🧩 Catálogo Completo dos 27 Módulos de Interface (`src/components/views/`)

| # | Módulo / Arquivo | Descrição Funcional |
| :-: | :--- | :--- |
| 1 | `DashboardView.tsx` | Painel executivo com métricas consolidadas de tráfego, chamadas atendidas, MOS e ocupação. |
| 2 | `OperationDashboardView.tsx` | NOC em tempo real com estado dos canais ao vivo, CPU, memória e status dos troncos. |
| 3 | `VpnMonitoringDashboard.tsx` | Monitoramento visual de túneis VPN (WireGuard e ZeroTier), latência e perda de pacotes. |
| 4 | `NetworkSecurityView.tsx` | Gestão de segurança de rede, regras do Fail2ban, IPs banidos e controle do Firewall UFW. |
| 5 | `ExtensionsView.tsx` | Gestão completa de ramais SIP/PJSIP e WebRTC, senhas, codecs e status de registro. |
| 6 | `TrunksView.tsx` | Configuração de troncos SIP/VoIP com autenticação por registro ou IP fixo (E.164). |
| 7 | `DidsView.tsx` | Gerenciamento de números virtuais (DIDs), portabilidade, DDDs e destinos de entrada. |
| 8 | `RoutesView.tsx` | Plano de discagem brasileiro, rotas de saída com LCR (menor custo) e rotas de entrada. |
| 9 | `QueuesAndGroupsView.tsx` | Filas de atendimento ACD (ringall, roundrobin, linear), agentes logados, pausa e SLA. |
| 10 | `CampaignsView.tsx` | Campanhas ativas de discagem preditiva e power dialing para televendas e cobrança. |
| 11 | `IvrView.tsx` | Editor visual de URA (IVR Flow Builder) multinível com simulador interativo e dialplan. |
| 12 | `OmnichannelView.tsx` | Console de atendimento unificado combinando Voz, WhatsApp oficial e Webchat. |
| 13 | `CrmHubView.tsx` | Integração bidirecional com CRMs de mercado (HubSpot, Pipedrive, RD Station e Salesforce). |
| 14 | `CrmContactsView.tsx` | Agenda centralizada de clientes, histórico de ligações, anotações e pedidos. |
| 15 | `AiGatewayView.tsx` | Configuração dos agentes MaIA, prompts de sistema, vozes neurais, ferramentas e RAG. |
| 16 | `CdrAndRecordingsView.tsx` | Bilhetagem detalhada (CDR), player flutuante de gravações, transcrição fonética e relatórios. |
| 17 | `BillingView.tsx` | Tarifador de chamadas, faturamento pré e pós-pago, saldo de clientes e exportação em PDF. |
| 18 | `AsteriskCoreView.tsx` | Console Asterisk CLI interativo (`asterisk -rvvvv`), status do PJSIP e recarga de dialplan. |
| 19 | `SystemLogsView.tsx` | Logs de auditoria do sistema, eventos de segurança e trilha de conformidade LGPD. |
| 20 | `HealthCheckView.tsx` | Diagnóstico automático de saúde do ecossistema (Node, Asterisk, PostgreSQL, Redis, APIs). |
| 21 | `InfraSettingsView.tsx` | Configurações de infraestrutura, IP WAN/LAN, NAT Traversal, FQDN e certificados SSL. |
| 22 | `BackupRestoreView.tsx` | Gerenciamento de Snapshots instantâneos, backup completo e restauração em 1-clique. |
| 23 | `QuickSetupView.tsx` | Assistente passo a passo de provisionamento inicial de novas instâncias do PABX. |
| 24 | `AdminAndSecurityView.tsx` | Gestão de usuários, permissões RBAC, empresas multi-tenant e tokens de acesso. |
| 25 | `SettingsView.tsx` | Parâmetros gerais da plataforma, identificação da empresa e preferências regionais. |
| 26 | `HelpManualView.tsx` | Manual interativo completo do administrador, guias de deploy, tutoriais e FAQ. |
| 27 | `LoginView.tsx` | Tela de autenticação corporativa com proteção contra força bruta e recuperação de senha. |

---

## 🔒 Diretrizes Rígidas de Segurança (Enterprise Security)
1. **Segredos Estritamente no Backend:** Chaves de API do Google Gemini (`GEMINI_API_KEY`), tokens de verificação do WhatsApp Meta, senhas SIP e credenciais de banco **JAMAIS** devem ser expostas no código do frontend (React). Todas as requisições que utilizam credenciais externas devem passar pelo backend Express (`/api/v1/*`).
2. **Autenticação JWT:** O cabeçalho `Authorization: Bearer <token>` é exigido em todas as rotas protegidas. O interceptor do frontend injeta o token automaticamente.
3. **Defesa em Profundidade:** O backend Express utiliza `Helmet` para cabeçalhos HTTP defensivos, políticas restritas de `CORS` e `express-rate-limit` para contenção de ataques de força bruta.
4. **Proteção contra Fraude Telefônica (Toll Fraud):** As rotas de saída possuem bloqueio padrão para destinos DDI caros e prefixos de alta tarifação (ex: 0900), com alertas no painel de segurança.
5. **Auditoria LGPD:** Todas as operações que envolvem escuta ou download de gravações telefônicas, alteração de senhas ou deleção de dados geram um registro imutável com timestamp, IP de origem e identificador do operador.

---

## 🎨 Padrão Visual e Identidade da Marca
- **Identidade Oficial:** A marca utiliza o **Polvo Tecnológico com Headset e Circuito Neural de IA** (`public/logo.png`, `public/logo.svg`, `public/logo-icon.png`, `public/logo-icon.svg`).
- **Estilo Enterprise / NOC:** Layout de alta densidade de informação com contraste equilibrado, bordas arredondadas moderadas (`rounded-xl` ou `rounded-2xl`), sombras sutis (`shadow-sm`, `shadow-md`).
- **Fontes:** Tipografia legível para interface geral e fontes monoespaçadas (`font-mono`) obrigatórias para dados técnicos: endereços IP, portas, codecs, latência em ms, Caller IDs e comandos de terminal.
- **Sem "AI Slop":** Proibidos degradês genéricos roxo-azul sem função, sombras brilhantes arbitrárias e caixas de texto com rótulos genéricos.

---

## 🚀 Ciclo de Desenvolvimento e Validação Obrigatória
1. **Nunca simular dados se uma rota real existir ou puder ser mantida.** Mantenha a integridade do BFF Express e das entidades do sistema.
2. **O comando `npm run build` deve compilar com 100% de sucesso.** O build executa o `vite build` para o cliente e o `esbuild` para compilar o backend no arquivo único `dist/server.cjs`.
3. **O linter `npm run lint` (`tsc --noEmit`) deve passar sem erros de tipagem.**
4. **Respeite o propósito do usuário:** Sempre execute a tarefa solicitada com máxima qualidade e precisão técnica, preservando a estabilidade da aplicação.

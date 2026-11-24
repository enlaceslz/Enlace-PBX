# Instruções para Agentes de IA — Enlace-PBX Enterprise (Pronto para Produção)

Você é o assistente técnico especializado do **Enlace-PBX Enterprise**, uma plataforma corporativa brasileira de alta disponibilidade para telefonia IP, contact center omnichannel, segurança de rede e inteligência artificial aplicada à voz humana.

Desenvolvido por **André LJP** e **Enlace Telecom** (São Luís, Maranhão, Brasil — https://enlace.slz.br).  
Repositório oficial: https://github.com/enlaceslz/Enlace-PBX

---

## 🇧🇷 Idioma e Comunicação Obrigatória (pt-BR)
- **Toda e qualquer comunicação** com o usuário, respostas, explicações conceituais, diagnósticos técnicos, mensagens de commit, resumos de tarefas e documentações devem ser rigorosamente em **Português Brasileiro (pt-BR)**.
- **Todas as interfaces de usuário** (labels, botões, modais, tooltips, alertas, formulários, tabelas, notificações e relatórios) devem ser redigidas e mantidas exclusivamente em **Português Brasileiro (pt-BR)**.
- **Comentários de código-fonte** e documentações técnicas internas devem ser escritos em **Português Brasileiro (pt-BR)**.

---

## 🏛️ Arquitetura do Sistema & Stack Tecnológica
O Enlace-PBX adota uma arquitetura em camadas **BFF (Backend-for-Frontend)** corporativa, endurecida para produção:

1. **Frontend (SPA / PWA):**
   - **React 19** com TypeScript estruturado e modular (Vite 6).
   - **Tailwind CSS v4** com paleta corporativa equilibrada (Slate, Blue, Emerald, Rose, Amber).
   - **Lucide-React** para iconografia unificada e consistente em todos os módulos.
   - **Recharts** para telemetria de tráfego, MOS, SLA e análise de chamadas.
   - **Motion (Framer Motion)** para transições suaves de abas e painéis.
   - **Webphone WebRTC Embutido (`sip.js`)** com suporte a DTMF, Opus 48kHz, G.711 e controle de chamadas ao vivo.
   - **Interceptor HTTP Same-Origin Resiliente (`src/utils/api.ts` + `src/main.tsx`):** Injeta automaticamente `Authorization: Bearer <token>` exclusivamente em requisições `/api/v1/*` da mesma origem via `Object.defineProperty(window, 'fetch', ...)` com checagem de descritor e fallback seguro (nunca usar atribuição direta `window.fetch = ...`, compatível com ambientes onde `fetch` possui apenas getter).
   - **Service Worker PWA (`src/main.tsx`):** Registrado via módulo ES (sem `<script>` inline no `index.html`) para suportar CSP `script-src 'self'` estrita em produção.

2. **Backend (Express BFF, APIs & Telemetria):**
   - **Node.js 20/22 LTS** com Express 4 (`server.ts`, carregando `import 'dotenv/config'` na linha 1 para compatibilidade nativa com PM2 e `node dist/server.cjs`) sobre `http.createServer(app)`.
   - **Ciclo de Vida e Encerramento Gracioso:** Em desenvolvimento, o middleware do Vite compartilha o mesmo servidor HTTP (evitando conflito na porta `24678`) e respeita `DISABLE_HMR=true`. Sinais `SIGTERM`/`SIGINT` fecham `viteServer` e encerram conexões `keep-alive`/SSE ativas via `closeAllConnections()` com timeout de segurança de 1,5s.
   - **Server-Sent Events (SSE) com Tickets Efêmeros:** Autenticação de streaming via `POST /api/v1/auth/sse-ticket` (TTL de 30s, uso único); JWT permanente em query string é rejeitado (`HTTP 401`).
   - **REST APIs (`/api/v1/*`)** protegidas globalmente por JWT (`requireAuth`), contexto canônico multi-tenant (`requireTenant` / `resolveTenantContext`) e controle de acesso por função (`requireRole`). Apenas `/api/v1/auth/login` e `/api/v1/webhooks/whatsapp` são isentos do middleware JWT.
   - **Sondas de Monitoramento Segregadas:**
     - `GET /health/live` (e `/health`, `/api/health`): Liveness pública leve do processo Node.js.
     - `GET /health/ready/web` (e `/health/ready`, `/ready`): Readiness pública do PostgreSQL.
     - `GET /health/ready/pbx`: Readiness pública do Asterisk Core e socket AMI.
     - `GET /health/deps` e `GET /api/v1/system/health`: Diagnóstico detalhado protegido por JWT + RBAC (`super_admin`, `admin`, `supervisor`), com cache TTL de 5s.
   - **Compilação de Produção:** `vite build` para o cliente e `esbuild` gerando `dist/server.cjs` com sourcemaps.

3. **Banco de Dados Corporativo (PostgreSQL 15/16+ com RLS):**
   - **Isolamento Multi-Tenant via Row-Level Security (RLS):** Todas as consultas de domínio passam pelo `postgresClient` (`executeTenantScoped` / `executeGlobalScoped`) com transações parametrizadas.
   - **Princípio do Menor Privilégio:** Em produção, a aplicação opera exclusivamente sob a role `enlace_app` (`NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`). O uso de superusuário (`postgres`) é bloqueado (*fail-closed*).
   - **Migrações Controladas (`DatabaseMigrator`):** Bloqueio distribuído via `pg_advisory_lock`, checksum SHA-256 contra *migration drift* e bloqueio de boot em produção se as migrações falharem.

4. **Camada de Telefonia & Mídia (Asterisk 20 LTS Puro):**
   - **res_pjsip:** Pilha moderna de sinalização SIP para ramais, telefones IP físicos e troncos VoIP.
   - **res_http_websocket & res_pjsip_transport_websocket:** Sinalização WebRTC WSS (porta 8089) para o Webphone no navegador.
   - **res_srtp & res_crypto:** Criptografia ponta a ponta de áudio (DTLS-SRTP).
   - **AMI (porta 5038) e ARI (porta 8088):** Restritos a `127.0.0.1` com credenciais criptográficas sincronizadas entre `.env`, `manager.conf` e `ari.conf` (`ASTERISK_AMI_USER`/`ASTERISK_AMI_USERNAME` e `ASTERISK_ARI_USER`/`ASTERISK_ARI_USERNAME`).
   - **AudioSocket (`app_audiosocket` / `res_audiosocket`):** Streaming bidirecional de áudio PCM 8/16kHz para o pipeline de IA com latência inferior a 25ms.

5. **Inteligência Artificial Cognitiva (Google Gemini):**
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
| 5 | `ExtensionsView.tsx` | Gestão completa de ramais SIP/PJSIP e WebRTC, senhas cifradas, codecs e status de registro. |
| 6 | `TrunksView.tsx` | Configuração de troncos SIP/VoIP com autenticação por registro ou IP fixo (E.164). |
| 7 | `DidsView.tsx` | Gerenciamento de números virtuais (DIDs), portabilidade, DDDs e destinos de entrada. |
| 8 | `RoutesView.tsx` | Plano de discagem brasileiro, rotas de saída com LCR (menor custo) e rotas de entrada. |
| 9 | `QueuesAndGroupsView.tsx` | Filas de atendimento ACD (ringall, roundrobin, linear), agentes logados, pausa e SLA. |
| 10 | `CampaignsView.tsx` | Campanhas ativas de discagem preditiva e power dialing para televendas e cobrança. |
| 11 | `IvrView.tsx` | Editor visual de URA (IVR Flow Builder) multinível com simulador interativo e dialplan. |
| 12 | `OmnichannelView.tsx` | Console de atendimento unificado combinando Voz, WhatsApp oficial (Meta Cloud API) e Webchat. |
| 13 | `CrmHubView.tsx` | Integração bidirecional com CRMs de mercado (HubSpot, Pipedrive, RD Station e Salesforce). |
| 14 | `CrmContactsView.tsx` | Agenda centralizada de clientes, histórico de ligações, anotações e pedidos. |
| 15 | `AiGatewayView.tsx` | Configuração dos agentes MaIA, prompts de sistema, vozes neurais, ferramentas e RAG. |
| 16 | `CdrAndRecordingsView.tsx` | Bilhetagem detalhada (CDR), player flutuante de gravações, transcrição fonética e relatórios. |
| 17 | `BillingView.tsx` | Tarifador de chamadas, faturamento pré e pós-pago, saldo de clientes e exportação em PDF. |
| 18 | `AsteriskCoreView.tsx` | Console Asterisk CLI interativo (`asterisk -rvvvv`), status do PJSIP e recarga de dialplan. |
| 19 | `SystemLogsView.tsx` | Logs em tempo real dos serviços (Asterisk, Nginx, VPN, Fail2ban) com exportação autenticada via Blob. |
| 20 | `HealthCheckView.tsx` | Diagnóstico automático de saúde do ecossistema (Node, Asterisk, PostgreSQL, Redis, APIs). |
| 21 | `InfraSettingsView.tsx` | Configurações de infraestrutura, IP WAN/LAN, NAT Traversal, FQDN e certificados SSL. |
| 22 | `BackupRestoreView.tsx` | Gerenciamento de Snapshots instantâneos, backup completo e restauração em 1-clique. |
| 23 | `QuickSetupView.tsx` | Assistente passo a passo de provisionamento inicial de novas instâncias do PABX. |
| 24 | `AdminAndSecurityView.tsx` | Gestão de usuários, permissões RBAC, empresas multi-tenant, auditoria LGPD e verificação SHA-256. |
| 25 | `SettingsView.tsx` | Parâmetros gerais da plataforma, identificação da empresa e preferências regionais. |
| 26 | `HelpManualView.tsx` | Manual interativo completo do administrador, guias de deploy, tutoriais e FAQ. |
| 27 | `LoginView.tsx` | Tela de autenticação corporativa com proteção contra força bruta e recuperação de senha. |

---

## 🔒 Diretrizes Rígidas de Segurança (Produção Enterprise)
1. **Segredos Estritamente no Backend & Criptografia AES-256-GCM:**
   - Chaves de API (`GEMINI_API_KEY`), tokens Meta (`accessToken`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`), senhas SIP e credenciais de banco **JAMAIS** devem ser expostos no frontend (React) ou em respostas de API sem máscara (`EncryptionService.maskSecret`).
   - Segredos persistidos em banco utilizam `EncryptionService` (`AES-256-GCM` com envelope `enc:v1:<iv>:<tag>:<ciphertext>`). A variável `ENCRYPTION_KEY` (>= 32 caracteres) é validada de forma *fail-fast* no boot de produção (`server/config/env.ts`).
   - Para rotação de chaves sem perda de acesso aos dados cifrados, utilizar sempre `EncryptionService.rotateKey(valor, chaveAntiga, chaveNova)`.
   - O arquivo `.env` deve manter permissão restrita `chmod 600` e nunca conter senhas estáticas ou previsíveis.
2. **Autenticação JWT, RBAC & Isolamento Multi-Tenant:**
   - Toda rota em `/api/v1/*` exige JWT válido e `TenantContext` resolvido via `resolveTenantContext(req)`, exceto `/api/v1/auth/login` e `/api/v1/webhooks/whatsapp`.
   - Rotas administrativas e de telemetria interna (`/api/v1/webhooks`, `/api/v1/infra/config`, `/api/v1/system/logs*`, `/api/v1/network/*`, `/api/v1/security/fail2ban`, `/api/v1/setup/*`, `/api/v1/whatsapp/config`, `/health/deps`) exigem `requireRole(...)` explícito.
   - `GET /api/v1/tenants` retorna todos os tenants somente para `super_admin`; demais papéis visualizam exclusivamente o próprio tenant.
   - Operações cross-tenant exigem capacidade explícita `platform:cross_tenant`, validação do tenant alvo e trilha de auditoria.
3. **Defesa HTTP em Profundidade (Helmet, CSP, CORS & Rate Limiting):**
   - Em produção (`NODE_ENV=production`), a CSP está ativa com `script-src 'self'` (zero `unsafe-inline` e zero `unsafe-eval`), `object-src 'none'`, `frameguard: sameorigin`, `hsts`, `noSniff` e `connect-src` restrito a `'self'`, `ws:/wss:` e APIs autorizadas. Fora de produção, `X-Frame-Options` é removido exclusivamente para compatibilidade com ambientes de preview em iframe.
   - `CORS_ALLOWED_ORIGINS` é obrigatório em produção (sem wildcard `*`) e rejeita origens não autorizadas com `HTTP 403`.
   - `authLimiter` (10 req/h) atua especificamente sobre `/api/v1/auth/login` sem bloquear sessões válidas em `/api/v1/auth/me` ou `/api/v1/auth/sse-ticket`.
   - O tratador global de erros nunca expõe stack traces ou `err.message` interno em respostas `HTTP 500` de produção.
4. **Segurança do Webhook Meta WhatsApp Cloud API:**
   - O parser `express.json` captura os bytes originais em `req.rawBody` (limite `10mb`).
   - O `POST /api/v1/webhooks/whatsapp` exige `WHATSAPP_APP_SECRET` em produção (*fail-closed*, `HTTP 503` se ausente), valida assinatura HMAC-SHA256 (`x-hub-signature-256`) em tempo constante sobre `req.rawBody`, aplica proteção anti-replay (janela de 5 minutos) e descarta mensagens duplicadas por `message.id` (`ignored_duplicate`).
5. **Auditoria LGPD Imutável & Cadeia de Custódia SHA-256:**
   - Operações críticas marcadas como `AUDIT_REQUIRED` usam `AuditLogRepository.logStrict` (*fail-closed*: abortam com `HTTP 503` se a gravação imutável falhar).
   - `GET /api/v1/audit-logs` e `POST /api/v1/audit-logs/verify-integrity` respeitam estritamente o isolamento de tenant via RLS e validam matematicamente a cadeia de custódia via `AuditLogRepository.verifyChain`.
6. **Proteção contra Fraude Telefônica (Toll Fraud) & Rede:**
   - Rotas de saída mantêm bloqueio padrão para destinos DDI caros e prefixos 0900, combinados com Fail2ban e UFW.
   - Instaladores (`deploy.sh` e `install-enlace-pbx.sh`) nunca sobrescrevem `.env` sem backup com timestamp (`.env.backup.*`), nunca aplicam `make samples` sobre `/etc/asterisk/asterisk.conf` existente e nunca mascaram falhas críticas de inicialização do Asterisk (`|| true` proibido).

---

## 🎨 Padrão Visual e Identidade da Marca
- **Identidade Oficial:** A marca utiliza o **Polvo Tecnológico com Headset e Circuito Neural de IA** (`public/logo.png`, `public/logo.svg`, `public/logo-icon.png`, `public/logo-icon.svg`).
- **Estilo Enterprise / NOC:** Layout de alta densidade de informação com contraste equilibrado, bordas arredondadas moderadas (`rounded-xl` ou `rounded-2xl`), sombras sutis (`shadow-sm`, `shadow-md`).
- **Fontes:** Tipografia legível para interface geral e fontes monoespaçadas (`font-mono`) obrigatórias para dados técnicos: endereços IP, portas, codecs, latência em ms, Caller IDs e comandos de terminal.
- **Sem "AI Slop":** Proibidos degradês genéricos roxo-azul sem função, sombras brilhantes arbitrárias e caixas de texto com rótulos genéricos.
- **Exportações/Downloads no Navegador:** Nunca usar `window.open` para endpoints autenticados; utilizar `fetch` com `getAuthHeaders()` e download via `Blob`.

---

## 🚀 Ciclo de Desenvolvimento e Validação Obrigatória Pré-Produção
Antes de considerar qualquer alteração pronta para deploy em produção, execute e valide todos os itens abaixo:
1. **Nunca simular dados se uma rota real existir ou puder ser mantida.** Preserve contratos de API, integridade do BFF Express e compatibilidade com instalações existentes.
2. **Tipagem TypeScript (`npm run lint`):** Deve passar com **0 erros** (`tsc --noEmit`).
3. **Suíte Automatizada de Segurança & Regressão (`npm test`):** Todos os casos de teste (`scripts/test-suite.ts`, 76 casos atualmente) devem passar com **0 falhas**.
4. **Compilação de Produção (`npm run build`):** Deve gerar sem erros o cliente em `dist/` (`vite build`) e o servidor único em `dist/server.cjs` (`esbuild`).
5. **Sintaxe dos Instaladores Linux:** `bash -n deploy.sh && bash -n install-enlace-pbx.sh` deve retornar código `0`.
6. **Auditoria de Dependências:** Verificar `npm audit --omit=dev` e manter zero vulnerabilidades críticas ou altas em runtime.
7. **Respeite o propósito do usuário:** Execute sempre com máxima qualidade técnica, segurança por padrão e preservação da estabilidade operacional.

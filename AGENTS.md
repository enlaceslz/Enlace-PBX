# AI Agent Instructions for Enlace PBX

You are assisting with **Enlace PBX**, an Enterprise-grade telephony, CRM, and AI application built with React, Vite, Tailwind CSS, Express, and Asterisk 20. 

## Project Architecture & Tech Stack
- **Frontend:** React 19, Tailwind CSS v4, Lucide-React icons, Recharts, Motion (Framer Motion).
- **Backend:** Node.js (Express), served as a BFF (Backend-for-Frontend).
- **Communication:** WebSockets (EventSource for React), REST APIs.
- **Language:** Brazilian Portuguese (pt-BR).

## Security Strictness
- **Authentication:** We use JWT (JSON Web Tokens). The frontend interceptor injects `Authorization: Bearer <token>` into API calls.
- **Defense-in-Depth:** The Express backend uses `Helmet` for HTTP Headers, `CORS` restrictions, and `express-rate-limit` (brute-force protection).
- **Secrets Management:** Secrets (Gemini API keys, Meta Webhook tokens, database passwords) live ONLY on the backend. Never expose these to the React frontend. Do NOT mock these in the frontend.

## Visual Aesthetic (Enterprise)
- High-contrast, premium, dark/light theme balanced.
- Monospace fonts (`font-mono`) for technical data (IPs, latency, logs).
- Rounded borders (Enterprise SIEM style), subtle shadows (`shadow-sm`, `shadow-lg`).
- Use `lucide-react` for all icons.
- No "AI slop" or generic gradients without purpose. Clean, data-dense layouts.

## Key Directives for Future Edits
1. **Never mock data unless strictly requested.** The application has evolved to use real backend Express routes and JWT auth. Maintain this integrity.
2. **Respect the BFF architecture.** All API calls to Gemini or WhatsApp MUST go through the Express backend, never directly from the React frontend.
3. **Always ensure `npm run build` passes.** Our build process uses `esbuild` for the backend (`dist/server.cjs`) and `vite build` for the frontend.
4. **Webphone & Omnichannel Hub Integration.** The Webphone modal (`WebphoneModal.tsx`) contains both the SIP/WebRTC softphone and an expanding right-side panel for Omnichannel (WhatsApp/Webchat) conversations. State is managed locally.
5. **No direct 3rd-party API calls from Frontend.** The React frontend must always use the local Express BFF endpoints (e.g., `/api/v1/omnichannel`).


6. **BFF Single Fetch Hydration.** Avoid parallel fetch storms in the frontend (e.g., `Promise.all` with dozens of endpoints). Always use the `/api/v1/init` endpoint for initial SPA state hydration to prevent "Failed to fetch" browser connection limits.
7. **Disaster Recovery / Backups.** The system supports automated S3/FTP external backups. Any changes to the Backup & Restore module must respect the JSON snapshot format and the external cloud synchronization workflows.

8. **Deploy & Open Source (GitHub):** O sistema Enlace PBX deve ser disponibilizado publicamente no GitHub como um projeto Open Source. 
   - A documentação (Módulo Ajuda, README) deve instruir os administradores de como realizar o deploy via script em VPS/Linux.
   - O projeto possui um botão "Atualizar Sistema" (`/api/v1/system/update`) no painel (InfraSettingsView) para facilitar a atualização via Over-The-Air (OTA) em produção puxando os novos commits do repositório remoto (e.g. `git pull origin main`, seguido pelo processo de build).
   - Mantenha o projeto referenciado como "Enlace PBX OSS" nos manuais.

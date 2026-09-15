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

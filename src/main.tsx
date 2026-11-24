import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installAuthFetchInterceptor } from './utils/api';

// Ativa injeção automática do JWT Bearer em chamadas same-origin (/api/v1/*)
installAuthFetchInterceptor();

// Aplica o tema salvo antecipadamente
if (localStorage.getItem('enlace_theme') === 'dark') {
  document.documentElement.classList.add('dark-noc');
}

// Registro do Service Worker (PWA) via módulo ES (sem script inline no index.html para CSP estrita)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[PWA] ServiceWorker não registrado:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

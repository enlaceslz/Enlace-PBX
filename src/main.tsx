import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Apply saved theme early
if (localStorage.getItem('enlace_theme') === 'dark') {
  document.documentElement.classList.add('dark-noc');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

// Ensure public directory exists
const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Horizontal Main Logo: ENLACE-PBX Telecom & AI (800 x 200)
const horizontalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200" width="800" height="200">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="45%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#1e40af" />
    </linearGradient>
    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
    <linearGradient id="accentGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0" />
    </linearGradient>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#1d4ed8" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Modern Icon Badge (140x140) -->
  <g transform="translate(30, 30)">
    <!-- Badge Background -->
    <rect x="0" y="0" width="140" height="140" rx="34" fill="url(#bgGrad)" filter="url(#cardShadow)" />
    
    <!-- Outer decorative link rings (Enlace / Interconnection) -->
    <circle cx="70" cy="70" r="52" fill="none" stroke="url(#cyanGrad)" stroke-width="2.5" stroke-dasharray="8 6" opacity="0.6" />

    <!-- Waveform & Optical Loop Arc Left -->
    <path d="M 44,70 A 26,26 0 0,1 70,44" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" />
    <path d="M 34,70 A 36,36 0 0,1 70,34" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" opacity="0.8" />
    
    <!-- Waveform Arc Right -->
    <path d="M 96,70 A 26,26 0 0,1 70,96" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" />
    <path d="M 106,70 A 36,36 0 0,1 70,106" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" opacity="0.8" />
    
    <!-- Connecting Fiber / Link Bridge -->
    <path d="M 50,70 L 90,70" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" />

    <!-- Central AI Core Node -->
    <circle cx="70" cy="70" r="16" fill="#ffffff" />
    <circle cx="70" cy="70" r="8" fill="#2563eb" />
    <circle cx="70" cy="70" r="3.5" fill="#38bdf8" />
  </g>

  <!-- Typography: ENLACE-PBX -->
  <text x="198" y="105" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="70" fill="#0f172a" letter-spacing="-1.5">
    ENLACE<tspan fill="#2563eb">-PBX</tspan>
  </text>

  <!-- Subtitle: TELECOM & AI VOICE PLATFORM -->
  <text x="202" y="146" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="17" fill="#64748b" letter-spacing="3.8">
    TELECOM &amp; INTELLIGENCE
  </text>

  <!-- Micro badge: ASTERISK 20 LTS -->
  <g transform="translate(540, 127)">
    <rect x="0" y="0" width="146" height="24" rx="12" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1.2" />
    <circle cx="12" cy="12" r="3.5" fill="#2563eb" />
    <text x="22" y="16" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="10.5" fill="#1d4ed8" letter-spacing="1">
      ASTERISK 20
    </text>
  </g>
</svg>`;

// 2. Square Emblem / App Icon (512 x 512)
const squareSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="sqBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="40%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#1e3a8a" />
    </linearGradient>
    <linearGradient id="sqCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
    <filter id="sqShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#1e3a8a" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Squircle Base -->
  <rect x="36" y="36" width="440" height="440" rx="115" fill="url(#sqBgGrad)" filter="url(#sqShadow)" />

  <!-- Outer Orbit Link Rings -->
  <circle cx="256" cy="256" r="168" fill="none" stroke="url(#sqCyan)" stroke-width="7" stroke-dasharray="24 18" opacity="0.6" />
  <circle cx="256" cy="256" r="198" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="10 14" opacity="0.25" />

  <!-- Telecom Soundwaves & Link Arcs -->
  <!-- Left Side -->
  <path d="M 170,256 A 86,86 0 0,1 256,170" fill="none" stroke="#ffffff" stroke-width="24" stroke-linecap="round" />
  <path d="M 136,256 A 120,120 0 0,1 256,136" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round" opacity="0.8" />
  <path d="M 104,256 A 152,152 0 0,1 256,104" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity="0.5" />

  <!-- Right Side -->
  <path d="M 342,256 A 86,86 0 0,1 256,342" fill="none" stroke="#ffffff" stroke-width="24" stroke-linecap="round" />
  <path d="M 376,256 A 120,120 0 0,1 256,376" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round" opacity="0.8" />
  <path d="M 408,256 A 152,152 0 0,1 256,408" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity="0.5" />

  <!-- Fiber Center Link Beam -->
  <path d="M 190,256 L 322,256" stroke="url(#sqCyan)" stroke-width="16" stroke-linecap="round" />

  <!-- Central Intelligence AI Node -->
  <circle cx="256" cy="256" r="54" fill="#ffffff" filter="url(#sqShadow)" />
  <circle cx="256" cy="256" r="28" fill="#2563eb" />
  <circle cx="256" cy="256" r="11" fill="#38bdf8" />
</svg>`;

// 3. Enlace Telecom Brand Official Logo (800 x 200)
const enlaceTelecomSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200" width="800" height="200">
  <defs>
    <linearGradient id="brandBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="50%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
    <linearGradient id="brandCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
    <filter id="glowFilt" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#1d4ed8" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- Emblem Badge -->
  <g transform="translate(30, 30)">
    <rect x="0" y="0" width="140" height="140" rx="34" fill="url(#brandBg)" filter="url(#glowFilt)" />
    
    <circle cx="70" cy="70" r="52" fill="none" stroke="url(#brandCyan)" stroke-width="2.5" stroke-dasharray="8 6" opacity="0.6" />

    <path d="M 44,70 A 26,26 0 0,1 70,44" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" />
    <path d="M 34,70 A 36,36 0 0,1 70,34" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" opacity="0.8" />
    
    <path d="M 96,70 A 26,26 0 0,1 70,96" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" />
    <path d="M 106,70 A 36,36 0 0,1 70,106" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" opacity="0.8" />
    
    <path d="M 50,70 L 90,70" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" />

    <circle cx="70" cy="70" r="16" fill="#ffffff" />
    <circle cx="70" cy="70" r="8" fill="#2563eb" />
  </g>

  <!-- Typography: Enlace Telecom -->
  <text x="198" y="105" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="68" fill="#0f172a" letter-spacing="-1">
    Enlace<tspan fill="#2563eb"> Telecom</tspan>
  </text>
  <text x="202" y="146" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="16" fill="#64748b" letter-spacing="4">
    TELEFONIA IP &amp; FIBRA ÓPTICA
  </text>
</svg>`;

async function buildLogos() {
  console.log('Generating vector SVGs...');
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), horizontalSvg, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'logo-enlace.svg'), enlaceTelecomSvg, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'logo-icon.svg'), squareSvg, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), squareSvg, 'utf8');

  console.log('Rendering high-resolution PNGs...');
  
  // Render horizontal logo to PNG (logo.png)
  const resvgH = new Resvg(horizontalSvg, { fitTo: { mode: 'width', value: 800 } });
  const pngH = resvgH.render().asPng();
  fs.writeFileSync(path.join(publicDir, 'logo.png'), pngH);
  console.log('Wrote public/logo.png:', pngH.length, 'bytes');

  // Render enlace telecom logo to PNG (logo-enlace.png)
  const resvgE = new Resvg(enlaceTelecomSvg, { fitTo: { mode: 'width', value: 800 } });
  const pngE = resvgE.render().asPng();
  fs.writeFileSync(path.join(publicDir, 'logo-enlace.png'), pngE);
  console.log('Wrote public/logo-enlace.png:', pngE.length, 'bytes');

  // Render square icon to PNG (logo-icon.png)
  const resvgSq = new Resvg(squareSvg, { fitTo: { mode: 'width', value: 512 } });
  const pngSq = resvgSq.render().asPng();
  fs.writeFileSync(path.join(publicDir, 'logo-icon.png'), pngSq);
  console.log('Wrote public/logo-icon.png:', pngSq.length, 'bytes');

  // Copy to dist if dist exists
  const distDir = path.resolve('dist');
  if (fs.existsSync(distDir)) {
    ['logo.svg', 'logo-enlace.svg', 'logo-icon.svg', 'favicon.svg', 'logo.png', 'logo-enlace.png', 'logo-icon.png'].forEach(file => {
      fs.copyFileSync(path.join(publicDir, file), path.join(distDir, file));
    });
    console.log('Synchronized logo assets to dist/');
  }

  console.log('All logo assets successfully generated!');
}

buildLogos().catch(console.error);

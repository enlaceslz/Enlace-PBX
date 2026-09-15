import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const publicDir = path.resolve('public');
const distDir = path.resolve('dist');

// Helper to create the Octopus Mascot SVG group
function getOctopusMascotSvg(cx = 250, cy = 230, scale = 1) {
  return `
  <!-- Octopus Mascot Group centered at (${cx}, ${cy}) with scale ${scale} -->
  <g transform="translate(${cx}, ${cy}) scale(${scale}) translate(-250, -230)">
    <!-- Definitions for Octopus -->
    <defs>
      <!-- Octopus Body Gradient -->
      <radialGradient id="octoSkin" cx="40%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="25%" stop-color="#0284c7" />
        <stop offset="65%" stop-color="#0369a1" />
        <stop offset="100%" stop-color="#075985" />
      </radialGradient>

      <!-- Tentacle Darker Gradient -->
      <linearGradient id="tentacleDark" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0284c7" />
        <stop offset="70%" stop-color="#0369a1" />
        <stop offset="100%" stop-color="#0c4a6e" />
      </linearGradient>

      <!-- Headset Metallic Band -->
      <linearGradient id="headsetBand" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#475569" />
        <stop offset="50%" stop-color="#1e293b" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>

      <!-- Headset Cup Gradient -->
      <radialGradient id="headsetCup" cx="40%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="35%" stop-color="#0284c7" />
        <stop offset="70%" stop-color="#1e293b" />
        <stop offset="100%" stop-color="#0f172a" />
      </radialGradient>

      <!-- Suction Cup Gradient -->
      <radialGradient id="suctionGrad" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#bae6fd" />
        <stop offset="50%" stop-color="#7dd3fc" />
        <stop offset="85%" stop-color="#38bdf8" />
        <stop offset="100%" stop-color="#0284c7" />
      </radialGradient>

      <!-- IA Forehead Glow -->
      <filter id="iaGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#38bdf8" flood-opacity="0.8" />
      </filter>

      <!-- Eyes Gloss Gradient -->
      <linearGradient id="eyePupil" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="70%" stop-color="#020617" />
        <stop offset="100%" stop-color="#000000" />
      </linearGradient>

      <linearGradient id="eyeIris" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="60%" stop-color="#0284c7" />
        <stop offset="100%" stop-color="#0369a1" />
      </linearGradient>
    </defs>

    <!-- BACK TENTACLES (Layer 1 - Behind head & frame) -->
    <!-- Far Left Upper Tentacle -->
    <path d="M 160,250 C 90,240 40,190 50,130 C 58,80 110,85 130,120 C 145,150 140,200 175,235 Z" fill="url(#tentacleDark)" />
    <!-- Far Left Suction Cups -->
    <circle cx="65" cy="115" r="9" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="65" cy="115" r="4.5" fill="#0284c7" opacity="0.6" />
    <circle cx="55" cy="145" r="11" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="55" cy="145" r="5.5" fill="#0284c7" opacity="0.6" />
    <circle cx="65" cy="180" r="12" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="65" cy="180" r="6" fill="#0284c7" opacity="0.6" />
    <circle cx="85" cy="215" r="13" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="85" cy="215" r="6.5" fill="#0284c7" opacity="0.6" />

    <!-- Far Right Upper Tentacle -->
    <path d="M 340,250 C 410,240 460,190 450,130 C 442,80 390,85 370,120 C 355,150 360,200 325,235 Z" fill="url(#tentacleDark)" />
    <!-- Far Right Suction Cups -->
    <circle cx="435" cy="115" r="9" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="435" cy="115" r="4.5" fill="#0284c7" opacity="0.6" />
    <circle cx="445" cy="145" r="11" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="445" cy="145" r="5.5" fill="#0284c7" opacity="0.6" />
    <circle cx="435" cy="180" r="12" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="435" cy="180" r="6" fill="#0284c7" opacity="0.6" />
    <circle cx="415" cy="215" r="13" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="415" cy="215" r="6.5" fill="#0284c7" opacity="0.6" />

    <!-- Mid Left Upper Tentacle -->
    <path d="M 175,270 C 110,285 45,260 30,210 C 15,160 65,145 95,180 C 120,210 135,235 185,255 Z" fill="url(#octoSkin)" />
    <!-- Mid Left Suction Cups -->
    <circle cx="45" cy="180" r="11" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="45" cy="180" r="5" fill="#0284c7" opacity="0.6" />
    <circle cx="55" cy="220" r="12" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="55" cy="220" r="5.5" fill="#0284c7" opacity="0.6" />
    <circle cx="80" cy="255" r="13" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="80" cy="255" r="6" fill="#0284c7" opacity="0.6" />

    <!-- Mid Right Upper Tentacle -->
    <path d="M 325,270 C 390,285 455,260 470,210 C 485,160 435,145 405,180 C 380,210 365,235 315,255 Z" fill="url(#octoSkin)" />
    <!-- Mid Right Suction Cups -->
    <circle cx="455" cy="180" r="11" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="455" cy="180" r="5" fill="#0284c7" opacity="0.6" />
    <circle cx="445" cy="220" r="12" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="445" cy="220" r="5.5" fill="#0284c7" opacity="0.6" />
    <circle cx="420" cy="255" r="13" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="420" cy="255" r="6" fill="#0284c7" opacity="0.6" />

    <!-- LOWER TENTACLES (Curling downwards) -->
    <!-- Lower Left Outer -->
    <path d="M 190,300 C 130,340 70,330 45,290 C 25,250 65,240 100,265 C 135,290 160,290 205,285 Z" fill="url(#octoSkin)" />
    <circle cx="65" cy="275" r="10" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="95" cy="295" r="11" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="130" cy="315" r="12" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />

    <!-- Lower Right Outer -->
    <path d="M 310,300 C 370,340 430,330 455,290 C 475,250 435,240 400,265 C 365,290 340,290 295,285 Z" fill="url(#octoSkin)" />
    <circle cx="435" cy="275" r="10" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="405" cy="295" r="11" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="370" cy="315" r="12" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />

    <!-- Lower Center Left -->
    <path d="M 215,310 C 175,370 120,380 90,340 C 70,310 110,295 145,315 C 180,335 195,305 225,295 Z" fill="url(#octoSkin)" />
    <circle cx="115" cy="345" r="10" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="150" cy="355" r="11" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="185" cy="345" r="11" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />

    <!-- Lower Center Right -->
    <path d="M 285,310 C 325,370 380,380 410,340 C 430,310 390,295 355,315 C 320,335 305,305 275,295 Z" fill="url(#octoSkin)" />
    <circle cx="385" cy="345" r="10" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="350" cy="355" r="11" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />
    <circle cx="315" cy="345" r="11" fill="url(#suctionGrad)" stroke="#0284c7" stroke-width="1.5" />

    <!-- MAIN OCTOPUS HEAD (Large bulbous dome) -->
    <path d="M 160,240 C 145,170 180,85 250,85 C 320,85 355,170 340,240 C 330,295 305,315 250,315 C 195,315 170,295 160,240 Z" fill="url(#octoSkin)" />

    <!-- Head 3D Specular Highlight / Soft Glow -->
    <ellipse cx="250" cy="120" rx="55" ry="25" fill="#bae6fd" opacity="0.35" />
    <circle cx="215" cy="115" r="14" fill="#ffffff" opacity="0.3" />

    <!-- Freckles/Spots on Upper Right Head -->
    <circle cx="295" cy="130" r="5" fill="#0369a1" opacity="0.4" />
    <circle cx="310" cy="142" r="3.5" fill="#0369a1" opacity="0.4" />
    <circle cx="288" cy="148" r="4" fill="#0369a1" opacity="0.4" />
    <circle cx="305" cy="160" r="6" fill="#0369a1" opacity="0.4" />

    <!-- FOREHEAD IA GLOWING BADGE -->
    <g transform="translate(250, 142)">
      <!-- Radiating Pins (Neural AI Nodes) -->
      <line x1="0" y1="-28" x2="0" y2="-21" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
      <circle cx="0" cy="-30" r="3.5" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5" />

      <line x1="20" y1="-20" x2="15" y2="-15" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
      <circle cx="22" cy="-22" r="3.5" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5" />

      <line x1="28" y1="0" x2="21" y2="0" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
      <circle cx="30" cy="0" r="3.5" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5" />

      <line x1="20" y1="20" x2="15" y2="15" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
      <circle cx="22" cy="22" r="3.5" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5" />

      <line x1="0" y1="28" x2="0" y2="21" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
      <circle cx="0" cy="30" r="3.5" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5" />

      <line x1="-20" y1="20" x2="-15" y2="15" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
      <circle cx="-22" cy="22" r="3.5" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5" />

      <line x1="-28" y1="0" x2="-21" y2="0" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
      <circle cx="-30" cy="0" r="3.5" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5" />

      <line x1="-20" y1="-20" x2="-15" y2="-15" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
      <circle cx="-22" cy="-22" r="3.5" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5" />

      <!-- Outer glowing badge circle -->
      <circle cx="0" cy="0" r="22" fill="#ffffff" filter="url(#iaGlow)" />
      <circle cx="0" cy="0" r="18" fill="#f0f9ff" stroke="#0284c7" stroke-width="2.5" />

      <!-- IA Text -->
      <text x="0" y="7" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="19" fill="#0284c7" text-anchor="middle" letter-spacing="-0.5">
        IA
      </text>
    </g>

    <!-- HEADSET ARCH OVER HEAD -->
    <path d="M 152,190 C 145,100 200,62 250,62 C 300,62 355,100 348,190" fill="none" stroke="url(#headsetBand)" stroke-width="14" stroke-linecap="round" />
    <path d="M 158,185 C 153,108 202,70 250,70 C 298,70 347,108 342,185" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" opacity="0.7" />

    <!-- HEADSET EAR CUPS -->
    <!-- Left Cup -->
    <g transform="translate(142, 192)">
      <rect x="-14" y="-28" width="28" height="56" rx="14" fill="url(#headsetCup)" stroke="#0f172a" stroke-width="2" />
      <rect x="-10" y="-24" width="20" height="48" rx="10" fill="#0284c7" opacity="0.8" />
      <rect x="-6" y="-18" width="12" height="36" rx="6" fill="#38bdf8" opacity="0.6" />
    </g>

    <!-- Right Cup -->
    <g transform="translate(358, 192)">
      <rect x="-14" y="-28" width="28" height="56" rx="14" fill="url(#headsetCup)" stroke="#0f172a" stroke-width="2" />
      <rect x="-10" y="-24" width="20" height="48" rx="10" fill="#0284c7" opacity="0.8" />
      <rect x="-6" y="-18" width="12" height="36" rx="6" fill="#38bdf8" opacity="0.6" />
    </g>

    <!-- HEADSET MICROPHONE BOOM -->
    <!-- Curved boom wire extending from Left Cup to Mouth -->
    <path d="M 148,212 C 160,250 200,278 238,268" fill="none" stroke="#0f172a" stroke-width="5.5" stroke-linecap="round" />
    <path d="M 148,212 C 160,250 200,278 238,268" fill="none" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round" opacity="0.6" />
    <!-- Mic Capsule -->
    <rect x="234" y="258" width="22" height="15" rx="7.5" fill="#0f172a" stroke="#38bdf8" stroke-width="2" />
    <circle cx="242" cy="265.5" r="2.5" fill="#38bdf8" />
    <line x1="248" y1="261" x2="248" y2="270" stroke="#64748b" stroke-width="1.5" stroke-linecap="round" />
    <line x1="251" y1="262" x2="251" y2="269" stroke="#64748b" stroke-width="1.5" stroke-linecap="round" />

    <!-- EYEBROWS (Raised cheerfully) -->
    <path d="M 190,192 Q 208,180 224,192" fill="none" stroke="#0369a1" stroke-width="4.5" stroke-linecap="round" />
    <path d="M 276,192 Q 292,180 310,192" fill="none" stroke="#0369a1" stroke-width="4.5" stroke-linecap="round" />

    <!-- EYES (Big glossy cartoon eyes) -->
    <!-- Left Eye -->
    <g transform="translate(208, 222)">
      <!-- White Sclera -->
      <ellipse cx="0" cy="0" rx="20" ry="26" fill="#ffffff" stroke="#0369a1" stroke-width="2" />
      <!-- Blue Iris -->
      <ellipse cx="2" cy="0" rx="16" ry="22" fill="url(#eyeIris)" />
      <!-- Black Pupil -->
      <ellipse cx="2" cy="0" rx="13" ry="19" fill="url(#eyePupil)" />
      <!-- Specular Highlights -->
      <circle cx="-3" cy="-7" r="7.5" fill="#ffffff" />
      <circle cx="6" cy="7" r="3.5" fill="#ffffff" />
    </g>

    <!-- Right Eye -->
    <g transform="translate(292, 222)">
      <!-- White Sclera -->
      <ellipse cx="0" cy="0" rx="20" ry="26" fill="#ffffff" stroke="#0369a1" stroke-width="2" />
      <!-- Blue Iris -->
      <ellipse cx="-2" cy="0" rx="16" ry="22" fill="url(#eyeIris)" />
      <!-- Black Pupil -->
      <ellipse cx="-2" cy="0" rx="13" ry="19" fill="url(#eyePupil)" />
      <!-- Specular Highlights -->
      <circle cx="-7" cy="-7" r="7.5" fill="#ffffff" />
      <circle cx="2" cy="7" r="3.5" fill="#ffffff" />
    </g>

    <!-- CUTE SMILE & TONGUE -->
    <g transform="translate(250, 260)">
      <!-- Mouth cavity background -->
      <path d="M -24,-5 Q 0,-3 24,-5 Q 26,18 0,22 Q -26,18 -24,-5 Z" fill="#0f172a" />
      <!-- Mouth Outline -->
      <path d="M -26,-5 Q 0,0 26,-5" fill="none" stroke="#0369a1" stroke-width="3" stroke-linecap="round" />
      <!-- Pink Tongue -->
      <path d="M -15,10 Q 0,4 15,10 Q 10,21 0,22 Q -10,21 -15,10 Z" fill="#f43f5e" />
      <ellipse cx="0" cy="14" rx="8" ry="4" fill="#fb7185" />
    </g>
  </g>
  `;
}

// 1. HORIZONTAL OFFICIAL LOGO (1000 x 480)
// Mascot inside blue circular badge on the left + ENLACE -PBX- on the right
function generateHorizontalLogoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 480" width="1000" height="480">
  <defs>
    <!-- Outer Ring Gradient -->
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00a0ff" />
      <stop offset="50%" stop-color="#0066ff" />
      <stop offset="100%" stop-color="#0044cc" />
    </linearGradient>

    <!-- Typo Blue Gradient -->
    <linearGradient id="typoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0099ff" />
      <stop offset="60%" stop-color="#0062ff" />
      <stop offset="100%" stop-color="#0048d6" />
    </linearGradient>

    <!-- Cyan Accent for A Delta -->
    <linearGradient id="cyanDelta" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#00d8ff" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>

    <!-- Drop Shadow Filter for Mascot Circle -->
    <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#0055ff" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Left: Mascot Badge (Center at 240, 240, radius 195) -->
  <g filter="url(#badgeShadow)">
    <!-- White Base Disc -->
    <circle cx="240" cy="240" r="195" fill="#ffffff" />
    <!-- Outer Blue Circular Border -->
    <circle cx="240" cy="240" r="195" fill="none" stroke="url(#ringGrad)" stroke-width="18" />
  </g>

  <!-- Mascot Inside Badge -->
  ${getOctopusMascotSvg(240, 240, 0.95)}

  <!-- Right: Official Typography "ENLACE -PBX-" -->
  <g transform="translate(480, 235)">
    <!-- ENLACE -->
    <!-- Custom geometric lettering matching the original logo -->
    <g transform="translate(0, -10)">
      <!-- E -->
      <path d="M 0,-60 L 52,-60 C 58,-60 62,-56 62,-50 C 62,-44 58,-40 52,-40 L 22,-40 L 22,-14 L 46,-14 C 52,-14 56,-10 56,-4 C 56,2 52,6 46,6 L 22,6 L 22,34 L 54,34 C 60,34 64,38 64,44 C 64,50 60,54 54,54 L 0,54 Z" fill="url(#typoGrad)" />

      <!-- N -->
      <path d="M 80,-60 L 102,-60 L 138,12 L 138,-50 C 138,-56 142,-60 148,-60 C 154,-60 158,-56 158,-50 L 158,54 L 136,54 L 100,-18 L 100,44 C 100,50 96,54 90,54 C 84,54 80,50 80,44 Z" fill="url(#typoGrad)" />

      <!-- L -->
      <path d="M 178,-50 C 178,-56 182,-60 188,-60 C 194,-60 198,-56 198,-50 L 198,34 L 234,34 C 240,34 244,38 244,44 C 244,50 240,54 234,54 L 178,54 Z" fill="url(#typoGrad)" />

      <!-- A (With custom solid Cyan Arrow/Triangle in center) -->
      <path d="M 276,54 L 306,-54 C 308,-58 312,-60 316,-60 C 320,-60 324,-58 326,-54 L 356,54 L 334,54 L 327,24 L 305,24 L 298,54 Z" fill="url(#typoGrad)" />
      <!-- Solid Cyan Triangle Delta in A -->
      <polygon points="316,-12 327,14 305,14" fill="url(#cyanDelta)" />

      <!-- C -->
      <path d="M 426,-36 C 422,-48 408,-60 388,-60 C 362,-60 342,-40 342,-3 C 342,34 362,54 388,54 C 408,54 422,42 426,30 C 428,24 424,18 418,18 C 412,18 408,22 406,26 C 402,32 396,36 388,36 C 374,36 364,22 364,-3 C 364,-28 374,-42 388,-42 C 396,-42 402,-38 406,-32 C 408,-28 412,-24 418,-24 C 424,-24 428,-30 426,-36 Z" fill="url(#typoGrad)" />

      <!-- E -->
      <path d="M 444,-60 L 496,-60 C 502,-60 506,-56 506,-50 C 506,-44 502,-40 496,-40 L 466,-40 L 466,-14 L 490,-14 C 496,-14 500,-10 500,-4 C 500,2 496,6 490,6 L 466,6 L 466,34 L 498,34 C 504,34 508,38 508,44 C 508,50 504,54 498,54 L 444,54 Z" fill="url(#typoGrad)" />
    </g>

    <!-- - PBX - -->
    <g transform="translate(75, 100)">
      <!-- Left Dash -->
      <rect x="0" y="-8" width="46" height="16" rx="8" fill="url(#typoGrad)" />

      <!-- P -->
      <g transform="translate(68, 0)">
        <path d="M 0,-36 L 28,-36 C 42,-36 52,-26 52,-12 C 52,2 42,12 28,12 L 18,12 L 18,30 C 18,34 14,38 10,38 C 6,38 0,34 0,30 Z M 18,-4 L 28,-4 C 34,-4 38,-8 38,-12 C 38,-16 34,-20 28,-20 L 18,-20 Z" fill="url(#typoGrad)" />
      </g>

      <!-- B -->
      <g transform="translate(142, 0)">
        <path d="M 0,-36 L 26,-36 C 38,-36 46,-28 46,-18 C 46,-10 42,-4 34,-2 C 44,0 50,7 50,16 C 50,27 40,36 28,36 L 0,36 Z M 18,-8 L 25,-8 C 30,-8 33,-12 33,-17 C 33,-22 30,-24 25,-24 L 18,-24 Z M 18,22 L 26,22 C 32,22 35,18 35,14 C 35,9 32,6 26,6 L 18,6 Z" fill="url(#typoGrad)" />
      </g>

      <!-- X -->
      <g transform="translate(216, 0)">
        <path d="M 4,-34 C 8,-38 14,-38 18,-34 L 32,-14 L 46,-34 C 50,-38 56,-38 60,-34 C 64,-30 64,-24 60,-20 L 44,0 L 60,20 C 64,24 64,30 60,34 C 56,38 50,38 46,34 L 32,14 L 18,34 C 14,38 8,38 4,34 C 0,30 0,24 4,20 L 20,0 L 4,-20 C 0,-24 0,-30 4,-34 Z" fill="url(#typoGrad)" />
      </g>

      <!-- Right Dash -->
      <rect x="296" y="-8" width="46" height="16" rx="8" fill="url(#typoGrad)" />
    </g>
  </g>
</svg>`;
}

// 2. CIRCULAR EMBLEM LOGO (512 x 512, 1:1)
// Mascot on top + ENLACE -PBX- inside the circle at the bottom
function generateCircularLogoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="circRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00a0ff" />
      <stop offset="50%" stop-color="#0066ff" />
      <stop offset="100%" stop-color="#0044cc" />
    </linearGradient>

    <linearGradient id="circTypoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0099ff" />
      <stop offset="60%" stop-color="#0062ff" />
      <stop offset="100%" stop-color="#0048d6" />
    </linearGradient>

    <linearGradient id="circCyanDelta" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#00d8ff" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>

    <filter id="circShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#0055ff" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- Circular Base Badge -->
  <circle cx="256" cy="256" r="240" fill="#ffffff" filter="url(#circShadow)" />
  <circle cx="256" cy="256" r="240" fill="none" stroke="url(#circRingGrad)" stroke-width="22" />

  <!-- Mascot at Center Top -->
  ${getOctopusMascotSvg(256, 215, 0.88)}

  <!-- Typography at Bottom Inside Circle -->
  <g transform="translate(256, 395)">
    <!-- ENLACE -->
    <g transform="translate(-142, -10) scale(0.56)">
      <!-- E -->
      <path d="M 0,-60 L 52,-60 C 58,-60 62,-56 62,-50 C 62,-44 58,-40 52,-40 L 22,-40 L 22,-14 L 46,-14 C 52,-14 56,-10 56,-4 C 56,2 52,6 46,6 L 22,6 L 22,34 L 54,34 C 60,34 64,38 64,44 C 64,50 60,54 54,54 L 0,54 Z" fill="url(#circTypoGrad)" />

      <!-- N -->
      <path d="M 80,-60 L 102,-60 L 138,12 L 138,-50 C 138,-56 142,-60 148,-60 C 154,-60 158,-56 158,-50 L 158,54 L 136,54 L 100,-18 L 100,44 C 100,50 96,54 90,54 C 84,54 80,50 80,44 Z" fill="url(#circTypoGrad)" />

      <!-- L -->
      <path d="M 178,-50 C 178,-56 182,-60 188,-60 C 194,-60 198,-56 198,-50 L 198,34 L 234,34 C 240,34 244,38 244,44 C 244,50 240,54 234,54 L 178,54 Z" fill="url(#circTypoGrad)" />

      <!-- A -->
      <path d="M 276,54 L 306,-54 C 308,-58 312,-60 316,-60 C 320,-60 324,-58 326,-54 L 356,54 L 334,54 L 327,24 L 305,24 L 298,54 Z" fill="url(#circTypoGrad)" />
      <polygon points="316,-12 327,14 305,14" fill="url(#circCyanDelta)" />

      <!-- C -->
      <path d="M 426,-36 C 422,-48 408,-60 388,-60 C 362,-60 342,-40 342,-3 C 342,34 362,54 388,54 C 408,54 422,42 426,30 C 428,24 424,18 418,18 C 412,18 408,22 406,26 C 402,32 396,36 388,36 C 374,36 364,22 364,-3 C 364,-28 374,-42 388,-42 C 396,-42 402,-38 406,-32 C 408,-28 412,-24 418,-24 C 424,-24 428,-30 426,-36 Z" fill="url(#circTypoGrad)" />

      <!-- E -->
      <path d="M 444,-60 L 496,-60 C 502,-60 506,-56 506,-50 C 506,-44 502,-40 496,-40 L 466,-40 L 466,-14 L 490,-14 C 496,-14 500,-10 500,-4 C 500,2 496,6 490,6 L 466,6 L 466,34 L 498,34 C 504,34 508,38 508,44 C 508,50 504,54 498,54 L 444,54 Z" fill="url(#circTypoGrad)" />
    </g>

    <!-- - PBX - -->
    <g transform="translate(-104, 38) scale(0.6)">
      <!-- Left Dash -->
      <rect x="0" y="-8" width="46" height="16" rx="8" fill="url(#circTypoGrad)" />

      <!-- P -->
      <g transform="translate(68, 0)">
        <path d="M 0,-36 L 28,-36 C 42,-36 52,-26 52,-12 C 52,2 42,12 28,12 L 18,12 L 18,30 C 18,34 14,38 10,38 C 6,38 0,34 0,30 Z M 18,-4 L 28,-4 C 34,-4 38,-8 38,-12 C 38,-16 34,-20 28,-20 L 18,-20 Z" fill="url(#circTypoGrad)" />
      </g>

      <!-- B -->
      <g transform="translate(142, 0)">
        <path d="M 0,-36 L 26,-36 C 38,-36 46,-28 46,-18 C 46,-10 42,-4 34,-2 C 44,0 50,7 50,16 C 50,27 40,36 28,36 L 0,36 Z M 18,-8 L 25,-8 C 30,-8 33,-12 33,-17 C 33,-22 30,-24 25,-24 L 18,-24 Z M 18,22 L 26,22 C 32,22 35,18 35,14 C 35,9 32,6 26,6 L 18,6 Z" fill="url(#circTypoGrad)" />
      </g>

      <!-- X -->
      <g transform="translate(216, 0)">
        <path d="M 4,-34 C 8,-38 14,-38 18,-34 L 32,-14 L 46,-34 C 50,-38 56,-38 60,-34 C 64,-30 64,-24 60,-20 L 44,0 L 60,20 C 64,24 64,30 60,34 C 56,38 50,38 46,34 L 32,14 L 18,34 C 14,38 8,38 4,34 C 0,30 0,24 4,20 L 20,0 L 4,-20 C 0,-24 0,-30 4,-34 Z" fill="url(#circTypoGrad)" />
      </g>

      <!-- Right Dash -->
      <rect x="296" y="-8" width="46" height="16" rx="8" fill="url(#circTypoGrad)" />
    </g>
  </g>
</svg>`;
}

async function renderAndSaveAssets() {
  console.log('Generating Enlace-PBX Octopus Mascot Vectors (SVG)...');

  const horizontalSvg = generateHorizontalLogoSvg();
  const circularSvg = generateCircularLogoSvg();

  // Save SVGs in public
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), horizontalSvg, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'logo-enlace.svg'), horizontalSvg, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'logo-icon.svg'), circularSvg, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), circularSvg, 'utf8');

  console.log('Rendering High-Resolution PNGs with Resvg...');

  // 1. logo.png (Horizontal banner: 1000 x 480)
  const resvgH = new Resvg(horizontalSvg, { fitTo: { mode: 'width', value: 1000 } });
  const pngH = resvgH.render().asPng();
  fs.writeFileSync(path.join(publicDir, 'logo.png'), pngH);
  console.log('Generated public/logo.png:', pngH.length, 'bytes');

  // 2. logo-enlace.png
  fs.writeFileSync(path.join(publicDir, 'logo-enlace.png'), pngH);

  // 3. logo-icon.png (Square / Circular emblem: 512 x 512)
  const resvgSq = new Resvg(circularSvg, { fitTo: { mode: 'width', value: 512 } });
  const pngSq = resvgSq.render().asPng();
  fs.writeFileSync(path.join(publicDir, 'logo-icon.png'), pngSq);
  console.log('Generated public/logo-icon.png:', pngSq.length, 'bytes');

  // Sync to dist folder if it exists
  if (fs.existsSync(distDir)) {
    ['logo.svg', 'logo-enlace.svg', 'logo-icon.svg', 'favicon.svg', 'logo.png', 'logo-enlace.png', 'logo-icon.png'].forEach(f => {
      fs.copyFileSync(path.join(publicDir, f), path.join(distDir, f));
    });
    console.log('Synchronized new assets to dist/');
  }

  console.log('🎉 Enlace-PBX Mascot Logo Assets Successfully Installed & Set as Default!');
}

renderAndSaveAssets().catch(console.error);

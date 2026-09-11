import fs from 'fs';

const colors = {
  slate: ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a', '#020617'],
  blue: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'],
  emerald: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'],
  rose: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337', '#4c0519'],
  amber: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03'],
  purple: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87', '#3b0764'],
  indigo: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81', '#1e1b4b'],
  red: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a'],
  green: ['#f0fdf4', '#dcfce3', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'],
  cyan: ['#ecfeff', '#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63', '#083344'],
  orange: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12', '#431407'],
  sky: ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e', '#082f49'],
  teal: ['#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a', '#042f2e'],
};

const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

let css = `
@import "tailwindcss";

@layer utilities {
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: theme('colors.slate.200');
    border-radius: 20px;
  }
  .custom-scrollbar:hover::-webkit-scrollbar-thumb {
    background-color: theme('colors.slate.300');
  }
}

/* 
 * NOC Dark Mode implementation using Tailwind v4 CSS Variables 
 * Symmetrical color inversion for mathematically perfect dark mode
 */
html.dark-noc {
  background-color: #020617; /* slate-950 */
  color: #f8fafc; /* slate-50 */
  color-scheme: dark;

  /* Surfaces */
  --color-white: #0f172a; /* slate-900 */
  --color-black: #ffffff;
`;

for (const [colorName, colorHexes] of Object.entries(colors)) {
  css += `\n  /* ${colorName.charAt(0).toUpperCase() + colorName.slice(1)} */\n`;
  for (let i = 0; i < shades.length; i++) {
    const originalShade = shades[i];
    const invertedHex = colorHexes[shades.length - 1 - i];
    css += `  --color-${colorName}-${originalShade}: ${invertedHex};\n`;
  }
}

css += `
  /* Shadows for Dark Mode */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.5);
  --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px -1px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5);
}
`;

fs.writeFileSync('src/index.css', css);
console.log('index.css updated with full symmetrical inversion.');

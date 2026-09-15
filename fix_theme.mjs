import fs from 'fs';

const indexCss = `
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
 * This provides a mathematically perfect dark theme without filter inversion artifacts.
 */
html.dark-noc {
  background-color: #020617; /* slate-950 */
  color: #f8fafc; /* slate-50 */
  color-scheme: dark;

  /* Surfaces */
  --color-white: #0f172a; /* slate-900 */
  --color-black: #ffffff;
  
  /* Slate (Inverted for dark mode) */
  --color-slate-50: #020617;
  --color-slate-100: #0f172a;
  --color-slate-200: #1e293b;
  --color-slate-300: #334155;
  --color-slate-400: #475569;
  --color-slate-500: #64748b;
  --color-slate-600: #94a3b8;
  --color-slate-700: #cbd5e1;
  --color-slate-800: #e2e8f0;
  --color-slate-900: #f1f5f9;
  --color-slate-950: #f8fafc;

  /* Blue (Tints inverted for contrast) */
  --color-blue-50: #172554;
  --color-blue-100: #1e3a8a;
  --color-blue-200: #1e40af;
  --color-blue-300: #1d4ed8;
  --color-blue-800: #bfdbfe;
  --color-blue-900: #dbeafe;
  --color-blue-950: #eff6ff;

  /* Emerald */
  --color-emerald-50: #022c22;
  --color-emerald-100: #064e3b;
  --color-emerald-200: #065f46;
  --color-emerald-800: #a7f3d0;
  --color-emerald-900: #d1fae5;
  --color-emerald-950: #ecfdf5;

  /* Rose */
  --color-rose-50: #4c0519;
  --color-rose-100: #881337;
  --color-rose-200: #9f1239;
  --color-rose-800: #fecdd3;
  --color-rose-900: #ffe4e6;
  --color-rose-950: #fff1f2;

  /* Amber */
  --color-amber-50: #451a03;
  --color-amber-100: #78350f;
  --color-amber-200: #92400e;
  --color-amber-800: #fde68a;
  --color-amber-900: #fef3c7;
  --color-amber-950: #fffbeb;

  /* Purple */
  --color-purple-50: #3b0764;
  --color-purple-100: #581c87;
  --color-purple-200: #6b21a8;
  --color-purple-800: #e9d5ff;
  --color-purple-900: #f3e8ff;
  --color-purple-950: #faf5ff;

  /* Indigo */
  --color-indigo-50: #312e81;
  --color-indigo-100: #3730a3;
  --color-indigo-200: #4338ca;
  --color-indigo-800: #c7d2fe;
  --color-indigo-900: #e0e7ff;
  --color-indigo-950: #eef2ff;

  /* Shadows for Dark Mode */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.5);
  --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px -1px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5);
}
`;

fs.writeFileSync('src/index.css', indexCss);
console.log('index.css updated successfully.');

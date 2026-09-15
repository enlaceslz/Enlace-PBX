const fs = require('fs');

let content = fs.readFileSync('src/components/views/HelpManualView.tsx', 'utf-8');

// 1. Update the description in the topics array
content = content.replace(
  /description: 'Mascote Polvo com IA, tipografia Enlace-PBX e download de ativos'/g,
  "description: 'Logos, tipografia Enlace-PBX e download de ativos'"
);

// 2. Remove specific text mentioning Mascot
content = content.replace(
  /O Polvo Tecnológico de Voz \& Inteligência Artificial/g,
  "Logotipo da Plataforma"
);

// 3. Remove the entire "A Simbologia do Mascote Polvo" section and make the palette full width or just remove that grid column.
// The grid has two columns. I'll replace the first column with just general info or remove it.
const symbologyRegex = /<div className="p-6 bg-white border border-slate-200 rounded-2xl">\s*<h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">\s*<Sparkles className="w-4 h-4 text-blue-600" \/> A Simbologia do Mascote Polvo\s*<\/h4>[\s\S]*?<\/div>\s*<div className="p-6 bg-white border border-slate-200 rounded-2xl">\s*<h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">\s*<Palette className="w-4 h-4 text-blue-600" \/> Paleta Cromática Corporativa/g;

content = content.replace(
  symbologyRegex,
  `<div className="p-6 bg-white border border-slate-200 rounded-2xl md:col-span-2">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-blue-600" /> Paleta Cromática Corporativa`
);

// Check if any other mentions of "mascote" exist in download names
content = content.replace(/enlace-pbx-mascote-icon.png/g, "enlace-pbx-logo-icon.png");
content = content.replace(/enlace-pbx-mascote.svg/g, "enlace-pbx-logo-icon.svg");

// 4. Update the section header
content = content.replace(/Mascote e Ícone App/g, "Ícone App / Logo Reduzida");
content = content.replace(/Mascote Isolado/g, "Ícone Isolado");

fs.writeFileSync('src/components/views/HelpManualView.tsx', content);
console.log('HelpManualView updated to remove Mascot descriptions');

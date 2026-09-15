const fs = require('fs');

let content = fs.readFileSync('src/components/views/HelpManualView.tsx', 'utf-8');

content = content.replace(/Mascote Oficial Enlace-PBX/g, "Logo Oficial Enlace-PBX");
content = content.replace(/Mascote Enlace-PBX/g, "Ícone Enlace-PBX");
content = content.replace(/Mascote Redondo \/ Quadrado/g, "Logo Redonda / Quadrada");
content = content.replace(/Ícone \& Mascote Oficial/g, "Ícone Oficial");

fs.writeFileSync('src/components/views/HelpManualView.tsx', content);
console.log('Alt texts updated');

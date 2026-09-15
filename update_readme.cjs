const fs = require('fs');

let readme = fs.readFileSync('README.md', 'utf-8');

readme = readme.replace(
  /# Enlace PBX/g,
  '# 🐙 Enlace PBX OSS'
);

readme = readme.replace(
  /Desenvolvido por \*\*André LJP\*\* e equipe \*\*Enlace Telecom\*\*/g,
  'Desenvolvido por **André LJP** e mantido pela comunidade Open Source (GitHub)'
);

fs.writeFileSync('README.md', readme);
console.log('README updated');

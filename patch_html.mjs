import fs from 'fs';
const file = 'index.html';
let content = fs.readFileSync(file, 'utf8');

const target = `    <title>Enlace-PBX — Telefonia Inteligente. Simples, aberta e brasileira.</title>`;

const replacement = `    <!-- 
      ENLACE-PBX
      Uma contribuição open-source para a comunidade de telecomunicações do Brasil.
      Criado por: André LJP & Enlace Telecom
      Website: https://enlace.slz.be
      Contato: slzenlace@gmail.com
    -->
    <title>Enlace-PBX — Telefonia Inteligente. Simples, aberta e brasileira.</title>`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Patched index.html with Open Source comment');

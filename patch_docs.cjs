const fs = require('fs');

// README
let readme = fs.readFileSync('README.md', 'utf-8');
const updateReadmeStr = `**4. Atualizações em 1-Clique (GitHub)**
Como um projeto de código aberto, a plataforma disponibiliza atualizações over-the-air diretamente na interface. Administradores podem atualizar o PBX sem tocar no terminal, integrando \`git pull\` e builds de forma visual e segura.`;

if (!readme.includes('Atualizações em 1-Clique')) {
  readme = readme.replace('**3. Módulo Disaster Recovery**', updateReadmeStr + '\n\n**3. Módulo Disaster Recovery**');
  fs.writeFileSync('README.md', readme);
}

// ARCHITECTURE
let arch = fs.readFileSync('ARCHITECTURE.md', 'utf-8');
const updateArchStr = `## 7. Open Source & Atualizações OTA
Para ambientes de produção descentralizados, o Express serve um endpoint de atualização (\`/api/v1/system/update\`). Acionado via interface de Infraestrutura, o processo automatiza:
1. Sincronismo via \`git pull\` do repositório remoto.
2. Atualização das dependências via \`npm install\`.
3. \`esbuild\` & \`vite build\` (Build otimizado).
4. Restart via processo pai (PM2).`;

if (!arch.includes('Atualizações OTA')) {
  arch = arch.replace('## 6. Módulo de Backup & Disaster Recovery', '## 6. Módulo de Backup & Disaster Recovery\n(Veja acima)\n\n' + updateArchStr + '\n\n');
  fs.writeFileSync('ARCHITECTURE.md', arch);
}
console.log('Docs updated');

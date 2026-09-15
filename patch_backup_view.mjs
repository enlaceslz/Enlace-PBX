import fs from 'fs';
const file = 'src/components/views/BackupRestoreView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `id: \\\`bkp-\\\${Date.now()}\\\`,` ,
  `id: \`bkp-\${Date.now()}\`,`
);

fs.writeFileSync(file, content);
console.log('Fixed syntax error in BackupRestoreView');

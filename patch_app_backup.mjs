import fs from 'fs';
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `import { HelpManualView } from './components/views/HelpManualView';`,
  `import { HelpManualView } from './components/views/HelpManualView';\nimport { BackupRestoreView } from './components/views/BackupRestoreView';`
);

content = content.replace(
  `      case 'help_manual':
        return <HelpManualView />;`,
  `      case 'help_manual':
        return <HelpManualView />;
      case 'backup_restore':
        return <BackupRestoreView />;`
);

fs.writeFileSync(file, content);
console.log('Patched App.tsx with Backup Restore');

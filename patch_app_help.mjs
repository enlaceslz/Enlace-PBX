import fs from 'fs';
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `import { SettingsView } from './components/views/SettingsView';`,
  `import { SettingsView } from './components/views/SettingsView';\nimport { HelpManualView } from './components/views/HelpManualView';`
);

content = content.replace(
  `      case 'settings':
        return <SettingsView onNavigate={setActiveView} />;`,
  `      case 'settings':
        return <SettingsView onNavigate={setActiveView} />;
      case 'help_manual':
        return <HelpManualView />;`
);

fs.writeFileSync(file, content);
console.log('Patched App.tsx with Help Manual');

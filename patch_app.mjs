import fs from 'fs';
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `import { HealthCheckView } from './components/views/HealthCheckView';`,
  `import { HealthCheckView } from './components/views/HealthCheckView';\nimport { SettingsView } from './components/views/SettingsView';`
);

content = content.replace(
  `      case 'health_check':
        return <HealthCheckView />;`,
  `      case 'health_check':
        return <HealthCheckView />;
      case 'settings':
        return <SettingsView onNavigate={setActiveView} />;`
);

fs.writeFileSync(file, content);
console.log('Patched App.tsx');

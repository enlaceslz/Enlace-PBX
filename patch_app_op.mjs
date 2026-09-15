import fs from 'fs';
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `return <OperationDashboardView channels={channels} metrics={metrics} />;`,
  `return <OperationDashboardView channels={channels} metrics={metrics} onOpenWebphone={handleOpenWebphone} />;`
);

fs.writeFileSync(file, content);
console.log('Patched App.tsx for OperationDashboardView props');

const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace(
  "{ id: 'reports' as ActiveView, label: 'Relatórios & SLA (PDF)', icon: BarChart3 },",
  "{ id: 'reports' as ActiveView, label: 'Relatórios & SLA (PDF)', icon: BarChart3 },"
); // doing a no-op replace as I realized it was already correct there.

fs.writeFileSync('src/components/Sidebar.tsx', code);
console.log('Sidebar untouched.');

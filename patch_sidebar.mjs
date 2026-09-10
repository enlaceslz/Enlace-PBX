import fs from 'fs';
const file = 'src/components/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Settings to Lucide imports
content = content.replace(
  `import {
  LayoutDashboard,
  Users,`,
  `import {
  LayoutDashboard,
  Users,
  Settings,`
);

// 2. Add 'settings' to ActiveView type
content = content.replace(
  `  | 'health_check';`,
  `  | 'health_check'\n  | 'settings';`
);

// 3. Add to the menu array
content = content.replace(
  `        { id: 'health_check' as ActiveView, label: 'Health Check do PBX', icon: HeartPulse },
      ],`,
  `        { id: 'health_check' as ActiveView, label: 'Health Check do PBX', icon: HeartPulse },
        { id: 'settings' as ActiveView, label: 'Configurações Globais', icon: Settings },
      ],`
);

fs.writeFileSync(file, content);
console.log('Patched Sidebar');

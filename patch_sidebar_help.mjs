import fs from 'fs';
const file = 'src/components/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Ensure HelpCircle is imported
if (!content.includes('HelpCircle')) {
  content = content.replace(
    `  HeartPulse,`,
    `  HeartPulse,
  HelpCircle,`
  );
}

// 2. Add 'help_manual' to ActiveView type
content = content.replace(
  `  | 'settings';`,
  `  | 'settings'\n  | 'help_manual';`
);

// 3. Add to the menu array
content = content.replace(
  `        { id: 'settings' as ActiveView, label: 'Configurações Globais', icon: Settings },
      ],`,
  `        { id: 'settings' as ActiveView, label: 'Configurações Globais', icon: Settings },
      ],
    },
    {
      title: 'AJUDA & SUPORTE',
      items: [
        { id: 'help_manual' as ActiveView, label: 'Manual & Glossário', icon: HelpCircle },
      ],`
);

fs.writeFileSync(file, content);
console.log('Patched Sidebar with Help Manual');

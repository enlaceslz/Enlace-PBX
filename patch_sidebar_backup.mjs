import fs from 'fs';
const file = 'src/components/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Ensure Database is imported
if (!content.includes('Database')) {
  content = content.replace(
    `  HelpCircle,`,
    `  HelpCircle,
  Database,`
  );
}

// 2. Add 'backup_restore' to ActiveView type
content = content.replace(
  `  | 'help_manual';`,
  `  | 'help_manual'\n  | 'backup_restore';`
);

// 3. Add to the menu array under ASTERISK & INFRAESTRUTURA
content = content.replace(
  `        { id: 'asterisk_installer' as ActiveView, label: 'Instalador Linux Oficial', icon: Download },
      ],
    },`,
  `        { id: 'asterisk_installer' as ActiveView, label: 'Instalador Linux Oficial', icon: Download },
        { id: 'backup_restore' as ActiveView, label: 'Backup & Restore', icon: Database },
      ],
    },`
);

fs.writeFileSync(file, content);
console.log('Patched Sidebar with Backup & Restore');

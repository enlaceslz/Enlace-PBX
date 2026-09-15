import fs from 'fs';

// Fix SettingsView
let settings = fs.readFileSync('src/components/views/SettingsView.tsx', 'utf8');
settings = settings.replace(
  `Settings, Clock, Music, Route, Shield, HardDrive, Bell, CheckCircle2, Search, ArrowUpRight, Save, Play, Upload, Plus`,
  `Settings, Clock, Music, Route, Shield, HardDrive, Bell, CheckCircle2, Search, ArrowUpRight, Save, Play, Upload, Plus, Bot`
);
fs.writeFileSync('src/components/views/SettingsView.tsx', settings);

// Fix server.ts (db.cdrs)
let server = fs.readFileSync('server.ts', 'utf8');
server = server.replace(`...db.cdr];`, `...db.cdrs];`);
fs.writeFileSync('server.ts', server);

// Fix asteriskService.ts
let asterisk = fs.readFileSync('server/asteriskService.ts', 'utf8');
asterisk = asterisk.replace(
  `durationSeconds: 0,
        creationTime: new Date().toISOString(),`,
  `durationSeconds: 0,
        exten: callee,`
);
asterisk = asterisk.replace(
  `const created = new Date(c.creationTime).getTime();`,
  `const created = parseInt(c.id.split('-')[1].split('.')[0]) || now;`
);
fs.writeFileSync('server/asteriskService.ts', asterisk);

console.log('Fixed imports and TS issues');

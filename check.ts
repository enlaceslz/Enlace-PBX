import fs from 'fs';
const content = fs.readFileSync('src/components/views/CdrAndRecordingsView.tsx', 'utf8');
console.log(content.includes('PieChart') ? 'YES' : 'NO');

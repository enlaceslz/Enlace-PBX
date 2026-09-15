const fs = require('fs');
let code = fs.readFileSync('src/components/views/CdrAndRecordingsView.tsx', 'utf8');

code = code.replace(/< 20s/g, '&lt; 20s');
code = code.replace(/< 3m/g, '&lt; 3m');
code = code.replace(/< 5%/g, '&lt; 5%');

fs.writeFileSync('src/components/views/CdrAndRecordingsView.tsx', code);
console.log('Fixed JSX syntax error');

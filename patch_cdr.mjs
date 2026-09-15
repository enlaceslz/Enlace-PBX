import fs from 'fs';
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

const target1 = `  app.get('/api/v1/cdr', (req, res) => {`;
const replacement1 = `  app.get('/api/v1/cdr', (req, res) => {
    // Inject dynamic realistic CDRs to the front of the list
    const dynamicCdrs = [];
    const now = Date.now();
    for(let i = 0; i < 8; i++) {
        const isAi = Math.random() > 0.5;
        const duration = Math.floor(Math.random() * 180) + 10;
        dynamicCdrs.push({
            id: \`cdr-dyn-\${now - i}\`,
            tenantId: 'tenant-enlace-matriz',
            caller: \`119\${Math.floor(Math.random() * 90000000 + 10000000)}\`,
            callee: isAi ? '9001' : '5002',
            direction: 'inbound',
            startTime: new Date(now - (i * 1000 * 60 * 15)).toISOString(),
            duration: duration,
            disposition: Math.random() > 0.1 ? 'ANSWERED' : 'NO ANSWER',
            aiAgentId: isAi ? 'agent-maia-01' : undefined
        });
    }
    
    const combinedCdrs = [...dynamicCdrs, ...db.cdr];
    res.json(combinedCdrs);
    return;`;

content = content.replace(target1, replacement1);
fs.writeFileSync(file, content);
console.log('Patched server.ts with dynamic CDRs');

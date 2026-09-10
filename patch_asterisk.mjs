import fs from 'fs';
const file = 'server/asteriskService.ts';
let content = fs.readFileSync(file, 'utf8');

const target1 = `  getActiveChannels(): AsteriskChannel[] {
    return this.activeChannels;
  }`;

const replacement1 = `  getActiveChannels(): AsteriskChannel[] {
    // Dynamic mock for active channels to make the dashboard blink
    const now = Date.now();
    
    // Clear out old random channels periodically to simulate hangup
    this.activeChannels = this.activeChannels.filter(c => {
       const created = parseInt(c.id.split('-')[1].split('.')[0]) || now;
       return (now - created) < 180000; // max 3 mins alive
    });

    // Randomly spawn new channels if we have fewer than 5
    if (this.activeChannels.length < 5 && Math.random() > 0.4) {
      const isAi = Math.random() > 0.3;
      const caller = \`119\${Math.floor(Math.random() * 90000000 + 10000000)}\`;
      const callee = isAi ? '9001' : '5002';
      
      const id = \`chan-\${now}.\${Math.floor(Math.random() * 1000)}\`;
      const chan = {
        id,
        name: \`PJSIP/\${caller}-\${Math.floor(Math.random() * 90000 + 10000).toString(16)}\`,
        state: 'Up',
        callerNumber: caller,
        connectedLine: callee,
        durationSeconds: 0,
        creationTime: new Date().toISOString(),
        aiBridgeActive: isAi,
        application: isAi ? 'Stasis' : 'Dial',
        context: 'enlace-inbound',
        format: 'ulaw'
      };
      this.activeChannels.push(chan);
    }

    // Update durations
    return this.activeChannels.map(c => {
       const created = new Date(c.creationTime).getTime();
       return {
         ...c,
         durationSeconds: Math.floor((now - created) / 1000)
       };
    });
  }`;

content = content.replace(target1, replacement1);
fs.writeFileSync(file, content);
console.log('Patched asteriskService.ts with dynamic channels');

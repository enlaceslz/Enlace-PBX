import fs from 'fs';
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

const target1 = `  app.post('/api/v1/health/run-diagnostic', (req, res) => {`;
const replacement1 = `  app.get('/api/v1/dashboard/metrics', (req, res) => {
    // Generate some dynamic metrics for the dashboard
    const now = new Date();
    const currentHour = now.getHours();
    
    // Simulate realistic daily curve
    const hourlyCallDistribution = Array.from({ length: 24 }).map((_, i) => {
      const isWorkHour = i >= 8 && i <= 18;
      const baseCalls = isWorkHour ? Math.floor(Math.random() * 50) + 20 : Math.floor(Math.random() * 10) + 1;
      const aiCalls = Math.floor(baseCalls * (Math.random() * 0.4 + 0.3)); // 30-70% handled by AI
      return {
        hour: \`\${i.toString().padStart(2, '0')}:00\`,
        total: i <= currentHour ? baseCalls : 0,
        ai: i <= currentHour ? aiCalls : 0
      };
    });

    const callsToday = hourlyCallDistribution.reduce((acc, curr) => acc + curr.total, 0);
    const aiTranscriptionsToday = Math.floor(callsToday * 1.5); // Approx 1.5 mins per call
    const callsAnswered = Math.floor(callsToday * 0.94); // 94% SLA

    res.json({
      callsToday,
      callsAnswered,
      callsMissed: callsToday - callsAnswered,
      extensionsTotal: db.extensions.length,
      extensionsOnline: db.extensions.filter(e => e.status === 'online').length,
      trunksTotal: db.trunks.length,
      trunksOnline: db.trunks.filter(t => t.status === 'registered').length,
      aiLatencyAvgMs: Math.floor(Math.random() * 50) + 320,
      aiTranscriptionsToday,
      hourlyCallDistribution,
    });
  });

  app.post('/api/v1/health/run-diagnostic', (req, res) => {`;

content = content.replace(target1, replacement1);
fs.writeFileSync(file, content);
console.log('Patched server.ts with dynamic metrics');

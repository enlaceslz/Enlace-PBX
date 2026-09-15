const fs = require('fs');
let code = fs.readFileSync('src/components/views/CdrAndRecordingsView.tsx', 'utf8');

const dynamicSlaLogic = `
  // Dynamic SLA Calculations for Reports Tab
  const slaMetrics = useMemo(() => {
    const total = filteredCdrs.length;
    const answered = filteredCdrs.filter(c => c.disposition === 'ANSWERED');
    const abandoned = filteredCdrs.filter(c => c.disposition === 'NO ANSWER');
    
    // TME (Tempo Médio de Espera) = duration - billsec (for answered)
    let totalWaitTime = 0;
    answered.forEach(c => {
      totalWaitTime += Math.max(0, c.duration - c.billsec);
    });
    // Add abandoned duration as wait time
    abandoned.forEach(c => {
      totalWaitTime += c.duration;
    });
    const avgWaitTime = total > 0 ? Math.round(totalWaitTime / total) : 0;
    
    // TMA (Tempo Médio de Atendimento) = billsec (for answered)
    const totalTalkTime = answered.reduce((acc, c) => acc + c.billsec, 0);
    const avgTalkTime = answered.length > 0 ? Math.round(totalTalkTime / answered.length) : 0;
    
    // Abandon Rate
    const abandonRate = total > 0 ? ((abandoned.length / total) * 100).toFixed(1) : '0.0';

    return {
      tme: avgWaitTime,
      tma: avgTalkTime,
      abandonRate: parseFloat(abandonRate)
    };
  }, [filteredCdrs]);
`;

code = code.replace('  // Sentiment data for chart', dynamicSlaLogic + '\n  // Sentiment data for chart');

const htmlToReplace = `          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Activity className="w-4 h-4 text-emerald-500" /> TME (Tempo Médio de Espera)
              </span>
              <p className="text-[10px] text-slate-400 font-medium">SLA Meta: &lt; 20s</p>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800">12s</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Aprovado</span>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Clock className="w-4 h-4 text-blue-500" /> TMA (Tempo Médio de Atend.)
              </span>
              <p className="text-[10px] text-slate-400 font-medium">SLA Meta: &lt; 3m</p>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800">2m45s</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Dentro do Padrão</span>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <PhoneIncoming className="w-4 h-4 text-amber-500" /> Taxa de Abandono
              </span>
              <p className="text-[10px] text-slate-400 font-medium">SLA Meta: &lt; 5%</p>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800">2.1%</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Excelente</span>
            </div>
          </div>`;

const newHtml = `          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Activity className="w-4 h-4 text-emerald-500" /> TME (Tempo Médio de Espera)
              </span>
              <p className="text-[10px] text-slate-400 font-medium">SLA Meta: &lt; 20s</p>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800">{slaMetrics.tme}s</span>
              <span className={\`text-xs font-bold px-2 py-0.5 rounded \${slaMetrics.tme <= 20 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}\`}>
                {slaMetrics.tme <= 20 ? 'Aprovado' : 'Alerta SLA'}
              </span>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Clock className="w-4 h-4 text-blue-500" /> TMA (Tempo Médio de Atend.)
              </span>
              <p className="text-[10px] text-slate-400 font-medium">SLA Meta: &lt; 3m</p>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800">{Math.floor(slaMetrics.tma / 60)}m{slaMetrics.tma % 60}s</span>
              <span className={\`text-xs font-bold px-2 py-0.5 rounded \${slaMetrics.tma <= 180 ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}\`}>
                {slaMetrics.tma <= 180 ? 'Dentro do Padrão' : 'Atenção Operacional'}
              </span>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <PhoneIncoming className="w-4 h-4 text-amber-500" /> Taxa de Abandono
              </span>
              <p className="text-[10px] text-slate-400 font-medium">SLA Meta: &lt; 5%</p>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800">{slaMetrics.abandonRate}%</span>
              <span className={\`text-xs font-bold px-2 py-0.5 rounded \${slaMetrics.abandonRate <= 5 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}\`}>
                {slaMetrics.abandonRate <= 5 ? 'Excelente' : 'Crítico'}
              </span>
            </div>
          </div>`;

code = code.replace(htmlToReplace, newHtml);
fs.writeFileSync('src/components/views/CdrAndRecordingsView.tsx', code);
console.log('Dynamic SLA patched');

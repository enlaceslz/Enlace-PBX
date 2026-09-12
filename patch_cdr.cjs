const fs = require('fs');
let code = fs.readFileSync('src/components/views/CdrAndRecordingsView.tsx', 'utf8');

const oldAIInsights = `      {/* AI Insights Dashboard - Only visible in Transcriptions tab as requested */}
      {activeTab === 'transcriptions' && (`;

const newAIInsights = `      {/* SLA & Executive Reports Dashboard - Visible in reports tab */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
          <div className="col-span-12">
             <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
               <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div>
                   <h2 className="text-2xl font-black mb-2">Relatório Executivo de SLA</h2>
                   <p className="text-slate-300 text-sm max-w-2xl">
                     Visão gerencial consolidada do desempenho da operação de telefonia, qualidade de atendimento (QA) analisada por IA e cumprimento dos Acordos de Nível de Serviço (SLA).
                   </p>
                 </div>
                 <button
                   onClick={handleExportExecutivePdf}
                   className="shrink-0 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 transition"
                 >
                   <Printer className="w-5 h-5" />
                   Gerar Dossiê PDF
                 </button>
               </div>
             </div>
          </div>
          
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Activity className="w-4 h-4 text-emerald-500" /> TME (Tempo Médio de Espera)
              </span>
              <p className="text-[10px] text-slate-400 font-medium">SLA Meta: < 20s</p>
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
              <p className="text-[10px] text-slate-400 font-medium">SLA Meta: < 3m</p>
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
              <p className="text-[10px] text-slate-400 font-medium">SLA Meta: < 5%</p>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800">2.1%</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Excelente</span>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights Dashboard - Only visible in Transcriptions tab as requested */}
      {activeTab === 'transcriptions' && (`;

code = code.replace(oldAIInsights, newAIInsights);
fs.writeFileSync('src/components/views/CdrAndRecordingsView.tsx', code);
console.log('CDR View patched');

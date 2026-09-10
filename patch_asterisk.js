const fs = require('fs');
const file = 'src/components/views/AsteriskCoreView.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Asterisk 20 LTS & Infraestrutura de Telefonia
            </h1>
            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-mono">
              Pure Open Source Core
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Conexão com ARI (Asterisk REST Interface), geração de arquivos de configuração e script automatizado para Ubuntu/Debian.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 self-start">`;

const replacement1 = `  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Server className="w-8 h-8 text-blue-600 fill-blue-600" />
              Asterisk Core 20 LTS
            </h1>
            <span className="px-2.5 py-1 bg-slate-900 text-white border border-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ml-2">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> Motor SIP Ativo
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Gestão avançada do kernel, Asterisk REST Interface (ARI) e provisionamento via PJSIP.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-sm self-start">`;

content = content.replace(target1, replacement1);


const target2 = `        <div className="space-y-6">
          {/* Status Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">VERSÃO DO NÚCLEO</span>
              <div className="text-lg font-bold text-slate-900 font-mono mt-1">Asterisk 20.17.0 LTS</div>
              <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> LTS com suporte estendido
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">PORTA ARI & HTTP</span>
              <div className="text-lg font-bold text-teal-600 font-mono mt-1">8088 /ws</div>
              <p className="text-[10px] text-slate-500 mt-1">Stasis app: "enlace_ai_bridge"</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">DRIVER DE CANAL</span>
              <div className="text-lg font-bold text-slate-900 font-mono mt-1">res_pjsip</div>
              <p className="text-[10px] text-slate-500 mt-1">PJSIP 2.13 com SRTP e WSS</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">STREAMING DE ÁUDIO</span>
              <div className="text-lg font-bold text-purple-600 font-mono mt-1">app_audiosocket</div>
              <p className="text-[10px] text-slate-500 mt-1">24kHz PCM linear bidirecional</p>
            </div>
          </div>`;

const replacement2 = `        <div className="space-y-6">
          {/* NOC Status Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800 shadow-lg">
              <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 z-0" />
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center relative z-10 border border-blue-500/30">
                <Cpu className="w-6 h-6" />
              </div>
              <div className="relative z-10">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Versão do Núcleo</div>
                <div className="text-xl font-black text-white font-mono">Asterisk 20.17</div>
              </div>
            </div>
            
            <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800 shadow-lg">
              <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4 z-0" />
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center relative z-10 border border-emerald-500/30">
                <Activity className="w-6 h-6" />
              </div>
              <div className="relative z-10">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">App Stasis (ARI)</div>
                <div className="text-xl font-black text-white font-mono flex items-center gap-2">8088 <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">/ws</span></div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800 shadow-lg">
              <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/10 rounded-bl-full -mr-4 -mt-4 z-0" />
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center relative z-10 border border-purple-500/30">
                <Radio className="w-6 h-6" />
              </div>
              <div className="relative z-10">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Driver PJSIP</div>
                <div className="text-xl font-black text-white font-mono">res_pjsip</div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800 shadow-lg">
              <div className="absolute right-0 top-0 w-24 h-24 bg-rose-500/10 rounded-bl-full -mr-4 -mt-4 z-0" />
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center relative z-10 border border-rose-500/30">
                <Radio className="w-6 h-6" />
              </div>
              <div className="relative z-10">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Streaming Audio</div>
                <div className="text-xl font-black text-white font-mono">AudioSocket</div>
              </div>
            </div>
          </div>`;

content = content.replace(target2, replacement2);
fs.writeFileSync(file, content);
console.log('Patched AsteriskCoreView');

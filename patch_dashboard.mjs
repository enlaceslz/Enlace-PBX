import fs from 'fs';
const file = 'src/components/views/DashboardView.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Context */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 p-6 rounded-2xl border border-blue-400/50 shadow-lg shadow-blue-600/20 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-40 h-40 bg-sky-300/20 rounded-full blur-2xl translate-y-1/2 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-blue-50 border border-white/20 backdrop-blur-sm">
              Operação Nacional Brasil
            </span>
            <span className="text-xs text-blue-100 font-mono">Asterisk 20.17 LTS Puro • Google Gemini</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-sm">
            Central de Controle Enlace-PBX
          </h1>
          <p className="text-sm text-blue-50/90 mt-1.5 max-w-2xl leading-relaxed">
            Telefonia IP corporativa com núcleo Asterisk aberto, orquestração de canais via ARI e agentes de voz inteligentes integrados ao Google Gemini Live API.
          </p>
        </div>

        <div className="flex items-center gap-2.5 relative z-10 shrink-0 mt-2 md:mt-0">
          <button
            onClick={() => onOpenWebphone('9001')}
            className="px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-black/10 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Bot className="w-4 h-4 text-blue-600" />
            Ligar para MaIA (IA)
          </button>
          <button
            onClick={() => onNavigate('extensions')}
            className="px-4 py-2.5 bg-blue-800/40 hover:bg-blue-800/60 text-white font-semibold rounded-xl text-xs border border-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 active:scale-95"
          >
            Gerenciar Ramais
          </button>
        </div>
      </div>`;

const replacement1 = `  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Radio className="w-8 h-8 text-blue-600 fill-blue-600" />
            Central de Operações Enlace-PBX
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Plataforma de Telefonia IP baseada no núcleo Asterisk 20.17 LTS e integração nativa ao Google Gemini Live.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('extensions')}
              className="px-5 py-2.5 bg-white text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-sm border border-slate-200 transition-all flex items-center gap-2 shadow-sm"
            >
              Gerenciar Extensões
            </button>
            <button
              onClick={() => onOpenWebphone('9001')}
              className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 font-bold rounded-xl text-sm border border-blue-700 transition-all flex items-center gap-2 shadow-md shadow-blue-600/20"
            >
              <Bot className="w-4 h-4" /> Discar para Agente IA
            </button>
        </div>
      </div>`;

content = content.replace(target1, replacement1);


const target2 = `      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Chamadas Hoje</span>
            <PhoneCall className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {metrics?.callsToday ?? 35}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-blue-600 font-medium">
            <span className="flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {metrics?.callsAnswered ?? 30} atendidas
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-rose-500">{metrics?.callsMissed ?? 5} perdidas</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Canais ARI Ativos</span>
            <Activity className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono flex items-center gap-2">
            <span>{channels.length}</span>
            {channels.length > 0 && <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1 font-mono">
            <span>{channels.filter((c) => c.aiBridgeActive).length} canal em Stasis com Gemini</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Ramais PJSIP Online</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {metrics?.extensionsOnline ?? 4}
            <span className="text-xs text-slate-500 font-normal ml-1">/ {metrics?.extensionsTotal ?? 5}</span>
          </div>
          <div className="text-[11px] text-blue-600 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>WebRTC e SIP Realtime ativos</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Troncos SIP Operadoras</span>
            <Radio className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {metrics?.trunksOnline ?? 3}
            <span className="text-xs text-slate-500 font-normal ml-1">/ {metrics?.trunksTotal ?? 3}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 font-mono">
            Vivo Fibra • Claro 0800 • Algar
          </div>
        </div>
      </div>`;

const replacement2 = `      {/* NOC / Wallboard KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800 shadow-lg group hover:border-blue-500/50 transition-colors">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 z-0 transition-transform group-hover:scale-110" />
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center relative z-10 border border-blue-500/30">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div className="relative z-10 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tráfego Hoje</div>
            <div className="text-2xl font-black text-white font-mono flex items-end gap-2">
              {metrics?.callsToday ?? 35} <span className="text-[10px] text-slate-500 font-sans mb-1 font-bold">chamadas</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-400 font-bold">
              <ArrowUpRight className="w-3 h-3" /> {(metrics?.callsAnswered ?? 30)} ACD
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800 shadow-lg group hover:border-cyan-500/50 transition-colors">
          <div className="absolute right-0 top-0 w-24 h-24 bg-cyan-500/10 rounded-bl-full -mr-4 -mt-4 z-0 transition-transform group-hover:scale-110" />
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center relative z-10 border border-cyan-500/30">
            <Activity className="w-6 h-6" />
          </div>
          <div className="relative z-10 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex justify-between items-center">
              Canais ARI
              {channels.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping mr-1" />}
            </div>
            <div className="text-2xl font-black text-white font-mono flex items-end gap-2">
              {channels.length} <span className="text-[10px] text-slate-500 font-sans mb-1 font-bold">ativos</span>
            </div>
            <div className="mt-1 text-[10px] text-cyan-400 font-mono">
              {channels.filter((c) => c.aiBridgeActive).length} STASIS/RAG
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800 shadow-lg group hover:border-emerald-500/50 transition-colors">
          <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4 z-0 transition-transform group-hover:scale-110" />
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center relative z-10 border border-emerald-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div className="relative z-10 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">SIP Endpoints</div>
            <div className="text-2xl font-black text-white font-mono flex items-end gap-2">
              {metrics?.extensionsOnline ?? 4} <span className="text-[10px] text-slate-500 font-sans mb-1 font-bold">/ {metrics?.extensionsTotal ?? 5} online</span>
            </div>
            <div className="mt-1 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
               <CheckCircle2 className="w-3 h-3" /> WebRTC OK
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800 shadow-lg group hover:border-purple-500/50 transition-colors">
          <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/10 rounded-bl-full -mr-4 -mt-4 z-0 transition-transform group-hover:scale-110" />
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center relative z-10 border border-purple-500/30">
            <Radio className="w-6 h-6" />
          </div>
          <div className="relative z-10 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Gateway PJSIP</div>
            <div className="text-2xl font-black text-white font-mono flex items-end gap-2">
              {metrics?.trunksOnline ?? 3} <span className="text-[10px] text-slate-500 font-sans mb-1 font-bold">/ {metrics?.trunksTotal ?? 3} troncos</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-500 font-mono truncate">
               Vivo Fibra / Algar
            </div>
          </div>
        </div>
      </div>`;

content = content.replace(target2, replacement2);


const target3 = `      {/* AI Gateway Specific KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-teal-600">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Latência Média de Resposta IA
            </div>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
              {metrics?.aiLatencyAvgMs ?? 355} ms
            </div>
            <p className="text-[10px] text-slate-500">Gemini Live API em tempo real</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Volume de Transcrições (STT)
            </div>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
              {metrics?.aiTranscriptionsToday ?? 142} <span className="text-xs text-slate-500 font-normal">minutos hoje</span>
            </div>
            <p className="text-[10px] text-slate-500">Multilingual (pt-BR nativo)</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Uso de Modelos Base
            </div>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
              Gemini 2.5 Flash
            </div>
            <p className="text-[10px] text-slate-500">Motor de voz e RAG padrão</p>
          </div>
        </div>
      </div>`;

const replacement3 = ``;

content = content.replace(target3, replacement3);


const target4 = `      {/* Split view: Active Channels & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active ARI Channels Panel */}
        <div className="lg:col-span-1 bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" /> Monitor ARI Realtime
              </h3>
              <p className="text-xs text-slate-400">Chamadas SIP em processamento</p>
            </div>
          </div>
          {channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-slate-500 py-10 opacity-70">
              <PhoneOff className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs text-center font-mono uppercase tracking-wider">Silêncio de Rádio</p>
              <p className="text-[10px] text-center mt-1">Nenhum canal RTP ativo.</p>
              <button
                onClick={() => onOpenWebphone()}
                className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-black/20"
              >
                Discar pelo Webphone
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {channels.map((chan) => (
                <div
                  key={chan.id}
                  className="p-3 bg-white hover:bg-slate-50 transition rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-bold font-mono text-slate-700">{chan.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {chan.callerNumber} → <span className="text-blue-600 font-semibold">{chan.connectedLine}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      App: {chan.application} • Context: {chan.context}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {chan.durationSeconds}s
                    </span>
                    {chan.aiBridgeActive && (
                      <div className="text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 mt-1 shadow-sm">
                        Gemini Live
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>`;

const replacement4 = `      {/* Split view: Active Channels & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active ARI Channels Panel */}
        <div className="lg:col-span-1 bg-slate-900 rounded-3xl shadow-xl border border-slate-800 p-5 flex flex-col relative overflow-hidden group">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2 tracking-wide uppercase">
                <Activity className="w-4 h-4 text-emerald-400" /> Monitoramento ARI
              </h3>
              <p className="text-[10px] text-slate-400 font-mono mt-1">Stasis Event Bus</p>
            </div>
            <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
            </div>
          </div>
          {channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-slate-500 py-10 opacity-70 relative z-10">
              <div className="w-16 h-16 rounded-full border border-slate-700 flex items-center justify-center mb-4 bg-slate-800">
                  <Phone className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-[11px] font-bold text-center font-mono uppercase tracking-widest text-slate-400">Canal RTP Inativo</p>
              <button
                onClick={() => onOpenWebphone()}
                className="mt-6 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-blue-600/20"
              >
                Ativar Ramal WebRTC
              </button>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto relative z-10">
              {channels.map((chan) => (
                <div
                  key={chan.id}
                  className="p-3 bg-slate-800/80 hover:bg-slate-700 transition rounded-xl border border-slate-700 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      <span className="text-[11px] font-bold font-mono text-emerald-400">{chan.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1 font-mono">
                      {chan.callerNumber} → <span className="text-white font-bold">{chan.connectedLine}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono font-bold text-slate-400">
                      {chan.durationSeconds}s
                    </span>
                    {chan.aiBridgeActive && (
                      <div className="text-[9px] font-bold text-purple-300 bg-purple-900/50 px-2 py-0.5 rounded border border-purple-500/30 mt-1 shadow-sm uppercase tracking-wider flex items-center gap-1 justify-end">
                        <Sparkles className="w-2.5 h-2.5" /> IA
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>`;

content = content.replace(target4, replacement4);


const target5 = `        {/* Hourly Distribution & AI Performance */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Distribuição de Tráfego por Hora</h3>
                <p className="text-xs text-slate-500">Total de chamadas vs. Atendidas por IA Gemini</p>
              </div>
            </div>
            <div className="w-full h-52 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics?.hourlyCallDistribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f172a' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: '#64748b' }} />
                  <Bar dataKey="total" name="Total (PJSIP)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="ai" name="Agente IA (Gemini)" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500">
            <span>Fuso horário: America/Sao_Paulo (Horário de Brasília)</span>
            <span className="text-blue-600 font-semibold">SLA de Atendimento: 94.2%</span>
          </div>
        </div>
      </div>`;

const replacement5 = `        {/* Hourly Distribution & AI Performance */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Histograma de Tráfego PJSIP</h3>
                <p className="text-[11px] font-medium text-slate-500 mt-1">Distorção de volume: Humanos vs Agentes IA</p>
              </div>
              <div className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Hoje
              </div>
            </div>
            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics?.hourlyCallDistribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '16px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f172a' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px', color: '#64748b', fontWeight: 'bold' }} />
                  <Bar dataKey="total" name="Core (PJSIP)" fill="#0f172a" radius={[6, 6, 0, 0]} barSize={16} />
                  <Bar dataKey="ai" name="Agentes Gemini" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-bold">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> America/Sao_Paulo (BRT)</span>
            <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">SLA Global: 94.2%</span>
          </div>
        </div>
      </div>`;

content = content.replace(target5, replacement5);


const target6 = `      {/* Recent CDR Call Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Chamadas Recentes (CDR)</h3>
            <p className="text-xs text-slate-500">Registros de chamadas internas, externas e sessões Gemini</p>
          </div>
          <button
            onClick={() => onNavigate('cdr')}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
          >
            Ver todos os registros →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[11px] font-mono uppercase bg-slate-50">
                <th className="py-2.5 px-3">Origem</th>
                <th className="py-2.5 px-3">Destino</th>
                <th className="py-2.5 px-3">Direção</th>
                <th className="py-2.5 px-3">Início</th>
                <th className="py-2.5 px-3">Duração</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Atendimento IA</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {recentCdrs.slice(0, 5).map((cdr) => (
                <tr key={cdr.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-3 font-mono font-semibold text-slate-900">{cdr.caller}</td>
                  <td className="py-3 px-3 font-mono text-slate-700">{cdr.callee}</td>
                  <td className="py-3 px-3 capitalize">
                    <span
                      className={\`px-2 py-0.5 rounded text-[10px] font-semibold font-mono \${
                        cdr.direction === 'inbound'
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : cdr.direction === 'outbound'
                          ? 'bg-purple-50 text-purple-600 border border-purple-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }\`}
                    >
                      {cdr.direction}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                    {new Date(cdr.startTime).toLocaleTimeString('pt-BR')}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">
                    {Math.floor(cdr.duration / 60)}m {cdr.duration % 60}s
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={\`px-2 py-0.5 rounded text-[10px] font-bold \${
                        cdr.disposition === 'ANSWERED'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }\`}
                    >
                      {cdr.disposition}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {cdr.aiAgentId ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                        <Bot className="w-3 h-3 text-cyan-600" /> MaIA (Gemini)
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Humano</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onOpenWebphone(cdr.caller)}
                      className="text-slate-500 hover:text-blue-600 p-1 transition"
                      title="Retornar ligação via Webphone"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>`;

const replacement6 = `      {/* Recent CDR Call Records Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Telemetria de Terminação (CDR)</h3>
            <p className="text-[11px] font-medium text-slate-500 mt-1">Inspeção profunda de chamadas curtas (LCR) e tráfego RAG.</p>
          </div>
          <button
            onClick={() => onNavigate('cdr')}
            className="text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl font-bold transition flex items-center gap-2"
          >
            Auditoria Completa <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                <th className="py-3 px-3">Origem</th>
                <th className="py-3 px-3">Destino</th>
                <th className="py-3 px-3">Direção</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Billsec</th>
                <th className="py-3 px-3">Disposition</th>
                <th className="py-3 px-3">Processador</th>
                <th className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {recentCdrs.slice(0, 5).map((cdr) => (
                <tr key={cdr.id} className="hover:bg-blue-50/50 transition">
                  <td className="py-4 px-3 font-mono font-bold text-slate-900">{cdr.caller}</td>
                  <td className="py-4 px-3 font-mono font-semibold text-slate-600">{cdr.callee}</td>
                  <td className="py-4 px-3">
                    <span
                      className={\`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider \${
                        cdr.direction === 'inbound'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : cdr.direction === 'outbound'
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }\`}
                    >
                      {cdr.direction}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-slate-500 font-mono text-[11px] font-medium">
                    {new Date(cdr.startTime).toLocaleTimeString('pt-BR')}
                  </td>
                  <td className="py-4 px-3 font-mono text-slate-700 font-bold">
                    {Math.floor(cdr.duration / 60)}m {cdr.duration % 60}s
                  </td>
                  <td className="py-4 px-3">
                    <span
                      className={\`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider \${
                        cdr.disposition === 'ANSWERED'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-100 text-rose-700 border border-rose-200'
                      }\`}
                    >
                      {cdr.disposition}
                    </span>
                  </td>
                  <td className="py-4 px-3">
                    {cdr.aiAgentId ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 shadow-sm">
                        <Sparkles className="w-3 h-3 text-purple-600" /> Agente RAG
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Humano/URA</span>
                    )}
                  </td>
                  <td className="py-4 px-3 text-right">
                    <button
                      onClick={() => onOpenWebphone(cdr.caller)}
                      className="text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 p-2 rounded-lg transition border border-slate-200 hover:border-blue-200"
                      title="Retornar ligação via Webphone"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>`;

content = content.replace(target6, replacement6);

fs.writeFileSync(file, content);
console.log('Patched DashboardView');

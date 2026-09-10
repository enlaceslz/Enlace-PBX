import fs from 'fs';
const file = 'src/components/views/QueuesAndGroupsView.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Filas e Grupos de Chamada
            </h1>
            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-mono">
              app_queue • Asterisk 20
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Distribuição automática de chamadas (ACD) com estratégias roundrobin, ringall, SLAs e música em espera.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <div className="flex bg-white p-1 rounded-xl border border-slate-200">`;

const replacement1 = `  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Layers className="w-8 h-8 text-blue-600 fill-blue-600" />
              Filas & Grupos (ACD)
            </h1>
            <span className="px-2.5 py-1 bg-slate-900 text-white border border-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ml-2 shadow-sm">
               Asterisk app_queue
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Distribuição automática de chamadas, SLAs, música em espera e estratégias de ring avançadas.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-sm">`;

content = content.replace(target1, replacement1);


const target2 = `            <button
              onClick={() => setActiveTab('queues')}
              className={\`px-3 py-1.5 rounded-lg text-xs font-semibold transition \${
                activeTab === 'queues'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-500 hover:text-slate-700'
              }\`}
            >
              Filas de Atendimento (ACD)
            </button>
            <button
              onClick={() => setActiveTab('ring_groups')}
              className={\`px-3 py-1.5 rounded-lg text-xs font-semibold transition \${
                activeTab === 'ring_groups'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-500 hover:text-slate-700'
              }\`}
            >
              Grupos de Toque (Ring Groups)
            </button>`;

const replacement2 = `            <button
              onClick={() => setActiveTab('queues')}
              className={\`px-5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 \${
                activeTab === 'queues'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }\`}
            >
              <Split className="w-4 h-4" /> Filas de Atendimento (ACD)
            </button>
            <button
              onClick={() => setActiveTab('ring_groups')}
              className={\`px-5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 \${
                activeTab === 'ring_groups'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }\`}
            >
              <Users className="w-4 h-4" /> Grupos de Toque (Ring Groups)
            </button>`;

content = content.replace(target2, replacement2);


const target3 = `      {/* QUEUES */}
      {activeTab === 'queues' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Fila (ACD)
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {queues.map((q) => (
              <div key={q.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold font-mono border border-blue-100">
                        {q.number}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900">{q.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="text-slate-400 hover:text-red-500 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 mb-3">
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Split className="w-3.5 h-3.5 text-slate-400" />
                      <span className="capitalize">{q.strategy}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      SLA: {q.slaTargetSeconds}s
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {q.members.length} Agentes
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Métricas (Hoje)</span>
                    <span className="text-[11px] font-bold text-slate-700">
                      {q.metrics?.callsHandled ?? 0} Atendidas / <span className="text-rose-500">{q.metrics?.callsAbandoned ?? 0} Abandonos</span>
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: \`\${((q.metrics?.callsHandled ?? 0) / ((q.metrics?.callsHandled ?? 0) + (q.metrics?.callsAbandoned ?? 1))) * 100}%\`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}`;

const replacement3 = `      {/* QUEUES */}
      {activeTab === 'queues' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
               <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Filas de Atendimento PJSIP</h3>
               <p className="text-[11px] text-slate-500 mt-0.5">Gerencie os fluxos ACD, estratégias de Ring e Service Level Agreement (SLA).</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 transition shadow-md shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              Criar Fila ACD
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {queues.map((q) => (
              <div key={q.id} className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow group">
                <div>
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black font-mono border border-blue-100 shadow-sm text-lg">
                        {q.number}
                      </div>
                      <div>
                         <h3 className="font-bold text-base text-slate-900">{q.name}</h3>
                         <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Context: pbx-internal</span>
                      </div>
                    </div>
                    <button className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition border border-slate-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 mb-4">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5"><Split className="w-3.5 h-3.5" /> Estratégia</span>
                      <span className="font-mono text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded">{q.strategy}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Target SLA</span>
                      <span className="font-mono text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">{q.slaTargetSeconds}s</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Membros</span>
                      <span className="font-mono text-slate-700 font-bold bg-slate-200 px-2 py-0.5 rounded">{q.members.length} Agentes</span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Desempenho (Hoje)</span>
                    <span className="text-[11px] font-mono font-bold text-slate-700">
                      {q.metrics?.callsHandled ?? 0} <span className="text-emerald-500">OK</span> / <span className="text-rose-500">{q.metrics?.callsAbandoned ?? 0} DROP</span>
                    </span>
                  </div>
                  <div className="h-2 bg-rose-100 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: \`\${((q.metrics?.callsHandled ?? 0) / ((q.metrics?.callsHandled ?? 0) + (q.metrics?.callsAbandoned ?? 1))) * 100}%\`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}`;

content = content.replace(target3, replacement3);

fs.writeFileSync(file, content);
console.log('Patched QueuesAndGroupsView');

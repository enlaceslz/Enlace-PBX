import fs from 'fs';
const file = 'src/components/views/ExtensionsView.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Ramais SIP (PJSIP Realtime)
            </h1>
            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-mono">
              res_pjsip • Asterisk 20
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Gerenciamento de ramais IP, telefones físicos, softphones e endpoints WebRTC no padrão brasileiro.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Novo Ramal PJSIP
        </button>
      </div>`;

const replacement1 = `  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600 fill-blue-600" />
            Central de Ramais
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Gestão PJSIP para Softphones, Telefones IP de Mesa e Endpoints WebRTC.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 bg-slate-900 text-white border border-slate-700 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm">
              res_pjsip
            </span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-md shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" /> Provisionar Ramal
            </button>
        </div>
      </div>`;
content = content.replace(target1, replacement1);


const target2 = `      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por número, nome ou Caller ID do ramal..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent text-xs text-slate-700 placeholder-slate-400 w-full focus:outline-none"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-slate-400 hover:text-slate-600 text-xs px-2 py-0.5 rounded"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Extensions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredExtensions.map((ext) => (
          <div
            key={ext.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-4 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center relative shadow-sm">
                    {ext.status === 'online' ? (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                    ) : (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-slate-300 border-2 border-white rounded-full" />
                    )}
                    <Phone className={\`w-4 h-4 \${ext.status === 'online' ? 'text-emerald-600' : 'text-slate-400'}\`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-lg font-mono">{ext.number}</span>
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{ext.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopyCreds(ext)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                    title="Copiar SIP Secret e SIP Server"
                  >
                    <Key className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(ext)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Editar Ramal"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(ext.id, ext.number)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Excluir Ramal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5" /> Caller ID (Bina)
                  </span>
                  <span className="font-mono text-slate-900 font-medium">"{ext.callerId}" &lt;{ext.number}&gt;</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5" /> Contexto (Dialplan)
                  </span>
                  <span className="font-mono text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">{ext.context}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" /> Transports
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded">UDP</span>
                    {ext.webrtc && <span className="bg-emerald-50 text-emerald-700 font-mono px-1.5 py-0.5 rounded border border-emerald-100">WSS (WebRTC)</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {ext.status === 'online' ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> REGISTERED
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> UNREACHABLE
                  </span>
                )}
              </div>
              <button
                onClick={() => onOpenWebphone(ext.number)}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition"
              >
                Logar no Webphone
              </button>
            </div>
          </div>
        ))}

        {filteredExtensions.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
            <Users className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm font-semibold">Nenhum ramal PJSIP encontrado.</p>
            <p className="text-xs mt-1">Ajuste o termo de busca ou adicione um novo.</p>
          </div>
        )}
      </div>`;

const replacement2 = `      {/* Filter / Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
           <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          placeholder="Pesquisar numeração, nome do titular, ou CID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent text-sm font-bold text-slate-700 placeholder-slate-400 w-full focus:outline-none"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 text-xs px-3 py-1.5 rounded-lg font-bold transition-colors shrink-0"
          >
            Limpar Busca
          </button>
        )}
      </div>

      {/* Extensions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredExtensions.map((ext) => (
          <div
            key={ext.id}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300 p-6 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center relative shadow-inner">
                    {ext.status === 'online' ? (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                    ) : (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-300 border-2 border-white rounded-full" />
                    )}
                    <Phone className={\`w-6 h-6 \${ext.status === 'online' ? 'text-blue-600' : 'text-slate-400'}\`} />
                  </div>
                  <div>
                    <h3 className="font-black text-2xl text-slate-900 tracking-tight font-mono">
                      {ext.number}
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{ext.name}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopyCreds(ext)}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition border border-transparent hover:border-emerald-100"
                    title="Copiar Credenciais (SIP Secret)"
                  >
                    <Key className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(ext)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition border border-transparent hover:border-blue-100"
                    title="Editar Instância"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3 mb-4">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5" /> Identity (CID)
                  </span>
                  <span className="font-mono text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm truncate max-w-[130px]">"{ext.callerId}"</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5" /> Dialplan Context
                  </span>
                  <span className="font-mono text-blue-700 font-black bg-blue-100 px-2 py-0.5 rounded shadow-sm">{ext.context}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" /> Transports
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-slate-200 text-slate-700 font-mono font-bold px-2 py-0.5 rounded">UDP</span>
                    {ext.webrtc && <span className="bg-emerald-100 text-emerald-800 font-mono font-black px-2 py-0.5 rounded border border-emerald-200 shadow-sm">WSS / DTLS</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {ext.status === 'online' ? (
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Registered
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> Unreachable
                  </span>
                )}
              </div>
              <button
                onClick={() => onOpenWebphone(ext.number)}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline transition flex items-center gap-1"
              >
                Launch WebRTC <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

        {filteredExtensions.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-3xl border-2 border-slate-200 border-dashed">
            <Users className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm font-black uppercase tracking-wider text-slate-500">Zero Endpoints Locais</p>
            <p className="text-[11px] font-medium mt-1">Altere sua chave de busca ou provisione um novo PJSIP no cluster.</p>
          </div>
        )}
      </div>`;

content = content.replace(target2, replacement2);

fs.writeFileSync(file, content);
console.log('Patched ExtensionsView');

import fs from 'fs';
const file = 'src/components/WebphoneModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `            ) : callState === 'connected' && activeTab === 'extension' ? (
              /* Connected Extension Screen */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3 shadow-inner">
                  <Headphones className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-0.5">
                  {extInfo?.name || \`Ramal \${connectedDestination}\`}
                </h4>
                <p className="text-xs text-slate-500 mb-4">{extInfo?.dept || 'Departamento'} • Ramal {extInfo?.number || connectedDestination}</p>

                <div className="space-y-2 w-full max-w-xs text-left text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Protocolo:</span>
                    <span className="text-slate-800 font-semibold">PJSIP SIP/2.0 UDP</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Codec de Voz:</span>
                    <span className="text-blue-600 font-semibold">Opus HD (48 kHz)</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Criptografia:</span>
                    <span className="text-emerald-600 font-semibold">SRTP / TLS Ativo</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Jitter Buffer:</span>
                    <span className="text-slate-800">4.2 ms (Excelente)</span>
                  </div>
                </div>
              </div>`;

const replacement = `            ) : callState === 'connected' && activeTab === 'extension' ? (
              /* Connected Extension Screen */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                {isVideoCall ? (
                  <div className="w-full h-48 bg-slate-900 rounded-2xl mb-4 relative overflow-hidden border-2 border-slate-800 shadow-inner flex items-center justify-center">
                    {/* Simulated Remote Video */}
                    <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=800')] bg-cover bg-center" />
                    
                    {!isVideoCamOn && (
                      <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-10 backdrop-blur-sm">
                        <VideoOff className="w-8 h-8 text-slate-500" />
                      </div>
                    )}
                    
                    {/* Simulated Local PIP */}
                    <div className="absolute bottom-2 right-2 w-16 h-24 bg-slate-800 rounded-lg border-2 border-slate-600 overflow-hidden shadow-lg z-20">
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400')] bg-cover bg-center" />
                      {!isVideoCamOn && (
                        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center backdrop-blur-md">
                           <VideoOff className="w-4 h-4 text-slate-500" />
                        </div>
                      )}
                    </div>
                    
                    <span className="absolute top-2 left-2 bg-slate-900/60 text-white text-[9px] font-mono px-1.5 py-0.5 rounded backdrop-blur-sm z-20">
                      H.264 / VP8 (WebRTC)
                    </span>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3 shadow-inner">
                    <Headphones className="w-8 h-8" />
                  </div>
                )}
                
                <h4 className="text-sm font-bold text-slate-900 mb-0.5">
                  {extInfo?.name || \`Ramal \${connectedDestination}\`}
                </h4>
                <p className="text-xs text-slate-500 mb-4">{extInfo?.dept || 'Departamento'} • Ramal {extInfo?.number || connectedDestination}</p>

                <div className="space-y-2 w-full max-w-xs text-left text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Protocolo:</span>
                    <span className="text-slate-800 font-semibold">PJSIP SIP/2.0 {isVideoCall ? 'WSS' : 'UDP'}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">{isVideoCall ? 'Codecs' : 'Codec de Voz'}:</span>
                    <span className="text-blue-600 font-semibold">{isVideoCall ? 'Opus + VP8' : 'Opus HD'}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Criptografia:</span>
                    <span className="text-emerald-600 font-semibold">SRTP / DTLS</span>
                  </div>
                </div>
              </div>`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('Patched WebphoneModal Video UI');

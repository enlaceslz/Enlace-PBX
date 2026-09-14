const fs = require('fs');
let content = fs.readFileSync('src/components/views/CdrAndRecordingsView.tsx', 'utf-8');

const floatingRegex = /{\/\* Floating Audio Player Toolbar \*\/}[\s\S]*?{\/\* Progress bar and waveform \*\/}/;

const newFloatingSection = `{/* Floating Audio Player Toolbar */}
      {activeAudioCdr && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-3xl bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handlePlayRecording(activeAudioCdr)}
                className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition shadow-lg shadow-blue-900/50 flex-shrink-0"
              >
                {isPlayingAudio ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-1" />
                )}
              </button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-100">
                    {activeAudioCdr.caller} &rarr; {activeAudioCdr.callee}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700">
                    {activeAudioCdr.duration}s
                  </span>
                  <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 ml-2">
                    <Radio className="w-3 h-3 animate-pulse" />
                    Opus Stereo
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate max-w-lg">
                  {activeAudioCdr.summary || 'Reproduzindo stream de voz da gravação...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedCdrForModal(activeAudioCdr)}
                className="px-3 py-1.5 text-xs text-blue-400 hover:bg-blue-900/30 hover:text-blue-300 rounded-lg transition font-semibold flex items-center gap-1.5 border border-transparent hover:border-blue-900/50"
              >
                <FileText className="w-4 h-4" />
                Ver Transcrição
              </button>
              <button
                onClick={() => {
                  stopSpeaking();
                  setIsPlayingAudio(false);
                  setActiveAudioCdr(null);
                }}
                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-slate-300 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Progress bar and waveform */}`;

content = content.replace(floatingRegex, newFloatingSection);

// Update progress bar inside floating player
const progressRegex = /{\/\* Progress bar and waveform \*\/}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\)}/;

const newProgressSection = `{/* Progress bar and waveform */}
          <div className="space-y-1.5">
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden shadow-inner">
              <div
                className="bg-blue-500 h-full transition-all duration-300 rounded-full relative"
                style={{ width: \`\${audioProgress}%\` }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/20 blur-[2px]" />
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono font-bold px-1">
              <span>{Math.round((audioProgress / 100) * (activeAudioCdr.duration || 10))}s</span>
              <span>{activeAudioCdr.duration}s</span>
            </div>
          </div>
        </div>
      )}`;

content = content.replace(progressRegex, newProgressSection);

fs.writeFileSync('src/components/views/CdrAndRecordingsView.tsx', content);


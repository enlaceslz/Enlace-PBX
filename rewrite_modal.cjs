const fs = require('fs');

let content = fs.readFileSync('src/components/views/CdrAndRecordingsView.tsx', 'utf-8');

// Add import
if (!content.includes("RecordingWaveformPlayer")) {
  content = content.replace(
    "import { CdrRecord, Tenant } from '../../types/pbx';",
    "import { CdrRecord, Tenant } from '../../types/pbx';\nimport { RecordingWaveformPlayer } from './RecordingWaveformPlayer';"
  );
}

// Modify the Modal (which starts around line 966)
// We will replace the existing Transcription and Audio blocks inside the modal.

const modalRegex = /{\/\* Full Transcription \*\/}[\s\S]*?{\/\* Modal footer buttons \*\/}/;

const newModalSection = `{/* New Recording & Transcription Panel */}
              <div className="flex flex-col gap-4">
                {selectedCdrForModal.recordingUrl && (
                  <RecordingWaveformPlayer
                    cdr={selectedCdrForModal}
                    isPlaying={activeAudioCdr?.id === selectedCdrForModal.id && isPlayingAudio}
                    progress={activeAudioCdr?.id === selectedCdrForModal.id ? audioProgress : 0}
                    onTogglePlay={handlePlayRecording}
                  />
                )}
                
                {selectedCdrForModal.transcription ? (
                  <div className="mt-2">
                    <label className="text-slate-500 uppercase text-[10px] font-bold tracking-wider block mb-1.5 font-mono flex items-center justify-between">
                      <span>Transcrição Integral (Gemini AI):</span>
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Concluída</span>
                    </label>
                    <pre className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-slate-300 font-mono text-[11px] max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                      {selectedCdrForModal.transcription}
                    </pre>
                  </div>
                ) : (
                  <div className="mt-2 p-6 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50 flex flex-col items-center justify-center">
                    <Bot className="w-10 h-10 text-slate-300 mb-3" />
                    <h4 className="text-slate-800 font-bold mb-1">Análise de Conteúdo Pendente</h4>
                    <p className="text-xs text-slate-500 max-w-sm mb-4">
                      Solicite à MaIA (Gemini) a transcrição integral e a extração de sentimento semântico deste áudio.
                    </p>
                    <button 
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center gap-2 transition shadow-md shadow-purple-200 text-sm"
                      onClick={() => alert('Integração com Gemini API será chamada aqui.')}
                    >
                      <Sparkles className="w-4 h-4" />
                      Gerar Transcrição com IA
                    </button>
                  </div>
                )}
              </div>

              {/* Modal footer buttons */}`;

content = content.replace(modalRegex, newModalSection);

// Also remove the bottom floating toolbar entirely to clean up the UI, since we now have it inside the modal.
// Or wait, the floating toolbar is nice if you are browsing the list while listening. Let's keep it but improve it.

fs.writeFileSync('src/components/views/CdrAndRecordingsView.tsx', content);


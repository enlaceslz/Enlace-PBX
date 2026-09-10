import fs from 'fs';
const file = 'src/components/views/ExtensionsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Ensure Video icon is imported
if (!content.includes('Video')) {
  content = content.replace(
    `import {`,
    `import {\n  Video,`
  );
}

// Add videoEnabled to formData initial state
content = content.replace(
  `allowAiTransfer: true,
  });`,
  `allowAiTransfer: true,
    videoEnabled: true,
  });`
);

// Add videoEnabled to handleSubmit fetch call
content = content.replace(
  `allowAiTransfer: formData.allowAiTransfer,
        }),`,
  `allowAiTransfer: formData.allowAiTransfer,
          videoEnabled: formData.videoEnabled,
        }),`
);

// Reset videoEnabled after submit
content = content.replace(
  `allowAiTransfer: true,
      });`,
  `allowAiTransfer: true,
        videoEnabled: true,
      });`
);

// Add videoEnabled checkbox to the form (next to allowAiTransfer)
const toggleBlock = `                  <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                    <input
                      type="checkbox"
                      checked={formData.allowAiTransfer}
                      onChange={(e) => setFormData({ ...formData, allowAiTransfer: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-800">Transferência IA</p>
                      <p className="text-xs text-slate-500">Permitir que agentes de IA transfiram para este ramal</p>
                    </div>
                  </label>`;

const newToggleBlock = toggleBlock + `

                  <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                    <input
                      type="checkbox"
                      checked={formData.videoEnabled}
                      onChange={(e) => setFormData({ ...formData, videoEnabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-800">Chamadas de Vídeo (H.264/VP8)</p>
                      <p className="text-xs text-slate-500">Habilitar suporte WebRTC Video & H.264 para este endpoint</p>
                    </div>
                  </label>`;

content = content.replace(toggleBlock, newToggleBlock);

// Display a Video tag in the grid cards if videoEnabled is true
const cardTagsBlock = `{ext.webrtc && <span className="bg-emerald-100 text-emerald-800 font-mono font-black px-2 py-0.5 rounded border border-emerald-200 shadow-sm">WSS / DTLS</span>}`;
const newCardTagsBlock = `{ext.webrtc && <span className="bg-emerald-100 text-emerald-800 font-mono font-black px-2 py-0.5 rounded border border-emerald-200 shadow-sm">WSS / DTLS</span>}
                    {ext.videoEnabled && <span className="bg-purple-100 text-purple-800 font-mono font-black px-2 py-0.5 rounded border border-purple-200 shadow-sm flex items-center gap-1"><Video className="w-3 h-3" /> Vídeo</span>}`;

content = content.replace(cardTagsBlock, newCardTagsBlock);

fs.writeFileSync(file, content);
console.log('Patched ExtensionsView for Video Support');

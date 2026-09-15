import fs from 'fs';
const file = 'src/components/WebphoneModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add Video icons
if (!content.includes('Video,')) {
  content = content.replace(
    `  Forward,`,
    `  Forward,
  Video,
  VideoOff,`
  );
}

// Add state for Video
content = content.replace(
  `const [isOnHold, setIsOnHold] = useState(false);`,
  `const [isOnHold, setIsOnHold] = useState(false);\n  const [isVideoCall, setIsVideoCall] = useState(false);\n  const [isVideoCamOn, setIsVideoCamOn] = useState(true);`
);

// End Call - reset video state
content = content.replace(
  `setCallState('idle');`,
  `setCallState('idle');\n    setIsVideoCall(false);`
);

// Call Controls Footer - add Video toggle in Idle state
const callFooterStart = `{callState === 'idle' ? (
              <button
                onClick={() => startCall()}
                disabled={!dialNumber}`;
const callFooterEnd = `                <Phone className="w-4 h-4 fill-white" />
                Ligar para {dialNumber || '...'}
              </button>
            ) : (`

const idleButtons = `{callState === 'idle' ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setIsVideoCall(false); startCall(); }}
                    disabled={!dialNumber}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition active:scale-98"
                  >
                    <Phone className="w-4 h-4 fill-white" />
                    Ligar {dialNumber ? \`(\${dialNumber})\` : ''}
                  </button>
                  <button
                    onClick={() => { setIsVideoCall(true); startCall(); }}
                    disabled={!dialNumber}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition active:scale-98"
                  >
                    <Video className="w-4 h-4 fill-white" />
                    Vídeo
                  </button>
                </div>
              </div>
            ) : (`;

content = content.replace(
  `{callState === 'idle' ? (
              <button
                onClick={() => startCall()}
                disabled={!dialNumber}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition active:scale-98"
              >
                <Phone className="w-4 h-4 fill-white" />
                Ligar para {dialNumber || '...'}
              </button>
            ) : (`,
  idleButtons
);

// Call Controls Footer - add Video toggle in Connected state
const connectedButtons = `              <div className="flex items-center justify-between gap-3">
                {isVideoCall && (
                  <button
                    onClick={() => setIsVideoCamOn(!isVideoCamOn)}
                    className={\`p-3 rounded-xl border transition flex items-center justify-center \${
                      !isVideoCamOn
                        ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                        : 'bg-purple-100 border-purple-200 text-purple-700 hover:bg-purple-200'
                    }\`}
                    title={isVideoCamOn ? 'Desligar Câmera' : 'Ligar Câmera'}
                  >
                    {isVideoCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </button>
                )}`;
content = content.replace(
  `              <div className="flex items-center justify-between gap-3">`,
  connectedButtons
);


fs.writeFileSync(file, content);
console.log('Patched WebphoneModal buttons');

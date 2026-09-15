import fs from 'fs';
const file = 'src/components/Navbar.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-teal-700 flex items-center justify-center shadow-md shadow-blue-600/20 border border-sky-400/30">
            <Phone className="w-5 h-5 text-white font-black fill-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                Enlace<span className="text-blue-600">-PBX</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                Asterisk 20 + Gemini
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Telefonia inteligente. Simples, aberta e brasileira.
            </p>
          </div>
        </div>`;

const replacement = `        <div className="flex items-center gap-3">
          <img src="/logo-enlace.png" alt="Enlace PBX Logo" className="h-10 w-auto object-contain" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                Asterisk 20 + Gemini
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Telefonia inteligente. Simples, aberta e brasileira.
            </p>
          </div>
        </div>`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Patched Navbar Logo');

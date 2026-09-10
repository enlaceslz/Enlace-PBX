import fs from 'fs';
const file = 'src/components/Navbar.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `        <div className="flex items-center gap-3">
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

const replacement = `        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Enlace PBX Logo" className="h-12 w-auto object-contain" />
          <div className="hidden sm:block">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
              Asterisk 20 + Gemini
            </span>
          </div>
        </div>`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Patched Navbar Logo 2');

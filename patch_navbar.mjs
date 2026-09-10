import fs from 'fs';
const file = 'src/components/Navbar.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `        {/* Webphone Toggle Button */}`;

const replacement = `        <div className="hidden md:flex items-center gap-1.5 mr-2">
           <a href="https://enlace.slz.be" target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded bg-slate-50 border border-slate-200 text-[9px] font-black uppercase text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-colors">
             Open Source by Enlace
           </a>
        </div>
        {/* Webphone Toggle Button */}`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Patched Navbar with Open Source mention');

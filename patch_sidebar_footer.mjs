import fs from 'fs';
const file = 'src/components/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `      {/* Webphone Quick Drawer Footer */}
      <div className="p-4 border-t border-slate-200 bg-white/90 backdrop-blur-md relative z-10">`;

const replacement = `      {/* Open Source Contribution */}
      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-center">
        <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
          O Enlace-PBX é uma contribuição open-source da <a href="https://enlace.slz.be" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Enlace Telecom</a> e <strong>André LJP</strong>.
          <br />
          <a href="mailto:slzenlace@gmail.com" className="hover:text-slate-600 transition-colors">slzenlace@gmail.com</a>
        </p>
      </div>

      {/* Webphone Quick Drawer Footer */}
      <div className="p-4 border-t border-slate-200 bg-white/90 backdrop-blur-md relative z-10">`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Patched Sidebar with Open Source mention');

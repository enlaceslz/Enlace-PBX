import fs from 'fs';
const file = 'src/components/views/HelpManualView.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `        </div>
      </div>
    </div>
  );
};`;

const replacement = `        </div>
      </div>

      {/* Open Source Contribution Footer */}
      <div className="mt-12 pt-6 border-t border-slate-200 text-center flex flex-col items-center justify-center animate-in fade-in duration-700">
        <p className="text-xs text-slate-500 font-medium max-w-2xl">
          O <strong className="text-slate-700">Enlace-PBX</strong> é uma contribuição orgulhosa para a comunidade open-source. Desenvolvido para democratizar a comunicação inteligente no Brasil.
        </p>
        <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-center gap-2 flex-wrap">
          <span>Criado por <strong>André LJP</strong></span>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <a href="https://enlace.slz.be" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 hover:underline transition">Enlace Telecom</a>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <a href="mailto:slzenlace@gmail.com" className="hover:text-slate-600 transition">slzenlace@gmail.com</a>
        </p>
      </div>
    </div>
  );
};`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Patched HelpManualView with Open Source mention');

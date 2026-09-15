const fs = require('fs');
let help = fs.readFileSync('src/components/views/HelpManualView.tsx', 'utf-8');

const updateSection = `
                {/* Botão de Atualização Integrada */}
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 mt-8 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-600" /> Atualizações via GitHub (OTA)
                </h3>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-8">
                  <p className="text-xs text-slate-700 mb-3">
                    Como o projeto <strong>Enlace PBX OSS</strong> é de código aberto e hospedado no GitHub, a plataforma conta com um sistema de atualização via OTA (Over-The-Air) disponível diretamente na interface.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-600 mb-4 ml-2">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Não é necessário acessar o terminal SSH em produção para puxar novas versões.
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      O botão "Atualizar Sistema" no painel de Infraestrutura executa <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">git pull origin main</code> e reconstrói o frontend e backend.
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Bloqueio de segurança integrado: O sistema não permite atualizações se houver chamadas em curso para evitar interrupções de serviço.
                    </li>
                  </ul>
                  <button
                    onClick={() => onNavigate && onNavigate('infra_settings')}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition inline-flex items-center gap-2"
                  >
                    Acessar Infraestrutura & Rede <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Requisitos de Hardware & Rede */}`;

help = help.replace(
  /                \{\/\* Requisitos de Hardware \& Rede \*\/\}/g,
  updateSection
);

fs.writeFileSync('src/components/views/HelpManualView.tsx', help);
console.log('Help manual updated');

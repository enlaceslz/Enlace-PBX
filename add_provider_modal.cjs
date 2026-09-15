const fs = require('fs');

let content = fs.readFileSync('src/components/views/AiGatewayView.tsx', 'utf-8');

// Step 1: Add new state variables
const stateRegex = /  const \[isCreateModalOpen, setIsCreateModalOpen\] = useState\(false\);/g;
const newStates = `  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [providerFormData, setProviderFormData] = useState({
    name: '',
    providerType: '9router',
    baseUrl: 'https://9router.enlace.slz.br',
    apiKey: '',
    defaultModel: '9router-voice-pro'
  });
  const [isSavingProvider, setIsSavingProvider] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);`;

content = content.replace(stateRegex, newStates);

// Step 2: Update the Add button to open the modal
const oldBtnRegex = /onClick=\{\(\) => \{\n\s*alert\('Funcionalidade de adicionar novo provedor via interface será implementada\. API Keys são salvas via Server-Side\.'\);\n\s*\}\}/g;
const newBtn = `onClick={() => {
                setProviderFormData({ name: 'Meu Endpoint 9Router', providerType: '9router', baseUrl: 'https://9router.enlace.slz.br', apiKey: '', defaultModel: '9router-voice-pro' });
                setIsProviderModalOpen(true);
              }}`;

content = content.replace(oldBtnRegex, newBtn);

// Step 3: Add Provider Modal JSX at the end of the return
const modalJSX = `
      {/* ADD PROVIDER MODAL */}
      {isProviderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-600" /> Adicionar Endpoint IA
              </h3>
              <button
                onClick={() => setIsProviderModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded text-slate-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-4 text-left">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nome da Conexão
                </label>
                <input
                  type="text"
                  value={providerFormData.name}
                  onChange={(e) => setProviderFormData({ ...providerFormData, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tipo de Provedor
                </label>
                <select
                  value={providerFormData.providerType}
                  onChange={(e) => {
                    const t = e.target.value;
                    let url = providerFormData.baseUrl;
                    let mod = providerFormData.defaultModel;
                    if (t === '9router') {
                      url = 'https://9router.enlace.slz.br';
                      mod = '9router-voice-pro';
                    } else if (t === 'gemini_api' || t === 'gemini_live') {
                      url = '';
                      mod = 'gemini-flash-latest';
                    } else if (t === 'vertex_ai') {
                      url = '';
                      mod = 'gemini-3.8-flash';
                    }
                    setProviderFormData({ ...providerFormData, providerType: t, baseUrl: url, defaultModel: mod });
                  }}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="9router">9Router (Gateway Personalizado)</option>
                  <option value="gemini_live">Google Gemini Live</option>
                  <option value="gemini_api">Google Gemini API</option>
                  <option value="vertex_ai">Vertex AI Enterprise</option>
                  <option value="custom">Outro (Custom API)</option>
                </select>
              </div>

              {['9router', 'custom'].includes(providerFormData.providerType) && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    URL Endpoint (Base URL)
                  </label>
                  <input
                    type="url"
                    value={providerFormData.baseUrl}
                    onChange={(e) => setProviderFormData({ ...providerFormData, baseUrl: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                    placeholder="ex: https://9router.enlace.slz.br"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Apenas URL. O sistema resolve os endpoints específicos.</p>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Chave de API (Secret Key)
                </label>
                <input
                  type="password"
                  value={providerFormData.apiKey}
                  onChange={(e) => setProviderFormData({ ...providerFormData, apiKey: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                  placeholder="sk-••••••••••••••••"
                />
                <p className="text-[10px] text-orange-600 mt-1 font-semibold">Sua chave é gravada estritamente no backend (Server-Side) de forma mascarada.</p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
              <button
                onClick={() => setIsProviderModalOpen(false)}
                className="flex-1 py-2 text-slate-600 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!providerFormData.apiKey) {
                    alert('Por favor, informe a Chave de API.');
                    return;
                  }
                  setIsSavingProvider(true);
                  try {
                    const token = localStorage.getItem('enlace_jwt');
                    await fetch('/api/v1/ai/providers', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${token}\`
                      },
                      body: JSON.stringify(providerFormData)
                    });
                    setIsProviderModalOpen(false);
                    onRefresh();
                  } catch (err) {
                    alert('Erro ao salvar provedor.');
                  } finally {
                    setIsSavingProvider(false);
                  }
                }}
                disabled={isSavingProvider}
                className="flex-1 py-2 text-white bg-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {isSavingProvider ? 'Salvando...' : 'Adicionar Conexão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};`;

content = content.replace(/    <\/div>\n  \);\n\};\n?$/, modalJSX);

fs.writeFileSync('src/components/views/AiGatewayView.tsx', content);
console.log('Modal added to AiGatewayView');

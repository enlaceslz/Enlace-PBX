const fs = require('fs');
let content = fs.readFileSync('src/components/views/InfraSettingsView.tsx', 'utf-8');

// 1. Add state variables for the modal
const newStates = `  const [activeTab, setActiveTab] = useState<'overview' | 'network' | 'ssl' | 'services' | 'update'>('overview');
  const [updatingSystem, setUpdatingSystem] = useState(false);
  
  // States for Update Modal
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [activeCallsBeforeUpdate, setActiveCallsBeforeUpdate] = useState<number | null>(null);
  const [updateConfirmText, setUpdateConfirmText] = useState('');
  const [checkingUpdateHealth, setCheckingUpdateHealth] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const openUpdateModal = async () => {
    setCheckingUpdateHealth(true);
    setShowUpdateModal(true);
    try {
      const res = await fetch('/api/v1/health', {
        headers: { 'Authorization': \`Bearer \${localStorage.getItem('enlace_jwt')}\` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveCallsBeforeUpdate(data.activeCalls || 0);
      } else {
        setActiveCallsBeforeUpdate(0);
      }
    } catch (e) {
      setActiveCallsBeforeUpdate(0);
    }
    setCheckingUpdateHealth(false);
  };

  const handleUpdateSystem = async () => {
    if (activeCallsBeforeUpdate !== null && activeCallsBeforeUpdate > 0 && updateConfirmText !== 'ATUALIZAR') {
      return;
    }
    setUpdatingSystem(true);
    try {
      const response = await fetch('/api/v1/system/update', {
        method: 'POST',
        headers: { 'Authorization': \`Bearer \${localStorage.getItem('enlace_jwt')}\` }
      });
      if (response.ok) {
        setUpdateSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 15000);
      } else {
        alert('Erro ao iniciar a atualização.');
        setUpdatingSystem(false);
      }
    } catch (e) {
      console.error(e);
      alert('Falha na comunicação.');
      setUpdatingSystem(false);
    }
  };`;

content = content.replace(
  /const \[activeTab[^]+?const handleUpdateSystem = async \(\) => \{[^]+?  \};/m,
  newStates
);

// 2. Change the onClick of the update button to openUpdateModal
content = content.replace(
  'onClick={handleUpdateSystem}',
  'onClick={openUpdateModal}'
);

// 3. Append the Modal JSX before the final closing div
const updateModalJsx = `
      {/* UPDATE MODAL */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
            {updateSuccess ? (
              <div className="p-10 text-center space-y-6">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Sistema em Atualização</h3>
                  <p className="text-slate-600 mt-2">
                    A plataforma Enlace-PBX está executando o git pull e recompilando os módulos.
                    Por favor, aguarde. A página será recarregada automaticamente em alguns segundos.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Confirmar Atualização de Sistema
                  </h3>
                  <button onClick={() => !updatingSystem && setShowUpdateModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                    <span className="sr-only">Fechar</span>
                    &times;
                  </button>
                </div>
                
                <div className="p-6 space-y-6">
                  {checkingUpdateHealth ? (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-500 gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                      <span className="text-sm">Verificando chamadas em andamento...</span>
                    </div>
                  ) : (
                    <>
                      {activeCallsBeforeUpdate !== null && activeCallsBeforeUpdate > 0 ? (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
                          <div className="flex items-center gap-3 text-red-700">
                            <Phone className="w-6 h-6 animate-pulse" />
                            <h4 className="font-bold">Atenção Crítica: Chamadas Ativas</h4>
                          </div>
                          <p className="text-sm text-red-600">
                            Existem <strong>{activeCallsBeforeUpdate}</strong> chamadas ativas neste momento. 
                            O processo de atualização reiniciará o serviço e <strong>todas as ligações serão derrubadas.</strong>
                          </p>
                          
                          <div className="pt-3">
                            <label className="block text-xs font-bold text-red-700 mb-1.5 uppercase">
                              Digite "ATUALIZAR" para forçar
                            </label>
                            <input
                              type="text"
                              value={updateConfirmText}
                              onChange={(e) => setUpdateConfirmText(e.target.value)}
                              placeholder="ATUALIZAR"
                              className="w-full bg-white border border-red-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
                          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-bold text-emerald-900">Seguro para Atualizar</h4>
                            <p className="text-sm text-emerald-700 mt-1">
                              Não há ligações ativas no PBX no momento. A atualização levará cerca de 10 a 15 segundos.
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                          <li>Sincronização com o repositório remoto (git pull).</li>
                          <li>Instalação de novas dependências, se houver.</li>
                          <li>Restart automático do núcleo (PM2).</li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>

                {!checkingUpdateHealth && (
                  <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      onClick={() => setShowUpdateModal(false)}
                      disabled={updatingSystem}
                      className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleUpdateSystem}
                      disabled={updatingSystem || (activeCallsBeforeUpdate !== null && activeCallsBeforeUpdate > 0 && updateConfirmText !== 'ATUALIZAR')}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {updatingSystem ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Atualizando...</>
                      ) : (
                        <><Zap className="w-4 h-4" /> Executar Atualização</>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
`;

content = content.replace(/    <\/div>\n  \);\n};\n?$/, updateModalJsx + '    </div>\n  );\n};\n');

fs.writeFileSync('src/components/views/InfraSettingsView.tsx', content);
console.log('Update Modal added');

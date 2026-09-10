import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle2, History, Zap, Play, ArrowLeft } from 'lucide-react';

export const QuickSetupView: React.FC = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    prefix: '41',
    quantity: '10',
    startNumber: '1',
    trunkName: 'SIP-DDR-PRINCIPAL',
  });
  
  const [preview, setPreview] = useState<{extensions: any[], trunks: any[]} | null>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchSnapshots = async () => {
    try {
      const res = await fetch('/api/v1/setup/snapshots');
      const data = await res.json();
      setSnapshots(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const handlePreview = async () => {
    try {
      const res = await fetch('/api/v1/setup/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      setPreview(data);
      setStep(2);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const res = await fetch('/api/v1/setup/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`${data.generatedCount} ramais e troncos gerados com sucesso.`);
        fetchSnapshots();
        setStep(3);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsApplying(false);
    }
  };

  const handleRollback = async (snapshotId: string) => {
    try {
      const res = await fetch('/api/v1/setup/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Rollback executado com sucesso! A configuração foi revertida.');
        fetchSnapshots();
      } else {
        alert('Erro ao realizar rollback.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Zap className="w-6 h-6 text-blue-600" />
          Quick Setup (Geração em Massa)
        </h2>
        <p className="text-sm text-slate-500 mt-1">Crie centenas de ramais, rotas e troncos instantaneamente com proteção de Snapshot (Rollback).</p>
      </div>

      {/* TABS / WIZARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Wizard Panel */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200">
            <div className={`flex-1 py-4 text-center font-semibold text-sm ${step === 1 ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>1. Configuração</div>
            <div className={`flex-1 py-4 text-center font-semibold text-sm ${step === 2 ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>2. Preview</div>
            <div className={`flex-1 py-4 text-center font-semibold text-sm ${step === 3 ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>3. Conclusão</div>
          </div>

          <div className="p-6">
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Prefixo do Ramal</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
                      value={formData.prefix}
                      onChange={e => setFormData({...formData, prefix: e.target.value})}
                      placeholder="Ex: 41"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
                      value={formData.quantity}
                      onChange={e => setFormData({...formData, quantity: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Número Inicial (sufixo)</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
                      value={formData.startNumber}
                      onChange={e => setFormData({...formData, startNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Tronco Primário</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
                      value={formData.trunkName}
                      onChange={e => setFormData({...formData, trunkName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    onClick={handlePreview}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center gap-2"
                  >
                    Gerar Preview
                  </button>
                </div>
              </div>
            )}

            {step === 2 && preview && (
              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 className="font-semibold text-slate-800 text-sm mb-3">Resumo da Geração</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• {preview.extensions.length} ramais (Ex: {preview.extensions[0]?.number} a {preview.extensions[preview.extensions.length-1]?.number})</li>
                    <li>• {preview.trunks.length} troncos SIP PJSIP</li>
                    <li>• Criação automática de usuários vinculados</li>
                  </ul>
                </div>
                
                <div className="flex justify-between pt-4">
                  <button 
                    onClick={() => setStep(1)}
                    className="px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </button>
                  <button 
                    onClick={handleApply}
                    disabled={isApplying}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" /> {isApplying ? 'Aplicando...' : 'Aplicar e Salvar Snapshot'}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-center py-10 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Setup Concluído!</h3>
                <p className="text-slate-500 text-sm">{successMessage}</p>
                <div className="pt-6">
                  <button 
                    onClick={() => { setStep(1); setPreview(null); }}
                    className="px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50"
                  >
                    Realizar Novo Setup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Snapshots Panel */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-800 text-sm">Snapshots & Rollback</h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            {snapshots.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Nenhum snapshot gerado ainda.</p>
            ) : (
              <div className="space-y-3">
                {snapshots.map(snap => (
                  <div key={snap.id} className="p-3 border border-slate-200 rounded-lg hover:border-blue-400 bg-white">
                    <p className="font-semibold text-sm text-slate-800">{snap.name}</p>
                    <p className="text-[10px] text-slate-500 mb-3">{new Date(snap.createdAt).toLocaleString()}</p>
                    <button 
                      onClick={() => {
                        if(confirm('Isso reverterá os dados para o estado deste snapshot. Confirma?')) {
                          handleRollback(snap.id);
                        }
                      }}
                      className="w-full px-3 py-1.5 bg-rose-50 text-rose-700 text-xs font-semibold rounded hover:bg-rose-100 transition-colors"
                    >
                      Executar Rollback
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

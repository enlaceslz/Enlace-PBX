import React, { useState, useEffect } from 'react';
import { 
  Zap, Play, ArrowLeft, ArrowRight, CheckCircle2, History, Database, ShieldAlert,
  Server, PhoneCall, Bot, Building2, Headset, HardDrive, Cpu, Blocks,
  AlertTriangle, RotateCcw
} from 'lucide-react';
import { getAuthHeaders } from '../../utils/api';

interface Snapshot {
  id: string;
  name?: string;
  description?: string;
  createdAt?: string;
  timestamp?: string;
}

export const QuickSetupView: React.FC = () => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<'contact_center' | 'corporate' | 'smart_office'>('contact_center');
  
  const [formData, setFormData] = useState({
    prefix: '40',
    quantity: '50',
    startNumber: '00',
    trunkName: 'SIP-TRUNK-01',
    includeAi: true
  });
  
  const [preview, setPreview] = useState<any>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchSnapshots = async () => {
    try {
      const res = await fetch('/api/v1/system/snapshots', { headers: getAuthHeaders() });
      if (!res.ok) {
        setSnapshots([]);
        return;
      }
      const data = await res.json();
      setSnapshots(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erro ao buscar snapshots:', e);
      setSnapshots([]);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const handlePreview = async () => {
    try {
      const res = await fetch('/api/v1/system/quick-setup/preview', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      if (!res.ok) return;
      const data = await res.json();
      setPreview(data);
      setStep(3);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const res = await fetch('/api/v1/system/quick-setup/apply', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.error || 'Erro ao aplicar configuração rápida.');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Operação concluída. ${data.stats?.extensionsCount || 0} ramais gerados. Snapshot de segurança criado.`);
        setStep(4);
        fetchSnapshots();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsApplying(false);
    }
  };

  const handleRollback = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/system/snapshots/${id}/rollback`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        alert('Rollback executado com sucesso! A base de dados e configurações Asterisk foram revertidas.');
        fetchSnapshots();
      } else {
        alert(data.error || 'Erro ao realizar rollback.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <Zap className="w-8 h-8 text-blue-600 fill-blue-600" />
            Express Architect
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Geração massiva de topologia PABX com provisionamento instantâneo e proteção de Snapshots (Rollback seguro).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Wizard Area */}
        <div className="lg:col-span-8">
          
          {/* Custom Stepper */}
          <div className="flex items-center justify-between mb-8 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full z-0"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 rounded-full z-0 transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
            
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-4 transition-all duration-300
                ${step >= s ? 'bg-blue-600 border-white text-white shadow-md' : 'bg-slate-100 border-white text-slate-400'}
              `}>
                {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 min-h-[400px] flex flex-col justify-between relative overflow-hidden transition-all">
            
            {/* Background Accent */}
            {step === 4 && <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />}
            
            {/* STEP 1: Operation Profile */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Perfil da Operação</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Selecione o arquétipo que melhor define a necessidade da matriz.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    onClick={() => setProfile('contact_center')}
                    className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${profile === 'contact_center' ? 'border-blue-600 bg-blue-50/50 shadow-md shadow-blue-900/5' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <Headset className={`w-8 h-8 mb-3 ${profile === 'contact_center' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <h4 className="font-bold text-slate-900 text-sm">Contact Center (Ativo/Receptivo)</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Prioriza filas de atendimento pesado, gravação obrigatória de 100% das chamadas e alta densidade de agentes.</p>
                  </div>
                  
                  <div 
                    onClick={() => setProfile('corporate')}
                    className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${profile === 'corporate' ? 'border-blue-600 bg-blue-50/50 shadow-md shadow-blue-900/5' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <Building2 className={`w-8 h-8 mb-3 ${profile === 'corporate' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <h4 className="font-bold text-slate-900 text-sm">Corporativo Tradicional</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Foco em URAs hierárquicas, ramais departamentais estruturados e grupos de captura segmentados.</p>
                  </div>
                  
                  <div 
                    onClick={() => setProfile('smart_office')}
                    className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${profile === 'smart_office' ? 'border-blue-600 bg-blue-50/50 shadow-md shadow-blue-900/5' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <Bot className={`w-8 h-8 mb-3 ${profile === 'smart_office' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <h4 className="font-bold text-slate-900 text-sm">Smart Office (AI-First)</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Nativa IA: Transbordo exclusivo via Gemini Live, transcrição automática e sem necessidade de terminais SIP físicos.</p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button onClick={() => setStep(2)} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 flex items-center gap-2 transition-all">
                    Continuar Parâmetros <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Parameters */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Dimensionamento em Lote</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Defina as regras de numeração para a geração massiva PJSIP.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Prefixo Base</label>
                    <div className="relative">
                      <Blocks className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                        value={formData.prefix}
                        onChange={e => setFormData({...formData, prefix: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sufixo Inicial</label>
                    <div className="relative">
                      <HardDrive className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="number" 
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                        value={formData.startNumber}
                        onChange={e => setFormData({...formData, startNumber: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Volume Total (Ramais)</label>
                    <div className="relative">
                      <Server className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="number" 
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                        value={formData.quantity}
                        onChange={e => setFormData({...formData, quantity: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Identificador Tronco SIP</label>
                    <div className="relative">
                      <PhoneCall className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                        value={formData.trunkName}
                        onChange={e => setFormData({...formData, trunkName: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-blue-50/50 border border-blue-100 p-4 rounded-xl">
                  <input type="checkbox" checked={formData.includeAi} onChange={e => setFormData({...formData, includeAi: e.target.checked})} className="w-5 h-5 text-blue-600 rounded border-slate-300" id="inc-ai" />
                  <label htmlFor="inc-ai" className="text-sm font-bold text-slate-700 cursor-pointer">Injetar Contexto RAG IA (Gemini) nos novos ramais</label>
                </div>

                <div className="flex justify-between pt-4">
                  <button onClick={() => setStep(1)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 flex items-center gap-2 transition-all">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </button>
                  <button onClick={handlePreview} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center gap-2 transition-all shadow-md shadow-blue-600/20">
                    Compilar Pre-flight <Cpu className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Pre-flight Preview */}
            {step === 3 && preview && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                    Auditoria Pre-flight
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Valide os objetos gerados antes de aplicar no kernel do Asterisk e PostgreSQL.</p>
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-700/50 pb-4">
                    <div className="text-sm font-bold text-slate-300 uppercase tracking-wider">Topologia Resultante</div>
                    <div className="px-2.5 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider rounded border border-amber-500/30">
                      Pendente Aprovação
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                    <div>
                      <div className="text-[10px] text-slate-500 font-mono mb-1">RAMAIS GERADOS</div>
                      <div className="text-2xl font-black text-emerald-400">{preview?.extensions?.length || 0} <span className="text-sm text-slate-400 font-normal">objetos</span></div>
                      <div className="text-xs text-slate-400 font-mono mt-1">Range: {preview?.extensions?.[0]?.number || '---'} → {preview?.extensions?.[(preview?.extensions?.length || 1) - 1]?.number || '---'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 font-mono mb-1">TRONCOS SIP</div>
                      <div className="text-2xl font-black text-blue-400">{preview?.trunks?.length || 0} <span className="text-sm text-slate-400 font-normal">objeto</span></div>
                      <div className="text-xs text-slate-400 font-mono mt-1">ID: {formData.trunkName}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 font-mono mb-1">DIALPLAN CONTEXTS</div>
                      <div className="text-xl font-black text-purple-400">{profile.toUpperCase()}_CTX</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 font-mono mb-1">IA INJECTION</div>
                      <div className="text-xl font-black text-pink-400">{formData.includeAi ? 'Habilitado (Stasis)' : 'Desabilitado'}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">Esta operação executará alterações diretas no banco de dados e enviará comandos <code>core reload</code> para o motor PJSIP. Um Snapshot do estado atual será criado automaticamente para rollback caso necessário.</p>
                </div>

                <div className="flex justify-between pt-4">
                  <button onClick={() => setStep(2)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 flex items-center gap-2 transition-all">
                    <ArrowLeft className="w-4 h-4" /> Cancelar
                  </button>
                  <button 
                    onClick={handleApply} 
                    disabled={isApplying}
                    className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-blue-700 flex items-center gap-2 transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isApplying ? (
                      <><RotateCcw className="w-4 h-4 animate-spin" /> Provisionando PABX...</>
                    ) : (
                      <><Play className="w-4 h-4 fill-white" /> Aplicar e Salvar Snapshot</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Success */}
            {step === 4 && (
              <div className="flex flex-col items-center justify-center text-center py-12 animate-in zoom-in-95 duration-500 relative z-10">
                <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
                  <CheckCircle2 className="w-12 h-12 relative z-10" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Deploy Bem-sucedido!</h3>
                <p className="text-sm text-slate-500 font-medium max-w-md mx-auto">{successMessage}</p>
                
                <div className="mt-10">
                  <button onClick={() => { setStep(1); setPreview(null); }} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg">
                    Realizar Novo Setup Express
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Snapshots / Rollback Sidebar */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-black text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                Time Machine
              </h3>
              <span className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-blue-200">
                Snapshots
              </span>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto bg-slate-50">
              {(!Array.isArray(snapshots) || snapshots.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 opacity-50">
                  <Database className="w-12 h-12 text-slate-400 mb-3" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nenhum ponto de<br/>restauração criado.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {snapshots.map(snap => {
                    const snapName = snap.name || snap.description || `Snapshot ${snap.id}`;
                    const snapDate = snap.createdAt || snap.timestamp || new Date().toISOString();
                    return (
                      <div key={snap.id} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm transition hover:border-blue-300 hover:shadow-md group">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-slate-900 text-sm leading-tight">{snapName}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                              {new Date(snapDate).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
                            <Database className="w-4 h-4" />
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => {
                            if(confirm('ATENÇÃO: Isso reverterá toda a base de dados (PostgreSQL) e arquivos do Asterisk para o estado exato deste snapshot. As conexões ativas cairão. Confirma Rollback Tático?')) {
                              handleRollback(snap.id);
                            }
                          }}
                          className="w-full py-2 bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-rose-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Executar Rollback Tático
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-white">
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed text-center">
                Os snapshots preservam a integridade estrutural (<code>psql_dump</code> e <code>/etc/asterisk</code>). Retenção máxima de 30 dias na nuvem.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

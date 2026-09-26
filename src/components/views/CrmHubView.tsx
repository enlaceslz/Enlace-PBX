import React, { useState, useEffect } from 'react';
import { 
  Plug, RefreshCw, PowerOff, ShieldCheck, Database, 
  Settings, ArrowRightLeft, Webhook, Zap, Activity, 
  Filter, Server, X, CheckCircle2, ChevronRight, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAuthHeaders } from '../../utils/api';

interface CrmProvider {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  isConnected: boolean;
  syncedAt?: string;
  config: Record<string, any>;
}

export const CrmHubView: React.FC = () => {
  const [providers, setProviders] = useState<CrmProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<CrmProvider | null>(null);

  const fetchProviders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/crm/providers', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProviders(Array.isArray(data) ? data : []);
      } else {
        setProviders([]);
      }
    } catch (e) {
      console.error(e);
      setProviders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const toggleConnection = async (provider: CrmProvider) => {
    try {
      const action = provider.isConnected ? 'disconnect' : 'connect';
      await fetch(`/api/v1/crm/providers/${provider.id}/${action}`, { 
        method: 'POST',
        headers: getAuthHeaders()
      });
      fetchProviders();
    } catch (e) {
      console.error(e);
    }
  };

  const openConfigModal = (provider: CrmProvider) => {
    setSelectedProvider(provider);
    setIsConfigModalOpen(true);
  };

  const getProviderLogo = (type: string) => {
    switch (type.toLowerCase()) {
      case 'hubspot':
        return <div className="w-12 h-12 rounded-xl bg-[#ff7a59] flex items-center justify-center text-white shadow-inner"><Database className="w-6 h-6" /></div>;
      case 'pipedrive':
        return <div className="w-12 h-12 rounded-xl bg-[#000000] flex items-center justify-center text-[#00a854] shadow-inner"><Server className="w-6 h-6" /></div>;
      case 'salesforce':
        return <div className="w-12 h-12 rounded-xl bg-[#00a1e0] flex items-center justify-center text-white shadow-inner"><Database className="w-6 h-6" /></div>;
      case 'rdstation':
        return <div className="w-12 h-12 rounded-xl bg-[#364a65] flex items-center justify-center text-white shadow-inner"><Database className="w-6 h-6" /></div>;
      default:
        return <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-white shadow-inner"><Database className="w-6 h-6" /></div>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-blue-600 font-semibold mb-2">
            <Plug className="w-5 h-5" />
            <span>CRM Hub & Integrações</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Ecossistema de Dados</h1>
          <p className="text-slate-500 max-w-2xl text-sm leading-relaxed">
            Sincronize contatos, chamadas (CDR) e transcrições da MaIA com as principais plataformas do mercado.
            A sincronização bidirecional mantém o Asterisk e seu CRM sempre atualizados.
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <button onClick={fetchProviders} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition shadow-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Sincronizar Agora
          </button>
          <button className="px-4 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition shadow-sm flex items-center gap-2">
            <Webhook className="w-4 h-4 text-purple-400" /> Criar Webhook API
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800 shadow-md shadow-slate-900/5">
          <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 z-0" />
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center relative z-10">
            <Zap className="w-6 h-6" />
          </div>
          <div className="relative z-10">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Sincronizações Hoje</div>
            <div className="text-2xl font-black text-white">12,450</div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800 shadow-md shadow-slate-900/5">
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4 z-0" />
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center relative z-10">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="relative z-10">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">APIs Ativas</div>
            <div className="text-2xl font-black text-white">{providers.filter(p => p.isConnected).length} <span className="text-sm font-medium text-slate-500">conexões</span></div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800 shadow-md shadow-slate-900/5">
          <div className="absolute right-0 top-0 w-32 h-32 bg-purple-500/10 rounded-bl-full -mr-4 -mt-4 z-0" />
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center relative z-10">
            <Activity className="w-6 h-6" />
          </div>
          <div className="relative z-10">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Latência Média</div>
            <div className="text-2xl font-black text-white">42ms</div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-slate-100 rounded-2xl"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {providers.map((provider) => (
            <div key={provider.id} className={`bg-white rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between border-2 ${provider.isConnected ? 'border-blue-500/20 shadow-md shadow-blue-500/5' : 'border-slate-200 shadow-sm'}`}>
              
              <div>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    {getProviderLogo(provider.type)}
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight">{provider.name}</h3>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Conector {provider.type}</p>
                    </div>
                  </div>
                  {provider.isConnected ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ativo
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-slate-200">
                      Inativo
                    </span>
                  )}
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-slate-400" /> Sincronização
                    </span>
                    <span className={`text-xs font-bold ${provider.isConnected ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {provider.isConnected ? 'Bidirecional' : 'Desabilitada'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-slate-400" /> Último Sync
                    </span>
                    <span className="text-xs font-mono text-slate-700 font-medium">
                      {provider.syncedAt && provider.isConnected ? new Date(provider.syncedAt).toLocaleString('pt-BR') : '--'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                      <Filter className="w-4 h-4 text-slate-400" /> Entidades
                    </span>
                    <span className="text-xs font-bold text-blue-600">
                      Contatos, Chamadas
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => toggleConnection(provider)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
                    provider.isConnected
                      ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {provider.isConnected ? (
                    <>
                      <PowerOff className="w-4 h-4" /> Desconectar
                    </>
                  ) : (
                    <>
                      <Plug className="w-4 h-4" /> Conectar via OAuth
                    </>
                  )}
                </button>

                {provider.isConnected && (
                  <button 
                    onClick={() => openConfigModal(provider)}
                    className="p-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-xl transition"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add New Integration Card */}
          <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-6 flex flex-col items-center justify-center text-center transition-all hover:bg-slate-100 hover:border-slate-300 cursor-pointer min-h-[350px]">
            <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 text-blue-600">
              <Plug className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Adicionar Integração</h3>
            <p className="text-xs font-medium text-slate-500 max-w-[200px] mb-6">Conecte novos CRMs, ERPs ou endpoints customizados.</p>
            <button className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl shadow-sm hover:shadow transition">
              Explorar Catálogo
            </button>
          </div>
        </div>
      )}

      {/* CRM Configuration Modal */}
      <AnimatePresence>
        {isConfigModalOpen && selectedProvider && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setIsConfigModalOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  {getProviderLogo(selectedProvider.type)}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Configurar {selectedProvider.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">Mapeamento de entidades e regras de sincronização</p>
                  </div>
                </div>
                <button onClick={() => setIsConfigModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600" /> Sincronização de Contatos
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-blue-300 transition">
                      <input type="checkbox" defaultChecked className="mt-1 accent-blue-600" />
                      <div>
                        <div className="text-sm font-bold text-slate-800">Importar Contatos</div>
                        <div className="text-xs text-slate-500 mt-1">Traz contatos do CRM para o Enlace PBX.</div>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-blue-300 transition">
                      <input type="checkbox" defaultChecked className="mt-1 accent-blue-600" />
                      <div>
                        <div className="text-sm font-bold text-slate-800">Exportar Novos</div>
                        <div className="text-xs text-slate-500 mt-1">Envia novos números para o CRM como Leads.</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-600" /> Registro de Atividades (CDR)
                  </h4>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-700">Registrar chamadas recebidas</div>
                      <input type="checkbox" defaultChecked className="toggle-switch accent-blue-600 w-4 h-4" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-700">Registrar chamadas efetuadas</div>
                      <input type="checkbox" defaultChecked className="toggle-switch accent-blue-600 w-4 h-4" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-700">Anexar link da gravação (Player)</div>
                      <input type="checkbox" defaultChecked className="toggle-switch accent-blue-600 w-4 h-4" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-700">Anexar Resumo IA (Transição/Sentimento)</div>
                      <input type="checkbox" defaultChecked className="toggle-switch accent-blue-600 w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" /> Automações de Abertura de Tela
                  </h4>
                  <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-bold text-blue-900">Screen Pop-up (Click-to-Call)</div>
                      <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-[10px] font-bold rounded">BETA</span>
                    </div>
                    <p className="text-xs text-blue-700 mb-3">
                      Abre a ficha do cliente automaticamente no {selectedProvider.name} quando o ramal tocar.
                    </p>
                    <select className="w-full text-sm rounded-lg border-blue-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                      <option>Abrir apenas para chamadas inbound</option>
                      <option>Abrir para todas as chamadas (In/Out)</option>
                      <option>Desativado</option>
                    </select>
                  </div>
                </div>

              </div>

              <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                <button 
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition flex items-center gap-2 shadow-md shadow-blue-500/20"
                >
                  <Save className="w-4 h-4" />
                  Salvar Configurações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

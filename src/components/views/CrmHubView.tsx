import React, { useState, useEffect } from 'react';
import { Plug, RefreshCw, PowerOff, ShieldCheck, Database, Settings, ArrowRightLeft, Webhook, Zap, Activity, Filter, Server } from 'lucide-react';

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

  const fetchProviders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/crm/providers');
      const data = await res.json();
      setProviders(data);
    } catch (e) {
      console.error(e);
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
      await fetch(`/api/v1/crm/providers/${provider.id}/${action}`, { method: 'POST' });
      fetchProviders();
    } catch (e) {
      console.error(e);
    }
  };

  const getProviderLogo = (type: string) => {
    switch (type.toLowerCase()) {
      case 'hubspot':
        return <div className="w-12 h-12 rounded-xl bg-[#ff7a59] flex items-center justify-center text-white shadow-inner"><Database className="w-6 h-6" /></div>;
      case 'pipedrive':
        return <div className="w-12 h-12 rounded-xl bg-[#000000] flex items-center justify-center text-[#00a854] shadow-inner"><Server className="w-6 h-6" /></div>;
      case 'salesforce':
        return <div className="w-12 h-12 rounded-xl bg-[#00a1e0] flex items-center justify-center text-white shadow-inner"><Database className="w-6 h-6" /></div>;
      case 'suitecrm':
        return <div className="w-12 h-12 rounded-xl bg-[#f05c42] flex items-center justify-center text-white shadow-inner"><Database className="w-6 h-6" /></div>;
      default:
        return <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shadow-inner"><Webhook className="w-6 h-6" /></div>;
    }
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <ArrowRightLeft className="w-8 h-8 text-blue-600" />
            CRM & Integration Hub
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Conecte o PBX e os Agentes de IA aos seus CRMs, ERPs e Webhooks para sincronização Omnichannel.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 font-semibold rounded-lg text-sm transition shadow-sm flex items-center gap-2">
            <Webhook className="w-4 h-4 text-purple-500" /> Criar Webhook API
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800">
          <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 z-0" />
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center relative z-10">
            <Zap className="w-6 h-6" />
          </div>
          <div className="relative z-10">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Sincronizações Hoje</div>
            <div className="text-2xl font-black text-white">12,450</div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800">
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4 z-0" />
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center relative z-10">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="relative z-10">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">APIs Ativas</div>
            <div className="text-2xl font-black text-white">{providers.filter(p => p.isConnected).length} <span className="text-sm font-medium text-slate-500">conexões</span></div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 border border-slate-800">
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
                      <ArrowRightLeft className="w-4 h-4 text-slate-400" /> Sincronização Bidirecional
                    </span>
                    <span className={`text-xs font-bold ${provider.isConnected ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {provider.isConnected ? 'Habilitada' : 'Desabilitada'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" /> Último Sync
                    </span>
                    <span className="text-xs font-mono text-slate-700 font-medium">
                      {provider.syncedAt ? new Date(provider.syncedAt).toLocaleString('pt-BR') : 'Nunca sincronizado'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                      <Filter className="w-4 h-4 text-slate-400" /> Mapeamento de Campos
                    </span>
                    <span className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">
                      12 entidades mapeadas
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
                      <PowerOff className="w-4 h-4" /> Desconectar Instância
                    </>
                  ) : (
                    <>
                      <Plug className="w-4 h-4" /> Conectar CRM via OAuth
                    </>
                  )}
                </button>
                {provider.isConnected && (
                  <button className="p-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-xl transition">
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
            <p className="text-xs font-medium text-slate-500 max-w-[200px] mb-6">Conecte novos CRMs, bancos de dados ou endpoints customizados.</p>
            <button className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl shadow-sm hover:shadow transition">
              Explorar Catálogo
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

// Temp mock icon
function Clock(props: any) {
  return <RefreshCw {...props} />;
}

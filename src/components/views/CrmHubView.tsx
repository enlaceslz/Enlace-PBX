import React, { useState, useEffect } from 'react';
import { Plug, RefreshCw, PowerOff, ShieldCheck, Database } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">CRM Integration Hub</h2>
        <p className="text-sm text-slate-500 mt-1">Conecte o Enlace-PBX aos principais sistemas de CRM para sincronização Omnichannel.</p>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-slate-100 rounded-xl"></div>
          <div className="h-32 bg-slate-100 rounded-xl"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((provider) => (
            <div key={provider.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{provider.name}</h3>
                      <p className="text-xs text-slate-500 capitalize">{provider.type}</p>
                    </div>
                  </div>
                  {provider.isConnected ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md">
                      <ShieldCheck className="w-3 h-3" /> Conectado
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-semibold rounded-md">
                      Não Configurado
                    </span>
                  )}
                </div>

                <div className="text-sm text-slate-600 mb-6 space-y-2">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span>Sincronização Ativa</span>
                    <span className="font-medium">{provider.isConnected ? 'Sim' : 'Não'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span>Último Sync</span>
                    <span className="font-medium text-xs">
                      {provider.syncedAt ? new Date(provider.syncedAt).toLocaleString() : 'Nunca'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => toggleConnection(provider)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    provider.isConnected
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {provider.isConnected ? (
                    <>
                      <PowerOff className="w-4 h-4" /> Desconectar
                    </>
                  ) : (
                    <>
                      <Plug className="w-4 h-4" /> Conectar CRM
                    </>
                  )}
                </button>
                {provider.isConnected && (
                  <button className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

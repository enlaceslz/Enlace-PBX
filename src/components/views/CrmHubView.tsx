import React, { useEffect, useState } from 'react';
import { Plug, RefreshCw } from 'lucide-react';
import { getAuthHeaders } from '../../utils/api';
import { WebhooksPanel } from './WebhooksPanel';
interface CrmProvider { id: string; name: string; type: string }
export const CrmHubView: React.FC = () => {
  const [providers, setProviders] = useState<CrmProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const refresh = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/v1/crm/providers', { headers: getAuthHeaders() });
      if (!response.ok) throw new Error(response.status === 403 ? 'O catálogo global de conectores exige administrador da plataforma.' : 'Não foi possível carregar os conectores.');
      const data = await response.json(); setProviders(Array.isArray(data) ? data : []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Catálogo indisponível.'); setProviders([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);
  return <div className="p-6 max-w-7xl mx-auto space-y-6">
    <header className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
      <h1 className="text-2xl font-bold text-slate-900 flex gap-2 items-center"><Plug className="text-blue-700" />CRM e integrações</h1>
      <p className="text-sm text-slate-600">Gerencie destinos de webhook da empresa e consulte o catálogo de conectores. Sincronização bidirecional, OAuth e abertura automática de fichas ainda aguardam implementação e homologação.</p>
      <a href="#webhooks" className="inline-block text-blue-700 font-semibold underline">Cadastrar webhook</a>
    </header>
    <WebhooksPanel />
    <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div className="flex justify-between items-center gap-3"><h2 className="font-bold text-slate-900">Catálogo de conectores</h2>
        <button disabled={loading} onClick={() => void refresh()} className="text-sm text-blue-700 flex gap-2 items-center"><RefreshCw className="w-4 h-4" />{loading ? 'Carregando...' : 'Atualizar catálogo'}</button></div>
      {error && <p role="alert" className="text-sm text-amber-800">{error}</p>}
      {providers.map(provider => <div key={provider.id} className="border rounded-xl p-4"><div className="font-semibold text-slate-800">{provider.name}</div>
        <p className="text-sm text-slate-500">{provider.type} · Conexão não homologada</p></div>)}
      {!loading && !providers.length && !error && <p className="text-sm text-slate-500">Nenhum conector cadastrado.</p>}
    </section>
  </div>;
};

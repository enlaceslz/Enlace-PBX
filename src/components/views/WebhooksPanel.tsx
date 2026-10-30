import React, { useEffect, useState } from 'react';
import { getAuthHeaders } from '../../utils/api';
interface Hook { id: string; name: string; endpoint: string; enabled: boolean }
interface Delivery { id: string; status: string; http_status: number | null; duration_ms: number | null; created_at: string; error_message?: string }
const statusLabel: Record<string, string> = { ACKNOWLEDGED: 'Confirmada por HTTP', UNKNOWN: 'Não confirmada', PENDING: 'Sem confirmação final' };
export const WebhooksPanel: React.FC = () => {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [name, setName] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [selected, setSelected] = useState<string>('');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const request = async (path: string, method = 'GET', body?: unknown) => {
    const response = await fetch('/api/v1/webhooks' + path, { method,
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
    return data;
  };
  const refresh = async () => setHooks(await request(''));
  const history = async (id: string) => { setSelected(id); setDeliveries(await request(`/${encodeURIComponent(id)}/deliveries`)); };
  useEffect(() => { refresh().catch(err => setError(err.message)); }, []);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : 'Operação indisponível.'); }
    finally { setBusy(false); }
  };
  return <section id="webhooks" className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
    <div><h2 className="text-lg font-bold text-slate-900">Webhooks da empresa</h2>
      <p className="text-sm text-slate-600">Cadastre um destino e teste uma entrega assinada. Eventos automáticos de chamadas e sincronização de CRM ainda não estão disponíveis.</p></div>
    <form className="flex flex-wrap gap-3" onSubmit={event => { event.preventDefault(); void run(async () => {
      const created = await request('', 'POST', { name, endpoint, enabled: false });
      setName(''); setEndpoint(''); await refresh(); await history(created.id);
      setNotice('Webhook cadastrado e desabilitado. Autorize o ID, a URL e o segredo no servidor antes do teste.');
    }); }}>
      <label className="text-sm text-slate-700">Nome<input required maxLength={120} value={name} onChange={event => setName(event.target.value)} disabled={busy} className="block border rounded-lg px-3 py-2" /></label>
      <label className="text-sm text-slate-700 flex-1">URL do destino<input required type="url" maxLength={2048} placeholder="https://seu-destino.exemplo/webhook" value={endpoint} onChange={event => setEndpoint(event.target.value)} disabled={busy} className="block w-full border rounded-lg px-3 py-2" /></label>
      <button disabled={busy} className="self-end bg-blue-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">Cadastrar destino</button>
    </form>
    <p className="text-xs text-amber-800">O teste envia um evento real de teste. Uma resposta HTTP 2xx confirma recebimento, sem comprovar processamento de negócio. Se a entrega não for confirmada, consulte o destino antes de repetir.</p>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
    <button type="button" disabled={busy} onClick={() => void run(refresh)} className="text-sm text-blue-700 underline">Atualizar destinos</button>
    {!hooks.length && <p className="text-sm text-slate-500">Nenhum destino carregado.</p>}
    {hooks.map(hook => <div key={hook.id} className="border rounded-xl p-4 space-y-2">
      <div className="font-semibold text-slate-800">{hook.name} · {hook.enabled ? 'Habilitado para teste' : 'Desabilitado'}</div>
      <p className="text-xs font-mono text-slate-600 break-all">{hook.endpoint}<br />ID: {hook.id}</p>
      <div className="flex flex-wrap gap-4 text-sm">
        <button disabled={busy} className="text-blue-700 disabled:opacity-50" onClick={() => void run(async () => {
          await request(`/${encodeURIComponent(hook.id)}`, 'PUT', { enabled: !hook.enabled }); await refresh();
        })}>{hook.enabled ? 'Desabilitar' : 'Habilitar teste'}</button>
        <button disabled={busy || !hook.enabled} className="text-blue-700 disabled:opacity-50" onClick={() => void run(async () => {
          try {
            const result = await request('/test', 'POST', { webhookId: hook.id });
            setNotice(`Destino respondeu HTTP ${result.httpStatus} em ${result.durationMs} ms. Entrega: ${result.deliveryId}`);
          } finally { await history(hook.id); }
        })}>Enviar evento de teste</button>
        <button disabled={busy} className="text-slate-700" onClick={() => void run(() => history(hook.id))}>Ver tentativas</button>
      </div>
    </div>)}
    {selected && <div className="overflow-x-auto"><h3 className="font-semibold text-slate-800">Últimas tentativas do destino selecionado</h3>
      <table className="w-full text-xs text-left"><thead><tr><th className="p-2">Data</th><th className="p-2">Resultado</th><th className="p-2">HTTP</th><th className="p-2">Tempo</th></tr></thead>
        <tbody>{deliveries.map(delivery => <tr key={delivery.id} className="border-t"><td className="p-2">{new Date(delivery.created_at).toLocaleString('pt-BR')}</td>
          <td className="p-2">{statusLabel[delivery.status] || 'Desconhecido'}<div className="text-slate-500">{delivery.error_message}</div></td>
          <td className="p-2">{delivery.http_status ?? '—'}</td><td className="p-2">{delivery.duration_ms == null ? '—' : `${delivery.duration_ms} ms`}</td></tr>)}</tbody></table>
      {!deliveries.length && <p className="text-sm text-slate-500">Nenhuma tentativa registrada.</p>}
    </div>}
  </section>;
};

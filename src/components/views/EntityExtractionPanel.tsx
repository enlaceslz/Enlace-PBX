import React, { useState } from 'react';
import { getAuthHeaders } from '../../utils/api';
interface Field { key: string; label: string; type: string; required: boolean; description: string }
interface Schema { id: string; name: string; description: string; fields: Field[]; isActive: boolean }
interface Result { extractedData: Record<string, string | number | boolean | null>; evidence: Record<string, string | null>; missingRequired: string[]; rejectedFields: string[]; modelUsed: string; providerId: string; durationMs: number }
export const EntityExtractionPanel: React.FC<{ schemas: Schema[]; onRefresh: () => Promise<void> }> = ({ schemas, onRefresh }) => {
  const [schemaId, setSchemaId] = useState('');
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [fieldsJson, setFieldsJson] = useState('[{"key":"documento","label":"Documento informado","type":"cpf_cnpj","required":true,"description":"Documento mencionado explicitamente pela pessoa."}]');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const schema = schemas.find(item => item.id === schemaId) || schemas[0];
  const request = async (path: string, method: string, body: unknown) => {
    const response = await fetch('/api/v1/ai/entity-extraction' + path, { method, headers: getAuthHeaders(), body: JSON.stringify(body) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação.'); return data;
  };
  const run = async (callback: () => Promise<void>) => {
    if (busy) return; setBusy(true); setError(''); setResult(null);
    try { await callback(); } catch (err) { setError(err instanceof Error ? err.message : 'Operação indisponível.'); } finally { setBusy(false); }
  };
  return <section className="space-y-5">
    <div className="bg-white border rounded-2xl p-5 space-y-3">
      <h3 className="font-bold text-slate-900 text-lg">Extração de entidades com evidências</h3>
      <p className="text-sm text-slate-600">O modelo seleciona trechos literais do texto. Campos ausentes ou incompatíveis ficam nulos. Revise o contexto de cada trecho antes de usar os dados; isso não valida identidade, documento ou informação de negócio.</p>
      <details><summary className="text-sm text-blue-700 cursor-pointer">Cadastrar esquema da empresa</summary>
        <form className="space-y-3 mt-3" onSubmit={event => { event.preventDefault(); void run(async () => {
          let fields: unknown; try { fields = JSON.parse(fieldsJson); } catch { throw new Error('Informe campos em JSON válido.'); }
          const created = await request('/schemas', 'POST', { name, description: '', fields, isActive: true });
          setName(''); await onRefresh(); setSchemaId(created.id);
        }); }}>
          <label className="block text-sm">Nome<input required value={name} maxLength={120} disabled={busy} onChange={event => setName(event.target.value)} className="block w-full border rounded-lg p-2" /></label>
          <label className="block text-sm">Campos JSON<textarea required rows={5} maxLength={16000} disabled={busy} value={fieldsJson} onChange={event => setFieldsJson(event.target.value)} className="block w-full border rounded-lg p-2 font-mono text-xs" /></label>
          <p className="text-xs text-slate-500">Até 20 campos. Tipos: string, number, currency, cpf_cnpj, date e boolean. Números e moedas seguem formato brasileiro; datas e documentos são preservados como escritos.</p>
          <button disabled={busy} className="bg-blue-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">Cadastrar esquema</button>
        </form>
      </details>
    </div>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    <div className="bg-white border rounded-2xl p-5 space-y-4">
      <label className="block text-sm font-semibold">Esquema<select disabled={busy} value={schema?.id || ''} onChange={event => { setSchemaId(event.target.value); setResult(null); }} className="block w-full border rounded-lg p-2 mt-1">
        {!schemas.length && <option value="">Cadastre um esquema para começar</option>}
        {schemas.map(item => <option value={item.id} key={item.id}>{item.name}{item.isActive ? '' : ' (desabilitado)'}</option>)}
      </select></label>
      {schema && <div className="text-xs text-slate-600 space-y-2"><p>{schema.description}</p>
        <div className="flex flex-wrap gap-2">{schema.fields.map(field => <span key={field.key} className="bg-slate-100 rounded px-2 py-1">{field.label} ({field.type}){field.required ? ' · obrigatório' : ''}</span>)}</div>
        <button type="button" disabled={busy} onClick={() => void run(async () => { await request(`/schemas/${encodeURIComponent(schema.id)}`, 'PUT', { isActive: !schema.isActive }); await onRefresh(); })} className="text-blue-700 underline">{schema.isActive ? 'Desabilitar esquema' : 'Habilitar esquema'}</button>
      </div>}
      <label className="block text-sm font-semibold">Texto de teste<textarea value={text} rows={6} maxLength={16000} disabled={busy} onChange={event => { setText(event.target.value); setResult(null); }} className="block w-full border rounded-lg p-3 font-mono text-xs mt-1" /></label>
      <p className="text-xs text-amber-800">O texto será enviado ao provedor 9router autorizado para esta empresa. A extração não grava a transcrição, não altera o CRM e não toma decisões automaticamente.</p>
      <button disabled={busy || !schema?.isActive || !text.trim()} onClick={() => void run(async () => {
        setResult(await request('/test', 'POST', { schemaId: schema.id, text }));
      })} className="px-4 py-2 bg-blue-700 text-white rounded-lg disabled:opacity-50">{busy ? 'Processando...' : 'Extrair com IA'}</button>
    </div>
    {result && <div className="bg-white border rounded-2xl p-5 space-y-3" aria-live="polite">
      <h4 className="font-bold text-slate-900">Resultado para revisão humana</h4>
      <p className="text-xs text-slate-600">{result.providerId} · {result.modelUsed} · {result.durationMs} ms</p>
      {!!result.missingRequired.length && <p className="text-sm text-amber-800">Obrigatórios ausentes: {result.missingRequired.join(', ')}</p>}
      {!!result.rejectedFields.length && <p className="text-sm text-amber-800">Evidências recusadas: {result.rejectedFields.join(', ')}</p>}
      <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th className="p-2">Campo</th><th className="p-2">Valor observado</th><th className="p-2">Trecho literal</th></tr></thead>
        <tbody>{Object.entries(result.extractedData).map(([key, value]) => <tr key={key} className="border-t"><td className="p-2">{key}</td><td className="p-2">{value === null ? 'Não encontrado' : String(value)}</td><td className="p-2 whitespace-pre-wrap">{result.evidence[key] ?? '—'}</td></tr>)}</tbody></table></div>
    </div>}
  </section>;
};

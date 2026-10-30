import React, { useEffect, useState } from 'react';
import { getAuthHeaders } from '../../utils/api';
interface Review { id:string;source_reference:string|null;channel:string;status:string;created_at:string;reviewed_at?:string;reviewed_by?:string;review_note?:string;evidence?:Record<string,string|null>;rejected_fields?:string[];model?:string;provider?:string }
const labels:Record<string,string>={greeting:'Saudação',complaint:'Problema relatado',solutionStatement:'Declaração sobre solução',recordingNotice:'Menção à gravação',followUp:'Próximo passo mencionado'};
export const QualityReviewPanel:React.FC<{onCountChange:(count:number)=>void}>=({onCountChange})=>{
 const [reviews,setReviews]=useState<Review[]>([]);const [selected,setSelected]=useState<Review|null>(null);
 const [transcript,setTranscript]=useState('');const [reference,setReference]=useState('');const [channel,setChannel]=useState('voice');
 const [note,setNote]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const request=async(path:string,method='GET',body?:unknown)=>{const response=await fetch('/api/v1/ai/quality-supervisor'+path,{method,headers:getAuthHeaders(),body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Operação indisponível.');return data;};
 const refresh=async()=>{const data=await request('/reviews');setReviews(data);onCountChange(data.length);};
 useEffect(()=>{refresh().catch(err=>setError(err.message));},[]);
 const run=async(callback:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');try{await callback();}catch(err){setError(err instanceof Error?err.message:'Operação indisponível.');}finally{setBusy(false);}};
 return <section className="space-y-5">
  <div className="bg-white border rounded-2xl p-5 space-y-3"><h3 className="text-lg font-bold text-slate-900">Supervisor assistido por evidências</h3>
   <p className="text-sm text-slate-600">O modelo seleciona trechos para revisão humana. Não atribui notas, sentimento, conformidade, consentimento ou resolução. Uma declaração do atendente não comprova que a ação foi executada.</p>
   <form className="space-y-3" onSubmit={event=>{event.preventDefault();void run(async()=>{const review=await request('/evaluate','POST',{transcript,channel,reference});setSelected(review);setNote('');await refresh();});}}>
    <div className="flex flex-wrap gap-3"><label className="text-sm">Canal<select value={channel} disabled={busy} onChange={event=>setChannel(event.target.value)} className="block border rounded-lg p-2"><option value="voice">Voz</option><option value="whatsapp">WhatsApp</option><option value="webrtc">WebRTC</option></select></label>
    <label className="text-sm flex-1">Referência informada (opcional)<input value={reference} maxLength={128} disabled={busy} onChange={event=>setReference(event.target.value)} className="block w-full border rounded-lg p-2"/></label></div>
    <label className="text-sm block">Transcrição<textarea required rows={6} maxLength={16000} value={transcript} disabled={busy} onChange={event=>setTranscript(event.target.value)} className="block w-full border rounded-lg p-3 font-mono text-xs"/></label>
    <p className="text-xs text-amber-800">O texto será enviado ao 9router autorizado. Os trechos selecionados e a anotação humana serão gravados na empresa; a transcrição completa não será armazenada por este fluxo.</p>
    <button disabled={busy||!transcript.trim()} className="px-4 py-2 bg-blue-700 text-white rounded-lg disabled:opacity-50">{busy?'Processando...':'Preparar revisão com IA'}</button>
   </form>
  </div>
  {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
  <div className="bg-white border rounded-2xl p-5 space-y-3"><div className="flex justify-between items-center gap-3"><h4 className="font-bold text-slate-900">Últimas revisões</h4><button disabled={busy} onClick={()=>void run(refresh)} className="text-sm text-blue-700 underline">Atualizar</button></div>
   {!reviews.length&&<p className="text-sm text-slate-500">Nenhuma revisão carregada.</p>}
   {reviews.map(review=><button key={review.id} disabled={busy} onClick={()=>void run(async()=>{setSelected(null);setNote('');setSelected(await request(`/reviews/${encodeURIComponent(review.id)}`));})} className="block w-full text-left border rounded-lg p-3 text-sm text-slate-700">{review.source_reference||'Sem referência informada'} · {review.channel} · {review.status==='REVIEWED'?'Revisão humana registrada':'Aguardando revisão'}<span className="block text-xs text-slate-500">{new Date(review.created_at).toLocaleString('pt-BR')}</span></button>)}
  </div>
  {selected&&<div className="bg-white border rounded-2xl p-5 space-y-3" aria-live="polite"><h4 className="font-bold text-slate-900">Evidências para revisão</h4>
   <p className="text-xs text-slate-500">{selected.provider} · {selected.model} · {selected.source_reference||'Referência não informada'}</p>
   <p className="text-sm text-amber-800">Confira a conversa original e o contexto. Sem trecho selecionado significa apenas ausência de evidência nesta análise. Registros antigos do supervisor heurístico não são usados aqui.</p>
   {Object.entries(selected.evidence||{}).map(([key,quote])=><div key={key} className="border rounded-lg p-3"><div className="text-xs font-bold text-slate-600">{labels[key]||key}</div><p className="text-sm whitespace-pre-wrap text-slate-800">{quote===null?'Sem evidência selecionada':quote}</p></div>)}
   {!!selected.rejected_fields?.length&&<p className="text-xs text-amber-800">Evidências recusadas: {selected.rejected_fields.join(', ')}</p>}
   {selected.status==='PENDING'?<form className="space-y-3" onSubmit={event=>{event.preventDefault();void run(async()=>{setSelected(await request(`/reviews/${encodeURIComponent(selected.id)}/review`,'POST',{note}));setNote('');await refresh();});}}>
    <label className="text-sm block">Anotação da revisão humana<textarea required maxLength={2000} rows={3} value={note} disabled={busy} onChange={event=>setNote(event.target.value)} className="block w-full border rounded-lg p-2"/></label>
    <p className="text-xs text-slate-500">A anotação e o usuário autenticado serão registrados uma única vez. Isso não certifica conformidade nem altera o atendimento.</p>
    <button disabled={busy||!note.trim()} className="px-4 py-2 bg-blue-700 text-white rounded-lg disabled:opacity-50">Registrar revisão humana</button>
   </form>:<div className="text-sm text-slate-700"><p className="font-semibold">Revisão registrada por {selected.reviewed_by} em {selected.reviewed_at?new Date(selected.reviewed_at).toLocaleString('pt-BR'):'—'}</p><p className="whitespace-pre-wrap">{selected.review_note}</p></div>}
  </div>}
 </section>;
};

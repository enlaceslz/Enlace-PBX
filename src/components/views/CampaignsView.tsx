import React,{useEffect,useState} from 'react';
import {getAuthHeaders} from '../../utils/api';
interface Plan{id:string;name:string;type:string;aiAgentId:string|null;planVersion:number;leadCount:number;status:'draft'|'unverified';legacyStatus:string|null}
const types:Record<string,string>={ai_voicebot:'Agente de voz',power_dialer:'Discagem progressiva',predictive:'Discagem preditiva'};
export const CampaignsView:React.FC=()=>{
 const [campaigns,setCampaigns]=useState<Plan[]>([]);const [agents,setAgents]=useState<{id:string;name:string}[]>([]);
 const [selectedId,setSelectedId]=useState('');const [name,setName]=useState('');const [type,setType]=useState('ai_voicebot');const [agentId,setAgentId]=useState('');
 const [editName,setEditName]=useState('');const [editType,setEditType]=useState('ai_voicebot');const [editAgent,setEditAgent]=useState('');
 const [phones,setPhones]=useState('');const [leads,setLeads]=useState<{phone:string}[]>([]);const [nextCursor,setNextCursor]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const selected=campaigns.find(campaign=>campaign.id===selectedId)||campaigns[0];
 const request=async(path:string,method='GET',body?:unknown)=>{const response=await fetch('/api/v1/campaigns'+path,{method,headers:getAuthHeaders(),body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Operação não confirmada.');return data;};
 const refresh=async()=>setCampaigns(await request(''));
 const run=async(callback:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');setNotice('');try{await callback();}catch(err){setError(err instanceof Error?err.message:'Operação indisponível.');}finally{setBusy(false);}};
 useEffect(()=>{void run(async()=>{await refresh();const response=await fetch('/api/v1/ai/agents',{headers:getAuthHeaders()});if(response.ok)setAgents(await response.json());else setNotice('Agentes não carregados. É possível preparar o rascunho sem vínculo.');});},[]);
 useEffect(()=>{setLeads([]);setNextCursor(null);setPhones('');},[selected?.id]);
 useEffect(()=>{setEditName(selected?.name||'');setEditType(selected?.type||'ai_voicebot');setEditAgent(selected?.aiAgentId||'');},[selected?.id,selected?.planVersion]);
 const page=async(after='')=>{if(!selected)return;const result=await request(`/${encodeURIComponent(selected.id)}/leads${after?'?after='+encodeURIComponent(after):''}`);setLeads(previous=>after?[...previous,...result.leads]:result.leads);setNextCursor(result.nextCursor);};
 return <div className="space-y-5 max-w-7xl mx-auto">
  <header className="bg-white border rounded-2xl p-5 space-y-2"><h2 className="text-2xl font-bold text-slate-900">Preparação de campanhas</h2>
   <p className="text-sm text-amber-800">Discagem ainda indisponível. Cadastrar ou importar destinos não inicia chamadas. Não há worker homologado para iniciar, pausar, encerrar ou recuperar execuções.</p></header>
  {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}{notice&&<p role="status" className="text-sm text-slate-700">{notice}</p>}
  <form className="bg-white border rounded-2xl p-5 space-y-3" onSubmit={event=>{event.preventDefault();void run(async()=>{const created=await request('','POST',{name,type,aiAgentId:type==='ai_voicebot'?(agentId||null):null});await refresh();setSelectedId(created.id);setName('');setNotice('Rascunho gravado. Nenhuma chamada foi iniciada.');});}}>
   <h3 className="font-bold text-slate-900">Novo rascunho</h3><div className="flex flex-wrap gap-3">
    <label className="text-sm flex-1">Nome<input required maxLength={128} disabled={busy} value={name} onChange={event=>setName(event.target.value)} className="block w-full border rounded-lg p-2"/></label>
    <label className="text-sm">Tipo planejado<select value={type} disabled={busy} onChange={event=>setType(event.target.value)} className="block border rounded-lg p-2">{Object.entries(types).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    {type==='ai_voicebot'&&<label className="text-sm">Agente<select value={agentId} disabled={busy} onChange={event=>setAgentId(event.target.value)} className="block border rounded-lg p-2"><option value="">Definir depois</option>{agents.map(agent=><option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label>}
    <button disabled={busy} className="self-end bg-blue-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">Criar rascunho</button>
   </div>
  </form>
  <section className="bg-white border rounded-2xl p-5 space-y-4"><div className="flex justify-between items-center"><h3 className="font-bold text-slate-900">Últimos 100 registros</h3><button disabled={busy} onClick={()=>void run(refresh)} className="text-sm text-blue-700 underline">Atualizar</button></div>
   <select value={selected?.id||''} disabled={busy} onChange={event=>setSelectedId(event.target.value)} className="w-full border rounded-lg p-2">{!campaigns.length&&<option value="">Nenhuma campanha carregada</option>}{campaigns.map(campaign=><option key={campaign.id} value={campaign.id}>{campaign.name} · {campaign.status==='draft'?'Rascunho':'Registro legado não verificado'}</option>)}</select>
   {selected&&<><p className="text-sm text-slate-600">{types[selected.type]||'Tipo legado'} · {selected.leadCount} destinos cadastrados de fato · versão {selected.planVersion}</p>
    {selected.status==='unverified'?<p className="text-sm text-amber-800">Estado ou contadores antigos não comprovam execução. O registro foi preservado para revisão administrativa; prepare uma nova campanha.</p>:<>
     <details><summary className="text-sm text-blue-700 cursor-pointer">Editar planejamento</summary><form className="space-y-2 mt-3" onSubmit={event=>{event.preventDefault();void run(async()=>{await request(`/${selected.id}`,'PUT',{name:editName,type:editType,aiAgentId:editType==='ai_voicebot'?(editAgent||null):null,planVersion:selected.planVersion});await refresh();setNotice('Planejamento atualizado. Nenhuma execução iniciada.');});}}>
      <label className="text-sm block">Nome<input required maxLength={128} disabled={busy} value={editName} onChange={event=>setEditName(event.target.value)} className="block w-full border rounded-lg p-2"/></label>
      <label className="text-sm block">Tipo<select disabled={busy} value={editType} onChange={event=>setEditType(event.target.value)} className="block border rounded-lg p-2">{Object.entries(types).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      {editType==='ai_voicebot'&&<label className="text-sm block">Agente<select disabled={busy} value={editAgent} onChange={event=>setEditAgent(event.target.value)} className="block border rounded-lg p-2"><option value="">Definir depois</option>{agents.map(agent=><option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label>}
      <button disabled={busy} className="px-4 py-2 bg-blue-700 text-white rounded-lg disabled:opacity-50">Salvar planejamento</button>
     </form></details>
     <label className="text-sm block">Telefones com DDD, um por linha (até 500 por lote)<textarea rows={6} maxLength={24000} disabled={busy} value={phones} onChange={event=>setPhones(event.target.value)} className="block w-full border rounded-lg p-3 font-mono text-xs"/></label>
     <p className="text-xs text-slate-500">Formato brasileiro, com ou sem +55. Duplicados não são adicionados novamente. Formato aceito não comprova existência, autorização de contato ou disponibilidade do número.</p>
     <button disabled={busy||!phones.trim()} onClick={()=>void run(async()=>{const result=await request(`/${selected.id}/leads`,'POST',{phones:phones.split(/\r?\n/).map(phone=>phone.trim()).filter(Boolean)});setPhones('');await refresh();setLeads([]);setNextCursor(null);setNotice(`${result.added} destinos adicionados; ${result.total} cadastrados. Nenhuma discagem executada.`);})} className="px-4 py-2 bg-blue-700 text-white rounded-lg disabled:opacity-50">Importar destinos</button>
     <button disabled={busy} onClick={()=>{if(confirm('Excluir este rascunho e seus destinos cadastrados?'))void run(async()=>{await request(`/${selected.id}`,'DELETE',{planVersion:selected.planVersion});setLeads([]);await refresh();});}} className="ml-4 text-rose-700 text-sm">Excluir rascunho e destinos</button>
    </>}
    <div><button disabled={busy} onClick={()=>void run(()=>page())} className="text-blue-700 underline text-sm">Consultar destinos cadastrados</button></div>
    <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th className="p-2">Telefone cadastrado</th><th className="p-2">Ação</th></tr></thead><tbody>{leads.map(lead=><tr key={lead.phone} className="border-t"><td className="p-2 font-mono">{lead.phone}</td><td className="p-2"><button disabled={busy||selected.status!=='draft'} className="text-rose-700" onClick={()=>void run(async()=>{await request(`/${selected.id}/leads`,'DELETE',{phone:lead.phone,planVersion:selected.planVersion});await refresh();setLeads(previous=>previous.filter(item=>item.phone!==lead.phone));})}>Remover destino</button></td></tr>)}</tbody></table></div>
    {nextCursor&&<button disabled={busy} onClick={()=>void run(()=>page(nextCursor))} className="text-sm text-blue-700 underline">Carregar mais destinos</button>}
   </>}
  </section>
 </div>;
};

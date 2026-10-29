import React,{useState} from 'react';
import {getAuthHeaders} from '../../utils/api';
export const QuickSetupView:React.FC=()=>{
 const [form,setForm]=useState({prefix:'',quantity:1,startNumber:0});const [preview,setPreview]=useState<{number:string;name:string}[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');
 const run=async(create:boolean)=>{setBusy(true);setError('');setMessage('');try{
  const response=await fetch('/api/v1/setup/'+(create?'apply':'preview'),{method:'POST',headers:getAuthHeaders(),body:JSON.stringify(form)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Não foi possível concluir.');
  if(create){setPreview([]);setMessage(result.generatedCount+' ramais cadastrados. Configuração não aplicada no Asterisk.');}else setPreview(result.extensions);
 }catch(error){setError(error instanceof Error?error.message:'Falha no cadastro.');}finally{setBusy(false);}};
 const change=(patch:Partial<typeof form>)=>{setForm({...form,...patch});setPreview([]);setMessage('');};
 return <section className="p-5 space-y-4 text-slate-800"><h1 className="text-xl font-semibold">Cadastro de ramais em lote</h1><p>Cria de 1 a 100 ramais na empresa selecionada. Se algum número já existir ou houver falha, todo o lote é recusado.</p><p className="p-3 bg-amber-50 rounded-xl text-sm">Senhas aleatórias ficam cifradas; consulte a credencial individual após cadastrar. Novos ramais usam NAT, WebRTC, contexto from-internal, sem correio de voz e sem gravação. Troncos e IA devem ser configurados nos módulos próprios. Este cadastro não aplica arquivos, registra telefones ou realiza chamadas. Use backup integral para recuperação; snapshot parcial legado foi retirado.</p>
 <div className="grid gap-3 md:grid-cols-3"><label>Prefixo numérico<input className="block border rounded-lg p-2 w-full" value={form.prefix} onChange={event=>change({prefix:event.target.value})}/></label><label>Quantidade (1 a 100)<input className="block border rounded-lg p-2 w-full" type="number" min={1} max={100} value={form.quantity} onChange={event=>change({quantity:Number(event.target.value)})}/></label><label>Início da sequência<input className="block border rounded-lg p-2 w-full" type="number" min={0} max={999999} value={form.startNumber} onChange={event=>change({startNumber:Number(event.target.value)})}/></label></div>
 <p className="text-sm">A sequência tem no mínimo dois dígitos. Exemplo: prefixo 40, início 0 produz 4000.</p><button disabled={busy} onClick={()=>run(false)} className="border rounded-lg px-4 py-2">Ver prévia</button>
 {preview.length>0&&<div className="space-y-3"><ul className="max-h-64 overflow-auto">{preview.map(item=><li key={item.number}>{item.number} — {item.name}</li>)}</ul><button disabled={busy} onClick={()=>run(true)} className="border rounded-lg px-4 py-2">Cadastrar os {preview.length} ramais</button></div>}
 {error&&<p role="alert" className="text-red-700">{error}</p>}{message&&<p role="status">{message}</p>}
 </section>;
};

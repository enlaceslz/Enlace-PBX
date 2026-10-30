import test from 'node:test';
import assert from 'node:assert/strict';
import {authenticatedFetch,cancelApiRequests,uiRole} from '../src/utils/sessionClient.js';
import {connectTelemetry} from '../src/utils/telemetryConnection.js';
const json=(status:number,code='')=>new Response(JSON.stringify({code}),{status,headers:{'Content-Type':'application/json'}});
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));

test('cliente distingue sessão revogada de permissão negada e limita escopo à API local',async()=>{
  let token:string|null='atual';let expired=0;let status=403;let code='PERMISSION_DENIED';const calls:any[]=[];
  const request=authenticatedFetch({origin:'https://pbx.example.invalid',getToken:()=>token,getTenant:()=> 'empresa-a',expired:()=>{expired++;token=null;},fetch:async(input,init)=>{calls.push({input,headers:new Headers(init?.headers)});return json(status,code);}});
  await request('/api/v1/users',{headers:{Authorization:'Bearer atual'}});assert.equal(expired,0);assert.equal(calls[0].headers.get('x-tenant-id'),'empresa-a');
  await request('/api/v1/users',{headers:{Authorization:'Bearer atual','x-tenant-id':'empresa-b'}});assert.equal(calls[1].headers.get('x-tenant-id'),'empresa-b');
  status=401;await request('https://external.example.invalid/api/v1/data',{headers:{Authorization:'Bearer atual'}});assert.equal(expired,0);assert.equal(calls[2].headers.has('x-tenant-id'),false);
  status=403;code='AUTH_USER_INACTIVE';await request('/api/v1/users',{headers:{Authorization:'Bearer atual'}});assert.equal(expired,1);assert.equal(token,null);
  token='novo';status=401;code='AUTH_SESSION_REVOKED';await request('/api/v1/auth/me',{headers:{Authorization:'Bearer novo'}});assert.equal(expired,2);
  assert.equal(uiRole('operator'),'operador');assert.equal(uiRole('readonly'),'auditor');
});
test('401 atrasado da sessão anterior não desconecta novo login; logout cancela requisição pendente',async()=>{
  let token='antigo';let expired=0;let resolve!:(value:Response)=>void;
  const request=authenticatedFetch({origin:'https://pbx.example.invalid',getToken:()=>token,getTenant:()=>null,expired:()=>{expired++;},fetch:()=>new Promise<Response>(done=>{resolve=done;})});
  const pending=request('/api/v1/users',{headers:{Authorization:'Bearer antigo'}});token='novo';resolve(json(401,'AUTH_SESSION_REVOKED'));await pending;assert.equal(expired,0);
  const sameToken=request('/api/v1/users',{headers:{Authorization:'Bearer novo'}});cancelApiRequests();resolve(json(401,'AUTH_SESSION_REVOKED'));await sameToken;assert.equal(expired,0,'Nova geração não é encerrada por resposta antiga, mesmo com token igual.');
  const blocking=authenticatedFetch({origin:'https://pbx.example.invalid',getToken:()=>token,getTenant:()=>null,expired:()=>{},fetch:async(_input,init)=>new Promise<Response>((_resolve,reject)=>init!.signal!.addEventListener('abort',()=>reject(new DOMException('Abortado','AbortError'))))});
  const inFlight=blocking('/api/v1/users',{headers:{Authorization:'Bearer novo'}});cancelApiRequests();await assert.rejects(inFlight,{name:'AbortError'});
});
function clock(){let id=0;const tasks=new Map<number,{callback:()=>void;delay:number}>();return {tasks,schedule:(callback:()=>void,delay:number)=>{tasks.set(++id,{callback,delay});return id;},cancel:(key:number)=>{tasks.delete(key);},next:()=>{const [key,value]=tasks.entries().next().value!;tasks.delete(key);value.callback();return value.delay;}};}
test('telemetria para após cinco falhas consecutivas e não reconecta em 401',async()=>{
  const timer=clock();let attempts=0;let unavailable=0;
  const stop=connectTelemetry({token:'t',tenant:'a',binding:'a',getToken:()=> 't',getBinding:()=> 'a',request:async()=>{attempts++;return json(503);},source:()=>{throw new Error('Não deve conectar');},data:()=>{},unavailable:()=>{unavailable++;},schedule:timer.schedule,cancel:timer.cancel});
  for(let i=0;i<5;i++){await tick();if(timer.tasks.size)timer.next();}
  await tick();assert.equal(attempts,5);assert.equal(unavailable,1);assert.equal(timer.tasks.size,0);stop();
  const revoked=clock();connectTelemetry({token:'t',tenant:'a',binding:'a',getToken:()=> 't',getBinding:()=> 'a',request:async()=>json(401),source:()=>{throw new Error();},data:()=>{},unavailable:()=>{throw new Error('Sem loop de reconexão');},schedule:revoked.schedule,cancel:revoked.cancel});await tick();assert.equal(revoked.tasks.size,0);
});
test('frame SSE precisa corresponder à empresa e resposta antiga não cria conexão após logout',async()=>{
  const timer=clock();let token='t';let frames=0;let closed=0;let created=0;
  const source:any={onmessage:null,onerror:null,close:()=>{closed++;}};
  const stop=connectTelemetry({token:'t',tenant:'a',binding:'a',getToken:()=>token,getBinding:()=> 'a',request:async()=>new Response(JSON.stringify({ticket:'efemero'})),source:url=>{created++;assert.doesNotMatch(url,/Bearer|jwt=/);return source;},data:()=>{frames++;},unavailable:()=>{},schedule:timer.schedule,cancel:timer.cancel});
  await tick();source.onmessage({data:JSON.stringify({tenantId:'b',channels:[]})});assert.equal(frames,0);assert.equal(closed,1);
  timer.next();await tick();source.onmessage({data:JSON.stringify({tenantId:'a',channels:[]})});assert.equal(frames,1);
  token='outro';source.onmessage({data:JSON.stringify({tenantId:'a',channels:[]})});assert.equal(frames,1);stop();assert.equal(timer.tasks.size,0);
  let complete!:(response:Response)=>void;token='t';const delayed=clock();const dispose=connectTelemetry({token:'t',tenant:'a',binding:'a',getToken:()=>token,getBinding:()=> 'a',request:()=>new Promise<Response>(done=>{complete=done;}),source:()=>{created++;return source;},data:()=>{},unavailable:()=>{},schedule:delayed.schedule,cancel:delayed.cancel});
  const before=created;dispose();complete(new Response(JSON.stringify({ticket:'atrasado'})));await tick();assert.equal(created,before);assert.equal(delayed.tasks.size,0);
});

test('telemetria sem frames expira em prazo definido e libera conexão e timers',async()=>{
  const timer=clock();let closed=0;
  const stop=connectTelemetry({token:'t',tenant:'a',binding:'a',getToken:()=> 't',getBinding:()=> 'a',request:async()=>new Response(JSON.stringify({ticket:'teste'})),source:()=>({onmessage:null,onerror:null,close:()=>{closed++;}}),data:()=>{},unavailable:()=>{},schedule:timer.schedule,cancel:timer.cancel});
  await tick();assert.equal(timer.next(),15000);assert.equal(closed,1);assert.equal(timer.tasks.size,1);stop();assert.equal(timer.tasks.size,0);
});

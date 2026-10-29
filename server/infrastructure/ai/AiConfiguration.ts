import {OutboundHttpError} from '../security/OutboundHttp.js';
export const agentColumns={name:'name',description:'description',providerId:'provider_id',model:'model',voice:'voice',voiceGender:'voice_gender',avatarType:'avatar_type',language:'language',systemInstruction:'system_instruction',initialGreeting:'initial_greeting',temperature:'temperature',tools:'tools',knowledgeSources:'knowledge_sources',allowBargeIn:'allow_barge_in',silenceTimeoutSeconds:'silence_timeout_seconds',maxSessionMinutes:'max_session_minutes',transferExtension:'transfer_extension',fallbackAction:'fallback_action',isActive:'is_active'};
export const knowledgeColumns={title:'title',category:'category',content:'content',fileName:'file_name',fileType:'file_type'};
function fail(message:string,status=400):never{throw new OutboundHttpError(message,status);}
function body(input:unknown,allowed:string[]){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!allowed.includes(key)))fail('Campos de configuração não permitidos.');return input as Record<string,any>;}
function text(value:unknown,name:string,max:number,required=false,multiline=false){if(typeof value!=='string'||value.length>max||value.includes('\0')||Buffer.from(value,'utf8').toString('utf8')!==value||!multiline&&/[\x00-\x1f\x7f]/.test(value)||required&&!value.trim())fail('Texto inválido: '+name+'.');return multiline?value:value.trim();}
export function reviewedKnowledge<T extends {contentStatus?:string}>(items:T[]):T[]{return items.filter(item=>item.contentStatus==='REVIEWED_TEXT');}
export function configurationIds(value:unknown){if(!Array.isArray(value)||value.length>32||value.some(id=>typeof id!=='string'||!/^[-a-zA-Z0-9_.:]{1,64}$/.test(id))||new Set(value).size!==value.length)fail('Lista de vínculos inválida; use até 32 IDs únicos.');return value as string[];}
export function agentPatch(input:unknown,creating=false){
 const value=body(input,Object.keys(agentColumns));if(!creating&&!Object.keys(value).length)fail('Informe uma alteração.');
 const patch:Record<string,any>={};
 for(const [key,item] of Object.entries(value)){
  if(['tools','knowledgeSources'].includes(key))patch[key]=configurationIds(item);
  else if(['isActive','allowBargeIn'].includes(key)){if(typeof item!=='boolean')fail('Campo booleano inválido.');patch[key]=item;}
  else if(key==='temperature'){if(typeof item!=='number'||!Number.isFinite(item)||item<0||item>2||Number(item.toFixed(2))!==item)fail('Temperatura deve estar entre 0 e 2, com até duas casas decimais.');patch[key]=item;}
  else if(['silenceTimeoutSeconds','maxSessionMinutes'].includes(key)){if(!Number.isInteger(item)||item<1||item>(key==='silenceTimeoutSeconds'?120:240))fail('Limite de sessão inválido.');patch[key]=item;}
  else if(key==='fallbackAction'){if(!['hangup','transfer_human','transfer_queue'].includes(item))fail('Ação de fallback inválida.');patch[key]=item;}
  else if(key==='voiceGender'){if(!['male','female'].includes(item))fail('Perfil de voz inválido.');patch[key]=item;}
  else if(key==='transferExtension'){if(typeof item!=='string'||item!==''&&!/^[1-9][0-9]{1,7}$/.test(item))fail('Destino de transferência inválido.');patch[key]=item;}
  else if(['providerId','model','voice','avatarType','language'].includes(key)){const limit=key==='avatarType'?32:key==='language'?16:64;if(typeof item!=='string'||!/^[-a-zA-Z0-9_.:/]+$/.test(item)||item.length>limit)fail('Identificador de configuração inválido.');patch[key]=item;}
  else patch[key]=text(item,key,key==='systemInstruction'?16000:key==='initialGreeting'?4000:key==='description'?2000:255,key==='name'||key==='systemInstruction',['systemInstruction','initialGreeting','description'].includes(key));
 }
 if(creating){for(const key of ['name','model','voice','systemInstruction'])if(patch[key]===undefined)fail('Informe nome, modelo, voz e instruções do agente.');return {description:'',providerId:'9router',voiceGender:'female',avatarType:'octopus_ai',language:'pt-BR',initialGreeting:'',temperature:0.7,tools:[],knowledgeSources:[],allowBargeIn:true,silenceTimeoutSeconds:3,maxSessionMinutes:15,transferExtension:'',fallbackAction:'hangup',isActive:true,...patch};}
 return patch;
}
export function knowledgePatch(input:unknown,creating=false){
 const value=body(input,[...Object.keys(knowledgeColumns),'targetAgentIds']);if(!creating&&!Object.keys(value).length)fail('Informe uma alteração.');const patch:Record<string,any>={};
 for(const [key,item] of Object.entries(value)){
  if(key==='targetAgentIds'){patch[key]=configurationIds(item);continue;}
  if(key==='fileType'){if(!['text/plain','text/markdown'].includes(item))fail('Importação binária indisponível; forneça texto revisado.',501);patch[key]=item;continue;}
  if(key==='fileName'){const name=text(item,key,255);if(/[\\/]/.test(name)||name==='.'||name==='..')fail('Nome de arquivo inválido.');patch[key]=name;continue;}
  patch[key]=text(item,key,key==='content'?65536:key==='category'?64:255,true,key==='content');
  if(key==='content'&&Buffer.byteLength(patch[key],'utf8')>65536)fail('Texto deve ter até 64 KiB.');
 }
 if(creating){if(!patch.title||!patch.content)fail('Título e texto revisado são obrigatórios.');return {category:'Geral',fileName:'',fileType:'text/plain',targetAgentIds:[],...patch};}
 return patch;
}
export function knowledgeUpload(input:unknown){
 if(input&&typeof input==='object'&&(Object.hasOwn(input,'base64Data')||(input as any).fileType==='application/pdf'))fail('Extração de PDF/binários indisponível. Importe texto revisado em TXT ou Markdown.',501);
 const value=body(input,['rawText','title','category','fileName','fileType','targetAgentIds']);const {rawText,...metadata}=value;return knowledgePatch({...metadata,content:rawText},true);
}

import {OutboundHttpError} from '../security/OutboundHttp.js';
import {extensionPatch} from './ExtensionMutation.js';
export function extensionBatch(input:unknown):{name:string;number:string}[]{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new OutboundHttpError('Lote inválido.',400);
 const value=input as Record<string,unknown>;
 if(Object.keys(value).some(key=>!['prefix','quantity','startNumber'].includes(key)))throw new OutboundHttpError('Assistente cria apenas ramais; configure troncos e IA nos módulos próprios.',400);
 if(typeof value.prefix!=='string'||!/^[1-9][0-9]{0,5}$/.test(value.prefix)||typeof value.quantity!=='number'||!Number.isInteger(value.quantity)||value.quantity<1||value.quantity>100||typeof value.startNumber!=='number'||!Number.isInteger(value.startNumber)||value.startNumber<0||value.startNumber>999999)throw new OutboundHttpError('Informe prefixo numérico, quantidade de 1 a 100 e início de 0 a 999999.',400);
 return Array.from({length:value.quantity},(_,index)=>{
  const number=value.prefix+String((value.startNumber as number)+index).padStart(2,'0');
  const item={number,name:'Ramal '+number};extensionPatch(item,true);return item;
 });
}

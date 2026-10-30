import {OutboundHttpError} from '../security/OutboundHttp.js';
export interface UserPatch {name?:string;email?:string;role?:string;extension?:string;isActive?:boolean;password?:string}
const roles:Record<string,string>={super_admin:'super_admin',admin:'admin',supervisor:'supervisor',operator:'operator',operador:'operator',agent:'agent',usuario:'agent',readonly:'readonly',auditor:'readonly'};
export function validateUserPatch(raw:unknown,creating=false):UserPatch {
  if(!raw || typeof raw!=='object' || Array.isArray(raw) || Object.keys(raw).some(key=>!['name','email','role','extension','isActive','password'].includes(key)))throw new OutboundHttpError('Campos de usuário inválidos. Empresa e identidade não podem ser alteradas no corpo.',400);
  const input=raw as any;const result:UserPatch={};
  if(creating || input.name!==undefined){if(typeof input.name!=='string'||!input.name.trim()||input.name.length>120)throw new OutboundHttpError('Informe nome de até 120 caracteres.',400);result.name=input.name.trim();}
  if(creating || input.email!==undefined){if(typeof input.email!=='string'||input.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))throw new OutboundHttpError('Informe e-mail válido.',400);result.email=input.email.trim().toLowerCase();}
  if(input.role!==undefined){if(typeof input.role!=='string'||!Object.hasOwn(roles,input.role))throw new OutboundHttpError('Perfil não reconhecido.',400);result.role=roles[input.role];}else if(creating)result.role='operator';
  if(input.extension!==undefined){if(typeof input.extension!=='string'||(input.extension!==''&&!/^[1-9][0-9]{1,7}$/.test(input.extension)))throw new OutboundHttpError('Ramal inválido.',400);result.extension=input.extension;}
  if(input.isActive!==undefined){if(typeof input.isActive!=='boolean')throw new OutboundHttpError('Estado ativo deve ser booleano.',400);result.isActive=input.isActive;}else if(creating)result.isActive=true;
  if(creating || input.password!==undefined){if(typeof input.password!=='string'||Array.from(input.password).length<12||Buffer.byteLength(input.password)>72)throw new OutboundHttpError('Informe senha explícita com pelo menos 12 caracteres e até 72 bytes. Espaços são preservados.',400);result.password=input.password;}
  return result;
}
export function assertUserAuthority(actor:{id:string;role:string;is_active:boolean;tenant_id:string},target:{id:string;role:string;tenant_id:string},scopeTenant?:string){
  if(!actor.is_active||!['admin','super_admin'].includes(actor.role))throw new OutboundHttpError('Autoridade administrativa inválida.',403);
  if((scopeTenant && target.tenant_id!==scopeTenant)||(actor.role!=='super_admin'&&target.tenant_id!==actor.tenant_id))throw new OutboundHttpError('Usuário não encontrado nesta empresa.',404);
  if(actor.role!=='super_admin'&&target.role==='super_admin')throw new OutboundHttpError('Administrador de empresa não pode modificar uma conta superadmin.',403);
}

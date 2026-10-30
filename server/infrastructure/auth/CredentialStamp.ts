import crypto from 'node:crypto';
type Identity={id:string;tenantId:string;passwordHash?:string;role:string;isActive?:boolean;email:string;extension?:string;authVersion?:number};
/** HMAC não revela o hash bcrypt e muda após alterações de credencial/autoridade. */
export function credentialStamp(user:Identity,secret:string):string {
  return crypto.createHmac('sha256',secret).update(JSON.stringify([user.id,user.tenantId,user.passwordHash||'',user.role,user.isActive,user.email,user.extension||'',user.authVersion||0])).digest('hex');
}
export function validCredentialStamp(stamp:unknown,user:Identity,secret:string):boolean {
  return typeof stamp==='string' && /^[a-f0-9]{64}$/.test(stamp) && crypto.timingSafeEqual(Buffer.from(stamp,'hex'),Buffer.from(credentialStamp(user,secret),'hex'));
}

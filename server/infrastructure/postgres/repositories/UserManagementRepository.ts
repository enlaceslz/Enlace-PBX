import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import {postgresClient} from '../client.js';
import {validateUserPatch,assertUserAuthority} from '../../auth/UserManagement.js';
import {OutboundHttpError} from '../../security/OutboundHttp.js';
export class UserManagementRepository {
  static async mutate(actorId:string,scopeTenant:string|undefined,operation:'create'|'update'|'delete',id:string|undefined,raw:unknown){
    const patch=operation==='delete'?{}:validateUserPatch(raw,operation==='create');
    const hash=patch.password!==undefined?await bcrypt.hash(patch.password,12):undefined;
    try{return await postgresClient.executeGlobalScoped(async client=>{
      await client.query("SELECT pg_advisory_xact_lock(hashtext('user-management'))");
      const actor=(await client.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[actorId])).rows[0];
      if(!actor)throw new OutboundHttpError('Conta administrativa não encontrada.',403);
      const target=operation==='create'?{id:crypto.randomUUID(),tenant_id:scopeTenant,role:patch.role}:(await client.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if(!target || !target.tenant_id)throw new OutboundHttpError('Selecione uma empresa ou usuário válido.',404);
      assertUserAuthority(actor,target,scopeTenant);
      if(actor.role!=='super_admin' && patch.role==='super_admin')throw new OutboundHttpError('Somente superadmin pode atribuir esse perfil.',403);
      if(operation==='delete' && target.id===actorId)throw new OutboundHttpError('Não é permitido excluir a própria conta.',409);
      if(operation!=='create' && target.role==='super_admin' && target.is_active && (operation==='delete'||patch.isActive===false||(patch.role!==undefined&&patch.role!=='super_admin'))){
        const count=Number((await client.query("SELECT count(*) AS count FROM users WHERE role='super_admin' AND is_active=true")).rows[0].count);
        if(count<=1)throw new OutboundHttpError('O último superadmin ativo não pode ser removido, desativado ou rebaixado.',409);
      }
      const extension=patch.extension!==undefined?patch.extension:target.extension;
      if(extension && !(await client.query('SELECT id FROM extensions WHERE tenant_id=$1 AND number=$2',[target.tenant_id,extension])).rows.length)throw new OutboundHttpError('Ramal não cadastrado nesta empresa.',422);
      if(operation==='delete'){await client.query('DELETE FROM users WHERE id=$1 AND tenant_id=$2',[target.id,target.tenant_id]);return {deleted:true};}
      const user={...target,name:patch.name??target.name,email:patch.email??target.email,role:patch.role??target.role,extension:extension||null,is_active:patch.isActive??target.is_active,password_hash:hash??target.password_hash};
      await client.query(`INSERT INTO users(id,tenant_id,name,email,role,extension,is_active,password_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,email=EXCLUDED.email,role=EXCLUDED.role,extension=EXCLUDED.extension,is_active=EXCLUDED.is_active,password_hash=EXCLUDED.password_hash,updated_at=CURRENT_TIMESTAMP`,
        [user.id,user.tenant_id,user.name,user.email,user.role,user.extension,user.is_active,user.password_hash]);
      return {id:user.id,tenantId:user.tenant_id,name:user.name,email:user.email,role:user.role,extension:user.extension||undefined,isActive:user.is_active};
    });}catch(error){if((error as any)?.code==='23505')throw new OutboundHttpError('E-mail já cadastrado.',409);throw error;}
  }
}

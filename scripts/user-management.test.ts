import test from 'node:test';
import assert from 'node:assert/strict';
import {validateUserPatch,assertUserAuthority} from '../server/infrastructure/auth/UserManagement.js';
import {credentialStamp,validCredentialStamp} from '../server/infrastructure/auth/CredentialStamp.js';
test('gestão valida campos, perfil, estado e senha explícita sem truncar espaços',()=>{
  const input={name:' Ana ',email:'ANA@example.invalid',password:'  senha-com-espacos  ',role:'operador'};
  const result=validateUserPatch(input,true);assert.equal(result.password,input.password);assert.equal(result.role,'operator');assert.equal(result.email,'ana@example.invalid');
  for(const invalid of [{...input,password:undefined},{...input,password:'curta'},{...input,password:'á'.repeat(40)},{...input,tenantId:'outra'},{...input,role:'inventado'},{...input,isActive:'false'}])assert.throws(()=>validateUserPatch(invalid,true));
  assert.deepEqual(validateUserPatch({name:'Ana'}),{name:'Ana'});
});
test('admin não modifica superadmin por nenhum campo e superadmin direcionado respeita a empresa',()=>{
  const actor={id:'a',role:'admin',is_active:true,tenant_id:'a'};
  const root={id:'root',role:'super_admin',tenant_id:'a'};
  assert.throws(()=>assertUserAuthority(actor,root,'a'));
  assert.throws(()=>assertUserAuthority({...actor,role:'super_admin'},root,'b'));
  assert.throws(()=>assertUserAuthority({...actor,is_active:false},{id:'u',role:'operator',tenant_id:'a'},'a'));
  assert.doesNotThrow(()=>assertUserAuthority({...actor,role:'super_admin'},root));
});
test('revisão de credencial revoga token antigo mesmo ao restaurar perfil ou reativar usuário',()=>{
  const user={id:'u',tenantId:'a',email:'a@example.invalid',role:'admin',isActive:true,passwordHash:'hash',authVersion:0};const secret='segredo-de-teste';const stamp=credentialStamp(user,secret);
  assert.equal(validCredentialStamp(stamp,user,secret),true);
  for(const change of [{passwordHash:'outro'},{role:'readonly'},{isActive:false},{authVersion:2}])assert.equal(validCredentialStamp(stamp,{...user,...change},secret),false);
  assert.equal(validCredentialStamp(undefined,user,secret),false);assert.equal(stamp.includes('hash'),false);
});

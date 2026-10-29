import {execFileSync} from 'node:child_process';
import {prepareManagedDirectory} from './anchored-files.mjs';
const uid=Number(execFileSync('id',['-u','enlace-pbx'],{encoding:'utf8'}).trim());
let group;
try{group=execFileSync('getent',['group','asterisk'],{encoding:'utf8'});}catch{group=execFileSync('getent',['group','enlace-pbx'],{encoding:'utf8'});}
const gid=Number(group.trim().split(':')[2]);
if(!Number.isSafeInteger(uid)||!Number.isSafeInteger(gid)||uid<1||gid<1)throw new Error('Identidades de serviço inválidas.');
prepareManagedDirectory('/var/lib/enlace-pbx',uid,gid);

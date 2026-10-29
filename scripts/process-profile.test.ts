import test from 'node:test';
import assert from 'node:assert/strict';
import {readProcessStatus,processProfileMatches} from './process-profile.mjs';

const expected={uid:21001,gid:21001,asteriskGid:21002};
const profile='Name:\tnode\nUid:\t21001\t21001\t21001\t21001\nGid:\t21001\t21001\t21001\t21001\nGroups:\t21001 21002\nNoNewPrivs:\t1\n'+['CapInh','CapPrm','CapEff','CapBnd','CapAmb'].map(name=>name+':\t0000000000000000\n').join('');

test('prontidão exige UID/GID dedicados, grupos permitidos, no-new-privileges e capabilities vazias',()=>{
 assert.equal(processProfileMatches(profile,expected),true);
 assert.equal(processProfileMatches(profile.replace('Groups:\t21001 21002','Groups:\t'),expected),true);
 for(const text of [profile.replace('Uid:\t21001','Uid:\t0'),profile.replace('Gid:\t21001','Gid:\t0'),profile.replace('21001 21002','21001 0'),profile.replace('NoNewPrivs:\t1','NoNewPrivs:\t0'),profile+'Uid:\t21001 21001 21001 21001\n',profile.replace('NoNewPrivs:\t1\n',''),profile+'x'.repeat(16384)])assert.equal(processProfileMatches(text,expected),false);
 for(const name of ['CapInh','CapPrm','CapEff','CapBnd','CapAmb']){
  assert.equal(processProfileMatches(profile.replace(name+':\t0000000000000000',name+':\t0000000000000001'),expected),false);
  assert.equal(processProfileMatches(profile.replace(name+':\t0000000000000000\n',''),expected),false);
 }
 for(const override of [{uid:0},{gid:0},{asteriskGid:0},{asteriskGid:21001}])assert.equal(processProfileMatches(profile,{...expected,...override}),false);
});

test('coleta de perfil lê /proc real com PID fechado e não admite identidade root',t=>{
 for(const pid of ['0','-1','../self','1/status','1\0','999999999999'])assert.throws(()=>readProcessStatus(pid));
 let status:string;
 try{status=readProcessStatus(String(process.pid));}
 catch(error){if(error.code==='ENOENT'&&process.env.PBX_REQUIRE_PROC_PROFILE!=='1'){t.skip('Ambiente não expõe o PID do executor em /proc; coleta real obrigatória no CI Linux.');return;}throw error;}
 assert.match(status,/^Uid:\s+\d+\s+\d+\s+\d+\s+\d+$/m);assert.match(status,/^Gid:/m);assert.ok(Buffer.byteLength(status)<=16384);
 assert.equal(processProfileMatches(status,{uid:0,gid:0}),false);
});

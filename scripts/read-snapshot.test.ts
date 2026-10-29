import test from 'node:test';
import assert from 'node:assert/strict';
import {postgresClient} from '../server/infrastructure/postgres/client.js';
import {AsteriskService} from '../server/asteriskService.js';

test('snapshot exportado é importado antes do contexto RLS e encerrado antes da aplicação',async()=>{
  const db=postgresClient as any;const originalPool=db.pool;const configured=db.isConfigured;
  const commands:string[][]=[];
  db.pool={connect:async()=>{
    const log:string[]=[];commands.push(log);
    return {query:async(sql:string)=>{log.push(sql);return {rows:sql.includes('pg_export_snapshot')?[{snapshot:'00000003-0000001B-1'}]:[],rowCount:0};},release:()=>log.push('release')};
  }};db.isConfigured=true;
  try{
    const service=new AsteriskService();
    service.generatePjsipConf=async()=>postgresClient.executeGlobalScoped(async()=> 'pjsip');
    service.generateExtensionsConf=async()=>postgresClient.executeTenantScoped('empresa-a',async()=> 'dialplan');
    service.generateQueuesConf=async()=>postgresClient.withReadSnapshot(()=>postgresClient.executeTenantScoped('empresa-a',async()=> 'queues'));
    assert.deepEqual(await service.generateConfiguration('empresa-a'),{pjsip:'pjsip',dialplan:'dialplan',queues:'queues'});
    assert.equal(commands.length,4);
    for(const log of commands.slice(1)){
      assert.equal(log[0],'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      assert.equal(log[1],"SET TRANSACTION SNAPSHOT '00000003-0000001B-1'");
      assert.match(log[2],/set_config/);
      assert.deepEqual(log.slice(-2),['COMMIT','release']);
    }
    assert.deepEqual(commands[0].slice(-2),['COMMIT','release']);
  }finally{db.pool=originalPool;db.isConfigured=configured;}
});

test('falha de geração encerra snapshot e bloqueia acesso sem gate e fallback',async()=>{
  const db=postgresClient as any;const originalPool=db.pool;const configured=db.isConfigured;
  const commands:string[]=[];
  db.pool={connect:async()=>({query:async(sql:string)=>{commands.push(sql);return {rows:[{snapshot:'00000003-0000001B-1'}]};},release:()=>commands.push('release')})};db.isConfigured=true;
  try{
    await assert.rejects(postgresClient.withReadSnapshot(async()=>{
      await assert.rejects(postgresClient.query('SELECT 1'),/gate RLS/);
      await assert.rejects(postgresClient.getClient(),/gate RLS/);
      throw new Error('falha de geração');
    }),/falha de geração/);
    assert.deepEqual(commands.slice(-2),['ROLLBACK','release']);
    db.pool=null;db.isConfigured=false;
    await assert.rejects(postgresClient.withReadSnapshot(async()=> 'não executar'),/PostgreSQL conectado/);
  }finally{db.pool=originalPool;db.isConfigured=configured;}
});

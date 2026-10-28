import test from 'node:test';
import assert from 'node:assert/strict';
import { AsteriskTransferExecutor,AsteriskHangupExecutor } from '../server/maia/executors/AsteriskExecutor.js';
import { asteriskService } from '../server/asteriskService.js';
import { AuditLogRepository } from '../server/infrastructure/postgres/repositories/AuditLogRepository.js';
import { ExtensionRepository } from '../server/infrastructure/postgres/repositories/ExtensionRepository.js';
const context={tenantId:'empresa-a',asteriskChannelId:'123.1',agentId:'agente',sessionId:'sessao',callerNumber:'nao-verificado',correlationId:'teste'};

test('MaIA sem canal não anuncia transferência ou encerramento e não consulta infraestrutura',async()=>{
  const transfer=await new AsteriskTransferExecutor().execute({destino:'4102'},{...context,asteriskChannelId:undefined});
  const hangup=await new AsteriskHangupExecutor().execute({}, {...context,asteriskChannelId:undefined});
  for(const result of [transfer,hangup]){assert.equal(result.status,'failed');assert.equal(result.action,'none');assert.equal(result.data.estado,'NOT_EXECUTED');}
});
test('MaIA exige auditoria antes da ação e nunca considera aceite como conclusão',async()=>{
  const original={audit:AuditLogRepository.logStrict,find:ExtensionRepository.findByNumber,transfer:asteriskService.transferChannel,hangup:asteriskService.hangupChannel};
  const events:string[]=[];let auditFails=true;let infrastructureFails=false;
  try{
    ExtensionRepository.findByNumber=async()=>({allowAiTransfer:true} as any);
    AuditLogRepository.logStrict=async(entry:any)=>{events.push('audit');assert.equal(JSON.stringify(entry).includes('motivo-secreto'),false);if(auditFails)throw new Error('segredo SQL');return {} as any;};
    asteriskService.transferChannel=async(id,destination,tenant,superadmin)=>{events.push('transfer');assert.equal(id,'123.1');assert.equal(destination,'4102');assert.equal(tenant,'empresa-a');assert.equal(superadmin,false);if(infrastructureFails)throw new Error('segredo AMI');return {accepted:true,status:'ACCEPTED',operationId:'operacao'};};
    asteriskService.hangupChannel=async(id,tenant,superadmin)=>{events.push('hangup');assert.equal(tenant,'empresa-a');assert.equal(superadmin,false);return {accepted:true,status:'ACCEPTED',operationId:'operacao'};};
    const executor=new AsteriskTransferExecutor();
    const blocked=await executor.execute({destino:'4102',motivo:'motivo-secreto'},context);
    assert.equal(blocked.status,'failed');assert.deepEqual(events,['audit']);assert.doesNotMatch(JSON.stringify(blocked),/segredo SQL/);
    auditFails=false;events.length=0;
    const accepted=await executor.execute({destino:'4102'},context);
    assert.deepEqual(events,['audit','transfer']);assert.equal(accepted.status,'pending');assert.equal(accepted.action,'none');assert.equal(accepted.data.operationId,'operacao');
    const hangup=await new AsteriskHangupExecutor().execute({},context);
    assert.equal(hangup.status,'pending');assert.equal(hangup.action,'none');assert.deepEqual(events.slice(-2),['audit','hangup']);
    infrastructureFails=true;const failed=await executor.execute({destino:'4102'},context);
    assert.equal(failed.status,'failed');assert.equal(failed.data.estado,'UNKNOWN');assert.equal(failed.action,'none');assert.doesNotMatch(JSON.stringify(failed),/segredo AMI/);
  }finally{AuditLogRepository.logStrict=original.audit;ExtensionRepository.findByNumber=original.find;asteriskService.transferChannel=original.transfer;asteriskService.hangupChannel=original.hangup;}
});
test('MaIA respeita ramal sem transferência automática e recusa argumentos inválidos',async()=>{
  const original=ExtensionRepository.findByNumber;try{
    ExtensionRepository.findByNumber=async()=>({allowAiTransfer:false} as any);
    const executor=new AsteriskTransferExecutor();
    for(const destination of ['4102',{},undefined,'4102\r\nAction: Command']){
      const result=await executor.execute({destino:destination},context);assert.equal(result.status,'failed');assert.equal(result.action,'none');
    }
  }finally{ExtensionRepository.findByNumber=original;}
});

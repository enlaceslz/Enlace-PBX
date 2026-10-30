import test from 'node:test';
import assert from 'node:assert/strict';
import { callExtension,callDestination,channelReference,endpointFromChannel } from '../server/infrastructure/asterisk/CallControl.js';
import { AsteriskAdapter } from '../server/infrastructure/asterisk/AsteriskAdapter.js';

test('controle de chamadas rejeita valores implícitos, injeção e inferência de empresa pelo Caller ID',()=>{
  for(const value of [undefined,null,{},4101,'',' 4101','4101\r\nAction: Command','PJSIP/4101','4101,1'])assert.throws(()=>callExtension(value));
  for(const value of ['00900123456789','+19001234567','09001234567','*123'])assert.throws(()=>callDestination(value));
  assert.equal(callExtension('4101'),'4101');assert.equal(callDestination('+5511987654321'),'5511987654321');
  assert.throws(()=>channelReference('x\r\nAction: Hangup'));
  assert.equal(endpointFromChannel('PJSIP/4101-0000002f'),'4101');
  assert.equal(endpointFromChannel('PJSIP/trunk-abc-def-0000002f'),'trunk-abc-def');
  for(const name of ['Local/4101@from-internal-00000001;1','PJSIP/4101','PJSIP/4101-invalido'])assert.equal(endpointFromChannel(name),null);
});
test('ações AMI retornam somente aceite real, sem fabricar canal, estado ou áudio',async()=>{
  const adapter=new AsteriskAdapter();const calls:any[]=[];
  adapter.executeAmiAction=async(action,params)=>{calls.push({action,params});return 'Response: Success\r\nActionID: 12345678-1234-4234-8234-123456789012\r\n';};
  const result=await adapter.originateCall('4101','4102');
  assert.deepEqual(result,{accepted:true,status:'ACCEPTED',operationId:'12345678-1234-4234-8234-123456789012'});
  assert.equal(calls[0].params.Async,'true');assert.equal(calls[0].params.Channel,'PJSIP/4101');
  await adapter.hangup('PJSIP/4101-00000001');await adapter.transfer('PJSIP/4101-00000001','4102');await adapter.supervise('PJSIP/4101-00000001','4103');
  assert.deepEqual(calls.map(item=>item.action),['Originate','Hangup','Redirect','Originate']);
  assert.equal(calls[3].params.Data,'PJSIP/4101-00000001,qb');
  assert.equal(calls[3].params.Application,'ChanSpy');
  await assert.rejects(adapter.originateCall('4101','4102',true));assert.equal(calls.length,4);
});
test('falha, resposta incompleta ou recusa AMI não confirmam controle de chamada',async()=>{
  const adapter=new AsteriskAdapter();
  for(const response of ['Response: Error\r\nActionID: 12345678-1234-4234-8234-123456789012','Response: Success','']){
    adapter.executeAmiAction=async()=>response;
    await assert.rejects(adapter.hangup('PJSIP/4101-00000001'),error=>(error as any).statusCode===502);
  }
  adapter.executeAmiAction=async()=>{throw new Error('credencial secreta AMI');};
  await assert.rejects(adapter.originateCall('4101','4102'),error=>(error as any).statusCode===502&&!String(error).includes('secreta'));
});

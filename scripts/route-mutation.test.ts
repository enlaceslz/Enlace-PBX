import test from 'node:test';
import assert from 'node:assert/strict';
import {routePatch,routePattern,managedRoutePlan} from '../server/infrastructure/asterisk/RouteMutation.js';
import {isAllowedOutboundNumber} from '../server/infrastructure/asterisk/OutboundPolicy.js';
test('padrões admitem apenas gramática delimitada sem expressão ou diretiva',()=>{
 assert.equal(routePattern('9XXXXXXXX'),'_9XXXXXXXX');assert.equal(routePattern('190'),'190');assert.equal(routePattern('_[2-5]XXXXXXX'),'_[2-5]XXXXXXX');assert.equal(routePattern('_X.'),'_X.');
 for(const pattern of ['_!','_.','_[9-2]XX','_${SHELL(id)}','_X\n#exec id','_X!','_XX.XX','_[0-9a]','_X,1,Hangup'])assert.throws(()=>routePattern(pattern));
});
test('rota exige campos persistidos e quantidade numérica sem sobrescrita de identidade ou CLI',()=>{
 assert.equal(routePatch({stripDigits:12}).stripDigits,12);assert.equal(routePatch({stripDigits:0,isActive:false}).isActive,false);
 for(const patch of [{tenantId:'outra'},{id:'forjado'},{prefixRemove:'12'},{stripDigits:'12'},{stripDigits:21},{isActive:'false'},{priority:0},{prepend:'${EXTEN}'},{isCliItx:true},{callerIdOverride:'1132223333'},{timeConditionEnabled:true},{extensionOverrides:[]}])assert.throws(()=>routePatch(patch));
 assert.throws(()=>routePatch({type:'inbound'}),(error:any)=>error.statusCode===501);
 assert.equal(routePatch({name:'Teste',pattern:'_X.',trunkId:'t'},true).name,'Teste');
});
test('plano usa quantidade persistida, troncos próprios e preserva guarda sobre resultado transformado',()=>{
 const route={type:'outbound',name:'Teste',pattern:'_X.',trunkId:'t',prefixRemove:'12',prepend:'55',priority:1};
 const plan=managedRoutePlan(route,[{id:'t'}]);assert.equal(plan.stripDigits,12);
 assert.equal(isAllowedOutboundNumber(plan.prepend+'00112233445511987654321'.slice(plan.stripDigits)),true);
 assert.equal(isAllowedOutboundNumber('09001234567'),false);
 for(const patch of [{trunkId:'outra'},{failoverTrunkId:'outra'},{failoverTrunkId:'t'},{isCliItx:true},{callerIdOverride:'1132223333'},{extensionOverrides:{}},{timeConditionEnabled:true}])assert.throws(()=>managedRoutePlan({...route,...patch},[{id:'t'}]));
});

import {nationalDid} from './DidMutation.js';
import {OutboundHttpError} from '../security/OutboundHttp.js';
export function managedDidDestination(did:any,extensions:{number:string}[],trunks:{id:string}[]){
 if(did.destinationType!=='extension'||did.timeConditionEnabled||did.afterHoursDestType||did.afterHoursDestId||did.fallbackType||did.fallbackTarget||did.customHeaderName||!['request_uri',undefined,null].includes(did.didSourceHeader)||!['reject_404',undefined,null].includes(did.unknownDidAction))throw new OutboundHttpError('DID legado com roteamento não implementado exige revisão antes de aplicar configuração.',501);
 if(!trunks.some(trunk=>trunk.id===did.trunkId)||!extensions.some(extension=>extension.number===did.destinationId)||!/^[1-9][0-9]{1,7}$/.test(did.destinationId))throw new OutboundHttpError('DID sem tronco ou ramal válido na empresa.',400);
 return {national:nationalDid(did.did),extension:did.destinationId};
}

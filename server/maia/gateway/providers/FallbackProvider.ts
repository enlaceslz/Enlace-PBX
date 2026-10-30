import { MaiaAIProvider } from '../MaiaAIProvider.js';
import {
  MaiaTextRequest,
  MaiaAIResponse,
  MaiaProviderHealth,
} from '../../types.js';

/** Contingência local apenas informativa; não interpreta prompt nem solicita ações. */
export class FallbackProvider implements MaiaAIProvider {
 public readonly id='fallback';
 public readonly name='Contingência local da MaIA';
 public async generateText(_request:MaiaTextRequest):Promise<MaiaAIResponse>{
  const start=performance.now();
  return {text:'O atendimento por inteligência artificial está temporariamente indisponível. Nenhuma transferência ou ação automática foi solicitada por esta resposta.',
   tokensUsed:{input:0,output:0},modelUsed:'system-contingency',providerId:this.id,latencyMs:Math.max(0,Math.round(performance.now()-start))};
 }
 public async healthCheck():Promise<MaiaProviderHealth>{
  return {providerId:this.id,name:this.name,status:'UP',modelsAvailable:['system-contingency']};
 }
}

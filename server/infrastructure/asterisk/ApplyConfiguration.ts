export async function applyConfiguration(deps:{audit:()=>Promise<unknown>;generate:()=>Promise<{pjsip:string;dialplan:string}>;apply:(pjsip:string,dialplan:string)=>Promise<{success:boolean}>}){
 await deps.audit();
 const config=await deps.generate();
 const result=await deps.apply(config.pjsip,config.dialplan);
 return {success:result.success===true,status:result.success===true?'RELOAD_ACCEPTED':'NOT_APPLIED',
  message:result.success===true?'Arquivos gravados e recargas aceitas. Registro SIP, chamadas e mídia ainda exigem homologação.':'Aplicação não confirmada. Verifique a configuração anterior e o estado do Asterisk no host.'};
}

interface Source {onmessage:((event:{data:string})=>void)|null;onerror:((event:any)=>void)|null;close:()=>void}
export function connectTelemetry(options:{token:string;tenant:string;binding:string|null;getToken:()=>string|null;getBinding:()=>string|null;
  request:typeof fetch;source:(url:string)=>Source;data:(value:any)=>void;unavailable:()=>void;
  schedule?:(callback:()=>void,delay:number)=>any;cancel?:(id:any)=>void}){
  const schedule=options.schedule||setTimeout;const cancel=options.cancel||clearTimeout;
  let stopped=false;let failures=0;let source:Source|null=null;let retry:any;let watchdog:any;let controller:AbortController|null=null;
  const valid=()=>!stopped&&options.token===options.getToken()&&options.binding===options.getBinding();
  const stop=()=>{stopped=true;cancel(retry);cancel(watchdog);controller?.abort();source?.close();source=null;};
  const failed=()=>{
    cancel(watchdog);source?.close();source=null;if(!valid()){stop();return;}
    if(++failures>=5){stop();options.unavailable();return;}
    retry=schedule(()=>void open(),Math.min(1000*2**(failures-1),10000));
  };
  const open=async()=>{
    if(!valid()){stop();return;}const requestController=new AbortController();controller=requestController;const timeout=schedule(()=>requestController.abort(),6000);
    try{
      const response=await options.request('/api/v1/auth/sse-ticket',{method:'POST',headers:{Authorization:`Bearer ${options.token}`,'Content-Type':'application/json'},signal:controller.signal});
      if(!valid()){stop();return;}
      if([401,403].includes(response.status)){stop();if(response.status===403)options.unavailable();return;}
      if(!response.ok){failed();return;}
      const value=await response.json();if(!valid()){stop();return;}
      if(typeof value.ticket!=='string'||!value.ticket){failed();return;}
      const opened=options.source('/api/v1/events/asterisk?ticket='+encodeURIComponent(value.ticket));source=opened;
      const arm=()=>{cancel(watchdog);watchdog=schedule(()=>{if(source===opened)failed();},15000);};arm();
      opened.onmessage=event=>{
        if(source!==opened)return;
        if(!valid()){stop();return;}
        try{const payload=JSON.parse(event.data);
          if(payload.tenantId!==options.tenant||!Array.isArray(payload.channels))throw new Error('Escopo ou formato inválido.');
          failures=0;arm();options.data(payload);
        }catch{failed();}
      };
      opened.onerror=()=>{if(source===opened)failed();};
    }catch{if(valid())failed();}
    finally{cancel(timeout);}
  };
  void open();return stop;
}

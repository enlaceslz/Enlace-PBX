let tenantScope:string|null=null;
let sessionEpoch=0;
const pending=new Set<AbortController>();
export function getApiTenant(){return tenantScope;}
export function cancelApiRequests(){sessionEpoch++;for(const controller of pending)controller.abort();pending.clear();}
export function setApiTenant(value:string|null){if(value!==tenantScope){cancelApiRequests();tenantScope=value;}}
export function uiRole(role:string){return ({operator:'operador',agent:'usuario',readonly:'auditor'} as Record<string,string>)[role]||role;}

/** Observa apenas requisições autenticadas da API da própria aplicação. */
export function authenticatedFetch(options:{fetch:typeof fetch;origin:string;getToken:()=>string|null;getTenant:()=>string|null;expired:()=>void}):typeof fetch {
  return async(input,init)=>{
    const request=typeof Request!=='undefined'&&input instanceof Request?input:undefined;
    const url=new URL(request?.url || String(input),options.origin);
    const headers=new Headers(init?.headers||request?.headers);
    const token=headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
    const own=url.origin===options.origin&&url.pathname.startsWith('/api/');
    const observed=own&&!!token&&token===options.getToken();
    const epoch=sessionEpoch;
    const controller=observed?new AbortController():undefined;
    if(observed&&options.getTenant()&&!headers.has('x-tenant-id')&&!headers.has('x-target-tenant-id'))headers.set('x-tenant-id',options.getTenant()!);
    if(controller)pending.add(controller);
    try{
      const signal=controller?AbortSignal.any([controller.signal,...(init?.signal?[init.signal]:request?.signal?[request.signal]:[])]):init?.signal;
      const response=await options.fetch(input,observed?{...init,headers,signal}:init);
      if(observed&&(response.status===401||response.status===403)){
        let code='';try{code=(await response.clone().json()).code||'';}catch{}
        const revoked=response.status===401||['AUTH_USER_INACTIVE','AUTH_SESSION_REVOKED'].includes(code);
        // Resposta atrasada da conta anterior não pode desconectar uma sessão nova.
        if(revoked&&epoch===sessionEpoch&&token===options.getToken()){
          if(controller)pending.delete(controller);
          options.expired();
        }
      }
      return response;
    }finally{if(controller)pending.delete(controller);}
  };
}
export function installSessionObserver(expired:()=>void){
  const original=window.fetch;
  const wrapper=authenticatedFetch({fetch:original.bind(window),origin:window.location.origin,
    getToken:()=>localStorage.getItem('enlace_jwt'),getTenant:getApiTenant,expired});
  window.fetch=wrapper;
  return ()=>{if(window.fetch===wrapper)window.fetch=original;cancelApiRequests();};
}

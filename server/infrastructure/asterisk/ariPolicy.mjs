export function ariInputs(environment){
 const username=environment.ASTERISK_ARI_USERNAME||environment.ASTERISK_ARI_USER;
 const password=environment.ASTERISK_ARI_PASSWORD;
 const rawOrigins=environment.ASTERISK_ARI_ALLOWED_ORIGINS||environment.CORS_ALLOWED_ORIGINS;
 if(!username||!/^[-a-zA-Z0-9_]{1,64}$/.test(username)||username.toLowerCase()==='general'||typeof password!=='string'||password.length<12||password.length>128||password!==password.trim()||/[\x00-\x1f\x7f;\\]/.test(password)||!password.trim()||!rawOrigins||rawOrigins.length>4096||rawOrigins.includes('*')||/[\x00-\x1f\x7f]/.test(rawOrigins))throw new Error('Configure usuário, senha e origens ARI explícitos e válidos no ambiente do servidor.');
 const origins=rawOrigins.split(',').map(origin=>origin.trim());
 if(origins.length>16||new Set(origins).size!==origins.length||origins.some(origin=>{
  try{const url=new URL(origin);return url.origin!==origin||url.username||url.password||!(url.protocol==='https:'||environment.NODE_ENV!=='production'&&url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname));}catch{return true;}
 }))throw new Error('Origens ARI inválidas: informe origens HTTPS exatas, sem curingas, caminhos ou credenciais.');
 return {username,password,origins};
}

/** @returns {Record<string, string>} */
export function environmentValues(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Configuração de ambiente inválida: esperado objeto de variáveis textuais.');
  for(const [name,content] of Object.entries(value)){
    if(!/^[A-Z][A-Z0-9_]*$/.test(name)||typeof content!=='string'||content.includes('\0')){
      throw new Error('Configuração de ambiente inválida: confira nomes, tipos e caracteres de controle.');
    }
  }
  return value;
}

export function parseEnvironmentJson(text){
  // Erros nativos de JSON podem conter trechos do arquivo e seus segredos.
  let value;try{value=JSON.parse(text);}catch{throw new Error('Configuração JSON inválida; conteúdo omitido.');}
  return environmentValues(value);
}

export function assertProductionSecrets(values){
  const jwt=values.JWT_SECRET;const encryption=values.ENCRYPTION_KEY;
  if(typeof jwt!=='string'||jwt.trim().length<32||/^(change|example|secret|password|enlace)/i.test(jwt.trim())){
    throw new Error('JWT_SECRET existente é fraca ou de exemplo; a chave não será substituída.');
  }
  if(typeof encryption!=='string'||encryption.trim().length<32){
    throw new Error('ENCRYPTION_KEY existente é fraca; a chave não será substituída.');
  }
  if(values.WHATSAPP_VERIFY_TOKEN==='enlace_meta_webhook_token_2026')throw new Error('WHATSAPP_VERIFY_TOKEN de exemplo não é permitido em produção.');
}

export function applicationDatabaseUrl(value){
  try{
    if(typeof value!=='string'||/[\x00-\x20\x7f]/.test(value))throw new Error();
    const url=new URL(value);const password=decodeURIComponent(url.password);
    const overrides=new Set(['user','username','password','host','hostname','port','database','dbname','connectionstring']);
    if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname||url.hostname.includes('%')||url.hash||decodeURIComponent(url.username)!=='enlace_app'||url.pathname!=='/enlace_pbx'||!password||password.includes('\0')||[...url.searchParams.keys()].some(key=>overrides.has(key.toLowerCase())))throw new Error();
    return url;
  }catch{
    // Não propaga input, causa ou mensagem da URL nativa, que podem conter a senha.
    throw new Error('DATABASE_URL inválida: use PostgreSQL, usuário enlace_app, senha explícita e banco enlace_pbx, sem sobrescrever identidade ou destino por parâmetros.');
  }
}

export function administrativeDatabaseUrl(value){
  try{
    if(typeof value!=='string'||/[\x00-\x20\x7f]/.test(value))throw new Error();
    const url=new URL(value);
    if(!['postgres:','postgresql:'].includes(url.protocol)||url.hash)throw new Error();
    return url;
  }catch{throw new Error('URL administrativa PostgreSQL inválida; conteúdo omitido.');}
}

export function bootstrapCredentials(email='',password='',required=false){
  if(!required&&email===''&&password==='')return {email:'',password:''};
  if(typeof email!=='string'||typeof password!=='string'||email.trim().length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())||/[\x00-\x1f\x7f]/.test(email)){
    throw new Error('Bootstrap exige e-mail válido e senha explícita.');
  }
  if(password.trim().length<12||Buffer.byteLength(password,'utf8')>72||password.includes('\0')){
    throw new Error('Senha inicial deve ter no mínimo 12 caracteres úteis e até 72 bytes; não será truncada ou normalizada.');
  }
  return {email:email.trim().toLowerCase(),password};
}

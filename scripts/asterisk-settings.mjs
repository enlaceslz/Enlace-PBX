import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {ariInputs} from '../server/infrastructure/asterisk/ariPolicy.mjs';

export function updateIni(text,section,fields){
  if(typeof text!=='string'||!/^[-a-zA-Z0-9_]{1,64}$/.test(section)||!fields||typeof fields!=='object'||Array.isArray(fields))throw new Error('Seção INI inválida.');
  const keys=Object.keys(fields);
  if(keys.some(key=>!/^[a-z][a-z0-9_]*$/i.test(key)||typeof fields[key]!=='string'||/[\x00-\x1f\x7f;\\]/.test(fields[key])))throw new Error('Campo INI inválido.');
  const lines=text.replace(/\r\n/g,'\n').split('\n');const headers=[];
  for(let index=0;index<lines.length;index++){
    const match=lines[index].match(/^[ \t]*\[([^\]]+)\](.*)$/);
    if(match)headers.push({index,name:match[1].trim(),suffix:match[2]});
  }
  const matches=headers.filter(header=>header.name.toLowerCase()===section.toLowerCase());
  if(matches.length>1||matches.some(header=>!/^\s*(?:;.*)?$/.test(header.suffix)))throw new Error('Seção INI gerenciada duplicada ou com template exige revisão manual.');
  const values=Object.entries(fields).map(([key,value])=>key+' = '+value);
  if(!matches.length)return lines.join('\n').trimEnd()+'\n\n['+section+']\n'+values.join('\n')+'\n';
  const first=matches[0].index;const next=headers.find(header=>header.index>first)?.index??lines.length;
  const managed=new RegExp('^[ \t]*(?:'+keys.join('|')+')[ \t]*=>?','i');
  const retained=lines.slice(first+1,next).filter(line=>!managed.test(line));
  return [...lines.slice(0,first),'['+section+']',...retained,...values,'',...lines.slice(next)].join('\n');
}

export function includeManaged(text,managed){
  if(!/^\/var\/lib\/enlace-pbx\/asterisk\/(pjsip|extensions|queues)\.conf$/.test(managed))throw new Error('Include gerenciado inválido.');
  let count=0;
  for(const line of text.split('\n')){
    const match=line.match(/^[ \t]*#include[ \t]+["<]?([^">;\s]+)[">]?[ \t]*(?:;.*)?$/);
    if(match?.[1]===managed)count++;
    else if(line.trim().startsWith('#include')&&line.includes(managed))throw new Error('Include ambíguo exige revisão manual.');
  }
  if(count>1)throw new Error('Include gerenciado duplicado exige revisão manual.');
  return count?text:text+'\n; Arquivo gerenciado pelo Enlace-PBX\n#include '+managed+'\n';
}

export function asteriskSettings(settings) {
  const amiUser=settings.ASTERISK_AMI_USERNAME||settings.ASTERISK_AMI_USER;
  if(typeof amiUser!=='string'||!/^[A-Za-z][A-Za-z0-9_]{1,63}$/.test(amiUser)||amiUser.toLowerCase()==='general')throw new Error('Usuário AMI explícito e válido obrigatório.');
  if(typeof settings.ASTERISK_AMI_PASSWORD!=='string'||!/^[A-Za-z0-9_-]{32,128}$/.test(settings.ASTERISK_AMI_PASSWORD))throw new Error('Credenciais AMI exigem de 32 a 128 caracteres seguros; não serão substituídas automaticamente.');
  let ari;try{ari=ariInputs(settings);}catch{throw new Error('Credenciais ou Origens ARI inválidas. Revise o ambiente sem substituir segredos.');}
  const {username:ariUser,password:ariPassword,origins}=ari;
  return {
    'manager.conf': { general: { enabled: 'yes', port: '5038', bindaddr: '127.0.0.1' }, [amiUser]: {
      secret: settings.ASTERISK_AMI_PASSWORD, deny: '0.0.0.0/0.0.0.0', permit: '127.0.0.1/255.255.255.255',
      read: 'system,call,command,agent,user,reporting,cdr,dialplan', write: 'system,call,command,agent,user,config,originate' } },
    'ari.conf': { general: { enabled: 'yes', pretty: 'no', allowed_origins: origins.join(',') }, [ariUser]: { type: 'user', read_only: 'no', password: ariPassword } },
    'http.conf': { general: { enabled: 'yes', bindaddr: '127.0.0.1', bindport: '8088' } },
    'asterisk.conf': { options: { runuser: 'asterisk', rungroup: 'asterisk' }, files: { astctlpermissions: '0660', astctlowner: 'asterisk', astctlgroup: 'asterisk' } },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  if (!process.env.PBX_CONFIG_FILE) throw new Error('PBX_CONFIG_FILE obrigatório.');
  const configuration = asteriskSettings(JSON.parse(fs.readFileSync(process.env.PBX_CONFIG_FILE, 'utf8')));
  const directory = '/etc/asterisk';
  const directoryState=fs.lstatSync(directory);
  if(!directoryState.isDirectory()||directoryState.uid!==0||(directoryState.mode&0o022)!==0)throw new Error('Diretório Asterisk deve pertencer ao root e recusar escrita de grupo/outros.');
  const plan=Object.entries(configuration).map(([file,sections])=>{
    const target=path.join(directory,file);
    if(fs.existsSync(target)&&!fs.lstatSync(target).isFile())throw new Error('Arquivo Asterisk não regular exige revisão manual.');
    let text=fs.existsSync(target)?fs.readFileSync(target,'utf8'):'';
    for(const [section,fields] of Object.entries(sections))text=updateIni(text,section,fields);
    return {target,text};
  });
  for(const file of ['pjsip.conf','extensions.conf','queues.conf']){
    const managed='/var/lib/enlace-pbx/asterisk/'+file;
    if(!fs.existsSync(managed))continue;
    if(!fs.lstatSync(managed).isFile())throw new Error('Configuração gerenciada não regular exige revisão manual.');
    const target=path.join(directory,file);
    if(fs.existsSync(target)&&!fs.lstatSync(target).isFile())throw new Error('Arquivo Asterisk não regular exige revisão manual.');
    let text=fs.existsSync(target)?fs.readFileSync(target,'utf8'):'';
    text=includeManaged(text,managed);
    plan.push({target,text});
  }
  // A preparação integral evita escrita parcial por erro de sintaxe detectável.
  // Falhas de E/S ou interrupção ainda exigem recuperação no host antes da recarga.
  for(const {target,text} of plan){
    const nonce=crypto.randomUUID();
    if(fs.existsSync(target)){
      const backup=target+'.antes-enlace-'+nonce;
      fs.copyFileSync(target,backup,fs.constants.COPYFILE_EXCL);fs.chmodSync(backup,0o600);
    }
    const temporary=target+'.enlace-'+nonce+'.tmp';
    try{fs.writeFileSync(temporary,text,{mode:0o640,flag:'wx'});fs.renameSync(temporary,target);fs.chmodSync(target,0o640);}
    finally{fs.rmSync(temporary,{force:true});}
  }
  console.log('Configuração Asterisk atualizada preservando seções não gerenciadas.');
}

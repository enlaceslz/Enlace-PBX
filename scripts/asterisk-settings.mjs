import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {AnchoredDirectory,readBounded} from './anchored-files.mjs';
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
  const parse=line=>{const match=line.match(/^[ \t]*#(tryinclude|include)[ \t]+(?:"([^"]+)"|<([^>]+)>|([^;\s"<>]+))[ \t]*(?:;.*)?$/);return match?{kind:match[1],target:match[2]??match[3]??match[4]}:undefined;};
  let count=0;
  const lines=text.split('\n');
  for(const line of lines){
    const match=parse(line);
    if(match?.target===managed)count++;
    else if(/^#(?:try)?include/.test(line.trim())&&line.includes(managed))throw new Error('Include ambíguo exige revisão manual.');
  }
  if(count>1)throw new Error('Include gerenciado duplicado exige revisão manual.');
  if(count)return lines.map(line=>parse(line)?.target===managed?line.replace('#include','#tryinclude'):line).join('\n');
  return text+'\n; Arquivo gerenciado pelo Enlace-PBX\n#tryinclude '+managed+'\n';
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
  const group=Number(execFileSync('getent',['group','asterisk'],{encoding:'utf8'}).trim().split(':')[2]);
  const asteriskUid=Number(execFileSync('id',['-u','asterisk'],{encoding:'utf8'}).trim());
  if(!Number.isSafeInteger(group)||group<1||!Number.isSafeInteger(asteriskUid)||asteriskUid<1)throw new Error('Identidade Asterisk inválida.');
  const directory=new AnchoredDirectory('/etc/asterisk');
  const plan=[];const staged=[];let locked=false;
  try{
    const state=directory.state();
    if(![0,asteriskUid].includes(state.uid))throw new Error('Proprietário do diretório Asterisk inesperado.');
    fs.fchownSync(directory.fd,0,group);fs.fchmodSync(directory.fd,0o750);
    directory.create('.enlace-settings.lock',String(process.pid),{uid:0,gid:0,mode:0o600});locked=true;
    // A posse do diretório é fixada antes de abrir seus arquivos.
    const readFile=file=>{
      let fd;
      try{
        fd=fs.openSync(directory.location(file),fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
        const stat=fs.fstatSync(fd);
        if(!stat.isFile()||stat.nlink!==1||![0,asteriskUid].includes(stat.uid))throw new Error('Configuração Asterisk inválida ou vinculada.');
        fs.fchownSync(fd,0,group);fs.fchmodSync(fd,0o640);
        return readBounded(fd);
      }catch(error){if(error.code==='ENOENT')return undefined;throw error;}
      finally{if(fd!==undefined)fs.closeSync(fd);}
    };
    for(const [file,sections] of Object.entries(configuration)){
      const previous=readFile(file);let text=previous?.toString('utf8')??'';
      for(const [section,fields] of Object.entries(sections))text=updateIni(text,section,fields);
      plan.push({file,text,previous});
    }
    // Includes são declarados sem abrir caminhos controlados pelo processo web como root.
    for(const file of ['pjsip.conf','extensions.conf','queues.conf']){
      const previous=readFile(file);
      const text=includeManaged(previous?.toString('utf8')??'','/var/lib/enlace-pbx/asterisk/'+file);
      plan.push({file,text,previous});
    }
    // Backups usam os bytes já lidos; não reabrem o nome original.
    for(const item of plan){
      if(item.previous!==undefined)directory.create(item.file+'.antes-enlace-'+crypto.randomUUID(),item.previous,{uid:0,gid:0,mode:0o600});
      const temporary=directory.stage(item.file,item.text,{uid:0,gid:group,mode:0o640});staged.push({temporary,file:item.file});
    }
    fs.fsyncSync(directory.fd);
    for(const item of staged)directory.activate(item.temporary,item.file);
  }finally{
    try{for(const item of staged)directory.remove(item.temporary);if(locked)directory.remove('.enlace-settings.lock');}
    finally{directory.close();}
  }
  console.log('Configuração Asterisk atualizada preservando seções não gerenciadas.');
}

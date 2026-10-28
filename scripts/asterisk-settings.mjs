import fs from 'node:fs';
import path from 'node:path';

export function updateIni(text, section, fields) {
  const blocks = text.split(/(?=^\[[^\]]+\])/m);
  let found = false;
  const changed = blocks.map(block => {
    if (block.match(/^\[([^\]]+)\]/)?.[1] !== section) return block;
    found = true;
    const retained = block.split('\n').filter(line => !Object.keys(fields).some(key => new RegExp(`^\\s*${key}\\s*=`).test(line)));
    return retained.join('\n').trimEnd() + '\n' + Object.entries(fields).map(([key, value]) => `${key} = ${value}`).join('\n') + '\n\n';
  });
  if (!found) changed.push(`\n[${section}]\n` + Object.entries(fields).map(([key, value]) => `${key} = ${value}`).join('\n') + '\n');
  return changed.join('');
}

export function asteriskSettings(settings) {
  const amiUser = settings.ASTERISK_AMI_USERNAME || settings.ASTERISK_AMI_USER || 'enlace_ami';
  const ariUser = settings.ASTERISK_ARI_USERNAME || settings.ASTERISK_ARI_USER || 'enlace_ari';
  for (const user of [amiUser, ariUser]) if (!/^[A-Za-z][A-Za-z0-9_]{1,63}$/.test(user)) throw new Error('Usuário Asterisk inválido.');
  for (const password of [settings.ASTERISK_AMI_PASSWORD, settings.ASTERISK_ARI_PASSWORD]) {
    if (typeof password !== 'string' || !/^[A-Za-z0-9_-]{32,}$/.test(password)) throw new Error('Credenciais Asterisk exigem 32 caracteres seguros; não serão substituídas automaticamente.');
  }
  const origins = settings.CORS_ALLOWED_ORIGINS;
  if (!origins || /[\r\n;\[\]]/.test(origins) || origins.includes('*')) throw new Error('Origens ARI explícitas obrigatórias.');
  return {
    'manager.conf': { general: { enabled: 'yes', port: '5038', bindaddr: '127.0.0.1' }, [amiUser]: {
      secret: settings.ASTERISK_AMI_PASSWORD, deny: '0.0.0.0/0.0.0.0', permit: '127.0.0.1/255.255.255.255',
      read: 'system,call,command,agent,user,reporting,cdr,dialplan', write: 'system,call,command,agent,user,config,originate' } },
    'ari.conf': { general: { enabled: 'yes', pretty: 'no', allowed_origins: origins }, [ariUser]: { type: 'user', read_only: 'no', password: settings.ASTERISK_ARI_PASSWORD } },
    'http.conf': { general: { enabled: 'yes', bindaddr: '127.0.0.1', bindport: '8088' } },
    'asterisk.conf': { options: { runuser: 'asterisk', rungroup: 'asterisk' }, files: { astctlpermissions: '0660', astctlowner: 'asterisk', astctlgroup: 'asterisk' } },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  if (!process.env.PBX_CONFIG_FILE) throw new Error('PBX_CONFIG_FILE obrigatório.');
  const configuration = asteriskSettings(JSON.parse(fs.readFileSync(process.env.PBX_CONFIG_FILE, 'utf8')));
  const directory = '/etc/asterisk';
  for (const [file, sections] of Object.entries(configuration)) {
    const target = path.join(directory, file);
    let text = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
    if (fs.existsSync(target)) fs.copyFileSync(target, `${target}.antes-enlace-${Date.now()}`);
    for (const [section, fields] of Object.entries(sections)) text = updateIni(text, section, fields);
    fs.writeFileSync(`${target}.enlace-tmp`, text, { mode: 0o640, flag: 'wx' });
    fs.renameSync(`${target}.enlace-tmp`, target);
    fs.chmodSync(target, 0o640);
  }
  console.log('Configuração Asterisk atualizada preservando seções não gerenciadas.');
}

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

/** @returns {Record<string, string>} */
export function productionSettings(existing = {}, legacy = {}, inputs = {}) {
  const values = { ...legacy, ...existing };
  for (const [key, value] of Object.entries(inputs)) if (typeof value === 'string' && value !== '') values[key] = value;
  const domain = values.PBX_DOMAIN;
  if (!domain || domain.length > 253 || !/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]*$/i.test(domain)) throw new Error('PBX_DOMAIN deve ser um domínio válido.');
  for (const key of ['JWT_SECRET', 'ENCRYPTION_KEY']) {
    if (values[key] && values[key].length < 32) throw new Error(`${key} existente é fraca; recuse a atualização para não perder dados.`);
    values[key] ||= crypto.randomBytes(32).toString('hex');
  }
  values.WHATSAPP_VERIFY_TOKEN ||= crypto.randomBytes(24).toString('hex');
  values.ASTERISK_AMI_PASSWORD ||= crypto.randomBytes(24).toString('hex');
  values.ASTERISK_ARI_PASSWORD ||= crypto.randomBytes(24).toString('hex');
  values.DATABASE_URL ||= `postgresql://enlace_app:${crypto.randomBytes(24).toString('hex')}@127.0.0.1:5432/enlace_pbx`;
  const db = new URL(values.DATABASE_URL);
  if (decodeURIComponent(db.username) !== 'enlace_app' || db.pathname !== '/enlace_pbx') throw new Error('DATABASE_URL deve usar enlace_app no banco enlace_pbx.');
  Object.assign(values, { NODE_ENV: 'production', PORT: '3000', HOST: '127.0.0.1', TRUSTED_PROXIES: 'loopback',
    ASTERISK_CONFIG_DIR: '/var/lib/enlace-pbx/asterisk', CORS_ALLOWED_ORIGINS: `https://${domain}` });
  values.ASTERISK_HOST ||= '127.0.0.1';
  values.ASTERISK_AMI_HOST ||= values.ASTERISK_HOST;
  values.ASTERISK_AMI_PORT ||= '5038';
  values.ASTERISK_AMI_USER ||= values.ASTERISK_AMI_USERNAME || 'enlace_ami';
  values.ASTERISK_AMI_USERNAME = values.ASTERISK_AMI_USER;
  values.ASTERISK_ARI_URL ||= 'http://127.0.0.1:8088';
  values.ASTERISK_ARI_USER ||= values.ASTERISK_ARI_USERNAME || 'enlace_ari';
  values.ASTERISK_ARI_USERNAME = values.ASTERISK_ARI_USER;
  delete values.DATABASE_MIGRATION_URL;
  delete values.ADMIN_INITIAL_EMAIL;
  delete values.ADMIN_INITIAL_PASSWORD;
  delete values.PBX_CONFIG_FILE;
  delete values.NODE_OPTIONS;
  return values;
}

export function writeSettings(file, values, mode = 0o600) {
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(values, null, 2) + '\n', { mode, flag: 'wx' });
    fs.renameSync(temporary, file);
    fs.chmodSync(file, mode);
  } finally { fs.rmSync(temporary, { force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const destination = process.argv[2];
  const bootstrap = process.argv[3];
  if (!destination || !bootstrap) throw new Error('Informe os caminhos de configuração e bootstrap temporário.');
  const existing = fs.existsSync(destination) ? JSON.parse(fs.readFileSync(destination, 'utf8')) : {};
  const legacyPath = process.env.PBX_LEGACY_ENV;
  const legacy = legacyPath && fs.existsSync(legacyPath) ? dotenv.parse(fs.readFileSync(legacyPath)) : {};
  const names = ['PBX_DOMAIN', 'PBX_PUBLIC_IP', 'PBX_LAN_SUBNET', 'DATABASE_URL', 'ASTERISK_HOST', 'ASTERISK_AMI_PASSWORD', 'ASTERISK_ARI_PASSWORD'];
  const settings = productionSettings(existing, legacy, Object.fromEntries(names.map(name => [name, process.env[name]])));
  const initialEmail = process.env.ADMIN_INITIAL_EMAIL || legacy.ADMIN_INITIAL_EMAIL || '';
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || legacy.ADMIN_INITIAL_PASSWORD || '';
  if (initialPassword && (initialPassword.length < 12 || Buffer.byteLength(initialPassword, 'utf8') > 72)) throw new Error('Senha inicial deve ter no mínimo 12 caracteres e até 72 bytes.');
  writeSettings(bootstrap, { ...settings, ADMIN_INITIAL_EMAIL: initialEmail, ADMIN_INITIAL_PASSWORD: initialPassword,
    DATABASE_MIGRATION_URL: process.env.DATABASE_MIGRATION_URL || 'postgresql:///enlace_pbx?host=/var/run/postgresql' });
  writeSettings(destination, settings, 0o640);
  console.log('Configuração preservada e gravada; credenciais administrativas separadas do serviço.');
}

import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import {environmentValues,parseEnvironmentJson,assertProductionSecrets,applicationDatabaseUrl,administrativeDatabaseUrl,bootstrapCredentials} from '../server/config/environmentPolicy.mjs';
import {asteriskSettings} from './asterisk-settings.mjs';
import {assertDistinctSettingsFiles,readSettingsFile,writeConfigurationFiles} from './configuration-files.mjs';
export {writeSettings} from './configuration-files.mjs';

/** @returns {Record<string, string>} */
export function productionSettings(existing = {}, legacy = {}, inputs = {}) {
  const values = { ...environmentValues(legacy), ...environmentValues(existing) };
  for (const [key, value] of Object.entries(environmentValues(inputs))) if (value !== '') values[key] = value;
  const domain = values.PBX_DOMAIN;
  if (!domain || domain.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(domain)) throw new Error('PBX_DOMAIN deve ser um domínio válido.');
  for (const key of ['JWT_SECRET', 'ENCRYPTION_KEY']) {
    values[key] ||= crypto.randomBytes(32).toString('hex');
  }
  assertProductionSecrets(values);
  values.WHATSAPP_VERIFY_TOKEN ||= crypto.randomBytes(24).toString('hex');
  values.ASTERISK_AMI_PASSWORD ||= crypto.randomBytes(24).toString('hex');
  values.ASTERISK_ARI_PASSWORD ||= crypto.randomBytes(24).toString('hex');
  values.DATABASE_URL ||= `postgresql://enlace_app:${crypto.randomBytes(24).toString('hex')}@127.0.0.1:5432/enlace_pbx`;
  applicationDatabaseUrl(values.DATABASE_URL);
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
  // Valida o contrato de telefonia antes de gravar runtime ou bootstrap.
  asteriskSettings(values);
  delete values.DATABASE_MIGRATION_URL;
  delete values.ADMIN_INITIAL_EMAIL;
  delete values.ADMIN_INITIAL_PASSWORD;
  delete values.PBX_CONFIG_FILE;
  delete values.NODE_OPTIONS;
  delete values.PBX_DATABASE_MIGRATION_MODE;
  return values;
}

export function assertPreservedRuntime(existing, candidate) {
  const keys = new Set([...Object.keys(existing), ...Object.keys(candidate)]);
  if ([...keys].some(key => existing[key] !== candidate[key])) {
    throw new Error('Atualização recusada: a configuração de serviço mudaria. Planeje a alteração de infraestrutura separadamente antes de atualizar o código.');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const destination = process.argv[2];
  const bootstrap = process.argv[3];
  if (!destination || !bootstrap) throw new Error('Informe os caminhos de configuração e bootstrap temporário.');
  if(process.argv.length>5||process.argv[4]&&process.argv[4]!=='--preserve-existing')throw new Error('Modo de configuração inválido.');
  assertDistinctSettingsFiles(destination,bootstrap);
  const existingBytes=readSettingsFile(destination);
  const existing = existingBytes===undefined ? {} : parseEnvironmentJson(existingBytes.toString('utf8'));
  const legacyPath = process.env.PBX_LEGACY_ENV;
  const legacyBytes=legacyPath?readSettingsFile(legacyPath):undefined;
  const legacy = legacyBytes===undefined ? {} : dotenv.parse(legacyBytes);
  const names = ['PBX_DOMAIN', 'PBX_PUBLIC_IP', 'PBX_LAN_SUBNET', 'DATABASE_URL', 'ASTERISK_HOST', 'ASTERISK_AMI_PASSWORD', 'ASTERISK_ARI_PASSWORD'];
  const settings = productionSettings(existing, legacy, Object.fromEntries(names.filter(name=>process.env[name]!==undefined).map(name => [name, process.env[name]])));
  const preserve = process.argv[4] === '--preserve-existing' && existingBytes!==undefined;
  // Valida antes de criar bootstrap ou substituir qualquer configuração existente.
  if (preserve) assertPreservedRuntime(existing, settings);
  const {email:initialEmail,password:initialPassword}=bootstrapCredentials(process.env.ADMIN_INITIAL_EMAIL || legacy.ADMIN_INITIAL_EMAIL || '',process.env.ADMIN_INITIAL_PASSWORD || legacy.ADMIN_INITIAL_PASSWORD || '');
  const migrationUrl=process.env.DATABASE_MIGRATION_URL || 'postgresql:///enlace_pbx?host=/var/run/postgresql';
  administrativeDatabaseUrl(migrationUrl);
  writeConfigurationFiles(destination,settings,bootstrap,{ ...settings, ADMIN_INITIAL_EMAIL: initialEmail, ADMIN_INITIAL_PASSWORD: initialPassword,
    DATABASE_MIGRATION_URL: migrationUrl },{preserveRuntime:preserve});
  console.log('Configuração preservada e gravada; credenciais administrativas separadas do serviço.');
}

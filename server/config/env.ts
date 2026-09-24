import crypto from 'crypto';
import fs from 'fs';

/**
 * Validação Central de Ambiente e Segredos — Enlace-PBX Enterprise
 * Garante que segredos críticos nunca sejam vazios nem usem padrões fracos em produção.
 */

export interface AppEnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  JWT_SECRET: string;
  CORS_ALLOWED_ORIGINS: string[];
  DATABASE_URL?: string;
  ASTERISK_HOST: string;
  ASTERISK_AMI_PORT: number;
  ASTERISK_AMI_USER: string;
  ASTERISK_AMI_PASSWORD?: string;
  ASTERISK_ARI_URL: string;
  ASTERISK_ARI_USER: string;
  ASTERISK_ARI_PASSWORD?: string;
  GEMINI_API_KEY?: string;
  ADMIN_INITIAL_EMAIL?: string;
  ADMIN_INITIAL_PASSWORD?: string;
  WHATSAPP_VERIFY_TOKEN?: string;
  PBX_PUBLIC_IP?: string;
}

// Arquivo para persistência de chave efêmera de desenvolvimento para evitar invalidação a cada restart
const DEV_JWT_CACHE_PATH = '/tmp/.enlace_dev_jwt_secret';

export function loadEnvConfig(): AppEnvConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  const isProd = nodeEnv === 'production';

  // Validação estrita do JWT_SECRET (Fail-fast em produção)
  let jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.trim() === '') {
    if (isProd) {
      throw new Error(
        'FATAL DE PRODUÇÃO: A variável de ambiente JWT_SECRET não está definida. ' +
        'O Enlace-PBX exige uma chave JWT forte configurada em produção e não inicia com segredos padrão.'
      );
    } else {
      // Em ambiente de desenvolvimento/preview, manter segredo estável entre restarts (nunca gerar secret diferente a cada restart)
      try {
        if (fs.existsSync(DEV_JWT_CACHE_PATH)) {
          jwtSecret = fs.readFileSync(DEV_JWT_CACHE_PATH, 'utf8').trim();
        }
      } catch {
        // ignora erro de leitura em sandbox
      }

      if (!jwtSecret) {
        jwtSecret = crypto.randomBytes(32).toString('hex');
        try {
          fs.writeFileSync(DEV_JWT_CACHE_PATH, jwtSecret, 'utf8');
        } catch {
          // ignora erro de escrita em sandbox
        }
        console.warn(
          '[SEGURANÇA] JWT_SECRET não configurado. Gerando segredo criptográfico persistente de 256 bits para desenvolvimento.'
        );
      }
    }
  }

  // Validação de CORS em produção (proibido wildcard '*')
  const rawCorsOrigins = process.env.CORS_ALLOWED_ORIGINS;
  let corsOrigins: string[] = [];
  if (rawCorsOrigins) {
    corsOrigins = rawCorsOrigins.split(',').map((o) => o.trim()).filter(Boolean);
  }

  if (isProd) {
    if (corsOrigins.length === 0 || corsOrigins.includes('*')) {
      throw new Error(
        'FATAL DE PRODUÇÃO: CORS_ALLOWED_ORIGINS deve conter origens explícitas e não pode conter wildcard (*).'
      );
    }
  }

  // Validação de credenciais de telefonia Asterisk
  const amiHost = process.env.ASTERISK_AMI_HOST || process.env.ASTERISK_HOST || '127.0.0.1';
  const amiPort = parseInt(process.env.ASTERISK_AMI_PORT || '5038', 10);
  const amiUser = process.env.ASTERISK_AMI_USERNAME || process.env.ASTERISK_AMI_USER || 'enlace_ami';
  const amiPassword = process.env.ASTERISK_AMI_PASSWORD;

  const ariUrl = process.env.ASTERISK_ARI_URL || 'http://127.0.0.1:8088';
  const ariUser = process.env.ASTERISK_ARI_USERNAME || process.env.ASTERISK_ARI_USER || 'enlace_ari';
  const ariPassword = process.env.ASTERISK_ARI_PASSWORD;

  // Validação de Token do WhatsApp
  let whatsappToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (isProd && whatsappToken === 'enlace_meta_webhook_token_2026') {
    throw new Error(
      'FATAL DE PRODUÇÃO: O token WHATSAPP_VERIFY_TOKEN está utilizando um valor fraco/previsível de exemplo. ' +
      'Gere um segredo criptograficamente seguro com: openssl rand -hex 24'
    );
  }

  if (isProd && (!amiPassword || amiPassword.trim() === '')) {
    console.warn(
      '[CONFIG] ASTERISK_AMI_PASSWORD não fornecido. Conexões AMI locais/remotas serão rejeitadas pelo Asterisk até a definição da credencial.'
    );
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: parseInt(process.env.PORT || '3000', 10),
    JWT_SECRET: jwtSecret,
    CORS_ALLOWED_ORIGINS: corsOrigins,
    DATABASE_URL: process.env.DATABASE_URL,
    ASTERISK_HOST: amiHost,
    ASTERISK_AMI_PORT: amiPort,
    ASTERISK_AMI_USER: amiUser,
    ASTERISK_AMI_PASSWORD: amiPassword,
    ASTERISK_ARI_URL: ariUrl,
    ASTERISK_ARI_USER: ariUser,
    ASTERISK_ARI_PASSWORD: ariPassword,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    ADMIN_INITIAL_EMAIL: process.env.ADMIN_INITIAL_EMAIL,
    ADMIN_INITIAL_PASSWORD: process.env.ADMIN_INITIAL_PASSWORD,
    WHATSAPP_VERIFY_TOKEN: whatsappToken,
    PBX_PUBLIC_IP: process.env.PBX_PUBLIC_IP || process.env.PUBLIC_IP,
  };
}

export const env = loadEnvConfig();

export function getJwtSecret(): string {
  return env.JWT_SECRET;
}


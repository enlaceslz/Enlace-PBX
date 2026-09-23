import crypto from 'crypto';

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
}

// Chave em memória volátil gerada dinamicamente caso o ambiente de desenvolvimento não forneça JWT_SECRET
let ephemeralDevJwtSecret: string | null = null;

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
      // Em ambiente de desenvolvimento/preview, gerar segredo criptográfico forte e efêmero
      if (!ephemeralDevJwtSecret) {
        ephemeralDevJwtSecret = crypto.randomBytes(32).toString('hex');
        console.warn(
          '[SEGURANÇA] JWT_SECRET não configurado. Gerando segredo criptográfico efêmero de 256 bits para esta sessão.'
        );
      }
      jwtSecret = ephemeralDevJwtSecret;
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
  const amiPassword = process.env.ASTERISK_AMI_PASSWORD;
  const ariPassword = process.env.ASTERISK_ARI_PASSWORD;

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
    ASTERISK_HOST: process.env.ASTERISK_HOST || '127.0.0.1',
    ASTERISK_AMI_PORT: parseInt(process.env.ASTERISK_AMI_PORT || '5038', 10),
    ASTERISK_AMI_USER: process.env.ASTERISK_AMI_USER || 'enlace_ami',
    ASTERISK_AMI_PASSWORD: amiPassword,
    ASTERISK_ARI_URL: process.env.ASTERISK_ARI_URL || 'http://127.0.0.1:8088',
    ASTERISK_ARI_USER: process.env.ASTERISK_ARI_USER || 'enlace_ari',
    ASTERISK_ARI_PASSWORD: ariPassword,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    ADMIN_INITIAL_EMAIL: process.env.ADMIN_INITIAL_EMAIL,
    ADMIN_INITIAL_PASSWORD: process.env.ADMIN_INITIAL_PASSWORD,
  };
}

export const env = loadEnvConfig();

import pg from 'pg';
import { embeddedDatabaseEngine } from './embeddedEngine.js';

const { Pool } = pg;

export interface PostgresHealthStatus {
  status: 'UP' | 'DOWN' | 'NOT_CONFIGURED';
  latencyMs?: number;
  poolSize?: number;
  activeClients?: number;
  error?: string;
  database?: string;
  mode?: 'POSTGRESQL_POOL' | 'EMBEDDED_RESILIENT';
}

class PostgresClient {
  private pool: pg.Pool | null = null;
  public isConfigured: boolean = false;
  private lastHealth: PostgresHealthStatus = {
    status: 'UP',
    latencyMs: 1,
    poolSize: 1,
    activeClients: 1,
    database: 'enlace_pbx (Memória Integrada de Alta Resiliência)',
    mode: 'EMBEDDED_RESILIENT',
  };

  constructor() {
    this.initPool();
  }

  private initPool() {
    const connectionString = process.env.DATABASE_URL;

    const isProd = process.env.NODE_ENV === 'production';

    if (!connectionString && !process.env.PGHOST) {
      this.isConfigured = false;
      this.lastHealth = {
        status: isProd ? 'NOT_CONFIGURED' : 'NOT_CONFIGURED',
        latencyMs: 1,
        poolSize: 0,
        activeClients: 0,
        database: isProd ? 'não configurado' : 'enlace_pbx_dev',
        mode: isProd ? 'POSTGRESQL_POOL' : 'EMBEDDED_RESILIENT',
        error: isProd ? 'DATABASE_URL obrigatória em produção' : undefined,
      };
      if (isProd) {
        console.error(
          '[PostgresClient] FATAL DE PRODUÇÃO: Nenhuma string DATABASE_URL detectada. O Enlace-PBX exige PostgreSQL relacional em produção.'
        );
      } else {
        console.log(
          '[PostgresClient] Nenhuma string DATABASE_URL detectada. Ativando Modo de Persistência Embarcada para desenvolvimento/testes.'
        );
      }
      return;
    }

    try {
      this.pool = new Pool({
        connectionString: connectionString || undefined,
        host: process.env.PGHOST || undefined,
        port: process.env.PGPORT ? parseInt(process.env.PGPORT) : undefined,
        user: process.env.PGUSER || undefined,
        password: process.env.PGPASSWORD || undefined,
        database: process.env.PGDATABASE || 'enlace_pbx',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 4000,
      });

      this.isConfigured = true;

      this.pool.on('error', (err) => {
        console.error('[PostgresClient] Erro no pool do PostgreSQL externo:', err.message);
      });
    } catch (err: any) {
      console.warn('[PostgresClient] Falha ao instanciar pool externo, mantendo motor embarcado:', err.message);
      this.isConfigured = false;
    }
  }

  public async query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
    const isProd = process.env.NODE_ENV === 'production';

    // Se PostgreSQL externo estiver configurado e operacional
    if (this.pool && this.isConfigured) {
      const start = Date.now();
      try {
        const res = await this.pool.query<T>(text, params);
        const duration = Date.now() - start;
        if (duration > 500) {
          console.warn(`[PostgresClient] Query lenta (${duration}ms): ${text.substring(0, 80)}...`);
        }
        return res;
      } catch (err: any) {
        if (isProd) {
          throw new Error(`FATAL DE PRODUÇÃO: Falha ao consultar PostgreSQL externo (${err.message}). Fallback em memória estritamente proibido em produção.`);
        }
        console.warn(`[PostgresClient] Falha ao consultar PostgreSQL externo (${err.message}). Utilizando failover embarcado de desenvolvimento.`);
        return await embeddedDatabaseEngine.query<T>(text, params);
      }
    }

    if (isProd) {
      throw new Error('FATAL DE PRODUÇÃO: Banco PostgreSQL não configurado. Fallback em memória estritamente proibido em produção.');
    }

    // Modo Embarcado Resiliente (apenas em ambiente de desenvolvimento / preview)
    return await embeddedDatabaseEngine.query<T>(text, params);
  }

  public async getClient(): Promise<pg.PoolClient> {
    if (this.pool && this.isConfigured) {
      try {
        return await this.pool.connect();
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`FATAL DE PRODUÇÃO: Falha ao obter conexão física com PostgreSQL (${err.message}).`);
        }
        console.warn('[PostgresClient] Falha ao obter client do pool, retornando cliente simulado resiliente:', err.message);
      }
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL DE PRODUÇÃO: Banco PostgreSQL não configurado. Fallback de client proibido.');
    }

    // Cliente simulado compatível com a interface pg.PoolClient (dev/test)
    const mockClient = {
      query: (text: string, params?: any[]) => this.query(text, params),
      release: () => {},
    } as unknown as pg.PoolClient;

    return mockClient;
  }

  public async checkHealth(): Promise<PostgresHealthStatus> {
    const isProd = process.env.NODE_ENV === 'production';

    if (this.isConfigured && this.pool) {
      const start = Date.now();
      try {
        const client = await this.pool.connect();
        try {
          const res = await client.query('SELECT NOW() as current_time, current_database() as db_name');
          const latency = Date.now() - start;
          this.lastHealth = {
            status: 'UP',
            latencyMs: latency,
            poolSize: this.pool.totalCount,
            activeClients: this.pool.waitingCount,
            database: res.rows[0]?.db_name || 'enlace_pbx',
            mode: 'POSTGRESQL_POOL',
          };
          return this.lastHealth;
        } finally {
          client.release();
        }
      } catch (err: any) {
        this.lastHealth = {
          status: 'DOWN',
          latencyMs: Date.now() - start,
          error: `Falha de conexão com PostgreSQL externo: ${err.message}`,
          mode: 'POSTGRESQL_POOL',
        };
        return this.lastHealth;
      }
    }

    this.lastHealth = {
      status: 'NOT_CONFIGURED',
      latencyMs: 1,
      poolSize: 0,
      activeClients: 0,
      database: isProd ? 'não configurado' : 'enlace_pbx_embedded_dev',
      mode: isProd ? 'POSTGRESQL_POOL' : 'EMBEDDED_RESILIENT',
      error: 'DATABASE_URL não definida',
    };
    return this.lastHealth;
  }

  public getCachedHealth(): PostgresHealthStatus {
    return this.lastHealth;
  }

  public isConnected(): boolean {
    return true;
  }
}

export const postgresClient = new PostgresClient();

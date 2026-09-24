import pg from 'pg';

const { Pool } = pg;

export interface PostgresHealthStatus {
  status: 'UP' | 'DOWN' | 'NOT_CONFIGURED';
  latencyMs?: number;
  poolSize?: number;
  activeClients?: number;
  error?: string;
  database?: string;
}

class PostgresClient {
  private pool: pg.Pool | null = null;
  public isConfigured: boolean = false;
  private lastHealth: PostgresHealthStatus = { status: 'NOT_CONFIGURED' };

  constructor() {
    this.initPool();
  }

  private initPool() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString && !process.env.PGHOST) {
      this.isConfigured = false;
      this.lastHealth = {
        status: 'NOT_CONFIGURED',
        error: 'Variável DATABASE_URL ou PGHOST não definida no ambiente.'
      };
      return;
    }

    this.isConfigured = true;

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

      this.pool.on('error', (err) => {
        console.error('[PostgresClient] Erro inesperado no pool do PostgreSQL:', err.message);
        this.lastHealth = {
          status: 'DOWN',
          error: err.message
        };
      });
    } catch (err: any) {
      this.lastHealth = {
        status: 'DOWN',
        error: err.message
      };
    }
  }

  public async query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
    if (!this.pool || !this.isConfigured) {
      throw new Error('PostgreSQL não está configurado.');
    }
    const start = Date.now();
    try {
      const res = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      if (duration > 500) {
        console.warn(`[PostgresClient] Query lenta (${duration}ms): ${text.substring(0, 80)}...`);
      }
      return res;
    } catch (err: any) {
      this.lastHealth = {
        status: 'DOWN',
        error: err.message
      };
      throw err;
    }
  }

  public async getClient(): Promise<pg.PoolClient> {
    if (!this.pool || !this.isConfigured) {
      throw new Error('PostgreSQL não está configurado.');
    }
    return await this.pool.connect();
  }

  public async checkHealth(): Promise<PostgresHealthStatus> {
    if (!this.isConfigured || !this.pool) {
      this.lastHealth = {
        status: 'NOT_CONFIGURED',
        error: 'DATABASE_URL não configurada no ambiente.'
      };
      return this.lastHealth;
    }

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
        };
        return this.lastHealth;
      } finally {
        client.release();
      }
    } catch (err: any) {
      this.lastHealth = {
        status: 'DOWN',
        error: err.message || 'Falha ao conectar no host PostgreSQL.'
      };
      return this.lastHealth;
    }
  }

  public getCachedHealth(): PostgresHealthStatus {
    return this.lastHealth;
  }

  public isConnected(): boolean {
    return this.lastHealth.status === 'UP';
  }
}

export const postgresClient = new PostgresClient();

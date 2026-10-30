import {logOperational} from '../security/OperationalLog.js';
import '../../config/loadEnvironment.js';
import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import { embeddedDatabaseEngine } from './embeddedEngine.js';
import { TenantContext, toCanonicalTenantContext } from '../auth/tenantContext.js';

export type { TenantContext };
export { toCanonicalTenantContext };

const { Pool } = pg;

export interface PostgresHealthStatus {
  status: 'UP' | 'DOWN' | 'NOT_CONFIGURED';
  latencyMs?: number;
  poolSize?: number;
  activeClients?: number;
  error?: string;
  database?: string;
  mode?: 'POSTGRESQL_POOL' | 'EMBEDDED_RESILIENT';
  currentUser?: string;
  isDbAppRole?: boolean;
  productionSafe?: boolean;
}

export type TenantTransactionContext = TenantContext;

class PostgresClient {
  private pool: pg.Pool | null = null;
  private readonly readSnapshot = new AsyncLocalStorage<{id:string;active:boolean}>();
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
    if (process.env.PBX_DATABASE_MIGRATION_MODE !== '1') this.initPool();
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
        logOperational('DB_NOT_CONFIGURED');
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
        logOperational('DB_POOL_FAILURE');
      });
    } catch (err: any) {
      logOperational('DB_WARNING');
      this.isConfigured = false;
    }
  }

  /** Compartilha a visão MVCC sem compartilhar as permissões RLS de cada consulta. */
  public async withReadSnapshot<T>(callback: () => Promise<T>): Promise<T> {
    const inherited=this.readSnapshot.getStore();
    if(inherited){
      if(!inherited.active)throw new Error('Snapshot de leitura encerrado.');
      return callback();
    }
    if(!this.pool || !this.isConfigured)throw new Error('Geração consistente exige PostgreSQL conectado.');
    const client=await this.pool.connect();
    const state={id:'',active:true};
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const exported=await client.query('SELECT pg_export_snapshot() AS snapshot');
      state.id=exported.rows[0]?.snapshot;
      // O comando PostgreSQL exige literal; somente identificador emitido pelo servidor é aceito.
      if(typeof state.id!=='string'||!/^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{8}-[0-9]+$/.test(state.id))throw new Error('Identificador de snapshot inválido.');
      const result=await this.readSnapshot.run(state,callback);
      await client.query('COMMIT');
      return result;
    } catch(error){
      await client.query('ROLLBACK').catch(()=>{});
      throw error;
    } finally {
      state.active=false;
      client.release();
    }
  }

  public async query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
    if(this.readSnapshot.getStore())throw new Error('Snapshot exige acesso pelo gate RLS.');
    const isProd = process.env.NODE_ENV === 'production';

    // Se PostgreSQL externo estiver configurado e operacional
    if (this.pool && this.isConfigured) {
      const start = Date.now();
      try {
        const res = await this.pool.query<T>(text, params);
        const duration = Date.now() - start;
        if (duration > 500) {
          logOperational('DB_SLOW_QUERY', {durationMs:duration});
        }
        return res;
      } catch (err: any) {
        if (isProd) {
          throw new Error(`FATAL DE PRODUÇÃO: Falha ao consultar PostgreSQL externo (${err.message}). Fallback em memória estritamente proibido em produção.`);
        }
        logOperational('DB_WARNING');
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
    if(this.readSnapshot.getStore())throw new Error('Snapshot exige acesso pelo gate RLS.');
    if (this.pool && this.isConfigured) {
      try {
        return await this.pool.connect();
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`FATAL DE PRODUÇÃO: Falha ao obter conexão física com PostgreSQL (${err.message}).`);
        }
        logOperational('DB_WARNING');
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
          const res = await client.query(`
            SELECT 
              NOW() as current_time, 
              current_database() as db_name, 
              current_user as db_user,
              r.rolsuper,
              r.rolbypassrls,
              r.rolcreatedb,
              r.rolcreaterole
            FROM pg_roles r
            WHERE r.rolname = current_user
            LIMIT 1
          `);
          const latency = Date.now() - start;
          const currentUser = res.rows[0]?.db_user || undefined;
          const isDbAppRole = currentUser === 'enlace_app';
          const isSuperUser = res.rows[0]?.rolsuper === true;
          const hasBypassRls = res.rows[0]?.rolbypassrls === true;
          const hasCreateDb = res.rows[0]?.rolcreatedb === true;
          const hasCreateRole = res.rows[0]?.rolcreaterole === true;
          const productionSafe = !isProd || (isDbAppRole && !isSuperUser && !hasBypassRls && !hasCreateDb && !hasCreateRole);

          if (isProd && (!isDbAppRole || isSuperUser || hasBypassRls || hasCreateDb || hasCreateRole)) {
            const fatalMsg = `FATAL DE PRODUÇÃO (Fail-Closed): Conectado ao PostgreSQL como "${currentUser}" (super=${isSuperUser}, bypassrls=${hasBypassRls}, createdb=${hasCreateDb}, createrole=${hasCreateRole}). Em produção é estritamente obrigatório o uso do usuário operacional "enlace_app" sem privilégios administrativos (NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, NOCREATEROLE). Inicialização recusada.`;
            logOperational('DB_POLICY_REJECTED');
            this.lastHealth = {
              status: 'DOWN',
              latencyMs: latency,
              poolSize: this.pool.totalCount,
              activeClients: this.pool.waitingCount,
              database: res.rows[0]?.db_name || 'enlace_pbx',
              mode: 'POSTGRESQL_POOL',
              currentUser,
              isDbAppRole,
              productionSafe: false,
              error: fatalMsg,
            };
            throw new Error(fatalMsg);
          }

          this.lastHealth = {
            status: 'UP',
            latencyMs: latency,
            poolSize: this.pool.totalCount,
            activeClients: this.pool.waitingCount,
            database: res.rows[0]?.db_name || 'enlace_pbx',
            mode: 'POSTGRESQL_POOL',
            currentUser,
            isDbAppRole,
            productionSafe,
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

  public async close(): Promise<void> {
    if (this.pool) await this.pool.end();
  }

  public getCachedHealth(): PostgresHealthStatus {
    return this.lastHealth;
  }

  /**
   * Executa operação transacional isolada por tenant configurando variáveis de sessão LOCAL
   * Garante conformidade com RLS PostgreSQL sob modelo Fail-Closed e contexto canônico.
   */
  public async withTenantTransaction<T>(
    context: TenantContext,
    callback: (client: pg.PoolClient) => Promise<T>
  ): Promise<T> {
    if (!context || typeof context !== 'object') {
      throw new Error('ACCESS_DENIED: Contexto de execução de tenant inválido ou nulo (Fail-Closed).');
    }

    const { accessMode, tenantId, actorRole } = context;

    if (accessMode === 'GLOBAL') {
      if (actorRole !== 'super_admin') {
        throw new Error('ACCESS_DENIED: Operação de banco GLOBAL permitida exclusivamente para o perfil super_admin (Fail-Closed).');
      }
    } else if (accessMode === 'SUPER_ADMIN_TARGET') {
      if (actorRole !== 'super_admin') {
        throw new Error('ACCESS_DENIED: Operação SUPER_ADMIN_TARGET rejeitada. Requer perfil super_admin autenticado (Fail-Closed).');
      }
      if (!tenantId || tenantId.trim() === '') {
        throw new Error('ACCESS_DENIED: Operação SUPER_ADMIN_TARGET requer tenantId de destino explícito (Fail-Closed).');
      }
    } else if (accessMode === 'TENANT') {
      if (!tenantId || tenantId.trim() === '') {
        throw new Error('ACCESS_DENIED: Operação de banco de dados rejeitada. Tenant não especificado no contexto de execução (Fail-Closed).');
      }
    } else {
      throw new Error(`ACCESS_DENIED: Modo de acesso inválido ou desconhecido: ${accessMode} (Fail-Closed).`);
    }

    const isProd = process.env.NODE_ENV === 'production';

    if (this.pool && this.isConfigured) {
      const client = await this.pool.connect();
      try {
        const snapshot=this.readSnapshot.getStore();
        if(snapshot&&!snapshot.active)throw new Error('Snapshot de leitura encerrado.');
        await client.query(snapshot?'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY':'BEGIN');
        if(snapshot)await client.query("SET TRANSACTION SNAPSHOT '"+snapshot.id+"'");

        // Configuração segura e isolada da sessão local da transação via SET LOCAL
        if (accessMode === 'TENANT') {
          await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
          await client.query("SELECT set_config('app.is_super_admin', 'false', true)");
        } else if (accessMode === 'SUPER_ADMIN_TARGET') {
          await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
          await client.query("SELECT set_config('app.is_super_admin', 'true', true)");
        } else if (accessMode === 'GLOBAL') {
          await client.query("SELECT set_config('app.current_tenant_id', '', true)");
          await client.query("SELECT set_config('app.is_super_admin', 'true', true)");
        }

        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (err: any) {
        try {
          await client.query('ROLLBACK');
        } catch {}
        throw err;
      } finally {
        client.release();
      }
    }

    if (isProd) {
      throw new Error('FATAL DE PRODUÇÃO: Banco PostgreSQL não conectado para transação RLS.');
    }

    // Modo de desenvolvimento com cliente simulado resiliente sob transação RLS real
    const mockClient = await this.getClient();
    try {
      await mockClient.query('BEGIN');
      if (accessMode === 'TENANT') {
        await mockClient.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
        await mockClient.query("SELECT set_config('app.is_super_admin', 'false', true)");
      } else if (accessMode === 'SUPER_ADMIN_TARGET') {
        await mockClient.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
        await mockClient.query("SELECT set_config('app.is_super_admin', 'true', true)");
      } else if (accessMode === 'GLOBAL') {
        await mockClient.query("SELECT set_config('app.current_tenant_id', '', true)");
        await mockClient.query("SELECT set_config('app.is_super_admin', 'true', true)");
      }

      const result = await callback(mockClient);
      await mockClient.query('COMMIT');
      return result;
    } catch (err: any) {
      try {
        await mockClient.query('ROLLBACK');
      } catch {}
      throw err;
    } finally {
      mockClient.release();
    }
  }

  /**
   * DB Access Gate Canônico: Executa operação escopada por tenant dentro de transação RLS
   * com variáveis locais 'app.current_tenant_id' e controle de rollback automático.
   */
  public async executeTenantScoped<T>(
    contextOrTenant: TenantContext | string,
    callback: (client: pg.PoolClient, context: TenantContext) => Promise<T>
  ): Promise<T> {
    const context = toCanonicalTenantContext(contextOrTenant);
    return this.withTenantTransaction(context, (client) => callback(client, context));
  }

  /**
   * DB Access Gate Canônico: Executa operação global para super administrador dentro de transação
   * com variável local 'app.is_super_admin' = 'true' e auditoria de contexto.
   */
  public async executeGlobalScoped<T>(
    callback: (client: pg.PoolClient) => Promise<T>
  ): Promise<T> {
    const context: TenantContext = {
      tenantId: '',
      actorUserId: 'SUPER_ADMIN',
      actorRole: 'super_admin',
      accessMode: 'GLOBAL',
    };
    return this.withTenantTransaction(context, callback);
  }

  /**
   * Verifica o estado real da conexão.
   * Não retorna 'true' incondicionalmente para mascarar falhas.
   */
  public isConnected(): boolean {
    if (!this.isConfigured || !this.pool) {
      return false;
    }
    return this.lastHealth.status === 'UP';
  }
}

export const postgresClient = new PostgresClient();

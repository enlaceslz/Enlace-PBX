import '../server/config/loadEnvironment.js';
process.env.PBX_DATABASE_MIGRATION_MODE = '1';
const { DatabaseMigrator } = await import('../server/infrastructure/postgres/migrations/migrator.js');
const result = await DatabaseMigrator.runMigrations({ apply: true });
console.log(result);
process.exit(result.success ? 0 : 1);

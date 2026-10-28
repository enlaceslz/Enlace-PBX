import '../server/config/loadEnvironment.js';
const { DatabaseMigrator } = await import('../server/infrastructure/postgres/migrations/migrator.js');
const result = await DatabaseMigrator.runMigrations({ apply: true });
console.log(result);
process.exit(result.success ? 0 : 1);

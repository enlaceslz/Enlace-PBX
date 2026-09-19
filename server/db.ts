/**
 * Enlace-PBX Enterprise - Database Gateway
 * Re-exporta o estado de sementes e instâncias para compatibilidade com o ecossistema
 * e integra os repositórios PostgreSQL do sistema.
 */

import { initialSeedData } from './infrastructure/postgres/seedData.js';
export * from '../src/types/pbx.js';
export { initialSeedData, initialSeedData as db };
export default initialSeedData;

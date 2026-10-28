import fs from 'node:fs/promises';
import path from 'node:path';

export const backupDirectory = () => process.env.PBX_BACKUP_DIRECTORY || '/var/backups/enlace-pbx';
export function backupPath(name: string): string {
  if (!/^enlace-\d+-[a-f0-9]{8}\.epbx$/.test(name)) throw new Error('Nome de backup inválido.');
  return path.join(backupDirectory(), name);
}
export async function listBackups() {
  const directory = backupDirectory();
  let names: string[];
  try { names = await fs.readdir(directory); } catch (error: any) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const backups = [];
  for (const name of names) {
    if (!/^enlace-\d+-[a-f0-9]{8}\.epbx$/.test(name)) continue;
    const file = backupPath(name);
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) continue;
    try {
      const metadataFile = await fs.lstat(file + '.json');
      if (!metadataFile.isFile() || metadataFile.isSymbolicLink() || metadataFile.size > 1024 * 1024) continue;
      const metadata = JSON.parse(await fs.readFile(file + '.json', 'utf8'));
      if (metadata.format !== 1 || typeof metadata.createdAt !== 'string') continue;
      backups.push({ name, createdAt: metadata.createdAt, bytes: stat.size,
        encrypted: true, databaseConsistency: 'snapshot', filesConsistency: 'copy',
        scope: ['postgresql', 'configuration', 'asterisk', 'recordings'] });
    } catch { /* Arquivos incompletos ou sem manifesto não são anunciados como recuperáveis. */ }
  }
  return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

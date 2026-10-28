import fs from 'node:fs';
import dotenv from 'dotenv';

/** O JSON preserva senhas literalmente; nenhum arquivo de configuração é executado como shell. */
export function readEnvironmentFile(file: string): Record<string, string> {
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Configuração de ambiente inválida.');
  for (const [name, content] of Object.entries(value)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(name) || typeof content !== 'string' || content.includes('\0')) {
      throw new Error(`Configuração inválida: ${name}.`);
    }
  }
  return value;
}

if (process.env.PBX_CONFIG_FILE) {
  const values = readEnvironmentFile(process.env.PBX_CONFIG_FILE);
  for (const [name, value] of Object.entries(values)) {
    if (process.env[name] === undefined) process.env[name] = value;
  }
} else {
  dotenv.config({ quiet: true });
}

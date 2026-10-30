import fs from 'node:fs';
import dotenv from 'dotenv';
import {parseEnvironmentJson} from './environmentPolicy.mjs';

/** O JSON preserva senhas literalmente; nenhum arquivo de configuração é executado como shell. */
export function readEnvironmentFile(file: string): Record<string, string> {
  return parseEnvironmentJson(fs.readFileSync(file, 'utf8'));
}

if (process.env.PBX_CONFIG_FILE) {
  const values = readEnvironmentFile(process.env.PBX_CONFIG_FILE);
  for (const [name, value] of Object.entries(values)) {
    if (process.env[name] === undefined) process.env[name] = value;
  }
} else {
  dotenv.config({ quiet: true });
}

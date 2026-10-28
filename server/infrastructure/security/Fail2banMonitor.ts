import { execFile } from 'node:child_process';

const jailName = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$/;
const unavailable = 'Não foi possível consultar o Fail2ban no host. Verifique a instalação e a permissão de leitura do serviço.';
type Runner = (args: string[], timeout: number) => Promise<string>;

function field(output: string, label: string): string {
  const values = output.split('\n').map(line => line.replace(/^[\s|`+\-]*/, ''))
    .filter(line => line.startsWith(`${label}:`));
  if (values.length !== 1) throw new Error('Resposta do Fail2ban não reconhecida.');
  return values[0].slice(label.length + 1).trim();
}
function count(output: string, label: string): number {
  const value = field(output, label);
  if (!/^\d{1,12}$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error('Contador inválido.');
  return Number(value);
}
export function parseJailList(output: string): string[] {
  const total = count(output, 'Number of jail');
  const value = field(output, 'Jail list');
  const names = value ? value.split(',').map(name => name.trim()) : [];
  if (total > 32 || total !== names.length || new Set(names).size !== total || names.some(name => !jailName.test(name))) {
    throw new Error('Lista de jails inválida ou acima do limite de 32.');
  }
  return names;
}
export function parseJailStatus(name: string, output: string) {
  if (!jailName.test(name) || field(output, 'Status for the jail') !== name) throw new Error('Jail divergente.');
  const currentlyBanned = count(output, 'Currently banned');
  const totalBanned = count(output, 'Total banned');
  const currentlyFailed = count(output, 'Currently failed');
  const totalFailed = count(output, 'Total failed');
  if (currentlyBanned > totalBanned) throw new Error('Contadores de banimento divergentes.');
  return { name, currentlyBanned, totalBanned, currentlyFailed, totalFailed };
}
const run: Runner = (args, timeout) => new Promise((resolve, reject) => {
  execFile('/usr/bin/fail2ban-client', args, {
    timeout, maxBuffer: 128 * 1024, encoding: 'utf8', env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' },
  }, (error, stdout) => error ? reject(new Error(unavailable)) : resolve(stdout));
});

/** Consulta somente leitura, sem shell, sudo ou alteração das permissões do socket. */
export class Fail2banMonitor {
  private pending: Promise<any> | null = null;
  private cached: { until: number; value: any } | null = null;
  constructor(private readonly runner: Runner = run) {}
  snapshot(): Promise<any> {
    if (this.cached && this.cached.until > Date.now()) return Promise.resolve(this.cached.value);
    if (this.pending) return this.pending;
    this.pending = this.collect().then(value => {
      this.cached = { value, until: Date.now() + 15000 };
      return value;
    }).finally(() => { this.pending = null; });
    return this.pending;
  }
  private async collect() {
    const startedAt = new Date().toISOString();
    const deadline = Date.now() + 5000;
    const query = (args: string[]) => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error(unavailable);
      return this.runner(args, Math.min(1500, remaining));
    };
    try {
      const names = parseJailList(await query(['status']));
      const jails = [];
      for (const name of names) jails.push(parseJailStatus(name, await query(['status', name])));
      return { source: 'fail2ban-client', available: true, startedAt, observedAt: new Date().toISOString(),
        mutationsAvailable: false, jails, totalJails: jails.length,
        // O mesmo endereço pode aparecer em mais de uma jail; não é contagem de IPs únicos.
        currentBanEntries: jails.reduce((sum, jail) => sum + jail.currentlyBanned, 0) };
    } catch {
      return { source: 'fail2ban-client', available: false, startedAt, observedAt: new Date().toISOString(),
        mutationsAvailable: false, jails: [], totalJails: null, currentBanEntries: null, error: unavailable };
    }
  }
}
export const fail2banMonitor = new Fail2banMonitor();

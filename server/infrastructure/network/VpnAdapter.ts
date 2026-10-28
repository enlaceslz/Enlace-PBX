import { execFile } from 'child_process';
import fs from 'fs';
import util from 'util';

const execFilePromise = util.promisify(execFile);

export interface VpnStatus {
  installed: boolean;
  status: 'UP' | 'DOWN' | 'NOT_INSTALLED';
  interface?: string;
  details?: Record<string, any>;
  message?: string;
}

export interface WireguardPeerReal {
  interface: string;
  publicKey: string;
  endpoint?: string;
  allowedIps: string[];
  latestHandshake?: string;
  transferRxBytes: number;
  transferTxBytes: number;
}

export interface WireguardRealStatus extends VpnStatus {
  publicKey?: string;
  listenPort?: number;
  peers: WireguardPeerReal[];
}

export interface ZeroTierRealStatus extends VpnStatus {
  nodeId?: string;
  version?: string;
  networks: any[];
}

export class VpnAdapter {
  /**
   * Consulta o status real do WireGuard no kernel Linux via wg show
   */
  public static async getWireguardStatus(): Promise<WireguardRealStatus> {
    try {
      // Verifica se o binário wg está disponível
      await execFilePromise('which', ['wg'], { timeout: 2000, maxBuffer: 1024 * 1024 });
    } catch {
      return {
        installed: false,
        status: 'NOT_INSTALLED',
        peers: [],
        message: 'Binário wg (WireGuard Tools) não instalado no sistema host.'
      };
    }

    try {
      const { stdout } = await execFilePromise('wg', ['show', 'all', 'dump'], { timeout: 3000, maxBuffer: 1024 * 1024 });
      return parseWireguardDump(stdout);
    } catch (err: any) {
      return {
        installed: true,
        status: 'DOWN',
        peers: [],
        message: 'Não foi possível consultar o WireGuard; verifique as permissões do serviço.'
      };
    }
  }

  /**
   * Consulta o status real do ZeroTier One via zerotier-cli
   */
  public static async getZeroTierStatus(): Promise<ZeroTierRealStatus> {
    try {
      await execFilePromise('which', ['zerotier-cli'], { timeout: 2000, maxBuffer: 1024 * 1024 });
    } catch {
      return {
        installed: false,
        status: 'NOT_INSTALLED',
        networks: [],
        message: 'Binário zerotier-cli não instalado no sistema host.'
      };
    }

    try {
      const { stdout: statusOut } = await execFilePromise('zerotier-cli', ['-j', 'status'], { timeout: 3000, maxBuffer: 1024 * 1024 });
      const statusJson = JSON.parse(statusOut);

      const isOnline = statusJson.online === true;

      let networks: any[] = [];
      try {
        const { stdout: netOut } = await execFilePromise('zerotier-cli', ['-j', 'listnetworks'], { timeout: 3000, maxBuffer: 1024 * 1024 });
        networks = JSON.parse(netOut);
      } catch {
        // Redes vazias se não houver
      }

      return {
        installed: true,
        status: isOnline ? 'UP' : 'DOWN',
        nodeId: statusJson.address,
        version: statusJson.version,
        networks,
        message: isOnline ? 'Conectado aos root servers ZeroTier' : 'ZeroTier daemon offline'
      };
    } catch (err: any) {
      return {
        installed: true,
        status: 'DOWN',
        networks: [],
        message: 'Não foi possível consultar o ZeroTier; verifique as permissões do serviço.'
      };
    }
  }

  /**
   * Lê estatísticas de bytes reais de tráfego de rede do kernel Linux (/proc/net/dev)
   */
  public static getInterfaceStats(ifaceName: string): { rxBytes: number; txBytes: number } | null {
    try {
      if (fs.existsSync('/proc/net/dev')) {
        const content = fs.readFileSync('/proc/net/dev', 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          if (line.split(':')[0].trim() === ifaceName) {
            const parts = line.split(':')[1].trim().split(/\s+/);
            const rxBytes = parseInt(parts[0], 10) || 0;
            const txBytes = parseInt(parts[8], 10) || 0;
            return { rxBytes, txBytes };
          }
        }
      }
    } catch {
      // Ignora se não for Linux ou sem permissão
    }
    return null;
  }
}

/** Formato oficial de wg show all dump; colunas privadas nunca integram o resultado. */
export function parseWireguardDump(stdout: string): WireguardRealStatus {
  const interfaces: { interface: string; publicKey?: string; listenPort: number }[] = [];
  const peers: WireguardPeerReal[] = [];
  const integer = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : undefined;
  for (const line of stdout.split('\n').filter(line => line.trim())) {
    const parts = line.split('\t');
    if (parts.length === 5) {
      const port = integer(parts[3]);
      if (port === undefined || port > 65535) throw new Error('Resposta WireGuard inválida.');
      interfaces.push({ interface: parts[0], publicKey: parts[2] === '(none)' ? undefined : parts[2], listenPort: port });
    } else if (parts.length === 9) {
      const handshake = integer(parts[5]); const rx = integer(parts[6]); const tx = integer(parts[7]);
      if (!interfaces.some(value => value.interface === parts[0]) || handshake === undefined || rx === undefined || tx === undefined || !Number.isFinite(new Date(handshake * 1000).getTime())) throw new Error('Resposta WireGuard inválida.');
      peers.push({ interface: parts[0], publicKey: parts[1], endpoint: parts[3] === '(none)' ? undefined : parts[3],
        allowedIps: parts[4] === '(none)' ? [] : parts[4].split(','),
        latestHandshake: handshake > 0 ? new Date(handshake * 1000).toISOString() : undefined,
        transferRxBytes: rx, transferTxBytes: tx });
    } else throw new Error('Resposta WireGuard inválida.');
  }
  return { installed: true, status: interfaces.length ? 'UP' : 'DOWN', ...interfaces[0], peers };
}

/** Handshake recente indica atividade; não comprova disponibilidade da aplicação remota. */
export function hasRecentHandshake(peer: WireguardPeerReal, now = Date.now()): boolean {
  const age = now - Date.parse(peer.latestHandshake || '');
  return Number.isFinite(age) && age >= 0 && age <= 180_000;
}

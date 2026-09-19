import { exec } from 'child_process';
import fs from 'fs';
import util from 'util';

const execPromise = util.promisify(exec);

export interface VpnStatus {
  installed: boolean;
  status: 'UP' | 'DOWN' | 'NOT_INSTALLED';
  interface?: string;
  details?: Record<string, any>;
  message?: string;
}

export interface WireguardPeerReal {
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
      await execPromise('which wg');
    } catch {
      return {
        installed: false,
        status: 'NOT_INSTALLED',
        peers: [],
        message: 'Binário wg (WireGuard Tools) não instalado no sistema host.'
      };
    }

    try {
      const { stdout } = await execPromise('wg show all dump');
      const lines = stdout.trim().split('\n').filter(l => l.trim() !== '');
      if (lines.length === 0) {
        return {
          installed: true,
          status: 'DOWN',
          peers: [],
          message: 'Nenhum túnel WireGuard ativo no momento.'
        };
      }

      // Primeira linha costuma ser a interface: [interface] [public_key] [listen_port] ...
      const firstLineParts = lines[0].split('\t');
      const iface = firstLineParts[0] || 'wg0';
      const pubKey = firstLineParts[1] || '';
      const port = firstLineParts[2] ? parseInt(firstLineParts[2], 10) : 51820;

      const peers: WireguardPeerReal[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t');
        if (parts.length >= 5) {
          peers.push({
            publicKey: parts[1] || '',
            endpoint: parts[2] !== '(none)' ? parts[2] : undefined,
            allowedIps: parts[3] ? parts[3].split(',') : [],
            latestHandshake: parts[4] !== '0' ? new Date(parseInt(parts[4], 10) * 1000).toISOString() : undefined,
            transferRxBytes: parts[5] ? parseInt(parts[5], 10) : 0,
            transferTxBytes: parts[6] ? parseInt(parts[6], 10) : 0,
          });
        }
      }

      return {
        installed: true,
        status: 'UP',
        interface: iface,
        publicKey: pubKey,
        listenPort: port,
        peers
      };
    } catch (err: any) {
      return {
        installed: true,
        status: 'DOWN',
        peers: [],
        message: `Falha ao executar wg show: ${err.message}`
      };
    }
  }

  /**
   * Consulta o status real do ZeroTier One via zerotier-cli
   */
  public static async getZeroTierStatus(): Promise<ZeroTierRealStatus> {
    try {
      await execPromise('which zerotier-cli');
    } catch {
      return {
        installed: false,
        status: 'NOT_INSTALLED',
        networks: [],
        message: 'Binário zerotier-cli não instalado no sistema host.'
      };
    }

    try {
      const { stdout: statusOut } = await execPromise('zerotier-cli -j status');
      const statusJson = JSON.parse(statusOut);

      const isOnline = statusJson.online === true;

      let networks: any[] = [];
      try {
        const { stdout: netOut } = await execPromise('zerotier-cli -j listnetworks');
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
        message: `Falha ao consultar ZeroTier: ${err.message}`
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
          if (line.includes(ifaceName + ':')) {
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

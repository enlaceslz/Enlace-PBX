import { acceptedCallAction, callExtension, channelReference } from './CallControl.js';
import crypto from 'node:crypto';
import { sendAmiAction } from './AmiClient.js';
import { execFile } from 'child_process';
import util from 'util';
import net from 'net';
import http from 'http';
import { isAsteriskCommandAllowed } from './AsteriskAllowlist.js';

const execFilePromise = util.promisify(execFile);

export interface AsteriskChannelInfo {
  id: string;
  name: string;
  state: 'Ring' | 'Up' | 'Ringing' | 'Dialing';
  callerNumber: string;
  connectedLine: string;
  context: string;
  exten: string;
  application: string;
  durationSeconds: number;
  aiBridgeActive: boolean;
  tenantId?: string;
  qos?: {
    latencyMs: number;
    jitterMs: number;
    packetLossPercent: number;
  };
}

export interface AsteriskHealth {
  status: 'UP' | 'DOWN' | 'NOT_INSTALLED' | 'NOT_CONFIGURED';
  version?: string;
  uptime?: string;
  channelsCount: number | null;
  mode: 'LOCAL_CLI' | 'REMOTE_AMI' | 'REMOTE_ARI' | 'NONE';
  error?: string;
  amiConnected: boolean;
  lastChecked: string;
}

export class AsteriskAdapter {
  private host: string;
  private amiPort: number;
  private amiUser: string;
  private amiPass: string;
  private ariUrl: string;
  private ariUser: string;
  private ariPass: string;
  private hasBinary: boolean | null = null;
  private lastHealth: AsteriskHealth = {
    status: 'NOT_CONFIGURED',
    channelsCount: null,
    mode: 'NONE',
    amiConnected: false,
    lastChecked: new Date().toISOString(),
  };

  constructor() {
    this.host = process.env.ASTERISK_HOST || process.env.ASTERISK_AMI_HOST || '127.0.0.1';
    this.amiPort = parseInt(process.env.ASTERISK_AMI_PORT || '5038', 10);
    this.amiUser = process.env.ASTERISK_AMI_USER || process.env.ASTERISK_AMI_USERNAME || 'enlace_ami';
    this.amiPass = process.env.ASTERISK_AMI_PASSWORD || process.env.ASTERISK_AMI_PASS || '';
    this.ariUrl = process.env.ASTERISK_ARI_URL || 'http://127.0.0.1:8088';
    this.ariUser = process.env.ASTERISK_ARI_USER || process.env.ASTERISK_ARI_USERNAME || 'enlace_ari';
    this.ariPass = process.env.ASTERISK_ARI_PASSWORD || process.env.ASTERISK_ARI_PASS || '';
  }

  /**
   * Verifica se o binário local do Asterisk existe no PATH do sistema.
   */
  public async checkBinaryExists(): Promise<boolean> {
    if (this.hasBinary !== null) return this.hasBinary;
    try {
      await execFilePromise('which', ['asterisk']);
      this.hasBinary = true;
    } catch {
      this.hasBinary = false;
    }
    return this.hasBinary;
  }

  /**
   * @deprecated [INTERNAL/DEPRECATED] Utilize os métodos tipados do AsteriskAdapter (getChannels, hangup, transfer, originateCall).
   * Executa comando Asterisk CLI real usando asterisk -rx "...".
   */
  public async executeCli(command: string): Promise<{ success: boolean; output: string; error?: string }> {
    const hasAsterisk = await this.checkBinaryExists();
    if (!hasAsterisk) {
      return {
        success: false,
        output: '',
        error: 'Asterisk não está instalado neste ambiente. O binário "asterisk" não foi encontrado no PATH do sistema operacional.',
      };
    }

    // Sanitização rigorosa: rejeitar comandos com caracteres de controle ou novas linhas
    const sanitizedCommand = command.trim().replace(/[\r\n\0]/g, ' ');
    if (!sanitizedCommand) {
      return {
        success: false,
        output: '',
        error: 'Comando Asterisk inválido ou vazio.',
      };
    }

    // Verificação estrita na Allowlist de comandos corporativos autorizados
    if (!isAsteriskCommandAllowed(sanitizedCommand)) {
      console.warn(`[AsteriskAdapter] BLOQUEIO DE SEGURANÇA: Comando rejeitado pela Allowlist: "${sanitizedCommand}"`);
      return {
        success: false,
        output: '',
        error: 'Comando rejeitado pela Allowlist de segurança do Asterisk. Comandos arbitrários ou fora do catálogo são terminantemente proibidos.',
      };
    }

    try {
      const { stdout, stderr } = await execFilePromise('asterisk', ['-rx', sanitizedCommand], { timeout: 8000 });
      return {
        success: true,
        output: stdout || stderr,
      };
    } catch (err: any) {
      return {
        success: false,
        output: '',
        error: err.message || 'Falha ao executar comando Asterisk CLI.',
      };
    }
  }

  /**
   * @deprecated [INTERNAL/DEPRECATED] Utilize as operações AMI tipadas (hangup, transfer, originateCall).
   * Envia ação real via AMI (Asterisk Manager Interface).
   */
  public async executeAmiAction(action: string, params: Record<string, string> = {}): Promise<string> {
    return sendAmiAction({ host: this.host, port: this.amiPort, username: this.amiUser, password: this.amiPass }, action, params);
  }

  /**
   * Obtém a versão real do Asterisk.
   */
  public async getVersion(): Promise<string | null> {
    const hasAsterisk = await this.checkBinaryExists();
    if (hasAsterisk) {
      const res = await this.executeCli('core show version');
      if (res.success && res.output) {
        return res.output.trim();
      }
    }

    try {
      const amiRes = await this.executeAmiAction('CoreStatus');
      const match = amiRes.match(/CoreCurrentVersion: ([^\r\n]+)/);
      if (match) return match[1];
    } catch {
      // AMI não acessível
    }

    return null;
  }

  /**
   * Obtém o Uptime real do Asterisk.
   */
  public async getUptime(): Promise<string | null> {
    const hasAsterisk = await this.checkBinaryExists();
    if (hasAsterisk) {
      const res = await this.executeCli('core show uptime');
      if (res.success && res.output) {
        return res.output.trim();
      }
    }
    return null;
  }

  /**
   * Lista canais ativos REAIS do Asterisk.
   * Não gera NUNCA canais falsos ou sintéticos.
   */
  public async getChannels(): Promise<AsteriskChannelInfo[]> {
    const hasAsterisk = await this.checkBinaryExists();
    if (!hasAsterisk) {
      // Tenta AMI se Asterisk estiver remoto
      try {
        const amiRes = await this.executeAmiAction('CoreShowChannels');
        return this.parseAmiChannels(amiRes);
      } catch {
        return [];
      }
    }

    const res = await this.executeCli('core show channels concise');
    if (!res.success || !res.output) {
      return [];
    }

    const channels: AsteriskChannelInfo[] = [];
    const lines = res.output.split('\n');

    for (const line of lines) {
      const parts = line.trim().split('!');
      if (parts.length >= 10) {
        const [
          channelName,
          context,
          exten,
          priority,
          stateStr,
          app,
          appData,
          callerId,
          duration,
          bridgedChannel,
          uniqueId,
        ] = parts;

        channels.push({
          id: uniqueId || channelName,
          name: channelName,
          state: stateStr === 'Up' ? 'Up' : stateStr === 'Ringing' ? 'Ringing' : 'Ring',
          callerNumber: callerId || 'Desconhecido',
          connectedLine: bridgedChannel || exten || 'Central',
          context: context || 'from-internal',
          exten: exten || 's',
          application: app ? `${app}(${appData || ''})` : 'None',
          durationSeconds: parseInt(duration) || 0,
          aiBridgeActive: context.includes('gemini') || appData.includes('gemini') || exten === '9001',
        });
      }
    }

    return channels;
  }

  private parseAmiChannels(amiOutput: string): AsteriskChannelInfo[] {
    const channels: AsteriskChannelInfo[] = [];
    const events = amiOutput.split('\r\n\r\n');
    for (const block of events) {
      if (block.includes('Event: CoreShowChannel')) {
        const chanMatch = block.match(/Channel: ([^\r\n]+)/);
        const callerMatch = block.match(/CallerIDNum: ([^\r\n]+)/);
        const contextMatch = block.match(/Context: ([^\r\n]+)/);
        const extenMatch = block.match(/(?:Exten|Extension): ([^\r\n]+)/);
        const stateMatch = block.match(/ChannelStateDesc: ([^\r\n]+)/);
        const durationMatch = block.match(/Duration: ([^\r\n]+)/);
        const uniqueIdMatch = block.match(/Uniqueid: ([^\r\n]+)/i);

        if (chanMatch) {
          channels.push({
            id: uniqueIdMatch ? uniqueIdMatch[1] : chanMatch[1],
            name: chanMatch[1],
            state: stateMatch && stateMatch[1] === 'Up' ? 'Up' : 'Ring',
            callerNumber: callerMatch ? callerMatch[1] : 'Desconhecido',
            connectedLine: extenMatch ? extenMatch[1] : 'Central',
            context: contextMatch ? contextMatch[1] : 'from-internal',
            exten: extenMatch ? extenMatch[1] : 's',
            application: 'PJSIP',
            durationSeconds: durationMatch ? durationMatch[1].split(':').reduce((seconds, part) => seconds * 60 + Number(part), 0) : 0,
            aiBridgeActive: false,
          });
        }
      }
    }
    return channels;
  }

  /**
   * Encerra um canal real do Asterisk.
   */
  public async hangup(channelId: string) {
    channelReference(channelId);
    return acceptedCallAction(this.executeAmiAction.bind(this),'Hangup',{Channel:channelId});
  }

  public async transfer(channelId: string, destination: string, context='from-internal') {
    channelReference(channelId);callExtension(destination);
    if(context!=='from-internal')throw new Error('Contexto de transferência inválido.');
    return acceptedCallAction(this.executeAmiAction.bind(this),'Redirect',{Channel:channelId,Context:context,Exten:destination,Priority:'1'});
  }

  public async originateCall(caller: string, callee: string, isAi=false, context='from-internal') {
    callExtension(caller);callExtension(callee);
    if(isAi || context!=='from-internal')throw new Error('Modo de originação indisponível.');
    return acceptedCallAction(this.executeAmiAction.bind(this),'Originate',{
      Channel:`PJSIP/${caller}`,Exten:callee,Context:context,Priority:'1',CallerID:caller,Async:'true',Timeout:'30000',
    });
  }

  public async supervise(channelId: string, supervisor: string) {
    channelReference(channelId);callExtension(supervisor);
    return acceptedCallAction(this.executeAmiAction.bind(this),'Originate',{
      Channel:`PJSIP/${supervisor}`,Application:'ChanSpy',Data:`${channelId},qb`,Async:'true',Timeout:'30000',
    });
  }

  /**
   * Recarrega a pilha PJSIP no Asterisk via CLI/AMI.
   */
  public async reloadPjsip(): Promise<{ success: boolean; message: string }> {
    const hasAsterisk = await this.checkBinaryExists();
    if (hasAsterisk) {
      const res = await this.executeCli('pjsip reload');
      return {
        success: res.success,
        message: res.success ? (res.output || 'PJSIP recarregado com sucesso.') : (res.error || 'Falha ao recarregar PJSIP.'),
      };
    }

    try {
      const out = await this.executeAmiAction('Command', { Command: 'pjsip reload' });
      return { success: true, message: out };
    } catch (err: any) {
      return {
        success: false,
        message: `Asterisk Core offline para reload imediato: ${err.message}`,
      };
    }
  }

  /**
   * Verifica se o Asterisk está em execução e operacional.
   */
  public async isAsteriskRunning(): Promise<boolean> {
    const health = await this.checkHealth();
    return health.status === 'UP';
  }

  /**
   * Aplica a configuração do pjsip.conf em disco, cria backup com timestamp e recarrega a pilha
   */
  private configurationQueue: Promise<void> = Promise.resolve();

  public async applyPjsipConfig(pjsipContent: string, extensionsContent?: string): Promise<{ success: boolean; backupPath?: string; message: string }> {
    const previous = this.configurationQueue;
    let unlock!: () => void;
    this.configurationQueue = new Promise<void>(resolve => { unlock = resolve; });
    await previous;
    try { return await this.applyConfigurationFiles(pjsipContent, extensionsContent); }
    finally { unlock(); }
  }

  private async applyConfigurationFiles(pjsipContent: string, extensionsContent?: string): Promise<{ success: boolean; backupPath?: string; message: string }> {
    const fs = await import('node:fs');
    const path = await import('node:path');
    if (process.env.NODE_ENV === 'production' && !['127.0.0.1', 'localhost', '::1'].includes(this.host)) {
      return { success: false, message: 'Provisionamento remoto de arquivos Asterisk não configurado.' };
    }
    let baseDir = process.env.ASTERISK_CONFIG_DIR || '/etc/asterisk';
    if (!fs.existsSync(baseDir)) {
      if (process.env.NODE_ENV === 'production') return { success: false, message: 'Diretório gerenciado do Asterisk não provisionado.' };
      baseDir = path.join(process.cwd(), 'server/config/asterisk');
      fs.mkdirSync(baseDir, { recursive: true, mode: 0o750 });
    }
    const files = new Map<string, string>([['pjsip.conf', pjsipContent]]);
    if (extensionsContent !== undefined) files.set('extensions.conf', extensionsContent);
    for (const content of files.values()) if (typeof content !== 'string' || !content.trim() || content.length > 2 * 1024 * 1024 || content.includes('\0')) throw new Error('Configuração Asterisk inválida.');
    const backupDir = path.join(baseDir, 'backup', crypto.randomUUID());
    fs.mkdirSync(backupDir, { recursive: true, mode: 0o750 });
    const before = new Map<string, Buffer | undefined>();
    const atomicWrite = (name: string, content: string | Buffer) => {
      const temporary = path.join(baseDir, `config-${crypto.randomUUID()}.tmp`);
      try {
        fs.writeFileSync(temporary, content, { mode: 0o640, flag: 'wx' });
        fs.renameSync(temporary, path.join(baseDir, name));
      } finally { fs.rmSync(temporary, { force: true }); }
    };
    try {
      for (const [name] of files) {
        const current = path.join(baseDir, name);
        const original = fs.existsSync(current) ? fs.readFileSync(current) : undefined;
        before.set(name, original);
        if (original) fs.writeFileSync(path.join(backupDir, name), original, { mode: 0o640, flag: 'wx' });
      }
      for (const [name, content] of files) atomicWrite(name, content);
      const pjsip = await this.reloadPjsip();
      const dialplan = extensionsContent === undefined ? { success: true } : await this.reloadDialplan();
      if (!pjsip.success || !dialplan.success) throw new Error('Recarga recusada pelo Asterisk.');
      return { success: true, backupPath: backupDir, message: extensionsContent === undefined ? 'PJSIP gravado e recarregado.' : 'PJSIP e plano de discagem gravados e recarregados.' };
    } catch (error) {
      for (const [name, original] of before) {
        if (original !== undefined) atomicWrite(name, original);
        else fs.rmSync(path.join(baseDir, name), { force: true });
      }
      const pjsip = await this.reloadPjsip();
      const dialplan = extensionsContent === undefined ? { success: true } : await this.reloadDialplan();
      return { success: false, backupPath: backupDir, message: pjsip.success && dialplan.success
        ? 'A configuração foi recusada; a versão anterior foi restaurada e recarregada.'
        : 'A versão anterior foi restaurada; verifique as recargas manualmente.' };
    }
  }

  /**
   * Recarrega o Dialplan no Asterisk.
   */
  public async reloadDialplan(): Promise<{ success: boolean; message: string }> {
    const hasAsterisk = await this.checkBinaryExists();
    if (hasAsterisk) {
      const res = await this.executeCli('dialplan reload');
      return {
        success: res.success,
        message: res.success ? (res.output || 'Dialplan recarregado com sucesso.') : (res.error || 'Falha ao recarregar Dialplan.'),
      };
    }

    try {
      const out = await this.executeAmiAction('Command', { Command: 'dialplan reload' });
      return { success: true, message: out };
    } catch (err: any) {
      return {
        success: false,
        message: `Asterisk Core offline para reload imediato: ${err.message}`,
      };
    }
  }

  /**
   * Health Check Real do Asterisk:
   * Retorna NOT_INSTALLED, DOWN, ou UP baseado estritamente em consultas reais.
   */
  public async checkHealth(): Promise<AsteriskHealth> {
    const hasAsterisk = await this.checkBinaryExists();

    if (hasAsterisk) {
      const version = await this.getVersion();
      const uptime = await this.getUptime();
      let amiConnected=false;
      try{await this.executeAmiAction('CoreStatus');amiConnected=true;}catch{/* CLI disponível não comprova conexão AMI. */}

      if (version) {
        this.lastHealth = {
          status: 'UP',
          version,
          uptime: uptime || 'Ativo',
          channelsCount: null,
          mode: 'LOCAL_CLI',
          amiConnected,
          lastChecked: new Date().toISOString(),
        };
        return this.lastHealth;
      } else {
        this.lastHealth = {
          status: 'DOWN',
          channelsCount: null,
          mode: 'LOCAL_CLI',
          amiConnected: false,
          error: 'Binário "asterisk" instalado, mas o processo "asterisk" não está em execução no sistema.',
          lastChecked: new Date().toISOString(),
        };
        return this.lastHealth;
      }
    }

    // Tenta conectar via socket AMI no ASTERISK_HOST remoto se configurado
    try {
      const amiRes = await this.executeAmiAction('CoreStatus');
      const versionMatch = amiRes.match(/CoreCurrentVersion:\s*([^\r\n]+)/i);
      const realVersion = versionMatch ? versionMatch[1].trim() : 'NO_DATA';
      this.lastHealth = {
        status: 'UP',
        version: realVersion,
        uptime: 'Remoto',
        channelsCount: null,
        mode: 'REMOTE_AMI',
        amiConnected: true,
        lastChecked: new Date().toISOString(),
      };
      return this.lastHealth;
    } catch (amiErr: any) {
      this.lastHealth = {
        status: 'NOT_INSTALLED',
        channelsCount: null,
        mode: 'NONE',
        amiConnected: false,
        error: 'Asterisk 20 LTS não está instalado localmente e o AMI remoto não está acessível em 127.0.0.1:5038.',
        lastChecked: new Date().toISOString(),
      };
      return this.lastHealth;
    }
  }

  public getCachedHealth(): AsteriskHealth {
    return this.lastHealth;
  }
}

export const asteriskAdapter = new AsteriskAdapter();

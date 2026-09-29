import { execFile } from 'child_process';
import util from 'util';
import { AsteriskAdapter, asteriskAdapter } from './AsteriskAdapter.js';
import { AuditLogRepository } from '../postgres/repositories/AuditLogRepository.js';
import {
  STATIC_ALLOWLIST,
  PARAMETERIZED_PATTERNS,
  isAsteriskCommandAllowed,
} from './AsteriskAllowlist.js';

const execFilePromise = util.promisify(execFile);

export interface CommandExecutionResult {
  success: boolean;
  command: string;
  output: string;
  error?: string;
  isAllowed: boolean;
}

/**
 * AsteriskCommandService — Camada estruturada e controlada de execução CLI
 * Protege o sistema contra Command Injection, Shell Injection e execução arbitrária.
 * Utiliza execFile diretamente (sem shell /bin/sh intermediário) e validação estrita por Allowlist.
 */
export class AsteriskCommandService {
  public static readonly STATIC_ALLOWLIST = STATIC_ALLOWLIST;
  public static readonly PARAMETERIZED_PATTERNS = PARAMETERIZED_PATTERNS;

  /**
   * Valida se um comando está estritamente autorizado na Allowlist
   */
  public static isCommandAllowed(rawCommand: string): boolean {
    return isAsteriskCommandAllowed(rawCommand);
  }

  /**
   * Executa comando Asterisk com verificação prévia de Allowlist e proteção contra injection.
   * Não utiliza `sh -c` ou `exec` com strings concatenadas.
   */
  public static async executeSafeCli(
    rawCommand: string,
    context?: { tenantId?: string; userId?: string; ip?: string }
  ): Promise<CommandExecutionResult> {
    const normalized = (rawCommand || '').trim().replace(/\s+/g, ' ');

    if (!normalized) {
      return {
        success: false,
        command: rawCommand,
        output: '',
        error: 'Comando vazio informado.',
        isAllowed: false,
      };
    }

    // 1. Verificação rigorosa na Allowlist
    if (!this.isCommandAllowed(normalized)) {
      console.warn(`[AsteriskCommandService] BLOQUEIO DE SEGURANÇA: Comando rejeitado pela Allowlist: "${normalized}"`);
      
      // Registrar tentativa bloqueada na auditoria
      if (context?.tenantId) {
        try {
          await AuditLogRepository.create({
            tenantId: context.tenantId,
            userId: context.userId || 'system',
            userName: 'Sistema de Segurança',
            action: 'ASTERISK_CLI_BLOCKED',
            resource: 'asterisk/cli',
            details: `Comando não autorizado bloqueado pela Allowlist: ${normalized}`,
            ip: context.ip || '127.0.0.1',
          });
        } catch {}
      }

      return {
        success: false,
        command: normalized,
        output: '',
        error: `Comando não permitido. O Enlace-PBX opera com Allowlist estrita para o Asterisk CLI. Comandos não catalogados ou arbitrários são proibidos.`,
        isAllowed: false,
      };
    }

    // 2. Verifica se o Asterisk está instalado
    const hasAsterisk = await asteriskAdapter.checkBinaryExists();
    if (!hasAsterisk) {
      // Se binário local não existir, tenta executar via AMI Command Action caso AMI esteja conectada
      try {
        const amiOut = await asteriskAdapter.executeAmiAction('Command', { Command: normalized });
        return {
          success: true,
          command: normalized,
          output: amiOut || 'Comando executado via AMI.',
          isAllowed: true,
        };
      } catch (amiErr: any) {
        return {
          success: false,
          command: normalized,
          output: '',
          error: `Asterisk não está instalado localmente e a interface AMI não pôde ser contatada: ${amiErr.message}`,
          isAllowed: true,
        };
      }
    }

    // 3. Execução controlada via execFile (sem shell intermediário)
    try {
      const { stdout, stderr } = await execFilePromise('asterisk', ['-rx', normalized], {
        timeout: 8000,
        maxBuffer: 1024 * 1024 * 2, // 2MB máximo de saída
      });

      return {
        success: true,
        command: normalized,
        output: stdout || stderr,
        isAllowed: true,
      };
    } catch (err: any) {
      return {
        success: false,
        command: normalized,
        output: '',
        error: err.message || 'Falha ao executar comando Asterisk CLI.',
        isAllowed: true,
      };
    }
  }

  /**
   * Retorna a lista de comandos suportados para documentação e autocompletion seguro na UI
   */
  public static getAllowedCommandsList(): string[] {
    return Array.from(this.STATIC_ALLOWLIST);
  }

  /**
   * Operações Estruturadas Tipadas (Sem passagem de strings brutas)
   */
  public static async getVersion(): Promise<string> {
    const res = await this.executeSafeCli('core show version');
    return res.output || 'Asterisk Core Version';
  }

  public static async getChannels(): Promise<string> {
    const res = await this.executeSafeCli('core show channels concise');
    return res.output;
  }

  public static async hangupChannel(channelId: string): Promise<boolean> {
    if (!/^[a-zA-Z0-9_\-\./]+$/.test(channelId) || channelId.includes('..')) {
      throw new Error('Identificador de canal inválido para hangup.');
    }
    const res = await this.executeSafeCli(`channel request hangup ${channelId}`);
    return res.success;
  }

  public static async redirectChannel(
    channelId: string,
    context: string,
    destination: string,
    priority: number = 1
  ): Promise<boolean> {
    if (
      !/^[a-zA-Z0-9_\-\./]+$/.test(channelId) ||
      !/^[a-zA-Z0-9_\-]+$/.test(context) ||
      !/^[a-zA-Z0-9_\-]+$/.test(destination)
    ) {
      throw new Error('Parâmetros inválidos para redirecionamento de canal.');
    }
    const res = await this.executeSafeCli(`channel redirect ${channelId} ${context},${destination},${priority}`);
    return res.success;
  }

  public static async reloadPjsip(): Promise<{ success: boolean; message: string }> {
    const res = await this.executeSafeCli('pjsip reload');
    return { success: res.success, message: res.output || res.error || '' };
  }

  public static async reloadDialplan(): Promise<{ success: boolean; message: string }> {
    const res = await this.executeSafeCli('dialplan reload');
    return { success: res.success, message: res.output || res.error || '' };
  }

  public static async showEndpoint(endpoint: string): Promise<string> {
    if (!/^[a-zA-Z0-9_\-]+$/.test(endpoint)) {
      throw new Error('Nome de endpoint PJSIP inválido.');
    }
    const res = await this.executeSafeCli(`pjsip show endpoint ${endpoint}`);
    return res.output;
  }

  public static async originateCall(
    caller: string,
    callee: string,
    context: string = 'from-internal'
  ): Promise<{ success: boolean; message: string }> {
    if (!/^[a-zA-Z0-9_\-]+$/.test(caller) || !/^[a-zA-Z0-9_\-]+$/.test(callee) || !/^[a-zA-Z0-9_\-]+$/.test(context)) {
      throw new Error('Parâmetros inválidos para originação de chamada.');
    }
    const res = await this.executeSafeCli(`channel originate PJSIP/${caller} extension ${callee}@${context}`);
    return { success: res.success, message: res.output || res.error || '' };
  }

  public static async startChanSpy(
    supervisorExt: string,
    targetChannel: string,
    options: string = 'qb'
  ): Promise<{ success: boolean; message: string }> {
    if (!/^[a-zA-Z0-9_\-]+$/.test(supervisorExt)) {
      throw new Error('Ramal de supervisor inválido.');
    }
    if (!/^[a-zA-Z0-9_\-\./]+$/.test(targetChannel) || targetChannel.includes('..')) {
      throw new Error('Identificador de canal alvo inválido para ChanSpy.');
    }
    if (!/^[a-zA-Z]{1,5}$/.test(options)) {
      throw new Error('Opções inválidas para ChanSpy.');
    }
    const res = await this.executeSafeCli(`originate PJSIP/${supervisorExt} application ChanSpy ${targetChannel},${options}`);
    return { success: res.success, message: res.output || res.error || '' };
  }
}

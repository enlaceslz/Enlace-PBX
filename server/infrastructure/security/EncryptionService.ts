import crypto from 'crypto';

/**
 * EncryptionService — Criptografia bidirecional autenticada AES-256-GCM para segredos SIP e credenciais
 * 
 * Regras:
 * - Utiliza AES-256-GCM com IV único aleatório de 96 bits (12 bytes) e Auth Tag de 128 bits (16 bytes).
 * - Chave de criptografia derivada de ENCRYPTION_KEY ou JWT_SECRET via HKDF/Scrypt.
 * - Formato serializado seguro: enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
 * - Suporta migração transparente: dados em texto plano legados são lidos e automaticamente encriptados no próximo salvamento.
 * - Nunca expõe chaves no frontend, logs ou retornos de API.
 */
export class EncryptionService {
  private static cachedKey: Buffer | null = null;

  private static getEncryptionKey(): Buffer {
    if (this.cachedKey) {
      return this.cachedKey;
    }

    const isProd = process.env.NODE_ENV === 'production';
    const rawKey = process.env.ENCRYPTION_KEY?.trim();

    if (!rawKey) {
      if (isProd) {
        throw new Error(
          'FATAL PRODUÇÃO: ENCRYPTION_KEY é obrigatória para o serviço de criptografia AES-256-GCM. ' +
          'O uso de fallback, JWT_SECRET ou senhas estáticas é terminantemente proibido em produção.'
        );
      }
      console.warn(
        '[EncryptionService] AVISO: ENCRYPTION_KEY não definida em desenvolvimento. ' +
        'Gerando chave volátil em memória para a sessão de preview.'
      );
      // Em dev sem variável, gera chave aleatória criptográfica para a sessão (não determinística e sem segredo fixo)
      this.cachedKey = crypto.randomBytes(32);
      return this.cachedKey;
    }

    if (rawKey.length < 32) {
      throw new Error('FATAL SEGURANÇA: ENCRYPTION_KEY deve possuir no mínimo 32 caracteres (256 bits).');
    }

    // Derivação criptograficamente segura de chave de 256 bits (32 bytes) via Scrypt com sal dedicado
    this.cachedKey = crypto.scryptSync(rawKey, 'enlace-pbx-enterprise-aes-salt-v1', 32);
    return this.cachedKey;
  }

  /**
   * Criptografa uma string sensível (ex: senha SIP) utilizando AES-256-GCM.
   */
  public static encrypt(plaintext: string): string {
    if (!plaintext || typeof plaintext !== 'string') {
      return '';
    }

    // Se já estiver criptografado, não encripta duas vezes
    if (this.isEncrypted(plaintext)) {
      return plaintext;
    }

    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(12); // IV de 12 bytes recomendado pelo NIST para GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    return `enc:v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Descriptografa uma string encriptada com AES-256-GCM.
   * Se o valor for legado em texto plano, retorna o valor original para compatibilidade e migração.
   */
  public static decrypt(value: string): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    if (!this.isEncrypted(value)) {
      // Valor legado em texto plano
      return value;
    }

    try {
      const parts = value.split(':');
      if (parts.length !== 5 || parts[0] !== 'enc' || parts[1] !== 'v1') {
        throw new Error('Formato de envelope criptográfico inválido.');
      }

      const iv = Buffer.from(parts[2], 'hex');
      const tag = Buffer.from(parts[3], 'hex');
      const ciphertext = Buffer.from(parts[4], 'hex');

      const key = this.getEncryptionKey();
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (err: any) {
      console.error('[EncryptionService] Erro ao descriptografar segredo SIP:', err.message);
      return '';
    }
  }

  /**
   * Verifica se o valor já está gravado em formato criptografado autenticado.
   */
  public static isEncrypted(value: string): boolean {
    return typeof value === 'string' && value.startsWith('enc:v1:');
  }

  /**
   * Mascara segredos para visualização administrativa segura (zero vazamento de credenciais na UI/API)
   */
  public static maskSecret(value?: string): string {
    if (!value || value.trim() === '') {
      return '';
    }
    return '••••••••';
  }
}

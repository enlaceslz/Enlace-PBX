/** Rejeita quebra de diretiva/linha antes de renderizar configuração Asterisk. */
export function assertSingleLineConfig(value: unknown): void {
  if (typeof value === 'string' && /[\r\n\0]/.test(value)) throw new Error('Campo de configuração Asterisk contém caracteres de controle.');
  if (Array.isArray(value)) for (const item of value) assertSingleLineConfig(item);
  else if (value && typeof value === 'object') for (const item of Object.values(value)) assertSingleLineConfig(item);
}

export function safeTrunkPayload(value: object): Record<string, unknown> {
  const { secret, secretEncrypted, secret_encrypted, ...safe } = value as Record<string, unknown>;
  return safe;
}

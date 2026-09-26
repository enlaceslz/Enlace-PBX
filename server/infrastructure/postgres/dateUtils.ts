/**
 * Converte de forma segura qualquer valor (Date, string ISO, timestamp em ms ou nulo)
 * em uma string ISO 8601 válida, prevenindo exceções de "toISOString is not a function".
 */
export function toSafeIsoString(val: any): string | undefined {
  if (val === null || val === undefined || val === '') {
    return undefined;
  }
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? undefined : val.toISOString();
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
}

export function toSafeIsoStringOrNow(val: any): string {
  return toSafeIsoString(val) || new Date().toISOString();
}

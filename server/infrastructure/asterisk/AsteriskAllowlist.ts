/**
 * AsteriskAllowlist — Lista Branca Estrita de Comandos Asterisk CLI
 * Protege contra injeção de comandos, execução de scripts e comandos fora do catálogo corporativo.
 */

export const STATIC_ALLOWLIST: ReadonlySet<string> = new Set([
  // Core & Status
  'core show version',
  'core show uptime',
  'core show channels',
  'core show channels concise',
  'core show calls',
  'core show sysinfo',
  'core show uptime seconds',
  'core reload',

  // PJSIP
  'pjsip show endpoints',
  'pjsip show aors',
  'pjsip show auths',
  'pjsip show contacts',
  'pjsip show registrations',
  'pjsip show transports',
  'pjsip reload',

  // Dialplan
  'dialplan show',
  'dialplan reload',

  // Queues
  'queue show',
  'queue reload all',

  // Modules
  'module show',
  'module reload',
  'module show like pjsip',
  'module show like ari',
  'module show like audiosocket',

  // Bridges & Media
  'bridge show all',
]);

export const PARAMETERIZED_PATTERNS: Array<{
  name: string;
  regex: RegExp;
  validator: (matches: RegExpMatchArray) => boolean;
}> = [
  {
    name: 'core show channel',
    regex: /^core show channel ([a-zA-Z0-9_\-\./]+)$/,
    validator: (m) => m[1].length <= 80 && !m[1].includes('..'),
  },
  {
    name: 'pjsip show endpoint',
    regex: /^pjsip show endpoint ([a-zA-Z0-9_\-]+)$/,
    validator: (m) => m[1].length <= 50,
  },
  {
    name: 'pjsip show aor',
    regex: /^pjsip show aor ([a-zA-Z0-9_\-]+)$/,
    validator: (m) => m[1].length <= 50,
  },
  {
    name: 'pjsip show auth',
    regex: /^pjsip show auth ([a-zA-Z0-9_\-]+)$/,
    validator: (m) => m[1].length <= 50,
  },
  {
    name: 'dialplan show context',
    regex: /^dialplan show ([a-zA-Z0-9_\-]+)$/,
    validator: (m) => m[1].length <= 50,
  },
  {
    name: 'queue show specific',
    regex: /^queue show ([a-zA-Z0-9_\-]+)$/,
    validator: (m) => m[1].length <= 50,
  },
  {
    name: 'channel request hangup',
    regex: /^channel request hangup ([a-zA-Z0-9_\-\./]+)$/,
    validator: (m) => m[1].length <= 80 && !m[1].includes('..'),
  },
  {
    name: 'channel redirect',
    regex: /^channel redirect ([a-zA-Z0-9_\-\./]+) ([a-zA-Z0-9_\-]+),([a-zA-Z0-9_\-]+),([0-9]{1,3})$/,
    validator: (m) => m[1].length <= 80 && m[2].length <= 50 && m[3].length <= 30,
  },
  {
    name: 'channel originate',
    regex: /^channel originate PJSIP\/([a-zA-Z0-9_\-]+) extension ([a-zA-Z0-9_\-]+)@([a-zA-Z0-9_\-]+)$/,
    validator: (m) => m[1].length <= 50 && m[2].length <= 50 && m[3].length <= 50,
  },
  {
    name: 'chanspy originate',
    regex: /^originate PJSIP\/([a-zA-Z0-9_\-]+) application ChanSpy ([a-zA-Z0-9_\-\./]+)(?:,([a-zA-Z]+))?$/,
    validator: (m) => m[1].length <= 50 && m[2].length <= 80 && !m[2].includes('..') && (!m[3] || /^[a-zA-Z]{1,5}$/.test(m[3])),
  },
];

export function isAsteriskCommandAllowed(rawCommand: string): boolean {
  const normalized = (rawCommand || '').trim().replace(/\s+/g, ' ');
  if (!normalized) return false;

  if (STATIC_ALLOWLIST.has(normalized)) {
    return true;
  }

  for (const pattern of PARAMETERIZED_PATTERNS) {
    const match = normalized.match(pattern.regex);
    if (match && pattern.validator(match)) {
      return true;
    }
  }

  return false;
}

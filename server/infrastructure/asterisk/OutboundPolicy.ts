// Números nacionais, E.164 brasileiro, seleção de prestadora, 0300/0800 e emergência.
export const BRAZIL_OUTBOUND_PATTERN = '^([1-9][0-9]{9,10}|55[1-9][0-9]{9,10}|0[1-9][0-9][1-9][0-9]{9,10}|0[38]00[0-9]{7}|1(80|81|85|88|90|92|93|99))$';
export const PREMIUM_OUTBOUND_PATTERN = '^(0?900|55900|0[0-9]{2}900)';

export function isAllowedOutboundNumber(number: string): boolean {
  const normalized = /^\+55\d+$/.test(number) ? number.slice(1) : number;
  return new RegExp(BRAZIL_OUTBOUND_PATTERN).test(normalized) && !new RegExp(PREMIUM_OUTBOUND_PATTERN).test(normalized);
}

export function outboundGuardDialplan(): string {
  return `[enlace-outbound-guard]
exten => s,1,Set(ENLACE_DEST=\${ARG1})
 same => n,ExecIf(\${REGEX("^[+]55[0-9]+$" \${ENLACE_DEST})}?Set(ENLACE_DEST=\${ENLACE_DEST:1}))
 same => n,GotoIf(\${REGEX("${PREMIUM_OUTBOUND_PATTERN}" \${ENLACE_DEST})}?denied)
 same => n,GotoIf(\${REGEX("${BRAZIL_OUTBOUND_PATTERN}" \${ENLACE_DEST})}?allowed:denied)
 same => n(denied),NoOp(Enlace-PBX: destino bloqueado pela politica de saida)
 same => n,Hangup(21)
 same => n(allowed),Return()
`;
}

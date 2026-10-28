/** Diálogo persistido é contexto, não política do sistema nem resultado certificado. */
export function persistedDialogue(turns: Array<{role:string;content:string}>): string {
  return turns.filter(turn=>['user','assistant'].includes(turn.role) && typeof turn.content==='string')
    .slice(-6).map(turn=>`${turn.role==='user'?'Usuário':'Assistente'}: ${turn.content.slice(0,4000)}`).join('\n');
}
export function voiceMessage(value: unknown): string {
  if(typeof value!=='string' || !value.trim() || value.length>8000)throw new Error('Mensagem inválida: informe até 8000 caracteres.');
  return value;
}

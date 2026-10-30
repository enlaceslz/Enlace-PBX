const events={
  SERVER_OPERATION_FAILURE:'Falha em operação do servidor.',
  BOOTSTRAP_COMPLETED:'Conta administrativa inicial provisionada.',
  SERVER_STARTUP_FAILURE:'Falha na inicialização do servidor.',
  UNCAUGHT_EXCEPTION:'Exceção não tratada; encerramento do processo.',
  UNHANDLED_REJECTION:'Rejeição assíncrona não tratada; encerramento do processo.',
  DB_NOT_CONFIGURED:'PostgreSQL obrigatório não configurado.',
  DB_POOL_FAILURE:'Falha no pool de conexões PostgreSQL.',
  DB_POLICY_REJECTED:'Conexão PostgreSQL recusada pela política de privilégios.',
  SERVER_WARNING:'Aviso operacional do servidor.',
  DB_OPERATION_FAILURE:'Falha em operação PostgreSQL.',
  DB_WARNING:'Aviso operacional PostgreSQL.',
  DB_SLOW_QUERY:'Consulta PostgreSQL acima do tempo de referência.',
  AUDIT_OPERATION_FAILURE:'Falha em operação da trilha de auditoria.',
  AI_PROVIDER_FAILURE:'Provedor de IA indisponível nesta tentativa.',
  AI_PROVIDER_FALLBACK:'Tentativa de contingência de provedor de IA.',
  SIP_COMMAND_REJECTED:'Comando Asterisk recusado pela política.',
  SECRET_EPHEMERAL_KEY:'Chave efêmera usada apenas no ambiente de desenvolvimento.',
  SECRET_OPERATION_FAILURE:'Falha na operação de credencial cifrada.',
  HTTP_RESPONSE_FAILURE:'Falha na resposta HTTP.',
} as const;
export type OperationalEvent=keyof typeof events;
/** Somente metadados escalares verificados saem; erros, SQL e respostas externas não são serializados. */
export function operationalRecord(event:OperationalEvent,context?:{requestId?:unknown;status?:unknown;durationMs?:unknown}){
  const code=typeof event==='string'&&Object.hasOwn(events,event)?event:'SERVER_OPERATION_FAILURE';
  const record:Record<string,string|number>={event:code,message:events[code]};
  if(typeof context?.requestId==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(context.requestId))record.requestId=context.requestId;
  if(typeof context?.status==='number'&&Number.isInteger(context.status)&&context.status>=100&&context.status<=599)record.status=context.status;
  if(typeof context?.durationMs==='number'&&Number.isFinite(context.durationMs)&&context.durationMs>=0&&context.durationMs<=600000)record.durationMs=Math.round(context.durationMs);
  return record;
}
export function logOperational(event:OperationalEvent,context?:Parameters<typeof operationalRecord>[1]){
  console.error(JSON.stringify(operationalRecord(event,context)));
}

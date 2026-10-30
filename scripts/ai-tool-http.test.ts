import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { compileToolSchema, executeAiToolHttp, validateToolDefinition } from '../server/maia/integrations/AiToolHttpExecution.js';
import type { AiTool } from '../src/types/pbx.js';

const schema = { type: 'object', properties: { documento: { type: 'string', minLength: 3, maxLength: 20 } }, required: ['documento'] };

test('schemas de ferramentas recusam complexidade perigosa, coerção e parâmetros adicionais', () => {
  const validate = compileToolSchema(schema);
  assert.equal(validate({ documento: '123' }), true);
  assert.equal(validate({ documento: 123 }), false);
  assert.equal(validate({ documento: '123', admin: true }), false);
  for (const invalid of [{}, { type: 'object', $ref: 'https://example.invalid/schema' },
    { type: 'object', properties: { x: { type: 'string', pattern: '(a+)+$' } } },
    { type: 'object', additionalProperties: true },
    { type: 'object', properties: { x: { type: 'array', items: true } } },
    JSON.parse('{"type":"object","properties":{"__proto__":{"type":"string"}}}')]) assert.throws(() => compileToolSchema(invalid));
  assert.throws(() => validateToolDefinition({ name: 'Teste', endpoint: 'https://usuario:senha@example.invalid', method: 'POST', requiresConfirmation: false, schemaJson: schema }), /credenciais/);
});

test('ferramenta executa POST e GET reais com vínculo exato, confirmação e auditoria anterior', async () => {
  let hits = 0; let audited = ''; let lastUrl = '';
  const server = http.createServer((req, res) => {
    hits++; lastUrl = req.url || '';
    assert.equal(req.headers.authorization, 'Bearer segredo-interno');
    assert.equal(req.headers['x-enlace-request-id'], audited);
    const chunks: Buffer[] = []; req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => res.end(JSON.stringify({ recebido: chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null })));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
  const tool: AiTool = { id: 'tool-a', tenantId: 'empresa-a', name: 'Consulta', description: '', endpoint: origin + '/acao', method: 'POST', requiresConfirmation: true, schemaJson: schema, mockResponse: { inventado: true } };
  const binding = { tenantId: tool.tenantId, toolId: tool.id, endpoint: tool.endpoint, method: tool.method, bearerToken: 'segredo-interno' };
  const options = { bindings: [binding], policy: { allowedOrigins: [origin], privateOrigins: [origin] }, beforeSend: async (id: string) => { audited = id; } };
  try {
    const result = await executeAiToolHttp(tool, { documento: '12 & 3' }, true, options);
    assert.deepEqual(result.result, { recebido: { documento: '12 & 3' } }); assert.equal(result.httpStatus, 200);
    assert.equal(result.executionId, audited); assert.doesNotMatch(JSON.stringify(result), /segredo-interno|inventado/);
    const getTool = { ...tool, method: 'GET' as const };
    await executeAiToolHttp(getTool, { documento: '12 & 3' }, true, { ...options, bindings: [{ ...binding, method: 'GET' }] });
    assert.equal(lastUrl, '/acao?documento=12+%26+3');
    const before = hits;
    const beforeInvalidAudit=audited;
    for(const invalid of [undefined,null,0,'false'])await assert.rejects(executeAiToolHttp({...tool,requiresConfirmation:invalid as any},{documento:'123'},true,options),/confirmação/);
    await assert.rejects(executeAiToolHttp({...tool,name:''},{documento:'123'},true,options),/Nome/);
    await assert.rejects(executeAiToolHttp({...tool,schemaJson:{type:'object',$ref:'https://example.invalid/schema'}},{documento:'123'},true,options),/Schema/);
    assert.equal(audited,beforeInvalidAudit,'Definição inválida é recusada antes da tentativa auditada de envio.');

    await assert.rejects(executeAiToolHttp(tool, null, true, options), /objeto JSON/);
    await assert.rejects(executeAiToolHttp(tool, { documento: '123' }, false, options), /Confirme/);
    await assert.rejects(executeAiToolHttp(tool, { documento: 123 }, true, options), /Schema/);
    await assert.rejects(executeAiToolHttp(tool, { documento: '123', extra: true }, true, options), /Schema/);
    await assert.rejects(executeAiToolHttp({ ...tool, tenantId: 'outra' }, { documento: '123' }, true, options), /vínculo/);
    await assert.rejects(executeAiToolHttp({ ...tool, endpoint: origin + '/outro' }, { documento: '123' }, true, options), /vínculo/);
    await assert.rejects(executeAiToolHttp(tool, { documento: '123' }, true, { ...options, bindings: [] }), /vínculo/);
    await assert.rejects(executeAiToolHttp(tool, { documento: '123' }, true, { ...options, bindings: [binding, binding] }), /vínculo/);
    await assert.rejects(executeAiToolHttp(tool, { documento: '123' }, true, { ...options, beforeSend: async () => { throw new Error('Auditoria indisponível'); } }), /Auditoria/);
    await assert.rejects(executeAiToolHttp(tool, { documento: '123' }, true, { ...options, policy: { allowedOrigins: [], privateOrigins: [] } }), /Origem não autorizada/);
    assert.equal(hits, before, 'Nenhuma tentativa proibida pode alcançar o destino.');
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

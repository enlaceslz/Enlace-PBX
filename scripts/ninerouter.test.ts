import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { NineRouterProvider } from '../server/maia/gateway/providers/NineRouterProvider.js';

test('9router consulta catálogo e geração reais sem inventar saúde, modelos ou consumo', async () => {
  const keys = ['NINEROUTER_URL', 'NINEROUTER_API_KEY', 'NINEROUTER_MODEL', 'OUTBOUND_ALLOWED_ORIGINS', 'OUTBOUND_PRIVATE_ORIGINS'];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  let mode = 'ok'; let calls = 0;
  const server = http.createServer((req, res) => {
    calls++; assert.equal(req.headers.authorization, 'Bearer segredo-do-teste');
    if (mode === 'erro') { res.writeHead(503); return res.end('{}'); }
    if (req.url === '/v1/models') return res.end(JSON.stringify(mode === 'invalido' ? {} : { data: [{ id: 'modelo-real' }] }));
    if (mode === 'sem-consumo') return res.end(JSON.stringify({ choices: [{ message: { content: 'Resposta' } }] }));
    const chunks: Buffer[] = []; req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      assert.equal(JSON.parse(Buffer.concat(chunks).toString()).model, 'modelo-real');
      res.end(JSON.stringify({ model: 'modelo-real', choices: [{ message: { content: 'Resposta real' } }], usage: { prompt_tokens: 12, completion_tokens: 3 } }));
    });
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
  try {
    delete process.env.NINEROUTER_URL; delete process.env.NINEROUTER_API_KEY;
    assert.equal((await new NineRouterProvider().healthCheck()).status, 'NOT_CONFIGURED'); assert.equal(calls, 0);
    Object.assign(process.env, { NINEROUTER_URL: `${origin}/v1`, NINEROUTER_API_KEY: 'segredo-do-teste', NINEROUTER_MODEL: 'modelo-real', OUTBOUND_ALLOWED_ORIGINS: origin, OUTBOUND_PRIVATE_ORIGINS: origin });
    const provider = new NineRouterProvider();
    const health = await provider.healthCheck(); assert.equal(health.status, 'UP'); assert.deepEqual(health.modelsAvailable, ['modelo-real']);
    const input = { systemPrompt: 'Sistema', prompt: 'Olá', tenantId: 'empresa', correlationId: 'teste' };
    const result = await provider.generateText(input); assert.equal(result.text, 'Resposta real'); assert.deepEqual(result.tokensUsed, { input: 12, output: 3 });
    mode = 'sem-consumo'; await assert.rejects(provider.generateText(input), /contagem válida/);
    mode = 'invalido'; assert.equal((await provider.healthCheck()).status, 'DOWN');
    mode = 'erro'; assert.equal((await provider.healthCheck()).status, 'DOWN'); await assert.rejects(provider.generateText(input), /HTTP 503/);
    process.env.OUTBOUND_ALLOWED_ORIGINS = ''; assert.equal((await provider.healthCheck()).status, 'DOWN');
  } finally {
    for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

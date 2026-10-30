import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { allowedAddress, outboundJson, validateOutboundUrl } from '../server/infrastructure/security/OutboundHttp.js';

test('destinos externos exigem origem explícita, HTTPS e endereços permitidos', async () => {
  for (const address of ['169.254.169.254', '0.0.0.0', '224.0.0.1', '::ffff:127.0.0.1', '0:0:0:0000:0:ffff:7f00:1', '2001:20::1', '3fff::1', 'fe80::1', '2001:db8::1']) assert.equal(allowedAddress(address, true), false);
  assert.equal(allowedAddress('127.0.0.1', false), false); assert.equal(allowedAddress('127.0.0.1', true), true);
  assert.equal(allowedAddress('8.8.8.8', false), true);
  await assert.rejects(validateOutboundUrl('https://example.com', { allowedOrigins: [], privateOrigins: [] }), /Origem não autorizada/);
  const policy = { allowedOrigins: ['https://example.com'], privateOrigins: [], resolve: async () => [{ address: '8.8.8.8', family: 4 }, { address: '127.0.0.1', family: 4 }] };
  await assert.rejects(validateOutboundUrl('https://example.com', policy), /não permitido/);
  await assert.rejects(validateOutboundUrl('https://user:secret@example.com', policy), /inválida/);
});

test('HTTP real fixa DNS, preserva JSON e autenticação, limita resposta e recusa redirects', async () => {
  let hits = 0;
  const server = http.createServer((req, res) => {
    hits++;
    if (req.url === '/redirect') { res.writeHead(302, { Location: '/destino' }); return res.end(); }
    if (req.url === '/grande') return res.end(JSON.stringify('x'.repeat(200)));
    if (req.url === '/lento') return;
    if (req.url === '/utf8-invalido') return res.end(Buffer.from([0x7b,0x22,0x78,0x22,0x3a,0x22,0xc3,0x22,0x7d]));
    if (req.url === '/codificado') {res.setHeader('Content-Encoding','gzip');return res.end('{}');}
    if (req.url === '/utf8-valido') {res.setHeader('Content-Encoding','Identity');res.write(Buffer.from([0x7b,0x22,0x78,0x22,0x3a,0x22,0xc3]));return res.end(Buffer.from([0xa1,0x22,0x7d]));}

    if (req.url === '/invalido') return res.end('não é JSON');
    const blocks: Buffer[] = []; req.on('data', chunk => blocks.push(chunk));
    req.on('end', () => res.end(JSON.stringify({ auth: req.headers.authorization, body: JSON.parse(Buffer.concat(blocks).toString() || '{}') })));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = (server.address() as import('node:net').AddressInfo).port;
  const origin = `http://integracao.test:${port}`;
  let lookups = 0;
  const policy = { allowedOrigins: [origin], privateOrigins: [origin], resolve: async () => { lookups++; return [{ address: '127.0.0.1', family: 4 }]; } };
  try {
    const response = await outboundJson(origin, { policy, method: 'POST', headers: { Authorization: 'Bearer teste' }, body: { acao: 'teste' } });
    assert.deepEqual(response.data, { auth: 'Bearer teste', body: { acao: 'teste' } }); assert.equal(lookups, 1);
    const before = hits; await assert.rejects(outboundJson(origin + '/redirect', { policy }), /Redirecionamento/); assert.equal(hits, before + 1);
    await assert.rejects(outboundJson(origin + '/grande', { policy, maxResponseBytes: 50 }), /excedeu/);
    await assert.rejects(outboundJson(origin + '/invalido', { policy }), /JSON válido/);
    await assert.rejects(outboundJson(origin + '/utf8-invalido', { policy }), /UTF-8 válido/);
    await assert.rejects(outboundJson(origin + '/codificado', { policy }), /Codificação/);
    assert.deepEqual((await outboundJson(origin+'/utf8-valido',{policy})).data,{x:'á'});
    assert.equal((await outboundJson(origin+'/utf8-invalido',{policy,responseMode:'discard'})).data,null);
    await assert.rejects(outboundJson(origin+'/grande',{policy,responseMode:'discard',maxResponseBytes:50}),/excedeu/);

    await assert.rejects(outboundJson(origin + '/lento', { policy, timeoutMs: 50 }), /Tempo limite/);
    await assert.rejects(outboundJson(origin, { policy, headers: { Host: 'outro' } }), /Cabeçalho/);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

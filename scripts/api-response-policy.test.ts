import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { privateApiResponse, unexpectedHttpError, telephonyFailure } from '../server/infrastructure/security/ApiResponsePolicy.js';
import { once } from 'node:events';

test('política HTTP protege respostas, rejeições e falhas sem refletir segredos', async () => {
  const app = express(); app.disable('etag'); app.use('/api', privateApiResponse);
  app.use(express.json({ limit: '1kb' }));
  app.get('/api/private', (_req,res)=>res.json({ data: 'dado privado' }));
  app.get('/api/denied', (_req,res)=>res.status(401).json({ error: 'Não autenticado' }));
  app.get('/api/error', ()=>{ throw new Error('postgres://usuario:senha-secreta@db/ SELECT segredo'); });
  app.get('/api/telephony', (_req,res)=>{ const failure=telephonyFailure(new Error('Falha AMI: senha-secreta'));res.status(failure.status).json({error:failure.error}); });
  app.get('/api/forbidden', (_req,res)=>{ const failure=telephonyFailure(new Error('ACCESS_DENIED: tenant-secreto'));res.status(failure.status).json({error:failure.error}); });
  app.post('/api/body', (_req,res)=>res.json({ok:true}));
  app.use('/api',(_req,res)=>res.status(404).json({error:'Não encontrado'}));
  app.use(unexpectedHttpError);
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const seen = new Set<string>();
    for (const [path,expected,options] of [
      ['/api/private',200,{}],['/api/denied',401,{}],['/api/missing',404,{}],['/api/error',500,{}],
      ['/api/telephony',500,{}],['/api/forbidden',403,{}],
      ['/api/body',400,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"senha-secreta":'}],
      ['/api/body',413,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:'segredo'.repeat(200)})}],
    ] as const) {
      const response=await fetch(base+path,{...options,headers:{...(options as any).headers,'X-Request-Id':'identidade-forjada'}});
      assert.equal(response.status,expected);
      assert.equal(response.headers.get('cache-control'),'no-store');
      assert.equal(response.headers.get('pragma'),'no-cache');
      assert.equal(response.headers.get('expires'),'0');
      assert.equal(response.headers.has('etag'),false);
      const requestId=response.headers.get('x-request-id')!;
      assert.match(requestId,/^[a-f0-9-]{36}$/);assert.equal(seen.has(requestId),false);seen.add(requestId);
      const body=await response.text();assert.doesNotMatch(body,/senha-secreta|tenant-secreto|postgres:|SELECT/);
      if([400,413].includes(expected)||path==='/api/error')assert.equal(JSON.parse(body).requestId,requestId);
    }
    const conditional=await fetch(base+'/api/private',{headers:{'If-None-Match':'*'}});
    assert.equal(conditional.status,200);assert.equal((await conditional.json()).data,'dado privado');
  } finally { server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve())); }
});

import 'dotenv/config';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import net from 'node:net';
import http from 'node:http';
import { QualityReviewRepository } from '../server/infrastructure/postgres/repositories/QualityReviewRepository.js';
import { EntitySchemaRepository } from '../server/infrastructure/postgres/repositories/EntitySchemaRepository.js';
import { WebhookRepository } from '../server/infrastructure/postgres/repositories/WebhookRepository.js';
import { AiToolRepository } from '../server/infrastructure/postgres/repositories/AiToolRepository.js';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { postgresClient } from '../server/infrastructure/postgres/client.js';
import { DatabaseMigrator } from '../server/infrastructure/postgres/migrations/migrator.js';
import { TrunkRepository } from '../server/infrastructure/postgres/repositories/TrunkRepository.js';
import type { Trunk } from '../src/types/pbx.js';
import { TicketExecutor } from '../server/maia/executors/TicketExecutor.js';
import { TicketRepository } from '../server/infrastructure/postgres/repositories/TicketRepository.js';
import { OmnichannelRepository } from '../server/infrastructure/postgres/repositories/OmnichannelRepository.js';

// Este comando é destinado exclusivamente a um banco descartável de integração.
if (process.env.PBX_INTEGRATION_DATABASE !== 'descartavel') throw new Error('Banco descartável de integração obrigatório.');
const admin = new pg.Client({ connectionString: process.env.DATABASE_MIGRATION_URL });
const id = crypto.randomUUID();
const tenantA = `test-a-${id}`;
const tenantB = `test-b-${id}`;
const context = (tenantId: string) => ({ tenantId, actorRole: 'admin' as const, actorUserId: 'integration', accessMode: 'TENANT' as const });
try {
  await admin.connect();
  assert.equal((await postgresClient.checkHealth()).productionSafe, true);
  const migrations = await DatabaseMigrator.runMigrations();
  assert.equal(migrations.success, true, migrations.error);
  await admin.query("INSERT INTO tenants (id,name) VALUES ($1,'Empresa A'),($2,'Empresa B')", [tenantA, tenantB]);
  await admin.query(`INSERT INTO users (id,tenant_id,name,email,password_hash,role)
    VALUES ($1,$2,'A',$3,'hash-de-teste','admin'),($4,$5,'B',$6,'hash-de-teste','operator')`,
    [`user-a-${id}`, tenantA, `a-${id}@example.invalid`, `user-b-${id}`, tenantB, `b-${id}@example.invalid`]);
  const visible = await postgresClient.withTenantTransaction(context(tenantA), client => client.query('SELECT tenant_id FROM users'));
  assert.deepEqual(visible.rows, [{ tenant_id: tenantA }]);
  assert.equal((await postgresClient.query('SELECT id FROM users')).rows.length, 0);
  await assert.rejects(postgresClient.withTenantTransaction(context(tenantA), client => client.query(
    "INSERT INTO users (id,tenant_id,name,email,password_hash,role) VALUES ($1,$2,'X',$3,'x','admin')",
    [`forbidden-${id}`, tenantB, `forbidden-${id}@example.invalid`])));
  const identity = await postgresClient.query('SELECT * FROM authenticate_user_identity($1)', [`a-${id}@example.invalid`]);
  assert.equal(identity.rows[0].tenant_id, tenantA);
  await assert.rejects(postgresClient.query('CREATE TABLE public.forbidden_integration (id INT)'));
  await assert.rejects(postgresClient.query("DELETE FROM schema_migrations WHERE version = 'impossivel'"));
  await OmnichannelRepository.receiveWhatsappMessage(tenantA, { id: `wamid-${id}`, from: '5598999990000', content: 'Entrada', timestamp: new Date().toISOString() });
  await OmnichannelRepository.receiveWhatsappMessage(tenantA, { id: `wamid-${id}`, from: '5598999990000', content: 'Entrada', timestamp: new Date().toISOString() });
  const stored = await admin.query('SELECT messages FROM omnichannel_conversations WHERE tenant_id=$1', [tenantA]);
  assert.equal(stored.rows[0].messages.length, 1);
  const insecure = await admin.query(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND EXISTS
      (SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='tenant_id' AND NOT a.attisdropped)
      AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity)`);
  assert.deepEqual(insecure.rows, [], 'Todas as tabelas com tenant_id exigem RLS forçada.');
  const ticketInput = { requestId: id, callerNumber: '5598999990000', category: 'suporte', description: 'Teste de chamado persistente', urgency: 'media' };
  const ticket = await TicketRepository.create(tenantA, ticketInput);
  assert.equal((await TicketRepository.create(tenantA, ticketInput)).id, ticket.id);
  assert.equal((await TicketRepository.list(tenantA)).length, 1);
  assert.equal((await TicketRepository.list(tenantB)).length, 0);
  const toolResult = await new TicketExecutor().execute({ descricao: ticketInput.description, categoria: ticketInput.category }, { tenantId: tenantA, callerNumber: ticketInput.callerNumber, correlationId: id });
  assert.equal(toolResult.status, 'success');
  assert.equal(toolResult.data.ticketId, ticket.id);
  assert.equal(toolResult.data.protocolo, ticket.protocol);
  const trunk = { id: `trunk-${id}`, tenantId: tenantA, name: 'Tronco de teste', providerName: 'Teste', host: 'sip.example.invalid', port: 5060,
    username: 'usuario', secretMasked: '', transport: 'UDP', callerId: '1001', codecs: ['alaw'], context: 'from-trunk', register: true,
    status: 'unregistered', channelsMax: 2, channelsInUse: 0, authMode: 'credentials', secret: 'senha-sip-especial!123' } as Trunk & { secret: string };
  const savedTrunk = await TrunkRepository.save(trunk);
  assert.equal('secret' in savedTrunk, false);
  assert.equal(savedTrunk.hasSecret, true);
  assert.equal(await TrunkRepository.getSecret(trunk.id, tenantA), trunk.secret);
  assert.equal(await TrunkRepository.getSecret(trunk.id, tenantB), '');
  const ciphertext = (await admin.query('SELECT secret_encrypted FROM trunks WHERE id=$1', [trunk.id])).rows[0].secret_encrypted;
  assert.match(ciphertext, /^enc:v1:/);
  assert.equal(ciphertext.includes(trunk.secret), false);
  await TrunkRepository.save({ ...trunk, secret: '' });
  assert.equal(await TrunkRepository.getSecret(trunk.id, tenantA), trunk.secret);
  const reservation = net.createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = (reservation.address() as net.AddressInfo).port;
  await new Promise<void>(resolve => reservation.close(() => resolve()));
  let externalHits = 0;
  const externalErrors: string[] = [];
  let webhookReject = false;
  let webhookHits = 0;
  let extractionHits = 0;
  let qualityHits = 0;
  const webhookSecret = crypto.randomBytes(32).toString('hex');
  const external = http.createServer(async (req, res) => {
    if (req.url === '/v1/models') { res.end(JSON.stringify({data:[{id:'modelo-extracao-test'}]})); return; }
    externalHits++;
    try {
      if (req.url === '/v1/chat/completions') {
        assert.equal(req.headers.authorization, 'Bearer segredo-extracao-ci');
        const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
        const body=JSON.parse(Buffer.concat(chunks).toString());
        if(body.model==='modelo-quality-test'){
          qualityHits++;
          const audit=await admin.query("SELECT id FROM audit_logs WHERE tenant_id=$1 AND action='QUALITY_REVIEW_ATTEMPT' AND payload->>'executionId'=$2",[tenantA,req.headers['x-enlace-request-id']]);assert.equal(audit.rows.length,1);
          assert.equal(JSON.parse(body.messages[1].content).text,'Olá. A conexão falhou. Vou verificar.');
          res.end(JSON.stringify({model:body.model,choices:[{message:{content:JSON.stringify({fields:{greeting:'Olá',complaint:'A conexão falhou',solutionStatement:'Problema resolvido'}})}}],usage:{prompt_tokens:45,completion_tokens:12}}));return;
        }
        extractionHits++;
        const audit=await admin.query("SELECT id FROM audit_logs WHERE tenant_id=$1 AND action='ENTITY_EXTRACTION_ATTEMPT' AND payload->>'executionId'=$2",[tenantA,req.headers['x-enlace-request-id']]);assert.equal(audit.rows.length,1);
        assert.equal(body.model,'modelo-extracao-test');assert.equal(JSON.parse(body.messages[1].content).text,'Ramal 3004. Orçamento R$ 15.000,50.');
        res.end(JSON.stringify({model:body.model,choices:[{message:{content:JSON.stringify({fields:{ramal:'3004',orcamento:'350'}})}}],usage:{prompt_tokens:45,completion_tokens:12}}));return;
      }
      if (req.url === '/webhook') {
        webhookHits++;
        const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
        const raw = Buffer.concat(chunks);
        assert.equal(req.headers['x-enlace-signature-256'], 'sha256=' + crypto.createHmac('sha256', webhookSecret).update(raw).digest('hex'));
        const event = JSON.parse(raw.toString());
        assert.equal(event.event, 'enlace.webhook.test'); assert.equal(event.tenantId, tenantA);
        assert.deepEqual(event.data, { test: true }); assert.equal(raw.includes(webhookSecret), false);
        const audit = await admin.query("SELECT id FROM audit_logs WHERE tenant_id=$1 AND action='WEBHOOK_HTTP_ATTEMPT' AND payload->>'deliveryId'=$2", [tenantA, event.id]);
        assert.equal(audit.rows.length, 1);
        const pending = await admin.query('SELECT status FROM webhook_deliveries WHERE tenant_id=$1 AND id=$2', [tenantA, event.id]);
        assert.equal(pending.rows[0].status, 'PENDING');
        res.writeHead(webhookReject ? 503 : 202); res.end('Aceito sem JSON'); return;
      }
      assert.equal(req.headers.authorization, 'Bearer segredo-da-integracao');
      const rows = await admin.query("SELECT id FROM audit_logs WHERE tenant_id=$1 AND action='AI_TOOL_HTTP_ATTEMPT' AND payload->>'executionId'=$2", [tenantA, req.headers['x-enlace-request-id']]);
      assert.equal(rows.rows.length, 1, 'Auditoria deve estar persistida antes do envio externo.');
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString()), { documento: '123' });
      res.end(JSON.stringify({ protocoloExterno: 'teste-integracao' }));
    } catch (error) { externalErrors.push(String(error)); res.writeHead(500); res.end('{}'); }
  });
  external.listen(0, '127.0.0.1'); await once(external, 'listening');
  const origin = `http://127.0.0.1:${(external.address() as net.AddressInfo).port}`;
  const toolId = `tool-${id}`;
  await AiToolRepository.saveTool(tenantA, { id: toolId, tenantId: tenantA, name: 'Teste HTTP', description: 'Integração descartável',
    endpoint: origin + '/acao', method: 'POST', requiresConfirmation: true,
    schemaJson: { type: 'object', properties: { documento: { type: 'string' } }, required: ['documento'] }, mockResponse: { ficticio: true } });
  const hook = await WebhookRepository.create(tenantA, { name: 'Webhook de teste', endpoint: origin + '/webhook', enabled: true });
  assert.equal((await WebhookRepository.list(tenantB)).length, 0);
  assert.equal(await WebhookRepository.find(tenantB, hook.id), undefined);
  const extractionSchema = await EntitySchemaRepository.save(tenantA, { name:'Extração CI', description:'',isActive:true, fields:[
    {key:'ramal',label:'Ramal',type:'string',required:true,description:''},
    {key:'orcamento',label:'Orçamento',type:'currency',required:true,description:''},
    {key:'documento',label:'Documento',type:'cpf_cnpj',required:true,description:''},
  ] });
  assert.equal((await EntitySchemaRepository.list(tenantB)).length, 0);
  const child = spawn(process.execPath, ['dist/server.cjs'], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATABASE_MIGRATION_URL: '',
      OUTBOUND_ALLOWED_ORIGINS: origin, OUTBOUND_PRIVATE_ORIGINS: origin,
      NINEROUTER_URL: origin + '/v1', NINEROUTER_API_KEY: 'segredo-extracao-ci', ENTITY_EXTRACTION_MODEL: 'modelo-extracao-test', ENTITY_EXTRACTION_ENABLED_TENANTS: tenantA,
      QUALITY_REVIEW_MODEL: 'modelo-quality-test',QUALITY_REVIEW_ENABLED_TENANTS: tenantA,
      WEBHOOK_BINDINGS_JSON: JSON.stringify([{ tenantId: tenantA, webhookId: hook.id, endpoint: origin + '/webhook', signingSecret: webhookSecret }]),
      AI_TOOL_BINDINGS_JSON: JSON.stringify([{ tenantId: tenantA, toolId, endpoint: origin + '/acao', method: 'POST', bearerToken: 'segredo-da-integracao' }]) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await new Promise<void>((resolve, reject) => {
      let output = '';
      const timer = setTimeout(() => reject(new Error(`Backend de produção não iniciou: ${output.slice(-2000)}`)), 20000);
      child.stdout.on('data', chunk => {
        output += chunk.toString();
        if (output.includes('Servidor rodando em')) { clearTimeout(timer); resolve(); }
      });
      child.stderr.on('data', chunk => { output += chunk.toString(); });
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`Backend encerrou (${code}): ${output.slice(-2000)}`)); });
      child.once('error', reject);
    });
    const base = `http://127.0.0.1:${port}`;
    const login = await fetch(base + '/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: process.env.ADMIN_INITIAL_EMAIL, password: process.env.ADMIN_INITIAL_PASSWORD }) });
    assert.equal(login.status, 200, 'Login real com bcrypt e função de identidade.');
    const session = await login.json();
    assert.ok(session.token);
    const me = await fetch(base + '/api/v1/auth/me', { headers: { Authorization: `Bearer ${session.token}` } });
    assert.equal(me.status, 200);
    assert.equal('passwordHash' in await me.json(), false);
    // O papel no token não pode elevar o papel atual registrado no banco.
    const operatorToken = jwt.sign({ id: `user-b-${id}`, tenantId: tenantB, role: 'super_admin' }, process.env.JWT_SECRET!, { expiresIn: '1m' });
    const headers = { Authorization: `Bearer ${operatorToken}` };
    for (const path of ['/api/v1/billing', '/api/v1/cdr', '/api/v1/system/health']) {
      assert.equal((await fetch(base + path, { headers })).status, 403, path);
    }
    const tenants = await (await fetch(base + '/api/v1/tenants', { headers })).json();
    assert.deepEqual(tenants.map((tenant: any) => tenant.id), [tenantB]);
    assert.equal((await fetch(base + '/api/v1/extensions', { headers: { ...headers, 'x-tenant-id': tenantA } })).status, 403);
    const backendSource = await fetch(base + '/server.cjs');
    assert.match(backendSource.headers.get('content-type') || '', /text\/html/);
    assert.match(await backendSource.text(), /<!doctype html>/i);
    const readiness = await fetch(base + '/health/ready');
    assert.equal(readiness.status, 503, 'Sem Asterisk o PBX não declara prontidão de produção.');
    assert.equal((await readiness.json()).dependencies.postgresql, 'UP');
    const adminAToken = jwt.sign({ id: `user-a-${id}`, tenantId: tenantA }, process.env.JWT_SECRET!, { expiresIn: '1m' });
    const testHeaders = { Authorization: `Bearer ${adminAToken}`, 'Content-Type': 'application/json' };
    const toolPath = base + `/api/v1/ai/tools/${toolId}/test`;
    const execute = (body: unknown, requestHeaders = testHeaders) => fetch(toolPath, { method: 'POST', headers: requestHeaders, body: JSON.stringify(body) });
    assert.equal((await execute({ params: { documento: '123' } })).status, 409);
    assert.equal((await execute({ params: { documento: 123 }, confirmed: true })).status, 422);
    const realExecution = await execute({ params: { documento: '123' }, confirmed: true });
    assert.equal(realExecution.status, 200);
    const execution = await realExecution.json();
    assert.deepEqual(execution.result, { protocoloExterno: 'teste-integracao' });
    assert.equal(JSON.stringify(execution).includes('segredo-da-integracao'), false);
    assert.equal(externalHits, 1); assert.deepEqual(externalErrors, []);
    await admin.query("UPDATE users SET role='admin' WHERE id=$1", [`user-b-${id}`]);
    assert.equal((await execute({ params: { documento: '123' }, confirmed: true }, { ...testHeaders, Authorization: `Bearer ${operatorToken}` })).status, 404);
    await admin.query("UPDATE users SET role='operator' WHERE id=$1", [`user-b-${id}`]);
    await admin.query('UPDATE ai_tools SET endpoint=$1 WHERE id=$2', [origin + '/alterado', toolId]);
    assert.equal((await execute({ params: { documento: '123' }, confirmed: true })).status, 403);
    assert.equal(externalHits, 1);
    const auditText = JSON.stringify((await admin.query("SELECT payload,details FROM audit_logs WHERE tenant_id=$1 AND action='AI_TOOL_HTTP_ATTEMPT'", [tenantA])).rows);
    assert.equal(auditText.includes('documento'), false); assert.equal(auditText.includes('segredo-da-integracao'), false);
    const webhookPath = base + '/api/v1/webhooks';
    const sendHook = (requestHeaders = testHeaders) => fetch(webhookPath + '/test', { method: 'POST', headers: requestHeaders, body: JSON.stringify({ webhookId: hook.id, endpoint: 'http://destino-nao-autorizado.invalid', event: 'call.started' }) });
    const deliveryResponse = await sendHook(); assert.equal(deliveryResponse.status, 200);
    const delivery = await deliveryResponse.json(); assert.equal(delivery.httpStatus, 202); assert.equal(delivery.status, 'ACKNOWLEDGED');
    assert.equal(webhookHits, 1); assert.deepEqual(externalErrors, []);
    const history = await (await fetch(webhookPath + `/${hook.id}/deliveries`, { headers: testHeaders })).json();
    assert.equal(history[0].status, 'ACKNOWLEDGED'); assert.equal(history[0].http_status, 202);
    const listedHooks = await (await fetch(webhookPath, { headers: testHeaders })).json();
    assert.equal(JSON.stringify(listedHooks).includes(webhookSecret), false);
    assert.equal(listedHooks[0].id, hook.id);
    await admin.query("UPDATE users SET role='admin' WHERE id=$1", [`user-b-${id}`]);
    const otherHeaders = { ...testHeaders, Authorization: `Bearer ${operatorToken}` };
    assert.equal((await sendHook(otherHeaders)).status, 404);
    assert.equal((await fetch(webhookPath + `/${hook.id}/deliveries`, { headers: otherHeaders })).status, 404);
    assert.equal((await WebhookRepository.deliveries(tenantB, hook.id)).length, 0);
    await admin.query("UPDATE users SET role='operator' WHERE id=$1", [`user-b-${id}`]);
    webhookReject = true;
    const failedResponse = await sendHook(); assert.equal(failedResponse.status, 502);
    const failed = await failedResponse.json(); assert.equal(failed.outcome, 'UNKNOWN');
    const failedHistory = await WebhookRepository.deliveries(tenantA, hook.id);
    assert.equal(failedHistory[0].status, 'UNKNOWN'); assert.equal(failedHistory[0].http_status, 503);
    assert.equal(webhookHits, 2);
    await WebhookRepository.update(tenantA, hook.id, { name: hook.name, endpoint: origin + '/webhook', enabled: false });
    assert.equal((await sendHook()).status, 409); assert.equal(webhookHits, 2);
    const extractPath = base + '/api/v1/ai/entity-extraction/test';
    const extractBody = { schemaId: extractionSchema.id, text:'Ramal 3004. Orçamento R$ 15.000,50.' };
    const extractedResponse = await fetch(extractPath, {method:'POST',headers:testHeaders,body:JSON.stringify(extractBody)});
    assert.equal(extractedResponse.status,200);
    const extracted = await extractedResponse.json();
    assert.deepEqual(extracted.extractedData,{ramal:'3004',orcamento:null,documento:null});
    assert.deepEqual(extracted.rejectedFields,['orcamento']); assert.equal(extracted.reviewRequired,true);
    assert.equal(extracted.modelUsed,'modelo-extracao-test'); assert.equal(extractionHits,1);
    assert.deepEqual(externalErrors,[]);
    await admin.query("UPDATE users SET role='admin' WHERE id=$1", [`user-b-${id}`]);
    assert.equal((await fetch(extractPath,{method:'POST',headers:otherHeaders,body:JSON.stringify(extractBody)})).status,404);
    const otherSchemas = await (await fetch(base+'/api/v1/ai/entity-extraction/schemas',{headers:otherHeaders})).json();
    assert.deepEqual(otherSchemas,[]);
    const ownOtherSchema = await EntitySchemaRepository.save(tenantB,{name:'Esquema B',description:'',isActive:true,fields:[{key:'ramal',label:'Ramal',type:'string',required:true,description:''}]});
    assert.equal((await fetch(extractPath,{method:'POST',headers:otherHeaders,body:JSON.stringify({...extractBody,schemaId:ownOtherSchema.id})})).status,403);
    assert.equal(extractionHits,1);
    await admin.query("UPDATE users SET role='operator' WHERE id=$1", [`user-b-${id}`]);
    const invalidInput = await fetch(extractPath,{method:'POST',headers:testHeaders,body:JSON.stringify({...extractBody,text:123})});
    assert.equal(invalidInput.status,400); assert.equal(extractionHits,1);
    const extractionAudit = JSON.stringify((await admin.query("SELECT payload,details FROM audit_logs WHERE tenant_id=$1 AND action='ENTITY_EXTRACTION_ATTEMPT'",[tenantA])).rows);
    assert.equal(extractionAudit.includes('Ramal 3004'),false);
    const qualityPath=base+'/api/v1/ai/quality-supervisor';
    const qualityBody={channel:'voice',reference:'referencia-ci',transcript:'Olá. A conexão falhou. Vou verificar.'};
    const qualityResponse=await fetch(qualityPath+'/evaluate',{method:'POST',headers:testHeaders,body:JSON.stringify(qualityBody)});
    assert.equal(qualityResponse.status,201);const quality=await qualityResponse.json();
    assert.equal(quality.status,'PENDING');assert.equal(quality.evidence.greeting,'Olá');assert.equal(quality.evidence.solutionStatement,null);
    assert.deepEqual(quality.rejected_fields,['solutionStatement']);assert.equal(qualityHits,1);assert.deepEqual(externalErrors,[]);
    for(const field of ['score','complianceScore','resolutionStatus','sentiment','transcript'])assert.equal(Object.hasOwn(quality,field),false);
    assert.equal((await QualityReviewRepository.list(tenantB)).length,0);
    await admin.query("UPDATE users SET role='admin' WHERE id=$1",[`user-b-${id}`]);
    assert.equal((await fetch(qualityPath+`/reviews/${quality.id}`,{headers:otherHeaders})).status,404);
    assert.equal((await fetch(qualityPath+`/reviews/${quality.id}/review`,{method:'POST',headers:otherHeaders,body:JSON.stringify({note:'Não autorizado'})})).status,404);
    assert.equal((await fetch(qualityPath+'/evaluate',{method:'POST',headers:otherHeaders,body:JSON.stringify(qualityBody)})).status,403);
    await admin.query("UPDATE users SET role='operator' WHERE id=$1",[`user-b-${id}`]);
    const reviewed=await fetch(qualityPath+`/reviews/${quality.id}/review`,{method:'POST',headers:testHeaders,body:JSON.stringify({note:'Conferi os trechos na fonte. Sem comprovação de solução.',reviewedBy:'usuario-falso'})});
    assert.equal(reviewed.status,200);const human=await reviewed.json();assert.equal(human.status,'REVIEWED');assert.equal(human.reviewed_by,`user-a-${id}`);
    assert.equal((await fetch(qualityPath+`/reviews/${quality.id}/review`,{method:'POST',headers:testHeaders,body:JSON.stringify({note:'Sobrescrever'})})).status,409);
    assert.equal((await fetch(qualityPath+`/reviews/${quality.id}`,{headers:testHeaders})).status,200);
    await assert.rejects(postgresClient.executeTenantScoped(tenantA,client=>client.query('UPDATE quality_reviews SET evidence=$1 WHERE id=$2',[JSON.stringify({greeting:'Falso'}),quality.id])));
    await assert.rejects(postgresClient.executeTenantScoped(tenantA,client=>client.query("UPDATE quality_reviews SET review_note='Alterar' WHERE id=$1",[quality.id])));
    const qualityAudit=JSON.stringify((await admin.query("SELECT payload,details FROM audit_logs WHERE tenant_id=$1 AND action LIKE 'QUALITY_REVIEW%'",[tenantA])).rows);assert.equal(qualityAudit.includes('A conexão falhou'),false);
    assert.equal((await fetch(base+'/api/v1/omnichannel/ai-suggest',{method:'POST',headers:testHeaders,body:JSON.stringify({history:[{sender:'user',content:'Preciso do PIX'}]})})).status,501);
    console.log('Supervisor: evidências reais, revisão humana única, proteção contra sobrescrita e isolamento aprovados.');
    console.log('Extração em produção: chamada HTTP de IA, evidência literal, rejeição de valor inventado, auditoria anterior e isolamento aprovados.');
    console.log('Webhooks de produção: assinatura dos bytes, auditoria anterior, histórico real e isolamento aprovados.');
    console.log('Ferramenta HTTP em produção: execução real, auditoria anterior, confirmação, schema, vínculo e isolamento aprovados.');
    console.log('HTTP de produção: login bcrypt, perfil, RBAC, isolamento, arquivos públicos e readiness aprovados.');
  } finally {
    external.closeAllConnections(); await new Promise<void>(resolve => external.close(() => resolve()));
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
      await exited;
      clearTimeout(timer);
    }
  }
  console.log('PostgreSQL real: migrações, RLS, identidade, privilégios mínimos e idempotência aprovados.');
} finally {
  await admin.query('DELETE FROM quality_reviews WHERE tenant_id IN ($1,$2)', [tenantA, tenantB]).catch(() => {});
  await admin.query('DELETE FROM entity_extraction_schemas WHERE tenant_id IN ($1,$2)', [tenantA, tenantB]).catch(() => {});
  await admin.query('DELETE FROM webhook_deliveries WHERE tenant_id IN ($1,$2)', [tenantA, tenantB]).catch(() => {});
  await admin.query('DELETE FROM outbound_webhooks WHERE tenant_id IN ($1,$2)', [tenantA, tenantB]).catch(() => {});
  await admin.query('DELETE FROM ai_tools WHERE tenant_id IN ($1,$2)', [tenantA, tenantB]).catch(() => {});
  await admin.query('DELETE FROM trunks WHERE tenant_id IN ($1,$2)', [tenantA, tenantB]).catch(() => {});
  await admin.query('DELETE FROM support_tickets WHERE tenant_id IN ($1,$2)', [tenantA, tenantB]).catch(() => {});
  await admin.query('DELETE FROM omnichannel_conversations WHERE tenant_id IN ($1,$2)', [tenantA, tenantB]).catch(() => {});
  await admin.query('DELETE FROM users WHERE tenant_id IN ($1,$2)', [tenantA, tenantB]).catch(() => {});
  await admin.query('DELETE FROM tenants WHERE id IN ($1,$2)', [tenantA, tenantB]).catch(() => {});
  await admin.end();
  await postgresClient.close();
}

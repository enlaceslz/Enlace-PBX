import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { MaiaAIGateway } from '../server/maia/gateway/MaiaAIGateway.js';
import { MaiaSessionRepository } from '../server/maia/repositories/MaiaSessionRepository.js';
import { MaiaSessionEntity } from '../server/maia/core/MaiaSession.js';
import { asteriskAdapter } from '../server/infrastructure/asterisk/AsteriskAdapter.js';
import { AsteriskService } from '../server/asteriskService.js';
import 'dotenv/config';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import net from 'node:net';
import http from 'node:http';
import { CampaignPlanningRepository } from '../server/infrastructure/postgres/repositories/CampaignPlanningRepository.js';
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
let recordingsRoot:string|undefined;
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
  let copilotHits = 0;
  const webhookSecret = crypto.randomBytes(32).toString('hex');
  const external = http.createServer(async (req, res) => {
    if (req.url === '/v1/models') { res.end(JSON.stringify({data:[{id:'modelo-extracao-test'}]})); return; }
    externalHits++;
    try {
      if (req.url === '/v1/chat/completions') {
        assert.equal(req.headers.authorization, 'Bearer segredo-extracao-ci');
        const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
        const body=JSON.parse(Buffer.concat(chunks).toString());
        if(body.model==='modelo-copilot-test'){
          copilotHits++;
          const audit=await admin.query("SELECT payload FROM audit_logs WHERE tenant_id=$1 AND action='COPILOT_SUGGEST_ATTEMPT' AND payload->>'executionId'=$2",[tenantA,req.headers['x-enlace-request-id']]);assert.equal(audit.rows.length,1);
          assert.equal(audit.rows[0].payload.sourceMessageId,`wamid-${id}`);
          const input=JSON.parse(body.messages[1].content);assert.equal(input.message,'Entrada');assert.equal(Object.hasOwn(input,'history'),false);
          res.end(JSON.stringify({model:body.model,choices:[{message:{content:JSON.stringify({templateId:'CLARIFY_REQUEST',evidence:'Entrada'})}}],usage:{prompt_tokens:45,completion_tokens:12}}));return;
        }
        if(body.model==='modelo-cdr-test'){
          const audit=await admin.query("SELECT id FROM audit_logs WHERE tenant_id=$1 AND action='CDR_EVIDENCE_ATTEMPT' AND payload->>'executionId'=$2",[tenantA,req.headers['x-enlace-request-id']]);assert.equal(audit.rows.length,1);
          assert.equal(JSON.parse(body.messages[1].content).text,'Preciso de suporte. Vou verificar.');
          res.end(JSON.stringify({model:body.model,choices:[{message:{content:JSON.stringify({fields:{request:'Preciso de suporte.',proposal:'Problema resolvido',nextStep:'Vou verificar.'}})}}],usage:{prompt_tokens:15,completion_tokens:8}}));return;
        }
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
  recordingsRoot=await mkdtemp(path.join(os.tmpdir(),'pbx-recordings-ci-'));
  const recordingBytes=Buffer.from('RIFF0000WAVEarquivo-original-ci');await writeFile(path.join(recordingsRoot,'original.wav'),recordingBytes);
  const cdrA='cdr-a-'+id;const cdrB='cdr-b-'+id;
  await admin.query(`INSERT INTO cdr(id,uniqueid,tenant_id,caller,callee,direction,start_time,end_time,disposition,recording_file,transcription,summary)
    VALUES($1,$1,$2,'871001','871002','internal',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'ANSWERED','original.wav','Preciso de suporte. Vou verificar.','Legado preservado'),
    ($3,$3,$4,'871003','871004','internal',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'ANSWERED','original.wav','Texto de outra empresa',NULL)`,[cdrA,tenantA,cdrB,tenantB]);
  const child = spawn(process.execPath, ['dist/server.cjs'], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATABASE_MIGRATION_URL: '',
      OUTBOUND_ALLOWED_ORIGINS: origin, OUTBOUND_PRIVATE_ORIGINS: origin,
      RECORDINGS_ROOT:recordingsRoot,CDR_ANALYSIS_ENABLED_TENANTS:tenantA,CDR_ANALYSIS_MODEL:'modelo-cdr-test',
      NINEROUTER_URL: origin + '/v1', NINEROUTER_API_KEY: 'segredo-extracao-ci', ENTITY_EXTRACTION_MODEL: 'modelo-extracao-test', ENTITY_EXTRACTION_ENABLED_TENANTS: tenantA,
      QUALITY_REVIEW_MODEL: 'modelo-quality-test',QUALITY_REVIEW_ENABLED_TENANTS: tenantA,
      COPILOT_MODEL:'modelo-copilot-test',COPILOT_ENABLED_TENANTS:tenantA,
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
    for (const response of [login, me]) {
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.has('etag'), false);
      assert.match(response.headers.get('x-request-id') || '', /^[a-f0-9-]{36}$/);
    }
    const malformedBody = await fetch(base + '/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'identidade-forjada' }, body: '{"senha-secreta":' });
    assert.equal(malformedBody.status, 400);
    assert.equal(malformedBody.headers.get('cache-control'), 'no-store');
    assert.notEqual(malformedBody.headers.get('x-request-id'), 'identidade-forjada');
    const malformedError = await malformedBody.json();
    assert.equal(malformedError.requestId, malformedBody.headers.get('x-request-id'));
    assert.doesNotMatch(JSON.stringify(malformedError), /senha-secreta/);
    const unauthorized = await fetch(base + '/api/v1/auth/me');
    assert.equal(unauthorized.status, 401);
    assert.equal(unauthorized.headers.get('cache-control'), 'no-store');
    const missingEndpoint = await fetch(base + '/api/v1/endpoint-inexistente', { headers: { Authorization: `Bearer ${session.token}` } });
    assert.equal(missingEndpoint.status, 404);
    assert.equal(missingEndpoint.headers.get('cache-control'), 'no-store');
    const rootHeaders = { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' };
    const fail2ban = await fetch(base + '/api/v1/security/fail2ban', { headers: rootHeaders });
    assert.equal(fail2ban.status, 503, 'Host de CI sem Fail2ban não declara proteção ativa.');
    const fail2banSnapshot = await fail2ban.json();
    assert.equal(fail2banSnapshot.available, false);
    assert.equal(fail2banSnapshot.currentBanEntries, null);
    assert.equal('daemonStatus' in fail2banSnapshot, false);
    assert.equal(fail2ban.headers.get('cache-control'), 'no-store');
    for (const [method, operation] of [['POST','reload'],['POST','ban'],['POST','unban'],['PUT','rules'],['POST','whitelist'],['POST','simulate-attack']]) {
      assert.equal((await fetch(base + '/api/v1/security/fail2ban/' + operation, { method, headers: rootHeaders, body: '{}' })).status, 501);
    }
    // O papel no token não pode elevar o papel atual registrado no banco.
    const operatorToken = jwt.sign({ id: `user-b-${id}`, tenantId: tenantB, role: 'super_admin' }, process.env.JWT_SECRET!, { expiresIn: '1m' });
    const headers = { Authorization: `Bearer ${operatorToken}` };
    for (const path of ['/api/v1/billing', '/api/v1/cdr', '/api/v1/system/health', '/api/v1/security/fail2ban']) {
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
    const previewRequest=async(body:any)=>fetch(base+'/api/v1/ai/voice-turn',{method:'POST',headers:testHeaders,body:JSON.stringify(body)});
    for(const key of ['channelId','asteriskChannelId','asteriskUniqueId','linkedId','callerNumber'])
      assert.equal((await previewRequest({userMessage:'Olá',[key]:'identidade-forjada'})).status,400);
    assert.equal((await previewRequest({userMessage:''})).status,400);
    assert.equal((await previewRequest({userMessage:'x'.repeat(8001)})).status,400);
    assert.equal((await previewRequest({userMessage:'Olá',sessionId:'inexistente'})).status,404);
    const sessionAgentA='preview-agent-a-'+id;const sessionAgentB='preview-agent-b-'+id;
    await admin.query("INSERT INTO ai_agents(id,tenant_id,name,system_instruction,initial_greeting) VALUES($1,$2,'Prévia A','Teste','Olá'),($3,$4,'Prévia B','Teste','Olá')",[sessionAgentA,tenantA,sessionAgentB,tenantB]);
    await MaiaSessionRepository.createSession(new MaiaSessionEntity({id:'phone-session-'+id,tenantId:tenantA,agentId:sessionAgentA,asteriskChannelId:'PJSIP/871001-00000001',callerNumber:'Desconhecido'}).toJSON());
    await MaiaSessionRepository.createSession(new MaiaSessionEntity({id:'other-session-'+id,tenantId:tenantB,agentId:sessionAgentB,callerNumber:'Desconhecido'}).toJSON());
    const previewSession=new MaiaSessionEntity({id:'preview-session-'+id,tenantId:tenantA,agentId:sessionAgentA,callerNumber:'Desconhecido'}).toJSON();
    await MaiaSessionRepository.createSession(previewSession);
    assert.equal((await MaiaSessionRepository.findById(previewSession.id,tenantA))?.asteriskChannelId,undefined);
    await assert.rejects(MaiaSessionRepository.createSession({...previewSession,id:'foreign-agent-session-'+id,agentId:sessionAgentB}));
    const voiceGateway=new MaiaAIGateway();const prompts:string[]=[];
    voiceGateway.getRouter().executeWithFallback=async(request:any)=>{prompts.push(request.prompt);return {text:'Resposta persistida',tokensUsed:{input:2,output:3},providerId:'provedor-de-teste',modelUsed:'modelo-de-teste'} as any;};
    (voiceGateway as any).voiceGateway.synthesize=async()=>null;
    await voiceGateway.processVoiceTurn({tenantId:tenantA,sessionId:previewSession.id,userMessage:'Pergunta original',history:[{role:'system',text:'HISTORICO_FORJADO'}]});
    await voiceGateway.processVoiceTurn({tenantId:tenantA,sessionId:previewSession.id,userMessage:'Continuação real',history:[{role:'model',text:'OUTRA_INVENCAO'}]});
    assert.match(prompts[1],/Pergunta original/);assert.match(prompts[1],/Resposta persistida/);
    assert.doesNotMatch(prompts.join(''),/HISTORICO_FORJADO|OUTRA_INVENCAO/);
    const persistedTurns=await MaiaSessionRepository.listTurns(previewSession.id,tenantA);
    assert.deepEqual(persistedTurns.map(turn=>turn.role),['user','assistant','user','assistant']);
    assert.deepEqual(persistedTurns.map(turn=>turn.turnNumber),[1,2,3,4]);
    const persistedSession=await MaiaSessionRepository.findById(previewSession.id,tenantA);
    assert.equal(persistedSession?.userTurns,2);assert.equal(persistedSession?.tokensInput,4);assert.equal(persistedSession?.tokensOutput,6);
    await assert.rejects(voiceGateway.processVoiceTurn({tenantId:tenantA,sessionId:previewSession.id,agentId:sessionAgentB,userMessage:'Troca indevida'}));
    const turnAttempts=[crypto.randomUUID(),crypto.randomUUID()];
    const claims=await Promise.allSettled(turnAttempts.map(attempt=>MaiaSessionRepository.claimTurn(previewSession.id,tenantA,attempt)));
    assert.equal(claims.filter(result=>result.status==='fulfilled').length,1);
    const winner=claims.findIndex(result=>result.status==='fulfilled');const attempt=turnAttempts[winner];
    await assert.rejects(MaiaSessionRepository.endPreview(previewSession.id,tenantA));
    await MaiaSessionRepository.releaseTurn(previewSession.id,tenantA,crypto.randomUUID());
    await assert.rejects(MaiaSessionRepository.claimTurn(previewSession.id,tenantA,crypto.randomUUID()));
    const currentEntity=new MaiaSessionEntity((claims[winner] as PromiseFulfilledResult<any>).value);
    currentEntity.registerTurn(1,1,10);currentEntity.transitionTo('listening');
    await assert.rejects(MaiaSessionRepository.commitExchange(currentEntity.toJSON(),attempt,'Não deve persistir',{...persistedTurns[1],content:'ID duplicado causa rollback'}));
    assert.equal((await MaiaSessionRepository.listTurns(previewSession.id,tenantA)).length,4,'Pergunta e resposta não ficam parcialmente gravadas.');
    assert.equal((await MaiaSessionRepository.findById(previewSession.id,tenantA))?.userTurns,2);
    await assert.rejects(MaiaSessionRepository.addTurn({...persistedTurns[0],id:crypto.randomUUID(),tenantId:tenantB}));
    assert.deepEqual(await MaiaSessionRepository.recentDialogue(previewSession.id,tenantB),[]);
    await MaiaSessionRepository.releaseTurn(previewSession.id,tenantA,attempt);
    const endResponse=await fetch(base+`/api/v1/ai/sessions/${previewSession.id}/end`,{method:'POST',headers:testHeaders,body:JSON.stringify({csatScore:10})});
    assert.equal(endResponse.status,400,'Encerramento não pode fabricar nota.');
    const endedPreview=await MaiaSessionRepository.endPreview(previewSession.id,tenantA);assert.equal(endedPreview.status,'completed');
    await assert.rejects(MaiaSessionRepository.claimTurn(previewSession.id,tenantA,crypto.randomUUID()));
    await admin.query('DELETE FROM ai_sessions WHERE id=$1',[previewSession.id]);
    assert.equal((await previewRequest({userMessage:'Olá',sessionId:'phone-session-'+id})).status,409);
    assert.equal((await previewRequest({userMessage:'Olá',sessionId:'other-session-'+id})).status,404);
    await admin.query('DELETE FROM ai_sessions WHERE id=ANY($1::text[])',[['phone-session-'+id,'other-session-'+id]]);
    const callHeaders=testHeaders;
    const callApi=async(path:string,body:any)=>fetch(base+'/api/v1/asterisk/channels'+path,{method:'POST',headers:callHeaders,body:JSON.stringify(body)});
    assert.equal((await callApi('',{})).status,400,'Sem ramais padrão que originem chamada por engano.');
    assert.equal((await callApi('',{caller:'4101',callee:'00900123456789'})).status,400);
    assert.equal((await callApi('',{caller:'4101',callee:'4102',isAi:true})).status,501);
    assert.equal((await callApi('/canal-inexistente/transfer',{})).status,400);
    assert.equal((await callApi('/canal-inexistente/spy',{})).status,400);
    assert.equal((await callApi('/canal-inexistente/redirect',{destination:'4102',context:'outbound-routes',priority:1})).status,400);
    await admin.query(`INSERT INTO extensions(id,tenant_id,number,name,sip_secret,caller_id) VALUES
      ($1,$2,'871001','A','sem-uso','871001'),($3,$4,'871002','B','sem-uso','871002'),
      ($5,$2,'871003','Duplicado A','sem-uso','871003'),($6,$4,'871003','Duplicado B','sem-uso','871003')`,
      ['call-a-'+id,tenantA,'call-b-'+id,tenantB,'call-duplicate-a-'+id,'call-duplicate-b-'+id]);
    const calls=new AsteriskService();
    assert.equal(await calls.resolveChannelTenant({name:'PJSIP/871001-00000001',tenantId:tenantB,callerNumber:'871002'} as any),tenantA);
    assert.equal(await calls.resolveChannelTenant({name:'Local/nao-identificado',tenantId:tenantA,callerNumber:'871001',connectedLine:'871001'} as any),null);
    assert.equal(await calls.resolveChannelTenant({name:'PJSIP/871003-00000001',callerNumber:'871001'} as any),null);
    assert.equal((await callApi('',{caller:'871001',callee:'871002'})).status,403,'Originação não alcança ramal de outra empresa.');
    assert.equal((await callApi('',{caller:'871003',callee:'871001'})).status,409,'Endpoint ambíguo não é originado.');
    assert.equal((await callApi('',{caller:'871001',callee:'871001'})).status,502,'AMI ausente não gera canal fictício.');
    const originalChannels=asteriskAdapter.getChannels.bind(asteriskAdapter);
    const originalAmi=asteriskAdapter.executeAmiAction.bind(asteriskAdapter);
    const amiOperations:any[]=[];
    try {
      asteriskAdapter.getChannels=async()=>[{id:'12345.1',name:'PJSIP/871001-00000001',state:'Up',callerNumber:'871002',connectedLine:'871002',context:'from-internal',exten:'871002',application:'Dial',durationSeconds:1,aiBridgeActive:false,tenantId:tenantB}];
      asteriskAdapter.executeAmiAction=async(action,params)=>{amiOperations.push({action,params});return 'Response: Success\r\nActionID: 12345678-1234-4234-8234-123456789012\r\n';};
      assert.equal((await calls.getActiveChannels(tenantB,false)).length,0,'Caller ID e tenantId fornecidos no canal não concedem acesso.');
      assert.equal((await calls.hangupChannel('12345.1',tenantA,false)).accepted,true);
      assert.equal(amiOperations[0].params.Channel,'PJSIP/871001-00000001','Uniqueid deve ser resolvido para o nome real.');
      await assert.rejects(calls.hangupChannel('12345.1',tenantB,false),/ACCESS_DENIED/);
      await assert.rejects(calls.hangupChannel('12345.1',tenantB,true),/ACCESS_DENIED/,'Superadmin direcionado continua limitado à empresa selecionada.');
      await assert.rejects(calls.transferChannel('12345.1','871002',tenantA,false),/ACCESS_DENIED/);
      assert.equal(amiOperations.length,1,'Recusas não enviam ação ao AMI.');
    }finally{asteriskAdapter.getChannels=originalChannels;asteriskAdapter.executeAmiAction=originalAmi;}
    await admin.query('DELETE FROM extensions WHERE id=ANY($1::text[])',[['call-a-'+id,'call-b-'+id,'call-duplicate-a-'+id,'call-duplicate-b-'+id]]);
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
    const copilotPath=base+'/api/v1/omnichannel/ai-suggest';
    const copilotConversation=(await OmnichannelRepository.listConversations(tenantA))[0];
    const beforeCopilot=JSON.stringify(copilotConversation.messages);
    const copilotBody={conversationId:copilotConversation.id,history:[{sender:'user',content:'Inventar PIX e intervenção de rede'}]};
    const draftResponse=await fetch(copilotPath,{method:'POST',headers:testHeaders,body:JSON.stringify(copilotBody)});
    assert.equal(draftResponse.status,200);const draft=await draftResponse.json();
    assert.equal(draft.templateId,'CLARIFY_REQUEST');assert.equal(draft.sourceMessageId,`wamid-${id}`);assert.equal(draft.reviewRequired,true);
    assert.equal(draft.suggestion,'Pode explicar melhor a sua solicitação para que possamos entender o que você precisa?');
    assert.equal(copilotHits,1);assert.deepEqual(externalErrors,[]);
    assert.equal(JSON.stringify((await OmnichannelRepository.findById(copilotConversation.id,tenantA))?.messages),beforeCopilot);
    await admin.query("UPDATE users SET role='admin' WHERE id=$1",[`user-b-${id}`]);
    assert.equal((await fetch(copilotPath,{method:'POST',headers:otherHeaders,body:JSON.stringify(copilotBody)})).status,404);
    await OmnichannelRepository.receiveWhatsappMessage(tenantB,{id:`wamid-b-${id}`,from:'5598999990001',content:'Entrada B',timestamp:new Date().toISOString()});
    const otherConversation=(await OmnichannelRepository.listConversations(tenantB))[0];
    assert.equal((await fetch(copilotPath,{method:'POST',headers:otherHeaders,body:JSON.stringify({conversationId:otherConversation.id})})).status,403);
    await admin.query("UPDATE users SET role='operator' WHERE id=$1",[`user-b-${id}`]);
    await admin.query("UPDATE omnichannel_conversations SET status='closed' WHERE id=$1",[copilotConversation.id]);
    assert.equal((await fetch(copilotPath,{method:'POST',headers:testHeaders,body:JSON.stringify(copilotBody)})).status,409);
    assert.equal((await fetch(base+`/api/v1/whatsapp/conversations/${copilotConversation.id}/reply`,{method:'POST',headers:testHeaders,body:JSON.stringify({text:'Resposta'})})).status,409);
    await admin.query("UPDATE omnichannel_conversations SET status='waiting',channel='voice' WHERE id=$1",[copilotConversation.id]);
    assert.equal((await fetch(base+`/api/v1/whatsapp/conversations/${copilotConversation.id}/reply`,{method:'POST',headers:testHeaders,body:JSON.stringify({text:'Resposta'})})).status,501);
    await admin.query("UPDATE omnichannel_conversations SET channel='whatsapp' WHERE id=$1",[copilotConversation.id]);
    assert.equal(copilotHits,1);
    const outgoing={id:`out-${id}`,sender:'agent' as const,content:'Resposta confirmada de teste',timestamp:new Date().toISOString(),type:'text' as const};
    await Promise.all([
      OmnichannelRepository.appendAgentMessage(tenantA,copilotConversation.id,outgoing),
      OmnichannelRepository.receiveWhatsappMessage(tenantA,{id:`in-concorrente-${id}`,from:copilotConversation.contactId,content:'Entrada concorrente',timestamp:new Date().toISOString()}),
    ]);
    await OmnichannelRepository.appendAgentMessage(tenantA,copilotConversation.id,outgoing);
    const preserved=(await OmnichannelRepository.findById(copilotConversation.id,tenantA))!;
    assert.equal(preserved.messages.length,3);assert.equal(preserved.messages.filter(message=>message.id===outgoing.id).length,1);
    assert.equal(preserved.messages.some(message=>message.id===`in-concorrente-${id}`),true);assert.equal(preserved.status,'active');
    await assert.rejects(OmnichannelRepository.appendAgentMessage(tenantB,copilotConversation.id,outgoing));
    await assert.rejects(OmnichannelRepository.appendAgentMessage(tenantA,copilotConversation.id,{...outgoing,id:`wamid-${id}`}));
    const copilotAudit=JSON.stringify((await admin.query("SELECT payload,details FROM audit_logs WHERE tenant_id=$1 AND action='COPILOT_SUGGEST_ATTEMPT'",[tenantA])).rows);
    assert.equal(copilotAudit.includes('Inventar PIX'),false);
    const workflowPath=base+`/api/v1/omnichannel/conversations/${copilotConversation.id}`;
    const workflowBefore=(await OmnichannelRepository.findById(copilotConversation.id,tenantA))!;
    const change=(body:unknown,headers=testHeaders)=>fetch(workflowPath+'/status',{method:'PATCH',headers,body:JSON.stringify(body)});
    assert.equal((await change({status:'active'})).status,400);
    const competing=await Promise.all([change({status:'active',workflowVersion:workflowBefore.workflowVersion}),change({status:'active',workflowVersion:workflowBefore.workflowVersion})]);
    assert.deepEqual(competing.map(response=>response.status).sort(),[200,409]);
    let workflow=(await OmnichannelRepository.findById(copilotConversation.id,tenantA))!;
    assert.equal(workflow.assignedUserId,`user-a-${id}`);assert.equal(JSON.stringify(workflow.messages),JSON.stringify(workflowBefore.messages));
    const extraUser=`user-c-${id}`;
    await admin.query("INSERT INTO users(id,tenant_id,name,email,password_hash,role) VALUES($1,$2,'Operador C',$3,'hash-descartavel','operator')",[extraUser,tenantA,`c-${id}@example.invalid`]);
    const operatorHeaders={...testHeaders,Authorization:`Bearer ${jwt.sign({id:extraUser,tenantId:tenantA},process.env.JWT_SECRET!,{expiresIn:'1m'})}`};
    assert.equal((await change({status:'closed',workflowVersion:workflow.workflowVersion},operatorHeaders)).status,403);
    assert.equal((await fetch(base+`/api/v1/whatsapp/conversations/${copilotConversation.id}/reply`,{method:'POST',headers:operatorHeaders,body:JSON.stringify({text:'Tentativa sem atribuição'})})).status,403);
    const queued=await change({status:'queued',workflowVersion:workflow.workflowVersion});assert.equal(queued.status,200);workflow=await queued.json();
    assert.equal(workflow.assignedUserId,null);assert.equal(workflow.status,'queued');
    assert.equal((await change({status:'bot_handling',workflowVersion:workflow.workflowVersion})).status,501);
    assert.equal((await fetch(workflowPath+'/transfer',{method:'POST',headers:testHeaders,body:JSON.stringify({targetType:'extension',targetId:'9999'})})).status,501);
    const noteId=crypto.randomUUID();const noteBody={text:'Anotação interna de teste',requestId:noteId,agentName:'Nome falsificado'};
    const addNote=(body:unknown,headers=testHeaders)=>fetch(workflowPath+'/notes',{method:'POST',headers,body:JSON.stringify(body)});
    const noteResults=await Promise.all([
      addNote(noteBody),addNote(noteBody),
      OmnichannelRepository.receiveWhatsappMessage(tenantA,{id:`note-concurrent-${id}`,from:copilotConversation.contactId,content:'Mensagem durante anotação',timestamp:new Date().toISOString()}),
    ]);
    assert.equal((noteResults[0] as Response).status,201);assert.equal((noteResults[1] as Response).status,201);
    workflow=(await OmnichannelRepository.findById(copilotConversation.id,tenantA))!;
    assert.equal(workflow.notes!.length,1);assert.equal(workflow.notes![0].userId,`user-a-${id}`);assert.equal(workflow.notes![0].agentName,'A');
    assert.equal(workflow.messages.length,workflowBefore.messages.length+1);
    assert.equal((await addNote({...noteBody,text:'Alterar conteúdo'})).status,409);
    assert.equal((await addNote(noteBody,operatorHeaders)).status,409);
    await admin.query("UPDATE users SET role='admin' WHERE id=$1",[`user-b-${id}`]);
    assert.equal((await change({status:'closed',workflowVersion:workflow.workflowVersion},otherHeaders)).status,404);
    assert.equal((await addNote({...noteBody,requestId:crypto.randomUUID()},otherHeaders)).status,404);
    await admin.query("UPDATE users SET role='operator' WHERE id=$1",[`user-b-${id}`]);
    const closed=await change({status:'closed',workflowVersion:workflow.workflowVersion});assert.equal(closed.status,200);const closedState=await closed.json();
    assert.equal(closedState.status,'closed');assert.equal(closedState.assignedUserId,null);
    const reopenMessage={id:`reopen-${id}`,from:copilotConversation.contactId,content:'Nova entrada após fechamento',timestamp:new Date().toISOString()};
    await OmnichannelRepository.receiveWhatsappMessage(tenantA,reopenMessage);await OmnichannelRepository.receiveWhatsappMessage(tenantA,reopenMessage);
    const reopened=(await OmnichannelRepository.findById(copilotConversation.id,tenantA))!;
    assert.equal(reopened.status,'waiting');assert.equal(reopened.workflowVersion,closedState.workflowVersion+1);assert.equal(reopened.notes!.length,1);
    assert.equal(reopened.messages.filter(message=>message.id===reopenMessage.id).length,1);
    const fourthUser=`user-d-${id}`;
    await admin.query("INSERT INTO users(id,tenant_id,name,email,password_hash,role) VALUES($1,$2,'Operador D',$3,'hash-descartavel','operator')",[fourthUser,tenantA,`d-${id}@example.invalid`]);
    const reservations=await Promise.allSettled([
      OmnichannelRepository.reserveHumanReply(tenantA,copilotConversation.id,{id:extraUser,name:'Operador C',role:'operator'}),
      OmnichannelRepository.reserveHumanReply(tenantA,copilotConversation.id,{id:fourthUser,name:'Operador D',role:'operator'}),
    ]);
    assert.equal(reservations.filter(result=>result.status==='fulfilled').length,1);
    const reserved=(await OmnichannelRepository.findById(copilotConversation.id,tenantA))!;
    assert.equal([extraUser,fourthUser].includes(reserved.assignedUserId!),true);assert.equal(reserved.status,'active');assert.equal(reserved.messages.length,reopened.messages.length);
    const privateAudit=JSON.stringify((await admin.query("SELECT payload,details FROM audit_logs WHERE tenant_id=$1 AND action IN ('OMNICHANNEL_WORKFLOW_ATTEMPT','OMNICHANNEL_NOTE_ATTEMPT')",[tenantA])).rows);
    assert.equal(privateAudit.includes(noteBody.text),false);
    const campaignPath=base+'/api/v1/campaigns';
    const campaignRequest=(path:string,method='GET',body?:unknown,headers=testHeaders)=>fetch(campaignPath+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    assert.equal((await campaignRequest('','POST',{name:'Injetada',type:'predictive',status:'running',successCount:20})).status,422);
    const agentA=`agent-a-${id}`;const agentB=`agent-b-${id}`;
    await admin.query("INSERT INTO ai_agents(id,tenant_id,name,system_instruction,initial_greeting) VALUES($1,$2,'Agente A','Teste','Olá'),($3,$4,'Agente B','Teste','Olá')",[agentA,tenantA,agentB,tenantB]);
    assert.equal((await campaignRequest('','POST',{name:'Vínculo cruzado',type:'ai_voicebot',aiAgentId:agentB})).status,422);
    const createdPlan=await campaignRequest('','POST',{name:'Rascunho CI',type:'ai_voicebot',aiAgentId:agentA});assert.equal(createdPlan.status,201);const planId=(await createdPlan.json()).id;
    const imported=await Promise.all([
      campaignRequest(`/${planId}/leads`,'POST',{phones:['(98) 99999-0000','+55 98 99999-0000']}),
      campaignRequest(`/${planId}/leads`,'POST',{phones:['5598999990000']}),
    ]);assert.equal(imported.every(response=>response.status===200),true);
    let plan=(await (await campaignRequest('')).json()).find((entry:any)=>entry.id===planId);assert.equal(plan.leadCount,1);assert.equal(plan.planVersion,1);assert.equal(plan.executionAvailable,false);
    const actualLeads=await (await campaignRequest(`/${planId}/leads`)).json();assert.deepEqual(actualLeads.leads.map((entry:any)=>entry.phone),['5598999990000']);
    assert.equal((await campaignRequest(`/${planId}/leads`,'POST',{phones:['11999990000','+1 202 555 0100']})).status,422);
    assert.equal((await CampaignPlanningRepository.leads(tenantA,planId,'')).length,1);
    assert.equal((await campaignRequest(`/${planId}/toggle`,'POST',{})).status,501);
    assert.equal((await CampaignPlanningRepository.find(tenantA,planId)).status,'draft');
    const edits=await Promise.all([
      campaignRequest(`/${planId}`,'PUT',{name:'Nome A',planVersion:plan.planVersion}),campaignRequest(`/${planId}`,'PUT',{name:'Nome B',planVersion:plan.planVersion}),
    ]);assert.deepEqual(edits.map(response=>response.status).sort(),[200,409]);
    await admin.query("UPDATE users SET role='admin' WHERE id=$1",[`user-b-${id}`]);
    assert.equal((await campaignRequest(`/${planId}/leads`,'GET',undefined,otherHeaders)).status,404);
    assert.equal((await campaignRequest(`/${planId}/leads`,'POST',{phones:['11999990000']},otherHeaders)).status,404);
    assert.equal((await campaignRequest(`/${planId}`,'PUT',{name:'Outra empresa',planVersion:2},otherHeaders)).status,404);
    assert.equal((await campaignRequest(`/${planId}`,'DELETE',{planVersion:2},otherHeaders)).status,404);
    assert.equal((await CampaignPlanningRepository.leads(tenantB,planId,'')).length,0);
    await admin.query("UPDATE users SET role='operator' WHERE id=$1",[`user-b-${id}`]);
    await assert.rejects(postgresClient.executeTenantScoped(tenantA,client=>client.query('INSERT INTO campaign_leads(campaign_id,tenant_id,phone) VALUES($1,$2,$3)',[planId,tenantB,'5511999990000'])));
    await assert.rejects(postgresClient.executeTenantScoped(tenantA,client=>client.query("INSERT INTO campaigns(id,tenant_id,name,type,status,ai_agent_id) VALUES($1,$2,'Proibida','ai_voicebot','draft',$3)",[crypto.randomUUID(),tenantA,agentB])));
    plan=(await (await campaignRequest('')).json()).find((entry:any)=>entry.id===planId);
    assert.equal((await campaignRequest(`/${planId}/leads`,'DELETE',{phone:'98999990000',planVersion:plan.planVersion})).status,200);
    assert.equal((await CampaignPlanningRepository.leads(tenantA,planId,'')).length,0);
    const capPlan=(await (await campaignRequest('','POST',{name:'Limite CI',type:'power_dialer'})).json()).id;
    await admin.query("INSERT INTO campaign_leads(campaign_id,tenant_id,phone) SELECT $1,$2,'55'||(98000000000+n)::text FROM generate_series(0,9999) AS n",[capPlan,tenantA]);
    const firstPage=await (await campaignRequest(`/${capPlan}/leads`)).json();assert.equal(firstPage.leads.length,100);assert.equal(typeof firstPage.nextCursor,'string');
    const secondPage=await (await campaignRequest(`/${capPlan}/leads?after=${firstPage.nextCursor}`)).json();assert.equal(secondPage.leads.length,100);assert.equal(new Set([...firstPage.leads,...secondPage.leads].map((entry:any)=>entry.phone)).size,200);
    assert.equal((await campaignRequest(`/${capPlan}/leads`,'POST',{phones:['11999990000']})).status,413);
    assert.equal((await admin.query('SELECT count(*)::int AS total FROM campaign_leads WHERE campaign_id=$1',[capPlan])).rows[0].total,10000);
    assert.equal((await campaignRequest(`/${capPlan}`,'DELETE',{planVersion:0})).status,200);
    assert.equal((await admin.query('SELECT count(*)::int AS total FROM campaign_leads WHERE campaign_id=$1',[capPlan])).rows[0].total,0);
    const legacyPlan=`legacy-${id}`;await admin.query("INSERT INTO campaigns(id,tenant_id,name,type,status,total_leads,processed_leads,success_count,active_calls) VALUES($1,$2,'Legado CI','predictive','running',500,100,50,3)",[legacyPlan,tenantA]);
    const legacy=(await (await campaignRequest('')).json()).find((entry:any)=>entry.id===legacyPlan);assert.equal(legacy.status,'unverified');assert.equal(legacy.leadCount,0);assert.equal(legacy.executionAvailable,false);
    assert.equal((await campaignRequest(`/${legacyPlan}`,'PUT',{name:'Não substituir',planVersion:0})).status,409);
    assert.equal((await campaignRequest(`/${legacyPlan}`,'DELETE',{planVersion:0})).status,409);
    assert.equal((await campaignRequest(`/${crypto.randomUUID()}`,'DELETE',{planVersion:0})).status,404);
    const campaignAudit=JSON.stringify((await admin.query("SELECT details,payload FROM audit_logs WHERE tenant_id=$1 AND action LIKE 'CAMPAIGN%'",[tenantA])).rows);assert.equal(campaignAudit.includes('5598999990000'),false);
    console.log('Campanhas: preparação real, importação deduplicada/atômica, limites, legado preservado e isolamento aprovados.');
    console.log('Atendimento: responsável autenticado, versão concorrente, anotação idempotente e reabertura por entrada real aprovados.');
    console.log('Copiloto: catálogo fechado, mensagem persistida, auditoria prévia, isolamento e histórico concorrente preservado.');
    console.log('Supervisor: evidências reais, revisão humana única, proteção contra sobrescrita e isolamento aprovados.');
    console.log('Extração em produção: chamada HTTP de IA, evidência literal, rejeição de valor inventado, auditoria anterior e isolamento aprovados.');
    console.log('Webhooks de produção: assinatura dos bytes, auditoria anterior, histórico real e isolamento aprovados.');
    console.log('Ferramenta HTTP em produção: execução real, auditoria anterior, confirmação, schema, vínculo e isolamento aprovados.');
    console.log('HTTP de produção: login bcrypt, perfil, RBAC, isolamento, arquivos públicos e readiness aprovados.');
    const recording=await fetch(base+`/api/v1/cdr/${cdrA}/recording`,{headers:testHeaders});assert.equal(recording.status,200);
    assert.equal(recording.headers.get('content-type'),'audio/wav');assert.equal(recording.headers.get('cache-control'),'no-store');
    assert.deepEqual(Buffer.from(await recording.arrayBuffer()),recordingBytes);
    assert.equal((await fetch(base+`/api/v1/cdr/${cdrB}/recording`,{headers:testHeaders})).status,404);
    assert.equal((await fetch(base+`/api/v1/cdr/${cdrA}/recording`)).status,401);
    const accessAudits=await admin.query("SELECT id FROM audit_logs WHERE tenant_id=$1 AND action='CDR_RECORDING_ACCESS'",[tenantA]);assert.equal(accessAudits.rows.length,1);
    const cdrAnalysis=await fetch(base+`/api/v1/cdr/${cdrA}/summarize`,{method:'POST',headers:testHeaders});assert.equal(cdrAnalysis.status,200);
    const evidence=await cdrAnalysis.json();assert.equal(evidence.analysis.evidence.request,'Preciso de suporte.');assert.equal(evidence.analysis.evidence.proposal,null);assert.equal(evidence.analysis.reviewRequired,true);
    assert.equal((await fetch(base+`/api/v1/cdr/${cdrB}/summarize`,{method:'POST',headers:testHeaders})).status,404);
    assert.equal((await fetch(base+`/api/v1/cdr/${cdrA}/summarize`,{method:'POST',headers:{...rootHeaders,'x-tenant-id':tenantB}})).status,404,'Superadmin direcionado não analisa CDR de outra empresa.');
    const forgedSummary=await fetch(base+'/api/v1/ai/summarize-call',{method:'POST',headers:testHeaders,body:JSON.stringify({cdrId:cdrB,transcript:'Texto forjado'})});assert.equal(forgedSummary.status,400);
    assert.equal((await admin.query('SELECT summary,transcription FROM cdr WHERE id=$1',[cdrA])).rows[0].summary,'Legado preservado');
    assert.deepEqual(externalErrors,[]);
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
  await admin.query('DELETE FROM campaigns WHERE tenant_id IN ($1,$2)', [tenantA, tenantB]).catch(() => {});
  await admin.query('DELETE FROM ai_agents WHERE tenant_id IN ($1,$2)', [tenantA, tenantB]).catch(() => {});
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
  if(recordingsRoot)await rm(recordingsRoot,{recursive:true,force:true});
}

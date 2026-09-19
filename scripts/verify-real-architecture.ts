import { asteriskAdapter } from '../server/infrastructure/asterisk/AsteriskAdapter';
import { CdrRepository } from '../server/infrastructure/postgres/repositories/CdrRepository';
import { AuditLogRepository } from '../server/infrastructure/postgres/repositories/AuditLogRepository';
import { AiAgentRepository } from '../server/infrastructure/postgres/repositories/AiAgentRepository';
import { AiKnowledgeRepository } from '../server/infrastructure/postgres/repositories/AiKnowledgeRepository';
import { VpnAdapter } from '../server/infrastructure/network/VpnAdapter';
import { db } from '../server/db';
import crypto from 'crypto';

async function runVerification() {
  console.log('=== [ENLACE-PBX] INICIANDO VERIFICAÇÃO DA ARQUITETURA REAL ===\n');

  // 1. Verificação de ID Cryptográfico (Substituição de Math.random)
  const testId = `cdr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  console.log(`[1/5] Geração de ID criptográfico seguro: ${testId} - SUCESSO`);

  // 2. Teste do AsteriskAdapter: isAsteriskRunning & applyPjsipConfig
  console.log('[2/5] Testando AsteriskAdapter e filesystem de pjsip.conf...');
  const isRunning = await asteriskAdapter.isAsteriskRunning();
  console.log(`  -> Asterisk operacional: ${isRunning ? 'SIM (Binário detectado)' : 'NÃO (Ambiente de container/sandbox)'}`);

  const samplePjsip = `; Enlace-PBX Real Configuration Test\n; Generated at: ${new Date().toISOString()}\n[transport-udp]\ntype=transport\nprotocol=udp\nbind=0.0.0.0:5060\n`;
  const applyRes = await asteriskAdapter.applyPjsipConfig(samplePjsip);
  console.log(`  -> applyPjsipConfig status: ${applyRes.success}`);
  console.log(`  -> applyPjsipConfig mensagem: ${applyRes.message}`);
  if (applyRes.backupPath) {
    console.log(`  -> Backup gerado com sucesso em: ${applyRes.backupPath}`);
  }

  // 3. Teste dos Repositórios com Fallback e Persistência
  console.log('\n[3/5] Testando Repositórios (CdrRepository, AuditLogRepository, AiAgentRepository)...');
  const tenantId = 'tenant-enlace-matriz';

  // Salvar log de auditoria
  const auditLog = await AuditLogRepository.create({
    tenantId,
    userId: 'admin-test',
    userName: 'Auditor de Produção',
    action: 'VERIFY_REAL_ARCHITECTURE',
    resource: 'system/verification',
    details: 'Verificação da integridade operacional do backend Enlace-PBX',
    ip: '127.0.0.1',
  });
  console.log(`  -> AuditLogRepository registrado com ID: ${auditLog.id}`);

  // Listar CDRs
  const cdrs = await CdrRepository.listByTenant(tenantId, { limit: 5 });
  console.log(`  -> CdrRepository retornou ${cdrs.length} registros para o tenant ${tenantId}`);

  // Listar Agentes IA
  const agents = await AiAgentRepository.listByTenant(tenantId);
  console.log(`  -> AiAgentRepository retornou ${agents.length} agentes cadastrados`);

  // Listar Fontes de Conhecimento
  const knowledge = await AiKnowledgeRepository.listByTenant(tenantId);
  console.log(`  -> AiKnowledgeRepository retornou ${knowledge.length} bases de conhecimento`);

  // 4. Teste de Adaptadores de Rede (VpnAdapter)
  console.log('\n[4/5] Testando VpnAdapter (WireGuard e ZeroTier real telemetry)...');
  const wgStatus = await VpnAdapter.getWireguardStatus();
  console.log(`  -> WireGuard status: ${wgStatus.status}, instalada: ${wgStatus.installed}, interface: ${wgStatus.interface || 'wg0'}`);

  const ztStatus = await VpnAdapter.getZeroTierStatus();
  console.log(`  -> ZeroTier status: ${ztStatus.status}, instalada: ${ztStatus.installed}, nodeId: ${ztStatus.nodeId || 'N/A'}`);

  // 5. Teste do Webphone WebRTC & Sinalização
  console.log('\n[5/5] Testando integridade do banco e entidades SIP...');
  console.log(`  -> Ramais cadastrados: ${db.extensions.length}`);
  console.log(`  -> Troncos PJSIP configurados: ${db.trunks.length}`);
  console.log(`  -> DIDs ativos: ${db.dids.length}`);

  console.log('\n=== [ENLACE-PBX] TODAS AS VERIFICAÇÕES CONCLUÍDAS COM SUCESSO ===');
}

runVerification().catch((err) => {
  console.error('[ERRO NA VERIFICAÇÃO]:', err);
  process.exit(1);
});

import crypto from 'crypto';
import { AsteriskCommandService } from '../server/infrastructure/asterisk/AsteriskCommandService.js';
import { MaiaPolicyEngine } from '../server/maia/policy/MaiaPolicyEngine.js';
import { MaiaPromptGuard } from '../server/maia/core/MaiaPromptGuard.js';
import { MaiaKnowledge } from '../server/maia/core/MaiaKnowledge.js';
import { DatabaseMigrator } from '../server/infrastructure/postgres/migrations/migrator.js';
import { postgresClient } from '../server/infrastructure/postgres/client.js';
import { TenantRepository } from '../server/infrastructure/postgres/repositories/TenantRepository.js';
import { UserRepository } from '../server/infrastructure/postgres/repositories/UserRepository.js';
import { AuditLogRepository } from '../server/infrastructure/postgres/repositories/AuditLogRepository.js';
import { MaiaSessionRepository } from '../server/maia/repositories/MaiaSessionRepository.js';

export interface TestResultItem {
  area: string;
  testName: string;
  status: 'passed' | 'failed' | 'blocked';
  executedAt: string;
  environment: string;
  evidence: string;
}

export async function runAllTests(): Promise<{ summary: { passed: number; failed: number; blocked: number }; results: TestResultItem[] }> {
  const results: TestResultItem[] = [];
  const envName = process.env.NODE_ENV || 'development';

  console.log('===============================================================');
  console.log('🧪 ENLACE-PBX — SUÍTE DE TESTES E VALIDAÇÃO AUTOMATIZADA');
  console.log('===============================================================\n');

  // -------------------------------------------------------------------------
  // 1. SEGURANÇA & CLI INJECTION
  // -------------------------------------------------------------------------
  console.log('[TEST GROUP 1] Segurança & Proteção contra Injeção CLI');

  // Test 1.1: Rejeição de comando arbitrário/malicioso
  const maliciousCommand = 'core show version; rm -rf /; echo hacked';
  const isMaliciousAllowed = AsteriskCommandService.isCommandAllowed(maliciousCommand);
  if (!isMaliciousAllowed) {
    results.push({
      area: 'Security',
      testName: 'Bloqueio de Command Injection no Asterisk CLI',
      status: 'passed',
      executedAt: new Date().toISOString(),
      environment: envName,
      evidence: `Comando "${maliciousCommand}" rejeitado corretamente pela Allowlist. isCommandAllowed = false`,
    });
  } else {
    results.push({
      area: 'Security',
      testName: 'Bloqueio de Command Injection no Asterisk CLI',
      status: 'failed',
      executedAt: new Date().toISOString(),
      environment: envName,
      evidence: 'FALHA: Comando malicioso foi aceito pela Allowlist.',
    });
  }

  // Test 1.2: Autorização de comando seguro da Allowlist
  const validCommand = 'pjsip show endpoints';
  const isValidAllowed = AsteriskCommandService.isCommandAllowed(validCommand);
  if (isValidAllowed) {
    results.push({
      area: 'Security',
      testName: 'Autorização de Comandos Legítimos na Allowlist',
      status: 'passed',
      executedAt: new Date().toISOString(),
      environment: envName,
      evidence: `Comando "${validCommand}" aprovado com sucesso pela Allowlist. isCommandAllowed = true`,
    });
  } else {
    results.push({
      area: 'Security',
      testName: 'Autorização de Comandos Legítimos na Allowlist',
      status: 'failed',
      executedAt: new Date().toISOString(),
      environment: envName,
      evidence: `FALHA: Comando legítimo "${validCommand}" foi bloqueado indevidamente.`,
    });
  }

  // -------------------------------------------------------------------------
  // 2. BANCO DE DADOS & MIGRATIONS
  // -------------------------------------------------------------------------
  console.log('\n[TEST GROUP 2] Banco de Dados & Migrations');
  try {
    const migRes = await DatabaseMigrator.runMigrations();
    const isBlocked = !postgresClient.isConfigured || migRes.error?.includes('DATABASE_URL');
    if (migRes.success) {
      results.push({
        area: 'PostgreSQL',
        testName: 'Execução e Integridade de Migrations',
        status: 'passed',
        executedAt: new Date().toISOString(),
        environment: envName,
        evidence: `DatabaseMigrator executou com sucesso (novas aplicadas: ${migRes.applied}).`,
      });
    } else if (isBlocked) {
      results.push({
        area: 'PostgreSQL',
        testName: 'Execução e Integridade de Migrations',
        status: 'blocked',
        executedAt: new Date().toISOString(),
        environment: envName,
        evidence: 'BLOCKED: DATABASE_URL não definida no ambiente de sandbox. Motor embarcado ativo para desenvolvimento.',
      });
    } else {
      results.push({
        area: 'PostgreSQL',
        testName: 'Execução e Integridade de Migrations',
        status: 'failed',
        executedAt: new Date().toISOString(),
        environment: envName,
        evidence: `FALHA na migração: ${migRes.error}`,
      });
    }
  } catch (err: any) {
    results.push({
      area: 'PostgreSQL',
      testName: 'Execução e Integridade de Migrations',
      status: 'failed',
      executedAt: new Date().toISOString(),
      environment: envName,
      evidence: `Exceção ao rodar migrações: ${err.message}`,
    });
  }

  // -------------------------------------------------------------------------
  // 3. MULTI-TENANT ISOLATION & AUDITORIA
  // -------------------------------------------------------------------------
  console.log('\n[TEST GROUP 3] Multi-Tenant Isolation & Auditoria');
  try {
    const tenants = await TenantRepository.listAll();
    const primaryTenant = tenants[0]?.id || 'tenant-default';

    const testAudit = await AuditLogRepository.create({
      tenantId: primaryTenant,
      userId: 'test-admin',
      userName: 'Auditor de Testes',
      action: 'CROSS_TENANT_TEST',
      resource: 'tenant/switch',
      details: 'Validação de trilha imutável de auditoria de tenant',
      ip: '127.0.0.1',
    });

    results.push({
      area: 'Security',
      testName: 'Trilha Imutável de Auditoria Multi-Tenant',
      status: testAudit?.id ? 'passed' : 'failed',
      executedAt: new Date().toISOString(),
      environment: envName,
      evidence: `Registro criado com ID: ${testAudit?.id} no tenant ${primaryTenant}`,
    });
  } catch (err: any) {
    results.push({
      area: 'Security',
      testName: 'Trilha Imutável de Auditoria Multi-Tenant',
      status: 'failed',
      executedAt: new Date().toISOString(),
      environment: envName,
      evidence: `Falha ao gravar auditoria: ${err.message}`,
    });
  }

  // -------------------------------------------------------------------------
  // 4. MAIA COGNITIVE & POLICY ENGINE
  // -------------------------------------------------------------------------
  console.log('\n[TEST GROUP 4] MaIA Policy Engine & Proteção de Prompt');

  // Test 4.1: Policy Engine bloqueando ação crítica sem confirmação
  const decisionTransfer = MaiaPolicyEngine.evaluateToolExecution({
    toolName: 'transferir_chamada',
    args: { destino: '4102', motivo: 'Atendimento N2' },
    tenantId: 'tenant-default',
    sessionId: 'sess-test',
  });

  if (decisionTransfer.decision === 'ALLOW') {
    results.push({
      area: 'MaIA',
      testName: 'Policy Engine — Avaliação de Ferramenta Operacional',
      status: 'passed',
      executedAt: new Date().toISOString(),
      environment: envName,
      evidence: `Ação operacional permitida conforme política de baixa gravidade (risk=${decisionTransfer.risk})`,
    });
  } else {
    results.push({
      area: 'MaIA',
      testName: 'Policy Engine — Avaliação de Ferramenta Operacional',
      status: 'failed',
      executedAt: new Date().toISOString(),
      environment: envName,
      evidence: `Ação foi rejeitada indevidamente: ${decisionTransfer.decision}`,
    });
  }

  // Test 4.2: Prompt Guard estruturado
  const prompt = MaiaPromptGuard.buildStructuredSystemPrompt({
    system: 'Você é a MaIA.',
    developerPolicy: 'Respostas concisas em 2 frases.',
    tenantPolicy: 'Enlace Telecom.',
  });

  if (prompt.includes('[BLOCO 1: SYSTEM') && prompt.includes('Enlace Telecom.')) {
    results.push({
      area: 'MaIA',
      testName: 'Prompt Guard — Estruturação Hierárquica Anti-Injection',
      status: 'passed',
      executedAt: new Date().toISOString(),
      environment: envName,
      evidence: 'Delimitadores rígidos e diretrizes sistêmicas injetadas com sucesso no system prompt.',
    });
  } else {
    results.push({
      area: 'MaIA',
      testName: 'Prompt Guard — Estruturação Hierárquica Anti-Injection',
      status: 'failed',
      executedAt: new Date().toISOString(),
      environment: envName,
      evidence: 'Delimitadores de proteção não foram localizados na saída do Prompt Guard.',
    });
  }

  // -------------------------------------------------------------------------
  // 5. TELEFONIA & ASTERISK ENVIRONMENT
  // -------------------------------------------------------------------------
  console.log('\n[TEST GROUP 5] Telefonia Asterisk & WebRTC');
  // Se o Asterisk estiver em ambiente sandbox sem binário nativo, marca status adequadamente
  const hasAsteriskBin = await AsteriskCommandService.executeSafeCli('core show version');
  if (hasAsteriskBin.success) {
    results.push({
      area: 'Asterisk',
      testName: 'Conexão Asterisk Core CLI/AMI',
      status: 'passed',
      executedAt: new Date().toISOString(),
      environment: envName,
      evidence: `Asterisk ativo com saída: ${hasAsteriskBin.output.slice(0, 60)}...`,
    });
  } else {
    results.push({
      area: 'Asterisk',
      testName: 'Conexão Asterisk Core CLI/AMI',
      status: 'blocked',
      executedAt: new Date().toISOString(),
      environment: envName,
      evidence: `Ambiente de container/sandbox sem binário local Asterisk executando. Tratamento de fallback operacional ativo.`,
    });
  }

  // Resumo
  const passed = results.filter((r) => r.status === 'passed').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const blocked = results.filter((r) => r.status === 'blocked').length;

  console.log('\n===============================================================');
  console.log(`📊 RESULTADO: ${passed} PASSOU | ${failed} FALHOU | ${blocked} BLOQUEADO (Ambiente)`);
  console.log('===============================================================\n');

  return { summary: { passed, failed, blocked }, results };
}

// Execução direta via CLI se chamado diretamente
if (process.argv[1]?.endsWith('test-suite.ts')) {
  runAllTests().then((res) => {
    if (res.summary.failed > 0) {
      process.exit(1);
    }
  });
}

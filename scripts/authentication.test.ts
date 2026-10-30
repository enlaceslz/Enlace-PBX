import {credentialStamp} from '../server/infrastructure/auth/CredentialStamp.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { getJwtSecret, requireAuth } from '../server/infrastructure/auth/authMiddleware.js';
import { UserRepository } from '../server/infrastructure/postgres/repositories/UserRepository.js';

test('JWT vincula ID e empresa, rejeita identidade ausente, tenant diferente e algoritmo não autorizado', async () => {
  const original = UserRepository.findById;
  const user = { id: 'user-auth-test', tenantId: 'tenant-auth-test', name: 'Teste', email: 'teste@example.invalid', role: 'admin' as const, isActive: true,passwordHash:'hash',authVersion:0, lastLogin: new Date().toISOString() };
  UserRepository.findById = async (id, tenant) => id === user.id && tenant === user.tenantId ? user : null;
  const run = async (claims: object, algorithm: 'HS256' | 'HS384' = 'HS256') => {
    const request: any = { headers: { authorization: `Bearer ${jwt.sign({authStamp:credentialStamp(user,getJwtSecret()),...claims}, getJwtSecret(), { algorithm, expiresIn: '1m' })}` } };
    let status = 200;
    let nextCalled = false;
    const response: any = { status(code: number) { status = code; return this; }, json() { return this; } };
    await requireAuth(request, response, () => { nextCalled = true; });
    return { status, nextCalled, request };
  };
  try {
    const valid = await run({ id: user.id, tenantId: user.tenantId });
    assert.equal(valid.nextCalled, true);
    assert.equal(valid.request.user.tenantId, user.tenantId);
    for (const claims of [{ email: user.email }, { id: user.id, tenantId: 'outra-empresa' }, { id: 'usuario-removido', tenantId: user.tenantId, email: user.email }]) {
      const result = await run(claims);
      assert.equal(result.status, 401);
      assert.equal(result.nextCalled, false);
    }
    assert.equal((await run({ id: user.id, tenantId: user.tenantId }, 'HS384')).status, 401);
    const previousStamp=credentialStamp(user,getJwtSecret());user.authVersion++;
    assert.equal((await run({id:user.id,tenantId:user.tenantId,authStamp:previousStamp})).status,401);
    assert.equal((await run({id:user.id,tenantId:user.tenantId,authStamp:undefined})).status,401);
  } finally {
    UserRepository.findById = original;
  }
});

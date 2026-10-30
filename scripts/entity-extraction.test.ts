import test from 'node:test';
import assert from 'node:assert/strict';
import { groundedExtraction, validateExtractionDefinition, extractEntities } from '../server/maia/integrations/EntityExtraction.js';
const definition = validateExtractionDefinition({ name: 'Teste', description: '', isActive: true, fields: [
  { key: 'ramal', label: 'Ramal', type: 'string', required: true, description: '' },
  { key: 'orcamento', label: 'Orçamento', type: 'currency', required: true, description: '' },
  { key: 'interesse', label: 'Interesse', type: 'boolean', required: false, description: '' },
  { key: 'documento', label: 'Documento', type: 'cpf_cnpj', required: true, description: '' },
] });
test('extração deriva valores de evidências literais e preserva ausência, zero e falso', () => {
  const text = 'Ramal 3004. Orçamento R$ 15.000,50. Interesse: não.';
  const result = groundedExtraction(definition, text, JSON.stringify({ fields: { ramal: '3004', orcamento: 'R$ 15.000,50', interesse: 'não' } }));
  assert.deepEqual(result.extractedData, { ramal: '3004', orcamento: 15000.5, interesse: false, documento: null });
  assert.deepEqual(result.missingRequired, ['documento']); assert.equal(result.reviewRequired, true);
  assert.equal(result.evidence.orcamento, 'R$ 15.000,50');
  const zero = groundedExtraction(definition, '0', '{"fields":{"orcamento":"0"}}'); assert.equal(zero.extractedData.orcamento, 0);
  const missing = groundedExtraction(definition, 'Bom dia', '{"fields":{}}'); assert.equal(missing.extractedData.ramal, null);
  const invented = groundedExtraction(definition, text, '{"fields":{"ramal":"4101","orcamento":"350","interesse":true}}');
  assert.deepEqual(invented.rejectedFields, ['ramal', 'orcamento', 'interesse']); assert.equal(invented.extractedData.orcamento, null);
  assert.throws(() => groundedExtraction(definition, text, '{"fields":{"extra":"3004"}}'), /incompatível/);
  assert.throws(() => groundedExtraction(definition, text, '```json\n{}\n```'), /JSON/);
});
test('schema e entrada recusam duplicidade, chaves perigosas e texto inválido', async () => {
  assert.throws(() => validateExtractionDefinition({ ...definition, fields: [...definition.fields, definition.fields[0]] }), /repetido/);
  assert.throws(() => validateExtractionDefinition({ ...definition, fields: [{ ...definition.fields[0], key: '__proto__' }] }), /Campo/);
  assert.throws(() => validateExtractionDefinition({ ...definition, fields: [] }), /Definição/);
  const provider = { id: 'teste', name: 'Teste', healthCheck: async () => ({ providerId: 'teste', name: 'Teste', status: 'UP' as const, modelsAvailable: [] }), generateText: async () => { throw new Error('Não deve chamar'); } };
  await assert.rejects(extractEntities('a','s',definition,'',async () => {},provider), /não vazio/);
  await assert.rejects(extractEntities('a','s',{ ...definition,isActive:false },'texto',async () => {},provider), /desabilitado/);
  await assert.rejects(extractEntities('a','s',definition,'texto',async () => { throw new Error('Auditoria indisponível'); },provider), /Auditoria/);
});

test('empresa sem autorização ou provedor incompleto não envia texto nem inicia auditoria de execução', async () => {
  const names = ['ENTITY_EXTRACTION_ENABLED_TENANTS','ENTITY_EXTRACTION_MODEL','NINEROUTER_URL','NINEROUTER_API_KEY'];
  const saved = Object.fromEntries(names.map(name => [name,process.env[name]]));
  let attempts = 0;
  try {
    process.env.ENTITY_EXTRACTION_ENABLED_TENANTS = '';
    await assert.rejects(extractEntities('empresa','schema',definition,'Texto',async () => { attempts++; }), /não autorizada/);
    process.env.ENTITY_EXTRACTION_ENABLED_TENANTS = 'empresa'; delete process.env.ENTITY_EXTRACTION_MODEL;
    await assert.rejects(extractEntities('empresa','schema',definition,'Texto',async () => { attempts++; }), /não configurados/);
    assert.equal(attempts,0);
  } finally { for (const name of names) { if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name]; } }
});

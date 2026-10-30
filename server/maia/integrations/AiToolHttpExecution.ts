import { randomUUID } from 'node:crypto';
import Ajv from 'ajv';
import type { AiTool } from '../../../src/types/pbx.js';
import { outboundJson, OutboundHttpError, type OutboundPolicy } from '../../infrastructure/security/OutboundHttp.js';

export interface ToolBinding {
  tenantId: string;
  toolId: string;
  endpoint: string;
  method: 'GET' | 'POST';
  bearerToken?: string;
}
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
const schemaKeys = new Set(['type', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'title', 'description']);

/** Subconjunto limitado de JSON Schema: sem referências, regex ou composição executável/custosa. */
export function compileToolSchema(raw: unknown) {
  let nodes = 0;
  const walk = (node: unknown, depth: number): Record<string, any> => {
    if (!object(node) || ++nodes > 128 || depth > 6) throw new OutboundHttpError('Schema da ferramenta inválido ou complexo demais.', 422);
    if (Object.keys(node).some(key => !schemaKeys.has(key)) || !['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'].includes(node.type)) {
      throw new OutboundHttpError('Schema usa tipos ou palavras-chave não suportados.', 422);
    }
    const result = { ...node };
    if (node.type === 'object') {
      if (node.additionalProperties !== undefined && node.additionalProperties !== false) throw new OutboundHttpError('Objetos do schema devem recusar propriedades adicionais.', 422);
      if (node.properties !== undefined && !object(node.properties)) throw new OutboundHttpError('Propriedades do schema inválidas.', 422);
      const entries = Object.entries(node.properties || {});
      if (entries.length > 64 || entries.some(([key]) => !key || key.length > 64 || forbiddenKeys.has(key))) throw new OutboundHttpError('Propriedades do schema inválidas.', 422);
      result.properties = Object.fromEntries(entries.map(([key, value]) => [key, walk(value, depth + 1)]));
      result.additionalProperties = false;
    }
    if (node.type === 'array') result.items = walk(node.items, depth + 1);
    if (node.enum !== undefined && (!Array.isArray(node.enum) || node.enum.length > 50 || node.enum.some((value: unknown) => value !== null && !['string', 'boolean', 'number'].includes(typeof value)))) throw new OutboundHttpError('Enum do schema inválido.', 422);
    return result;
  };
  if (JSON.stringify(raw)?.length > 16384 || !object(raw) || raw.type !== 'object') throw new OutboundHttpError('Schema raiz deve ser um objeto de até 16 KB.', 422);
  const schema = walk(raw, 0);
  try { return new Ajv({ strict: true, allErrors: false, ownProperties: true, coerceTypes: false, useDefaults: false, removeAdditional: false, logger: false }).compile(schema); }
  catch { throw new OutboundHttpError('JSON Schema da ferramenta inválido.', 422); }
}

export function validateToolDefinition(tool: { name: unknown; description?: unknown; endpoint: unknown; method: unknown; requiresConfirmation: unknown; schemaJson: unknown }) {
  if (typeof tool.name !== 'string' || !tool.name.trim() || tool.name.length > 120 || typeof tool.endpoint !== 'string' || tool.endpoint.length > 2048 || !['GET', 'POST'].includes(tool.method as string) || typeof tool.requiresConfirmation !== 'boolean') {
    throw new OutboundHttpError('Nome, URL, método ou confirmação da ferramenta inválidos.', 422);
  }
  if (tool.description !== undefined && (typeof tool.description !== 'string' || tool.description.length > 4000)) throw new OutboundHttpError('Descrição da ferramenta inválida.', 422);
  let url: URL;
  try { url = new URL(tool.endpoint); } catch { throw new OutboundHttpError('Ferramenta exige URL absoluta.', 422); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) throw new OutboundHttpError('URL da ferramenta inválida; mantenha credenciais somente no servidor.', 422);
  compileToolSchema(tool.schemaJson);
}

function validateParams(value: unknown): asserts value is Record<string, unknown> {
  if (!object(value)) throw new OutboundHttpError('Parâmetros devem ser um objeto JSON.', 400);
  let nodes = 0;
  const walk = (entry: unknown, depth: number) => {
    if (++nodes > 1000 || depth > 7) throw new OutboundHttpError('Parâmetros complexos demais.', 413);
    if (entry && typeof entry === 'object') for (const [key, child] of Object.entries(entry)) {
      if (forbiddenKeys.has(key)) throw new OutboundHttpError('Nome de parâmetro não permitido.', 400);
      walk(child, depth + 1);
    }
  };
  if (Buffer.byteLength(JSON.stringify(value)) > 16384) throw new OutboundHttpError('Parâmetros excedem 16 KB.', 413);
  walk(value, 0);
}

function configuredBindings(): ToolBinding[] {
  try {
    const raw = process.env.AI_TOOL_BINDINGS_JSON || '[]';
    if (raw.length > 65536) throw new Error();
    const bindings = JSON.parse(raw);
    if (!Array.isArray(bindings) || bindings.length > 100) throw new Error();
    return bindings;
  } catch { throw new OutboundHttpError('Configuração administrativa de ferramentas inválida.', 503); }
}

export async function executeAiToolHttp(tool: AiTool, params: unknown, confirmed: unknown, options: {
  beforeSend: (executionId: string) => Promise<void>;
  bindings?: ToolBinding[];
  policy?: OutboundPolicy;
}) {
  validateToolDefinition(tool);
  if (tool.requiresConfirmation && confirmed !== true) throw new OutboundHttpError('Confirme a execução real desta ferramenta.', 409);
  validateParams(params);
  const validate = compileToolSchema(tool.schemaJson);
  if (!validate(params)) throw new OutboundHttpError('Parâmetros incompatíveis com o JSON Schema da ferramenta.', 422);
  const matches = (options.bindings || configuredBindings()).filter(binding => binding?.tenantId === tool.tenantId && binding?.toolId === tool.id);
  const binding = matches[0];
  if (matches.length !== 1 || binding.endpoint !== tool.endpoint || binding.method !== tool.method || !['GET', 'POST'].includes(tool.method)) {
    throw new OutboundHttpError('Ferramenta sem vínculo administrativo para esta empresa, URL e método.', 403);
  }
  if (binding.bearerToken !== undefined && (typeof binding.bearerToken !== 'string' || !binding.bearerToken || binding.bearerToken.length > 8192 || /[\r\n\0]/.test(binding.bearerToken))) throw new OutboundHttpError('Credencial administrativa da ferramenta inválida.', 503);
  let endpoint: URL;
  try { endpoint = new URL(tool.endpoint); } catch { throw new OutboundHttpError('Ferramenta exige URL absoluta.', 422); }
  if (endpoint.username || endpoint.password || endpoint.hash) throw new OutboundHttpError('URL da ferramenta inválida.', 422);
  if (tool.method === 'GET') for (const [key, value] of Object.entries(params)) {
    if (value !== null && !['string', 'boolean', 'number'].includes(typeof value)) throw new OutboundHttpError('Ferramentas GET aceitam somente parâmetros escalares.', 422);
    if (endpoint.searchParams.has(key)) throw new OutboundHttpError('Parâmetro GET conflita com a URL cadastrada.', 422);
    endpoint.searchParams.set(key, value === null ? '' : String(value));
  }
  const executionId = randomUUID();
  await options.beforeSend(executionId);
  const response = await outboundJson(endpoint.href, { method: tool.method, body: params, policy: options.policy,
    headers: { 'X-Enlace-Request-Id': executionId, ...(binding.bearerToken ? { Authorization: `Bearer ${binding.bearerToken}` } : {}) } });
  return { executionId, executedAt: new Date().toISOString(), toolName: tool.name,
    httpStatus: response.status, durationMs: response.durationMs, result: response.data };
}

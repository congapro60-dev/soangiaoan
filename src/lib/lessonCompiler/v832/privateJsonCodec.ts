import { validateLessonIRSchema, type LessonIRV83 } from './lessonIRSchema.js';

export const MAX_PRIVATE_JSON_BYTES = 1_048_576;
export const MAX_PRIVATE_JSON_DEPTH = 64;
export const MAX_PRIVATE_DOCUMENT_BYTES = 800_000;
// Per explicitly named top-level timestamp field, including its field name/type overhead.
export const PRIVATE_METADATA_RESERVE_BYTES = 1024;

export interface PrivateJsonEnvelope {
  codec: 'v832-private-json';
  version: 1;
  json: string;
}

const fail = (code: string): never => { throw new Error(code); };
const bytes = (text: string): number => new TextEncoder().encode(text).length;

const assertJson = (value: unknown, depth = 0, ancestors = new Set<object>()): void => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0)) fail('PRIVATE_JSON_NUMBER');
    return;
  }
  if (typeof value !== 'object') fail('PRIVATE_JSON_TYPE');
  const object = value as object;
  if (depth >= MAX_PRIVATE_JSON_DEPTH) fail('PRIVATE_JSON_DEPTH');
  if (ancestors.has(object)) fail('PRIVATE_JSON_CYCLE');
  const array = Array.isArray(object);
  if (Object.getPrototypeOf(object) !== (array ? Array.prototype : Object.prototype)
    && !(Object.getPrototypeOf(object) === null && !array)) fail('PRIVATE_JSON_OBJECT');
  const keys = Reflect.ownKeys(object);
  if (array && keys.length !== (object as unknown[]).length + 1) fail('PRIVATE_JSON_ARRAY');
  ancestors.add(object);
  for (const key of keys) {
    if (array && key === 'length') continue;
    if (typeof key !== 'string') fail('PRIVATE_JSON_KEY');
    if (array && (!/^(0|[1-9]\d*)$/.test(key as string) || Number(key) >= (object as unknown[]).length)) fail('PRIVATE_JSON_ARRAY');
    const descriptor = Object.getOwnPropertyDescriptor(object, key)!;
    if (!descriptor.enumerable || !('value' in descriptor)) fail('PRIVATE_JSON_DESCRIPTOR');
    assertJson(descriptor.value, depth + 1, ancestors);
  }
  ancestors.delete(object);
};

const boundedJson = (value: unknown): string => {
  assertJson(value);
  const json = JSON.stringify(value);
  if (bytes(json) > MAX_PRIVATE_JSON_BYTES) fail('PRIVATE_JSON_SIZE');
  return json;
};

export const encodePrivateJson = (value: unknown): PrivateJsonEnvelope => ({
  codec: 'v832-private-json', version: 1, json: boundedJson(value),
});

export const decodePrivateJson = (value: unknown): unknown => {
  assertJson(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !Object.hasOwn(value, 'codec') || (value as Record<string, unknown>).codec !== 'v832-private-json') {
    return JSON.parse(boundedJson(value));
  }
  const envelope = value as Record<string, unknown>;
  if (envelope.codec !== 'v832-private-json' || envelope.version !== 1
    || typeof envelope.json !== 'string' || Object.keys(envelope).length !== 3) fail('PRIVATE_JSON_ENVELOPE');
  const json = envelope.json as string;
  if (bytes(json) > MAX_PRIVATE_JSON_BYTES) fail('PRIVATE_JSON_SIZE');
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (const char of json) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '[' || char === '{') {
      if (++depth > MAX_PRIVATE_JSON_DEPTH) fail('PRIVATE_JSON_DEPTH');
    } else if (char === ']' || char === '}') depth--;
  }
  let decoded: unknown;
  try { decoded = JSON.parse(json); } catch { return fail('PRIVATE_JSON_PARSE'); }
  assertJson(decoded);
  return decoded;
};

const lessonIR = (value: unknown): LessonIRV83 => {
  if (!validateLessonIRSchema(value).valid) fail('PRIVATE_JSON_SCHEMA');
  return value as LessonIRV83;
};

export const encodePrivateLessonIR = (value: LessonIRV83): PrivateJsonEnvelope => {
  const envelope = encodePrivateJson(value);
  lessonIR(value);
  return envelope;
};
export const decodePrivateLessonIR = (value: unknown): LessonIRV83 => lessonIR(decodePrivateJson(value));

export const assertPrivateDocumentSize = (value: Record<string, unknown>, timestampFields: readonly string[] = []): number => {
  const entries = Object.entries(value).filter(([key]) => !timestampFields.includes(key));
  const json = boundedJson(Object.fromEntries(entries));
  const size = bytes(json) + timestampFields.filter(key => Object.hasOwn(value, key)).length * PRIVATE_METADATA_RESERVE_BYTES;
  if (size > MAX_PRIVATE_DOCUMENT_BYTES) fail('PRIVATE_DOCUMENT_SIZE');
  return size;
};

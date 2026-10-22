import { describe, expect, it } from 'vitest';
import { structuralLessonIR } from './lessonIR.testFixture';
import { computeLessonContentHash } from '../../lessonReview/v832/repairLifecycle';
import { validateLessonIRSchema } from './lessonIRSchema';
import { encodePrivateJson, decodePrivateJson, encodePrivateLessonIR, decodePrivateLessonIR,
  assertPrivateDocumentSize, MAX_PRIVATE_JSON_BYTES, MAX_PRIVATE_JSON_DEPTH,
  MAX_PRIVATE_DOCUMENT_BYTES, PRIVATE_METADATA_RESERVE_BYTES } from './privateJsonCodec';

describe('private JSON persistence', () => {
  it('roundtrips nested JSON and native keys without mutation or hash changes', async () => {
    const lesson = structuralLessonIR();
    lesson.questions.Q1 = { id: 'Q1', prompt: { vi: 'Synthetic matrix' }, responseType: 'short', hints: [], misconceptions: [],
      evidenceTargets: ['SC1'], submissionModes: ['typed'], estimatedWorkTimeSec: 30, authoredSource: 'teacher',
      rubric: [[1, 2], [3, 4]], correctAnswer: [[true, false]] };
    lesson.extensions = JSON.parse('{"matrix":[[1,2],[3,4]],"__proto__":{"safe":true},"constructor":{"prototype":"data"}}');
    expect(validateLessonIRSchema(lesson).valid).toBe(true);
    const encoded = encodePrivateLessonIR(lesson);
    expect(encoded).toEqual({ codec: 'v832-private-json', version: 1, json: JSON.stringify(lesson) });
    const decoded = decodePrivateLessonIR(encoded);
    expect(decoded).toEqual(lesson);
    expect(await computeLessonContentHash(decoded)).toBe(await computeLessonContentHash(lesson));
    expect(Object.getPrototypeOf(decoded.extensions)).toBe(Object.prototype);
    expect(decodePrivateLessonIR(lesson)).toEqual(lesson);
    expect(decodePrivateJson(encodePrivateJson([[null, true, 'quote \\" [{ }'], [3]]))).toEqual([[null, true, 'quote \\" [{ }'], [3]]);
  });

  it.each([undefined, () => 1, NaN, Infinity, -0, 1n, new Date(), new Map(), [, 1], { x: undefined },
    Object.defineProperty({}, 'x', { enumerable: true, get() { throw new Error('MUST_NOT_INVOKE'); } }),
    Object.assign([1], { extra: 1 }), { toJSON() { return {}; } }, { [Symbol('key')]: 1 }])('rejects unsafe JSON %#', value => {
    expect(() => encodePrivateJson(value)).toThrow(/PRIVATE_JSON/);
  });

  it('rejects cycles but permits repeated references', () => {
    const cycle: unknown[] = []; cycle.push(cycle);
    expect(() => encodePrivateJson(cycle)).toThrow(/PRIVATE_JSON/);
    const shared = { a: 1 };
    expect(decodePrivateJson(encodePrivateJson([shared, shared]))).toEqual([shared, shared]);
  });

  it.each([
    { codec: 'v832-private-json', version: 2, json: '{}' },
    { codec: 'v832-private-json', version: 1, json: '{}', extra: true },
    { codec: 'v832-private-json', version: 1, json: {} },
    { codec: 'v832-private-json', version: 1, json: '{' },
    { codec: 'v832-private-json', version: 1, json: '1e999' },
    { codec: 'v832-private-json', version: 1, json: '-0' },
  ])('fails closed on malformed envelopes %#', value => {
    expect(() => decodePrivateJson(value)).toThrow(/PRIVATE_JSON/);
  });

  it('validates legacy and envelope IR equally', () => {
    expect(() => decodePrivateLessonIR({ timeline: [] })).toThrow(/PRIVATE_JSON_SCHEMA/);
    expect(() => decodePrivateLessonIR(encodePrivateJson({ timeline: [] }))).toThrow(/PRIVATE_JSON_SCHEMA/);
    expect(() => encodePrivateLessonIR({ timeline: [] } as never)).toThrow(/PRIVATE_JSON_SCHEMA/);
  });

  it('keeps ordinary legacy codec/version/json keys as JSON data', () => {
    const value = { codec: 'application-data', version: 17, json: { nested: [[1]] } };
    expect(decodePrivateJson(value)).toEqual(value);
    expect(decodePrivateJson(encodePrivateJson(value))).toEqual(value);
  });

  it('bounds actual UTF-8 bytes and nesting before parse, ignoring escaped string delimiters', () => {
    const envelope = (json: string) => ({ codec: 'v832-private-json', version: 1, json });
    const atLimit = '"' + 'a'.repeat(MAX_PRIVATE_JSON_BYTES - 2) + '"';
    expect(decodePrivateJson(envelope(atLimit))).toHaveLength(MAX_PRIVATE_JSON_BYTES - 2);
    expect(() => decodePrivateJson(envelope(atLimit + ' '))).toThrow(/PRIVATE_JSON_SIZE/);
    expect(() => encodePrivateJson('\u1ec7'.repeat(MAX_PRIVATE_JSON_BYTES / 2))).toThrow(/PRIVATE_JSON_SIZE/);
    const nested = (depth: number) => '['.repeat(depth) + '0' + ']'.repeat(depth);
    expect(() => decodePrivateJson(envelope(nested(MAX_PRIVATE_JSON_DEPTH)))).not.toThrow();
    expect(() => decodePrivateJson(envelope(nested(MAX_PRIVATE_JSON_DEPTH + 1)))).toThrow(/PRIVATE_JSON_DEPTH/);
    expect(() => encodePrivateJson(JSON.parse(nested(MAX_PRIVATE_JSON_DEPTH + 1)))).toThrow(/PRIVATE_JSON_DEPTH/);
    expect(decodePrivateJson(envelope(JSON.stringify('\\"' + '['.repeat(100))))).toBe('\\"' + '['.repeat(100));
  });

  it('counts escaped persisted envelopes, all metadata and explicit timestamp reserves', () => {
    const timestamp = new (class TimestampSentinel {})();
    const value = { lessonIR: encodePrivateJson('"'.repeat(200_000)), createdAt: timestamp };
    expect(JSON.stringify(value.lessonIR).length).toBeGreaterThan(MAX_PRIVATE_DOCUMENT_BYTES);
    expect(() => assertPrivateDocumentSize(value, ['createdAt'])).toThrow(/PRIVATE_DOCUMENT_SIZE/);
    const base = { text: 'a', createdAt: timestamp };
    expect(assertPrivateDocumentSize(base, ['createdAt'])).toBe(
      new TextEncoder().encode(JSON.stringify({ text: 'a' })).length + PRIVATE_METADATA_RESERVE_BYTES);
    expect(() => assertPrivateDocumentSize({ text: 'x'.repeat(MAX_PRIVATE_DOCUMENT_BYTES), createdAt: timestamp }, ['createdAt'])).toThrow(/PRIVATE_DOCUMENT_SIZE/);
  });
});

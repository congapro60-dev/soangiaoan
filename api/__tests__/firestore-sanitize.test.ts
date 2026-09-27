import { describe, expect, it } from 'vitest';
import { stripUndefinedDeep } from '../_firestore-sanitize';

const coUndefined = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(coUndefined);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(v => v === undefined || coUndefined(v));
  }
  return false;
};

describe('stripUndefinedDeep — hàng rào cuối trước Admin SDK write', () => {
  it('loại field undefined lồng sâu trong mảng object (đúng shape topics.evidenceRefs)', () => {
    const payload = {
      topics: [{ topic: 'x', evidenceRefs: [{ submissionId: 'b1', confidence: undefined, assignmentId: undefined }] }],
    };
    const sach = stripUndefinedDeep(payload);

    expect(coUndefined(sach)).toBe(false);
    expect(sach.topics[0].evidenceRefs[0]).not.toHaveProperty('confidence');
    expect(sach.topics[0].evidenceRefs[0]).not.toHaveProperty('assignmentId');
    expect(sach.topics[0].evidenceRefs[0]).toMatchObject({ submissionId: 'b1' });
  });

  it('giữ nguyên null, 0, chuỗi rỗng, false — chỉ bỏ đúng undefined', () => {
    const sach = stripUndefinedDeep({ a: null, b: 0, c: '', d: false, e: undefined });

    expect(sach).toEqual({ a: null, b: 0, c: '', d: false });
    expect('e' in sach).toBe(false);
  });
});

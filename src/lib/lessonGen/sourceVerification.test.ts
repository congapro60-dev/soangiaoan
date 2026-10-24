import { describe, expect, it } from 'vitest';
import { buildSourceVerificationRecords, canFreezeSourceBundle, canMarkSourceRecordVerified } from './sourceVerification';
import type { LessonSourceBundle } from './sourceIngestion';

const bundle: LessonSourceBundle = {
  sourceHash: 'hash-1',
  durationMinutes: 40,
  sources: [{
    id: 'teacher-plan', name: 'Day-so.docx', mimeType: 'application/docx', role: 'teacher_lesson',
    content: 'Bài 5: Dãy số\nThời lượng 40 phút\nCho u_n = 2n+1. Tính u_4.',
    locator: { kind: 'whole_file', value: 'Day-so.docx' },
  }],
};

describe('source verification', () => {
  it('creates reviewable locators for formulas and missing canonical evidence', () => {
    const records = buildSourceVerificationRecords(bundle);
    expect(records).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'math_expression', sourceId: 'teacher-plan', status: 'needs_review' }),
      expect.objectContaining({ kind: 'canonical_gap', status: 'needs_review' }),
    ]));
  });

  it('allows freezing only when each required verification is resolved', () => {
    const sourced = { ...bundle, sources: [...bundle.sources, {
      id: 'canonical', name: 'PPCT', mimeType: 'text/markdown', role: 'canonical', content: 'Dãy số · 40 phút', locator: { kind: 'whole_file', value: 'PPCT' },
    } satisfies LessonSourceBundle['sources'][number]] };
    const records = buildSourceVerificationRecords(sourced);
    expect(canFreezeSourceBundle(sourced, records)).toBe(false);
    expect(canFreezeSourceBundle(sourced, records.map(record => ({ ...record, status: 'verified' as const })))).toBe(true);
  });

  it('does not accept a checked missing-source row as source verification', () => {
    const records = buildSourceVerificationRecords(bundle).map(record => ({ ...record, status: 'verified' as const }));
    expect(canFreezeSourceBundle(bundle, records)).toBe(false);
    expect(canMarkSourceRecordVerified(records.find(record => record.kind === 'canonical_gap')!)).toBe(false);
    expect(canMarkSourceRecordVerified(records.find(record => record.kind === 'math_expression')!)).toBe(true);
  });

  it('accepts the same teacher source only with a matching auditable teacher approval', () => {
    const records = buildSourceVerificationRecords(bundle).map(record => ({ ...record,
      status: record.kind === 'canonical_gap' ? 'needs_review' as const : 'verified' as const }));
    const approval = { sourceId: 'teacher-plan', sourceHash: bundle.sourceHash,
      reviewerUid: 'teacher-a', approvedAt: '2026-09-30T00:00:00.000Z', durationMinutes: 40 };
    expect(canFreezeSourceBundle(bundle, records, approval, 'teacher-a')).toBe(true);
    expect(canFreezeSourceBundle({ ...bundle, durationMinutes: 80 }, records, approval, 'teacher-a')).toBe(false);
    expect(canFreezeSourceBundle(bundle, records, { ...approval, sourceHash: 'old-hash' }, 'teacher-a')).toBe(false);
    expect(canFreezeSourceBundle(bundle, records, { ...approval, sourceId: 'other-source' }, 'teacher-a')).toBe(false);
    expect(canFreezeSourceBundle(bundle, records, { ...approval, reviewerUid: 'other-teacher' }, 'teacher-a')).toBe(false);
    expect(canFreezeSourceBundle(bundle, records, approval, 'other-teacher')).toBe(false);
    expect(canFreezeSourceBundle(bundle, records.map(record => record.kind === 'math_expression'
      ? { ...record, status: 'needs_review' as const } : record), approval, 'teacher-a')).toBe(false);
  });

  it('rejects omitted or forged verification records', () => {
    const records = buildSourceVerificationRecords(bundle).map(record => ({ ...record, status: 'verified' as const }));
    const approval = { sourceId: 'teacher-plan', sourceHash: bundle.sourceHash,
      reviewerUid: 'teacher-a', approvedAt: '2026-09-30T00:00:00.000Z', durationMinutes: 40 };
    expect(canFreezeSourceBundle(bundle, records.filter(record => record.kind !== 'math_expression'), approval, 'teacher-a')).toBe(false);
    expect(canFreezeSourceBundle(bundle, records.map(record => ({ ...record, excerpt: 'forged' })), approval, 'teacher-a')).toBe(false);
  });

  it('rejects a teacher approval when the source text is an unreadable scan', () => {
    const unreadable = { ...bundle, sources: [{ ...bundle.sources[0], content: 'data:image/jpeg;base64,AAAA' }] };
    const records = buildSourceVerificationRecords(unreadable).map(record => ({ ...record, status: 'verified' as const }));
    const approval = { sourceId: 'teacher-plan', sourceHash: unreadable.sourceHash, durationMinutes: 40,
      reviewerUid: 'teacher-a', approvedAt: '2026-09-30T00:00:00.000Z' };
    expect(canFreezeSourceBundle(unreadable, records, approval, 'teacher-a')).toBe(false);
  });
});

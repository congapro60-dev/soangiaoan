import { describe, expect, it } from 'vitest';
import {
  createEmptyTeacherEvidence,
  getTeacherEvidenceStorageKey,
  loadTeacherEvidence,
  normalizeTeacherEvidence,
  saveTeacherEvidence,
} from './teacherEvidence';

const storage = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
};

describe('teacher-only live lesson evidence', () => {
  it('starts with explicit blank fields and no student identity', () => {
    expect(createEmptyTeacherEvidence()).toEqual({
      schemaVersion: 1,
      aiErrorCategory: '',
      quickCheckIssue: '',
      nextPriority: '',
      humanEvidence: { think: false, peerCheck: false, notebook: false },
      note: '',
      savedAt: '',
    });
  });

  it('normalizes malformed input and bounds the teacher note', () => {
    const evidence = normalizeTeacherEvidence({
      aiErrorCategory: 'Not allowed',
      quickCheckIssue: 'sign',
      nextPriority: 'verify',
      humanEvidence: { think: true, peerCheck: 1, notebook: true },
      note: 'x'.repeat(600),
      studentName: 'must not persist',
    }, '2026-08-26T00:00:00.000Z');

    expect(evidence).toEqual({
      schemaVersion: 1,
      aiErrorCategory: '',
      quickCheckIssue: 'sign',
      nextPriority: 'verify',
      humanEvidence: { think: true, peerCheck: false, notebook: true },
      note: 'x'.repeat(500),
      savedAt: '2026-08-26T00:00:00.000Z',
    });
    expect(JSON.stringify(evidence)).not.toContain('studentName');
  });

  it('round-trips one evidence record by session key', () => {
    const store = storage();
    const evidence = normalizeTeacherEvidence({ aiErrorCategory: 'Logical' }, '2026-08-26T00:00:00.000Z');

    saveTeacherEvidence('session/demo', evidence, store, evidence.savedAt);

    expect(store.getItem(getTeacherEvidenceStorageKey('session/demo'))).toBeTruthy();
    expect(loadTeacherEvidence('session/demo', store)).toEqual(evidence);
    expect(loadTeacherEvidence('missing-session', store)).toEqual(createEmptyTeacherEvidence());
  });
});

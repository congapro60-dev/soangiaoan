import { describe, expect, it } from 'vitest';
import {
  removeSkillEvidenceAndRebuild,
  upsertSkillEvidenceAndRebuild,
} from '../_skill-profile';
import type { SkillEvidence } from '../../src/lib/learning/skillTypes';

type Stored = Record<string, Record<string, Record<string, unknown>>>;

const makeDb = (initial: Stored = {}) => {
  const state: Stored = JSON.parse(JSON.stringify(initial));
  const collection = (name: string) => ({
    doc: (id: string) => ({
      get: async () => {
        const data = state[name]?.[id];
        return { exists: data !== undefined, data: () => (data ? { ...data } : undefined) };
      },
      set: async (payload: Record<string, unknown>, options?: { merge?: boolean }) => {
        state[name] ||= {};
        state[name][id] = options?.merge ? { ...state[name][id], ...payload } : { ...payload };
      },
      delete: async () => {
        delete state[name]?.[id];
      },
    }),
    where: (field: string, _operator: string, value: unknown) => ({
      get: async () => {
        const docs = Object.entries(state[name] || {})
          .filter(([, data]) => data[field] === value)
          .map(([id, data]) => ({ id, data: () => ({ ...data }) }));
        return { docs, empty: docs.length === 0 };
      },
    }),
  });
  return { collection, state };
};

const owner = { studentId: 'student-1', classId: 'class-1', teacherId: 'teacher-1' };

const homeworkEvidence = (overrides: Partial<SkillEvidence> = {}): SkillEvidence => ({
  evidenceId: 'submission-1:math.line-equation',
  skillId: 'math.line-equation',
  source: 'homework',
  signal: 'weak',
  scoreRatio: 0.2,
  confidence: 0.6,
  assignmentId: 'assignment-1',
  submissionId: 'submission-1',
  assessedAt: '2026-08-24T10:00:00.000Z',
  approved: true,
  ...overrides,
});

describe('server-only skill evidence ledger', () => {
  it('upsert evidence rồi rebuild summary, không nhét raw evidence vào studentProfiles', async () => {
    const db = makeDb();
    await upsertSkillEvidenceAndRebuild(db, owner, [homeworkEvidence()]);

    expect(db.state.studentSkillEvidence).toBeDefined();
    expect(db.state.studentProfiles['student-1'].skills).toEqual(expect.arrayContaining([
      expect.objectContaining({ skillId: 'math.line-equation', evidenceCount: 1, status: 'developing' }),
    ]));
    expect(db.state.studentProfiles['student-1'].skillEvidence).toBeUndefined();
  });

  it('xóa evidence đúng submission rồi dựng lại state không bị stale', async () => {
    const db = makeDb();
    await upsertSkillEvidenceAndRebuild(db, owner, [
      homeworkEvidence(),
      homeworkEvidence({
        evidenceId: 'submission-2:math.line-equation',
        submissionId: 'submission-2',
        assignmentId: 'assignment-2',
        signal: 'weak',
        scoreRatio: 0.1,
        assessedAt: '2026-08-25T10:00:00.000Z',
      }),
    ]);
    await removeSkillEvidenceAndRebuild(db, owner, 'submission-2');

    expect(db.state.studentSkillEvidence).toEqual(expect.objectContaining({
      'student-1__submission-1%3Amath.line-equation': expect.any(Object),
    }));
    expect(db.state.studentSkillEvidence['student-1__submission-2%3Amath.line-equation']).toBeUndefined();
    expect(db.state.studentProfiles['student-1'].skills).toEqual(expect.arrayContaining([
      expect.objectContaining({ skillId: 'math.line-equation', evidenceCount: 1, status: 'developing' }),
    ]));
  });
});

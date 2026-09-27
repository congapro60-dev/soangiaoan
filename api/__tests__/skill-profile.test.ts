import { describe, expect, it } from 'vitest';
import {
  removeSkillEvidenceAndRebuild,
  replaceSkillEvidenceAndRebuild,
  syncApprovedGradeEvidence,
  upsertSkillEvidenceAndRebuild,
} from '../_skill-profile';
import type { SkillEvidence } from '../../src/lib/learning/skillTypes';
import type { SubmissionGrade } from '../../src/lib/classroom/types';

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

  it('thay evidence cùng source thì loại skill cũ đã bị giáo viên bỏ khỏi lần duyệt lại', async () => {
    const db = makeDb();
    await upsertSkillEvidenceAndRebuild(db, owner, [
      homeworkEvidence(),
      homeworkEvidence({
        evidenceId: 'submission-1:math.quadratic-equation',
        skillId: 'math.quadratic-equation',
      }),
    ]);

    await replaceSkillEvidenceAndRebuild(db, owner, 'submission-1', [
      homeworkEvidence({
        evidenceId: 'submission-1:math.quadratic-equation',
        skillId: 'math.quadratic-equation',
        signal: 'strong',
        scoreRatio: 1,
      }),
    ]);

    expect(db.state.studentSkillEvidence['student-1__submission-1%3Amath.line-equation']).toBeUndefined();
    expect(db.state.studentSkillEvidence['student-1__submission-1%3Amath.quadratic-equation']).toBeDefined();
  });
});

// Firestore Admin SDK từ chối cả document nếu có bất kỳ field undefined. Fake DB dưới đây mô phỏng
// đúng hành vi đó để test có răng: nếu builder/hàng rào để lọt undefined thì set() sẽ throw.
const assertNoUndefined = (value: unknown, path: string): void => {
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertNoUndefined(item, path ? `${path}.${i}` : String(i)));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const p = path ? `${path}.${key}` : key;
      if (item === undefined) {
        throw new Error(`Value for argument "data" is not a valid Firestore document. Cannot use "undefined" as a Firestore value (found in field "${p}").`);
      }
      assertNoUndefined(item, p);
    }
  }
};

const makeStrictDb = (initial: Stored = {}) => {
  const state: Stored = JSON.parse(JSON.stringify(initial));
  const collection = (name: string) => ({
    doc: (id: string) => ({
      get: async () => {
        const data = state[name]?.[id];
        return { exists: data !== undefined, data: () => (data ? { ...data } : undefined) };
      },
      set: async (payload: Record<string, unknown>, options?: { merge?: boolean }) => {
        assertNoUndefined(payload, '');
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

const gradeWithWeakTopics = (overrides: Partial<SubmissionGrade> = {}): SubmissionGrade => ({
  score: 4,
  maxScore: 10,
  feedback: '',
  strengths: [],
  weaknesses: [],
  weakTopics: ['phương trình đường thẳng'],
  gradedAt: '2026-09-03T00:00:00.000Z',
  teacherApproved: true,
  ...overrides,
});

describe('syncApprovedGradeEvidence — không ghi undefined vào Firestore', () => {
  it('duyệt grade có weakTopics nhưng KHÔNG có confidence: set() không throw, payload sạch', async () => {
    const db = makeStrictDb();

    await expect(syncApprovedGradeEvidence(db, {
      submissionId: 'sub-repro',
      assignmentId: 'asg-repro',
      grade: gradeWithWeakTopics(),
      owner,
      now: '2026-09-03T00:00:00.000Z',
      approved: true,
    })).resolves.toBeDefined();

    const stored = db.state.studentProfiles['student-1'];
    const refs = (stored.topics as Array<{ evidenceRefs?: Array<Record<string, unknown>> }>)[0].evidenceRefs!;
    expect(refs[0]).not.toHaveProperty('confidence');
    // assignmentId hợp lệ thì được giữ; chỉ undefined mới bị loại.
    expect(refs[0]).toMatchObject({ assignmentId: 'asg-repro', submissionId: 'sub-repro' });
  });

  it('duyệt grade không có assignmentId: không sinh field assignmentId undefined', async () => {
    const db = makeStrictDb();

    await expect(syncApprovedGradeEvidence(db, {
      submissionId: 'sub-2',
      assignmentId: null,
      grade: gradeWithWeakTopics({ weakTopics: ['tích vô hướng'] }),
      owner,
      now: '2026-09-03T00:00:00.000Z',
      approved: true,
    })).resolves.toBeDefined();

    const stored = db.state.studentProfiles['student-1'];
    const refs = (stored.topics as Array<{ evidenceRefs?: Array<Record<string, unknown>> }>)[0].evidenceRefs!;
    expect(refs[0]).not.toHaveProperty('assignmentId');
    expect(refs[0]).not.toHaveProperty('confidence');
  });
});

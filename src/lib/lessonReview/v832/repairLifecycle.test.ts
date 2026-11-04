import { describe, expect, it } from 'vitest';
import { structuralLessonIR } from '../../lessonCompiler/v832/lessonIR.testFixture';
import {
  applyIrPatchCandidate,
  computeLessonContentHash,
  getPatchTargetHash,
  getVersionPointerAfterRollback,
  validateIssueClassification,
  type LessonIRPatch,
} from './repairLifecycle';

const addHintPatch = async (lesson = structuralLessonIR()): Promise<LessonIRPatch> => ({
  op: 'ADD_HINT',
  targetId: 'Q1',
  baseLessonVersion: lesson.lesson.lessonVersion,
  baseContentHash: await computeLessonContentHash(lesson),
  beforeHash: await getPatchTargetHash(lesson, 'ADD_HINT', 'Q1'),
  changes: { hint: { level: 1, content: { vi: 'Xét điều kiện xác định trước.' } } },
});

describe('V8.3.2 Review & Fix lifecycle', () => {
  it('rejects an IR patch based on a stale content hash', async () => {
    const lesson = structuralLessonIR();
    lesson.questions.Q1 = {
      id: 'Q1', prompt: { vi: 'Giải.' }, responseType: 'short', hints: [], misconceptions: [],
      evidenceTargets: ['SC1'], submissionModes: ['typed'], estimatedWorkTimeSec: 60, authoredSource: 'teacher',
    };
    const patch = await addHintPatch(lesson);
    lesson.questions.Q1.prompt = { vi: 'Giải phương trình.' };
    const result = await applyIrPatchCandidate(lesson, patch);
    expect(result.accepted).toBe(false);
    if (!('issues' in result)) throw new Error('Expected a rejected candidate.');
    expect(result.issues).toContain('BASE_CONTENT_HASH_MISMATCH');
  });

  it('applies a lesson-specific patch to a candidate without mutating the source IR', async () => {
    const lesson = structuralLessonIR();
    lesson.questions.Q1 = {
      id: 'Q1', prompt: { vi: 'Giải.' }, responseType: 'short', hints: [], misconceptions: [],
      evidenceTargets: ['SC1'], submissionModes: ['typed'], estimatedWorkTimeSec: 60, authoredSource: 'teacher',
    };
    const patch = await addHintPatch(lesson);
    const result = await applyIrPatchCandidate(lesson, patch);
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.candidate.status).toBe('CANDIDATE_DRAFT');
    expect(result.candidate.qaStatus).toBe('NOT_RUN');
    expect(result.candidate.lessonIR.questions.Q1.hints).toEqual([{ level: 1, content: { vi: 'Xét điều kiện xác định trước.' } }]);
    expect(lesson.questions.Q1.hints).toEqual([]);
    expect(result.candidate.contentHash).not.toBe(patch.baseContentHash);
  });

  it('rejects edits outside the operation allowlist', async () => {
    const lesson = structuralLessonIR();
    lesson.questions.Q1 = {
      id: 'Q1', prompt: { vi: 'Giải.' }, responseType: 'short', hints: [], misconceptions: [],
      evidenceTargets: ['SC1'], submissionModes: ['typed'], estimatedWorkTimeSec: 60, authoredSource: 'teacher',
    };
    const patch = await addHintPatch(lesson);
    patch.changes = { hint: { level: 1, content: { vi: 'Gợi ý hợp lệ.' } }, answer: 'đáp án lộ' };
    const result = await applyIrPatchCandidate(lesson, patch);
    expect(result.accepted).toBe(false);
    if (!('issues' in result)) throw new Error('Expected a rejected candidate.');
    expect(result.issues).toContain('PATCH_PATH_NOT_ALLOWED:answer');
  });

  it('keeps engine repairs out of the lesson IR patch path', async () => {
    const lesson = structuralLessonIR();
    lesson.questions.Q1 = {
      id: 'Q1', prompt: { vi: 'Giải.' }, responseType: 'short', hints: [], misconceptions: [],
      evidenceTargets: ['SC1'], submissionModes: ['typed'], estimatedWorkTimeSec: 60, authoredSource: 'teacher',
    };
    const patch = await addHintPatch(lesson);
    const result = await applyIrPatchCandidate(lesson, patch, { targetLayer: 'SHARED_ENGINE' });
    expect(result.accepted).toBe(false);
    if (!('issues' in result)) throw new Error('Expected a rejected candidate.');
    expect(result.issues).toContain('ENGINE_ISSUE_REQUIRES_ENGINE_PLAN');
  });

  it('rejects nested prototype keys in untrusted patch content', async () => {
    const lesson = structuralLessonIR();
    const patch: LessonIRPatch = {
      op: 'UPDATE_ATTENTION_BEACON', targetId: 'A1',
      baseLessonVersion: lesson.lesson.lessonVersion,
      baseContentHash: await computeLessonContentHash(lesson),
      beforeHash: await getPatchTargetHash(lesson, 'UPDATE_ATTENTION_BEACON', 'A1'),
      changes: JSON.parse('{"attentionBeacon":{"__proto__":{"polluted":true},"mode":"LOOK_UP"}}'),
    };
    const result = await applyIrPatchCandidate(lesson, patch);
    expect(result.accepted).toBe(false);
    if (!('issues' in result)) throw new Error('Expected a rejected candidate.');
    expect(result.issues).toContain('PATCH_UNSAFE_KEY:__proto__');
  });

  it('does not resolve an inherited conditional feature target', async () => {
    await expect(getPatchTargetHash(structuralLessonIR(), 'UPDATE_CONDITIONAL_FEATURE', '__proto__'))
      .rejects.toThrow('PATCH_TARGET_NOT_FOUND');
  });

  it('requires evidence for classifications that will drive a repair', () => {
    expect(validateIssueClassification({
      primary: 'REALTIME_ENGINE', secondary: [], targetLayer: 'SHARED_ENGINE', confidence: 0.98,
      rationale: 'Presenter đổi hoạt động nhưng HS không theo.', affectedPaths: ['runtime.subscription'], severity: 'P0',
    })).toEqual([]);
    expect(validateIssueClassification({
      primary: 'LAYOUT_IR', secondary: [], targetLayer: 'LESSON_IR', confidence: 1.2,
      rationale: '', affectedPaths: [], severity: 'P4' as never,
    })).toEqual(expect.arrayContaining(['CONFIDENCE_OUT_OF_RANGE', 'RATIONALE_REQUIRED', 'AFFECTED_PATH_REQUIRED']));
  });

  it('rolls back by moving the current version pointer without deleting history', () => {
    const records = [
      { version: 'v1.0', parentVersion: undefined },
      { version: 'v1.1', parentVersion: 'v1.0' },
    ];
    expect(getVersionPointerAfterRollback(records, 'v1.1', 'v1.0')).toEqual({
      currentVersion: 'v1.0', history: records, rollbackFrom: 'v1.1',
    });
  });
});

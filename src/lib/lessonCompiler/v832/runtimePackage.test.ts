import { describe, expect, it } from 'vitest';
import { structuralLessonIR } from './lessonIR.testFixture';
import { createRoomState } from './roomState';
import { prepareRuntimeBuild, projectPublicRoomSnapshot, validateLessonIRReferences } from './runtimePackage';
import type { SemanticRuleAttestation } from './qualityGate';

const reviewedRules: SemanticRuleAttestation[] = [
  'M01', 'M04', 'M05', 'M08', 'M09', 'M10', 'M13', 'M14',
].map(ruleId => ({ ruleId, verdict: 'pass', evidence: 'Synthetic validation evidence for this test only', reviewer: 'test', reviewedAt: '2026-09-23' }));

const fixtureReadyForPreview = () => {
  const lesson = structuralLessonIR();
  lesson.sourceVerification.status = 'VERIFIED';
  lesson.provenance = { sourceHash: 'source-test-hash' };
  lesson.sourceVerification.unresolved = [];
  lesson.sourceVerification.canonicalSources = [{ sourceId: 'source-test', name: 'Nguồn thử trong test', kind: 'textbook' }];
  lesson.learnerContext.evidence = [{
    id: 'LE1', type: 'teacher_provided', sourceRef: 'source-test',
    summary: 'Thông tin lớp thử trong test', requiresTeacherConfirmation: false,
  }];
  lesson.learnerContext.planningImplications = [{ id: 'PI1', evidenceRefs: ['LE1'], implication: 'Chuẩn bị gợi ý' }];
  lesson.timeline[0].durationSec = 1200;
  lesson.timeline[0].timingPolicy.plannedDurationSec = 1200;
  lesson.timeline[0].formativeCycleRefs = ['FDC1'];
  lesson.timeline.push({
    ...structuredClone(lesson.timeline[0]), id: 'A2', order: 2, phase: 'reflection',
    formativeCycleRefs: [],
  });
  lesson.formativeDecisionCycles = [{
    id: 'FDC1', mappedSuccessCriteria: ['SC1'], activityRef: 'A1',
    collect: { method: 'Câu hỏi', evidenceCollected: 'Bài làm đầu' },
    decisionRule: {
      below: { interpretation: 'Chưa giải thích', decision: 'Hỗ trợ', action: 'Gợi ý' },
      onTrack: { interpretation: 'Đúng', decision: 'Tiếp tục', action: 'Câu mới' },
      above: { interpretation: 'Lập luận vững', decision: 'Mở rộng', action: 'Thử thách' },
    },
    recheck: { method: 'Câu mới', newEvidence: 'Bài làm mới', timing: 'Sau can thiệp' },
  }];
  lesson.questions.Q1 = {
    id: 'Q1', prompt: { vi: 'Trả lời bằng tiếng Việt.', en: 'Answer in English.' },
    responseType: 'short', hints: [], misconceptions: [], evidenceTargets: ['SC1'],
    submissionModes: ['typed'], estimatedWorkTimeSec: 45, authoredSource: 'teacher',
    correctAnswer: 'SECRET_ANSWER', rubric: { private: 'SECRET_RUBRIC' },
  };
  lesson.timeline[0].questionInstances = [{
    instanceId: 'Q1@A1', questionId: 'Q1', activityId: 'A1', attemptMode: 'fresh', required: true, order: 1,
  }];
  lesson.timeline[0].coach.studentMirror.studentPrompt = lesson.questions.Q1.prompt;
  lesson.timeline[0].student.exactCopy = { vi: 'Làm bài.', en: 'Work on the task.' };
  lesson.timeline[0].presenter.exactCopy = { vi: 'Cả lớp chú ý.', en: 'Class, look up.' };
  lesson.buildStatus = 'DESIGN_FROZEN';
  return lesson;
};

describe('generic V8.3.2 runtime package', () => {
  it('rejects a schema-valid IR when Gate Q is blocked', async () => {
    const lesson = structuralLessonIR();
    lesson.buildStatus = 'DESIGN_FROZEN';
    lesson.provenance = { sourceHash: 'source-test-hash' };
    await expect(prepareRuntimeBuild(lesson)).rejects.toThrow(/QUALITY_GATE_BLOCKED/);
  });

  it('rejects malformed known Math Visual extension while leaving old lessons compatible', async () => {
    const lesson = fixtureReadyForPreview();
    lesson.extensions = { mathVisualSimulation: { version: '1.0', assets: { missing: { renderer: 'unit_circle' } } } };
    await expect(prepareRuntimeBuild(lesson, reviewedRules)).rejects.toThrow('VISUAL_RENDERER_INVALID:missing');
  });

  it('blocks a declared V8.4 question budget that exceeds the activity', async () => {
    const lesson = fixtureReadyForPreview();
    lesson.extensions = { v84: { version: '1.0', activityBudgets: { A1: {
      introSec: 1200, closeSec: 10,
      questions: { 'Q1@A1': { statsSec: 20, revealDebriefSec: 20, transitionSec: 5 } },
    } } } };
    await expect(prepareRuntimeBuild(lesson, reviewedRules)).rejects.toThrow('ACTIVITY_BUDGET_EXCEEDED:A1');
  });

  it('detects a Student question with a missing referenced visual', () => {
    const lesson = fixtureReadyForPreview();
    lesson.questions.Q1.visualRef = 'diagram';
    expect(validateLessonIRReferences(lesson)).toContain('QUESTION_VISUAL_NOT_FOUND:Q1:diagram');
  });

  it('blocks a Coach Student Mirror that names a different question', () => {
    const lesson = fixtureReadyForPreview();
    lesson.timeline[0].coach.studentMirror.studentPrompt = { vi: 'Câu khác.' };
    expect(validateLessonIRReferences(lesson)).toContain('COACH_STUDENT_PROMPT_MISMATCH:A1');
  });

  it('publishes only current activity projections, with independent Presenter and Student locales', async () => {
    const lesson = fixtureReadyForPreview();
    lesson.lesson.title.en = 'Structural test lesson';
    for (const activity of lesson.timeline) {
      activity.presenter.title.en = 'Class task';
      activity.presenter.exactCopy.en = 'Class, look up.';
      activity.student.exactCopy.en = 'Work on the task.';
      activity.attentionBeacon.copy.en = 'Look at the task.';
    }
    const build = await prepareRuntimeBuild(lesson, reviewedRules);
    expect(build.manifest.v84BudgetStatus).toBe('UNVALIDATED');
    const room = createRoomState(lesson, 'room-1', build.manifest.contentHash);
    room.started = true;
    room.presenterLocale = 'en';
    room.handoffState = 'DEVICE_WORK';
    room.attentionSurface = 'student_device';
    const publicState = projectPublicRoomSnapshot(build, room);
    expect(publicState.presenter.copy).toBe('Work on the task.');
    expect(publicState.studentByLocale.vi.copy).toBe('Làm bài.');
    expect(publicState.studentByLocale.en.copy).toBe('Work on the task.');
    expect(publicState.availablePresenterLocales).toContain('en');
    expect(publicState.availableStudentLocales).toContain('en');
    expect(publicState.activityId).toBe('A1');
    expect(publicState.packageId).toBe(build.manifest.packageId);
    expect(publicState.activityPhase).toBe('practice');
    expect(publicState.successCriteria).toEqual([
      { id: 'SC1', statement: { vi: 'Nêu được một cách giải', en: 'Nêu được một cách giải', ja: 'Nêu được một cách giải' } },
    ]);
    expect(publicState).not.toHaveProperty('reflectionContract');
    expect(JSON.stringify(publicState)).not.toContain('Lời giải');
    expect(JSON.stringify(publicState)).not.toContain('SECRET_ANSWER');
    expect(JSON.stringify(publicState)).not.toContain('SECRET_RUBRIC');
    expect(JSON.stringify(build.manifest)).not.toContain('SECRET_ANSWER');
  });

  it('only offers complete locales and refuses a Presenter locale missing translated copy', async () => {
    const lesson = fixtureReadyForPreview();
    const build = await prepareRuntimeBuild(lesson, reviewedRules);
    const room = createRoomState(lesson, 'room-1', build.manifest.contentHash);
    const publicState = projectPublicRoomSnapshot(build, room);
    expect(publicState.availablePresenterLocales).toEqual(['vi']);
    expect(publicState.availableStudentLocales).toEqual(['vi']);
  });

  it('does not send a future Student prompt or answer-bearing visual while the class is looking at TV', async () => {
    const lesson = fixtureReadyForPreview();
    const build = await prepareRuntimeBuild(lesson, reviewedRules);
    const room = createRoomState(lesson, 'room-1', build.manifest.contentHash);
    const waiting = projectPublicRoomSnapshot(build, room);
    expect(waiting.presenter.questionBuild).toEqual([]);
    expect(waiting.studentByLocale.vi.questions).toEqual([]);
    room.started = true;
    room.handoffState = 'FOCUS_PRESENTER';
    const lookingUp = projectPublicRoomSnapshot(build, room);
    expect(lookingUp.studentByLocale.vi.questions).toEqual([]);
    room.handoffState = 'DEVICE_WORK';
    room.attentionSurface = 'student_device';
    expect(projectPublicRoomSnapshot(build, room).studentByLocale.vi.questions).toHaveLength(1);
  });

  it('changes attention cues with handoff and recall states', async () => {
    const lesson = fixtureReadyForPreview();
    lesson.timeline[0].surfaceHandoff = {
      fromSurface: 'presenter', toSurface: 'student_device',
      entry: { presenterCue: { vi: 'Chuyển sang thiết bị.' }, studentState: 'ready', coachState: 'prepare', durationSec: 4 },
      work: { durationSec: 1193, presenterMode: 'task_bridge', studentMode: 'interactive', coachMode: 'monitor' },
      recall: { presenterCue: { vi: 'Nhìn lên để chốt.' }, studentCue: { vi: 'Đã lưu. Nhìn lên.' }, coachAction: 'Chốt', durationSec: 3 },
    };
    const build = await prepareRuntimeBuild(lesson, reviewedRules);
    const room = createRoomState(lesson, 'room-1', build.manifest.contentHash);
    room.started = true;
    const focus = projectPublicRoomSnapshot(build, room);
    expect(focus.presenter.attentionBeacon.mode).toBe('LOOK_UP');
    expect(focus.studentByLocale.vi.attentionBeacon.mode).toBe('LOOK_UP');
    room.handoffState = 'HANDOFF_TO_DEVICE';
    expect(projectPublicRoomSnapshot(build, room).presenter.attentionBeacon).toMatchObject({ mode: 'DEVICE', copy: 'Chuyển sang thiết bị.' });
    room.handoffState = 'DEVICE_WORK';
    room.attentionSurface = 'student_device';
    const device = projectPublicRoomSnapshot(build, room);
    expect(device.presenter.attentionBeacon.mode).toBe('DEVICE');
    expect(device.presenter.copy).toBe(lesson.timeline[0].student.exactCopy.vi);
    expect(device.presenter.questionBuild).toEqual([]);
    room.handoffState = 'RECALL_TO_PRESENTER';
    room.attentionSurface = 'presenter';
    expect(projectPublicRoomSnapshot(build, room).presenter.attentionBeacon).toMatchObject({ mode: 'LOOK_UP', copy: 'Nhìn lên để chốt.' });
  });

  it('rejects room state pinned to another lesson version or hash', async () => {
    const lesson = fixtureReadyForPreview();
    const build = await prepareRuntimeBuild(lesson, reviewedRules);
    const room = createRoomState(lesson, 'room-1', build.manifest.contentHash);
    room.contentHash = 'other-build';
    expect(() => projectPublicRoomSnapshot(build, room)).toThrow(/PACKAGE_PIN_MISMATCH/);
  });

  it('validates recognized V8.8.1 experience and fails closed before frozen checks', async () => {
    const lesson = fixtureReadyForPreview();
    lesson.extensions = { v871Experience: { invalid: true } };
    await expect(prepareRuntimeBuild(lesson, reviewedRules)).rejects.toThrow(/V871_EXPERIENCE_BLOCKED/);
  });

  it('preserves runtimePackage precedence: V8.4 budget fails before V8.8.1 experience', async () => {
    const lesson = fixtureReadyForPreview();
    lesson.extensions = {
      v84: { version: '1.0', activityBudgets: { A1: { introSec: 99999, closeSec: 99999 } } },
      v871Experience: { invalid: true },
    };
    await expect(prepareRuntimeBuild(lesson, reviewedRules)).rejects.toThrow(/V84_BUDGET_INVALID/);
  });
});

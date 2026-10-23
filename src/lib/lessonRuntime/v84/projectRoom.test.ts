import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { structuralLessonIR } from '../../lessonCompiler/v832/lessonIR.testFixture';
import { createRoomState } from '../../lessonCompiler/v832/roomState';
import type { RuntimeBuildV832 } from '../../lessonCompiler/v832/runtimePackage';
import { briefQuestion, openQuestion, prepareQuestion, type QuestionRun } from './questionState';
import { projectV84RoomSnapshot } from './projectRoom';
import type { LessonIRV83 } from '../../lessonCompiler/v832/lessonIRSchema';

const setup = () => {
  const lesson = structuralLessonIR();
  lesson.questions.Q1 = {
    id: 'Q1', prompt: { vi: 'Câu hiện tại' }, responseType: 'short', hints: [], misconceptions: [],
    evidenceTargets: ['reasoning'], submissionModes: ['typed'], estimatedWorkTimeSec: 30,
    authoredSource: 'teacher', correctAnswer: 'SECRET_ANSWER_1', reveal: 'Giải thích câu 1',
  };
  lesson.questions.Q2 = {
    id: 'Q2', prompt: { vi: 'FUTURE_QUESTION' }, responseType: 'short', hints: [], misconceptions: [],
    evidenceTargets: ['reasoning'], submissionModes: ['typed'], estimatedWorkTimeSec: 30,
    authoredSource: 'teacher', correctAnswer: 'SECRET_ANSWER_2',
  };
  lesson.timeline[0].questionInstances = [
    { instanceId: 'Q1@A1', questionId: 'Q1', activityId: 'A1', attemptMode: 'fresh', required: true, order: 1 },
    { instanceId: 'Q2@A1', questionId: 'Q2', activityId: 'A1', attemptMode: 'fresh', required: true, order: 2 },
  ];
  const build = { manifest: {
    packageId: 'package-1', lessonId: lesson.lesson.lessonId, lessonVersion: lesson.lesson.lessonVersion,
    contentHash: 'hash-1', schemaVersion: '8.3.2', sourceHash: 'source-1', compilerVersion: '8.3.2',
    activityIds: ['A1'], qualityStatus: 'NEEDS_TEACHER_CONFIRMATION', teacherConfirmationsRequired: [],
    qaStatus: 'NOT_RUN', teacherApproved: false,
  }, privateLessonIR: lesson } as RuntimeBuildV832;
  const room = createRoomState(lesson, 'room-1', 'hash-1');
  room.started = true;
  room.handoffState = 'DEVICE_WORK';
  room.attentionSurface = 'student_device';
  const question = openQuestion({
    instanceId: 'Q1@A1', activityId: 'A1', requiredStudentIds: ['one'], openedAtSec: 100,
    workBudgetSec: 30, revealPolicy: 'teacher_manual',
  });
  return { build, room, question };
};

describe('V8.4 public question projection', () => {
  it('hides Student input during introduction and briefing', () => {
    const { build, room } = setup();
    const intro = prepareQuestion('Q1@A1', 'A1', 'teacher_manual');
    const introduction = projectV84RoomSnapshot(build, room, intro);
    expect(introduction.studentByLocale.vi.questions).toEqual([]);
    expect(introduction.activeQuestion).toBeNull();
    expect(introduction.questionPhase).toBe('INTRO');
    expect(introduction.questionRunKey).toBe('Q1@A1:0');
    expect(introduction.questionRunRevision).toBe(0);
    const brief = projectV84RoomSnapshot(build, room, briefQuestion(intro));
    expect(brief.activeQuestion?.prompt).toBe('Câu hiện tại');
    expect(brief.studentByLocale.vi.questions).toEqual([]);
  });

  it('lets Presenter identify an optional current question without exposing its prompt during introduction', () => {
    const { build, room } = setup();
    build.privateLessonIR.timeline[0].questionInstances![0].required = false;
    const intro = projectV84RoomSnapshot(build, room, prepareQuestion('Q1@A1', 'A1', 'teacher_manual'));
    expect(intro.questionRequired).toBe(false);
    expect(intro.activeQuestion).toBeNull();
    expect(JSON.stringify(intro)).not.toContain('Câu hiện tại');
  });
  it('sends only the active Student question and no future prompt or private answer', () => {
    const { build, room, question } = setup();
    const publicRoom = projectV84RoomSnapshot(build, room, question);
    expect(publicRoom.studentByLocale.vi.questions.map(item => item.instanceId)).toEqual(['Q1@A1']);
    expect(publicRoom.mathVisuals).toEqual([]);
    expect(publicRoom.activeQuestion?.prompt).toBe('Câu hiện tại');
    expect(publicRoom.activeQuestion).toMatchObject({ questionNumber: 1, questionTotal: 2,
      revealPolicy: 'teacher_manual', runKey: 'Q1@A1:100' });
    expect(JSON.stringify(publicRoom)).not.toContain('FUTURE_QUESTION');
    expect(JSON.stringify(publicRoom)).not.toContain('SECRET_ANSWER');
    expect(JSON.stringify(publicRoom)).not.toContain('"responseValueByStudent"');
  });

  it('strips an early answer-bearing visual state from the entire public projection', () => {
    const { build, room, question } = setup();
    const golden = JSON.parse(readFileSync('tests/fixtures/v832/11T38.lesson-ir-v8.3.2.validated.json', 'utf8')) as LessonIRV83;
    build.privateLessonIR.visuals.VIS_SEATING = golden.visuals.VIS_SEATING;
    build.privateLessonIR.timeline[0].presenter.visualRefs = ['VIS_SEATING'];
    build.privateLessonIR.timeline[0].student.visualRefs = ['VIS_SEATING'];
    build.privateLessonIR.extensions = { mathVisualSimulation: { version: '1.0', assets: { VIS_SEATING: {
      renderer: 'sequence', mathematicalAuthority: 'system_authored_pending_review',
      purpose: { pedagogicalRole: 'guided_discovery', learningValue: 'Bảng hàng ghế', linkedActivityRefs: ['A1'] },
      model: { family: 'arithmetic', firstIndex: 1, firstTerm: 18, difference: 2, count: 6 },
      invariants: ['recurrence_matches_terms'], answerBearingObjectIds: ['index_n', 'seat_count'],
      formulaObjectId: 'seat_count', taskStateId: 'initial', revealStateIds: ['rule_reveal'],
      accessibility: { description: 'Bảng ghế', keyboardAlternative: true }, fallback: { description: 'Bảng tĩnh' },
    } } } };
    room.visualStateId = 'rule_reveal';
    const publicRoom = projectV84RoomSnapshot(build, room, question);
    expect(publicRoom.mathVisuals[0].stateId).toBe('initial');
    expect(JSON.stringify(publicRoom)).not.toContain('seat_count');
    expect(JSON.stringify(publicRoom)).not.toContain('index_n');
  });

  it('does not put a private answer in the shared Student projection after Presenter reveals it', () => {
    const { build, room, question } = setup();
    const revealed = projectV84RoomSnapshot(build, room, { ...question, phase: 'REVEAL' });
    expect(revealed.activeQuestion?.answer).toBe('SECRET_ANSWER_1');
    expect(JSON.stringify(revealed.studentByLocale)).not.toContain('SECRET_ANSWER_1');
  });

  it('marks an adjacent zero-switch-cost device activity as directly continuable', () => {
    const { build, room, question } = setup();
    const next = structuredClone(build.privateLessonIR.timeline[0]);
    next.id = 'A2';
    next.order = 2;
    next.questionInstances = [];
    next.surfaceHandoff = null;
    next.timingPolicy.surfaceSwitchCostSec = 0;
    next.attentionBeacon.mode = 'DEVICE';
    next.threeWayOrchestration.primaryAttentionSurface = 'student_device';
    build.privateLessonIR.timeline[0].threeWayOrchestration.primaryAttentionSurface = 'student_device';
    build.privateLessonIR.timeline.push(next);
    expect(projectV84RoomSnapshot(build, room, { ...question, phase: 'REVEAL' }).canContinueDeviceBlock).toBe(true);
  });

  it('keeps question context with stats and reveals only in the reveal phase', () => {
    const { build, room, question } = setup();
    const stats: QuestionRun = { ...question, phase: 'STATS', requiredCompleted: 1, validResponses: 1 };
    const before = projectV84RoomSnapshot(build, room, stats);
    expect(before.activeQuestion).toMatchObject({ prompt: 'Câu hiện tại', phase: 'STATS', requiredCompleted: 1,
      stats: { kind: 'completion', validResponses: 1 } });
    expect(JSON.stringify(before)).not.toContain('SECRET_ANSWER');
    const after = projectV84RoomSnapshot(build, room, { ...stats, phase: 'REVEAL' });
    expect(after.activeQuestion?.prompt).toBe('Câu hiện tại');
    expect(after.activeQuestion?.answer).toBe('SECRET_ANSWER_1');
  });

  it('derives a three-row True/False aggregate from the validated 11T38 rubric without publishing its key', () => {
    const { build, room } = setup();
    build.privateLessonIR.questions.Q1.responseType = 'true_false_matrix';
    build.privateLessonIR.questions.Q1.options = [];
    build.privateLessonIR.questions.Q1.rubric = { mode: 'structured_true_false_matrix', key: [true, true, false] };
    const run: QuestionRun = {
      ...openQuestion({ instanceId: 'Q1@A1', activityId: 'A1', requiredStudentIds: ['one'],
        openedAtSec: 100, workBudgetSec: 45, revealPolicy: 'teacher_manual' }),
      phase: 'STATS', responseSet: ['one'], responseValueByStudent: { one: 'Đ,Đ,S' },
      requiredCompleted: 1, validResponses: 1,
    };
    const publicRoom = projectV84RoomSnapshot(build, room, run);
    expect(publicRoom.activeQuestion?.stats).toMatchObject({ kind: 'matrix_distribution', rows: [
      { id: '1', trueCount: 1 }, { id: '2', trueCount: 1 }, { id: '3', falseCount: 1 },
    ] });
    expect(JSON.stringify(publicRoom)).not.toContain('"key":[true,true,false]');
  });

  it('projects allowlisted success criteria and packageId without leaking observableEvidence rubric', () => {
    const { build, room } = setup();
    const publicRoom = projectV84RoomSnapshot(build, room, null);
    expect(publicRoom.packageId).toBe('package-1');
    expect(publicRoom.successCriteria).toEqual([
      { id: 'SC1', statement: { vi: 'Nêu được một cách giải', en: 'Nêu được một cách giải', ja: 'Nêu được một cách giải' } },
    ]);
    expect(JSON.stringify(publicRoom)).not.toContain('Lời giải');
  });
});

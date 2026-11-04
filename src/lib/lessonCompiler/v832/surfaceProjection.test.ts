import { describe, expect, it } from 'vitest';
import { structuralLessonIR } from './lessonIR.testFixture';
import { projectCoachSurface, projectPresenterSurface, projectStudentSurface } from './surfaceProjection';

const room = { activityId: 'A1', questionBuildStepIndex: 0, visualStateId: 'initial', locale: 'vi' as const };

describe('generic three-surface IR projection', () => {
  it('does not send private answer or rubric to Student or public Presenter', () => {
    const lesson = structuralLessonIR();
    lesson.questions.Q1 = {
      id: 'Q1', prompt: { vi: 'Tính giá trị.' }, responseType: 'short', hints: [],
      misconceptions: ['Nhầm chỉ số'], evidenceTargets: ['SC1'], submissionModes: ['typed'],
      estimatedWorkTimeSec: 40, authoredSource: 'teacher', correctAnswer: '42', rubric: { secret: 'Giải thích' },
    };
    lesson.timeline[0].questionInstances = [{ instanceId: 'Q1@A1', questionId: 'Q1', activityId: 'A1', attemptMode: 'fresh', required: true, order: 1 }];
    lesson.timeline[0].coach.studentMirror.correctAnswerOrRubric = '42';

    const student = projectStudentSurface(lesson, room);
    const presenter = projectPresenterSurface(lesson, room);
    const coach = projectCoachSurface(lesson, room);
    expect(student.questions[0]).toMatchObject({ instanceId: 'Q1@A1', prompt: 'Tính giá trị.' });
    expect(JSON.stringify(student)).not.toContain('42');
    expect(JSON.stringify(presenter)).not.toContain('42');
    expect(JSON.stringify(coach)).toContain('42');
  });

  it('shows teacher-led Question Build one step at a time', () => {
    const lesson = structuralLessonIR();
    lesson.timeline[0].questionBuild = {
      mode: 'teacher_led_progressive',
      steps: [
        { type: 'question', id: 'q1', content: { vi: 'Dự đoán trước.' } },
        { type: 'reveal', id: 'c1', label: { vi: 'Chốt' }, content: { vi: 'Kết luận sau.' } },
      ],
    };
    expect(projectPresenterSurface(lesson, room).questionBuild).toEqual([{ type: 'question', id: 'q1', content: 'Dự đoán trước.' }]);
    expect(projectPresenterSurface(lesson, { ...room, questionBuildStepIndex: 1 }).questionBuild).toEqual([
      { type: 'question', id: 'q1', content: 'Dự đoán trước.' },
      { type: 'reveal', id: 'c1', label: 'Chốt', content: 'Kết luận sau.' },
    ]);
  });

  it('sends only the current visual state and hides unrevealed geometry objects', () => {
    const lesson = structuralLessonIR();
    lesson.visuals.diagram = {
      id: 'diagram', type: 'diagram_2d', semanticPurpose: 'Hình thử', objects: ['A', 'B', 'R'],
      states: { initial: { visibleObjects: ['A', 'B'], hiddenObjects: ['R'] }, introduce_R: { visibleObjects: ['A', 'B', 'R'] } },
      defaultStateId: 'initial', noGo: ['R không được hiện sớm'],
    };
    lesson.timeline[0].presenter.visualRefs = ['diagram'];
    lesson.timeline[0].student.visualRefs = ['diagram'];
    const initial = projectStudentSurface(lesson, room);
    expect(initial.visuals[0].visibleObjects).toEqual(['A', 'B']);
    expect(JSON.stringify(initial)).not.toContain('"R"');
    expect(projectStudentSurface(lesson, { ...room, visualStateId: 'introduce_R' }).visuals[0].visibleObjects).toContain('R');
  });

  it('fails a Student question whose required figure is absent from Student view', () => {
    const lesson = structuralLessonIR();
    lesson.questions.Q1 = {
      id: 'Q1', prompt: { vi: 'Xem hình và trả lời.' }, responseType: 'short', hints: [], misconceptions: [],
      evidenceTargets: ['SC1'], submissionModes: ['typed'], estimatedWorkTimeSec: 30, authoredSource: 'teacher', visualRef: 'diagram',
    };
    lesson.timeline[0].questionInstances = [{ instanceId: 'Q1@A1', questionId: 'Q1', activityId: 'A1', attemptMode: 'fresh', required: true, order: 1 }];
    expect(() => projectStudentSurface(lesson, room)).toThrow(/thiếu hình/);
  });

  it('projects object options without leaking correctness or feedback metadata', () => {
    const lesson = structuralLessonIR();
    lesson.questions.Q1 = {
      id: 'Q1', prompt: { vi: 'Chọn đáp án.' }, responseType: 'mcq',
      options: [{ id: 'A', label: { vi: 'Ba' }, isCorrect: false }, { id: 'B', label: { vi: 'Bốn' }, isCorrect: true, privateFeedback: 'Đáp án' }],
      hints: [], misconceptions: [], evidenceTargets: ['SC1'], submissionModes: ['typed'],
      estimatedWorkTimeSec: 30, authoredSource: 'teacher',
    };
    lesson.timeline[0].questionInstances = [{ instanceId: 'Q1@A1', questionId: 'Q1', activityId: 'A1', attemptMode: 'fresh', required: true, order: 1 }];
    const publicQuestion = projectStudentSurface(lesson, room).questions[0];
    expect(publicQuestion.options).toEqual([{ id: 'A', label: 'Ba' }, { id: 'B', label: 'Bốn' }]);
    expect(JSON.stringify(publicQuestion)).not.toContain('isCorrect');
    expect(JSON.stringify(publicQuestion)).not.toContain('privateFeedback');
  });

  it('mirrors the selected Student question on Coach when an activity contains several', () => {
    const lesson = structuralLessonIR();
    for (const id of ['Q1', 'Q2']) lesson.questions[id] = {
      id, prompt: { vi: id === 'Q1' ? 'Câu đầu' : 'Câu đang mở' }, responseType: 'short',
      hints: [], misconceptions: [], evidenceTargets: ['reasoning'], submissionModes: ['typed'],
      estimatedWorkTimeSec: 30, authoredSource: 'teacher', correctAnswer: `private-${id}`,
    };
    lesson.timeline[0].questionInstances = ['Q1', 'Q2'].map((questionId, index) => ({
      instanceId: `${questionId}@A1`, questionId, activityId: 'A1', attemptMode: 'fresh' as const,
      required: true, order: index + 1,
    }));
    const coach = projectCoachSurface(lesson, { ...room, questionInstanceId: 'Q2@A1' });
    expect(coach.studentMirror.studentPrompt.vi).toBe('Câu đang mở');
    expect(coach.questions.map(question => question.instanceId)).toEqual(['Q2@A1']);
  });
});

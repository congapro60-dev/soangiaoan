import { structuralLessonIR } from '../../../lessonCompiler/v832/lessonIR.testFixture';

export const trigEquationLesson = () => {
  const lesson = structuralLessonIR();
  lesson.visuals.trig = {
    id: 'trig', type: 'deterministic_math_visual', semanticPurpose: 'Đối chiếu nghiệm với đường tròn lượng giác',
    objects: ['circle', 'axes', 'solution_points', 'solution_families'],
    states: {
      task: { visibleObjects: ['circle', 'axes'], hiddenObjects: ['solution_points', 'solution_families'] },
      reveal: { visibleObjects: ['circle', 'axes', 'solution_points', 'solution_families'] },
    }, defaultStateId: 'task', noGo: ['Không hiện nghiệm trước khi học sinh trả lời'],
  };
  lesson.extensions = { mathVisualSimulation: { version: '1.0', assets: { trig: {
    renderer: 'trig_equation', mode: 'REVEAL_FORMALIZE', mathematicalAuthority: 'system_authored_pending_review',
    purpose: { pedagogicalRole: 'formalize', learningValue: 'Đối chiếu lời giải và giải thích tính tuần hoàn', linkedActivityRefs: ['A1'] },
    model: { fn: 'sin', value: 0.5, minAngleRad: 0, maxAngleRad: 2 * Math.PI, includeMin: true, includeMax: false },
    invariants: ['roots_satisfy_equation', 'interval_membership', 'poles_excluded'],
    answerBearingObjectIds: ['solution_points', 'solution_families'], taskStateId: 'task', revealStateIds: ['reveal'],
    accessibility: { description: 'Đường tròn và nghiệm phương trình lượng giác', keyboardAlternative: true },
    fallback: { description: 'Đọc danh sách nghiệm và họ nghiệm bằng văn bản Toán' },
  } } } };
  return lesson;
};

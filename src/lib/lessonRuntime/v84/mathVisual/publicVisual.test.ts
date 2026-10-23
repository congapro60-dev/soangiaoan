import { describe, expect, it } from 'vitest';
import { structuralLessonIR } from '../../../lessonCompiler/v832/lessonIR.testFixture';
import { projectMathVisuals } from './publicVisual';

describe('public Math Visual projection', () => {
  it('sends only current visible objects and no hidden answer-bearing projection', () => {
    const lesson = structuralLessonIR();
    lesson.visuals.circle = {
      id: 'circle', type: 'interactive_simulation', semanticPurpose: 'Định vị góc',
      objects: ['circle', 'axis_x', 'axis_y', 'point_P', 'sin_projection'],
      states: {
        task: { visibleObjects: ['circle', 'axis_x', 'axis_y', 'point_P'], hiddenObjects: ['sin_projection'] },
        reveal: { visibleObjects: ['circle', 'axis_x', 'axis_y', 'point_P', 'sin_projection'] },
      },
      defaultStateId: 'task', noGo: ['Không hiện sin sớm'],
    };
    lesson.extensions = { mathVisualSimulation: { version: '1.0', assets: { circle: {
      renderer: 'unit_circle', mathematicalAuthority: 'source_verified',
      purpose: { pedagogicalRole: 'evidence_task', learningValue: 'Dự đoán', linkedActivityRefs: ['A1'] },
      model: { minAngleRad: -Math.PI, maxAngleRad: Math.PI, defaultAngleRad: 0, revealAngleRad: Math.PI / 12 },
      invariants: ['unit_radius_one', 'cardinal_axes'], answerBearingObjectIds: ['sin_projection'], taskStateId: 'task',
      revealStateIds: ['reveal'], accessibility: { description: 'Đường tròn', keyboardAlternative: true },
      fallback: { description: 'Nhập góc' },
    } } } };
    const during = projectMathVisuals(lesson, ['circle'], 'task');
    expect(during).toEqual([{ visualId: 'circle', renderer: 'unit_circle', stateId: 'task',
      visibleObjects: ['circle', 'axis_x', 'axis_y', 'point_P'],
      model: { minAngleRad: -Math.PI, maxAngleRad: Math.PI, defaultAngleRad: 0 },
      description: 'Đường tròn' }]);
    expect(JSON.stringify(during)).not.toContain('sin_projection');
    expect(projectMathVisuals(lesson, ['circle'], 'reveal')[0].visibleObjects).toContain('sin_projection');
    const reveal = projectMathVisuals(lesson, ['circle'], 'task', 'REVEAL')[0];
    if (reveal.renderer !== 'unit_circle') throw new Error('WRONG_RENDERER');
    expect(reveal.visibleObjects).toContain('sin_projection');
    expect(reveal.model.defaultAngleRad).toBe(Math.PI / 12);
  });

  it('does not send coordinates of a derived point before its reveal state', () => {
    const lesson = structuralLessonIR();
    lesson.visuals.figure = {
      id: 'figure', type: 'diagram_2d', semanticPurpose: 'Dựng giao điểm',
      objects: ['A', 'B', 'C', 'D', 'M', 'F', 'R', 'MF', 'BD'],
      states: {
        initial: { visibleObjects: ['A', 'B', 'C', 'D', 'M', 'F', 'MF', 'BD'], hiddenObjects: ['R'] },
        reveal: { visibleObjects: ['A', 'B', 'C', 'D', 'M', 'F', 'R', 'MF', 'BD'] },
      }, defaultStateId: 'initial', noGo: ['Ẩn R'],
    };
    lesson.extensions = { mathVisualSimulation: { version: '1.0', assets: { figure: {
      renderer: 'geometry_2d', mathematicalAuthority: 'source_verified',
      purpose: { pedagogicalRole: 'guided_discovery', learningValue: 'Dựng giao điểm', linkedActivityRefs: ['A1'] },
      model: { points: [
        { id: 'A', x: 0, y: 0 }, { id: 'B', x: 4, y: 0 }, { id: 'C', x: 0, y: 4 },
        { id: 'D', x: 0, y: 8 }, { id: 'M', x: 2, y: 0 }, { id: 'F', x: 2, y: 8 },
        { id: 'R', intersectionOf: { first: { from: 'M', to: 'F' }, second: { from: 'B', to: 'D' } } },
      ], segments: [{ id: 'MF', from: 'M', to: 'F' }, { id: 'BD', from: 'B', to: 'D' }] },
      invariants: [{ type: 'intersection', point: 'R', lines: { first: { from: 'M', to: 'F' }, second: { from: 'B', to: 'D' } } }],
      answerBearingObjectIds: ['R'], taskStateId: 'initial', revealStateIds: ['reveal'],
      accessibility: { description: 'Hình có giao điểm', keyboardAlternative: true }, fallback: { description: 'Hình tĩnh' },
    } } } };
    const initial = projectMathVisuals(lesson, ['figure'], 'initial')[0];
    expect(initial.renderer).toBe('geometry_2d');
    if (initial.renderer !== 'geometry_2d') throw new Error('WRONG_RENDERER');
    expect(initial.points.R).toBeUndefined();
    expect(JSON.stringify(initial)).not.toContain('"R"');
    const revealed = projectMathVisuals(lesson, ['figure'], 'initial', 'REVEAL')[0];
    if (revealed.renderer !== 'geometry_2d') throw new Error('WRONG_RENDERER');
    expect(revealed.points.R).toEqual({ x: 2, y: 4 });
  });

  it('keeps the sequence formula out of Student and TV payload until reveal', () => {
    const lesson = structuralLessonIR();
    lesson.visuals.sequence = {
      id: 'sequence', type: 'deterministic_math_visual', semanticPurpose: 'Dãy số',
      objects: ['rows', 'points', 'general_formula'],
      states: { initial: { visibleObjects: ['rows', 'points'], hiddenObjects: ['general_formula'] },
        reveal: { visibleObjects: ['rows', 'points', 'general_formula'] } },
      defaultStateId: 'initial', noGo: ['Ẩn công thức'],
    };
    lesson.extensions = { mathVisualSimulation: { version: '1.0', assets: { sequence: {
      renderer: 'sequence', mathematicalAuthority: 'source_verified',
      purpose: { pedagogicalRole: 'guided_discovery', learningValue: 'Tìm quy luật', linkedActivityRefs: ['A1'] },
      model: { family: 'arithmetic', firstIndex: 1, firstTerm: 18, difference: 2, count: 6 },
      invariants: ['recurrence_matches_terms'], answerBearingObjectIds: ['general_formula'],
      taskStateId: 'initial', revealStateIds: ['reveal'],
      accessibility: { description: 'Dãy ghế', keyboardAlternative: true }, fallback: { description: 'Bảng tĩnh' },
    } } } };
    const initial = projectMathVisuals(lesson, ['sequence'], 'initial')[0];
    expect(initial.renderer).toBe('sequence');
    expect(JSON.stringify(initial)).not.toContain('general_formula');
    expect(JSON.stringify(initial)).not.toContain('difference');
    const reveal = projectMathVisuals(lesson, ['sequence'], 'initial', 'REVEAL')[0];
    if (reveal.renderer !== 'sequence') throw new Error('WRONG_RENDERER');
    expect(reveal.formula).toBe('u_n = 18 + 2(n - 1)');
    expect(reveal.rows[4]).toEqual({ index: 5, value: 26 });
  });
});

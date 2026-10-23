import { describe, expect, it } from 'vitest';
import { structuralLessonIR } from '../../../lessonCompiler/v832/lessonIR.testFixture';
import { parseMathVisualExtension } from './extension';

const lessonWithUnitCircle = () => {
  const lesson = structuralLessonIR();
  lesson.visuals.unitCircle = {
    id: 'unitCircle', type: 'interactive_simulation', semanticPurpose: 'Định vị góc trên đường tròn lượng giác',
    mathematicalInvariants: ['bán kính bằng 1', 'góc π/2 nằm trên trục Oy dương'],
    objects: ['circle', 'axis_x', 'axis_y', 'point_P', 'sin_projection', 'cos_projection'],
    states: {
      initial: { visibleObjects: ['circle', 'axis_x', 'axis_y'], hiddenObjects: ['point_P', 'sin_projection', 'cos_projection'] },
      task: { visibleObjects: ['circle', 'axis_x', 'axis_y', 'point_P'], hiddenObjects: ['sin_projection', 'cos_projection'] },
      reveal: { visibleObjects: ['circle', 'axis_x', 'axis_y', 'point_P', 'sin_projection', 'cos_projection'] },
    },
    defaultStateId: 'initial', authoredBy: 'code', accessibility: 'Điều chỉnh góc bằng bàn phím hoặc nút bước.',
    fallback: 'Nhập số đo góc thay cho thao tác kéo.', noGo: ['Không hiện sin/cos trước reveal'],
  };
  lesson.extensions = { mathVisualSimulation: {
    version: '1.0', assets: {
      unitCircle: {
        renderer: 'unit_circle', mathematicalAuthority: 'source_verified',
        purpose: { pedagogicalRole: 'evidence_task', learningValue: 'HS định vị góc và giải thích dấu',
          linkedActivityRefs: ['A1'], expectedStudentAction: 'Đặt điểm P', expectedEvidence: 'Góc và góc phần tư' },
        model: { minAngleRad: -2 * Math.PI, maxAngleRad: 2 * Math.PI, defaultAngleRad: 0 },
        invariants: ['unit_radius_one', 'cardinal_axes'],
        answerBearingObjectIds: ['sin_projection', 'cos_projection'], taskStateId: 'task', revealStateIds: ['reveal'],
        accessibility: { description: 'Đường tròn lượng giác', keyboardAlternative: true },
        fallback: { description: 'Nhập góc bằng số' },
        evidenceExtractor: { fields: ['angleRad', 'quadrant', 'cos', 'sin'], submissionRequired: true },
      },
    },
  } };
  return lesson;
};

describe('V8.4 mathematical visual extension', () => {
  it('keeps V8.3.2 lessons without this known extension compatible', () => {
    expect(parseMathVisualExtension(structuralLessonIR())).toEqual({});
  });

  it('accepts a versioned Unit Circle contract tied to canonical visual IDs and states', () => {
    const lesson = lessonWithUnitCircle();
    expect(parseMathVisualExtension(lesson).unitCircle).toMatchObject({ renderer: 'unit_circle',
      model: { defaultAngleRad: 0 }, revealStateIds: ['reveal'] });
  });

  it('blocks an answer-bearing projection in the initial state', () => {
    const lesson = lessonWithUnitCircle();
    lesson.visuals.unitCircle.states.initial.visibleObjects.push('sin_projection');
    expect(() => parseMathVisualExtension(lesson)).toThrow('VISUAL_SPOILER');
  });

  it('blocks a known extension that omits mathematical fallback', () => {
    const lesson = lessonWithUnitCircle();
    delete (lesson.extensions as { mathVisualSimulation: { assets: { unitCircle: { fallback?: unknown } } } }).mathVisualSimulation.assets.unitCircle.fallback;
    expect(() => parseMathVisualExtension(lesson)).toThrow('VISUAL_FALLBACK_REQUIRED');
  });

  it('validates a semantic 2D construction and rejects a wrong intersection invariant', () => {
    const lesson = structuralLessonIR();
    lesson.visuals.geometry = {
      id: 'geometry', type: 'diagram_2d', semanticPurpose: 'Khám phá giao điểm',
      objects: ['A', 'B', 'C', 'D', 'M', 'F', 'R', 'AB', 'MF', 'BD'],
      states: {
        initial: { visibleObjects: ['A', 'B', 'C', 'D', 'M', 'F', 'AB', 'MF', 'BD'], hiddenObjects: ['R'] },
        reveal: { visibleObjects: ['A', 'B', 'C', 'D', 'M', 'F', 'R', 'AB', 'MF', 'BD'] },
      }, defaultStateId: 'initial', noGo: ['R ẩn trước khi giới thiệu'],
    };
    lesson.extensions = { mathVisualSimulation: { version: '1.0', assets: { geometry: {
      renderer: 'geometry_2d', mathematicalAuthority: 'source_verified',
      purpose: { pedagogicalRole: 'guided_discovery', learningValue: 'Tìm giao điểm', linkedActivityRefs: ['A1'] },
      model: { points: [
        { id: 'A', x: 0, y: 0 }, { id: 'B', x: 4, y: 0 }, { id: 'C', x: 0, y: 4 },
        { id: 'D', x: 0, y: 8 }, { id: 'M', x: 2, y: 0 }, { id: 'F', x: 2, y: 8 },
        { id: 'R', intersectionOf: { first: { from: 'M', to: 'F' }, second: { from: 'B', to: 'D' } } },
      ], segments: [{ id: 'AB', from: 'A', to: 'B' }, { id: 'MF', from: 'M', to: 'F' },
        { id: 'BD', from: 'B', to: 'D' }] },
      invariants: [{ type: 'intersection', point: 'R', lines: { first: { from: 'M', to: 'F' }, second: { from: 'B', to: 'D' } } }],
      answerBearingObjectIds: ['R'], taskStateId: 'initial', revealStateIds: ['reveal'],
      accessibility: { description: 'Hình 2D', keyboardAlternative: true }, fallback: { description: 'Hình tĩnh' },
    } } } };
    expect(parseMathVisualExtension(lesson).geometry.renderer).toBe('geometry_2d');
    const asset = (lesson.extensions as { mathVisualSimulation: { assets: { geometry: { invariants: Array<{ point: string }> } } } }).mathVisualSimulation.assets.geometry;
    asset.invariants[0].point = 'A';
    expect(() => parseMathVisualExtension(lesson)).toThrow('VISUAL_MATH_INVARIANT_FAILED:geometry');
  });

  it('accepts one sequence model with a protected formula reveal', () => {
    const lesson = structuralLessonIR();
    lesson.visuals.sequence = {
      id: 'sequence', type: 'deterministic_math_visual', semanticPurpose: 'Đối chiếu chỉ số và số hạng',
      objects: ['rows', 'points', 'general_formula'],
      states: {
        initial: { visibleObjects: ['rows', 'points'], hiddenObjects: ['general_formula'] },
        rule_reveal: { visibleObjects: ['rows', 'points', 'general_formula'] },
      }, defaultStateId: 'initial', noGo: ['Không hiện công thức từ đầu'],
    };
    lesson.extensions = { mathVisualSimulation: { version: '1.0', assets: { sequence: {
      renderer: 'sequence', mathematicalAuthority: 'source_verified',
      purpose: { pedagogicalRole: 'guided_discovery', learningValue: 'Từ bảng tìm quy luật', linkedActivityRefs: ['A1'] },
      model: { family: 'arithmetic', firstIndex: 1, firstTerm: 18, difference: 2, count: 6 },
      invariants: ['recurrence_matches_terms'], answerBearingObjectIds: ['general_formula'],
      taskStateId: 'initial', revealStateIds: ['rule_reveal'],
      accessibility: { description: 'Bảng số hạng', keyboardAlternative: true }, fallback: { description: 'Bảng số hạng tĩnh' },
    } } } };
    expect(parseMathVisualExtension(lesson).sequence.renderer).toBe('sequence');
    lesson.visuals.sequence.states.initial.visibleObjects.push('general_formula');
    expect(() => parseMathVisualExtension(lesson)).toThrow('VISUAL_SPOILER:sequence:initial');
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { LessonIRV83 } from '../../../lessonCompiler/v832/lessonIRSchema';
import { projectMathVisuals } from './publicVisual';

describe('11T38 additive sequence overlay', () => {
  it('uses verified sequence values without changing the supplied Golden Candidate file', () => {
    const bytes = readFileSync(resolve('tests/fixtures/v832/11T38.lesson-ir-v8.3.2.validated.json'));
    const lesson = JSON.parse(bytes.toString('utf8')) as LessonIRV83;
    expect(lesson.sourceVerification.canonicalFormulas).toContain('u_n=18+2(n-1)=2n+16');
    lesson.extensions = { ...lesson.extensions, mathVisualSimulation: { version: '1.0', assets: {
      VIS_SEATING: {
        renderer: 'sequence', mathematicalAuthority: 'system_authored_pending_review',
        purpose: { pedagogicalRole: 'guided_discovery', learningValue: 'Liên hệ hàng ghế, chỉ số và số ghế',
          linkedActivityRefs: ['problem', 'explore', 'practice'] },
        model: { family: 'arithmetic', firstIndex: 1, firstTerm: 18, difference: 2, count: 6 },
        invariants: ['recurrence_matches_terms'], answerBearingObjectIds: ['index_n', 'seat_count'],
        formulaObjectId: 'seat_count', taskStateId: 'initial', revealStateIds: ['rule_reveal'],
        accessibility: { description: 'Số ghế theo hàng', keyboardAlternative: true },
        fallback: { description: 'Bảng số ghế từ hàng 1 đến 6' },
      },
    } } };
    const before = projectMathVisuals(lesson, ['VIS_SEATING'], 'initial')[0];
    expect(before.renderer).toBe('sequence');
    expect(JSON.stringify(before)).not.toContain('difference');
    const after = projectMathVisuals(lesson, ['VIS_SEATING'], 'initial', 'REVEAL')[0];
    if (after.renderer !== 'sequence') throw new Error('WRONG_RENDERER');
    expect(after.formula).toBe('u_n = 18 + 2(n - 1)');
    expect(after.rows[4]).toEqual({ index: 5, value: 26 });
    expect(readFileSync(resolve('tests/fixtures/v832/11T38.lesson-ir-v8.3.2.validated.json')).equals(bytes)).toBe(true);
  });
});

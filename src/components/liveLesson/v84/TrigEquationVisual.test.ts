import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { trigEquationLesson } from '../../../lib/lessonRuntime/v84/mathVisual/trigEquation.testFixture';
import { projectMathVisuals } from '../../../lib/lessonRuntime/v84/mathVisual/publicVisual';
import { MathVisualView } from './MathVisualView';

describe('trig-equation renderer', () => {
  it('uses the shared registry and renders no answer markers or families before reveal', () => {
    const visual = projectMathVisuals(trigEquationLesson(), ['trig'], 'task', 'QUESTION_OPEN')[0];
    const html = renderToStaticMarkup(createElement(MathVisualView, { visual }));
    expect(html).toContain('v84-trig-equation');
    expect(html).toContain('katex');
    expect(html).not.toContain('6.283185307179586');
    expect(html).not.toContain('data-solution-point');
    expect(html).not.toContain('v84-trig-equation__families');
  });

  it('renders exact periodic families with KaTeX and clearly labels approximate roots', () => {
    const visual = projectMathVisuals(trigEquationLesson(), ['trig'], 'task', 'REVEAL')[0];
    const html = renderToStaticMarkup(createElement(MathVisualView, { visual }));
    expect(html.match(/data-solution-point=/g)).toHaveLength(2);
    expect(html).toContain('v84-trig-equation__families');
    expect(html).toContain('Nghiệm gần đúng');
    expect(html).not.toContain('katex-error');
    expect(html.match(/v84-trig-equation__integer-condition/g)).toHaveLength(1);
    expect(html).toContain('<mo>∈</mo>');
  });
});

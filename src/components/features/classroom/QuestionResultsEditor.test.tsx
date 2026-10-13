import { Children, isValidElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { QuestionResult } from '../../../lib/classroom/types';
import { QuestionResultsEditor } from './QuestionResultsEditor';

describe('GV bỏ dấu đỏ mà không đổi điểm', () => {
  it('chỉ gỡ dấu câu đã chọn, giữ điểm và bài đọc của cả hai câu', () => {
    const row = (questionNumber: string): QuestionResult => ({ questionNumber, status: 'incorrect', score: 0, maxScore: 1,
      studentAnswer: 'A', expectedAnswer: 'B', errorType: 'Sai', explanation: '', correction: 'Chọn B', nextPractice: '', needsTeacherReview: true,
      photoMarks: [{ imageIndex: 1, imageUrl: 'https://example.test/own.jpg', x: .1, y: .2, width: .2, height: .1, confidence: .95 }] });
    const rows = [row('Câu 1'), row('Câu 2')];
    const onChange = vi.fn();
    const tree = QuestionResultsEditor({ rows, original: rows, canFixForClass: false, classFixes: new Set(), onChange, onToggleClassFix: () => undefined });
    let action: (() => void) | undefined;
    const walk = (node: ReactNode) => Children.forEach(node, child => {
      if (!isValidElement<{ children?: ReactNode; onClick?: () => void }>(child)) return;
      const text = Children.toArray(child.props.children).filter(value => typeof value === 'string').join('');
      if (child.type === 'button' && text.includes('Bỏ dấu đỏ') && text.includes('Câu 1')) action = child.props.onClick;
      walk(child.props.children);
    });
    walk(tree);
    expect(action).toBeTypeOf('function');
    action!();
    const next = onChange.mock.calls[0][0] as QuestionResult[];
    expect(next[0]).toEqual({ ...rows[0], photoMarks: [] });
    expect(next[1]).toBe(rows[1]);
  });
});

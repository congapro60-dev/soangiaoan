import { describe, expect, it } from 'vitest';
import type { AdaptiveQuestion } from './types';
import { normalizeQuestionTypeChange } from './questionEditor';

const baseQuestion: AdaptiveQuestion = {
  id: 'q-1',
  type: 'multiple_choice',
  prompt: 'Tính giá trị của biểu thức.',
  options: ['A. 1', 'B. 2', 'C. 3', 'D. 4'],
  correctAnswer: 'B. 2',
  explanation: 'Thay số và tính.',
  objectiveIds: ['obj-1'],
  difficulty: 'medium',
  points: 1,
};

describe('normalizeQuestionTypeChange', () => {
  it('removes MCQ options when an imported short-answer question stays short-answer', () => {
    const question: AdaptiveQuestion = {
      ...baseQuestion,
      type: 'short_answer',
      options: undefined,
      correctAnswer: '3x + 2y ≤ 30',
    };

    expect(normalizeQuestionTypeChange(question, 'short_answer')).toEqual({
      type: 'short_answer',
      options: undefined,
      correctAnswer: '3x + 2y ≤ 30',
    });
  });

  it('gives a true-false question only valid truth choices', () => {
    expect(normalizeQuestionTypeChange(baseQuestion, 'true_false')).toEqual({
      type: 'true_false',
      options: undefined,
      correctAnswer: 'Đúng',
    });
  });

  it('restores four editable choices when a non-MCQ question becomes MCQ', () => {
    const question: AdaptiveQuestion = {
      ...baseQuestion,
      type: 'short_answer',
      options: undefined,
      correctAnswer: '3x + 2y ≤ 30',
    };

    expect(normalizeQuestionTypeChange(question, 'multiple_choice')).toEqual({
      type: 'multiple_choice',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
    });
  });

  it('clears an MCQ letter when converting to an essay reference answer', () => {
    expect(normalizeQuestionTypeChange(baseQuestion, 'essay')).toEqual({
      type: 'essay',
      options: undefined,
      correctAnswer: '',
    });
  });
});

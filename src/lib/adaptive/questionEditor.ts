import type { AdaptiveQuestion, AdaptiveQuestionType } from './types';

export const adaptiveQuestionTypeOptions: ReadonlyArray<{ value: AdaptiveQuestionType; label: string }> = [
  { value: 'multiple_choice', label: 'Trắc nghiệm' },
  { value: 'true_false', label: 'Đúng / Sai' },
  { value: 'short_answer', label: 'Trả lời ngắn' },
  { value: 'essay', label: 'Tự luận' },
];

const DEFAULT_MULTIPLE_CHOICE_OPTIONS = ['A', 'B', 'C', 'D'];
const TRUE_FALSE_ANSWERS = ['Đúng', 'Sai'] as const;

export const normalizeQuestionTypeChange = (
  question: AdaptiveQuestion,
  type: AdaptiveQuestionType,
): Partial<AdaptiveQuestion> => {
  if (type === 'multiple_choice') {
    const options = question.options && question.options.length >= 4
      ? [...question.options]
      : [...DEFAULT_MULTIPLE_CHOICE_OPTIONS];
    return {
      type,
      options,
      correctAnswer: question.type === 'multiple_choice' && question.correctAnswer && options.includes(question.correctAnswer)
        ? question.correctAnswer
        : options[0],
    };
  }

  if (type === 'true_false') {
    return {
      type,
      options: undefined,
      correctAnswer: question.type === 'true_false' && TRUE_FALSE_ANSWERS.includes(question.correctAnswer as typeof TRUE_FALSE_ANSWERS[number])
        ? question.correctAnswer
        : 'Đúng',
    };
  }

  return {
    type,
    options: undefined,
    correctAnswer: question.type === 'short_answer' || question.type === 'essay'
      ? question.correctAnswer || ''
      : '',
  };
};

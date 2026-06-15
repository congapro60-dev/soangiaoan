import { describe, expect, it } from 'vitest';
import { validateAdaptiveLessonPublishReadiness } from './adaptiveFromLessonPlan';
import type { AdaptiveLesson } from './types';

const buildMinimalLesson = (): AdaptiveLesson => {
  const objectiveId = 'obj-1';
  const question = {
    id: 'q-1',
    type: 'multiple_choice' as const,
    prompt: 'Tính giá trị của biểu thức $2+2$ trong tình huống đã cho.',
    options: ['$4$', '$-4$', '19', '$S_{10}$'],
    correctAnswer: '$4$',
    explanation: 'Vì $2+2=4$, nên đáp án đúng là $4$.',
    objectiveIds: [objectiveId],
    difficulty: 'easy' as const,
    points: 1,
  };

  return {
    id: 'lesson-1',
    title: 'Bài kiểm tra publish readiness',
    subjectId: 'math',
    grade: '10',
    durationMinutes: 40,
    status: 'draft',
    teacherId: 'teacher-1',
    createdAt: '2026-06-11T00:00:00.000Z',
    updatedAt: '2026-06-11T00:00:00.000Z',
    preparation: {
      readingInstructions: 'Đọc lại định nghĩa và ví dụ trong giáo án nguồn.',
      guidingQuestions: ['Biểu thức đã cho yêu cầu phép tính nào?'],
      estimatedMinutes: 5,
    },
    fiveStepFlow: {
      steps: [
        { id: 's1', name: 'Kết nối', purpose: 'Khởi động', estimatedMinutes: 3, teacherRole: 'Nêu vấn đề', studentAction: 'Trả lời', systemSupport: 'Hiển thị' },
      ],
    },
    objectives: [{
      id: objectiveId,
      code: 'OBJ1',
      title: 'Tính được giá trị biểu thức đơn giản',
      description: 'Học sinh tính được giá trị biểu thức có số liệu cụ thể.',
      bloomLevel: 'apply',
      masteryThreshold: 0.7,
      prerequisiteObjectiveIds: [],
      commonMisconceptions: [],
    }],
    knowledgeUnits: [],
    diagnosticTest: {
      id: 'diag-1',
      title: 'Chẩn đoán đầu giờ',
      purpose: 'diagnostic',
      durationMinutes: 7,
      questions: [question],
    },
    exitTicket: {
      id: 'exit-1',
      title: 'Vé ra cửa',
      purpose: 'exit_ticket',
      durationMinutes: 5,
      questions: [question],
    },
  };
};

describe('validateAdaptiveLessonPublishReadiness', () => {
  it('accepts short math and numeric multiple-choice options when they are real answer choices', () => {
    const issues = validateAdaptiveLessonPublishReadiness(buildMinimalLesson());

    expect(issues.filter((issue) => issue.code === 'invalid_question_options')).toEqual([]);
  });
});

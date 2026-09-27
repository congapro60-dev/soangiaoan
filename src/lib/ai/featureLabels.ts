/** Tên tính năng AI dễ hiểu cho sao kê (khoá = `feature` ghi trong `aiUsage`, tức action của endpoint). */
const LABELS: Record<string, string> = {
  gradeOne: 'Chấm một bài nộp',
  gradeAssignment: 'Chấm cả lớp',
  practice: 'Tạo bài luyện cho học sinh',
  submitPractice: 'Chấm bài luyện của học sinh',
  solveAnswerKey: 'AI giải đáp án',
  solveAnswerKeyForAssignment: 'AI giải đáp án bài giao',
  buildQuestionCatalog: 'Tách câu hỏi trong đề',
  suggestRubric: 'Gợi ý hướng dẫn chấm',
  rewriteFeedback: 'Viết lại nhận xét',
  aiGateway: 'Soạn/nâng cấp bằng GLM',
  generateSimulation: 'Tạo mô phỏng',
  teacherOnlineAiRegrade: 'Chấm lại đề online',
};

export const featureLabel = (feature: string): string => LABELS[feature] ?? feature;

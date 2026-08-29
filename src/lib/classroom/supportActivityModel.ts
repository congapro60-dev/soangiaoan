import type { ExamQuestion, QuestionType } from '../../types';
import type { ActivityPurpose } from './types';
import type {
  ClassAssignmentReport,
  ClassReportQuestionStats,
  ClassReportSubmissionProjection,
} from './classReportModel';

export type SupportActivityFocusKind = 'question' | 'error' | 'topic';

export interface SupportActivityFocus {
  id: string;
  kind: SupportActivityFocusKind;
  label: string;
  questionNumber?: string;
  evidenceCount: number;
  evidenceRate: number;
  source: 'questionStats' | 'errorStats' | 'topicStats';
}

export interface SupportActivityStep {
  minutes: number;
  title: string;
  teacherAction: string;
  studentAction: string;
  check: string;
}

export interface SupportActivityQuestionBlueprint {
  id: string;
  type: QuestionType;
  content: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  points: number;
}

export interface SupportActivityDraft {
  sourceReportId: string;
  sourceAssignmentId: string;
  sourceAssignmentTitle: string;
  purpose: ActivityPurpose;
  title: string;
  objective: string;
  durationMinutes: number;
  materials: string[];
  grouping: string;
  teacherSteps: SupportActivityStep[];
  successCriteria: string;
  recheck: string;
  evidenceSummary: string;
  focus: SupportActivityFocus;
  targetStudentIds: string[];
  questionBlueprints: SupportActivityQuestionBlueprint[];
  exitTicket: SupportActivityQuestionBlueprint[];
  canPublish: boolean;
  blockingReasons: string[];
}

export interface BuildSupportActivityOptions {
  purpose?: ActivityPurpose;
  durationMinutes?: number;
  targetStudentIds?: readonly string[];
  title?: string;
}

const normalize = (value: unknown): string => typeof value === 'string'
  ? value.trim().replace(/\s+/g, ' ')
  : '';

const normalizeKey = (value: unknown): string => normalize(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('vi-VN');

const clampDuration = (value: unknown): number => {
  const number = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 20;
  return Math.min(60, Math.max(10, number));
};

const focusId = (kind: SupportActivityFocusKind, label: string, questionNumber?: string): string =>
  [kind, questionNumber, normalizeKey(label)].filter(Boolean).join(':');

const questionFocus = (question: ClassReportQuestionStats, denominator: number): SupportActivityFocus => ({
  id: focusId('question', `Câu ${question.questionNumber}`, question.questionNumber),
  kind: 'question',
  label: `Câu ${question.questionNumber}`,
  questionNumber: question.questionNumber,
  evidenceCount: question.evidenceCount,
  evidenceRate: denominator > 0 ? question.evidenceCount / denominator : 0,
  source: 'questionStats',
});

const labelFocus = (
  kind: Exclude<SupportActivityFocusKind, 'question'>,
  label: string,
  evidenceCount: number,
  denominator: number,
  source: 'errorStats' | 'topicStats',
): SupportActivityFocus => ({
  id: focusId(kind, label),
  kind,
  label,
  evidenceCount,
  evidenceRate: denominator > 0 ? evidenceCount / denominator : 0,
  source,
});

const orderFocus = (left: SupportActivityFocus, right: SupportActivityFocus): number =>
  left.evidenceRate - right.evidenceRate
  || right.evidenceCount - left.evidenceCount
  || left.label.localeCompare(right.label, 'vi');

export const getSupportActivityFocusOptions = (
  report: ClassAssignmentReport,
): SupportActivityFocus[] => {
  const denominator = Math.max(0, report.metrics.officialEvidenceCount);
  const questions = report.questionStats
    .filter(question => question.evidenceCount > 0)
    .map(question => questionFocus(question, denominator))
    .sort(orderFocus);
  const errors = report.errorStats
    .filter(stat => normalize(stat.label) && stat.evidenceCount > 0)
    .map(stat => labelFocus('error', stat.label, stat.evidenceCount, denominator, 'errorStats'));
  const topics = report.topicStats
    .filter(stat => normalize(stat.label) && stat.evidenceCount > 0)
    .map(stat => labelFocus('topic', stat.label, stat.evidenceCount, denominator, 'topicStats'));
  return [...questions, ...errors, ...topics];
};

const isNeedsSupportForFocus = (
  submission: ClassReportSubmissionProjection,
  focus: SupportActivityFocus,
): boolean => {
  if (!submission.official) return false;
  if (focus.kind === 'question') {
    const result = submission.questionResults.find(item => normalizeKey(item.questionNumber) === normalizeKey(focus.questionNumber));
    return Boolean(result && result.status !== 'correct');
  }
  if (focus.kind === 'error') {
    return submission.questionResults.some(result => normalizeKey(result.errorType) === normalizeKey(focus.label));
  }
  return submission.weakTopics.some(topic => normalizeKey(topic) === normalizeKey(focus.label))
    || submission.questionResults.some(result => result.weakTopics.some(topic => normalizeKey(topic) === normalizeKey(focus.label)));
};

const targetIdsForFocus = (
  report: ClassAssignmentReport,
  focus: SupportActivityFocus,
  requested: readonly string[] | undefined,
): string[] => {
  const available = new Set(report.latest.map(submission => normalize(submission.studentKey)).filter(Boolean));
  if (requested) return [...new Set(requested.map(normalize).filter(studentId => available.has(studentId)))];
  return report.latest
    .filter(submission => isNeedsSupportForFocus(submission, focus))
    .map(submission => normalize(submission.studentKey))
    .filter(Boolean);
};

const questionCountFor = (focus: SupportActivityFocus): number => focus.kind === 'question' ? 2 : 3;

const defaultQuestions = (focus: SupportActivityFocus, prefix: string): SupportActivityQuestionBlueprint[] => {
  const common = focus.kind === 'question'
    ? `Xử lý một bài toán tương tự ${focus.label}: nêu dữ kiện, chọn quy tắc/công thức, trình bày các bước và kết luận.`
    : `Luyện tập nội dung “${focus.label}”: đọc kỹ yêu cầu, nêu quy tắc cần dùng và giải thích vì sao áp dụng quy tắc đó.`;
  return Array.from({ length: questionCountFor(focus) }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    type: 'essay' as const,
    content: `${common} Ví dụ ${index + 1}: giáo viên thay dữ kiện cụ thể phù hợp với mức của nhóm học sinh.`,
    points: index === 0 ? 1 : 1.5,
  }));
};

const stepsFor = (focus: SupportActivityFocus, durationMinutes: number): SupportActivityStep[] => {
  const guidedMinutes = Math.max(4, Math.round(durationMinutes * 0.35));
  const pairedMinutes = Math.max(4, Math.round(durationMinutes * 0.4));
  const exitMinutes = Math.max(2, durationMinutes - guidedMinutes - pairedMinutes);
  return [
    {
      minutes: guidedMinutes,
      title: 'Xác định điểm nghẽn',
      teacherAction: `Chiếu một lời giải tiêu biểu ở ${focus.label}; yêu cầu học sinh chỉ ra bước còn thiếu hoặc chỗ dùng sai quy tắc trước khi giáo viên chốt.`,
      studentAction: 'Đánh dấu dữ kiện, quy tắc và bước cần sửa vào phiếu.',
      check: 'Mời ít nhất hai học sinh giải thích bằng lời lý do chọn cách sửa.',
    },
    {
      minutes: pairedMinutes,
      title: 'Luyện có giám sát',
      teacherAction: 'Chia cặp/nhóm hỗ trợ; phát hai câu tương tự, kiểm tra sau từng bước và chỉ đưa gợi ý ngắn khi nhóm bị dừng.',
      studentAction: 'Làm lần lượt, đổi bài kiểm tra và nói rõ căn cứ cho mỗi bước.',
      check: 'Ghi lại học sinh còn dừng ở bước nào để giao nhiệm vụ tiếp theo.',
    },
    {
      minutes: exitMinutes,
      title: 'Phiếu thoát',
      teacherAction: 'Cho làm hai câu tương đương độc lập, không xem lời giải; thu hoặc chụp phiếu để đối chiếu.',
      studentAction: 'Tự hoàn thành và ghi một câu “Em đã sửa được lỗi gì?”.',
      check: 'Chỉ chuyển sang mức khó hơn khi đạt ít nhất 80% điểm phiếu thoát.',
    },
  ];
};

const objectiveFor = (focus: SupportActivityFocus): string => focus.kind === 'question'
  ? `Sau hoạt động, học sinh giải được ít nhất 2 câu tương tự ${focus.label}, trình bày đủ dữ kiện, quy tắc, các bước và kết luận.`
  : `Sau hoạt động, học sinh nhận diện và sửa được lỗi “${focus.label}” trong ít nhất 2 trên 3 nhiệm vụ tương tự.`;

const evidenceFor = (report: ClassAssignmentReport, focus: SupportActivityFocus): string => {
  if (report.metrics.officialEvidenceCount < 3) {
    return `Mới có ${report.metrics.officialEvidenceCount} bằng chứng chính thức; chưa đủ dữ liệu để kết luận cho toàn lớp. Tín hiệu hiện tại chỉ dùng để tạo bản nháp giáo viên xem xét.`;
  }
  return `${focus.label} xuất hiện trong ${focus.evidenceCount} bằng chứng trên ${report.metrics.officialEvidenceCount} bài đã duyệt (${Math.round(focus.evidenceRate * 100)}%). Đây là tín hiệu cần xử lý, không phải kết luận cố định về năng lực từng học sinh.`;
};

export const buildSupportActivityDraft = (
  report: ClassAssignmentReport,
  focus: SupportActivityFocus,
  options: BuildSupportActivityOptions = {},
): SupportActivityDraft => {
  const durationMinutes = clampDuration(options.durationMinutes);
  const targetStudentIds = targetIdsForFocus(report, focus, options.targetStudentIds);
  const reasons: string[] = [];
  if (report.metrics.officialEvidenceCount < 3) reasons.push('Chưa có đủ 3 bằng chứng chính thức để dùng như nhận định của lớp.');
  if (focus.evidenceCount < 2) reasons.push('Tín hiệu này mới xuất hiện dưới 2 lần; giáo viên cần kiểm tra bài gốc trước khi giao.');
  if (!normalize(focus.label)) reasons.push('Chưa xác định được lỗi hoặc chủ đề cần hỗ trợ.');

  const prefix = `support-${report.assignment.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const questions = defaultQuestions(focus, prefix);
  const exitTicket = questions.slice(0, 2).map((question, index) => ({
    ...question,
    id: `${prefix}-exit-${index + 1}`,
    content: `Phiếu thoát ${index + 1}: ${question.content}`,
    points: 1,
  }));
  const title = normalize(options.title) || `Phiếu hỗ trợ — ${focus.label}`;
  return {
    sourceReportId: report.assignment.id,
    sourceAssignmentId: report.assignment.id,
    sourceAssignmentTitle: report.assignment.title,
    purpose: options.purpose ?? 'remediation',
    title,
    objective: objectiveFor(focus),
    durationMinutes,
    materials: ['Phiếu hoạt động hỗ trợ', 'Bút màu hoặc công cụ đánh dấu', 'Phiếu thoát 2 câu'],
    grouping: targetStudentIds.length > 0
      ? `Nhóm hỗ trợ gồm ${targetStudentIds.length} học sinh được xác định từ bằng chứng; các em còn lại làm nhiệm vụ mở rộng.`
      : 'Có thể triển khai cả lớp hoặc chọn nhóm sau khi giáo viên kiểm tra bài gốc.',
    teacherSteps: stepsFor(focus, durationMinutes),
    successCriteria: 'Đạt ít nhất 80% điểm phiếu thoát và trình bày được căn cứ cho bước làm chính.',
    recheck: 'Sau hoạt động, tạo lại báo cáo hoặc nhập kết quả phiếu thoát để kiểm tra tỷ lệ đúng của cùng dạng câu; nếu chưa đạt 80%, giữ mức hỗ trợ và đổi gợi ý trước khi tăng độ khó.',
    evidenceSummary: evidenceFor(report, focus),
    focus,
    targetStudentIds,
    questionBlueprints: questions,
    exitTicket,
    canPublish: reasons.length === 0,
    blockingReasons: reasons,
  };
};

/** Chuyển bản nháp câu hỏi về shape Exam để dùng chung renderer/exporter hiện có. */
export const toExamQuestions = (draft: SupportActivityDraft): ExamQuestion[] => draft.questionBlueprints.map(question => ({
  id: question.id,
  type: question.type,
  content: question.content,
  ...(question.options ? { options: question.options } : {}),
  ...(question.correctAnswer ? { correctAnswer: question.correctAnswer } : {}),
  ...(question.explanation ? { explanation: question.explanation } : {}),
  points: question.points,
}));

import type { ClassReportQuestionCatalogItem, ClassReportQuestionSource } from './questionCatalog';
import type { ActivityPurpose, DeliveryMode } from './types';

export type { ClassReportQuestionCatalogItem, ClassReportQuestionSource } from './questionCatalog';

export type ClassReportSubmissionStatus = 'submitted' | 'grading' | 'graded' | 'error' | string;

export interface ClassReportRosterEntry {
  studentKey: string;
}

export interface ClassReportQuestionResult {
  questionNumber: string;
  status: 'correct' | 'partial' | 'partially_correct' | 'incorrect' | 'unreadable' | 'not_attempted' | string;
  score?: number | null;
  maxScore?: number | null;
  errorType?: string | null;
  weakTopics?: readonly string[] | string | null;
}

/** Input normalized by the upload/exam adapters; raw answer and grading notes are not part of this contract. */
export interface ClassReportSubmission {
  id: string;
  studentKey: string;
  createdAt: string;
  status: ClassReportSubmissionStatus;
  score?: number | null;
  maxScore?: number | null;
  official: boolean;
  /** Grade-level weak-topic evidence, in addition to question-level weakTopics. */
  weakTopics?: readonly string[] | string | null;
  questionResults?: readonly ClassReportQuestionResult[];
}

/** One assignment after its upload/exam source has been normalized for this pure model. */
export interface ClassReportAssignment {
  id: string;
  title: string;
  type: string;
  purpose?: ActivityPurpose;
  deliveryMode?: DeliveryMode;
  maxScore?: number | null;
  /** Nội dung câu hỏi đã chuẩn hóa từ đề online hoặc phần chữ của đề upload. */
  questionCatalog?: readonly ClassReportQuestionCatalogItem[];
  /** File đề gốc để đối chiếu khi bài upload không có cấu trúc câu dạng chữ. */
  questionSources?: readonly ClassReportQuestionSource[];
  submissions: readonly ClassReportSubmission[];
}

export interface ClassReportInput {
  roster: readonly (ClassReportRosterEntry | string)[];
  assignment: ClassReportAssignment;
}

export interface ClassReportCounters {
  roster: number;
  submitted: number;
  graded: number;
  official: number;
  pending: number;
  missing: number;
}

export interface ClassReportMetrics {
  averagePercent: number | null;
  medianPercent: number | null;
  officialEvidenceCount: number;
}

export interface ClassReportQuestionStats {
  questionNumber: string;
  evidenceCount: number;
  correct: number;
  partial: number;
  incorrect: number;
  unreadable: number;
  notAttempted: number;
  correctRate: number;
  scoreRate: number;
}

export type ClassReportQuestionStatsTableRow =
  | { kind: 'question'; question: ClassReportQuestionStats }
  | { kind: 'detail'; questionNumber: string };

/**
 * Giữ hộp xem câu hỏi cạnh đúng dòng đang chọn thay vì dồn xuống cuối bảng.
 * Tách thứ tự hiển thị thành hàm thuần để không thể vô tình làm sai khi đổi UI.
 */
export const buildQuestionStatsTableRows = (
  stats: readonly ClassReportQuestionStats[],
  activeQuestionNumber: string | null,
): ClassReportQuestionStatsTableRow[] => stats.flatMap(question => [
  { kind: 'question' as const, question },
  ...(question.questionNumber === activeQuestionNumber
    ? [{ kind: 'detail' as const, questionNumber: question.questionNumber }]
    : []),
]);

export interface ClassReportLabelStats {
  label: string;
  evidenceCount: number;
}

export interface ClassReportRecommendation {
  title: string;
  evidence: string;
  action: string;
  check: string;
}

export interface ClassAssignmentReport {
  assignment: Pick<ClassReportAssignment, 'id' | 'title' | 'type' | 'purpose' | 'deliveryMode' | 'maxScore'> & {
    questionCatalog?: ClassReportQuestionCatalogItem[];
    questionSources?: ClassReportQuestionSource[];
  };
  /** Safe projections only; raw submission/question objects never leave the model. */
  latest: ClassReportSubmissionProjection[];
  official: ClassReportSubmissionProjection[];
  counters: ClassReportCounters;
  metrics: ClassReportMetrics;
  averagePercent: number | null;
  medianPercent: number | null;
  scoreDistribution: Record<'0-<5' | '5-<6.5' | '6.5-<8' | '8-10', number>;
  distribution: Record<'0-<5' | '5-<6.5' | '6.5-<8' | '8-10', number>;
  questionStats: ClassReportQuestionStats[];
  errorStats: ClassReportLabelStats[];
  topicStats: ClassReportLabelStats[];
  recommendations: ClassReportRecommendation[];
}

const QUESTION_STATUSES = new Set(['correct', 'partial', 'incorrect', 'unreadable', 'not_attempted']);
const SCORE_RANGES = ['0-<5', '5-<6.5', '6.5-<8', '8-10'] as const;

const asFiniteNumber = (value: unknown): number | null => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const normalizeWhitespace = (value: unknown): string =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

const normalizeKey = (value: unknown): string => normalizeWhitespace(value).toLocaleLowerCase('vi-VN');

const normalizeLabelKey = (value: unknown): string => normalizeWhitespace(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('vi-VN');

const NEUTRAL_ERROR_LABELS = new Set([
  'khong',
  'khong co',
  'khong co loi',
  'khong phat hien',
  'khong ghi nhan',
  'khong xac dinh',
  'n/a',
  'na',
  'none',
  'null',
  'unknown',
]);

const isActionableErrorLabel = (value: unknown): boolean => {
  const key = normalizeLabelKey(value);
  return Boolean(key) && !NEUTRAL_ERROR_LABELS.has(key);
};

const normalizeLabel = (value: unknown): { key: string; label: string } | null => {
  if (typeof value !== 'string') return null;
  const label = normalizeWhitespace(value);
  return label ? { key: normalizeKey(label), label } : null;
};

const timestamp = (value: unknown): number => {
  const parsed = Date.parse(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const isNewer = (candidate: ClassReportSubmission, current: ClassReportSubmission): boolean =>
  timestamp(candidate.createdAt) > timestamp(current.createdAt)
  || (timestamp(candidate.createdAt) === timestamp(current.createdAt)
    && (candidate.createdAt > current.createdAt
      || (candidate.createdAt === current.createdAt && candidate.id > current.id)));

const studentKeyOf = (entry: ClassReportRosterEntry | string): string =>
  typeof entry === 'string' ? entry : entry.studentKey;

const topicValues = (value: unknown): readonly unknown[] => {
  if (Array.isArray(value)) return value;
  return typeof value === 'string' ? [value] : [];
};

const scorePair = (
  submission: Pick<ClassReportSubmission, 'score' | 'maxScore'>,
  assignmentMaxScore?: number | null,
): { score: number; maxScore: number } | null => {
  const score = asFiniteNumber(submission.score);
  const rawMaxScore = submission.maxScore === undefined ? assignmentMaxScore : submission.maxScore;
  const maxScore = asFiniteNumber(rawMaxScore);
  if (score === null || maxScore === null || maxScore <= 0 || score < 0 || score > maxScore) return null;
  return { score, maxScore };
};

const median = (values: readonly number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

const emptyDistribution = (): Record<'0-<5' | '5-<6.5' | '6.5-<8' | '8-10', number> => ({
  '0-<5': 0,
  '5-<6.5': 0,
  '6.5-<8': 0,
  '8-10': 0,
});

const rangeFor = (scoreOnTen: number): typeof SCORE_RANGES[number] => {
  if (scoreOnTen < 5) return '0-<5';
  if (scoreOnTen < 6.5) return '5-<6.5';
  if (scoreOnTen < 8) return '6.5-<8';
  return '8-10';
};

const sortLabelStats = (stats: Map<string, ClassReportLabelStats>): ClassReportLabelStats[] =>
  [...stats.values()].sort((left, right) =>
    right.evidenceCount - left.evidenceCount || normalizeKey(left.label).localeCompare(normalizeKey(right.label)));

const collectLabelStats = (
  submissions: readonly ClassReportSubmission[],
  labelsOf: (result: ClassReportQuestionResult) => readonly unknown[],
  submissionLabelsOf?: (submission: ClassReportSubmission) => readonly unknown[],
  shouldInclude?: (rawLabel: unknown) => boolean,
): ClassReportLabelStats[] => {
  const stats = new Map<string, ClassReportLabelStats>();
  const addLabel = (rawLabel: unknown): void => {
    const normalized = normalizeLabel(rawLabel);
    if (!normalized) return;
    const current = stats.get(normalized.key);
    if (current) current.evidenceCount += 1;
    else stats.set(normalized.key, { label: normalized.label, evidenceCount: 1 });
  };
  for (const submission of submissions) {
    for (const rawLabel of submissionLabelsOf?.(submission) ?? []) {
      if (shouldInclude?.(rawLabel) ?? true) addLabel(rawLabel);
    }
    for (const result of submission.questionResults ?? []) {
      if (!isCountableQuestionResult(result)) continue;
      for (const rawLabel of labelsOf(result)) {
        if (shouldInclude?.(rawLabel) ?? true) addLabel(rawLabel);
      }
    }
  }
  return sortLabelStats(stats);
};

const buildQuestionStats = (
  submissions: readonly ClassReportSubmission[],
): ClassReportQuestionStats[] => {
  const stats = new Map<string, ClassReportQuestionStats & { score: number; maxScore: number }>();

  for (const submission of submissions) {
    for (const result of submission.questionResults ?? []) {
      if (!isCountableQuestionResult(result)) continue;
      const status = normalizeKey(result.status).replace('partially_correct', 'partial');
      const questionNumber = normalizeWhitespace(String(result.questionNumber ?? ''));
      const current = stats.get(questionNumber) ?? {
        questionNumber,
        evidenceCount: 0,
        correct: 0,
        partial: 0,
        incorrect: 0,
        unreadable: 0,
        notAttempted: 0,
        correctRate: 0,
        scoreRate: 0,
        score: 0,
        maxScore: 0,
      };
      current.evidenceCount += 1;
      const statusKey = status === 'not_attempted' ? 'notAttempted' : status;
      current[statusKey as 'correct' | 'partial' | 'incorrect' | 'unreadable' | 'notAttempted'] += 1;
      const pair = scorePair(result);
      if (pair) {
        current.score += pair.score;
        current.maxScore += pair.maxScore;
      }
      stats.set(questionNumber, current);
    }
  }

  return [...stats.values()]
    .map(({ score, maxScore, ...stat }) => ({
      ...stat,
      correctRate: stat.evidenceCount > 0 ? stat.correct / stat.evidenceCount : 0,
      scoreRate: maxScore > 0 ? score / maxScore : 0,
    }))
    .sort((left, right) => left.questionNumber.localeCompare(right.questionNumber, undefined, { numeric: true }));
};

const isCountableQuestionResult = (result: ClassReportQuestionResult): boolean => {
  const status = normalizeKey(result.status).replace('partially_correct', 'partial');
  return QUESTION_STATUSES.has(status) && Boolean(normalizeWhitespace(String(result.questionNumber ?? '')));
};

export interface ClassReportQuestionProjection {
  questionNumber: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  errorType: string | null;
  weakTopics: string[];
}

export interface ClassReportSubmissionProjection {
  id: string;
  studentKey: string;
  createdAt: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  attemptCount: number;
  official: boolean;
  weakTopics: string[];
  questionResults: ClassReportQuestionProjection[];
}

const projectQuestionResult = (result: ClassReportQuestionResult): ClassReportQuestionProjection => ({
  questionNumber: normalizeWhitespace(result.questionNumber),
  status: typeof result.status === 'string' ? result.status : '',
  score: asFiniteNumber(result.score),
  maxScore: asFiniteNumber(result.maxScore),
  errorType: typeof result.errorType === 'string' ? result.errorType : null,
  weakTopics: topicValues(result.weakTopics).filter((topic): topic is string => typeof topic === 'string'),
});

const projectSubmission = (submission: ClassReportSubmission, attemptCount: number): ClassReportSubmissionProjection => ({
  id: String(submission.id ?? ''),
  studentKey: normalizeWhitespace(submission.studentKey),
  createdAt: String(submission.createdAt ?? ''),
  status: typeof submission.status === 'string' ? submission.status : '',
  score: asFiniteNumber(submission.score),
  maxScore: asFiniteNumber(submission.maxScore),
  attemptCount: Math.max(1, Math.floor(attemptCount)),
  official: submission.official === true,
  weakTopics: topicValues(submission.weakTopics).filter((topic): topic is string => typeof topic === 'string'),
  questionResults: (submission.questionResults ?? []).map(projectQuestionResult),
});

const projectQuestionCatalog = (
  catalog: readonly ClassReportQuestionCatalogItem[] | undefined,
): ClassReportQuestionCatalogItem[] | undefined => catalog?.map(item => ({
  questionNumber: normalizeWhitespace(item.questionNumber),
  content: typeof item.content === 'string' ? item.content.trim() : '',
  maxScore: asFiniteNumber(item.maxScore),
  expectedAnswer: typeof item.expectedAnswer === 'string' ? item.expectedAnswer.trim() : undefined,
  imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl.trim() : undefined,
})).filter(item => Boolean(item.questionNumber));

const projectQuestionSources = (
  sources: readonly ClassReportQuestionSource[] | undefined,
): ClassReportQuestionSource[] | undefined => sources?.map(source => ({
  name: normalizeWhitespace(source.name),
  url: typeof source.url === 'string' ? source.url.trim() : '',
  mimeType: typeof source.mimeType === 'string' ? source.mimeType : undefined,
})).filter(source => Boolean(source.name && source.url));

const recommendationPercent = (value: number | null): string =>
  value === null ? 'chưa xác định' : `${value.toFixed(1).replace('.', ',')}%`;

const recommendationRate = (value: number): string => `${Math.round(value * 100)}%`;

const questionEvidence = (question: ClassReportQuestionStats): string => [
  `đúng ${question.correct}/${question.evidenceCount} (${recommendationRate(question.correctRate)})`,
  question.partial > 0 ? `đúng một phần ${question.partial}` : '',
  question.incorrect > 0 ? `sai ${question.incorrect}` : '',
  question.unreadable > 0 ? `không đọc được ${question.unreadable}` : '',
  question.notAttempted > 0 ? `chưa làm ${question.notAttempted}` : '',
].filter(Boolean).join(', ');

const buildRecommendations = (
  metrics: ClassReportMetrics,
  counters: ClassReportCounters,
  scoreDistribution: Record<'0-<5' | '5-<6.5' | '6.5-<8' | '8-10', number>,
  questionStats: readonly ClassReportQuestionStats[],
  errorStats: readonly ClassReportLabelStats[],
  topicStats: readonly ClassReportLabelStats[],
): ClassReportRecommendation[] => {
  const validEvidence = metrics.officialEvidenceCount;
  if (validEvidence < 3) {
    return [{
      title: 'Chưa đủ dữ liệu để kết luận toàn lớp',
      evidence: `Hiện có ${validEvidence} bài đã duyệt và có điểm hợp lệ${counters.roster > 0 ? ` trên ${counters.roster} học sinh` : ''}; chưa đủ căn cứ xác định chủ đề hoặc lỗi chung.`,
      action: 'Ưu tiên hoàn tất chấm và duyệt các bài còn lại; kiểm tra riêng những bài mờ, thiếu ảnh hoặc đang chờ chấm trước khi dùng báo cáo để điều chỉnh dạy học.',
      check: 'Khi có ít nhất 3 bài đã duyệt với điểm hợp lệ, bấm “Tạo báo cáo” lại để nhận định theo dữ liệu mới.',
    }];
  }

  const recommendations: ClassReportRecommendation[] = [];
  const average = metrics.averagePercent ?? 0;
  const lowScoreCount = scoreDistribution['0-<5'] + scoreDistribution['5-<6.5'];
  const highScoreCount = scoreDistribution['8-10'];

  if (average < 50) {
    recommendations.push({
      title: 'Củng cố kiến thức nền trước khi luyện nâng cao',
      evidence: `Điểm trung bình chính thức của ${validEvidence} bài là ${recommendationPercent(metrics.averagePercent)}; ${lowScoreCount}/${validEvidence} bài đang dưới 6,5 điểm.`,
      action: 'Dành 10–12 phút đầu tiết sau để làm mẫu một câu từ đọc yêu cầu, xác định dữ kiện, chọn quy tắc đến kết luận; sau mỗi bước cho học sinh tự đối chiếu và sửa ngay.',
      check: 'Cho học sinh làm phiếu thoát gồm 2 câu cùng dạng; chỉ chuyển sang nhiệm vụ nâng cao khi ít nhất 80% học sinh hoàn thành đúng các bước cốt lõi.',
    });
  } else if (average < 65) {
    recommendations.push({
      title: 'Luyện tập có hướng dẫn theo từng bước',
      evidence: `Điểm trung bình chính thức của ${validEvidence} bài là ${recommendationPercent(metrics.averagePercent)}; ${lowScoreCount}/${validEvidence} bài đang dưới 6,5 điểm, cho thấy kết quả chưa ổn định.`,
      action: 'Dành 8–10 phút chữa một bài tiêu biểu theo ba cột “dữ kiện – cách làm – kết luận”, sau đó cho học sinh làm 2 câu tương tự theo cặp và giải thích vì sao chọn cách làm đó.',
      check: 'Thu một phiếu ngắn cuối hoạt động; nếu dưới 80% học sinh đạt từ 70% điểm, giữ lại một lượt luyện có gợi ý ở tiết kế tiếp.',
    });
  } else if (average < 80) {
    recommendations.push({
      title: 'Củng cố điểm nghẽn trước khi mở rộng',
      evidence: `Điểm trung bình chính thức của ${validEvidence} bài là ${recommendationPercent(metrics.averagePercent)}; ${highScoreCount}/${validEvidence} bài đạt 8–10 nhưng vẫn cần xử lý lỗi lặp lại trước khi tăng độ khó.`,
      action: 'Dành 6–8 phút cho học sinh đối chiếu một lời giải đúng với một lời giải sai, đánh dấu bước khác nhau, rồi sửa lại một câu tương tự mà không xem đáp án.',
      check: 'Dùng 2 câu kiểm tra nhanh cùng yêu cầu nhưng đổi dữ kiện; theo dõi tỷ lệ đúng và chỉ mở rộng khi kết quả tăng rõ ở cả hai câu.',
    });
  } else {
    recommendations.push({
      title: 'Phân hóa để vừa giữ nhịp vừa hỗ trợ nhóm còn vướng',
      evidence: `Điểm trung bình chính thức của ${validEvidence} bài là ${recommendationPercent(metrics.averagePercent)}; ${highScoreCount}/${validEvidence} bài đạt 8–10${lowScoreCount > 0 ? `, còn ${lowScoreCount}/${validEvidence} bài dưới 6,5` : ''}.`,
      action: 'Chia hai mức nhiệm vụ: nhóm còn dưới 6,5 điểm làm 2 câu có gợi ý và được kiểm tra từng bước; nhóm từ 8 điểm trở lên làm 1 câu vận dụng hoặc giải thích cách làm cho bạn.',
      check: 'Cuối hoạt động, dùng phiếu thoát 2 câu tương đương; tạo lại báo cáo sau khi duyệt bài mới để kiểm tra nhóm hỗ trợ đã tiến bộ chưa.',
    });
  }

  const weakestQuestion = questionStats.filter(question => question.evidenceCount >= 3).sort((left, right) =>
    left.correctRate - right.correctRate
    || left.scoreRate - right.scoreRate
    || left.questionNumber.localeCompare(right.questionNumber, undefined, { numeric: true }))[0];
  if (weakestQuestion && weakestQuestion.correctRate < 0.7) {
    const evidence = weakestQuestion.evidenceCount;
    let action = 'Dành 8–10 phút chữa mẫu câu này theo các bước đọc yêu cầu, lập luận và kết luận; cho học sinh làm lại một câu tương tự theo cặp rồi đổi bài kiểm tra từng bước.';
    if (weakestQuestion.unreadable / evidence >= 0.25) {
      action = 'Trước khi kết luận kiến thức, yêu cầu bổ sung ảnh rõ cho phần này; không quy phần không đọc được thành lỗi học tập. Sau đó chữa một bài mẫu và cho học sinh làm lại một câu tương tự.';
    } else if (weakestQuestion.notAttempted / evidence >= 0.25) {
      action = 'Tách câu này thành các bước nhỏ, cho học sinh hoàn thành từng bước với gợi ý ngắn rồi rút dần gợi ý trước khi làm lại độc lập.';
    } else if (weakestQuestion.partial / evidence >= 0.25) {
      action = 'Chữa mẫu câu này, yêu cầu học sinh nói rõ bước còn thiếu trong lời giải; sau đó làm một câu tương tự và tự đối chiếu với tiêu chí chấm.';
    }
    recommendations.push({
      title: `Điểm nghẽn cần xử lý: Câu ${weakestQuestion.questionNumber}`,
      evidence: `Câu ${weakestQuestion.questionNumber}: ${questionEvidence(weakestQuestion)}.`,
      action,
      check: 'Dùng phiếu thoát gồm 2 câu tương đương; mục tiêu là ít nhất 80% học sinh đạt từ 70% điểm ở phần này trước khi chuyển sang dạng khó hơn.',
    });
  }

  if (topicStats[0]) {
    recommendations.push({
      title: `Ưu tiên củng cố chủ đề “${topicStats[0].label}”`,
      evidence: `Chủ đề này xuất hiện ${topicStats[0].evidenceCount} lượt trong các minh chứng chính thức; đây là tín hiệu cần kiểm tra lại, không phải kết luận cố định cho từng học sinh.`,
      action: 'Thiết kế một hoạt động 10 phút theo ba nhịp: nhận diện yêu cầu, làm một ví dụ có hướng dẫn, rồi làm một biến thể độc lập; ghép học sinh cần hỗ trợ với bạn đã làm chắc.',
      check: 'Kết thúc bằng một câu vận dụng ngắn cùng chủ đề; nếu tỷ lệ đúng chưa đạt 80%, giữ chủ đề này trong bài luyện tiếp theo thay vì chỉ giao bài khó hơn.',
    });
  }

  if (errorStats[0]) {
    recommendations.push({
      title: `Sửa lỗi lặp lại: “${errorStats[0].label}”`,
      evidence: `Lỗi này được ghi nhận ${errorStats[0].evidenceCount} lượt trong các minh chứng chính thức.`,
      action: 'Chọn hai bài đại diện — một bài sai hoàn toàn và một bài đúng một phần — để học sinh đánh dấu bước phát sinh lỗi; giáo viên chốt lại dấu hiệu nhận biết và cách tự kiểm tra.',
      check: 'Cho học sinh sửa lại chính câu đã sai và làm thêm một câu biến thể; chỉ coi lỗi đã được xử lý khi các em giải thích được cách tránh lặp lại.',
    });
  }

  if (counters.roster > 0 && counters.missing > 0) {
    recommendations.push({
      title: 'Bổ sung độ phủ trước khi kết luận toàn lớp',
      evidence: `Có ${counters.submitted}/${counters.roster} học sinh đã có lượt nộp mới nhất; còn ${counters.missing} học sinh chưa nộp, trong khi ${validEvidence} bài đã có điểm hợp lệ.`,
      action: 'Nhắc nộp theo danh sách riêng; kiểm tra trường hợp nộp thiếu ảnh hoặc ảnh không đọc được, và tách rõ “chưa nộp” khỏi “chưa đạt” khi trao đổi với học sinh.',
      check: 'Sau khi nhận bài bổ sung, bấm “Tạo báo cáo” lại; chỉ so sánh xu hướng dạy học trên nhóm bài đã được chấm và duyệt chính thức.',
    });
  }

  return recommendations;
};

export const normalizeClassReportAssignments = (
  input: ClassReportInput | ClassReportAssignment | readonly ClassReportAssignment[] | { assignments: readonly ClassReportAssignment[] },
): ClassReportAssignment[] => {
  const assignments = Array.isArray(input)
    ? input
    : 'assignment' in input
      ? [input.assignment]
      : 'assignments' in input
        ? input.assignments
        : [input];
  return assignments.map(assignment => ({
    ...assignment,
    submissions: [...(assignment.submissions ?? [])],
  }));
};

export const buildClassAssignmentReport = (input: ClassReportInput): ClassAssignmentReport => {
  const assignment = normalizeClassReportAssignments(input)[0];
  const rosterKeys = new Set(input.roster.map(studentKeyOf).map(normalizeKey).filter(Boolean));
  const latestByStudent = new Map<string, ClassReportSubmission>();
  const attemptsByStudent = new Map<string, number>();

  for (const submission of assignment.submissions) {
    const key = normalizeKey(submission.studentKey);
    if (!key || !rosterKeys.has(key)) continue;
    attemptsByStudent.set(key, (attemptsByStudent.get(key) ?? 0) + 1);
    const current = latestByStudent.get(key);
    if (!current || isNewer(submission, current)) latestByStudent.set(key, submission);
  }

  const latestSubmissions = [...latestByStudent.values()];
  const isOfficial = (submission: ClassReportSubmission): boolean =>
    submission.official === true && normalizeKey(submission.status) === 'graded';
  const officialSubmissions = latestSubmissions.filter(isOfficial);
  const graded = latestSubmissions.filter(submission => normalizeKey(submission.status) === 'graded');
  const pending = latestSubmissions.filter(submission => !isOfficial(submission));
  const scorePairs = officialSubmissions
    .map(submission => scorePair(submission, assignment.maxScore))
    .filter((pair): pair is { score: number; maxScore: number } => pair !== null);
  const percentages = scorePairs.map(pair => (pair.score / pair.maxScore) * 100);
  const scoreDistribution = emptyDistribution();
  for (const percentage of percentages) scoreDistribution[rangeFor((percentage / 100) * 10)] += 1;

  const metrics: ClassReportMetrics = {
    averagePercent: percentages.length > 0
      ? percentages.reduce((sum, percentage) => sum + percentage, 0) / percentages.length
      : null,
    medianPercent: median(percentages),
    officialEvidenceCount: scorePairs.length,
  };
  const questionStats = buildQuestionStats(officialSubmissions);
  const errorStats = collectLabelStats(officialSubmissions, result => result.errorType ? [result.errorType] : [], undefined, isActionableErrorLabel);
  const topicStats = collectLabelStats(
    officialSubmissions,
    result => topicValues(result.weakTopics),
    submission => topicValues(submission.weakTopics),
  );
  const counters: ClassReportCounters = {
    roster: rosterKeys.size,
    submitted: latestSubmissions.length,
    graded: graded.length,
    official: officialSubmissions.length,
    pending: pending.length,
    missing: Math.max(0, rosterKeys.size - latestSubmissions.length),
  };
  const recommendations = buildRecommendations(metrics, counters, scoreDistribution, questionStats, errorStats, topicStats);

  return {
    assignment: {
      id: assignment.id,
      title: assignment.title,
      type: assignment.type,
      maxScore: assignment.maxScore,
      questionCatalog: projectQuestionCatalog(assignment.questionCatalog),
      questionSources: projectQuestionSources(assignment.questionSources),
    },
    latest: latestSubmissions.map(submission => projectSubmission(submission, attemptsByStudent.get(normalizeKey(submission.studentKey)) ?? 1)),
    official: officialSubmissions.map(submission => projectSubmission(submission, attemptsByStudent.get(normalizeKey(submission.studentKey)) ?? 1)),
    counters,
    metrics,
    averagePercent: metrics.averagePercent,
    medianPercent: metrics.medianPercent,
    scoreDistribution,
    distribution: scoreDistribution,
    questionStats,
    errorStats,
    topicStats,
    recommendations,
  };
};

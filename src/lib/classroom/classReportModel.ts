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
  maxScore?: number | null;
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

export interface ClassReportLabelStats {
  label: string;
  evidenceCount: number;
}

export interface ClassAssignmentReport {
  assignment: Pick<ClassReportAssignment, 'id' | 'title' | 'type' | 'maxScore'>;
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
  recommendations: string[];
}

const QUESTION_STATUSES = new Set(['correct', 'partial', 'incorrect', 'unreadable', 'not_attempted']);
const SCORE_RANGES = ['0-<5', '5-<6.5', '6.5-<8', '8-10'] as const;

const asFiniteNumber = (value: unknown): number | null => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const normalizeWhitespace = (value: unknown): string =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

const normalizeKey = (value: unknown): string => normalizeWhitespace(value).toLocaleLowerCase('vi-VN');

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
    for (const rawLabel of submissionLabelsOf?.(submission) ?? []) addLabel(rawLabel);
    for (const result of submission.questionResults ?? []) {
      if (!isCountableQuestionResult(result)) continue;
      for (const rawLabel of labelsOf(result)) addLabel(rawLabel);
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

const projectSubmission = (submission: ClassReportSubmission): ClassReportSubmissionProjection => ({
  id: String(submission.id ?? ''),
  studentKey: normalizeWhitespace(submission.studentKey),
  createdAt: String(submission.createdAt ?? ''),
  status: typeof submission.status === 'string' ? submission.status : '',
  score: asFiniteNumber(submission.score),
  maxScore: asFiniteNumber(submission.maxScore),
  official: submission.official === true,
  weakTopics: topicValues(submission.weakTopics).filter((topic): topic is string => typeof topic === 'string'),
  questionResults: (submission.questionResults ?? []).map(projectQuestionResult),
});

const buildRecommendations = (
  metrics: ClassReportMetrics,
  questionStats: readonly ClassReportQuestionStats[],
  errorStats: readonly ClassReportLabelStats[],
  topicStats: readonly ClassReportLabelStats[],
): string[] => {
  if (metrics.officialEvidenceCount < 3) {
    return ['Chưa đủ dữ liệu chính thức để đưa ra khuyến nghị dạy học đáng tin cậy.'];
  }

  const recommendations: string[] = [];
  if ((metrics.averagePercent ?? 0) < 50) {
    recommendations.push('Giáo viên nên dành thời gian củng cố nền tảng và hướng dẫn học sinh kiểm tra từng bước giải.');
  } else if ((metrics.averagePercent ?? 0) < 65) {
    recommendations.push('Giáo viên nên tổ chức luyện tập có hướng dẫn, sau đó cho học sinh giải thích cách chọn và kiểm tra chiến lược.');
  } else {
    recommendations.push('Giáo viên nên duy trì luyện tập phân hóa và mở rộng nhiệm vụ cho học sinh đã nắm chắc kiến thức.');
  }

  const weakestQuestion = questionStats.filter(question => question.evidenceCount >= 3).sort((left, right) =>
    left.correctRate - right.correctRate || left.questionNumber.localeCompare(right.questionNumber, undefined, { numeric: true }))[0];
  if (weakestQuestion && weakestQuestion.correctRate < 0.5) {
    recommendations.push(`Nên chữa mẫu câu ${weakestQuestion.questionNumber}, yêu cầu học sinh nêu bằng chứng và tự kiểm tra kết quả.`);
  }
  if (topicStats[0]) {
    recommendations.push(`Ưu tiên củng cố chủ đề “${topicStats[0].label}” bằng một nhiệm vụ ngắn có phản hồi ngay.`);
  }
  if (errorStats[0]) {
    recommendations.push(`Khi chữa bài, giáo viên nên minh họa và cho học sinh tự sửa lỗi “${errorStats[0].label}”.`);
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

  for (const submission of assignment.submissions) {
    const key = normalizeKey(submission.studentKey);
    if (!key || !rosterKeys.has(key)) continue;
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
  const errorStats = collectLabelStats(officialSubmissions, result => result.errorType ? [result.errorType] : []);
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
  const recommendations = buildRecommendations(metrics, questionStats, errorStats, topicStats);

  return {
    assignment: {
      id: assignment.id,
      title: assignment.title,
      type: assignment.type,
      maxScore: assignment.maxScore,
    },
    latest: latestSubmissions.map(projectSubmission),
    official: officialSubmissions.map(projectSubmission),
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

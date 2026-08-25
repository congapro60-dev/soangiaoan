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

export interface ClassReportSubmission {
  id: string;
  studentKey: string;
  createdAt: string;
  status: ClassReportSubmissionStatus;
  score?: number | null;
  maxScore?: number | null;
  official: boolean;
  questionResults?: readonly ClassReportQuestionResult[];
}

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
  correctRate: number;
  scoreRate: number;
}

export interface ClassReportLabelStats {
  label: string;
  evidenceCount: number;
}

export interface ClassAssignmentReport {
  assignment: Pick<ClassReportAssignment, 'id' | 'title' | 'type' | 'maxScore'>;
  latest: ClassReportSubmission[];
  official: ClassReportSubmission[];
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

const QUESTION_STATUSES = new Set(['correct', 'partial', 'incorrect', 'unreadable']);
const SCORE_RANGES = ['0-<5', '5-<6.5', '6.5-<8', '8-10'] as const;

const asFiniteNumber = (value: unknown): number | null => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeWhitespace = (value: string): string => value.trim().replace(/\s+/g, ' ');

const normalizeKey = (value: string): string => normalizeWhitespace(value).toLocaleLowerCase('vi-VN');

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
): ClassReportLabelStats[] => {
  const stats = new Map<string, ClassReportLabelStats>();
  for (const submission of submissions) {
    for (const result of submission.questionResults ?? []) {
      if (!isCountableQuestionResult(result)) continue;
      for (const rawLabel of labelsOf(result)) {
        const normalized = normalizeLabel(rawLabel);
        if (!normalized) continue;
        const current = stats.get(normalized.key);
        if (current) current.evidenceCount += 1;
        else stats.set(normalized.key, { label: normalized.label, evidenceCount: 1 });
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
        correctRate: 0,
        scoreRate: 0,
        score: 0,
        maxScore: 0,
      };
      current.evidenceCount += 1;
      current[status as 'correct' | 'partial' | 'incorrect' | 'unreadable'] += 1;
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

  const weakestQuestion = [...questionStats].sort((left, right) =>
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

  const latest = [...latestByStudent.values()];
  const official = latest.filter(submission => submission.official === true);
  const graded = latest.filter(submission => normalizeKey(submission.status) === 'graded');
  const pending = graded.filter(submission => submission.official !== true);
  const scorePairs = official
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
  const questionStats = buildQuestionStats(official);
  const errorStats = collectLabelStats(official, result => result.errorType ? [result.errorType] : []);
  const topicStats = collectLabelStats(official, result =>
    Array.isArray(result.weakTopics) ? result.weakTopics : result.weakTopics ? [result.weakTopics] : []);
  const counters: ClassReportCounters = {
    roster: rosterKeys.size,
    submitted: latest.length,
    graded: graded.length,
    official: official.length,
    pending: pending.length,
    missing: Math.max(0, rosterKeys.size - latest.length),
  };
  const recommendations = buildRecommendations(metrics, questionStats, errorStats, topicStats);

  return {
    assignment: {
      id: assignment.id,
      title: assignment.title,
      type: assignment.type,
      maxScore: assignment.maxScore,
    },
    latest,
    official,
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

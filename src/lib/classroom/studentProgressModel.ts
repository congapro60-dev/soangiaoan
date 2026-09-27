import type { ExamSubmission } from '../../types';
import type {
  AssignmentDoc,
  PracticeAttemptDoc,
  PracticeSetDoc,
  StudentActivityStatus,
  StudentActivityView,
  StudentProfileDoc,
  SubmissionDoc,
} from './types';
import { buildStudentActivityViews } from './activityModel';

export interface StudentProgressModelInput {
  studentId: string;
  assignments: readonly AssignmentDoc[];
  submissions?: readonly SubmissionDoc[];
  examSubmissions?: readonly ExamSubmission[];
  practiceSets?: readonly PracticeSetDoc[];
  practiceAttempts?: readonly PracticeAttemptDoc[];
  profile?: StudentProfileDoc | null;
}

export interface StudentProgressTimelineItem {
  id: string;
  title: string;
  sourceType: StudentActivityView['sourceType'];
  status: StudentActivityStatus;
  occurredAt?: string;
  attemptCount: number;
  score: number | null;
  maxScore: number | null;
  official: boolean;
  nextAction: StudentActivityView['nextAction'];
}

export interface StudentProgressSummary {
  activities: StudentActivityView[];
  assignmentActivities: StudentActivityView[];
  needsAction: StudentActivityView[];
  officialActivities: StudentActivityView[];
  formativeActivities: StudentActivityView[];
  timeline: StudentProgressTimelineItem[];
  completedCount: number;
  assignmentCount: number;
  completionRate: number;
  officialCount: number;
  officialAveragePercent: number | null;
  skillStates: NonNullable<StudentProfileDoc['skills']>;
  weakTopics: string[];
  strongTopics: string[];
  nextAction: StudentActivityView | null;
}

const timestamp = (value: unknown): number => {
  const parsed = Date.parse(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const finiteScore = (value: unknown): number | null => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
);

const isCompleted = (status: StudentActivityStatus): boolean => (
  status === 'submitted'
  || status === 'grading'
  || status === 'pending_teacher'
  || status === 'official'
  || status === 'formative_complete'
);

const needsAction = (status: StudentActivityStatus): boolean => (
  status === 'not_started' || status === 'in_progress' || status === 'error'
);

const actionPriority: Record<StudentActivityStatus, number> = {
  error: 0,
  in_progress: 1,
  not_started: 2,
  pending_teacher: 3,
  submitted: 4,
  grading: 5,
  official: 6,
  formative_complete: 7,
};

const nextActivity = (activities: readonly StudentActivityView[]): StudentActivityView | null => {
  const candidates = activities.filter(activity => needsAction(activity.status));
  return [...candidates].sort((left, right) => (
    actionPriority[left.status] - actionPriority[right.status]
    || timestamp(left.dueAt) - timestamp(right.dueAt)
    || left.title.localeCompare(right.title, 'vi')
  ))[0] || null;
};

const timelineItem = (activity: StudentActivityView): StudentProgressTimelineItem => ({
  id: activity.id,
  title: activity.title,
  sourceType: activity.sourceType,
  status: activity.status,
  occurredAt: activity.latestAttemptAt || activity.dueAt,
  attemptCount: activity.attemptCount,
  score: activity.officialScore ?? activity.provisionalScore,
  maxScore: activity.maxScore ?? null,
  official: activity.officialScore !== null,
  nextAction: activity.nextAction,
});

export const buildStudentProgressSummary = (input: StudentProgressModelInput): StudentProgressSummary => {
  const activities = buildStudentActivityViews({
    studentId: input.studentId,
    assignments: input.assignments,
    submissions: input.submissions,
    examSubmissions: input.examSubmissions,
    practiceSets: input.practiceSets,
    practiceAttempts: input.practiceAttempts,
  });
  const assignmentActivities = activities.filter(activity => activity.sourceType !== 'practice');
  const officialActivities = assignmentActivities.filter(activity => activity.officialScore !== null && activity.status === 'official');
  const formativeActivities = activities.filter(activity => activity.sourceType === 'practice');
  const completedCount = assignmentActivities.filter(activity => isCompleted(activity.status)).length;
  const officialRatios = officialActivities.flatMap(activity => {
    const score = finiteScore(activity.officialScore);
    const maxScore = finiteScore(activity.maxScore);
    return score !== null && maxScore !== null && maxScore > 0 ? [score / maxScore * 100] : [];
  });
  const topics = input.profile?.topics || [];

  return {
    activities,
    assignmentActivities,
    needsAction: assignmentActivities.filter(activity => needsAction(activity.status)),
    officialActivities,
    formativeActivities,
    timeline: activities.map(timelineItem),
    completedCount,
    assignmentCount: assignmentActivities.length,
    completionRate: assignmentActivities.length > 0 ? completedCount / assignmentActivities.length : 0,
    officialCount: officialActivities.length,
    officialAveragePercent: officialRatios.length > 0
      ? officialRatios.reduce((sum, ratio) => sum + ratio, 0) / officialRatios.length
      : null,
    skillStates: input.profile?.skills ? [...input.profile.skills] : [],
    weakTopics: topics.filter(topic => topic.level === 'weak' || topic.level === 'developing').map(topic => topic.topic),
    strongTopics: topics.filter(topic => topic.level === 'solid').map(topic => topic.topic),
    nextAction: nextActivity(assignmentActivities),
  };
};

export const studentActivityStatusLabel = (status: StudentActivityStatus): string => {
  const labels: Record<StudentActivityStatus, string> = {
    not_started: 'Chưa bắt đầu',
    in_progress: 'Đang làm dở',
    submitted: 'Đã nộp, chờ xử lý',
    grading: 'Đang chấm',
    pending_teacher: 'Chờ thầy cô duyệt',
    official: 'Đã có kết quả chính thức',
    formative_complete: 'Đã hoàn thành lượt luyện',
    error: 'Cần thử lại',
  };
  return labels[status];
};

export const studentActivityNextActionLabel = (action: StudentActivityView['nextAction']): string => {
  const labels: Record<StudentActivityView['nextAction'], string> = {
    start: 'Bắt đầu',
    resume: 'Tiếp tục làm',
    view_feedback: 'Xem nhận xét',
    wait_teacher: 'Chờ thầy cô xử lý',
    retry: 'Thử lại',
    practice_again: 'Luyện lượt mới',
  };
  return labels[action];
};

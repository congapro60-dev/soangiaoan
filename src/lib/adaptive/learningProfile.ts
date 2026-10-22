import type {
  AdaptiveLesson,
  AssessmentAttempt,
  LearningRoute,
  MasteryStatus,
  StudentLearningProfile,
  StudentObjectiveMemory,
} from './types.js';

/**
 * Trộn kết quả một lượt làm vào vùng nhớ năng lực của học sinh.
 *
 * Dùng CHUNG cho cả lúc trình duyệt ghi hồ sơ và lúc máy chủ ghi hồ sơ (bài giao cho lớp):
 * một nơi tính mastery thì hai nơi không lệch nhau.
 */
export const mergeObjectiveMemory = (
  lesson: AdaptiveLesson,
  attempts: readonly AssessmentAttempt[],
  previousMemory: readonly StudentObjectiveMemory[] = [],
): StudentObjectiveMemory[] => {
  const now = new Date().toISOString();
  return lesson.objectives.map(objective => {
    const evidence = attempts.flatMap(attempt => attempt.objectiveScores.filter(score => score.objectiveId === objective.id));
    const latestEvidence = evidence[evidence.length - 1];
    const previous = previousMemory.find(item => item.objectiveId === objective.id);
    const masteryEstimate = latestEvidence?.masteryEstimate ?? previous?.masteryEstimate ?? 0;
    const lastStatus: MasteryStatus = masteryEstimate >= objective.masteryThreshold
      ? 'mastered'
      : masteryEstimate >= 0.55
        ? 'near_mastery'
        : 'weak';
    return {
      objectiveId: objective.id,
      objectiveCode: objective.code,
      ...(objective.skillId ? { skillId: objective.skillId } : {}),
      title: objective.title,
      attempts: (previous?.attempts || 0) + evidence.length,
      masteryEstimate,
      lastStatus,
      lastUpdatedAt: now,
    };
  });
};

/** Trung bình mức nắm được theo mục tiêu của các lượt làm. */
export const averageMastery = (attempts: readonly AssessmentAttempt[]): number => {
  const scores = attempts.flatMap(attempt => attempt.objectiveScores.map(score => score.masteryEstimate));
  if (scores.length === 0) return 0;
  return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2));
};

/** Cộng dồn lỗi sai theo mã lỗi (CommonMisconception) để GV biết em vướng gì. */
export const countMisconceptions = (
  attempts: readonly AssessmentAttempt[],
  previousCounts: Record<string, number> = {},
): Record<string, number> => {
  const counts = { ...previousCounts };
  attempts.forEach(attempt => {
    attempt.answers.forEach(answer => {
      (answer.detectedMisconceptionIds || []).forEach(misconceptionId => {
        counts[misconceptionId] = (counts[misconceptionId] || 0) + 1;
      });
    });
  });
  return counts;
};

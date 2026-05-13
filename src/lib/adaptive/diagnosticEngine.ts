import {
  AdaptiveAnswer,
  AdaptiveAssessment,
  AdaptiveLesson,
  AssessmentAttempt,
  LearningRoute,
  MasteryStatus,
  ObjectiveMasteryState,
  ObjectiveScore,
  StudentAdaptiveProgress,
  TeacherFlag,
  AdaptiveTeacherDashboardData,
} from './types';

const normalizeAnswer = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]$/g, '');

const isCorrectAnswer = (studentAnswer: string, correctAnswer?: string) => {
  if (!correctAnswer) return false;
  return normalizeAnswer(studentAnswer) === normalizeAnswer(correctAnswer);
};

export const gradeAssessment = (
  assessment: AdaptiveAssessment,
  rawAnswers: Record<string, string>,
  durationSeconds: number
): AssessmentAttempt => {
  const answers: AdaptiveAnswer[] = assessment.questions.map(question => {
    const answer = rawAnswers[question.id] ?? '';
    const isCorrect = isCorrectAnswer(answer, question.correctAnswer);
    return {
      questionId: question.id,
      answer,
      isCorrect,
      score: isCorrect ? question.points : 0,
      detectedMisconceptionIds: isCorrect ? [] : question.misconceptionIds || [],
      feedback: isCorrect ? 'Đúng. Em có thể chuyển sang bước tiếp theo.' : question.explanation,
    };
  });

  const objectiveScores = calculateObjectiveScores(assessment, answers);
  const recommendedRoute = assessment.purpose === 'diagnostic'
    ? recommendLearningRoute(objectiveScores, assessment)
    : undefined;

  return {
    id: `attempt-${Date.now()}`,
    assessmentId: assessment.id,
    purpose: assessment.purpose,
    submittedAt: new Date().toISOString(),
    durationSeconds,
    answers,
    objectiveScores,
    recommendedRoute,
    aiSummary: buildRuleBasedSummary(objectiveScores, recommendedRoute),
  };
};

export const calculateObjectiveScores = (
  assessment: AdaptiveAssessment,
  answers: AdaptiveAnswer[]
): ObjectiveScore[] => {
  const scoreMap = new Map<string, { score: number; maxScore: number }>();

  assessment.questions.forEach(question => {
    const answer = answers.find(item => item.questionId === question.id);
    const objectiveWeight = question.objectiveIds.length || 1;

    question.objectiveIds.forEach(objectiveId => {
      const current = scoreMap.get(objectiveId) || { score: 0, maxScore: 0 };
      current.score += (answer?.score || 0) / objectiveWeight;
      current.maxScore += question.points / objectiveWeight;
      scoreMap.set(objectiveId, current);
    });
  });

  return Array.from(scoreMap.entries()).map(([objectiveId, value]) => ({
    objectiveId,
    score: Number(value.score.toFixed(2)),
    maxScore: Number(value.maxScore.toFixed(2)),
    masteryEstimate: value.maxScore > 0 ? Number((value.score / value.maxScore).toFixed(2)) : 0,
  }));
};

export const estimateMasteryStatus = (
  masteryEstimate: number,
  hasHardEvidence = false
): MasteryStatus => {
  if (masteryEstimate < 0.4) return 'weak';
  if (masteryEstimate < 0.7) return 'near_mastery';
  if (masteryEstimate >= 0.9 && hasHardEvidence) return 'advanced';
  return 'mastered';
};

export const recommendLearningRoute = (
  objectiveScores: ObjectiveScore[],
  assessment?: AdaptiveAssessment
): LearningRoute => {
  const weakCount = objectiveScores.filter(item => item.masteryEstimate < 0.4).length;
  const nearCount = objectiveScores.filter(item => item.masteryEstimate >= 0.4 && item.masteryEstimate < 0.7).length;
  const advancedEvidenceCount = assessment
    ? assessment.questions.filter(question => {
        const score = objectiveScores.find(item => question.objectiveIds.includes(item.objectiveId));
        return question.difficulty === 'hard' && (score?.masteryEstimate || 0) >= 0.9;
      }).length
    : 0;

  if (weakCount >= 2 || (weakCount >= 1 && nearCount >= 1)) return 'foundation';
  if (weakCount === 0 && nearCount === 0 && advancedEvidenceCount >= 1) return 'challenge';
  return 'standard';
};

export const buildObjectiveStates = (
  assessment: AdaptiveAssessment,
  objectiveScores: ObjectiveScore[]
): ObjectiveMasteryState[] => {
  return objectiveScores.map(score => {
    const evidenceQuestions = assessment.questions.filter(question => question.objectiveIds.includes(score.objectiveId));
    const hasHardEvidence = evidenceQuestions.some(question => question.difficulty === 'hard');
    return {
      objectiveId: score.objectiveId,
      status: estimateMasteryStatus(score.masteryEstimate, hasHardEvidence),
      confidence: score.masteryEstimate,
      evidenceQuestionIds: evidenceQuestions.map(question => question.id),
      lastUpdatedAt: new Date().toISOString(),
    };
  });
};

export const createProgressFromDiagnostic = (
  lesson: AdaptiveLesson,
  sessionId: string,
  studentId: string,
  diagnosticAttempt: AssessmentAttempt
): StudentAdaptiveProgress => {
  const route = diagnosticAttempt.recommendedRoute || 'standard';
  return {
    id: `progress-${sessionId}-${studentId}`,
    sessionId,
    lessonId: lesson.id,
    studentId,
    route,
    objectiveStates: buildObjectiveStates(lesson.diagnosticTest, diagnosticAttempt.objectiveScores),
    assessmentAttempts: [diagnosticAttempt],
    remediationEvents: [],
    teacherFlags: [],
    startedAt: new Date().toISOString(),
  };
};

export type NextUnitAction = 'move_next' | 'remediate' | 'needs_teacher';

export const decideNextUnitAction = (
  quickCheckAttempt: AssessmentAttempt,
  remediationAttempts: number,
  maxRemediationAttempts: number
): NextUnitAction => {
  const totalScore = quickCheckAttempt.objectiveScores.reduce((sum, item) => sum + item.score, 0);
  const totalMax = quickCheckAttempt.objectiveScores.reduce((sum, item) => sum + item.maxScore, 0);
  const ratio = totalMax > 0 ? totalScore / totalMax : 0;

  if (ratio >= 0.8) return 'move_next';
  if (remediationAttempts < maxRemediationAttempts) return 'remediate';
  return 'needs_teacher';
};

export const createTeacherFlag = (
  reason: string,
  objectiveIds: string[],
  severity: TeacherFlag['severity'] = 'warning'
): TeacherFlag => ({
  id: `flag-${Date.now()}`,
  severity,
  reason,
  objectiveIds,
  createdAt: new Date().toISOString(),
});

export const buildTeacherDashboardData = (
  lesson: AdaptiveLesson,
  progresses: StudentAdaptiveProgress[]
): AdaptiveTeacherDashboardData => {
  const routeCounts = {
    foundation: progresses.filter(item => item.route === 'foundation').length,
    standard: progresses.filter(item => item.route === 'standard').length,
    challenge: progresses.filter(item => item.route === 'challenge').length,
  };

  const objectiveInsights = lesson.objectives.map(objective => {
    const states = progresses
      .map(progress => progress.objectiveStates.find(state => state.objectiveId === objective.id))
      .filter(Boolean) as ObjectiveMasteryState[];

    const weakCount = states.filter(state => state.status === 'weak').length;
    const nearMasteryCount = states.filter(state => state.status === 'near_mastery').length;
    const masteredCount = states.filter(state => state.status === 'mastered').length;
    const advancedCount = states.filter(state => state.status === 'advanced').length;

    return {
      objectiveId: objective.id,
      objectiveCode: objective.code,
      title: objective.title,
      weakCount,
      nearMasteryCount,
      masteredCount,
      advancedCount,
      weakRate: states.length ? Number((weakCount / states.length).toFixed(2)) : 0,
    };
  });

  const urgentFlags = progresses.flatMap(progress => progress.teacherFlags).filter(flag => flag.severity === 'urgent');

  return {
    totalStudents: progresses.length,
    completedDiagnostic: progresses.filter(progress => progress.assessmentAttempts.some(attempt => attempt.purpose === 'diagnostic')).length,
    routeCounts,
    needsTeacherCount: progresses.filter(progress => progress.teacherFlags.length > 0).length,
    objectiveInsights,
    urgentFlags,
  };
};

const buildRuleBasedSummary = (
  objectiveScores: ObjectiveScore[],
  route?: LearningRoute
) => {
  if (!route) return 'Hệ thống đã ghi nhận kết quả kiểm tra nhanh.';

  const weakObjectives = objectiveScores.filter(item => item.masteryEstimate < 0.4).length;
  const nearObjectives = objectiveScores.filter(item => item.masteryEstimate >= 0.4 && item.masteryEstimate < 0.7).length;

  if (route === 'foundation') {
    return `Em cần củng cố nền tảng trước khi chuyển sang phần vận dụng. Có ${weakObjectives} mục tiêu đang ở mức cần hỗ trợ rõ ràng.`;
  }

  if (route === 'challenge') {
    return 'Em đã thể hiện mức nắm bài tốt ở bài chẩn đoán. Hệ thống sẽ chuyển em sang tuyến thử thách với nhiệm vụ vận dụng cao hơn.';
  }

  return `Em phù hợp với tuyến chuẩn. Có ${nearObjectives} mục tiêu nên được luyện thêm để đạt mức chắc chắn.`;
};

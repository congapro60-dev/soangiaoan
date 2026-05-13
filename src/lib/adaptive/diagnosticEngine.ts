import {
  AdaptiveAnswer,
  AdaptiveAssessment,
  AdaptiveLesson,
  AssessmentAttempt,
  LearningRoute,
  MasteryStatus,
  ObjectiveMasteryState,
  ObjectiveScore,
  PacingDecision,
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

const calculateAttemptRatio = (attempt: AssessmentAttempt) => {
  const totalScore = attempt.objectiveScores.reduce((sum, item) => sum + item.score, 0);
  const totalMax = attempt.objectiveScores.reduce((sum, item) => sum + item.maxScore, 0);
  return totalMax > 0 ? totalScore / totalMax : 0;
};

export type NextUnitAction = 'move_next' | 'remediate' | 'needs_teacher';

export const decideNextUnitAction = (
  quickCheckAttempt: AssessmentAttempt,
  remediationAttempts: number,
  maxRemediationAttempts: number
): NextUnitAction => {
  const ratio = calculateAttemptRatio(quickCheckAttempt);

  if (ratio >= 0.8) return 'move_next';
  if (remediationAttempts < maxRemediationAttempts) return 'remediate';
  return 'needs_teacher';
};

const getAverageMastery = (progress: StudentAdaptiveProgress) => {
  if (!progress.objectiveStates.length) return 0;
  const total = progress.objectiveStates.reduce((sum, item) => sum + item.confidence, 0);
  return Number((total / progress.objectiveStates.length).toFixed(2));
};

const getCompletedUnitIds = (lesson: AdaptiveLesson, progress: StudentAdaptiveProgress) => {
  return lesson.knowledgeUnits
    .filter(unit => {
      const latestQuickCheck = [...progress.assessmentAttempts]
        .reverse()
        .find(attempt => attempt.assessmentId === unit.quickCheck.id);
      return latestQuickCheck ? calculateAttemptRatio(latestQuickCheck) >= 0.8 : false;
    })
    .map(unit => unit.id);
};

const getDefaultPacingPolicy = (lesson: AdaptiveLesson) => ({
  minExitTicketMinutes: lesson.exitTicket.durationMinutes,
  aheadThresholdMinutes: 5,
  behindThresholdMinutes: 4,
  stuckAfterRemediationAttempts: 2,
  enrichmentTriggerMastery: 0.85,
  supportTriggerMastery: 0.55,
  ...lesson.pacingPolicy,
});

export const decidePacingAction = (
  lesson: AdaptiveLesson,
  progress: StudentAdaptiveProgress,
  elapsedMinutes: number,
  currentUnitId?: string,
  latestQuickCheckAttempt?: AssessmentAttempt,
  remediationAttempts = progress.remediationEvents.length
): PacingDecision => {
  const policy = getDefaultPacingPolicy(lesson);
  const completedUnitIds = getCompletedUnitIds(lesson, progress);
  const firstIncompleteUnit = lesson.knowledgeUnits.find(unit => !completedUnitIds.includes(unit.id));
  const currentUnit = lesson.knowledgeUnits.find(unit => unit.id === currentUnitId) || firstIncompleteUnit || lesson.knowledgeUnits.at(-1);
  const currentUnitIndex = currentUnit ? lesson.knowledgeUnits.findIndex(unit => unit.id === currentUnit.id) : -1;
  const unitsBeforeCurrent = currentUnitIndex > 0 ? lesson.knowledgeUnits.slice(0, currentUnitIndex) : [];
  const expectedElapsedMinutes = lesson.diagnosticTest.durationMinutes + unitsBeforeCurrent.reduce((sum, unit) => sum + unit.estimatedMinutes + unit.quickCheck.durationMinutes, 0);
  const currentUnitTotalMinutes = currentUnit ? currentUnit.estimatedMinutes + currentUnit.quickCheck.durationMinutes : 0;
  const currentUnitElapsedMinutes = Math.max(elapsedMinutes - expectedElapsedMinutes, 0);
  const currentUnitRemainingMinutes = currentUnit && !completedUnitIds.includes(currentUnit.id)
    ? Math.max(currentUnitTotalMinutes - currentUnitElapsedMinutes, 0)
    : 0;
  const futureUnitMinutes = lesson.knowledgeUnits
    .filter(unit => unit.id !== currentUnit?.id && !completedUnitIds.includes(unit.id))
    .reduce((sum, unit) => sum + unit.estimatedMinutes + unit.quickCheck.durationMinutes, 0);
  const remainingMinutes = Math.max(lesson.durationMinutes - elapsedMinutes, 0);
  const remainingCoreMinutes = currentUnitRemainingMinutes + futureUnitMinutes;
  const expectedCompletionMinutes = expectedElapsedMinutes + currentUnitTotalMinutes;
  const paceDeltaMinutes = Number((elapsedMinutes - expectedCompletionMinutes).toFixed(1));
  const averageMastery = getAverageMastery(progress);
  const quickCheckRatio = latestQuickCheckAttempt ? calculateAttemptRatio(latestQuickCheckAttempt) : undefined;
  const recommendedUnitIds = currentUnit ? [currentUnit.id] : [];
  const supportTaskIds = currentUnit?.supportTasks?.map(task => task.id) || [];
  const enrichmentTaskIds = currentUnit?.enrichmentTasks?.map(task => task.id) || [];
  const shouldPreserveExitTicket = remainingMinutes >= policy.minExitTicketMinutes;

  if (remediationAttempts >= policy.stuckAfterRemediationAttempts && averageMastery < policy.supportTriggerMastery) {
    return {
      status: 'stuck',
      action: 'flag_teacher',
      elapsedMinutes,
      remainingMinutes,
      expectedElapsedMinutes,
      paceDeltaMinutes,
      averageMastery,
      currentUnitId: currentUnit?.id,
      recommendedUnitIds,
      recommendedTaskIds: supportTaskIds,
      shouldPreserveExitTicket,
      message: 'Học sinh đang mắc kẹt: đã cần giảng lại nhiều lần nhưng mức làm chủ còn thấp. Hệ thống nên báo giáo viên hỗ trợ trực tiếp và chỉ giữ nhiệm vụ tối lõi.',
      teacherNote: 'Ưu tiên kiểm tra nhầm lẫn nền tảng, cho học sinh làm nhiệm vụ hỗ trợ ngắn thay vì tiếp tục bài nâng cao.',
    };
  }

  if (remainingMinutes < remainingCoreMinutes + policy.minExitTicketMinutes || paceDeltaMinutes > policy.behindThresholdMinutes) {
    const needsEasierSupport = averageMastery < policy.supportTriggerMastery || (quickCheckRatio !== undefined && quickCheckRatio < 0.6);
    return {
      status: 'behind',
      action: needsEasierSupport ? 'remediate_easier' : 'compress_to_core',
      elapsedMinutes,
      remainingMinutes,
      expectedElapsedMinutes,
      paceDeltaMinutes,
      averageMastery,
      currentUnitId: currentUnit?.id,
      recommendedUnitIds,
      recommendedTaskIds: needsEasierSupport ? supportTaskIds : currentUnit?.coreTaskIds || [],
      shouldPreserveExitTicket,
      message: needsEasierSupport
        ? 'Học sinh đang chậm và độ chắc kiến thức thấp. Hệ thống chuyển sang bản dễ hơn: ví dụ mẫu, gợi ý từng bước và bài tập tối thiểu theo mục tiêu lõi.'
        : 'Học sinh đang chậm nhưng chưa quá yếu. Hệ thống rút gọn phần luyện tập mở rộng, giữ mục tiêu lõi và dành thời gian cho exit ticket.',
      teacherNote: needsEasierSupport ? 'Theo dõi sát nhóm này vì nguy cơ không hoàn thành mục tiêu tối thiểu trong 40 phút.' : undefined,
    };
  }

  if (
    remainingMinutes >= policy.minExitTicketMinutes + policy.aheadThresholdMinutes &&
    averageMastery >= policy.enrichmentTriggerMastery &&
    (progress.route === 'challenge' || quickCheckRatio === undefined || quickCheckRatio >= 0.8)
  ) {
    return {
      status: 'ahead',
      action: 'assign_enrichment',
      elapsedMinutes,
      remainingMinutes,
      expectedElapsedMinutes,
      paceDeltaMinutes,
      averageMastery,
      currentUnitId: currentUnit?.id,
      recommendedUnitIds,
      recommendedTaskIds: enrichmentTaskIds,
      shouldPreserveExitTicket,
      message: 'Học sinh đang đi nhanh và có mức làm chủ cao. Hệ thống bổ sung nhiệm vụ mở rộng để vẫn sử dụng hiệu quả thời lượng 40 phút.',
    };
  }

  return {
    status: 'on_track',
    action: 'continue_core',
    elapsedMinutes,
    remainingMinutes,
    expectedElapsedMinutes,
    paceDeltaMinutes,
    averageMastery,
    currentUnitId: currentUnit?.id,
    recommendedUnitIds,
    recommendedTaskIds: currentUnit?.coreTaskIds || [],
    shouldPreserveExitTicket,
    message: 'Học sinh đang trong nhịp phù hợp. Hệ thống tiếp tục tuyến học hiện tại và giữ thời gian cho quick check/exit ticket.',
  };
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

import type {
  AdaptiveAssessment,
  AdaptiveLesson,
  AdaptiveQuestion,
  BloomLevel,
  DifficultyLevel,
  LearningObjective,
  LearningRoute,
  LearningRouteContent,
  PracticeTask,
  WorkedExample,
} from '../../adaptive/types';
import { getBanToanV4Contract, getBanToanV4DisplayTitle } from './lessonAdapter';
import type { LiveLessonV4Contract, V4Route, V4SourceExerciseLevel } from './types';

const routeMap: Record<V4Route, LearningRoute> = {
  M: 'foundation',
  S: 'standard',
  C: 'challenge',
};

const routeNames: Record<LearningRoute, string> = {
  foundation: 'Củng cố',
  standard: 'Chuẩn',
  challenge: 'Thử thách',
};

const difficultyByRoute: Record<LearningRoute, DifficultyLevel> = {
  foundation: 'easy',
  standard: 'medium',
  challenge: 'hard',
};

function safeIdPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function buildObjectives(contract: LiveLessonV4Contract): LearningObjective[] {
  const mathObjectives = contract.objectives.math.map((objective, index) => ({
    id: `${contract.id}-${objective.id}`,
    code: `M${index + 1}`,
    kind: 'math' as const,
    title: objective.text,
    description: objective.text,
    bloomLevel: (index === 0 ? 'understand' : index === 1 ? 'apply' : 'evaluate') as BloomLevel,
    masteryThreshold: 0.7,
    prerequisiteObjectiveIds: index === 0 ? [] : [`${contract.id}-${contract.objectives.math[index - 1]?.id}`],
    commonMisconceptions: index === 2 ? [{
      id: `${contract.id}-ai-error`,
      title: `AI Error · ${contract.aiError.category}`,
      description: contract.aiError.faultyStatement,
      remediationHint: `${contract.aiError.correction} Phép kiểm: ${contract.aiError.proof}`,
    }] : [],
  }));
  const languageObjectives = contract.objectives.language.map((objective, index) => ({
    id: `${contract.id}-${objective.id}`,
    code: `L${index + 1}`,
    kind: 'language' as const,
    title: objective.text,
    description: objective.text,
    bloomLevel: 'understand' as BloomLevel,
    masteryThreshold: 0.7,
    prerequisiteObjectiveIds: [],
    commonMisconceptions: [],
  }));
  return [...mathObjectives, ...languageObjectives];
}

function buildAssessment(
  contract: LiveLessonV4Contract,
  purpose: AdaptiveAssessment['purpose'],
  id: string,
): AdaptiveAssessment {
  const objectiveIds = contract.objectives.math.map((objective) => `${contract.id}-${objective.id}`);
  const sourceContent = contract.sourceContent;
  const sourceQuestions = purpose === 'quick_check'
    ? (sourceContent?.quickChecks ?? []).map((item) => ({
      prompt: item.question,
      answer: item.solution,
      explanation: `Đối chiếu lời giải nguồn: ${item.solution}`,
      difficulty: 'medium' as const,
    }))
    : purpose === 'diagnostic'
      ? (sourceContent?.exercises ?? []).slice(0, 5).map((item) => ({
        prompt: item.question,
        answer: item.answer,
        explanation: `Đáp án nguồn để GV đối chiếu: ${item.answer}`,
        difficulty: item.level === 'NB' ? 'easy' as const : item.level === 'TH' ? 'medium' as const : 'hard' as const,
      }))
      : [
        sourceContent?.exercises?.[3],
        sourceContent?.quickChecks?.[0],
        sourceContent?.exercises?.[4],
      ].filter((item): item is NonNullable<typeof item> => Boolean(item)).map((item) => {
        if ('answer' in item) {
          return {
            prompt: item.question,
            answer: item.answer,
            explanation: `Đáp án nguồn để GV đối chiếu: ${item.answer}`,
            difficulty: 'hard' as const,
          };
        }
        return {
          prompt: item.question,
          answer: item.solution,
          explanation: `Đối chiếu lời giải nguồn: ${item.solution}`,
          difficulty: 'hard' as const,
        };
      });
  const fallbackQuestion = {
    prompt: purpose === 'diagnostic'
      ? `Viết bước đầu tiên em sẽ dùng để xử lý: ${contract.taskVariants[1]?.prompt ?? contract.title}`
      : `Với một dữ kiện mới, hãy giải thích kết luận về ${contract.title} bằng một phép kiểm.`,
    answer: 'Ghi rõ dữ kiện, bước làm, kết luận và phép kiểm.',
    explanation: 'Đọc theo ba tiêu chí chung: mô hình/dữ kiện rõ, bước làm có căn cứ, kết luận được kiểm chứng.',
    difficulty: purpose === 'diagnostic' ? 'medium' as const : 'hard' as const,
  };
  const questions = (sourceQuestions.length > 0 ? sourceQuestions : [fallbackQuestion]).map((item, index): AdaptiveQuestion => ({
    id: `${id}-${index + 1}`,
    type: 'short_answer',
    prompt: item.prompt,
    correctAnswer: item.answer,
    explanation: item.explanation,
    hints: [
      'Gạch chân dữ kiện và điều kiện trước khi làm.',
      'Nêu công cụ hoặc phép tính làm căn cứ.',
      'Viết kết luận rồi kiểm tra lại bằng một trường hợp cụ thể.',
    ],
    objectiveIds,
    difficulty: item.difficulty,
    points: 1,
  }));
  return {
    id,
    title: purpose === 'diagnostic' ? 'Kiểm tra điểm xuất phát V4' : 'Post-check cá nhân V4',
    purpose,
    durationMinutes: purpose === 'diagnostic' ? 3 : 3,
    questions,
  };
}

function sourceLevelForRoute(route: V4Route): V4SourceExerciseLevel {
  return route === 'M' ? 'NB' : route === 'S' ? 'TH' : 'VD';
}

function buildPracticeTask(contract: LiveLessonV4Contract, route: V4Route, objectiveIds: string[]): PracticeTask {
  const variant = contract.taskVariants.find((item) => item.route === route) ?? contract.taskVariants[0];
  const scaffold = contract.scaffoldSets.find((item) => item.id === variant?.scaffoldSetId);
  const sourceExercise = contract.sourceContent?.exercises.find((item) => item.level === sourceLevelForRoute(route));
  return {
    id: `${contract.id}-practice-${route}`,
    prompt: variant?.prompt ?? contract.title,
    expectedAnswer: sourceExercise?.answer,
    hints: scaffold?.hints ?? [],
    objectiveIds,
    difficulty: difficultyByRoute[routeMap[route]],
  };
}

function buildRouteContent(contract: LiveLessonV4Contract, route: V4Route, objectiveIds: string[]): LearningRouteContent {
  const learningRoute = routeMap[route];
  const variant = contract.taskVariants.find((item) => item.route === route) ?? contract.taskVariants[0];
  const scaffold = contract.scaffoldSets.find((item) => item.id === variant?.scaffoldSetId);
  const example = contract.sourceContent?.examples[route === 'C' ? 1 : 0];
  const workedExample: WorkedExample = {
    id: `${contract.id}-example-${route}`,
    title: `${routeNames[learningRoute]} · ví dụ có kiểm chứng`,
    problem: example?.question ?? variant?.prompt ?? contract.title,
    solution: example?.solution ?? 'Tạo sản phẩm theo ba tiêu chí chung; đối chiếu phép kiểm trước khi kết luận.',
    explanation: `Không đổi chuẩn đích giữa các tuyến. Tuyến ${routeNames[learningRoute]} chỉ thay đổi mức scaffold và độ mở rộng.`,
    objectiveIds,
    timeLimitSeconds: 240,
    hints: scaffold?.hints ?? [],
    responseMode: 'long_text',
  };
  return {
    route: learningRoute,
    explanation: `Tuyến ${routeNames[learningRoute]} là cửa vào tạm thời theo bằng chứng hiện tại; học sinh có thể đổi tuyến sau khi trao đổi hoặc kiểm tra lại.`,
    guidingQuestions: scaffold?.sentenceFrames ?? [],
    guidingAnswers: [],
    workedExamples: [workedExample],
    practiceTasks: [buildPracticeTask(contract, route, objectiveIds)],
    aiTutorPrompt: `Giữ tiếng Việt làm mỏ neo. Chỉ đưa gợi ý kế tiếp cho tuyến ${route}; yêu cầu học sinh nêu căn cứ trước khi xem đáp án.`,
  };
}

/**
 * Tạo một AdaptiveLesson nháp từ gói V4. Không tự xuất bản: giáo viên phải rà nội dung
 * và bấm xuất bản trong luồng bài học hiện tại.
 */
export function buildBanToanV4AdaptiveLessonDraft(
  sourceKey: string,
  teacherId: string,
  timestamp = new Date().toISOString(),
): AdaptiveLesson {
  const contract = getBanToanV4Contract(sourceKey);
  const objectives = buildObjectives(contract);
  const objectiveIds = objectives.filter((objective) => objective.code.startsWith('M')).map((objective) => objective.id);
  const unitId = `${contract.id}-core`;
  const lessonId = `adaptive-v4-${safeIdPart(sourceKey)}-${safeIdPart(teacherId)}`;
  const quickCheck = buildAssessment(contract, 'quick_check', `${contract.id}-quick-check`);

  return {
    id: lessonId,
    title: getBanToanV4DisplayTitle(sourceKey),
    subjectId: 'math',
    grade: String(contract.source?.grade ?? 10) as AdaptiveLesson['grade'],
    curriculumRef: {
      programType: 'TDS',
      week: String(contract.source?.week ?? ''),
      period: contract.source?.period,
      chapter: 'Ban Toán · W5–W6',
      lessonCode: sourceKey,
    },
    durationMinutes: 40,
    status: 'draft',
    teacherId,
    createdAt: timestamp,
    updatedAt: timestamp,
    preparation: {
      readingInstructions: 'Đọc tình huống, gạch chân dữ kiện và ghi một điều muốn tự làm được. Không cần học thuộc trước.',
      guidingQuestions: [contract.objectives.teacherSynthesisPrompt, contract.aiError.faultyStatement, contract.groupingCheckpoints[0]?.sharedQuestion ?? 'Em sẽ kiểm chứng kết luận bằng cách nào?'],
      estimatedMinutes: 3,
      engage: {
        guidingQuestion: contract.objectives.teacherSynthesisPrompt,
        studentExpectationPrompt: contract.objectives.studentGoalPrompt,
        routeGoals: {
          foundation: 'Em cần một bước mẫu và khung câu để bắt đầu.',
          standard: 'Em tự chọn công cụ và giải thích được vì sao.',
          challenge: 'Em tạo phản ví dụ/điều kiện biên và bảo vệ kết luận.',
        },
      },
    },
    fiveStepFlow: {
      steps: [
        { id: `${unitId}-opening`, name: 'Trải nghiệm và câu hỏi', purpose: 'Bắt đầu từ tình huống, để học sinh phát sinh câu hỏi định hướng.', estimatedMinutes: 3, teacherRole: 'Đặt tình huống, chờ dự đoán, gọi tiếng nói học sinh.', studentAction: 'Quan sát, nói với bạn và ghi câu hỏi muốn theo đến cuối tiết.', systemSupport: 'Hiển thị TV nội dung chung; thu câu hỏi ngắn trên cổng HS.' },
        { id: `${unitId}-goals`, name: 'Mục tiêu do người học chọn', purpose: 'Học sinh chọn đích đến và minh chứng; giáo viên tổng hợp mục tiêu chung.', estimatedMinutes: 2, teacherRole: 'Đọc thống kê ẩn danh và neo mục tiêu trên bảng phụ.', studentAction: 'Chọn 1–2 mục tiêu, không bị gắn nhãn năng lực.', systemSupport: 'Lưu lựa chọn mục tiêu và hiển thị scaffold ngôn ngữ nếu cần.' },
        { id: `${unitId}-learn`, name: 'Hình thành kiến thức', purpose: 'Dùng ví dụ nguồn để hình thành công cụ, thuật ngữ và phép kiểm.', estimatedMinutes: 8, teacherRole: 'Viết phần cốt lõi trên bảng lớn; hỏi căn cứ trước khi chốt.', studentAction: 'Quan sát TV, ghi vở phần được yêu cầu và trả lời điểm kiểm tra.', systemSupport: 'Glossary Việt + ngôn ngữ hỗ trợ; không suy ra năng lực từ ngôn ngữ.' },
        { id: `${unitId}-practice`, name: 'AI Error và nhiệm vụ phân hóa', purpose: 'THINK → AI → VERIFY, sau đó nhóm theo nhu cầu cụ thể và học sinh tự chọn tuyến.', estimatedMinutes: 22, teacherRole: 'Duyệt đề xuất nhóm, can thiệp theo bằng chứng, giữ tương tác người–người.', studentAction: 'Sửa lỗi AI, làm nhiệm vụ M/S/C, peer-check rồi tự làm post-check.', systemSupport: 'Gợi ý theo tầng, thống kê ẩn danh, offline fallback.', },
        { id: `${unitId}-reflect`, name: 'Đánh giá lại và chuyển giao', purpose: 'Đối chiếu mục tiêu với post-check và exit ticket cá nhân.', estimatedMinutes: 5, teacherRole: 'Chốt một kết luận có căn cứ và chỉ ra bước tiếp theo.', studentAction: 'Tự giải dữ kiện mới, viết kết luận và điều cần kiểm chứng tiếp.', systemSupport: 'Lưu bằng chứng cá nhân; TV chỉ hiển thị tổng hợp.', },
      ],
    },
    objectives,
    knowledgeUnits: [{
      id: unitId,
      title: contract.title,
      objectiveIds,
      estimatedMinutes: 30,
      hookQuestion: contract.objectives.teacherSynthesisPrompt,
      knowledgeConclusion: contract.sourceContent?.formulas?.join('\n')
        || contract.curriculumBridges.map((bridge) => bridge.example).join('\n'),
      routes: (['M', 'S', 'C'] as const).map((route) => buildRouteContent(contract, route, objectiveIds)),
      quickCheck,
      maxRemediationAttempts: 2,
      coreTaskIds: contract.taskVariants.map((variant) => `${contract.id}-practice-${variant.route}`),
    }],
    diagnosticTest: buildAssessment(contract, 'diagnostic', `${contract.id}-diagnostic`),
    exitTicket: buildAssessment(contract, 'exit_ticket', `${contract.id}-exit-ticket`),
    pacingPolicy: {
      minExitTicketMinutes: 3,
      aheadThresholdMinutes: 3,
      behindThresholdMinutes: 3,
      stuckAfterRemediationAttempts: 2,
      enrichmentTriggerMastery: 0.85,
      supportTriggerMastery: 0.55,
    },
    generationWarnings: [
      `V4 candidate · source ${sourceKey} · fingerprint ${contract.sourceFingerprint ?? 'unknown'}.`,
      `Lesson mode: ${contract.lessonMode ?? 'unknown'}; elective route is a choice, not an ability label.`,
      'Giáo viên cần rà thuật ngữ/bản dịch và xuất bản thủ công trước khi mở phiên live.',
    ],
    generationSource: 'ai_json',
  };
}

import type { AdaptiveLesson, AdaptiveQuestion, LearningRoute } from './types';
import type {
  DeweyAdaptiveQuestion,
  DeweyKnowledgeUnit,
  DeweyLessonContent,
  DeweyOlympiaPack,
} from '../dewey/types';

function findRoute(unit: AdaptiveLesson['knowledgeUnits'][0], route: LearningRoute) {
  return (
    unit.routes.find(r => r.route === route) ||
    unit.routes.find(r => r.route === 'standard') ||
    unit.routes[0]
  );
}

function toAdaptiveQ(q: AdaptiveQuestion, points: number): DeweyAdaptiveQuestion {
  const opts = q.options?.length ? q.options : ['Đúng', 'Sai'];
  const cidx = Math.max(opts.indexOf(q.correctAnswer ?? ''), 0);
  return {
    id: q.id,
    type: 'multiple_choice',
    prompt: q.prompt,
    options: opts,
    correctIndex: cidx,
    theory: q.explanation,
    hint1: q.explanation,
    hint2: q.explanation,
    hint3: q.explanation,
    solution: q.explanation,
    points,
  };
}

const placeholder = (pts: number): DeweyAdaptiveQuestion => ({
  id: `placeholder-${pts}`,
  type: 'multiple_choice',
  prompt: 'Câu hỏi đang được chuẩn bị.',
  options: ['A', 'B', 'C', 'D'],
  correctIndex: 0,
  theory: '—',
  hint1: '—',
  hint2: '—',
  hint3: '—',
  solution: '—',
  points: pts,
});

export function adaptiveLessonToDeweyContent(
  lesson: AdaptiveLesson,
  route: LearningRoute = 'standard'
): DeweyLessonContent {
  // Pretest: lấy 5 câu đầu từ diagnosticTest
  const pretestQuestions = (lesson.diagnosticTest?.questions ?? []).slice(0, 5).map(q => {
    const opts = q.options?.slice(0, 2) ?? ['Đúng', 'Sai'];
    return {
      id: q.id,
      prompt: q.prompt,
      options: opts,
      correctIndex: Math.max(opts.indexOf(q.correctAnswer ?? ''), 0),
      explanation: q.explanation,
    };
  });

  // Knowledge Units: map mỗi unit → DeweyKnowledgeUnit
  const deweyUnits: DeweyKnowledgeUnit[] = (lesson.knowledgeUnits ?? []).map(unit => {
    const rc = findRoute(unit, route);
    const steps = [
      {
        id: 'step-explain',
        prompt: rc?.explanation ?? unit.title,
        inputPlaceholder: 'Viết suy nghĩ của em…',
        feedback: 'So sánh câu trả lời với gợi ý rồi tiếp tục.',
        formulaToNote: '',
      },
      ...(rc?.workedExamples ?? []).map((ex, i) => ({
        id: `step-ex-${i}`,
        prompt: ex.problem,
        inputPlaceholder: 'Viết đáp số hoặc lời giải…',
        expectedKeywords: ex.hints,
        feedback: ex.solution,
        formulaToNote: ex.explanation,
      })),
    ];
    return {
      id: unit.id,
      title: unit.title,
      socraticSteps: steps,
      conclusion: rc?.workedExamples?.[0]?.explanation ?? unit.title,
      formulaForNotebook: (rc?.explanation ?? unit.title).slice(0, 150),
    };
  });

  // Olympia packs: split quickCheck questions theo difficulty
  const allQC = (lesson.knowledgeUnits ?? []).flatMap(u => u.quickCheck?.questions ?? []);
  const easy = allQC.filter(q => q.difficulty === 'easy').map(q => toAdaptiveQ(q, 10));
  const med  = allQC.filter(q => q.difficulty === 'medium').map(q => toAdaptiveQ(q, 20));
  const hard = allQC.filter(q => q.difficulty === 'hard').map(q => toAdaptiveQ(q, 30));
  const packs: [DeweyOlympiaPack, DeweyOlympiaPack, DeweyOlympiaPack] = [
    { id: 'pack-10', packLabel: '10 điểm', questions: easy.length ? easy : [placeholder(10)] },
    { id: 'pack-20', packLabel: '20 điểm', questions: med.length  ? med  : [placeholder(20)] },
    { id: 'pack-30', packLabel: '30 điểm', questions: hard.length ? hard : [placeholder(30)] },
  ];

  const routeLabel =
    route === 'foundation' ? 'Cơ bản' : route === 'challenge' ? 'Nâng cao' : 'Chuẩn';

  return {
    title: lesson.title,
    subtitle: `Lớp ${lesson.grade} · Tuyến ${routeLabel}`,
    durationMinutes: lesson.durationMinutes,
    skipPretest: true,
    pretest: {
      durationMinutes: 5,
      questions: pretestQuestions,
      reviewSummary:
        lesson.preparation?.readingInstructions ?? 'Ôn tập nhanh kiến thức tiết trước.',
    },
    engage: {
      storyHook: lesson.preparation?.guidingQuestions?.[0] ?? lesson.title,
      interactiveSvgId: '',
      realityCheckMessage:
        lesson.preparation?.readingInstructions ?? 'Kiến thức này rất quan trọng trong thực tế!',
      guidingQuestion:
        lesson.preparation?.guidingQuestions?.[0] ?? 'Em sẽ học được gì hôm nay?',
      bigTitle: lesson.objectives?.[0]?.title ?? lesson.title,
      goalSetting: lesson.objectives?.length
        ? {
            heading: 'Đặt mục tiêu học tập',
            placeholder: 'Hôm nay em muốn học được gì?',
            aiButtonLabel: 'Phân tích mục tiêu',
            bloomFramework: {
              nhanbiet:
                lesson.objectives.find(o => o.bloomLevel === 'remember')?.title ??
                lesson.objectives[0]?.title ?? '',
              thonghieu:
                lesson.objectives.find(o => o.bloomLevel === 'understand')?.title ??
                lesson.objectives[1]?.title ?? '',
              vandung:
                lesson.objectives.find(o => o.bloomLevel === 'apply')?.title ??
                lesson.objectives[2]?.title ?? '',
            },
          }
        : undefined,
    },
    knowledgeUnits: deweyUnits,
    olympia: { packs },
    extend: {
      realWorldContext:
        lesson.exitTicket?.questions?.[0]?.prompt ?? 'Áp dụng kiến thức vào thực tế.',
      consequence:
        'Kiến thức này giúp em giải quyết các bài toán thực tiễn một cách tự tin.',
    },
    summary: {
      mindMapNodes: (lesson.objectives ?? []).map(o => ({ label: o.title })),
      checklistItems: (lesson.objectives ?? []).map(
        o => `Em có thể: ${o.description || o.title}`
      ),
      timeFillerOptions: [
        { label: 'Làm thêm câu hỏi Olympia', type: 'remaining_olympia' },
        { label: 'Đọc thêm câu chuyện mở rộng', type: 'extension_story' },
      ],
    },
  };
}

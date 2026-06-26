import type { AdaptiveLesson, AdaptiveQuestion, LearningRoute } from './types';
import type {
  DeweyAdaptiveQuestion,
  DeweyKnowledgeUnit,
  DeweyLessonContent,
  DeweyOlympiaPack,
} from '../dewey/types';
import { escapeAttribute, injectSimRuntime } from '../dewey/htmlShell';

/** HTML/ảnh sinh bất đồng bộ (Firestore, Kroki) nạp sẵn trước khi convert, key theo unit.id. */
export interface DeweyConversionAssets {
  /** srcDoc HTML mô phỏng cho từng mảnh (nạp từ Firestore lessonSimulations). */
  simulationHtmlByUnitId?: Record<string, string>;
  /** URL ảnh Kroki (tikz→svg) cho từng mảnh, nhúng dạng <img>. */
  tikzImgUrlByUnitId?: Record<string, string>;
}

/**
 * Hình minh hoạ màn Khởi động = MÔ PHỎNG sinh riêng TỪ tình huống mở đầu (storyHook) nên luôn khớp nội dung.
 * KHÔNG tái dùng gallery tổng quan của màn chào (gallery đó chỉ hợp ở màn chào, dễ lệch với storyHook cụ thể).
 */
const buildEngageIllustration = (
  engage: AdaptiveLesson['preparation']['engage'],
): { type: 'svg-inline'; data: string; caption: string } | undefined => {
  const sim = engage?.interactiveSimHtml?.trim();
  if (!sim) return undefined;
  const iframe = `<iframe sandbox="allow-scripts" loading="lazy" srcdoc="${escapeAttribute(injectSimRuntime(sim))}" style="width:100%;height:480px;border:0;border-radius:12px;background:white;"></iframe>`;
  return { type: 'svg-inline', data: iframe, caption: 'Hoạt động mô phỏng khởi động — thao tác để cảm nhận vấn đề trước khi học.' };
};

function findRoute(unit: AdaptiveLesson['knowledgeUnits'][0], route: LearningRoute) {
  return (
    unit.routes.find(r => r.route === route) ||
    unit.routes.find(r => r.route === 'standard') ||
    unit.routes[0]
  );
}

const DEWEY_META_LEAK_RE = /\b(UI\/?UX|7\s*:?\s*3|Socratic|bố cục|mục lục|đồng hồ|giao diện|thiết kế|wireframe|notebook|dashboard)\b/i;
const MATH_FRAGMENT_RE = /(^|[\s(])([A-Z]\.?\s*)?([a-zA-Z][\w']*\^\{?[-\w]+\}?\s*=\s*[-+]?\s*\d|[A-Z]_[12]?\s*\([-+]?\d+\s*[;,]\s*[-+]?\d+\)|[a-zA-Z]\^\{?\d+\}?\s*[+\-=])/g;

const stripMetaLeaks = (value: string | undefined, fallback: string): string => {
  const text = value?.trim();
  if (!text || DEWEY_META_LEAK_RE.test(text)) return fallback;
  return text;
};

const normalizeLatexText = (value: string | undefined, fallback = ''): string => {
  const text = (value?.trim() || fallback).replace(/\\\\(frac|sqrt|Delta|alpha|beta|gamma|displaystyle|left|right|cdot|pm|le|ge|ne|infty|sin|cos|tan)/g, '\\$1');
  return text.replace(MATH_FRAGMENT_RE, (match, prefix) => {
    if (match.includes('$')) return match;
    return `${prefix || ''}$${match.slice((prefix || '').length).trim()}$`;
  }).replace(/\$\\frac/g, '$\\displaystyle \\frac');
};

const cleanOptions = (options: string[] | undefined): string[] => {
  const raw = options?.length ? options : ['Đúng', 'Sai'];
  return raw.map(option => normalizeLatexText(option, option));
};

function toAdaptiveQ(q: AdaptiveQuestion, points: number): DeweyAdaptiveQuestion {
  const opts = cleanOptions(q.options);
  const cidx = Math.max(opts.indexOf(q.correctAnswer ?? ''), 0);
  return {
    id: q.id,
    type: 'multiple_choice',
    prompt: normalizeLatexText(q.prompt, 'Câu hỏi đang được chuẩn bị.'),
    options: opts,
    correctIndex: cidx,
    theory: normalizeLatexText(q.explanation, 'Xem lại phần kiến thức liên quan.'),
    hint1: normalizeLatexText(q.explanation, 'Xem lại phần kiến thức liên quan.'),
    hint2: normalizeLatexText(q.explanation, 'Xem lại phần kiến thức liên quan.'),
    hint3: normalizeLatexText(q.explanation, 'Xem lại phần kiến thức liên quan.'),
    solution: normalizeLatexText(q.explanation, 'Xem lại phần kiến thức liên quan.'),
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
  route: LearningRoute = 'standard',
  assets: DeweyConversionAssets = {}
): DeweyLessonContent {
  // Pretest: lấy 5 câu đầu từ diagnosticTest
  const pretestQuestions = (lesson.diagnosticTest?.questions ?? []).slice(0, 5).map(q => {
    const opts = cleanOptions(q.options).slice(0, 4);
    return {
      id: q.id,
      prompt: normalizeLatexText(q.prompt, 'Câu hỏi đang được chuẩn bị.'),
      options: opts,
      correctIndex: Math.max(opts.indexOf(q.correctAnswer ?? ''), 0),
      explanation: normalizeLatexText(q.explanation, 'Xem lại phần kiến thức liên quan.'),
    };
  });

  // Knowledge Units: map mỗi unit → DeweyKnowledgeUnit
  const deweyUnits: DeweyKnowledgeUnit[] = (lesson.knowledgeUnits ?? []).map(unit => {
    const rc = findRoute(unit, route);
    const firstExample = rc?.workedExamples?.[0];
    const routeExplain = normalizeLatexText(rc?.explanation, '');
    const tikzImgUrl = assets.tikzImgUrlByUnitId?.[unit.id];
    const tikzIllustration = tikzImgUrl
      ? `<img src="${escapeAttribute(tikzImgUrl)}" alt="Hình minh hoạ ${escapeAttribute(unit.title)}" loading="lazy">`
      : undefined;
    const guidingQuestions = rc?.guidingQuestions ?? [];
    const guidingAnswers = rc?.guidingAnswers ?? [];

    // Bước gợi mở (nếu có) — gắn hình minh hoạ TikZ vào đây
    const hookSteps = unit.hookQuestion
      ? [{
          id: 'step-hook',
          prompt: normalizeLatexText(unit.hookQuestion, unit.title),
          inputPlaceholder: 'Ghi nhanh dự đoán của em…',
          feedback: 'Ghi lại dự đoán rồi đối chiếu khi học — chưa chắc cũng không sao.',
          formulaToNote: '',
          ...(tikzIllustration ? { illustrationHtml: tikzIllustration } : {}),
        }]
      : [];

    // Mỗi câu hỏi dẫn dắt = 1 bước NGẮN, kèm đáp án/gợi ý THẬT
    const guidingSteps = guidingQuestions.map((q, i) => {
      const ans = (guidingAnswers[i] || '').trim();
      const step: DeweyKnowledgeUnit['socraticSteps'][number] = {
        id: `step-guide-${i}`,
        prompt: normalizeLatexText(q, unit.title),
        inputPlaceholder: 'Viết suy nghĩ hoặc câu trả lời của em…',
        feedback: ans ? normalizeLatexText(ans, '') : (routeExplain || 'Đối chiếu với phần chốt kiến thức ở cuối hoạt động.'),
        formulaToNote: '',
      };
      if (!unit.hookQuestion && i === 0 && tikzIllustration) step.illustrationHtml = tikzIllustration;
      return step;
    });
    const exampleSteps = (rc?.workedExamples ?? []).map((ex, i) => ({
      id: `step-ex-${i}`,
      prompt: normalizeLatexText(ex.problem, unit.title),
      inputPlaceholder: 'Viết đáp số hoặc lời giải…',
      expectedKeywords: ex.hints,
      feedback: normalizeLatexText(ex.explanation || ex.solution || ex.hints?.join('\n'), 'Xem lời giải mẫu trong giáo án.'),
      formulaToNote: '',
    }));

    let steps = [...hookSteps, ...guidingSteps, ...exampleSteps];
    if (steps.length === 0) {
      steps = [{
        id: 'step-explain',
        prompt: normalizeLatexText(routeExplain || `Tìm hiểu: ${unit.title}`, unit.title),
        inputPlaceholder: 'Viết suy nghĩ của em…',
        feedback: routeExplain || 'Xem lại phần giải thích của bài học.',
        formulaToNote: '',
        ...(tikzIllustration ? { illustrationHtml: tikzIllustration } : {}),
      }];
    }
    const simSrcDoc = (assets.simulationHtmlByUnitId?.[unit.id] || unit.simulationSpec?.html?.srcDoc || '').trim();
    const simulationHtml = simSrcDoc
      ? {
          title: unit.simulationSpec?.title || `Mô phỏng tương tác — ${unit.title}`,
          description: unit.simulationSpec?.description || '',
          srcDoc: simSrcDoc,
          height: unit.simulationSpec?.html?.height || 460,
        }
      : undefined;
    return {
      id: unit.id,
      title: unit.title,
      socraticSteps: steps,
      conclusion: normalizeLatexText(unit.knowledgeConclusion || firstExample?.explanation, unit.title),
      // Vở ghi = phần CHỐT kiến thức (công thức/định nghĩa cốt lõi), không phải đoạn giải thích dài.
      formulaForNotebook: normalizeLatexText(unit.knowledgeConclusion || firstExample?.solution || unit.title, unit.title).slice(0, 320),
      ...(simulationHtml ? { simulationHtml } : {}),
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
  const engageData = lesson.preparation?.engage;
  const routeGoal = engageData?.routeGoals?.[route];
  const engageIllustration = buildEngageIllustration(engageData);
  const fallbackGuidingQuestion =
    lesson.preparation?.guidingQuestions?.find(question => /\?$/.test(question.trim())) ||
    lesson.preparation?.guidingQuestions?.[0] ||
    'Em sẽ học được gì hôm nay?';

  const goalBloomFramework = {
    nhanbiet:
      engageData?.routeGoals?.foundation ||
      lesson.objectives.find(o => o.bloomLevel === 'remember' || o.bloomLevel === 'understand')?.title ||
      lesson.objectives[0]?.title || '',
    thonghieu:
      engageData?.routeGoals?.standard ||
      lesson.objectives.find(o => o.bloomLevel === 'apply')?.title ||
      lesson.objectives[1]?.title || '',
    vandung:
      engageData?.routeGoals?.challenge ||
      lesson.objectives.find(o => o.bloomLevel === 'analyze')?.title ||
      lesson.objectives[2]?.title || '',
  };

  return {
    lessonId: lesson.id,
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
      storyHook: normalizeLatexText(stripMetaLeaks(engageData?.storyHook || lesson.preparation?.guidingQuestions?.[0], `Hôm nay em sẽ khám phá bài học "${lesson.title}" qua các câu hỏi, ví dụ và hoạt động luyện tập cụ thể.`)),
      interactiveSvgId: '',
      ...(engageIllustration ? { illustration: engageIllustration } : {}),
      realityCheckMessage: normalizeLatexText(stripMetaLeaks(
        engageData?.realityCheckMessage || lesson.preparation?.readingInstructions,
        `Hãy quan sát vấn đề trung tâm của bài "${lesson.title}" và dự đoán cách giải trước khi học chi tiết.`,
      )),
      guidingQuestion: normalizeLatexText(stripMetaLeaks(engageData?.guidingQuestion || engageData?.guidingQuestionBox || fallbackGuidingQuestion, fallbackGuidingQuestion)),
      bigTitle: normalizeLatexText(stripMetaLeaks(engageData?.bigTitle || routeGoal, lesson.objectives?.[0]?.title || lesson.title)),
      goalSetting: lesson.objectives?.length
        ? {
            heading: 'Đặt mục tiêu học tập',
            placeholder:
              engageData?.studentExpectationPrompt ||
              `Sau bài "${lesson.title}", em muốn tự tin giải được dạng toán nào?`,
            aiButtonLabel: 'Phân tích mục tiêu',
            bloomFramework: goalBloomFramework,
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

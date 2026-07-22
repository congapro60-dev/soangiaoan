import type { AdaptiveLesson, AdaptiveQuestion, LearningRoute, PracticeSet, PracticeMCQ, PracticeTFGroup, PracticeShort, PracticeEssay } from './types';
import type {
  DeweyAdaptiveQuestion,
  DeweyKnowledgeUnit,
  DeweyLessonContent,
  DeweyOlympiaPack,
} from '../dewey/types';
import { escapeAttribute } from '../dewey/htmlShell';
import { sanitizeDisplayText, stripInlineMarkdown } from './mathText';

/** HTML/ảnh sinh bất đồng bộ (Firestore, Kroki) nạp sẵn trước khi convert, key theo unit.id. */
export interface DeweyConversionAssets {
  /** srcDoc HTML mô phỏng cho từng mảnh (nạp từ Firestore lessonSimulations). */
  simulationHtmlByUnitId?: Record<string, string>;
  /** SVG TikZ đã render & xác thực (Kroki), nhúng inline — chỉ chứa SVG hợp lệ, ảnh lỗi bị bỏ. */
  tikzSvgByUnitId?: Record<string, string>;
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
  const iframe = `<iframe sandbox="allow-scripts" loading="lazy" srcdoc="${escapeAttribute(sim)}" style="width:100%;height:600px;border:0;border-radius:12px;background:white;"></iframe>`;
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

const stripMetaLeaks = (value: string | undefined, fallback: string): string => {
  const text = value?.trim();
  if (!text || DEWEY_META_LEAK_RE.test(text)) return fallback;
  return text;
};

/**
 * Chuẩn hoá text có công thức — nay uỷ quyền toàn bộ cho mathText.sanitizeDisplayText
 * (D1 QA đợt 9: token-aware, không bao giờ chèn `$` vào trong vùng math có sẵn).
 */
const normalizeLatexText = (value: string | undefined, fallback = ''): string =>
  sanitizeDisplayText(value?.trim() || fallback);

/** Tách lời giải/kết luận thành mỗi bước một dòng (render với CSS white-space:pre-line). */
const STEP_LEAD = '(?:Gọi|Ta có|Ta được|Suy ra|Do đó|Vậy|Áp dụng|Sau khi|Vì vậy|Khi đó|Từ đó|Xét|Mặt khác|Bước\\s*\\d+|Kết luận)';
const formatStepLines = (text: string): string =>
  (text || '')
    // xuống dòng khi hết câu (. ) : ) mà câu sau bắt đầu bằng cụm dẫn bước
    .replace(new RegExp(`([.):])\\s+(?=${STEP_LEAD})`, 'g'), '$1\n')
    // ép xuống dòng trước "Bước N:" và "Kết luận:" dù không có dấu câu phía trước
    .replace(/\s*(Bước\s*\d+\s*[:.)])/gi, '\n$1')
    .replace(/\s*(Kết luận\s*[:.])/gi, '\n$1')
    .replace(/\n{2,}/g, '\n')
    .replace(/^\n+/, '')
    .trim();

const cleanOptions = (options: string[] | undefined): string[] => {
  const raw = options?.length ? options : ['Đúng', 'Sai'];
  // sanitizeDisplayText đã tự vá $ lẻ + bọc lệnh LaTeX trần (thay ensureMathDelimiters cũ).
  return raw.map(option => sanitizeDisplayText(stripInlineMarkdown(option)) || option);
};

/**
 * Tìm index đáp án đúng KHÔNG bị lệ thuộc chuẩn hoá: ưu tiên khớp phương án THÔ với correctAnswer thô,
 * rồi mới so bản chuẩn hoá, rồi suy theo chữ cái A–D. Khắc phục lỗi cũ default về A (E6).
 */
const resolveCorrectIndex = (rawOptions: string[], cleaned: string[], correct: string | undefined): number => {
  const c = (correct ?? '').trim();
  if (!c) return 0;
  let i = rawOptions.findIndex(o => o.trim() === c);
  if (i >= 0) return i;
  const nc = normalizeLatexText(c, c).trim();
  i = cleaned.findIndex(o => o.trim() === nc);
  if (i >= 0) return i;
  const letter = c.match(/^\(?([A-D])[).．.\s]/i) || c.match(/^([A-D])$/i);
  if (letter) {
    const idx = letter[1].toUpperCase().charCodeAt(0) - 65;
    if (idx >= 0 && idx < cleaned.length) return idx;
  }
  return 0;
};

// Tầng 1 luôn là nhắc lý thuyết chung — KHÔNG lộ đáp số (yêu cầu: sai 1 lần không lòi bài chữa).
const GENERIC_TIER0 = 'Nhớ lại định nghĩa/công thức liên quan của phần này rồi thử lại — chưa cần xem lời giải.';

/**
 * Tự TÁCH lời giải đầy đủ thành 4 tầng hỗ trợ tiến dần khi không có hints do AI sinh.
 * Trả về [theory, hint1, hint2, hint3]; solution (full) xử lý riêng ở toAdaptiveQ.
 */
function synthesizeHintTiers(solution: string): [string, string, string, string] {
  const steps = solution.split('\n').map(s => s.trim()).filter(Boolean);
  if (steps.length >= 3) {
    return [
      GENERIC_TIER0,
      steps[0],
      steps.slice(0, 2).join('\n'),
      steps.slice(0, steps.length - 1).join('\n'), // tới gần đáp số, giữ lại bước cuối
    ];
  }
  if (steps.length === 2) {
    return [GENERIC_TIER0, steps[0], steps[0], steps.join('\n')];
  }
  // 0–1 bước, không tách được: tầng đầu vẫn không lộ đáp án.
  return [
    GENERIC_TIER0,
    'Xác định dạng bài và công thức/định nghĩa cần dùng.',
    'Thay dữ kiện đã cho vào công thức rồi tính từng bước.',
    solution || 'Xem lời giải đầy đủ bên dưới.',
  ];
}

function toAdaptiveQ(q: AdaptiveQuestion, points: number): DeweyAdaptiveQuestion {
  const rawOpts = q.options?.length ? q.options : ['Đúng', 'Sai'];
  const opts = cleanOptions(q.options);
  const cidx = resolveCorrectIndex(rawOpts, opts, q.correctAnswer);
  const solution = formatStepLines(normalizeLatexText(q.explanation, 'Xem lại phần kiến thức liên quan.'));
  // Ưu tiên 4 tầng từ hints AI sinh; thiếu thì tự tách từ lời giải. Lấp ô trống từ bản tự tách.
  const aiHints = (q.hints ?? [])
    .map(h => formatStepLines(normalizeLatexText(h, '')))
    .filter(Boolean);
  const synth = synthesizeHintTiers(solution);
  const tier = (i: number): string => aiHints[i] || synth[i];
  return {
    id: q.id,
    type: 'multiple_choice',
    prompt: normalizeLatexText(q.prompt, 'Câu hỏi đang được chuẩn bị.'),
    options: opts,
    correctIndex: cidx,
    theory: tier(0),
    hint1: tier(1),
    hint2: tier(2),
    hint3: tier(3),
    solution,
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

// ─── E9: dựng 3 gói Luyện tập có cấu trúc từ practiceSet ───
let practiceUid = 0;
const pid = (): string => `prac-${++practiceUid}`;

const buildTiers = (explanation: string, hints?: string[]) => {
  const solution = formatStepLines(normalizeLatexText(explanation, 'Xem lại phần kiến thức liên quan.'));
  const aiHints = (hints ?? []).map(h => formatStepLines(normalizeLatexText(h, ''))).filter(Boolean);
  const synth = synthesizeHintTiers(solution);
  const tier = (i: number): string => aiHints[i] || synth[i];
  return { theory: tier(0), hint1: tier(1), hint2: tier(2), hint3: tier(3), solution };
};

const mcqToDewey = (m: PracticeMCQ, points: number): DeweyAdaptiveQuestion => {
  const opts = cleanOptions(m.options);
  const ci = Math.min(Math.max(m.correctIndex ?? 0, 0), Math.max(opts.length - 1, 0));
  return { id: pid(), type: 'multiple_choice', prompt: normalizeLatexText(m.prompt, 'Câu hỏi đang được chuẩn bị.'), options: opts, correctIndex: ci, ...buildTiers(m.explanation, m.hints), points };
};

const tfToDewey = (g: PracticeTFGroup, points: number): DeweyAdaptiveQuestion => ({
  id: pid(),
  type: 'true_false_group',
  prompt: normalizeLatexText(g.context, 'Xét các phát biểu sau:'),
  statements: (g.statements ?? []).slice(0, 4).map(s => ({
    text: normalizeLatexText(s.text, ''),
    correct: Boolean(s.correct),
    hint: s.hint ? formatStepLines(normalizeLatexText(s.hint, '')) : undefined,
  })),
  theory: '', hint1: '', hint2: '', hint3: '',
  solution: formatStepLines(normalizeLatexText(g.explanation, '')),
  points,
});

const shortToDewey = (s: PracticeShort, points: number): DeweyAdaptiveQuestion => {
  const num = Number(String(s.answer ?? '').replace(',', '.'));
  return {
    id: pid(),
    type: 'short_answer',
    prompt: normalizeLatexText(s.prompt, 'Câu hỏi đang được chuẩn bị.'),
    correctNumeric: Number.isFinite(num) ? num : undefined,
    tolerance: s.tolerance ?? 0,
    ...buildTiers(s.explanation, s.hints),
    points,
  };
};

const essayToDewey = (e: PracticeEssay, points: number): DeweyAdaptiveQuestion => ({
  id: pid(),
  type: 'essay',
  prompt: normalizeLatexText(e.prompt, 'Câu tự luận đang được chuẩn bị.'),
  essayParts: (e.parts ?? []).slice(0, 4).map(p => ({
    prompt: normalizeLatexText(p.prompt, ''),
    hint: formatStepLines(normalizeLatexText(p.hint, '')),
    answer: formatStepLines(normalizeLatexText(p.answer, '')),
  })),
  theory: '', hint1: '', hint2: '', hint3: '', solution: '',
  points,
});

const buildStructuredPacks = (ps: PracticeSet): [DeweyOlympiaPack, DeweyOlympiaPack, DeweyOlympiaPack] => {
  const recognition = (ps.recognition ?? []).slice(0, 4).map(m => mcqToDewey(m, 5));
  const comprehension = (ps.comprehension ?? []).slice(0, 2).map(g => tfToDewey(g, 10));
  const shorts = (ps.application?.short ?? []).slice(0, 2).map(s => shortToDewey(s, 5));
  const essay = ps.application?.essay ? [essayToDewey(ps.application.essay, 10)] : [];
  const vandung = [...shorts, ...essay];
  return [
    { id: 'pack-nhanbiet', packLabel: 'Nhận biết', questions: recognition.length ? recognition : [placeholder(5)] },
    { id: 'pack-thonghieu', packLabel: 'Thông hiểu', questions: comprehension.length ? comprehension : [placeholder(10)] },
    { id: 'pack-vandung', packLabel: 'Vận dụng', questions: vandung.length ? vandung : [placeholder(5)] },
  ];
};

export function adaptiveLessonToDeweyContent(
  lesson: AdaptiveLesson,
  route: LearningRoute = 'standard',
  assets: DeweyConversionAssets = {}
): DeweyLessonContent {
  // Pretest: lấy 5 câu đầu từ diagnosticTest
  const pretestQuestions = (lesson.diagnosticTest?.questions ?? []).slice(0, 5).map(q => {
    const rawOpts = (q.options ?? []).slice(0, 4);
    const opts = cleanOptions(q.options).slice(0, 4);
    return {
      id: q.id,
      prompt: normalizeLatexText(q.prompt, 'Câu hỏi đang được chuẩn bị.'),
      options: opts,
      correctIndex: resolveCorrectIndex(rawOpts, opts, q.correctAnswer),
      explanation: normalizeLatexText(q.explanation, 'Xem lại phần kiến thức liên quan.'),
    };
  });

  // Knowledge Units: map mỗi unit → DeweyKnowledgeUnit
  const deweyUnits: DeweyKnowledgeUnit[] = (lesson.knowledgeUnits ?? []).map(unit => {
    const rc = findRoute(unit, route);
    const firstExample = rc?.workedExamples?.[0];
    const routeExplain = normalizeLatexText(rc?.explanation, '');
    const tikzSvg = assets.tikzSvgByUnitId?.[unit.id];
    const tikzIllustration = tikzSvg
      ? `<div class="tikz-figure" role="img" aria-label="Hình minh hoạ ${escapeAttribute(unit.title)}">${tikzSvg}</div>`
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
        feedback: ans ? formatStepLines(normalizeLatexText(ans, '')) : (routeExplain || 'Đối chiếu với phần chốt kiến thức ở cuối hoạt động.'),
        formulaToNote: '',
      };
      if (!unit.hookQuestion && i === 0 && tikzIllustration) step.illustrationHtml = tikzIllustration;
      return step;
    });
    const exampleSteps = (rc?.workedExamples ?? []).map((ex, i) => ({
      id: `step-ex-${i}`,
      prompt: normalizeLatexText(ex.problem, unit.title),
      inputPlaceholder: ex.responseMode === 'image_upload'
        ? 'Viết ý tưởng nháp trước khi chụp ảnh bài làm…'
        : 'Viết đáp số hoặc lời giải…',
      expectedKeywords: ex.hints,
      feedback: formatStepLines(normalizeLatexText(ex.explanation || ex.solution || ex.hints?.join('\n'), 'Xem lời giải mẫu trong giáo án.')),
      formulaToNote: '',
      ...(ex.responseMode === 'image_upload' ? {
        responseMode: 'image_upload' as const,
        aiRubric: ex.aiRubric || '',
      } : {}),
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
      conclusion: formatStepLines(normalizeLatexText(unit.knowledgeConclusion || firstExample?.explanation, unit.title)),
      // Vở ghi = phần CHỐT kiến thức (công thức/định nghĩa cốt lõi), không phải đoạn giải thích dài.
      formulaForNotebook: normalizeLatexText(unit.knowledgeConclusion || firstExample?.solution || unit.title, unit.title).slice(0, 320),
      ...(simulationHtml ? { simulationHtml } : {}),
    };
  });

  // Hình minh hoạ "tự vẽ" (TikZ SVG đã xác thực) theo từng mảnh — tái dùng cho một số câu luyện tập + màn vận dụng.
  const tikzByUnit = assets.tikzSvgByUnitId ?? {};
  const simByUnit = assets.simulationHtmlByUnitId ?? {};
  const figureHtml = (svg: string, label: string): string =>
    `<div class="tikz-figure" role="img" aria-label="${escapeAttribute(label)}">${svg}</div>`;

  // Olympia: chia ĐỀU câu hỏi quick check thành 3 gói, MỖI GÓI 3–4 câu (sắp theo độ khó tăng dần).
  const difficultyRank = (d: string) => (d === 'easy' ? 0 : d === 'medium' ? 1 : 2);
  const allQC = (lesson.knowledgeUnits ?? [])
    .flatMap(u => (u.quickCheck?.questions ?? []).map(q => ({ q, unitId: u.id, unitTitle: u.title })))
    .sort((a, b) => difficultyRank(a.q.difficulty) - difficultyRank(b.q.difficulty));
  const n = allQC.length;
  const base = Math.floor(n / 3);
  const rem = n % 3;
  const counts = [base + (rem > 0 ? 1 : 0), base + (rem > 1 ? 1 : 0), base];
  const packPoints = [10, 20, 30];
  let cursor = 0;
  // Mỗi mảnh chỉ gắn hình vào CÂU ĐẦU thuộc mảnh đó (đỡ trùng) → chỉ "một số câu" có hình.
  const figureUsedUnits = new Set<string>();
  // E9: bài MỚI có practiceSet → 3 gói Nhận biết/Thông hiểu/Vận dụng; bài CŨ → fallback chia quick check theo điểm.
  const packs: [DeweyOlympiaPack, DeweyOlympiaPack, DeweyOlympiaPack] = lesson.practiceSet
    ? buildStructuredPacks(lesson.practiceSet)
    : ([0, 1, 2].map(i => {
        const slice = allQC.slice(cursor, cursor + counts[i]);
        cursor += counts[i];
        const qs = slice.map(item => {
          const dq = toAdaptiveQ(item.q, packPoints[i]);
          const svg = tikzByUnit[item.unitId];
          if (svg && !figureUsedUnits.has(item.unitId)) {
            figureUsedUnits.add(item.unitId);
            dq.illustrationHtml = figureHtml(svg, `Hình minh hoạ: ${item.unitTitle}`);
          }
          return dq;
        });
        return {
          id: `pack-${packPoints[i]}`,
          // F5: nhãn gói fallback đồng bộ quy ước E9 (bài cũ không có practiceSet vẫn thấy nhãn mới).
          packLabel: ['Nhận biết', 'Thông hiểu', 'Vận dụng'][i],
          questions: qs.length ? qs : [placeholder(packPoints[i])],
        };
      }) as [DeweyOlympiaPack, DeweyOlympiaPack, DeweyOlympiaPack]);

  // Vận dụng: CHỈ nhúng mô phỏng/hình của MẢNH KHỚP đề vận dụng (token đặc trưng có trong đề),
  // tránh lệch đề như cũ (E8 — đề Parabol nhưng nhúng sim Elip). Không khớp → không nhúng gì.
  const normVi = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const tokensOf = (s: string) => normVi(s).split(/[^a-z0-9]+/).filter(w => w.length >= 4);
  const extendUnits = lesson.knowledgeUnits ?? [];
  const tokenUnitCount: Record<string, number> = {};
  extendUnits.forEach(u => [...new Set(tokensOf(u.title))].forEach(t => { tokenUnitCount[t] = (tokenUnitCount[t] || 0) + 1; }));
  const extendProblemTokens = normVi(`${lesson.exitTicket?.questions?.[0]?.prompt ?? ''} ${lesson.title}`);
  // token đặc trưng = chỉ xuất hiện ở 1 mảnh (vd "parabol") → loại các từ chung "phuong/trinh/chinh/tac".
  const matchedUnit = extendUnits.find(u => tokensOf(u.title).some(t => tokenUnitCount[t] === 1 && extendProblemTokens.includes(t)));
  const matchedSimSrc = matchedUnit ? (simByUnit[matchedUnit.id] || matchedUnit.simulationSpec?.html?.srcDoc || '').trim() : '';
  const matchedFigSvg = matchedUnit ? (tikzByUnit[matchedUnit.id] || '').trim() : '';
  const extendIllustration = matchedSimSrc
    ? `<div class="unit-simulation"><iframe class="sim-frame" sandbox="allow-scripts" loading="lazy" srcdoc="${escapeAttribute(matchedSimSrc)}" style="width:100%;height:600px;border:0;border-radius:12px;"></iframe></div>`
    : matchedFigSvg
      ? figureHtml(matchedFigSvg, `Hình minh hoạ: ${matchedUnit?.title ?? 'vận dụng'}`)
      : undefined;

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

  // Hoạt động "còn thừa thời gian": ưu tiên nội dung AI sinh (lesson.bonusChallenge),
  // thiếu thì TÁI DÙNG ví dụ mẫu khó nhất / vận dụng / tình huống mở đầu (áp dụng ngay cho mọi bài).
  const extendRealWorld = lesson.exitTicket?.questions?.[0]?.prompt ?? 'Áp dụng kiến thức vào thực tế.';
  const aiBonus = lesson.bonusChallenge;
  const allWorked = (lesson.knowledgeUnits ?? []).flatMap(u => findRoute(u, route)?.workedExamples ?? []);
  const hardestWorked = allWorked[allWorked.length - 1];
  const advancedProblem = aiBonus?.advancedProblem
    ? { prompt: normalizeLatexText(aiBonus.advancedProblem.prompt, ''), solution: formatStepLines(normalizeLatexText(aiBonus.advancedProblem.solution, '')) }
    : hardestWorked
      ? { prompt: normalizeLatexText(hardestWorked.problem, ''), solution: formatStepLines(normalizeLatexText(hardestWorked.solution || hardestWorked.explanation, '')) }
      : undefined;
  const applicationProblem = aiBonus?.applicationProblem
    ? { prompt: normalizeLatexText(aiBonus.applicationProblem.prompt, ''), solution: formatStepLines(normalizeLatexText(aiBonus.applicationProblem.solution, '')) }
    : { prompt: normalizeLatexText(extendRealWorld, ''), solution: '' };
  const readingProblem = normalizeLatexText(aiBonus?.readingProblem || stripMetaLeaks(engageData?.storyHook, '') || '', '');
  const videoKeywords = (aiBonus?.videoKeywords || `${lesson.title} Toán lớp ${lesson.grade}`).trim();
  const bonusChallenge = {
    ...(advancedProblem && advancedProblem.prompt ? { advancedProblem } : {}),
    ...(applicationProblem.prompt ? { applicationProblem } : {}),
    ...(readingProblem ? { readingProblem } : {}),
    videoUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(videoKeywords)}`,
    videoLabel: `Tìm video: ${videoKeywords}`,
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
      realWorldContext: extendRealWorld,
      consequence:
        'Kiến thức này giúp em giải quyết các bài toán thực tiễn một cách tự tin.',
      ...(extendIllustration ? { illustrationHtml: extendIllustration } : {}),
    },
    summary: {
      mindMapNodes: (lesson.objectives ?? []).map(o => ({ label: o.title })),
      checklistItems: (lesson.objectives ?? []).map(
        o => `Em có thể: ${o.description || o.title}`
      ),
      timeFillerOptions: [],
      bonusChallenge,
    },
  };
}

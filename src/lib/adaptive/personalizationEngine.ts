/**
 * PA3 — Real-time Personalization Engine
 *
 * After a student submits the diagnostic pre-test, this engine:
 *   1. Determines the student's route (foundation/standard/challenge) and weak objectives
 *   2. Builds a focused prompt asking AI to generate personalised explanations/examples
 *   3. Applies the patch to a copy of the lesson before Dewey rendering
 *
 * Caching strategy:
 *   - Session-level Map (in-memory) keyed by lessonId + route + sorted weakObjectiveIds
 *   - Shared Promise: if two students hit the same cache miss simultaneously, they share
 *     one AI call instead of firing two concurrent requests
 *
 * Fallback: if AI fails or times out after PERSONALIZATION_TIMEOUT_MS, the original
 * lesson content is returned unchanged — students are never blocked.
 */

import type { AdaptiveLesson, LearningRoute } from './types';

// ── Timeout & helpers ──────────────────────────────────────────────────────────

const PERSONALIZATION_TIMEOUT_MS = 15_000; // 15 s hard timeout

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Personalization timeout after ${ms}ms`)), ms)
    ),
  ]);

// ── JSON extraction (same pattern as adaptiveFromLessonPlan) ──────────────────

const extractJsonBlock = (text: string): string => {
  let raw = text;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) raw = fence[1].trim();
  else {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) raw = text.slice(start, end + 1);
  }
  return raw.replace(/\\([^"\\nrt/bf])/g, '\\\\$1');
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface PersonalizedUnitPatch {
  unitId: string;
  personalized_explanation: string;
  personalized_example?: {
    problem: string;
    solution: string;
    hints?: string[];
  };
}

interface PersonalizationJson {
  units?: PersonalizedUnitPatch[];
  motivational_message?: string;
}

// ── Cache ─────────────────────────────────────────────────────────────────────

/** In-memory cache: cacheKey → resolved personalized lesson (shared across concurrent requests). */
const resolvedCache = new Map<string, AdaptiveLesson>();

/** Pending promises: cacheKey → in-flight Promise (shared to prevent duplicate API calls). */
const pendingPersonalizations = new Map<string, Promise<AdaptiveLesson>>();

const getCacheKey = (lessonId: string, route: LearningRoute, weakObjectiveIds: string[]): string =>
  `${lessonId}__${route}__${[...weakObjectiveIds].sort().join('-')}`;

// ── Prompt builder ────────────────────────────────────────────────────────────

export const buildPersonalizationPrompt = (
  lesson: AdaptiveLesson,
  route: LearningRoute,
  weakObjectiveIds: string[],
): string => {
  const routeLabel = route === 'foundation' ? 'Cơ bản (Foundation)' : route === 'challenge' ? 'Nâng cao (Challenge)' : 'Chuẩn (Standard)';
  const weakObjectiveTitles = lesson.objectives
    .filter(o => weakObjectiveIds.includes(o.id))
    .map(o => o.title);
  const unitSummaries = lesson.knowledgeUnits
    .slice(0, 4)
    .map(u => `- ID: ${u.id} | Tiêu đề: ${u.title}`)
    .join('\n');

  return `Bạn là chuyên gia dạy học thích ứng môn Toán phổ thông.

TÌNH HUỐNG:
- Bài học: "${lesson.title}" (Lớp ${lesson.grade})
- Học sinh vừa làm pre-test, được xếp tuyến: ${routeLabel}
- Mục tiêu học sinh đang yếu (cần hỗ trợ thêm):
${weakObjectiveTitles.length ? weakObjectiveTitles.map(t => `  • ${t}`).join('\n') : '  (Không có mục tiêu yếu rõ ràng — học sinh ở mức trung bình)'}

DANH SÁCH MẢNH KIẾN THỨC (knowledge units) của bài:
${unitSummaries}

NHIỆM VỤ: Tạo nội dung cá nhân hoá ngắn gọn, phù hợp với tuyến ${routeLabel} và điểm yếu của học sinh này.

OUTPUT: Trả về DUY NHẤT một JSON object hợp lệ. Không có text trước/sau JSON.

{
  "units": [
    {
      "unitId": "id của unit (lấy từ danh sách trên)",
      "personalized_explanation": "Giải thích ngắn gọn (3-5 câu), phù hợp tuyến ${routeLabel}, tập trung vào điểm yếu đã xác định. Dùng LaTeX cho công thức.",
      "personalized_example": {
        "problem": "Bài toán phù hợp độ khó tuyến ${routeLabel}, có số liệu cụ thể",
        "solution": "Lời giải từng bước, ngắn gọn",
        "hints": ["Gợi ý 1 phù hợp tuyến", "Gợi ý 2", "Gợi ý 3"]
      }
    }
  ],
  "motivational_message": "Lời động viên ngắn (1 câu) phù hợp với tuyến ${routeLabel}"
}

QUY TẮC:
- unitId PHẢI khớp chính xác với id trong danh sách mảnh kiến thức trên.
- Tuyến Foundation: giải thích đơn giản, dùng ví dụ số cụ thể, chia bước nhỏ, tránh ký hiệu trừu tượng.
- Tuyến Standard: giải thích chuẩn SGK, cân bằng lý thuyết và ví dụ.
- Tuyến Challenge: giải thích nâng cao, có thể đặt câu hỏi mở, kết nối với kiến thức rộng hơn.
- Nếu không có mục tiêu yếu, vẫn tạo nội dung phù hợp tuyến nhưng không nhấn mạnh điểm yếu.
- Trả về JSON thuần túy, không markdown.`;
};

// ── Patch applicator ──────────────────────────────────────────────────────────

/**
 * Deep-clones the lesson and patches explanation + worked_example for each unit
 * found in the personalization JSON. Units not mentioned are left unchanged.
 */
const applyPersonalizationPatch = (
  lesson: AdaptiveLesson,
  patch: PersonalizationJson,
  route: LearningRoute,
): AdaptiveLesson => {
  if (!patch.units?.length) return lesson;

  const patchMap = new Map<string, PersonalizedUnitPatch>(
    patch.units.map(u => [u.unitId, u])
  );

  const patchedUnits = lesson.knowledgeUnits.map(unit => {
    const p = patchMap.get(unit.id);
    if (!p) return unit;

    const patchedRoutes = unit.routes.map(r => {
      if (r.route !== route) return r;

      // Patch explanation for the student's route
      const newExplanation = p.personalized_explanation || r.explanation;

      // Patch worked example if provided
      const newWorkedExamples = p.personalized_example
        ? [{
            ...r.workedExamples[0],
            problem: p.personalized_example.problem,
            solution: p.personalized_example.solution,
            explanation: p.personalized_example.solution,
            hints: p.personalized_example.hints || r.workedExamples[0]?.hints || [],
          }]
        : r.workedExamples;

      return {
        ...r,
        explanation: newExplanation,
        workedExamples: newWorkedExamples,
      };
    });

    return { ...unit, routes: patchedRoutes };
  });

  return { ...lesson, knowledgeUnits: patchedUnits };
};

// ── Main public function ──────────────────────────────────────────────────────

export type PersonalizationApiCall = (prompt: string) => Promise<string>;

/**
 * Returns a (possibly cached or in-flight) personalized version of the lesson.
 *
 * @param lesson      The original lesson from Firestore
 * @param route       The route determined by diagnostic grading
 * @param weakObjectiveIds  Objective IDs where student scored < 0.4
 * @param callApi     Injected async function that calls the AI (e.g., via gemini-relay)
 * @returns           A new lesson object with personalized route content, or the original on failure
 */
export const getPersonalizedLesson = async (
  lesson: AdaptiveLesson,
  route: LearningRoute,
  weakObjectiveIds: string[],
  callApi: PersonalizationApiCall,
): Promise<AdaptiveLesson> => {
  const cacheKey = getCacheKey(lesson.id, route, weakObjectiveIds);

  // 1. Cache hit → instant return
  const cached = resolvedCache.get(cacheKey);
  if (cached) return cached;

  // 2. Already in-flight → share the same promise
  const pending = pendingPersonalizations.get(cacheKey);
  if (pending) return pending;

  // 3. Cache miss → start new AI call
  const prompt = buildPersonalizationPrompt(lesson, route, weakObjectiveIds);

  const personalizationPromise = withTimeout(callApi(prompt), PERSONALIZATION_TIMEOUT_MS)
    .then(rawText => {
      let patch: PersonalizationJson = {};
      try {
        const parsed = JSON.parse(extractJsonBlock(rawText));
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          patch = parsed as PersonalizationJson;
        }
      } catch {
        // JSON parse failed — silently use original content
      }
      const personalized = applyPersonalizationPatch(lesson, patch, route);
      resolvedCache.set(cacheKey, personalized);
      return personalized;
    })
    .catch((err: unknown) => {
      console.warn('[PersonalizationEngine] Falling back to original lesson:', err);
      // Do NOT cache the failure — allow retry next session
      return lesson;
    })
    .finally(() => {
      pendingPersonalizations.delete(cacheKey);
    });

  pendingPersonalizations.set(cacheKey, personalizationPromise);
  return personalizationPromise;
};

/** Clears all in-memory caches (call on lesson change or teacher preview reset). */
export const clearPersonalizationCache = (): void => {
  resolvedCache.clear();
  pendingPersonalizations.clear();
};

/**
 * HS gửi ẢNH ĐỀ BÀI và nhờ giải (không phải nộp bài).
 *
 * VÌ SAO CẦN: trước 29/10, mọi ảnh HS gửi đều bị coi là ẢNH NỘP BÀI. Nếu HS chưa mở
 * phiên nộp (chưa nhắn 8 → chọn bài), bot trả "Chưa có ảnh nào được nhận…" — HS gửi đề
 * nhờ giải lại nhận câu về dữ liệu báo cáo, sai hoàn toàn ý định (lỗi chủ dự án báo 29/10).
 *
 * CÁCH XỬ LÝ: ảnh KHÔNG thuộc phiên nộp bài → coi là ĐỀ BÀI, đưa qua model vision để đọc
 * và giải, kèm quy tắc công thức/vẽ hình y như chat text (dùng chung buildSystemPrompt).
 *
 * AN TOÀN: ảnh tải 1 lần, KHÔNG lưu Storage (khác ảnh nộp bài) — chỉ dùng trong request.
 * Lỗi bất kỳ → trả null để caller gửi câu hướng dẫn, bot không bao giờ im lặng.
 */
import { getAdminDb } from './_exam-core.js';
import { callOpenAiCompatibleVision, type InlineImage } from './_grading-core.js';
import { AI_MENU_HINT, buildSystemPrompt, composeAiReply, sanitizeAiReply, type ChatRole } from './_assistant-ph-hs-chat.js';
import { extractGeometryReply, type GeometrySpec } from './_assistant-geometry.js';
import { hasLatexFormula } from './_assistant-math-image.js';
import { latexToUnicodeMath } from './_assistant-math-text.js';
import { buildAiContext } from './_assistant-ph-hs-chat.js';
import type { ParentSafeReport } from '../src/lib/classroom/parentSafeReport.js';

const MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/** Prompt riêng cho ảnh: nhấn mạnh ĐỌC ĐỀ TRONG ẢNH rồi giải, không bịa đề khác. */
export const IMAGE_SOLVE_RULE = [
  'ẢNH HỌC SINH GỬI LÀ ĐỀ BÀI. Hãy:',
  '1. Đọc và chép lại đề trong ảnh (ngắn gọn, đúng số liệu — KHÔNG bịa thêm dữ kiện không có trong ảnh).',
  '2. Giải chi tiết theo đúng yêu cầu của đề trong ảnh.',
  '3. Nếu ảnh mờ/không đọc được phần nào, nói rõ phần đó chưa đọc được và hỏi lại — KHÔNG đoán bừa.',
  '4. Nếu ảnh không phải đề Toán (ảnh cá nhân, ảnh chụp màn hình khác), trả lời ngắn: ảnh này không phải đề bài, em gửi lại ảnh đề nhé.',
].join('\n');

export type ImageSolveAnswer = { text: string; mathSource: string; geometry: GeometrySpec | null; hasMath: boolean };

/** Tải ảnh Zalo về buffer. Trả null nếu lỗi/quá lớn/sai định dạng. */
export const fetchPhotoBuffer = async (photoUrl: string): Promise<{ buffer: Buffer; mimeType: string } | null> => {
  try {
    const res = await fetch(photoUrl, { signal: AbortSignal.timeout(15_000), redirect: 'follow' });
    if (!res.ok) return null;
    const mimeType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const array = await res.arrayBuffer();
    if (array.byteLength < 1 || array.byteLength >= MAX_BYTES) return null;
    if (!IMAGE_MIMES.includes(mimeType)) return null;
    return { buffer: Buffer.from(array), mimeType };
  } catch {
    return null;
  }
};

/**
 * Danh sách (key, model) để thử ĐỌC ẢNH — theo thứ tự ưu tiên.
 *
 * BÀI HỌC 29/10 (xem trang vilao.ai/console/keys): model trên Vilao có TIỀN TỐ nhà cung cấp —
 * `chib/gemini-3.8-flash`, `cnt/glm-5.3-flash`. Code cũ gọi trần `gemini-3.8-flash` nên API trả
 * 403 "Please subscribe to model in the API Key" dù key có quyền dùng model cùng tên qua vendor.
 * Vì vậy thử LẦN LƯỢT nhiều biến thể tên; cặp nào chạy được thì dùng (ghi log để biết).
 */
const visionCandidates = (): Array<{ key: string; model: string; baseUrl: string }> => {
  const baseUrl = process.env.GRADING_VILAO_BASE_URL?.trim() || 'https://api.vilao.ai/v1';
  const out: Array<{ key: string; model: string; baseUrl: string }> = [];
  const push = (key: string | undefined, models: string[]) => {
    if (!key) return;
    for (const model of models) if (!out.some(o => o.key === key && o.model === model)) out.push({ key, model, baseUrl });
  };
  const gemini = process.env.PH_CHAT_VISION_MODEL?.trim();
  const geminiModels = gemini ? [gemini] : ['chib/gemini-3.8-flash', 'gemini-3.8-flash'];
  // 1. Key chấm bài (nếu có) — model đã kiểm chứng đọc ảnh.
  const gradingKey = process.env.GRADING_VILAO_API_KEY?.trim();
  if (gradingKey) push(gradingKey, [process.env.GRADING_VILAO_MODEL?.trim() || 'chib/gemini-3.8-flash', 'gemini-3.8-flash']);
  // 2. Key chat + Gemini vision (tên có prefix vendor trước, rồi tên trần).
  const chatKey = process.env.PH_CHAT_VILAO_KEY?.trim();
  push(chatKey, geminiModels);
  // 3. Key chat + model chat đang chạy được — đã XÁC MINH đọc ảnh tốt (log 29/10: chars=306).
  push(chatKey, [process.env.PH_CHAT_MODEL?.trim() || 'cnt/glm-5.3-flash']);
  return out;
};

/**
 * Giải đề trong ảnh. Trả null khi: ảnh hỏng, không có key nào, mọi cặp key+model đều lỗi.
 * Caller PHẢI có nhánh fallback (câu hướng dẫn) — không được im lặng.
 */
export const solveProblemFromImage = async (
  image: { buffer: Buffer; mimeType: string },
  report: ParentSafeReport,
  periodicIds: ReadonlySet<string>,
  role: ChatRole = 'student',
  caption?: string,
): Promise<ImageSolveAnswer | null> => {
  const candidates = visionCandidates();
  if (!candidates.length) return null;
  const context = buildAiContext(report, periodicIds, role);
  const prompt = [
    buildSystemPrompt(context, role),
    '',
    IMAGE_SOLVE_RULE,
    '',
    caption?.trim() ? `Học sinh gửi kèm lời nhắn: ${caption.trim().slice(0, 300)}` : 'Học sinh không gửi kèm lời nhắn — hãy giải đề trong ảnh.',
  ].join('\n');
  const images: InlineImage[] = [{ mimeType: image.mimeType, data: image.buffer.toString('base64') }];
  for (const candidate of candidates) {
    try {
      const raw = await callOpenAiCompatibleVision(
        prompt,
        images,
        candidate.key,
        {
          baseUrl: candidate.baseUrl,
          model: candidate.model,
          reasoningEffort: 'none',
          maxOutputTokens: 1600,
          temperature: 0.2,
          timeoutMs: 55_000,
        },
      );
      if (!raw?.trim()) { console.error(`[assistant-image-solve] ${candidate.model}: trả rỗng`); continue; }
      // Log ĐỘ DÀI thôi (không log nội dung — tránh lộ đề/câu trả lời của HS vào log).
      // Có dòng này nghĩa là vision ĐÃ trả lời thành công bằng model ghi kèm.
      console.log(`[assistant-image-solve] OK model=${candidate.model} chars=${raw.length}`);
      const { text, spec } = extractGeometryReply(raw);
      const mathSource = sanitizeAiReply(text);
      return {
        text: composeAiReply(latexToUnicodeMath(text)),
        mathSource,
        geometry: spec,
        hasMath: hasLatexFormula(mathSource),
      };
    } catch (error) {
      // 403 = key chưa đăng ký model → thử cặp kế tiếp; các lỗi khác cũng thử tiếp.
      console.error(`[assistant-image-solve] ${candidate.model} lỗi:`, error instanceof Error ? error.message.slice(0, 160) : error);
    }
  }
  return null;
};

export const IMAGE_SOLVE_REPLIES = {
  unreadable: `Thầy cô chưa đọc được ảnh này (ảnh mờ, quá lớn hoặc không phải ảnh đề bài). Em chụp lại rõ hơn rồi gửi nhé.\n\n${AI_MENU_HINT}`,
  busy: `Trợ lý đang bận nên chưa giải được ảnh này. Em thử lại sau ít phút, hoặc gõ đề bằng chữ cũng được nhé.\n\n${AI_MENU_HINT}`,
} as const;

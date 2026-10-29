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
 * VÌ SAO CẦN CHUỖI (lỗi thật 29/10): key chat `PH_CHAT_VILAO_KEY` KHÔNG đăng ký model
 * vision `gemini-3.8-flash` → API trả 403 "Please subscribe to model in the API Key".
 * Trong khi key chấm bài `GRADING_VILAO_API_KEY` ĐÃ đăng ký (đường chấm ảnh chạy hằng ngày).
 * Ghim cứng một cặp là hỏng ngay khi key đổi quyền, nên thử lần lượt và ghi log cặp nào hỏng.
 */
const visionCandidates = (): Array<{ key: string; model: string; baseUrl: string }> => {
  const baseUrl = process.env.GRADING_VILAO_BASE_URL?.trim() || 'https://api.vilao.ai/v1';
  const out: Array<{ key: string; model: string; baseUrl: string }> = [];
  // 1. Key chấm bài + model đã kiểm chứng đọc ảnh (nếu có key này thì chắc chắn hoạt động).
  const gradingKey = process.env.GRADING_VILAO_API_KEY?.trim();
  if (gradingKey) out.push({ key: gradingKey, model: process.env.GRADING_VILAO_MODEL?.trim() || 'gemini-3.8-flash', baseUrl });
  const chatKey = process.env.PH_CHAT_VILAO_KEY?.trim();
  if (chatKey) {
    // 2. Key chat + model vision (sau khi chủ dự án bật quyền model này cho key — 29/10).
    out.push({ key: chatKey, model: process.env.PH_CHAT_VISION_MODEL?.trim() || 'gemini-3.8-flash', baseUrl });
    // 3. Key chat + CHÍNH model chat đang chạy được (cnt/glm-5.3-flash): nhiều model GLM đọc
    //    được ảnh. Thử sau cùng để không tốn lượt khi model vision chính đã chạy.
    out.push({ key: chatKey, model: process.env.PH_CHAT_MODEL?.trim() || 'cnt/glm-5.3-flash', baseUrl });
  }
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

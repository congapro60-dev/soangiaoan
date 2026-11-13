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
import { downloadImage } from './_assistant-photo-file.js';
import { AI_MENU_HINT, buildGroupSystemPrompt, buildSystemPrompt, composeAiReply, sanitizeAiReply, type ChatRole } from './_assistant-ph-hs-chat.js';
import { extractGeometryReply, type GeometrySpec } from './_assistant-geometry.js';
import { hasLatexFormula } from './_assistant-math-image.js';
import { latexToUnicodeMath } from './_assistant-math-text.js';
import { buildAiContext } from './_assistant-ph-hs-chat.js';
import type { ParentSafeReport } from '../src/lib/classroom/parentSafeReport.js';

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Lỗi thật 13/11: Gemini qua key chấm bài hết 55 giây hai lần, key chat bị 403 "subscribe" hai lần,
 * tới model thứ 5 mới đọc được — HS chờ 3 phút. Nay: mỗi model tối đa 30 giây; một tên Gemini đã
 * quá thời gian thì bỏ các biến thể Gemini còn lại trong lượt; cặp key+model bị 403 thì nhớ 1 giờ
 * (trong cùng instance) để lượt sau không thử lại.
 */
const VISION_TIMEOUT_MS = 30_000;
const FORBIDDEN_TTL_MS = 60 * 60_000;
const forbiddenUntil = new Map<string, number>();
const pairKey = (c: { key: string; model: string }) => `${c.key.slice(-6)}:${c.model}`;
const family = (model: string) => (/gemini/i.test(model) ? 'gemini' : model);
/** Chạy lần lượt các cặp key+model, áp các luật bỏ qua ở trên. */
const tryVision = async (
  candidates: Array<{ key: string; model: string; baseUrl: string }>,
  label: string,
  call: (c: { key: string; model: string; baseUrl: string }) => Promise<string>,
): Promise<string | null> => {
  const timedOut = new Set<string>();
  for (const candidate of candidates) {
    if ((forbiddenUntil.get(pairKey(candidate)) ?? 0) > Date.now() || timedOut.has(family(candidate.model))) continue;
    try {
      const raw = await call(candidate);
      if (!raw?.trim()) { console.error(`[assistant-image-solve] ${label}${candidate.model}: trả rỗng`); continue; }
      console.log(`[assistant-image-solve] ${label}OK model=${candidate.model} chars=${raw.length}`);
      return raw;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/403|subscribe/i.test(message)) forbiddenUntil.set(pairKey(candidate), Date.now() + FORBIDDEN_TTL_MS);
      if (/timeout|aborted/i.test(message)) timedOut.add(family(candidate.model));
      console.error(`[assistant-image-solve] ${label}${candidate.model} lỗi:`, message.slice(0, 160));
    }
  }
  return null;
};

/** Prompt riêng cho ảnh: nhấn mạnh ĐỌC ĐỀ TRONG ẢNH rồi giải, không bịa đề khác. */
export const IMAGE_SOLVE_RULE = [
  'ẢNH HỌC SINH GỬI LÀ ĐỀ BÀI. Hãy:',
  '1. Đọc và chép lại đề trong ảnh (ngắn gọn, đúng số liệu — KHÔNG bịa thêm dữ kiện không có trong ảnh).',
  '2. Giải chi tiết theo đúng yêu cầu của đề trong ảnh.',
  '3. Nếu ảnh mờ/không đọc được phần nào, nói rõ phần đó chưa đọc được và hỏi lại — KHÔNG đoán bừa.',
  '4. Nếu ảnh không phải đề Toán (ảnh cá nhân, ảnh chụp màn hình khác), trả lời ngắn: ảnh này không phải đề bài, em gửi lại ảnh đề nhé.',
].join('\n');

export type ImageSolveAnswer = { text: string; mathSource: string; geometry: GeometrySpec | null; hasMath: boolean; usedCaption?: string };

/** Tải ảnh Zalo về buffer. Dùng chung `downloadImage` (sniff magic bytes + thử lại 2 lần). */
export const fetchPhotoBuffer = async (photoUrl: string): Promise<{ buffer: Buffer; mimeType: string } | null> =>
  downloadImage(photoUrl, MAX_BYTES);

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
  /** Đọc lại lời nhắn ngay trước mỗi lần gọi model (tin chữ có thể tới khi ảnh đang giải). */
  readCaption?: () => Promise<string>,
): Promise<ImageSolveAnswer | null> => {
  const candidates = visionCandidates();
  if (!candidates.length) return null;
  const context = buildAiContext(report, periodicIds, role);
  const promptFor = (note: string) => [
    buildSystemPrompt(context, role, report.studentName ?? ''),
    '',
    IMAGE_SOLVE_RULE,
    '',
    note.trim()
      ? `Học sinh gửi kèm lời nhắn: ${note.trim().slice(0, 300)}\nLàm ĐÚNG theo lời nhắn này (ví dụ "chữa câu 1-2" thì chỉ chép đề và chữa câu 1 và câu 2, mỗi câu chỉ rõ đáp án đúng và vì sao). Được viết dài hơn giới hạn 6 câu khi cần chữa nhiều câu.`
      : 'Học sinh không gửi kèm lời nhắn — hãy giải đề trong ảnh.',
  ].join('\n');
  const images: InlineImage[] = [{ mimeType: image.mimeType, data: image.buffer.toString('base64') }];
  let usedCaption = caption ?? '';
  const raw = await tryVision(candidates, '', async candidate => {
    if (readCaption) usedCaption = await readCaption().catch(() => usedCaption);
    return callOpenAiCompatibleVision(promptFor(usedCaption), images, candidate.key, {
      baseUrl: candidate.baseUrl, model: candidate.model, reasoningEffort: 'none', maxOutputTokens: 1600, temperature: 0.2, timeoutMs: VISION_TIMEOUT_MS,
    });
  });
  if (!raw) return null;
  const { text, spec } = extractGeometryReply(raw);
  const mathSource = sanitizeAiReply(text);
  return {
    text: composeAiReply(latexToUnicodeMath(text)),
    mathSource,
    geometry: spec,
    hasMath: hasLatexFormula(mathSource),
    usedCaption,
  };
};

export const IMAGE_SOLVE_REPLIES = {
  unreadable: `❌ Thầy cô chưa đọc được ảnh này.\n\n📌 HƯỚNG DẪN:\n   • Chụp ẢNH RÕ NÉT đề bài (không mờ, không cắt xén).\n   • Chỉ gửi ảnh đề bài THUẦN (không chụp màn hình, không ảnh khác).\n   • Định dạng ảnh: JPG/PNG/WEBP (không hỗ trợ HEIC/HEIF).\n   • Kích thước ảnh < 8MB.\n\n⚠️ LƯU Ý: Nếu ảnh không rõ, máy sẽ không giải được.\n\n${AI_MENU_HINT}`,
  busy: `⏳ Trợ lý đang bận nên chưa giải được ảnh này.\n\n📌 HƯỚNG DẪN:\n   • Thử lại sau ít phút.\n   • Hoặc gõ đề bài bằng chữ (nhắn text) để máy giải nhanh hơn.\n\n${AI_MENU_HINT}`,
} as const;

/**
 * Giải đề trong ảnh cho NHÓM Zalo (chốt 3/11): KHÔNG có báo cáo cá nhân nào cả — chỉ
 * prompt nhóm + quy tắc đọc đề. Trả text thuần (nhóm không vẽ hình/công thức render).
 * Trả null khi lỗi — caller phải có fallback, không im lặng.
 */
export const solveGroupImage = async (image: { buffer: Buffer; mimeType: string }, caption?: string): Promise<string | null> => {
  const candidates = visionCandidates();
  if (!candidates.length) return null;
  const prompt = [
    buildGroupSystemPrompt(),
    '',
    IMAGE_SOLVE_RULE,
    '',
    caption?.trim() ? `Người gửi kèm lời nhắn: ${caption.trim().slice(0, 300)}` : 'Không có lời nhắn kèm theo — hãy giải đề trong ảnh.',
  ].join('\n');
  const images: InlineImage[] = [{ mimeType: image.mimeType, data: image.buffer.toString('base64') }];
  const raw = await tryVision(candidates, 'group ', candidate => callOpenAiCompatibleVision(prompt, images, candidate.key, {
    baseUrl: candidate.baseUrl, model: candidate.model, reasoningEffort: 'none', maxOutputTokens: 1600, temperature: 0.2, timeoutMs: VISION_TIMEOUT_MS,
  }));
  if (!raw) return null;
  const clean = composeAiReply(latexToUnicodeMath(sanitizeAiReply(raw)));
  return clean ? clean.slice(0, 1800) : null;
};

/**
 * Ngữ cảnh gần nhất của cuộc trò chuyện PH/HS (lỗi thật 13/11).
 *
 * Zalo gửi ẢNH và CHỮ thành hai webhook độc lập. HS gửi ảnh đề rồi nhắn "Chữa câu 1-2":
 * tin chữ được trả lời ngay mà không biết có ảnh ("mình chưa thấy đề bài"), còn lời giải ảnh
 * tới sau đó. Doc này nối hai tin lại:
 *   - Ảnh đề: ghi `solving` → chờ chút cho lời nhắn đi kèm → giải theo lời nhắn → ghi `done` + đề đã đọc.
 *   - Chữ tới khi ảnh đang giải: gộp vào yêu cầu; nếu ảnh đã giải xong mà chưa kịp dùng lời nhắn
 *     thì trả lời tiếp dựa trên đề đã đọc.
 *   - Lệnh "ôn N": lưu bài luyện vừa ra để tin trả lời sau đó được chấm đúng bài.
 * Chỉ lưu tối đa 15 phút, theo đúng (lớp, HS, vai) của link — đổi vai là ngữ cảnh cũ mất hiệu lực.
 */
import crypto from 'node:crypto';
import { getAdminDb } from './_exam-core.js';

export type RecentKind = 'photo' | 'practice' | 'text';
export interface RecentScope { classId: string; studentId: string; role: string }
export interface RecentContext extends RecentScope {
  kind: RecentKind;
  status: 'solving' | 'done';
  startedAt: number;
  updatedAt: number;
  /** Đề đã đọc từ ảnh hoặc bài luyện đã ra (bản chữ). */
  text: string;
  /** Lời nhắn HS gửi kèm ảnh; `instructionUsed` = bản lời giải ảnh đã dùng lời nhắn này. */
  instruction: string;
  instructionUsed: boolean;
}

export const RECENT_TTL_MS = 15 * 60_000;
const SOLVING_TTL_MS = 2 * 60_000;
const COLLECTION = 'assistantChatContext';
const ref = (botId: string, userId: string) => getAdminDb().collection(COLLECTION).doc(crypto.createHash('sha256').update(`${botId}:${userId}`).digest('hex'));
/** Ngữ cảnh chỉ để trả lời tốt hơn: lỗi đọc/ghi không được làm hỏng tin nhắn (bot trả lời như cũ). */
const safe = async <T>(fallback: T, run: () => Promise<T>): Promise<T> => {
  try { return await run(); } catch (error) {
    console.error(`[assistant-recent] ${error instanceof Error ? error.message.slice(0, 120) : 'unknown'}`);
    return fallback;
  }
};
const sameScope = (a: RecentScope, b: RecentScope) => a.classId === b.classId && a.studentId === b.studentId && a.role === b.role;

export const readRecent = async (botId: string, userId: string, scope: RecentScope, now = Date.now()): Promise<RecentContext | null> => safe(null, async () => {
  const data = (await ref(botId, userId).get()).data() as RecentContext | undefined;
  if (!data || !sameScope(data, scope)) return null;
  const limit = data.status === 'solving' ? SOLVING_TTL_MS : RECENT_TTL_MS;
  return now - Number(data.updatedAt || 0) <= limit ? data : null;
});

/** Lời nhắn chữ tới TRƯỚC ảnh (Zalo tải ảnh lên chậm ~5 giây): giữ 2 phút để ảnh tới sau dùng làm yêu cầu. */
const EARLY_TEXT_TTL_MS = 2 * 60_000;
export const saveEarlyText = async (botId: string, userId: string, scope: RecentScope, message: string, now = Date.now()): Promise<void> => safe(undefined, async () => {
  await ref(botId, userId).set({ ...scope, kind: 'text', status: 'done', startedAt: now, updatedAt: now, text: '', instruction: message.trim().slice(0, 300), instructionUsed: false });
});

/** Ảnh mới: gộp lời nhắn đi kèm và lời nhắn chữ vừa tới trước đó (nếu có); trả về yêu cầu đã gộp. */
export const startPhoto = async (botId: string, userId: string, scope: RecentScope, caption = '', now = Date.now()): Promise<string> => safe(caption.trim(), async () => {
  const previous = (await ref(botId, userId).get()).data() as RecentContext | undefined;
  const early = previous && previous.kind === 'text' && sameScope(previous, scope) && now - Number(previous.updatedAt || 0) <= EARLY_TEXT_TTL_MS ? previous.instruction : '';
  const instruction = [early, caption.trim()].filter(Boolean).join('\n').slice(0, 300);
  await ref(botId, userId).set({ ...scope, kind: 'photo', status: 'solving', startedAt: now, updatedAt: now, text: '', instruction, instructionUsed: false });
  return instruction;
});

/** Lời nhắn chữ tới khi ảnh đang giải: gộp vào yêu cầu (tối đa 300 ký tự). */
export const addInstruction = async (botId: string, userId: string, scope: RecentScope, message: string, now = Date.now()): Promise<void> => safe(undefined, async () => {
  const current = await readRecent(botId, userId, scope, now);
  if (!current) return;
  const instruction = [current.instruction, message.trim()].filter(Boolean).join('\n').slice(0, 300);
  await ref(botId, userId).set({ ...current, instruction, instructionUsed: false, updatedAt: now });
});

/** Ảnh giải xong: lưu đề/lời giải đã đọc; đánh dấu đã dùng đúng lời nhắn lúc gọi model. */
export const finishPhoto = async (botId: string, userId: string, scope: RecentScope, text: string, usedInstruction: string, now = Date.now()): Promise<void> => safe(undefined, async () => {
  const current = await readRecent(botId, userId, scope, now);
  const instruction = current?.instruction ?? usedInstruction;
  await ref(botId, userId).set({ ...scope, kind: 'photo', status: 'done', startedAt: current?.startedAt ?? now, updatedAt: now,
    text: text.slice(0, 2500), instruction, instructionUsed: instruction === usedInstruction });
});

export const savePractice = async (botId: string, userId: string, scope: RecentScope, text: string, now = Date.now()): Promise<void> => safe(undefined, async () => {
  await ref(botId, userId).set({ ...scope, kind: 'practice', status: 'done', startedAt: now, updatedAt: now, text: text.slice(0, 2500), instruction: '', instructionUsed: true });
});

/** Tin chữ có vẻ nói về một đề/ảnh (dùng khi chữ tới TRƯỚC ảnh). */
export const refersToProblem = (message: string): boolean => {
  const text = message.normalize('NFC').trim();
  return text.length <= 80 && /(?:^|\s)(?:câu|cau|bài|bai)\s*\d|chữa|chua giup|bài này|bai nay|ảnh|đề bài|de bai/iu.test(text);
};

/** Ngữ cảnh gắn vào prompt AI cho tin chữ kế tiếp. */
export const recentPromptContext = (recent: RecentContext | null): string => {
  if (!recent || recent.status !== 'done' || !recent.text || recent.kind === 'text') return '';
  return recent.kind === 'photo'
    ? `ĐỀ BÀI TRONG ẢNH HỌC SINH VỪA GỬI (đã đọc và giải ở tin trước — dùng đúng đề này khi em hỏi "câu 1", "chữa câu 2", "bài này"):\n${recent.text}`
    : `BÀI LUYỆN VỪA RA CHO HỌC SINH (em đang trả lời bài này — chấm từng câu, chỉ ra chỗ sai và cách sửa, chưa làm thì gợi ý bước đầu):\n${recent.text}`;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Tin chữ nói về đề mà chưa thấy ảnh: chờ webhook ảnh tới (tối đa `maxMs`). */
export const waitPhotoStart = async (botId: string, userId: string, scope: RecentScope, maxMs = 12_000, stepMs = 1_500): Promise<RecentContext | null> => {
  const end = Date.now() + maxMs;
  for (;;) {
    const current = await readRecent(botId, userId, scope);
    if (current?.kind === 'photo' || Date.now() >= end) return current?.kind === 'photo' ? current : null;
    await sleep(stepMs);
  }
};

/** Chờ ảnh đang giải xong (tối đa `maxMs`), trả bản mới nhất. */
export const waitPhotoDone = async (botId: string, userId: string, scope: RecentScope, maxMs = 60_000, stepMs = 2_000): Promise<RecentContext | null> => {
  const end = Date.now() + maxMs;
  for (;;) {
    const current = await readRecent(botId, userId, scope);
    if (!current || current.status === 'done' || Date.now() >= end) return current;
    await sleep(stepMs);
  }
};

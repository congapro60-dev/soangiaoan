// Gửi tin Zalo dùng chung cho webhook bot và luồng chấm bài (việc 4) — tách khỏi
// _assistant-zalo-bot.ts để photo module gửi kết quả mà không tạo import cycle.
import crypto from 'node:crypto';
import { quoteChatCommands } from './_assistant-chat-commands.js';
export { quoteChatCommands } from './_assistant-chat-commands.js';

const ORIGIN = 'https://bot-api.zaloplatforms.com';

/** Escape ký tự markdown của Zalo để dữ liệu động (tên, tiêu đề) không vỡ định dạng. */
export const escMd = (value: string): string => value.replace(/[*_~]/g, '\\$&');

/** Keep every line; leave room for markdown escaping and never split a surrogate pair. */
export const splitZaloMessage = (message: string, limit = 1800): string[] => {
  message = quoteChatCommands(message);
  const parts: string[] = [];
  let rest = message;
  while (rest.length > limit) {
    const newline = rest.lastIndexOf('\n', limit);
    let cut = newline > limit / 2 ? newline + 1 : limit;
    if (/[\uD800-\uDBFF]/.test(rest[cut - 1])) cut--;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest) parts.push(rest);
  return parts;
};

/**
 * Gửi tin cho PH/HS ĐÃ liên kết: nội dung do hệ tự dựng (không qua output() che link) và
 * markdown khi nhiều dòng (in đậm dòng tiêu đề). Parse lỗi → tự gửi lại bản thuần.
 * Tin 1 dòng gửi thuần như cũ. Lỗi mạng = ambiguous: KHÔNG retry (giống send()).
 */
export const sendStyled = async (token: string, chatId: string, message: string, markdown = true): Promise<void> => {
  const url = `${ORIGIN}/bot${encodeURIComponent(token)}/sendMessage`;
  const post = (body: Record<string, unknown>) => fetch(url, { method: 'POST', redirect: 'error', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  for (const part of splitZaloMessage(message)) {
    const lines = part.split('\n').map(escMd);
    const md = `**${lines[0]}**\n${lines.slice(1).join('\n')}`;
    const styled = markdown && part.includes('\n') && md.length <= 2000;
    try {
      const res = await post({ chat_id: chatId, text: styled ? md : part, ...(styled ? { parse_mode: 'markdown' } : {}) });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok === true) continue;
      // Retry only an explicit formatting rejection; transport/server errors may have delivered.
      if (styled && (res.status === 400 || body?.error_code === 400)
        && /parse|markdown|entities/i.test(String(body?.description ?? ''))) {
        const plain = await post({ chat_id: chatId, text: part });
        const result = await plain.json().catch(() => null);
        if (plain.ok && result?.ok === true) continue;
      }
      console.error(`[zalo-send] sendMessage failed http=${res.status} code=${Number(body?.error_code) || '-'}`);
      return;
    } catch { return; /* ambiguous: không retry */ }
  }
};

/** Hiện "đang nhập..." trong lúc AI suy nghĩ — fire-and-forget, lỗi bỏ qua. */
export const sendTyping = (token: string, chatId: string): void => {
  void fetch(`${ORIGIN}/bot${encodeURIComponent(token)}/sendChatAction`, { method: 'POST', redirect: 'error', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, action: 'typing' }) }).catch(() => { /* không quan trọng */ });
};

/**
 * Gửi ảnh (URL công khai, ví dụ Storage token URL) kèm caption ≤2000 ký tự.
 * KHÔNG throw — trả false khi Zalo lỗi hoặc mạng lỗi, để caller fallback về tin text
 * (HS vẫn nhận lời giải, chỉ thiếu hình). Dùng cho hình học vẽ từ AI (chốt 28/10).
 */
export const sendPhoto = async (token: string, chatId: string, photoUrl: string, caption: string): Promise<boolean> => {
  const [first = '', ...remaining] = splitZaloMessage(caption);
  try {
    const res = await fetch(`${ORIGIN}/bot${encodeURIComponent(token)}/sendPhoto`, {
      method: 'POST',
      redirect: 'error',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption: first }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || body?.ok !== true) return false;
    if (remaining.length) await sendStyled(token, chatId, remaining.join(''), false);
    return true;
  } catch { return false; }
};

/**
 * Gửi sticker (chốt 4/11 — kiểm chứng TRỰC TIẾP API: `/sendSticker` có thật với tham số `sticker`;
 * reaction thì KHÔNG hỗ trợ, trả 404). Dùng để bot "có cảm xúc" như người thật: thả 1 sticker
 * chúc mừng khi HS nộp bài / được điểm cao.
 *
 * KHÔNG throw — trả false khi lỗi, caller coi như không có sticker (không được làm hỏng luồng chính).
 */
export const sendSticker = async (token: string, chatId: string, sticker: string): Promise<boolean> => {
  try {
    const res = await fetch(`${ORIGIN}/bot${encodeURIComponent(token)}/sendSticker`, {
      method: 'POST',
      redirect: 'error',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, sticker: String(sticker || '').slice(0, 120) }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || body?.ok !== true) {
      // Log CHỈ mã lỗi — không log chat_id (định danh người nhận).
      console.error(`[zalo-send] sendSticker failed: http=${res.status} code=${Number(body?.error_code) || '-'}`);
      return false;
    }
    return true;
  } catch {
    console.error('[zalo-send] sendSticker transport error');
    return false;
  }
};

export const secretEqual = (a: string, b: string) => {
  const aa = Buffer.from(a); const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
};

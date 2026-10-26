// Gửi tin Zalo dùng chung cho webhook bot và luồng chấm bài (việc 4) — tách khỏi
// _assistant-zalo-bot.ts để photo module gửi kết quả mà không tạo import cycle.
import crypto from 'node:crypto';

const ORIGIN = 'https://bot-api.zaloplatforms.com';

/** Escape ký tự markdown của Zalo để dữ liệu động (tên, tiêu đề) không vỡ định dạng. */
export const escMd = (value: string): string => value.replace(/[*_~]/g, '\\$&');

/**
 * Gửi tin cho PH/HS ĐÃ liên kết: nội dung do hệ tự dựng (không qua output() che link) và
 * markdown khi nhiều dòng (in đậm dòng tiêu đề). Parse lỗi → tự gửi lại bản thuần.
 * Tin 1 dòng gửi thuần như cũ. Lỗi mạng = ambiguous: KHÔNG retry (giống send()).
 */
export const sendStyled = async (token: string, chatId: string, message: string, markdown = true): Promise<void> => {
  const url = `${ORIGIN}/bot${encodeURIComponent(token)}/sendMessage`;
  const post = (body: Record<string, unknown>) => fetch(url, { method: 'POST', redirect: 'error', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const plain = () => post({ chat_id: chatId, text: message.slice(0, 2000) });
  if (!markdown || !message.includes('\n')) { try { await plain(); } catch { /* ambiguous */ } return; }
  const lines = message.split('\n').map(escMd);
  const md = `**${lines[0]}**\n${lines.slice(1).join('\n')}`.slice(0, 2000);
  try {
    const res = await post({ chat_id: chatId, text: md, parse_mode: 'markdown' });
    if (res.ok) return;
  } catch { return; /* ambiguous: không biết tin đã tới chưa, không retry */ }
  try { await plain(); } catch { /* ambiguous */ }
};

/** Hiện "đang nhập..." trong lúc AI suy nghĩ — fire-and-forget, lỗi bỏ qua. */
export const sendTyping = (token: string, chatId: string): void => {
  void fetch(`${ORIGIN}/bot${encodeURIComponent(token)}/sendChatAction`, { method: 'POST', redirect: 'error', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, action: 'typing' }) }).catch(() => { /* không quan trọng */ });
};

export const secretEqual = (a: string, b: string) => {
  const aa = Buffer.from(a); const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
};

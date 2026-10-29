import { describe, expect, it } from 'vitest';
import { claimAssistantRequestNonce } from '../_assistant-auth.js';
import { FakeDb } from './_fake-db.js';

/**
 * Lỗi thật 29/10 (phát hiện khi test ảnh đề trên production): khoá chống gửi trùng
 * theo NỘI DUNG (ttl 10 giây) biến thành khoá VĨNH VIỄN vì claimAssistantRequestNonce
 * chỉ xét `exists` mà không xét `expiresAt`. Hậu quả: HS gửi lại đúng ảnh/câu đó thì
 * bot trả 200 nhưng KHÔNG làm gì (im lặng) — cực kỳ khó hiểu khi vận hành.
 */
const t0 = Date.parse('2026-10-29T10:00:00Z');

describe('claimAssistantRequestNonce — phải tôn trọng hạn của nonce', () => {
  it('lần đầu claim được', async () => {
    const f = new FakeDb();
    await expect(claimAssistantRequestNonce('n1', t0, f as any, 10_000)).resolves.toBeUndefined();
  });

  it('claim lại NGAY (trong hạn) → replay', async () => {
    const f = new FakeDb();
    await claimAssistantRequestNonce('n1', t0, f as any, 10_000);
    await expect(claimAssistantRequestNonce('n1', t0 + 5_000, f as any, 10_000)).rejects.toThrow('Replay');
  });

  it('claim lại SAU KHI HẾT HẠN → được phép (không khoá vĩnh viễn)', async () => {
    const f = new FakeDb();
    await claimAssistantRequestNonce('n1', t0, f as any, 10_000);
    // 11 giây sau: khoá 10s đã hết → phải claim được, nếu không HS gửi lại ảnh sẽ bị im lặng.
    await expect(claimAssistantRequestNonce('n1', t0 + 11_000, f as any, 10_000)).resolves.toBeUndefined();
  });

  it('nonce mặc định (300s) vẫn giữ nguyên hành vi cũ', async () => {
    const f = new FakeDb();
    await claimAssistantRequestNonce('n2', t0, f as any);
    await expect(claimAssistantRequestNonce('n2', t0 + 299_000, f as any)).rejects.toThrow('Replay');
    await expect(claimAssistantRequestNonce('n2', t0 + 301_000, f as any)).resolves.toBeUndefined();
  });

  it('bản ghi cũ thiếu expiresAt (dữ liệu cũ) coi như CÒN hạn — không phá chống replay', async () => {
    const f = new FakeDb();
    f.put('assistantRequestNonces/legacy', { createdAt: t0 });
    await expect(claimAssistantRequestNonce('legacy', t0 + 10_000, f as any)).rejects.toThrow('Replay');
  });
});

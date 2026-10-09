import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_OWN_GEMINI_KEYS, editingKeysPatch, geminiKeysOf, keyRowsOf, normalizeKeys, orderKeys, restMsForError, withGeminiKeys } from './geminiKeyRing';

const NOW = Date.parse('2026-10-09T10:00:00Z');
const storage = new Map<string, string>();
beforeEach(() => {
  storage.clear();
  vi.stubGlobal('window', { localStorage: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => { storage.set(k, v); } } });
});

describe('danh sách khoá', () => {
  it('chuẩn hoá: bỏ ô trống/khoảng trắng/trùng, cắt ở trần', () => {
    expect(normalizeKeys([' a ', '', 'a', 'b'])).toEqual(['a', 'b']);
    expect(normalizeKeys(Array.from({ length: 30 }, (_, i) => `k${i}`)).length).toBe(MAX_OWN_GEMINI_KEYS);
  });
  it('người dùng cũ chỉ có một khoá đơn vẫn chạy; danh sách mới thắng khoá đơn', () => {
    expect(geminiKeysOf({ geminiApiKey: 'old' })).toEqual(['old']);
    expect(geminiKeysOf({ geminiApiKey: 'old', geminiApiKeys: ['n1', 'n2'] })).toEqual(['n1', 'n2']);
    expect(geminiKeysOf({ geminiApiKey: '', geminiApiKeys: [] })).toEqual([]);
  });
  it('đang gõ: giữ ô trống để ô không nhảy chỗ; khoá đơn luôn là khoá không-rỗng đầu tiên', () => {
    expect(editingKeysPatch(['', ' k2 ', ''])).toEqual({ geminiApiKey: 'k2', geminiApiKeys: ['', ' k2 ', ''] });
    expect(keyRowsOf({ geminiApiKey: 'old' })).toEqual(['old']);
    expect(keyRowsOf({ geminiApiKey: '' })).toEqual(['']);
    expect(keyRowsOf({ geminiApiKey: 'a', geminiApiKeys: ['x', 'y'] })).toEqual(['x', 'y']);
  });
});

describe('orderKeys / restMsForError', () => {
  it('khoá sẵn sàng trước (xoay vòng), khoá đang nghỉ sau cùng — sắp hết nghỉ thì đứng trước', () => {
    const fp = (k: string) => `${k.length}:${k.slice(-8)}`;
    const rest = { [fp('bbbbbbbbbb')]: NOW + 60_000, [fp('cccccccccc')]: NOW + 10_000 };
    expect(orderKeys(['aaaaaaaaaa', 'bbbbbbbbbb', 'cccccccccc'], rest, NOW, 0)).toEqual(['aaaaaaaaaa', 'cccccccccc', 'bbbbbbbbbb']);
    expect(orderKeys(['k1', 'k2', 'k3'], {}, NOW, 1)).toEqual(['k2', 'k3', 'k1']);
  });
  it('khoá sai nghỉ 6 giờ; hạn mức ngày nghỉ tới lần đặt lại; không rõ nghỉ ngắn', () => {
    expect(restMsForError(new Error('400 API key not valid. Please pass a valid API key.'), NOW)).toBe(6 * 3600_000);
    expect(restMsForError(new Error('429 RESOURCE_EXHAUSTED GenerateRequestsPerDayPerProjectPerModel-FreeTier'), NOW)).toBe(Date.parse('2026-10-10T08:00:00Z') - NOW);
    expect(restMsForError(new Error('429 quota'), NOW)).toBe(90_000);
  });
});

describe('withGeminiKeys — đổi khoá khi khoá hết hạn mức', () => {
  const quota = () => new Error('429 RESOURCE_EXHAUSTED: quota exceeded');

  it('khoá đầu hết hạn mức → thử khoá kế, trả kết quả; khoá hết hạn mức được nhớ nghỉ cho lượt sau', async () => {
    const run = vi.fn(async (key: string) => { if (key === 'AAAAAAAAAA') throw quota(); return `ok:${key}`; });
    expect(await withGeminiKeys(['AAAAAAAAAA', 'BBBBBBBBBB'], run)).toBe('ok:BBBBBBBBBB');
    expect(run.mock.calls.map(c => c[0])).toEqual(['AAAAAAAAAA', 'BBBBBBBBBB']);
    run.mockClear();
    await withGeminiKeys(['AAAAAAAAAA', 'BBBBBBBBBB'], run);
    await withGeminiKeys(['AAAAAAAAAA', 'BBBBBBBBBB'], run);
    expect(run.mock.calls.map(c => c[0])).toEqual(['BBBBBBBBBB', 'BBBBBBBBBB']); // A đang nghỉ nên không bị thử
    expect([...storage.values()].join('')).not.toContain('AAAAAAAAAA'); // chỉ lưu dấu vân tay, không lưu khoá thật
  });

  it('hết cả danh sách thì ném lỗi cuối (để chế độ "khoá riêng trước, hết sang ví" chuyển tiếp)', async () => {
    const failure = quota();
    await expect(withGeminiKeys(['AAAAAAAAAA', 'BBBBBBBBBB'], async () => { throw failure; })).rejects.toBe(failure);
  });

  it('lỗi KHÔNG do khoá (quá tải 503, mạng) thì ném ngay, không đổi khoá và không cho khoá nghỉ', async () => {
    const run = vi.fn(async () => { throw new Error('503 UNAVAILABLE: high demand'); });
    await expect(withGeminiKeys(['AAAAAAAAAA', 'BBBBBBBBBB'], run)).rejects.toThrow('503');
    expect(run).toHaveBeenCalledTimes(1);
    expect(storage.size).toBe(0);
  });

  it('đã hiện một phần kết quả (luồng chữ) thì không đổi khoá — tránh lặp nội dung', async () => {
    let shown = '';
    const run = vi.fn(async () => { shown = 'đã có chữ'; throw quota(); });
    await expect(withGeminiKeys(['AAAAAAAAAA', 'BBBBBBBBBB'], run, { canRotate: () => shown === '' })).rejects.toThrow('429');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('không có khoá nào → báo rõ; khoá đã nghỉ vẫn được thử khi không còn khoá khác (hạn mức theo phút có thể đã hồi)', async () => {
    await expect(withGeminiKeys([], async () => 'x')).rejects.toThrow('Chưa có khoá');
    await expect(withGeminiKeys(['AAAAAAAAAA'], async () => { throw quota(); })).rejects.toThrow('429');
    expect(await withGeminiKeys(['AAAAAAAAAA'], async () => 'hồi rồi')).toBe('hồi rồi');
  });
});

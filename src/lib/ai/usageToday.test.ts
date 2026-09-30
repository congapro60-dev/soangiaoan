import { describe, expect, it } from 'vitest';
import type { AiKeyStatus, StatementItem } from './aiBillingApi';
import type { TokenUsageSnapshot } from '../../hooks/useTokenTracker';
import { chipView, itemsOfDay, quotaRow, quotaTone, summarizeDay, vnDayOf } from './usageToday';

const status = (patch: Partial<AiKeyStatus>): AiKeyStatus => ({
  gateEnabled: true, exempt: false, balanceVnd: 48_200, todayVnd: 1_300, todayCalls: 4, mode: 'both', ...patch,
}) as AiKeyStatus;

const item = (patch: Partial<StatementItem>): StatementItem => ({
  id: 'x', at: '2026-09-30T02:00:00.000Z', feature: 'gradeOne', model: 'gemini-3.8-flash', refs: {},
  inputTokens: 1000, outputTokens: 200, thoughtsTokens: 50, cachedTokens: 400, costUsd: 0.001,
  usdVnd: 26_000, grossVnd: 26, discountPct: 0, voucherCode: null, chargeVnd: 26, ...patch,
});

describe('chip Ví AI', () => {
  it('đang trừ ví: hiện tiền còn lại và tiền đã trừ hôm nay', () => {
    expect(chipView(status({}))).toEqual({ wallet: 'Ví 48.200đ', today: 'hôm nay −1.300đ', tone: 'ok' });
  });

  it('hôm nay chưa tốn gì thì ghi 0đ, không ghi "−0đ"', () => {
    expect(chipView(status({ todayVnd: 0 })).today).toBe('hôm nay 0đ');
  });

  it('sắp hết / hết số dư đổi màu; số dư âm nhẹ do lượt chạy song song vẫn hiện 0đ', () => {
    expect(chipView(status({ balanceVnd: 9_999 })).tone).toBe('low');
    expect(chipView(status({ balanceVnd: 0 })).tone).toBe('empty');
    expect(chipView(status({ balanceVnd: -700 }))).toMatchObject({ wallet: 'Ví 0đ', tone: 'empty' });
  });

  it('có khoá riêng đang dùng được thì ví hết không báo động đỏ (ví chỉ là dự phòng); khoá hết hạn mức thì vẫn báo', () => {
    expect(chipView(status({ balanceVnd: 0, hasKey: true, keyStatus: 'ok' })).tone).toBe('info');
    expect(chipView(status({ balanceVnd: 0, hasKey: true, keyStatus: 'exhausted' })).tone).toBe('empty');
    expect(chipView(status({ balanceVnd: 50_000, hasKey: true, keyStatus: 'ok' })).tone).toBe('ok');
    // Chỉ khoá riêng: ví không dùng nên không báo động; chỉ ví web: ví hết là dừng thật dù có khoá riêng
    expect(chipView(status({ balanceVnd: 0, mode: 'own' })).tone).toBe('info');
    expect(chipView(status({ balanceVnd: 0, mode: 'wallet', hasKey: true, keyStatus: 'ok' })).tone).toBe('empty');
  });

  it('chưa bật tính phí hoặc được miễn: không nói "Ví", số hôm nay là giá gốc tham khảo', () => {
    expect(chipView(status({ gateEnabled: false }))).toEqual({ wallet: 'Chưa tính phí', today: 'hôm nay ~1.300đ', tone: 'info' });
    expect(chipView(status({ exempt: true }))).toEqual({ wallet: 'Không trừ ví', today: 'hôm nay ~1.300đ', tone: 'info' });
  });
});

describe('gom lượt theo ngày giờ Việt Nam', () => {
  it('23:30 UTC đã là sáng hôm sau ở Việt Nam', () => {
    expect(vnDayOf('2026-09-29T23:30:00.000Z')).toBe('2026-09-30');
    expect(vnDayOf('2026-09-30T16:59:00.000Z')).toBe('2026-09-30');
    expect(vnDayOf('2026-09-30T17:00:00.000Z')).toBe('2026-10-01');
    expect(vnDayOf('không phải ngày')).toBe('');
  });

  it('chỉ lấy đúng ngày, mới nhất trước; token suy nghĩ gộp vào cột ra', () => {
    const items = [
      item({ id: 'a', at: '2026-09-30T01:00:00.000Z' }),
      item({ id: 'b', at: '2026-09-29T20:00:00.000Z', chargeVnd: 100 }), // 03:00 ngày 30 giờ VN
      item({ id: 'c', at: '2026-09-29T10:00:00.000Z', chargeVnd: 999 }), // ngày 29
    ];
    expect(itemsOfDay(items, '2026-09-30').map(i => i.id)).toEqual(['a', 'b']);
    expect(summarizeDay(items, '2026-09-30')).toEqual({ calls: 2, inputTokens: 2000, outputTokens: 500, cachedTokens: 800, chargeVnd: 126 });
    expect(summarizeDay(items, '2026-01-01').calls).toBe(0);
  });
});

describe('còn lại của khoá riêng (kiểu 9Router)', () => {
  const snap = (requests: number, rpd: number | null): TokenUsageSnapshot => ({
    provider: 'gemini', model: 'gemini-3.8-flash', dateKey: '2026_09_30', requestsToday: requests, tokensToday: 12_345,
    tokensLastMinute: 0, requestsLastMinute: 0, isMinuteLimited: false, isTokenMinuteLimited: false,
    limit: rpd === null ? undefined : { provider: 'gemini', model: 'gemini-3.8-flash', displayName: 'Gemini 3.8 Flash', rpm: 30, rpd, tpm: 1_000_000 },
  });

  it('% còn lại so với hạn mức lượt/ngày tham chiếu', () => {
    expect(quotaRow(snap(125, 500))).toMatchObject({ label: 'Gemini 3.8 Flash', requests: 125, limit: 500, remainingPct: 75 });
    expect(quotaRow(snap(600, 500)).remainingPct).toBe(0);
  });

  it('không biết hạn mức thì không bịa ra thanh: chỉ còn số đã dùng', () => {
    expect(quotaRow(snap(10, null))).toMatchObject({ label: 'gemini-3.8-flash', limit: null, remainingPct: null });
  });

  it('màu theo phần còn lại', () => {
    expect([quotaTone(93), quotaTone(40), quotaTone(41), quotaTone(15), quotaTone(0), quotaTone(null)])
      .toEqual(['ok', 'warn', 'ok', 'danger', 'danger', 'none']);
  });
});

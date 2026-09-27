import { describe, expect, it } from 'vitest';
import { costUsdOfCall, priceFor, usdToVnd } from './aiPricing';
import { aggregateUsage, allocateByCount, buildBillingCsv, resolveBillTo, type OwnerMaps, type UsageRecord } from './billing';
import { isAdminEmail } from './adminConfig';

const maps: OwnerMaps = {
  submissionOwner: new Map([['sub-1', 'gv-cuong']]),
  assignmentOwner: new Map([['bai-1', 'gv-hanh']]),
  classOwner: new Map([['lop-1', 'gv-van']]),
  studentLinkOwner: new Map([['hs-anon', 'gv-hong']]),
};

const rec = (patch: Partial<UsageRecord>): UsageRecord => ({
  day: '2026-09-25', model: 'gemini-3.8-flash', feature: 'gradeOne', uid: null, anonymous: false, refs: {},
  inputTokens: 1_000_000, outputTokens: 0, thoughtsTokens: 0, cachedTokens: 0, ...patch,
});

describe('bảng giá theo ngày (nguồn chính thức)', () => {
  it('Flash: giá khuyến mãi tới 31/12/2026, gấp đôi từ 01/01/2027', () => {
    expect(priceFor('gemini-3.8-flash', '2026-12-31')).toEqual({ input: 0.75, output: 3.75, cached: 0.075 });
    expect(priceFor('gemini-3.8-flash', '2027-01-01')).toEqual({ input: 1.5, output: 7.5, cached: 0.15 });
  });

  it('3.1 Pro: prompt > 200k token dùng giá cao', () => {
    expect(priceFor('gemini-3.1-pro-preview', '2026-09-01', 150_000)?.input).toBe(2);
    expect(priceFor('gemini-3.1-pro-preview', '2026-09-01', 250_000)?.input).toBe(4);
  });

  it('token suy nghĩ tính theo giá đầu ra; phần cache tính giá cache', () => {
    // 1M vào (trong đó 200k cache) + 100k ra + 100k suy nghĩ, 3.8 Flash năm 2026
    const usd = costUsdOfCall('gemini-3.8-flash', '2026-09-25', { inputTokens: 1_000_000, cachedTokens: 200_000, outputTokens: 100_000, thoughtsTokens: 100_000 });
    expect(usd).toBeCloseTo(0.8 * 0.75 + 0.2 * 0.075 + 0.2 * 3.75, 10);
    expect(usdToVnd(1, 26_190)).toBe(26_190);
  });

  it('model chưa có giá thì trả null (không đoán)', () => {
    expect(costUsdOfCall('model-la', '2026-09-25', { inputTokens: 1, outputTokens: 1, thoughtsTokens: 0, cachedTokens: 0 })).toBeNull();
  });
});

describe('ai chịu tiền', () => {
  it('ưu tiên bài nộp → bài giao → lớp; học sinh ẩn danh tính cho GV chủ lớp; GV tự gọi tính cho chính GV', () => {
    expect(resolveBillTo({ uid: 'hs-x', anonymous: true, refs: { submissionId: 'sub-1', classId: 'lop-1' } }, maps)).toBe('gv-cuong');
    expect(resolveBillTo({ uid: 'gv-x', anonymous: false, refs: { assignmentId: 'bai-1' } }, maps)).toBe('gv-hanh');
    expect(resolveBillTo({ uid: 'gv-x', anonymous: false, refs: { classId: 'lop-1' } }, maps)).toBe('gv-van');
    expect(resolveBillTo({ uid: 'hs-anon', anonymous: true, refs: {} }, maps)).toBe('gv-hong');
    expect(resolveBillTo({ uid: 'gv-tu-goi', anonymous: false, refs: {} }, maps)).toBe('gv-tu-goi');
    expect(resolveBillTo({ uid: 'hs-la', anonymous: true, refs: {} }, maps)).toBeNull();
  });

  it('gom theo giáo viên, cộng tiền, đánh dấu lượt model chưa có giá', () => {
    const rows = aggregateUsage([
      rec({ refs: { submissionId: 'sub-1' } }),
      rec({ refs: { submissionId: 'sub-1' }, model: 'model-la' }),
      rec({ uid: 'hs-la', anonymous: true }),
    ], maps);
    const cuong = rows.find(r => r.billTo === 'gv-cuong')!;
    expect(cuong.calls).toBe(2);
    expect(cuong.costUsd).toBeCloseTo(0.75, 10);
    expect(cuong.unpricedCalls).toBe(1);
    expect(rows.find(r => r.billTo === 'unknown')?.calls).toBe(1);
  });
});

describe('ước tính trước bộ đếm', () => {
  it('chia tổng Google thực thu theo tỷ lệ số lượt chấm, tổng khớp đến từng đồng', () => {
    const out = allocateByCount(356_000, { a: 1, b: 1, c: 1 });
    expect(out.a + out.b + out.c).toBe(356_000);
    expect(Math.max(out.a, out.b, out.c) - Math.min(out.a, out.b, out.c)).toBeLessThanOrEqual(1);
    expect(allocateByCount(100, {})).toEqual({});
  });

  it('CSV có tổng cộng và ghi rõ tỷ giá', () => {
    const csv = buildBillingCsv([{ teacherLabel: 'Cường', calls: 3, inputTokens: 10, outputTokens: 5, costUsd: 0.5, measuredVnd: 13_095, estimatedVnd: 1000 }],
      { period: '09/2026', usdVnd: 26_190, rateNote: 'Vietcombank bán ra 24/09/2026' });
    expect(csv).toContain('Vietcombank bán ra 24/09/2026');
    expect(csv).toContain('"Tổng cộng"');
    expect(csv).toContain('"14095"');
  });
});

it('chỉ email chủ dự án là admin', () => {
  expect(isAdminEmail('CongaPro60@gmail.com ')).toBe(true);
  expect(isAdminEmail('someone@gmail.com')).toBe(false);
  expect(isAdminEmail(null)).toBe(false);
});

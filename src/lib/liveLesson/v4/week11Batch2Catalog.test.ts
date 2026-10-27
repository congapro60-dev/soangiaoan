import { describe, expect, it } from 'vitest';
import { getBanToanV4Contract, getBanToanV4PackageMetadata } from './lessonAdapter';
import { getBanToanV4ContractByPackageId } from './lessonRegistry';
import { validateV4Contract } from './validateContract';
import { W11BATCH2 } from './week11Batch2Catalog';

describe('Batch 2 Tuần 11 nạp được vào registry', () => {
  it('W11BATCH2 không rỗng (it.each trên mảng rỗng sinh 0 test)', () => {
    expect(W11BATCH2.length).toBeGreaterThan(0);
  });

  it('merge batch2 không làm mất gói gốc', () => {
    expect(getBanToanV4Contract('10-5-31')).toBeDefined();
    expect(getBanToanV4Contract('12-11-80')).toBeDefined();
  });

  it.each(W11BATCH2)('$key có contract 2400s và qua validate', ({ key }) => {
    const contract = getBanToanV4Contract(key);
    expect(contract.sourceKey).toBe(key);
    expect(contract.durationSeconds).toBe(2400);
    expect(validateV4Contract(contract).errors).toEqual([]);
  });

  it.each(W11BATCH2)('$key có AI error riêng theo key', ({ key }) => {
    expect(getBanToanV4Contract(key).aiError.id).toBe(`ai-error-${key}`);
  });

  it.each(W11BATCH2)('$key có metadata packageId khớp quy ước', ({ key, grade, period, title }) => {
    const metadata = getBanToanV4PackageMetadata().find(item => item.sourceKey === key);
    expect(metadata?.packageId).toBe(`g${grade}_w11_p${period}_v4`);
    expect(metadata?.title).toBe(title);
    expect(getBanToanV4ContractByPackageId(metadata!.packageId)?.sourceKey).toBe(key);
  });

  it('11-11-78 chạy timeline Gate D riêng (thầy duyệt 1-2-3-5-3-1-7-3-5-8-2 phút)', () => {
    const spans = getBanToanV4Contract('11-11-78').timeline.map((b) => [b.startSeconds, b.endSeconds]);
    expect(spans).toEqual([
      [0, 60], [60, 180], [180, 300], [300, 600], [600, 780], [780, 840],
      [840, 1260], [1260, 1440], [1440, 1740], [1740, 2220], [2220, 2400],
    ]);
  });

  it('bài không khai báo timelineKey giữ TIMELINE chung (10-11-80 chặng 5 = 960–1140)', () => {
    const t = getBanToanV4Contract('10-11-80').timeline;
    expect(t[4].startSeconds).toBe(960);
    expect(t[4].endSeconds).toBe(1140);
  });
});

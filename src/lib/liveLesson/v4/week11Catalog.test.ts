import { describe, expect, it } from 'vitest';
import { getBanToanV4Contract, getBanToanV4PackageMetadata } from './lessonAdapter';
import { getBanToanV4ContractByPackageId, getBanToanV4SourceKeyForLesson } from './lessonRegistry';
import { validateV4Contract } from './validateContract';
import { INTERACTIVE_SOURCE_KEYS } from './sequentialPublication';

// sourceKey = grade-week-period, với period là số tiết PPCT thật (periodNo).
const W11 = [
  { key: '10-11-79', grade: '10', period: 79 },
  { key: '11-11-75', grade: '11', period: 75 },
  { key: '12-11-80', grade: '12', period: 80 },
] as const;

describe('Ba bài Tuần 11 nạp được vào registry', () => {
  it.each(W11)('$key có contract và qua validate', ({ key }) => {
    const contract = getBanToanV4Contract(key);
    expect(contract.sourceKey).toBe(key);
    expect(contract.durationSeconds).toBe(2400);
    expect(validateV4Contract(contract).errors).toEqual([]);
  });

  it.each(W11)('$key có AI error riêng theo key', ({ key }) => {
    expect(getBanToanV4Contract(key).aiError.id).toBe(`ai-error-${key}`);
  });

  it.each(W11)('$key có timeline phủ kín 0–2400 giây không hở', ({ key }) => {
    const blocks = getBanToanV4Contract(key).timeline;
    expect(blocks[0].startSeconds).toBe(0);
    expect(blocks[blocks.length - 1].endSeconds).toBe(2400);
    for (let i = 1; i < blocks.length; i += 1) {
      expect(blocks[i].startSeconds).toBe(blocks[i - 1].endSeconds);
    }
  });

  it.each(W11)('$key tra được từ tuần và tiết PPCT', ({ key, grade, period }) => {
    expect(getBanToanV4SourceKeyForLesson({ grade, curriculumRef: { week: '11', period: String(period) } } as never)).toBe(key);
  });

  it('mỗi bài có đúng 3 tuyến M–S–C', () => {
    for (const { key } of W11) {
      expect(getBanToanV4Contract(key).taskVariants.map(item => item.route)).toEqual(['M', 'S', 'C']);
    }
  });

  it('metadata packageId tra ngược được về source key', () => {
    const metadata = getBanToanV4PackageMetadata().find(item => item.sourceKey === '11-11-75');
    expect(metadata).toBeTruthy();
    expect(getBanToanV4ContractByPackageId(metadata!.packageId)?.sourceKey).toBe('11-11-75');
  });

  it('chỉ đúng 76 bài Tuần 11-14 được đánh dấu interactive, các bài còn lại giữ self_study', () => {
    expect([...INTERACTIVE_SOURCE_KEYS].sort()).toEqual([
      '10-11-79', '10-11-80', '10-12-88', '10-12-89', '10-12-90', '10-12-91', '10-12-92', '10-12-93',
      '10-13-100', '10-13-101', '10-13-102', '10-13-103', '10-13-96', '10-13-97', '10-13-98', '10-13-99',
      '10-14-104', '10-14-105', '10-14-106', '10-14-107', '10-14-108', '10-14-109', '10-14-110', '10-14-111',
      '11-11-75', '11-11-76', '11-11-78', '11-11-79', '11-12-82', '11-12-83', '11-12-84', '11-12-85', '11-12-86', '11-12-87',
      '11-13-90', '11-13-91', '11-13-92', '11-13-93', '11-13-94', '11-13-95', '11-13-96', '11-13-97',
      '11-14-100', '11-14-101', '11-14-102', '11-14-103', '11-14-104', '11-14-105', '11-14-98', '11-14-99',
      '12-11-77', '12-11-78', '12-11-79', '12-11-80', '12-12-82', '12-12-83', '12-12-84', '12-12-85', '12-12-86', '12-12-87',
      '12-13-90', '12-13-91', '12-13-92', '12-13-93', '12-13-94', '12-13-95', '12-13-96', '12-13-97',
      '12-14-100', '12-14-101', '12-14-102', '12-14-103', '12-14-104', '12-14-105', '12-14-98', '12-14-99',
    ]);
    for (const key of INTERACTIVE_SOURCE_KEYS) {
      expect(getBanToanV4Contract(key).sourceKey).toBe(key);
    }
    expect(INTERACTIVE_SOURCE_KEYS.has('10-5-31')).toBe(false);
  });
});

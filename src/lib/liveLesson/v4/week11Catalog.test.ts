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

  it('chỉ đúng 170 bài Tuần 11-18 được đánh dấu interactive, các bài còn lại giữ self_study', () => {
    expect([...INTERACTIVE_SOURCE_KEYS].sort()).toEqual([
      '10-11-79', '10-11-80', '10-12-88', '10-12-89', '10-12-90', '10-12-91', '10-12-92', '10-12-93',
      '10-13-100', '10-13-101', '10-13-102', '10-13-103', '10-13-96', '10-13-97', '10-13-98', '10-13-99',
      '10-14-104', '10-14-105', '10-14-106', '10-14-107', '10-14-108', '10-14-109', '10-14-110', '10-14-111',
      '10-15-112', '10-15-113', '10-15-114', '10-15-115', '10-15-116', '10-15-117', '10-15-118', '10-15-119',
      '10-16-120', '10-16-121', '10-16-122', '10-16-123', '10-16-124', '10-16-125', '10-16-126', '10-16-127',
      '10-17-128', '10-17-129', '10-17-130', '10-17-131', '10-17-132', '10-17-133', '10-17-134', '10-17-135',
      '10-18-136', '10-18-137', '10-18-138', '10-18-139', '10-18-140', '10-18-141', '10-18-142', '10-18-143',
      '11-11-75', '11-11-76', '11-11-78', '11-11-79', '11-12-82', '11-12-83', '11-12-84', '11-12-85', '11-12-86', '11-12-87',
      '11-13-90', '11-13-91', '11-13-92', '11-13-93', '11-13-94', '11-13-95', '11-13-96', '11-13-97',
      '11-14-100', '11-14-101', '11-14-102', '11-14-103', '11-14-104', '11-14-105', '11-14-98', '11-14-99',
      '11-15-106', '11-15-107', '11-15-108', '11-15-109', '11-15-110', '11-15-111', '11-15-112', '11-15-113',
      '11-16-114', '11-16-115', '11-16-116', '11-16-117', '11-16-118', '11-16-119', '11-16-120', '11-16-121',
      '11-17-122', '11-17-123', '11-17-124', '11-17-125', '11-17-126', '11-17-127', '11-17-128', '11-17-129',
      '11-18-130', '11-18-131', '11-18-132', '11-18-133', '11-18-134', '11-18-135', '11-18-136', '11-18-137',
      '12-11-77', '12-11-78', '12-11-79', '12-11-80', '12-12-82', '12-12-83', '12-12-84', '12-12-85', '12-12-86', '12-12-87',
      '12-13-90', '12-13-91', '12-13-92', '12-13-93', '12-13-94', '12-13-95', '12-13-96', '12-13-97',
      '12-14-100', '12-14-101', '12-14-102', '12-14-103', '12-14-104', '12-14-105', '12-14-98', '12-14-99',
      '12-15-106', '12-15-107', '12-15-108', '12-15-109', '12-15-110', '12-15-111', '12-15-112', '12-15-113',
      '12-16-114', '12-16-115', '12-16-116', '12-16-117', '12-16-118', '12-16-119', '12-16-120',
      '12-17-122', '12-17-123', '12-17-124', '12-17-125', '12-17-126', '12-17-127', '12-17-128',
      '12-18-130', '12-18-131', '12-18-132', '12-18-133', '12-18-134', '12-18-135', '12-18-136', '12-18-137',
    ]);
    for (const key of INTERACTIVE_SOURCE_KEYS) {
      expect(getBanToanV4Contract(key).sourceKey).toBe(key);
    }
    expect(INTERACTIVE_SOURCE_KEYS.has('10-5-31')).toBe(false);
  });
});

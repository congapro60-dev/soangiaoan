import { describe, expect, it } from 'vitest';
import { getBanToanV4Contract, getBanToanV4PackageMetadata } from './lessonAdapter';
import { getBanToanV4ContractByPackageId } from './lessonRegistry';
import { validateV4Contract } from './validateContract';
import { W11BATCH2 } from './week11Batch2Catalog';

describe('Batch 2 Tuần 11 nạp được vào registry', () => {
  it('W11BATCH2 không rỗng (it.each trên mảng rỗng sinh 0 test)', () => {
    expect(W11BATCH2.length).toBeGreaterThan(0);
  });

  it('Cổng chốt catalog batch2 — đủ đúng key mới nghiệm thu đợt (Task 11 Step 1b)', () => {
    expect(W11BATCH2).toHaveLength(167);
    expect(W11BATCH2.map((e) => e.key)).toEqual([
      '10-11-80', '11-11-76', '11-11-78', '11-11-79', '12-11-77', '12-11-78', '12-11-79',
      '10-12-88', '11-12-82', '12-12-82', '12-12-83', '12-12-84', '12-12-85', '12-12-86', '12-12-87',
      '10-12-89', '10-12-90', '10-12-91', '10-12-92', '10-12-93',
      '11-12-83', '11-12-84', '11-12-85', '11-12-86', '11-12-87',
      '10-13-96', '10-13-97', '10-13-98', '10-13-99', '10-13-100', '10-13-101', '10-13-102', '10-13-103',
      '11-13-90', '11-13-91', '11-13-92', '11-13-93', '11-13-94', '11-13-95', '11-13-96', '11-13-97',
      '12-13-90', '12-13-91', '12-13-92', '12-13-93', '12-13-94', '12-13-95', '12-13-96', '12-13-97',
      '10-14-104', '10-14-105', '10-14-106', '10-14-107', '10-14-108', '10-14-109', '10-14-110', '10-14-111',
      '11-14-98', '11-14-99', '11-14-100', '11-14-101', '11-14-102', '11-14-103', '11-14-104', '11-14-105',
      '12-14-98', '12-14-99', '12-14-100', '12-14-101', '12-14-102', '12-14-103', '12-14-104', '12-14-105',
      '10-15-112', '10-15-113', '10-15-114', '10-15-115', '10-15-116', '10-15-117', '10-15-118', '10-15-119',
      '11-15-106', '11-15-107', '11-15-108', '11-15-109', '11-15-110', '11-15-111', '11-15-112', '11-15-113',
      '12-15-106', '12-15-107', '12-15-108', '12-15-109', '12-15-110', '12-15-111', '12-15-112', '12-15-113',
      '10-16-120', '10-16-121', '10-16-122', '10-16-123', '10-16-124', '10-16-125', '10-16-126', '10-16-127',
      '11-16-114', '11-16-115', '11-16-116', '11-16-117', '11-16-118', '11-16-119', '11-16-120', '11-16-121',
      '12-16-114', '12-16-115', '12-16-116', '12-16-117', '12-16-118', '12-16-119', '12-16-120',
      '10-17-128', '10-17-129', '10-17-130', '10-17-131', '10-17-132', '10-17-133', '10-17-134', '10-17-135',
      '11-17-122', '11-17-123', '11-17-124', '11-17-125', '11-17-126', '11-17-127', '11-17-128', '11-17-129',
      '12-17-122', '12-17-123', '12-17-124', '12-17-125', '12-17-126', '12-17-127', '12-17-128',
      '10-18-136', '10-18-137', '10-18-138', '10-18-139', '10-18-140', '10-18-141', '10-18-142', '10-18-143',
      '11-18-130', '11-18-131', '11-18-132', '11-18-133', '11-18-134', '11-18-135', '11-18-136', '11-18-137',
      '12-18-130', '12-18-131', '12-18-132', '12-18-133', '12-18-134', '12-18-135', '12-18-136', '12-18-137',
    ]);
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
    const week = key.includes('-18-') ? 18 : key.includes('-17-') ? 17 : key.includes('-16-') ? 16 : key.includes('-15-') ? 15 : key.includes('-14-') ? 14 : key.includes('-13-') ? 13 : key.includes('-12-') ? 12 : 11;
    expect(metadata?.packageId).toBe(`g${grade}_w${week}_p${period}_v4`);
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

  it('11-11-79 chạy timeline Gate D riêng (thầy duyệt 1-4-2-5-3-1-8-5-6-3-2 phút)', () => {
    const spans = getBanToanV4Contract('11-11-79').timeline.map((b) => [b.startSeconds, b.endSeconds]);
    expect(spans).toEqual([
      [0, 60], [60, 300], [300, 420], [420, 720], [720, 900], [900, 960],
      [960, 1440], [1440, 1740], [1740, 2100], [2100, 2280], [2280, 2400],
    ]);
  });

  it('12-11-77 chạy timeline Gate D riêng (thầy duyệt 1-5-3-4-3-1-5-4-7-5-2 phút)', () => {
    const spans = getBanToanV4Contract('12-11-77').timeline.map((b) => [b.startSeconds, b.endSeconds]);
    expect(spans).toEqual([
      [0, 60], [60, 360], [360, 540], [540, 780], [780, 960], [960, 1020],
      [1020, 1320], [1320, 1560], [1560, 1980], [1980, 2280], [2280, 2400],
    ]);
  });

  it('12-11-78 chạy timeline Gate D riêng (thầy duyệt 1-4-3-4-3-1-8-5-6-3-2 phút, key gateD1278)', () => {
    const spans = getBanToanV4Contract('12-11-78').timeline.map((b) => [b.startSeconds, b.endSeconds]);
    expect(spans).toEqual([
      [0, 60], [60, 300], [300, 480], [480, 720], [720, 900], [900, 960],
      [960, 1440], [1440, 1740], [1740, 2100], [2100, 2340], [2340, 2400],
    ]);
  });

  it('12-11-79 chạy timeline Gate D riêng (thầy duyệt 1-4-2-5-2-1-8-2-7-4-4 phút, key gateD1279)', () => {
    const spans = getBanToanV4Contract('12-11-79').timeline.map((b) => [b.startSeconds, b.endSeconds]);
    expect(spans).toEqual([
      [0, 60], [60, 300], [300, 420], [420, 720], [720, 840], [840, 900],
      [900, 1380], [1380, 1500], [1500, 1920], [1920, 2160], [2160, 2400],
    ]);
  });

  it('11-12-82 chạy timeline Gate D riêng (3-4-2-5-3-1-8-3-5-3-3 phút)', () => {
    const spans = getBanToanV4Contract('11-12-82').timeline.map((b) => [b.startSeconds, b.endSeconds]);
    expect(spans).toEqual([
      [0, 180], [180, 420], [420, 540], [540, 840], [840, 1020], [1020, 1080],
      [1080, 1560], [1560, 1740], [1740, 2040], [2040, 2220], [2220, 2400],
    ]);
  });

  it('12-12-82 chạy timeline Gate D riêng (3-4-2-6-3-1-7-3-5-3-3 phút)', () => {
    const spans = getBanToanV4Contract('12-12-82').timeline.map((b) => [b.startSeconds, b.endSeconds]);
    expect(spans).toEqual([
      [0, 180], [180, 420], [420, 540], [540, 900], [900, 1080], [1080, 1140],
      [1140, 1560], [1560, 1740], [1740, 2040], [2040, 2220], [2220, 2400],
    ]);
  });

  it('12-12-83 chạy timeline Gate D riêng (3-4-2-6-3-1-7-3-5-3-3 phút)', () => {
    const spans = getBanToanV4Contract('12-12-83').timeline.map((b) => [b.startSeconds, b.endSeconds]);
    expect(spans).toEqual([
      [0, 180], [180, 420], [420, 540], [540, 900], [900, 1080], [1080, 1140],
      [1140, 1560], [1560, 1740], [1740, 2040], [2040, 2220], [2220, 2400],
    ]);
  });

  it('12-12-84 chạy timeline Gate D riêng (3-4-2-6-3-1-7-3-5-3-3 phút)', () => {
    const spans = getBanToanV4Contract('12-12-84').timeline.map((b) => [b.startSeconds, b.endSeconds]);
    expect(spans).toEqual([
      [0, 180], [180, 420], [420, 540], [540, 900], [900, 1080], [1080, 1140],
      [1140, 1560], [1560, 1740], [1740, 2040], [2040, 2220], [2220, 2400],
    ]);
  });

  it('12-12-85 chạy timeline Gate D riêng (3-4-2-6-3-1-7-3-5-3-3 phút)', () => {
    const spans = getBanToanV4Contract('12-12-85').timeline.map((b) => [b.startSeconds, b.endSeconds]);
    expect(spans).toEqual([
      [0, 180], [180, 420], [420, 540], [540, 900], [900, 1080], [1080, 1140],
      [1140, 1560], [1560, 1740], [1740, 2040], [2040, 2220], [2220, 2400],
    ]);
  });

  it('12-12-86 chạy timeline Gate D riêng (3-4-2-6-3-1-7-3-5-3-3 phút)', () => {
    const spans = getBanToanV4Contract('12-12-86').timeline.map((b) => [b.startSeconds, b.endSeconds]);
    expect(spans).toEqual([
      [0, 180], [180, 420], [420, 540], [540, 900], [900, 1080], [1080, 1140],
      [1140, 1560], [1560, 1740], [1740, 2040], [2040, 2220], [2220, 2400],
    ]);
  });

  it('12-12-87 chạy timeline Gate D riêng (3-4-2-6-3-1-7-3-5-3-3 phút)', () => {
    const spans = getBanToanV4Contract('12-12-87').timeline.map((b) => [b.startSeconds, b.endSeconds]);
    expect(spans).toEqual([
      [0, 180], [180, 420], [420, 540], [540, 900], [900, 1080], [1080, 1140],
      [1140, 1560], [1560, 1740], [1740, 2040], [2040, 2220], [2220, 2400],
    ]);
  });

  it('fix2 — 12-11-77 liên kết nhiệm vụ theo PHASE (aiError=P10, route choice=P13), không theo id template', () => {
    const contract = getBanToanV4Contract('12-11-77');
    const byId = new Map(contract.timeline.map((b) => [b.id, b]));
    // Checkpoint gắn đúng block phase tương ứng của timeline Gate D 77
    expect(byId.get('P10')?.checkpointId).toBe('cp-ai-error');
    expect(byId.get('P13')?.checkpointId).toBe('cp-route-choice');
    expect(byId.get('P14')?.checkpointId).toBe('cp-group-product');
    expect(byId.get('P37')?.checkpointId).toBe('cp-exit-ticket');
    const postCheckCp = contract.checkpoints.find((cp) => cp.kind === 'post_check' && cp.id !== 'cp-exit-ticket');
    expect(byId.get('P21')?.checkpointId).toBe(postCheckCp?.id);
    // Binding ngoài timeline cũng suy theo phase
    expect(contract.aiError.stepId).toBe('P10');
    expect(contract.languageDemands.map((d) => d.stepId)).toEqual(['P01', 'P10', 'P21']);
    expect(contract.evidenceRules.map((r) => r.sourceStepId)).toEqual(['P05', 'P10', 'P14', 'P21']);
    expect(contract.fading.map((f) => f.stepId)).toEqual(['P14', 'P21']);
    expect(contract.groupingCheckpoints[0]?.stepId).toBe('P14');
  });

  it('fix2 — 12-11-78 liên kết nhiệm vụ theo PHASE (aiError=P10, route choice=P13), không theo id template', () => {
    const contract = getBanToanV4Contract('12-11-78');
    const byId = new Map(contract.timeline.map((b) => [b.id, b]));
    // Checkpoint gắn đúng block phase tương ứng của timeline Gate D 78 (g12)
    expect(byId.get('P10')?.checkpointId).toBe('cp-ai-error');
    expect(byId.get('P13')?.checkpointId).toBe('cp-route-choice');
    expect(byId.get('P14')?.checkpointId).toBe('cp-group-product');
    expect(byId.get('P37')?.checkpointId).toBe('cp-exit-ticket');
    const postCheckCp = contract.checkpoints.find((cp) => cp.kind === 'post_check' && cp.id !== 'cp-exit-ticket');
    expect(byId.get('P21')?.checkpointId).toBe(postCheckCp?.id);
    // Binding ngoài timeline cũng suy theo phase
    expect(contract.aiError.stepId).toBe('P10');
    expect(contract.languageDemands.map((d) => d.stepId)).toEqual(['P01', 'P10', 'P21']);
    expect(contract.evidenceRules.map((r) => r.sourceStepId)).toEqual(['P05', 'P10', 'P14', 'P21']);
    expect(contract.fading.map((f) => f.stepId)).toEqual(['P14', 'P21']);
    expect(contract.groupingCheckpoints[0]?.stepId).toBe('P14');
  });

  it('fix2 — 12-11-79 liên kết nhiệm vụ theo PHASE (aiError=P10, route choice=P13), không theo id template', () => {
    const contract = getBanToanV4Contract('12-11-79');
    const byId = new Map(contract.timeline.map((b) => [b.id, b]));
    // Checkpoint gắn đúng block phase tương ứng của timeline Gate D 79 (g12)
    expect(byId.get('P10')?.checkpointId).toBe('cp-ai-error');
    expect(byId.get('P13')?.checkpointId).toBe('cp-route-choice');
    expect(byId.get('P14')?.checkpointId).toBe('cp-group-product');
    expect(byId.get('P37')?.checkpointId).toBe('cp-exit-ticket');
    const postCheckCp = contract.checkpoints.find((cp) => cp.kind === 'post_check' && cp.id !== 'cp-exit-ticket');
    expect(byId.get('P21')?.checkpointId).toBe(postCheckCp?.id);
    // Binding ngoài timeline cũng suy theo phase
    expect(contract.aiError.stepId).toBe('P10');
    expect(contract.languageDemands.map((d) => d.stepId)).toEqual(['P01', 'P10', 'P21']);
    expect(contract.evidenceRules.map((r) => r.sourceStepId)).toEqual(['P05', 'P10', 'P14', 'P21']);
    expect(contract.fading.map((f) => f.stepId)).toEqual(['P14', 'P21']);
    expect(contract.groupingCheckpoints[0]?.stepId).toBe('P14');
  });
  it('fix2 — 11-11-79 liên kết nhiệm vụ theo PHASE (aiError=P10, route choice=P13), không theo id template', () => {
    const contract = getBanToanV4Contract('11-11-79');
    const byId = new Map(contract.timeline.map((b) => [b.id, b]));
    // Checkpoint gắn đúng block phase tương ứng của timeline Gate D 79
    expect(byId.get('P10')?.checkpointId).toBe('cp-ai-error');
    expect(byId.get('P13')?.checkpointId).toBe('cp-route-choice');
    expect(byId.get('P14')?.checkpointId).toBe('cp-group-product');
    expect(byId.get('P37')?.checkpointId).toBe('cp-exit-ticket');
    const postCheckCp = contract.checkpoints.find((cp) => cp.kind === 'post_check' && cp.id !== 'cp-exit-ticket');
    expect(byId.get('P21')?.checkpointId).toBe(postCheckCp?.id);
    // Binding ngoài timeline cũng suy theo phase
    expect(contract.aiError.stepId).toBe('P10');
    expect(contract.languageDemands.map((d) => d.stepId)).toEqual(['P01', 'P10', 'P21']);
    expect(contract.evidenceRules.map((r) => r.sourceStepId)).toEqual(['P05', 'P10', 'P14', 'P21']);
    expect(contract.fading.map((f) => f.stepId)).toEqual(['P14', 'P21']);
    expect(contract.groupingCheckpoints[0]?.stepId).toBe('P14');
  });

  it('bài không khai báo timelineKey giữ TIMELINE chung (10-11-80 chặng 5 = 960–1140)', () => {
    const t = getBanToanV4Contract('10-11-80').timeline;
    expect(t[4].startSeconds).toBe(960);
    expect(t[4].endSeconds).toBe(1140);
  });

  it('fix2 — 11-11-78 liên kết nhiệm vụ theo PHASE (aiError=P10, route choice=P13), không theo id template', () => {
    const contract = getBanToanV4Contract('11-11-78');
    const byId = new Map(contract.timeline.map((b) => [b.id, b]));
    // Checkpoint gắn đúng block phase tương ứng của timeline Gate D
    expect(byId.get('P10')?.checkpointId).toBe('cp-ai-error');
    expect(byId.get('P13')?.checkpointId).toBe('cp-route-choice');
    expect(byId.get('P14')?.checkpointId).toBe('cp-group-product');
    expect(byId.get('P37')?.checkpointId).toBe('cp-exit-ticket');
    const postCheckCp = contract.checkpoints.find((cp) => cp.kind === 'post_check' && cp.id !== 'cp-exit-ticket');
    expect(byId.get('P21')?.checkpointId).toBe(postCheckCp?.id);
    // Binding ngoài timeline cũng suy theo phase
    expect(contract.aiError.stepId).toBe('P10');
    expect(contract.languageDemands.map((d) => d.stepId)).toEqual(['P01', 'P10', 'P21']);
    expect(contract.evidenceRules.map((r) => r.sourceStepId)).toEqual(['P05', 'P10', 'P14', 'P21']);
    expect(contract.fading.map((f) => f.stepId)).toEqual(['P14', 'P21']);
    expect(contract.groupingCheckpoints[0]?.stepId).toBe('P14');
  });

  it('fix2 — bài không timelineKey giữ nguyên binding template (không hồi quy)', () => {
    const contract = getBanToanV4Contract('10-11-80');
    const byId = new Map(contract.timeline.map((b) => [b.id, b]));
    expect(byId.get('P16')?.checkpointId).toBe('cp-ai-error');
    expect(byId.get('P19')?.checkpointId).toBe('cp-route-choice');
    expect(byId.get('P20')?.checkpointId).toBe('cp-group-product');
    expect(byId.get('P38')?.checkpointId).toBe('cp-exit-ticket');
    expect(contract.aiError.stepId).toBe('P16');
    expect(contract.languageDemands.map((d) => d.stepId)).toEqual(['P03', 'P16', 'P27']);
    expect(contract.evidenceRules.map((r) => r.sourceStepId)).toEqual(['P08', 'P16', 'P20', 'P27']);
    expect(contract.groupingCheckpoints[0]?.stepId).toBe('P20');
  });
});

import { describe, expect, it } from 'vitest';
import { getBanToanV4Contract, getBanToanV4PackageMetadata } from './lessonAdapter';
import { getBanToanV4ContractByPackageId } from './lessonRegistry';
import { validateV4Contract } from './validateContract';
import { W11BATCH2 } from './week11Batch2Catalog';

describe('Batch 2 Tuần 11 nạp được vào registry', () => {
  it('W11BATCH2 không rỗng (it.each trên mảng rỗng sinh 0 test)', () => {
    expect(W11BATCH2.length).toBeGreaterThan(0);
  });

  it('Cổng chốt catalog batch2 — đủ đúng 7 key mới nghiệm thu đợt (Task 11 Step 1b)', () => {
    expect(W11BATCH2).toHaveLength(7);
    expect(W11BATCH2.map((e) => e.key)).toEqual(['10-11-80', '11-11-76', '11-11-78', '11-11-79', '12-11-77', '12-11-78', '12-11-79']);
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

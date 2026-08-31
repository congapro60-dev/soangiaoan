import { describe, expect, it } from 'vitest';
import { validateV4Contract } from './validateContract';
import {
  getAllBanToanV4Contracts,
  getBanToanV4Contract,
  getBanToanV4DisplayTitle,
  getBanToanV4PackageMetadata,
} from './lessonAdapter';

describe('Ban Toán W5–W6 → V4 lesson adapter', () => {
  it('builds the three representative modes with source identity', () => {
    const formation = getBanToanV4Contract('10-5-31');
    const practice = getBanToanV4Contract('11-6-35');
    const elective = getBanToanV4Contract('10-5-37');

    expect(formation.lessonMode).toBe('formation');
    expect(practice.lessonMode).toBe('practice');
    expect(elective.lessonMode).toBe('elective-practice');
    expect(formation.sourceKey).toBe('10-5-31');
    expect(formation.sourceFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(formation.sourceContent?.examples).toHaveLength(2);
    expect(formation.sourceContent?.exercises).toHaveLength(6);
    expect(formation.sourceContent?.quickChecks).toHaveLength(2);
    expect(formation.sourceContent?.formulas.length).toBeGreaterThan(0);
    expect(formation.sourceContent?.formulas[0]).toBeTruthy();
    expect(formation.sourceContent?.mistakes.length).toBeGreaterThan(0);
    expect(elective.choicePolicy?.enabled).toBe(true);
    expect(elective.choicePolicy?.commonPostCheckId).toBe('cp-post-check');
  });

  it('keeps the common 40-minute spine and all route/post-check evidence', () => {
    const contracts = ['10-5-31', '10-5-37', '11-6-40'].map(getBanToanV4Contract);
    for (const contract of contracts) {
      expect(contract.durationSeconds).toBe(2400);
      expect(contract.timeline[0].startSeconds).toBe(0);
      expect(contract.timeline.at(-1)?.endSeconds).toBe(2400);
      expect(contract.taskVariants.map((task) => task.route)).toEqual(['M', 'S', 'C']);
      expect(contract.taskVariants.every((task) => task.postCheckId === 'cp-post-check')).toBe(true);
      expect(contract.groupingCheckpoints[0]?.postCheckId).toBe('cp-post-check');
      expect(contract.taskVariants.every((task) => task.prompt.length > 12)).toBe(true);
      expect(validateV4Contract(contract)).toEqual({ ok: true, errors: [] });
    }
  });

  it('generates exactly 48 unique packages without relying on stale lesson-data.json', () => {
    const contracts = getAllBanToanV4Contracts();
    const metadata = getBanToanV4PackageMetadata();

    expect(contracts).toHaveLength(48);
    expect(metadata).toHaveLength(48);
    expect(new Set(contracts.map((contract) => contract.sourceKey)).size).toBe(48);
    expect(new Set(contracts.map((contract) => contract.id)).size).toBe(48);
    expect(contracts.filter((contract) => contract.lessonMode === 'formation')).toHaveLength(21);
    expect(contracts.filter((contract) => contract.lessonMode === 'practice')).toHaveLength(17);
    expect(contracts.filter((contract) => contract.lessonMode === 'elective-practice')).toHaveLength(10);
    expect(contracts.every((contract) => validateV4Contract(contract).ok)).toBe(true);
  });

  it('uses the searchable teacher-facing title style from the P31 demo', () => {
    expect(getBanToanV4DisplayTitle('10-5-31')).toBe('Bất phương trình bậc nhất hai ẩn — Tiết 1');
    expect(getBanToanV4DisplayTitle('10-5-32')).toBe('Biểu diễn miền nghiệm của bất phương trình — Tiết 2');
    expect(new Set(getAllBanToanV4Contracts().map((contract) => getBanToanV4DisplayTitle(contract.sourceKey))).size).toBe(48);
  });

  it('exposes every term used by language demands in the approved glossary', () => {
    for (const contract of getAllBanToanV4Contracts()) {
      const glossaryTerms = new Set(contract.glossary.map((item) => item.vietnamese));
      for (const demand of contract.languageDemands) {
        for (const term of demand.terms) expect(glossaryTerms.has(term)).toBe(true);
      }
    }
  });
});

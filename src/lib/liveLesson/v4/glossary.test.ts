import { describe, expect, it } from 'vitest';
import { buildStudentGlossaryPopup, findApprovedGlossaryItem } from './glossary';
import type { GlossaryItem } from './types';

const items: GlossaryItem[] = [
  {
    id: 'term-region', vietnamese: 'miền nghiệm', translations: { en: 'solution region', ja: '解領域' },
    plainExplanationVi: 'Tập hợp các điểm làm bất phương trình đúng.',
    plainExplanationByLanguage: { en: 'The set of points that make the inequality true.', ja: '不等式を真にする点の集合。' },
    notation: '3x + 2y ≤ 30', example: '(0;0) thuộc miền nghiệm vì 0 ≤ 30.', nonExample: '(10;10) không thuộc vì 50 > 30.',
    sourceRef: 'sgk', reviewer: 'reviewer', version: '1', status: 'approved',
  },
  {
    id: 'term-draft', vietnamese: 'đường biên', translations: { en: 'draft boundary' }, plainExplanationVi: 'Draft',
    plainExplanationByLanguage: { en: 'Draft explanation' }, sourceRef: 'ai-draft', reviewer: 'none', version: 'draft', status: 'draft',
  },
  {
    id: 'term-retired', vietnamese: 'bất phương trình', translations: { en: 'retired inequality' }, plainExplanationVi: 'Retired',
    plainExplanationByLanguage: { en: 'Retired explanation' }, sourceRef: 'old', reviewer: 'reviewer', version: 'old', status: 'retired',
  },
];

describe('glossary', () => {
  it('finds approved items by id or Vietnamese term only', () => {
    expect(findApprovedGlossaryItem(items, 'term-region')?.vietnamese).toBe('miền nghiệm');
    expect(findApprovedGlossaryItem(items, 'MIỀN NGHIỆM')?.id).toBe('term-region');
    expect(findApprovedGlossaryItem(items, 'term-draft')).toBeNull();
    expect(findApprovedGlossaryItem(items, 'bất phương trình')).toBeNull();
  });

  it('builds student popup payload from approved language fields and keeps notation unchanged', () => {
    expect(buildStudentGlossaryPopup(items, 'miền nghiệm', { language: 'ja', supportMode: 'bilingual', showGlossary: true, showSentenceFrames: true, curriculumBridgeIds: [] })).toEqual({
      id: 'term-region', vietnamese: 'miền nghiệm', translation: '解領域', explanationVi: 'Tập hợp các điểm làm bất phương trình đúng.',
      explanation: '不等式を真にする点の集合。', notation: '3x + 2y ≤ 30', example: '(0;0) thuộc miền nghiệm vì 0 ≤ 30.', nonExample: '(10;10) không thuộc vì 50 > 30.',
    });
  });

  it('falls back to Vietnamese when approved translation is missing and never calls AI', () => {
    expect(buildStudentGlossaryPopup(items, 'term-region', { language: 'zh', supportMode: 'approved_full_translation', showGlossary: true, showSentenceFrames: true, curriculumBridgeIds: [] })).toMatchObject({
      translation: undefined,
      explanation: 'Tập hợp các điểm làm bất phương trình đúng.',
    });
  });
});

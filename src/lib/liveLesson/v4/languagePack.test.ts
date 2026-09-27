import { describe, expect, it } from 'vitest';
import {
  getLocalizedStudentCopy,
  getStudentLanguagePack,
  hasReviewedStudentLanguagePack,
} from './languagePack';
import type { V4NonViLanguage } from './types';

describe('student language pack — P31', () => {
  it('returns reviewed English copy for student screens and checkpoints', () => {
    expect(getLocalizedStudentCopy('10-5-31', 'en', 'HS2')?.label).toBe('Personal goal');
    expect(getLocalizedStudentCopy('10-5-31', 'en', 'HS2')?.action).toContain('one personal goal');
    expect(getLocalizedStudentCopy('10-5-31', 'en', 'cp-ai-error')?.label).toContain('AI');
  });

  it('vi returns null so the runtime keeps the Vietnamese source copy', () => {
    expect(getLocalizedStudentCopy('10-5-31', 'vi', 'HS2')).toBeNull();
  });

  it('ja/ko/zh fail closed (no reviewed pack) → null, so runtime uses Vietnamese anchor', () => {
    for (const lang of ['ja', 'ko', 'zh'] as V4NonViLanguage[]) {
      expect(getStudentLanguagePack('10-5-31', lang)).toBeNull();
      expect(getLocalizedStudentCopy('10-5-31', lang, 'HS2')).toBeNull();
    }
  });

  it('returns null for an unknown definitionKey or unknown content key', () => {
    expect(getLocalizedStudentCopy('99-9-99', 'en', 'HS2')).toBeNull();
    expect(getLocalizedStudentCopy('10-5-31', 'en', 'no-such-key')).toBeNull();
    expect(getLocalizedStudentCopy(undefined, 'en', 'HS2')).toBeNull();
  });

  it('only English has a complete reviewed pack; others do not (no false full-translation claim)', () => {
    expect(hasReviewedStudentLanguagePack('10-5-31', 'en')).toBe(true);
    for (const lang of ['ja', 'ko', 'zh'] as V4NonViLanguage[]) {
      expect(hasReviewedStudentLanguagePack('10-5-31', lang)).toBe(false);
    }
    expect(hasReviewedStudentLanguagePack('99-9-99', 'en')).toBe(false);
  });

  it('keeps math notation unchanged in localized copy (formula invariance)', () => {
    // Keep the unknown sign unknown: the English support must not give the answer.
    expect(getLocalizedStudentCopy('10-5-31', 'en', 'cp-model')?.label).toContain('15x + 10y … 150');
    expect(getLocalizedStudentCopy('10-5-31', 'en', 'cp-model')?.label).not.toContain('≤');
    expect(getLocalizedStudentCopy('10-5-31', 'en', 'cp-postcheck')?.label).toContain('2x + y ≤ 12');
  });

  it('keeps the group task in period 31 and includes the new guiding and quick check prompts', () => {
    const group = getLocalizedStudentCopy('10-5-31', 'en', 'cp-group-product')?.label;
    expect(group).toContain('(4;8)');
    expect(group).toContain('(8;4)');
    expect(group).not.toMatch(/draw|boundary|half-plane/i);
    expect(getLocalizedStudentCopy('10-5-31', 'en', 'cp-guiding-question')?.label).toBeTruthy();
    expect(getLocalizedStudentCopy('10-5-31', 'en', 'cp-quick-check')?.label).toContain('3x + 2y ≤ 30');
  });

  it('carries no private fields (no teacherScript/PII/PIN/UID)', () => {
    const serialized = JSON.stringify(getStudentLanguagePack('10-5-31', 'en'));
    expect(serialized).not.toMatch(/teacherScript/i);
    expect(serialized).not.toMatch(/studentId|participantUid/i);
    expect(serialized).not.toMatch(/\bpin\b/i);
  });

  it('the reviewed English pack covers every student screen HS0..HS10', () => {
    for (let i = 0; i <= 10; i += 1) {
      const copy = getLocalizedStudentCopy('10-5-31', 'en', `HS${i}`);
      expect(copy?.label, `HS${i} label`).toBeTruthy();
      expect(copy?.action, `HS${i} action`).toBeTruthy();
    }
  });
});

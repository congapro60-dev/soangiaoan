import { describe, expect, it } from 'vitest';
import {
  buildStudentSupportModeOptions,
  changeStudentLanguageView,
  DEFAULT_STUDENT_LANGUAGE_VIEW,
  hasApprovedFullTranslationPack,
  resolveStudentLanguageView,
  sanitizeStudentLanguagePreference,
} from './languageSupport';
import type { GlossaryItem, StudentLanguageView, VerifiedLanguageSupportPlan } from './types';

describe('languageSupport', () => {
  it('defaults to vi_anchor when no valid saved preference exists', () => {
    expect(resolveStudentLanguageView(null)).toEqual({ view: DEFAULT_STUDENT_LANGUAGE_VIEW, source: 'default' });
    expect(resolveStudentLanguageView({ language: 'fr', supportMode: 'bilingual' })).toEqual({ view: DEFAULT_STUDENT_LANGUAGE_VIEW, source: 'default' });
  });

  it('reuses a valid session or local preference and does not force reselection', () => {
    const saved: StudentLanguageView = {
      language: 'ja', supportMode: 'bilingual', showGlossary: true, showSentenceFrames: true, curriculumBridgeIds: ['bridge-halfplane'],
    };

    expect(resolveStudentLanguageView(saved)).toEqual({ view: saved, source: 'saved' });
  });

  it.each(['en', 'ja', 'ko', 'zh'] as const)('allows an explicit change path for %s without treating language as ability', language => {
    const changed = changeStudentLanguageView(DEFAULT_STUDENT_LANGUAGE_VIEW, { language, supportMode: 'approved_full_translation' });

    expect(changed).toMatchObject({ language, supportMode: 'approved_full_translation', showGlossary: true, showSentenceFrames: true });
    expect(JSON.stringify(changed)).not.toMatch(/score|competence|ability|tier|needs/i);
  });

  it('sanitizes only the non-sensitive student view and never carries verified support plans', () => {
    const supportPlan: VerifiedLanguageSupportPlan = {
      studentId: 'student-private-1', schoolVerified: true, tier: 'intensive', needs: ['extra_processing_time'], sourceRef: 'school-file', reviewedAt: 1,
    };
    const dirty = {
      language: 'ko', supportMode: 'bilingual', showGlossary: true, showSentenceFrames: true,
      curriculumBridgeIds: ['bridge-halfplane', '../bad', 'x'.repeat(80)], languageSupportPlan: supportPlan,
    };

    const sanitized = sanitizeStudentLanguagePreference(dirty);

    expect(sanitized).toEqual({ language: 'ko', supportMode: 'bilingual', showGlossary: true, showSentenceFrames: true, curriculumBridgeIds: ['bridge-halfplane'] });
    expect(JSON.stringify(sanitized)).not.toContain('student-private-1');
    expect(JSON.stringify(sanitized)).not.toContain('intensive');
  });

  it('keeps curriculum bridge references on the reviewed allowlist', () => {
    expect(sanitizeStudentLanguagePreference({
      language: 'en', supportMode: 'bilingual', showGlossary: true, showSentenceFrames: true,
      curriculumBridgeIds: ['bridge-halfplane', 'unreviewed-bridge'],
    })).toEqual({
      language: 'en', supportMode: 'bilingual', showGlossary: true, showSentenceFrames: true,
      curriculumBridgeIds: ['bridge-halfplane'],
    });
  });

  it('enables full translation only when localized lesson text and every glossary term are approved', () => {
    const glossary: GlossaryItem[] = [{
      id: 'term-inequality',
      vietnamese: 'Bất phương trình',
      translations: { en: 'Inequality' },
      plainExplanationVi: 'Mệnh đề có dấu so sánh.',
      plainExplanationByLanguage: { en: 'A statement with a comparison sign.' },
      sourceRef: 'reviewed-pack',
      reviewer: 'teacher',
      version: '1',
      status: 'approved',
    }];

    expect(hasApprovedFullTranslationPack('en', glossary, false)).toBe(false);
    expect(hasApprovedFullTranslationPack('en', glossary, true)).toBe(true);
    expect(buildStudentSupportModeOptions('en', false).find(option => option.mode === 'approved_full_translation'))
      .toMatchObject({ enabled: false });
    expect(buildStudentSupportModeOptions('en', true).find(option => option.mode === 'approved_full_translation'))
      .toMatchObject({ enabled: true });
  });
});

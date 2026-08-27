import type { StudentLanguageView, SupportMode, V4Language } from './types';

export const V4_LANGUAGES: readonly V4Language[] = ['vi', 'en', 'ja', 'ko', 'zh'];
export const V4_SUPPORT_MODES: readonly SupportMode[] = ['vi_anchor', 'bilingual', 'approved_full_translation'];

export const DEFAULT_STUDENT_LANGUAGE_VIEW: StudentLanguageView = {
  language: 'vi',
  supportMode: 'vi_anchor',
  showGlossary: true,
  showSentenceFrames: false,
  curriculumBridgeIds: [],
};

export type StudentLanguageViewSource = 'saved' | 'default';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isLanguage = (value: unknown): value is V4Language => typeof value === 'string' && V4_LANGUAGES.includes(value as V4Language);

const isSupportMode = (value: unknown): value is SupportMode => typeof value === 'string' && V4_SUPPORT_MODES.includes(value as SupportMode);

const sanitizeBridgeIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && /^[a-z0-9_-]{1,48}$/i.test(item))
    .slice(0, 8);
};

export function sanitizeStudentLanguagePreference(value: unknown): StudentLanguageView | null {
  if (!isRecord(value) || !isLanguage(value.language) || !isSupportMode(value.supportMode)) return null;
  return {
    language: value.language,
    supportMode: value.supportMode,
    showGlossary: typeof value.showGlossary === 'boolean' ? value.showGlossary : true,
    showSentenceFrames: typeof value.showSentenceFrames === 'boolean'
      ? value.showSentenceFrames
      : value.supportMode !== 'vi_anchor',
    curriculumBridgeIds: sanitizeBridgeIds(value.curriculumBridgeIds),
  };
}

export function resolveStudentLanguageView(savedPreference: unknown): { view: StudentLanguageView; source: StudentLanguageViewSource } {
  const saved = sanitizeStudentLanguagePreference(savedPreference);
  return saved ? { view: saved, source: 'saved' } : { view: { ...DEFAULT_STUDENT_LANGUAGE_VIEW }, source: 'default' };
}

export function changeStudentLanguageView(current: StudentLanguageView, change: Partial<StudentLanguageView>): StudentLanguageView {
  const language = change.language ?? current.language;
  const supportMode = change.supportMode ?? current.supportMode;
  const requested = sanitizeStudentLanguagePreference({
    language,
    supportMode,
    showGlossary: change.showGlossary ?? current.showGlossary,
    showSentenceFrames: change.showSentenceFrames ?? (supportMode !== 'vi_anchor'),
    curriculumBridgeIds: change.curriculumBridgeIds ?? current.curriculumBridgeIds,
  });
  return requested ?? { ...DEFAULT_STUDENT_LANGUAGE_VIEW };
}

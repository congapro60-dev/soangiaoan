import type {
  GlossaryItem,
  StudentLanguageView,
  SupportMode,
  V4Language,
  V4NonViLanguage,
} from './types';

export const V4_LANGUAGES: readonly V4Language[] = ['vi', 'en', 'ja', 'ko', 'zh'];
export const V4_SUPPORT_MODES: readonly SupportMode[] = ['vi_anchor', 'bilingual', 'approved_full_translation'];
export const APPROVED_CURRICULUM_BRIDGE_IDS = ['bridge-halfplane'] as const;

export const DEFAULT_STUDENT_LANGUAGE_VIEW: StudentLanguageView = {
  language: 'vi',
  supportMode: 'vi_anchor',
  showGlossary: true,
  showSentenceFrames: false,
  curriculumBridgeIds: [],
};

export type StudentLanguageViewSource = 'saved' | 'default';

export interface StudentSupportModeOption {
  mode: SupportMode;
  label: string;
  description: string;
  enabled: boolean;
  disabledReason?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isLanguage = (value: unknown): value is V4Language => typeof value === 'string' && V4_LANGUAGES.includes(value as V4Language);

const isSupportMode = (value: unknown): value is SupportMode => typeof value === 'string' && V4_SUPPORT_MODES.includes(value as SupportMode);

const sanitizeBridgeIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string'
      && APPROVED_CURRICULUM_BRIDGE_IDS.includes(item as typeof APPROVED_CURRICULUM_BRIDGE_IDS[number]))
    .slice(0, 8);
};

const languageLabel = (language: V4Language): string => language === 'vi' ? 'VI' : language.toUpperCase();

/**
 * Full translation is a publication claim, not a UI preference. It is enabled
 * only when the lesson text and every glossary explanation have an approved
 * translation for the selected language.
 */
export function hasApprovedFullTranslationPack(
  language: V4NonViLanguage,
  glossary: readonly GlossaryItem[],
  localizedStudentContentReady: boolean,
): boolean {
  return localizedStudentContentReady
    && glossary.length > 0
    && glossary.every(item => item.status === 'approved'
      && typeof item.translations[language] === 'string'
      && item.translations[language]!.trim().length > 0
      && typeof item.plainExplanationByLanguage[language] === 'string'
      && item.plainExplanationByLanguage[language]!.trim().length > 0);
}

export function buildStudentSupportModeOptions(
  language: V4Language,
  fullTranslationAvailable: boolean,
): StudentSupportModeOption[] {
  const nonVi = language !== 'vi';
  return [
    {
      mode: 'vi_anchor',
      label: 'Neo tiếng Việt',
      description: 'Giữ tiếng Việt và ký hiệu Toán làm mỏ neo.',
      enabled: !nonVi,
      ...(nonVi ? { disabledReason: 'Chọn VI để dùng chế độ neo tiếng Việt.' } : {}),
    },
    {
      mode: 'bilingual',
      label: `Song ngữ Việt + ${languageLabel(language)}`,
      description: 'Giữ nội dung Toán bằng tiếng Việt, thêm thuật ngữ và khung hỗ trợ.',
      enabled: nonVi,
      ...(!nonVi ? { disabledReason: 'Chọn một ngôn ngữ hỗ trợ để dùng song ngữ.' } : {}),
    },
    {
      mode: 'approved_full_translation',
      label: 'Dịch đầy đủ',
      description: 'Chỉ bật khi bài có gói bản dịch nội dung đã được duyệt.',
      enabled: nonVi && fullTranslationAvailable,
      ...(!nonVi || !fullTranslationAvailable
        ? { disabledReason: 'Bài này chưa có gói bản dịch đầy đủ đã được duyệt; vẫn dùng song ngữ.' }
        : {}),
    },
  ];
}

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

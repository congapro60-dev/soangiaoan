import type { GlossaryItem, StudentLanguageView, V4NonViLanguage } from './types';

export interface StudentGlossaryPopupPayload {
  id: string;
  vietnamese: string;
  translation?: string;
  explanationVi: string;
  explanation: string;
  notation?: string;
  example?: string;
  nonExample?: string;
  pronunciation?: string;
}

const normalizeTerm = (value: string): string => value.trim().normalize('NFC').toLocaleLowerCase('vi-VN');

const approvedOnly = (item: GlossaryItem): boolean => item.status === 'approved';

export function findApprovedGlossaryItem(items: readonly GlossaryItem[], idOrTerm: string): GlossaryItem | null {
  const needle = normalizeTerm(idOrTerm);
  return items.find(item => approvedOnly(item) && (normalizeTerm(item.id) === needle || normalizeTerm(item.vietnamese) === needle)) ?? null;
}

export function buildStudentGlossaryPopup(
  items: readonly GlossaryItem[],
  idOrTerm: string,
  languageView: StudentLanguageView,
): StudentGlossaryPopupPayload | null {
  if (!languageView.showGlossary) return null;
  const item = findApprovedGlossaryItem(items, idOrTerm);
  if (!item) return null;
  const nonViLanguage = languageView.language === 'vi' ? null : languageView.language as V4NonViLanguage;
  const translation = nonViLanguage ? item.translations[nonViLanguage] : undefined;
  const explanation = nonViLanguage
    ? item.plainExplanationByLanguage[nonViLanguage] ?? item.plainExplanationVi
    : item.plainExplanationVi;
  return {
    id: item.id,
    vietnamese: item.vietnamese,
    translation,
    explanationVi: item.plainExplanationVi,
    explanation,
    notation: item.notation,
    example: item.example,
    nonExample: item.nonExample,
    pronunciation: item.pronunciation,
  };
}

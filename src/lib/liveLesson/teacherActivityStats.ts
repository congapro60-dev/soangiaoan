import type { LiveResponse } from './types';

export type TeacherAssessment = 'Đúng' | 'Sai' | 'Cần GV xem' | 'Đã gửi';

export interface TeacherActivityRow {
  participantUid: string;
  label: string;
  submitted: boolean;
  assessment: TeacherAssessment;
  responseType: LiveResponse['responseType'] | null;
  selectedValue?: string;
}

const AUTO_KEYS: Record<string, string> = {
  'cp-model': 'A',
  'cp-quick-check': 'A',
};

const readAiCategory = (response: LiveResponse): string => {
  const raw = String(response.value);
  if (response.responseType !== 'text') return raw;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'category' in parsed && typeof parsed.category === 'string') return parsed.category;
  } catch { /* Free text remains teacher-reviewed. */ }
  return raw;
};

export const assessTeacherResponse = (stepId: string, response: LiveResponse): TeacherAssessment => {
  if (stepId === 'cp-ai-error') return readAiCategory(response) === 'Logical' ? 'Đúng' : 'Sai';
  const expected = AUTO_KEYS[stepId];
  if (expected) return String(response.value) === expected ? 'Đúng' : 'Sai';
  return response.responseType === 'text' || response.responseType === 'exit_ticket' ? 'Cần GV xem' : 'Đã gửi';
};

export const buildTeacherActivityRows = (responses: LiveResponse[], stepId: string): TeacherActivityRow[] => {
  const selected = responses
    .filter(response => response.stepId === stepId)
    .sort((left, right) => left.participantUid.localeCompare(right.participantUid));
  return selected.map((response, index) => ({
    participantUid: response.participantUid,
    label: `HS ${String(index + 1).padStart(2, '0')}`,
    submitted: true,
    assessment: assessTeacherResponse(stepId, response),
    responseType: response.responseType,
    ...(response.responseType === 'choice' || response.responseType === 'route' ? { selectedValue: String(response.value) } : {}),
  }));
};

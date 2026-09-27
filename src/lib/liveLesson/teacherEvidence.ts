import type { LiveErrorCategory } from './types';

export type TeacherEvidenceQuickCheckIssue = '' | 'substitution' | 'sign' | 'condition';
export type TeacherEvidenceNextPriority = '' | 'M' | 'S' | 'C' | 'verify';

export interface LiveTeacherEvidence {
  schemaVersion: 1;
  aiErrorCategory: LiveErrorCategory | '';
  quickCheckIssue: TeacherEvidenceQuickCheckIssue;
  nextPriority: TeacherEvidenceNextPriority;
  humanEvidence: {
    think: boolean;
    peerCheck: boolean;
    notebook: boolean;
  };
  note: string;
  savedAt: string;
}

const STORAGE_PREFIX = 'smartplan-live-teacher-evidence-v1:';
const MAX_NOTE_LENGTH = 500;
const ERROR_CATEGORIES: LiveErrorCategory[] = ['Conceptual', 'Algebraic', 'Logical', 'Missing condition'];
const QUICK_CHECK_ISSUES: TeacherEvidenceQuickCheckIssue[] = ['', 'substitution', 'sign', 'condition'];
const NEXT_PRIORITIES: TeacherEvidenceNextPriority[] = ['', 'M', 'S', 'C', 'verify'];

export const createEmptyTeacherEvidence = (): LiveTeacherEvidence => ({
  schemaVersion: 1,
  aiErrorCategory: '',
  quickCheckIssue: '',
  nextPriority: '',
  humanEvidence: { think: false, peerCheck: false, notebook: false },
  note: '',
  savedAt: '',
});

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const asChoice = <T extends string>(value: unknown, choices: readonly T[], fallback: T): T => (
  typeof value === 'string' && choices.includes(value as T) ? value as T : fallback
);

export const normalizeTeacherEvidence = (value: unknown, savedAt = ''): LiveTeacherEvidence => {
  const source = isRecord(value) ? value : {};
  const humanEvidence = isRecord(source.humanEvidence) ? source.humanEvidence : {};
  const note = typeof source.note === 'string' ? source.note.slice(0, MAX_NOTE_LENGTH) : '';
  return {
    schemaVersion: 1,
    aiErrorCategory: asChoice(source.aiErrorCategory, ERROR_CATEGORIES, ''),
    quickCheckIssue: asChoice(source.quickCheckIssue, QUICK_CHECK_ISSUES, ''),
    nextPriority: asChoice(source.nextPriority, NEXT_PRIORITIES, ''),
    humanEvidence: {
      think: humanEvidence.think === true,
      peerCheck: humanEvidence.peerCheck === true,
      notebook: humanEvidence.notebook === true,
    },
    note,
    savedAt: typeof savedAt === 'string' ? savedAt : '',
  };
};

export const getTeacherEvidenceStorageKey = (sessionId: string): string => `${STORAGE_PREFIX}${sessionId}`;

const storageOrNull = (storage?: Storage): Storage | null => {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

export const loadTeacherEvidence = (sessionId: string, storage?: Storage): LiveTeacherEvidence => {
  const store = storageOrNull(storage);
  if (!store || !sessionId.trim()) return createEmptyTeacherEvidence();
  try {
    const raw = store.getItem(getTeacherEvidenceStorageKey(sessionId));
    if (!raw) return createEmptyTeacherEvidence();
    const parsed: unknown = JSON.parse(raw);
    const storedAt = isRecord(parsed) && typeof parsed.savedAt === 'string' ? parsed.savedAt : '';
    return normalizeTeacherEvidence(parsed, storedAt);
  } catch {
    return createEmptyTeacherEvidence();
  }
};

export const saveTeacherEvidence = (
  sessionId: string,
  value: unknown,
  storage?: Storage,
  savedAt = new Date().toISOString(),
): LiveTeacherEvidence => {
  const evidence = normalizeTeacherEvidence(value, savedAt);
  const store = storageOrNull(storage);
  if (store && sessionId.trim()) {
    try { store.setItem(getTeacherEvidenceStorageKey(sessionId), JSON.stringify(evidence)); } catch { /* local storage may be unavailable */ }
  }
  return evidence;
};

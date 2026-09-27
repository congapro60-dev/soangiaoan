import { useCallback, useMemo, useRef, useState } from 'react';

export interface StudentResponseDraft { selectedValue: string; textValue: string; updatedAt: number; submittedTextValue?: string; submittedSelectedValue?: string }
const EMPTY: StudentResponseDraft = { selectedValue: '', textValue: '', updatedAt: 0 };
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
export const studentDraftKey = (sessionId: string, uid: string, stepId: string) =>
  `smartplan:live-draft:v1:${[sessionId, uid, stepId].map(encodeURIComponent).join(':')}`;

export function readStudentResponseDraft(key: string): StudentResponseDraft {
  if (!key) return EMPTY;
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (value?.version !== 1 || typeof value.textValue !== 'string' || value.textValue.length > 2000
      || typeof value.selectedValue !== 'string' || value.selectedValue.length > 2000
      || typeof value.updatedAt !== 'number' || !Number.isFinite(value.updatedAt)
      || value.updatedAt > Date.now() || Date.now() - value.updatedAt > MAX_AGE) return EMPTY;
    return { textValue: value.textValue, selectedValue: value.selectedValue, updatedAt: value.updatedAt,
      ...(typeof value.submittedTextValue === 'string' ? { submittedTextValue: value.submittedTextValue } : {}),
      ...(typeof value.submittedSelectedValue === 'string' ? { submittedSelectedValue: value.submittedSelectedValue } : {}),
    };
  } catch { return EMPTY; }
}

// Save in the edit handler, not an effect: changing cue cannot save the old
// text into the new cue. The key also isolates students on a shared device.
export function useStudentDraft(sessionId: string, uid: string | null, stepId: string | undefined) {
  const key = uid && stepId ? studentDraftKey(sessionId, uid, stepId) : '';
  const stored = useMemo(() => readStudentResponseDraft(key), [key]);
  const drafts = useRef(new Map<string, StudentResponseDraft>());
  const failures = useRef(new Set<string>());
  const [, render] = useState(0);
  const draft = key ? drafts.current.get(key) ?? stored : EMPTY;
  const update = useCallback((patch: Partial<Omit<StudentResponseDraft, 'updatedAt'>>) => {
    if (!key) return;
    const previous = drafts.current.get(key) ?? readStudentResponseDraft(key);
    const next = { ...previous, ...patch, updatedAt: Date.now() };
    drafts.current.set(key, next);
    try {
      localStorage.setItem(key, JSON.stringify({ version: 1, ...next }));
      failures.current.delete(key);
    } catch { failures.current.add(key); }
    render(value => value + 1);
  }, [key]);
  const setTextValue = useCallback((textValue: string) => update({ textValue }), [update]);
  const setSelectedValue = useCallback((selectedValue: string) => update({ selectedValue }), [update]);
  const recordSubmission = useCallback(() => {
    const current = drafts.current.get(key) ?? readStudentResponseDraft(key);
    update({ submittedTextValue: current.textValue, submittedSelectedValue: current.selectedValue });
  }, [key, update]);
  const readForStep = (otherStep: string) => {
    if (!uid) return EMPTY;
    const otherKey = studentDraftKey(sessionId, uid, otherStep);
    return drafts.current.get(otherKey) ?? readStudentResponseDraft(otherKey);
  };
  return { ...draft, setTextValue, setSelectedValue, readForStep, recordSubmission,
    hasUnsentChanges: Boolean(draft.updatedAt) && (draft.textValue !== draft.submittedTextValue || draft.selectedValue !== draft.submittedSelectedValue),
    storageFailed: failures.current.has(key), hasDraft: Boolean(draft.updatedAt) };
}

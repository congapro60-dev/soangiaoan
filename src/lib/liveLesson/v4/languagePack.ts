// Gói ngôn ngữ HS tĩnh, đã rà soát, cho bài P31. CHỈ dịch phần chữ HS nhìn thấy
// (label/action màn hình, prompt phản hồi, khung câu). Công thức và ký hiệu Toán
// KHÔNG dịch — giữ nguyên ở trường dùng chung của contract. Không gọi AI ở runtime.
//
// Trạng thái rà soát: chỉ EN có bản dịch đã rà soát cho P31 (khớp với glossary
// contract vốn cũng chỉ có bản EN đã duyệt). ja/ko/zh CHƯA có gói đã rà soát ⇒
// fail-closed về tiếng Việt (song ngữ, neo tiếng Việt), không tuyên bố dịch đầy đủ.

import type { LocalizedStudentCopy, StudentLanguagePack, V4NonViLanguage } from './types';

// Bản EN đã rà soát cho P31. Khóa theo id màn hình HS (HS0..HS10) và id checkpoint
// (cp-*). Với checkpoint, dùng trường `label` làm nội dung prompt phản hồi.
const P31_EN_COPY: Record<string, LocalizedStudentCopy> = {
  HS0: { label: 'Ready', action: 'Watch the TV and wait for the teacher to open a response step.' },
  HS1: { label: 'Guiding question', action: 'Choose or write what you want to find out from the situation.' },
  HS2: { label: 'Personal goal', action: 'Pick 1–2 goals and the evidence you want to produce.' },
  HS3: { label: 'Starting-point check', action: 'Answer briefly; open the glossary or sentence frames if you need them.' },
  HS4: { label: 'AI Error', action: 'Find the error, classify it, fix the solution, and prove it in your notebook.' },
  HS5: { label: 'Group product', action: 'Talk face to face; put devices down while you explain together.' },
  HS6: { label: 'Route M/S/C', action: 'Choose an entry point based on your current evidence; you may switch routes.' },
  HS7: { label: 'Individual post-check', action: 'Solve the new data yourself and submit your own evidence.' },
  HS8: { label: 'Quick check', action: 'Answer quickly, read the feedback, and fix one error if needed.' },
  HS9: { label: 'Self-assessment', action: 'Compare your personal goal with your final product.' },
  HS10: { label: 'Exit ticket', action: 'Write one evidence-based conclusion and one thing left to verify.' },
  'cp-student-goal': { label: 'What is one thing you want to be able to do by the end of the lesson?' },
  'cp-teacher-synthesis': { label: 'The teacher synthesizes the shared goals from your personal goals.' },
  'cp-model': { label: 'Choose the sign and explain why "not exceeding" uses ≤.' },
  'cp-ai-error': { label: "Which line in the AI's solution is suspicious? Pick the error type and give evidence." },
  'cp-group-product': { label: 'The group uses the same criteria to explain one solution region.' },
  'cp-postcheck': { label: 'For 2x + y ≤ 12, check the point (5;3) and state an evidence-based conclusion.' },
  'cp-route': { label: 'Choose or accept route M/S/C and use at most one hint.' },
  'cp-exit-ticket': { label: 'One thing you understood, and one thing still to verify.' },
};

const STUDENT_LANGUAGE_PACKS: readonly StudentLanguagePack[] = [
  { definitionKey: '10-5-31', language: 'en', reviewed: true, copyByKey: P31_EN_COPY },
  // ja/ko/zh: chưa có gói đã rà soát cho P31 → không đăng ký ⇒ song ngữ neo tiếng Việt.
];

const packIndex = new Map<string, StudentLanguagePack>(
  STUDENT_LANGUAGE_PACKS.map((pack) => [`${pack.definitionKey}::${pack.language}`, pack]),
);

export function getStudentLanguagePack(
  definitionKey: string | undefined,
  language: V4NonViLanguage,
): StudentLanguagePack | null {
  if (!definitionKey) return null;
  return packIndex.get(`${definitionKey}::${language}`) ?? null;
}

/**
 * Bản dịch HS cho một khóa (id màn hình hoặc checkpoint). Fail-closed: trả null
 * nếu không có gói/khóa ⇒ caller dùng nguyên bản tiếng Việt.
 */
export function getLocalizedStudentCopy(
  definitionKey: string | undefined,
  language: string,
  key: string,
): LocalizedStudentCopy | null {
  if (language === 'vi') return null;
  const pack = getStudentLanguagePack(definitionKey, language as V4NonViLanguage);
  return pack?.copyByKey[key] ?? null;
}

/**
 * Bài P31 có gói HS đã rà soát đầy đủ cho ngôn ngữ này không (đủ mọi màn hình +
 * checkpoint chính). Chỉ true mới được phép tuyên bố "Dịch đầy đủ".
 */
const REQUIRED_PACK_KEYS = [
  'HS0', 'HS1', 'HS2', 'HS3', 'HS4', 'HS5', 'HS6', 'HS7', 'HS8', 'HS9', 'HS10',
  'cp-student-goal', 'cp-teacher-synthesis', 'cp-model', 'cp-ai-error',
  'cp-group-product', 'cp-postcheck', 'cp-route', 'cp-exit-ticket',
];

export function hasReviewedStudentLanguagePack(
  definitionKey: string | undefined,
  language: V4NonViLanguage,
): boolean {
  const pack = getStudentLanguagePack(definitionKey, language);
  if (!pack || !pack.reviewed) return false;
  return REQUIRED_PACK_KEYS.every((key) => {
    const copy = pack.copyByKey[key];
    return copy != null && typeof copy.label === 'string' && copy.label.trim().length > 0;
  });
}

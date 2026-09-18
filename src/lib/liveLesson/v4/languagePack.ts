// Gói ngôn ngữ HS tĩnh, đã rà soát, cho bài P31. CHỈ dịch phần chữ HS nhìn thấy
// (label/action màn hình, prompt phản hồi, khung câu). Công thức và ký hiệu Toán
// KHÔNG dịch — giữ nguyên ở trường dùng chung của contract. Không gọi AI ở runtime.
//
// Trạng thái rà soát: chỉ EN có bản dịch đã rà soát cho P31 (khớp với glossary
// contract vốn cũng chỉ có bản EN đã duyệt). ja/ko/zh CHƯA có gói đã rà soát ⇒
// fail-closed về tiếng Việt (song ngữ, neo tiếng Việt), không tuyên bố dịch đầy đủ.

import type { GlossaryItem, LocalizedStudentCopy, StudentLanguagePack, V4Language, V4NonViLanguage } from './types';

// Bản EN đã rà soát cho P31. Khóa theo id màn hình HS (HS0..HS10) và id checkpoint
// (cp-*). Với checkpoint, dùng trường `label` làm nội dung prompt phản hồi.
const P31_EN_COPY: Record<string, LocalizedStudentCopy> = {
  HS0: { label: 'Ready', action: 'Watch the TV and wait for the teacher to open a response step.' },
  HS1: { label: 'Guiding question', action: 'Choose or write what you want to find out from the situation.' },
  HS2: { label: 'Personal goal', action: 'Write one personal goal and the work that will show you have achieved it.' },
  HS3: { label: 'Starting-point check', action: 'Answer briefly; open the glossary or sentence frames if you need them.' },
  HS4: { label: 'AI Error', action: 'Find the error, classify it, fix the solution, and prove it in your notebook.' },
  HS5: { label: 'Group product', action: 'Talk face to face; put devices down while you explain together.' },
  HS6: { label: 'Route M/S/C', action: 'Choose an entry point based on your current evidence; you may switch routes.' },
  HS7: { label: 'Individual post-check', action: 'Solve the new data yourself and submit your own evidence.' },
  HS8: { label: 'Quick check', action: 'Answer quickly, read the feedback, and fix one error if needed.' },
  HS9: { label: 'Self-assessment', action: 'Compare your personal goal with your final product.' },
  HS10: { label: 'Exit ticket', action: 'Write one evidence-based conclusion and one thing left to verify.' },
  'cp-student-goal': { label: 'What is one thing you want to be able to do by the end of the lesson?' },
  'cp-guiding-question': { label: 'What would you like to know to check every possible purchase? Write one short question.' },
  'cp-model': { label: 'Complete 15x + 10y … 150 to express “not exceeding 150 thousand dong”. Choose a sign, then explain in your notebook.' },
  'cp-ai-error': { label: "Which line in the AI's solution is suspicious? Pick the error type and give evidence." },
  'cp-group-product': { label: 'Check (4;8) and (8;4) against the budget of 150 thousand dong. Find a purchase that spends exactly the budget. Submit your own calculations and conclusions after the group discussion.' },
  'cp-postcheck': { label: 'For 2x + y ≤ 12, check (5;3). Find a pair of non-negative integers that makes both sides equal. Show your calculations.' },
  'cp-quick-check': { label: 'For 3x + 2y ≤ 30, which pair is a solution? A (6;6), B (8;4), C (10;1), D (5;8).' },
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

export function getStudentLanguageCoverage(definitionKey: string | undefined, language: V4Language, glossary: readonly GlossaryItem[]) {
  if (language === 'vi') return { available: true, content: true, glossary: true, description: 'Tiếng Việt · có thuật ngữ và khung diễn đạt mở theo nhu cầu.' };
  const pack = getStudentLanguagePack(definitionKey, language);
  const content = Boolean(pack?.reviewed && Object.keys(pack.copyByKey).length);
  const terms = glossary.some(item => item.status === 'approved' && Boolean(item.translations[language]?.trim()));
  return {
    available: content || terms || language === 'en', content, glossary: terms,
    description: content
      ? `Hỗ trợ ${language.toUpperCase()} cho hướng dẫn và câu hỏi đã có bản dịch${terms ? ', cùng thuật ngữ' : ''}. Nhiệm vụ tuyến, tiêu chí và phần chưa dịch giữ tiếng Việt.`
      : terms ? `Hỗ trợ ${language.toUpperCase()} cho một số thuật ngữ; nội dung còn lại giữ tiếng Việt.`
        : language === 'en' ? 'Có khung diễn đạt hỗ trợ bằng tiếng Anh; nội dung bài, nhiệm vụ tuyến và tiêu chí vẫn bằng tiếng Việt.'
          : `Chưa có nội dung hỗ trợ ${language.toUpperCase()} cho bài này. Hiện đang dùng tiếng Việt.`,
  };
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
 * Kiểm tra phần nhãn/hướng dẫn/checkpoint của pack. Không bao gồm route tasks,
 * criteria hoặc toàn bộ giao diện; kết quả này không chứng minh bản dịch đầy đủ.
 */
const REQUIRED_PACK_KEYS = [
  'HS0', 'HS1', 'HS2', 'HS3', 'HS4', 'HS5', 'HS6', 'HS7', 'HS8', 'HS9', 'HS10',
  'cp-student-goal', 'cp-guiding-question', 'cp-model', 'cp-ai-error',
  'cp-group-product', 'cp-postcheck', 'cp-route', 'cp-quick-check', 'cp-exit-ticket',
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

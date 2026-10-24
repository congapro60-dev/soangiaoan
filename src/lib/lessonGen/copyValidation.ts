export type ClassroomLocale = 'vi' | 'en' | 'ja';

export interface ClassroomCopyIssue {
  code: 'VI_ENGLISH_LEAK' | 'INTERNAL_STATE_LEAK' | 'MULTI_ACTION_INSTRUCTION';
  message: string;
}

const APPROVED_VI_ENGLISH = new Set([
  'MUST', 'SHOULD', 'COULD', 'Differentiation', 'Global', 'Intercultural', 'Learning', 'Digital', 'Citizenship', 'Assessment', 'for', 'QR', 'CIS', 'KaTeX',
]);

const INTERNAL_STATE_RE = /\b(?:sourceRef|secure|developing|review|required|primarySurface|evidenceState)\b/i;
const KNOWN_ENGLISH_LEAK_RE = /\b(?:basic|equations?|solution|review|submit|feedback|challenge|explore|screen|status)\b/gi;
const MULTI_ACTION_RE = /\b(?:tính|chọn|viết|so sánh|sửa|nêu)\b[^.!?]{0,120}\bvà\s+\b(?:giải thích|nêu|viết|chọn|tính|so sánh|sửa)\b/i;

export const validateClassroomCopy = (copy: string, locale: ClassroomLocale): ClassroomCopyIssue[] => {
  const issues: ClassroomCopyIssue[] = [];
  if (INTERNAL_STATE_RE.test(copy)) {
    issues.push({ code: 'INTERNAL_STATE_LEAK', message: 'Copy classroom-facing lộ trạng thái nội bộ.' });
  }
  if (locale === 'vi') {
    const leaked = Array.from(copy.matchAll(KNOWN_ENGLISH_LEAK_RE), match => match[0])
      .filter(word => !APPROVED_VI_ENGLISH.has(word));
    if (leaked.length > 0) {
      issues.push({ code: 'VI_ENGLISH_LEAK', message: `UI tiếng Việt còn từ tiếng Anh: ${Array.from(new Set(leaked)).join(', ')}.` });
    }
  }
  if (MULTI_ACTION_RE.test(copy)) {
    issues.push({ code: 'MULTI_ACTION_INSTRUCTION', message: 'Một câu lệnh đang yêu cầu hai hành động độc lập.' });
  }
  return issues;
};

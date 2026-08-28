export interface ClassReportQuestionSource {
  name: string;
  url: string;
  mimeType?: string;
}

export interface ClassReportQuestionCatalogItem {
  questionNumber: string;
  content: string;
  maxScore?: number | null;
  expectedAnswer?: string;
  imageUrl?: string;
}

const removeVietnameseMarks = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const QUESTION_NUMBER = '[0-9]+(?:[a-z])?(?:[._/-][0-9a-z]+)*';

/**
 * Khóa ghép câu phải giữ ngữ cảnh phần/tự luận. Chỉ bỏ tiền tố đơn giản khi nhãn
 * không có ngữ cảnh; nếu không thì “Phần II – Bài 4” sẽ bị gộp nhầm với “Phần III – Bài 4”.
 */
export const normalizeQuestionKey = (value: unknown): string => {
  const raw = removeVietnameseMarks(String(value ?? ''))
    .toLocaleLowerCase('vi-VN')
    .replace(/[–—]/gu, '-')
    .replace(/\s+/gu, ' ')
    .trim();

  const section = raw.match(new RegExp(`^(?:phan|section)\\s+([ivx]+|[0-9]+)\\s*-\\s*(?:cau|bai|question)\\s*(${QUESTION_NUMBER})`, 'iu'));
  if (section) return `phan:${section[1]}:${section[2]}`;

  const essay = raw.match(new RegExp(`^(?:tu\\s*luan|essay)\\s*-\\s*(?:(?:cau|bai|question)\\s*)?(${QUESTION_NUMBER})`, 'iu'))
    || raw.match(new RegExp(`^(?:cau|bai|question)\\s*(${QUESTION_NUMBER})\\s*\\(\\s*(?:tl|tu\\s*luan|essay)\\s*\\)`, 'iu'));
  if (essay) return `tl:${essay[1]}`;

  return raw
    .replace(/^\s*(?:cau|question|q|bai|phan)\s*[-:.]?\s*/u, '')
    .replace(/^[\s:.)\-]+|[\s:.)\-]+$/gu, '')
    .replace(/\s+/gu, '')
    .trim();
};

interface ParsedQuestionHeading {
  number: string;
  content: string;
}

const cleanHeadingContent = (value: string): string => value
  .replace(/^\s*(?:\*\*|__)\s*/u, '')
  .replace(/(?:\*\*|__)\s*$/u, '')
  .trim();

const LABELED_HEADING = /^\s*(?:câu|cau|question|q|bài|bai|phần|phan)\s*([0-9]+(?:[a-z])?(?:[._/-][0-9a-z]+)*)(?:\s*[:.)\-–—]\s*|\s+|$)(.*)$/iu;
const NUMBERED_HEADING = /^\s*([0-9]+(?:[a-z])?)\s*[.)\-:]\s*(.*)$/u;
const COMPOSITE_HEADING = new RegExp(
  `^\\s*((?:phần|phan)\\s+(?:[ivx]+|[0-9]+)\\s*[-–—:]\\s*(?:câu|cau|bài|bai|question)\\s*${QUESTION_NUMBER}`
    + `|(?:tự\\s*luận|tu\\s*luan|essay)\\s*[-–—:]\\s*(?:(?:câu|cau|bài|bai|question)\\s*)?${QUESTION_NUMBER}`
    + `|(?:câu|cau|bài|bai|question)\\s*${QUESTION_NUMBER}\\s*\\(\\s*(?:tl|tự\\s*luận|tu\\s*luan|essay)\\s*\\))`
    + `(?:\\s*[:.)\\-–—]\\s*|\\s+|$)(.*)$`,
  'iu',
);

const parseQuestionHeading = (line: string): ParsedQuestionHeading | null => {
  const candidate = line
    .replace(/^\s*(?:#{1,6}\s+|[-*•]\s+)/u, '')
    .replace(/^\s*(?:\*\*|__)/u, '')
    .replace(/(?:\*\*|__)\s*$/u, '');
  const composite = candidate.match(COMPOSITE_HEADING);
  if (composite) return { number: composite[1], content: cleanHeadingContent(composite[2] || '') };
  const labeled = candidate.match(LABELED_HEADING);
  if (labeled) return { number: labeled[1], content: cleanHeadingContent(labeled[2] || '') };
  const numbered = candidate.match(NUMBERED_HEADING);
  return numbered ? { number: numbered[1], content: cleanHeadingContent(numbered[2] || '') } : null;
};

const cleanContent = (lines: readonly string[]): string => lines.join('\n').trim();

export const extractQuestionCatalogFromText = (
  sourceText: string | undefined,
  questionNumbers: readonly string[],
): ClassReportQuestionCatalogItem[] => {
  const text = typeof sourceText === 'string' ? sourceText.trim() : '';
  const requested = [...new Map(
    questionNumbers
      .map(questionNumber => String(questionNumber ?? '').trim())
      .filter(Boolean)
      .map(questionNumber => [normalizeQuestionKey(questionNumber), questionNumber] as const),
  ).entries()];
  if (!text || requested.length === 0) return [];

  const sections = new Map<string, string[]>();
  let currentKey = '';
  let hasQuestionHeading = false;
  for (const line of text.split(/\r?\n/u)) {
    const heading = parseQuestionHeading(line);
    if (heading) {
      hasQuestionHeading = true;
      currentKey = normalizeQuestionKey(heading.number);
      sections.set(currentKey, heading.content ? [heading.content] : []);
      continue;
    }
    if (currentKey) sections.get(currentKey)?.push(line);
  }

  if (!hasQuestionHeading && requested.length === 1) {
    return [{ questionNumber: requested[0][1], content: text }];
  }

  return requested
    .map(([key, questionNumber]) => {
      const content = cleanContent(sections.get(key) ?? []);
      return content ? { questionNumber, content } : null;
    })
    .filter((item): item is ClassReportQuestionCatalogItem => item !== null);
};

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

/** Chữ thường, bỏ dấu, gạch dài về gạch ngắn, gộp khoảng trắng. */
const flattenLabel = (value: unknown): string => removeVietnameseMarks(String(value ?? ''))
  .toLocaleLowerCase('vi-VN')
  .replace(/[–—]/gu, '-')
  .replace(/\s+/gu, ' ')
  .trim();

const SECTION_PATTERN = new RegExp(`^(?:phan|section)\\s+([ivx]+|[0-9]+)\\s*-\\s*(?:cau|bai|question)\\s*(${QUESTION_NUMBER})`, 'iu');
const ESSAY_PATTERNS = [
  new RegExp(`^(?:tu\\s*luan|essay)\\s*-\\s*(?:(?:cau|bai|question)\\s*)?(${QUESTION_NUMBER})`, 'iu'),
  new RegExp(`^(?:cau|bai|question)\\s*(${QUESTION_NUMBER})\\s*\\(\\s*(?:tl|tu\\s*luan|essay)\\s*\\)`, 'iu'),
];

/**
 * Khóa ghép câu phải giữ ngữ cảnh phần/tự luận. Chỉ bỏ tiền tố đơn giản khi nhãn
 * không có ngữ cảnh; nếu không thì “Phần II – Bài 4” sẽ bị gộp nhầm với “Phần III – Bài 4”.
 */
export const normalizeQuestionKey = (value: unknown): string => {
  const raw = flattenLabel(value);

  const section = raw.match(SECTION_PATTERN);
  if (section) return `phan:${section[1]}:${section[2]}`;

  const essay = ESSAY_PATTERNS.map(pattern => raw.match(pattern)).find(Boolean);
  if (essay) return `tl:${essay[1]}`;

  return raw
    .replace(/^\s*(?:cau|question|q|bai|phan)\s*[-:.]?\s*/u, '')
    .replace(/^[\s:.)\-]+|[\s:.)\-]+$/gu, '')
    .replace(/\s+/gu, '')
    .trim();
};

/** Từ chỉ vị trí câu, không phải nội dung câu: bỏ khỏi khoá nhưng vẫn cho đi tiếp. */
const MARKER_WORDS = new Set(['bai', 'cau', 'question', 'q', 'phan', 'y', 'part', 'item']);
/** Giá trị định danh: "3.5", "12", "3.9a", hoặc một chữ cái lẻ như "a", "b". */
const VALUE_PATTERN = /^(?:[0-9]+(?:[.\-_/][0-9]+)*[a-z]?|[a-z])$/u;

/**
 * Khoá GỘP THỐNG KÊ cho một nhãn câu do AI tự đặt.
 *
 * Mỗi lượt chấm model lại đặt tên một kiểu cho cùng một câu — “Bài 3.5 – Ý 1”, “Bài 3.5 (Ý 1)”,
 * “Bài 3.5 – Ý 1: Tính cos A” — nên bảng thống kê xé một câu thành nhiều dòng và mọi tỉ lệ đều
 * sai vì mẫu số bị chia nhỏ. Gộp theo phần ĐỊNH DANH và bỏ phần mô tả tự do.
 *
 * Cách làm: đọc từ trái sang, giữ lại giá trị của các token cấu trúc và DỪNG ở từ mô tả đầu tiên
 * (“tính”, “độ dài”…). “Bài 3.5 – Ý 1 (Tính cos A)” và “Bài 3.5 (Ý 1)” cùng cho `3.5:1`, trong khi
 * “Bài 3.5” trơ trọi vẫn là `3.5` — câu mẹ không bị nuốt vào câu con.
 *
 * Nhãn không có số nào thì lùi về `normalizeQuestionKey`; trả khoá rỗng ở đây sẽ gộp mọi nhãn
 * mô tả khác nhau thành một dòng, sai còn nặng hơn hiện trạng.
 */
export const questionGroupKey = (value: unknown): string => {
  const raw = flattenLabel(value);
  if (!raw) return '';

  const section = raw.match(SECTION_PATTERN);
  if (section) return `phan:${section[1]}:${section[2]}`;
  const essay = ESSAY_PATTERNS.map(pattern => raw.match(pattern)).find(Boolean);
  if (essay) return `tl:${essay[1]}`;

  const values: string[] = [];
  for (const word of raw.replace(/[()[\]{}:,;]/gu, ' ').replace(/\s*-\s*/gu, ' ').split(/\s+/u)) {
    if (!word) continue;
    if (MARKER_WORDS.has(word)) continue;
    if (!VALUE_PATTERN.test(word)) break;
    // "3.9a" = bài 3.9 phần a; tách ra để khớp với cách viết rời "Bài 3.9 – Câu a".
    const split = word.match(/^([0-9]+(?:[.\-_/][0-9]+)*)([a-z])$/u);
    if (split) values.push(split[1], split[2]);
    else values.push(word);
  }

  return values.length > 0 ? values.join(':') : normalizeQuestionKey(value);
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

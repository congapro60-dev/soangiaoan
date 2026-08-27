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

export const normalizeQuestionKey = (value: unknown): string => removeVietnameseMarks(String(value ?? ''))
  .toLocaleLowerCase('vi-VN')
  .replace(/^\s*(?:cau|question|q|bai|phan)\s*[-:.]?\s*/u, '')
  .replace(/^[\s:.)\-–—]+|[\s:.)\-–—]+$/gu, '')
  .replace(/\s+/gu, '')
  .trim();

interface ParsedQuestionHeading {
  number: string;
  content: string;
}

const LABELED_HEADING = /^\s*(?:câu|cau|question|q|bài|bai|phần|phan)\s*([0-9]+(?:[a-z])?(?:[._/-][0-9a-z]+)*)(?:\s*[:.)\-–—]\s*|\s+|$)(.*)$/iu;
const NUMBERED_HEADING = /^\s*([0-9]+(?:[a-z])?)\s*[.)\-:]\s*(.*)$/u;

const parseQuestionHeading = (line: string): ParsedQuestionHeading | null => {
  const labeled = line.match(LABELED_HEADING);
  if (labeled) return { number: labeled[1], content: labeled[2] || '' };
  const numbered = line.match(NUMBERED_HEADING);
  return numbered ? { number: numbered[1], content: numbered[2] || '' } : null;
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

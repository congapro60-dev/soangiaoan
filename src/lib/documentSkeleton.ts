export type DocumentSkeletonBlockType = 'heading' | 'table' | 'placeholder';

export interface DocumentSkeletonBlock {
  id: string;
  type: DocumentSkeletonBlockType;
  level?: number;
  text?: string;
  columns?: string[];
  rowCount?: number;
  placeholder?: string;
}

export interface DocumentSkeleton {
  sourceName?: string;
  blocks: DocumentSkeletonBlock[];
  markdown: string;
  stats: {
    headingCount: number;
    tableCount: number;
    placeholderCount: number;
  };
}

export interface SkeletonValidationIssue {
  severity: 'warning' | 'error';
  code: string;
  message: string;
}

export interface SkeletonValidationResult {
  ok: boolean;
  score: number;
  issues: SkeletonValidationIssue[];
}

const MAX_BLOCKS = 80;
const PLACEHOLDER_PATTERNS = [
  /\[[^\]\n]{1,80}\]/g,
  /\{\{[^}\n]{1,80}\}\}/g,
  /_{3,}/g,
  /\.{3,}/g,
];

const normalizeSpace = (value: string): string => value.replace(/\s+/g, ' ').trim();
const stripTags = (value: string): string => value.replace(/<[^>]+>/g, ' ');
const decodeEntities = (value: string): string => value
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

const slugId = (prefix: string, index: number): string => `${prefix}-${index + 1}`;

const makeMarkdown = (blocks: DocumentSkeletonBlock[]): string => blocks.map(block => {
  if (block.type === 'heading') {
    return `${'#'.repeat(Math.min(Math.max(block.level || 2, 1), 6))} ${block.text || '[Tiêu đề]'}`;
  }
  if (block.type === 'table') {
    const columns = block.columns?.length ? block.columns : ['Cột 1', 'Cột 2'];
    const header = `| ${columns.join(' | ')} |`;
    const sep = `| ${columns.map(() => '---').join(' | ')} |`;
    return [header, sep, `| ${columns.map(() => '[...]').join(' | ')} |`].join('\n');
  }
  return block.placeholder || '[...]';
}).join('\n\n');

const extractPlaceholders = (text: string, startIndex = 0): DocumentSkeletonBlock[] => {
  const found: DocumentSkeletonBlock[] = [];
  const seen = new Set<string>();
  for (const pattern of PLACEHOLDER_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const value = normalizeSpace(match[0]);
      if (!value || seen.has(value)) continue;
      seen.add(value);
      found.push({ id: slugId('placeholder', startIndex + found.length), type: 'placeholder', placeholder: value });
      if (found.length >= 20) return found;
    }
  }
  return found;
};

const parseHtmlSkeleton = (html: string): DocumentSkeletonBlock[] => {
  const blocks: DocumentSkeletonBlock[] = [];
  const source = html.replace(/\r/g, '');
  const elementRegex = /<(h[1-6]|table)\b[\s\S]*?<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = elementRegex.exec(source)) && blocks.length < MAX_BLOCKS) {
    const tag = match[1].toLowerCase();
    const raw = match[0];
    if (tag.startsWith('h')) {
      const text = normalizeSpace(decodeEntities(stripTags(raw)));
      if (text) blocks.push({ id: slugId('heading', blocks.length), type: 'heading', level: Number(tag[1]), text });
      continue;
    }
    const rows = [...raw.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)];
    const firstRow = rows[0]?.[0] || '';
    const cells = [...firstRow.matchAll(/<t[hd]\b[\s\S]*?<\/t[hd]>/gi)]
      .map(cell => normalizeSpace(decodeEntities(stripTags(cell[0]))))
      .filter(Boolean);
    blocks.push({
      id: slugId('table', blocks.length),
      type: 'table',
      columns: cells.length ? cells.slice(0, 8) : ['Cột 1', 'Cột 2'],
      rowCount: Math.max(rows.length - 1, 0),
    });
  }
  blocks.push(...extractPlaceholders(normalizeSpace(decodeEntities(stripTags(source))), blocks.length));
  return blocks.slice(0, MAX_BLOCKS);
};

const parseMarkdownOrTextSkeleton = (text: string): DocumentSkeletonBlock[] => {
  const blocks: DocumentSkeletonBlock[] = [];
  const lines = text.replace(/\r/g, '').split('\n');
  for (let i = 0; i < lines.length && blocks.length < MAX_BLOCKS; i += 1) {
    const line = lines[i].trim();
    const heading = line.match(/^(#{1,6})\s+(.+)$/) || line.match(/^((?:I|II|III|IV|V|VI|VII|VIII|IX|X|[A-Z])\.|\d+(?:\.\d+)*\.)\s+(.{3,120})$/);
    if (heading) {
      blocks.push({ id: slugId('heading', blocks.length), type: 'heading', level: heading[1].startsWith('#') ? heading[1].length : 2, text: normalizeSpace(heading[2]) });
      continue;
    }
    if (/^\|.+\|$/.test(line) && /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(lines[i + 1]?.trim() || '')) {
      const columns = line.split('|').map(v => normalizeSpace(v)).filter(Boolean).slice(0, 8);
      let rowCount = 0;
      for (let j = i + 2; j < lines.length && /^\|.+\|$/.test(lines[j].trim()); j += 1) rowCount += 1;
      blocks.push({ id: slugId('table', blocks.length), type: 'table', columns: columns.length ? columns : ['Cột 1', 'Cột 2'], rowCount });
    }
  }
  blocks.push(...extractPlaceholders(text, blocks.length));
  return blocks.slice(0, MAX_BLOCKS);
};

export const createDocumentSkeleton = (content: string, sourceName?: string): DocumentSkeleton => {
  const isHtml = /<\s*(h[1-6]|table|p|div|body)\b/i.test(content);
  const blocks = isHtml ? parseHtmlSkeleton(content) : parseMarkdownOrTextSkeleton(content);
  const stats = {
    headingCount: blocks.filter(block => block.type === 'heading').length,
    tableCount: blocks.filter(block => block.type === 'table').length,
    placeholderCount: blocks.filter(block => block.type === 'placeholder').length,
  };
  return { sourceName, blocks, markdown: makeMarkdown(blocks), stats };
};

export const buildSkeletonPromptSection = (skeleton?: DocumentSkeleton | null): string => {
  if (!skeleton || skeleton.blocks.length === 0) return '';
  return `\n===== MARKDOWN SKELETON BẮT BUỘC GIỮ =====\nMVP Phase 2A chỉ yêu cầu giữ heading, bảng và placeholder theo skeleton Markdown dưới đây. Không cần fidelity DOCX cao, không xử lý header/footer/logo.\nKhi tạo nội dung, hãy điền nội dung chuyên môn vào đúng các heading/bảng/placeholder, không tự ý đổi tên heading chính hoặc bỏ bảng.\n\n${skeleton.markdown}\n===== HẾT MARKDOWN SKELETON =====\n`;
};

export const validateMarkdownAgainstSkeleton = (markdown: string, skeleton?: DocumentSkeleton | null): SkeletonValidationResult => {
  if (!skeleton || skeleton.blocks.length === 0) return { ok: true, score: 1, issues: [] };
  const normalized = markdown.toLowerCase();
  const issues: SkeletonValidationIssue[] = [];
  const headingBlocks = skeleton.blocks.filter(block => block.type === 'heading' && block.text);
  const tableBlocks = skeleton.blocks.filter(block => block.type === 'table');
  let matchedHeadings = 0;
  for (const block of headingBlocks) {
    const text = (block.text || '').toLowerCase();
    if (text.length < 3 || normalized.includes(text)) matchedHeadings += 1;
    else issues.push({ severity: 'warning', code: 'missing_heading', message: `Có thể thiếu heading từ mẫu: "${block.text}".` });
  }
  const outputTableCount = (markdown.match(/^\s*\|.+\|\s*$/gm) || []).filter((_, idx, arr) => idx === 0 || arr[idx - 1] !== _).length;
  if (tableBlocks.length > 0 && outputTableCount === 0) {
    issues.push({ severity: 'warning', code: 'missing_tables', message: 'Đầu ra chưa có bảng Markdown dù mẫu có bảng.' });
  }
  const headingScore = headingBlocks.length ? matchedHeadings / headingBlocks.length : 1;
  const tableScore = tableBlocks.length ? Math.min(outputTableCount / tableBlocks.length, 1) : 1;
  const score = Number(((headingScore * 0.7) + (tableScore * 0.3)).toFixed(2));
  return { ok: issues.filter(i => i.severity === 'error').length === 0, score, issues };
};

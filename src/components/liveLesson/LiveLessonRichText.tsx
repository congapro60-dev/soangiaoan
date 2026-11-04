import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

const LATEX_COMMAND = /\\[A-Za-z]/;

const UNICODE_MATH_SIGNAL = /[²³⁴⁵⁶⁷⁸⁹√≤≥≠∈∉∩∪∖∞π∑∫]/u;

const normalizeUnicodeMath = (line: string): string => {
  // Escape braces from the original Unicode expression before generating
  // LaTeX commands, so generated \sqrt{…}/\mathbb{R} braces remain valid.
  let normalized = line
    .replace(/ℝ/g, '__REAL_NUMBERS__')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/⁴/g, '^4')
    .replace(/⁵/g, '^5')
    .replace(/⁶/g, '^6')
    .replace(/⁷/g, '^7')
    .replace(/⁸/g, '^8')
    .replace(/⁹/g, '^9')
    .replace(/≤/g, '\\le ')
    .replace(/≥/g, '\\ge ')
    .replace(/≠/g, '\\ne ')
    .replace(/∈/g, '\\in ')
    .replace(/∉/g, '\\notin ')
    .replace(/∩/g, '\\cap ')
    .replace(/∪/g, '\\cup ')
    .replace(/∖/g, '\\setminus ')
    .replace(/∞/g, '\\infty ')
    .replace(/π/g, '\\pi ')
    .replace(/−/g, '-')
    .replace(/√\s*([^\s]+)/g, '\\sqrt{$1}')
    .replace(/__REAL_NUMBERS__/g, '\\mathbb{R}')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return normalized;
};

const isStandaloneUnicodeMathLine = (trimmed: string): boolean => {
  if (!trimmed || trimmed.includes('$') || !/[=<>≤≥²³√∖]/u.test(trimmed)) return false;
  if (/\p{L}{3,}/u.test(trimmed.replace(/[xynabcdfRℝ]/g, ''))) return false;
  return /^[\p{L}\p{N}\s+\-−=<>≤≥²³⁴⁵⁶⁷⁸⁹√∖{}().,;:'/_|]+$/u.test(trimmed);
};

const wrapRawInlineMath = (line: string): string => {
  if (line.includes('$')) return line;
  return line
    .replace(/(?<!\$)([A-Za-z](?:\s*\\to\s*[+\-]?\s*\\infty))(?!\$)/g, '$$$1$')
    .replace(/(?<!\$)(\\frac\{[^{}]*\}\{[^{}]*\}|\\sqrt\{[^{}]*\})(?!\$)/g, '$$$1$');
};

// Strip LaTeX command tokens (including the Vietnamese text inside \text{…})
// so what remains is only the non-math residue of the line.
const stripMathTokens = (line: string): string =>
  line
    .replace(/\\text\{[^}]*\}/g, ' ')
    .replace(/\\[A-Za-z]+/g, ' ')
    .replace(/\\[^A-Za-z]/g, ' ');

// A line becomes a standalone display-math block only when it is a pure formula:
// it uses a LaTeX command and, once command tokens are removed, has no
// natural-language word (3+ letters) left. Prose lines that merely contain a
// stray LaTeX command stay prose, so KaTeX can no longer swallow Vietnamese text.
export const isPureFormulaLine = (trimmed: string): boolean => {
  if (!trimmed || trimmed.includes('$')) return false;
  if (!LATEX_COMMAND.test(trimmed)) return false;
  return !/\p{L}{3,}/u.test(stripMathTokens(trimmed));
};

// Mỗi dòng nội dung trở thành một khối markdown riêng (ngăn bằng dòng trắng) để
// ReactMarkdown luôn xuống dòng — tránh gộp các dòng bảng/định nghĩa thành một
// đoạn dày đặc do soft line-break bị nuốt. Dòng công thức thuần thành khối $$.
export const toLiveLessonMarkdown = (text: string): string => {
  const blocks: string[] = [];
  for (const rawLine of text.split('\n')) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    if (isPureFormulaLine(trimmed)) {
      blocks.push(`$$${trimmed}$$`);
    } else if (isStandaloneUnicodeMathLine(trimmed)) {
      blocks.push(`$$${normalizeUnicodeMath(trimmed)}$$`);
    } else {
      blocks.push(wrapRawInlineMath(trimmed));
    }
  }
  return blocks.join('\n\n');
};

export type LiveMathScale = 'tv' | 'student' | 'inline';

export const LiveLessonRichText = ({ text, className = '', mathScale = 'inline' }: { text: string; className?: string; mathScale?: LiveMathScale }) => (
  <div className={`live-rich-text live-rich-text--${mathScale} ${className} [&_p]:my-1 [&_.katex-display]:my-2`}>
    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
      {toLiveLessonMarkdown(text)}
    </ReactMarkdown>
  </div>
);

import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

const LATEX_COMMAND = /\\[A-Za-z]/;

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
    blocks.push(isPureFormulaLine(trimmed) ? `$$${trimmed}$$` : trimmed);
  }
  return blocks.join('\n\n');
};

export const LiveLessonRichText = ({ text, className = '' }: { text: string; className?: string }) => (
  <div className={`${className} [&_p]:my-1 [&_.katex-display]:my-2`}>
    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
      {toLiveLessonMarkdown(text)}
    </ReactMarkdown>
  </div>
);

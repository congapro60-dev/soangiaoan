import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { sanitizeDisplayText } from '../../../lib/adaptive/mathText';

interface Props {
  children: string;
  /** 'sang' cho nền màu nhạt (thẻ điểm của học sinh), 'thuong' cho nền trắng. */
  tone?: 'thuong' | 'sang';
}

/**
 * Nhận xét bài chấm, dựng bằng đúng bộ công cụ mà giáo án và đề thi đang dùng:
 * markdown + KaTeX. Trước đây nhận xét đổ ra thẻ `<p>` thô nên `$x^2$` hiện nguyên
 * ký tự đô-la, phân số thành `(a+b)/2`, và cả đoạn dài dính liền một khối.
 *
 * Học sinh và phụ huynh là người đọc thứ này. Chữ khó đọc thì lời nhận xét dù đúng
 * cũng không tới được người cần nghe.
 */
export const NhanXetMarkdown = ({ children, tone = 'thuong' }: Props) => {
  const text = sanitizeDisplayText(String(children || ''));
  if (!text) return null;

  const mau = tone === 'sang'
    ? 'text-emerald-950 marker:text-emerald-700'
    : 'text-slate-700 marker:text-slate-400';

  return (
    <div
      className={`nhan-xet text-sm font-medium leading-7 ${mau}
        [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0
        [&_ul]:my-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5
        [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5
        [&_strong]:font-black
        [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-black
        [&_h4]:mb-1 [&_h4]:mt-3 [&_h4]:text-sm [&_h4]:font-black
        [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em]
        [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[0.95em]
        [&_th]:border [&_th]:border-current/20 [&_th]:px-2 [&_th]:py-1
        [&_td]:border [&_td]:border-current/20 [&_td]:px-2 [&_td]:py-1
        [&_.katex]:text-[1.02em] [&_.katex-display]:my-3 [&_.katex-display]:overflow-x-auto`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {text}
      </ReactMarkdown>
    </div>
  );
};

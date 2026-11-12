import type { ReactNode } from 'react';
import type { ParentGuidePublic } from '../../../lib/classroom/types';
import { NhanXetMarkdown } from './NhanXetMarkdown';

const Block = ({ title, children }: { title: string; children: ReactNode }) => <div className="mt-3">
  <h3 className="text-sm font-black text-emerald-900">{title}</h3>
  {children}
</div>;

/** Hướng dẫn phụ huynh: chỉ hiện khi máy chủ trả bản đã đăng khớp nội dung. Học sinh không có mục này. */
export const ParentGuideCard = ({ guide }: { guide?: ParentGuidePublic }) => {
  if (!guide) return null;
  return <section aria-label="Hướng dẫn phụ huynh" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
    <h2 className="text-base font-black">Hướng dẫn phụ huynh</h2>
    <div className="mt-2"><NhanXetMarkdown tone="sang">{guide.goal}</NhanXetMarkdown></div>
    {!!guide.askFirst.length && <Block title="Hỏi con trước"><ul className="list-disc space-y-1 pl-5">{guide.askFirst.map((item, index) => <li key={index}><NhanXetMarkdown tone="sang">{item}</NhanXetMarkdown></li>)}</ul></Block>}
    {!!guide.steps.length && <Block title="Các bước"><ol className="list-decimal space-y-1 pl-5">{guide.steps.map((item, index) => <li key={index}><NhanXetMarkdown tone="sang">{item}</NhanXetMarkdown></li>)}</ol></Block>}
    {!!guide.commonMistakes.length && <Block title="Lỗi hay gặp"><ul className="list-disc space-y-1 pl-5">{guide.commonMistakes.map((item, index) => <li key={index}><NhanXetMarkdown tone="sang">{item}</NhanXetMarkdown></li>)}</ul></Block>}
    {!!guide.askTeacher && <Block title="Khi nào nên hỏi giáo viên"><NhanXetMarkdown tone="sang">{guide.askTeacher}</NhanXetMarkdown></Block>}
  </section>;
};

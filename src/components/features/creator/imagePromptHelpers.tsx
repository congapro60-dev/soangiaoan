import React from 'react';

const IMAGE_PROMPT_RE = /(?:^>\s*)?🎨\s*Image Prompt:\s*/i;

function extractText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (children && typeof children === 'object' && 'props' in (children as any)) {
    return extractText((children as any).props?.children);
  }
  return '';
}

function ImagePromptCard({ description }: { description: string }) {
  return (
    <div className="my-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3">
      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
      </div>
      <div>
        <p className="text-sm font-bold text-indigo-900 mb-1">Gợi ý tạo ảnh minh họa (Image Prompt)</p>
        <p className="text-xs text-indigo-700 leading-relaxed italic">{description}</p>
      </div>
    </div>
  );
}

function tryImagePromptCard(children: React.ReactNode): React.ReactElement | null {
  const text = extractText(children).trim();
  if (!IMAGE_PROMPT_RE.test(text)) return null;
  const desc = text.replace(/^>\s*/, '').replace(/🎨\s*Image Prompt:\s*/i, '').trim();
  if (!desc) return null;
  return <ImagePromptCard description={desc} />;
}

export function imagePromptBlockquote({ children, ...props }: any) {
  const card = tryImagePromptCard(children);
  if (card) return card;
  return <blockquote {...props}>{children}</blockquote>;
}

export function imagePromptParagraph({ children, ...props }: any) {
  const card = tryImagePromptCard(children);
  if (card) return card;
  return <p {...props}>{children}</p>;
}

export function imagePromptTd({ children, ...props }: any) {
  const card = tryImagePromptCard(children);
  if (card) return <td {...props}>{card}</td>;
  return <td {...props}>{children}</td>;
}

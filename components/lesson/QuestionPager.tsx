"use client";
import React, {useRef, useState} from "react";

export interface QuestionPagerProps {
  identity: string;
  items: Array<{id: string; content: React.ReactNode}>;
  label?: string;
  busy?: boolean;
}

function Questions({items, label = "Câu", busy = false}: Omit<QuestionPagerProps, "identity">) {
  const [selectedId, setSelectedId] = useState(items[0]?.id);
  const heading = useRef<HTMLDivElement>(null);
  const found = items.findIndex(item => item.id === selectedId);
  const index = Math.max(0, found);
  if (!items.length) return null;
  const navigate = (offset: number) => {
    const target = index + offset;
    if (busy || target < 0 || target >= items.length) return;
    setSelectedId(items[target].id);
    heading.current?.focus();
  };
  return <section className="lesson-question-pager">
    <div ref={heading} tabIndex={-1} className="lesson-question-heading" role="heading" aria-level={3}>
      <span aria-live="polite" aria-atomic="true">{label} {index + 1}/{items.length}</span>
    </div>
    {items.map((item, itemIndex) => <div key={item.id} data-question-id={item.id} hidden={itemIndex !== index} style={itemIndex !== index ? {display: "none"} : undefined}>{item.content}</div>)}
    <nav className="lesson-question-nav lesson-question-pager-footer" aria-label={`Chuyển ${label.toLocaleLowerCase("vi")}`}>
      <button type="button" className="lesson-button lesson-button-outline" style={{minHeight: 44, minWidth: 44}} disabled={busy || index === 0} onClick={() => navigate(-1)}>Trước</button>
      <button type="button" className="lesson-button" style={{minHeight: 44, minWidth: 44}} disabled={busy || index === items.length - 1} onClick={() => navigate(1)}>Tiếp</button>
    </nav>
  </section>;
}

export function QuestionPager({identity, ...props}: QuestionPagerProps) {
  return <Questions key={identity} {...props}/>;
}

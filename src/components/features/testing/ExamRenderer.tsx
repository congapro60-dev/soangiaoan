import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { preprocessExamMarkdown } from '../../../utils/examMarkdown';
import './ExamRenderer.css';

interface ExamRendererProps {
  content: string;
}

const isSafeInlineSvg = (value: string): boolean => {
  const svg = value.trim();
  if (!/^<svg[\s\S]*<\/svg>$/i.test(svg)) return false;
  if (/<script\b|<iframe\b|<object\b|<embed\b|on\w+\s*=|javascript:/i.test(svg)) return false;
  return true;
};

const optionLabelPattern = /^[A-D]\.\s*/;

const getTextFromNode = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getTextFromNode).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return getTextFromNode(node.props.children);
  return '';
};

const getOptionColumnClass = (items: React.ReactNode[]): 'cols-4' | 'cols-2' | 'cols-1' => {
  const texts = items.map(item => getTextFromNode(item).replace(/\s+/g, ' ').trim());
  const maxLength = Math.max(...texts.map(text => text.length));
  const hasLikelyMathOrMedia = items.some(item => /\$|\\\(|\\\[|<svg|<table/i.test(getTextFromNode(item)));

  if (hasLikelyMathOrMedia || maxLength > 52) return 'cols-1';
  if (maxLength > 24) return 'cols-2';
  return 'cols-4';
};

const isOptionItem = (node: React.ReactNode): boolean => optionLabelPattern.test(getTextFromNode(node).trim());

const renderCode = ({ inline, className, children, ...props }: any) => {
  const language = /language-(\w+)/.exec(className || '')?.[1]?.toLowerCase();
  const raw = String(children ?? '').trim();

  if (!inline && (language === 'xml' || language === 'svg') && isSafeInlineSvg(raw)) {
    return (
      <figure
        className="exam-figure exam-svg"
        dangerouslySetInnerHTML={{ __html: raw }}
      />
    );
  }

  // TikZ/LaTeX figure blocks are intended for .tex/Overleaf export only.
  // Hide them completely from Web UI and print/PDF rendering to avoid duplicate figures.
  if (!inline && (language === 'latex' || language === 'tikz' || language === 'tex')) {
    return null;
  }

  return inline ? (
    <code className={className} {...props}>{children}</code>
  ) : (
    <pre className={className ? `exam-code-block ${className}` : 'exam-code-block'}>
      <code {...props}>{children}</code>
    </pre>
  );
};

export const ExamRenderer: React.FC<ExamRendererProps> = ({ content }) => {
  const normalizedContent = useMemo(() => preprocessExamMarkdown(content), [content]);

  return (
    <article className="exam-renderer exam-print-root">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          code: renderCode,
          img: ({ alt, ...props }) => (
            <img className="exam-image" alt={alt || 'Hình minh họa đề thi'} {...props} />
          ),
          table: ({ children, ...props }) => (
            <div className="exam-table-wrap">
              <table {...props}>{children}</table>
            </div>
          ),
          ul: ({ children, ...props }) => {
            const items = React.Children.toArray(children);
            const isMultipleChoiceList = items.length === 4 && items.every(isOptionItem);
            const className = isMultipleChoiceList
              ? `exam-options ${getOptionColumnClass(items)}`
              : undefined;
            return <ul className={className} {...props}>{children}</ul>;
          },
          li: ({ children, ...props }) => {
            const isOption = optionLabelPattern.test(getTextFromNode(children).trim());
            return (
              <li className={isOption ? 'exam-list-item exam-option-item' : 'exam-list-item'} {...props}>
                {children}
              </li>
            );
          },
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </article>
  );
};

export default ExamRenderer;

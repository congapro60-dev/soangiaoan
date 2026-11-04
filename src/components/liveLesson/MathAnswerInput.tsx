import { useRef, type ChangeEvent, type RefObject } from 'react';
import { LiveLessonRichText } from './LiveLessonRichText';

export type MathInputToken = 'frac' | 'sqrt' | '²' | '≤' | '≥' | 'π';

export const normalizeMathInput = (value: string): string => value
  .replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, '\\frac{$1}{$2}')
  .replace(/sqrt\(([^()]+)\)/gi, '\\sqrt{$1}');

export const insertMathToken = (value: string, cursor: number, token: MathInputToken): { value: string; cursor: number } => {
  const insertion = token === 'frac' ? '\\frac{}{}' : token === 'sqrt' ? '\\sqrt{}' : token;
  const nextValue = `${value.slice(0, cursor)}${insertion}${value.slice(cursor)}`;
  return { value: nextValue, cursor: cursor + insertion.length };
};

const tokens: MathInputToken[] = ['frac', 'sqrt', '²', '≤', '≥', 'π'];

export interface MathAnswerInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  ariaLabel?: string;
  className?: string;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}

export const MathAnswerInput = ({ value, onChange, placeholder = 'Viết câu trả lời có công thức…', disabled = false, maxLength = 2000, ariaLabel = 'Câu trả lời Toán học', className = '', inputRef }: MathAnswerInputProps) => {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const ref = inputRef ?? internalRef;
  const change = (event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value);
  const addToken = (token: MathInputToken) => {
    const input = ref.current;
    const cursor = input?.selectionStart ?? value.length;
    const next = insertMathToken(value, cursor, token);
    onChange(next.value);
    requestAnimationFrame(() => {
      if (!ref.current) return;
      ref.current.focus();
      ref.current.setSelectionRange(next.cursor, next.cursor);
    });
  };
  const normalized = normalizeMathInput(value);
  return <div className={`math-answer-input ${className}`}>
    <textarea ref={ref} value={value} onChange={change} disabled={disabled} maxLength={maxLength} aria-label={ariaLabel} placeholder={placeholder} className="math-answer-input__editor" />
    <div className="math-answer-input__toolbar" aria-label="Bàn phím Toán học">
      {tokens.map(token => <button key={token} type="button" disabled={disabled} onClick={() => addToken(token)}>{token === 'frac' ? 'a/b' : token === 'sqrt' ? '√' : token}</button>)}
    </div>
    {normalized.trim() && <div className="math-answer-input__preview" aria-label="Xem trước công thức"><span className="math-answer-input__preview-label">Xem trước</span><LiveLessonRichText text={normalized} mathScale="student" /></div>}
  </div>;
};

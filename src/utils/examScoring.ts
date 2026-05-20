import { ExamQuestion, TfScoringMode } from '../types';

export const isCompoundTF = (q: ExamQuestion) =>
  q.type === 'true_false' && Array.isArray(q.options) && q.options.length > 0;

const braceMathScript = (script: string) => (
  script.startsWith('{') ? script : `{${script}}`
);

const normalizeInlineMathIdentifier = (base: string, subscript = '', superscript = '') => {
  const normalizedSubscript = subscript ? `_${braceMathScript(subscript.slice(1))}` : '';
  const normalizedSuperscript = superscript ? `^${braceMathScript(superscript.slice(1))}` : '';
  return `$${base}${normalizedSubscript}${normalizedSuperscript}$`;
};

const wrapPlainMathFragments = (text: string) => {
  const mathDelimitedSegmentPattern = /(\$\$[\s\S]*?\$\$|\$[^$]*\$)/g;

  return text
    .split(mathDelimitedSegmentPattern)
    .map(segment => {
      if (!segment || segment.startsWith('$')) return segment;

      return segment
        // Common school-math identifiers written as plain text: u_1, u_{n+1}, S_10, x^2...
        // Always brace scripts so TeX renders multi-character indices as S_{10}, not S_1 followed by 0.
        .replace(
          /\b([A-Za-z][A-Za-z0-9]*)(?:(_\{[^{}]+\}|_[A-Za-z0-9]+))(?:(\^\{[^{}]+\}|\^[A-Za-z0-9]+))?/g,
          (_match, base: string, subscript: string, superscript = '') => normalizeInlineMathIdentifier(base, subscript, superscript),
        )
        // Compact forms often typed by teachers for sequences: u1, u2, u6, S10.
        .replace(/\b([uUS])([0-9]+)\b/g, (_match, base: string, subscript: string) => `$${base}_{${subscript}}$`);
    })
    .join('');
};

/** Fail-safe to wrap un-wrapped LaTeX commands and normalize delimiters */
export const ensureMathWrapped = (text: string) => {
  if (!text) return '';
  
  // 1. Normalize AI mixed delimiters: \[ \] -> $$ $$, \( \) -> $ $
  let processed = text
    .replace(/\\\[/g, '$$$$')
    .replace(/\\\]/g, '$$$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$');

  processed = wrapPlainMathFragments(processed);
  
  // 2. Pattern for common LaTeX commands
  const latexPattern = /\\(frac|sqrt|alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsil|phi|chi|psi|omega|infty|partial|sum|prod|int|oint|iint|iiint|diff|nabla|times|div|pm|mp|cdot|cap|cup|subset|supset|in|notin|exists|forall|neg|wedge|vee|to|gets|mapsto|leftarrow|rightarrow|long|Left|Right|iff|equiv|sim|approx|ne|le|ge|circ|deg|text|mathbf|mathit|mathrm|mathsf|mathtt|mathbb|mathcal|mathscr|mathfrak|binom|cases|matrix|vmatrix|Vmatrix|array|begin|end|sin|cos|tan|cot|arcsin|arccos|arctan|log|ln|lim|max|min|sup|inf|vert|Vert|langle|rangle|lceil|rceil|lfloor|rfloor|dots|cdots|ldots|ddots|vdots|over|under|bar|hat|tilde|vec|dot|ddot|acute|grave|check|breve|mathstrut|phantom|vphantom|hphantom|smash|rule|color|hspace|vspace|quad|qquad|label|ref|cite|nonumber|intertext|tag|mathcal)/g;
  
  if (latexPattern.test(processed)) {
    // Attempt to wrap inline LaTeX commands that are still outside existing math delimiters.
    return processed
      .split(/(\$\$[\s\S]*?\$\$|\$[^$]*\$)/g)
      .map(segment => (
        segment.startsWith('$')
          ? segment
          : segment.replace(/(\\[a-zA-Z]+(?:\{[^{}]*\}|\[[^\[\]]*\])*)/g, '$$$1$$')
      ))
      .join('');
  }
  return processed;
};

/** Determine how many columns to use for MCQ options based on content length */
export const getOptionCols = (options: string[]): 1 | 2 | 4 => {
  if (!options || options.length === 0) return 4;
  const maxLen = Math.max(...options.map(o => o.replace(/\$[^$]*\$/g, 'MATH').length)); // Strip math for length check
  if (maxLen < 15) return 4;
  if (maxLen < 35) return 2;
  return 1;
};

export const parseTFSub = (v: string): Partial<Record<'a' | 'b' | 'c' | 'd', 'Đ' | 'S'>> => {
  try { return JSON.parse(v); } catch { return {}; }
};

export const computeAutoScore = (
  q: ExamQuestion,
  answer: string,
  tfScoringMode?: TfScoringMode
): number | undefined => {
  if (!answer) return 0;

  if (q.type === 'multiple_choice') {
    return answer === q.correctAnswer ? q.points : 0;
  }

  if (isCompoundTF(q)) {
    const studentTF = parseTFSub(answer);
    const correctTF = parseTFSub(q.correctAnswer || '');
    const keys: ('a' | 'b' | 'c' | 'd')[] = ['a', 'b', 'c', 'd'];
    const correctCount = keys.filter(k => studentTF[k] === correctTF[k]).length;

    if (tfScoringMode === 'thpt2025') {
      if (correctCount === 4) return q.points;
      if (correctCount === 3) return q.points * 0.5;
      if (correctCount === 2) return q.points * 0.25;
      if (correctCount === 1) return q.points * 0.1;
      return 0;
    }
    
    // Default or simple ratio
    return (q.points / 4) * correctCount;
  }

  if (q.type === 'short_answer') {
    const s = answer.trim().toLowerCase();
    const c = (q.correctAnswer || '').trim().toLowerCase();
    return s === c ? q.points : 0;
  }

  return undefined;
};

export const recalcTotalScore = (
  questions: ExamQuestion[],
  answers: { questionId: string; answer: string }[],
  tfScoringMode?: TfScoringMode
): number => {
  return answers.reduce((sum, ans) => {
    const q = questions.find(q => q.id === ans.questionId);
    if (!q) return sum;
    return sum + (computeAutoScore(q, ans.answer, tfScoringMode) || 0);
  }, 0);
};

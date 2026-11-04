import { ExamQuestion, StudentAnswer, TfScoringMode } from '../types';

export const isCompoundTF = (q: ExamQuestion) =>
  q.type === 'true_false' && Array.isArray(q.options) && q.options.length > 0;

/**
 * Tính lại điểm một bài nộp từ đáp án gốc — dùng để giáo viên XÁC MINH điểm
 * (điểm hiện được tính ở trình duyệt học sinh nên có thể bị can thiệp), và để
 * "Sửa đáp án & tính lại" không làm mất điểm tự luận đã chấm AI.
 * - Câu non-essay: tính lại autoScore từ correctAnswer.
 * - Câu essay: giữ nguyên aiScore/autoScore đã có (AI/giáo viên chấm).
 * - Tổng = autoScore các câu auto + aiScore các câu tự luận.
 */
export const verifySubmissionScore = (
  questions: ExamQuestion[],
  submissionAnswers: StudentAnswer[],
  storedTotalScore: number | undefined,
  tfScoringMode?: TfScoringMode
): { answers: StudentAnswer[]; totalScore: number; changed: boolean } => {
  let answersChanged = false;
  const seen = new Set<string>();
  const answers = submissionAnswers.filter(a => {
    if (!questions.some(q => q.id === a.questionId) || seen.has(a.questionId)) { answersChanged = true; return false; }
    seen.add(a.questionId); return true;
  }).map(a => {
    const q = questions.find(item => item.id === a.questionId)!;
    if (q.type === 'essay') return a;
    const autoScore = computeAutoScore(q, a.answer, tfScoringMode);
    const reviewKeyChanged = (a.correctAnswer !== undefined && a.correctAnswer !== q.correctAnswer)
      || (a.explanation !== undefined && a.explanation !== q.explanation);
    if (autoScore === a.autoScore && !reviewKeyChanged) return a;
    answersChanged = true;
    const { correctAnswer: _oldKey, explanation: _oldExplanation, ...answer } = a;
    return { ...answer, autoScore, ...(q.correctAnswer !== undefined ? { correctAnswer: q.correctAnswer } : {}), ...(q.explanation !== undefined ? { explanation: q.explanation } : {}) };
  });

  const totalScore = Math.round(answers.reduce((sum, a) => {
    if (a.autoScore !== undefined) return sum + a.autoScore;
    if (a.aiScore !== undefined) return sum + a.aiScore;
    return sum;
  }, 0) * 100) / 100;

  const changed = answersChanged || Math.abs(totalScore - (storedTotalScore ?? 0)) > 0.005;
  return { answers, totalScore, changed };
};

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
  if (!v) return {};
  const keys = ['a', 'b', 'c', 'd'] as const;
  const normalizeValue = (value: unknown) => typeof value === 'string' ? value.trim().toUpperCase() : '';
  try {
    const parsed = JSON.parse(v);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return keys.reduce<Partial<Record<'a' | 'b' | 'c' | 'd', 'Đ' | 'S'>>>((result, key) => {
        const value = normalizeValue((parsed as Record<string, unknown>)[key]);
        if (value === 'Đ' || value === 'S') result[key] = value;
        return result;
      }, {});
    }
  } catch {
    // Legacy/imported answer keys use CSV: "Đ,S,Đ,S".
  }
  const parts = v.split(',').map(normalizeValue);
  if (parts.length !== keys.length || parts.some(part => part !== 'Đ' && part !== 'S')) return {};
  return keys.reduce<Partial<Record<'a' | 'b' | 'c' | 'd', 'Đ' | 'S'>>>(
    (result, key, index) => { result[key] = parts[index] as 'Đ' | 'S'; return result; },
    {},
  );
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
    if (keys.some(key => correctTF[key] === undefined)) return 0;
    const correctCount = keys.filter(key => (
      studentTF[key] !== undefined && studentTF[key] === correctTF[key]
    )).length;

    if (tfScoringMode === 'thpt2025') {
      if (correctCount === 4) return q.points;
      if (correctCount === 3) return q.points * 0.5;
      if (correctCount === 2) return q.points * 0.25;
      if (correctCount === 1) return q.points * 0.1;
      return 0;
    }
    
    return correctCount === 4 ? q.points : 0;
  }

  if (q.type === 'short_answer' || q.type === 'true_false') {
    const s = answer.trim().toLowerCase().replace(/\s+/g, ' ');
    const c = (q.correctAnswer || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return s === c ? q.points : 0;
  }

  return undefined;
};

/** Reject ambiguous answer keys before publishing or grading imported questions. */
export const validateExamQuestions = (questions: ExamQuestion[]): ExamQuestion[] => {
  if (!Array.isArray(questions) || !questions.length) throw new Error('Đề cần ít nhất một câu hỏi.');
  const ids = new Set<string>();
  return questions.map((q, index) => {
    const fail = () => { throw new Error(`Câu ${index + 1}: nội dung, điểm hoặc đáp án chưa hợp lệ.`); };
    if (!q || typeof q.id !== 'string' || !q.id || ids.has(q.id) || typeof q.content !== 'string' || !q.content.trim() || !Number.isFinite(q.points) || q.points <= 0) return fail();
    ids.add(q.id);
    if (q.type === 'essay') return q;
    if (typeof q.correctAnswer !== 'string' || !q.correctAnswer.trim()) return fail();
    let correctAnswer = q.correctAnswer.trim();
    if (q.type === 'multiple_choice') {
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4 || q.options.some(o => typeof o !== 'string' || !o.trim())) return fail();
      const optionText = (value: string) => value.replace(/^[A-D][.)]\s*/i, '').trim().toLocaleLowerCase('vi');
      if (!/^[A-D]$/.test(correctAnswer) || correctAnswer.charCodeAt(0) - 65 >= q.options.length) {
        const matches = q.options.map((o, i) => optionText(o) === optionText(correctAnswer) ? i : -1).filter(i => i >= 0);
        if (matches.length !== 1) return fail();
        correctAnswer = String.fromCharCode(65 + matches[0]);
      }
    } else if (isCompoundTF(q)) {
      if (q.options!.length !== 4 || q.options!.some(o => typeof o !== 'string' || !o.trim())) return fail();
      const parsed = parseTFSub(correctAnswer);
      if (Object.keys(parsed).length !== 4) return fail();
      correctAnswer = (['a', 'b', 'c', 'd'] as const).map(k => parsed[k]).join(',');
    } else if (q.type === 'true_false') {
      if (!['Đúng', 'Sai'].includes(correctAnswer)) return fail();
    } else if (q.type !== 'short_answer') return fail();
    return { ...q, correctAnswer };
  });
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

/**
 * mathText — MODULE DUY NHẤT xử lý chuỗi chứa công thức Toán trước khi hiển thị.
 * (Gốc bệnh D1 — QA đợt 9: nhiều regex chồng nhau không nhận biết vùng $...$
 * → chèn `$` vào TRONG vùng math có sẵn → tách đôi công thức → caret/lệnh LaTeX thô.)
 *
 * Nguyên tắc:
 * 1. Tokenize chuỗi thành vùng math ($...$) / text TRƯỚC, mọi transform chỉ chạy
 *    trên đúng loại vùng của mình — KHÔNG BAO GIỜ chèn `$` vào trong vùng math.
 * 2. `$` lẻ được vá trước khi tokenize (gỡ `$` rác đầu/cuối, hoặc bọc cả cụm nếu có lệnh LaTeX).
 * 3. assertClean hậu-kiểm; vi phạm → giữ mảnh text an toàn + console.warn có tag.
 *
 * CẤM viết regex xử lý công thức mới ngoài module này (xem tasks/lessons.md).
 */

export interface MathToken {
  type: 'math' | 'text';
  content: string;
  open?: string;
  close?: string;
}

/** Lệnh LaTeX phổ biến — xuất hiện NGOÀI vùng $...$ nghĩa là dữ liệu lỗi cần vá. */
const LATEX_CMD_RE = /\\(?:frac|sqrt|left|right|cdot|pm|mp|times|div|leq?|geq?|neq?|approx|infty|alpha|beta|gamma|Delta|delta|theta|lambda|mu|pi|sigma|omega|displaystyle|sin|cos|tan|cot|log|ln|lim|vec|overline|hat|underline|text|mathbb|mathrm|mathbf|begin|end|in|notin|subset|supset|cap|cup|Rightarrow|Leftrightarrow|to|le|ge|ne)(?![A-Za-z])/;

/**
 * Dữ liệu chấm cũ đôi khi làm mất dấu `\\` khi đi qua JSON, ví dụ `D in SA`.
 * Chỉ phục hồi trong một cặp toán tử có hai vế mang hình dạng ký hiệu Toán;
 * không thay mọi từ `in` trong câu thường của tiếng Việt/tiếng Anh.
 */
const LEGACY_MATH_ATOM = '(?:[A-Z][A-Z0-9]{0,3}|[a-z]|\\([^()\\r\\n]{1,24}\\)|\\{[^{}\\r\\n]{1,24}\\})';
const LEGACY_WORD_OPERATOR_RE = new RegExp(
  `(^|[\\s,(;:])(${LEGACY_MATH_ATOM})\\s+(in|notin|subset|supset|cap|cup)\\s+(${LEGACY_MATH_ATOM})(?=$|[\\s,.;:)])`,
  'g',
);
const LEGACY_WORD_OPERATOR_LATEX = {
  in: '\\in',
  notin: '\\notin',
  subset: '\\subset',
  supset: '\\supset',
  cap: '\\cap',
  cup: '\\cup',
} as const;

const normalizeLegacyWordOperators = (s: string): string =>
  s.replace(
    LEGACY_WORD_OPERATOR_RE,
    (_match: string, boundary: string, left: string, operator: string, right: string) =>
      `${boundary}${left} ${LEGACY_WORD_OPERATOR_LATEX[operator as keyof typeof LEGACY_WORD_OPERATOR_LATEX]} ${right}`,
  );

const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };

/** Mảnh toán "trần" trong vùng TEXT cần bọc $ (toạ độ F_1(3;0), luỹ thừa có dấu =…). */
/** Gỡ double-escape (\\frac → \frac) do chuỗi bị JSON-escape 2 lần. */
const fixDoubleEscapes = (s: string): string =>
  s.replace(/\\\\(frac|sqrt|Delta|alpha|beta|gamma|displaystyle|left|right|cdot|pm|mp|times|div|leq?|geq?|neq?|approx|infty|sin|cos|tan|cot|log|ln|lim|vec|overline|hat|underline|text|mathbb|mathrm|mathbf|in|notin|subset|supset|cap|cup|Rightarrow|Leftrightarrow|to|le|ge|ne)/g, '\\$1');

/** Bọc cả chuỗi bằng $…$, giữ tiền tố nhãn phương án "A." nếu có. */
const wrapWhole = (s: string): string => {
  const m = s.match(/^([A-D][).．.]\s*)([\s\S]+)$/);
  return m ? `${m[1]}$${m[2].trim()}$` : `$${s.trim()}$`;
};

/**
 * Vá `$` lẻ TRƯỚC khi tokenize:
 * - `$` rác ở cuối/đầu chuỗi → gỡ, nếu phần còn lại cân thì xong;
 * - còn lẻ → gỡ hết `$`; tokenizer sau đó chỉ bọc mảnh toán xác định, giữ lời dẫn.
 */
const repairDollarBalance = (s: string): string => {
  const isBalanced = (t: string) => ((t.match(/\$/g) || []).length) % 2 === 0;
  if (isBalanced(s)) return s;
  let t = s;
  if (/\$\s*$/.test(t)) {
    t = t.replace(/\$\s*$/, '');
    if (isBalanced(t)) return t;
  }
  if (/^\s*\$/.test(t)) {
    t = t.replace(/^\s*\$/, '');
    if (isBalanced(t)) return t;
  }
  const stripped = s.replace(/\$/g, '');
  // Re-tokenize bare fragments later; never turn mixed prose into one formula.
  return stripped;
};

/** Tách chuỗi (đã cân `$`) thành mảng vùng math/text. Index lẻ sau split('$') = math. */
export const tokenizeMath = (input: string): MathToken[] => {
  const delimiters = [
    { open: '$$', close: '$$' },
    { open: '$', close: '$' },
    { open: '\\(', close: '\\)' },
    { open: '\\[', close: '\\]' },
  ] as const;
  const tokens: MathToken[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    let next: { index: number; open: string; close: string } | null = null;
    for (const delimiter of delimiters) {
      const index = input.indexOf(delimiter.open, cursor);
      if (index < 0 || (next && next.index <= index)) continue;
      next = { index, ...delimiter };
    }
    if (!next) break;
    if (next.index > cursor) tokens.push({ type: 'text', content: input.slice(cursor, next.index) });

    const contentStart = next.index + next.open.length;
    const closeIndex = input.indexOf(next.close, contentStart);
    if (closeIndex < 0) {
      tokens.push({ type: 'text', content: input.slice(next.index) });
      cursor = input.length;
      break;
    }
    tokens.push({
      type: 'math',
      content: input.slice(contentStart, closeIndex),
      open: next.open,
      close: next.close,
    });
    cursor = closeIndex + next.close.length;
  }

  if (cursor < input.length) tokens.push({ type: 'text', content: input.slice(cursor) });
  if (tokens.length === 0) tokens.push({ type: 'text', content: '' });
  return tokens;
};

const joinTokens = (tokens: MathToken[]): string =>
  tokens.map(t => {
    if (t.type === 'text') return t.content;
    const open = t.open === '\\(' ? '$' : t.open === '\\[' ? '$$' : (t.open || '$');
    const close = t.close === '\\)' ? '$' : t.close === '\\]' ? '$$' : (t.close || '$');
    return open + t.content + close;
  }).join('');

/** [Vùng TEXT] Đổi luỹ thừa caret đơn (a^2, =b^2) sang chữ số trên (a², =b²). */
const convertCaretsInText = (s: string): string =>
  s.replace(/([A-Za-z0-9)\]}])\^\{?(\d)\}?/g, (_m, base: string, d: string) => base + SUP[d]);

/** [Vùng TEXT] Bọc `$` cho mảnh toán trần còn sót (toạ độ, biểu thức có caret phức tạp). */
const isWordCharacter = (char: string | undefined): boolean => Boolean(char && /[A-Za-zÀ-ỹ0-9_]/.test(char));

/** Tách liên từ khỏi ứng viên math; brace depth giữ \text{và} nguyên vẹn. */
const splitBareText = (s: string): string[] => {
  const connectors = ['do đó', 'suy ra', 'và', 'nên', 'vì', 'là'];
  const chunks: string[] = [];
  let cursor = 0;
  let braceDepth = 0;
  let index = 0;

  while (index < s.length) {
    if (s[index] === '{') braceDepth += 1;
    if (s[index] === '}') braceDepth = Math.max(0, braceDepth - 1);

    if (braceDepth === 0 && s[index] === '=' && s[index + 1] === '>') {
      chunks.push(s.slice(cursor, index));
      chunks.push('=>');
      index += 2;
      cursor = index;
      continue;
    }

    if (braceDepth === 0 && s[index - 1] !== '\\') {
      const rest = s.slice(index).toLowerCase();
      const connector = connectors.find(item => rest.startsWith(item));
      if (connector
        && !isWordCharacter(s[index - 1])
        && !isWordCharacter(s[index + connector.length])) {
        chunks.push(s.slice(cursor, index));
        chunks.push(s.slice(index, index + connector.length));
        index += connector.length;
        cursor = index;
        continue;
      }
    }

    index += 1;
  }

  chunks.push(s.slice(cursor));
  return chunks;
};

const mathStartBeforeCommand = (prefix: string): number => {
  const trimmed = prefix.trimEnd();
  const match = trimmed.match(/[A-Za-z0-9_()[\]{}.,;:=+\-*/<>\\^]+$/);
  return match ? trimmed.lastIndexOf(match[0]) : prefix.length;
};

/**
 * Từ tiếng Việt 2 chữ không dấu hay gặp trong lời giải. Chỉ coi là chữ khi đứng riêng (cách bằng khoảng trắng) — không
 * dùng quy tắc "mọi từ 2 chữ thường" vì sẽ cắt nhầm ký hiệu toán như `dx`, `ln`, `tg`.
 */
const SHORT_PROSE_WORDS = new Set(['ta', 'em', 'ra', 'ai', 'ba']);

/** ponytail: short ASCII math atoms only; longer identifiers need explicit LaTeX delimiters. */
const proseFragments = (source: string): string[] => {
  const pieces: string[] = [];
  let cursor = 0;
  let depth = 0;
  for (let i = 0; i < source.length;) {
    if (source[i] === '\\') {
      const command = source.slice(i).match(/^\\[A-Za-z]+/);
      i += command?.[0].length || 2;
      continue;
    }
    if (source[i] === '{') depth++;
    if (source[i] === '}') depth = Math.max(0, depth - 1);
    const word = depth === 0 ? source.slice(i).match(/^[A-Za-zÀ-ỹ]+/) : null;
    if (word) {
      const standalone = /\s/.test(source[i - 1] || ' ') && /^(\s|$)/.test(source.slice(i + word[0].length, i + word[0].length + 1));
      if (/[À-ỹ]/.test(word[0]) || (word[0].length > 2 && !/^[A-Z]+$/.test(word[0])) || (standalone && SHORT_PROSE_WORDS.has(word[0]))) {
        pieces.push(source.slice(cursor, i), word[0]);
        cursor = i + word[0].length;
      }
      i += word[0].length;
    } else i++;
  }
  pieces.push(source.slice(cursor));
  return pieces;
};

const wrapBareSegment = (segment: string): string => {
  const normalized = normalizeLegacyWordOperators(segment);
  const pieces = proseFragments(normalized);
  if (pieces.length > 1) return pieces.map(piece => /^[A-Za-zÀ-ỹ]+$/.test(piece) ? piece : wrapBareSegment(piece)).join('');
  // Dấu câu đứng đầu mảnh (vd "Đáp án: x = 2") thuộc câu chữ, không thuộc công thức.
  const left = normalized.search(/[^\s.,;:!?]/);
  if (left < 0) return normalized;
  const leading = normalized.slice(0, left);
  let core = normalized.slice(left).trimEnd();
  let trailing = normalized.slice(left + core.length);
  if (core === '=>') return `${leading}$\\Rightarrow$${trailing}`;
  if (!LATEX_CMD_RE.test(core) && !core.includes('=')) return leading + convertCaretsInText(core) + trailing;
  // Sentence punctuation and unmatched prose brackets stay outside the math span.
  // Ngoặc mở cuối mảnh (lời giải thích kiểu "= 5 (thỏa mãn)") cũng thuộc phần chữ, không thuộc công thức.
  const opensMore = (text: string) => (text.match(/\(/g)?.length || 0) > (text.match(/\)/g)?.length || 0);
  while (/[.,;:!?]$/.test(core) || (core.endsWith(')') && (core.match(/\)/g)?.length || 0) > (core.match(/\(/g)?.length || 0))
    || (core.endsWith('(') && opensMore(core)) || (/\s$/.test(core) && core.trim() !== '')) {
    trailing = core.slice(-1) + trailing;
    core = core.slice(0, -1);
  }
  const source = LATEX_CMD_RE.test(core) ? core : convertCaretsInText(core);
  const commandIndex = source.search(LATEX_CMD_RE);
  const start = commandIndex > 0 ? mathStartBeforeCommand(source.slice(0, commandIndex)) : 0;
  return leading + source.slice(0, start) + wrapWhole(source.slice(start)) + trailing;
};

/** [Vùng TEXT] Bọc từng mảnh toán trần; không bọc liên từ hay câu nối tiếng Việt. */
const wrapBareFragmentsInText = (s: string): string =>
  // Giữ xuống dòng có chủ đích: một chuỗi kết luận nhiều công thức không được
  // gom thành một vùng math dài duy nhất, nếu không MathJax sẽ tràn ngang card.
  s.split('\n').map(line => splitBareText(line).map(wrapBareSegment).join('')).join('\n');

/** [Vùng MATH] \frac ở đầu công thức → thêm \displaystyle cho phân số to rõ (giữ hành vi cũ). */
const fixDisplaystyleInMath = (s: string): string =>
  s.trimStart().startsWith('\\frac') && !s.includes('\\displaystyle') ? `\\displaystyle ${s}` : s;

/** Hậu-kiểm: `$` chẵn, không còn lệnh LaTeX/caret-số trần ngoài vùng math. */
const normalizeMathContent = (s: string): string =>
  fixDisplaystyleInMath(s).replace(/=>/g, '\\Rightarrow');

export const assertClean = (s: string): boolean => {
  if (((s.match(/\$/g) || []).length) % 2 === 1) return false;
  return !tokenizeMath(s)
    .filter(token => token.type === 'text')
    .some(token => LATEX_CMD_RE.test(token.content) || /[a-zA-Z]\^\d/.test(token.content));
};

/** Bóc markdown lẫn trong phương án/đoạn text (**đậm**, gạch đầu dòng) do AI hay chèn. */
export const stripInlineMarkdown = (s: string): string =>
  s.replace(/\*\*/g, '').replace(/^\s*[-*•]\s+/, '').trim();

/**
 * Hàm CHUẨN cho mọi text hiển thị có thể chứa công thức (options, prompt, hint, solution,
 * notebook, tiêu đề…). Vá `$` lẻ → tokenize → transform theo vùng → hậu-kiểm.
 */
export const sanitizeDisplayText = (value: string | undefined | null): string => {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  let s = fixDoubleEscapes(raw);
  s = repairDollarBalance(s);
  const out = tokenizeMath(s).map(t =>
    t.type === 'math'
      ? { ...t, content: normalizeMathContent(t.content) }
      : { ...t, content: wrapBareFragmentsInText(t.content) },
  );
  // Normalize newly wrapped spans in the same pass for idempotence.
  let result = joinTokens(tokenizeMath(joinTokens(out)).map(t => t.type === 'math' ? { ...t, content: normalizeMathContent(t.content) } : t));
  if (!assertClean(result)) {
    console.warn('[mathText] assertClean FAIL — giữ text thay vì bọc cả lời dẫn.');
    result = wrapBareFragmentsInText(result.replace(/\$/g, ''));
  }
  return result;
};

/** ponytail: chỉ chia chuỗi dấu bằng ở cấp ngoài; công thức phức tạp giữ nguyên, prompt phải tạo aligned. */
export const formatFeedbackMath = (value: string): string => {
  const tokens = tokenizeMath(sanitizeDisplayText(value));
  return tokens.map((token, index) => {
    // remark-math treats text after an opening $$ as metadata, not TeX. Fence display math on its own lines.
    if (token.type === 'math' && (token.open === '$$' || token.open === '\\[')) {
      const previous = tokens[index - 1], next = tokens[index + 1];
      const line = previous?.type === 'text' ? previous.content.split('\n').at(-1) || '' : '';
      if (line.includes('|') || line.trimStart().startsWith('>')) return joinTokens([token]);
      const list = line.match(/^(\s*)(?:[-*+]|\d+[.)])\s+/);
      const indent = list ? ' '.repeat(list[0].length) : line.match(/^\s*/)?.[0] || '';
      const before = line.trim() ? '\n\n' + indent : '';
      const after = next?.type === 'text' && next.content && !next.content.startsWith('\n') ? '\n\n' + indent : '';
      return before + '$$\n' + token.content.trim().split('\n').map(part => part.startsWith(indent) ? part : indent + part).join('\n') + '\n' + indent + '$$' + after;
    }
    if (token.type !== 'math' || token.content.length < 60
      || /\\(?:begin|end|left|right|Rightarrow|Leftrightarrow)|[&\r\n]|\\\\|[<>!]=|==/.test(token.content)
      || /[À-ỹ]|[a-zA-Z]{3}/.test(token.content.replace(/\\[a-zA-Z]+/g, ''))) {
      return joinTokens([token]);
    }
    const parts: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < token.content.length; i++) {
      const char = token.content[i];
      if ('{(['.includes(char)) depth++;
      if ('})]'.includes(char)) depth--;
      if (depth < 0) return joinTokens([token]);
      if (depth === 0 && ',;|'.includes(char) && token.content[i - 1] !== '\\') return joinTokens([token]);
      if (char === '=' && depth === 0) {
        parts.push(token.content.slice(start, i).trim());
        start = i + 1;
      }
    }
    parts.push(token.content.slice(start).trim());
    if (depth || parts.length < 3 || parts.some(part => !part)) return joinTokens([token]);
    const previous = tokens[index - 1];
    const line = previous?.type === 'text' ? previous.content.split('\n').at(-1) || '' : '';
    if (line.includes('|') || line.trimStart().startsWith('>')) return joinTokens([token]);
    const next = tokens[index + 1];
    if (next?.type === 'text' && /^\.(?:\s|$)/.test(next.content)) {
      parts[parts.length - 1] += '.';
      next.content = next.content.slice(1);
    }
    const prefix = line.match(/^(\s*)(?:[-*+]|\d+[.)])\s+/);
    const indent = prefix ? ' '.repeat(prefix[0].length) : line.match(/^\s*/)?.[0] || '';
    const block = '$$\n\\begin{aligned}\n'
      + parts[0] + ' &= ' + parts[1]
      + parts.slice(2).map(part => '\\\\\n&= ' + part).join('')
      + '\n\\end{aligned}\n$$';
    return '\n\n' + block.split('\n').map(line => indent + line).join('\n') + '\n\n' + indent;
  }).join('');
};

/**
 * Chuyển chuỗi có $…$ thành PLAIN TEXT gần đúng cho nơi không chạy MathJax
 * (tiêu đề panel builder — lỗi F9): gỡ delimiter, đổi caret/lệnh phổ biến sang unicode.
 */
export const toPlainText = (value: string | undefined | null): string => {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  const s = repairDollarBalance(fixDoubleEscapes(raw));
  return tokenizeMath(s)
    .map(t =>
      t.type === 'math'
        ? t.content
            .replace(/\\displaystyle\s*/g, '')
            .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
            .replace(/\\sqrt\{([^{}]*)\}/g, '√$1')
            .replace(/\\pm/g, '±')
            .replace(/\\(?:cdot|times)/g, '·')
            .replace(/\\leq?\b/g, '≤')
            .replace(/\\geq?\b/g, '≥')
            .replace(/\\neq?\b/g, '≠')
            .replace(/\\infty/g, '∞')
            .replace(/\\(?:left|right)/g, '')
            .replace(/([A-Za-z0-9)\]}])\^\{?(\d)\}?/g, (_m, base: string, d: string) => base + SUP[d])
            .replace(/[{}]/g, '')
        : convertCaretsInText(t.content),
    )
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

/** Nửa "vá dữ liệu" (không đổi caret): dùng để repair chuỗi TRƯỚC KHI LƯU Firestore (D1#4). */
export const repairMathString = (value: string): string => {
  let s = fixDoubleEscapes(value);
  s = repairDollarBalance(s);
  if (!s.includes('$') && LATEX_CMD_RE.test(s)) s = wrapWhole(s);
  return s;
};

/** Các field KHÔNG được đụng khi repair sâu (HTML/URL/mã nguồn/id). */
const REPAIR_SKIP_KEYS = new Set([
  'id', 'tikzCode', 'srcDoc', 'imageDataUrl', 'interactiveSimHtml', 'videoUrl', 'html',
  'simulationId', 'teacherId', 'createdAt', 'updatedAt', 'subjectId', 'code',
]);

const looksLikeMarkup = (s: string): boolean =>
  /^\s*</.test(s) || /^(https?:|data:)/i.test(s) || s.includes('\\begin{');

/**
 * Đi sâu object bài học sau khi parse JSON, vá math string TẠI NGUỒN (trước khi lưu) —
 * chỉ cân `$` + bọc lệnh trần, bỏ qua field HTML/URL/TikZ/id để không phá dữ liệu.
 */
export const repairMathDeep = <T>(value: T, key?: string): T => {
  if (typeof value === 'string') {
    if ((key && REPAIR_SKIP_KEYS.has(key)) || looksLikeMarkup(value)) return value;
    return repairMathString(value) as T;
  }
  if (Array.isArray(value)) return value.map(item => repairMathDeep(item)) as unknown as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, repairMathDeep(v, k)]),
    ) as T;
  }
  return value;
};

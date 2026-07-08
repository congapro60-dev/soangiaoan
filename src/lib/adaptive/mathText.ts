/**
 * mathText — MODULE DUY NHẤT xử lý chuỗi chứa công thức Toán trước khi hiển thị.
 * (Gốc bệnh D1 — QA đợt 9: nhiều regex chồng nhau không nhận biết vùng $...$
 * → chèn `$` vào TRONG vùng math có sẵn → tách đôi công thức → caret/lệnh LaTeX thô.)
 *
 * Nguyên tắc:
 * 1. Tokenize chuỗi thành vùng math ($...$) / text TRƯỚC, mọi transform chỉ chạy
 *    trên đúng loại vùng của mình — KHÔNG BAO GIỜ chèn `$` vào trong vùng math.
 * 2. `$` lẻ được vá trước khi tokenize (gỡ `$` rác đầu/cuối, hoặc bọc cả cụm nếu có lệnh LaTeX).
 * 3. assertClean hậu-kiểm; vi phạm → bọc cả chuỗi làm cứu cánh + console.warn có tag.
 *
 * CẤM viết regex xử lý công thức mới ngoài module này (xem tasks/lessons.md).
 */

export interface MathToken {
  type: 'math' | 'text';
  content: string;
}

/** Lệnh LaTeX phổ biến — xuất hiện NGOÀI vùng $...$ nghĩa là dữ liệu lỗi cần vá. */
const LATEX_CMD_RE = /\\(?:frac|sqrt|left|right|cdot|pm|mp|times|div|leq?|geq?|neq?|approx|infty|alpha|beta|gamma|Delta|delta|theta|lambda|mu|pi|sigma|omega|displaystyle|sin|cos|tan|cot|log|ln|lim|vec|overline|hat|text|mathbb|mathrm|begin|end)\b/;

const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };

/** Mảnh toán "trần" trong vùng TEXT cần bọc $ (toạ độ F_1(3;0), luỹ thừa có dấu =…). */
const MATH_FRAGMENT_RE = /(^|[\s(])([A-Z]\.?\s*)?([a-zA-Z][\w']*\^\{?[-\w]+\}?\s*=\s*[-+]?\s*\d|[A-Z]_[12]?\s*\([-+]?\d+\s*[;,]\s*[-+]?\d+\)|[a-zA-Z]\^\{?\d+\}?\s*[+\-=])/g;

/** Gỡ double-escape (\\frac → \frac) do chuỗi bị JSON-escape 2 lần. */
const fixDoubleEscapes = (s: string): string =>
  s.replace(/\\\\(frac|sqrt|Delta|alpha|beta|gamma|displaystyle|left|right|cdot|pm|le|ge|ne|infty|sin|cos|tan)/g, '\\$1');

/** Bọc cả chuỗi bằng $…$, giữ tiền tố nhãn phương án "A." nếu có. */
const wrapWhole = (s: string): string => {
  const m = s.match(/^([A-D][).．.]\s*)([\s\S]+)$/);
  return m ? `${m[1]}$${m[2].trim()}$` : `$${s.trim()}$`;
};

/**
 * Vá `$` lẻ TRƯỚC khi tokenize:
 * - `$` rác ở cuối/đầu chuỗi → gỡ, nếu phần còn lại cân thì xong;
 * - còn lẻ → gỡ hết `$`; có lệnh LaTeX/caret thì bọc cả cụm, không thì trả text sạch.
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
  if (LATEX_CMD_RE.test(stripped) || /[\^_]\{?\w/.test(stripped)) return wrapWhole(stripped);
  return stripped;
};

/** Tách chuỗi (đã cân `$`) thành mảng vùng math/text. Index lẻ sau split('$') = math. */
export const tokenizeMath = (input: string): MathToken[] =>
  input.split('$').map((content, i) => ({ type: i % 2 === 1 ? ('math' as const) : ('text' as const), content }));

const joinTokens = (tokens: MathToken[]): string =>
  tokens.map(t => (t.type === 'math' ? `$${t.content}$` : t.content)).join('');

/** [Vùng TEXT] Đổi luỹ thừa caret đơn (a^2, =b^2) sang chữ số trên (a², =b²). */
const convertCaretsInText = (s: string): string =>
  s.replace(/([A-Za-z0-9)\]}])\^\{?(\d)\}?/g, (_m, base: string, d: string) => base + SUP[d]);

/** [Vùng TEXT] Bọc `$` cho mảnh toán trần còn sót (toạ độ, biểu thức có caret phức tạp). */
const wrapBareFragmentsInText = (s: string): string =>
  s.replace(MATH_FRAGMENT_RE, (match, prefix) => `${prefix || ''}$${match.slice((prefix || '').length).trim()}$`);

/** [Vùng MATH] \frac ở đầu công thức → thêm \displaystyle cho phân số to rõ (giữ hành vi cũ). */
const fixDisplaystyleInMath = (s: string): string =>
  s.trimStart().startsWith('\\frac') && !s.includes('\\displaystyle') ? `\\displaystyle ${s}` : s;

/** Hậu-kiểm: `$` chẵn, không còn lệnh LaTeX/caret-số trần ngoài vùng math. */
export const assertClean = (s: string): boolean => {
  if (((s.match(/\$/g) || []).length) % 2 === 1) return false;
  return !s
    .split('$')
    .filter((_, i) => i % 2 === 0)
    .some(part => LATEX_CMD_RE.test(part) || /[a-zA-Z]\^\d/.test(part));
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
  if (!s.includes('$') && LATEX_CMD_RE.test(s)) s = wrapWhole(s);
  const out = tokenizeMath(s).map(t =>
    t.type === 'math'
      ? { ...t, content: fixDisplaystyleInMath(t.content) }
      : { ...t, content: wrapBareFragmentsInText(convertCaretsInText(t.content)) },
  );
  let result = joinTokens(out);
  if (!assertClean(result)) {
    console.warn('[mathText] assertClean FAIL — bọc cả chuỗi làm cứu cánh:', result.slice(0, 120));
    result = wrapWhole(result.replace(/\$/g, ''));
  }
  return result;
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

/**
 * Chuyển công thức LaTeX sang ký hiệu Unicode để HS/PH đọc được trong chat Zalo.
 *
 * VÌ SAO CẦN: `sendMessage` của Zalo Bot Platform chỉ hỗ trợ markdown / html /
 * text_styles — KHÔNG render LaTeX và KHÔNG có thẻ <sup>. Khi model trả
 * `\(a^3\)` thì Zalo in nguyên si "\\(a^3\\)" cho học sinh đọc (sự cố 27/10).
 *
 * HAI LỚP BẢO VỆ, CÙNG MỘT CHUẨN:
 * 1. Prompt hệ thống buộc model viết thẳng bằng Unicode (xem buildSystemPrompt).
 * 2. Module này là lưới an toàn khi model vẫn lỡ sinh LaTeX.
 *
 * Quy ước đầu ra: ký hiệu Unicode sao cho đọc được trên điện thoại, không cần
 * font toán. Cái gì Unicode không có (căn, phân số phức tạp) thì dùng dấu ngoặc
 * thường: (x+1)/2, √(x+1), x^(n+1).
 */

/** Bảng ký hiệu: lệnh LaTeX → Unicode. Giữ nguyên thứ tự dài-trước-ngắn khi thay. */
const SYMBOLS: ReadonlyArray<readonly [string, string]> = [
  // Quan hệ & so sánh
  ['\\leqslant', '≤'], ['\\geqslant', '≥'], ['\\leq', '≤'], ['\\le', '≤'],
  ['\\geq', '≥'], ['\\ge', '≥'], ['\\neq', '≠'], ['\\ne', '≠'],
  ['\\approx', '≈'], ['\\equiv', '≡'], ['\\cong', '≅'], ['\\sim', '∼'],
  ['\\propto', '∝'], ['\\ll', '≪'], ['\\gg', '≫'],
  // Số học & đại số
  ['\\times', '×'], ['\\cdot', '·'], ['\\div', '÷'], ['\\pm', '±'], ['\\mp', '∓'],
  ['\\infty', '∞'], ['\\partial', '∂'], ['\\nabla', '∇'],
  ['\\sum', '∑'], ['\\prod', '∏'], ['\\int', '∫'], ['\\oint', '∮'],
  ['\\sqrt', '√'], ['\\cbrt', '∛'],
  // Logic & tập hợp
  ['\\in', '∈'], ['\\notin', '∉'], ['\\ni', '∋'],
  ['\\subset', '⊂'], ['\\subseteq', '⊆'], ['\\supset', '⊃'], ['\\supseteq', '⊇'],
  ['\\cup', '∪'], ['\\cap', '∩'], ['\\setminus', '\\'], ['\\emptyset', '∅'], ['\\varnothing', '∅'],
  ['\\forall', '∀'], ['\\exists', '∃'], ['\\nexists', '∄'], ['\\neg', '¬'],
  ['\\land', '∧'], ['\\lor', '∨'], ['\\therefore', '∴'], ['\\because', '∵'],
  // Mũi tên
  ['\\Longrightarrow', '⟹'], ['\\implies', '⟹'], ['\\Longleftrightarrow', '⟺'], ['\\iff', '⟺'],
  ['\\Rightarrow', '⇒'], ['\\Leftarrow', '⇐'], ['\\Leftrightarrow', '⇔'],
  ['\\longrightarrow', '⟶'], ['\\rightarrow', '→'], ['\\to', '→'], ['\\leftarrow', '←'],
  ['\\leftrightarrow', '↔'], ['\\mapsto', '↦'], ['\\uparrow', '↑'], ['\\downarrow', '↓'],
  // Hình học
  ['\\angle', '∠'], ['\\measuredangle', '∡'], ['\\perp', '⊥'], ['\\parallel', '∥'],
  ['\\triangle', '△'], ['\\square', '□'], ['\\odot', '⊙'], ['\\circ', '∘'],
  ['\\degree', '°'], ['\\prime', '′'], ['\\backprime', '‵'],
  // Hy Lạp (chữ thường)
  ['\\varepsilon', 'ε'], ['\\epsilon', 'ε'], ['\\vartheta', 'ϑ'], ['\\theta', 'θ'],
  ['\\varphi', 'φ'], ['\\phi', 'φ'], ['\\varsigma', 'ς'], ['\\sigma', 'σ'],
  ['\\omega', 'ω'], ['\\alpha', 'α'], ['\\beta', 'β'],
  ['\\gamma', 'γ'], ['\\delta', 'δ'], ['\\zeta', 'ζ'], ['\\eta', 'η'],
  ['\\iota', 'ι'], ['\\kappa', 'κ'], ['\\lambda', 'λ'], ['\\mu', 'μ'],
  ['\\nu', 'ν'], ['\\xi', 'ξ'], ['\\omicron', 'ο'], ['\\pi', 'π'], ['\\rho', 'ρ'],
  ['\\tau', 'τ'], ['\\upsilon', 'υ'], ['\\chi', 'χ'], ['\\psi', 'ψ'],
  // Hy Lạp (chữ hoa)
  ['\\Gamma', 'Γ'], ['\\Delta', 'Δ'], ['\\Theta', 'Θ'], ['\\Lambda', 'Λ'],
  ['\\Xi', 'Ξ'], ['\\Pi', 'Π'], ['\\Sigma', 'Σ'], ['\\Upsilon', 'Υ'],
  ['\\Phi', 'Φ'], ['\\Psi', 'Ψ'], ['\\Omega', 'Ω'],
  // Dấu & ký tự đặc biệt
  ['\\ldots', '…'], ['\\cdots', '⋯'], ['\\dots', '…'], ['\\vdots', '⋮'], ['\\ddots', '⋱'],
  ['\\langle', '⟨'], ['\\rangle', '⟩'], ['\\lfloor', '⌊'], ['\\rfloor', '⌋'],
  ['\\lceil', '⌈'], ['\\rceil', '⌉'], ['\\|', '‖'], ['\\mid', '|'],
  ['\\S', '§'], ['\\P', '¶'], ['\\copyright', '©'], ['\\dag', '†'],
];

/** Hàm toán viết bằng chữ: bỏ dấu chéo, giữ tên. */
const FUNCTIONS: ReadonlyArray<string> = [
  'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'coth',
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'log', 'ln', 'lg', 'exp', 'lim', 'limsup', 'liminf',
  'max', 'min', 'sup', 'inf', 'det', 'gcd', 'lcm', 'mod', 'bmod',
];

/** Lệnh chỉ để định dạng, bỏ hẳn khỏi đầu ra. */
const DROP = [
  'displaystyle', 'textstyle', 'scriptstyle', 'scriptscriptstyle',
  'limits', 'nolimits', 'left', 'right', 'big', 'Big', 'bigg', 'Bigg',
  'bigl', 'bigr', 'Bigl', 'Bigr', 'middle',
  'quad', 'qquad', 'enspace', 'thinspace', 'negthinspace',
  'nonumber', 'notag', 'label', 'tag',
];

const SUP_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const SUP_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '−': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ',
  'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ',
  'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ',
  'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
  '°': '°', '′': '′', '∘': '°',
};

const SUB_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '−': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ', 'l': 'ₗ',
  'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ',
  'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ',
};

/** Chuỗi toàn ký tự có bản superscript → dựng superscript; ngược lại trả null. */
const toScript = (body: string, map: Record<string, string>): string | null => {
  if (!body) return null;
  let out = '';
  for (const ch of body) {
    const mapped = map[ch] ?? map[ch.toLowerCase()];
    if (!mapped) return null;
    out += mapped;
  }
  return out;
};

/**
 * Tách đối số trong ngoặc nhọn bắt đầu tại `start` (vị trí ngay sau `{`).
 * Trả `null` nếu không cân ngoặc. Dùng đệ quy để xử lý \frac{\frac{1}{2}}{3}.
 */
const readGroup = (src: string, start: number): { body: string; end: number } | null => {
  let depth = 1;
  let i = start;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return { body: src.slice(start, i), end: i + 1 };
    }
    i += 1;
  }
  return null;
};

/** Đối số của ^ hoặc _: hoặc 1 nhóm {...}, hoặc (…), hoặc đúng 1 ký tự. */
const readScriptArg = (src: string, start: number): { body: string; end: number } | null => {
  if (start >= src.length) return null;
  if (src[start] === '{') return readGroup(src, start + 1);
  // Model hay viết x^(n+1) không có ngoặc nhọn — đọc cả cụm ngoặc tròn, nếu không
  // sẽ chỉ chuyển được ký tự "(" thành ⁽ rồi để lại "n+1)" thô.
  if (src[start] === '(') {
    let depth = 1;
    let i = start + 1;
    while (i < src.length) {
      if (src[i] === '(') depth += 1;
      else if (src[i] === ')') {
        depth -= 1;
        if (depth === 0) return { body: src.slice(start + 1, i), end: i + 1 };
      }
      i += 1;
    }
    return null;
  }
  if (src[start] === '\\') {
    // Lệnh LaTeX 1 ký tự như \, hoặc tên lệnh: lấy tới hết chữ cái.
    const m = /^\\([A-Za-z]+|.)/.exec(src.slice(start));
    return m ? { body: m[0], end: start + m[0].length } : null;
  }
  return { body: src[start], end: start + 1 };
};

/**
 * Có cần bọc ngoặc khi đặt chuỗi này làm tử/mẫu không?
 * Chỉ bọc khi có phép toán ở CẤP NGOÀI CÙNG (cộng, trừ, nhân, chia, dấu cách) —
 * nếu không thì bọc thừa: (n(u₁+uₙ))/2 khó đọc hơn n(u₁+uₙ)/2.
 * Dấu trừ đơn ở đầu (-3) là số âm, không phải phép trừ → không bọc.
 */
const needsParen = (value: string): boolean => {
  const t = value.trim();
  if (!t) return true;
  // Quét cấp ngoài cùng: bỏ qua nội dung trong (), [], {} và giữa cặp |…|.
  let depth = 0;
  let bars = 0;
  let top = '';
  for (const ch of t) {
    if ('([{'.includes(ch)) { depth += 1; top += ch; continue; }
    if (')]}'.includes(ch)) { depth -= 1; top += ch; continue; }
    if (ch === '|') { bars ^= 1; top += ch; continue; }
    if (depth === 0 && bars === 0) top += ch;
  }
  const rest = top.replace(/^\s*-/, '');
  return /[+\-·*/=,]/.test(rest) || /\s/.test(rest.trim());
};

/** Dựng phân số dạng tử/mẫu — Unicode không có ký hiệu phân số tổng quát. */
const fraction = (num: string, den: string): string => {
  const wrap = (s: string) => (needsParen(s) ? `(${s})` : s);
  return `${wrap(num)}/${wrap(den)}`;
};

/**
 * Chuyển một đoạn LaTeX (đã bỏ dấu $ / \( \) bao ngoài) sang Unicode.
 * Xử lý đệ quy phần trong ngoặc nên \frac, \sqrt lồng nhau vẫn đúng.
 */
const convertLatexBody = (input: string): string => {
  let src = input;

  // 1) Lệnh có đối số cấu trúc: xử lý trước để phần thân được chuyển đệ quy.
  for (let guard = 0; guard < 50; guard += 1) {
    const m = /\\(dfrac|tfrac|frac|cfrac)\s*\{/.exec(src);
    if (!m) break;
    const start = m.index;
    const a = readGroup(src, start + m[0].length);
    if (!a) break;
    let rest = src.slice(a.end);
    const bStart = /^\s*\{/.exec(rest);
    if (!bStart) break;
    const b = readGroup(rest, bStart[0].length);
    if (!b) break;
    const built = fraction(convertLatexBody(a.body), convertLatexBody(b.body));
    src = src.slice(0, start) + built + rest.slice(b.end);
  }

  // \sqrt[n]{x} → x^(1/n) ; \sqrt{x} → √(x)
  for (let guard = 0; guard < 50; guard += 1) {
    const m = /\\sqrt\s*\[/.exec(src);
    if (!m) break;
    const start = m.index;
    const closeIdx = src.indexOf(']', start);
    if (closeIdx === -1) break;
    const index = src.slice(start + m[0].length, closeIdx);
    const after = src.slice(closeIdx + 1);
    const brace = /^\s*\{/.exec(after);
    if (!brace) break;
    const body = readGroup(after, brace[0].length);
    if (!body) break;
    const built = `${convertLatexBody(body.body)}^(${fraction('1', convertLatexBody(index))})`;
    src = src.slice(0, start) + built + after.slice(body.end);
  }
  for (let guard = 0; guard < 50; guard += 1) {
    const m = /\\sqrt\s*\{/.exec(src);
    if (!m) break;
    const start = m.index;
    const body = readGroup(src, start + m[0].length);
    if (!body) break;
    const inner = convertLatexBody(body.body);
    // √(x+1) đọc rõ hơn √x+1 khi công thức nằm giữa câu.
    const built = /^[\p{L}\p{N}.]+$/u.test(inner) ? `√${inner}` : `√(${inner})`;
    src = src.slice(0, start) + built + src.slice(body.end);
  }

  // \text{...} / \mathrm{...} / \operatorname{...}: giữ nguyên chữ, bỏ lớp vỏ.
  for (let guard = 0; guard < 50; guard += 1) {
    const m = /\\(text|textrm|mathrm|mathbf|mathit|operatorname|mbox)\s*\{/.exec(src);
    if (!m) break;
    const body = readGroup(src, m.index + m[0].length);
    if (!body) break;
    src = src.slice(0, m.index) + body.body + src.slice(body.end);
  }

  // \overline{AB} → AB (Unicode không có gạch trên ổn định); \vec{v} → v→
  for (let guard = 0; guard < 50; guard += 1) {
    const m = /\\(overline|bar|hat|widehat|tilde|widetilde|vec|overrightarrow)\s*\{/.exec(src);
    if (!m) break;
    const body = readGroup(src, m.index + m[0].length);
    if (!body) break;
    const inner = convertLatexBody(body.body);
    const built = m[1] === 'vec' || m[1] === 'overrightarrow' ? `${inner}→` : inner;
    src = src.slice(0, m.index) + built + src.slice(body.end);
  }

  // 2) Mũ / chỉ số dưới → ký tự Unicode nếu được, không thì dùng ^( ) / _( ).
  // Dùng ký tự đánh dấu tạm cho dấu ^ vừa sinh ra, nếu không vòng lặp sau sẽ ăn lại
  // chính nó (^(1/3) → ⁽1/3) và làm hỏng công thức).
  const CARET = '\u0001';
  for (let guard = 0; guard < 50; guard += 1) {
    const m = /([\^_])\s*/.exec(src);
    if (!m) break;
    const caret = m[1];
    const argStart = m.index + m[0].length;
    const arg = readScriptArg(src, argStart);
    if (!arg) break;
    const inner = convertLatexBody(arg.body);
    const sup = caret === '^' ? toScript(inner, SUP_MAP) : toScript(inner, SUB_MAP);
    let built: string;
    if (sup) built = sup;
    // Chỉ số dưới toàn chữ/số (S_đáy, u_n) không cần ngoặc — thêm ngoặc chỉ rối mắt.
    else if (caret === '_' && /^[\p{L}\p{N}]+$/u.test(inner)) built = `_${inner}`;
    else if (caret === '^') built = inner.length === 1 ? `${CARET}${inner}` : `${CARET}(${inner})`;
    else built = inner.length === 1 ? `_${inner}` : `_(${inner})`;
    src = src.slice(0, m.index) + built + src.slice(arg.end);
  }
  src = src.split(CARET).join('^');

  // 3) Hàm toán: \sin → sin (bỏ dấu chéo, giữ tên đọc được).
  for (const fn of FUNCTIONS) src = src.split(`\\${fn}`).join(fn);

  // 4) Lệnh bỏ hẳn.
  for (const d of DROP) src = src.split(`\\${d}`).join('');

  // 5) Ký hiệu: thay theo thứ tự trong bảng (đã xếp dài trước ngắn).
  for (const [tex, uni] of SYMBOLS) src = src.split(tex).join(uni);

  // 6) Dấu cách LaTeX và ngoặc nhọn còn sót.
  src = src.replace(/\\[,;:!]/g, ' ').replace(/\\ /g, ' ');
  src = src.replace(/[{}]/g, '');

  return src;
};

/**
 * Môi trường LaTeX (cases, array, matrix): Unicode không có, phải hạ xuống dạng chữ.
 * HS lớp 11 gặp hệ phương trình/ma trận thường xuyên, để nguyên \begin{cases} là rác.
 */
const convertEnvironments = (src: string): string => {
  let out = src;
  for (let guard = 0; guard < 20; guard += 1) {
    const m = /\\begin\{(cases|array|matrix|pmatrix|bmatrix|vmatrix)\}(?:\{[^}]*\})?([\s\S]*?)\\end\{\1\}/.exec(out);
    if (!m) break;
    const kind = m[1];
    const body = m[2];
    // \\ là dấu ngăn dòng/cột trong LaTeX → tách theo đó.
    const rows = body.split(/\\\\/).map(r => r.trim()).filter(Boolean);
    let built: string;
    if (kind === 'cases' || kind === 'array') {
      // Hệ phương trình: mỗi phương trình một dòng, gắn ngoặc nhọn mở đầu khối.
      // Dùng ký tự đánh dấu tạm vì bước sau xoá sạch { } (ngoặc nhóm LaTeX).
      built = rows.map(r => convertLatexBody(r.replace(/&/g, ' '))).join('; ');
      // Dùng ký tự đánh dấu: bước sau xoá sạch { } (ngoặc nhóm LaTeX), khôi phục ở cuối.
      built = `\u0002 ${built}`;
    } else {
      // Ma trận: giữ dạng hàng, phân cách bằng " | " cho dễ đọc trên điện thoại.
      built = `[${rows.map(r => r.split('&').map(c => convertLatexBody(c.trim())).join(', ')).join('; ')}]`;
    }
    out = out.slice(0, m.index) + built + out.slice(m.index + m[0].length);
  }
  return out;
};

/**
 * Chuyển MỌI công thức LaTeX trong một đoạn văn sang Unicode, giữ nguyên phần chữ.
 * Xử lý được cả `$...$`, `$$...$$`, `\(...\)`, `\[...\]` — vì model không nhất quán.
 * Nếu văn bản không có dấu hiệu LaTeX nào thì trả lại nguyên bản (không phá câu chữ).
 */
export const latexToUnicodeMath = (text: string): string => {
  const raw = String(text ?? '');
  if (!raw) return '';
  let out = convertEnvironments(raw);

  // Display trước ($$ … $$, \[ … \]) để không bị nhầm với inline.
  out = out.replace(/\$\$([\s\S]*?)\$\$/g, (_m, body: string) => convertLatexBody(String(body).trim()));
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_m, body: string) => convertLatexBody(String(body).trim()));

  // Inline: $ … $, \( … \).
  out = out.replace(/(?<!\\)\$([^$\n]+?)(?<!\\)\$/g, (_m, body: string) => convertLatexBody(String(body)));
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_m, body: string) => convertLatexBody(String(body)));

  // Lệnh LaTeX "trần" không có dấu bao — model hay quên. Chỉ chạy khi thật sự có lệnh.
  if (/\\[A-Za-z]{2,}/.test(out)) out = convertLatexBody(out);

  return out
    .split('\u0002').join('{')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Prompt dặn model viết công thức bằng Unicode — dùng chung cho mọi prompt gửi
 * tới chat Zalo, để chuẩn hoá ở nguồn thay vì chỉ sửa hậu kỳ.
 */
export const MATH_FORMAT_RULE = [
  'CÁCH VIẾT CÔNG THỨC (bắt buộc — học sinh đọc trên Zalo, KHÔNG có bộ render LaTeX):',
  '- Viết công thức bằng ký hiệu Unicode, KHÔNG dùng LaTeX: viết a³ chứ không viết \\(a^3\\) hay $a^3$;',
  '  viết √(x+1), x₁, x₂, ≤, ≥, ≠, ±, π, ∈, ⊂, ∪, ∩, ∞, ∠, ⊥, ∥, △, °, ⇒, ⇔.',
  '- Phân số viết dạng (tử)/(mẫu) hoặc tử/mẫu nếu đơn giản: (x+1)/2, 1/2.',
  '- KHÔNG dùng \\frac, \\sqrt, \\left, \\right, ^, _ hay bất kỳ lệnh LaTeX nào.',
  '- KHÔNG dùng markdown cho công thức, không dùng $$ hay \\[ \\].',
].join('\n');


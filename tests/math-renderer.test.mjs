import test from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import { tokenizeMath, renderMath } from '../public/math-renderer.js';
import { student } from '../public/mode-classroom.js';

test('SignalMath is attached to globalThis on module import', () => {
  assert.ok(globalThis.SignalMath, 'globalThis.SignalMath should be defined');
  assert.equal(typeof globalThis.SignalMath.tokenizeMath, 'function');
  assert.equal(typeof globalThis.SignalMath.renderMath, 'function');
});

test('tokenizeMath parses plain text with no math', () => {
  const tokens = tokenizeMath('Chào mừng bạn đến với Mật Mã Đa Giới!');
  assert.deepEqual(tokens, [
    { type: 'text', text: 'Chào mừng bạn đến với Mật Mã Đa Giới!' }
  ]);
});

test('tokenizeMath handles empty, null or undefined input', () => {
  assert.deepEqual(tokenizeMath(''), []);
  assert.deepEqual(tokenizeMath(null), []);
  assert.deepEqual(tokenizeMath(undefined), []);
});

test('tokenizeMath recognizes inline dollar delimiters ($...$)', () => {
  const tokens = tokenizeMath('Giá trị là $x + 1$ nhé');
  assert.equal(tokens.length, 3);
  assert.deepEqual(tokens[0], { type: 'text', text: 'Giá trị là ' });
  assert.deepEqual(tokens[1], { type: 'math', text: 'x + 1', display: false });
  assert.deepEqual(tokens[2], { type: 'text', text: ' nhé' });
});

test('tokenizeMath recognizes double dollar display delimiters ($$...$$)', () => {
  const tokens = tokenizeMath('Phương trình: $$x^2 + y^2 = r^2$$ xong.');
  assert.equal(tokens.length, 3);
  assert.deepEqual(tokens[0], { type: 'text', text: 'Phương trình: ' });
  assert.deepEqual(tokens[1], { type: 'math', text: 'x^2 + y^2 = r^2', display: true });
  assert.deepEqual(tokens[2], { type: 'text', text: ' xong.' });
});

test('tokenizeMath recognizes slash-parenthesis inline delimiters (\\(...\\))', () => {
  const tokens = tokenizeMath('Cho hàm số \\(f(x) = \\sin(x)\\) liên tục');
  assert.equal(tokens.length, 3);
  assert.deepEqual(tokens[0], { type: 'text', text: 'Cho hàm số ' });
  assert.deepEqual(tokens[1], { type: 'math', text: 'f(x) = \\sin(x)', display: false });
  assert.deepEqual(tokens[2], { type: 'text', text: ' liên tục' });
});

test('tokenizeMath recognizes slash-bracket display delimiters (\\[...\\])', () => {
  const tokens = tokenizeMath('Tích phân:\n\\[\\int_0^1 x\\,dx = \\frac{1}{2}\\]\náp dụng.');
  assert.equal(tokens.length, 3);
  assert.deepEqual(tokens[0], { type: 'text', text: 'Tích phân:\n' });
  assert.deepEqual(tokens[1], { type: 'math', text: '\\int_0^1 x\\,dx = \\frac{1}{2}', display: true });
  assert.deepEqual(tokens[2], { type: 'text', text: '\náp dụng.' });
});

test('tokenizeMath preserves math commands, backslashes, braces, subscripts and systems', () => {
  const system = '\\begin{cases} a_1 x + b_1 y = c_1 \\\\ a_2 x + b_2 y = c_2 \\end{cases}';
  const raw = `Hệ: $${system}$ kết thúc.`;
  const tokens = tokenizeMath(raw);
  assert.equal(tokens.length, 3);
  assert.equal(tokens[1].type, 'math');
  assert.equal(tokens[1].text, system);
  assert.equal(tokens[1].display, false);
});

test('tokenizeMath honors escaped dollars (\\$) without treating them as delimiters', () => {
  const text = 'Giá vé là \\$50 và \\$100, công thức là $x = \\$5$.';
  const tokens = tokenizeMath(text);
  assert.equal(tokens.length, 3);
  assert.equal(tokens[0].type, 'text');
  assert.match(tokens[0].text, /\$50/);
  assert.equal(tokens[1].type, 'math');
  assert.equal(tokens[1].text, 'x = \\$5');
  assert.equal(tokens[2].type, 'text');
});

test('tokenizeMath supports multiline math and mixed delimiters in one text', () => {
  const multiline = `Bắt đầu:
$$
\\sum_{i=1}^n i = \\frac{n(n+1)}{2}
$$
Tiếp theo inline $a_k$ và \\(b_k\\), cuối cùng:
\\[
\\lim_{n \\to \\infty} \\frac{1}{n} = 0
\\]`;
  const tokens = tokenizeMath(multiline);
  const mathTokens = tokens.filter(t => t.type === 'math');
  assert.equal(mathTokens.length, 4);
  assert.equal(mathTokens[0].display, true);
  assert.equal(mathTokens[1].display, false);
  assert.equal(mathTokens[2].display, false);
  assert.equal(mathTokens[3].display, true);
});

test('tokenizeMath identifies unclosed and malformed delimiters with error flag', () => {
  const unclosedDollar = tokenizeMath('Lỗi $x^2 + 1 chưa đóng');
  const errToken = unclosedDollar.find(t => t.error);
  assert.ok(errToken, 'Should flag error for unclosed dollar delimiter');
  assert.equal(errToken.type, 'math');

  const unclosedParen = tokenizeMath('Lỗi \\(x + y');
  assert.ok(unclosedParen.some(t => t.error));

  const unclosedBracket = tokenizeMath('Lỗi \\[x + y');
  assert.ok(unclosedBracket.some(t => t.error));

  const unclosedDouble = tokenizeMath('Lỗi $$x + y');
  assert.ok(unclosedDouble.some(t => t.error));
});

test('renderMath produces safe HTML with real KaTeX and htmlAndMathml output', () => {
  const html = renderMath('Công thức $x^2 + y^2 = z^2$ hiển thị.', katex);
  assert.match(html, /<span class="katex">/);
  assert.match(html, /<math/);
  assert.match(html, /x\^2/);
  assert.match(html, /Công thức /);
});
test('standard textbook notation renders accessible MathML without syntax errors',()=>{
 const formulas=[String.raw`\dfrac{a+b}{c}`,String.raw`\sqrt{x^2+1}`,String.raw`x^{n+1}+u_{n-1}`,String.raw`\overrightarrow{AB}`,String.raw`\int_0^1 x^2\,dx`,String.raw`\sin x+\cos x+\tan x`,String.raw`\begin{pmatrix}1&2\\3&4\end{pmatrix}`,String.raw`\begin{cases}x+y=3\\x-y=1\end{cases}`,String.raw`\begin{aligned}u_n&=2n+1\\u_3&=7\end{aligned}`,String.raw`\begin{gathered}a=b\\b=c\end{gathered}`];
 for(const formula of formulas){const html=renderMath(`$$${formula}$$`,katex);assert.match(html,/katex-display/);assert.match(html,/<math[^>]*display="block"/);assert.doesNotMatch(html,/math-error/);}
});

test('renderMath escapes text HTML to prevent XSS payloads', () => {
  const payload = '<script>alert("xss")</script><img src=x onerror=alert(1)> $x = 1$ <b>bold</b>';
  const html = renderMath(payload, katex);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<img /);
  assert.doesNotMatch(html, /<b>bold<\/b>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img /);
  assert.match(html, /&lt;b&gt;bold&lt;\/b&gt;/);
  assert.match(html, /<span class="katex">/);
});

test('renderMath enforces KaTeX trust:false to reject link injection payloads', () => {
  const payload = '$\\href{javascript:alert(1)}{click}$';
  // With trust:false, KaTeX rejects the untrusted link command without creating an anchor or href
  const html = renderMath(payload, katex);
  assert.doesNotMatch(html, /<a\s/i);
  assert.doesNotMatch(html, /href=/i);
});

test('renderMath handles KaTeX syntax errors gracefully with accessible escaped math-error span', () => {
  // Invalid LaTeX syntax: \frac missing arguments
  const invalid = 'Phương trình $\\frac{}$ bị lỗi';
  const html = renderMath(invalid, katex);
  assert.match(html, /math-error/);
  assert.match(html, /role="alert"/);
  assert.match(html, /\\frac\{\}/);
  assert.doesNotMatch(html, /<script/);
});

test('renderMath renders accessible math-error span for unclosed delimiter', () => {
  const unclosed = 'Dữ liệu $x < 5 và y > 2 chưa đóng';
  const html = renderMath(unclosed, katex);
  assert.match(html, /math-error/);
  assert.match(html, /role="alert"/);
  // Escapes raw error source
  assert.match(html, /&lt; 5/);
  assert.match(html, /&gt; 2/);
  assert.doesNotMatch(html, /< 5/);
});

test('renderMath safely recovers when KaTeX renderer is missing/null', () => {
  const html = renderMath('Công thức $x + y = 1$ với \\(z = 2\\)', null);
  assert.doesNotMatch(html, /<span class="katex">/);
  // Escapes content safely without throwing
  assert.match(html, /x \+ y = 1/);
});

test('student MCQ options render through math helper with actual option strings', () => {
  const receivedOptions = [];
  const mockMath = (text) => {
    receivedOptions.push(text);
    return `<span class="rendered-math">${text}</span>`;
  };
  const m = {
    rule: 'merchant',
    participation: 'individual',
    gameNow: 1000,
    deadline: 50000,
    finished: false,
    paused: false,
    unitId: 'u1',
    units: [{ id: 'u1', faction: 1, controller: 'l1', outcome: 'active', late: false, members: [{ id: 'l1', name: 'Thí sinh' }] }],
    players: { u1: { coins: 10, ore: 2, wood: 1, contracts: 1, correct: 2 } },
    ranking: [{ unitId: 'u1', rank: 1, values: [1, 2] }],
    challenge: {
      id: 'c1',
      format: 'mcq',
      prompt: 'Tìm nghiệm của $x^2 - 4 = 0$',
      options: ['$x = \\pm 2$', '$x = 2$', '$x = -2$', '$x = 0$'],
      used: false
    }
  };

  const html = student(m, { mathText: mockMath });

  // Verify each option was passed to mathText
  assert.deepEqual(receivedOptions, [
    '$x = \\pm 2$',
    '$x = 2$',
    '$x = -2$',
    '$x = 0$',
    'Tìm nghiệm của $x^2 - 4 = 0$'
  ]);

  // Verify the rendered math spans appear in the output
  assert.match(html, /class="rendered-math">\$x = \\pm 2\$/);
  assert.match(html, /class="rendered-math">\$x = 0\$/);
  assert.match(html, /name="mode-answer-option"/);
});

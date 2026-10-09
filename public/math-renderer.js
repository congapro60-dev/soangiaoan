/**
 * Signal Station shared math renderer
 * Tokenizes and renders math formulas using KaTeX while preserving safe HTML escaping,
 * accessible math-error containers, and legacy global script interoperability.
 */

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ESCAPE_MAP[c] || c);
}

function countPrecedingBackslashes(str, index) {
  let count = 0;
  for (let i = index - 1; i >= 0 && str[i] === '\\'; i--) {
    count++;
  }
  return count;
}

/**
 * Tokenize a text string into plain text and math tokens.
 * Supports:
 * - Inline dollar: $...$
 * - Double dollar display: $$...$$
 * - Slash-parenthesis: \(...\)
 * - Slash-bracket: \[...\]
 * - Escaped dollars: \$ in text
 *
 * @param {string} text
 * @returns {Array<{type: 'text' | 'math', text: string, display?: boolean, error?: boolean | string}>}
 */
export function tokenizeMath(text) {
  if (text == null) return [];
  const str = String(text);
  if (str.length === 0) return [];

  const tokens = [];
  let currentText = '';
  let i = 0;
  const len = str.length;

  while (i < len) {
    // 1. Check slash-based delimiters and escaped dollars starting at i
    if (str[i] === '\\') {
      const bsBefore = countPrecedingBackslashes(str, i);
      if (bsBefore % 2 === 0) {
        // Unescaped backslash at i
        // Check \( (inline math)
        if (str.startsWith('\\(', i)) {
          if (currentText.length > 0) {
            tokens.push({ type: 'text', text: currentText });
            currentText = '';
          }
          const start = i + 2;
          let closeIdx = -1;
          for (let j = start; j < len; j++) {
            if (str.startsWith('\\)', j) && countPrecedingBackslashes(str, j) % 2 === 0) {
              closeIdx = j;
              break;
            }
          }
          if (closeIdx !== -1) {
            tokens.push({
              type: 'math',
              text: str.slice(start, closeIdx),
              display: false
            });
            i = closeIdx + 2;
            continue;
          } else {
            // Unclosed \(
            tokens.push({
              type: 'math',
              text: str.slice(i),
              display: false,
              error: true
            });
            i = len;
            continue;
          }
        }

        // Check \[ (display math)
        if (str.startsWith('\\[', i)) {
          if (currentText.length > 0) {
            tokens.push({ type: 'text', text: currentText });
            currentText = '';
          }
          const start = i + 2;
          let closeIdx = -1;
          for (let j = start; j < len; j++) {
            if (str.startsWith('\\]', j) && countPrecedingBackslashes(str, j) % 2 === 0) {
              closeIdx = j;
              break;
            }
          }
          if (closeIdx !== -1) {
            tokens.push({
              type: 'math',
              text: str.slice(start, closeIdx),
              display: true
            });
            i = closeIdx + 2;
            continue;
          } else {
            // Unclosed \[
            tokens.push({
              type: 'math',
              text: str.slice(i),
              display: true,
              error: true
            });
            i = len;
            continue;
          }
        }

        // Check \$ (escaped dollar in text)
        if (str.startsWith('\\$', i)) {
          currentText += '$';
          i += 2;
          continue;
        }
      }

      // Normal backslash
      currentText += str[i];
      i += 1;
      continue;
    }

    // 2. Check dollar-based delimiters starting at i
    if (str[i] === '$') {
      const bsBefore = countPrecedingBackslashes(str, i);
      if (bsBefore % 2 === 0) {
        // Unescaped dollar
        // Check $$ (display math)
        if (str.startsWith('$$', i)) {
          if (currentText.length > 0) {
            tokens.push({ type: 'text', text: currentText });
            currentText = '';
          }
          const start = i + 2;
          let closeIdx = -1;
          for (let j = start; j < len; j++) {
            if (str.startsWith('$$', j) && countPrecedingBackslashes(str, j) % 2 === 0) {
              closeIdx = j;
              break;
            }
          }
          if (closeIdx !== -1) {
            tokens.push({
              type: 'math',
              text: str.slice(start, closeIdx),
              display: true
            });
            i = closeIdx + 2;
            continue;
          } else {
            // Unclosed $$
            tokens.push({
              type: 'math',
              text: str.slice(i),
              display: true,
              error: true
            });
            i = len;
            continue;
          }
        }

        // Single $ (inline math)
        if (currentText.length > 0) {
          tokens.push({ type: 'text', text: currentText });
          currentText = '';
        }
        const start = i + 1;
        let closeIdx = -1;
        for (let j = start; j < len; j++) {
          if (str[j] === '$' && countPrecedingBackslashes(str, j) % 2 === 0) {
            closeIdx = j;
            break;
          }
        }
        if (closeIdx !== -1) {
          tokens.push({
            type: 'math',
            text: str.slice(start, closeIdx),
            display: false
          });
          i = closeIdx + 1;
          continue;
        } else {
          // Unclosed single $
          tokens.push({
            type: 'math',
            text: str.slice(i),
            display: false,
            error: true
          });
          i = len;
          continue;
        }
      }
    }

    // Normal character
    currentText += str[i];
    i += 1;
  }

  if (currentText.length > 0) {
    tokens.push({ type: 'text', text: currentText });
  }

  return tokens;
}

/**
 * Render text containing math delimiters into safe HTML.
 * Escapes literal text, preserves math expressions and commands, and catches KaTeX parse errors.
 *
 * @param {string} text
 * @param {object} [renderer=globalThis.katex]
 * @returns {string} Safe HTML string
 */
export function renderMath(text, renderer = (typeof globalThis !== 'undefined' ? globalThis.katex : undefined)) {
  if (text == null || text === '') return '';
  const tokens = tokenizeMath(text);
  const parts = [];

  for (const token of tokens) {
    if (token.type === 'text') {
      parts.push(escapeHtml(token.text));
      continue;
    }

    if (token.type === 'math') {
      // Delimiter error (e.g. unclosed delimiter)
      if (token.error) {
        parts.push(`<span class="math-error" role="alert">${escapeHtml(token.text)}</span>`);
        continue;
      }

      // KaTeX renderer absent
      if (!renderer || typeof renderer.renderToString !== 'function') {
        parts.push(escapeHtml(token.text));
        continue;
      }

      // Render math via KaTeX
      try {
        const rendered = renderer.renderToString(token.text, {
          throwOnError: true,
          trust: false,
          output: 'htmlAndMathml',
          displayMode: Boolean(token.display)
        });
        parts.push(rendered);
      } catch (err) {
        parts.push(`<span class="math-error" role="alert" title="${escapeHtml(err?.message || 'Math error')}">${escapeHtml(token.text)}</span>`);
      }
    }
  }

  return parts.join('');
}

const SignalMath = {
  tokenizeMath,
  renderMath
};

if (typeof globalThis !== 'undefined') {
  globalThis.SignalMath = SignalMath;
}
if (typeof window !== 'undefined') {
  window.SignalMath = SignalMath;
}

export default SignalMath;

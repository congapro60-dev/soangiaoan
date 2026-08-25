/**
 * Parse JSON từ phản hồi AI, chịu được backslash LaTeX thô.
 *
 * Nội dung Toán (\cos, \sqrt, \left, \begin...) khi AI nhét vào chuỗi JSON
 * thường là escape không hợp lệ hoặc bị JSON.parse hiểu nhầm thành escape hợp lệ.
 * Scanner có trạng thái sẽ nhận diện lệnh LaTeX đã biết trong string trước khi
 * parse strict, rồi sửa escape mà không đụng tới cấu trúc JSON.
 */

export type JsonParseMode = 'strict' | 'repaired';

export type JsonRepairKind =
  | 'latex_backslash'
  | 'invalid_unicode_escape'
  | 'control_character';

export interface JsonRecoveryResult<T> {
  value: T;
  parseMode: JsonParseMode;
  repairKinds: JsonRepairKind[];
}

export class JsonRecoveryError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'JsonRecoveryError';
    this.cause = cause;
  }
}

const JSON_STRING_ESCAPES = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't']);

const KNOWN_LATEX_COMMANDS = new Set([
  // Existing parser coverage and the overlapping JSON escape cases.
  'begin', 'end', 'frac', 'dfrac', 'tfrac', 'sqrt', 'text',
  'cos', 'left', 'right', 'nabla', 'int', 'in', 'subset', 'Rightarrow',
  // Common math commands already emitted by the app's prompts and exporters.
  'alpha', 'beta', 'gamma', 'delta', 'Delta', 'epsilon', 'theta', 'Theta',
  'lambda', 'Lambda', 'mu', 'nu', 'pi', 'Pi', 'rho', 'sigma', 'Sigma',
  'phi', 'Phi', 'psi', 'Psi', 'omega', 'Omega', 'xi', 'Xi', 'infty', 'partial',
  'sin', 'tan', 'cot', 'sec', 'csc', 'ln', 'log', 'exp', 'lim', 'max', 'min',
  'sum', 'prod', 'iint', 'iiint', 'oint', 'pm', 'mp', 'times', 'cdot', 'div',
  'le', 'leq', 'ge', 'geq', 'neq', 'approx', 'equiv', 'sim', 'propto',
  'notin', 'supset', 'supseteq', 'subseteq', 'cap', 'cup', 'setminus', 'emptyset',
  'to', 'rightarrow', 'leftarrow', 'leftrightarrow', 'Leftarrow',
  'Leftrightarrow', 'mapsto', 'uparrow', 'downarrow', 'updownarrow',
  'vec', 'hat', 'bar', 'dot', 'ddot', 'overline', 'underline', 'underbar',
  'underbrace', 'overbrace', 'overset', 'underset', 'mathrm', 'mathbf', 'mathbb',
  'mathcal', 'mathit', 'textbf', 'textit', 'operatorname', 'displaystyle',
  'quad', 'qquad', 'cases', 'matrix', 'pmatrix', 'bmatrix', 'Bmatrix',
  'vmatrix', 'Vmatrix', 'array', 'binom',
  // Commands retained from the previous U-prefixed allowlist and TikZ payloads.
  'url', 'unit', 'usepackage', 'documentclass', 'definecolor', 'includegraphics',
  'textwidth', 'hline', 'longtable', 'item', 'itemize', 'enumerate',
  'draw', 'fill', 'clip', 'coordinate', 'node', 'foreach', 'useasboundingbox',
  'pgfplotsset', 'addplot', 'tikzpicture',
]);

const KNOWN_LATEX_SYMBOL_COMMANDS = new Set([
  ' ',
  '!',
  '#',
  '$',
  '%',
  '&',
  ',',
  ';',
  ':',
  '_',
  '^',
  '{',
  '}',
  '~',
]);

const isHexDigit = (character: string | undefined): boolean =>
  character !== undefined && /^[0-9A-Fa-f]$/.test(character);

const latexCommandToken = (raw: string, slashIndex: number): string | undefined =>
  raw.slice(slashIndex + 1).match(/^[A-Za-z]+/)?.[0];

const startsKnownLatexCommand = (raw: string, slashIndex: number): boolean => {
  const command = latexCommandToken(raw, slashIndex);
  if (command !== undefined) {
    return KNOWN_LATEX_COMMANDS.has(command);
  }

  const symbol = raw[slashIndex + 1];
  return symbol !== undefined && KNOWN_LATEX_SYMBOL_COMMANDS.has(symbol);
};

const containsKnownLatexCommand = (raw: string): boolean => {
  let inString = false;
  let escaped = false;

  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];

    if (!inString) {
      if (character === '"') {
        inString = true;
      }
      continue;
    }

    if (escaped) {
      if (startsKnownLatexCommand(raw, index - 1)) {
        return true;
      }
      escaped = false;
      continue;
    }

    if (character === '"') {
      inString = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
    }
  }

  return false;
};

const addRepairKind = (
  repairKinds: JsonRepairKind[],
  repairKind: JsonRepairKind,
): void => {
  if (!repairKinds.includes(repairKind)) {
    repairKinds.push(repairKind);
  }
};

export function parseJsonWithRecovery<T = unknown>(raw: string): JsonRecoveryResult<T> {
  if (!containsKnownLatexCommand(raw)) {
    try {
      return {
        value: JSON.parse(raw) as T,
        parseMode: 'strict',
        repairKinds: [],
      };
    } catch {
      // Continue with the deterministic, string-aware recovery pass below.
    }
  }

  let inString = false;
  let escaped = false;
  const repaired: string[] = [];
  const repairKinds: JsonRepairKind[] = [];

  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];

    if (!inString) {
      repaired.push(character);
      if (character === '"') {
        inString = true;
      }
      continue;
    }

    if (escaped) {
      if (character === '\r' || character === '\n' || character === '\t') {
        repaired.push('\\\\');
        repaired.push(character === '\r' ? '\\r' : character === '\n' ? '\\n' : '\\t');
        addRepairKind(repairKinds, 'control_character');
        escaped = false;
        continue;
      }

      if (startsKnownLatexCommand(raw, index - 1)) {
        repaired.push('\\\\' + character);
        addRepairKind(repairKinds, 'latex_backslash');
        escaped = false;
        continue;
      }

      if (character === 'u') {
        const unicodeDigits = raw.slice(index + 1, index + 5);
        if (
          unicodeDigits.length === 4
          && [...unicodeDigits].every((digit) => isHexDigit(digit))
        ) {
          repaired.push('\\u' + unicodeDigits);
          index += 4;
          escaped = false;
          continue;
        }

        repaired.push('\\\\u');
        addRepairKind(repairKinds, 'invalid_unicode_escape');
        escaped = false;
        continue;
      }

      if (JSON_STRING_ESCAPES.has(character)) {
        repaired.push('\\' + character);
        escaped = false;
        continue;
      }

      throw new JsonRecoveryError('Escape JSON chưa được nhận diện');
    }

    if (character === '"') {
      repaired.push(character);
      inString = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (character === '\r' || character === '\n' || character === '\t') {
      repaired.push(character === '\r' ? '\\r' : character === '\n' ? '\\n' : '\\t');
      addRepairKind(repairKinds, 'control_character');
      continue;
    }

    repaired.push(character);
  }

  if (escaped) {
    throw new JsonRecoveryError('JSON kết thúc bằng backslash escape chưa hoàn chỉnh');
  }

  try {
    return {
      value: JSON.parse(repaired.join('')) as T,
      parseMode: 'repaired',
      repairKinds,
    };
  } catch (cause) {
    throw new JsonRecoveryError('JSON không hợp lệ sau khi phục hồi escape', cause);
  }
}

/** Compatibility wrapper for callers that only need the parsed value. */
export const parseLooseJson = <T = any>(jsonStr: string): T => {
  try {
    return parseJsonWithRecovery<T>(jsonStr).value;
  } catch {
    const repaired = jsonStr.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
    return JSON.parse(repaired) as T;
  }
};

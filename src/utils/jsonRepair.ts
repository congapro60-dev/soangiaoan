/**
 * Parse JSON từ phản hồi AI, chịu được backslash LaTeX thô.
 *
 * Nội dung Toán (\cos, \sqrt, \left, \begin...) khi AI nhét vào chuỗi JSON
 * thường là escape không hợp lệ → JSON.parse ném lỗi. Hàm này thử parse thẳng trước;
 * chỉ khi thất bại mới chạy scanner có trạng thái để sửa escape trong string mà không
 * đụng tới cấu trúc JSON.
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

const LATEX_COMMANDS_STARTING_WITH_U = new Set([
  'underbrace',
  'underline',
  'underbar',
  'uparrow',
  'updownarrow',
  'downarrow',
  'usepackage',
  'url',
  'unit',
]);

const isHexDigit = (character: string | undefined): boolean =>
  character !== undefined && /^[0-9A-Fa-f]$/.test(character);

const isAsciiLetter = (character: string | undefined): boolean =>
  character !== undefined && /^[A-Za-z]$/.test(character);

const startsLatexCommand = (raw: string, slashIndex: number): boolean => {
  const command = raw.slice(slashIndex + 1).match(/^[A-Za-z]+/)?.[0];
  if (!command) {
    return false;
  }

  if (command[0] === 'u') {
    return LATEX_COMMANDS_STARTING_WITH_U.has(command);
  }

  return true;
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
  try {
    return {
      value: JSON.parse(raw) as T,
      parseMode: 'strict',
      repairKinds: [],
    };
  } catch {
    // Continue with the deterministic, string-aware recovery pass below.
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

      if (JSON_STRING_ESCAPES.has(character)) {
        repaired.push('\\' + character);
        escaped = false;
        continue;
      }

      if (character === 'u' && !startsLatexCommand(raw, index - 1)) {
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

      if (isAsciiLetter(character) || startsLatexCommand(raw, index - 1)) {
        repaired.push('\\\\' + character);
        addRepairKind(repairKinds, 'latex_backslash');
        escaped = false;
        continue;
      }

      repaired.push('\\\\' + character);
      addRepairKind(repairKinds, 'latex_backslash');
      escaped = false;
      continue;
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
    repaired.push('\\\\');
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
export const parseLooseJson = <T = any>(jsonStr: string): T =>
  parseJsonWithRecovery<T>(jsonStr).value;

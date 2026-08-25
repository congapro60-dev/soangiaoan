import { describe, it, expect } from 'vitest';
import { parseJsonWithRecovery, parseLooseJson } from './jsonRepair';

const expectNamedError = (run: () => unknown, expectedName: string) => {
  let thrown: unknown;
  try {
    run();
  } catch (error) {
    thrown = error;
  }

  const actualName = thrown && typeof thrown === 'object'
    ? (thrown as { name?: unknown }).name
    : undefined;
  expect(actualName).toBe(expectedName);
};

describe('parseLooseJson', () => {
  it('parse JSON hợp lệ như bình thường', () => {
    expect(parseLooseJson('{"score": 8.5, "ok": true}')).toEqual({ score: 8.5, ok: true });
  });

  it('cứu được LaTeX backslash làm hỏng escape JSON (\\cos, \\sqrt)', () => {
    const raw = '{"details": "Dùng $\\cos x$ và $\\sqrt{2}$ để tính"}';
    // JSON.parse thẳng sẽ ném lỗi vì \c không phải escape hợp lệ
    expect(() => JSON.parse(raw)).toThrow();
    const parsed = parseLooseJson<{ details: string }>(raw);
    expect(parsed.details).toBe('Dùng $\\cos x$ và $\\sqrt{2}$ để tính');
  });

  it('giữ nguyên chuỗi thoát JSON hợp lệ (\\n, \\t, \\")', () => {
    const parsed = parseLooseJson<{ t: string }>('{"t": "dòng1\\ndòng2\\t\\"trích\\""}');
    expect(parsed.t).toBe('dòng1\ndòng2\t"trích"');
  });

  it('parse mảng câu hỏi có công thức LaTeX', () => {
    const raw = '[{"id":"q1","content":"Tính $\\int_0^1 x\\,dx$","points":1}]';
    const parsed = parseLooseJson<Array<{ content: string }>>(raw);
    expect(parsed[0].content).toContain('\\int');
  });
});

describe('parseJsonWithRecovery — strict/recovery contract', () => {
  it('trả metadata flat strict và không ghi nhận repair khi JSON hợp lệ', () => {
    const result = parseJsonWithRecovery<{ score: number }>('{"score":8}');

    expect(result.value).toEqual({ score: 8 });
    expect(result.parseMode).toBe('strict');
    expect(result.repairKinds).toEqual([]);
  });

  it('chỉ repair backslash LaTeX trong string, giữ nguyên cấu trúc JSON', () => {
    const raw = '{"answer":"D \\in SA \\subset (SAB) \\Rightarrow D \\in (SAB)","score":8,"nested":{"ok":true}}';

    const result = parseJsonWithRecovery<{
      answer: string;
      score: number;
      nested: { ok: boolean };
    }>(raw);

    expect(result.value).toEqual({
      answer: 'D \\in SA \\subset (SAB) \\Rightarrow D \\in (SAB)',
      score: 8,
      nested: { ok: true },
    });
    expect(result.parseMode).toBe('repaired');
    expect(result.repairKinds).toContain('latex_backslash');
  });

  it.each([
    ['frac', String.raw`{"text":"\frac{x}{y}"}`, '\\frac{x}{y}'],
    ['text', String.raw`{"text":"\text{hello}"}`, '\\text{hello}'],
    ['begin', String.raw`{"text":"\begin{aligned}"}`, '\\begin{aligned}'],
    ['nabla', String.raw`{"text":"\nabla f"}`, '\\nabla f'],
    ['right', String.raw`{"text":"x\right)"}`, 'x\\right)'],
  ])('repair known LaTeX command that overlaps JSON escape: \\%s', (_command, raw, expected) => {
    const result = parseJsonWithRecovery<{ text: string }>(raw);

    expect(result.value.text).toBe(expected);
    expect(result.parseMode).toBe('repaired');
    expect(result.repairKinds).toEqual(['latex_backslash']);
  });

  it('giữ escape JSON hợp lệ khi chuỗi không phải lệnh LaTeX đã biết', () => {
    const raw = String.raw`{"text":"\foo"}`;

    const result = parseJsonWithRecovery<{ text: string }>(raw);

    expect(result.value.text).toBe(String.fromCharCode(12) + 'oo');
    expect(result.parseMode).toBe('strict');
    expect(result.repairKinds).toEqual([]);
  });

  it('repair invalid Unicode escape và ghi nhận đúng loại repair', () => {
    const result = parseJsonWithRecovery<{ text: string }>(String.raw`{"text":"\u12G4"}`);

    expect(result.value.text).toBe(String.raw`\u12G4`);
    expect(result.parseMode).toBe('repaired');
    expect(result.repairKinds).toEqual(['invalid_unicode_escape']);
  });

  it('repair invalid Unicode escape khi ký tự đầu tiên không phải hex', () => {
    const result = parseJsonWithRecovery<{ text: string }>(String.raw`{"text":"\uZZZZ"}`);

    expect(result.value.text).toBe(String.raw`\uZZZZ`);
    expect(result.parseMode).toBe('repaired');
    expect(result.repairKinds).toEqual(['invalid_unicode_escape']);
  });

  it.each([
    ['letter', String.raw`{"text":"\q"}`],
    ['question mark', String.raw`{"text":"\?"}`],
    ['digit', String.raw`{"text":"\8"}`],
  ])('reject unknown invalid escape: \\%s', (_kind, raw) => {
    expectNamedError(() => parseJsonWithRecovery(raw), 'JsonRecoveryError');
  });

  it('giữ nguyên các escape JSON hợp lệ gồm newline, tab, quote, slash và unicode', () => {
    const result = parseJsonWithRecovery<{ text: string }>(
      String.raw`{"text":"dòng1\ndòng2\t\"trích\" \/ \u00E1"}`,
    );

    expect(result.value.text).toBe('dòng1\ndòng2\t"trích" / á');
    expect(result.parseMode).toBe('strict');
  });

  it('escape raw control newline trong string', () => {
    const rawControlNewline = '{"text":"dòng1' + String.fromCharCode(10) + 'dòng2"}';

    const result = parseJsonWithRecovery<{ text: string }>(rawControlNewline);

    expect(result.value.text).toBe('dòng1\ndòng2');
    expect(result.parseMode).toBe('repaired');
  });

  it('ném JsonRecoveryError khi thiếu quote hoặc object bị cắt', () => {
    expectNamedError(() => parseJsonWithRecovery('{"text":"thiếu quote}'), 'JsonRecoveryError');
    expectNamedError(() => parseJsonWithRecovery('{"score":8'), 'JsonRecoveryError');
  });
});

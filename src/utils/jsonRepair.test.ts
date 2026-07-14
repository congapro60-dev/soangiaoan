import { describe, it, expect } from 'vitest';
import { parseLooseJson } from './jsonRepair';

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

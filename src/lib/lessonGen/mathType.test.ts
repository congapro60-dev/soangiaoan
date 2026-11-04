import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { CFB } from 'xlsx';
import { beforeAll, describe, expect, it } from 'vitest';
import { decodeMathTypeEquation } from './mathType';

const objects = new Map<number, Uint8Array>();
beforeAll(async () => {
  const source = readFileSync('docs/source-specs/v88/ban-toan-template/THT_G11_Gioi_han_cua_day_so.docx');
  expect(createHash('sha256').update(source).digest('hex')).toBe('051f6f7c16359dbc81e6bec020fa2cac480a0c8b97699c309904b318e52b9e61');
  const zip = await JSZip.loadAsync(source);
  for (const [name, file] of Object.entries(zip.files)) {
    const match = /^word\/embeddings\/oleObject(\d+)\.bin$/.exec(name);
    if (match) objects.set(Number(match[1]), await file.async('uint8array'));
  }
  expect(objects.size).toBe(63);
});

describe('actual MathType v5 source', () => {
  it.each([
    [1, 'u_{n}=2+\\frac{1}{n}'],
    [2, 'u_{n}'],
    [3, '\\lim_{n\\to +\\infty }u_{n}'],
    [4, '\\left(u_{n}\\right)'],
    [17, '\\lim_{n\\to +\\infty }\\left(\\sqrt{n^{2}+2n}-n\\right)'],
    [19, '\\lim_{n\\to +\\infty }\\frac{4n-3}{n^{2}-5n+1}'],
    [20, '\\lim_{n\\to +\\infty }\\frac{n^{2}+n+1}{2n^{2}+1}'],
    [21, '\\lim_{n\\to +\\infty }\\frac{\\frac{3}{n}-\\frac{1}{n^{3}}}{5+\\frac{2}{n^{2}}}'],
    [42, '\\lim_{n\\to +\\infty }\\left[4\\left(2+\\frac{1}{n}\\right)\\right]'],
    [63, '\\lim_{n\\to +\\infty }\\frac{n-1}{3n+2}'],
  ])('preserves oleObject%i.bin', (id, latex) => {
    expect(decodeMathTypeEquation(objects.get(id as number)!)).toBe(latex);
  });

  it('inventories recovery without losing object identity', () => {
    const recovered: { object: string; latex: string }[] = [];
    const unsupported: { object: string; error: string }[] = [];
    for (const [id, bytes] of [...objects].sort(([a], [b]) => a - b)) {
      const object = `word/embeddings/oleObject${id}.bin`;
      try { recovered.push({ object, latex: decodeMathTypeEquation(bytes) }); }
      catch (error) { unsupported.push({ object, error: String(error) }); }
    }
    console.log(JSON.stringify({ recovered, unsupported }, null, 2));
    expect(unsupported).toEqual([]);
    expect(recovered).toHaveLength(63);
    expect(recovered.every(({ latex }) => latex.length > 0)).toBe(true);
  });

  it('rejects invalid CFB and missing Equation Native', () => {
    expect(() => decodeMathTypeEquation(new Uint8Array())).toThrow(/malformed/i);
    const cfb = CFB.utils.cfb_new();
    expect(() => decodeMathTypeEquation(new Uint8Array(CFB.write(cfb, { type: 'array' })))).toThrow(/Equation Native/);
  });

  it('rejects truncated, unsupported and deeply nested MTEF', () => {
    const cfb = CFB.read(objects.get(2)!, { type: 'array' });
    const original = new Uint8Array(CFB.find(cfb, 'Equation Native')!.content);
    const wrap = (native: Uint8Array) => {
      const container = CFB.utils.cfb_new();
      CFB.utils.cfb_add(container, 'Equation Native', native);
      return new Uint8Array(CFB.write(container, { type: 'array' }));
    };
    for (const length of [0, 27, 28, original.length - 1]) {
      expect(() => decodeMathTypeEquation(wrap(original.slice(0, length)))).toThrow(/malformed|truncated/i);
    }
    const payload = (body: number[]) => {
      const native = new Uint8Array(28 + 7 + body.length);
      native.set(original.slice(0, 28));
      new DataView(native.buffer).setUint32(8, 7 + body.length, true);
      native.set([5, 1, 0, 7, 4, 0, 0, ...body], 28);
      return wrap(native);
    };
    expect(() => decodeMathTypeEquation(payload([99, 0]))).toThrow(/unsupported.*99/i);
    expect(() => decodeMathTypeEquation(payload([3, 0, 37, 0, 0, 0, 0]))).toThrow(/unsupported.*template.*37/i);
    expect(() => decodeMathTypeEquation(payload([1, 0]))).toThrow(/truncated/i);
    expect(() => decodeMathTypeEquation(payload([...Array(66).fill([1, 0]).flat(), ...Array(67).fill(0)]))).toThrow(/depth/i);
    expect(() => decodeMathTypeEquation(payload([1, 0, 0, 0, 2]))).toThrow(/trailing/i);
  });
});

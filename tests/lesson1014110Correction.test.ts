import { describe, expect, it } from 'vitest';
import { getBanToanV4Contract } from '../src/lib/liveLesson/v4/lessonAdapter';
import { validateV4Contract } from '../src/lib/liveLesson/v4/validateContract';

const key = '10-14-110';
const source = () => getBanToanV4Contract(key).sourceContent!;
const allText = () => JSON.stringify(source());

describe('10-14-110 nội dung tích vô hướng đã kiểm', () => {
  it('giữ hợp đồng và đủ cấu trúc câu hỏi', () => {
    const contract = getBanToanV4Contract(key);
    expect(contract.sourceKey).toBe(key);
    expect(validateV4Contract(contract).errors).toEqual([]);
    expect(source().examples).toHaveLength(2);
    expect(source().exercises).toHaveLength(6);
    expect(source().quickChecks).toHaveLength(2);
  });

  it('dạy tích vô hướng, góc và độ dài tổng vectơ', () => {
    const text = allText();
    expect(text).toContain('|\\\\vec u+\\\\vec v|^2');
    expect(text).toContain('45^\\\\circ');
    expect(text).not.toContain('Chứng minh AM');
    expect(text).not.toContain('tam giác ABC vuông tại A');
  });
});

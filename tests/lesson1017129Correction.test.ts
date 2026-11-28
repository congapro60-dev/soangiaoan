import { describe, expect, it } from 'vitest';
import { getBanToanV4Contract } from '../src/lib/liveLesson/v4/lessonAdapter';
import { validateV4Contract } from '../src/lib/liveLesson/v4/validateContract';

const key = '10-17-129';
const source = () => getBanToanV4Contract(key).sourceContent!;
const allText = () => JSON.stringify(source());

describe('10-17-129 ôn hệ bất phương trình và tối ưu', () => {
  it('giữ hợp đồng và đủ cấu trúc câu hỏi', () => {
    const contract = getBanToanV4Contract(key);
    expect(contract.sourceKey).toBe(key);
    expect(validateV4Contract(contract).errors).toEqual([]);
    expect(source().examples).toHaveLength(2);
    expect(source().exercises).toHaveLength(6);
    expect(source().quickChecks).toHaveLength(2);
  });

  it('dùng miền nghiệm, điều kiện nguyên và cận có phương án đạt', () => {
    const text = allText();
    expect(text).toContain('miền đa giác');
    expect(text).toContain('8x+12y');
    expect(text).toContain('y\\\\le2x');
    expect(text).toContain('(7;14)');
    expect(text).not.toContain('tam thức bậc hai');
    expect(text).not.toContain('Delta');
  });
});

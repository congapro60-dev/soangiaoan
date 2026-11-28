import { describe, expect, it } from 'vitest';
import { getBanToanV4Contract } from '../src/lib/liveLesson/v4/lessonAdapter';
import { validateV4Contract } from '../src/lib/liveLesson/v4/validateContract';

const key = '10-16-122';
const source = () => getBanToanV4Contract(key).sourceContent!;
const allText = () => JSON.stringify(source());

describe('10-16-122 ôn hệ ràng buộc và tối ưu nguyên', () => {
  it('giữ hợp đồng và đủ cấu trúc câu hỏi', () => {
    const contract = getBanToanV4Contract(key);
    expect(contract.sourceKey).toBe(key);
    expect(validateV4Contract(contract).errors).toEqual([]);
    expect(source().examples).toHaveLength(2);
    expect(source().exercises).toHaveLength(6);
    expect(source().quickChecks).toHaveLength(2);
  });

  it('không còn hàm bậc hai, có hệ và chứng minh cận nguyên', () => {
    const text = allText();
    expect(text).toContain('12x+20y');
    expect(text).toContain('x\\\\ge2y');
    expect(text).toContain('y\\\\le5');
    expect(text).toContain('(10;5)');
    expect(text).toContain('(11;5)');
    expect(text).not.toContain('parabol');
    expect(text).not.toContain('trục đối xứng');
  });
});

import { describe, expect, it } from 'vitest';
import { getBanToanV4Contract } from '../src/lib/liveLesson/v4/lessonAdapter';
import { validateV4Contract } from '../src/lib/liveLesson/v4/validateContract';

const key = '10-17-128';
const source = () => getBanToanV4Contract(key).sourceContent!;
const allText = () => JSON.stringify(source());

describe('10-17-128 ôn mệnh đề, tập hợp và khoảng', () => {
  it('giữ hợp đồng và đủ cấu trúc câu hỏi', () => {
    const contract = getBanToanV4Contract(key);
    expect(contract.sourceKey).toBe(key);
    expect(validateV4Contract(contract).errors).toEqual([]);
    expect(source().examples).toHaveLength(2);
    expect(source().exercises).toHaveLength(6);
    expect(source().quickChecks).toHaveLength(2);
  });

  it('giữ các phép kiểm lượng từ, giao-hiệu và tham số khoảng', () => {
    const text = allText();
    expect(text).toContain('7\\\\mid(3x+1)');
    expect(text).toContain('A∩B');
    expect(text).toContain('A\\\\\\\\B');
    expect(text).toContain('C_m');
    expect(text).toContain('-1≤m≤2');
    expect(text).not.toContain('phương trình chứa căn');
    expect(text).not.toContain('bình phương hai vế');
  });
});

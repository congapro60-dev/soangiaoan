import { describe, expect, it } from 'vitest';
import { getBanToanV4Contract } from '../src/lib/liveLesson/v4/lessonAdapter';
import { validateV4Contract } from '../src/lib/liveLesson/v4/validateContract';

const key = '12-18-131';
const source = () => getBanToanV4Contract(key).sourceContent!;
const allText = () => JSON.stringify(source());

describe('12-18-131 chỉ ôn Oxyz học kỳ 1', () => {
  it('giữ hợp đồng và đủ cấu trúc câu hỏi', () => {
    const contract = getBanToanV4Contract(key);
    expect(contract.sourceKey).toBe(key);
    expect(validateV4Contract(contract).errors).toEqual([]);
    expect(source().examples).toHaveLength(2);
    expect(source().exercises).toHaveLength(6);
    expect(source().quickChecks).toHaveLength(2);
  });

  it('giữ vectơ, tọa độ, tích vô hướng và khoảng cách; loại HK2', () => {
    const text = allText();
    expect(text).toContain('tích vô hướng');
    expect(text).toContain('khoảng cách');
    expect(text).toContain('trung điểm');
    expect(text).not.toContain('mặt phẳng');
    expect(text).not.toContain('mặt cầu');
    expect(text).not.toContain('tích có hướng');
  });
});

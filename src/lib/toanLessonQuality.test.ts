import { describe, it, expect } from 'vitest';
import { validateToanLesson, buildToanRepairBrief } from './toanLessonQuality';

const COMPLETE_KNOWLEDGE = `
# Khởi động (trải nghiệm thực tế)
Mục tiêu: Must do cơ bản, Should do trọng tâm, Could do nâng cao (🌶🌶🌶).
# Hình thành kiến thức mới — định lý
GV hỏi: vì sao cần công thức này? Có cách khác không? Phản ví dụ là gì?
Năng lực tư duy và lập luận, mô hình hóa, giải quyết vấn đề.
# Luyện tập củng cố
Bài 1, Bài 2, Bài 3 từ dễ đến nâng cao. Sản phẩm dự kiến: đáp án đầy đủ.
HĐ (10:49 - 11:00).
# Sơ kết
## BTVN
Bài 1 trang 42, Bài 2 trang 43.`;

describe('validateToanLesson', () => {
  it('giáo án đầy đủ thì passed = true, không có failure high', () => {
    const res = validateToanLesson(COMPLETE_KNOWLEDGE, 'kien_thuc');
    expect(res.passed).toBe(true);
    expect(res.failures).toHaveLength(0);
  });

  it('giáo án luyện tập thiếu Polya/2 lộ trình thì passed = false', () => {
    const weak = `# Luyện tập\nBài 1, Bài 2, Bài 3. GV hỗ trợ học sinh yếu.`;
    const res = validateToanLesson(weak, 'luyen_tap');
    expect(res.passed).toBe(false);
    expect(res.failures.some((f) => f.id === 'polya-4-steps')).toBe(true);
    expect(res.failures.some((f) => f.id === 'dual-hint-routes')).toBe(true);
  });

  it('BTVN trống bị bắt (nhưng là medium nên không chặn passed)', () => {
    const res = validateToanLesson(COMPLETE_KNOWLEDGE.replace('Bài 1 trang 42, Bài 2 trang 43.', ''), 'kien_thuc');
    expect(res.allFindings.find((f) => f.id === 'homework-present')!.status).toBe('fail');
  });
});

describe('buildToanRepairBrief', () => {
  it('rỗng khi không có failure', () => {
    expect(buildToanRepairBrief('x', [])).toBe('');
  });

  it('liệt kê đúng các tiêu chí thiếu và đính kèm giáo án', () => {
    const res = validateToanLesson('# Luyện tập\nBài 1, Bài 2, Bài 3.', 'luyen_tap');
    const brief = buildToanRepairBrief('NỘI DUNG GỐC', res.failures);
    expect(brief).toContain('NỘI DUNG GỐC');
    expect(brief).toContain('Polya');
    expect(brief).toContain('CẦN SỬA');
  });
});

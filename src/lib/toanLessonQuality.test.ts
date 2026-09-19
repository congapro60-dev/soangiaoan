import { describe, it, expect } from 'vitest';
import { validateToanLesson, buildToanRepairBrief } from './toanLessonQuality';

// Mốc phút dạng P0–P40 là bắt buộc theo luật `time-continuity` (severity high): các mốc phải
// nối liền nhau và phủ kín cả tiết 40 phút, thời lượng trong ngoặc bằng hiệu hai mốc.
const COMPLETE_KNOWLEDGE = `
# Khởi động (trải nghiệm thực tế) (5 phút, P0–P5)
Mục tiêu: Must do cơ bản, Should do trọng tâm, Could do nâng cao (🌶🌶🌶).
## MINH CHỨNG HQT / CIS
| Minh chứng | HS làm gì → GV thu được gì → mục đích | Vị trí |
|---|---|---|
| [PHÂN HÓA] | HS chọn nhánh NB/TH/VD | Luyện tập |
| [CÔNG DÂN TOÀN CẦU] | HS phân tích số liệu khí thải giữa các quốc gia | Khởi động |
| Danielson 1a | Định nghĩa có ví dụ + phép kiểm | Hình thành |
| Danielson 1b | Phân nhánh NB/TH/VD theo mức | Luyện tập |
| Danielson 1c | Mục tiêu 3 mức Must/Should/Could | Bảng mục tiêu |
| Danielson 1d | SGK/SBT, học liệu số | Tài liệu |
| Danielson 1e | Mạch tiến trình mạch lạc | Tiến trình |
| Danielson 1f | Phiếu thoát + tiêu chí | Sơ kết |
# Hình thành kiến thức mới — định lý (20 phút, P5–P25)
GV hỏi: vì sao cần công thức này? Có cách khác không? Phản ví dụ là gì?
Năng lực tư duy và lập luận, mô hình hóa, giải quyết vấn đề.
# Luyện tập củng cố (10 phút, P25–P35)
Bài 1, Bài 2, Bài 3 (SGK) từ dễ đến nâng cao. Sản phẩm dự kiến: đáp án đầy đủ.
HĐ (10:49 - 11:00).
# Sơ kết (5 phút, P35–P40)
## BTVN
Bài 1 trang 42, Bài 2 trang 43.
# Phụ lục
Phiếu học tập: bảng tổng hợp công thức và ô luyện kỹ năng vận dụng.`;

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

  it('thiếu Phiếu học tập (Phụ lục) thì chặn passed và vào diện repair', () => {
    const res = validateToanLesson(COMPLETE_KNOWLEDGE.replace(/# Phụ lục[\s\S]*$/, ''), 'kien_thuc');
    expect(res.passed).toBe(false);
    expect(res.failures.some((f) => f.id === 'worksheet-appendix')).toBe(true);
  });

  it('thiếu WALT/WILF + thoại giáo viên thì bắt được và vào diện repair', () => {
    const bare = `# Khởi động\n# Hình thành kiến thức\nBài 1, Bài 2, Bài 3.\n# Sơ kết\n## BTVN\nBài 5 trang 9.`;
    const res = validateToanLesson(bare, 'kien_thuc');
    expect(res.failures.some((f) => f.id === 'success-criteria')).toBe(true);
    expect(res.failures.some((f) => f.id === 'teacher-script')).toBe(true);
  });

  it('medium cũ (câu hỏi dẫn dắt) KHÔNG bị đưa vào diện repair', () => {
    const res = validateToanLesson(COMPLETE_KNOWLEDGE, 'kien_thuc');
    expect(res.failures.some((f) => f.id === 'guiding-questions')).toBe(false);
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

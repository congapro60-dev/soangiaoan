import { describe, it, expect } from 'vitest';
import { auditMathStandards, detectLessonType } from './mathStandards';

const find = (content: string, id: string, forceType?: any) =>
  auditMathStandards(content, forceType).findings.find((f) => f.id === id)!;

describe('detectLessonType', () => {
  it('nhận diện tiết luyện tập qua Polya', () => {
    expect(detectLessonType('Tiết luyện tập. Áp dụng quy trình Polya để giải bài tập 1.')).toBe('practice');
  });
  it('nhận diện lớp học đảo ngược', () => {
    expect(detectLessonType('Lớp học đảo ngược: HS xem video trước ở nhà.')).toBe('flipped');
  });
  it('nhận diện tiết hình thành kiến thức', () => {
    expect(detectLessonType('Hoạt động hình thành kiến thức: xây dựng định lý Newton.')).toBe('knowledge');
  });
});

describe('auditMathStandards — tiêu chí chung', () => {
  it('four-phases FAIL khi thiếu pha', () => {
    const f = find('Chỉ có phần hình thành kiến thức mới, không có gì khác.', 'four-phases');
    expect(f.status).toBe('fail');
    expect(f.evidence).toMatch(/Thiếu/);
  });

  it('four-phases PASS khi đủ 4 pha', () => {
    const content = `
      # Khởi động (trải nghiệm)
      # Hình thành kiến thức mới
      # Luyện tập củng cố
      # Sơ kết và BTVN`;
    expect(find(content, 'four-phases').status).toBe('pass');
  });

  it('differentiated-objectives PASS với Must/Should/Could', () => {
    const content = 'Mục tiêu: Must do cơ bản, Should do trọng tâm, Could do nâng cao.';
    expect(find(content, 'differentiated-objectives').status).toBe('pass');
  });

  it('differentiated-objectives FAIL khi mục tiêu không phân hóa', () => {
    const content = 'Mục tiêu: học sinh nắm được công thức nghiệm.';
    expect(find(content, 'differentiated-objectives').status).toBe('fail');
  });

  it('homework-present FAIL khi có heading BTVN nhưng trống', () => {
    const content = '## Luyện tập\nBài 1. Giải.\n## BTVN\n\n## Rút kinh nghiệm';
    expect(find(content, 'homework-present').status).toBe('fail');
  });

  it('homework-present PASS khi BTVN có nhiệm vụ', () => {
    const content = '## BTVN\nBài 1 trang 42, Bài 2 trang 43.';
    expect(find(content, 'homework-present').status).toBe('pass');
  });

  it('no-internal-instructions FAIL khi sót placeholder người soạn', () => {
    const content = 'HĐ2:\n- Liệt kê... các bước giải\n- Mô tả... tình huống';
    expect(find(content, 'no-internal-instructions').status).toBe('fail');
  });

  it('no-internal-instructions PASS với giáo án hoàn chỉnh', () => {
    const content = 'HĐ2: GV nêu bài toán tối ưu thể tích lon nước, HS lập hàm V(x) và tính đạo hàm.';
    expect(find(content, 'no-internal-instructions').status).toBe('pass');
  });

  it('time-coverage PASS với mốc giờ thực', () => {
    expect(find('HĐ1 (10:49 - 11:00): khởi động.', 'time-coverage').status).toBe('pass');
  });
});

describe('auditMathStandards — mục C (tiết luyện tập)', () => {
  const goodPractice = `
    # Tiết luyện tập — Phương pháp giải theo Polya
    Mục tiêu: Must do, Should do, Could do. Học sinh hiểu vì sao chọn và khi nào dùng đạo hàm.
    Bước 1: Hiểu bài toán. Bước 2: Tìm hướng giải.
    Lộ trình chuẩn cho nhóm khá–giỏi; lộ trình hỗ trợ (dắt tay) cho nhóm yếu.
    Bước 3: Trình bày lời giải. Bước 4: Nhìn lại bài toán, mở rộng.
    Góc Phao cứu sinh có thẻ gợi ý; phiếu có giàn giáo cho nhóm yếu.
    Bài 1, Bài 2, Bài 3 từ dễ đến nâng cao. Đáp án dự kiến đầy đủ.`;

  it('bật bộ kiểm practice và Polya PASS', () => {
    const res = auditMathStandards(goodPractice);
    expect(res.lessonType).toBe('practice');
    expect(res.findings.find((f) => f.id === 'polya-4-steps')!.status).toBe('pass');
    expect(res.findings.find((f) => f.id === 'dual-hint-routes')!.status).toBe('pass');
  });

  it('dual-hint-routes FAIL khi chỉ có 1 bộ gợi ý', () => {
    const content = 'Tiết luyện tập Polya. Bước tìm hướng giải: GV gợi ý chung cho cả lớp.';
    expect(find(content, 'dual-hint-routes', 'practice').status).toBe('fail');
  });

  it('không bật bộ kiểm practice cho tiết hình thành kiến thức', () => {
    const res = auditMathStandards('Hình thành kiến thức: định nghĩa hàm số.');
    expect(res.findings.some((f) => f.id === 'polya-4-steps')).toBe(false);
  });

  it('criticalFailures đếm đúng số tiêu chí high đang fail', () => {
    const res = auditMathStandards('Nội dung sơ sài, không mục tiêu, không hoạt động.');
    expect(res.criticalFailures).toBeGreaterThan(0);
  });
});

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

describe('auditMathStandards — bộ kiểm nội dung mới (yêu cầu ban Toán 2026-09)', () => {
  it('no-generic-objective FAIL với câu khuôn generic', () => {
    const content = 'Tôi có thể tạo sản phẩm cốt lõi tối thiểu về bất phương trình.';
    expect(find(content, 'no-generic-objective').status).toBe('fail');
  });

  it('no-generic-objective PASS với mục tiêu Toán cụ thể', () => {
    const content = 'Tôi có thể kiểm tra một cặp số có là nghiệm của bất phương trình bậc nhất hai ẩn.';
    expect(find(content, 'no-generic-objective').status).toBe('pass');
  });

  it('cis-evidence-table FAIL khi thiếu bảng/đủ 6 Danielson', () => {
    expect(find('Giáo án không có bảng minh chứng.', 'cis-evidence-table').status).toBe('fail');
    const only5 = 'MINH CHỨNG HQT / CIS. Danielson 1a, 1b, 1c, 1d, 1e.';
    expect(find(only5, 'cis-evidence-table').evidence).toMatch(/1f/);
  });

  it('cis-evidence-table PASS khi có bảng + đủ 6 Danielson', () => {
    const content = 'MINH CHỨNG HQT / CIS. Danielson 1a; Danielson 1b; Danielson 1c; Danielson 1d; Danielson 1e; Danielson 1f.';
    expect(find(content, 'cis-evidence-table').status).toBe('pass');
  });

  it('exercise-source FAIL khi có bài tập nhưng không nguồn', () => {
    expect(find('Bài 1: giải. Bài 2: tính.', 'exercise-source').status).toBe('fail');
  });

  it('exercise-source PASS khi ghi nguồn', () => {
    expect(find('Bài 1 (SGK bài 3). Bài 2 (GV tự thiết kế).', 'exercise-source').status).toBe('pass');
  });

  it('cdtc-integration PASS khi có CDTC hoặc ghi rõ không phải tiết trọng tâm', () => {
    expect(find('Bối cảnh công dân toàn cầu về khí thải.', 'cdtc-integration').status).toBe('pass');
    expect(find('CDTC: Không phải tiết trọng tâm.', 'cdtc-integration').status).toBe('pass');
  });

  it('cdtc-integration FAIL khi không tích hợp và không ghi NA', () => {
    expect(find('Tiết dạy công thức nghiệm, không nhắc gì thêm.', 'cdtc-integration').status).toBe('fail');
  });
});

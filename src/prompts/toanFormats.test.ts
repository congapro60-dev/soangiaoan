import { describe, expect, it } from 'vitest';
import { TOAN_ADDITIONAL_REQUIREMENTS, TOAN_COMMON_FORMAT, TOAN_KE_HOACH_FORMATS, TOAN_KE_HOACH_LABELS } from './toanFormats';

/**
 * HỢP ĐỒNG CẤU TRÚC của loại "Giáo án ban Toán" — Pha 2 (xuất Word có style)
 * nhận diện bảng/heading dựa đúng các chuỗi này. Test gãy = ai đó đổi hợp đồng.
 */

const ACTIVITY_TABLE_HEADER = '| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |';
const NHAN_LABELS = ['[PHÁT HIỆN]', '[SO SÁNH]', '[DỰ ĐOÁN]', '[PHẢN VÍ DỤ]', '[KHÁI QUÁT]', '[VÌ SAO]'];

describe('TOAN_COMMON_FORMAT — hợp đồng cấu trúc', () => {
  it('chứa đúng header bảng hoạt động 3 cột', () => {
    expect(TOAN_COMMON_FORMAT).toContain(ACTIVITY_TABLE_HEADER);
  });

  it('bảng mục tiêu có đủ 3 nhãn hàng Cơ bản/Trọng tâm/Nâng cao', () => {
    expect(TOAN_COMMON_FORMAT).toContain('| Cơ bản |');
    expect(TOAN_COMMON_FORMAT).toContain('| Trọng tâm |');
    expect(TOAN_COMMON_FORMAT).toContain('| Nâng cao |');
  });

  it('liệt kê đủ danh sách nhãn câu hỏi Socratic đóng', () => {
    for (const label of NHAN_LABELS) {
      expect(TOAN_COMMON_FORMAT).toContain(label);
    }
  });

  it('có quy tắc LaTeX $...$ và cấm Unicode giả', () => {
    expect(TOAN_COMMON_FORMAT).toContain('$...$');
    expect(TOAN_COMMON_FORMAT).toContain('\\mid');
  });
});

describe('TOAN_KE_HOACH_FORMATS — mỗi kế hoạch riêng biệt, chỉ 1 tiết', () => {
  it('đủ 3 kế hoạch khớp labels', () => {
    expect(Object.keys(TOAN_KE_HOACH_FORMATS).sort()).toEqual(Object.keys(TOAN_KE_HOACH_LABELS).sort());
  });

  it('kien_thuc có chuỗi Socratic + luyện tập phân hóa 3 mức', () => {
    const f = TOAN_KE_HOACH_FORMATS.kien_thuc;
    expect(f).toContain('HÌNH THÀNH KIẾN THỨC');
    expect(f).toContain('### Mức TB');
    expect(f).toContain('### Mức Giỏi');
    expect(f).not.toContain('TIC-TAC-TOE');
    expect(f).not.toContain('JIGSAW');
  });

  it('luyen_tap có Tic-Tac-Toe NB/TH/VD, không dạy kiến thức mới', () => {
    const f = TOAN_KE_HOACH_FORMATS.luyen_tap;
    expect(f).toContain('TIC-TAC-TOE');
    expect(f).toContain('NB-1');
    expect(f).toContain('KHÔNG dạy kiến thức mới');
    expect(f).not.toContain('JIGSAW');
  });

  it('dao_nguoc có phần trước giờ học + nhóm chuyên gia + vòng ghép', () => {
    const f = TOAN_KE_HOACH_FORMATS.dao_nguoc;
    expect(f).toContain('TRƯỚC GIỜ HỌC');
    expect(f).toContain('Nhóm chuyên gia');
    expect(f).toContain('VÒNG GHÉP');
    expect(f).not.toContain('TIC-TAC-TOE');
  });
});

describe('TOAN_ADDITIONAL_REQUIREMENTS', () => {
  it('nhắc lại header 3 cột + few-shot có [NHÃN] và công thức $', () => {
    expect(TOAN_ADDITIONAL_REQUIREMENTS).toContain(ACTIVITY_TABLE_HEADER);
    expect(TOAN_ADDITIONAL_REQUIREMENTS).toContain('[PHÁT HIỆN]');
    expect(TOAN_ADDITIONAL_REQUIREMENTS).toContain('$\\vec{n}');
    expect(TOAN_ADDITIONAL_REQUIREMENTS).toContain('KHÔNG dùng khung Dewey');
  });
});

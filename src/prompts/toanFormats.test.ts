import { describe, expect, it } from 'vitest';
import { TOAN_ADDITIONAL_REQUIREMENTS, TOAN_COMMON_FORMAT, TOAN_KE_HOACH_FORMATS, TOAN_KE_HOACH_LABELS } from './toanFormats';
import { TOAN_NHAN_RE } from '../utils/toanStyleRules';

/**
 * HỢP ĐỒNG CẤU TRÚC của loại "Giáo án ban Toán" (bám bản mẫu vàng KHDH v13) —
 * Pha 2 (xuất Word có style) nhận diện bảng/heading/nhãn dựa đúng các chuỗi này.
 * Test gãy = ai đó đổi hợp đồng mà chưa đồng bộ toanStyleRules/renderWordCore.
 */

const ACTIVITY_TABLE_HEADER = '| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |';
const NHAN_LABELS = [
  '[PHÁT HIỆN]', '[SO SÁNH]', '[SUY LUẬN]', '[DỰ ĐOÁN]', '[KHÁI QUÁT]',
  '[PHẢN BIỆN]', '[SÁNG TẠO]', '[SỐ HỌC]', '[MÔ HÌNH HÓA]',
  '[GHI NHỚ]', '[HIỂU]', '[VẬN DỤNG]', '[PHÂN TÍCH]',
  '[HỆ QUẢ]',
  '[NB]', '[TH]', '[VD]', '[VDC]',
];

describe('TOAN_COMMON_FORMAT — hợp đồng cấu trúc (theo v13)', () => {
  it('chứa đúng header bảng hoạt động 3 cột', () => {
    expect(TOAN_COMMON_FORMAT).toContain(ACTIVITY_TABLE_HEADER);
  });

  it('có bảng thông tin hành chính (Lớp/Tên bài/Giáo viên/Tuần/Năm học)', () => {
    expect(TOAN_COMMON_FORMAT).toContain('| Lớp |');
    expect(TOAN_COMMON_FORMAT).toContain('| Giáo viên |');
  });

  it('bảng mục tiêu có đủ 3 nhãn hàng Cơ bản/Trọng tâm/Nâng cao + Bloom', () => {
    expect(TOAN_COMMON_FORMAT).toContain('| Cơ bản |');
    expect(TOAN_COMMON_FORMAT).toContain('| Trọng tâm |');
    expect(TOAN_COMMON_FORMAT).toContain('| Nâng cao |');
    expect(TOAN_COMMON_FORMAT).toContain('[Bloom:');
  });

  it('có đủ các thành phần v13: căn cứ điều chỉnh, mốc phút, 4 BƯỚC, kỹ thuật chờ, dự kiến khó khăn, lỗi phổ biến', () => {
    expect(TOAN_COMMON_FORMAT).toContain('Căn cứ điều chỉnh từ đánh giá tiết trước');
    // Quy ước mốc phút bắt đầu từ P0 (đổi 2026-07: "5 phút, P1–P5" là SAI vì chỉ dài 4 phút).
    expect(TOAN_COMMON_FORMAT).toContain('P0–P5');
    expect(TOAN_COMMON_FORMAT).toContain('BƯỚC 1: KẾT NỐI');
    expect(TOAN_COMMON_FORMAT).toContain('BƯỚC 4: CHUẨN HÓA');
    expect(TOAN_COMMON_FORMAT).toContain('Chờ ≥ 3 giây');
    expect(TOAN_COMMON_FORMAT).toContain('Dự kiến khó khăn');
    expect(TOAN_COMMON_FORMAT).toContain('⚠ Lỗi phổ biến');
    expect(TOAN_COMMON_FORMAT).toContain('HS yếu/TB');
  });

  it('có đủ 5 luật chống lỗi rút từ đợt rà giáo án Bài 19 (2026-07)', () => {
    // Mỗi assert ứng với một lỗi THẬT đã phải sửa tay — xoá luật là mở đường cho lỗi quay lại.
    expect(TOAN_COMMON_FORMAT).toContain('DÙNG CÔNG CỤ CHƯA HỌC');
    expect(TOAN_COMMON_FORMAT).toContain('ĐỔI HẲN ĐỀ KHÁC');
    expect(TOAN_COMMON_FORMAT).toContain('ĐỂ TRỐNG');
    expect(TOAN_COMMON_FORMAT).toContain('MỐC THỜI GIAN HỞ HOẶC LỆCH');
    expect(TOAN_COMMON_FORMAT).toContain('LẶP KHỐI NỘI DUNG');
    expect(TOAN_COMMON_FORMAT).toContain('MÔ HÌNH TỔ CHỨC LỚP MÂU THUẪN');
  });

  it('quy ước mốc thời gian nêu rõ P0→P40 và cấm để hở phút', () => {
    expect(TOAN_COMMON_FORMAT).toContain('QUY TẮC MỐC THỜI GIAN');
    expect(TOAN_COMMON_FORMAT).toContain('kết thúc đúng **P40**');
    expect(TOAN_COMMON_FORMAT).toContain('không hở phút nào');
  });

  it('có chuẩn trình bày phiếu học tập ở phụ lục', () => {
    expect(TOAN_COMMON_FORMAT).toContain('PHIẾU HỌC TẬP Ở PHỤ LỤC');
    expect(TOAN_COMMON_FORMAT).toContain('Họ và tên');
    expect(TOAN_COMMON_FORMAT).toContain('Mỗi phiếu là một trang riêng');
  });

  it('liệt kê đủ danh sách nhãn đóng, và mọi nhãn đều khớp TOAN_NHAN_RE của style rules', () => {
    for (const label of NHAN_LABELS) {
      expect(TOAN_COMMON_FORMAT).toContain(label);
      expect(TOAN_NHAN_RE.test(label)).toBe(true);
    }
    expect(TOAN_NHAN_RE.test('[NB-1]')).toBe(true); // biến thể đánh số ô Tic-Tac-Toe
    expect(TOAN_NHAN_RE.test('[nhãn thường]')).toBe(false);
  });

  it('có quy tắc LaTeX $...$ và cấm Unicode giả', () => {
    expect(TOAN_COMMON_FORMAT).toContain('$...$');
    expect(TOAN_COMMON_FORMAT).toContain('\\mid');
    expect(TOAN_COMMON_FORMAT).toContain('CẤM Unicode giả');
  });

  it('chuẩn sư phạm từ transcript cowork: 7 loại câu hỏi, 4 trục Tomlinson, tiếng nói HS, scaffold, không lấn phạm vi', () => {
    expect(TOAN_COMMON_FORMAT).toContain('PHỦ ĐỦ 7 LOẠI CÂU HỎI');
    expect(TOAN_COMMON_FORMAT).toContain('Tomlinson');
    expect(TOAN_COMMON_FORMAT).toContain('SCAFFOLD TƯỜNG MINH');
    expect(TOAN_COMMON_FORMAT).toContain('TIẾNG NÓI & LỰA CHỌN CỦA HS');
    expect(TOAN_COMMON_FORMAT).toContain('KHÔNG lấn nội dung tiết sau');
    expect(TOAN_COMMON_FORMAT).toContain('Phòng chờ Toán học');
  });

  it('7 loại câu hỏi ĐÚNG danh sách chuẩn từ file gốc (có VẬN DỤNG, kèm câu mẫu)', () => {
    // Bản chuẩn kĩ thuật đặt câu hỏi.pdf trang 22-25: So sánh/Phát hiện/Suy luận/Khái quát/Vận dụng/Phản biện/Sáng tạo
    for (const t of ['[SO SÁNH]', '[PHÁT HIỆN]', '[SUY LUẬN]', '[KHÁI QUÁT]', '[VẬN DỤNG]', '[PHẢN BIỆN]', '[SÁNG TẠO]']) {
      expect(TOAN_COMMON_FORMAT).toContain(t);
    }
    expect(TOAN_COMMON_FORMAT).toContain('Hai cách giải này giống nhau ở điểm nào'); // câu mẫu từ file gốc
    expect(TOAN_COMMON_FORMAT).toContain('tự đặt một bài toán tương tự');
    expect(TOAN_COMMON_FORMAT).toContain('cấm câu hỏi kép');
  });

  it('chuẩn từ file gốc: tạo bước đệm (Danielson Distinguished) + tiêu chí bối cảnh thực tiễn', () => {
    expect(TOAN_COMMON_FORMAT).toContain('TẠO BƯỚC ĐỆM');
    expect(TOAN_COMMON_FORMAT).toContain('RÚT DẦN');
    expect(TOAN_COMMON_FORMAT).toContain('TOÁN HỌC HÓA');
    expect(TOAN_COMMON_FORMAT).toContain('mô hình hóa được');
    expect(TOAN_COMMON_FORMAT).toContain('tôn giáo, chính trị, giới tính');
  });
});

describe('TOAN_KE_HOACH_FORMATS — mỗi kế hoạch riêng biệt, chỉ 1 tiết', () => {
  it('đủ 3 kế hoạch khớp labels', () => {
    expect(Object.keys(TOAN_KE_HOACH_FORMATS).sort()).toEqual(Object.keys(TOAN_KE_HOACH_LABELS).sort());
  });

  it('kien_thuc: KWLI + 4 bước + kiểm tra nhanh phân hóa; không lẫn Tic-Tac-Toe/dự án', () => {
    const f = TOAN_KE_HOACH_FORMATS.kien_thuc;
    expect(f).toContain('KWLI');
    expect(f).toContain('BƯỚC 1 KẾT NỐI');
    expect(f).toContain('ĐỒNG MỨC NB/TH/VD');
    expect(f).toContain('KIỂM TRA NHANH');
    expect(f).not.toContain('TIC-TAC-TOE');
    expect(f).not.toContain('Dự án mini');
  });

  it('luyen_tap: sửa lỗi exit ticket + Tic-Tac-Toe 3×3 + phòng chờ; không dạy kiến thức mới', () => {
    const f = TOAN_KE_HOACH_FORMATS.luyen_tap;
    expect(f).toContain('Sửa lỗi Exit ticket');
    expect(f).toContain('Tic-Tac-Toe');
    expect(f).toContain('NB-1');
    expect(f).toContain('KHÔNG dạy kiến thức mới');
    expect(f).toContain('Phòng chờ Toán học');
    expect(f).toContain('PHÂN CÔNG THEO NĂNG LỰC');
  });

  it('luyen_tap: mục tiêu chuẩn tiết luyện tập (ảnh tập huấn) — VÌ SAO/KHI NÀO, tư duy, Polya 4 bước, 2 bộ gợi ý phân hóa', () => {
    const f = TOAN_KE_HOACH_FORMATS.luyen_tap;
    expect(f).toContain('VÌ SAO chọn phương pháp');
    expect(f).toContain('KHI NÀO chọn phương pháp');
    expect(f).toContain('PHÁT TRIỂN TƯ DUY TOÁN HỌC');
    expect(f).toContain('G. POLYA');
    expect(f).toContain('Bước 2: Tìm hướng giải');
    expect(f).toContain('Bước 4: Nhìn lại bài toán');
    expect(f).toContain('2 BỘ CÂU HỎI GỢI Ý PHÂN HÓA');
    expect(f).toContain('lộ trình 1');
    expect(f).toContain('lộ trình 2');
    expect(f).toContain('GHI CHI TIẾT CÁCH ÁP DỤNG');
  });

  it('dao_nguoc: cảnh báo không dạy lại lý thuyết + jigsaw ở nhà + quiz Bloom/Kahoot + dự án mini + tranh biện + mindmap', () => {
    const f = TOAN_KE_HOACH_FORMATS.dao_nguoc;
    expect(f).toContain('KHÔNG dạy lại lý thuyết');
    expect(f).toContain('JIGSAW + MICROLEARNING'); // v13: nhóm chuyên gia tự học Ở NHÀ, không phải trên lớp
    expect(f).toContain('NHÓM CHUYÊN GIA');
    expect(f).toContain('CHUỖI BLOOM');
    expect(f).toContain('Kahoot');
    expect(f).toContain('Dự án mini');
    expect(f).toContain('Tranh biện');
    expect(f).toContain('ĐIỂM SAO');
    expect(f).toContain('MINDMAP');
    expect(f).toContain('TRƯỚC TIẾT HỌC');
  });
});

describe('TOAN_ADDITIONAL_REQUIREMENTS', () => {
  it('nhắc lại header 3 cột + few-shot thật từ v13 (nhãn + công thức + kỹ thuật chờ)', () => {
    expect(TOAN_ADDITIONAL_REQUIREMENTS).toContain(ACTIVITY_TABLE_HEADER);
    expect(TOAN_ADDITIONAL_REQUIREMENTS).toContain('[SO SÁNH]');
    expect(TOAN_ADDITIONAL_REQUIREMENTS).toContain('[SỐ HỌC]');
    expect(TOAN_ADDITIONAL_REQUIREMENTS).toContain('$\\overrightarrow{AB}');
    expect(TOAN_ADDITIONAL_REQUIREMENTS).toContain('Chờ ≥ 3 giây');
    expect(TOAN_ADDITIONAL_REQUIREMENTS).toContain('KHÔNG dùng khung Dewey');
    expect(TOAN_ADDITIONAL_REQUIREMENTS).toContain('KẾT QUẢ CUỐI');
  });
});

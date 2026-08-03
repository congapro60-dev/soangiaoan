/**
 * Thư viện nước đi lớp học — hợp đồng nội dung.
 *
 * Vì sao cần test: đây là phần NGHỀ ĐỨNG LỚP rút từ giáo án GV bộ môn đã dạy thật
 * (Tiết 2 Bài 19, 2026-07). Ai rút gọn cho "đỡ dài" là làm mất đúng thứ khiến giáo án
 * dùng được trên lớp. Đặc biệt: mỗi nước đi PHẢI có lý do — thiếu lý do thì GV dạy thay
 * sẽ bỏ qua bước đó vì tưởng là thủ tục hình thức.
 */
import { describe, it, expect } from 'vitest';
import {
  TOAN_CLASSROOM_MOVES,
  buildToanClassroomMovesPrompt,
  type ToanClassroomMove,
} from './toanClassroomMoves';

describe('TOAN_CLASSROOM_MOVES — chất lượng từng mục', () => {
  it('mọi mục đều đủ 5 trường, không mục nào bỏ trống', () => {
    for (const mv of TOAN_CLASSROOM_MOVES) {
      expect(mv.id, `id rỗng ở "${mv.ten}"`).toBeTruthy();
      expect(mv.ten.length, `tên quá ngắn: ${mv.id}`).toBeGreaterThan(5);
      expect(mv.khiNao.length, `thiếu "khi nào": ${mv.id}`).toBeGreaterThan(15);
      expect(mv.cachLam.length, `thiếu "cách làm": ${mv.id}`).toBeGreaterThan(40);
      expect(mv.viSao.length, `thiếu "vì sao": ${mv.id}`).toBeGreaterThan(40);
    }
  });

  it('id là duy nhất', () => {
    const ids = TOAN_CLASSROOM_MOVES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('phủ đủ 5 nhóm nước đi', () => {
    const groups = new Set(TOAN_CLASSROOM_MOVES.map((m) => m.nhom));
    expect(groups).toEqual(
      new Set(['cho-va-goi', 'quan-sat', 'phan-hoa', 'chuyen-tiep', 'danh-gia']),
    );
  });

  it('có đủ BỘ BA xử lý khi HS chọn sai — phần dễ bị cắt nhất', () => {
    const ids = TOAN_CLASSROOM_MOVES.map((m) => m.id);
    expect(ids).toContain('ha-canh-mem'); // chọn quá sức
    expect(ids).toContain('nang-cap-tai-cho'); // chọn dưới sức
    expect(ids).toContain('de-trai-nghiem-be-tac'); // dùng công cụ cồng kềnh
  });

  it('giữ đúng các chi tiết cốt lõi của GV (mất là mất nghề)', () => {
    const byId = (id: string): ToanClassroomMove => {
      const mv = TOAN_CLASSROOM_MOVES.find((m) => m.id === id);
      if (!mv) throw new Error(`thiếu nước đi "${id}"`);
      return mv;
    };
    // Chờ hai nhịp: nhịp 1 phải CẤM giơ bảng sớm, và lý do là HS yếu không bị cuống.
    expect(byId('wait-time-2-nhip').cachLam).toMatch(/cấm giơ bảng sớm/i);
    expect(byId('wait-time-2-nhip').viSao).toMatch(/cuống/i);
    // Quét Radar: điểm mấu chốt là RÚT NHANH, không ngồi lì.
    expect(byId('quet-radar').cachLam).toMatch(/rút nhanh/i);
    // Hạ cánh mềm: tuyệt đối KHÔNG thu lại phiếu.
    expect(byId('ha-canh-mem').cachLam).toMatch(/không thu lại phiếu/i);
    expect(byId('ha-canh-mem').viSao).toMatch(/thể diện/i);
    // Nâng cấp tại chỗ: không ép đổi phiếu, hỏi mở rộng TẠI CHỖ trước.
    expect(byId('nang-cap-tai-cho').cachLam).toMatch(/không ép đổi phiếu/i);
    // Productive struggle: không ngăn ngay.
    expect(byId('de-trai-nghiem-be-tac').cachLam).toMatch(/không ngăn ngay/i);
    // Khẩu lệnh kéo lớp về: yêu cầu hành động quan sát được.
    expect(byId('khau-lenh-thu-hut').cachLam).toMatch(/đặt bút xuống/i);
    // Phát tài liệu: giữa cụm bàn, KHÔNG để khay góc lớp.
    expect(byId('phat-tai-lieu-khong-on').cachLam).toMatch(/giữa/i);
  });
});

describe('buildToanClassroomMovesPrompt', () => {
  const prompt = buildToanClassroomMovesPrompt();

  it('nêu rõ cách dùng: CHỌN vài nước đi, không liệt kê thành mục riêng', () => {
    expect(prompt).toMatch(/CHỌN 3–5 nước đi/);
    expect(prompt).toMatch(/KHÔNG liệt kê thành mục riêng/);
  });

  it('có ràng buộc bắt buộc về kịch bản chọn sai (cả hai chiều)', () => {
    expect(prompt).toMatch(/RÀNG BUỘC BẮT BUỘC/);
    expect(prompt).toMatch(/quá sức/);
    expect(prompt).toMatch(/dưới sức/);
  });

  it('in ra đủ mọi nước đi kèm lý do', () => {
    for (const mv of TOAN_CLASSROOM_MOVES) {
      expect(prompt).toContain(mv.ten);
    }
    const soLuongViSao = (prompt.match(/- Vì sao:/g) || []).length;
    expect(soLuongViSao).toBe(TOAN_CLASSROOM_MOVES.length);
  });

  // Ngưỡng độ dài được kiểm ở "mọi biến thể theo loại đều dưới ngưỡng 7000 ký tự" bên dưới:
  // useLessonCreator LUÔN gọi kèm loại kế hoạch, nên bản đầy đủ (không lọc) không bao giờ
  // được gửi cho AI — đo độ dài của nó không nói lên điều gì về token thực tế tốn.

  it('lọc được tập con khi cần', () => {
    const nho = buildToanClassroomMovesPrompt(
      undefined,
      TOAN_CLASSROOM_MOVES.filter((m) => m.nhom === 'phan-hoa'),
    );
    expect(nho).toContain('Hạ cánh mềm');
    expect(nho).not.toContain('Quét Radar');
  });
});

describe('lọc nước đi theo loại kế hoạch', () => {
  it('tiết LUYỆN TẬP có đủ bộ ba xử lý chọn sai lộ trình', () => {
    const p = buildToanClassroomMovesPrompt('luyen_tap');
    expect(p).toContain('Hạ cánh mềm');
    expect(p).toContain('Nâng cấp tại chỗ');
    expect(p).toContain('HS tự chọn lộ trình');
  });

  it('tiết HÌNH THÀNH KIẾN THỨC KHÔNG dính nước đi tự-chọn-lộ-trình', () => {
    // Khung này chia NHÓM ĐỒNG MỨC do GV gán — nhét cơ chế tự chọn vào là mâu thuẫn mô hình.
    const p = buildToanClassroomMovesPrompt('kien_thuc');
    expect(p).not.toContain('Hạ cánh mềm');
    expect(p).not.toContain('HS tự chọn lộ trình');
    // nhưng phải có dự phòng đặc thù của nó
    expect(p).toContain('Lớp không tự rút ra được công thức');
  });

  it('tiết ĐẢO NGƯỢC có dự phòng HS không chuẩn bị ở nhà và lớp im khi tranh biện', () => {
    const p = buildToanClassroomMovesPrompt('dao_nguoc');
    expect(p).toContain('HS không xem video');
    expect(p).toContain('Không ai phản biện');
    expect(p).not.toContain('Hạ cánh mềm');
  });

  it('nước đi dùng chung xuất hiện ở cả ba loại', () => {
    for (const kh of ['kien_thuc', 'luyen_tap', 'dao_nguoc'] as const) {
      const p = buildToanClassroomMovesPrompt(kh);
      expect(p, kh).toContain('Kỹ thuật chờ hai nhịp');
      expect(p, kh).toContain('Quét Radar');
      expect(p, kh).toContain('Khẩu lệnh kéo lớp về');
    }
  });

  it('mọi biến thể theo loại đều dưới ngưỡng 7000 ký tự', () => {
    // Đây là PHANH CHỐNG PHÌNH DẦN, không phải giới hạn kỹ thuật của model.
    // Đo thực tế 2026-07: kien_thuc 4477 · dao_nguoc 5619 · luyen_tap 5971 ký tự.
    // Đặt cạnh các mảnh khác của prompt tiết luyện tập (tổng ~22.700 ký tự): khung chung
    // 11.218 (49%) · thư viện 5.971 (26%) · khung kế hoạch 3.771 (17%) · yêu cầu riêng 1.715 (8%).
    // Ngưỡng cũ 6000 chỉ còn dư 29 ký tự cho luyen_tap — thêm một nước đi là đỏ, nên nới lên 7000.
    // Lưu ý: ký tự chỉ là chỉ dấu THÔ; cái thực sự tốn là token (tiếng Việt ~2,2–2,8 ký tự/token,
    // nên 7000 ký tự ≈ 2.500–3.200 token). Nếu thư viện vượt ~20 nước đi thì đừng nới tiếp —
    // hãy đổi cách gửi: chỉ gửi "tên + khi nào" của tất cả, còn "cách làm + vì sao" chỉ gửi
    // cho 3–5 nước đi AI đã chọn.
    for (const kh of ['kien_thuc', 'luyen_tap', 'dao_nguoc'] as const) {
      expect(buildToanClassroomMovesPrompt(kh).length, kh).toBeLessThan(7000);
    }
  });
});

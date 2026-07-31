/**
 * Hồi quy cho 4 luật thêm 2026-07 — mỗi ca kiểm thử là một LỖI THẬT đã lọt qua cổng cũ
 * trong đợt rà 3 giáo án định hướng Bài 19 (PT đường thẳng) và phải sửa tay:
 *
 *  - time-continuity      : Tiết 2 hụt 3 phút (P35–P38 không hoạt động nào nhận);
 *                           Tiết 1 ghi "(5 phút, P1–P5)" trong khi P1→P5 chỉ có 4 phút.
 *  - board-content-filled : ô "Nội dung ghi bảng" của Khởi động Tiết 2 bỏ trống.
 *  - term-introduced      : Tiết 1 dùng VTCP / PT đoạn chắn / UNCLOS mà chưa giới thiệu.
 *  - no-duplicate-block   : Tiết 1 lặp nguyên khối nháp trong cùng một ô.
 *
 * Nếu ai đó nới lỏng các luật này, test phải đỏ.
 */
import { describe, it, expect } from 'vitest';
import { auditMathStandards } from './mathStandards';

const findingOf = (content: string, id: string) => {
  const { findings } = auditMathStandards(content);
  const f = findings.find((x) => x.id === id);
  if (!f) throw new Error(`Không tìm thấy finding "${id}"`);
  return f;
};

describe('time-continuity', () => {
  it('BẮT khoảng hở giữa hai hoạt động (lỗi thật Tiết 2: P35–P38 bỏ trống)', () => {
    const content = `
| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P0 – P5 | Khởi động | Ôn tập nhanh |
| P5 – P7 | Mục tiêu | Mục tiêu tiết |
| P7 – P35 | Hoạt động chính | Đáp án |
| P38 – P40 | Sơ kết | Exit ticket |
`;
    const f = findingOf(content, 'time-continuity');
    expect(f.status).toBe('fail');
    expect(f.evidence).toMatch(/hở 3 phút giữa P35 và P38/);
  });

  it('BẮT thời lượng ở heading không khớp mốc (lỗi thật: "(5 phút, P1–P5)")', () => {
    const content = `
### 1. KHỞI ĐỘNG — Bài toán mở đầu (5 phút, P1–P5)
| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P1 – P5 | Khởi động | Ôn tập |
`;
    const f = findingOf(content, 'time-continuity');
    expect(f.status).toBe('fail');
    expect(f.evidence).toMatch(/mốc chỉ dài 4 phút/);
  });

  it('BẮT tiết chưa phủ kín 40 phút', () => {
    const content = `
| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P0 – P5 | Khởi động | Ôn tập |
| P5 – P30 | Hoạt động | Đáp án |
`;
    const f = findingOf(content, 'time-continuity');
    expect(f.status).toBe('fail');
    expect(f.evidence).toMatch(/chưa phủ kín P40/);
  });

  it('ĐẠT khi các mốc nối liền P0→P40 và khớp thời lượng', () => {
    const content = `
### 1. KHỞI ĐỘNG (5 phút, P0–P5)
### 2. HOẠT ĐỘNG CHÍNH (30 phút, P5–P35)
### 3. SƠ KẾT (5 phút, P35–P40)
| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P0 – P5 | Khởi động | Ôn tập nhanh |
| P5 – P35 | Hoạt động chính | Đáp án đầy đủ |
| P35 – P40 | Sơ kết | Exit ticket |
`;
    const f = findingOf(content, 'time-continuity');
    expect(f.status).toBe('pass');
  });
});

describe('board-content-filled', () => {
  it('BẮT ô "Nội dung ghi bảng" bỏ trống (lỗi thật Tiết 2 phần Khởi động)', () => {
    const content = `
| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P0 – P5 | GV chiếu 2 lỗi phổ biến, HS giơ bảng con |  |
| P5 – P7 | GV nêu mục tiêu | MỤC TIÊU: luyện lập PT TQ |
`;
    const f = findingOf(content, 'board-content-filled');
    expect(f.status).toBe('fail');
    expect(f.evidence).toMatch(/1\/2 hàng/);
  });

  it('ĐẠT khi mọi hàng đều có nội dung ghi bảng', () => {
    const content = `
| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P0 – P5 | GV chiếu bài toán mở đầu | ÔN TẬP NHANH: VTPT đọc từ hệ số a, b |
`;
    const f = findingOf(content, 'board-content-filled');
    expect(f.status).toBe('pass');
  });
});

describe('term-introduced', () => {
  it('BẮT dùng vectơ chỉ phương mà không giới thiệu (lỗi thật Tiết 1)', () => {
    const content = 'Tìm VTPT vuông góc với vectơ chỉ phương rồi lập phương trình tổng quát.';
    const f = findingOf(content, 'term-introduced');
    expect(f.status).toBe('fail');
    expect(f.evidence).toMatch(/vectơ chỉ phương/);
  });

  it('BẮT dùng UNCLOS như thuật ngữ quen thuộc (lỗi thật Tiết 1)', () => {
    const content = 'GV chiếu bản đồ biên giới biển quốc tế UNCLOS và nêu tình huống tàu cá.';
    const f = findingOf(content, 'term-introduced');
    expect(f.status).toBe('fail');
    expect(f.evidence).toMatch(/UNCLOS/);
  });

  it('ĐẠT khi thuật ngữ được giới thiệu tường minh trước khi dùng', () => {
    const content =
      'Thuật ngữ Toán học mới: vectơ chỉ phương (VTCP) là vectơ có giá song song hoặc trùng với đường thẳng. Sau đó HS dùng VTCP để lập phương trình.';
    const f = findingOf(content, 'term-introduced');
    expect(f.status).toBe('pass');
  });

  it('ĐẠT khi không dùng thuật ngữ vượt phạm vi tiết', () => {
    const content = 'Tiết này chỉ lập phương trình tổng quát từ một điểm và một vectơ pháp tuyến.';
    const f = findingOf(content, 'term-introduced');
    expect(f.status).toBe('pass');
  });
});

describe('no-duplicate-block', () => {
  // Khối nháp thật đã bị nhân đôi trong ô "Giáo viên và Học sinh" của Khởi động Tiết 1.
  const draftBlock =
    'GV đặt câu hỏi thiết yếu – giữ nguyên suốt cả tiết: "Làm thế nào biểu diễn một đường thẳng bất kỳ trên mặt phẳng tọa độ bằng một đẳng thức đại số duy nhất?" ' +
    'GV nêu bài toán cụ thể: "Trạm kiểm soát môi trường M(x;y) nằm trên đoạn đường AB. M phải thỏa điều kiện gì về tọa độ?" ' +
    'HS: Quan sát, đưa ra ý kiến ban đầu (có thể nhắc đến vectơ, sự thẳng hàng...). GV ghi nhận, chưa chốt – dẫn dắt vào bài.';

  it('BẮT khối nội dung lặp nguyên văn (lỗi thật Tiết 1: nháp + bản hoàn chỉnh cùng một ô)', () => {
    const content = `${draftBlock}\n\nMột đoạn khác xen giữa để tách hai bản.\n\n${draftBlock}`;
    const f = findingOf(content, 'no-duplicate-block');
    expect(f.status).toBe('fail');
  });

  it('BẮT được cả khi hai bản lệch pha (không cách nhau bội số bước quét)', () => {
    const content = `${draftBlock}\n\nxenxen.\n\n${draftBlock}`;
    const f = findingOf(content, 'no-duplicate-block');
    expect(f.status).toBe('fail');
  });

  it('KHÔNG báo nhầm khi câu hỏi cốt lõi được nhắc lại hợp lệ ở cuối tiết', () => {
    const essential =
      '"Làm thế nào biểu diễn một đường thẳng bất kỳ trên mặt phẳng tọa độ bằng một đẳng thức đại số duy nhất?"';
    const content =
      `GV nêu câu hỏi thiết yếu: ${essential} Sau đó HS làm bài tập nhóm theo ba mức và trình bày kết quả.\n\n` +
      `Cuối tiết GV quay lại câu hỏi thiết yếu: ${essential} HS trả lời và tự đánh giá mục tiêu.`;
    const f = findingOf(content, 'no-duplicate-block');
    expect(f.status).toBe('pass');
  });

  it('ĐẠT khi không có khối lặp', () => {
    const content =
      'GV nêu bài toán mở đầu về đường thẳng đi qua hai thành phố. HS thảo luận cặp đôi rồi trình bày kết quả trước lớp, giáo viên chuẩn hóa lời giải cuối cùng trên bảng.';
    const f = findingOf(content, 'no-duplicate-block');
    expect(f.status).toBe('pass');
  });
});

describe('self-selection-fallback', () => {
  it('BẮT tiết cho HS tự chọn mà thiếu kịch bản chọn sai', () => {
    const content =
      'HS TỰ CHỦ đánh giá năng lực và tự rút Lộ trình 1 hoặc Lộ trình 2 từ folder giữa bàn. ' +
      'GV di chuyển quan sát, không giải thay.';
    const f = findingOf(content, 'self-selection-fallback');
    expect(f.status).toBe('fail');
    expect(f.evidence).toMatch(/QUÁ SỨC/);
    expect(f.evidence).toMatch(/DƯỚI SỨC/);
  });

  it('BẮT khi chỉ có một chiều (thiếu chiều chọn dưới sức)', () => {
    const content =
      'HS tự chọn Lộ trình 1 hoặc 2. Nếu HS chọn quá sức và bế tắc sau 3 phút, GV hạ cánh mềm: ' +
      'không thu lại phiếu mà mời em nhận nhiệm vụ khác.';
    const f = findingOf(content, 'self-selection-fallback');
    expect(f.status).toBe('fail');
    expect(f.evidence).toMatch(/DƯỚI SỨC/);
  });

  it('ĐẠT khi có đủ hai chiều (giống giáo án Tiết 2 do GV soạn tay)', () => {
    const content =
      'HS tự rút thẻ Lộ trình 1 hoặc Lộ trình 2. ' +
      'Kịch bản 1 — HS chọn quá sức, ngồi cắn bút sau 3 phút: GV hạ cánh mềm, không thu lại phiếu. ' +
      'Kịch bản 2 — HS giỏi chọn dưới sức, xong quá nhanh: GV nâng cấp tại chỗ bằng câu hỏi mở rộng.';
    const f = findingOf(content, 'self-selection-fallback');
    expect(f.status).toBe('pass');
  });

  it('KHÔNG đòi hỏi gì khi tiết không có cơ chế tự chọn', () => {
    const content = 'GV chia nhóm đồng mức NB/TH/VD và giao nhiệm vụ tương ứng cho từng nhóm.';
    const f = findingOf(content, 'self-selection-fallback');
    expect(f.status).toBe('pass');
    expect(f.evidence).toMatch(/không có cơ chế/);
  });
});

describe('self-selection-fallback — KHÔNG báo nhầm', () => {
  // Trục Sản phẩm của Tomlinson cho HS chọn CÁCH THỂ HIỆN — hợp lệ, không cần kịch bản dự phòng.
  it.each([
    'HS được tự chọn cách thể hiện sản phẩm: bảng con, giấy A3 hoặc trình bày miệng.',
    'HS tự chọn làm việc cá nhân hoặc ngồi cặp đôi tùy phong cách học tập.',
  ])('bỏ qua khi chỉ là chọn hình thức: %s', (content) => {
    expect(findingOf(content, 'self-selection-fallback').status).toBe('pass');
  });

  it('vẫn BẮT khi tự chọn theo phiếu Tic-Tac-Toe mà thiếu dự phòng', () => {
    const content = 'HS chọn 1 hàng/cột/chéo trong phiếu Tic-Tac-Toe 3x3 rồi làm trong 12 phút.';
    expect(findingOf(content, 'self-selection-fallback').status).toBe('fail');
  });
});

describe('group-model-coherence', () => {
  it('BẮT trộn mảnh ghép với trạm quay vòng (lỗi thật Tiết 3)', () => {
    const content =
      'Chia lớp thành 3 nhóm chuyên gia theo kỹ thuật mảnh ghép. ' +
      'Trong tiết, HS di chuyển qua cả 3 Trạm (A → B → C), mỗi trạm nghe chuyên gia trình bày.';
    const f = findingOf(content, 'group-model-coherence');
    expect(f.status).toBe('fail');
    expect(f.evidence).toMatch(/không chạy đồng thời/);
  });

  it('ĐẠT khi chỉ dùng mảnh ghép', () => {
    const content =
      'Chia 3 nhóm chuyên gia A/B/C theo mảnh ghép; vào tiết ghép thành nhóm hỗn hợp, ' +
      'mỗi bạn trình bày mảng của mình ngay trong nhóm.';
    expect(findingOf(content, 'group-model-coherence').status).toBe('pass');
  });

  it('ĐẠT khi chỉ dùng trạm quay vòng', () => {
    const content =
      'Lớp chia 3 trạm học tập, các nhóm luân phiên đi qua trạm A, trạm B, trạm C theo hiệu lệnh.';
    expect(findingOf(content, 'group-model-coherence').status).toBe('pass');
  });

  it('"Trạm Giáo viên" (bàn hỗ trợ) KHÔNG bị tính là trạm quay vòng', () => {
    const content =
      'Nhóm chuyên gia theo mảnh ghép. GV ngồi tại Trạm Giáo viên hỗ trợ HS chậm, ' +
      'di chuyển quan sát vòng quanh lớp.';
    expect(findingOf(content, 'group-model-coherence').status).toBe('pass');
  });
});

/**
 * Bộ quy tắc chấm điểm của Tổ Toán THPT — bản lượng hóa.
 *
 * NGUỒN: "chấm điểm dự giờ/Nguyên tắc chấm điểm Danielson - Tổ Toán.docx".
 *
 * Vì sao tách khỏi khungDanielson.ts: khung Danielson nói ĐIỀU GÌ được đánh
 * giá; file này nói CHẤM THẾ NÀO cho khỏi cảm tính. Hai thứ đổi độc lập —
 * trường có thể siết quy tắc chấm mà không đụng vào khung.
 */
import type { MaThanhTo } from './khungDanielson';

/** Thang điểm cho phép. Bước 0,5 chỉ hợp lệ khi có minh chứng chạm ngưỡng. */
export const MUC_DIEM = [1, 1.5, 2, 2.5, 3, 3.5, 4] as const;

/** Ý nghĩa 4 mức nguyên. Cốt lõi: AI LÀ NGƯỜI ĐANG LÀM VIỆC trong tiết học. */
export const Y_NGHIA_MUC: Record<1 | 2 | 3 | 4, { ten: string; tomTat: string; dauHieu: string; trietLy?: string }> = {
  1: {
    ten: 'Không đạt — Cảnh báo',
    tomTat: 'Lỗi chuyên môn',
    dauHieu:
      'GV dạy sai kiến thức Toán học, giải sai bài. Lớp học vô tổ chức hoặc GV có lời lẽ xúc phạm HS.',
  },
  2: {
    ten: 'Cơ bản — Lấy GV làm trung tâm',
    tomTat: 'Truyền thụ một chiều',
    dauHieu:
      'Tiết học diễn ra bình thường nhưng GV làm hết mọi việc. GV thuyết giảng, đặt câu hỏi đóng, tự trả lời, gọi 1 HS lên bảng giải, các HS khác chép thụ động.',
    trietLy: 'HS biết CÁCH LÀM (How) nhưng không hiểu TẠI SAO (Why).',
  },
  3: {
    ten: 'Thành thạo — Chuẩn mực Tổ Toán',
    tomTat: 'Tương tác đa chiều',
    dauHieu:
      'GV và HS cùng làm việc. GV khơi gợi, HS giải thích. HS làm việc nhóm, trao đổi, dùng nháp, dùng máy tính cầm tay/GeoGebra. GV không trả lời ngay mà hỏi ngược lại lớp.',
    trietLy: 'HS hiểu bản chất Toán học, GV là người thiết kế và dẫn dắt.',
  },
  4: {
    ten: 'Xuất sắc — Lấy HS làm trung tâm',
    tomTat: 'Trao quyền tuyệt đối',
    dauHieu:
      'HS tự vận hành. HS tự phát hiện lỗi sai trên bảng của bạn, tự đặt câu hỏi mở rộng bài toán, tự chấm chéo bằng rubric. Hiếm khi diễn ra toàn tiết — thường chỉ ở một hoạt động dự án hoặc thảo luận cấp cao.',
  },
};

/**
 * NGUYÊN TẮC CHẠM NGƯỠNG cho điểm lẻ 0,5.
 *
 * Tài liệu tổ Toán chỉ nêu tường minh 2,5 và 3,5 — hai ranh giới hay gặp.
 * 1,5 suy ra theo cùng một công thức: vững mức dưới + ít nhất một hành động
 * của mức trên. Ghi rõ ở đây để người sau biết chỗ nào là nguyên văn, chỗ nào
 * là suy luận theo cùng nguyên tắc.
 */
export const CHAM_NGUONG: Record<1.5 | 2.5 | 3.5, { dieuKien: string; congThem: string; viDu: string; nguyenVan: boolean }> = {
  1.5: {
    dieuKien: 'Đạt vững chắc 100% các tiêu chí của Mức 1.',
    congThem: 'Có ít nhất 1 hành động của Mức 2.',
    viDu: 'Tiết dạy còn sai sót chuyên môn nhưng GV đã tổ chức được lớp và trình bày mạch lạc một phần nội dung.',
    nguyenVan: false,
  },
  2.5: {
    dieuKien: 'Đạt vững chắc 100% các tiêu chí của Mức 2.',
    congThem: 'Có ít nhất 1 hành động của Mức 3.',
    viDu:
      'GV có chia nhóm cho HS thảo luận nhưng thời gian quá ngắn nên chưa ra kết quả; hoặc GV có đặt câu hỏi "Tại sao?" nhưng cuối cùng vẫn tự giải thích.',
    nguyenVan: true,
  },
  3.5: {
    dieuKien: 'Đạt vững chắc 100% các tiêu chí của Mức 3 (lớp học chất lượng, HS hiểu bài sâu).',
    congThem: 'Xuất hiện điểm sáng của Mức 4 DO HỌC SINH TỰ KHỞI XƯỚNG.',
    viDu:
      'Có 1-2 HS tự đứng lên phản biện cách giải của GV hoặc tự đề xuất một cách giải thông minh hơn.',
    nguyenVan: true,
  },
};

export const CANH_BAO_DIEM_LE =
  'Tuyệt đối không cho điểm lẻ dựa trên cảm giác "thấy tốt hơn bình thường một tí". Phải ghi được hành động cụ thể đã quan sát.';

/**
 * Lượng hóa Phần III — ba thành tố tổ trưởng đếm minh chứng ngay tại lớp.
 * Đây là phần khiến điểm Phần III kiểm chứng được thay vì cảm nhận.
 */
export const LUONG_HOA_PHAN_III: Partial<Record<MaThanhTo, { ten: string; doLuong: string; muc2: string; muc3: string; muc4: string }>> = {
  '3b': {
    ten: 'Đặt câu hỏi và thảo luận',
    doLuong: 'Đếm số lượng câu hỏi và người nói',
    muc2: 'Trên 80% câu hỏi của GV là câu hỏi đóng (Có/Không, "Bằng mấy?"). Chỉ GV và vài HS giỏi nói.',
    muc3: 'Có ít nhất 3 câu hỏi mở/"tại sao". GV dành ít nhất 3 giây chờ trước khi gọi. Có tương tác HS – HS.',
    muc4: 'HS tự đặt câu hỏi toán học mới hoặc tự thách đố nhau mà không cần GV yêu cầu.',
  },
  '3c': {
    ten: 'Thu hút học sinh',
    doLuong: 'Đo mức độ bận rộn về trí tuệ',
    muc2: 'Bài tập chỉ thuần lắp công thức – tính toán. HS làm xong ngồi chơi đợi chữa bài.',
    muc3: 'Bài tập phân hóa rõ rệt, có nhiệm vụ đòi hỏi tư duy phân tích. Khi 1 HS lên bảng, HS dưới lớp CÓ NHIỆM VỤ cụ thể.',
    muc4: 'HS tự chọn mức độ bài tập hoặc tự thiết kế bài toán thực tế; tranh luận kéo dài cả khi hết giờ.',
  },
  '3d': {
    ten: 'Sử dụng đánh giá trong lúc dạy',
    doLuong: 'Đo mức độ linh hoạt',
    muc2: 'GV chỉ hỏi "Các em hiểu chưa?". Lớp im lặng rồi dạy tiếp, không biết bao nhiêu em sai.',
    muc3: 'GV có công cụ quét cả lớp (bảng con, giơ tay, Kahoot/Quizizz) và DỪNG LẠI đổi nhịp khi thấy nhiều HS sai.',
    muc4: 'HS đối chiếu bài làm với barem và tự nhận ra lỗi của mình.',
  },
};

/** Ràng buộc riêng của Phần I khi chấm từ giáo án. */
export const QUY_TAC_PHAN_I = [
  'Chỉ cho điểm 3 nếu giáo án thể hiện rõ cột MỤC TIÊU PHÂN HÓA (HS yếu làm câu nào, HS giỏi làm câu nào).',
  'Chỉ cho điểm 3 nếu giáo án có CHUẨN BỊ TÌNH HUỐNG: dự kiến HS sai ở đâu và cách xử lý.',
  'Giáo án chỉ là bản copy-paste các năm trước: tối đa điểm 2.',
];

/**
 * Quy tắc tịnh tiến minh chứng — nối lần dự giờ này với lần trước.
 * Không tự động áp; giao diện chỉ nhắc người dự giờ đối chiếu và tự quyết.
 */
export const QUY_TAC_TINH_TIEN =
  'Nếu lần dự giờ trước đã nhận xét một trọng tâm cần cải thiện mà lần này GV không có bất kỳ hành động thay đổi nào, thì điểm Phần III và Phần IV lập tức hạ xuống Mức 2, bất kể tiết dạy trơn tru đến đâu.';

/** true khi điểm là mức lẻ 0,5 và do đó bắt buộc phải có minh chứng chạm ngưỡng. */
export function laDiemChamNguong(diem: number | null | undefined): diem is 1.5 | 2.5 | 3.5 {
  return typeof diem === 'number' && Math.abs(diem % 1) === 0.5;
}

import type { ToanKeHoach } from '../types';

/**
 * Format prompts cho loại giáo án "Giáo án ban Toán" (KHDH kiểu v13 — xem
 * outputs/khdh/build_v8_combined.js + tasks/session_khdh_bai19.md).
 *
 * HỢP ĐỒNG CẤU TRÚC (Pha 2 xuất Word có style dựa vào đúng các quy ước này):
 * - Bảng hoạt động 3 cột: `| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |`
 * - Bảng mục tiêu 2 cột với nhãn hàng đúng chữ: Cơ bản / Trọng tâm / Nâng cao
 * - Câu hỏi Socratic gắn nhãn `**[NHÃN]**` từ danh sách đóng
 * → Đổi các chuỗi này là VỠ nhận diện style khi xuất Word.
 */

export const TOAN_COMMON_FORMAT = `
===== MẪU KẾ HOẠCH DẠY HỌC BAN TOÁN — KHDH SOCRATIC PHÂN HÓA (BẮT BUỘC TUÂN THỦ) =====

Đây là KẾ HOẠCH DẠY HỌC 1 TIẾT (40 phút) môn Toán theo phương pháp Socratic + phân hóa 3 mức Trung bình/Khá/Giỏi. Soạn CHỈ MỘT tiết theo đúng kế hoạch bài dạy được chỉ định bên dưới.

A. KHUNG TÀI LIỆU (đúng thứ tự, đúng tên heading):

# KẾ HOẠCH DẠY HỌC — [Tên bài] (Tiết [N]: [Tên kế hoạch bài dạy])

## I. THÔNG TIN CHUNG
- Môn: Toán · Lớp: [lớp] · Thời lượng: 40 phút · Tuần: [tuần]
- Năng lực cốt lõi hướng tới (chọn 2-3): Tư duy và lập luận toán học, Mô hình hóa toán học, Giao tiếp toán học, Giải quyết vấn đề toán học, Sử dụng công cụ học toán.
- Căn cứ điều chỉnh từ tiết trước: [1-2 dòng — lỗi phổ biến HS mắc, mức độ nắm bài]

## II. MỤC TIÊU
BẮT BUỘC là bảng 2 cột với ĐÚNG 3 hàng, nhãn hàng đúng chữ "Cơ bản"/"Trọng tâm"/"Nâng cao", mỗi mục tiêu kết thúc bằng thẻ Bloom:
| Mức độ | Mục tiêu |
|---|---|
| Cơ bản | [mục tiêu tối thiểu mọi HS đạt] [Bloom: Nhớ – Hiểu] |
| Trọng tâm | [mục tiêu chính của tiết] [Bloom: Áp dụng] |
| Nâng cao | [mục tiêu thử thách] [Bloom: Phân tích – Sáng tạo] |

## III. PHÂN HÓA MỤC TIÊU
Bảng 4 cột, mỗi hàng ứng 1 mục tiêu ở trên:
| Mục tiêu | Mức Trung bình | Mức Khá | Mức Giỏi |
|---|---|---|---|

## IV. TIẾN TRÌNH HOẠT ĐỘNG (40 phút)
[Các hoạt động theo kế hoạch bài dạy chỉ định — xem mục C bên dưới]

## HƯỚNG DẪN VỀ NHÀ (BTVN)
Phân hóa 3 mức: nhiệm vụ Mức TB (bắt buộc) / Mức Khá / Mức Giỏi (thử thách), kèm đáp số hoặc gợi ý ngắn.

## SƠ KẾT / RÚT KINH NGHIỆM
- Exit ticket 1-2 câu (kèm đáp án) + sơ đồ chốt kiến thức dạng liệt kê nhánh.
- 2-3 dòng GV tự rút kinh nghiệm dự kiến.

B. QUY TẮC TRÌNH BÀY HOẠT ĐỘNG (TUYỆT ĐỐI TUÂN THỦ):

1. MỖI hoạt động là heading "## HOẠT ĐỘNG [n]: [TÊN] (~[x] phút)" theo sau là ĐÚNG bảng 3 cột:
| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
   - Cột "Thời gian": mốc ngắn gọn (vd "P1–P5"). Cột này hẹp — KHÔNG viết câu dài.
   - Cột "Giáo viên và Học sinh": kịch bản đối thoại GV↔HS, câu hỏi Socratic, kỹ thuật chờ ("Chờ ≥ 3 giây, gọi ngẫu nhiên, không tự trả lời"), scaffold cho HS yếu.
   - Cột "Nội dung ghi bảng": định nghĩa/công thức/lời giải mẫu HS chép vở — KHÔNG để trống, KHÔNG lẫn lời thoại.
   - Mỗi lượt trao đổi GV↔HS = 1 hàng riêng. KHÔNG dùng <br/><br/> gộp nhiều lượt vào 1 hàng.

2. NHÃN CÂU HỎI SOCRATIC: câu hỏi dẫn dắt trong cột "Giáo viên và Học sinh" PHẢI mở đầu bằng nhãn in đậm từ danh sách đóng này (không tự chế nhãn khác):
   **[PHÁT HIỆN]** · **[SO SÁNH]** · **[DỰ ĐOÁN]** · **[PHẢN VÍ DỤ]** · **[KHÁI QUÁT]** · **[VÌ SAO]**
   Ví dụ: **[PHÁT HIỆN]** Em có nhận xét gì về phương của vectơ $\\vec{n}$ so với đường thẳng $\\Delta$?

3. PHÂN HÓA TRONG HOẠT ĐỘNG: khi giao nhiệm vụ, tách rõ 3 khối "### Mức TB" / "### Mức Khá" / "### Mức Giỏi" (hoặc gắn nhãn **Mức TB:** trong ô bảng), mỗi mức có đề bài + lời giải/đáp số ở cột 3. Mức TB phải có scaffold từng bước; Mức Giỏi là câu chứng minh/mở rộng.

4. DỰ KIẾN KHÓ KHĂN: mỗi hoạt động chính có 1 dòng "→ Dự kiến khó khăn: [lỗi HS hay mắc + cách GV bẫy sớm]".

C. QUY TẮC CÔNG THỨC TOÁN (TUYỆT ĐỐI):
- Công thức trong dòng: $...$ (vd $ax+by+c=0$, $\\vec{n}(a;b)$, $M_0(x_0;y_0)$).
- Công thức đứng riêng: $$...$$.
- MỌI ký hiệu toán (vectơ, chỉ số dưới, phân số, căn...) phải nằm trong $...$ — TUYỆT ĐỐI KHÔNG viết ký tự Unicode giả (n⃗, x₀, √2) ngoài công thức.
- KHÔNG dùng ký tự "|" trong công thức (vỡ bảng) — dùng \\mid.
- Tiếng Việt gõ liền mạch chuẩn, không tách rời dấu.
===== HẾT MẪU CHUNG =====
`;

const TOAN_KIEN_THUC = `
===== KẾ HOẠCH BÀI DẠY ĐƯỢC CHỈ ĐỊNH: TIẾT HÌNH THÀNH KIẾN THỨC =====
Mục IV. TIẾN TRÌNH gồm ĐÚNG các hoạt động sau (mỗi cái 1 bảng 3 cột như quy tắc B):

## HOẠT ĐỘNG 1: KHỞI ĐỘNG (~5 phút)
- Bài toán thực tế/tình huống có vấn đề gắn trực tiếp với kiến thức mới (không phải kiểm tra bài cũ suông); 2-3 câu hỏi tái hiện kiến thức nền cần dùng.

## HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC (~15 phút)
- Chuỗi Socratic TỐI THIỂU 6 câu hỏi gắn nhãn **[NHÃN]** dẫn HS TỰ khám phá ra định nghĩa/công thức mới (quan sát → so sánh → dự đoán → kiểm chứng → khái quát), tuyệt đối không thuyết trình một chiều.
- Chốt kiến thức: định nghĩa/công thức chính thức ở cột "Nội dung ghi bảng" (dạng $$...$$), kèm 1 ví dụ nhận diện nhanh.

## HOẠT ĐỘNG 3: LUYỆN TẬP PHÂN HÓA (~12 phút)
- 3 khối "### Mức TB" (có scaffold từng bước) / "### Mức Khá" / "### Mức Giỏi" (chứng minh/mở rộng), mỗi khối 1 bài + lời giải đầy đủ ở cột 3.

## HOẠT ĐỘNG 4: MỞ RỘNG / VẬN DỤNG THỰC TẾ (~5 phút)
- 1 bài toán bối cảnh thực tế đặt HS vào vai chuyên gia (kỹ sư/nhà quy hoạch...), có bước MÔ HÌNH HÓA (câu hỏi **[PHÁT HIỆN]** trước khi tính).

## HOẠT ĐỘNG 5: SƠ KẾT (~3 phút)
- Chốt sơ đồ kiến thức + exit ticket (nội dung chi tiết đặt ở mục SƠ KẾT / RÚT KINH NGHIỆM).
===== HẾT KẾ HOẠCH CHỈ ĐỊNH =====
`;

const TOAN_LUYEN_TAP = `
===== KẾ HOẠCH BÀI DẠY ĐƯỢC CHỈ ĐỊNH: TIẾT LUYỆN TẬP / HÌNH THÀNH KỸ NĂNG =====
Tiết này KHÔNG dạy kiến thức mới — chỉ luyện kỹ năng của kiến thức đã học. Mục IV. TIẾN TRÌNH gồm:

## HOẠT ĐỘNG 1: TÁI HIỆN KIẾN THỨC (~5 phút)
- 3-4 câu hỏi nhanh gắn nhãn **[NHÃN]** giúp HS tự nhắc lại công thức/quy trình cốt lõi; bảng tóm tắt công thức ở cột "Nội dung ghi bảng".

## HOẠT ĐỘNG 2: HÌNH THÀNH KỸ NĂNG QUA PHÂN TÍCH LỖI SAI (~12 phút)
- 1-2 bài mẫu GV-HS cùng giải theo quy trình chuẩn từng bước.
- BẮT BUỘC có 1 "bài giải sai cài sẵn" (lỗi phổ biến, vd nhầm dấu): HS đóng vai người chấm, tìm lỗi và sửa — dùng **[PHẢN VÍ DỤ]** / **[VÌ SAO]**.

## HOẠT ĐỘNG 3: TIC-TAC-TOE PHÂN HÓA (~18 phút)
- Bảng markdown 3×3: 9 ô nhiệm vụ đánh mã "NB-1..3" (Nhận biết), "TH-1..3" (Thông hiểu), "VD-1..3" (Vận dụng), bố trí sao cho mọi đường thẳng 3 ô đều trộn mức độ.
- Luật chơi ghi rõ: HS/cặp chọn 1 đường 3 ô để hoàn thành; xong sớm chọn thêm đường khác.
- Sau bảng: TỪNG Ô có đề bài đầy đủ + lời giải chi tiết + đáp số (đặt trong bảng 3 cột hoạt động, lời giải ở cột "Nội dung ghi bảng").

## HOẠT ĐỘNG 4: SƠ KẾT (~5 phút)
- Tổng kết các dạng bài + lỗi cần tránh; exit ticket.
===== HẾT KẾ HOẠCH CHỈ ĐỊNH =====
`;

const TOAN_DAO_NGUOC = `
===== KẾ HOẠCH BÀI DẠY ĐƯỢC CHỈ ĐỊNH: TIẾT LỚP HỌC ĐẢO NGƯỢC / JIGSAW =====
Tiết ôn tập/hệ thống hóa bằng lớp học đảo ngược + kỹ thuật mảnh ghép. Cấu trúc mục IV:

## TRƯỚC GIỜ HỌC (giao trước 1-2 ngày)
- Học liệu HS tự học ở nhà (mục SGK/video cần xem) + 3 câu hỏi kiểm soát tự học (kèm đáp án để GV đối chiếu). Phần này KHÔNG cần bảng 3 cột — dùng danh sách.

## HOẠT ĐỘNG 1: KIỂM TRA CHUẨN BỊ (~5 phút)
- Quick-check 2-3 câu từ phần tự học; xử lý HS chưa chuẩn bị (ghép cặp hỗ trợ).

## HOẠT ĐỘNG 2: NHÓM CHUYÊN GIA — JIGSAW VÒNG 1 (~12 phút)
- Chia 3 nhóm chuyên gia, mỗi nhóm 1 mảng kiến thức. Với TỪNG nhóm viết khối "### Nhóm chuyên gia [A/B/C]: [tên mảng]" gồm: nhiệm vụ đào sâu + 2 câu hỏi **[NHÃN]** định hướng + sản phẩm phải chuẩn bị để đi dạy lại (bảng tóm tắt/ví dụ mẫu, ghi ở cột "Nội dung ghi bảng").

## HOẠT ĐỘNG 3: VÒNG GHÉP — CHIA SẺ CHÉO (~12 phút)
- Trộn nhóm (mỗi nhóm mới đủ chuyên gia A+B+C), mỗi chuyên gia dạy lại mảng của mình trong 3 phút; nhóm hoàn thành 1 nhiệm vụ tổng hợp cần kiến thức CẢ 3 mảng (đề + lời giải ở cột 3).

## HOẠT ĐỘNG 4: TỔNG HỢP & LUYỆN TẬP CHUNG (~8 phút)
- Sơ đồ hệ thống hóa toàn bài (dạng nhánh) + 2 bài luyện nhanh phân hóa (TB bắt buộc, Giỏi thử thách) kèm đáp án.

## HOẠT ĐỘNG 5: SƠ KẾT (~3 phút)
- Exit ticket + tự đánh giá mức độ nắm từng mảng.
===== HẾT KẾ HOẠCH CHỈ ĐỊNH =====
`;

export const TOAN_KE_HOACH_FORMATS: Record<ToanKeHoach, string> = {
  kien_thuc: TOAN_KIEN_THUC,
  luyen_tap: TOAN_LUYEN_TAP,
  dao_nguoc: TOAN_DAO_NGUOC,
};

export const TOAN_KE_HOACH_LABELS: Record<ToanKeHoach, string> = {
  kien_thuc: 'Hình thành kiến thức',
  luyen_tap: 'Luyện tập',
  dao_nguoc: 'Đảo ngược / Jigsaw',
};

/** Khối củng cố + few-shot cho additionalRequirements (thay khối Dewey/Danielson). */
export const TOAN_ADDITIONAL_REQUIREMENTS = `===== YÊU CẦU RIÊNG CHO GIÁO ÁN BAN TOÁN (TUYỆT ĐỐI TUÂN THỦ) =====
- Soạn ĐÚNG MỘT tiết theo kế hoạch bài dạy đã chỉ định trong mẫu — không gộp nhiều tiết, không thêm hoạt động ngoài kế hoạch.
- Bảng hoạt động dùng ĐÚNG header 3 cột: | Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
- KHÔNG dùng khung Dewey/WALT-WILF/Danielson trong loại giáo án này.
- Nội dung toán phải THẬT và đúng chương trình: số liệu cụ thể, lời giải tính ra kết quả cuối, không placeholder.

VÍ DỤ MẪU MỘT HÀNG BẢNG HOẠT ĐỘNG (BẮT CHƯỚC PHONG CÁCH NÀY):
\`\`\`markdown
| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P6–P9 | **[PHÁT HIỆN]** GV vẽ đường thẳng $\\Delta$ và vectơ $\\vec{n} \\ne \\vec{0}$ có giá vuông góc với $\\Delta$: "Em có nhận xét gì về phương của $\\vec{n}$ so với $\\Delta$?" → Chờ ≥ 3 giây, gọi ngẫu nhiên. HS: "Giá của $\\vec{n}$ vuông góc với $\\Delta$." | **Định nghĩa:** Vectơ $\\vec{n} \\ne \\vec{0}$ là vectơ pháp tuyến của $\\Delta$ nếu giá của $\\vec{n}$ vuông góc với $\\Delta$. |
\`\`\`
===== HẾT YÊU CẦU RIÊNG =====`;

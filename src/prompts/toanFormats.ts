import type { ToanKeHoach } from '../types';

/**
 * Format prompts cho loại giáo án "Giáo án ban Toán" — bám sát bản mẫu vàng KHDH v13
 * (nguồn thiết kế: khdh_final.md + build_v8_combined.js của phiên cowork, xem
 * tasks/session_khdh_bai19.md).
 *
 * HỢP ĐỒNG CẤU TRÚC (Pha 2 xuất Word có style nhận diện đúng các chuỗi này):
 * - Bảng hoạt động 3 cột: `| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |`
 * - Bảng mục tiêu có nhãn hàng đúng chữ: Cơ bản / Trọng tâm / Nâng cao
 * - Câu hỏi gắn nhãn `**[NHÃN VIẾT HOA]**`
 * → Đổi các chuỗi này là VỠ nhận diện style khi xuất Word (có test chặn).
 */

export const TOAN_COMMON_FORMAT = `
===== MẪU KẾ HOẠCH DẠY HỌC BAN TOÁN — KHDH SOCRATIC PHÂN HÓA (BẮT BUỘC TUÂN THỦ TUYỆT ĐỐI) =====

Soạn KẾ HOẠCH DẠY HỌC cho ĐÚNG MỘT TIẾT (40 phút) môn Toán theo kế hoạch bài dạy được chỉ định bên dưới. Triết lý: GV KHÔNG giảng một chiều — dẫn dắt bằng câu hỏi Socratic, HS tự khám phá; phân hóa mọi nhiệm vụ theo 3 mức; mọi hoạt động có mốc thời gian phút cụ thể.

A. KHUNG TÀI LIỆU (đúng thứ tự, đúng tên heading):

# KẾ HOẠCH DẠY HỌC — [Tên bài] (Tiết [N]: [Tên kế hoạch bài dạy])

Ngay dưới tiêu đề: bảng thông tin hành chính 6 cột:
| Lớp | [lớp] | Tên bài học | [tên bài — Tiết N: tên kế hoạch] | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | [tuần] | Năm học | [năm học hiện tại] |

## I. THÔNG TIN CHUNG
**1. Tiêu chuẩn năng lực cốt lõi** — danh sách ✓ chọn 3-5 năng lực đúng với tiết này (Tư duy và lập luận toán học / Mô hình hóa toán học / Giải quyết vấn đề toán học / Giao tiếp toán học / Sử dụng công cụ học toán / Tự học tự nghiên cứu).

**2. Mục tiêu học tập** — mở đầu "Sau tiết học, tôi có thể:" rồi bảng 3 hàng, nhãn hàng ĐÚNG CHỮ, mỗi mục tiêu đo được + thẻ Bloom:
| Mức độ | Mục tiêu |
|---|---|
| Cơ bản | [mọi HS đạt — động từ đo được: mô tả/lập/nhận biết...] [Bloom: Nhớ – Hiểu] |
| Trọng tâm | [mục tiêu chính tiết học] [Bloom: Áp dụng] |
| Nâng cao | [thử thách: chứng minh/thiết kế/liên hệ] [Bloom: Phân tích – Sáng tạo] |

**3. Phân hóa mục tiêu** — bảng:
| Mức Trung bình | Mức Khá | Mức Giỏi |
|---|---|---|
| [nhiệm vụ cụ thể + bài SGK] | [nhiệm vụ + bài SGK] | [bài nâng cao/chứng minh/tự thiết kế] |

**4. Tài liệu dạy học** — SGK (kèm trang), phiếu học tập cần in (đặt tên rõ: "Phiếu số 1 — ..."), bảng con/bút lông, học liệu số.

**Căn cứ điều chỉnh từ đánh giá tiết trước:** 3-4 gạch đầu dòng GIẢ ĐỊNH THỰC TẾ (vd "70% nắm X; 40% nhầm Y") và mũi tên → hành động điều chỉnh trong tiết này. KHÔNG viết chung chung.

## II. TIẾN TRÌNH HOẠT ĐỘNG
[Các hoạt động theo kế hoạch chỉ định — mục C. Heading mỗi hoạt động PHẢI kèm thời lượng + mốc phút: "### 1. KHỞI ĐỘNG — [tên] (5 phút, P1–P5)". Tổng các mốc phủ kín P1–P40.]

## HƯỚNG DẪN VỀ NHÀ (BTVN)
Đúng 4 dòng phân tầng:
- **HS yếu/TB:** [bài SGK cụ thể + ôn gì]
- **HS khá:** [bài SGK cụ thể]
- **HS giỏi:** [bài khó/chứng minh/đọc thêm "Em có biết?"]
- **Toàn lớp:** [chuẩn bị tiết sau: video/phiếu chuẩn bị]

## SƠ KẾT / RÚT KINH NGHIỆM
- Exit ticket đúng format 2 dòng điền: "✓ [ý 1]: ___________" / "? [ý 2]: ___________".
- 2-3 dòng dự kiến rút kinh nghiệm của GV.

B. QUY TẮC TRÌNH BÀY HOẠT ĐỘNG (TUYỆT ĐỐI TUÂN THỦ):

1. MỖI hoạt động là 1 bảng ĐÚNG 3 cột:
| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
   - Cột "Thời gian": chỉ mốc phút "P8–P25" — KHÔNG viết câu.
   - Cột "Giáo viên và Học sinh": kịch bản chi tiết — lời GV trong ngoặc kép, câu hỏi gắn nhãn, nhiệm vụ phân hóa, kỹ thuật sư phạm.
   - Cột "Nội dung ghi bảng": ĐÚNG những gì hiện trên bảng để HS chép vở — định nghĩa/công thức ($$...$$), **Đáp án** từng nhiệm vụ (tính ra KẾT QUẢ CUỐI, không bỏ lửng), và dòng "⚠ Lỗi phổ biến: [lỗi + cách nhớ]" khi có bẫy. KHÔNG để trống, KHÔNG lẫn lời thoại.

2. CÁC PHA TRONG HOẠT ĐỘNG CHÍNH — đánh dấu ngay trong ô cột 2 bằng: **── BƯỚC 1: KẾT NỐI (x phút) ──** → **── BƯỚC 2: HÌNH THÀNH (x phút) ──** → **── BƯỚC 3: KIỂM TRA (x phút) ──** → **── BƯỚC 4: CHUẨN HÓA (x phút) ──**. Hoạt động ngắn (khởi động/sơ kết) không cần chia bước.

3. NHÃN CÂU HỎI — mọi câu hỏi dẫn dắt PHẢI mở đầu bằng nhãn in đậm **[NHÃN VIẾT HOA]**:
   - Nhãn Socratic: **[PHÁT HIỆN]** **[SO SÁNH]** **[SUY LUẬN]** **[DỰ ĐOÁN]** **[KHÁI QUÁT]** **[PHẢN BIỆN]** **[SÁNG TẠO]** **[SỐ HỌC]** **[MÔ HÌNH HÓA]**
   - Nhãn Bloom cho quiz: **[GHI NHỚ]** **[HIỂU]** **[VẬN DỤNG]** **[PHÂN TÍCH]**
   - Nhãn mức độ bài tập: **[NB]** **[TH]** **[VD]** **[VDC]**
   Phân bố: mỗi hoạt động chính ≥ 4 câu có nhãn; toàn tiết PHẢI có ≥ 1 câu **[PHẢN BIỆN]** (cài lời giải sai/quan điểm sai cho HS bắt lỗi) và ≥ 1 câu **[SÁNG TẠO]** (dành HS giỏi).

4. KỸ THUẬT CHỜ — sau MỖI cụm câu hỏi ghi rõ: "→ Chờ ≥ 3 giây, gọi ngẫu nhiên (không gọi HS giơ tay), không tự trả lời, hỏi thêm 'Tại sao?'". Câu phản biện/sáng tạo: chờ ≥ 5 giây, hỏi "Bằng chứng nào?".

5. PHÂN HÓA TRONG NHIỆM VỤ — chia nhóm/cặp ĐỒNG MỨC và giao nhiệm vụ KHÁC NHAU theo đúng mức: "Nhóm NB: [đề]... Nhóm TH: [đề]... Nhóm VD/Giỏi: [đề khó hơn hẳn]". GV di chuyển quan sát, KHÔNG giải thay. Cột 3 có Đáp án đủ CẢ 3 mức.

6. DỰ KIẾN KHÓ KHĂN — mỗi hoạt động chính có dòng "→ Dự kiến khó khăn: [lỗi HS hay mắc] → GV [cách bẫy sớm/xử lý]".

C. CHUẨN SƯ PHẠM BẮT BUỘC (theo khung dạy học phân hóa + kĩ thuật đặt câu hỏi + khung đánh giá giờ học mức Distinguished):

1. PHỦ ĐỦ 7 LOẠI CÂU HỎI TOÁN trong mỗi tiết (theo tài liệu kĩ thuật đặt câu hỏi — thiếu loại nào là KHÔNG ĐẠT). Mục đích + câu mẫu từng loại:
   - **[SO SÁNH]** tìm giống/khác — "Hai cách giải này giống nhau ở điểm nào?", "Nếu so sánh hai kết quả, em rút ra nhận xét gì?"
   - **[PHÁT HIỆN]** nhận ra quy luật — "Sau khi quan sát các ví dụ, em phát hiện quy luật gì?", "Điều gì luôn đúng trong mọi trường hợp vừa xét?"
   - **[SUY LUẬN]** dẫn dắt lập luận — "Từ giả thiết, em suy ra điều gì tiếp theo?", "Bước tiếp theo trong lời giải nên là gì?"
   - **[KHÁI QUÁT]** hình thành khái niệm/định lí — "Em phát biểu quy tắc bằng lời của mình?", "Nếu viết thành định nghĩa, em phát biểu thế nào?"
   - **[VẬN DỤNG]** áp dụng vào bài toán — "Để áp dụng công thức này cần những đại lượng nào?", "Kiến thức hôm nay dùng được trong tình huống thực tế nào?"
   - **[PHẢN BIỆN]** đánh giá, bắt lỗi — "Em có đồng ý với lời giải của bạn không? Vì sao?", "Em hãy tìm một phản ví dụ nếu có."
   - **[SÁNG TẠO]** cách giải mới, mở rộng — "Em tìm được cách giải khác không?", "Em hãy tự đặt một bài toán tương tự."
   (Nhãn phụ được phép dùng thêm khi hợp ngữ cảnh: **[SỐ HỌC]** **[DỰ ĐOÁN]** **[MÔ HÌNH HÓA]**.)
1b. KỸ THUẬT HỎI (bắt buộc thể hiện trong kịch bản): chỉ hỏi MỘT câu mỗi lần (cấm câu hỏi kép); không chấp nhận "em không biết" — gợi ý rồi QUAY LẠI đúng HS đó; không truy sát một HS — chuyển câu trả lời sang HS khác hỏi "Em đồng ý đến mức nào?"; câu hỏi thiết yếu của tiết công bố ngay từ Khởi động và giữ nguyên suốt tiết.
2. PHÂN HÓA ĐỦ 4 TRỤC (Tomlinson):
   - NỘI DUNG: nhiệm vụ khác nhau theo mức NB/TH/VD, bám bài SGK.
   - QUÁ TRÌNH: SCAFFOLD TƯỜNG MINH cho HS yếu (ghi rõ từng bước điền khuyết/gợi ý trong hoạt động, chỉ rõ dùng phiếu hỗ trợ nào — không viết chung chung "GV hỗ trợ") theo nguyên tắc TẠO BƯỚC ĐỆM: hỗ trợ kỹ ở bước đầu, RÚT DẦN để HS tự làm ở bước sau; nhóm đồng mức khi luyện, đa mức khi dự án (HS giỏi kèm HS yếu).
   - SẢN PHẨM: HS được chọn cách thể hiện khi phù hợp (bảng con/A3/trình bày miệng).
   - MÔI TRƯỜNG: có "Phòng chờ Toán học"/nhiệm vụ neo cho HS xong sớm — không HS nào ngồi chơi.
3. TIẾNG NÓI & LỰA CHỌN CỦA HS: ít nhất 1 cơ chế HS TỰ CHỌN (chọn đường Tic-Tac-Toe, chọn mức bài, chọn vai trong nhóm) + exit ticket luôn có mục HS nêu thắc mắc/câu hỏi riêng.
4. MỌI HS ĐƯỢC HOẠT ĐỘNG: GV không độc thoại; gọi ngẫu nhiên; bảng con để cả lớp cùng trả lời; HS tự đánh giá (thumbs up/down mục tiêu).
5. PHẠM VI KIẾN THỨC: chỉ dạy ĐÚNG phạm vi bài/tiết được yêu cầu — TUYỆT ĐỐI KHÔNG lấn nội dung tiết sau/bài sau (vd tiết về vectơ pháp tuyến thì không dạy vectơ chỉ phương). Bài tập/ví dụ phải khớp phạm vi này.
6. BỐI CẢNH THỰC TIỄN (khởi động/mở rộng/dự án) phải đạt tiêu chí: gần gũi, HS từng gặp, có số liệu thật/hợp lý, mô hình hóa được, có nhiều cách giải; kèm chuỗi câu hỏi dẫn dắt HS TOÁN HỌC HÓA vấn đề (từ tình huống → đại lượng → phương trình). Nguồn ý tưởng: tiền điện/nước, chi tiêu, sân trường, thể thao, giá xăng/vàng, lãi suất, giao thông, dân số. TRÁNH chủ đề nhạy cảm: tôn giáo, chính trị, giới tính.

D. QUY TẮC CÔNG THỨC TOÁN (TUYỆT ĐỐI):
- Trong dòng: $...$ (vd $ax+by+c=0$, $\\vec{n}(a;b)$, $\\overrightarrow{AB}$, $M_0(x_0;y_0)$). Đứng riêng: $$...$$.
- MỌI ký hiệu toán phải trong $...$ — CẤM Unicode giả (n⃗, x₀, √2) ngoài công thức.
- KHÔNG dùng "|" trong công thức (vỡ bảng) — dùng \\mid; hệ PT tham số dùng \\begin{cases}...\\end{cases}.
- Tiếng Việt gõ liền mạch chuẩn, không tách rời dấu.
===== HẾT MẪU CHUNG =====
`;

const TOAN_KIEN_THUC = `
===== KẾ HOẠCH BÀI DẠY CHỈ ĐỊNH: TIẾT HÌNH THÀNH KIẾN THỨC =====
Mục II. TIẾN TRÌNH gồm ĐÚNG các hoạt động sau (đúng tên, đúng khung phút):

### 1. KHỞI ĐỘNG — Bài toán mở đầu (5 phút, P1–P5)
- GV chiếu tình huống thực tế gắn TRỰC TIẾP kiến thức mới + nêu "câu hỏi thiết yếu" giữ nguyên suốt tiết (in nghiêng, trong ngoặc kép).
- HS giơ BẢNG CON ôn 3 câu kiến thức nền cần dùng (gắn nhãn **[SO SÁNH]**/**[SỐ HỌC]**); cột 3 ghi "BẢNG CON ÔN TẬP" + công thức nền → chốt "Đây là công cụ sẽ dùng để...".

### 2. XÁC ĐỊNH MỤC TIÊU (3 phút, P5–P8)
- HS điền cột K, W phiếu KWLI-Chart (K: Tôi đã biết / W: Tôi muốn biết / L, I: điền cuối tiết); GV gọi ngẫu nhiên 2 HS chia sẻ; chiếu mục tiêu — HS đánh dấu mục tiêu chưa chắc; nêu câu hỏi trọng tâm. Cột 3: khung KWLI-CHART.

### 3. CÁC HOẠT ĐỘNG HỌC TẬP CHÍNH (~24 phút, P8–P32)
- 1-2 hoạt động "**HĐ[n] — [tên đơn vị kiến thức] ([x] phút)**", MỖI HĐ đủ 4 BƯỚC:
  - BƯỚC 1 KẾT NỐI: từ HĐ khám phá SGK, chuỗi 2-3 câu **[SUY LUẬN]**/**[PHÁT HIỆN]** dẫn HS TỰ dẫn ra công thức.
  - BƯỚC 2 HÌNH THÀNH: nhóm ĐỒNG MỨC NB/TH/VD với 3 nhiệm vụ khác nhau (phiếu học tập); 1 câu **[KHÁI QUÁT]** (tự phát biểu định nghĩa) + 1 câu **[PHẢN BIỆN]** (quan điểm sai cài sẵn).
  - BƯỚC 3 KIỂM TRA: bảng con 1 bài nhanh + 1 câu **[PHẢN BIỆN]** bắt lỗi sai dấu/bẫy phổ biến.
  - BƯỚC 4 CHUẨN HÓA: **[KHÁI QUÁT]** phát biểu tổng quát + điều kiện; **[SÁNG TẠO]** (HS giỏi) trường hợp đặc biệt; HS thumbs up/down mục tiêu.
- Cột 3 mỗi HĐ: công thức chốt $$...$$, các dạng đặc biệt, "**Đáp án PHT:** NB:... TH:... VD:...", "⚠ Lỗi phổ biến:...".

### 4. KIỂM TRA NHANH — MỞ RỘNG (3 phút, P32–P38)
- Bảng con nhóm đôi 3 câu phân hóa **[NB]**/**[TH]**/**[VDC]** (VDC dành HS giỏi); cột 3 ghi ĐÁP ÁN cả 3.

### 5. SƠ KẾT & EXIT TICKET (2 phút, P38–P40)
- HS điền cột L, I của KWLI; 2 câu **[KHÁI QUÁT]**/**[SÁNG TẠO]** gọi ngẫu nhiên; Exit ticket 30 giây: "✓ Hiểu rõ nhất: ___" / "? Còn thắc mắc: ___".

### 6. BÀI TẬP VỀ NHÀ — theo format chung 4 dòng.
===== HẾT KẾ HOẠCH CHỈ ĐỊNH =====
`;

const TOAN_LUYEN_TAP = `
===== KẾ HOẠCH BÀI DẠY CHỈ ĐỊNH: TIẾT LUYỆN TẬP / HÌNH THÀNH KĨ NĂNG =====
Tiết này KHÔNG dạy kiến thức mới — chỉ luyện kỹ năng đã học.

MỤC TIÊU & CHUẨN RIÊNG CỦA TIẾT LUYỆN TẬP (bắt buộc thể hiện rõ trong KHDH):
1. THÀNH THẠO PHƯƠNG PHÁP/KĨ NĂNG LÀM MỘT DẠNG BÀI — bảng MỤC TIÊU và hoạt động phải làm rõ: HS biết VÌ SAO chọn phương pháp/kĩ năng đó và KHI NÀO chọn phương pháp/kĩ năng đó (có câu hỏi tường minh kiểu "Dấu hiệu nào của đề cho em biết nên dùng cách này?").
2. PHÁT TRIỂN TƯ DUY TOÁN HỌC — tiết phải có đủ các thao tác (gắn đúng nhãn): phân tích đề **[SUY LUẬN]**, lựa chọn phương pháp + so sánh nhiều cách giải **[SO SÁNH]**, phát hiện quy luật **[PHÁT HIỆN]**, khái quát hóa dạng bài **[KHÁI QUÁT]**, phản biện lời giải + phát hiện sai lầm **[PHẢN BIỆN]**.
3. QUY TRÌNH G. POLYA cho MỌI bài chữa chung (bài sửa lỗi khởi động, bài chia sẻ bảng, bài nhóm HĐ2) — trình bày rõ 4 bước trong cột "Giáo viên và Học sinh": **Bước 1: Hiểu bài toán** → **Bước 2: Tìm hướng giải** → **Bước 3: Trình bày lời giải** → **Bước 4: Nhìn lại bài toán**. ĐÀO SÂU ĐẶC BIỆT Bước 2 và Bước 4:
   - Bước 2 (Tìm hướng giải) PHẢI có 2 BỘ CÂU HỎI GỢI Ý PHÂN HÓA: 1 bộ cho lộ trình 2 (cả lớp/chuẩn) và 1 bộ riêng cho lộ trình 1 (HS cần hỗ trợ — câu hỏi nhỏ hơn, chỉ dấu hiệu cụ thể trong đề).
   - Bước 4 (Nhìn lại): thử lại kết quả, tìm cách giải khác, khái quát thành dạng bài, tự đặt bài tương tự.
4. CHIẾN LƯỢC PHÂN HÓA dùng trong tiết phải GHI CHI TIẾT CÁCH ÁP DỤNG (áp ở hoạt động nào, nhóm/mức nào, dùng phiếu gì, GV làm gì) — KHÔNG chỉ nêu tên chiến lược.

Mục II. TIẾN TRÌNH gồm:

### 1. KHỞI ĐỘNG — Ôn nhanh + Sửa lỗi Exit ticket tiết trước (5 phút, P1–P5)
- GV chiếu 2-3 LỖI PHỔ BIẾN từ exit ticket tiết trước (ẩn tên HS); bảng con 4 câu nhanh 40 giây/câu gắn nhãn (**[SO SÁNH]** **[PHÁT HIỆN]** **[SUY LUẬN]** **[PHẢN BIỆN]** — câu phản biện là cặp bài dễ nhầm để HS kiểm tra bằng số). Cột 3: "ÔN TẬP NHANH" — bảng công thức + đáp án 4 câu.

### 2. XÁC ĐỊNH MỤC TIÊU (2 phút, P5–P7)
- Thông báo: "Hôm nay các em TỰ CHỌN thử thách trong phiếu Tic-Tac-Toe" + câu hỏi trọng tâm. Cột 3: 3 gạch mục tiêu tiết.

### 3. HĐ1 — Luyện tập cá nhân: Phiếu Tic-Tac-Toe phân hóa (18 phút, P7–P25)
- Bảng markdown 3×3 = 9 ô nhiệm vụ mã "NB-1..3 / TH-1..3 / VD-1..2 / VDC-1", bố trí để MỌI đường 3 ô đều trộn mức độ; ghi luật: HS tự chọn 1 hàng/cột/chéo (3 ô), làm 12 phút, xong sớm chọn thêm.
- Dưới bảng: TỪNG Ô có đề đầy đủ (số liệu cụ thể, ưu tiên bám bài SGK) — trong bảng hoạt động 3 cột, lời giải + đáp số TỪNG Ô ở cột 3.
- GV di chuyển hỏi thăm dò (≥ 4 câu nhãn: **[SO SÁNH]** cách giải, **[SUY LUẬN]** bước tiếp theo, **[PHẢN BIỆN]** tự kiểm tra kết quả, **[KHÁI QUÁT]** quy trình mấy bước) — KHÔNG giải thay.
- 4 phút cuối: "Chia sẻ bảng" — 2 HS lên bảng (ưu tiên ô nhiều lỗi), lớp phản biện, GV chuẩn hóa + nhấn lỗi phổ biến.

### 4. HĐ2 — Luyện tập nhóm: Bài toán thực tiễn (10 phút, P25–P35)
- Nhóm 4 giải 1 bài VẬN DỤNG THỰC TẾ (ưu tiên bài SGK có bối cảnh thật) — chữa chung theo ĐỦ 4 bước Polya (đào sâu Bước 2 với 2 bộ câu hỏi gợi ý phân hóa + Bước 4 nhìn lại); PHÂN CÔNG THEO NĂNG LỰC ghi rõ: "HS 1 (TB): [việc]... HS 4 (giỏi): [việc khó + tự đặt bài tương tự]".
- ≥ 3 câu gợi mở nhãn (**[PHÁT HIỆN]** ý nghĩa đại lượng, **[PHẢN BIỆN]** giới hạn mô hình, **[SÁNG TẠO]** đặt bài tương tự); đại diện trình bày, lớp phản biện, GV liên hệ thực tế. Cột 3: lời giải đầy đủ ra số cuối.

### 5. MỞ RỘNG — Phòng chờ Toán học (3 phút, P35–P38)
- HS giỏi: 1 bài chứng minh/đào sâu + câu **[SÁNG TẠO]**; HS còn lại hoàn thành Tic-Tac-Toe + bảng so sánh kiến thức vào vở.

### 6. SƠ KẾT & EXIT TICKET (2 phút, P38–P40) — tự đánh giá số ô hoàn thành; exit ticket "✓ Dạng làm tốt: ___ / → Cần luyện thêm: ___".

### 7. BÀI TẬP VỀ NHÀ — format chung 4 dòng (toàn lớp: phiếu chuẩn bị nếu tiết sau là đảo ngược).
===== HẾT KẾ HOẠCH CHỈ ĐỊNH =====
`;

const TOAN_DAO_NGUOC = `
===== KẾ HOẠCH BÀI DẠY CHỈ ĐỊNH: TIẾT LỚP HỌC ĐẢO NGƯỢC =====
Ngay sau mục I, thêm khung cảnh báo (blockquote):
> **⚠ LƯU Ý: Tiết LỚP HỌC ĐẢO NGƯỢC — KHÔNG dạy lại lý thuyết tại lớp.** Lý thuyết đã học ở nhà qua video/phiếu → 100% thời gian trên lớp dành cho vận dụng, tranh biện, tổng hợp. GV chỉ hỗ trợ bằng câu hỏi gợi mở, KHÔNG giảng trực tiếp.
Mục "3. Tài liệu dạy học" tách 2 phần: "TRƯỚC TIẾT HỌC (HS tự học ở nhà):" (video + phiếu chuẩn bị) và "TRONG TIẾT HỌC:" (phiếu dự án, giấy A3, bảng con, phiếu đánh giá chéo).

Mục II. TIẾN TRÌNH HOẠT ĐỘNG TRÊN LỚP gồm:

Mục "TRƯỚC TIẾT HỌC" tổ chức theo JIGSAW + MICROLEARNING: chia lớp thành 2-3 NHÓM CHUYÊN GIA, mỗi nhóm tự học 1 mảng kiến thức qua học liệu NGẮN (video ≤ 7 phút/mục SGK cụ thể) + phiếu chuẩn bị riêng theo mảng; vào tiết mỗi chuyên gia chịu trách nhiệm mảng của mình trong nhóm dự án (nhóm đa mức).

### 1. KIỂM TRA CHUẨN BỊ & LÀM RÕ THẮC MẮC (7 phút, P1–P7)
- Bước 1 (1'): quan sát nhanh phiếu chuẩn bị, ghi lỗi phổ biến.
- Bước 2 (4'): QUIZ 4-5 CÂU CHUỖI BLOOM tăng dần **[GHI NHỚ]** → **[HIỂU]** → **[VẬN DỤNG]** → **[PHÂN TÍCH]** (số liệu cụ thể; cột 3 ghi "QUIZ — ĐÁP ÁN" đủ; có thể chạy bằng Kahoot — nếu dùng, ghi chú "GV chuẩn bị bộ Kahoot theo 5 câu này"). HS sai Q1-Q2 → xếp vào nhóm có HS giỏi hỗ trợ.
- Bước 3 (2'): "Em có câu hỏi gì từ video/phiếu?" — giải tối đa 2 câu ngắn, câu sâu chuyển vào dự án.

### 2. XÁC ĐỊNH NHIỆM VỤ TIẾT HỌC (2 phút, P7–P9)
- GV: "Hôm nay KHÔNG học lý thuyết — các em VẬN DỤNG và TRANH BIỆN" + 2 câu hỏi trọng tâm thực tiễn. Cột 3: "CẤU TRÚC TIẾT" liệt kê 5 mục + phút.

### 3. HĐ1 — Dự án mini nhóm (18 phút, P9–P27)
- 1 BÀI TOÁN THỰC TIỄN PHỨC HỢP có hệ tọa độ hóa bối cảnh thật (nêu rõ gốc O là gì, 1 đơn vị = bao nhiêu; 3-4 điểm dữ liệu cụ thể).
- PHÂN CÔNG THEO NĂNG LỰC: "HS 1: [nhiệm vụ nền]... HS 4 (giỏi): [nhiệm vụ khó + mở rộng]".
- GV quan sát 14 phút, ≥ 5 câu gợi mở đủ phổ nhãn (**[SO SÁNH]** **[PHÁT HIỆN]** **[SUY LUẬN]** **[KHÁI QUÁT]** **[PHẢN BIỆN]** **[SÁNG TẠO]**), chờ ≥ 5 giây, KHÔNG giải thay.
- Cột 3: "DỰ ÁN — ĐÁP ÁN" giải đầy đủ TỪNG nhiệm vụ ra kết quả cuối.

### 4. HĐ2 — Trình bày & Tranh biện toán học (8 phút, P27–P35)
- 1 nhóm trình bày A3 (3'); tranh biện (5') với QUY TẮC ghi rõ: "Tôi đồng ý/không đồng ý vì... + lập luận Toán học"; GV không nhận xét ngay — hỏi "Có ai phản bác không?"; ĐIỂM SAO: lập luận đúng +1, phản bác có cơ sở +1, tự đặt câu hỏi hay +1. ≥ 3 câu **[PHẢN BIỆN]**/**[SO SÁNH]**/**[KHÁI QUÁT]** (vd đổi hệ trục thì PT đổi không?). Cột 3: các phép kiểm tra bằng số + bảng điểm sao.

### 5. TỔNG HỢP — MINDMAP & SƠ KẾT (5 phút, P35–P40)
- Cá nhân vẽ Mindmap bài học vào vở (3'): trung tâm + 4-5 nhánh GẮN MỨC ("Nhánh 1 (TB):... Nhánh 5 (giỏi):..."); chia sẻ nhanh 2 câu **[PHẢN BIỆN]**/**[SÁNG TẠO]** (câu sáng tạo hướng sang bài kế tiếp); Exit ticket: "1 điều tôi tự hào nhất...". Cột 3: khung mindmap + công thức cốt lõi.

### 6. BÀI TẬP VỀ NHÀ & CHUẨN BỊ — format chung 4 dòng (toàn lớp: video bài kế tiếp).
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

/** Khối củng cố + few-shot THẬT từ v13 cho additionalRequirements (thay khối Dewey/Danielson). */
export const TOAN_ADDITIONAL_REQUIREMENTS = `===== YÊU CẦU RIÊNG CHO GIÁO ÁN BAN TOÁN (TUYỆT ĐỐI TUÂN THỦ) =====
- Soạn ĐÚNG MỘT tiết theo kế hoạch đã chỉ định — đủ MỌI hoạt động trong kế hoạch, không thêm/bớt, không gộp nhiều tiết.
- Bảng hoạt động dùng ĐÚNG header: | Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
- KHÔNG dùng khung Dewey/WALT-WILF/Danielson trong loại giáo án này.
- Nội dung toán THẬT, đúng chương trình + SGK: số liệu cụ thể, tham chiếu bài tập SGK khi phù hợp, mọi lời giải tính ra KẾT QUẢ CUỐI. Không placeholder, không "...".
- ĐỘ CHI TIẾT: mỗi hoạt động chính viết như kịch bản thật GV cầm dạy được ngay — lời GV trong ngoặc kép, đủ các BƯỚC, đủ nhãn câu hỏi, đủ kỹ thuật chờ, đủ đáp án.

VÍ DỤ MẪU MỘT HÀNG BẢNG HOẠT ĐỘNG — TRÍCH TỪ BẢN MẪU CHUẨN, BẮT CHƯỚC ĐÚNG MẬT ĐỘ CHI TIẾT NÀY:
\`\`\`markdown
### 1. KHỞI ĐỘNG — Bài toán mở đầu (5 phút, P1–P5)

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P1–P5 | **GV chiếu bản đồ tuyến bay Hà Nội – Đà Nẵng.** Nêu câu hỏi thiết yếu giữ nguyên suốt tiết: *"Làm thế nào biểu diễn đường bay bằng phương trình toán học?"* **HS giơ bảng con — ôn kiến thức nền:** **[SO SÁNH]** Vectơ $\\overrightarrow{AB}$ và đoạn thẳng $AB$ giống và khác nhau ở điểm nào? **[SỐ HỌC]** $\\overrightarrow{AB} = ?$ nếu biết $A(x_1;y_1)$, $B(x_2;y_2)$. **[SỐ HỌC]** Hai vectơ $\\vec{a}(a_1;a_2)$ và $\\vec{b}(b_1;b_2)$ vuông góc khi nào? → Chờ ≥ 3 giây, gọi ngẫu nhiên, không tự trả lời, hỏi thêm *"Tại sao?"*. HS sai/chưa nhớ: GV ghi lên bảng và dùng ngay trong HĐ1. | **BẢNG CON ÔN TẬP:** $$\\overrightarrow{AB} = (x_2 - x_1;\\; y_2 - y_1)$$ Điều kiện vuông góc: $$a_1 b_1 + a_2 b_2 = 0$$ → Đây là công cụ sẽ dùng để lập PT đường thẳng. |
\`\`\`
===== HẾT YÊU CẦU RIÊNG =====`;

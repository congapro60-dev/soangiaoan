# ĐỐI CHIẾU Gate D ↔ giáo án Ban Toán gốc (tải từ Thư viện 2026-10-25)

> Nguồn gốc vừa tải: `tasks/giaoan-goc-g10.md` (30.726 ký tự) · `tasks/giaoan-goc-g11.md` (26.628) · `tasks/giaoan-goc-g12.md` (23.542), lấy từ Firestore `lessonPlans` bằng phiên GV `congapro60@gmail.com`.
> Đây là **giáo án thật của thầy**, không phải bản tôi tưởng tượng. Mục đích file này: chỉ ra chỗ Gate D đã lệch để sửa trước khi code Gate C.

## 0. Kết luận trước

Gate D tôi soạn là **thiết kế tương tác đúng khung V8.8 nhưng sai nội dung so với giáo án thầy đã duyệt**. Nếu code nguyên Gate D hiện tại, trên lớp sẽ dạy một tiết khác với giáo án in trên bàn thầy. **Phải sửa nội dung Gate D theo giáo án gốc** — phần khung 3 luồng / timing / no-spoiler vẫn giữ.

## 1. Chênh lệch lớn — phải sửa

| # | Hạng mục | Gate D đang ghi | Giáo án gốc (thật) | Việc phải làm |
|---|---|---|---|---|
| 1 | **Cấu trúc tiến trình G10** | 4 pha: KHĐ P0–P5, XĐMT P5–P8, HĐ1 P8–P24, HĐ2 P24–P32, KTNH P32–P38, SƠ KẾT P38–P40 | 4 hoạt động: HĐ1 P0–P8 (KHĐ+XĐMT gộp), HĐ2 Hình thành kiến thức P8–P22, HĐ3 Rèn luyện P22–P32, HĐ4 P32–P40 (KT nhanh P32–P36 + SƠ KẾT P38–P40) | Gate D phải bám 3 cột P0–P8 / P8–P22 / P22–P32 / P32–P40 |
| 2 | **Cấu trúc G11** | HĐ1 P8–P23, HĐ2 P23–P32 | HĐ1 P0–P8, HĐ2 P8–P32 (một khối 24 phút: khái niệm 11' + quy trình 13'), HĐ3 P32–P38, HĐ4 P38–P40 | Viết lại: HĐ2 là **một khối liền** chứa 2 nội dung, không tách đôi như tôi làm |
| 3 | **Cấu trúc G12** | C01–C08, 4 pha | Pha 1 P0–P8, Pha 2 P8–P22, Pha 3 P22–P36 (14'), Pha 4 P36–P40 | Sửa timing: rèn luyện tới P36 |
| 4 | **Tình huống mở đầu G10** | "Đo bàn bằng thước dây 1,20 m" | **Đỉnh Fansipan 3.147,3 m (2019) vs SGK cũ 3.143 m** + ôn 1/3 = 0,333…, làm tròn π = 3,14159 → 3,14, \|3,14 − 3,14159\| = 0,00159 | Thay toàn bộ A01 |
| 5 | **Tình huống mở đầu G11** | "Bảng 26 điểm kiểm tra" | **Thời gian dùng Internet 40 HS lớp 11A, 35–235 phút** → chia khoảng 40 phút: [30;70), [70;110)… | Thay số liệu: 40 số, không phải 26 |
| 6 | **Tình huống mở đầu G12** | "Hai lớp cùng trung bình 6,5" | **Hai xạ thủ An và Bình, 20 phát súng**, bảng tần số 3 nhóm [6;8), [8;10), [10;12), cả hai x̄ = 8,5; An (2,16,2) tập trung, Bình (7,6,7) tản | Thay biểu đồ + số liệu |
| 7 | **Đơn vị đo G10** | Số đúng/ gần đúng qua đo 4 vật (thước) | Gốc dạy **cả 3 phần: sai số tuyệt đối + sai số tương đối + quy tắc quy tròn** (Gate D tôi chỉ có tuyệt đối + làm tròn tích luỹ) | Bổ sung **sai số tương đối δ ≤ d/\|a\|** và **quy tắc chọn hàng quy tròn từ d** |
| 8 | **G11 quy trình** | "K–B–Đ–T" (4 bước tôi tự đặt) | Gốc: quy tắc ghép nhóm = **các nhóm liên tiếp, không chồng chéo, bao phủ x_min→x_max**; quy trình dạy qua **4 Bước sư phạm** (Kết nối – Hình thành – Kiểm tra – Chuẩn hoá), không phải 4 bước thuật toán | Bỏ "K–B–Đ–T" tự chế; dùng 4 quy tắc ghép nhóm của gốc + 4 bước sư phạm |
| 9 | **G12 công thức** | Chỉ nêu s² định nghĩa + rút gọn | Gốc: bảng trung gian 5 cột, Must: tính đúng c_i, x̄, s², s với k ≤ 4; Should: **thuộc 2 công thức + dùng Casio kiểm tra**; Could: so sánh 2 mẫu, **chứng minh công thức rút gọn** | Thêm yêu cầu Casio + chứng minh |
| 10 | **Minh chứng CIS** | Tôi tự gán nhãn 🔴🟣🔵 | Gốc dùng **[ĐGTX]**, **[CÔNG DÂN TOÀN CẦU]**, **[🔴 PHÂN HÓA]** với nội dung cụ thể (bảng con giơ đồng loạt, dữ liệu trắc địa quốc tế, AQI…) | Dùng đúng nhãn + nội dung minh chứng của gốc |
| 11 | **Kỹ thuật lớp học** | "chọn nhanh 1/3 trên máy" | Gốc: **bảng con + kỹ thuật chờ hai nhịp** ("3, 2, 1, giơ bảng!"), **phiếu KWLI** (K-W-L-I), **Vinh danh lỗi sai**, **khẩu lệnh chuyển pha** | Phải map: máy HS thay/ bổ sung bảng con — không bỏ bảng con, vì đó là nhịp lớp thật |
| 12 | **G10 sai số tương đối** | Chỉ có ở "mở rộng" ngoài lề | Là **nội dung chính P15–P22**: cầu 100 m ± 1 cm (δ ≤ 0,01%) vs bút chì 10 cm ± 1 cm (δ ≤ 10%) | Đưa vào core, không phải mở rộng |
| 13 | **Trang SGK** | "đối chiếu sau OCR" | Gốc ghi rõ: SGK tr. 20–24 (G10); G11 SGK tr. 65, SBT tr. 42; G12 SGK tr. 80 | Cập nhật trích dẫn |
| 14 | **Căn cứ điều chỉnh** | Tôi viết chung chung | Gốc có số liệu cụ thể: "80% HS thành thạo làm tròn THCS nhưng 45% lúng túng số 0/số âm" | ⚠️ Số % này **do AI sinh trong giáo án gốc**, chưa chắc là số đo thật — cần thầy xác nhận giữ hay thay bằng "Một số HS" |

## 2. Điểm Gate D làm đúng (giữ nguyên)

- Khung 3 luồng Presenter V1–V5 / Student 1-task / Coach read-only.
- no-spoiler + checkpoint `dewey-ckpt-v1-{lessonId}-{mãHS}` không cộng điểm lần 2.
- Handoff Presenter ↔ Máy với copy chốt.
- Timer P-zone, cảnh báo phút 35/38.
- Contract nhóm 2–4 HS ≤ 8 nhóm + kiểm tra chéo bản ẩn danh.
- Phát hiện vượt ngân sách G11 và cách xử lý (đẩy hoạt động phụ ra reserve).
- Dải P phủ kín P0→P40.

## 3. Điểm phải hỏi thầy (không tự quyết)

1. **Bảng con có bị thay bằng máy không?** Giáo án gốc dựa rất nhiều vào bảng con + giơ đồng loạt (nhịp lớp nhanh, cả lớp cùng lúc). Nếu chuyển hết sang máy HS, nhịp lớp chậm hơn và mất "quét radar" của GV. Tôi đề nghị: **giữ bảng con cho câu ngắn**, máy chỉ dùng cho việc máy làm tốt hơn (nhập bảng số liệu, tính toán, kiểm tra chéo, checkpoint).
2. **Số % trong "Căn cứ điều chỉnh"** của giáo án gốc (80%, 45%) — giữ nguyên hay thay bằng ngôn ngữ không số?
3. **G11: bỏ hay giữ "K–B–Đ–T"** — nó không có trong giáo án gốc nhưng là cách nhớ gọn cho quy trình; nếu thầy đồng ý thì coi là phần bổ sung của bài tương tác, không ghi vào giáo án in.
4. **Casio (G12 Should: "dùng Casio kiểm tra")** — bài tương tác có mô phỏng Casio hay chỉ nhắc HS bấm máy thật?

## 4. Việc tiếp theo (đề xuất)

1. Sửa 3 file Gate D theo giáo án gốc: thay tình huống mở đầu, sửa cấu trúc P, bổ sung sai số tương đối + quy tắc quy tròn (G10), dùng đúng 4 quy tắc ghép nhóm (G11), thêm bảng 5 cột + Casio (G12).
2. Thầy trả lời 4 câu ở mục 3.
3. Chốt Gate D → mở Gate C.

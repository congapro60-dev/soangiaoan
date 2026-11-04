# KẾ HOẠCH DẠY HỌC — Các số đặc trưng đo xu thế trung tâm — Tiết 1: Số trung bình và Trung vị (Toán 10 · Tuần 11 · Tiết 80)

| Lớp | 10 | Tên bài học | Các số đặc trưng đo xu thế trung tâm — Tiết 1: Số trung bình và Trung vị | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 11 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-10-11-80.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Tính số trung bình từ bảng tần số và tìm trung vị của mẫu nhỏ.
- **Should (Trọng tâm – Thông hiểu):** Xử lý đúng n chẵn/lẻ khi tìm trung vị; giải thích khi nào trung bình bị ngoại lai bóp méo.
- **Could (Nâng cao – Vận dụng):** So sánh trung bình và trung vị trên dữ liệu thực tế; phản biện báo cáo chỉ dùng một số đo.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Bảng lương tháng của công ty Công nghệ Alpha (10 người).**

| Vị trí | Số người | Lương (triệu/tháng) |
|---|:---:|:---:|
| Giám đốc sáng lập | 1 | 130 |
| Trưởng phòng kỹ thuật | 1 | 25 |
| Nhân viên lập trình | 8 | 10 |

- **Kiểm chứng tay:** tổng quỹ lương $= 130 + 25 + 8\cdot10 = 235$ triệu; $\bar x = 235/10 = 23{,}5$ triệu.
- **Trung vị:** sắp xếp $10; 10; \ldots; 10; 25; 130$ (8 số 10) → $n = 10$ chẵn nên $M_e = (x_5 + x_6)/2 = 10$ triệu.
- **Nhận xét:** trung bình 23,5 triệu cao hơn gấp đôi lương của 8/10 người; trung vị 10 triệu phản ánh đúng mức phổ biến.

**Bẫy của bài:** chia cho số dòng bảng (4) thay vì tổng tần số (10); quên sắp xếp trước khi tìm trung vị.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Một Giám đốc 130 triệu, một Trưởng phòng 25 triệu, tám nhân viên 10 triệu.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Số trung bình lương của công ty là bao nhiêu?*
  - (A) 10 triệu
  - (B) 23,5 triệu
  - (C) 55 triệu
  - **Correct: (B)** — Tổng 235 triệu chia cho 10 người = 23,5 triệu.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Vì sao trung bình cao hơn lương 8/10 người?
  2. `[SO SÁNH]` Trung vị bằng bao nhiêu?
- **TeacherCue (lớp yếu):** Viết bảng tần số 3 dòng; nhắc "mẫu số là tổng số người, không phải số dòng".
- **LookFor:** HS dùng n = 10 chứ không phải 3 hay 4.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Tính số trung bình từ bảng tần số và tìm trung vị của mẫu nhỏ.
- **Should:** Xử lý đúng n chẵn/lẻ khi tìm trung vị; giải thích khi nào trung bình bị ngoại lai bóp méo.
- **Could:** So sánh trung bình và trung vị trên dữ liệu thực tế; phản biện báo cáo chỉ dùng một số đo.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Khi nào số trung bình "nói dối" và trung vị nói thật?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Số trung bình: $\bar x = \dfrac{1}{n}\sum x_i$ hoặc $\dfrac{1}{n}\sum m_i x_i$ với bảng tần số.
- **Bước 2:** Trung vị: sắp xếp không giảm; $n$ lẻ → $M_e = x_{(n+1)/2}$; $n$ chẵn → trung bình hai số giữa.
- **Bước 3:** $\bar x$ nhạy với giá trị ngoại lai; $M_e$ bền vững hơn.
- **Bước 4:** Chọn số đo theo mục đích: mô tả "mức phổ biến" → trung vị; mô tả "tổng chia đều" → trung bình.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao trung vị không bị 130 triệu kéo lệch?
  2. `[PHÁT HIỆN]` Nếu thêm một nhân viên lương 10 triệu thì trung bình đổi thế nào?
- **TeacherCue (lớp yếu):** Khung 3 dòng: công thức — cách tìm — khi nào dùng.
- **Chốt:** Trung bình san đều mọi người; trung vị chỉ quan tâm vị trí giữa.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "undefined"
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI chia cho 4 (số dòng bảng) nên ra 37,25 cm cho bài chiều cao cây.
  2. Bằng chứng: Mẫu số phải là tổng tần số: 4 + 3 + 2 + 1 = 10, nên $\bar x = 149/10 = 14{,}9$ cm.
  3. Sửa: Dùng n = tổng tần số, không phải số nhóm.
- **TeacherCue:** Cho HS cộng tần số trước khi chia.
- **LookFor:** HS kiểm n trước khi tính.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "cộng tần số để có n rồi chia."
  - **S:** "sắp xếp trước khi tìm trung vị, chú ý n chẵn/lẻ."
  - **C:** "so sánh trung bình và trung vị khi có ngoại lai."

- **Luồng M (Must) — hint: cộng tần số để có n rồi chia.**
1. Điểm kiểm tra môn Toán của 8 bạn học sinh tổ 1: 6; 7; 7; 8; 8; 8; 9; 10. Tính số trung bình x̄ của mẫu số liệu.
   - **Đáp án:** x̄ = (6 + 7×2 + 8×3 + 9 + 10)/8 = 63/8 = 7,875.
2. Tìm số trung vị Me của mẫu số liệu: 12, 7, 3, 15, 8, 9, 21.
   - **Đáp án:** Sắp xếp lại: 3, 7, 8, 9, 12, 15, 21; n = 7 lẻ nên Me = x₄ = 9.

- **Luồng S (Should) — hint: sắp xếp trước khi tìm trung vị, chú ý n chẵn/lẻ.**
1. Chiều cao của 10 cây giống non: 12 cm — 4 cây, 15 cm — 3 cây, 18 cm — 2 cây, 20 cm — 1 cây. Lập bảng tần số và tính chiều cao trung bình của các cây.
   - **Đáp án:** n = 4 + 3 + 2 + 1 = 10; x̄ = (12×4 + 15×3 + 18×2 + 20×1)/10 = 149/10 = 14,9 cm.
2. Điểm thi học kỳ của một bạn gồm bốn điểm 7, năm điểm 8 và một điểm 10. Tính x̄ và Me của mẫu điểm.
   - **Đáp án:** n = 10; x̄ = (4×7 + 5×8 + 1×10)/10 = 78/10 = 7,8. Dãy đã sắp xếp: 7×4, 8×5, 10 nên Me = (x₅ + x₆)/2 = (8 + 8)/2 = 8.

- **Luồng C (Could) — hint: so sánh trung bình và trung vị khi có ngoại lai.**
1. Cho mẫu số liệu gồm 5 giá trị: 4; 6; 8; x; 12. a) Biết x̄ = 8, tìm x. b) Nếu x bị ghi nhầm thành 100 thì số trung bình mới thay đổi thế nào?
   - **Đáp án:** a) Tổng của mẫu = 8×5 = 40 nên x = 40 − (4 + 6 + 8 + 12) = 10. b) Tổng mới = 40 − 10 + 100 = 130 nên x̄ mới = 130/5 = 26, tức tăng 18 đơn vị.
2. Cho mẫu gồm 6 số nguyên dương đã được sắp xếp: 2; 4; 5; a; 9; 11 (5 ≤ a ≤ 9). Biết x̄ = Me, tìm a.
   - **Đáp án:** Me = (5 + a)/2; x̄ = (2 + 4 + 5 + a + 9 + 11)/6 = (31 + a)/6. (31 + a)/6 = (5 + a)/2 ⇔ 31 + a = 15 + 3a ⇔ a = 8 (thỏa mãn 5 ≤ a ≤ 9).

- **LookFor:** HS M đúng n; HS S đúng trung vị; HS C giải thích được.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Tìm trung vị của mẫu: 12, 7, 3, 15, 8, 9, 21. → Sắp xếp: 3, 7, 8, 9, 12, 15, 21 (n = 7 lẻ) → $M_e = x_4 = 9$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "Mẫu số của x̄ là số dòng bảng tần số" → **Sai — là tổng tần số**
  - "Trung vị cần sắp xếp mẫu trước" → **Đúng**
  - "Trung bình bền vững hơn trung vị khi có ngoại lai" → **Sai**
- **TeacherCue:** Chấm chéo, kiểm bằng cách sắp xếp lại.

- **Câu 1:** Bài giải của bạn An: x̄ = (12×4 + 15×3 + 18×2 + 20×1)/4 = 37,25 cm. Bài giải sai ở đâu? → Chia cho số dòng của bảng tần số (k = 4) thay vì cỡ mẫu n = 10; hơn nữa 37,25 cm vượt giá trị lớn nhất 20 cm nên chắc chắn sai.
- **Câu 2:** Bạn Nam tìm trung vị của mẫu 3, 1, 4, 2, 5 và ghi Me = 4. Bạn Nam sai ở đâu? → Lấy số chính giữa của dãy chưa sắp xếp; phải xếp lại 1, 2, 3, 4, 5 rồi mới lấy Me = x₃ = 3.
- **Chốt nhanh:** n = tổng tần số; trung vị cần sắp xếp.

- Trung bình 23,5 triệu nhưng 8/10 người nhận 10 triệu — trung bình bị 130 triệu kéo lên.
- Trung vị 10 triệu phản ánh đúng mức lương phổ biến.
- Khuyến nghị: báo cáo cả hai con số kèm giải thích, không chỉ dùng trung bình.
- **TeacherCue:** Hỏi: "Nếu phải chọn một con số để tuyển dụng, em chọn con số nào và vì sao?"

- **Exit Ticket (4 mục):**
  1. Nêu công thức trung bình và cách tìm trung vị.
  2. Nêu 1 bẫy (chia cho số dòng; quên sắp xếp).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Bảng lương Alpha: trung bình và trung vị bằng bao nhiêu?
- **TeacherCue (lớp yếu):** Mở lại bảng lương ở mục II.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Điểm kiểm tra môn Toán của 8 bạn học sinh tổ 1: 6; 7; 7; 8; 8; 8; 9; 10. Tính số trung bình x̄ của mẫu số liệu.
   - **Đáp án:** x̄ = (6 + 7×2 + 8×3 + 9 + 10)/8 = 63/8 = 7,875.
2. `[NB]` Tìm số trung vị Me của mẫu số liệu: 12, 7, 3, 15, 8, 9, 21.
   - **Đáp án:** Sắp xếp lại: 3, 7, 8, 9, 12, 15, 21; n = 7 lẻ nên Me = x₄ = 9.
3. `[TH]` Chiều cao của 10 cây giống non: 12 cm — 4 cây, 15 cm — 3 cây, 18 cm — 2 cây, 20 cm — 1 cây. Lập bảng tần số và tính chiều cao trung bình của các cây.
   - **Đáp án:** n = 4 + 3 + 2 + 1 = 10; x̄ = (12×4 + 15×3 + 18×2 + 20×1)/10 = 149/10 = 14,9 cm.
4. `[TH]` Điểm thi học kỳ của một bạn gồm bốn điểm 7, năm điểm 8 và một điểm 10. Tính x̄ và Me của mẫu điểm.
   - **Đáp án:** n = 10; x̄ = (4×7 + 5×8 + 1×10)/10 = 78/10 = 7,8. Dãy đã sắp xếp: 7×4, 8×5, 10 nên Me = (x₅ + x₆)/2 = (8 + 8)/2 = 8.
5. `[VD]` Cho mẫu số liệu gồm 5 giá trị: 4; 6; 8; x; 12. a) Biết x̄ = 8, tìm x. b) Nếu x bị ghi nhầm thành 100 thì số trung bình mới thay đổi thế nào?
   - **Đáp án:** a) Tổng của mẫu = 8×5 = 40 nên x = 40 − (4 + 6 + 8 + 12) = 10. b) Tổng mới = 40 − 10 + 100 = 130 nên x̄ mới = 130/5 = 26, tức tăng 18 đơn vị.
6. `[VD]` Cho mẫu gồm 6 số nguyên dương đã được sắp xếp: 2; 4; 5; a; 9; 11 (5 ≤ a ≤ 9). Biết x̄ = Me, tìm a.
   - **Đáp án:** Me = (5 + a)/2; x̄ = (2 + 4 + 5 + a + 9 + 11)/6 = (31 + a)/6. (31 + a)/6 = (5 + a)/2 ⇔ 31 + a = 15 + 3a ⇔ a = 8 (thỏa mãn 5 ≤ a ≤ 9).

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Chia tổng cho số dòng bảng tần số $k$ thay vì cỡ mẫu $n = m_1 + m_2 + \dots + m_k$.
- Lấy số chính giữa của dãy chưa sắp xếp rồi gọi là trung vị.
- Không kiểm tra kết quả nằm trong $[\min, \max]$ — trung bình 37,25 cm vượt giá trị lớn nhất 20 cm là vô lý.
- Kết luận bằng chỉ $\bar{x}$ khi dữ liệu có giá trị ngoại lai mà không đối chiếu $Me$.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.

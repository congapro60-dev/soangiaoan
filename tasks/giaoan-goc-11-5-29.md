# KẾ HOẠCH DẠY HỌC — Đường thẳng song song với mặt phẳng — điều kiện (Toán 11 · Tuần 5 · Tiết 29)

| Lớp | 11 | Tên bài học | Đường thẳng song song với mặt phẳng — điều kiện | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 5 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-11-5-29.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Phát biểu định lí điều kiện và áp dụng cho một cặp đường – mặt đơn giản.
- **Should (Trọng tâm – Thông hiểu):** Trình bày chứng minh 3 bước: chỉ ra $d \parallel d′$, $d′ \subset (P)$, $d \not\subset (P)$.
- **Could (Nâng cao – Vận dụng):** Chứng minh trong hình chóp/hộp phức tạp hơn; phản biện chứng minh thiếu điều kiện.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Chứng minh thanh $AB$ song song với mặt kệ $(P)$ nhờ một thanh $CD$ đã biết nằm trong $(P)$.**

- **Định lí (điều kiện đủ):** nếu $d \not\subset (P)$ và $d \parallel d′$ với $d′ \subset (P)$ thì $d \parallel (P)$.
- **Áp dụng hộp $ABCD.A′B′C′D′$:**
  - $AB \parallel A′B′$ và $A′B′ \subset (A′B′C′D′)$; $AB \not\subset (A′B′C′D′)$ → $AB \parallel (A′B′C′D′)$.
  - $AD \parallel BC$ và $BC \subset (SBC)$? (không dùng) — thay bằng: $AD \parallel B′C′$ và $B′C′ \subset (A′B′C′D′)$ → $AD \parallel (A′B′C′D′)$.
- **Kiểm chứng tay:** $AB$ và $A′B′$ cùng phương, cùng độ dài 1 cạnh hộp; $A′B′$ nằm trong mặt trên nên $AB$ không thể cắt mặt trên.

**Bẫy của bài:** quên điều kiện $d \not\subset (P)$ (nếu $d \subset (P)$ thì không thể song song); chọn $d′$ không nằm trong $(P)$.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Thanh AB cần chứng minh song song mặt kệ (P); trong (P) có thanh CD song song AB.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Để kết luận $AB \parallel (P)$, cần thêm điều kiện nào?*
  - (A) AB phải nằm trong (P)
  - (B) AB không nằm trong (P) và AB // CD với CD ⊂ (P)
  - (C) Chỉ cần AB // CD
  - **Correct: (B)** — Định lí yêu cầu đủ hai điều: đường nằm ngoài mặt phẳng và có đường song song nằm trong mặt phẳng.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Nếu AB nằm trong (P) thì kết luận gì?
  2. `[SO SÁNH]` Vì sao cần điều kiện "không nằm trong"?
- **TeacherCue (lớp yếu):** Viết định lí thành 3 dòng đánh số; HS đối chiếu từng dòng với hình.
- **LookFor:** HS nhắc đủ hai điều kiện.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Phát biểu định lí điều kiện và áp dụng cho một cặp đường – mặt đơn giản.
- **Should:** Trình bày chứng minh 3 bước: chỉ ra $d \parallel d′$, $d′ \subset (P)$, $d \not\subset (P)$.
- **Could:** Chứng minh trong hình chóp/hộp phức tạp hơn; phản biện chứng minh thiếu điều kiện.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Vì sao chỉ cần tìm một đường thẳng song song nằm trong mặt phẳng là đủ để kết luận?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Tìm đường $d′ \subset (P)$ sao cho $d \parallel d′$.
- **Bước 2:** Kiểm tra $d \not\subset (P)$.
- **Bước 3:** Kết luận $d \parallel (P)$ theo định lí.
- **Bước 4:** Ghi rõ căn cứ từng bước (song song do hình bình hành/hộp, thuộc mặt do giả thiết).
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao $AB \parallel A′B′$ trong hộp?
  2. `[PHÁT HIỆN]` Nếu chọn $d′ = A′D′$ thì có kết luận được $AB \parallel (A′B′C′D′)$ không?
- **TeacherCue (lớp yếu):** Khung 3 bước; nhắc HS yếu luôn viết dòng "d ⊄ (P)" trước khi kết luận.
- **Chốt:** Muốn chứng minh song song, hãy tìm một "nhân chứng" nằm trong mặt phẳng.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI chứng minh: "Vì MN // AB nên MN // (ABCD)." (không nêu AB ⊂ (ABCD) và MN ⊄ (ABCD) — trong đó M, N là trung điểm SA, SB của hình chóp S.ABCD)."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI kết luận $AB \parallel (A′B′C′D′)$ nhưng chỉ nêu $AB \parallel A′B′$, thiếu $A′B′ \subset (A′B′C′D′)$ và $AB \not\subset$ mặt đó.
  2. Bằng chứng: Thiếu căn cứ thì lập luận chưa hợp lệ, dù kết quả đúng.
  3. Sửa: Bổ sung đủ 3 dòng: $AB \parallel A′B′$; $A′B′ \subset (A′B′C′D′)$; $AB \not\subset (A′B′C′D′)$ → kết luận.
- **TeacherCue:** Cho HS chấm chéo theo 3 dòng, thiếu dòng nào trừ điểm dòng đó.
- **LookFor:** HS kiểm đủ 3 điều kiện.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "chỉ ra đường song song nằm trong mặt phẳng trước."
  - **S:** "viết đủ 3 dòng chứng minh."
  - **C:** "làm bài trong hình chóp, chú ý đường trung bình."

- **Luồng M (Must) — hint: chỉ ra đường song song nằm trong mặt phẳng trước.**
1. Phát biểu định lí điều kiện để d // (P).
   - **Đáp án:** Nếu d không nằm trong (P) và d song song với một đường d′ nằm trong (P) thì d song song với (P).
2. Nêu ba bước chứng minh d // (P).
   - **Đáp án:** Tìm d′ ⊂ (P) với d // d′; kiểm d ⊄ (P); kết luận d // (P).

- **Luồng S (Should) — hint: viết đủ 3 dòng chứng minh.**
1. Trong hộp, chứng minh A′B′ // (ABCD).
   - **Đáp án:** A′B′ // AB, AB ⊂ (ABCD), A′B′ ⊄ (ABCD) → A′B′ // (ABCD).
2. Trong hộp, chứng minh B′C′ // (ABCD).
   - **Đáp án:** B′C′ // BC, BC ⊂ (ABCD), B′C′ ⊄ (ABCD) → B′C′ // (ABCD).

- **Luồng C (Could) — hint: làm bài trong hình chóp, chú ý đường trung bình.**
1. Cho hình chóp S.ABCD có M, N là trung điểm SA, SB. Chứng minh MN // (ABCD).
   - **Đáp án:** MN là đường trung bình của tam giác SAB nên MN // AB. Mà AB ⊂ (ABCD) và MN ⊄ (ABCD) (M, N không thuộc mặt đáy). Vậy MN // (ABCD).
2. Phản biện chứng minh chỉ ghi "MN // AB nên MN // (ABCD)".
   - **Đáp án:** Thiếu hai căn cứ: AB phải nằm trong (ABCD) và MN phải không nằm trong (ABCD). Nếu thiếu, lập luận không hợp lệ dù kết quả đúng.

- **LookFor:** HS M tìm được nhân chứng; HS S đủ 3 dòng; HS C dùng được tính chất đường trung bình.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Trong hộp $ABCD.A′B′C′D′$, chứng minh $AD \parallel (A′B′C′D′)$. → Có $AD \parallel A′D′$ (cạnh tương ứng của hộp), $A′D′ \subset (A′B′C′D′)$, và $AD \not\subset (A′B′C′D′)$. Theo định lí, $AD \parallel (A′B′C′D′)$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "Chỉ cần d // d′ là đủ" → **Sai — cần d′ ⊂ (P) và d ⊄ (P)**
  - "Nếu d ⊂ (P) thì d không thể song song (P)" → **Đúng**
  - "Định lí cho điều kiện đủ, không cần thiết" → **Đúng**
- **TeacherCue:** Chiếu 2 bài chứng minh, chấm theo 3 dòng.

- **Câu 1:** Vì sao cần d ⊄ (P)? → Vì nếu d nằm trong (P) thì d có vô số điểm chung, không thể song song.
- **Câu 2:** Trong hình chóp, đường trung bình của tam giác bên thường song song với mặt đáy — vì sao? → Đường trung bình song song với cạnh đáy, mà cạnh đáy nằm trong mặt đáy; đường trung bình không nằm trong mặt đáy nên song song với mặt đáy.
- **Chốt nhanh:** Ba dòng: song song — nằm trong — không nằm trong.

- Thanh AB // thanh CD (đã gắn trong mặt kệ) và AB không nằm trong mặt kệ → AB // (P).
- Vì AB // (P) nên AB không bao giờ chạm mặt kệ, dù kéo dài — đảm bảo an toàn khi lắp.
- Sai điều kiện "không nằm trong": thanh dán sát mặt kệ sẽ nằm trong (P) chứ không song song.
- **TeacherCue:** Liên hệ tiêu chuẩn lắp đặt: song song nghĩa là khoảng cách không đổi.

- **Exit Ticket (4 mục):**
  1. Phát biểu định lí điều kiện song song.
  2. Nêu 1 bẫy (thiếu d ⊄ (P); chọn d′ không nằm trong (P)).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Trong hộp, AB // A′B′ và A′B′ ⊂ (A′B′C′D′). Kết luận gì?
- **TeacherCue (lớp yếu):** Mở lại khung 3 bước ở S3.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Phát biểu định lí điều kiện để d // (P).
   - **Đáp án:** Nếu d không nằm trong (P) và d song song với một đường d′ nằm trong (P) thì d song song với (P).
2. `[NB]` Nêu ba bước chứng minh d // (P).
   - **Đáp án:** Tìm d′ ⊂ (P) với d // d′; kiểm d ⊄ (P); kết luận d // (P).
3. `[TH]` Trong hộp, chứng minh A′B′ // (ABCD).
   - **Đáp án:** A′B′ // AB, AB ⊂ (ABCD), A′B′ ⊄ (ABCD) → A′B′ // (ABCD).
4. `[TH]` Trong hộp, chứng minh B′C′ // (ABCD).
   - **Đáp án:** B′C′ // BC, BC ⊂ (ABCD), B′C′ ⊄ (ABCD) → B′C′ // (ABCD).
5. `[VD]` Cho hình chóp S.ABCD có M, N là trung điểm SA, SB. Chứng minh MN // (ABCD).
   - **Đáp án:** MN là đường trung bình của tam giác SAB nên MN // AB. Mà AB ⊂ (ABCD) và MN ⊄ (ABCD) (M, N không thuộc mặt đáy). Vậy MN // (ABCD).
6. `[VD]` Phản biện chứng minh chỉ ghi "MN // AB nên MN // (ABCD)".
   - **Đáp án:** Thiếu hai căn cứ: AB phải nằm trong (ABCD) và MN phải không nằm trong (ABCD). Nếu thiếu, lập luận không hợp lệ dù kết quả đúng.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Bỏ điều kiện d ⊄ (P).
- Chọn d′ không nằm trong (P).
- Kết luận song song mà không nêu căn cứ song song của d và d′.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.

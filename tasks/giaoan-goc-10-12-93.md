# KẾ HOẠCH DẠY HỌC — Tích của một vectơ với một số (Toán 10 · Tuần 12 · Tiết 93)

| Lớp | 10 | Tên bài học | Tích của một vectơ với một số | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 12 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-10-12-93.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Hiểu định nghĩa tích của một số thực k với một vectơ; xác định hướng và độ dài của k·a.
- **Should (Trọng tâm – Thông hiểu):** Nắm vững các tính chất phân phối, kết hợp; điều kiện hai vectơ cùng phương (a = k·b).
- **Could (Nâng cao – Vận dụng):** Vận dụng điều kiện ba điểm thẳng hàng và biểu diễn một vectơ theo hai vectơ không cùng phương.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Điều khiển chuyển động drone trên đường thẳng bay:**
- Drone chuyển động với vận tốc ban đầu $\vec v$.
- Tăng tốc gấp đôi cùng chiều bay: vectơ vận tốc mới là $\vec v_1 = 2\vec v$.
  - Hướng: cùng hướng với $\vec v$ (vì $k = 2 > 0$). Độ lớn: $|\vec v_1| = 2|\vec v|$.
- Đảo chiều quay đầu với tốc độ gấp 1,5 lần: vectơ vận tốc mới là $\vec v_2 = -1{,}5\vec v$.
  - Hướng: ngược hướng với $\vec v$ (vì $k = -1{,}5 < 0$). Độ lớn: $|\vec v_2| = |-1{,}5||\vec v| = 1{,}5|\vec v|$.
- **Định nghĩa tổng quát:** Cho số thực $k$ và vectơ $\vec a \ne \vec 0$:
  - $k\vec a$ là một vectơ cùng hướng với $\vec a$ nếu $k > 0$, ngược hướng với $\vec a$ nếu $k < 0$.
  - Độ dài: $|k\vec a| = |k| \cdot |\vec a|$.
- **Quy ước:** $0 \cdot \vec a = \vec 0$ và $k \cdot \vec 0 = \vec 0$.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Drone bay với vận tốc v. Khi đảo ngược chiều bay và tăng tốc độ lên 3 lần, vectơ vận tốc mới là u = -3v.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Khẳng định nào sau đây về hướng và độ lớn của u là đúng?*
  - (A) u cùng hướng với v và |u| = 3|v|
  - (B) u ngược hướng với v và |u| = 3|v|
  - (C) u ngược hướng với v và |u| = -3|v|
  - **Correct: (B)** — Vì k = -3 < 0 nên u ngược hướng với v; độ dài |u| = |-3||v| = 3|v| (độ dài luôn dương).
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Vì sao độ dài |u| không thể bằng -3|v|?
  2. `[SO SÁNH]` Nếu k = 0 thì vectơ kết quả là gì?
- **TeacherCue (lớp yếu):** Nhấn mạnh: độ dài có dấu giá trị tuyệt đối |k|; dấu của k chỉ quyết định HƯỚNG.
- **LookFor:** HS phân biệt dấu của k (hướng) và độ lớn |k| (độ dài).

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Hiểu định nghĩa tích của một số thực k với một vectơ; xác định hướng và độ dài của k·a.
- **Should:** Nắm vững các tính chất phân phối, kết hợp; điều kiện hai vectơ cùng phương (a = k·b).
- **Could:** Vận dụng điều kiện ba điểm thẳng hàng và biểu diễn một vectơ theo hai vectơ không cùng phương.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Khi nhân vectơ a với số k < 0, hướng và độ dài của vectơ mới thay đổi như thế nào?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Định nghĩa: $k\vec a$ cùng hướng $\vec a$ nếu $k > 0$, ngược hướng nếu $k < 0$; $|k\vec a| = |k| \cdot |\vec a|$.
- **Bước 2:** Tính chất kết hợp: $k(m\vec a) = (km)\vec a$.
- **Bước 3:** Tính chất phân phối: $(k + m)\vec a = k\vec a + m\vec a$ và $k(\vec a + \vec b) = k\vec a + k\vec b$.
- **Bước 4:** Điều kiện cùng phương: $\vec a$ và $\vec b$ (với $\vec b \ne \vec 0$) cùng phương $\iff \exists k \in \mathbb{R}: \vec a = k\vec b$.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Làm thế nào để chứng minh ba điểm A, B, C thẳng hàng bằng vectơ?
  2. `[PHÁT HIỆN]` Hai vectơ đối nhau liên hệ thế nào qua phép nhân số?
- **TeacherCue (lớp yếu):** Vẽ trục số và các vectơ 2a, -3a, 1/2a.
- **Chốt:** k quyết định hướng qua dấu (+ là cùng, - là ngược) và quyết định độ co giãn qua |k|.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI viết: Cho vectơ a có độ dài bằng 5. Độ dài của vectơ u = -4a là |u| = -4 · 5 = -20."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI giải: Cho vectơ a có độ dài bằng 4. Khi đó độ dài của vectơ -2a là |-2a| = -2 · 4 = -8.
  2. Bằng chứng: Độ dài của một vectơ luôn là số không âm. Theo định nghĩa: |k·a| = |k| · |a|.
  3. Sửa: |-2a| = |-2| · |a| = 2 · 4 = 8; độ dài không bao giờ mang giá trị âm.
- **TeacherCue:** Yêu cầu HS viết lại công thức độ dài có dấu giá trị tuyệt đối.
- **LookFor:** HS chỉ ra sai sót dấu âm và sửa thành 8.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "áp dụng định nghĩa |k·a| = |k|·|a|; k > 0 cùng hướng, k < 0 ngược hướng."
  - **S:** "dùng tính chất phân phối để rút gọn biểu thức vectơ chứa số."
  - **C:** "để chứng minh A, B, C thẳng hàng: chỉ ra AB = k·AC."

- **Luồng M (Must) — hint: áp dụng định nghĩa |k·a| = |k|·|a|; k > 0 cùng hướng, k < 0 ngược hướng.**
1. Cho vectơ a khác 0. Vectơ -5a có cùng hướng hay ngược hướng với a?
   - **Đáp án:** Ngược hướng vì hệ số k = -5 < 0.
2. Biết |a| = 7. Tính độ dài của vectơ u = -3a.
   - **Đáp án:** |u| = |-3| · |a| = 3 · 7 = 21.

- **Luồng S (Should) — hint: dùng tính chất phân phối để rút gọn biểu thức vectơ chứa số.**
1. Cho đoạn thẳng AB có I là trung điểm. Rút gọn biểu thức 2IA + 2IB.
   - **Đáp án:** 2IA + 2IB = 2(IA + IB) = 2 · 0 = 0.
2. Cho tam giác ABC có G là trọng tâm. Khẳng định GA + GB + GC = 0 đúng hay sai?
   - **Đáp án:** Đúng, đây là tính chất trọng tâm tam giác.

- **Luồng C (Could) — hint: để chứng minh A, B, C thẳng hàng: chỉ ra AB = k·AC.**
1. Cho tam giác ABC. Gọi M trên cạnh BC sao cho BM = 2MC. Biểu diễn vectơ AM theo AB và AC.
   - **Đáp án:** Ta có BM = 2/3 BC = 2/3 (AC - AB). Do đó AM = AB + BM = AB + 2/3 AC - 2/3 AB = 1/3 AB + 2/3 AC.
2. Cho 3 điểm A, B, C phân biệt thỏa mãn AB = -3AC. Hỏi ba điểm A, B, C có thẳng hàng không và điểm nào nằm giữa hai điểm còn lại?
   - **Đáp án:** Vì AB = -3AC nên hai vectơ AB và AC cùng phương -> A, B, C thẳng hàng. Vì k = -3 < 0 nên AB và AC ngược hướng, do đó điểm A nằm giữa B và C.

- **LookFor:** HS M xác định đúng hướng và độ dài; HS S rút gọn đúng; HS C chứng minh thẳng hàng.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Cho vectơ $\vec a \ne \vec 0$. Tìm số $k$ sao cho vectơ $k\vec a$ ngược hướng với $\vec a$ và có độ dài gấp 4 lần $|\vec a|$. → Vì ngược hướng nên $k < 0$. Vì độ dài gấp 4 lần nên $|k| = 4$. Do đó $k = -4$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "|k·a| = k·|a| với mọi k thực" → **Sai — phải là |k|·|a|**
  - "Nếu k < 0 thì k·a ngược hướng với a" → **Đúng**
  - "A, B, C thẳng hàng khi và chỉ khi tồn tại k sao cho AB = k·AC" → **Đúng**
- **TeacherCue:** Đổi phiếu chấm chéo, chú ý k = -4 chứ không phải 4.

- **Câu 1:** Vectơ 0 nhân với số 100 bằng bao nhiêu? → Bằng vectơ 0 (100 · 0 = 0).
- **Câu 2:** Nếu a = 2b thì hai vectơ a và b có độ dài liên hệ như thế nào? → |a| = |2b| = 2|b|, độ dài của a gấp đôi độ dài của b.
- **Chốt nhanh:** |k·a| = |k|·|a| ≥ 0; k > 0 cùng hướng, k < 0 ngược hướng; a = k·b -> cùng phương.

- Phép thu phóng (scaling) ảnh vector trong Adobe Illustrator dựa trên phép nhân vectơ với tỉ lệ k.
- Nếu k > 1 ảnh phóng to; 0 < k < 1 ảnh thu nhỏ; k < 0 tạo phép đối xứng qua tâm và đảo chiều.
- Định dạng ảnh vector SVG không bị vỡ hạt khi phóng to nhờ tính chất toán học này.
- **TeacherCue:** Hỏi: "Tại sao ảnh vector SVG phóng to vô hạn không vỡ hình như ảnh JPEG?"

- **Exit Ticket (4 mục):**
  1. Nêu định nghĩa hướng và độ dài của vectơ k·a.
  2. Nêu 1 bẫy (|k·a| = k·|a| mang dấu âm khi k < 0).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Nếu AB = -2CD thì hai đoạn thẳng AB và CD song song hay chéo nhau?
- **TeacherCue (lớp yếu):** Nhìn lại tình huống drone tăng tốc và quay đầu.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Cho vectơ a khác 0. Vectơ -5a có cùng hướng hay ngược hướng với a?
   - **Đáp án:** Ngược hướng vì hệ số k = -5 < 0.
2. `[NB]` Biết |a| = 7. Tính độ dài của vectơ u = -3a.
   - **Đáp án:** |u| = |-3| · |a| = 3 · 7 = 21.
3. `[TH]` Cho đoạn thẳng AB có I là trung điểm. Rút gọn biểu thức 2IA + 2IB.
   - **Đáp án:** 2IA + 2IB = 2(IA + IB) = 2 · 0 = 0.
4. `[TH]` Cho tam giác ABC có G là trọng tâm. Khẳng định GA + GB + GC = 0 đúng hay sai?
   - **Đáp án:** Đúng, đây là tính chất trọng tâm tam giác.
5. `[VD]` Cho tam giác ABC. Gọi M trên cạnh BC sao cho BM = 2MC. Biểu diễn vectơ AM theo AB và AC.
   - **Đáp án:** Ta có BM = 2/3 BC = 2/3 (AC - AB). Do đó AM = AB + BM = AB + 2/3 AC - 2/3 AB = 1/3 AB + 2/3 AC.
6. `[VD]` Cho 3 điểm A, B, C phân biệt thỏa mãn AB = -3AC. Hỏi ba điểm A, B, C có thẳng hàng không và điểm nào nằm giữa hai điểm còn lại?
   - **Đáp án:** Vì AB = -3AC nên hai vectơ AB và AC cùng phương -> A, B, C thẳng hàng. Vì k = -3 < 0 nên AB và AC ngược hướng, do đó điểm A nằm giữa B và C.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Bỏ quên dấu giá trị tuyệt đối: viết |k·a| = k·|a| dẫn đến độ dài bị âm khi k < 0.
- Nhầm số 0 với vectơ 0 (viết k·a = 0 thay vì vectơ 0).
- Nhầm lẫn hướng: cho rằng số âm thì độ dài giảm đi.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.

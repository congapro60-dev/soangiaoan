# KẾ HOẠCH DẠY HỌC — Giới hạn của dãy số (Toán 11 · Tuần 12 · Tiết 85)

| Lớp | 11 | Tên bài học | Giới hạn của dãy số | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 12 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-11-12-85.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Nắm vững các phép toán trên giới hạn hữu hạn (tổng, hiệu, tích, thương); tính tổng CSN lùi vô hạn S = u1/(1-q).
- **Should (Trọng tâm – Thông hiểu):** Thành thạo phương pháp chia cả tử và mẫu cho lũy thừa bậc cao nhất của n; xử lý dạng vô định cơ bản.
- **Could (Nâng cao – Vận dụng):** Biểu diễn số thập phân vô hạn tuần hoàn dưới dạng phân số tối giản qua cấp số nhân lùi vô hạn.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Nghịch lý chia bánh Zeno và bài toán tổng cấp số nhân lùi vô hạn:**
- Ta có một chiếc bánh. Lần 1 lấy $1/2$ chiếc; lần 2 lấy $1/4$; lần 3 lấy $1/8$; ...; lần $n$ lấy $1/2^n$.
- Tổng lượng bánh lấy được sau $n$ lần là:
  $$S_n = \dfrac{1}{2} + \dfrac{1}{4} + \dfrac{1}{8} + \dots + \dfrac{1}{2^n}.$$
- Đây là tổng $n$ số hạng đầu của cấp số nhân có $u_1 = 1/2$, công bội $q = 1/2$ ($|q| < 1$).
  $$S_n = u_1 \dfrac{1 - q^n}{1 - q} = \dfrac{1}{2} \cdot \dfrac{1 - (1/2)^n}{1 - 1/2} = 1 - \left(\dfrac{1}{2}\right)^n.$$
- Khi cho $n \to +\infty$, vì $\lim (1/2)^n = 0$ nên:
  $$S = \lim S_n = 1 - 0 = 1.$$
- **Công thức tổng quát cấp số nhân lùi vô hạn ($|q| < 1$):**
  $$S = u_1 + u_1 q + u_1 q^2 + \dots = \dfrac{u_1}{1 - q}.$$
- **Ứng dụng chuyển đổi số thập phân tuần hoàn:**
  $$0{,}(3) = 0{,}333\dots = \dfrac{3}{10} + \dfrac{3}{100} + \dots = \dfrac{3/10}{1 - 1/10} = \dfrac{3/10}{9/10} = \dfrac{1}{3}.$$

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Tổng S = 1/2 + 1/4 + 1/8 + 1/16 + ... tiếp diễn mãi mãi không dừng.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Giá trị của tổng vô hạn S bằng bao nhiêu?*
  - (A) Bằng vô cực (vì cộng vô hạn số dương)
  - (B) Bằng đúng 1
  - (C) Bé hơn 1
  - **Correct: (B)** — Tổng hữu hạn Sn = 1 - (1/2)^n; khi n tiến ra vô cực thì (1/2)^n tiến về 0, do đó lim Sn = 1.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Vì sao cộng vô hạn số dương lại ra một số hữu hạn?
  2. `[SO SÁNH]` Nếu q = 1 thì tổng 1 + 1 + 1 + ... có giới hạn hữu hạn không?
- **TeacherCue (lớp yếu):** Vẽ hình vuông cạnh 1, chia đôi liên tiếp: các mảnh ghép vừa khít diện tích bằng 1.
- **LookFor:** HS hiểu tổng lùi vô hạn hội tụ về một số hữu hạn.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Nắm vững các phép toán trên giới hạn hữu hạn (tổng, hiệu, tích, thương); tính tổng CSN lùi vô hạn S = u1/(1-q).
- **Should:** Thành thạo phương pháp chia cả tử và mẫu cho lũy thừa bậc cao nhất của n; xử lý dạng vô định cơ bản.
- **Could:** Biểu diễn số thập phân vô hạn tuần hoàn dưới dạng phân số tối giản qua cấp số nhân lùi vô hạn.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Khi gặp giới hạn dạng phân thức hữu tỉ lim P(n)/Q(n), phương pháp mẫu mực để khử dạng vô định là gì?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Phép toán: $\lim(u_n \pm v_n) = a \pm b$; $\lim(u_n v_n) = ab$; $\lim(u_n / v_n) = a/b$ ($b \ne 0$).
- **Bước 2:** Giới hạn căn: Nếu $u_n \ge 0$ và $\lim u_n = a$ thì $a \ge 0$ và $\lim \sqrt{u_n} = \sqrt{a}$.
- **Bước 3:** Kỹ thuật phân thức: Chia cả tử và mẫu cho $n^k$ với $k$ là bậc cao nhất của mẫu.
- **Bước 4:** Cấp số nhân lùi vô hạn ($|q| < 1$): $S = \dfrac{u_1}{1 - q}$.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Khi bậc tử bằng bậc mẫu, giới hạn phân thức bằng gì?
  2. `[PHÁT HIỆN]` Khi nào thì cấp số nhân được gọi là lùi vô hạn?
- **TeacherCue (lớp yếu):** Bảng đối chiếu quy tắc chia lũy thừa bậc cao nhất.
- **Chốt:** Tách biểu thức về các giới hạn cơ bản 1/n^k -> 0; CSN lùi vô hạn chỉ áp dụng khi |q| < 1.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI viết: Tính tổng S = 1 + 3 + 9 + 27 + ... Đây là cấp số nhân có u1 = 1, q = 3 nên áp dụng công thức: S = u1 / (1 - q) = 1 / (1 - 3) = -1/2."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI giải: Tính tổng S = 1 + 2 + 4 + 8 + ...: AI áp dụng công thức S = u1/(1-q) với u1 = 1, q = 2 được S = 1/(1-2) = -1.
  2. Bằng chứng: Tổng các số nguyên dương tăng dần 1 + 2 + 4 + ... không thể bằng số âm -1. Công thức S = u1/(1-q) chỉ áp dụng khi |q| < 1.
  3. Sửa: Ở đây q = 2 > 1 nên cấp số nhân không lùi vô hạn; tổng tăng vô hạn ra +∞, không có giới hạn hữu hạn.
- **TeacherCue:** Yêu cầu HS kiểm tra điều kiện |q| < 1 trước khi dùng công thức.
- **LookFor:** HS phát hiện điều kiện |q| < 1 bị vi phạm.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "chia cả tử và mẫu cho bậc cao nhất của n; thay các phân số dạng c/n^k bằng 0."
  - **S:** "nhớ công thức CSN lùi vô hạn S = u1/(1-q) và luôn kiểm tra điều kiện |q| < 1."
  - **C:** "phân tích số thập phân vô hạn tuần hoàn 0,(ab) thành tổng CSN có u1 = ab/100, q = 1/100."

- **Luồng M (Must) — hint: chia cả tử và mẫu cho bậc cao nhất của n; thay các phân số dạng c/n^k bằng 0.**
1. Tính lim (2 + 1/n).
   - **Đáp án:** lim 2 + lim(1/n) = 2 + 0 = 2.
2. Cấp số nhân có u1 = 5, q = -0,2 có phải lùi vô hạn không? Vì sao?
   - **Đáp án:** Có, vì |q| = |-0,2| = 0,2 < 1.

- **Luồng S (Should) — hint: nhớ công thức CSN lùi vô hạn S = u1/(1-q) và luôn kiểm tra điều kiện |q| < 1.**
1. Tính giới hạn: lim (3n² + 1)/(n² - 4).
   - **Đáp án:** Chia cả tử và mẫu cho n²: lim (3 + 1/n²)/(1 - 4/n²) = 3/1 = 3.
2. Tính tổng cấp số nhân lùi vô hạn: S = 1 - 1/2 + 1/4 - 1/8 + ...
   - **Đáp án:** u1 = 1, q = -1/2 (|q| < 1). S = 1 / [1 - (-1/2)] = 1 / (3/2) = 2/3.

- **Luồng C (Could) — hint: phân tích số thập phân vô hạn tuần hoàn 0,(ab) thành tổng CSN có u1 = ab/100, q = 1/100.**
1. Viết số thập phân vô hạn tuần hoàn 0,(15) dưới dạng phân số tối giản.
   - **Đáp án:** 0,(15) = 15/100 + 15/10000 + ... là tổng CSN có u1 = 15/100, q = 1/100. S = (15/100)/(1 - 1/100) = (15/100)/(99/100) = 15/99 = 5/33.
2. Tính giới hạn: lim [√(n² + 2n) - n].
   - **Đáp án:** Nhân liên hợp: [n² + 2n - n²] / [√(n² + 2n) + n] = 2n / [n(√(1 + 2/n) + 1)] = 2 / [√(1 + 2/n) + 1]. Khi n -> +∞, giới hạn bằng 2/(1 + 1) = 1.

- **LookFor:** HS M tính đúng giới hạn phân thức; HS S tính đúng tổng CSN; HS C đổi số thập phân ra phân số.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Tính giới hạn: $\lim \dfrac{4n^2 + 3n - 1}{2n^2 + 5}$ và tính tổng $S = 2 + 1 + 1/2 + 1/4 + \dots$ → (a) Chia cả tử và mẫu cho $n^2$: $\lim \dfrac{4 + 3/n - 1/n^2}{2 + 5/n^2} = \dfrac{4+0-0}{2+0} = 2$. (b) $u_1 = 2, q = 1/2$: $S = \dfrac{2}{1 - 1/2} = 4$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "lim (u_n / v_n) = lim u_n / lim v_n luôn đúng với mọi dãy v_n" → **Sai — mẫu phải có giới hạn khác 0**
  - "Tổng cấp số nhân lùi vô hạn có công thức S = u1 / (1 - q) với |q| < 1" → **Đúng**
  - "lim [(3n+1)/(n+2)] = 3" → **Đúng**
- **TeacherCue:** Đổi phiếu chấm chéo, kiểm tra điều kiện mẫu khác 0.

- **Câu 1:** Nếu bậc của tử nhỏ hơn bậc của mẫu thì giới hạn của phân thức bằng bao nhiêu khi n -> +∞? → Bằng 0, vì sau khi chia cho lũy thừa cao nhất của mẫu, tử số tiến về 0 còn mẫu tiến về hằng số khác 0.
- **Câu 2:** Có thể áp dụng công thức S = u1/(1-q) cho dãy 3, 3, 3, 3,... không? → Không, vì q = 1 vi phạm điều kiện |q| < 1.
- **Chốt nhanh:** Phân thức: chia bậc cao nhất của mẫu; CSN lùi vô hạn: S = u1/(1-q) với điều kiện bắt buộc |q| < 1.

- Trong tài chính, giá trị hiện tại của một dòng tiền vĩnh viễn (perpetuity) tính bằng tổng CSN lùi vô hạn: PV = C / r.
- Định giá cổ phiếu trả cổ tức đều đặn vô hạn dựa trên mô hình chiết khấu Gordon.
- Quy đổi chính xác các khoản thanh toán định kỳ trong bảo hiểm và quỹ hưu trí.
- **TeacherCue:** Hỏi: "Một khoản tài trợ trao học bổng 100 triệu mỗi năm mãi mãi cần số vốn ban đầu bao nhiêu nếu lãi suất 5%?"

- **Exit Ticket (4 mục):**
  1. Nêu phương pháp tính giới hạn dạng phân thức lim P(n)/Q(n).
  2. Nêu 1 bẫy (dùng công thức S = u1/(1-q) khi |q| ≥ 1).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Chuyển số thập phân vô hạn tuần hoàn 0,(6) thành phân số tối giản.
- **TeacherCue (lớp yếu):** Nhìn lại nghịch lý Zeno và hình vuông cạnh 1.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Tính lim (2 + 1/n).
   - **Đáp án:** lim 2 + lim(1/n) = 2 + 0 = 2.
2. `[NB]` Cấp số nhân có u1 = 5, q = -0,2 có phải lùi vô hạn không? Vì sao?
   - **Đáp án:** Có, vì |q| = |-0,2| = 0,2 < 1.
3. `[TH]` Tính giới hạn: lim (3n² + 1)/(n² - 4).
   - **Đáp án:** Chia cả tử và mẫu cho n²: lim (3 + 1/n²)/(1 - 4/n²) = 3/1 = 3.
4. `[TH]` Tính tổng cấp số nhân lùi vô hạn: S = 1 - 1/2 + 1/4 - 1/8 + ...
   - **Đáp án:** u1 = 1, q = -1/2 (|q| < 1). S = 1 / [1 - (-1/2)] = 1 / (3/2) = 2/3.
5. `[VD]` Viết số thập phân vô hạn tuần hoàn 0,(15) dưới dạng phân số tối giản.
   - **Đáp án:** 0,(15) = 15/100 + 15/10000 + ... là tổng CSN có u1 = 15/100, q = 1/100. S = (15/100)/(1 - 1/100) = (15/100)/(99/100) = 15/99 = 5/33.
6. `[VD]` Tính giới hạn: lim [√(n² + 2n) - n].
   - **Đáp án:** Nhân liên hợp: [n² + 2n - n²] / [√(n² + 2n) + n] = 2n / [n(√(1 + 2/n) + 1)] = 2 / [√(1 + 2/n) + 1]. Khi n -> +∞, giới hạn bằng 2/(1 + 1) = 1.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Áp dụng công thức tổng CSN lùi vô hạn khi |q| ≥ 1 dẫn đến kết quả vô lý (tổng dương ra âm).
- Chia cho lũy thừa bậc cao nhất của tử thay vì của mẫu dẫn đến xuất hiện dạng 0 ở mẫu.
- Quên điều kiện mẫu khác 0 khi dùng quy tắc giới hạn thương.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.

# KẾ HOẠCH DẠY HỌC — Giải phương trình lượng giác cos x = m (Toán 11 · Tuần 5 · Tiết 27)

| Lớp | 11 | Tên bài học | Giải phương trình lượng giác cos x = m | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 5 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-11-5-27.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Viết đúng nghiệm $x = \pm\alpha + 2k\pi$ và xử lý trường hợp đặc biệt $m = \pm1$.
- **Should (Trọng tâm – Thông hiểu):** Lọc nghiệm theo khoảng thời gian thực tế (0–24 giờ) và giải thích ý nghĩa hai thời điểm.
- **Could (Nâng cao – Vận dụng):** Biện luận số nghiệm theo $m$ trong một chu kỳ; mô hình hóa bài điều hoà nhiệt độ.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Nhiệt độ phòng học được điều hoà theo $T(t) = 26 + 4\cos\dfrac{\pi t}{12}$ (°C), $t$ là giờ tính từ 0h.**

- **Đạt 28°C:** $26 + 4\cos\dfrac{\pi t}{12} = 28 \Leftrightarrow \cos\dfrac{\pi t}{12} = \tfrac12$.
  - $\dfrac{\pi t}{12} = \pm\dfrac{\pi}{3} + 2k\pi \Rightarrow t = \pm 4 + 24k$.
  - Trong $[0; 24]$: $t = 4$ giờ và $t = 20$ giờ.
- **Đạt 22°C:** $\cos\dfrac{\pi t}{12} = -1 \Rightarrow \dfrac{\pi t}{12} = \pi + 2k\pi \Rightarrow t = 12 + 24k$ → $t = 12$ giờ.
- **Kiểm chứng tay:** $\cos\tfrac{\pi}{3} = \tfrac12$ ✓; $\cos\pi = -1$ ✓; $T(4) = 26 + 4\cdot\tfrac12 = 28$ ✓.
- **Đạt 31°C:** $\cos = 1{,}25$ → **vô nghiệm** (nhiệt độ tối đa là 30°C).

**Bẫy của bài:** quên dấu $\pm$; quên điều kiện $|m| \le 1$; nhầm chu kỳ $k\pi$.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** T(t) = 26 + 4cos(πt/12). Hỏi thời điểm T = 28°C trong ngày.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Phương trình 26 + 4cos(πt/12) = 28 dẫn tới điều gì?*
  - (A) cos(πt/12) = 2
  - (B) cos(πt/12) = 1/2
  - (C) cos(πt/12) = −1/2
  - **Correct: (B)** — 4cos = 2 nên cos = 1/2 — thỏa |m| ≤ 1 nên có nghiệm.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Vì sao có hai thời điểm trong ngày?
  2. `[SO SÁNH]` 31°C có đạt được không?
- **TeacherCue (lớp yếu):** Vẽ đồ thị cos trong 24 giờ; kẻ đường y = 1/2 để thấy hai giao điểm.
- **LookFor:** HS thấy tính đối xứng của hai nghiệm.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Viết đúng nghiệm $x = \pm\alpha + 2k\pi$ và xử lý trường hợp đặc biệt $m = \pm1$.
- **Should:** Lọc nghiệm theo khoảng thời gian thực tế (0–24 giờ) và giải thích ý nghĩa hai thời điểm.
- **Could:** Biện luận số nghiệm theo $m$ trong một chu kỳ; mô hình hóa bài điều hoà nhiệt độ.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Vì sao công thức nghiệm của cos lại đối xứng ($\pm\alpha$) trong khi sin thì không?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Điều kiện có nghiệm: $|m| \le 1$.
- **Bước 2:** Với $\cos\alpha = m$: $\cos x = m \Leftrightarrow x = \pm\alpha + 2k\pi$.
- **Bước 3:** Trường hợp đặc biệt: $\cos x = 1 \Leftrightarrow x = 2k\pi$; $\cos x = -1 \Leftrightarrow x = \pi + 2k\pi$; $\cos x = 0 \Leftrightarrow x = \tfrac{\pi}{2} + k\pi$.
- **Bước 4:** Lọc nghiệm theo khoảng thực tế (ví dụ $0 \le t \le 24$).
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao cos có dấu ± còn sin thì dùng π − α?
  2. `[PHÁT HIỆN]` Với T(t) = 28, t = 4 và t = 20 — hai thời điểm này có ý nghĩa gì?
- **TeacherCue (lớp yếu):** Khung: điều kiện — ±α — lọc. Nhắc: cos đối xứng qua trục hoành nên có ±.
- **Chốt:** cos đối xứng qua trục ngang → hai nghiệm ±α; sin đối xứng qua trục dọc → α và π − α.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI giải: "26 + 4cos(πt/12) = 28 ⇒ cos(πt/12) = 1/2 ⇒ πt/12 = π/3 + 2kπ ⇒ t = 4 + 24k. Trong ngày chỉ có một thời điểm t = 4 giờ.""
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI viết $t = 4 + 24k$ rồi kết luận chỉ có 4 giờ trong ngày.
  2. Bằng chứng: Thiếu nhánh $t = -4 + 24k$; với $k = 1$ được $t = 20$ giờ — vẫn trong ngày.
  3. Sửa: $t = \pm4 + 24k$; trong $[0;24]$ có $t = 4$ và $t = 20$.
- **TeacherCue:** Cho HS thử k = 0, 1 vào cả hai nhánh để thấy 20 giờ.
- **LookFor:** HS kiểm từng giá trị k thay vì chỉ lấy k = 0.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "kiểm |m| ≤ 1 rồi viết ±α."
  - **S:** "xử lý trường hợp đặc biệt, lọc theo khoảng."
  - **C:** "biện luận số nghiệm trong một chu kỳ theo m."

- **Luồng M (Must) — hint: kiểm |m| ≤ 1 rồi viết ±α.**
1. Nêu điều kiện của m để cos x = m có nghiệm.
   - **Đáp án:** −1 ≤ m ≤ 1.
2. Giải phương trình cos x = 1/2.
   - **Đáp án:** x = ±π/3 + 2kπ, k ∈ ℤ.

- **Luồng S (Should) — hint: xử lý trường hợp đặc biệt, lọc theo khoảng.**
1. Giải phương trình cos x = −1.
   - **Đáp án:** x = π + 2kπ, k ∈ ℤ.
2. Giải phương trình cos(3x) = cos(π/4).
   - **Đáp án:** 3x = ±π/4 + 2kπ ⇒ x = ±π/12 + 2kπ/3.

- **Luồng C (Could) — hint: biện luận số nghiệm trong một chu kỳ theo m.**
1. Với T(t) = 26 + 4cos(πt/12), tìm t ∈ [0; 24] để T = 22°C.
   - **Đáp án:** cos(πt/12) = −1 ⇔ πt/12 = π + 2kπ ⇒ t = 12 + 24k; trong [0;24] được t = 12 giờ.
2. Tìm nghiệm của cos x = −√2/2 trong khoảng [0; π].
   - **Đáp án:** x = 3π/4 (nhánh −3π/4 + 2π = 5π/4 không thuộc [0; π]).

- **LookFor:** HS M viết đúng ±; HS S lọc đúng; HS C biện luận rõ.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Giải $\cos x = -\tfrac{\sqrt2}{2}$. → $\cos x = \cos\tfrac{3\pi}{4} \Rightarrow x = \pm\tfrac{3\pi}{4} + 2k\pi$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "cos x = 3/2 có nghiệm" → **Sai — |m| > 1**
  - "cos x = 1 ⇔ x = 2kπ" → **Đúng**
  - "cos x = m có nghiệm x = ±α + kπ" → **Sai — phải là 2kπ**
- **TeacherCue:** Chiếu 2 bài, kiểm bằng đồ thị cos.

- **Câu 1:** Vì sao nghiệm của cos x = m có dấu ±? → Vì hai điểm trên đường tròn lượng giác có cùng cosin đối xứng qua trục hoành, ứng với α và −α.
- **Câu 2:** Chu kỳ của phương trình cos x = m là bao nhiêu? → 2kπ (không phải kπ) — trừ trường hợp đặc biệt cos x = 0 dùng kπ.
- **Chốt nhanh:** Điều kiện |m| ≤ 1 — nghiệm ±α + 2kπ — lọc theo khoảng.

- 28°C lúc 4 giờ và 20 giờ — hai thời điểm đối xứng quanh 12 giờ.
- 22°C lúc 12 giờ — mức thấp nhất trong ngày.
- 30°C là cực đại tại t = 0 (24 giờ) và t = 24 — không thể đạt 31°C.
- **TeacherCue:** Hỏi: "Nếu muốn phòng mát trước 8 giờ, nên đặt nhiệt độ mục tiêu nào?" — dùng đồ thị để chọn.

- **Exit Ticket (4 mục):**
  1. Nêu công thức nghiệm cos x = m.
  2. Nêu 1 bẫy (quên ±; |m| > 1).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Giải cos(πt/12) = 1/2 trong [0; 24].
- **TeacherCue (lớp yếu):** Mở lại đồ thị và công thức ở S3.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Nêu điều kiện của m để cos x = m có nghiệm.
   - **Đáp án:** −1 ≤ m ≤ 1.
2. `[NB]` Giải phương trình cos x = 1/2.
   - **Đáp án:** x = ±π/3 + 2kπ, k ∈ ℤ.
3. `[TH]` Giải phương trình cos x = −1.
   - **Đáp án:** x = π + 2kπ, k ∈ ℤ.
4. `[TH]` Giải phương trình cos(3x) = cos(π/4).
   - **Đáp án:** 3x = ±π/4 + 2kπ ⇒ x = ±π/12 + 2kπ/3.
5. `[VD]` Với T(t) = 26 + 4cos(πt/12), tìm t ∈ [0; 24] để T = 22°C.
   - **Đáp án:** cos(πt/12) = −1 ⇔ πt/12 = π + 2kπ ⇒ t = 12 + 24k; trong [0;24] được t = 12 giờ.
6. `[VD]` Tìm nghiệm của cos x = −√2/2 trong khoảng [0; π].
   - **Đáp án:** x = 3π/4 (nhánh −3π/4 + 2π = 5π/4 không thuộc [0; π]).

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Quên dấu ± trong nghiệm.
- Quên điều kiện |m| ≤ 1.
- Dùng kπ thay vì 2kπ (trừ trường hợp cos x = 0).

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.

# KẾ HOẠCH DẠY HỌC — Giải phương trình lượng giác tan x = m, cot x = m (Toán 11 · Tuần 6 · Tiết 34)

| Lớp | 11 | Tên bài học | Giải phương trình lượng giác tan x = m, cot x = m | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 6 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-11-6-34.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Viết nghiệm $\tan x = m$ và $\cot x = m$ đúng chu kỳ $k\pi$, kèm điều kiện xác định.
- **Should (Trọng tâm – Thông hiểu):** Giải phương trình có hệ số góc (tan 2x, cot 3x) và lọc nghiệm theo khoảng.
- **Could (Nâng cao – Vận dụng):** Mô hình hóa bài độ dốc mái và biện luận nghiệm theo điều kiện thực tế.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Mái nhà có độ dốc $i = \tan\alpha$. Tiêu chuẩn thiết kế yêu cầu $i = 0{,}5$ (khoảng 26,6°).**

- **Phương trình:** $\tan\alpha = 0{,}5 \Leftrightarrow \alpha = \arctan 0{,}5 + k\pi$, với $\alpha \ne \tfrac{\pi}{2} + k\pi$.
- Trong khoảng $(0; \tfrac{\pi}{2})$: $\alpha \approx 26{,}57^\circ$ — phù hợp tiêu chuẩn mái dốc.
- **Kiểm chứng tay:** $\tan 26{,}57^\circ \approx 0{,}5$ ✓ (dùng máy tính: arctan 0,5 ≈ 26,5651°).
- **Mái quá dốc $i = 2$:** $\alpha = \arctan 2 \approx 63{,}43^\circ$ — vượt tiêu chuẩn an toàn.
- **Chu kỳ của tan/cot là $k\pi$** (không phải $2k\pi$) vì tan và cot tuần hoàn chu kỳ $\pi$.

**Bẫy của bài:** quên điều kiện $\cos x \ne 0$ (với tan) và $\sin x \ne 0$ (với cot); dùng chu kỳ $2k\pi$; quên rằng tan nhận **mọi** giá trị thực nên không có điều kiện $|m| \le 1$.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Tiêu chuẩn i = tan α = 0,5. Hỏi góc nghiêng α bằng bao nhiêu?
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Phương trình tan α = 0,5 có điều kiện gì?*
  - (A) |0,5| ≤ 1 nên luôn có nghiệm, không cần điều kiện
  - (B) Cần α ≠ π/2 + kπ
  - (C) Cần α ≠ kπ
  - **Correct: (B)** — tan xác định khi cos α ≠ 0, tức α ≠ π/2 + kπ. Tan nhận mọi giá trị thực nên không cần |m| ≤ 1.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Vì sao tan không có điều kiện |m| ≤ 1?
  2. `[SO SÁNH]` Chu kỳ của tan khác sin ở đâu?
- **TeacherCue (lớp yếu):** Vẽ đồ thị tan với các đường tiệm cận đứng — chỉ rõ chỗ không xác định.
- **LookFor:** HS nêu điều kiện xác định trước khi giải.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Viết nghiệm $\tan x = m$ và $\cot x = m$ đúng chu kỳ $k\pi$, kèm điều kiện xác định.
- **Should:** Giải phương trình có hệ số góc (tan 2x, cot 3x) và lọc nghiệm theo khoảng.
- **Could:** Mô hình hóa bài độ dốc mái và biện luận nghiệm theo điều kiện thực tế.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Vì sao tan và cot lại có điều kiện xác định, trong khi sin và cos thì không?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** $\tan x = m \Leftrightarrow x = \arctan m + k\pi$, điều kiện $x \ne \tfrac{\pi}{2} + k\pi$.
- **Bước 2:** $\cot x = m \Leftrightarrow x = \operatorname{arccot} m + k\pi$, điều kiện $x \ne k\pi$.
- **Bước 3:** Trường hợp đặc biệt: $\tan x = 0 \Leftrightarrow x = k\pi$; $\cot x = 0 \Leftrightarrow x = \tfrac{\pi}{2} + k\pi$.
- **Bước 4:** Lọc nghiệm theo khoảng, chú ý loại các giá trị vi phạm điều kiện xác định.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao chu kỳ là kπ mà không phải 2kπ?
  2. `[PHÁT HIỆN]` $\cot x = 0$ có nghiệm tại đâu?
- **TeacherCue (lớp yếu):** Khung 3 dòng: điều kiện — công thức — lọc. Nhắc: tan/cot luôn có nghiệm với mọi m.
- **Chốt:** Tan và cot tuần hoàn chu kỳ π nên chỉ cần cộng kπ; điều kiện xác định là phần không thể bỏ.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI giải: "tan x = 0,5 ⇒ x = arctan(0,5) + 2kπ ≈ 26,57° + 2kπ. Không cần điều kiện gì thêm vì tan xác định với mọi x.""
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI giải tan x = 0,5 ra x = arctan0,5 + 2kπ và bỏ điều kiện xác định.
  2. Bằng chứng: Chu kỳ của tan là kπ, không phải 2kπ; và phải loại x = π/2 + kπ.
  3. Sửa: x = arctan 0,5 + kπ, x ≠ π/2 + kπ.
- **TeacherCue:** Cho HS so đồ thị tan (chu kỳ π) với sin (chu kỳ 2π).
- **LookFor:** HS phân biệt chu kỳ của bốn hàm.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "ghi điều kiện xác định trước, rồi viết nghiệm với kπ."
  - **S:** "xử lý hệ số góc (tan 2x) bằng cách chia cả chu kỳ."
  - **C:** "mô hình độ dốc và biện luận theo tiêu chuẩn."

- **Luồng M (Must) — hint: ghi điều kiện xác định trước, rồi viết nghiệm với kπ.**
1. Nêu điều kiện xác định của tan x và cot x.
   - **Đáp án:** tan x xác định khi cos x ≠ 0, tức x ≠ π/2 + kπ; cot x xác định khi sin x ≠ 0, tức x ≠ kπ.
2. Giải tan x = 1.
   - **Đáp án:** x = π/4 + kπ, điều kiện x ≠ π/2 + kπ.

- **Luồng S (Should) — hint: xử lý hệ số góc (tan 2x) bằng cách chia cả chu kỳ.**
1. Giải tan(2x) = −1.
   - **Đáp án:** 2x = −π/4 + kπ ⇒ x = −π/8 + kπ/2, điều kiện x ≠ π/4 + kπ/2.
2. Giải cot(3x) = 0.
   - **Đáp án:** 3x = π/2 + kπ ⇒ x = π/6 + kπ/3, điều kiện x ≠ kπ/3.

- **Luồng C (Could) — hint: mô hình độ dốc và biện luận theo tiêu chuẩn.**
1. Mái nhà có tan α = 2. Tính α và nhận xét so với tiêu chuẩn i = 0,5.
   - **Đáp án:** α = arctan 2 + kπ ≈ 63,43° + kπ. Trong (0; π/2) góc ≈ 63,43°, lớn hơn nhiều so với 26,57° của tiêu chuẩn — mái quá dốc.
2. Giải tan x = 0 và cho biết số nghiệm trong [0; 2π).
   - **Đáp án:** x = kπ; trong [0; 2π) có x = 0 và x = π — 2 nghiệm (x = 2π không thuộc khoảng nửa mở).

- **LookFor:** HS M đúng chu kỳ; HS S đúng hệ số; HS C gắn được với thực tế.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Giải $\tan 2x = 1$. → $2x = \tfrac{\pi}{4} + k\pi \Rightarrow x = \tfrac{\pi}{8} + \tfrac{k\pi}{2}$, với điều kiện $x \ne \tfrac{\pi}{4} + \tfrac{k\pi}{2}$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "tan x = m cần |m| ≤ 1" → **Sai — tan nhận mọi giá trị thực**
  - "Chu kỳ nghiệm của tan là kπ" → **Đúng**
  - "cot x xác định khi sin x ≠ 0" → **Đúng**
- **TeacherCue:** Chiếu 2 bài, kiểm điều kiện xác định.

- **Câu 1:** Vì sao tan x = m luôn có nghiệm với mọi m? → Vì tập giá trị của tan là toàn bộ ℝ (khác sin, cos bị chặn trong [−1; 1]).
- **Câu 2:** Chu kỳ nghiệm của cot là bao nhiêu? → kπ, vì cot tuần hoàn chu kỳ π.
- **Chốt nhanh:** Tan/cot: mọi m — chu kỳ kπ — nhớ điều kiện xác định.

- i = 0,5 → α ≈ 26,57°: đạt tiêu chuẩn mái dốc thông dụng.
- i = 2 → α ≈ 63,43°: quá dốc, cần gia cố kết cấu.
- i âm nghĩa là mái dốc ngược — không áp dụng cho nhà ở; phương trình vẫn có nghiệm nhưng cần loại theo ngữ cảnh.
- **TeacherCue:** Hỏi: "Vì sao toán cho nghiệm nhưng kỹ thuật vẫn có thể loại?" — nghiệm phải thỏa điều kiện thực tế.

- **Exit Ticket (4 mục):**
  1. Nêu công thức nghiệm tan x = m và điều kiện.
  2. Nêu 1 bẫy (dùng 2kπ; bỏ điều kiện xác định).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Giải tan α = 0,5 và cho biết góc trong (0; π/2).
- **TeacherCue (lớp yếu):** Mở lại khung 3 dòng ở S3.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Nêu điều kiện xác định của tan x và cot x.
   - **Đáp án:** tan x xác định khi cos x ≠ 0, tức x ≠ π/2 + kπ; cot x xác định khi sin x ≠ 0, tức x ≠ kπ.
2. `[NB]` Giải tan x = 1.
   - **Đáp án:** x = π/4 + kπ, điều kiện x ≠ π/2 + kπ.
3. `[TH]` Giải tan(2x) = −1.
   - **Đáp án:** 2x = −π/4 + kπ ⇒ x = −π/8 + kπ/2, điều kiện x ≠ π/4 + kπ/2.
4. `[TH]` Giải cot(3x) = 0.
   - **Đáp án:** 3x = π/2 + kπ ⇒ x = π/6 + kπ/3, điều kiện x ≠ kπ/3.
5. `[VD]` Mái nhà có tan α = 2. Tính α và nhận xét so với tiêu chuẩn i = 0,5.
   - **Đáp án:** α = arctan 2 + kπ ≈ 63,43° + kπ. Trong (0; π/2) góc ≈ 63,43°, lớn hơn nhiều so với 26,57° của tiêu chuẩn — mái quá dốc.
6. `[VD]` Giải tan x = 0 và cho biết số nghiệm trong [0; 2π).
   - **Đáp án:** x = kπ; trong [0; 2π) có x = 0 và x = π — 2 nghiệm (x = 2π không thuộc khoảng nửa mở).

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Dùng 2kπ cho tan/cot.
- Bỏ điều kiện xác định khi kết luận nghiệm.
- Áp điều kiện |m| ≤ 1 cho tan/cot.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.

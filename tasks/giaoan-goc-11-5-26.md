# KẾ HOẠCH DẠY HỌC — Giải phương trình lượng giác sin x = m (Toán 11 · Tuần 5 · Tiết 26)

| Lớp | 11 | Tên bài học | Giải phương trình lượng giác sin x = m | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 5 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-11-5-26.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Nhận biết điều kiện có nghiệm $|m| \le 1$ và viết nghiệm cơ bản của $\sin x = m$.
- **Should (Trọng tâm – Thông hiểu):** Viết đủ hai họ nghiệm, xử lý trường hợp đặc biệt $m = \pm1, 0$, và lọc nghiệm trên khoảng cho trước.
- **Could (Nâng cao – Vận dụng):** Mô hình hóa bài toán độ cao/thời điểm thành $\sin x = m$ và biện luận số nghiệm theo $m$.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Vòng đu quay Sun Wheel, cabin ở độ cao $h(\theta) = 10 + 8\sin\theta$ (mét), $\theta$ là góc quay tính bằng radian.**

- Cabin ở độ cao **14 m** khi $10 + 8\sin\theta = 14 \Leftrightarrow \sin\theta = \tfrac12$.
- Nghiệm: $\theta = \tfrac{\pi}{6} + 2k\pi$ hoặc $\theta = \tfrac{5\pi}{6} + 2k\pi$, $k \in \mathbb{Z}$.
- **Kiểm chứng tay:** $\sin\tfrac{\pi}{6} = \tfrac12$ ✓; $\sin\tfrac{5\pi}{6} = \sin(\pi - \tfrac{\pi}{6}) = \tfrac12$ ✓.
- **Độ cao 18 m** (đỉnh): $\sin\theta = 1 \Leftrightarrow \theta = \tfrac{\pi}{2} + 2k\pi$.
- **Độ cao 26 m:** $\sin\theta = 2$ → **vô nghiệm** vì $-1 \le \sin\theta \le 1$.

**Bẫy của bài:** quên điều kiện $|m| \le 1$; quên nhánh thứ hai $\pi - \alpha$; quên chu kỳ $2k\pi$.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** h(θ) = 10 + 8sin θ. Hỏi khi nào cabin ở 14 m?
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Phương trình 10 + 8sin θ = 14 dẫn tới phương trình lượng giác nào?*
  - (A) sin θ = 4
  - (B) sin θ = 1/2
  - (C) sin θ = 3
  - **Correct: (B)** — 8sin θ = 4 nên sin θ = 1/2 — đúng điều kiện |m| ≤ 1.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Vì sao có hai vị trí cùng độ cao 14 m?
  2. `[SO SÁNH]` Độ cao 26 m có đạt được không?
- **TeacherCue (lớp yếu):** Vẽ vòng tròn lượng giác, kẻ đường nằm ngang y = 1/2 — hai giao điểm chính là hai họ nghiệm.
- **LookFor:** HS thấy hai nhánh nghiệm từ hai giao điểm.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Nhận biết điều kiện có nghiệm $|m| \le 1$ và viết nghiệm cơ bản của $\sin x = m$.
- **Should:** Viết đủ hai họ nghiệm, xử lý trường hợp đặc biệt $m = \pm1, 0$, và lọc nghiệm trên khoảng cho trước.
- **Could:** Mô hình hóa bài toán độ cao/thời điểm thành $\sin x = m$ và biện luận số nghiệm theo $m$.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Vì sao phương trình sin x = m lại có vô số nghiệm và làm sao viết gọn tất cả nghiệm?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Điều kiện có nghiệm: $|m| \le 1$. Nếu $|m| > 1$ thì phương trình vô nghiệm.
- **Bước 2:** Với $|m| \le 1$, đặt $\sin\alpha = m$: $\sin x = m \Leftrightarrow x = \alpha + 2k\pi$ hoặc $x = \pi - \alpha + 2k\pi$.
- **Bước 3:** Trường hợp đặc biệt: $\sin x = 1 \Leftrightarrow x = \tfrac{\pi}{2} + 2k\pi$; $\sin x = -1 \Leftrightarrow x = -\tfrac{\pi}{2} + 2k\pi$; $\sin x = 0 \Leftrightarrow x = k\pi$.
- **Bước 4:** Lọc nghiệm: giải bất phương trình theo $k$ để chọn nghiệm trong khoảng bài cho.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao nhánh thứ hai là $\pi - \alpha$?
  2. `[PHÁT HIỆN]` Với $\sin x = \tfrac12$, nghiệm gần 0 nhất là bao nhiêu?
- **TeacherCue (lớp yếu):** Khung 3 dòng: điều kiện — công thức — lọc nghiệm. Nhắc HS yếu viết "hoặc" giữa hai họ.
- **Chốt:** Một giá trị sin ứng với hai điểm trên đường tròn lượng giác — nên luôn có hai họ nghiệm.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI giải: "Phương trình sin x = 1/2 có nghiệm x = π/6 + 2kπ, k ∈ ℤ. Vậy tập nghiệm là S = {π/6 + 2kπ}.""
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI chỉ viết một họ nghiệm $x = \tfrac{\pi}{6} + 2k\pi$ cho $\sin x = \tfrac12$.
  2. Bằng chứng: Còn họ thứ hai $x = \tfrac{5\pi}{6} + 2k\pi$; thiếu nhánh này là mất nửa tập nghiệm.
  3. Sửa: $x = \tfrac{\pi}{6} + 2k\pi$ hoặc $x = \tfrac{5\pi}{6} + 2k\pi$.
- **TeacherCue:** Cho HS chỉ hai giao điểm trên đường tròn lượng giác để thấy hai họ.
- **LookFor:** HS giải thích bằng hình tròn lượng giác.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "kiểm |m| ≤ 1 trước, rồi viết hai họ nghiệm."
  - **S:** "xử lý trường hợp đặc biệt và lọc nghiệm trên khoảng."
  - **C:** "mô hình hóa bài độ cao, biện luận theo m."

- **Luồng M (Must) — hint: kiểm |m| ≤ 1 trước, rồi viết hai họ nghiệm.**
1. Nêu điều kiện của m để phương trình sin x = m có nghiệm.
   - **Đáp án:** −1 ≤ m ≤ 1 (hay |m| ≤ 1).
2. Giải phương trình sin x = 1/2.
   - **Đáp án:** x = π/6 + 2kπ hoặc x = 5π/6 + 2kπ, k ∈ ℤ.

- **Luồng S (Should) — hint: xử lý trường hợp đặc biệt và lọc nghiệm trên khoảng.**
1. Giải phương trình sin x = −1.
   - **Đáp án:** x = −π/2 + 2kπ, k ∈ ℤ.
2. Giải phương trình sin(2x) = sin(π/5).
   - **Đáp án:** 2x = π/5 + 2kπ hoặc 2x = π − π/5 + 2kπ = 4π/5 + 2kπ ⇒ x = π/10 + kπ hoặc x = 2π/5 + kπ.

- **Luồng C (Could) — hint: mô hình hóa bài độ cao, biện luận theo m.**
1. Cabin ở độ cao 10 + 8sin θ = 14. Tìm tất cả góc θ và giải thích vì sao có hai vị trí.
   - **Đáp án:** sin θ = 1/2 ⇒ θ = π/6 + 2kπ hoặc 5π/6 + 2kπ. Hai góc đối xứng qua đường kính thẳng đứng nên cùng độ cao 14 m.
2. Tìm nghiệm của sin x = √3/2 trong khoảng [0; 2π].
   - **Đáp án:** x = π/3 và x = 2π/3 (ứng với k = 0 của hai họ nghiệm).

- **LookFor:** HS M đủ hai họ; HS S lọc đúng; HS C lập luận được số nghiệm.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Giải $\sin x = -\tfrac{\sqrt3}{2}$. → $x = -\tfrac{\pi}{3} + 2k\pi$ hoặc $x = \pi + \tfrac{\pi}{3} + 2k\pi = \tfrac{4\pi}{3} + 2k\pi$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "sin x = 2 có nghiệm" → **Sai — |m| > 1**
  - "sin x = 0 ⇔ x = kπ" → **Đúng**
  - "sin x = m luôn có đúng một họ nghiệm" → **Sai — thường có hai họ**
- **TeacherCue:** Chiếu 2 bài, cùng kiểm bằng đường tròn lượng giác.

- **Câu 1:** Vì sao sin x = 2 vô nghiệm? → Vì tập giá trị của sin là [−1; 1], không có góc nào có sin bằng 2.
- **Câu 2:** Vì sao phương trình sin x = 1/2 có hai họ nghiệm? → Vì đường thẳng y = 1/2 cắt đường tròn lượng giác tại hai điểm đối xứng qua trục tung, ứng với α và π − α.
- **Chốt nhanh:** Điều kiện |m| ≤ 1 — hai họ nghiệm — lọc theo khoảng.

- Ở 14 m: góc $\tfrac{\pi}{6}$ và $\tfrac{5\pi}{6}$ (cộng $2k\pi$) — hai vị trí đối xứng.
- Ở 18 m: chỉ một vị trí đỉnh $\tfrac{\pi}{2}$ (cộng $2k\pi$).
- Ở 26 m: không đạt được vì sin θ = 2 vô nghiệm — đây là giới hạn vật lý của vòng quay.
- **TeacherCue:** Nhấn: toán cho biết giới hạn thực tế trước khi ta thử vận hành.

- **Exit Ticket (4 mục):**
  1. Nêu điều kiện có nghiệm của sin x = m.
  2. Nêu 1 bẫy (quên nhánh π − α; quên chu kỳ).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Giải sin θ = 1/2.
- **TeacherCue (lớp yếu):** Mở lại công thức và hình tròn lượng giác ở S3.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Nêu điều kiện của m để phương trình sin x = m có nghiệm.
   - **Đáp án:** −1 ≤ m ≤ 1 (hay |m| ≤ 1).
2. `[NB]` Giải phương trình sin x = 1/2.
   - **Đáp án:** x = π/6 + 2kπ hoặc x = 5π/6 + 2kπ, k ∈ ℤ.
3. `[TH]` Giải phương trình sin x = −1.
   - **Đáp án:** x = −π/2 + 2kπ, k ∈ ℤ.
4. `[TH]` Giải phương trình sin(2x) = sin(π/5).
   - **Đáp án:** 2x = π/5 + 2kπ hoặc 2x = π − π/5 + 2kπ = 4π/5 + 2kπ ⇒ x = π/10 + kπ hoặc x = 2π/5 + kπ.
5. `[VD]` Cabin ở độ cao 10 + 8sin θ = 14. Tìm tất cả góc θ và giải thích vì sao có hai vị trí.
   - **Đáp án:** sin θ = 1/2 ⇒ θ = π/6 + 2kπ hoặc 5π/6 + 2kπ. Hai góc đối xứng qua đường kính thẳng đứng nên cùng độ cao 14 m.
6. `[VD]` Tìm nghiệm của sin x = √3/2 trong khoảng [0; 2π].
   - **Đáp án:** x = π/3 và x = 2π/3 (ứng với k = 0 của hai họ nghiệm).

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Quên điều kiện |m| ≤ 1.
- Chỉ viết một họ nghiệm, bỏ nhánh π − α.
- Nhầm chu kỳ: dùng kπ thay vì 2kπ cho phương trình sin.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.

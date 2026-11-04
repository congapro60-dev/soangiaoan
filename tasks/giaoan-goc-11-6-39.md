# KẾ HOẠCH DẠY HỌC — Dãy số tăng, giảm, bị chặn (Toán 11 · Tuần 6 · Tiết 39)

| Lớp | 11 | Tên bài học | Dãy số tăng, giảm, bị chặn | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 6 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-11-6-39.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Xét tính tăng/giảm bằng hiệu $u_{n+1} - u_n$ và nhận biết dãy bị chặn.
- **Should (Trọng tâm – Thông hiểu):** Chứng minh tăng/giảm bằng biến đổi đại số, tìm chặn trên/dưới.
- **Could (Nâng cao – Vận dụng):** Chọn giữa xét hiệu và xét tỉ số; phản biện kết luận dựa trên vài số hạng đầu.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Ba dãy số từ bài toán hội trường và đăng ký.**

| Dãy | Công thức | Tính chất | Chặn |
|---|---|---|---|
| Số ghế | $u_n = 2n + 5$ | tăng | không bị chặn trên |
| Số người đăng ký | $v_n = \dfrac{1}{n}$ | giảm | $0 < v_n \le 1$ |
| Tỉ lệ lấp chỗ | $w_n = \dfrac{n}{n+1}$ | tăng | $w_n < 1$, chặn dưới $\tfrac12$ |

- **Kiểm chứng tay:**
  - $u_{n+1} - u_n = 2 > 0$ → tăng.
  - $v_{n+1} - v_n = \dfrac{1}{n+1} - \dfrac{1}{n} = -\dfrac{1}{n(n+1)} < 0$ → giảm.
  - $w_{n+1} - w_n = \dfrac{1}{(n+1)(n+2)} > 0$ → tăng; $w_n = 1 - \dfrac{1}{n+1} < 1$.
- **Dãy không đơn điệu:** $x_n = (-1)^n$ nhận $-1; 1; -1; 1; \ldots$ nhưng bị chặn trong $[-1; 1]$.

**Bẫy của bài:** kết luận tăng/giảm từ vài số hạng đầu; nhầm "bị chặn" với "có giới hạn"; chia tỉ số khi dãy đổi dấu.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** u_n = 2n+5; v_n = 1/n; w_n = n/(n+1).
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Dãy $v_n = 1/n$ tăng hay giảm?*
  - (A) Tăng vì n tăng
  - (B) Giảm vì mẫu tăng
  - (C) Không đơn điệu
  - **Correct: (B)** — n tăng thì 1/n giảm: 1; 0,5; 0,333… Kiểm bằng hiệu: v_{n+1} − v_n < 0.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Vì sao w_n = n/(n+1) lại tăng?
  2. `[SO SÁNH]` Dãy (−1)^n có đơn điệu không?
- **TeacherCue (lớp yếu):** Viết 4 số hạng đầu của mỗi dãy để HS so sánh trực quan.
- **LookFor:** HS phân biệt "n tăng" với "dãy tăng".

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Xét tính tăng/giảm bằng hiệu $u_{n+1} - u_n$ và nhận biết dãy bị chặn.
- **Should:** Chứng minh tăng/giảm bằng biến đổi đại số, tìm chặn trên/dưới.
- **Could:** Chọn giữa xét hiệu và xét tỉ số; phản biện kết luận dựa trên vài số hạng đầu.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Muốn biết một dãy tăng hay giảm, nên xét hiệu hay xét tỉ số?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Xét hiệu: $u_{n+1} - u_n > 0$ ⇒ tăng; $< 0$ ⇒ giảm.
- **Bước 2:** Xét tỉ số (khi $u_n > 0$): $\dfrac{u_{n+1}}{u_n} > 1$ ⇒ tăng; $< 1$ ⇒ giảm.
- **Bước 3:** Bị chặn trên: tồn tại $M$ sao cho $u_n \le M$ với mọi $n$; bị chặn dưới: tồn tại $m$ sao cho $u_n \ge m$.
- **Bước 4:** Bị chặn = vừa bị chặn trên vừa bị chặn dưới.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao xét tỉ số cần điều kiện $u_n > 0$?
  2. `[PHÁT HIỆN]` Dãy $1/n$ bị chặn bởi hai số nào?
- **TeacherCue (lớp yếu):** Khung: hiệu — tỉ số — chặn trên — chặn dưới.
- **Chốt:** Đơn điệu chứng minh bằng hiệu/tỉ số; bị chặn chứng minh bằng bất đẳng thức với mọi n.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI nhận xét: "Dãy w_n = n/(n+1) chỉ bị chặn trên bởi 1, không bị chặn dưới vì khi n rất lớn thì w_n tiến về 1, còn khi n nhỏ thì w_n có thể âm.""
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI kết luận dãy $w_n = \dfrac{n}{n+1}$ bị chặn trên bởi 1 nhưng "không bị chặn dưới" vì $w_n$ "có thể âm".
  2. Bằng chứng: $w_n = \dfrac{n}{n+1} > 0$ và $w_n \ge \dfrac12$ với mọi $n \ge 1$ — bị chặn dưới.
  3. Sửa: Bị chặn: $\tfrac12 \le w_n < 1$.
- **TeacherCue:** Cho HS tính w1 = 1/2 để thấy chặn dưới.
- **LookFor:** HS kiểm bằng số hạng đầu.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "tính hiệu u_{n+1} − u_n rồi xét dấu."
  - **S:** "chứng minh chặn bằng bất đẳng thức đúng với mọi n."
  - **C:** "so sánh hai phương pháp và chọn phương pháp hợp lý."

- **Luồng M (Must) — hint: tính hiệu u_{n+1} − u_n rồi xét dấu.**
1. Nêu hai phương pháp xét tính tăng, giảm của dãy số.
   - **Đáp án:** Xét hiệu u_{n+1} − u_n hoặc xét tỉ số u_{n+1}/u_n (khi u_n > 0).
2. Dãy u_n = 2n − 1 tăng hay giảm?
   - **Đáp án:** Tăng vì u_{n+1} − u_n = 2 > 0.

- **Luồng S (Should) — hint: chứng minh chặn bằng bất đẳng thức đúng với mọi n.**
1. Xét tính tăng/giảm của u_n = 1/n.
   - **Đáp án:** Giảm vì u_{n+1} − u_n = −1/(n(n+1)) < 0.
2. Dãy u_n = n² có bị chặn trên không?
   - **Đáp án:** Không. Với mọi M > 0, chọn n > √M thì u_n > M, nên dãy không bị chặn trên.

- **Luồng C (Could) — hint: so sánh hai phương pháp và chọn phương pháp hợp lý.**
1. Chứng minh w_n = n/(n+1) bị chặn bởi 1/2 và 1.
   - **Đáp án:** w_n = 1 − 1/(n+1) < 1 với mọi n; và w_n ≥ 1/2 vì 1/(n+1) ≤ 1/2 khi n ≥ 1. Vậy 1/2 ≤ w_n < 1.
2. Dãy (−1)^n có đơn điệu không? Có bị chặn không?
   - **Đáp án:** Không đơn điệu vì luân phiên −1; 1; −1; 1… Nhưng bị chặn: −1 ≤ (−1)^n ≤ 1 với mọi n.

- **LookFor:** HS M xét đúng dấu; HS S chứng minh chặn; HS C chọn được phương pháp.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Xét tính tăng/giảm và chặn của $u_n = \dfrac{n}{n+1}$. → $u_{n+1} - u_n = \dfrac{1}{(n+1)(n+2)} > 0$ ⇒ tăng. $u_n = 1 - \dfrac{1}{n+1}$ nên $\tfrac12 \le u_n < 1$ ⇒ bị chặn.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "1/n là dãy tăng" → **Sai — giảm**
  - "Dãy bị chặn thì luôn đơn điệu" → **Sai — ví dụ (−1)^n**
  - "n/(n+1) bị chặn trên bởi 1" → **Đúng**
- **TeacherCue:** Chiếu 2 bài, kiểm dấu hiệu.

- **Câu 1:** Vì sao xét tỉ số cần u_n > 0? → Vì nhân/chia bất đẳng thức với số âm làm đổi chiều; nếu dãy đổi dấu, kết luận từ tỉ số không còn đúng.
- **Câu 2:** Dãy 1/n bị chặn bởi hai số nào? → Bị chặn dưới bởi 0 (v_n > 0) và chặn trên bởi 1 (v_1 = 1).
- **Chốt nhanh:** Hiệu để xét đơn điệu; bất đẳng thức để xét chặn.

- Tỉ lệ lấp chỗ w_n luôn dưới 100% — mô hình phù hợp (không vượt sức chứa).
- Số người đăng ký v_n giảm nhưng luôn dương — không âm vô lý.
- Nếu một mô hình cho giá trị vượt chặn thực tế thì mô hình sai, cần xem lại công thức.
- **TeacherCue:** Hỏi: "Mô hình nào cho kết quả vô lý? Vì sao?"

- **Exit Ticket (4 mục):**
  1. Nêu hai phương pháp xét đơn điệu.
  2. Nêu 1 bẫy (kết luận từ vài số hạng; nhầm bị chặn với có giới hạn).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Dãy n/(n+1) tăng hay giảm và bị chặn bởi khoảng nào?
- **TeacherCue (lớp yếu):** Mở lại bảng ba dãy ở mục II.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Nêu hai phương pháp xét tính tăng, giảm của dãy số.
   - **Đáp án:** Xét hiệu u_{n+1} − u_n hoặc xét tỉ số u_{n+1}/u_n (khi u_n > 0).
2. `[NB]` Dãy u_n = 2n − 1 tăng hay giảm?
   - **Đáp án:** Tăng vì u_{n+1} − u_n = 2 > 0.
3. `[TH]` Xét tính tăng/giảm của u_n = 1/n.
   - **Đáp án:** Giảm vì u_{n+1} − u_n = −1/(n(n+1)) < 0.
4. `[TH]` Dãy u_n = n² có bị chặn trên không?
   - **Đáp án:** Không. Với mọi M > 0, chọn n > √M thì u_n > M, nên dãy không bị chặn trên.
5. `[VD]` Chứng minh w_n = n/(n+1) bị chặn bởi 1/2 và 1.
   - **Đáp án:** w_n = 1 − 1/(n+1) < 1 với mọi n; và w_n ≥ 1/2 vì 1/(n+1) ≤ 1/2 khi n ≥ 1. Vậy 1/2 ≤ w_n < 1.
6. `[VD]` Dãy (−1)^n có đơn điệu không? Có bị chặn không?
   - **Đáp án:** Không đơn điệu vì luân phiên −1; 1; −1; 1… Nhưng bị chặn: −1 ≤ (−1)^n ≤ 1 với mọi n.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Kết luận đơn điệu chỉ từ vài số hạng đầu.
- Nhầm "bị chặn" với "có giới hạn".
- Dùng tỉ số khi dãy đổi dấu.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.

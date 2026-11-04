# KẾ HOẠCH DẠY HỌC — Tính chất đổi cận và hàm số chẵn lẻ (Toán 12 · Tuần 13 · Tiết 95)

| Lớp | 12 | Tên bài học | Tính chất đổi cận và hàm số chẵn lẻ | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 13 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-12-13-95.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Nắm vững quy tắc đổi cận trong phương pháp đổi biến số tích phân và tính chất tích phân hàm chẵn, hàm lẻ trên đoạn đối xứng [-a; a].
- **Should (Trọng tâm – Thông hiểu):** Chứng minh và áp dụng nhanh: f(x) là hàm lẻ trên [-a; a] thì ∫_{-a}^a f(x) dx = 0; f(x) là hàm chẵn thì ∫_{-a}^a f(x) dx = 2 ∫_0^a f(x) dx.
- **Could (Nâng cao – Vận dụng):** Vận dụng tính chất tích phân đặc biệt: ∫_0^a f(x) dx = ∫_0^a f(a - x) dx để giải các bài toán tích phân lượng giác kinh điển.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Mô hình cân bằng mô-men lực quay trên thanh đòn bẩy đối xứng:**
- Một thanh đòn bẩy đặt trên trục hoành từ $x = -2$ đến $x = 2$ (mét).
- Mật độ lực phân bố lệch theo hàm số lẻ:
  $$f(x) = x^3 + \sin x \quad (\text{Newton/mét}).$$
- Nhận xét tính đối xứng: $f(-x) = (-x)^3 + \sin(-x) = -x^3 - \sin x = -f(x)$ (đây là **hàm số lẻ**).
- Đồ thị nhận gốc tọa độ $O$ làm tâm đối xứng:
  - Phần phía bên phải ($x \in [0; 2]$) có diện tích $S$.
  - Phần phía bên trái ($x \in [-2; 0]$) có hình dạng giống hệt nhưng nằm phía dưới trục hoành, đóng góp giá trị $-S$.
- **Tổng đại số tích phân trên toàn đoạn:**
  $$\int_{-2}^2 (x^3 + \sin x) dx = \int_{-2}^0 f(x) dx + \int_0^2 f(x) dx = -S + S = 0.$$
- Mô-men lực hai bên tự triệt tiêu hoàn toàn, thanh đòn bẩy đạt trạng thái cân bằng tuyệt đối.
- **Định lý hàm lẻ:** Nếu $f(x)$ là hàm số lẻ liên tục trên đoạn đối xứng $[-a; a]$ thì:
  $$\int_{-a}^a f(x) dx = 0.$$

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Hàm mật độ lực f(x) = x³ + sin x là hàm số lẻ trên đoạn [-2; 2].
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Tích phân ∫_{-2}^2 (x³ + sin x) dx có giá trị bằng bao nhiêu?*
  - (A) Bằng 0 (tự triệt tiêu do tính đối xứng lẻ)
  - (B) Bằng 16
  - (C) Không xác định
  - **Correct: (A)** — Vì f(x) là hàm số lẻ và đoạn lấy tích phân đối xứng qua gốc tọa độ [-2; 2] nên tích phân bằng 0.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Nếu f(x) = x² là hàm chẵn thì tích phân trên [-2; 2] bằng bao nhiêu lần tích phân trên [0; 2]?
  2. `[SO SÁNH]` Tại sao khi đổi biến số tích phân BẮT BUỘC phải đổi cận?
- **TeacherCue (lớp yếu):** Vẽ đồ thị hàm lẻ đối xứng qua gốc O, hai miền diện tích triệt tiêu nhau.
- **LookFor:** HS nhận ra tính chất hàm lẻ trên đoạn đối xứng bằng 0.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Nắm vững quy tắc đổi cận trong phương pháp đổi biến số tích phân và tính chất tích phân hàm chẵn, hàm lẻ trên đoạn đối xứng [-a; a].
- **Should:** Chứng minh và áp dụng nhanh: f(x) là hàm lẻ trên [-a; a] thì ∫_{-a}^a f(x) dx = 0; f(x) là hàm chẵn thì ∫_{-a}^a f(x) dx = 2 ∫_0^a f(x) dx.
- **Could:** Vận dụng tính chất tích phân đặc biệt: ∫_0^a f(x) dx = ∫_0^a f(a - x) dx để giải các bài toán tích phân lượng giác kinh điển.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Tại sao tích phân của một hàm số lẻ trên đoạn đối xứng [-a; a] luôn luôn bằng 0?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Quy tắc đổi cận: Khi đổi biến $u = u(x)$, bắt buộc đổi cận: $x = a \implies u = u(a)$; $x = b \implies u = u(b)$.
- **Bước 2:** Định lý Hàm Lẻ: Nếu $f(-x) = -f(x)$ thì $\int_{-a}^a f(x) dx = 0$.
- **Bước 3:** Định lý Hàm Chẵn: Nếu $f(-x) = f(x)$ thì $\int_{-a}^a f(x) dx = 2 \int_0^a f(x) dx$.
- **Bước 4:** Công thức đảo cận $f(a - x)$: $\int_0^a f(x) dx = \int_0^a f(a - x) dx$.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Hàm số nào vừa chẵn vừa lẻ trên toàn trục số?
  2. `[PHÁT HIỆN]` Nếu đổi biến số tích phân mà quên đổi cận thì kết quả sẽ sai lệch như thế nào?
- **TeacherCue (lớp yếu):** Bảng đối chiếu hàm chẵn (đối xứng qua Oy) và hàm lẻ (đối xứng qua O).
- **Chốt:** Hàm lẻ trên [-a; a] bằng 0; Hàm chẵn bằng 2 lần [0; a]; Đổi biến tích phân là BẮT BUỘC phải đổi cận.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI giải: Tính I = ∫_0^2 2x(x² + 1) dx. Đặt u = x² + 1 => du = 2x dx. AI giữ nguyên cận: I = ∫_0^2 u du = u²/2 |_0^2 = (4 - 0)/2 = 2."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI giải: Tính I = ∫_0^1 2x(x² + 1)³ dx. Đặt u = x² + 1 => du = 2x dx. AI viết I = ∫_0^1 u³ du = u⁴/4 |_0^1 = 1/4.
  2. Bằng chứng: Sai lầm kinh điển: Quên đổi cận. Cận 0 và 1 là của biến x, khi chuyển sang biến u thì cận phải là u(0) = 1 và u(1) = 2. Để nguyên cận cũ dẫn đến sai kết quả hoàn toàn.
  3. Sửa: Phải đổi cận: x = 0 => u = 1; x = 1 => u = 2. Tích phân đúng là ∫_1^2 u³ du = u⁴/4 |_1^2 = (16 - 1)/4 = 15/4.
- **TeacherCue:** Khẩu quyết nằm lòng: "Đổi biến là phải ĐỔI CẬN".
- **LookFor:** HS phát hiện ngay lỗi quên đổi cận khi đổi biến.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "lập bảng đổi cận: dòng x, dòng u; thay cận dưới và cận trên vào biểu thức u."
  - **S:** "nhận diện hàm lẻ (f(-x) = -f(x)) trên đoạn [-a; a] để kết luận ngay tích phân bằng 0."
  - **C:** "áp dụng I = ∫_0^a f(x)dx = ∫_0^a f(a-x)dx rồi cộng 2I để khử biểu thức phức tạp."

- **Luồng M (Must) — hint: lập bảng đổi cận: dòng x, dòng u; thay cận dưới và cận trên vào biểu thức u.**
1. Tích phân ∫_{-3}^3 x²⁰²⁵ dx có giá trị bằng bao nhiêu?
   - **Đáp án:** Bằng 0 vì x²⁰²⁵ là hàm số lẻ trên đoạn đối xứng [-3; 3].
2. Khi đặt u = 2x + 1 trong tích phân cận từ 0 đến 2, cận của u là từ mấy đến mấy?
   - **Đáp án:** Cận dưới u(0) = 1, cận trên u(2) = 5 (cận từ 1 đến 5).

- **Luồng S (Should) — hint: nhận diện hàm lẻ (f(-x) = -f(x)) trên đoạn [-a; a] để kết luận ngay tích phân bằng 0.**
1. Biết f(x) là hàm chẵn trên [-2; 2] và ∫_0^2 f(x) dx = 4. Tính ∫_{-2}^2 f(x) dx.
   - **Đáp án:** ∫_{-2}^2 f(x) dx = 2 · 4 = 8.
2. Tính I = ∫_{-π/2}^{π/2} cos x dx bằng tính chất hàm chẵn.
   - **Đáp án:** cos x là hàm chẵn nên I = 2 ∫_0^{π/2} cos x dx = 2 sin x |_0^{π/2} = 2(1 - 0) = 2.

- **Luồng C (Could) — hint: áp dụng I = ∫_0^a f(x)dx = ∫_0^a f(a-x)dx rồi cộng 2I để khử biểu thức phức tạp.**
1. Tính tích phân: I = ∫_0^{\pi/2} \dfrac{\sin x}{\sin x + \cos x} dx.
   - **Đáp án:** Đặt x = π/2 - t => dx = -dt. Đổi cận: x = 0 => t = π/2; x = π/2 => t = 0. Khi đó I = ∫_0^{π/2} [cos t / (cos t + sin t)] dt. Cộng hai tích phân: 2I = ∫_0^{π/2} [(sin x + cos x)/(sin x + cos x)] dx = ∫_0^{π/2} 1 dx = π/2 => I = π/4.
2. Tính tích phân: I = ∫_{-1}^1 \dfrac{x^4}{e^x + 1} dx.
   - **Đáp án:** Đặt x = -t => dx = -dt. Đổi cận ra I = ∫_{-1}^1 [t⁴ / (e^{-t} + 1)] dt = ∫_{-1}^1 [t⁴ e^t / (e^t + 1)] dt. Cộng lại: 2I = ∫_{-1}^1 [x⁴(e^x + 1)/(e^x + 1)] dx = ∫_{-1}^1 x⁴ dx = 2 ∫_0^1 x⁴ dx = 2/5 => I = 1/5.

- **LookFor:** HS M đổi cận đúng; HS S tính nhanh hàm lẻ; HS C giải bài toán tích phân đối xứng.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Tính nhanh tích phân: $I = \int_{-\pi/4}^{\pi/4} \dfrac{\sin^3 x}{x^2 + 1} dx$. → Hàm số $f(x) = \dfrac{\sin^3 x}{x^2 + 1}$ thỏa mãn $f(-x) = \dfrac{\sin^3(-x)}{(-x)^2 + 1} = -f(x)$ là hàm số lẻ. Đoạn $[-\pi/4; \pi/4]$ đối xứng qua 0 nên $I = 0$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "Đổi biến số tích phân xác định bắt buộc phải đổi cận" → **Đúng**
  - "Tích phân hàm chẵn trên [-a; a] luôn luôn bằng 0" → **Sai — hàm lẻ mới bằng 0, hàm chẵn bằng 2 lần**
  - "∫_{-1}^1 x^5 dx = 0" → **Đúng (x^5 là hàm lẻ)**
- **TeacherCue:** Đổi phiếu chấm chéo, kiểm tra nhận diện hàm lẻ ra kết quả 0.

- **Câu 1:** Tại sao trong tích phân xác định ta không cần bước trả lại biến x sau khi đổi biến? → Vì tích phân chỉ phụ thuộc vào hàm số và các cận số, sau khi đổi cận theo biến u thì giá trị tính theo u chính là giá trị cuối cùng của bài toán.
- **Câu 2:** Tích của hai hàm số lẻ là hàm chẵn hay hàm lẻ? → Là hàm chẵn ((-f)(-g) = fg).
- **Chốt nhanh:** Đổi biến -> Đổi cận; Hàm lẻ trên [-a; a] = 0; Hàm chẵn trên [-a; a] = 2∫_0^a; ∫_0^a f(x) = ∫_0^a f(a-x).

- Bộ lọc làm nét và xóa mờ ảnh trong Photoshop sử dụng ma trận nhân chập có hàm phân bố chẵn Gauss.
- Tính đối xứng chẵn giúp giảm 50% khối lượng tính toán ma trận vi tích phân của card đồ họa GPU.
- Toán học đối xứng tăng tốc độ kết xuất hình ảnh thời gian thực trong game 3D.
- **TeacherCue:** Hỏi: "Làm thế nào camera điện thoại làm mờ hậu cảnh (chụp chân dung xóa phông) chỉ trong tích tắc?"

- **Exit Ticket (4 mục):**
  1. Phát biểu định lý tích phân hàm chẵn và hàm lẻ trên [-a; a].
  2. Nêu 1 bẫy (đổi biến nhưng quên đổi cận).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Tính tích phân ∫_{-2}^2 x² dx bằng cách nhân đôi tích phân trên [0; 2].
- **TeacherCue (lớp yếu):** Nhìn lại hình ảnh đòn bẩy đối xứng tự cân bằng.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Tích phân ∫_{-3}^3 x²⁰²⁵ dx có giá trị bằng bao nhiêu?
   - **Đáp án:** Bằng 0 vì x²⁰²⁵ là hàm số lẻ trên đoạn đối xứng [-3; 3].
2. `[NB]` Khi đặt u = 2x + 1 trong tích phân cận từ 0 đến 2, cận của u là từ mấy đến mấy?
   - **Đáp án:** Cận dưới u(0) = 1, cận trên u(2) = 5 (cận từ 1 đến 5).
3. `[TH]` Biết f(x) là hàm chẵn trên [-2; 2] và ∫_0^2 f(x) dx = 4. Tính ∫_{-2}^2 f(x) dx.
   - **Đáp án:** ∫_{-2}^2 f(x) dx = 2 · 4 = 8.
4. `[TH]` Tính I = ∫_{-π/2}^{π/2} cos x dx bằng tính chất hàm chẵn.
   - **Đáp án:** cos x là hàm chẵn nên I = 2 ∫_0^{π/2} cos x dx = 2 sin x |_0^{π/2} = 2(1 - 0) = 2.
5. `[VD]` Tính tích phân: I = ∫_0^{\pi/2} \dfrac{\sin x}{\sin x + \cos x} dx.
   - **Đáp án:** Đặt x = π/2 - t => dx = -dt. Đổi cận: x = 0 => t = π/2; x = π/2 => t = 0. Khi đó I = ∫_0^{π/2} [cos t / (cos t + sin t)] dt. Cộng hai tích phân: 2I = ∫_0^{π/2} [(sin x + cos x)/(sin x + cos x)] dx = ∫_0^{π/2} 1 dx = π/2 => I = π/4.
6. `[VD]` Tính tích phân: I = ∫_{-1}^1 \dfrac{x^4}{e^x + 1} dx.
   - **Đáp án:** Đặt x = -t => dx = -dt. Đổi cận ra I = ∫_{-1}^1 [t⁴ / (e^{-t} + 1)] dt = ∫_{-1}^1 [t⁴ e^t / (e^t + 1)] dt. Cộng lại: 2I = ∫_{-1}^1 [x⁴(e^x + 1)/(e^x + 1)] dx = ∫_{-1}^1 x⁴ dx = 2 ∫_0^1 x⁴ dx = 2/5 => I = 1/5.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Quên đổi cận khi thực hiện phép đổi biến số tích phân.
- Nhầm tính chất: cho rằng hàm chẵn có tích phân bằng 0.
- Đổi cận bị ngược thứ tự cận (cận nhỏ đặt ở trên, cận lớn đặt ở dưới mà quên đổi dấu tích phân).

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.

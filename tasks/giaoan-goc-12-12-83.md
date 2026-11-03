<!-- Nguồn: PPCT Chuẩn Bộ GD&ĐT Toán 12 · tds-g12-83 — "Nguyên hàm — Tiết 4: Nguyên hàm của hàm số lũy thừa" · Soạn lại 03/11/2026 chuẩn V8.8 Master Teacher -->
<!-- Kế thừa: tính chất tuyến tính từ Tiết 3 (`12-12-82`); bảng nguyên hàm sơ cấp từ Tiết 2 (`12-11-77`). -->

# KẾ HOẠCH DẠY HỌC — NGUYÊN HÀM (Tiết 4: Nguyên hàm của hàm số lũy thừa)

| Lớp | 12 | Tên bài học | Nguyên hàm — Tiết 4: Nguyên hàm của hàm số lũy thừa | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 12 | Năm học | 2024–2025 |

> **Chuẩn V8.8 Master Teacher:** Trục dữ liệu thực nghiệm xuyên suốt (Chuyến thám hiểm Mặt Trăng — phương trình Tsiolkovsky và lực hút Trái Đất), câu hỏi phân tầng có hint, teacherCue định hướng học sinh yếu, reveal giấu đáp án, Exit Ticket cô đọng.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Năng lực toán học cốt lõi
- **Năng lực tư duy và lập luận toán học:** Phát hiện điều kiện của công thức $\int x^{\alpha} dx = \frac{x^{\alpha+1}}{\alpha+1} + C$ chỉ áp dụng khi $\alpha \neq -1$; suy ra trường hợp đặc biệt $\int \frac{dx}{x} = \ln|x| + C$ qua kiểm chứng đạo hàm $(\ln|x|)' = \frac{1}{x}$.
- **Năng lực giải quyết vấn đề toán học:** Từ dữ liệu phóng tàu vũ trụ, suy ra phương trình vận tốc Tsiolkovsky $\Delta v = v_e\ln\frac{m_0}{m_f}$; biến đổi căn thức/phân thức về lũy thừa rồi tính nguyên hàm; xác định $C$ theo điều kiện ban đầu trên miền xác định.
- **Năng lực giao tiếp toán học:** Phân biệt "kết quả không xác định" (thay $\alpha = -1$ vào công thức) với "nguyên hàm không tồn tại" (sai); viết đúng $\ln|x|$ trên từng miền.
- **Năng lực mô hình hóa toán học:** Mô hình hóa chuyến bay vũ trụ: đốt nhiên liệu (ln), lực hấp dẫn $F = k/r^2$, tính công và tốc độ thoát $11{,}2$ km/s khớp số liệu thực tế.

### 2. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản - NB):** Viết đúng 2 công thức $\int x^{\alpha} dx = \frac{x^{\alpha+1}}{\alpha+1} + C$ ($\alpha \neq -1$) và $\int \frac{dx}{x} = \ln|x| + C$; tính $\int \sqrt{r}\,dr$, $\int \frac{dr}{r^2}$ và $\Delta v = v_e\ln\frac{m_0}{m_f}$ với dữ liệu cho trước.
- **Should (Trọng tâm - TH):** Tách phân thức $\frac{r^2 + 2r - 3}{r}$ rồi tính nguyên hàm trên $(0; +\infty)$; tìm nguyên hàm thỏa mãn $F(x_0) = y_0$; nêu miền xác định trước khi viết $\ln x$.
- **Could (Nâng cao - VD/VDC):** Tính $\int \frac{(2r-1)^2}{\sqrt{r}} dr$ (khai triển + lũy thừa phân số); giải bài toán tốc độ thoát $\frac{1}{2}mv^2 = \int_R^{+\infty} \frac{k}{r^2} dr$; chi phí biên trạm phóng chứa $\frac{100}{x}$.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT (THEMATIC DATASET)

**Tình huống: Chuyến thám hiểm Mặt Trăng — 2 giai đoạn bay của tàu vũ trụ.**

**Giai đoạn 1 — PHÓNG (động cơ hoạt động, đốt nhiên liệu):**
- Khối lượng tàu giảm từ $m_0 = 200$ tấn xuống $m_f = 50$ tấn; vận tốc xả khí $v_e = 3$ km/s.
- Mỗi giây tàu tăng vận tốc tỉ lệ nghịch với khối lượng hiện tại: $\Delta v = v_e \int_{m_f}^{m_0} \frac{dm}{m}$.
- **Kết quả (phương trình Tsiolkovsky):** $\Delta v = v_e\ln\frac{m_0}{m_f} = 3\ln\frac{200}{50} = 3\ln 4 \approx 4{,}16$ km/s.

**Giai đoạn 2 — BAY TỰ DO (tắt máy, chịu lực hút Trái Đất):**
- Lực hút: $F(r) = \dfrac{k}{r^2}$ với $k = GMm = 4\times10^{18}$ N·m² (tàu 10 tấn), $R = 6{,}4\times10^6$ m.
- Kiểm chứng mặt đất: $F(R) = \dfrac{4\times10^{18}}{(6{,}4\times10^6)^2} \approx 9{,}77\times10^4$ N $\Rightarrow a \approx 9{,}77$ m/s² $\approx g$ ✓.
- Công để thoát hẳn khỏi Trái Đất: $W = \int_R^{+\infty} \frac{k}{r^2} dr = \frac{k}{R} = 6{,}25\times10^{11}$ J.
- **Tốc độ thoát:** $\frac{1}{2}mv^2 = W \Rightarrow v = \sqrt{\frac{2k}{mR}} = \sqrt{1{,}25\times10^8} \approx 11\,180$ m/s $\approx 11{,}2$ km/s — trùng số liệu thực tế của Trái Đất ✓.

**Bẫy kiểm chứng (dùng ở AI Error):** AI áp công thức lũy thừa cho $\alpha = -1$, được $\frac{1}{0}$ rồi kết luận "Δv không tồn tại, tàu không thể tăng tốc" — sai vì công thức có điều kiện $\alpha \neq -1$.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối hệ thống SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con học sinh dùng kiểm tra nhanh và tương tác ĐGTX.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1: Khởi động & Đặt vấn đề (7 phút)
- **Tình huống:** Tàu thám hiểm Mặt Trăng phóng lên. Trung tâm điều khiển cần biết tổng vận tốc tàu đạt được sau khi đốt hết nhiên liệu ($m_0 = 200$ tấn → $m_f = 50$ tấn, $v_e = 3$ km/s). Nhà bác học Tsiolkovsky chỉ ra: $\Delta v = v_e \int_{m_f}^{m_0} \frac{dm}{m}$. Làm sao tính $\int \frac{dm}{m}$?
- **Câu hỏi tương tác (máy HS):**
  1. `[NHẬN DIỆN]` Để tính $\int \frac{dm}{m}$, em dùng: (A) Công thức $\int m^{\alpha} dm$ với $\alpha = -1$; (B) $\int \frac{dm}{m} = \ln|m| + C$; (C) Không tồn tại nguyên hàm? → Đáp án B.
  2. `[SO SÁNH]` An thay $\alpha = -1$ vào công thức lũy thừa, được $\frac{m^0}{0}$ và kết luận "không có nguyên hàm". Bình kiểm chứng $(\ln|m|)' = \frac{1}{m}$. Ai đúng? Vì sao công thức lũy thừa "hụt" đúng tại $\alpha = -1$?
- **TeacherCue (lớp yếu):** Nhắc trước: công thức $\int x^{\alpha}dx$ có điều kiện $\alpha \neq -1$ (vì mẫu số $\alpha + 1$ bằng 0) — khi điều kiện không thỏa thì phải tìm công thức khác, KHÔNG kết luận "không tồn tại".

### 2. Hoạt động 2: Hình thành kiến thức — Công thức nguyên hàm hàm số lũy thừa (6 phút)
- **Công thức 1:** $\int x^{\alpha} dx = \frac{x^{\alpha+1}}{\alpha+1} + C$ với mọi $\alpha \in \mathbb{Q}, \alpha \neq -1$.
- **Công thức 2 (trường hợp $\alpha = -1$):** $\int \frac{1}{x} dx = \ln|x| + C$ với $x \neq 0$.
  - Trên $(0; +\infty)$: $\ln|x| = \ln x$; trên $(-\infty; 0)$: $\ln|x| = \ln(-x)$.
- **GV làm mẫu — suy ra Δv của tàu (4 bước):**
  - Bước 1: Nhận diện $\frac{dm}{m} = m^{-1}$ — trường hợp $\alpha = -1$.
  - Bước 2: Chọn công thức 2: $\int \frac{dm}{m} = \ln|m| + C$ (khối lượng $m > 0$ nên $\ln m$).
  - Bước 3: Thay cận: $\int_{m_f}^{m_0} \frac{dm}{m} = \ln m_0 - \ln m_f = \ln\frac{m_0}{m_f}$.
  - Bước 4: $\Delta v = 3\ln\frac{200}{50} = 3\ln 4 \approx 4{,}16$ km/s.
- **TeacherCue:** Nhấn mạnh bước 2 — chính điều kiện $\alpha + 1 = 0$ bị "vô hiệu" khiến ln xuất hiện; đây là chỗ AI hay mắc bẫy.
- **Chú ý then chốt (Bẫy kinh điển):** Không thay $\alpha = -1$ vào công thức 1; viết $\ln|x|$ khi chưa biết dấu $x$; căn/phân thức phải quy về lũy thừa trước.

### 3. Hoạt động 3: Phát hiện lỗi sai AI (AI Error of the Week) (3 phút)
- **Tình huống AI giải:** "Để tính $\Delta v = v_e\int \frac{dm}{m}$, áp dụng công thức $\int m^{\alpha} dm = \frac{m^{\alpha+1}}{\alpha+1} + C$ với $\alpha = -1$: ta được $\frac{m^0}{0}$. Vì $\frac{1}{0}$ không xác định nên **Δv không tồn tại — tàu không thể tăng tốc bằng cách đốt nhiên liệu**."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: công thức lũy thừa chỉ áp dụng khi $\alpha \neq -1$; "không xác định" ≠ "không tồn tại".
  2. Kiểm chứng: $(\ln m)' = \frac{1}{m}$ với $m > 0$ ✓.
  3. Sửa đúng: $\Delta v = 3\ln 4 \approx 4{,}16$ km/s — tàu hoàn toàn tăng tốc được.

### 4. Hoạt động 4: Luyện tập phân hoá 3 luồng kèm hint (8 phút)
- **Luồng Master (Must) —_hint: kiểm tra α trước, α = −1 thì dùng ln:**
  1. Viết 2 công thức lũy thừa kèm điều kiện; tính $I = \int (5r^3 - 2r)\,dr$ (mô hình dữ liệu quỹ đạo). → $I = \frac{5r^4}{4} - r^2 + C$.
  2. Tính $\int \sqrt{r}\,dr$ và $\int \frac{dr}{r^2}$ (lực hút $F = k/r^2$: tích phân là thế năng). → $\frac{2}{3}r\sqrt{r} + C$ và $-\frac{1}{r} + C$.
- **Luồng Support (Should) —_hint: tách phân thức thành tổng trước khi tích phân, nhớ nêu miền:**
  1. $\int \frac{r^2 + 2r - 3}{r}\,dr$ trên $(0; +\infty)$. → $r^2/2 + 2r - 3\ln r + C$.
  2. Tìm $F(r)$ của $f(r) = 6r^2 + \frac{1}{r}$ trên $(0; +\infty)$ biết $F(1) = 5$. → $F(r) = 2r^3 + \ln r + 3$.
- **Luồng Challenge (Could) —_hint: khai triển rồi quy về lũy thừa phân số; tốc độ thoát giải từ $\frac{1}{2}mv^2 = W$:**
  1. $\int \frac{(2r-1)^2}{\sqrt{r}}\,dr$ với $r > 0$. → $\frac{8}{5}r^2\sqrt{r} - \frac{8}{3}r\sqrt{r} + 2\sqrt{r} + C$.
  2. Chi phí biên trạm phóng: $C'(x) = 3x^2 + \frac{100}{x}$ (triệu đồng), $C(1) = 143$. Tìm $C(x)$. → $C(x) = x^3 + 100\ln x + 42$.

### 5. Hoạt động 5: Post-Check & Đánh giá thường xuyên (3 phút)
- **ĐGTX máy:** Tàu giai đoạn phóng: $m_0 = 200$ tấn, $m_f = 50$ tấn, $v_e = 3$ km/s. Tính $\Delta v$. → $\Delta v = 3\ln 4 \approx 4{,}16$ km/s; kiểm chứng ngược: đạo hàm của $\ln m$ là $\frac{1}{m}$ ✓ (hoàn nguyên).
- **Câu hỏi bảng con:** Cho 5 hàm, chọn nhanh công thức phù hợp (lũy thừa $\alpha \neq -1$ hay ln) và quy đổi $\sqrt{r}, \frac{1}{r^2}, \frac{1}{\sqrt{r}}$ sang $r^{\alpha}$.

### 6. Hoạt động 6: Vận dụng thực tế & Tổng kết (8 phút)
- **Ứng dụng — Tốc độ thoát:** Tàu 10 tấn tắt máy tại $R = 6{,}4\times10^6$ m: $W = \int_R^{+\infty} \frac{4\times10^{18}}{r^2} dr = \frac{4\times10^{18}}{6{,}4\times10^6} = 6{,}25\times10^{11}$ J; $v = \sqrt{\frac{2W}{m}} \approx 11{,}2$ km/s — trùng tốc độ thoát thực tế của Trái Đất.
- **Quick-check:** 2 câu chốt (lỗi thay $\alpha=-1$ vào $\frac{1}{x^2}$; $\ln(-x)$ trên miền âm).
- **Exit Ticket:** 1) Viết 2 công thức kèm điều kiện; 2) Nêu 1 bẫy ("không xác định" ≠ "không tồn tại"); 3) Tự đánh giá M/S/C; 4) Chốt ngữ cảnh: Δv tàu của Tsiolkovsky = ? → $v_e\ln\frac{m_0}{m_f} \approx 4{,}16$ km/s.

# KẾ HOẠCH DẠY HỌC — Mẫu số liệu ghép nhóm (Toán 11 · Tuần 11 · Tiết 75)

| Lớp | 11 | Tên bài học | Mẫu số liệu ghép nhóm | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 11 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-11-11-75.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Hiểu khái niệm mẫu số liệu ghép nhóm, nửa khoảng [a; b); tính giá trị đại diện và độ dài nhóm.
- **Should (Trọng tâm – Thông hiểu):** Lập bảng ghép nhóm từ dãy số liệu thô; xác định đúng nhóm cho giá trị nằm ở đầu mút.
- **Could (Nâng cao – Vận dụng):** Giải thích vì sao phải giữ nhóm có tần số 0; phản biện bảng ghép nhóm bị hở hoặc chồng lấn.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Khảo sát thời gian sử dụng Internet hằng ngày của 40 học sinh lớp 11A (đơn vị: phút).**

- Giá trị nhỏ nhất: $x_{\min} = 42$ phút; giá trị lớn nhất: $x_{\max} = 235$ phút.
- Khoảng biến thiên: $R = 235 - 42 = 193$ phút (rất rộng, lập bảng đơn lẻ sẽ dài 40 dòng).
- Chia 6 nhóm có độ dài $h = 40$ phút bắt đầu từ 30 phút:

| Nhóm thời gian (phút) | Giá trị đại diện $c_i$ | Tần số $m_i$ |
|---|:---:|:---:|
| $[30; 70)$ | $50$ | $10$ |
| $[70; 110)$ | $90$ | $15$ |
| $[110; 150)$ | $130$ | $11$ |
| $[150; 190)$ | $170$ | $3$ |
| $[190; 230)$ | $210$ | $0$ |
| $[230; 270)$ | $250$ | $1$ |
| **Tổng** | — | **$n = 40$** |

- **Quy tắc mút:** $[a_i; a_{i+1})$ lấy dấu $\ge$ ở mút trái, $<$ ở mút phải. Giá trị 90 nằm trong $[90; 110)$ chứ không thuộc $[70; 90)$.
- **Nhóm tần số 0:** nhóm $[190; 230)$ có tần số 0 vẫn phải giữ để bảng liên tiếp, không tạo hổng.

**Bẫy của bài:** nhầm nửa khoảng $[a; b)$ thành đoạn $[a; b]$ nên xếp giá trị ở mút phải vào nhóm trước; tự tiện xoá nhóm có tần số bằng 0.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Khảo sát 40 học sinh; bạn Nam dùng đúng 90 phút Internet mỗi ngày.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Bạn Nam thuộc nhóm nào trong hai nhóm: $[70; 90)$ hay $[90; 110)$?*
  - (A) Nhóm [70; 90)
  - (B) Nhóm [90; 110)
  - (C) Thuộc cả hai nhóm
  - **Correct: (B)** — Quy ước nửa khoảng [a; b) lấy ≥ ở mút trái và < ở mút phải, nên 90 thuộc [90; 110).
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Vì sao không lấy dấu bằng ở cả hai đầu mút?
  2. `[SO SÁNH]` Nếu dùng đúng 70 phút thì ở nhóm nào?
- **TeacherCue (lớp yếu):** Vẽ trục số và kí hiệu nửa khoảng [a; b): mút trái ngoặc vuông [, mút phải ngoặc tròn ).
- **LookFor:** HS nhớ quy tắc ngoặc vuông lấy bằng, ngoặc tròn không lấy bằng.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Hiểu khái niệm mẫu số liệu ghép nhóm, nửa khoảng [a; b); tính giá trị đại diện và độ dài nhóm.
- **Should:** Lập bảng ghép nhóm từ dãy số liệu thô; xác định đúng nhóm cho giá trị nằm ở đầu mút.
- **Could:** Giải thích vì sao phải giữ nhóm có tần số 0; phản biện bảng ghép nhóm bị hở hoặc chồng lấn.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Vì sao một học sinh dùng đúng 90 phút Internet lại thuộc nhóm [90; 120) mà không thuộc [60; 90)?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Bước 1: Tìm khoảng biến thiên $R = x_{\max} - x_{\min}$.
- **Bước 2:** Bước 2: Chọn số nhóm $k$ và độ dài nhóm $h \ge R/k$; chọn điểm bắt đầu $a_1 \le x_{\min}$.
- **Bước 3:** Bước 3: Lập các nửa khoảng liên tiếp $[a_i; a_{i+1})$, đếm tần số $m_i$; kiểm tra $\sum m_i = n$.
- **Bước 4:** Bước 4: Tính giá trị đại diện $c_i = (a_i + a_{i+1})/2$.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao nhóm tần số 0 vẫn phải ghi vào bảng?
  2. `[PHÁT HIỆN]` Điều gì xảy ra nếu các nhóm bị hở?
- **TeacherCue (lớp yếu):** Khung 3 bước ghép nhóm; nhấn mạnh quy tắc bao phủ và liên tiếp.
- **Chốt:** Mỗi dữ liệu thuộc duy nhất một nhóm; tổng tần số luôn bằng cỡ mẫu n; không bỏ nhóm tần số 0.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI viết: Học sinh dùng Internet 90 phút thuộc nhóm [60; 90) vì 90 nằm ở cuối nhóm này."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI xếp học sinh dùng 90 phút vào nhóm [60; 90) vì thấy số 90 ở cuối nhóm.
  2. Bằng chứng: Kí hiệu [a; b) nghĩa là a ≤ x < b, nên 90 < 90 là sai; 90 không thể thuộc [60; 90).
  3. Sửa: Xếp vào nhóm [90; 120) vì 90 ≤ 90 < 120 thỏa quy ước mút trái.
- **TeacherCue:** Cho HS viết định nghĩa nửa khoảng [a; b) dưới dạng bất đẳng thức kép.
- **LookFor:** HS chỉ ra dấu < ở mút phải.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "độ dài nhóm = mút phải trừ mút trái; giá trị đại diện = trung bình cộng hai mút."
  - **S:** "nhớ quy tắc nửa khoảng [a; b): x = a thuộc nhóm, x = b không thuộc nhóm."
  - **C:** "kiểm tra tính liên tiếp và tổng tần số phải bằng n; không được bỏ nhóm tần số 0."

- **Luồng M (Must) — hint: độ dài nhóm = mút phải trừ mút trái; giá trị đại diện = trung bình cộng hai mút.**
1. Cho nhóm $[20; 30)$. Nêu độ dài nhóm và giá trị đại diện.
   - **Đáp án:** Độ dài $30 - 20 = 10$; giá trị đại diện $c = (20 + 30)/2 = 25$.
2. Kí hiệu nhóm $[a_i; a_{i+1})$ lấy dấu gì ở mút trái và mút phải?
   - **Đáp án:** Lấy $\ge$ ở mút trái và $<$ ở mút phải.

- **Luồng S (Should) — hint: nhớ quy tắc nửa khoảng [a; b): x = a thuộc nhóm, x = b không thuộc nhóm.**
1. Học sinh có thời gian dùng Internet đúng 90 phút thuộc nhóm $[60; 90)$ hay $[90; 120)$?
   - **Đáp án:** Thuộc $[90; 120)$ vì mút trái lấy dấu $\ge$, còn $[60; 90)$ lấy dấu $<$ ở mút phải.
2. Cự ly chạy 100 m có $x_{\min} = 12,1$ s, $x_{\max} = 15,5$ s. Chia 4 nhóm đều bắt đầu từ 12,0 s thì độ dài nhóm bằng bao nhiêu?
   - **Đáp án:** $R = 15,5 - 12,0 = 3,5$; $h \ge 3,5/4 = 0,875$ nên chọn $h = 1,0$: $[12;13), [13;14), [14;15), [15;16)$.

- **Luồng C (Could) — hint: kiểm tra tính liên tiếp và tổng tần số phải bằng n; không được bỏ nhóm tần số 0.**
1. Bảng ghi các nhóm $[10;20)$, $[20;30)$, $[31;40)$ sai ở đâu và gây hậu quả gì với học sinh đạt 30,5?
   - **Đáp án:** Bảng bỏ hổng khoảng (30;31) nên giá trị 30,5 không thuộc nhóm nào; học sinh đó biến mất khỏi bảng tần số, tổng tần số nhỏ hơn n.
2. Vì sao trong một bảng ghép nhóm, nhóm có tần số 0 vẫn phải giữ?
   - **Đáp án:** Vì các nhóm phải liên tiếp và bao phủ toàn bộ khoảng từ $x_{\min}$ tới $x_{\max}$; bỏ nhóm rỗng sẽ tạo hổng và làm sai quy tắc ghép nhóm.

- **LookFor:** HS M tính đúng c; HS S xếp đúng mút; HS C giải thích được nhóm rỗng.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Cho nhóm $[20; 30)$. Nêu giá trị đại diện và cho biết giá trị 30 có thuộc nhóm này không. → $c = (20 + 30)/2 = 25$; giá trị 30 KHÔNG thuộc nhóm vì mút phải là ngoặc tròn ($<$).
- **Câu hỏi bảng con (Đúng/Sai):**
  - "Nhóm [a; b) lấy dấu bằng ở cả hai đầu mút" → **Sai — chỉ lấy dấu bằng ở mút trái**
  - "Giá trị đại diện là trung điểm của hai đầu mút" → **Đúng**
  - "Nhóm có tần số 0 có thể xoá bỏ khỏi bảng" → **Sai — phải giữ để bảng liên tiếp**
- **TeacherCue:** Đổi phiếu chấm chéo, kiểm tra kĩ phần ngoặc tròn.

- **Câu 1:** Cho bảng nhóm $[20;30), [30;40), [40;50)$. Giá trị đại diện của nhóm thứ hai bằng bao nhiêu? → $c_2 = (30 + 40)/2 = 35$.
- **Câu 2:** Vì sao bảng tần số đơn lẻ cho từng giá trị không còn phù hợp với mẫu 40 số liệu? → Vì bảng quá dài, nhiều giá trị chỉ có tần số bằng 1 nên không nhìn ra xu hướng tập trung của dữ liệu.
- **Chốt nhanh:** [a; b) lấy mút trái, bỏ mút phải; c = (a+b)/2; giữ nguyên nhóm tần số 0.

- Nhóm [70; 110) phút có tần số đông nhất (15/40 HS, chiếm 37,5%).
- Có 1 HS dùng tới hơn 230 phút/ngày — cần lưu ý hỗ trợ cá nhân.
- Nhóm [190; 230) dù tần số 0 vẫn phải giữ trên biểu đồ để không làm sai lệch trục thời gian.
- **TeacherCue:** Hỏi: "Nếu bỏ nhóm 0 thì biểu đồ trông sẽ bị méo như thế nào?"

- **Exit Ticket (4 mục):**
  1. Nêu quy ước dấu ở hai đầu mút của nửa khoảng [a; b).
  2. Nêu 1 bẫy (xếp giá trị mút phải vào nhóm; xoá nhóm tần số 0).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Học sinh dùng 90 phút Internet thuộc nhóm [70; 90) hay [90; 110)?
- **TeacherCue (lớp yếu):** Mở lại sơ đồ trục số ở S1.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Cho nhóm $[20; 30)$. Nêu độ dài nhóm và giá trị đại diện.
   - **Đáp án:** Độ dài $30 - 20 = 10$; giá trị đại diện $c = (20 + 30)/2 = 25$.
2. `[NB]` Kí hiệu nhóm $[a_i; a_{i+1})$ lấy dấu gì ở mút trái và mút phải?
   - **Đáp án:** Lấy $\ge$ ở mút trái và $<$ ở mút phải.
3. `[TH]` Học sinh có thời gian dùng Internet đúng 90 phút thuộc nhóm $[60; 90)$ hay $[90; 120)$?
   - **Đáp án:** Thuộc $[90; 120)$ vì mút trái lấy dấu $\ge$, còn $[60; 90)$ lấy dấu $<$ ở mút phải.
4. `[TH]` Cự ly chạy 100 m có $x_{\min} = 12,1$ s, $x_{\max} = 15,5$ s. Chia 4 nhóm đều bắt đầu từ 12,0 s thì độ dài nhóm bằng bao nhiêu?
   - **Đáp án:** $R = 15,5 - 12,0 = 3,5$; $h \ge 3,5/4 = 0,875$ nên chọn $h = 1,0$: $[12;13), [13;14), [14;15), [15;16)$.
5. `[VD]` Bảng ghi các nhóm $[10;20)$, $[20;30)$, $[31;40)$ sai ở đâu và gây hậu quả gì với học sinh đạt 30,5?
   - **Đáp án:** Bảng bỏ hổng khoảng (30;31) nên giá trị 30,5 không thuộc nhóm nào; học sinh đó biến mất khỏi bảng tần số, tổng tần số nhỏ hơn n.
6. `[VD]` Vì sao trong một bảng ghép nhóm, nhóm có tần số 0 vẫn phải giữ?
   - **Đáp án:** Vì các nhóm phải liên tiếp và bao phủ toàn bộ khoảng từ $x_{\min}$ tới $x_{\max}$; bỏ nhóm rỗng sẽ tạo hổng và làm sai quy tắc ghép nhóm.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Hiểu nhóm $[a; b)$ là đoạn đóng hai đầu nên xếp giá trị đúng bằng $b$ vào nhóm trước.
- Bỏ nhóm có tần số bằng 0, làm bảng mất tính liên tiếp.
- Quên kiểm tổng tần số bằng $n$ sau khi lập bảng.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.

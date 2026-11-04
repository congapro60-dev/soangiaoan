# KẾ HOẠCH DẠY HỌC — Các số đặc trưng đo xu thế trung tâm — Tiết 2: Tứ phân vị và Mốt của mẫu ghép nhóm (Toán 11 · Tuần 12 · Tiết 82)

| Lớp | 11 | Tên bài học | Các số đặc trưng đo xu thế trung tâm — Tiết 2: Tứ phân vị và Mốt của mẫu ghép nhóm | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 12 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-11-12-82.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Xác định đúng nhóm chứa Q1, Q3 và nhóm chứa mốt từ bảng tần số ghép nhóm; áp dụng công thức nội suy với C = tần số tích lũy nhóm trước.
- **Should (Trọng tâm – Thông hiểu):** Tính trọn bộ Q1, Q3, Mo cho bảng 4 nhóm (n = 40) và giải thích ý nghĩa 25%–75%; đọc được bảng tần số tích lũy.
- **Could (Nâng cao – Vận dụng):** Nhận xét phân bố (đối xứng/lệch) từ khoảng tứ phân vị; giải bài toán ngược tìm tần số khi biết mốt; phản biện lỗi bỏ C.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Khảo sát thời gian dùng Internet trong ngày cuối tuần của 40 học sinh khối 11 trường Dewey.**

| Nhóm thời gian (giờ) | $[0;2)$ | $[2;4)$ | $[4;6)$ | $[6;8)$ |
|---|:---:|:---:|:---:|:---:|
| Số học sinh | 6 | 14 | 15 | 5 |
| Tần số tích lũy $cf$ | 6 | 20 | 35 | 40 |

- **Kiểm chứng tay:** $n = 40$; $n/4 = 10$ → nhóm đầu tiên có $cf \ge 10$ là $[2;4)$ với $C = 6$, $m = 14$, $h = 2$: $Q_1 = 2 + \dfrac{10-6}{14}\cdot 2 \approx 2{,}57$ giờ.
- $3n/4 = 30$ → nhóm $[4;6)$ với $C = 20$, $m = 15$, $h = 2$: $Q_3 = 4 + \dfrac{30-20}{15}\cdot 2 \approx 5{,}33$ giờ.
- Trung vị: $n/2 = 20$ → $cf$ nhóm $[2;4)$ đúng bằng 20 nên $Q_2 = 4$ giờ (biên trên nhóm 2).
- Mốt: nhóm $[4;6)$ có $m = 15$ lớn nhất, $m_{trước} = 14$, $m_{sau} = 5$: $M_o = 4 + \dfrac{15-14}{(15-14)+(15-5)}\cdot 2 \approx 4{,}18$ giờ.
- **Đọc nghĩa:** 25% HS dùng dưới 2,57 giờ; 25% dùng trên 5,33 giờ; mức phổ biến nhất khoảng 4,18 giờ/ngày cuối tuần.
- **Bẫy của bài:** quên trừ $C$ (lấy $C = 0$) → $Q_1$ bị đẩy lên 3,43 giờ; nhầm nhóm chứa mốt với nhóm đầu; nhầm $m_j$ với $h$.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Khảo sát 40 HS khối 11: $[0;2)$: 6 em; $[2;4)$: 14 em; $[4;6)$: 15 em; $[6;8)$: 5 em. Phụ huynh hỏi: "Con tôi dùng 3 giờ/ngày cuối tuần thì thuộc nhóm nào của trường?"
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Muốn biết "25% học sinh dùng ít nhất là dưới bao nhiêu giờ", em cần tính gì?*
  - (A) Số trung bình cộng các giá trị đại diện.
  - (B) Tứ phân vị thứ nhất $Q_1$ bằng công thức nội suy trong nhóm chứa $n/4$.
  - (C) Tổng số học sinh chia cho 4.
  - **Correct: (B).** (C) chỉ cho 10 em — một tần số, không phải một mốc thời gian.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Vì sao phải lập bảng tần số tích lũy trước khi tìm nhóm chứa $Q_1$?
  2. `[SO SÁNH]` Giá trị đại diện của nhóm $[2;4)$ là 3 — dùng ngay 3 giờ làm $Q_1$ có ổn không?
- **TeacherCue (lớp yếu):** Vẽ trục 0–8 chia 4 đoạn và tô 6–14–15–5 ô vuông; chỉ "đếm đến ô thứ 10" để thấy $Q_1$ nằm trong đoạn 2–4.
- **LookFor:** HS nêu được ý tưởng "đếm dồn" (tích lũy) thay vì lấy đại diện nhóm.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** xác định đúng nhóm chứa $Q_1$, $Q_3$, mốt; áp dụng công thức với $C$ là tần số tích lũy nhóm trước.
- **Should:** tính trọn bộ cho bảng 40 HS và giải thích ý nghĩa 25%–75%.
- **Could:** nhận xét phân bố từ khoảng tứ phân vị; giải bài toán ngược tìm tần số khi biết mốt; phản biện lỗi lấy $C = 0$.
- **Student:** chọn mức cam kết trên máy.
- **Câu hỏi trọng tâm:** "Vì sao công thức tứ phân vị ghép nhóm phải trừ tần số tích lũy của các nhóm phía trước?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bảng tần số tích lũy:** 6 | 20 | 35 | 40.
- **$Q_1$:** $n/4 = 10$; nhóm đầu tiên có $cf \ge 10$ là $[2;4)$ ($a_p = 2$, $h = 2$, $m_p = 14$, $C = 6$):
  $$Q_1 = a_p + \frac{n/4 - C}{m_p}\cdot h = 2 + \frac{10-6}{14}\cdot 2 \approx 2{,}57 \text{ giờ}.$$
- **$Q_3$:** $3n/4 = 30$; nhóm $[4;6)$ ($a_k = 4$, $h = 2$, $m_k = 15$, $C = 20$):
  $$Q_3 = 4 + \frac{30-20}{15}\cdot 2 \approx 5{,}33 \text{ giờ}.$$
- **Mốt:** nhóm $[4;6)$ có $m_j = 15$ lớn nhất; $m_{j-1} = 14$, $m_{j+1} = 5$:
  $$M_o = 4 + \frac{15-14}{(15-14)+(15-5)}\cdot 2 \approx 4{,}18 \text{ giờ}.$$
- **Câu hỏi dẫn:**
  1. `[SUY LUẬN]` Tử số $n/4 - C$ đếm cái gì? → số học sinh còn phải đếm thêm trong nhóm chứa.
  2. `[PHÁT HIỆN]` Khi nào $M_o$ rơi đúng trung điểm nhóm? → khi $m_{j-1} = m_{j+1}$.
- **TeacherCue (lớp yếu):** Khung 3 ô: "nhóm chứa → $C$ → thay số". Nhắc: "$C$ là đã đếm được bao nhiêu em trước nhóm này".
- **Chốt:** "Nội suy = chia đều phần còn thiếu trong nhóm; mốt nghiêng về phía nhóm bên cạnh đông hơn."

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "Cỡ mẫu $n = 40$ nên $n/4 = 10$, rơi vào nhóm $[2;4)$. Áp dụng công thức: $Q_1 = 2 + \dfrac{10-0}{14}\cdot 2 = 2 + \dfrac{20}{14} \approx 3{,}43$ giờ."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI lấy $C = 0$ thay vì $C = cf_1 = 6$.
  2. Bằng chứng: nhóm $[0;2)$ đã có 6 em; để tìm em thứ 10 chỉ cần đếm thêm 4 em trong nhóm $[2;4)$, không phải 10 em.
  3. Sửa: $Q_1 = 2 + \dfrac{4}{14}\cdot 2 \approx 2{,}57$ giờ.
- **TeacherCue:** Cho HS yếu đếm bằng tay trên 40 ô vuông: tô 6 ô nhóm 1, rồi đếm tiếp 4 ô trong nhóm 2 — thấy ngay vị trí $Q_1$ gần đầu nhóm.
- **Câu hỏi chốt:** "Nếu $Q_1$ tính ra lớn hơn cả $Q_2 = 4$ thì em nghi ngờ bước nào?" → bước $C$.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn chọn phiếu M / S / C, đọc hint trước khi làm.
- **Hint từng luồng:**
  - **M:** "Lập bảng $cf$ trước; nhóm chứa là nhóm đầu tiên có $cf \ge n/4$."
  - **S:** "Nhớ $C$ = $cf$ nhóm ngay trước; kiểm tra $Q_1 < Q_2 < Q_3$."
  - **C:** "Bài ngược: viết $M_o$ theo $m_j$ rồi giải phương trình; nhớ điều kiện $m_j$ lớn nhất."

- **Luồng M (Must) — hint: lập $cf$, tìm nhóm đầu tiên vượt mốc:**
  1. Bảng khảo sát 50 HS toàn trường có tần số 5, 12, 18, 15. Xác định nhóm chứa $Q_1$ và nhóm chứa mốt. → $cf$: 5, 17, 35, 50; $n/4 = 12{,}5$ → nhóm 2; mốt ở nhóm 3 ($m_3 = 18$).
  2. Nêu công thức mốt và nghĩa các ký hiệu. → $M_o = a_j + \dfrac{m_j - m_{j-1}}{(m_j - m_{j-1}) + (m_j - m_{j+1})}\cdot h$.
- **Luồng S (Should) — hint: kiểm tra lại $C$ và $h$ trước khi thay số:**
  1. 30 HS lớp 11A1 dùng Internet buổi tối: $[0;1)$: 4; $[1;2)$: 10; $[2;3)$: 12; $[3;4)$: 4. Tính $Q_1, Q_3$. → $cf$: 4, 14, 26, 30; $Q_1 = 1 + \dfrac{7{,}5-4}{10} \approx 1{,}35$; $Q_3 = 2 + \dfrac{22{,}5-14}{12} \approx 2{,}71$ giờ.
  2. 50 HS dùng Internet theo tuần (giờ): $[0;5)$: 8; $[5;10)$: 20; $[10;15)$: 16; $[15;20)$: 6. Tính mốt và nêu ý nghĩa. → $M_o = 5 + \dfrac{20-8}{(20-8)+(20-16)}\cdot 5 = 8{,}75$ giờ.
- **Luồng C (Could) — hint: so sánh hai nửa tứ phân vị; bài ngược lập phương trình:**
  1. Với bảng 40 HS ban đầu ($Q_1 \approx 2{,}57$; $Q_2 = 4$; $Q_3 \approx 5{,}33$), nhận xét phân bố. → $Q_2 - Q_1 = 1{,}43$; $Q_3 - Q_2 = 1{,}33$: hai nửa gần bằng nhau, phân bố hơi lệch phải; $M_e$ (4,0) gần $M_o$ (4,18).
  2. Bảng 4 nhóm $[0;2)$: 5; $[2;4)$: $x$; $[4;6)$: 8; $[6;8)$: 4 có mốt bằng 3,2. Tìm $x$. → $3{,}2 = 2 + \dfrac{x-5}{(x-5)+(x-8)}\cdot 2 \Rightarrow \dfrac{x-5}{2x-13} = 0{,}6 \Rightarrow x = 14$ (thỏa $x > 8$).
- **LookFor:** HS M lập đúng $cf$; HS S kiểm tra $Q_1 < Q_2 < Q_3$; HS C giải thích được độ lệch phân bố.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Bảng 20 HS: $[0;2)$: 4; $[2;4)$: 8; $[4;6)$: 6; $[6;8)$: 2. Tính $Q_1$ và mốt. → $n/4 = 5$ → nhóm $[2;4)$: $Q_1 = 2 + \dfrac{5-4}{8}\cdot 2 = 2{,}25$ giờ; mốt nhóm $[2;4)$: $M_o = 2 + \dfrac{8-4}{(8-4)+(8-6)}\cdot 2 \approx 3{,}33$ giờ.
- **Câu hỏi bảng con (Đúng/Sai):**
  - (a) "Nhóm chứa mốt là nhóm đầu tiên của bảng" → **Sai** (nhóm có $m_j$ lớn nhất).
  - (b) "Khi tính $Q_1$ phải trừ tần số tích lũy nhóm trước" → **Đúng**.
  - (c) "Mốt luôn bằng trung điểm nhóm chứa mốt" → **Sai** (chỉ đúng khi $m_{j-1} = m_{j+1}$).
- **TeacherCue:** Chiếu 2 phiếu điển hình, sửa theo khung 3 ô ở S3.

- **Câu 1:** Nếu lấy $C = 0$ thay vì $cf$ nhóm trước khi tính $Q_1$, kết quả lớn hơn hay nhỏ hơn thực tế? → Lớn hơn, vì tử số $n/4 - 0 > n/4 - C$.
- **Câu 2:** Có thể khẳng định mốt luôn bằng trung điểm nhóm chứa mốt? → Không; chỉ khi hai nhóm kề có tần số bằng nhau.
- **Chốt nhanh:** $C$ là "đã đếm được bao nhiêu"; mốt nghiêng về phía nhóm đông hơn.

- **Bối cảnh:** Phụ huynh hỏi "con tôi dùng 4 giờ/ngày cuối tuần có bất thường không?".
- **Trả lời có căn cứ:** $Q_1 \approx 2{,}57$; $Q_2 = 4$; $Q_3 \approx 5{,}33$; $M_o \approx 4{,}18$. Học sinh dùng 4 giờ nằm **đúng trung vị** — đại diện cho nửa lớp, không phải ngoại lệ.
- **Khuyến nghị phân tầng:** dưới 2,57 giờ (nhóm 25% thấp) — có thể tăng thêm hoạt động số; 2,57–5,33 giờ (50% giữa) — duy trì; trên 5,33 giờ (25% cao) — nên có quy định giới hạn.
- **TeacherCue:** Nhấn mạnh "dùng đúng số của mình để nói, không phán xét bằng cảm giác".

- **Exit Ticket (4 mục):**
  1. Nêu quy trình 3 bước tính $Q_1$ của mẫu ghép nhóm.
  2. Nêu 1 bẫy (quên $C$ / nhầm nhóm mốt / nhầm $m_j$ với $h$).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Với 40 HS khối 11, $Q_1$, $Q_3$, $M_o$ bằng bao nhiêu? → $\approx 2{,}57$; $\approx 5{,}33$; $\approx 4{,}18$ giờ.
- **TeacherCue (lớp yếu):** Mở lại bảng $cf$ ở S3 và khung 3 ô trước khi viết.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Bảng khảo sát 50 học sinh có tần số 4 nhóm lần lượt 5, 12, 18, 15. Xác định nhóm chứa tứ phân vị thứ nhất Q1 và nhóm chứa mốt.
   - **Đáp án:** Tần số tích lũy: 5, 17, 35, 50. n/4 = 12,5 nên nhóm đầu tiên có cf ≥ 12,5 là nhóm thứ hai. Nhóm có tần số lớn nhất là nhóm thứ ba (18). Vậy Q1 thuộc nhóm 2, mốt thuộc nhóm 3.
2. `[NB]` Nêu công thức tính mốt Mo của mẫu số liệu ghép nhóm và giải thích các ký hiệu.
   - **Đáp án:** Mo = a_j + [(m_j − m_{j−1}) / ((m_j − m_{j−1}) + (m_j − m_{j+1}))] · h, trong đó [a_j; a_{j+1}) là nhóm chứa mốt, h là độ dài nhóm, m_j là tần số nhóm chứa mốt, m_{j−1} và m_{j+1} là tần số hai nhóm kề.
3. `[TH]` 30 học sinh lớp 11A1 có thời gian dùng Internet buổi tối: [0;1) có 4; [1;2) có 10; [2;3) có 12; [3;4) có 4. Tính Q1 và Q3.
   - **Đáp án:** Tần số tích lũy: 4, 14, 26, 30. n/4 = 7,5 → nhóm [1;2) với C = 4, m = 10, h = 1: Q1 = 1 + (7,5 − 4)/10 ≈ 1,35 giờ. 3n/4 = 22,5 → nhóm [2;3) với C = 14, m = 12: Q3 = 2 + (22,5 − 14)/12 ≈ 2,71 giờ.
4. `[TH]` Khảo sát 50 học sinh về số giờ dùng Internet mỗi tuần: [0;5) có 8; [5;10) có 20; [10;15) có 16; [15;20) có 6. Tính mốt và nêu ý nghĩa.
   - **Đáp án:** Nhóm chứa mốt là [5;10) với m = 20, trước 8, sau 16: Mo = 5 + (20 − 8)/((20 − 8) + (20 − 16)) · 5 = 5 + 12/16 · 5 = 8,75 giờ. Ý nghĩa: mức sử dụng phổ biến nhất của học sinh khoảng 8,75 giờ/tuần.
5. `[VD]` Với bảng 40 học sinh khối 11 (Q1 ≈ 2,57; Q2 = 4; Q3 ≈ 5,33; Mo ≈ 4,18 giờ), hãy nhận xét mức độ phân bố và tính đối xứng của dữ liệu.
   - **Đáp án:** Q2 − Q1 = 1,43 và Q3 − Q2 = 1,33 gần bằng nhau nên phân bố gần đối xứng, hơi lệch phải. Q2 = 4,0 gần Mo = 4,18 cho thấy dữ liệu tập trung quanh 4 giờ/ngày; khoảng tứ phân vị Q3 − Q1 ≈ 2,76 giờ bao trọn 50% học sinh ở giữa.
6. `[VD]` Một bảng ghép nhóm có 4 nhóm: [0;2) tần số 5; [2;4) tần số x; [4;6) tần số 8; [6;8) tần số 4. Biết mốt của mẫu bằng 3,2 và thuộc nhóm [2;4). Tìm số nguyên x.
   - **Đáp án:** Vì Mo = 3,2 ∈ [2;4) nên a = 2, h = 2, m = x (x > 8). Ta có 3,2 = 2 + (x − 5)/((x − 5) + (x − 8)) · 2 ⇔ 0,6 = (x − 5)/(2x − 13) ⇔ 0,6(2x − 13) = x − 5 ⇔ 1,2x − 7,8 = x − 5 ⇔ x = 14 (thỏa mãn x > 8).

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Quên trừ tần số tích lũy các nhóm trước (lấy C = 0) khi tính Q1 hoặc Q3.
- Nhầm nhóm chứa mốt là nhóm đầu tiên thay vì nhóm có tần số m_j lớn nhất.
- Nhầm tần số nhóm m_j với độ dài nhóm h trong mẫu số của công thức mốt.
- Dùng n/4 thay vì 3n/4 khi xác định nhóm chứa Q3.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.

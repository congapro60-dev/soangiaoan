# KẾ HOẠCH DẠY HỌC — Các số đặc trưng đo xu thế trung tâm — Tiết 2: Tứ phân vị và Mốt (Toán 10 · Tuần 12 · Tiết 88)

| Lớp | 10 | Tên bài học | Các số đặc trưng đo xu thế trung tâm — Tiết 2: Tứ phân vị và Mốt | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 12 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-10-12-88.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Sắp xếp mẫu số liệu và tìm đúng Q1, Q2, Q3 cho mẫu cỡ nhỏ (n ≤ 11); nhận ra mốt là giá trị có tần số lớn nhất.
- **Should (Trọng tâm – Thông hiểu):** Xử lý trọn quy tắc cho cả n lẻ và n chẵn (không tính Q2 vào hai nửa khi n lẻ); giải thích ý nghĩa 25%–50%–75% gắn với dữ liệu giờ làm thêm.
- **Could (Nâng cao – Vận dụng):** Dùng tứ phân vị và mốt để ra quyết định chính sách (chọn mức OT đại diện); phản biện kết luận thống kê thiếu bước sắp xếp hoặc nhầm mốt với giá trị lớn nhất.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Công ty Alpha tổng kết tháng 12 và phải chọn "một con số đại diện" cho mức tăng ca (OT) để tính phụ cấp.**

Số giờ OT tháng 12 của **11 nhân viên dự án** (đơn vị: giờ):

`12, 5, 20, 8, 15, 12, 0, 18, 12, 10, 16`

Sắp xếp không giảm:

| Vị trí | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Giờ OT | 0 | 5 | 8 | 10 | 12 | 12 | 12 | 15 | 16 | 18 | 20 |

- **Kiểm chứng tay:** $n = 11$ (lẻ) → $Q_2 = x_6 = 12$. Nửa dưới (5 giá trị: 0, 5, 8, 10, 12) → $Q_1 = x_3 = 8$. Nửa trên (5 giá trị: 12, 15, 16, 18, 20) → $Q_3 = x_3 = 16$. Giá trị 12 xuất hiện 3 lần → $M_o = 12$ (giờ).
- **Đọc nghĩa:** 25% nhân viên làm thêm ≤ 8 giờ; 50% làm ≤ 12 giờ; 25% làm ≥ 16 giờ; mức phổ biến nhất là 12 giờ.
- **Mẫu thứ hai — nhóm thiết kế 8 người:** $5, 6, 6, 7, 8, 8, 9, 10$ → $n$ chẵn: $Q_2 = (7+8)/2 = 7{,}5$; $Q_1 = (6+6)/2 = 6$; $Q_3 = (8+9)/2 = 8{,}5$; hai giá trị 6 và 8 cùng có tần số 2 → mẫu có **hai mốt**.

**Bẫy của bài:** dãy OT ban đầu **chưa sắp xếp** — nếu lấy ngay "số thứ 6" hoặc chia nửa theo thứ tự xuất hiện thì tứ phân vị vô nghĩa (thậm chí $Q_1 = Q_3$).

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Công ty Alpha có 11 nhân viên dự án với giờ OT: 12, 5, 20, 8, 15, 12, 0, 18, 12, 10, 16. Phòng nhân sự hỏi: "Một con số nào đại diện cho mức tăng ca chung?"
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Muốn biết "mức tăng ca mà nửa công ty làm ít hơn, nửa công ty làm nhiều hơn", em cần tìm gì?*
  - (A) Giá trị lớn nhất của dãy — 20 giờ.
  - (B) Trung vị (số đứng giữa sau khi sắp xếp) — 12 giờ.
  - (C) Tổng số giờ chia cho 11.
  - **Correct: (B).** Tổng/11 là trung bình (bị 20 giờ kéo lên); giá trị lớn nhất chỉ là một cá nhân.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Vì sao phải sắp xếp dãy trước khi tìm "số đứng giữa"?
  2. `[SO SÁNH]` Nếu một nhân viên làm 100 giờ OT, trung bình thay đổi thế nào so với trung vị?
- **TeacherCue (lớp yếu):** Viết lên góc bảng hai câu: "Trung bình = san đều tất cả"; "Trung vị = chia đôi sau khi xếp hàng". Nhắc: "Xếp hàng trước, đếm sau — chưa xếp hàng thì mọi con số đều vô nghĩa."
- **LookFor:** HS nhận ra cần sắp xếp trước khi xác định vị trí giữa; HS phân biệt trung bình với trung vị.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** sắp xếp mẫu và tìm đúng $Q_1, Q_2, Q_3$ cho mẫu nhỏ; nhận ra mốt là giá trị có tần số lớn nhất.
- **Should:** xử lý trọn quy tắc cho $n$ lẻ và $n$ chẵn (không tính $Q_2$ vào hai nửa khi $n$ lẻ); giải thích ý nghĩa 25%–50%–75%.
- **Could:** dùng tứ phân vị/mốt để chốt chính sách OT; phản biện kết luận thiếu bước sắp xếp hoặc nhầm mốt với giá trị lớn nhất.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Bốn con số $Q_1, Q_2, Q_3, M_o$ kể được câu chuyện gì mà một con số trung bình không kể được?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1 — Sắp xếp (bắt buộc):** 0, 5, 8, 10, 12, 12, 12, 15, 16, 18, 20 ($n = 11$).
- **Bước 2 — $Q_2$ (trung vị toàn mẫu):** $n = 11$ lẻ → $Q_2 = x_6 = 12$ giờ.
- **Bước 3 — $Q_1$:** nửa dưới gồm 5 giá trị 0, 5, 8, 10, 12 → $Q_1 = x_3 = 8$ giờ.
- **Bước 4 — $Q_3$:** nửa trên gồm 5 giá trị 12, 15, 16, 18, 20 → $Q_3 = x_3 = 16$ giờ.
- **Trường hợp $n$ chẵn (nhóm thiết kế 8 người):** $5, 6, 6, 7, 8, 8, 9, 10$ → $Q_2 = (7+8)/2 = 7{,}5$; $Q_1 = (6+6)/2 = 6$; $Q_3 = (8+9)/2 = 8{,}5$.
- **Mốt:** đếm tần số: 12 xuất hiện 3 lần (nhiều nhất) → $M_o = 12$. Với nhóm thiết kế: 6 và 8 cùng 2 lần → hai mốt.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao $Q_1 le Q_2 le Q_3$ luôn đúng?
  2. `[PHÁT HIỆN]` Khi $n$ lẻ, vì sao không tính $Q_2$ vào cả hai nửa?
- **TeacherCue (lớp yếu):** Dán quy ước 3 dòng lên bảng: (1) xếp hàng; (2) lấy giữa làm $Q_2$; (3) bỏ $Q_2$ ra, chia hai nửa, lấy giữa mỗi nửa. Nhấn: "Bỏ $Q_2$ ra" là bước hay bị quên nhất.
- **Chốt:** "Tứ phân vị chia dãy đã xếp thành 4 phần, mỗi phần khoảng 25% số liệu; mốt là giá trị đông người chọn nhất."

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "Dãy OT: 12, 5, 20, 8, 15, 12, 0, 18, 12, 10, 16. $n = 11$ nên $Q_2$ là giá trị thứ 6 $= 12$. Nửa dưới lấy 5 giá trị đầu (12, 5, 20, 8, 15) cho $Q_1 = 12$. Nửa trên lấy 5 giá trị cuối (0, 18, 12, 10, 16) cho $Q_3 = 12$. Vậy $Q_1 = Q_2 = Q_3 = 12$ giờ."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI **không sắp xếp** dãy trước khi chia nửa → $Q_1 = Q_2 = Q_3$ (vô lý).
  2. Bằng chứng: dữ liệu có 0 giờ và 20 giờ nên $Q_1$ phải nhỏ hơn $Q_3$ rõ rệt.
  3. Sửa: $Q_1 = 8$, $Q_2 = 12$, $Q_3 = 16$.
- **TeacherCue:** Cho HS yếu đối chiếu hai bảng: bảng "theo thứ tự xuất hiện" và bảng "đã sắp xếp"; chỉ vào vị trí thứ 6 ở hai bảng để thấy khác nhau.
- **Câu hỏi chốt:** "Nếu AI nói ba tứ phân vị bằng nhau, em kiểm tra điều gì trước tiên?" → dãy đã sắp xếp chưa.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "Xếp hàng trước, đếm vị trí giữa; đừng quên bỏ $Q_2$ khi chia hai nửa."
  - **S:** "Với $n$ chẵn, lấy trung bình cộng hai số giữa; kiểm tra lại $Q_1 \le Q_2 \le Q_3$."
  - **C:** "Mốt là tần số, không phải độ lớn; bài toán ngược hãy dùng $Q_2$ để lập phương trình."

- **Luồng M (Must) — hint: xếp hàng, đếm giữa, bỏ $Q_2$ khi chia nửa:**
  1. Tìm $Q_1, Q_2, Q_3$ của mẫu đã sắp xếp $2, 4, 6, 8, 10, 12, 14$ → $Q_2 = 8$; $Q_1 = 4$; $Q_3 = 12$.
  2. Với 11 giá trị OT của công ty Alpha, mốt bằng bao nhiêu và nghĩa là gì? → $M_o = 12$ giờ (3/11 nhân viên), là mức tăng ca phổ biến nhất.
- **Luồng S (Should) — hint: kiểm tra $n$ lẻ/chẵn trước khi chọn công thức:**
  1. Phòng kế toán có 9 giá trị OT: 15, 4, 9, 18, 3, 7, 11, 14, 6. Tìm $Q_1, Q_2, Q_3$. → Xếp: 3, 4, 6, 7, 9, 11, 14, 15, 18; $Q_2 = 9$; $Q_1 = (4+6)/2 = 5$; $Q_3 = (14+15)/2 = 14{,}5$.
  2. 10 giá trị OT của phòng hỗ trợ: 4, 5, 6, 7, 7, 8, 9, 9, 10, 10. Tìm tứ phân vị và nêu nghĩa của $Q_1$. → $Q_2 = 7{,}5$; $Q_1 = 6$; $Q_3 = 9$; khoảng 25% nhân viên làm ≤ 6 giờ.
- **Luồng C (Could) — hint: mốt theo tần số; bài ngược dùng $Q_2$ lập phương trình:**
  1. Bảng tần số giờ OT của 75 nhân viên nhà máy: 4 giờ (4 người), 6 giờ (12), 8 giờ (35), 10 giờ (18), 12 giờ (6). Xác định mốt và tính trung bình; nên chọn mức nào làm chuẩn phụ cấp? → $M_o = 8$ giờ (35 người); $\bar{x} = 620/75 \approx 8{,}27$; chọn 8 giờ vì mốt phản ánh số đông và là mức "tròn" dễ chi trả.
  2. Mẫu 8 số nguyên dương đã xếp: $1, 3, 4, x, y, 9, 10, 12$ với $Q_1 = 3{,}5$; $Q_2 = 6{,}5$; $Q_3 = 9{,}5$. Tìm $x, y$. → $Q_2 = (x+y)/2 = 6{,}5 \Rightarrow x+y = 13$; $4 \le x \le y \le 9$ → $(4;9), (5;8), (6;7)$.
- **LookFor:** HS M làm đúng quy trình; HS S kiểm tra $n$ trước; HS C giải thích được vì sao mốt phù hợp hơn trung bình khi ra quyết định.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Cho 7 giá trị OT đã sắp xếp: 2, 5, 5, 8, 10, 10, 14. Tính $Q_1, Q_2, Q_3$ và mốt. → $Q_2 = 8$; $Q_1 = 5$; $Q_3 = 10$; mốt là 5 và 10 (cùng 2 lần).
- **Câu hỏi bảng con (Đúng/Sai):**
  - (a) "Mốt là giá trị lớn nhất của mẫu" → **Sai** (mốt là tần số lớn nhất).
  - (b) "Khi $n$ lẻ, $Q_2$ không được tính vào nửa dưới và nửa trên" → **Đúng**.
  - (c) "Có thể tìm tứ phân vị mà không cần sắp xếp mẫu" → **Sai**.
- **TeacherCue:** Thu 3 phiếu bất kỳ, chiếu lên và cùng sửa theo 3 dòng quy ước ở S3.

- **Câu 1:** Bạn Bình lấy ngay giá trị thứ 6 của dãy OT (chưa sắp xếp) làm $Q_2 = 12$, rồi lấy 5 giá trị đầu (12, 5, 20, 8, 15) tính $Q_1 = 12$. Kết quả $Q_1 = Q_2$ sai ở đâu? → Bỏ bước sắp xếp; đúng phải là $Q_1 = 8$, $Q_2 = 12$.
- **Câu 2:** Một mẫu 5 giá trị 12, 14, 15, 18, 20. Có bạn nói $M_o = 20$ vì lớn nhất. Đúng hay sai? → Sai; mỗi giá trị xuất hiện 1 lần nên mẫu **không có mốt**.
- **Chốt nhanh:** 3 dòng quy ước + "mốt là tần số".

- **Bối cảnh:** Phòng nhân sự cần chọn 1 mức OT chuẩn để tính phụ cấp tháng sau.
- **Ba phương án và căn cứ:**
  - Chọn theo **trung bình**: tổng OT = 0+5+8+10+12+12+12+15+16+18+20 = 128 → $\bar{x} = 128/11 \approx 11{,}64$ giờ (bị hai giá trị 0 và 5 giờ kéo xuống).
  - Chọn theo **trung vị**: $Q_2 = 12$ giờ — một nửa nhân viên làm ít hơn hoặc bằng mức này.
  - Chọn theo **mốt**: $M_o = 12$ giờ — mức đông người làm nhất (3/11).
- **Kết luận có căn cứ:** chọn 12 giờ vì vừa là trung vị vừa là mốt; trung bình 11,64 giờ thấp hơn và không đại diện cho nhóm làm nhiều.
- **TeacherCue:** Nhấn "hai con số khác nhau kể hai câu chuyện khác nhau" — không có con số nào 'đúng' tuyệt đối, chỉ có con số phù hợp mục đích.

- **Exit Ticket (4 mục):**
  1. Nêu 3 bước tìm tứ phân vị của mẫu không ghép nhóm.
  2. Nêu 1 bẫy (chưa sắp xếp / tính $Q_2$ vào hai nửa / nhầm mốt với giá trị lớn nhất).
  3. Tự đánh giá mức đạt (Must / Should / Could).
  4. **Chốt ngữ cảnh:** Với 11 nhân viên công ty Alpha, $Q_1$, $Q_2$, $Q_3$, $M_o$ bằng bao nhiêu? → $8$; $12$; $16$; $12$ giờ.
- **TeacherCue (lớp yếu):** Gợi ý mở lại 3 dòng quy ước ở S3 trước khi viết.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Tìm các tứ phân vị Q1, Q2, Q3 của mẫu đã sắp xếp: 2, 4, 6, 8, 10, 12, 14.
   - **Đáp án:** n = 7 lẻ; Q2 = x₄ = 8. Nửa dưới (2, 4, 6) → Q1 = 4. Nửa trên (10, 12, 14) → Q3 = 12.
2. `[NB]` Với 11 giá trị giờ OT của công ty Alpha (0, 5, 8, 10, 12, 12, 12, 15, 16, 18, 20), xác định mốt Mo và nêu ý nghĩa.
   - **Đáp án:** Giá trị 12 xuất hiện 3 lần (nhiều nhất) nên Mo = 12 giờ — đây là mức tăng ca phổ biến nhất (3/11 nhân viên).
3. `[TH]` Phòng kế toán công ty Alpha có 9 giá trị giờ OT: 15, 4, 9, 18, 3, 7, 11, 14, 6. Tìm Q1, Q2, Q3.
   - **Đáp án:** Sắp xếp: 3, 4, 6, 7, 9, 11, 14, 15, 18. n = 9 lẻ; Q2 = 9. Nửa dưới (3, 4, 6, 7) → Q1 = (4 + 6)/2 = 5. Nửa trên (11, 14, 15, 18) → Q3 = (14 + 15)/2 = 14,5.
4. `[TH]` Phòng hỗ trợ có 10 giá trị giờ OT: 4, 5, 6, 7, 7, 8, 9, 9, 10, 10. Tìm các tứ phân vị và giải thích ý nghĩa của Q1.
   - **Đáp án:** n = 10 chẵn; Q2 = (7 + 8)/2 = 7,5. Nửa dưới (4, 5, 6, 7, 7) → Q1 = 6. Nửa trên (8, 9, 9, 10, 10) → Q3 = 9. Ý nghĩa: khoảng 25% nhân viên làm thêm ≤ 6 giờ.
5. `[VD]` Bảng tần số giờ OT tháng 12 của 75 nhân viên nhà máy: 4 giờ có 4 người, 6 giờ có 12, 8 giờ có 35, 10 giờ có 18, 12 giờ có 6. (a) Xác định mốt và tính số trung bình. (b) Nên chọn mức nào làm chuẩn phụ cấp?
   - **Đáp án:** (a) Mức 8 giờ có tần số lớn nhất (35) nên Mo = 8 giờ. x̄ = (4·4 + 6·12 + 8·35 + 10·18 + 12·6)/75 = 620/75 ≈ 8,27 giờ. (b) Chọn 8 giờ vì mốt phản ánh số đông nhân viên và là mức tròn dễ chi trả; 8,27 không phải mức OT thực tế nào.
6. `[VD]` Một mẫu 8 số nguyên dương đã sắp xếp: 1, 3, 4, x, y, 9, 10, 12. Biết Q1 = 3,5; Q2 = 6,5; Q3 = 9,5. Tìm x và y.
   - **Đáp án:** Q1 = (3 + 4)/2 = 3,5 và Q3 = (9 + 10)/2 = 9,5 (khớp). Q2 = (x + y)/2 = 6,5 ⇔ x + y = 13. Vì dãy đã sắp xếp nên 4 ≤ x ≤ y ≤ 9. Các cặp thỏa mãn: (4; 9), (5; 8), (6; 7).

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Chưa sắp xếp mẫu số liệu đã vội lấy "số đứng giữa" hoặc chia nửa theo thứ tự xuất hiện.
- Khi n lẻ vẫn tính Q2 vào cả nửa dưới và nửa trên.
- Nhầm mốt (giá trị có tần số lớn nhất) với giá trị lớn nhất của mẫu.
- Cho rằng mẫu luôn có đúng một mốt (thực tế có thể nhiều mốt hoặc không có mốt).

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.

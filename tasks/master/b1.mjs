const L1 = {
  key: '10-12-88',
  grade: 10, week: 12, period: 88, lessonType: 'formation', timelineKey: 'gateD101288',
  title: 'Các số đặc trưng đo xu thế trung tâm — Tiết 2: Tứ phân vị và Mốt',
  date: '2026-11-04',
  goals: {
    must: 'Sắp xếp mẫu số liệu và tìm đúng Q1, Q2, Q3 cho mẫu cỡ nhỏ (n ≤ 11); nhận ra mốt là giá trị có tần số lớn nhất.',
    should: 'Xử lý trọn quy tắc cho cả n lẻ và n chẵn (không tính Q2 vào hai nửa khi n lẻ); giải thích ý nghĩa 25%–50%–75% gắn với dữ liệu giờ làm thêm.',
    could: 'Dùng tứ phân vị và mốt để ra quyết định chính sách (chọn mức OT đại diện); phản biện kết luận thống kê thiếu bước sắp xếp hoặc nhầm mốt với giá trị lớn nhất.',
  },
  axis: `**Tình huống: Công ty Alpha tổng kết tháng 12 và phải chọn "một con số đại diện" cho mức tăng ca (OT) để tính phụ cấp.**

Số giờ OT tháng 12 của **11 nhân viên dự án** (đơn vị: giờ):

\`12, 5, 20, 8, 15, 12, 0, 18, 12, 10, 16\`

Sắp xếp không giảm:

| Vị trí | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Giờ OT | 0 | 5 | 8 | 10 | 12 | 12 | 12 | 15 | 16 | 18 | 20 |

- **Kiểm chứng tay:** $n = 11$ (lẻ) → $Q_2 = x_6 = 12$. Nửa dưới (5 giá trị: 0, 5, 8, 10, 12) → $Q_1 = x_3 = 8$. Nửa trên (5 giá trị: 12, 15, 16, 18, 20) → $Q_3 = x_3 = 16$. Giá trị 12 xuất hiện 3 lần → $M_o = 12$ (giờ).
- **Đọc nghĩa:** 25% nhân viên làm thêm ≤ 8 giờ; 50% làm ≤ 12 giờ; 25% làm ≥ 16 giờ; mức phổ biến nhất là 12 giờ.
- **Mẫu thứ hai — nhóm thiết kế 8 người:** $5, 6, 6, 7, 8, 8, 9, 10$ → $n$ chẵn: $Q_2 = (7+8)/2 = 7{,}5$; $Q_1 = (6+6)/2 = 6$; $Q_3 = (8+9)/2 = 8{,}5$; hai giá trị 6 và 8 cùng có tần số 2 → mẫu có **hai mốt**.

**Bẫy của bài:** dãy OT ban đầu **chưa sắp xếp** — nếu lấy ngay "số thứ 6" hoặc chia nửa theo thứ tự xuất hiện thì tứ phân vị vô nghĩa (thậm chí $Q_1 = Q_3$).`,
  timeMap: [
    ['HĐ 1 Khởi động — công ty Alpha và câu hỏi "một con số đại diện"', 'P0–P5', 'S0 0–180 + S1 180–300'],
    ['HĐ 1.2 Xác định mục tiêu M/S/C', 'P5–P8', 'S2 300–480'],
    ['HĐ 2.1 Tứ phân vị Q1, Q2, Q3 (quy tắc, n lẻ / n chẵn)', 'P8–P16', 'S3 480–960'],
    ['HĐ 2.2 AI Error + chốt quy tắc', 'P16–P19', 'S4 960–1140 + S5 1140–1200'],
    ['HĐ 3 Luyện tập phân hoá 3 luồng (M/S/C)', 'P20–P27', 'S6 1200–1620'],
    ['HĐ 3.2 Post-check cá nhân & ĐGTX', 'P27–P30', 'S7 1620–1800'],
    ['HĐ 4 Kiểm tra nhanh', 'P30–P35', 'S8 1800–2100'],
    ['HĐ 4.2 Ứng dụng: chốt chính sách OT', 'P35–P38', 'S9 2100–2280'],
    ['HĐ 5 Exit Ticket & tổng kết', 'P38–P40', 'S10 2280–2400'],
  ],
  seg: [
    {
      s: 'S0', t: 'BẮT ĐẦU KHI SẴN SÀNG',
      md: `- **V1 (màn chiếu):** "Các số đặc trưng đo xu thế trung tâm · Tiết 2: Tứ phân vị và Mốt · Toán 10 · Tuần 12" + mã phòng + PIN.
- **Student:** nhập mã phòng, xem trước bảng giờ OT của 11 nhân viên công ty Alpha (dãy chưa sắp xếp).
- **Không khí:** GV nêu ngắn: "Hôm nay lớp mình giúp phòng nhân sự chọn một con số đại diện cho mức tăng ca."`,
    },
    {
      s: 'S1', t: 'KHỞI ĐỘNG — 11 nhân viên, một con số đại diện',
      md: `- **Tình huống:** Công ty Alpha có 11 nhân viên dự án với giờ OT: 12, 5, 20, 8, 15, 12, 0, 18, 12, 10, 16. Phòng nhân sự hỏi: "Một con số nào đại diện cho mức tăng ca chung?"
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Muốn biết "mức tăng ca mà nửa công ty làm ít hơn, nửa công ty làm nhiều hơn", em cần tìm gì?*
  - (A) Giá trị lớn nhất của dãy — 20 giờ.
  - (B) Trung vị (số đứng giữa sau khi sắp xếp) — 12 giờ.
  - (C) Tổng số giờ chia cho 11.
  - **Correct: (B).** Tổng/11 là trung bình (bị 20 giờ kéo lên); giá trị lớn nhất chỉ là một cá nhân.
- **Câu hỏi thảo luận tiếp:**
  1. \`[PHÁT HIỆN]\` Vì sao phải sắp xếp dãy trước khi tìm "số đứng giữa"?
  2. \`[SO SÁNH]\` Nếu một nhân viên làm 100 giờ OT, trung bình thay đổi thế nào so với trung vị?
- **TeacherCue (lớp yếu):** Viết lên góc bảng hai câu: "Trung bình = san đều tất cả"; "Trung vị = chia đôi sau khi xếp hàng". Nhắc: "Xếp hàng trước, đếm sau — chưa xếp hàng thì mọi con số đều vô nghĩa."
- **LookFor:** HS nhận ra cần sắp xếp trước khi xác định vị trí giữa; HS phân biệt trung bình với trung vị.`,
    },
    {
      s: 'S2', t: 'XÁC ĐỊNH MỤC TIÊU — M / S / C',
      md: `- **Must:** sắp xếp mẫu và tìm đúng $Q_1, Q_2, Q_3$ cho mẫu nhỏ; nhận ra mốt là giá trị có tần số lớn nhất.
- **Should:** xử lý trọn quy tắc cho $n$ lẻ và $n$ chẵn (không tính $Q_2$ vào hai nửa khi $n$ lẻ); giải thích ý nghĩa 25%–50%–75%.
- **Could:** dùng tứ phân vị/mốt để chốt chính sách OT; phản biện kết luận thiếu bước sắp xếp hoặc nhầm mốt với giá trị lớn nhất.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Bốn con số $Q_1, Q_2, Q_3, M_o$ kể được câu chuyện gì mà một con số trung bình không kể được?"`,
    },
    {
      s: 'S3', t: 'CÔNG CỤ TOÁN HỌC — Tứ phân vị và Mốt (làm mẫu trên dãy OT)',
      md: `- **Bước 1 — Sắp xếp (bắt buộc):** 0, 5, 8, 10, 12, 12, 12, 15, 16, 18, 20 ($n = 11$).
- **Bước 2 — $Q_2$ (trung vị toàn mẫu):** $n = 11$ lẻ → $Q_2 = x_6 = 12$ giờ.
- **Bước 3 — $Q_1$:** nửa dưới gồm 5 giá trị 0, 5, 8, 10, 12 → $Q_1 = x_3 = 8$ giờ.
- **Bước 4 — $Q_3$:** nửa trên gồm 5 giá trị 12, 15, 16, 18, 20 → $Q_3 = x_3 = 16$ giờ.
- **Trường hợp $n$ chẵn (nhóm thiết kế 8 người):** $5, 6, 6, 7, 8, 8, 9, 10$ → $Q_2 = (7+8)/2 = 7{,}5$; $Q_1 = (6+6)/2 = 6$; $Q_3 = (8+9)/2 = 8{,}5$.
- **Mốt:** đếm tần số: 12 xuất hiện 3 lần (nhiều nhất) → $M_o = 12$. Với nhóm thiết kế: 6 và 8 cùng 2 lần → hai mốt.
- **Câu hỏi dẫn (máy HS):**
  1. \`[SUY LUẬN]\` Vì sao $Q_1 \le Q_2 \le Q_3$ luôn đúng?
  2. \`[PHÁT HIỆN]\` Khi $n$ lẻ, vì sao không tính $Q_2$ vào cả hai nửa?
- **TeacherCue (lớp yếu):** Dán quy ước 3 dòng lên bảng: (1) xếp hàng; (2) lấy giữa làm $Q_2$; (3) bỏ $Q_2$ ra, chia hai nửa, lấy giữa mỗi nửa. Nhấn: "Bỏ $Q_2$ ra" là bước hay bị quên nhất.
- **Chốt:** "Tứ phân vị chia dãy đã xếp thành 4 phần, mỗi phần khoảng 25% số liệu; mốt là giá trị đông người chọn nhất."`,
    },
    {
      s: 'S4', t: 'PHÁT HIỆN LỖI SAI AI (AI Error of the Week)',
      md: `- **Lời giải AI (chiếu màn hình):** "Dãy OT: 12, 5, 20, 8, 15, 12, 0, 18, 12, 10, 16. $n = 11$ nên $Q_2$ là giá trị thứ 6 $= 12$. Nửa dưới lấy 5 giá trị đầu (12, 5, 20, 8, 15) cho $Q_1 = 12$. Nửa trên lấy 5 giá trị cuối (0, 18, 12, 10, 16) cho $Q_3 = 12$. Vậy $Q_1 = Q_2 = Q_3 = 12$ giờ."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI **không sắp xếp** dãy trước khi chia nửa → $Q_1 = Q_2 = Q_3$ (vô lý).
  2. Bằng chứng: dữ liệu có 0 giờ và 20 giờ nên $Q_1$ phải nhỏ hơn $Q_3$ rõ rệt.
  3. Sửa: $Q_1 = 8$, $Q_2 = 12$, $Q_3 = 16$.
- **TeacherCue:** Cho HS yếu đối chiếu hai bảng: bảng "theo thứ tự xuất hiện" và bảng "đã sắp xếp"; chỉ vào vị trí thứ 6 ở hai bảng để thấy khác nhau.
- **Câu hỏi chốt:** "Nếu AI nói ba tứ phân vị bằng nhau, em kiểm tra điều gì trước tiên?" → dãy đã sắp xếp chưa.`,
    },
    {
      s: 'S5', t: 'HƯỚNG DẪN PHÂN LUỒNG (M / S / C)',
      md: `- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "Xếp hàng trước, đếm vị trí giữa; đừng quên bỏ $Q_2$ khi chia hai nửa."
  - **S:** "Với $n$ chẵn, lấy trung bình cộng hai số giữa; kiểm tra lại $Q_1 \\le Q_2 \\le Q_3$."
  - **C:** "Mốt là tần số, không phải độ lớn; bài toán ngược hãy dùng $Q_2$ để lập phương trình."`,
    },
    {
      s: 'S6', t: 'NHIỆM VỤ CÓ LỰA CHỌN — 3 luồng đều có hint',
      md: `- **Luồng M (Must) — hint: xếp hàng, đếm giữa, bỏ $Q_2$ khi chia nửa:**
  1. Tìm $Q_1, Q_2, Q_3$ của mẫu đã sắp xếp $2, 4, 6, 8, 10, 12, 14$ → $Q_2 = 8$; $Q_1 = 4$; $Q_3 = 12$.
  2. Với 11 giá trị OT của công ty Alpha, mốt bằng bao nhiêu và nghĩa là gì? → $M_o = 12$ giờ (3/11 nhân viên), là mức tăng ca phổ biến nhất.
- **Luồng S (Should) — hint: kiểm tra $n$ lẻ/chẵn trước khi chọn công thức:**
  1. Phòng kế toán có 9 giá trị OT: 15, 4, 9, 18, 3, 7, 11, 14, 6. Tìm $Q_1, Q_2, Q_3$. → Xếp: 3, 4, 6, 7, 9, 11, 14, 15, 18; $Q_2 = 9$; $Q_1 = (4+6)/2 = 5$; $Q_3 = (14+15)/2 = 14{,}5$.
  2. 10 giá trị OT của phòng hỗ trợ: 4, 5, 6, 7, 7, 8, 9, 9, 10, 10. Tìm tứ phân vị và nêu nghĩa của $Q_1$. → $Q_2 = 7{,}5$; $Q_1 = 6$; $Q_3 = 9$; khoảng 25% nhân viên làm ≤ 6 giờ.
- **Luồng C (Could) — hint: mốt theo tần số; bài ngược dùng $Q_2$ lập phương trình:**
  1. Bảng tần số giờ OT của 75 nhân viên nhà máy: 4 giờ (4 người), 6 giờ (12), 8 giờ (35), 10 giờ (18), 12 giờ (6). Xác định mốt và tính trung bình; nên chọn mức nào làm chuẩn phụ cấp? → $M_o = 8$ giờ (35 người); $\\bar{x} = 620/75 \\approx 8{,}27$; chọn 8 giờ vì mốt phản ánh số đông và là mức "tròn" dễ chi trả.
  2. Mẫu 8 số nguyên dương đã xếp: $1, 3, 4, x, y, 9, 10, 12$ với $Q_1 = 3{,}5$; $Q_2 = 6{,}5$; $Q_3 = 9{,}5$. Tìm $x, y$. → $Q_2 = (x+y)/2 = 6{,}5 \\Rightarrow x+y = 13$; $4 \\le x \\le y \\le 9$ → $(4;9), (5;8), (6;7)$.
- **LookFor:** HS M làm đúng quy trình; HS S kiểm tra $n$ trước; HS C giải thích được vì sao mốt phù hợp hơn trung bình khi ra quyết định.`,
    },
    {
      s: 'S7', t: 'POST-CHECK CÁ NHÂN & ĐÁNH GIÁ THƯỜNG XUYÊN',
      md: `- **ĐGTX (máy HS):** Cho 7 giá trị OT đã sắp xếp: 2, 5, 5, 8, 10, 10, 14. Tính $Q_1, Q_2, Q_3$ và mốt. → $Q_2 = 8$; $Q_1 = 5$; $Q_3 = 10$; mốt là 5 và 10 (cùng 2 lần).
- **Câu hỏi bảng con (Đúng/Sai):**
  - (a) "Mốt là giá trị lớn nhất của mẫu" → **Sai** (mốt là tần số lớn nhất).
  - (b) "Khi $n$ lẻ, $Q_2$ không được tính vào nửa dưới và nửa trên" → **Đúng**.
  - (c) "Có thể tìm tứ phân vị mà không cần sắp xếp mẫu" → **Sai**.
- **TeacherCue:** Thu 3 phiếu bất kỳ, chiếu lên và cùng sửa theo 3 dòng quy ước ở S3.`,
    },
    {
      s: 'S8', t: 'KIỂM TRA NHANH (QUICK-CHECK)',
      md: `- **Câu 1:** Bạn Bình lấy ngay giá trị thứ 6 của dãy OT (chưa sắp xếp) làm $Q_2 = 12$, rồi lấy 5 giá trị đầu (12, 5, 20, 8, 15) tính $Q_1 = 12$. Kết quả $Q_1 = Q_2$ sai ở đâu? → Bỏ bước sắp xếp; đúng phải là $Q_1 = 8$, $Q_2 = 12$.
- **Câu 2:** Một mẫu 5 giá trị 12, 14, 15, 18, 20. Có bạn nói $M_o = 20$ vì lớn nhất. Đúng hay sai? → Sai; mỗi giá trị xuất hiện 1 lần nên mẫu **không có mốt**.
- **Chốt nhanh:** 3 dòng quy ước + "mốt là tần số".`,
    },
    {
      s: 'S9', t: 'ỨNG DỤNG THỰC TẾ — Chốt chính sách OT của công ty Alpha',
      md: `- **Bối cảnh:** Phòng nhân sự cần chọn 1 mức OT chuẩn để tính phụ cấp tháng sau.
- **Ba phương án và căn cứ:**
  - Chọn theo **trung bình**: tổng OT = 0+5+8+10+12+12+12+15+16+18+20 = 128 → $\\bar{x} = 128/11 \\approx 11{,}64$ giờ (bị hai giá trị 0 và 5 giờ kéo xuống).
  - Chọn theo **trung vị**: $Q_2 = 12$ giờ — một nửa nhân viên làm ít hơn hoặc bằng mức này.
  - Chọn theo **mốt**: $M_o = 12$ giờ — mức đông người làm nhất (3/11).
- **Kết luận có căn cứ:** chọn 12 giờ vì vừa là trung vị vừa là mốt; trung bình 11,64 giờ thấp hơn và không đại diện cho nhóm làm nhiều.
- **TeacherCue:** Nhấn "hai con số khác nhau kể hai câu chuyện khác nhau" — không có con số nào 'đúng' tuyệt đối, chỉ có con số phù hợp mục đích.`,
    },
    {
      s: 'S10', t: 'TỔNG KẾT & THẺ THOÁT HIỂM (EXIT TICKET)',
      md: `- **Exit Ticket (4 mục):**
  1. Nêu 3 bước tìm tứ phân vị của mẫu không ghép nhóm.
  2. Nêu 1 bẫy (chưa sắp xếp / tính $Q_2$ vào hai nửa / nhầm mốt với giá trị lớn nhất).
  3. Tự đánh giá mức đạt (Must / Should / Could).
  4. **Chốt ngữ cảnh:** Với 11 nhân viên công ty Alpha, $Q_1$, $Q_2$, $Q_3$, $M_o$ bằng bao nhiêu? → $8$; $12$; $16$; $12$ giờ.
- **TeacherCue (lớp yếu):** Gợi ý mở lại 3 dòng quy ước ở S3 trước khi viết.`,
    },
  ],
  after: `- HS hoàn thành bài tập SGK về tứ phân vị, mốt; chuẩn bị tiết Luyện tập (Tuần 12) với mẫu số liệu ghép nhóm.`,
  snapshot: {
    focus: 'Hình thành thuật toán xác định Tứ phân vị (Q1, Q2, Q3) và Mốt (Mo) của mẫu số liệu không ghép nhóm trên trục thực nghiệm giờ làm thêm OT tháng 12 của 11 nhân viên công ty Alpha (Q1 = 8, Q2 = 12, Q3 = 16, Mo = 12); hiểu bản chất phân vị 25%–50%–75%; nhận diện bẫy chưa sắp xếp dãy số và bẫy n lẻ / n chẵn',
    formulas: [
      'Q_2 = M_e \\quad (\\text{trung vị của toàn bộ mẫu sau khi sắp xếp})',
      'Q_1 = \\text{trung vị của nửa dưới}; \\quad Q_3 = \\text{trung vị của nửa trên}',
      'n \\text{ lẻ}: \\text{bỏ } Q_2 \\text{ khi chia hai nửa}; \\quad n \\text{ chẵn}: \\text{chia đôi chính giữa}',
      'M_o = \\text{giá trị có tần số lớn nhất (có thể có nhiều mốt hoặc không có mốt)}',
    ],
    examples: [
      {
        question: 'Công ty Alpha có 11 nhân viên dự án với số giờ tăng ca (OT) tháng 12: 12, 5, 20, 8, 15, 12, 0, 18, 12, 10, 16. Tìm các tứ phân vị Q1, Q2, Q3 và mốt Mo của mẫu số liệu.',
        solution: 'Sắp xếp không giảm: 0, 5, 8, 10, 12, 12, 12, 15, 16, 18, 20. n = 11 (lẻ) nên Q2 = x₆ = 12. Nửa dưới (5 giá trị: 0, 5, 8, 10, 12) → Q1 = 8. Nửa trên (5 giá trị: 12, 15, 16, 18, 20) → Q3 = 16. Giá trị 12 xuất hiện 3 lần (nhiều nhất) nên Mo = 12 giờ. Ý nghĩa: 25% nhân viên làm thêm ≤ 8 giờ; 25% làm ≥ 16 giờ; mức phổ biến nhất là 12 giờ.',
      },
      {
        question: 'Nhóm thiết kế của công ty Alpha có 8 người với số giờ OT: 5, 6, 6, 7, 8, 8, 9, 10. Tìm các tứ phân vị và mốt. Mẫu này khác mẫu 11 người ở điểm nào?',
        solution: 'Dãy đã sắp xếp, n = 8 (chẵn) nên Q2 = (x₄ + x₅)/2 = (7 + 8)/2 = 7,5. Nửa dưới (5, 6, 6, 7) → Q1 = (6 + 6)/2 = 6. Nửa trên (8, 8, 9, 10) → Q3 = (8 + 9)/2 = 8,5. Hai giá trị 6 và 8 cùng xuất hiện 2 lần nên mẫu có hai mốt: Mo = 6 và Mo = 8. Khác biệt: n chẵn phải lấy trung bình hai số giữa, và mẫu có thể có nhiều mốt.',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Tìm các tứ phân vị Q1, Q2, Q3 của mẫu đã sắp xếp: 2, 4, 6, 8, 10, 12, 14.', answer: 'n = 7 lẻ; Q2 = x₄ = 8. Nửa dưới (2, 4, 6) → Q1 = 4. Nửa trên (10, 12, 14) → Q3 = 12.' },
      { level: 'NB', question: 'Với 11 giá trị giờ OT của công ty Alpha (0, 5, 8, 10, 12, 12, 12, 15, 16, 18, 20), xác định mốt Mo và nêu ý nghĩa.', answer: 'Giá trị 12 xuất hiện 3 lần (nhiều nhất) nên Mo = 12 giờ — đây là mức tăng ca phổ biến nhất (3/11 nhân viên).' },
      { level: 'TH', question: 'Phòng kế toán công ty Alpha có 9 giá trị giờ OT: 15, 4, 9, 18, 3, 7, 11, 14, 6. Tìm Q1, Q2, Q3.', answer: 'Sắp xếp: 3, 4, 6, 7, 9, 11, 14, 15, 18. n = 9 lẻ; Q2 = 9. Nửa dưới (3, 4, 6, 7) → Q1 = (4 + 6)/2 = 5. Nửa trên (11, 14, 15, 18) → Q3 = (14 + 15)/2 = 14,5.' },
      { level: 'TH', question: 'Phòng hỗ trợ có 10 giá trị giờ OT: 4, 5, 6, 7, 7, 8, 9, 9, 10, 10. Tìm các tứ phân vị và giải thích ý nghĩa của Q1.', answer: 'n = 10 chẵn; Q2 = (7 + 8)/2 = 7,5. Nửa dưới (4, 5, 6, 7, 7) → Q1 = 6. Nửa trên (8, 9, 9, 10, 10) → Q3 = 9. Ý nghĩa: khoảng 25% nhân viên làm thêm ≤ 6 giờ.' },
      { level: 'VD', question: 'Bảng tần số giờ OT tháng 12 của 75 nhân viên nhà máy: 4 giờ có 4 người, 6 giờ có 12, 8 giờ có 35, 10 giờ có 18, 12 giờ có 6. (a) Xác định mốt và tính số trung bình. (b) Nên chọn mức nào làm chuẩn phụ cấp?', answer: '(a) Mức 8 giờ có tần số lớn nhất (35) nên Mo = 8 giờ. x̄ = (4·4 + 6·12 + 8·35 + 10·18 + 12·6)/75 = 620/75 ≈ 8,27 giờ. (b) Chọn 8 giờ vì mốt phản ánh số đông nhân viên và là mức tròn dễ chi trả; 8,27 không phải mức OT thực tế nào.' },
      { level: 'VD', question: 'Một mẫu 8 số nguyên dương đã sắp xếp: 1, 3, 4, x, y, 9, 10, 12. Biết Q1 = 3,5; Q2 = 6,5; Q3 = 9,5. Tìm x và y.', answer: 'Q1 = (3 + 4)/2 = 3,5 và Q3 = (9 + 10)/2 = 9,5 (khớp). Q2 = (x + y)/2 = 6,5 ⇔ x + y = 13. Vì dãy đã sắp xếp nên 4 ≤ x ≤ y ≤ 9. Các cặp thỏa mãn: (4; 9), (5; 8), (6; 7).' },
    ],
    quick: [
      { question: 'Bạn Bình lấy ngay giá trị thứ 6 của dãy OT (chưa sắp xếp) làm Q2 = 12, rồi lấy 5 giá trị đầu (12, 5, 20, 8, 15) để tính Q1 = 12. Kết quả Q1 = Q2 sai ở đâu?', solution: 'Bỏ bước sắp xếp dãy. Phải sắp xếp: 0, 5, 8, 10, 12, 12, 12, 15, 16, 18, 20 rồi mới chia nửa: Q1 = 8, Q2 = 12, Q3 = 16.' },
      { question: 'Một mẫu gồm 5 giá trị: 12, 14, 15, 18, 20. Có bạn nói mốt Mo = 20 vì là số lớn nhất. Đúng hay sai?', solution: 'Sai. Mốt là giá trị có tần số xuất hiện nhiều nhất, không phải giá trị lớn nhất. Mỗi số xuất hiện 1 lần nên mẫu không có mốt.' },
    ],
    mistakes: [
      'Chưa sắp xếp mẫu số liệu đã vội lấy "số đứng giữa" hoặc chia nửa theo thứ tự xuất hiện.',
      'Khi n lẻ vẫn tính Q2 vào cả nửa dưới và nửa trên.',
      'Nhầm mốt (giá trị có tần số lớn nhất) với giá trị lớn nhất của mẫu.',
      'Cho rằng mẫu luôn có đúng một mốt (thực tế có thể nhiều mốt hoặc không có mốt).',
    ],
    boardKnowledge: [
      'II. NỘI DUNG',
      '1. Tứ phân vị (Q1, Q2, Q3)',
      'a. Ý nghĩa: chia mẫu ĐÃ SẮP XẾP thành 4 phần, mỗi phần khoảng 25% số liệu.',
      'b. Quy tắc 3 bước: (1) sắp xếp không giảm; (2) Q2 = trung vị toàn mẫu; (3) Q1 = trung vị nửa dưới, Q3 = trung vị nửa trên (bỏ Q2 khi n lẻ).',
      'c. n chẵn: lấy trung bình cộng hai giá trị giữa của nửa tương ứng.',
      '2. Mốt (Mo)',
      'a. Định nghĩa: giá trị có tần số xuất hiện lớn nhất.',
      'b. Phù hợp cho dữ liệu định danh và quyết định sản xuất/tiêu dùng (cỡ giày, mức OT phổ biến).',
      'c. Mẫu có thể có 1 mốt, nhiều mốt hoặc không có mốt.',
      '3. Dữ liệu thực nghiệm — 11 nhân viên công ty Alpha',
      'a. Dãy OT: 0, 5, 8, 10, 12, 12, 12, 15, 16, 18, 20 (n = 11).',
      'b. Q1 = 8; Q2 = 12; Q3 = 16; Mo = 12 giờ; tổng OT = 128 → x̄ ≈ 11,64 giờ.',
      'c. Nhóm thiết kế 8 người: 5, 6, 6, 7, 8, 8, 9, 10 → Q1 = 6; Q2 = 7,5; Q3 = 8,5; hai mốt 6 và 8.',
      '4. Chốt chính sách',
      'a. Trung bình bị giá trị ngoại lai kéo lệch; trung vị/mốt phản ánh số đông.',
      'b. Chọn mức 12 giờ vì vừa là trung vị vừa là mốt của mẫu 11 nhân viên.',
    ],
  },
  aiError: {
    category: 'Lỗi khái niệm',
    wrongSolution: 'AI giải: "Dãy giờ OT tháng 12 của 11 nhân viên: 12, 5, 20, 8, 15, 12, 0, 18, 12, 10, 16. Cỡ mẫu n = 11 nên Q2 là giá trị thứ 6 = 12. Nửa dưới gồm 5 giá trị đầu (12, 5, 20, 8, 15) cho Q1 = 12; nửa trên gồm 5 giá trị cuối (0, 18, 12, 10, 16) cho Q3 = 12. Vậy Q1 = Q2 = Q3 = 12 giờ."',
    correction: 'Phải sắp xếp toàn bộ mẫu trước: 0, 5, 8, 10, 12, 12, 12, 15, 16, 18, 20. Khi đó Q2 = 12 (x₆); nửa dưới 0, 5, 8, 10, 12 cho Q1 = 8; nửa trên 12, 15, 16, 18, 20 cho Q3 = 16. Ba tứ phân vị phải tăng dần Q1 < Q2 < Q3.',
    proof: 'Tứ phân vị chia trục số liệu ĐÃ SẮP XẾP thành 4 phần bằng nhau nên bắt buộc Q1 ≤ Q2 ≤ Q3, và Q1 < Q3 khi dữ liệu không hằng. AI ra Q1 = Q2 = Q3 = 12, mâu thuẫn với chính dữ liệu có 0 giờ và 20 giờ — bằng chứng cho thấy bước sắp xếp bị bỏ qua.',
    whyAiError: 'Mô hình lấy chỉ mục theo thứ tự xuất hiện trong văn bản thay vì thực hiện bước tiền xử lý sắp xếp số học — lỗi điển hình khi dữ liệu đầu vào chưa có thứ tự.',
    teacherPrompt: 'Em đồng ý hay phản đối lời giải của AI? Chỉ ra lỗ hổng lớn nhất và sửa lại bộ tứ phân vị cho đúng.',
    studentProduct: 'Thẻ Đ/S trên máy + ghi rõ bước sắp xếp bị thiếu và bộ đúng (Q1 = 8; Q2 = 12; Q3 = 16).',
    boardPrompt: 'AI tính Q1 = Q2 = Q3 = 12 giờ. Phát hiện bẫy gì?',
    libraryTitle: 'Lỗi AI tìm tứ phân vị khi chưa sắp xếp dãy số liệu',
  },
};

const L2 = {
  key: '11-12-82',
  grade: 11, week: 12, period: 82, lessonType: 'formation', timelineKey: 'gateD111282',
  title: 'Các số đặc trưng đo xu thế trung tâm — Tiết 2: Tứ phân vị và Mốt của mẫu ghép nhóm',
  date: '2026-11-04',
  goals: {
    must: 'Xác định đúng nhóm chứa Q1, Q3 và nhóm chứa mốt từ bảng tần số ghép nhóm; áp dụng công thức nội suy với C = tần số tích lũy nhóm trước.',
    should: 'Tính trọn bộ Q1, Q3, Mo cho bảng 4 nhóm (n = 40) và giải thích ý nghĩa 25%–75%; đọc được bảng tần số tích lũy.',
    could: 'Nhận xét phân bố (đối xứng/lệch) từ khoảng tứ phân vị; giải bài toán ngược tìm tần số khi biết mốt; phản biện lỗi bỏ C.',
  },
  axis: `**Tình huống: Khảo sát thời gian dùng Internet trong ngày cuối tuần của 40 học sinh khối 11 trường Dewey.**

| Nhóm thời gian (giờ) | $[0;2)$ | $[2;4)$ | $[4;6)$ | $[6;8)$ |
|---|:---:|:---:|:---:|:---:|
| Số học sinh | 6 | 14 | 15 | 5 |
| Tần số tích lũy $cf$ | 6 | 20 | 35 | 40 |

- **Kiểm chứng tay:** $n = 40$; $n/4 = 10$ → nhóm đầu tiên có $cf \\ge 10$ là $[2;4)$ với $C = 6$, $m = 14$, $h = 2$: $Q_1 = 2 + \\dfrac{10-6}{14}\\cdot 2 \\approx 2{,}57$ giờ.
- $3n/4 = 30$ → nhóm $[4;6)$ với $C = 20$, $m = 15$, $h = 2$: $Q_3 = 4 + \\dfrac{30-20}{15}\\cdot 2 \\approx 5{,}33$ giờ.
- Trung vị: $n/2 = 20$ → $cf$ nhóm $[2;4)$ đúng bằng 20 nên $Q_2 = 4$ giờ (biên trên nhóm 2).
- Mốt: nhóm $[4;6)$ có $m = 15$ lớn nhất, $m_{trước} = 14$, $m_{sau} = 5$: $M_o = 4 + \\dfrac{15-14}{(15-14)+(15-5)}\\cdot 2 \\approx 4{,}18$ giờ.
- **Đọc nghĩa:** 25% HS dùng dưới 2,57 giờ; 25% dùng trên 5,33 giờ; mức phổ biến nhất khoảng 4,18 giờ/ngày cuối tuần.
- **Bẫy của bài:** quên trừ $C$ (lấy $C = 0$) → $Q_1$ bị đẩy lên 3,43 giờ; nhầm nhóm chứa mốt với nhóm đầu; nhầm $m_j$ với $h$.`,
  timeMap: [
    ['HĐ 1 Khởi động — khảo sát 40 HS dùng Internet cuối tuần', 'P0–P7', 'S0 0–180 + S1 180–420'],
    ['HĐ 1.2 Mục tiêu M/S/C', 'P7–P9', 'S2 420–540'],
    ['HĐ 2.1 Công thức nội suy Q1, Q3 và mốt', 'P9–P14', 'S3 540–840'],
    ['HĐ 2.2 AI Error + chốt quy tắc', 'P14–P17', 'S4 840–1020 + S5 1020–1080'],
    ['HĐ 3 Luyện tập phân hoá 3 luồng', 'P18–P26', 'S6 1080–1560'],
    ['HĐ 3.2 Post-check & ĐGTX', 'P26–P29', 'S7 1560–1740'],
    ['HĐ 4 Kiểm tra nhanh', 'P29–P34', 'S8 1740–2040'],
    ['HĐ 4.2 Ứng dụng: tư vấn cho phụ huynh', 'P34–P37', 'S9 2040–2220'],
    ['HĐ 5 Exit Ticket & tổng kết', 'P37–P40', 'S10 2220–2400'],
  ],
  seg: [
    {
      s: 'S0', t: 'BẮT ĐẦU KHI SẴN SÀNG',
      md: `- **V1 (màn chiếu):** "Tứ phân vị và Mốt của mẫu số liệu ghép nhóm · Toán 11 · Tuần 12" + mã phòng + PIN.
- **Student:** nhập mã phòng; xem trước bảng 4 nhóm thời gian dùng Internet của 40 HS khối 11.
- **GV nêu ngắn:** "Bảng chỉ cho ta số đông rơi vào khoảng nào — làm sao rút ra một con số cụ thể để tư vấn?"`,
    },
    {
      s: 'S1', t: 'KHỞI ĐỘNG — 40 học sinh, bảng 4 nhóm',
      md: `- **Tình huống:** Khảo sát 40 HS khối 11: $[0;2)$: 6 em; $[2;4)$: 14 em; $[4;6)$: 15 em; $[6;8)$: 5 em. Phụ huynh hỏi: "Con tôi dùng 3 giờ/ngày cuối tuần thì thuộc nhóm nào của trường?"
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Muốn biết "25% học sinh dùng ít nhất là dưới bao nhiêu giờ", em cần tính gì?*
  - (A) Số trung bình cộng các giá trị đại diện.
  - (B) Tứ phân vị thứ nhất $Q_1$ bằng công thức nội suy trong nhóm chứa $n/4$.
  - (C) Tổng số học sinh chia cho 4.
  - **Correct: (B).** (C) chỉ cho 10 em — một tần số, không phải một mốc thời gian.
- **Câu hỏi thảo luận tiếp:**
  1. \`[PHÁT HIỆN]\` Vì sao phải lập bảng tần số tích lũy trước khi tìm nhóm chứa $Q_1$?
  2. \`[SO SÁNH]\` Giá trị đại diện của nhóm $[2;4)$ là 3 — dùng ngay 3 giờ làm $Q_1$ có ổn không?
- **TeacherCue (lớp yếu):** Vẽ trục 0–8 chia 4 đoạn và tô 6–14–15–5 ô vuông; chỉ "đếm đến ô thứ 10" để thấy $Q_1$ nằm trong đoạn 2–4.
- **LookFor:** HS nêu được ý tưởng "đếm dồn" (tích lũy) thay vì lấy đại diện nhóm.`,
    },
    {
      s: 'S2', t: 'XÁC ĐỊNH MỤC TIÊU — M / S / C',
      md: `- **Must:** xác định đúng nhóm chứa $Q_1$, $Q_3$, mốt; áp dụng công thức với $C$ là tần số tích lũy nhóm trước.
- **Should:** tính trọn bộ cho bảng 40 HS và giải thích ý nghĩa 25%–75%.
- **Could:** nhận xét phân bố từ khoảng tứ phân vị; giải bài toán ngược tìm tần số khi biết mốt; phản biện lỗi lấy $C = 0$.
- **Student:** chọn mức cam kết trên máy.
- **Câu hỏi trọng tâm:** "Vì sao công thức tứ phân vị ghép nhóm phải trừ tần số tích lũy của các nhóm phía trước?"`,
    },
    {
      s: 'S3', t: 'CÔNG CỤ TOÁN HỌC — Nội suy tuyến tính trong nhóm chứa',
      md: `- **Bảng tần số tích lũy:** 6 | 20 | 35 | 40.
- **$Q_1$:** $n/4 = 10$; nhóm đầu tiên có $cf \\ge 10$ là $[2;4)$ ($a_p = 2$, $h = 2$, $m_p = 14$, $C = 6$):
  $$Q_1 = a_p + \\frac{n/4 - C}{m_p}\\cdot h = 2 + \\frac{10-6}{14}\\cdot 2 \\approx 2{,}57 \\text{ giờ}.$$
- **$Q_3$:** $3n/4 = 30$; nhóm $[4;6)$ ($a_k = 4$, $h = 2$, $m_k = 15$, $C = 20$):
  $$Q_3 = 4 + \\frac{30-20}{15}\\cdot 2 \\approx 5{,}33 \\text{ giờ}.$$
- **Mốt:** nhóm $[4;6)$ có $m_j = 15$ lớn nhất; $m_{j-1} = 14$, $m_{j+1} = 5$:
  $$M_o = 4 + \\frac{15-14}{(15-14)+(15-5)}\\cdot 2 \\approx 4{,}18 \\text{ giờ}.$$
- **Câu hỏi dẫn:**
  1. \`[SUY LUẬN]\` Tử số $n/4 - C$ đếm cái gì? → số học sinh còn phải đếm thêm trong nhóm chứa.
  2. \`[PHÁT HIỆN]\` Khi nào $M_o$ rơi đúng trung điểm nhóm? → khi $m_{j-1} = m_{j+1}$.
- **TeacherCue (lớp yếu):** Khung 3 ô: "nhóm chứa → $C$ → thay số". Nhắc: "$C$ là đã đếm được bao nhiêu em trước nhóm này".
- **Chốt:** "Nội suy = chia đều phần còn thiếu trong nhóm; mốt nghiêng về phía nhóm bên cạnh đông hơn."`,
    },
    {
      s: 'S4', t: 'PHÁT HIỆN LỖI SAI AI (AI Error of the Week)',
      md: `- **Lời giải AI (chiếu màn hình):** "Cỡ mẫu $n = 40$ nên $n/4 = 10$, rơi vào nhóm $[2;4)$. Áp dụng công thức: $Q_1 = 2 + \\dfrac{10-0}{14}\\cdot 2 = 2 + \\dfrac{20}{14} \\approx 3{,}43$ giờ."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI lấy $C = 0$ thay vì $C = cf_1 = 6$.
  2. Bằng chứng: nhóm $[0;2)$ đã có 6 em; để tìm em thứ 10 chỉ cần đếm thêm 4 em trong nhóm $[2;4)$, không phải 10 em.
  3. Sửa: $Q_1 = 2 + \\dfrac{4}{14}\\cdot 2 \\approx 2{,}57$ giờ.
- **TeacherCue:** Cho HS yếu đếm bằng tay trên 40 ô vuông: tô 6 ô nhóm 1, rồi đếm tiếp 4 ô trong nhóm 2 — thấy ngay vị trí $Q_1$ gần đầu nhóm.
- **Câu hỏi chốt:** "Nếu $Q_1$ tính ra lớn hơn cả $Q_2 = 4$ thì em nghi ngờ bước nào?" → bước $C$.`,
    },
    {
      s: 'S5', t: 'HƯỚNG DẪN PHÂN LUỒNG (M / S / C)',
      md: `- GV hướng dẫn chọn phiếu M / S / C, đọc hint trước khi làm.
- **Hint từng luồng:**
  - **M:** "Lập bảng $cf$ trước; nhóm chứa là nhóm đầu tiên có $cf \\ge n/4$."
  - **S:** "Nhớ $C$ = $cf$ nhóm ngay trước; kiểm tra $Q_1 < Q_2 < Q_3$."
  - **C:** "Bài ngược: viết $M_o$ theo $m_j$ rồi giải phương trình; nhớ điều kiện $m_j$ lớn nhất."`,
    },
    {
      s: 'S6', t: 'NHIỆM VỤ CÓ LỰA CHỌN — 3 luồng đều có hint',
      md: `- **Luồng M (Must) — hint: lập $cf$, tìm nhóm đầu tiên vượt mốc:**
  1. Bảng khảo sát 50 HS toàn trường có tần số 5, 12, 18, 15. Xác định nhóm chứa $Q_1$ và nhóm chứa mốt. → $cf$: 5, 17, 35, 50; $n/4 = 12{,}5$ → nhóm 2; mốt ở nhóm 3 ($m_3 = 18$).
  2. Nêu công thức mốt và nghĩa các ký hiệu. → $M_o = a_j + \\dfrac{m_j - m_{j-1}}{(m_j - m_{j-1}) + (m_j - m_{j+1})}\\cdot h$.
- **Luồng S (Should) — hint: kiểm tra lại $C$ và $h$ trước khi thay số:**
  1. 30 HS lớp 11A1 dùng Internet buổi tối: $[0;1)$: 4; $[1;2)$: 10; $[2;3)$: 12; $[3;4)$: 4. Tính $Q_1, Q_3$. → $cf$: 4, 14, 26, 30; $Q_1 = 1 + \\dfrac{7{,}5-4}{10} \\approx 1{,}35$; $Q_3 = 2 + \\dfrac{22{,}5-14}{12} \\approx 2{,}71$ giờ.
  2. 50 HS dùng Internet theo tuần (giờ): $[0;5)$: 8; $[5;10)$: 20; $[10;15)$: 16; $[15;20)$: 6. Tính mốt và nêu ý nghĩa. → $M_o = 5 + \\dfrac{20-8}{(20-8)+(20-16)}\\cdot 5 = 8{,}75$ giờ.
- **Luồng C (Could) — hint: so sánh hai nửa tứ phân vị; bài ngược lập phương trình:**
  1. Với bảng 40 HS ban đầu ($Q_1 \\approx 2{,}57$; $Q_2 = 4$; $Q_3 \\approx 5{,}33$), nhận xét phân bố. → $Q_2 - Q_1 = 1{,}43$; $Q_3 - Q_2 = 1{,}33$: hai nửa gần bằng nhau, phân bố hơi lệch phải; $M_e$ (4,0) gần $M_o$ (4,18).
  2. Bảng 4 nhóm $[0;2)$: 5; $[2;4)$: $x$; $[4;6)$: 8; $[6;8)$: 4 có mốt bằng 3,2. Tìm $x$. → $3{,}2 = 2 + \\dfrac{x-5}{(x-5)+(x-8)}\\cdot 2 \\Rightarrow \\dfrac{x-5}{2x-13} = 0{,}6 \\Rightarrow x = 14$ (thỏa $x > 8$).
- **LookFor:** HS M lập đúng $cf$; HS S kiểm tra $Q_1 < Q_2 < Q_3$; HS C giải thích được độ lệch phân bố.`,
    },
    {
      s: 'S7', t: 'POST-CHECK CÁ NHÂN & ĐÁNH GIÁ THƯỜNG XUYÊN',
      md: `- **ĐGTX (máy HS):** Bảng 20 HS: $[0;2)$: 4; $[2;4)$: 8; $[4;6)$: 6; $[6;8)$: 2. Tính $Q_1$ và mốt. → $n/4 = 5$ → nhóm $[2;4)$: $Q_1 = 2 + \\dfrac{5-4}{8}\\cdot 2 = 2{,}25$ giờ; mốt nhóm $[2;4)$: $M_o = 2 + \\dfrac{8-4}{(8-4)+(8-6)}\\cdot 2 \\approx 3{,}33$ giờ.
- **Câu hỏi bảng con (Đúng/Sai):**
  - (a) "Nhóm chứa mốt là nhóm đầu tiên của bảng" → **Sai** (nhóm có $m_j$ lớn nhất).
  - (b) "Khi tính $Q_1$ phải trừ tần số tích lũy nhóm trước" → **Đúng**.
  - (c) "Mốt luôn bằng trung điểm nhóm chứa mốt" → **Sai** (chỉ đúng khi $m_{j-1} = m_{j+1}$).
- **TeacherCue:** Chiếu 2 phiếu điển hình, sửa theo khung 3 ô ở S3.`,
    },
    {
      s: 'S8', t: 'KIỂM TRA NHANH (QUICK-CHECK)',
      md: `- **Câu 1:** Nếu lấy $C = 0$ thay vì $cf$ nhóm trước khi tính $Q_1$, kết quả lớn hơn hay nhỏ hơn thực tế? → Lớn hơn, vì tử số $n/4 - 0 > n/4 - C$.
- **Câu 2:** Có thể khẳng định mốt luôn bằng trung điểm nhóm chứa mốt? → Không; chỉ khi hai nhóm kề có tần số bằng nhau.
- **Chốt nhanh:** $C$ là "đã đếm được bao nhiêu"; mốt nghiêng về phía nhóm đông hơn.`,
    },
    {
      s: 'S9', t: 'ỨNG DỤNG THỰC TẾ — Tư vấn cho phụ huynh',
      md: `- **Bối cảnh:** Phụ huynh hỏi "con tôi dùng 4 giờ/ngày cuối tuần có bất thường không?".
- **Trả lời có căn cứ:** $Q_1 \\approx 2{,}57$; $Q_2 = 4$; $Q_3 \\approx 5{,}33$; $M_o \\approx 4{,}18$. Học sinh dùng 4 giờ nằm **đúng trung vị** — đại diện cho nửa lớp, không phải ngoại lệ.
- **Khuyến nghị phân tầng:** dưới 2,57 giờ (nhóm 25% thấp) — có thể tăng thêm hoạt động số; 2,57–5,33 giờ (50% giữa) — duy trì; trên 5,33 giờ (25% cao) — nên có quy định giới hạn.
- **TeacherCue:** Nhấn mạnh "dùng đúng số của mình để nói, không phán xét bằng cảm giác".`,
    },
    {
      s: 'S10', t: 'TỔNG KẾT & THẺ THOÁT HIỂM (EXIT TICKET)',
      md: `- **Exit Ticket (4 mục):**
  1. Nêu quy trình 3 bước tính $Q_1$ của mẫu ghép nhóm.
  2. Nêu 1 bẫy (quên $C$ / nhầm nhóm mốt / nhầm $m_j$ với $h$).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Với 40 HS khối 11, $Q_1$, $Q_3$, $M_o$ bằng bao nhiêu? → $\\approx 2{,}57$; $\\approx 5{,}33$; $\\approx 4{,}18$ giờ.
- **TeacherCue (lớp yếu):** Mở lại bảng $cf$ ở S3 và khung 3 ô trước khi viết.`,
    },
  ],
  after: `- HS làm bài tập SGK về tứ phân vị, mốt của mẫu ghép nhóm; chuẩn bị tiết luyện tập Tuần 12.`,
  snapshot: {
    focus: 'Hình thành công thức nội suy tuyến tính tìm Tứ phân vị Q1, Q3 và Mốt Mo của mẫu số liệu ghép nhóm trên trục khảo sát 40 học sinh khối 11 dùng Internet cuối tuần (Q1 ≈ 2,57; Q2 = 4; Q3 ≈ 5,33; Mo ≈ 4,18 giờ); hiểu bản chất phân vị 25%–75%; xác định đúng nhóm chứa và tần số tích lũy lân cận',
    formulas: [
      'Q_1 = a_p + \\dfrac{n/4 - C}{m_p}\\cdot h \\quad (C = \\text{tần số tích lũy nhóm trước})',
      'Q_3 = a_k + \\dfrac{3n/4 - C}{m_k}\\cdot h',
      'M_o = a_j + \\dfrac{m_j - m_{j-1}}{(m_j - m_{j-1}) + (m_j - m_{j+1})}\\cdot h \\quad (m_j = \\max m_i)',
    ],
    examples: [
      {
        question: 'Khảo sát thời gian dùng Internet trong ngày cuối tuần của 40 học sinh khối 11: [0;2) có 6 HS, [2;4) có 14 HS, [4;6) có 15 HS, [6;8) có 5 HS. Tìm Q1, Q3 và mốt Mo.',
        solution: 'Tần số tích lũy: cf₁ = 6, cf₂ = 20, cf₃ = 35, cf₄ = 40. n/4 = 10 → nhóm [2;4) với C = 6, m = 14, h = 2: Q1 = 2 + (10 − 6)/14 · 2 ≈ 2,57 giờ. 3n/4 = 30 → nhóm [4;6) với C = 20, m = 15: Q3 = 4 + (30 − 20)/15 · 2 ≈ 5,33 giờ. Nhóm chứa mốt là [4;6) (m = 15; trước 14; sau 5): Mo = 4 + (15 − 14)/((15 − 14) + (15 − 5)) · 2 ≈ 4,18 giờ.',
      },
      {
        question: 'Cũng với bảng 40 HS trên, hãy tìm trung vị Q2 và cho biết phân bố thời gian dùng Internet lệch về phía nào.',
        solution: 'n/2 = 20; tần số tích lũy của nhóm [2;4) đúng bằng 20 nên trung vị là biên trên nhóm đó: Q2 = 4 giờ. So sánh: Q2 − Q1 = 4 − 2,57 = 1,43; Q3 − Q2 = 5,33 − 4 = 1,33. Hai nửa gần bằng nhau (1,43 so với 1,33) nên phân bố gần đối xứng và hơi lệch phải; trung vị 4,0 gần mốt 4,18 — dữ liệu tập trung quanh 4 giờ/ngày.',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Bảng khảo sát 50 học sinh có tần số 4 nhóm lần lượt 5, 12, 18, 15. Xác định nhóm chứa tứ phân vị thứ nhất Q1 và nhóm chứa mốt.', answer: 'Tần số tích lũy: 5, 17, 35, 50. n/4 = 12,5 nên nhóm đầu tiên có cf ≥ 12,5 là nhóm thứ hai. Nhóm có tần số lớn nhất là nhóm thứ ba (18). Vậy Q1 thuộc nhóm 2, mốt thuộc nhóm 3.' },
      { level: 'NB', question: 'Nêu công thức tính mốt Mo của mẫu số liệu ghép nhóm và giải thích các ký hiệu.', answer: 'Mo = a_j + [(m_j − m_{j−1}) / ((m_j − m_{j−1}) + (m_j − m_{j+1}))] · h, trong đó [a_j; a_{j+1}) là nhóm chứa mốt, h là độ dài nhóm, m_j là tần số nhóm chứa mốt, m_{j−1} và m_{j+1} là tần số hai nhóm kề.' },
      { level: 'TH', question: '30 học sinh lớp 11A1 có thời gian dùng Internet buổi tối: [0;1) có 4; [1;2) có 10; [2;3) có 12; [3;4) có 4. Tính Q1 và Q3.', answer: 'Tần số tích lũy: 4, 14, 26, 30. n/4 = 7,5 → nhóm [1;2) với C = 4, m = 10, h = 1: Q1 = 1 + (7,5 − 4)/10 ≈ 1,35 giờ. 3n/4 = 22,5 → nhóm [2;3) với C = 14, m = 12: Q3 = 2 + (22,5 − 14)/12 ≈ 2,71 giờ.' },
      { level: 'TH', question: 'Khảo sát 50 học sinh về số giờ dùng Internet mỗi tuần: [0;5) có 8; [5;10) có 20; [10;15) có 16; [15;20) có 6. Tính mốt và nêu ý nghĩa.', answer: 'Nhóm chứa mốt là [5;10) với m = 20, trước 8, sau 16: Mo = 5 + (20 − 8)/((20 − 8) + (20 − 16)) · 5 = 5 + 12/16 · 5 = 8,75 giờ. Ý nghĩa: mức sử dụng phổ biến nhất của học sinh khoảng 8,75 giờ/tuần.' },
      { level: 'VD', question: 'Với bảng 40 học sinh khối 11 (Q1 ≈ 2,57; Q2 = 4; Q3 ≈ 5,33; Mo ≈ 4,18 giờ), hãy nhận xét mức độ phân bố và tính đối xứng của dữ liệu.', answer: 'Q2 − Q1 = 1,43 và Q3 − Q2 = 1,33 gần bằng nhau nên phân bố gần đối xứng, hơi lệch phải. Q2 = 4,0 gần Mo = 4,18 cho thấy dữ liệu tập trung quanh 4 giờ/ngày; khoảng tứ phân vị Q3 − Q1 ≈ 2,76 giờ bao trọn 50% học sinh ở giữa.' },
      { level: 'VD', question: 'Một bảng ghép nhóm có 4 nhóm: [0;2) tần số 5; [2;4) tần số x; [4;6) tần số 8; [6;8) tần số 4. Biết mốt của mẫu bằng 3,2 và thuộc nhóm [2;4). Tìm số nguyên x.', answer: 'Vì Mo = 3,2 ∈ [2;4) nên a = 2, h = 2, m = x (x > 8). Ta có 3,2 = 2 + (x − 5)/((x − 5) + (x − 8)) · 2 ⇔ 0,6 = (x − 5)/(2x − 13) ⇔ 0,6(2x − 13) = x − 5 ⇔ 1,2x − 7,8 = x − 5 ⇔ x = 14 (thỏa mãn x > 8).' },
    ],
    quick: [
      { question: 'Khi tính Q1 của mẫu ghép nhóm, bạn An lấy C = 0 thay vì tần số tích lũy nhóm trước. Kết quả của bạn An lớn hơn hay nhỏ hơn giá trị đúng?', solution: 'Lớn hơn. Vì n/4 − 0 > n/4 − C nên phân số lớn hơn, Q1 bị đẩy lệch lên (với bảng 40 HS: 3,43 giờ thay vì 2,57 giờ).' },
      { question: 'Có thể khẳng định mốt của mẫu ghép nhóm luôn bằng trung điểm nhóm chứa mốt hay không? Vì sao?', solution: 'Không. Mo chỉ rơi đúng trung điểm khi tần số hai nhóm kề bằng nhau (m_{j−1} = m_{j+1}); nếu lệch, mốt nghiêng về phía nhóm có tần số lớn hơn.' },
    ],
    mistakes: [
      'Quên trừ tần số tích lũy các nhóm trước (lấy C = 0) khi tính Q1 hoặc Q3.',
      'Nhầm nhóm chứa mốt là nhóm đầu tiên thay vì nhóm có tần số m_j lớn nhất.',
      'Nhầm tần số nhóm m_j với độ dài nhóm h trong mẫu số của công thức mốt.',
      'Dùng n/4 thay vì 3n/4 khi xác định nhóm chứa Q3.',
    ],
    boardKnowledge: [
      'II. NỘI DUNG',
      '1. Tứ phân vị của mẫu ghép nhóm',
      'a. Nhóm chứa Q1: nhóm đầu tiên có cf ≥ n/4; công thức Q1 = a_p + (n/4 − C)/m_p · h với C = cf_{p−1}.',
      'b. Nhóm chứa Q3: nhóm đầu tiên có cf ≥ 3n/4; công thức Q3 = a_k + (3n/4 − C)/m_k · h.',
      'c. Trung vị Q2: nhóm đầu tiên có cf ≥ n/2.',
      '2. Mốt của mẫu ghép nhóm',
      'a. Nhóm chứa mốt là nhóm có tần số lớn nhất.',
      'b. Mo = a_j + (m_j − m_{j−1})/((m_j − m_{j−1}) + (m_j − m_{j+1})) · h; Mo rơi đúng trung điểm khi hai tần số kề bằng nhau.',
      '3. Dữ liệu thực nghiệm — 40 HS khối 11 dùng Internet cuối tuần',
      'a. Tần số 6 | 14 | 15 | 5; cf 6 | 20 | 35 | 40.',
      'b. Q1 ≈ 2,57; Q2 = 4; Q3 ≈ 5,33; Mo ≈ 4,18 giờ.',
      '4. Chốt kỹ thuật',
      'a. Luôn lập bảng cf trước khi tìm nhóm chứa.',
      'b. C = "đã đếm được bao nhiêu" — bỏ C là lỗi phổ biến nhất của mẫu ghép nhóm.',
    ],
  },
  aiError: {
    category: 'Lỗi khái niệm',
    wrongSolution: 'AI giải: "Cho bảng ghép nhóm [0;2) tần số 6; [2;4) tần số 14; [4;6) tần số 15; [6;8) tần số 5 (n = 40). Cỡ mẫu n = 40 nên n/4 = 10, rơi vào nhóm [2;4). Áp dụng công thức: Q1 = 2 + ((10 − 0)/14)·2 = 2 + 20/14 ≈ 3,43 giờ."',
    correction: 'Công thức đúng phải trừ tần số tích lũy của nhóm trước: C = cf₁ = 6. Do đó Q1 = 2 + ((10 − 6)/14)·2 = 2 + 8/14 ≈ 2,57 giờ.',
    proof: 'Hết nhóm [0;2) đã có 6 học sinh. Để tìm học sinh thứ 10, trong nhóm [2;4) chỉ cần đếm thêm 10 − 6 = 4 học sinh. Lấy C = 0 tức là đếm thừa 6 học sinh của nhóm trước, đẩy Q1 lệch lên 3,43 giờ — vượt cả trung vị Q2 = 4 một cách bất thường.',
    whyAiError: 'Mô hình bỏ qua số hạng tích lũy khi thay số vào công thức nội suy, mặc định C = 0 — lỗi thường gặp khi mẫu số liệu đã được ghép nhóm.',
    teacherPrompt: 'Em nhận xét công thức AI dùng để tính Q1: giá trị C = 0 có đúng không? Hãy sửa lại cho chuẩn xác.',
    studentProduct: 'Thẻ Đ/S trên máy + nêu rõ C phải bằng 6 (tần số tích lũy nhóm [0;2)) và tính lại Q1 ≈ 2,57 giờ.',
    boardPrompt: 'AI tính Q1 = 3,43 giờ với C = 0. Phát hiện bẫy tính toán gì?',
    libraryTitle: 'Lỗi AI quên trừ tần số tích lũy nhóm trước khi tính tứ phân vị ghép nhóm',
  },
};

export default [L1, L2];

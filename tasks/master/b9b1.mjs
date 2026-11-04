const base = (key, period, lessonType = 'formation') => ({
  key, grade: 11, week: 12, period, lessonType, timelineKey: 'default',
  date: '2026-11-04',
  timeMap: [
    ['HĐ 1 Khởi động — tình huống trục thực nghiệm', 'P0–P3', 'S0 + S1'],
    ['HĐ 1.2 Mục tiêu M/S/C', 'P3–P5', 'S2'],
    ['HĐ 2.1 Hình thành kiến thức + làm mẫu', 'P5–P10', 'S3'],
    ['HĐ 2.2 AI Error + chốt quy tắc', 'P10–P13', 'S4 + S5'],
    ['HĐ 3 Luyện tập phân hoá 3 luồng', 'P14–P21', 'S6'],
    ['HĐ 3.2 Post-check & ĐGTX', 'P21–P24', 'S7'],
    ['HĐ 4 Kiểm tra nhanh', 'P24–P29', 'S8'],
    ['HĐ 4.2 Ứng dụng thực tế', 'P29–P37', 'S9'],
    ['HĐ 5 Exit Ticket & tổng kết', 'P37–P40', 'S10'],
  ],
});

// Bài 6: 11-12-83 — Các số đặc trưng đo xu thế trung tâm (Tiết 3: Luyện tập mẫu ghép nhóm)
const L83 = {
  ...base('11-12-83', 83, 'practice'),
  title: 'Các số đặc trưng đo xu thế trung tâm',
  goals: {
    must: 'Tính thành thạo số trung bình, trung vị, tứ phân vị và mốt của mẫu số liệu ghép nhóm.',
    should: 'Giải thích ý nghĩa từng số đo trong bài toán thực tế; so sánh hai nhóm dữ liệu.',
    could: 'Phân tích bảng ghép nhóm khi tần số tập trung ở các nhóm biên; phát hiện sai sót tính toán.',
  },
  opening: 'Khảo sát thời gian tự học của học sinh hai lớp 11A và 11B qua bảng ghép nhóm — hôm nay ta luyện tập so sánh toàn diện xu thế trung tâm của hai tập dữ liệu.',
  focusQuestion: 'Công thức trung vị ghép nhóm Me = u_m + [(n/2 - C)/m_m]·h có ý nghĩa hình học và nội suy như thế nào?',
  axis: `**Tình huống: Khảo sát thời gian sử dụng thư viện điện tử trong tuần (giờ) của 50 học sinh lớp 11:**
Bảng số liệu ghép nhóm:

| Nhóm thời gian (giờ) | Giá trị đại diện $c_i$ | Tần số $m_i$ | Tần số tích lũy $cf_i$ |
|---|:---:|:---:|:---:|
| $[0; 4)$ | $2$ | $8$ | $8$ |
| $[4; 8)$ | $6$ | $15$ | $23$ |
| $[8; 12)$ | $10$ | $18$ | $41$ |
| $[12; 16)$ | $14$ | $6$ | $47$ |
| $[16; 20)$ | $18$ | $3$ | $50$ |
| **Tổng** | — | **$n = 50$** | — |

- **Số trung bình:**
  $$\\bar x = \\dfrac{8\\cdot2 + 15\\cdot6 + 18\\cdot10 + 6\\cdot14 + 3\\cdot18}{50} = \\dfrac{16 + 90 + 180 + 84 + 54}{50} = \\dfrac{424}{50} = 8{,}48 \\text{ giờ}.$$
- **Trung vị $M_e$:**
  - $n/2 = 25$. Nhóm chứa trung vị là $[8; 12)$ (vì $cf_2 = 23 < 25 \\le cf_3 = 41$).
  - $u_m = 8, h = 4, m_m = 18, C = cf_2 = 23$.
  - $M_e = 8 + \\dfrac{25 - 23}{18} \\cdot 4 = 8 + \\dfrac{8}{18} \\approx 8{,}44$ giờ.
- **Mốt $M_o$:** Nhóm chứa mốt là $[8; 12)$ ($m_3 = 18$ lớn nhất).
  - $M_o = 8 + \\dfrac{18 - 15}{(18 - 15) + (18 - 6)} \\cdot 4 = 8 + \\dfrac{3}{3 + 12} \\cdot 4 = 8 + 0{,}8 = 8{,}8$ giờ.`,
  s1: {
    title: 'Xác định nhóm chứa trung vị',
    context: 'Bảng 50 học sinh có tần số tích lũy các nhóm lần lượt là: 8, 23, 41, 47, 50.',
    question: 'Với n/2 = 25, trung vị Me rơi vào nhóm nào?',
    options: ['Nhóm [4; 8) (tần số tích lũy 23)', 'Nhóm [8; 12) (tần số tích lũy 41)', 'Nhóm [12; 16) (tần số tích lũy 47)'],
    correct: 1,
    why: 'Vì cf_2 = 23 < 25 ≤ cf_3 = 41 nên giá trị thứ 25 nằm trong nhóm thứ ba [8; 12).',
    discuss: ['`[PHÁT HIỆN]` Vì sao nhóm có tần số lớn nhất chưa chắc đã là nhóm chứa trung vị?', '`[SO SÁNH]` Tứ phân vị Q1 sẽ rơi vào nhóm nào? (n/4 = 12,5)'],
    cue: 'Kẻ cột tần số tích lũy cf; so sánh n/2 với các giá trị cf_i.',
    lookFor: 'HS tìm đúng nhóm chứa trung vị theo tần số tích lũy.',
  },
  s3: {
    title: 'Hệ thống công thức xu thế trung tâm ghép nhóm',
    steps: [
      'Số trung bình: $\\bar x = \\dfrac{1}{n}\\sum m_i c_i$ ($c_i$ là trung điểm nhóm).',
      'Trung vị: $M_e = u_m + \\dfrac{n/2 - C}{m_m} \\cdot h$ ($C$ là tần số tích lũy nhóm trước).',
      'Tứ phân vị: $Q_1$ dùng $n/4$; $Q_3$ dùng $3n/4$ thay vào vị trí của $n/2$.',
      'Mốt: $M_o = u_{mo} + \\dfrac{m_{mo} - m_{mo-1}}{(m_{mo} - m_{mo-1}) + (m_{mo} - m_{mo+1})} \\cdot h$.',
    ],
    ask: ['`[SUY LUẬN]` Trong công thức mốt, nếu nhóm mốt là nhóm đầu tiên thì m_{mo-1} bằng bao nhiêu?', '`[PHÁT HIỆN]` Điều kiện để mẫu ghép nhóm có duy nhất một mốt?'],
    cue: 'Bảng tổng hợp 4 công thức với chú thích rõ các ký hiệu.',
    close: 'Tất cả các công thức nội suy đều dựa trên giả định dữ liệu phân bố đều trong từng nhóm.',
  },
  s4: {
    bat: 'AI giải: Khi tính mốt Mo nhóm [8; 12) có tần số 18, AI lấy luôn giá trị đại diện c = (8+12)/2 = 10 làm mốt.',
    chung: 'Giá trị đại diện 10 chỉ là trung điểm nhóm, không phản ánh sự chênh lệch tần số với hai nhóm kế cận.',
    sua: 'Phải dùng công thức nội suy mốt: Mo = 8 + [ (18-15) / ((18-15) + (18-6)) ] · 4 = 8,8 giờ.',
    cue: 'Nhắc lại: giá trị đại diện dùng cho số trung bình; mốt ghép nhóm phải dùng công thức nội suy.',
    lookFor: 'HS phân biệt trung điểm nhóm và mốt ghép nhóm.',
  },
  s6: {
    hints: {
      M: 'lập cột trung điểm c_i và cột tần số tích lũy cf_i trước khi áp dụng công thức.',
      S: 'xác định đúng n/2 cho Me, n/4 cho Q1, 3n/4 cho Q3; lấy đúng C của nhóm trước đó.',
      C: 'so sánh hai phân bố và giải thích vì sao trung bình và mốt có thể lệch nhau.',
    },
    lookFor: 'HS M tính đúng số trung bình; HS S tính đúng Me và Mo; HS C so sánh chính xác.',
  },
  postCheck: {
    q: 'Cho nhóm chứa trung vị là $[20; 30)$, $n = 40$, tần số nhóm trước $C = 15$, tần số nhóm trung vị $m_m = 10$. Tính $M_e$.',
    a: '$u_m = 20, h = 10$. $M_e = 20 + \\dfrac{20 - 15}{10} \\cdot 10 = 20 + 5 = 25$.',
    ds: [
      { t: '\"Trung vị mẫu ghép nhóm luôn bằng giá trị đại diện của nhóm chứa nó\"', v: 'Sai — phải nội suy theo công thức' },
      { t: '\"C trong công thức trung vị là tần số tích lũy của nhóm trước nhóm trung vị\"', v: 'Đúng' },
      { t: '\"Nhóm chứa mốt là nhóm có tần số lớn nhất\"', v: 'Đúng' },
    ],
    cue: 'Đổi phiếu chấm chéo, chú ý rút gọn phân số (20-15)/10 · 10 = 5.',
  },
  s8Close: 'Lập bảng cf; n/2 -> nhóm Me; max mi -> nhóm Mo; áp đúng công thức nội suy h.',
  s9: {
    title: 'Phân tích dữ liệu dân số và thu nhập quốc gia',
    bullets: [
      'Tổng cục Thống kê luôn công bố số liệu thu nhập và độ tuổi dưới dạng ghép nhóm.',
      'Thu nhập trung vị phản ánh chính xác mức sống của tầng lớp trung lưu hơn thu nhập bình quân.',
      'Các chính sách an sinh xã hội dựa trên tứ phân vị Q1 (ngưỡng 25% thu nhập thấp nhất).',
    ],
    cue: 'Hỏi: \"Tại sao thống kê dân số hàng triệu người bắt buộc phải dùng số liệu ghép nhóm?\"',
  },
  exit: [
    'Nêu công thức tính trung vị và tứ phân vị thứ nhất Q1 của mẫu ghép nhóm.',
    'Nêu 1 bẫy (lấy nhầm C là tần số tích lũy của chính nhóm chứa trung vị).',
    'Tự đánh giá M / S / C.',
    'Nếu n = 100 thì để tìm Q3 ta căn cứ vào giá trị nào của tần số tích lũy?',
  ],
  exitCue: 'Nhìn lại bảng tần số tích lũy ở trục thực nghiệm.',
  after: '- HS hoàn thành bài tập tổng hợp về mẫu số liệu ghép nhóm; chuẩn bị chuyển sang chương Giới hạn dãy số.',
  snapshot: {
    focus: 'Luyện tập kỹ năng tính số trung bình, trung vị, tứ phân vị và mốt của mẫu số liệu ghép nhóm; hiểu ý nghĩa thực tế và phân biệt các bẫy công thức nội suy.',
    formulas: [
      '\\bar x = \\dfrac{1}{n}\\sum m_i c_i',
      'M_e = u_m + \\dfrac{\\frac{n}{2} - C}{m_m} \\cdot h',
      'Q_1 = u_{q1} + \\dfrac{\\frac{n}{4} - C_{q1}}{m_{q1}} \\cdot h; \\quad Q_3 = u_{q3} + \\dfrac{\\frac{3n}{4} - C_{q3}}{m_{q3}} \\cdot h',
      'M_o = u_{mo} + \\dfrac{m_{mo} - m_{mo-1}}{(m_{mo} - m_{mo-1}) + (m_{mo} - m_{mo+1})} \\cdot h',
    ],
    boardKnowledge: [
      'I. Bảng phụ trợ: Giá trị đại diện c_i = (a_i + a_{i+1})/2; Tần số tích lũy cf_i.',
      'II. Xác định nhóm: n/2 cho Me, n/4 cho Q1, 3n/4 cho Q3; tần số lớn nhất cho Mo.',
      'III. Công thức nội suy: Chú ý C là tần số tích lũy của nhóm ĐỨNG TRƯỚC.',
    ],
    examples: [
      {
        question: 'Cho mẫu ghép nhóm: [10; 20) có m1 = 5; [20; 30) có m2 = 15; [30; 40) có m3 = 10. Tính số trung bình.',
        solution: 'c1 = 15, c2 = 25, c3 = 35. n = 30. x̄ = (5·15 + 15·25 + 10·35)/30 = (75 + 375 + 350)/30 = 800/30 ≈ 26,67.',
      },
      {
        question: 'Với bảng trên, tìm nhóm chứa trung vị và tính trung vị Me.',
        solution: 'n/2 = 15. cf1 = 5 < 15 ≤ cf2 = 20 -> nhóm chứa trung vị là [20; 30). u_m = 20, h = 10, m_m = 15, C = cf1 = 5. Me = 20 + [(15 - 5)/15] · 10 = 20 + 20/3 ≈ 26,67.',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Cho nhóm [40; 60) có tần số 12. Xác định độ dài nhóm h và giá trị đại diện c.', answer: 'h = 60 - 40 = 20; c = (40 + 60)/2 = 50.' },
      { level: 'NB', question: 'Mẫu có n = 80. Khi tìm Q1 và Q3 ta căn cứ vào các giá trị nào của tần số tích lũy?', answer: 'Q1 căn cứ n/4 = 20; Q3 căn cứ 3n/4 = 60.' },
      { level: 'TH', question: 'Cho nhóm chứa mốt là [15; 20), tần số nhóm mốt là 16, nhóm trước là 10, nhóm sau là 12. Tính mốt Mo.', answer: 'u = 15, h = 5. Mo = 15 + [(16-10)/((16-10) + (16-12))] · 5 = 15 + [6/(6+4)] · 5 = 15 + 3 = 18.' },
      { level: 'TH', question: 'Một mẫu ghép nhóm có n = 60, nhóm chứa Q1 là [10; 15), C = 10, tần số nhóm Q1 là 10. Tính Q1.', answer: 'n/4 = 15. u = 10, h = 5. Q1 = 10 + [(15 - 10)/10] · 5 = 10 + 2,5 = 12,5.' },
      { level: 'VD', question: 'Khảo sát điểm thi của 100 học sinh: nhóm [6; 8) có 40 HS, nhóm [8; 10) có 30 HS, các nhóm trước có tổng 30 HS. Tính trung vị Me.', answer: 'n = 100, n/2 = 50. cf trước nhóm [6; 8) là 30 < 50 ≤ 70 -> nhóm [6; 8) chứa Me. u = 6, h = 2, C = 30, m = 40. Me = 6 + [(50 - 30)/40] · 2 = 6 + 1 = 7,0.' },
      { level: 'VD', question: 'Nếu tất cả các tần số trong mẫu ghép nhóm đều được nhân đôi thì số trung bình và trung vị thay đổi như thế nào?', answer: 'Tất cả các số đặc trưng xu thế trung tâm (x̄, Me, Q1, Q3, Mo) đều KHÔNG thay đổi vì tỉ lệ phân bố giữa các nhóm được giữ nguyên.' },
    ],
    quick: [
      { question: 'Có khi nào trung vị và mốt của mẫu ghép nhóm trùng nhau không?', solution: 'Có thể, khi dữ liệu phân bố đối xứng hoàn hảo quanh nhóm trung tâm.' },
      { question: 'Nếu nhóm mốt là nhóm cuối cùng thì m_{mo+1} lấy bằng bao nhiêu?', solution: 'Lấy m_{mo+1} = 0 vì không có nhóm nào phía sau.' },
    ],
    mistakes: [
      'Lấy C là tần số tích lũy của chính nhóm chứa trung vị thay vì nhóm đứng trước.',
      'Nhầm lẫn giữa giá trị đại diện của nhóm mốt với giá trị mốt tính theo công thức nội suy.',
      'Quên nhân với độ dài nhóm h khi tính nội suy.',
    ],
  },
  aiError: {
    category: 'Lỗi phương pháp',
    wrongSolution: 'AI viết: Nhóm chứa mốt là [8; 12) có tần số lớn nhất nên mốt của mẫu số liệu ghép nhóm là Mo = (8 + 12)/2 = 10.',
    correction: 'Giá trị (8 + 12)/2 = 10 chỉ là giá trị đại diện c_i của nhóm. Mốt của mẫu ghép nhóm phải tính theo công thức nội suy: Mo = 8 + [(18-15)/((18-15)+(18-6))] · 4 = 8,8.',
    proof: 'Định nghĩa SGK: mốt của mẫu ghép nhóm là giá trị xấp xỉ nội suy trong nhóm có tần số lớn nhất có tính đến độ chênh lệch tần số với hai nhóm liền kề, không đồng nhất với trung điểm nhóm.',
    whyAiError: 'Mô hình nhầm giá trị đại diện của nhóm mốt thành giá trị mốt của mẫu ghép nhóm.',
    teacherPrompt: 'AI lấy trung điểm nhóm 10 làm mốt. Em hãy chỉ lỗi sai và sửa lại: công thức nội suy mốt ghép nhóm tính ra kết quả bao nhiêu?',
    studentProduct: 'Ghi “Lỗi phương pháp: nhầm giá trị đại diện với mốt”, viết công thức nội suy và sửa thành Mo = 8,8.',
    boardPrompt: 'AI tính Mo = (8+12)/2 = 10. Mốt ghép nhóm có bằng trung điểm nhóm không?',
    libraryTitle: 'Lỗi AI nhầm giá trị đại diện nhóm thành mốt ghép nhóm',
  },
};

// Bài 7: 11-12-84 — Giới hạn của dãy số (Tiết 1: Giới hạn hữu hạn)
const L84 = {
  ...base('11-12-84', 84, 'formation'),
  title: 'Giới hạn của dãy số',
  goals: {
    must: 'Hiểu định nghĩa giới hạn hữu hạn của dãy số lim u_n = a và lim u_n = 0.',
    should: 'Biết các giới hạn cơ bản lim (1/n^k) = 0, lim q^n = 0 (|q| < 1), lim c = c.',
    could: 'Chứng minh một dãy số có giới hạn 0 bằng định nghĩa; áp dụng vào quá trình suy giảm thực tế.',
  },
  opening: 'Cắt đôi một tờ giấy vô hạn lần, diện tích mảnh giấy tiến dần về 0 nhưng không bao giờ bằng 0 — hôm nay ta bước vào khái niệm nền tảng của giải tích: giới hạn.',
  focusQuestion: 'Khẳng định "khi n rất lớn thì 1/n bằng 0" đúng hay sai? Cần phát biểu chuẩn xác như thế nào?',
  axis: `**Tình huống: Quá trình phân rã nồng độ thuốc trong máu sau khi tiêm:**
- Ban đầu nồng độ là $C_0 = 100$ mg/L. Sau mỗi giờ $n$, nồng độ còn lại giảm theo quy luật:
  $$u_n = \\dfrac{100}{n} \\quad (\\text{mg/L}, n = 1, 2, 3, \\dots).$$
- Khảo sát các giá trị khi $n$ tăng:
  - $n = 1 \\implies u_1 = 100$ mg/L.
  - $n = 10 \\implies u_{10} = 10$ mg/L.
  - $n = 1\\,000 \\implies u_{1000} = 0{,}1$ mg/L.
  - $n = 1\\,000\\,000 \\implies u_n = 0{,}0001$ mg/L.
- **Nhận xét trực quan:** Khi $n$ tăng vô hạn ($n \\to +\\infty$), khoảng cách $|u_n - 0|$ có thể nhỏ hơn bất kỳ số dương bé tùy ý nào.
- Ký hiệu: $\\lim_{n \\to +\\infty} u_n = 0$ hay $\\lim \\dfrac{100}{n} = 0$.
- **Định nghĩa tổng quát:** Dãy số $(u_n)$ có giới hạn là $a$ (kí hiệu $\\lim u_n = a$) nếu $\\lim (u_n - a) = 0$.`,
  s1: {
    title: 'Nồng độ thuốc tiến về đâu?',
    context: 'Dãy nồng độ u_n = 100/n (mg/L). Khi thời gian n tăng lên hàng triệu giờ, u_n tiến dần về giá trị nào?',
    question: 'Giới hạn của dãy số u_n khi n tiến ra vô cực là bao nhiêu?',
    options: ['Bằng 0 (lim u_n = 0)', 'Bằng 1', 'Không xác định'],
    correct: 0,
    why: 'Khi n càng lớn, 100/n càng gần 0 và có thể nhỏ hơn bất kỳ số dương nào tùy ý, nên lim(100/n) = 0.',
    discuss: ['`[PHÁT HIỆN]` Giá trị u_n có bao giờ thực sự bằng 0 với n hữu hạn không?', '`[SO SÁNH]` Dãy v_n = (-1/2)^n có giới hạn bằng bao nhiêu khi n tăng?'],
    cue: 'Vẽ đồ thị các điểm (n; 100/n) tiệm cận dần về trục hoành nhưng không cắt trục.',
    lookFor: 'HS hiểu giới hạn là xu thế tiệm cận, không phải phép gán bằng ở bước hữu hạn.',
  },
  s3: {
    title: 'Định nghĩa và các giới hạn cơ bản',
    steps: [
      'Định nghĩa: $\\lim u_n = 0 \\iff |u_n|$ có thể nhỏ hơn mọi số dương bé tùy ý kể từ một số hạng nào đó trở đi.',
      'Định nghĩa tổng quát: $\\lim u_n = a \\iff \\lim (u_n - a) = 0$.',
      'Giới hạn cơ bản 1: $\\lim \\dfrac{1}{n} = 0$; tổng quát $\\lim \\dfrac{1}{n^k} = 0$ ($k \\in \\mathbb{Z}^+$).',
      'Giới hạn cơ bản 2: $\\lim q^n = 0$ nếu $|q| < 1$; $\\lim c = c$ ($c$ là hằng số).',
    ],
    ask: ['`[SUY LUẬN]` Tại sao dãy (1,5)^n không có giới hạn bằng 0?', '`[PHÁT HIỆN]` Dãy số u_n = (-1)^n có giới hạn không?'],
    cue: 'Bảng các giới hạn 0 quen thuộc: 1/n, 1/n², 1/√n, (0,5)^n.',
    close: 'Khi n tiến ra vô cực: phân số có mẫu tăng vô hạn thì tiến về 0; lũy thừa cơ số tuyệt đối nhỏ hơn 1 tiến về 0.',
  },
  s4: {
    bat: 'AI giải: Tính lim (1,2)^n: AI viết vì 1,2 là số dương nên lim (1,2)^n = 0 theo quy tắc q^n tiến về 0.',
    chung: 'Quy tắc lim q^n = 0 chỉ đúng khi |q| < 1. Ở đây q = 1,2 > 1 nên (1,2)^n tăng vô hạn khi n tăng.',
    sua: 'q = 1,2 > 1 nên dãy số (1,2)^n không có giới hạn hữu hạn (dãy tiến ra +∞).',
    cue: 'Yêu cầu HS tính thử vài giá trị: 1,2^1 = 1,2; 1,2^10 ≈ 6,19; 1,2^50 ≈ 9100 để thấy tăng nhanh.',
    lookFor: 'HS chỉ ra điều kiện bắt buộc |q| < 1.',
  },
  s6: {
    hints: {
      M: 'áp dụng trực tiếp các giới hạn mẫu: lim 1/n^k = 0; lim q^n = 0 (|q| < 1); lim c = c.',
      S: 'tách dãy u_n thành hiệu với số a: chứng minh lim(u_n - a) = 0.',
      C: 'dùng bất đẳng thức kẹp để tìm giới hạn các dãy có dấu đan xen như (-1)^n / n.',
    },
    lookFor: 'HS M nhận diện đúng giới hạn cơ bản; HS S chứng minh được lim=a; HS C dùng được kẹp.',
  },
  postCheck: {
    q: 'Tính các giới hạn sau: (a) $\\lim \\dfrac{5}{n^2}$; (b) $\\lim \\left(-\\dfrac{1}{3}\\right)^n$; (c) $\\lim 7$.',
    a: '(a) $5 \\cdot 0 = 0$; (b) $= 0$ vì $|-1/3| = 1/3 < 1$; (c) $= 7$ (hằng số).',
    ds: [
      { t: '\"lim q^n = 0 với mọi số thực q\"', v: 'Sai — chỉ đúng khi |q| < 1' },
      { t: '\"lim (1/n) = 0\"', v: 'Đúng' },
      { t: '\"Nếu lim u_n = a thì kể từ một số hạng nào đó u_n phải đúng bằng a\"', v: 'Sai — chỉ cần tiến sát a' },
    ],
    cue: 'Đổi phiếu chấm chéo, chú ý điều kiện cơ số |q| < 1.',
  },
  s8Close: 'lim 1/n^k = 0; lim q^n = 0 khi |q| < 1; lim c = c; lim(u_n - a) = 0 -> lim u_n = a.',
  s9: {
    title: 'Ý nghĩa của giới hạn trong thuật toán máy tính',
    bullets: [
      'Các thuật toán tối ưu hóa Gradient Descent trong AI lặp vô hạn bước để tiệm cận nghiệm tối ưu.',
      'Sai số giữa nghiệm gần đúng và nghiệm thực tế tuân theo dãy có giới hạn 0.',
      'Khái niệm giới hạn mở đường cho đạo hàm, tích phân và toàn bộ toán học giải tích hiện đại.',
    ],
    cue: 'Hỏi: \"Tại sao máy tính chỉ tính được số hữu hạn nhưng lại giải được bài toán liên tục?\"',
  },
  exit: [
    'Nêu định nghĩa lim u_n = 0 và các giới hạn cơ bản.',
    'Nêu 1 bẫy (áp dụng lim q^n = 0 cho q ≥ 1; nhầm lim với giá trị số hạng).',
    'Tự đánh giá M / S / C.',
    'Dãy u_n = 3 + 1/n có giới hạn bằng bao nhiêu khi n tiến ra vô cực?',
  ],
  exitCue: 'Nhìn lại đồ thị nồng độ thuốc mở đầu.',
  after: '- HS làm bài tập SGK về định nghĩa giới hạn; chuẩn bị bài quy tắc tính giới hạn và CSN lùi vô hạn.',
  snapshot: {
    focus: 'Hình thành định nghĩa giới hạn hữu hạn của dãy số; nắm vững các giới hạn cơ bản lim(1/n^k) = 0, lim(q^n) = 0 (|q| < 1); phân biệt bản chất tiệm cận của giới hạn.',
    formulas: [
      '\\lim u_n = a \\iff \\lim (u_n - a) = 0',
      '\\lim \\dfrac{1}{n^k} = 0 \\quad (k \\in \\mathbb{Z}^+); \\quad \\lim \\dfrac{1}{\\sqrt{n}} = 0',
      '\\lim q^n = 0 \\quad (|q| < 1)',
      '\\lim c = c \\quad (c = \\text{const})',
    ],
    boardKnowledge: [
      'I. Khái niệm: lim u_n = a nghĩa là khoảng cách |u_n - a| tiến dần về 0 khi n -> +∞.',
      'II. Giới hạn đặc biệt: 1/n -> 0, 1/n² -> 0, q^n -> 0 (|q| < 1), c -> c.',
      'III. Lưu ý: q^n chỉ có giới hạn 0 khi giá trị tuyệt đối |q| < 1.',
    ],
    examples: [
      {
        question: 'Dùng định nghĩa chứng minh rằng lim (2n + 1)/n = 2.',
        solution: 'Xét u_n - 2 = (2n + 1)/n - 2 = 1/n. Vì lim (1/n) = 0 nên lim (u_n - 2) = 0. Theo định nghĩa, lim u_n = 2.',
      },
      {
        question: 'Tính giới hạn của các dãy số sau: (a) u_n = (-0,8)^n; (b) v_n = 4 + 3/n.',
        solution: '(a) Vì |-0,8| = 0,8 < 1 nên lim (-0,8)^n = 0. (b) lim (4 + 3/n) = lim 4 + 3·lim(1/n) = 4 + 0 = 4.',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Tính lim (1/n³).', answer: 'lim (1/n³) = 0 theo công thức cơ bản lim(1/n^k) = 0 với k = 3.' },
      { level: 'NB', question: 'Dãy số u_n = (0,99)^n có giới hạn bằng bao nhiêu khi n tiến ra vô cực?', answer: 'Bằng 0 vì |0,99| < 1.' },
      { level: 'TH', question: 'Chứng minh rằng dãy số u_n = (3n - 1)/(n + 2) có giới hạn bằng 3 khi n -> +∞.', answer: 'u_n - 3 = (3n - 1 - 3n - 6)/(n + 2) = -7/(n + 2). Vì |-7/(n+2)| < 7/n -> 0 nên lim(u_n - 3) = 0 -> lim u_n = 3.' },
      { level: 'TH', question: 'Tìm giới hạn của dãy số u_n = 5 - (1/2)^n + 2/n.', answer: 'lim u_n = lim 5 - lim(1/2)^n + 2·lim(1/n) = 5 - 0 + 0 = 5.' },
      { level: 'VD', question: 'Cho dãy u_n = cos(n) / n. Chứng minh lim u_n = 0.', answer: 'Ta có |cos n| ≤ 1 với mọi n nên 0 ≤ |u_n| ≤ 1/n. Vì lim 0 = lim(1/n) = 0 nên theo định lý kẹp, lim u_n = 0.' },
      { level: 'VD', question: 'Một chất phóng xạ có chu kỳ bán rã 1 ngày. Khối lượng còn lại sau n ngày là m_n = m0 · (1/2)^n. Hỏi khi n -> +∞ thì khối lượng chất phóng xạ tiến về đâu?', answer: 'lim m_n = m0 · lim(1/2)^n = m0 · 0 = 0. Sau thời gian rất dài chất phóng xạ phân rã gần như hoàn toàn.' },
    ],
    quick: [
      { question: 'Dãy số u_n = 2^n có giới hạn bằng 0 không? Vì sao?', solution: 'Không, vì cơ số q = 2 > 1 nên các số hạng tăng vô hạn (2, 4, 8, 16,...), không tiến về 0.' },
      { question: 'Nếu lim u_n = 0 thì lim |u_n| bằng bao nhiêu?', solution: 'Bằng 0 vì ||u_n| - 0| = |u_n| -> 0.' },
    ],
    mistakes: [
      'Cho rằng lim q^n = 0 với mọi q mà quên điều kiện |q| < 1.',
      'Nhầm lẫn giữa giới hạn bằng 0 với số hạng bằng 0.',
      'Áp dụng quy tắc cộng giới hạn khi các dãy thành phần chưa có giới hạn hữu hạn.',
    ],
  },
  aiError: {
    category: 'Lỗi điều kiện',
    wrongSolution: 'AI viết: Dãy số u_n = (4/3)^n có dạng lũy thừa q^n nên lim (4/3)^n = 0.',
    correction: 'Công thức lim q^n = 0 chỉ đúng khi |q| < 1. Ở đây q = 4/3 > 1 nên dãy số tăng không bị chặn, không có giới hạn bằng 0 (tiến ra +∞).',
    proof: 'Ta có 4/3 = 1 + 1/3. Theo bất đẳng thức Bernoulli: (4/3)^n ≥ 1 + n/3 -> +∞ khi n -> +∞, không thể tiến về 0.',
    whyAiError: 'Mô hình học máy áp dụng công thức q^n một cách máy móc mà bỏ qua điều kiện tiên quyết |q| < 1.',
    teacherPrompt: 'AI tính lim (4/3)^n = 0. Em hãy chỉ lỗi sai và sửa lại: dãy này có giới hạn bằng 0 không và vì sao?',
    studentProduct: 'Ghi “Lỗi điều kiện: thiếu |q| < 1”, giải thích q = 4/3 > 1 nên không tiến về 0.',
    boardPrompt: 'AI áp dụng lim q^n = 0 cho q = 4/3. Điều kiện cần của cơ số q là gì?',
    libraryTitle: 'Lỗi AI quên điều kiện |q| < 1 khi tính giới hạn q^n',
  },
};

export default [L83, L84];

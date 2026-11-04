const base = (key, period, lessonType = 'formation') => ({
  key, grade: 10, week: 12, period, lessonType, timelineKey: 'default',
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

// Bài 2: 10-12-90 — Các số đặc trưng đo mức độ phân tán
const L90 = {
  ...base('10-12-90', 90, 'formation'),
  title: 'Các số đặc trưng đo mức độ phân tán',
  goals: {
    must: 'Hiểu khái niệm khoảng biến thiên R, khoảng tứ phân vị ΔQ, phương sai s² và độ lệch chuẩn s.',
    should: 'Tính đúng R, ΔQ, s², s từ mẫu số liệu nhỏ; nhận biết giá trị bất thường qua hàng rào [Q1 - 1,5ΔQ; Q3 + 1,5ΔQ].',
    could: 'So sánh mức độ phân tán giữa hai mẫu có cùng số trung bình; giải thích ý nghĩa trong kiểm soát chất lượng.',
  },
  opening: 'Hai lớp cùng điểm trung bình môn Toán là 7,0; nhưng lớp A điểm đều 6–8, lớp B trải dài từ 2 đến 10 — hôm nay ta dùng độ phân tán để đo mức độ đồng đều.',
  focusQuestion: 'Khoảng biến thiên R và khoảng tứ phân vị ΔQ khác nhau như thế nào khi mẫu có giá trị bất thường?',
  axis: `**Tình huống: Kiểm tra đường kính chi tiết máy (đơn vị: mm) của hai máy dập A và B (mỗi máy đo 10 sản phẩm):**
- Máy A: $19{,}8; 19{,}9; 20{,}0; 20{,}0; 20{,}0; 20{,}0; 20{,}1; 20{,}1; 20{,}1; 20{,}0$ mm $\\implies \\bar x_A = 20{,}0$ mm.
  - $R_A = 20{,}1 - 19{,}8 = 0{,}3$ mm; $s_A^2 = 0{,}008 \\implies s_A \\approx 0{,}089$ mm.
- Máy B: $19{,}0; 19{,}5; 19{,}8; 20{,}0; 20{,}0; 20{,}0; 20{,}2; 20{,}5; 20{,}5; 20{,}5$ mm $\\implies \\bar x_B = 20{,}0$ mm.
  - $R_B = 20{,}5 - 19{,}0 = 1{,}5$ mm; $s_B^2 = 0{,}228 \\implies s_B \\approx 0{,}477$ mm.
- **Quy tắc hàng rào tìm giá trị ngoại lai:**
  - Khoảng tứ phân vị $\\Delta_Q = Q_3 - Q_1$.
  - Giá trị bất thường là giá trị nằm ngoài đoạn $[Q_1 - 1{,}5\\Delta_Q; Q_3 + 1{,}5\\Delta_Q]$.
- **Kết luận:** $\\bar x_A = \\bar x_B = 20{,}0$ mm nhưng $s_A < s_B$ ($0{,}089 < 0{,}477$) nên máy A gia công chính xác và ổn định hơn máy B.`,
  s1: {
    title: 'Máy nào sản xuất ổn định hơn?',
    context: 'Máy A và B đều sản xuất bulong đường kính trung bình 20,0 mm. Máy A có s = 0,089 mm; máy B có s = 0,477 mm.',
    question: 'Máy nào sản xuất ra các sản phẩm có độ đồng đều cao hơn?',
    options: ['Máy A (độ lệch chuẩn nhỏ hơn)', 'Máy B (độ lệch chuẩn lớn hơn)', 'Hai máy như nhau'],
    correct: 0,
    why: 'Độ lệch chuẩn s đo mức độ phân tán quanh số trung bình; s càng nhỏ thì các số liệu càng tập trung, độ đồng đều càng cao.',
    discuss: ['`[PHÁT HIỆN]` Vì sao số trung bình không đủ để đánh giá chất lượng của hai máy?', '`[SO SÁNH]` Nếu máy B có 1 sản phẩm hỏng nặng 25 mm thì R và s thay đổi ra sao?'],
    cue: 'Vẽ sơ đồ phân bố điểm quanh trục 20,0 mm: máy A bó hẹp, máy B tản mát.',
    lookFor: 'HS hiểu s tỉ lệ nghịch với độ đồng đều.',
  },
  s3: {
    title: '4 số đặc trưng đo mức độ phân tán',
    steps: [
      'Khoảng biến thiên: $R = x_{\\max} - x_{\\min}$. Dễ tính nhưng rất nhạy cảm với ngoại lai.',
      'Khoảng tứ phân vị: $\\Delta_Q = Q_3 - Q_1$. Đo mức phân tán của 50% số liệu ở giữa; bền vững trước ngoại lai.',
      'Phương sai: $s^2 = \\dfrac{1}{n}\\sum (x_i - \\bar x)^2 = \\dfrac{1}{n}\\sum x_i^2 - (\\bar x)^2$.',
      'Độ lệch chuẩn: $s = \\sqrt{s^2} \\ge 0$. Cùng đơn vị đo với dữ liệu gốc.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao khi tính độ phân tán người ta lấy bình phương $(x_i - \\bar x)^2$?', '`[PHÁT HIỆN]` Khi nào thì $s^2 = 0$?'],
    cue: 'Bảng đối chiếu 4 số đo: công thức và ý nghĩa thực tế.',
    close: 'R và s nhạy cảm với ngoại lai; ΔQ bền vững; s cùng đơn vị với x giúp đối chiếu trực quan.',
  },
  s4: {
    bat: 'AI giải: vì phương sai s² = 0,25 nên độ lệch chuẩn s = ±0,5 mm.',
    chung: 'Theo định nghĩa, độ lệch chuẩn s = √(s²) là căn bậc hai số học của phương sai, luôn không âm.',
    sua: 'Chỉ nhận giá trị không âm: s = √0,25 = 0,5 mm; độ lệch không thể mang giá trị âm.',
    cue: 'Nhắc lại: s đo độ tản mát khoảng cách, độ dài hình học không bao giờ âm.',
    lookFor: 'HS chỉ ra s = 0,5 mm và giải thích căn bậc hai số học.',
  },
  s6: {
    hints: {
      M: 'R = max - min; s = căn của s²; luôn lấy giá trị dương.',
      S: 'tìm Q1, Q3 rồi lấy ΔQ = Q3 - Q1; dùng công thức s² = (1/n)Σ xi² - x̄² để tính nhanh.',
      C: 'tính ngưỡng [Q1 - 1,5ΔQ; Q3 + 1,5ΔQ] để chỉ ra giá trị bất thường.',
    },
    lookFor: 'HS M tính đúng R; HS S tính đúng ΔQ và s; HS C kiểm tra được ngoại lai.',
  },
  postCheck: {
    q: 'Cho mẫu số liệu: 4, 6, 8. Tính số trung bình x̄, phương sai s² và độ lệch chuẩn s.',
    a: 'x̄ = (4+6+8)/3 = 6; s² = [(4-6)² + (6-6)² + (8-6)²]/3 = (4+0+4)/3 = 8/3 ≈ 2,67; s = √(8/3) ≈ 1,63.',
    ds: [
      { t: '\"Khoảng biến thiên R không bị ảnh hưởng bởi giá trị ngoại lai\"', v: 'Sai — R rất nhạy cảm với ngoại lai' },
      { t: '\"Phương sai s² và độ lệch chuẩn s luôn không âm\"', v: 'Đúng' },
      { t: '\"Độ lệch chuẩn càng lớn thì dữ liệu càng đồng đều\"', v: 'Sai — s càng lớn thì dữ liệu càng phân tán' },
    ],
    cue: 'Đổi phiếu chấm chéo, chú ý phân số 8/3.',
  },
  s8Close: 'R = max - min; ΔQ = Q3 - Q1; s = √(s²) ≥ 0; s nhỏ -> dữ liệu đồng đều.',
  s9: {
    title: 'Kiểm soát chất lượng trong dây chuyền công nghiệp',
    bullets: [
      'Trong chuẩn 6-Sigma của công nghiệp sản xuất, độ lệch chuẩn s phải cực nhỏ.',
      'Sản phẩm lệch quá 3s so với chuẩn bị coi là phế phẩm tự động.',
      'Quản lý chất lượng hiện đại tập trung kéo giảm s thay vì chỉ điều chỉnh x̄.',
    ],
    cue: 'Hỏi: \"Tại sao các hãng xe hơi kiểm tra chất lượng linh kiện bằng độ lệch chuẩn s?\"',
  },
  exit: [
    'Nêu công thức khoảng biến thiên R và khoảng tứ phân vị ΔQ.',
    'Nêu 1 bẫy (viết s = ±√(s²); nhầm đơn vị của phương sai và độ lệch chuẩn).',
    'Tự đánh giá M / S / C.',
    'Mẫu có s = 0 có ý nghĩa gì về các số liệu trong mẫu?',
  ],
  exitCue: 'Nhìn lại tình huống 2 máy dập mở đầu.',
  after: '- HS hoàn thành bài tập về khoảng biến thiên, phương sai; chuẩn bị tiết ôn tập chương V.',
  snapshot: {
    focus: 'Hình thành khái niệm và công thức tính khoảng biến thiên R, khoảng tứ phân vị ΔQ, phương sai s² và độ lệch chuẩn s; xác định giá trị bất thường.',
    formulas: [
      'R = x_{\\max} - x_{\\min}',
      '\\Delta_Q = Q_3 - Q_1',
      's^2 = \\dfrac{1}{n}\\sum (x_i - \\bar x)^2 = \\dfrac{1}{n}\\sum x_i^2 - (\\bar x)^2',
      's = \\sqrt{s^2}',
      '\\text{Ngưỡng ngoại lai: } [Q_1 - 1{,}5\\Delta_Q; Q_3 + 1{,}5\\Delta_Q]',
    ],
    boardKnowledge: [
      'I. Khoảng biến thiên: R = max - min; Khoảng tứ phân vị: ΔQ = Q3 - Q1.',
      'II. Phương sai s² và độ lệch chuẩn s = √(s²) ≥ 0.',
      'III. Giá trị bất thường: x < Q1 - 1,5ΔQ hoặc x > Q3 + 1,5ΔQ.',
    ],
    examples: [
      {
        question: 'Cho dãy số liệu: 3, 5, 7, 9, 11. Tính khoảng biến thiên R, phương sai s² và độ lệch chuẩn s.',
        solution: 'R = 11 - 3 = 8. x̄ = (3+5+7+9+11)/5 = 35/5 = 7. s² = [(3-7)² + (5-7)² + (7-7)² + (9-7)² + (11-7)²]/5 = (16+4+0+4+16)/5 = 40/5 = 8. s = √8 ≈ 2,83.',
      },
      {
        question: 'Mẫu đã sắp xếp: 2, 4, 6, 8, 10, 12. Tìm khoảng tứ phân vị ΔQ và xác định xem số 25 có phải giá trị bất thường không.',
        solution: 'n = 6. Q2 = 7. Q1 = 4, Q3 = 10 -> ΔQ = 10 - 4 = 6. Ngưỡng trên: Q3 + 1,5ΔQ = 10 + 1,5·6 = 19. Vì 25 > 19 nên 25 là giá trị bất thường.',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Mẫu số liệu có giá trị nhỏ nhất là 12, giá trị lớn nhất là 45. Tính khoảng biến thiên R.', answer: 'R = 45 - 12 = 33.' },
      { level: 'NB', question: 'Phương sai của một mẫu số liệu bằng 16. Tính độ lệch chuẩn s.', answer: 's = √16 = 4.' },
      { level: 'TH', question: 'Tìm khoảng tứ phân vị ΔQ của mẫu: 3, 6, 8, 12, 15, 18, 20.', answer: 'n = 7. Q2 = 12. Q1 = 6, Q3 = 18 -> ΔQ = 18 - 6 = 12.' },
      { level: 'TH', question: 'Tính phương sai s² của mẫu số liệu: 1, 2, 3, 4, 5.', answer: 'x̄ = 3. s² = [(1-3)² + (2-3)² + (3-3)² + (4-3)² + (5-3)²]/5 = (4+1+0+1+4)/5 = 10/5 = 2.' },
      { level: 'VD', question: 'Cho mẫu số liệu có Q1 = 10, Q3 = 20. Hỏi giá trị x = 38 có phải là giá trị bất thường không?', answer: 'ΔQ = 20 - 10 = 10. Ngưỡng trên: Q3 + 1,5ΔQ = 20 + 1,5·10 = 35. Vì 38 > 35 nên 38 là giá trị bất thường.' },
      { level: 'VD', question: 'Hai xạ thủ An và Bình có cùng điểm trung bình 9 điểm nhưng phương sai lần lượt là sA² = 0,4 và sB² = 1,6. Xạ thủ nào có phong độ thi đấu ổn định hơn?', answer: 'sA = √0,4 ≈ 0,63; sB = √1,6 ≈ 1,26. Vì sA < sB nên xạ thủ An có phong độ ổn định hơn xạ thủ Bình.' },
    ],
    quick: [
      { question: 'Có thể có mẫu số liệu mà phương sai s² < 0 không?', solution: 'Không, phương sai là trung bình của các bình phương nên luôn luôn s² ≥ 0.' },
      { question: 'Nếu tất cả các số liệu trong mẫu bằng nhau thì độ lệch chuẩn bằng bao nhiêu?', solution: 'Khi tất cả số liệu bằng nhau thì xi = x̄ với mọi i, do đó s = 0.' },
    ],
    mistakes: [
      'Tính độ lệch chuẩn viết kết quả nhận hai giá trị ±.',
      'Quên chia cho n khi tính phương sai s².',
      'Nhầm khoảng tứ phân vị ΔQ = Q3 - Q1 với Q2.',
    ],
  },
  aiError: {
    category: 'Lỗi đại số',
    wrongSolution: 'AI viết: Phương sai của mẫu số liệu là s² = 0,16 nên độ lệch chuẩn s = ±0,4.',
    correction: 'Độ lệch chuẩn là căn bậc hai số học của phương sai nên s ≥ 0. Sửa lại: s = √0,16 = 0,4.',
    proof: 'Định nghĩa: s = √(s²) lấy dấu căn bậc hai số học (luôn không âm). Khoảng cách và độ phân tán không thể mang giá trị âm.',
    whyAiError: 'Mô hình nhầm nghiệm đại số của phương trình x² = 0,16 với giá trị của hàm căn bậc hai số học s = √0,16.',
    teacherPrompt: 'AI tính độ lệch chuẩn s = ±0,4. Em hãy chỉ lỗi sai và sửa lại: độ lệch chuẩn có thể âm được không?',
    studentProduct: 'Ghi “Lỗi đại số: độ lệch chuẩn phải không âm”, gạch bỏ dấu trừ và sửa thành s = 0,4.',
    boardPrompt: 'AI viết s = ±0,4 khi s² = 0,16. Độ lệch chuẩn s có quy ước dấu thế nào?',
    libraryTitle: 'Lỗi AI tính độ lệch chuẩn nhận hai giá trị âm dương',
  },
};

export default [L90];

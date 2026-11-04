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

// Bài 3: 10-12-91 — Ôn tập chương V: Số gần đúng và sai số, các số đặc trưng của mẫu số liệu
const L91 = {
  ...base('10-12-91', 91, 'practice'),
  title: 'Ôn tập chương V',
  goals: {
    must: 'Quy tròn số đúng hàng theo độ chính xác; tính số trung bình, trung vị, tứ phân vị, mốt và độ lệch chuẩn.',
    should: 'Phân tích bảng số liệu tổng hợp, phát hiện giá trị bất thường và đánh giá mức độ ổn định.',
    could: 'Lập sơ đồ tư duy toàn bộ Chương V; giải thích mối liên hệ giữa các số đo xu thế trung tâm và mức độ phân tán.',
  },
  opening: 'Hôm nay chúng ta hệ thống hóa toàn bộ công cụ thống kê mô tả Chương V: từ số đo sai số đến các số đo xu thế trung tâm và mức độ phân tán.',
  focusQuestion: 'Bộ số đặc trưng nào mô tả đầy đủ nhất một tập số liệu thực nghiệm: chỉ cần xu thế trung tâm hay phải kèm độ phân tán?',
  axis: `**Tình huống: Báo cáo tổng kết khảo sát điểm thi môn Toán của 12 học sinh đội tuyển học sinh giỏi:**
Dãy điểm: $12, 14, 15, 15, 16, 16, 16, 17, 18, 18, 19, 20$ (thang 20 điểm).
- $n = 12$. Sắp xếp: dãy đã tăng dần.
- Số trung bình: $\\bar x = 196/12 \\approx 16{,}33$ điểm.
- Trung vị: $n = 12 \\implies M_e = (x_6 + x_7)/2 = (16 + 16)/2 = 16{,}0$ điểm.
- Tứ phân vị: Nửa dưới (12, 14, 15, 15, 16, 16) $\\implies Q_1 = (15+15)/2 = 15{,}0$. Nửa trên (16, 17, 18, 18, 19, 20) $\\implies Q_3 = (18+18)/2 = 18{,}0$.
- Khoảng tứ phân vị: $\\Delta_Q = Q_3 - Q_1 = 18 - 15 = 3{,}0$ điểm.
- Mốt: $M_o = 16$ (xuất hiện 3 lần).
- Khoảng biến thiên: $R = 20 - 12 = 8$ điểm.
- Độ lệch chuẩn: $s \\approx 2{,}13$ điểm.
- Không có giá trị bất thường vì $[15 - 1{,}5\\cdot3; 18 + 1{,}5\\cdot3] = [10{,}5; 22{,}5]$ bao trọn toàn bộ dãy.`,
  s1: {
    title: 'Phân tích điểm đội tuyển học sinh giỏi',
    context: 'Đội tuyển 12 học sinh có điểm thi dao động từ 12 đến 20, điểm trung bình 16,33 và trung vị 16,0.',
    question: 'Điểm số phổ biến nhất mà các em đạt được trong bài thi là bao nhiêu?',
    options: ['Điểm 15', 'Điểm 16 (Mốt)', 'Điểm 18'],
    correct: 1,
    why: 'Điểm 16 có 3 học sinh đạt được, tần số cao nhất trong các điểm thi nên Mo = 16.',
    discuss: ['`[PHÁT HIỆN]` Giữa điểm trung bình 16,33 và trung vị 16,0 có chênh lệch nhiều không? Vì sao?', '`[SO SÁNH]` Khoảng tứ phân vị ΔQ = 3 cho ta biết điều gì về 50% học sinh ở giữa?'],
    cue: 'Nhắc lại: mốt là giá trị có tần số lớn nhất; khi mẫu phân bố đều thì trung bình và trung vị rất sát nhau.',
    lookFor: 'HS đọc đúng mốt từ mẫu số liệu.',
  },
  s3: {
    title: 'Bản đồ khái niệm Chương V',
    steps: [
      '1. Số gần đúng & sai số: sai số tuyệt đối $\\Delta_a$, sai số tương đối $\\delta_a$, quy tròn số theo độ chính xác $d$.',
      '2. Xu thế trung tâm: Số trung bình $\\bar x$, Trung vị $M_e$, Tứ phân vị $Q_1, Q_2, Q_3$, Mốt $M_o$.',
      '3. Mức độ phân tán: Khoảng biến thiên $R$, Khoảng tứ phân vị $\\Delta_Q$, Phương sai $s^2$, Độ lệch chuẩn $s$.',
      '4. Nhận diện ngoại lai: $x < Q_1 - 1{,}5\\Delta_Q$ hoặc $x > Q_3 + 1{,}5\\Delta_Q$.',
    ],
    ask: ['`[SUY LUẬN]` Khi so sánh hai tập số liệu, cần so sánh những chỉ số nào?', '`[PHÁT HIỆN]` Tại sao quy tròn theo độ chính xác d lại lùi một hàng so với chữ số khác 0 đầu tiên?'],
    cue: 'Chiếu sơ đồ cây phân nhánh các công cụ Chương V.',
    close: 'Một bản phân tích hoàn chỉnh phải có cả xu thế trung tâm (đại diện vị trí) và mức độ phân tán (đo độ ổn định).',
  },
  s4: {
    bat: 'AI giải: Quy tròn số a = 3,14159 với độ chính xác d = 0,005 thành 3,141.',
    chung: 'Chữ số khác 0 đầu tiên của d = 0,005 ở hàng phần nghìn, nên phải quy tròn đến hàng liền trước: hàng phần trăm.',
    sua: 'Quy tròn đến hàng phần trăm: chữ số sau hàng quy tròn là 1 (< 5) nên kết quả đúng là 3,14.',
    cue: 'Nhắc lại quy tắc quy tròn: tìm hàng của chữ số khác 0 đầu tiên của d -> quy tròn đến hàng liền trước.',
    lookFor: 'HS chỉ ra quy tròn đến hàng phần trăm và sửa thành 3,14.',
  },
  s6: {
    hints: {
      M: 'nhớ quy tắc lùi hàng khi quy tròn; sắp xếp dãy trước khi tìm Me, Q1, Q3.',
      S: 'tính s² = (1/n)Σ xi² - x̄² rồi lấy căn ra s; kiểm tra ngoại lai theo công thức 1,5ΔQ.',
      C: 'kết hợp nhận xét xu thế trung tâm và độ phân tán để kết luận bài toán thực tế.',
    },
    lookFor: 'HS M quy tròn đúng; HS S tính đúng tứ phân vị; HS C phân tích đầy đủ các chỉ số.',
  },
  postCheck: {
    q: 'Quy tròn số 25,648 với độ chính xác d = 0,02.',
    a: 'd = 0,02 có chữ số khác 0 ở hàng phần trăm -> quy tròn đến hàng phần mười -> kết quả: 25,6.',
    ds: [
      { t: '\"d = 0,02 thì quy tròn đến hàng phần trăm\"', v: 'Sai — phải quy tròn đến hàng phần mười' },
      { t: '\"Trung vị là tứ phân vị thứ hai Q2\"', v: 'Đúng' },
      { t: '\"Khoảng tứ phân vị luôn nhỏ hơn hoặc bằng khoảng biến thiên\"', v: 'Đúng' },
    ],
    cue: 'Đổi phiếu chấm chéo, chú ý quy tắc lùi một hàng.',
  },
  s8Close: 'Chương V: Sai số (quy tròn lùi 1 hàng) + Trung tâm (x̄, Me, Mo) + Phân tán (R, ΔQ, s) + Ngoại lai (1,5ΔQ).',
  s9: {
    title: 'Thống kê mô tả trong phân tích dữ liệu lớn',
    bullets: [
      'Mọi thuật toán AI và Machine Learning đều bắt đầu bằng việc chuẩn hóa thống kê mô tả (x̄, s).',
      'Loại bỏ giá trị bất thường qua khoảng tứ phân vị là bước lọc dữ liệu rác bắt buộc.',
      'Hiểu sâu các số đo này giúp làm chủ các công cụ khoa học dữ liệu hiện đại.',
    ],
    cue: 'Hỏi: \"Tại sao các kỹ sư dữ liệu phải lọc bỏ dữ liệu bất thường trước khi huấn luyện AI?\"',
  },
  exit: [
    'Nêu 2 nhóm số đặc trưng chính trong thống kê mô tả.',
    'Nêu 1 bẫy (quy tròn đúng hàng của d thay vì lùi một hàng).',
    'Tự đánh giá M / S / C.',
    'Khi nào cần dùng khoảng tứ phân vị thay cho khoảng biến thiên?',
  ],
  exitCue: 'Nhìn lại sơ đồ cây Chương V.',
  after: '- HS hoàn thành bài kiểm tra thử Chương V; chuẩn bị chuyển sang chương Hình học Vectơ.',
  snapshot: {
    focus: 'Hệ thống hóa toàn bộ kiến thức Chương V: số gần đúng, sai số, các số đặc trưng đo xu thế trung tâm và mức độ phân tán; rèn kỹ năng xử lý dữ liệu tổng hợp.',
    formulas: [
      '\\Delta_a = |\\bar a - a| \\le d; \\quad \\delta_a = \\dfrac{\\Delta_a}{|a|}',
      '\\bar x = \\dfrac{1}{n}\\sum x_i; \\quad M_e = Q_2; \\quad \\Delta_Q = Q_3 - Q_1',
      's^2 = \\dfrac{1}{n}\\sum x_i^2 - (\\bar x)^2; \\quad s = \\sqrt{s^2}',
    ],
    boardKnowledge: [
      'I. Sai số: Δa ≤ d, δa = Δa/|a|; Quy tròn lùi một hàng so với chữ số khác 0 của d.',
      'II. Đo xu thế trung tâm: Trung bình x̄, Trung vị Me, Tứ phân vị Q1, Q2, Q3, Mốt Mo.',
      'III. Đo mức độ phân tán: Khoảng biến thiên R, Khoảng tứ phân vị ΔQ, Phương sai s², Độ lệch chuẩn s.',
    ],
    examples: [
      {
        question: 'Quy tròn số a = 4,2357 với độ chính xác d = 0,03. Ước lượng sai số tương đối.',
        solution: 'd = 0,03 có chữ số khác 0 ở hàng phần trăm -> quy tròn đến hàng phần mười -> số quy tròn là 4,2. Sai số tuyệt đối Δ ≤ 0,03; sai số tương đối δ ≤ 0,03/4,2 ≈ 0,71%.',
      },
      {
        question: 'Cho dãy điểm: 5, 6, 7, 8, 9. Tính số trung bình, khoảng biến thiên và độ lệch chuẩn.',
        solution: 'x̄ = 35/5 = 7. R = 9 - 5 = 4. s² = [(5-7)² + (6-7)² + (7-7)² + (8-7)² + (9-7)²]/5 = 10/5 = 2 -> s = √2 ≈ 1,41.',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Quy tròn số 12,456 đến hàng phần mười.', answer: 'Chữ số sau hàng phần mười là 5 -> quy tròn thành 12,5.' },
      { level: 'NB', question: 'Dãy số liệu 2, 3, 5, 5, 8 có mốt bằng bao nhiêu?', answer: 'Mo = 5 vì có tần số lớn nhất (2 lần).' },
      { level: 'TH', question: 'Cho dãy: 10, 12, 14, 16, 18, 20. Tìm khoảng tứ phân vị ΔQ.', answer: 'Q2 = 15. Nửa dưới (10, 12, 14) -> Q1 = 12. Nửa trên (16, 18, 20) -> Q3 = 18. ΔQ = 18 - 12 = 6.' },
      { level: 'TH', question: 'Quy tròn số đúng của diện tích S = 124,35 m² với độ chính xác d = 0,2 m².', answer: 'd = 0,2 có chữ số khác 0 ở hàng phần mười -> quy tròn đến hàng đơn vị -> S ≈ 124 m².' },
      { level: 'VD', question: 'Cho dãy số liệu 2, 4, 6, 8, x có số trung bình bằng 6. Tính phương sai của dãy.', answer: 'Tổng = 5 · 6 = 30 -> x = 30 - (2+4+6+8) = 10. Mẫu: 2, 4, 6, 8, 10. s² = [(2-6)² + (4-6)² + (6-6)² + (8-6)² + (10-6)²]/5 = (16+4+0+4+16)/5 = 40/5 = 8.' },
      { level: 'VD', question: 'Một lớp có 30 học sinh làm bài thi trắc nghiệm. Biết Q1 = 12, Q3 = 18. Điểm thi 2 điểm có phải giá trị bất thường không?', answer: 'ΔQ = 18 - 12 = 6. Ngưỡng dưới: Q1 - 1,5ΔQ = 12 - 1,5·6 = 3. Vì 2 < 3 nên điểm 2 là giá trị bất thường.' },
    ],
    quick: [
      { question: 'Nếu d = 0,001 thì ta quy tròn đến hàng nào?', solution: 'Chữ số khác 0 ở hàng phần nghìn -> quy tròn đến hàng liền trước: hàng phần trăm.' },
      { question: 'Một mẫu số liệu có thể có độ lệch chuẩn âm không?', solution: 'Không, độ lệch chuẩn luôn là số không âm (s ≥ 0).' },
    ],
    mistakes: [
      'Quy tròn đến chính hàng của chữ số khác 0 trong d thay vì lùi một hàng.',
      'Nhầm công thức phương sai quên bình phương các độ lệch.',
      'Nhầm ngưỡng giá trị bất thường: lấy cộng trừ ΔQ thay vì 1,5ΔQ.',
    ],
  },
  aiError: {
    category: 'Lỗi quy tắc',
    wrongSolution: 'AI viết: Khi quy tròn số theo độ chính xác d = 0,04, ta quy tròn đến hàng phần trăm vì chữ số 4 nằm ở hàng phần trăm.',
    correction: 'Quy tắc chuẩn: quy tròn đến hàng liền trước hàng của chữ số khác 0 đầu tiên. d = 0,04 có chữ số 4 ở hàng phần trăm nên phải quy tròn đến hàng phần mười.',
    proof: 'Độ chính xác d = 0,04 có nghĩa là sai số tuyệt đối không vượt quá 0,04. Chữ số hàng phần trăm chưa đáng tin cậy nên phải quy tròn đến hàng phần mười.',
    whyAiError: 'Mô hình học máy nhầm lẫn khái niệm “độ chính xác đến hàng nào” với “hàng quy tròn cần thực hiện”.',
    teacherPrompt: 'AI quy tròn đến hàng phần trăm với d = 0,04. Em hãy chỉ lỗi sai và sửa lại quy tắc: phải quy tròn đến hàng nào?',
    studentProduct: 'Ghi “Lỗi quy tắc: phải lùi một hàng so với d”, sửa thành quy tròn đến hàng phần mười.',
    boardPrompt: 'AI chọn hàng phần trăm khi d = 0,04. Quy tắc quy tròn yêu cầu lùi mấy hàng so với d?',
    libraryTitle: 'Lỗi AI quy tròn sai hàng theo độ chính xác d',
  },
};

export default [L91];

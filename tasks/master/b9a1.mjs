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

// Bài 1: 10-12-89 — Luyện tập các số đặc trưng đo xu thế trung tâm
const L89 = {
  ...base('10-12-89', 89, 'practice'),
  title: 'Các số đặc trưng đo xu thế trung tâm',
  goals: {
    must: 'Tính đúng số trung bình, trung vị, các tứ phân vị và mốt của mẫu số liệu nhỏ.',
    should: 'Giải thích vì sao số trung bình bị ảnh hưởng bởi giá trị ngoại lai; chọn số đo đại diện phù hợp.',
    could: 'Phân tích dữ liệu thực tế có giá trị bất thường để đưa ra quyết định quản trị/sản xuất.',
  },
  opening: 'Khi một nhân viên làm thêm 80 giờ trong khi các đồng nghiệp chỉ làm 10–15 giờ, số trung bình tăng vọt — hôm nay ta luyện tập chọn đúng số đại diện.',
  focusQuestion: 'Khi mẫu số liệu có giá trị ngoại lai (rất lớn hoặc rất bé), nên dùng số trung bình hay trung vị làm đại diện?',
  axis: `**Tình huống: Khảo sát số giờ làm thêm (OT) tháng 12 của 10 nhân viên một công ty công nghệ:**
Dãy số liệu: $10, 12, 12, 14, 15, 15, 16, 18, 20, 88$ (giờ).
- Cỡ mẫu $n = 10$. Giá trị $88$ là giá trị bất thường (ngoại lai).
- Số trung bình: $\\bar x = (10+12+12+14+15+15+16+18+20+88)/10 = 220/10 = 22$ giờ.
- Trung vị: $n = 10$ chẵn $\\implies M_e = Q_2 = (15 + 15)/2 = 15$ giờ.
- Tứ phân vị: Nửa dưới (10, 12, 12, 14, 15) $\\implies Q_1 = 12$; Nửa trên (15, 16, 18, 20, 88) $\\implies Q_3 = 18$.
- Mốt: $M_o = 12$ và $M_o = 15$ (đều xuất hiện 2 lần).
- **Nhận xét then chốt:** $\\bar x = 22$ lớn hơn 9/10 nhân viên; dùng $M_e = 15$ phản ánh chính xác số đông hơn.`,
  s1: {
    title: 'Số trung bình hay trung vị phản ánh đúng?',
    context: 'Dãy giờ OT của 10 nhân viên: 10, 12, 12, 14, 15, 15, 16, 18, 20, 88. Số trung bình là 22 giờ, trung vị là 15 giờ.',
    question: 'Số đo nào đại diện tốt hơn cho mức độ làm thêm của đa số nhân viên?',
    options: ['Số trung bình 22 giờ', 'Số trung vị 15 giờ', 'Cả hai như nhau'],
    correct: 1,
    why: 'Giá trị ngoại lai 88 kéo số trung bình lên 22 (lớn hơn 90% số nhân viên); trung vị 15 không bị ảnh hưởng.',
    discuss: ['`[PHÁT HIỆN]` Nếu bỏ giá trị 88, số trung bình mới là bao nhiêu?', '`[SO SÁNH]` Tứ phân vị Q1 và Q3 cho ta biết gì về khoảng giữa 50% nhân viên?'],
    cue: 'Vẽ trục số từ 10 đến 88, chấm các điểm để HS thấy điểm 88 nằm xa hẳn đám đông.',
    lookFor: 'HS nhận diện ảnh hưởng của giá trị ngoại lai đến số trung bình.',
  },
  s3: {
    title: 'Hệ thống hoá 4 số đặc trưng đo xu thế trung tâm',
    steps: [
      'Số trung bình $\\bar x$: tổng tất cả chia cỡ mẫu; nhạy cảm với ngoại lai.',
      'Trung vị $M_e$: chia đôi mẫu sau khi sắp xếp; bền vững trước ngoại lai.',
      'Tứ phân vị $Q_1, Q_2, Q_3$: chia mẫu thành 4 phần bằng nhau (mỗi phần 25%).',
      'Mốt $M_o$: giá trị có tần số lớn nhất; dùng cho dữ liệu định danh hoặc nhu cầu số đông.',
    ],
    ask: ['`[SUY LUẬN]` Khi nào thì số trung bình và trung vị xấp xỉ bằng nhau?', '`[PHÁT HIỆN]` Mẫu không có giá trị lặp lại thì mốt bằng bao nhiêu?'],
    cue: 'Bảng đối chiếu 4 số đặc trưng: công thức, ưu điểm, nhược điểm.',
    close: 'Khi phân bố cân đối: dùng số trung bình; khi có giá trị bất thường: ưu tiên dùng trung vị.',
  },
  s4: {
    bat: 'AI giải: vì 88 xuất hiện trong mẫu nên số trung bình 22 giờ là đại diện chính xác nhất cho năng suất làm việc của cả phòng.',
    chung: 'Có 9/10 nhân viên làm từ 20 giờ trở xuống; chỉ duy nhất 1 người làm 88 giờ. Kết luận 22 giờ làm đại diện là sai lệch nghiêm trọng.',
    sua: 'Phải dùng trung vị 15 giờ hoặc loại bỏ giá trị ngoại lai rồi mới tính số trung bình (khi đó x̄ = 14,67 giờ).',
    cue: 'Yêu cầu HS so sánh số 22 với từng giá trị trong mẫu.',
    lookFor: 'HS chỉ ra số 22 cao hơn hầu hết mọi nhân viên.',
  },
  s6: {
    hints: {
      M: 'sắp xếp mẫu tăng dần trước; đếm n chẵn hay lẻ để chọn công thức trung vị đúng.',
      S: 'chia mẫu thành nửa dưới và nửa trên; Q1 là trung vị nửa dưới, Q3 là trung vị nửa trên.',
      C: 'tính khoảng tứ phân vị ΔQ = Q3 - Q1; kiểm tra ngưỡng ngoại lai [Q1 - 1,5ΔQ; Q3 + 1,5ΔQ].',
    },
    lookFor: 'HS M sắp xếp đúng; HS S tính đúng Q1, Q3; HS C phân tích được ngoại lai.',
  },
  postCheck: {
    q: 'Cho mẫu đã sắp xếp: $2, 4, 5, 6, 8, 9, 36$. Tính số trung bình và trung vị.',
    a: '$\\bar x = 70/7 = 10$; $M_e = x_4 = 6$. Trung vị 6 đại diện tốt hơn vì 36 là ngoại lai.',
    ds: [
      { t: '\"Trung vị luôn bằng một trong các số của mẫu số liệu\"', v: 'Sai — khi n chẵn trung vị là trung bình cộng hai số giữa' },
      { t: '\"Số trung bình bị kéo về phía giá trị ngoại lai\"', v: 'Đúng' },
      { t: '\"Mỗi mẫu số liệu luôn có duy nhất một mốt\"', v: 'Sai — có thể có nhiều mốt hoặc không có mốt' },
    ],
    cue: 'Đổi phiếu chấm chéo, chú ý trường hợp n chẵn.',
  },
  s8Close: 'Luôn sắp xếp trước; n lẻ lấy giữa, n chẵn lấy trung bình; có ngoại lai thì tin trung vị.',
  s9: {
    title: 'Ứng dụng trong báo cáo lương doanh nghiệp',
    bullets: [
      'Lương trung bình công ty có thể cao do vài vị trí lãnh đạo lương hàng trăm triệu.',
      'Lương trung vị phản ánh đúng thu nhập thực tế của người lao động phổ thông.',
      'Bộ Lao động khuyến nghị công bố cả hai chỉ số để minh bạch thông tin tuyển dụng.',
    ],
    cue: 'Hỏi: \"Khi đi xin việc, bạn nên hỏi mức lương trung bình hay lương trung vị?\"',
  },
  exit: [
    'Nêu cách tính trung vị khi n chẵn và khi n lẻ.',
    'Nêu 1 bẫy (không sắp xếp dãy trước khi tìm trung vị/tứ phân vị).',
    'Tự đánh giá M / S / C.',
    'Dãy 1, 2, 3, 100: số trung bình và trung vị số nào đại diện tốt hơn?',
  ],
  exitCue: 'Nhìn lại tình huống mở đầu với giá trị 88.',
  after: '- HS hoàn thành bài tập ôn tập về các số đo xu thế trung tâm; chuẩn bị bài các số đo mức độ phân tán.',
  snapshot: {
    focus: 'Luyện tập thành thạo tính số trung bình, trung vị, tứ phân vị và mốt; phân tích và nhận diện giá trị ngoại lai trong các tình huống thực tế.',
    formulas: [
      '\\bar x = \\dfrac{1}{n}\\sum x_i',
      'M_e = x_{(n+1)/2} \\; (n \\text{ lẻ}); \\quad M_e = \\dfrac{x_{n/2} + x_{n/2+1}}{2} \\; (n \\text{ chẵn})',
      '\\Delta_Q = Q_3 - Q_1',
    ],
    boardKnowledge: [
      'I. 4 số đặc trưng đo xu thế trung tâm: Trung bình, Trung vị, Tứ phân vị, Mốt.',
      'II. Khi có ngoại lai: trung bình bị kéo lệch, trung vị giữ nguyên tính bền vững.',
      'III. Quy trình: Sắp xếp -> Tìm Q2 -> Tìm Q1, Q3 -> Tìm Mo.',
    ],
    examples: [
      {
        question: 'Tìm số trung bình, trung vị và mốt của dãy số điểm kiểm tra: 6, 7, 7, 8, 8, 8, 9, 10.',
        solution: 'n = 8. Sắp xếp: dãy đã tăng dần. x̄ = (6+7+7+8+8+8+9+10)/8 = 63/8 = 7,875. Me = (8+8)/2 = 8. Mo = 8 (tần số 3).',
      },
      {
        question: 'Tìm các tứ phân vị Q1, Q2, Q3 của dãy: 3, 5, 7, 8, 12, 13, 14, 21, 23.',
        solution: 'n = 9. Dãy đã sắp xếp. Q2 = x5 = 12. Nửa dưới (3, 5, 7, 8) -> Q1 = (5+7)/2 = 6. Nửa trên (13, 14, 21, 23) -> Q3 = (14+21)/2 = 17,5.',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Mẫu số liệu 4, 6, 6, 7, 9 có mốt bằng bao nhiêu?', answer: 'Mo = 6 vì xuất hiện 2 lần (nhiều nhất).' },
      { level: 'NB', question: 'Tìm trung vị của mẫu số liệu đã sắp xếp: 11, 13, 15, 17, 19, 21, 25.', answer: 'n = 7 lẻ nên Me = x4 = 17.' },
      { level: 'TH', question: 'Tìm các tứ phân vị Q1, Q2, Q3 của mẫu: 2, 5, 6, 8, 10, 12.', answer: 'n = 6. Q2 = (6+8)/2 = 7. Nửa dưới (2, 5, 6) -> Q1 = 5. Nửa trên (8, 10, 12) -> Q3 = 10.' },
      { level: 'TH', question: 'Tính số trung bình và trung vị của dãy: 5, 5, 6, 7, 8, 49. Nhận xét số nào đại diện tốt hơn.', answer: 'x̄ = 80/6 ≈ 13,33; Me = (6+7)/2 = 6,5. Me đại diện tốt hơn vì 49 là ngoại lai kéo x̄ lên quá cao.' },
      { level: 'VD', question: 'Một lớp có 40 học sinh điểm trung bình môn Toán là 7,0. Nếu thêm điểm 10 của học sinh chuyển trường vào thì điểm trung bình mới là bao nhiêu?', answer: 'Tổng điểm 40 HS là 40 · 7 = 280. Thêm 10 điểm -> tổng 290. Điểm TB mới = 290/41 ≈ 7,07.' },
      { level: 'VD', question: 'Tìm 5 số nguyên dương đã sắp xếp biết trung vị bằng 6, mốt duy nhất bằng 4 và số trung bình bằng 6.', answer: 'Dãy a, b, c, d, e. Me = c = 6. Mo = 4 duy nhất -> a = b = 4. Tổng = 5 · 6 = 30 -> d + e = 30 - 14 = 16. Vì sắp xếp và Mo = 4 duy nhất nên 6 < d < e và d, e khác nhau: d = 7, e = 9. Dãy là 4, 4, 6, 7, 9.' },
    ],
    quick: [
      { question: 'Có bạn nói dãy 3, 5, 7, 9 không có mốt. Đúng hay sai?', solution: 'Đúng, vì mỗi giá trị đều chỉ xuất hiện 1 lần, không có giá trị nào xuất hiện nhiều nhất.' },
      { question: 'Khi n = 8 thì trung vị là giá trị đứng ở vị trí nào?', solution: 'Trung vị là trung bình cộng của giá trị thứ 4 và thứ 5 sau khi sắp xếp dãy.' },
    ],
    mistakes: [
      'Không sắp xếp mẫu số liệu trước khi tìm trung vị và tứ phân vị.',
      'Nhầm mốt là giá trị lớn nhất trong mẫu thay vì giá trị có tần số lớn nhất.',
      'Nhầm lẫn công thức trung vị giữa n chẵn và n lẻ.',
    ],
  },
  aiError: {
    category: 'Lỗi phương pháp',
    wrongSolution: 'AI viết: Mẫu số liệu 10, 12, 12, 14, 15, 15, 16, 18, 20, 88 có số trung bình 22 giờ nên đa số nhân viên làm thêm khoảng 22 giờ.',
    correction: 'Số trung bình 22 giờ bị giá trị ngoại lai 88 kéo lệch; thực tế có 9/10 nhân viên làm ≤ 20 giờ. Đại diện đúng cho đa số là trung vị Me = 15 giờ.',
    proof: '90% dữ liệu nằm trong đoạn [10; 20]. Khoảng cách từ 22 đến 88 là 66, đã làm tăng tổng số giờ thêm 88 - 15 = 73 giờ, làm sai lệch kết luận về đa số.',
    whyAiError: 'Mô hình máy móc dùng số trung bình làm đại diện cho mọi tập dữ liệu mà không kiểm tra độ lệch do giá trị ngoại lai.',
    teacherPrompt: 'AI kết luận đa số nhân viên làm thêm khoảng 22 giờ. Em hãy chỉ lỗi sai và sửa lại: dùng số đặc trưng nào phản ánh đúng số đông?',
    studentProduct: 'Ghi “Lỗi phương pháp: dùng trung bình khi có ngoại lai”, khoanh số 88 và sửa lại thành trung vị Me = 15 giờ.',
    boardPrompt: 'AI dùng số trung bình 22 giờ làm đại diện cho dãy có giá trị 88. Số đo nào bền vững trước ngoại lai?',
    libraryTitle: 'Lỗi AI dùng số trung bình khi mẫu có giá trị ngoại lai',
  },
};

export default [L89];

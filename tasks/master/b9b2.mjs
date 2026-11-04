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

// Bài 8: 11-12-85 — Giới hạn của dãy số (Tiết 2: Quy tắc tính giới hạn, Tổng CSN lùi vô hạn)
const L85 = {
  ...base('11-12-85', 85, 'formation'),
  title: 'Giới hạn của dãy số',
  goals: {
    must: 'Nắm vững các phép toán trên giới hạn hữu hạn (tổng, hiệu, tích, thương); tính tổng CSN lùi vô hạn S = u1/(1-q).',
    should: 'Thành thạo phương pháp chia cả tử và mẫu cho lũy thừa bậc cao nhất của n; xử lý dạng vô định cơ bản.',
    could: 'Biểu diễn số thập phân vô hạn tuần hoàn dưới dạng phân số tối giản qua cấp số nhân lùi vô hạn.',
  },
  opening: 'Tổng vô hạn các số hạng dương 1/2 + 1/4 + 1/8 + ... có bằng một số hữu hạn không? Hôm nay ta dùng tổng cấp số nhân lùi vô hạn để giải mã nghịch lý Zeno.',
  focusQuestion: 'Khi gặp giới hạn dạng phân thức hữu tỉ lim P(n)/Q(n), phương pháp mẫu mực để khử dạng vô định là gì?',
  axis: `**Tình huống: Nghịch lý chia bánh Zeno và bài toán tổng cấp số nhân lùi vô hạn:**
- Ta có một chiếc bánh. Lần 1 lấy $1/2$ chiếc; lần 2 lấy $1/4$; lần 3 lấy $1/8$; ...; lần $n$ lấy $1/2^n$.
- Tổng lượng bánh lấy được sau $n$ lần là:
  $$S_n = \\dfrac{1}{2} + \\dfrac{1}{4} + \\dfrac{1}{8} + \\dots + \\dfrac{1}{2^n}.$$
- Đây là tổng $n$ số hạng đầu của cấp số nhân có $u_1 = 1/2$, công bội $q = 1/2$ ($|q| < 1$).
  $$S_n = u_1 \\dfrac{1 - q^n}{1 - q} = \\dfrac{1}{2} \\cdot \\dfrac{1 - (1/2)^n}{1 - 1/2} = 1 - \\left(\\dfrac{1}{2}\\right)^n.$$
- Khi cho $n \\to +\\infty$, vì $\\lim (1/2)^n = 0$ nên:
  $$S = \\lim S_n = 1 - 0 = 1.$$
- **Công thức tổng quát cấp số nhân lùi vô hạn ($|q| < 1$):**
  $$S = u_1 + u_1 q + u_1 q^2 + \\dots = \\dfrac{u_1}{1 - q}.$$
- **Ứng dụng chuyển đổi số thập phân tuần hoàn:**
  $$0{,}(3) = 0{,}333\\dots = \\dfrac{3}{10} + \\dfrac{3}{100} + \\dots = \\dfrac{3/10}{1 - 1/10} = \\dfrac{3/10}{9/10} = \\dfrac{1}{3}.$$`,
  s1: {
    title: 'Tổng vô hạn có bằng 1?',
    context: 'Tổng S = 1/2 + 1/4 + 1/8 + 1/16 + ... tiếp diễn mãi mãi không dừng.',
    question: 'Giá trị của tổng vô hạn S bằng bao nhiêu?',
    options: ['Bằng vô cực (vì cộng vô hạn số dương)', 'Bằng đúng 1', 'Bé hơn 1'],
    correct: 1,
    why: 'Tổng hữu hạn Sn = 1 - (1/2)^n; khi n tiến ra vô cực thì (1/2)^n tiến về 0, do đó lim Sn = 1.',
    discuss: ['`[PHÁT HIỆN]` Vì sao cộng vô hạn số dương lại ra một số hữu hạn?', '`[SO SÁNH]` Nếu q = 1 thì tổng 1 + 1 + 1 + ... có giới hạn hữu hạn không?'],
    cue: 'Vẽ hình vuông cạnh 1, chia đôi liên tiếp: các mảnh ghép vừa khít diện tích bằng 1.',
    lookFor: 'HS hiểu tổng lùi vô hạn hội tụ về một số hữu hạn.',
  },
  s3: {
    title: 'Các quy tắc tính giới hạn và CSN lùi vô hạn',
    steps: [
      'Phép toán: $\\lim(u_n \\pm v_n) = a \\pm b$; $\\lim(u_n v_n) = ab$; $\\lim(u_n / v_n) = a/b$ ($b \\ne 0$).',
      'Giới hạn căn: Nếu $u_n \\ge 0$ và $\\lim u_n = a$ thì $a \\ge 0$ và $\\lim \\sqrt{u_n} = \\sqrt{a}$.',
      'Kỹ thuật phân thức: Chia cả tử và mẫu cho $n^k$ với $k$ là bậc cao nhất của mẫu.',
      'Cấp số nhân lùi vô hạn ($|q| < 1$): $S = \\dfrac{u_1}{1 - q}$.',
    ],
    ask: ['`[SUY LUẬN]` Khi bậc tử bằng bậc mẫu, giới hạn phân thức bằng gì?', '`[PHÁT HIỆN]` Khi nào thì cấp số nhân được gọi là lùi vô hạn?'],
    cue: 'Bảng đối chiếu quy tắc chia lũy thừa bậc cao nhất.',
    close: 'Tách biểu thức về các giới hạn cơ bản 1/n^k -> 0; CSN lùi vô hạn chỉ áp dụng khi |q| < 1.',
  },
  s4: {
    bat: 'AI giải: Tính tổng S = 1 + 2 + 4 + 8 + ...: AI áp dụng công thức S = u1/(1-q) với u1 = 1, q = 2 được S = 1/(1-2) = -1.',
    chung: 'Tổng các số nguyên dương tăng dần 1 + 2 + 4 + ... không thể bằng số âm -1. Công thức S = u1/(1-q) chỉ áp dụng khi |q| < 1.',
    sua: 'Ở đây q = 2 > 1 nên cấp số nhân không lùi vô hạn; tổng tăng vô hạn ra +∞, không có giới hạn hữu hạn.',
    cue: 'Yêu cầu HS kiểm tra điều kiện |q| < 1 trước khi dùng công thức.',
    lookFor: 'HS phát hiện điều kiện |q| < 1 bị vi phạm.',
  },
  s6: {
    hints: {
      M: 'chia cả tử và mẫu cho bậc cao nhất của n; thay các phân số dạng c/n^k bằng 0.',
      S: 'nhớ công thức CSN lùi vô hạn S = u1/(1-q) và luôn kiểm tra điều kiện |q| < 1.',
      C: 'phân tích số thập phân vô hạn tuần hoàn 0,(ab) thành tổng CSN có u1 = ab/100, q = 1/100.',
    },
    lookFor: 'HS M tính đúng giới hạn phân thức; HS S tính đúng tổng CSN; HS C đổi số thập phân ra phân số.',
  },
  postCheck: {
    q: 'Tính giới hạn: $\\lim \\dfrac{4n^2 + 3n - 1}{2n^2 + 5}$ và tính tổng $S = 2 + 1 + 1/2 + 1/4 + \\dots$',
    a: '(a) Chia cả tử và mẫu cho $n^2$: $\\lim \\dfrac{4 + 3/n - 1/n^2}{2 + 5/n^2} = \\dfrac{4+0-0}{2+0} = 2$. (b) $u_1 = 2, q = 1/2$: $S = \\dfrac{2}{1 - 1/2} = 4$.',
    ds: [
      { t: '\"lim (u_n / v_n) = lim u_n / lim v_n luôn đúng với mọi dãy v_n\"', v: 'Sai — mẫu phải có giới hạn khác 0' },
      { t: '\"Tổng cấp số nhân lùi vô hạn có công thức S = u1 / (1 - q) với |q| < 1\"', v: 'Đúng' },
      { t: '\"lim [(3n+1)/(n+2)] = 3\"', v: 'Đúng' },
    ],
    cue: 'Đổi phiếu chấm chéo, kiểm tra điều kiện mẫu khác 0.',
  },
  s8Close: 'Phân thức: chia bậc cao nhất của mẫu; CSN lùi vô hạn: S = u1/(1-q) với điều kiện bắt buộc |q| < 1.',
  s9: {
    title: 'Ứng dụng trong kinh tế và tính giá trị hiện tại dòng tiền',
    bullets: [
      'Trong tài chính, giá trị hiện tại của một dòng tiền vĩnh viễn (perpetuity) tính bằng tổng CSN lùi vô hạn: PV = C / r.',
      'Định giá cổ phiếu trả cổ tức đều đặn vô hạn dựa trên mô hình chiết khấu Gordon.',
      'Quy đổi chính xác các khoản thanh toán định kỳ trong bảo hiểm và quỹ hưu trí.',
    ],
    cue: 'Hỏi: \"Một khoản tài trợ trao học bổng 100 triệu mỗi năm mãi mãi cần số vốn ban đầu bao nhiêu nếu lãi suất 5%?\"',
  },
  exit: [
    'Nêu phương pháp tính giới hạn dạng phân thức lim P(n)/Q(n).',
    'Nêu 1 bẫy (dùng công thức S = u1/(1-q) khi |q| ≥ 1).',
    'Tự đánh giá M / S / C.',
    'Chuyển số thập phân vô hạn tuần hoàn 0,(6) thành phân số tối giản.',
  ],
  exitCue: 'Nhìn lại nghịch lý Zeno và hình vuông cạnh 1.',
  after: '- HS hoàn thành bài tập về quy tắc giới hạn và CSN lùi vô hạn; chuẩn bị bài Hình lăng trụ và hình hộp.',
  snapshot: {
    focus: 'Nắm vững các định lý về giới hạn hữu hạn; thành thạo phương pháp chia lũy thừa bậc cao nhất; tính tổng cấp số nhân lùi vô hạn và đổi số thập phân tuần hoàn.',
    formulas: [
      '\\lim (u_n \\pm v_n) = a \\pm b; \\quad \\lim (u_n v_n) = ab; \\quad \\lim \\dfrac{u_n}{v_n} = \\dfrac{a}{b} \\; (b \\ne 0)',
      '\\lim \\sqrt{u_n} = \\sqrt{a} \\quad (a \\ge 0)',
      'S = \\dfrac{u_1}{1 - q} \\quad (|q| < 1)',
      '0{,}(a) = \\dfrac{a}{9}; \\quad 0{,}(ab) = \\dfrac{ab}{99}',
    ],
    boardKnowledge: [
      'I. Quy tắc: Giới hạn tổng/hiệu/tích/thương bằng tổng/hiệu/tích/thương các giới hạn.',
      'II. Phân thức hữu tỉ: Chia cả tử và mẫu cho n^k với k là bậc cao nhất của mẫu.',
      'III. Cấp số nhân lùi vô hạn: Điều kiện bắt buộc |q| < 1; Công thức S = u1 / (1 - q).',
    ],
    examples: [
      {
        question: 'Tính giới hạn: lim (6n³ - 2n + 1) / (3n³ + 5n²).',
        solution: 'Chia cả tử và mẫu cho n³: lim [6 - 2/n² + 1/n³] / [3 + 5/n] = (6 - 0 + 0)/(3 + 0) = 6/3 = 2.',
      },
      {
        question: 'Tính tổng của cấp số nhân lùi vô hạn: 1/3, 1/9, 1/27, ..., 1/3^n, ...',
        solution: 'u1 = 1/3, q = 1/3 (|q| < 1). Tổng: S = u1 / (1 - q) = (1/3) / (1 - 1/3) = (1/3) / (2/3) = 1/2.',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Tính lim (2 + 1/n).', answer: 'lim 2 + lim(1/n) = 2 + 0 = 2.' },
      { level: 'NB', question: 'Cấp số nhân có u1 = 5, q = -0,2 có phải lùi vô hạn không? Vì sao?', answer: 'Có, vì |q| = |-0,2| = 0,2 < 1.' },
      { level: 'TH', question: 'Tính giới hạn: lim (3n² + 1)/(n² - 4).', answer: 'Chia cả tử và mẫu cho n²: lim (3 + 1/n²)/(1 - 4/n²) = 3/1 = 3.' },
      { level: 'TH', question: 'Tính tổng cấp số nhân lùi vô hạn: S = 1 - 1/2 + 1/4 - 1/8 + ...', answer: 'u1 = 1, q = -1/2 (|q| < 1). S = 1 / [1 - (-1/2)] = 1 / (3/2) = 2/3.' },
      { level: 'VD', question: 'Viết số thập phân vô hạn tuần hoàn 0,(15) dưới dạng phân số tối giản.', answer: '0,(15) = 15/100 + 15/10000 + ... là tổng CSN có u1 = 15/100, q = 1/100. S = (15/100)/(1 - 1/100) = (15/100)/(99/100) = 15/99 = 5/33.' },
      { level: 'VD', question: 'Tính giới hạn: lim [√(n² + 2n) - n].', answer: 'Nhân liên hợp: [n² + 2n - n²] / [√(n² + 2n) + n] = 2n / [n(√(1 + 2/n) + 1)] = 2 / [√(1 + 2/n) + 1]. Khi n -> +∞, giới hạn bằng 2/(1 + 1) = 1.' },
    ],
    quick: [
      { question: 'Nếu bậc của tử nhỏ hơn bậc của mẫu thì giới hạn của phân thức bằng bao nhiêu khi n -> +∞?', solution: 'Bằng 0, vì sau khi chia cho lũy thừa cao nhất của mẫu, tử số tiến về 0 còn mẫu tiến về hằng số khác 0.' },
      { question: 'Có thể áp dụng công thức S = u1/(1-q) cho dãy 3, 3, 3, 3,... không?', solution: 'Không, vì q = 1 vi phạm điều kiện |q| < 1.' },
    ],
    mistakes: [
      'Áp dụng công thức tổng CSN lùi vô hạn khi |q| ≥ 1 dẫn đến kết quả vô lý (tổng dương ra âm).',
      'Chia cho lũy thừa bậc cao nhất của tử thay vì của mẫu dẫn đến xuất hiện dạng 0 ở mẫu.',
      'Quên điều kiện mẫu khác 0 khi dùng quy tắc giới hạn thương.',
    ],
  },
  aiError: {
    category: 'Lỗi điều kiện',
    wrongSolution: 'AI viết: Tính tổng S = 1 + 3 + 9 + 27 + ... Đây là cấp số nhân có u1 = 1, q = 3 nên áp dụng công thức: S = u1 / (1 - q) = 1 / (1 - 3) = -1/2.',
    correction: 'Tổng các số nguyên dương tăng dần không thể bằng số âm -1/2. Công thức S = u1/(1-q) chỉ áp dụng cho cấp số nhân lùi vô hạn (|q| < 1). Sửa lại: q = 3 > 1 nên dãy phân kỳ, tổng tăng vô hạn (+∞).',
    proof: 'Điều kiện tiên quyết của định lý tổng CSN lùi vô hạn là |q| < 1 để lim q^n = 0. Với q = 3 thì q^n -> +∞, dãy Sn = (3^n - 1)/2 không có giới hạn hữu hạn.',
    whyAiError: 'Mô hình ghi nhớ công thức S = u1/(1-q) nhưng không kiểm tra điều kiện kích hoạt định lý |q| < 1.',
    teacherPrompt: 'AI tính tổng 1 + 3 + 9 + ... ra số âm -1/2. Em hãy chỉ lỗi sai và sửa lại: vì sao công thức không được áp dụng ở đây?',
    studentProduct: 'Ghi “Lỗi điều kiện: q = 3 > 1 không phải lùi vô hạn”, kết luận tổng tiến ra vô cực.',
    boardPrompt: 'AI tính tổng các số dương ra -1/2. Điều kiện bắt buộc để áp dụng S = u1/(1-q) là gì?',
    libraryTitle: 'Lỗi AI tính tổng cấp số nhân phân kỳ bằng công thức lùi vô hạn',
  },
};

export default [L85];

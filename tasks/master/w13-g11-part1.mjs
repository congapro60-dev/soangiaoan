const base = (period, lessonType = 'formation') => ({
  key: `11-13-${period}`,
  grade: 11,
  week: 13,
  period,
  lessonType,
  timelineKey: 'default',
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

// 1. 11-13-90: Giới hạn vô cực của dãy số
const L90 = {
  ...base(90, 'formation'),
  title: 'Giới hạn vô cực của dãy số',
  goals: {
    must: 'Hiểu định nghĩa dãy số dần tới vô cực lim un = +∞ hoặc -∞; các giới hạn mẫu lim n^k = +∞, lim q^n = +∞ (q > 1).',
    should: 'Thành thạo quy tắc tìm giới hạn của tích và thương khi có yếu tố vô cực; đặt lũy thừa bậc cao nhất ra ngoài làm nhân tử chung.',
    could: 'Chứng minh giới hạn vô cực bằng bất đẳng thức; phân biệt các dạng vô định ∞ - ∞ và ∞/∞.',
  },
  opening: 'Sự bùng nổ dân số vi khuẩn theo cấp số nhân tăng trưởng không có giới hạn trên — hôm nay ta tìm hiểu khái niệm toán học: giới hạn vô cực.',
  focusQuestion: 'Khi n tiến ra vô cực, đa thức P(n) có giới hạn được quyết định hoàn toàn bởi số hạng nào?',
  axis: `**Mô hình tăng trưởng số lượng tế bào nấm men theo thời gian:**
- Ban đầu có 1 tế bào, sau mỗi chu kỳ $n$ giờ số lượng tế bào phân chia theo cấp số nhân:
  $$u_n = 2^n \\quad (n = 1, 2, 3, \\dots).$$
- Khảo sát các giá trị khi $n$ tăng:
  - $n = 10 \\implies u_{10} = 1024$ tế bào.
  - $n = 20 \\implies u_{20} = 1\\,048\\,576$ tế bào (vượt 1 triệu).
  - $n = 30 \\implies u_{30} = 1\\,073\\,741\\,824$ tế bào (vượt 1 tỷ).
- **Nhận xét trực quan:** Số hạng $u_n$ có thể lớn hơn bất kỳ số dương lớn tùy ý nào kể từ một số hạng nào đó trở đi.
- Ký hiệu: $\\lim_{n \\to +\\infty} u_n = +\\infty$ hay $\\lim 2^n = +\\infty$.
- **Định nghĩa tổng quát:** Dãy số $(u_n)$ có giới hạn là $+\\infty$ nếu $u_n$ lớn hơn mọi số dương lớn tùy ý kể từ một số hạng nào đó trở đi.
- Quy tắc đa thức: $\\lim (a_k n^k + \\dots + a_0) = \\lim n^k (a_k + \\dots) = \\text{dấu}(a_k) \\cdot (+\\infty)$.`,
  s1: {
    title: 'Số lượng tế bào vượt mọi ngưỡng',
    context: 'Dãy số u_n = 2^n tăng trưởng theo từng giờ. Sau 30 giờ số tế bào vượt 1 tỷ.',
    question: 'Giới hạn của dãy u_n khi n tiến ra vô cực là gì?',
    options: ['Tiến ra dương vô cực (+∞)', 'Bằng 1 tỷ', 'Không xác định'],
    correct: 0,
    why: 'Vì cơ số q = 2 > 1 nên 2^n tăng không bị chặn, lớn hơn mọi số dương M tùy ý, lim 2^n = +∞.',
    discuss: ['`[PHÁT HIỆN]` Dãy v_n = -n³ có giới hạn bằng bao nhiêu?', '`[SO SÁNH]` Giới hạn +∞ và không có giới hạn khác nhau như thế nào?'],
    cue: 'Vẽ đồ thị hàm số mũ 2^n vọt thẳng đứng lên phía trên.',
    lookFor: 'HS phân biệt dãy phân kỳ ra vô cực và dãy dao động.',
  },
  s3: {
    title: 'Các giới hạn vô cực cơ bản và quy tắc tính',
    steps: [
      'Giới hạn cơ bản 1: $\\lim n^k = +\\infty$ với mọi $k$ nguyên dương ($k \\ge 1$).',
      'Giới hạn cơ bản 2: $\\lim q^n = +\\infty$ khi $q > 1$.',
      'Quy tắc nhân tử chung: Rút lũy thừa bậc cao nhất của $n$ ra ngoài: $\\lim P(n) = \\lim n^k [a_k + P_{k-1}(n)/n^k]$.',
      'Quy tắc thương $u_n / v_n$: Nếu $\\lim u_n = a > 0$ và $\\lim v_n = 0$ với $v_n > 0$ thì $\\lim (u_n / v_n) = +\\infty$.',
    ],
    ask: ['`[SUY LUẬN]` Giới hạn của -5n² khi n -> +∞ bằng gì?', '`[PHÁT HIỆN]` Khi nào thương của hai dãy tiến về 0 ra vô cực?'],
    cue: 'Bảng quy tắc dấu khi nhân và chia với vô cực.',
    close: 'Rút lũy thừa bậc cao nhất ra ngoài để cô lập phần tiến ra vô cực và phần tiến về hằng số.',
  },
  s4: {
    bat: 'AI giải: Tính lim (n² - n³): AI viết lim n² = +∞ và lim n³ = +∞ nên lim (n² - n³) = +∞ - (+∞) = 0.',
    chung: 'Dạng ∞ - ∞ là một dạng vô định, không được thực hiện phép trừ đại số như hai số hữu hạn. Bậc cao nhất n³ sẽ chi phối toàn bộ biểu thức.',
    sua: 'Phải rút n³ ra ngoài: n² - n³ = n³ (1/n - 1). Vì lim n³ = +∞ và lim (1/n - 1) = -1 < 0 nên giới hạn bằng -∞.',
    cue: 'Nhắc lại: vô cực không phải là một số, không có phép tính ∞ - ∞ = 0.',
    lookFor: 'HS nhận diện dạng vô định và rút lũy thừa cao nhất.',
  },
  s6: {
    hints: {
      M: 'rút lũy thừa bậc cao nhất của n ra ngoài ngoặc; tính giới hạn của từng thừa số.',
      S: 'áp dụng quy tắc xét dấu: tích của (+∞) với số âm ra (-∞); tích với số dương ra (+∞).',
      C: 'nhân lượng liên hợp để khử dạng vô định ∞ - ∞ đối với biểu thức chứa căn thức.',
    },
    lookFor: 'HS M rút đúng nhân tử; HS S xét đúng dấu; HS C nhân liên hợp thành thạo.',
  },
  postCheck: {
    q: 'Tính giới hạn: $\\lim (-2n^3 + 5n - 1)$.',
    a: 'Rút $n^3$: $\\lim n^3 (-2 + 5/n^2 - 1/n^3)$. Vì $\\lim n^3 = +\\infty$ và $\\lim (-2 + 5/n^2 - 1/n^3) = -2 < 0$ nên giới hạn bằng $-\\infty$.',
    ds: [
      { t: '\\"lim n^k = +∞ với mọi số nguyên dương k\\"', v: 'Đúng' },
      { t: '\\"∞ - ∞ luôn luôn bằng 0\\"', v: 'Sai — đây là dạng vô định' },
      { t: '\\"Nếu lim un = +∞ và lim vn = -2 thì lim (un · vn) = -∞\\"', v: 'Đúng' },
    ],
    cue: 'Đổi phiếu chấm chéo, chú ý dấu âm của hệ số cao nhất -2.',
  },
  s8Close: 'Bậc cao nhất chi phối; rút n^k ra ngoài; xét dấu thừa số hằng số; ∞ - ∞ phải khử vô định.',
  s9: {
    title: 'Độ phức tạp thuật toán và Big-O trong Khoa học máy tính',
    bullets: [
      'Thời gian chạy của thuật toán khi dữ liệu đầu vào n tăng vô hạn được đo bằng giới hạn vô cực: O(n), O(n²), O(2^n).',
      'Thuật toán có độ phức tạp lũy thừa O(2^n) bị xem là không khả thi vì thời gian chạy tiến ra vô cực quá nhanh.',
      'Tối ưu hóa mã nguồn là tìm cách kéo giảm bậc của n khi n tiến ra vô cực.',
    ],
    cue: 'Hỏi: \\"Tại sao các lập trình viên luôn tránh dùng thuật toán có thời gian chạy O(2^n)?\\"',
  },
  exit: [
    'Nêu định nghĩa lim un = +∞ và các giới hạn mẫu.',
    'Nêu 1 bẫy (lấy ∞ - ∞ = 0 mà không rút nhân tử chung).',
    'Tự đánh giá M / S / C.',
    'Tính lim (4n² - n) khi n tiến ra vô cực.',
  ],
  exitCue: 'Nhìn lại đồ thị tăng trưởng nấm men mở đầu.',
  after: '- Chuẩn bị tiết tiếp theo: Luyện tập giới hạn của dãy số.',
  snapshot: {
    focus: 'Hình thành định nghĩa giới hạn vô cực của dãy số; nắm vững các giới hạn cơ bản lim n^k = +∞, lim q^n = +∞ (q > 1); quy tắc nhân tử chung và xét dấu.',
    formulas: [
      '\\lim n^k = +\\infty \\quad (k \\in \\mathbb{Z}^+); \\quad \\lim q^n = +\\infty \\quad (q > 1)',
      '\\lim [u_n \\cdot v_n]: \\text{nếu } \\lim u_n = \\pm\\infty \\text{ và } \\lim v_n = a \
e 0 \\implies \\text{xét dấu } (\\pm \\cdot \\text{dấu } a)',
      '\\lim \\dfrac{u_n}{v_n} = +\\infty \\quad (\\lim u_n = a > 0, \\lim v_n = 0, v_n > 0)',
    ],
    boardKnowledge: [
      'I. Giới hạn vô cực: Số hạng vượt qua mọi ngưỡng dương tùy ý (tiến ra +∞) hoặc âm (tiến ra -∞).',
      'II. Đa thức: Rút lũy thừa bậc cao nhất ra ngoài làm nhân tử chung.',
      'III. Dạng vô định ∞ - ∞: Tuyệt đối không trừ trực tiếp; phải rút nhân tử hoặc nhân liên hợp.',
    ],
    examples: [
      {
        question: 'Tính giới hạn: lim (3n² - 5n + 2).',
        solution: 'Rút n² ra ngoài: lim n² (3 - 5/n + 2/n²). Vì lim n² = +∞ và lim (3 - 5/n + 2/n²) = 3 > 0 nên giới hạn bằng +∞.',
      },
      {
        question: 'Tính giới hạn: lim (2 - 3^n).',
        solution: 'Rút 3^n ra ngoài: lim 3^n (2/3^n - 1). Vì lim 3^n = +∞ và lim (2/3^n - 1) = -1 < 0 nên giới hạn bằng -∞.',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Tính lim (n⁴).', answer: 'lim n⁴ = +∞ theo công thức cơ bản lim n^k = +∞ với k = 4.' },
      { level: 'NB', question: 'Dãy u_n = (1,5)^n có giới hạn bằng bao nhiêu?', answer: 'Bằng +∞ vì cơ số q = 1,5 > 1.' },
      { level: 'TH', question: 'Tính giới hạn: lim (-4n³ + 2n² + 1).', answer: 'Rút n³: lim n³ (-4 + 2/n + 1/n³) = (+∞) · (-4) = -∞.' },
      { level: 'TH', question: 'Tính giới hạn: lim [(2n + 1) / (1/n)].', answer: 'Biểu thức bằng 2n² + n. Khi n -> +∞ giới hạn bằng +∞.' },
      { level: 'VD', question: 'Tính giới hạn: lim [√(n² + 4n) - n].', answer: 'Dạng ∞ - ∞. Nhân liên hợp: lim [4n / (√(n² + 4n) + n)] = lim [4 / (√(1 + 4/n) + 1)] = 4 / (1 + 1) = 2.' },
      { level: 'VD', question: 'Tìm a để giới hạn lim (an² + 2n) / (3n - 1) = -∞.', answer: 'Chia bậc cao nhất: để giới hạn bằng -∞ thì bậc tử phải lớn hơn bậc mẫu và dấu của a phải âm. Vì bậc tử là 2 > bậc mẫu là 1 nên ta cần a < 0.' },
    ],
    quick: [
      { question: 'Có phải mọi dãy số tăng đều tiến ra dương vô cực không?', solution: 'Không, dãy tăng nhưng bị chặn trên thì tiến về một số hữu hạn (ví dụ u_n = 1 - 1/n tiến về 1).' },
      { question: 'Dãy (-2)^n có giới hạn bằng +∞ không?', solution: 'Không, dãy đan dấu (-2, 4, -8, 16,...) dao động không có giới hạn.' },
    ],
    mistakes: [
      'Xem vô cực như một con số và thực hiện phép trừ ∞ - ∞ = 0.',
      'Quên xét dấu của hệ số khi nhân với +∞ dẫn đến sai dấu kết quả.',
      'Nhầm dãy dao động (-q)^n với dãy hội tụ hoặc phân kỳ ra vô cực.',
    ],
  },
  aiError: {
    category: 'Lỗi đại số',
    wrongSolution: 'AI viết: Tính lim (2n² - 3n³). Ta có lim 2n² = +∞ và lim 3n³ = +∞ nên lim (2n² - 3n³) = +∞ - (+∞) = 0.',
    correction: '∞ - ∞ là dạng vô định, không được trừ triệt tiêu bằng 0. Sửa lại: Rút n³ ra ngoài làm nhân tử chung: lim n³ (2/n - 3) = (+∞) · (-3) = -∞.',
    proof: 'Ta có 2n² - 3n³ = n³ (2/n - 3). Khi n ≥ 1 thì 2/n ≤ 2 nên 2/n - 3 ≤ -1 < 0. Do đó 2n² - 3n³ ≤ -n³ -> -∞ khi n -> +∞.',
    whyAiError: 'Mô hình tự động áp dụng quy tắc trừ đại số a - a = 0 lên hai biểu thức cùng tiến ra vô cực.',
    teacherPrompt: 'AI tính lim (2n² - 3n³) = 0 vì lấy ∞ - ∞. Em hãy chỉ lỗi đại số và sửa lại: phương pháp chuẩn để tính là gì?',
    studentProduct: 'Ghi “Lỗi đại số: vô định ∞ - ∞ không bằng 0”, rút n³ và sửa thành kết quả -∞.',
    boardPrompt: 'AI trừ hai vô cực thành 0. Dạng ∞ - ∞ phải xử lý bằng phương pháp nào?',
    libraryTitle: 'Lỗi AI trừ triệt tiêu dạng vô định vô cực trừ vô cực bằng 0',
  },
};

// 2. 11-13-91: Luyện tập giới hạn của dãy số
const L91 = {
  ...base(91, 'practice'),
  title: 'Luyện tập giới hạn của dãy số',
  goals: {
    must: 'Khử thành thạo các dạng vô định ∞/∞ và ∞ - ∞ của dãy số bằng phương pháp chia lũy thừa hoặc nhân liên hợp.',
    should: 'Tính đúng giới hạn dãy số chứa căn thức bậc hai và biểu thức lũy thừa mũ an.',
    could: 'Vận dụng định lý kẹp để tìm giới hạn các dãy có chứa hàm lượng giác hoặc phần nguyên.',
  },
  opening: 'Hôm nay ta tổng ôn và thuần thục toàn bộ các kỹ thuật tính giới hạn dãy số: từ phân thức hữu tỉ, căn thức liên hợp đến biểu thức lũy thừa mũ.',
  focusQuestion: 'Khi nào cần dùng phương pháp rút nhân tử chung và khi nào BẮT BUỘC phải nhân lượng liên hợp?',
  axis: `**Bảng phân loại chiến lược tính giới hạn dãy số:**
1. **Dạng phân thức hữu tỉ $\\dfrac{P(n)}{Q(n)}$ (dạng $\\dfrac{\\infty}{\\infty}$):**
   - Chia cả tử và mẫu cho $n^k$ với $k$ là bậc cao nhất của mẫu.
   - Bậc tử = Bậc mẫu $\\implies$ Giới hạn = Tỉ số hệ số cao nhất.
   - Bậc tử < Bậc mẫu $\\implies$ Giới hạn = $0$.
   - Bậc tử > Bậc mẫu $\\implies$ Giới hạn = $\\pm\\infty$.
2. **Dạng vô định căn thức $\\infty - \\infty$:**
   - Ví dụ: $\\lim [\\sqrt{n^2 + 2n} - n]$. Hai hệ số bậc cao nhất bằng nhau ($1 = 1$) $\\implies$ **Bắt buộc nhân lượng liên hợp**:
     $$\\sqrt{n^2 + 2n} - n = \\dfrac{n^2 + 2n - n^2}{\\sqrt{n^2 + 2n} + n} = \\dfrac{2n}{n(\\sqrt{1 + 2/n} + 1)} = \\dfrac{2}{\\sqrt{1 + 2/n} + 1} \\to 1.$$
   - Nếu hai hệ số khác nhau (ví dụ $\\sqrt{4n^2 + 1} - n$) $\\implies$ Chỉ cần rút $n$ ra ngoài: $n(\\sqrt{4 + 1/n^2} - 1) \\to +\\infty$.`,
  s1: {
    title: 'Khi nào bắt buộc nhân liên hợp?',
    context: 'Xét hai biểu thức: A = √(n² + 2n) - n và B = √(4n² + 1) - n khi n -> +∞.',
    question: 'Biểu thức nào BẮT BUỘC phải nhân lượng liên hợp để khử dạng vô định?',
    options: ['Biểu thức A (hệ số bậc cao nhất triệt tiêu nhau: 1 - 1 = 0)', 'Biểu thức B', 'Cả hai biểu thức'],
    correct: 0,
    why: 'Ở biểu thức A: √(n²) - n = n - n = 0 (bậc cao nhất triệt tiêu) nên bắt buộc nhân liên hợp; ở B hệ số là 2 - 1 = 1 > 0 nên chỉ cần rút n ra ngoài.',
    discuss: ['`[PHÁT HIỆN]` Dấu hiệu nhận biết nhanh khi nào phải nhân liên hợp?', '`[SO SÁNH]` Biểu thức √(n² + 1) - √(n² + n) có phải nhân liên hợp không?'],
    cue: 'So sánh hệ số của n ở hai căn thức bậc hai.',
    lookFor: 'HS nhận diện hệ số bậc 1 triệt tiêu thì phải nhân liên hợp.',
  },
  s3: {
    title: 'Hệ thống 3 kỹ thuật khử dạng vô định',
    steps: [
      'Kỹ thuật 1: Chia cho lũy thừa cao nhất của mẫu (áp dụng cho phân thức đại số và biểu thức mũ $a^n$).',
      'Kỹ thuật 2: Nhân lượng liên hợp: $(\\sqrt A - \\sqrt B)(\\sqrt A + \\sqrt B) = A - B$ (khi hệ số cao nhất triệt tiêu).',
      'Kỹ thuật 3: Định lý kẹp: Nếu $v_n \\le u_n \\le w_n$ và $\\lim v_n = \\lim w_n = L$ thì $\\lim u_n = L$.',
    ],
    ask: ['`[SUY LUẬN]` Lượng liên hợp của ∛A - ∛B là gì?', '`[PHÁT HIỆN]` Biểu thức 3^n và 2^n thì cơ số nào chi phối giới hạn?'],
    cue: 'Bảng công thức các hằng đẳng thức liên hợp bậc 2 và bậc 3.',
    close: 'Khử vô định bằng cách chuyển phép trừ thành phép chia qua hằng đẳng thức liên hợp.',
  },
  s4: {
    bat: 'AI giải: Tính lim (3·2^n - 4^n) / (2·4^n + 1). AI chia cả tử và mẫu cho 2^n được kết quả vô cực.',
    chung: 'Với biểu thức chứa hàm số mũ a^n, phải chia cho cơ số LỚN NHẤT ở mẫu là 4^n, không chia cho cơ số nhỏ hơn 2^n.',
    sua: 'Chia cả tử và mẫu cho 4^n: lim [ 3·(2/4)^n - 1 ] / [ 2 + (1/4)^n ] = [ 3·0 - 1 ] / [ 2 + 0 ] = -1/2.',
    cue: 'Nhắc lại: chia cho cơ số lớn nhất để các lũy thừa còn lại có |q| < 1 tiến về 0.',
    lookFor: 'HS chọn đúng cơ số lớn nhất 4^n.',
  },
  s6: {
    hints: {
      M: 'chọn cơ số lớn nhất để chia; thay các số hạng (q)^n bằng 0 khi |q| < 1.',
      S: 'nhân liên hợp tử và mẫu: nhân thêm (√A + B) và chia lại cho chính (√A + B).',
      C: 'tách thêm bớt số hạng thích hợp khi gặp biểu thức vừa chứa căn bậc hai vừa căn bậc ba.',
    },
    lookFor: 'HS M chia đúng cơ số; HS S nhân liên hợp đúng; HS C thêm bớt chuẩn xác.',
  },
  postCheck: {
    q: 'Tính giới hạn: $\\lim [\\sqrt{n^2 + 6n} - n]$.',
    a: 'Nhân liên hợp: $\\lim \\dfrac{n^2 + 6n - n^2}{\\sqrt{n^2 + 6n} + n} = \\lim \\dfrac{6n}{n(\\sqrt{1 + 6/n} + 1)} = \\dfrac{6}{1 + 1} = 3$.',
    ds: [
      { t: '\\"Biểu thức mũ chia cho cơ số lớn nhất ở mẫu\\"', v: 'Đúng' },
      { t: '\\"lim [√(n² + 4) - n] = 0\\"', v: 'Đúng (nhân liên hợp ra 4/(2n) -> 0)' },
      { t: '\\"lim (3^n / 2^n) = 0\\"', v: 'Sai — bằng +∞ vì (3/2)^n có cơ số 1,5 > 1' },
    ],
    cue: 'Đổi phiếu chấm chéo, chú ý rút gọn phân số 6/(1+1) = 3.',
  },
  s8Close: 'Phân thức: chia bậc cao nhất mẫu; Căn thức triệt tiêu: nhân liên hợp; Mũ: chia cơ số lớn nhất.',
  s9: {
    title: 'Hội tụ số học và thuật toán xấp xỉ căn bậc hai Newton',
    bullets: [
      'Thuật toán tính căn bậc hai trong vi xử lý CPU dùng dãy số lặp x_{n+1} = (x_n + a/x_n)/2.',
      'Dãy số này hội tụ cực nhanh về √a chỉ sau 4 đến 5 bước lặp.',
      'Chứng minh tính đúng đắn của phần cứng máy tính dựa trên lý thuyết giới hạn dãy số.',
    ],
    cue: 'Hỏi: \\"Máy tính cầm tay tính căn bậc hai của một số hàng chục chữ số bằng cách nào?\\"',
  },
  exit: [
    'Nêu dấu hiệu nhận biết khi nào phải nhân lượng liên hợp.',
    'Nêu 1 bẫy (chia cho cơ số nhỏ thay vì cơ số lớn nhất ở mẫu).',
    'Tự đánh giá M / S / C.',
    'Tính lim (2^n + 1)/(3·2^n - 5).',
  ],
  exitCue: 'Nhìn lại sự so sánh giữa biểu thức A và B.',
  after: '- Chuẩn bị bài tiếp theo: Giới hạn của hàm số tại một điểm.',
  snapshot: {
    focus: 'Luyện tập tổng hợp các phương pháp khử dạng vô định: chia lũy thừa bậc cao nhất, nhân lượng liên hợp bậc hai và bậc ba, xử lý dãy số chứa cơ số mũ.',
    formulas: [
      '\\sqrt A - \\sqrt B = \\dfrac{A - B}{\\sqrt A + \\sqrt B}',
      '\\sqrt[3]{A} - \\sqrt[3]{B} = \\dfrac{A - B}{\\sqrt[3]{A^2} + \\sqrt[3]{AB} + \\sqrt[3]{B^2}}',
      '\\lim \\dfrac{a_k n^k + \\dots}{b_k n^k + \\dots} = \\dfrac{a_k}{b_k}; \\quad \\lim q^n = 0 \\quad (|q| < 1)',
    ],
    boardKnowledge: [
      'I. Dạng ∞/∞: Chia cho lũy thừa hoặc cơ số lớn nhất của mẫu số.',
      'II. Dạng ∞ - ∞: Nhân liên hợp khi hệ số bậc cao nhất triệt tiêu (hệ số hiệu = 0).',
      'III. Quy tắc kẹp: Dùng cho hàm bị chặn (sin, cos) nhân với dãy tiến về 0.',
    ],
    examples: [
      {
        question: 'Tính giới hạn: lim (5·3^n - 4·2^n) / (2·3^n + 7).',
        solution: 'Chia cả tử và mẫu cho 3^n: lim [ 5 - 4·(2/3)^n ] / [ 2 + 7·(1/3)^n ] = (5 - 0)/(2 + 0) = 5/2.',
      },
      {
        question: 'Tính giới hạn: lim [√(4n² + 3n) - 2n].',
        solution: 'Hệ số: √4 - 2 = 0 -> nhân liên hợp: lim [4n² + 3n - 4n²] / [√(4n² + 3n) + 2n] = lim [3n / (n(√(4 + 3/n) + 2))] = 3 / (2 + 2) = 3/4.',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Tính lim (2n + 3)/(5n - 1).', answer: 'Chia cho n: lim (2 + 3/n)/(5 - 1/n) = 2/5.' },
      { level: 'NB', question: 'Biểu thức liên hợp của (√n - 1) là gì?', answer: 'Là (√n + 1).' },
      { level: 'TH', question: 'Tính giới hạn: lim (3n² - 1)/(n³ + 2).', answer: 'Bậc tử (2) < bậc mẫu (3) -> giới hạn bằng 0.' },
      { level: 'TH', question: 'Tính giới hạn: lim [√(n² + 1) - n].', answer: 'Nhân liên hợp: lim 1/[√(n² + 1) + n] = 0.' },
      { level: 'VD', question: 'Tính giới hạn: lim [√(n² + n + 1) - √(n² - n)].', answer: 'Nhân liên hợp: lim [(n² + n + 1 - n² + n)] / [√(n² + n + 1) + √(n² - n)] = lim (2n + 1) / [n(√(1 + 1/n + 1/n²) + √(1 - 1/n))] = 2 / (1 + 1) = 1.' },
      { level: 'VD', question: 'Tính giới hạn: lim [sin(n!) / n].', answer: 'Ta có |sin(n!)| ≤ 1 nên -1/n ≤ sin(n!)/n ≤ 1/n. Vì lim(-1/n) = lim(1/n) = 0 nên theo định lý kẹp, giới hạn bằng 0.' },
    ],
    quick: [
      { question: 'Nếu lim u_n = 2 và lim v_n = 0 với v_n > 0 thì lim (u_n / v_n) bằng bao nhiêu?', solution: 'Bằng +∞.' },
      { question: 'Tại sao không nhân liên hợp khi tính lim [√(4n² + 1) - n]?', solution: 'Vì hệ số bậc 1 là √4 - 1 = 1 ≠ 0, không phải dạng vô định triệt tiêu; chỉ cần rút n ra ngoài là xong.' },
    ],
    mistakes: [
      'Nhân liên hợp không chia lại mẫu dẫn đến làm sai lệch giá trị biểu thức.',
      'Chia cho cơ số nhỏ thay vì cơ số lớn nhất trong biểu thức mũ.',
      'Quên kiểm tra dấu khi đưa n ra ngoài căn bậc hai.',
    ],
  },
  aiError: {
    category: 'Lỗi phương pháp',
    wrongSolution: 'AI viết: Tính lim [√(n² + 4n) - n]. Rút n ra ngoài: lim n [√(1 + 4/n) - 1] = lim n · (1 - 1) = lim n · 0 = 0.',
    correction: 'Lỗi đồng nhất dạng vô định ∞ · 0 với 0. Khi n -> +∞ và biểu thức trong ngoặc tiến về 0, tích n · (√(1+4/n) - 1) là dạng vô định ∞ · 0, không được gán bằng 0. Sửa lại: Phải nhân liên hợp ra kết quả 4/(1+1) = 2.',
    proof: 'Ta có n · [√(1 + 4/n) - 1] = n · [4/n / (√(1 + 4/n) + 1)] = 4 / [√(1 + 4/n) + 1]. Khi n -> +∞ biểu thức này tiến về 4/2 = 2, hoàn toàn khác 0.',
    whyAiError: 'Mô hình thay số 0 một cách vội vã vào một thừa số trong tích vô định mà không tính toán tốc độ triệt tiêu tương đối.',
    teacherPrompt: 'AI kết luận lim n · 0 = 0 khi giải √(n² + 4n) - n. Em hãy chỉ lỗi phương pháp và sửa lại bằng phép nhân liên hợp đúng.',
    studentProduct: 'Ghi “Lỗi phương pháp: dạng vô định ∞ · 0 không bằng 0”, nhân liên hợp và sửa thành kết quả bằng 2.',
    boardPrompt: 'AI tính tích n · 0 = 0 trong bài toán giới hạn. Dạng vô định ∞ · 0 cần xử lý như thế nào?',
    libraryTitle: 'Lỗi AI ngộ nhận dạng vô định vô cực nhân không bằng không',
  },
};

// 3. 11-13-92: Giới hạn hữu hạn của hàm số tại một điểm
const L92 = {
  ...base(92, 'formation'),
  title: 'Giới hạn hữu hạn của hàm số tại một điểm',
  goals: {
    must: 'Hiểu định nghĩa giới hạn của hàm số tại một điểm lim_{x -> x0} f(x) = L qua ngôn ngữ dãy số.',
    should: 'Nắm vững các phép toán trên giới hạn hàm số; thành thạo phương pháp thay số trực tiếp và khử dạng 0/0 cơ bản bằng phân tích nhân tử.',
    could: 'Khử dạng vô định 0/0 có chứa căn thức bằng nhân liên hợp; áp dụng định lý kẹp cho hàm số.',
  },
  opening: 'Tính vận tốc tức thời của xe máy tại đúng thời điểm t0 đòi hỏi xét tỉ số quãng đường trên thời gian khi khoảng thời gian tiến dần về 0 — đó chính là giới hạn hàm số.',
  focusQuestion: 'Tại sao khi tính lim_{x -> 2} (x² - 4)/(x - 2) ta không thể chỉ đơn giản thay x = 2 vào hàm số?',
  axis: `**Mô hình tính vận tốc tức thời của ô tô chuyển động:**
- Ô tô chuyển động theo phương trình quãng đường: $s(t) = 5t^2$ (mét, $t$ tính bằng giây).
- Vận tốc trung bình trong khoảng thời gian từ $t_0 = 2$ đến $t$ là:
  $$v_{tb} = \\dfrac{s(t) - s(2)}{t - 2} = \\dfrac{5t^2 - 20}{t - 2} = \\dfrac{5(t^2 - 4)}{t - 2}.$$
- Khi $t = 2$, biểu thức có dạng vô định $\\dfrac{0}{0}$ (không có nghĩa số học).
- Với mọi $t \
e 2$, ta rút gọn được:
  $$v_{tb} = \\dfrac{5(t - 2)(t + 2)}{t - 2} = 5(t + 2).$$
- Cho $t$ tiến dần sát tới $2$ ($t \\to 2$):
  $$v(2) = \\lim_{t \\to 2} v_{tb} = \\lim_{t \\to 2} 5(t + 2) = 5(2 + 2) = 20 \\text{ m/s (72 km/h)}.$$
- **Định nghĩa tổng quát:** $\\lim_{x \\to x_0} f(x) = L$ nếu với mọi dãy số $(x_n)$ thuộc tập xác định ($x_n \
e x_0$) mà $x_n \\to x_0$ thì $f(x_n) \\to L$.`,
  s1: {
    title: 'Vận tốc tức thời tại giây thứ 2',
    context: 'Biểu thức vận tốc v(t) = 5(t² - 4)/(t - 2). Khi t tiến rất sát 2 nhưng không bằng 2.',
    question: 'Vận tốc tức thời của ô tô tại thời điểm t = 2 giây là bao nhiêu?',
    options: ['20 m/s', '0 m/s', 'Không xác định vì mẫu bằng 0'],
    correct: 0,
    why: 'Với t ≠ 2 thì 5(t² - 4)/(t - 2) = 5(t + 2). Khi t -> 2 thì 5(t + 2) -> 5(2 + 2) = 20 m/s.',
    discuss: ['`[PHÁT HIỆN]` Giới hạn lim_{x -> x0} f(x) có phụ thuộc vào việc f(x0) có xác định hay không?', '`[SO SÁNH]` Phép khử nhân tử chung (t - 2) dựa trên điều kiện gì của t?'],
    cue: 'Vẽ đồ thị hàm số y = 5(x + 2) bị khoét một điểm rỗng tại x = 2.',
    lookFor: 'HS hiểu x tiến tới x0 nghĩa là x KHÁC x0.',
  },
  s3: {
    title: 'Quy trình tính giới hạn hàm số tại một điểm',
    steps: [
      'Bước 1: Thay trực tiếp $x = x_0$ vào hàm số $f(x)$.',
      'Trường hợp 1 (Xác định): Nếu ra số hữu hạn $L$ thì $\\lim_{x \\to x_0} f(x) = L$.',
      'Trường hợp 2 (Dạng vô định $0/0$): Phân tích tử và mẫu thành nhân tử chứa $(x - x_0)$ rồi triệt tiêu.',
      'Trường hợp 3 (Căn thức $0/0$): Nhân lượng liên hợp để xuất hiện nhân tử $(x - x_0)$ rồi rút gọn.',
    ],
    ask: ['`[SUY LUẬN]` Khi thay x0 vào mà mẫu bằng 0 còn tử khác 0 thì giới hạn ra gì?', '`[PHÁT HIỆN]` Tại sao đa thức x² - 4 luôn phân tích được thành (x - 2)(x + 2)?'],
    cue: 'Sơ đồ cây thuật toán tính giới hạn tại một điểm.',
    close: 'Thay số trước; nếu gặp 0/0 thì phân tích nhân tử hoặc nhân liên hợp để triệt tiêu (x - x0).',
  },
  s4: {
    bat: 'AI giải: Tính lim_{x -> 3} (x² - 9)/(x - 3). AI thay x = 3 được 0/0 và kết luận giới hạn không tồn tại vì phép chia cho 0 không xác định.',
    chung: 'Dạng 0/0 là dạng vô định, không phải là kết luận vô nghiệm hay không tồn tại. x tiến tới 3 chứ x không bao giờ bằng 3.',
    sua: 'Phải khử dạng vô định: (x² - 9)/(x - 3) = (x - 3)(x + 3)/(x - 3) = x + 3. Khi x -> 3 giới hạn bằng 3 + 3 = 6.',
    cue: 'Nhấn mạnh: \\"0/0 là tín hiệu bắt đầu khử vô định, không phải là kết quả cuối cùng\\".',
    lookFor: 'HS nhận ra phải triệt tiêu nhân tử (x - 3).',
  },
  s6: {
    hints: {
      M: 'thay x = x0 vào trước; nếu mẫu khác 0 thì tính luôn giá trị.',
      S: 'dùng hằng đẳng thức hoặc bấm máy tìm nghiệm để tách tử thành a(x - x0)(x - x1).',
      C: 'nhân liên hợp cho phần căn thức: (√A - B)(√A + B) = A - B².',
    },
    lookFor: 'HS M thay số đúng; HS S tách nhân tử thành thạo; HS C nhân liên hợp chuẩn.',
  },
  postCheck: {
    q: 'Tính giới hạn: $\\lim_{x \\to 1} \\dfrac{x^2 + 2x - 3}{x - 1}$.',
    a: 'Thay $x = 1$ ra dạng $0/0$. Tách tử: $x^2 + 2x - 3 = (x - 1)(x + 3)$. Giới hạn $= \\lim_{x \\to 1} (x + 3) = 1 + 3 = 4$.',
    ds: [
      { t: '\\"lim_{x -> x0} c = c với c là hằng số\\"', v: 'Đúng' },
      { t: '\\"Nếu f(x0) không xác định thì lim_{x -> x0} f(x) chắc chắn không tồn tại\\"', v: 'Sai — ví dụ (x²-4)/(x-2) tại x=2' },
      { t: '\\"Dạng 0/0 khử bằng cách triệt tiêu nhân tử (x - x0)\\"', v: 'Đúng' },
    ],
    cue: 'Đổi phiếu chấm chéo, chú ý tách tử thành (x - 1)(x + 3).',
  },
  s8Close: 'Thay số trực tiếp -> Gặp 0/0 thì tách (x - x0) hoặc nhân liên hợp -> Rút gọn rồi thay lại.',
  s9: {
    title: 'Khái niệm đạo hàm và công nghệ cảm biến gia tốc',
    bullets: [
      'Giới hạn tỉ số Δy/Δx khi Δx -> 0 chính là định nghĩa đạo hàm - công cụ quyền lực nhất giải tích.',
      'Cảm biến gia tốc trong điện thoại thông minh (xoay màn hình, đếm bước chân) đo đạo hàm vận tốc tức thời.',
      'Mọi thuật toán vật lý trong phần mềm mô phỏng đều dựa trên giới hạn tỉ số vi phân này.',
    ],
    cue: 'Hỏi: \\"Làm sao điện thoại biết được ta vừa lắc nhẹ hay vung mạnh tay?\\"',
  },
  exit: [
    'Nêu các bước tính giới hạn hàm số tại một điểm.',
    'Nêu 1 bẫy (thấy 0/0 vội kết luận giới hạn không tồn tại).',
    'Tự đánh giá M / S / C.',
    'Tính lim_{x -> 2} (x - 2)/(x² - 4).',
  ],
  exitCue: 'Nhìn lại đồ thị vận tốc tức thời của ô tô.',
  after: '- Chuẩn bị bài tiếp theo: Giới hạn một bên của hàm số.',
  snapshot: {
    focus: 'Hình thành định nghĩa giới hạn hàm số tại một điểm; các định lý về phép toán giới hạn; phương pháp thay số trực tiếp và kỹ thuật khử dạng vô định 0/0.',
    formulas: [
      '\\lim_{x \\to x_0} [f(x) \\pm g(x)] = L \\pm M; \\quad \\lim_{x \\to x_0} [f(x)g(x)] = LM',
      '\\lim_{x \\to x_0} \\dfrac{f(x)}{g(x)} = \\dfrac{L}{M} \\quad (M \
e 0)',
      '\\text{Dạng } \\dfrac{0}{0}: \\dfrac{f(x)}{g(x)} = \\dfrac{(x - x_0)P(x)}{(x - x_0)Q(x)} = \\dfrac{P(x)}{Q(x)}',
    ],
    boardKnowledge: [
      'I. Định nghĩa: x tiến tới x0 (x ≠ x0) thì f(x) tiến dần tới L.',
      'II. Phép toán: Giới hạn của tổng, hiệu, tích, thương bằng tổng, hiệu, tích, thương các giới hạn.',
      'III. Khử dạng 0/0: Triệt tiêu nhân tử chung (x - x0) sau khi phân tích hoặc nhân liên hợp.',
    ],
    examples: [
      {
        question: 'Tính giới hạn: lim_{x -> 2} (3x² - x + 1).',
        solution: 'Thay x = 2 trực tiếp: 3·(2)² - 2 + 1 = 12 - 2 + 1 = 11.',
      },
      {
        question: 'Tính giới hạn: lim_{x -> 3} (x² - 5x + 6) / (x - 3).',
        solution: 'Thay x = 3 ra dạng 0/0. Phân tích: x² - 5x + 6 = (x - 3)(x - 2). Giới hạn = lim_{x -> 3} (x - 2) = 3 - 2 = 1.',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Tính lim_{x -> -1} (2x + 5).', answer: 'Thay x = -1: 2(-1) + 5 = 3.' },
      { level: 'NB', question: 'Biểu thức (x² - 1) khi x tiến về 1 triệt tiêu nhân tử nào?', answer: 'Triệt tiêu nhân tử (x - 1) vì x² - 1 = (x - 1)(x + 1).' },
      { level: 'TH', question: 'Tính lim_{x -> 4} (x² - 16)/(x - 4).', answer: 'lim_{x -> 4} (x - 4)(x + 4)/(x - 4) = lim_{x -> 4} (x + 4) = 4 + 4 = 8.' },
      { level: 'TH', question: 'Tính lim_{x -> 1} (x³ - 1)/(x - 1).', answer: 'x³ - 1 = (x - 1)(x² + x + 1). Giới hạn = lim_{x -> 1} (x² + x + 1) = 1 + 1 + 1 = 3.' },
      { level: 'VD', question: 'Tính giới hạn: lim_{x -> 0} [√(x + 4) - 2] / x.', answer: 'Dạng 0/0. Nhân liên hợp: lim_{x -> 0} (x + 4 - 4) / [x(√(x + 4) + 2)] = lim_{x -> 0} x / [x(√(x + 4) + 2)] = lim_{x -> 0} 1 / [√(x + 4) + 2] = 1 / (2 + 2) = 1/4.' },
      { level: 'VD', question: 'Tìm m để giới hạn lim_{x -> 2} (x² - mx + 2)/(x - 2) là một số hữu hạn.', answer: 'Để giới hạn hữu hạn thì x = 2 phải là nghiệm của tử số: 2² - m·2 + 2 = 0 <=> 6 - 2m = 0 <=> m = 3. Khi m = 3 thì tử là x² - 3x + 2 = (x - 2)(x - 1), giới hạn = 2 - 1 = 1.' },
    ],
    quick: [
      { question: 'Nếu hàm số f(x) liên tục tại x0 thì lim_{x -> x0} f(x) bằng gì?', solution: 'Bằng chính f(x0).' },
      { question: 'Có bao giờ giới hạn tại một điểm ra vô cực không?', solution: 'Có, ví dụ lim_{x -> 0} (1/x²) = +∞.' },
    ],
    mistakes: [
      'Vội vã kết luận giới hạn không tồn tại khi thấy dạng 0/0.',
      'Rút gọn sai dấu khi phân tích tam thức bậc hai.',
      'Quên chia lại lượng liên hợp ở mẫu.',
    ],
  },
  aiError: {
    category: 'Lỗi khái niệm',
    wrongSolution: 'AI viết: Tính lim_{x -> 1} (x² - 1)/(x - 1). Thay x = 1 vào hàm số ta được 0/0. Vì phép chia cho 0 không xác định nên giới hạn không tồn tại.',
    correction: 'Dạng 0/0 là dạng vô định, không đồng nghĩa với không tồn tại giới hạn. Khái niệm giới hạn x -> 1 xét các giá trị x gần 1 nhưng x ≠ 1, do đó ta được phép rút gọn (x - 1). Sửa lại: Triệt tiêu nhân tử (x - 1) để được giới hạn bằng 2.',
    proof: 'Với mọi x ≠ 1: (x² - 1)/(x - 1) = (x - 1)(x + 1)/(x - 1) = x + 1. Theo định nghĩa giới hạn, khi x -> 1 thì x + 1 -> 2. Giới hạn tồn tại và bằng đúng 2.',
    whyAiError: 'Mô hình đánh đồng việc hàm số không xác định tại điểm x0 với việc hàm số không có giới hạn khi x tiến tới x0.',
    teacherPrompt: 'AI kết luận không tồn tại giới hạn vì gặp dạng 0/0. Em hãy chỉ lỗi khái niệm và sửa lại: quy trình tính đúng là gì?',
    studentProduct: 'Ghi “Lỗi khái niệm: 0/0 là dạng vô định, không phải không tồn tại”, rút gọn ra kết quả 2.',
    boardPrompt: 'AI cho rằng 0/0 nghĩa là không có giới hạn. Ý nghĩa thực sự của dạng vô định 0/0 là gì?',
    libraryTitle: 'Lỗi AI đánh đồng dạng vô định không trên không với việc không tồn tại giới hạn',
  },
};

// 4. 11-13-93: Giới hạn một bên của hàm số
const L93 = {
  ...base(93, 'formation'),
  title: 'Giới hạn một bên của hàm số',
  goals: {
    must: 'Hiểu định nghĩa giới hạn bên phải lim_{x -> x0+} f(x) và giới hạn bên trái lim_{x -> x0-} f(x).',
    should: 'Nắm vững điều kiện cần và đủ để hàm số có giới hạn tại một điểm: lim_{x -> x0+} = lim_{x -> x0-} = L.',
    could: 'Tính giới hạn một bên của hàm số phân nhánh (hàm cho bởi nhiều công thức) và hàm chứa dấu giá trị tuyệt đối.',
  },
  opening: 'Khi bật công tắc điện, cường độ dòng điện nhảy vọt tức thì từ 0 lên một giá trị xác định — đồ thị bị gãy bước nhảy, đòi hỏi công cụ giới hạn một bên để khảo sát.',
  focusQuestion: 'Điều kiện cần và đủ để tồn tại giới hạn lim_{x -> x0} f(x) là gì?',
  axis: `**Mô hình bật công tắc cấp nguồn vi mạch điện tử:**
- Cường độ dòng điện $I(t)$ (ampe) theo thời gian $t$ (giây) tại thời điểm đóng mạch $t = 0$:
  $$I(t) = \\begin{cases} 0 & \\text{nếu } t < 0 \\text{ (trước khi bật)} \\\\ 5 & \\text{nếu } t \\ge 0 \\text{ (sau khi bật)} \\end{cases}$$
- Khảo sát giới hạn khi $t$ tiến tới $0$ từ hai phía:
  - Bên trái ($t \\to 0^-$ nghĩa là $t < 0$): $I(t) = 0 \\implies \\lim_{t \\to 0^-} I(t) = 0$.
  - Bên phải ($t \\to 0^+$ nghĩa là $t > 0$): $I(t) = 5 \\implies \\lim_{t \\to 0^+} I(t) = 5$.
- Vì giới hạn bên trái ($0$) khác giới hạn bên phải ($5$) nên **không tồn tại giới hạn hai bên** $\\lim_{t \\to 0} I(t)$.
- **Định lý then chốt:**
  $$\\lim_{x \\to x_0} f(x) = L \\iff \\lim_{x \\to x_0^+} f(x) = \\lim_{x \\to x_0^-} f(x) = L.$$`,
  s1: {
    title: 'Dòng điện có giới hạn tại thời điểm bật?',
    context: 'Trước t=0 dòng điện bằng 0A; sau t=0 dòng điện nhảy lên 5A.',
    question: 'Hàm số dòng điện I(t) có giới hạn khi t tiến về 0 không?',
    options: ['Không tồn tại (vì giới hạn trái khác giới hạn phải)', 'Có giới hạn bằng 5A', 'Có giới hạn bằng 2,5A'],
    correct: 0,
    why: 'Giới hạn trái bằng 0 khác giới hạn phải bằng 5 nên theo định lý không tồn tại giới hạn tại điểm 0.',
    discuss: ['`[PHÁT HIỆN]` Nếu thay đổi giá trị I(0) = 10 thì giới hạn một bên có đổi không?', '`[SO SÁNH]` Hàm số y = |x|/x có giới hạn tại 0 không?'],
    cue: 'Vẽ đồ thị bậc thang có bước nhảy đứt đoạn tại điểm x = 0.',
    lookFor: 'HS nhận diện hai giới hạn một bên khác nhau.',
  },
  s3: {
    title: 'Định nghĩa và định lý giới hạn một bên',
    steps: [
      'Giới hạn bên phải: $x \\to x_0^+$ nghĩa là $x > x_0$ và $x \\to x_0$.',
      'Giới hạn bên trái: $x \\to x_0^-$ nghĩa là $x < x_0$ và $x \\to x_0$.',
      'Định lý tồn tại: $\\lim_{x \\to x_0} f(x) = L \\iff \\lim_{x \\to x_0^+} f(x) = \\lim_{x \\to x_0^-} f(x) = L$.',
      'Hàm phân nhánh: Chọn đúng công thức tương ứng với miền $x > x_0$ hoặc $x < x_0$ để tính.',
    ],
    ask: ['`[SUY LUẬN]` Khi phá dấu giá trị tuyệt đối |x - 2| với x -> 2+ ta được gì?', '`[PHÁT HIỆN]` Nếu chỉ có một trong hai giới hạn một bên tồn tại thì có giới hạn hai bên không?'],
    cue: 'Bảng đối chiếu x -> x0+ (x > x0) và x -> x0- (x < x0).',
    close: 'Muốn có giới hạn tại x0 thì hai nhánh trái và phải phải \\"hàn gắn\\" gặp nhau tại cùng một giá trị L.',
  },
  s4: {
    bat: 'AI giải: Cho f(x) = { 2x + 1 khi x > 1; x² khi x ≤ 1 }. AI tính f(1) = 1 và kết luận ngay lim_{x -> 1} f(x) = 1.',
    chung: 'Hàm phân nhánh không được lấy giá trị tại điểm f(1) làm giới hạn. Phải tính cả hai giới hạn một bên.',
    sua: 'Giới hạn phải: lim_{x -> 1+} (2x + 1) = 3. Giới hạn trái: lim_{x -> 1-} (x²) = 1. Vì 3 ≠ 1 nên không tồn tại lim_{x -> 1} f(x).',
    cue: 'Vẽ hai nhánh đồ thị: một nhánh tiến về 3, một nhánh tiến về 1, không gặp nhau.',
    lookFor: 'HS chỉ ra phải kiểm tra cả hai phía trái và phải.',
  },
  s6: {
    hints: {
      M: 'x -> x0+ chọn công thức x > x0; x -> x0- chọn công thức x < x0.',
      S: 'với hàm chứa |x - x0|: x > x0 thì |x - x0| = x - x0; x < x0 thì |x - x0| = -(x - x0).',
      C: 'tìm tham số m để hai giới hạn một bên bằng nhau để hàm số có giới hạn.',
    },
    lookFor: 'HS M chọn đúng công thức; HS S phá đúng trị tuyệt đối; HS C tìm đúng tham số m.',
  },
  postCheck: {
    q: 'Cho $f(x) = \\dfrac{|x - 2|}{x - 2}$. Tính $\\lim_{x \\to 2^+} f(x)$ và $\\lim_{x \\to 2^-} f(x)$.',
    a: 'Khi $x \\to 2^+ (x > 2)$: $|x - 2| = x - 2 \\implies f(x) = 1 \\implies \\lim = 1$. Khi $x \\to 2^- (x < 2)$: $|x - 2| = -(x - 2) \\implies f(x) = -1 \\implies \\lim = -1$.',
    ds: [
      { t: '\\"x -> 2+ nghĩa là x nhận các giá trị lớn hơn 2\\"', v: 'Đúng' },
      { t: '\\"Nếu giới hạn trái khác giới hạn phải thì không tồn tại giới hạn tại điểm đó\\"', v: 'Đúng' },
      { t: '\\"lim_{x -> 0} (|x|/x) = 1\\"', v: 'Sai — không tồn tại (trái ra -1, phải ra 1)' },
    ],
    cue: 'Đổi phiếu chấm chéo, chú ý dấu âm khi x < 2.',
  },
  s8Close: 'x -> x0+ là x > x0; x -> x0- là x < x0; Giới hạn tồn tại <=> Trái = Phải = L.',
  s9: {
    title: 'Hàm bước nhảy Heaviside trong kỹ thuật điều khiển tự động',
    bullets: [
      'Hàm bước nhảy Heaviside u(t) = 0 (t < 0) và u(t) = 1 (t ≥ 0) là tín hiệu kích hoạt chuẩn trong kỹ thuật điện tử.',
      'Giới hạn một bên mô tả chính xác sự chuyển đổi trạng thái của cổng logic và rơ-le bán dẫn.',
      'Mô hình hóa xung tín hiệu trong mạng viễn thông dựa trên các hàm gián đoạn này.',
    ],
    cue: 'Hỏi: \\"Tại sao tín hiệu số Digital chỉ nhận hai mức 0 và 1 mà không có trạng thái lơ lửng ở giữa?\\"',
  },
  exit: [
    'Nêu điều kiện để hàm số có giới hạn tại x0.',
    'Nêu 1 bẫy (lấy f(x0) làm giới hạn của hàm phân nhánh mà không xét 2 bên).',
    'Tự đánh giá M / S / C.',
    'Tính lim_{x -> 0+} (1/x) và lim_{x -> 0-} (1/x).',
  ],
  exitCue: 'Nhìn lại đồ thị cường độ dòng điện bật công tắc.',
  after: '- Chuẩn bị bài tiếp theo: Phép chiếu song song trong hình học không gian.',
  snapshot: {
    focus: 'Hình thành định nghĩa giới hạn một bên; định lý về sự tồn tại giới hạn hàm số tại một điểm; kỹ năng xử lý hàm phân nhánh và hàm chứa dấu giá trị tuyệt đối.',
    formulas: [
      '\\lim_{x \\to x_0} f(x) = L \\iff \\lim_{x \\to x_0^+} f(x) = \\lim_{x \\to x_0^-} f(x) = L',
      'x \\to x_0^+ \\implies x > x_0, |x - x_0| = x - x_0',
      'x \\to x_0^- \\implies x < x_0, |x - x_0| = -(x - x_0)',
    ],
    boardKnowledge: [
      'I. Giới hạn bên phải: x dần tới x0 với x > x0 (kí hiệu x -> x0+).',
      'II. Giới hạn bên trái: x dần tới x0 với x < x0 (kí hiệu x -> x0-).',
      'III. Định lý: Tồn tại giới hạn <=> Giới hạn trái bằng Giới hạn phải.',
    ],
    examples: [
      {
        question: 'Cho f(x) = 3x - 1 với x ≥ 2 và f(x) = x² + 1 với x < 2. Tìm lim_{x -> 2+} f(x) và lim_{x -> 2-} f(x). Hàm số có giới hạn tại x = 2 không?',
        solution: 'lim_{x -> 2+} f(x) = lim_{x -> 2+} (3x - 1) = 3·2 - 1 = 5. lim_{x -> 2-} f(x) = lim_{x -> 2-} (x² + 1) = 2² + 1 = 5. Vì giới hạn trái bằng giới hạn phải = 5 nên lim_{x -> 2} f(x) = 5.',
      },
      {
        question: 'Tính lim_{x -> 1+} (x² - 1)/|x - 1|.',
        solution: 'Khi x -> 1+ thì x > 1 nên |x - 1| = x - 1. Ta có (x² - 1)/(x - 1) = x + 1. Giới hạn = lim_{x -> 1+} (x + 1) = 1 + 1 = 2.',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Ký hiệu x -> 3- có nghĩa là gì?', answer: 'Có nghĩa là x tiến dần tới 3 và luôn nhỏ hơn 3 (x < 3).' },
      { level: 'NB', question: 'Biết lim_{x -> 2+} f(x) = 4 và lim_{x -> 2-} f(x) = 4. Hỏi lim_{x -> 2} f(x) bằng bao nhiêu?', answer: 'Bằng 4 theo định lý tồn tại giới hạn.' },
      { level: 'TH', question: 'Cho f(x) = 2x với x > 0 và f(x) = 1 với x ≤ 0. Hàm số có giới hạn tại x = 0 không?', answer: 'lim_{x -> 0+} f(x) = 0; lim_{x -> 0-} f(x) = 1. Vì 0 ≠ 1 nên hàm số KHÔNG có giới hạn tại x = 0.' },
      { level: 'TH', question: 'Tính lim_{x -> 3-} (2x - 1).', answer: 'Thay x = 3: 2·3 - 1 = 5.' },
      { level: 'VD', question: 'Tìm m để hàm số f(x) = { mx + 1 khi x ≤ 2; x² - 3 khi x > 2 } có giới hạn tại x = 2.', answer: 'lim_{x -> 2+} f(x) = 2² - 3 = 1. lim_{x -> 2-} f(x) = 2m + 1. Hàm số có giới hạn tại x = 2 <=> 2m + 1 = 1 <=> 2m = 0 <=> m = 0.' },
      { level: 'VD', question: 'Tính giới hạn một bên: lim_{x -> 1-} (x + 1)/(x - 1).', answer: 'Khi x -> 1- thì tử tiến về 1 + 1 = 2 > 0, mẫu tiến về 0 và mẫu âm (x - 1 < 0 vì x < 1). Do đó giới hạn bằng -∞.' },
    ],
    quick: [
      { question: 'Nếu hàm số không xác định tại x0 thì có thể có giới hạn một bên tại x0 không?', solution: 'Có thể, hàm số chỉ cần xác định trên khoảng (x0; x0 + h) hoặc (x0 - h; x0).' },
      { question: 'lim_{x -> 0+} (1/x) bằng bao nhiêu?', solution: 'Bằng +∞ vì tử dương và mẫu tiến về 0 từ phía dương.' },
    ],
    mistakes: [
      'Nhầm ký hiệu x -> x0+ là x tiến tới số dương.',
      'Quên đổi dấu khi phá trị tuyệt đối với x < x0.',
      'Kết luận có giới hạn mà chỉ mới tính một bên.',
    ],
  },
  aiError: {
    category: 'Lỗi điều kiện',
    wrongSolution: 'AI viết: Cho f(x) = { 3x khi x > 1; 2x + 1 khi x < 1 }. Tính lim_{x -> 1+} f(x) = 3 nên kết luận luôn lim_{x -> 1} f(x) = 3.',
    correction: 'Muốn kết luận giới hạn hai bên tại x = 1, bắt buộc phải tính cả giới hạn bên trái. Ở đây lim_{x -> 1-} (2x + 1) = 3, vì cả hai bên bằng nhau nên mới kết luận lim = 3. AI đã bỏ qua bước kiểm tra giới hạn trái.',
    proof: 'Định lý yêu cầu hai điều kiện: lim_{x -> x0+} f(x) = L VÀ lim_{x -> x0-} f(x) = L. Nếu thiếu một trong hai thì không thể khẳng định tồn tại giới hạn hai bên.',
    whyAiError: 'Mô hình kết luận vội vã từ thông tin một phía mà bỏ qua điều kiện cần và đủ của định lý toán học.',
    teacherPrompt: 'AI chỉ tính giới hạn bên phải rồi kết luận luôn giới hạn hai bên. Em hãy chỉ lỗi điều kiện và sửa lại quy trình kiểm tra đầy đủ.',
    studentProduct: 'Ghi “Lỗi điều kiện: thiếu kiểm tra giới hạn bên trái”, tính thêm lim trái và kết luận.',
    boardPrompt: 'AI chỉ xét một bên đã kết luận giới hạn. Để kết luận lim f(x) = L cần kiểm tra mấy phía?',
    libraryTitle: 'Lỗi AI kết luận giới hạn hai bên khi chỉ mới kiểm tra giới hạn một bên',
  },
};

export default [L90, L91, L92, L93];

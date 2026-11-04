const base = (period, lessonType = 'formation') => ({
  key: `10-13-${period}`,
  grade: 10,
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

// 5. 10-13-100: Biểu thức tọa độ và độ dài vectơ
const L100 = {
  ...base(100, 'formation'),
  title: 'Biểu thức tọa độ và độ dài vectơ',
  goals: {
    must: 'Nắm vững công thức tọa độ của vectơ AB = (xB - xA; yB - yA) và độ dài |u| = √(x² + y²).',
    should: 'Tính đúng tọa độ trung điểm I của đoạn thẳng và tọa độ trọng tâm G của tam giác.',
    could: 'Tính khoảng cách giữa hai điểm trong mặt phẳng và ứng dụng kiểm tra tính chất tam giác.',
  },
  opening: 'Tính khoảng cách giữa hai trạm phát sóng di động khi biết tọa độ vị trí của chúng trên bản đồ số — hôm nay ta dùng biểu thức tọa độ của độ dài.',
  focusQuestion: 'Công thức tính độ dài vectơ u = (x; y) xuất phát từ định lý hình học nào quen thuộc?',
  axis: `**Xác định khoảng cách di chuyển của tàu cứu hộ biển:**
- Tàu cứu hộ xuất phát từ trạm hải đăng $A(2; 3)$ đi cứu nạn tàu cá gặp sự cố tại vị trí $B(8; 11)$ (đơn vị: hải lý).
- Vectơ độ dời: $\\vec{AB} = (x_B - x_A; y_B - y_A) = (8 - 2; 11 - 3) = (6; 8)$.
- Khoảng cách cứu hộ (độ dài đoạn thẳng $AB$):
  $$AB = |\\vec{AB}| = \\sqrt{6^2 + 8^2} = \\sqrt{36 + 64} = \\sqrt{100} = 10 \\text{ hải lý}.$$
- Trạm tiếp tế nổi đặt tại trung điểm $I$ của hành trình:
  $$x_I = \\dfrac{2 + 8}{2} = 5; \\quad y_I = \\dfrac{3 + 11}{2} = 7 \\implies I(5; 7).$$`,
  s1: {
    title: 'Khoảng cách hành trình cứu hộ',
    context: 'Tàu đi từ A(2; 3) đến B(8; 11). Vectơ độ dời là AB = (6; 8).',
    question: 'Quãng đường ngắn nhất từ trạm A đến vị trí B là bao nhiêu hải lý?',
    options: ['10 hải lý', '14 hải lý (6 + 8)', '48 hải lý'],
    correct: 0,
    why: 'Độ dài vectơ |AB| = √(6² + 8²) = √100 = 10 hải lý theo định lý Pythagore.',
    discuss: ['`[PHÁT HIỆN]` Vì sao quãng đường không phải là 6 + 8 = 14?', '`[SO SÁNH]` Tọa độ trung điểm I của AB tính như thế nào?'],
    cue: 'Vẽ tam giác vuông với hai cạnh góc vuông là độ lệch hoành độ (6) và độ lệch tung độ (8).',
    lookFor: 'HS áp dụng đúng căn bậc hai của tổng bình phương.',
  },
  s3: {
    title: 'Các biểu thức tọa độ hình học cốt lõi',
    steps: [
      'Tọa độ vectơ qua 2 điểm: $\\vec{AB} = (x_B - x_A; y_B - y_A)$ (ngọn trừ gốc).',
      'Độ dài vectơ: $|\\vec u| = \\sqrt{x^2 + y^2}$; Khoảng cách: $AB = \\sqrt{(x_B - x_A)^2 + (y_B - y_A)^2}$.',
      'Tọa độ trung điểm: $x_I = \\dfrac{x_A + x_B}{2}, y_I = \\dfrac{y_A + y_B}{2}$.',
      'Tọa độ trọng tâm $\\Delta ABC$: $x_G = \\dfrac{x_A + x_B + x_C}{3}, y_G = \\dfrac{y_A + y_B + y_C}{3}$.',
    ],
    ask: ['`[SUY LUẬN]` Khi nào khoảng cách AB = 0?', '`[PHÁT HIỆN]` Vectơ đơn vị có độ dài bằng bao nhiêu?'],
    cue: 'Bảng đối chiếu 4 công thức tọa độ nền tảng.',
    close: 'Tọa độ điểm ngọn trừ tọa độ điểm gốc ra tọa độ vectơ; độ dài bằng căn tổng bình phương tọa độ.',
  },
  s4: {
    bat: 'AI giải: Cho A(1; 4) và B(5; 1). AI tính tọa độ vectơ AB = (1 - 5; 4 - 1) = (-4; 3).',
    chung: 'Tọa độ vectơ AB phải lấy tọa độ điểm ngọn B trừ tọa độ điểm gốc A. AI đã lấy ngược A trừ B.',
    sua: 'Công thức chuẩn: AB = (xB - xA; yB - yA) = (5 - 1; 1 - 4) = (4; -3).',
    cue: 'Nhắc khẩu quyết: \\"Vectơ lấy Ngọn trừ Gốc, không lấy Gốc trừ Ngọn\\".',
    lookFor: 'HS chỉ ra sai thứ tự ngọn - gốc.',
  },
  s6: {
    hints: {
      M: 'áp dụng đúng thứ tự B trừ A; tính độ dài bằng căn(x² + y²).',
      S: 'nhớ chia 2 cho trung điểm và chia 3 cho trọng tâm tam giác.',
      C: 'dùng công thức khoảng cách để chứng minh tam giác vuông cân hoặc tam giác đều.',
    },
    lookFor: 'HS M tính đúng AB; HS S tính đúng I, G; HS C chứng minh hình học.',
  },
  postCheck: {
    q: 'Cho tam giác ABC có A(1; 2), B(3; 0), C(5; 4). Tìm tọa độ trọng tâm G của tam giác ABC.',
    a: '$x_G = (1 + 3 + 5)/3 = 3$; $y_G = (2 + 0 + 4)/3 = 2$. Vậy $G(3; 2)$.',
    ds: [
      { t: '\\"Tọa độ vectơ AB lấy A trừ B\\"', v: 'Sai — phải lấy B trừ A (ngọn trừ gốc)' },
      { t: '\\"Độ dài vectơ u = (x; y) là √(x² + y²)\\"', v: 'Đúng' },
      { t: '\\"Trọng tâm tam giác chia 3, trung điểm chia 2\\"', v: 'Đúng' },
    ],
    cue: 'Đổi phiếu chấm chéo, kiểm tra chia 3 cho trọng tâm.',
  },
  s8Close: 'AB = B - A; |u| = √(x² + y²); Trung điểm chia 2; Trọng tâm chia 3.',
  s9: {
    title: 'Tính toán khoảng cách trong Google Maps và hàng hải',
    bullets: [
      'Bản đồ số phẳng UTM chuyển kinh vĩ độ thành tọa độ Descartes (x, y) đơn vị mét.',
      'Khoảng cách Euclidean giữa hai vị trí tính tức thì qua biểu thức √(Δx² + Δy²).',
      'Thuật toán tìm tài xế Grab/Be gần nhất quét bán kính khoảng cách theo công thức này.',
    ],
    cue: 'Hỏi: \\"Ứng dụng bản đồ trên điện thoại đo khoảng cách theo đường chim bay như thế nào?\\"',
  },
  exit: [
    'Nêu công thức tọa độ vectơ AB và độ dài |AB|.',
    'Nêu 1 bẫy (lấy gốc trừ ngọn khi tìm tọa độ vectơ).',
    'Tự đánh giá M / S / C.',
    'Cho u = (-3; 4), tính độ dài của u.',
  ],
  exitCue: 'Nhìn lại tọa độ trạm hải đăng và tàu cá.',
  after: '- Chuẩn bị bài tiếp theo: Luyện tập tọa độ vectơ trong mặt phẳng.',
  snapshot: {
    focus: 'Hình thành công thức tọa độ vectơ qua hai điểm, độ dài vectơ, khoảng cách giữa hai điểm, tọa độ trung điểm đoạn thẳng và trọng tâm tam giác.',
    formulas: [
      '\\vec{AB} = (x_B - x_A; y_B - y_A)',
      '|\\vec u| = \\sqrt{x^2 + y^2}; \\quad AB = \\sqrt{(x_B - x_A)^2 + (y_B - y_A)^2}',
      'I \\text{ là trung điểm } AB \\implies x_I = \\dfrac{x_A + x_B}{2}, y_I = \\dfrac{y_A + y_B}{2}',
      'G \\text{ là trọng tâm } \\Delta ABC \\implies x_G = \\dfrac{x_A + x_B + x_C}{3}, y_G = \\dfrac{y_A + y_B + y_C}{3}',
    ],
    boardKnowledge: [
      'I. Vectơ AB: Ngọn trừ Gốc (xB - xA; yB - yA).',
      'II. Độ dài & Khoảng cách: Căn tổng bình phương các hiệu tọa độ.',
      'III. Điểm đặc biệt: Trung điểm (chia 2), Trọng tâm (chia 3).',
    ],
    examples: [
      {
        question: 'Cho A(2; -1), B(4; 3). Tính tọa độ vectơ AB và độ dài đoạn thẳng AB.',
        solution: 'AB = (4 - 2; 3 - (-1)) = (2; 4). Độ dài AB = √(2² + 4²) = √20 = 2√5.',
      },
      {
        question: 'Cho tam giác ABC có A(1; 3), B(-2; 1), C(4; 5). Tìm tọa độ trung điểm M của BC và trọng tâm G của tam giác ABC.',
        solution: 'M là trung điểm BC: xM = (-2 + 4)/2 = 1, yM = (1 + 5)/2 = 3 -> M(1; 3). Trọng tâm G: xG = (1 - 2 + 4)/3 = 1, yG = (3 + 1 + 5)/3 = 3 -> G(1; 3).',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Cho A(3; 5) và B(1; 2). Tìm tọa độ vectơ AB.', answer: 'AB = (1 - 3; 2 - 5) = (-2; -3).' },
      { level: 'NB', question: 'Tính độ dài của vectơ u = (6; -8).', answer: '|u| = √(6² + (-8)²) = √(36 + 64) = √100 = 10.' },
      { level: 'TH', question: 'Cho hai điểm M(2; -3) và N(4; 5). Tìm tọa độ trung điểm I của MN.', answer: 'xI = (2 + 4)/2 = 3; yI = (-3 + 5)/2 = 1. Vậy I(3; 1).' },
      { level: 'TH', question: 'Tính khoảng cách giữa hai điểm P(1; 1) và Q(4; 5).', answer: 'PQ = √[(4 - 1)² + (5 - 1)²] = √(3² + 4²) = 5.' },
      { level: 'VD', question: 'Cho A(1; 1), B(3; 2), C(m + 4; m). Tìm m để tam giác ABC vuông tại A.', answer: 'AB = (2; 1), AC = (m + 3; m - 1). Tam giác vuông tại A <=> AB ⊥ AC <=> 2(m + 3) + 1(m - 1) = 0 <=> 3m + 5 = 0 <=> m = -5/3.' },
      { level: 'VD', question: 'Cho A(-1; 2), B(3; 4), C(1; 6). Chứng minh tam giác ABC là tam giác cân tại B và tính diện tích.', answer: 'BA = (-4; -2) -> BA² = 20. BC = (-2; 2) -> BC² = 8? AC = (2; 4) -> AC² = 20. Ta có BA² = AC² = 20 -> tam giác ABC cân tại A. BC = √8 = 2√2. Đường cao h = √(20 - 2) = 3√2. Diện tích S = (1/2) · 2√2 · 3√2 = 6.' },
    ],
    quick: [
      { question: 'Vectơ u = (-5; 0) có độ dài bằng bao nhiêu?', solution: '|u| = √((-5)² + 0²) = √25 = 5 (độ dài luôn không âm).' },
      { question: 'Nếu A trùng B thì vectơ AB có tọa độ là gì?', solution: 'Là (0; 0).' },
    ],
    mistakes: [
      'Lấy gốc trừ ngọn khi tính tọa độ vectơ AB.',
      'Quên dấu ngoặc vuông khi bình phương số âm dẫn đến tính sai căn bậc hai.',
      'Nhầm công thức trung điểm (cộng chia 2) thành trừ.',
    ],
  },
  aiError: {
    category: 'Lỗi quy tắc',
    wrongSolution: 'AI viết: Cho hai điểm A(2; 7) và B(6; 1). Tọa độ vectơ AB là AB = (2 - 6; 7 - 1) = (-4; 6).',
    correction: 'Công thức chuẩn yêu cầu lấy tọa độ điểm ngọn B trừ điểm gốc A: AB = (xB - xA; yB - yA). Sửa lại: AB = (6 - 2; 1 - 7) = (4; -6).',
    proof: 'Ta có OA = (2; 7) và OB = (6; 1). Theo quy tắc trừ vectơ: AB = OB - OA = (6 - 2; 1 - 7) = (4; -6). AI tính ngược thành OA - OB = BA.',
    whyAiError: 'Mô hình học máy nhầm lẫn thứ tự toán hạng trong phép trừ khi chuyển từ ký hiệu hình học sang đại số.',
    teacherPrompt: 'AI tính AB = (-4; 6) từ A(2; 7) và B(6; 1). Em hãy chỉ lỗi sai và sửa lại: quy tắc lấy tọa độ vectơ qua hai điểm là gì?',
    studentProduct: 'Ghi “Lỗi quy tắc: phải lấy ngọn trừ gốc”, sửa thành AB = (4; -6).',
    boardPrompt: 'AI tính AB bằng cách lấy A trừ B. Quy tắc ngọn trừ gốc cho kết quả nào?',
    libraryTitle: 'Lỗi AI tính ngược tọa độ vectơ lấy gốc trừ ngọn',
  },
};

// 6. 10-13-101: Luyện tập tọa độ vectơ trong mặt phẳng
const L101 = {
  ...base(101, 'practice'),
  title: 'Luyện tập tọa độ vectơ trong mặt phẳng',
  goals: {
    must: 'Tính thành thạo tọa độ các phép toán vectơ, tọa độ điểm và độ dài trong hệ trục Oxy.',
    should: 'Tìm tọa độ đỉnh thứ tư của hình bình hành; tìm tọa độ điểm thỏa mãn đẳng thức vectơ cho trước.',
    could: 'Chứng minh ba điểm thẳng hàng bằng tọa độ; tìm điểm trên trục tọa độ thỏa mãn điều kiện cực trị.',
  },
  opening: 'Hôm nay ta luyện tập giải quyết các bài toán hình học phẳng kinh điển bằng phương pháp tọa độ hóa đại số.',
  focusQuestion: 'Làm thế nào để tìm tọa độ đỉnh D của hình bình hành ABCD khi biết tọa độ ba đỉnh A, B, C?',
  axis: `**Xác định vị trí góc thứ tư của giàn khoan dầu khí trên biển:**
- Giàn khoan có 4 trụ neo tạo thành hình bình hành $ABCD$.
- Tọa độ 3 trụ đã định vị: $A(1; 2)$, $B(5; 4)$, $C(3; 8)$.
- Cần xác định tọa độ trụ thứ tư $D(x_D; y_D)$:
  - $ABCD$ là hình bình hành $\\iff \\vec{AB} = \\vec{DC}$.
  - Ta có $\\vec{AB} = (5 - 1; 4 - 2) = (4; 2)$.
  - $\\vec{DC} = (3 - x_D; 8 - y_D)$.
  - Cân bằng tọa độ: $\\begin{cases} 3 - x_D = 4 \\implies x_D = -1 \\\\ 8 - y_D = 2 \\implies y_D = 6 \\end{cases} \\implies D(-1; 6)$.
- **Cách 2 qua trung điểm đường chéo:** Tâm $I$ là trung điểm $AC \\implies I(2; 5)$. $I$ cũng là trung điểm $BD \\implies x_D = 2x_I - x_B = 4 - 5 = -1; y_D = 2y_I - y_B = 10 - 4 = 6$.`,
  s1: {
    title: 'Tọa độ trụ neo thứ tư D',
    context: 'Hình bình hành ABCD có A(1; 2), B(5; 4), C(3; 8).',
    question: 'Tọa độ của đỉnh D là cặp số nào?',
    options: ['D(-1; 6)', 'D(7; 10)', 'D(1; 6)'],
    correct: 0,
    why: 'AB = DC <=> (4; 2) = (3 - xD; 8 - yD) => xD = -1, yD = 6.',
    discuss: ['`[PHÁT HIỆN]` Nếu viết AB = CD thì tứ giác ABCD có phải là hình bình hành không?', '`[SO SÁNH]` Cách dùng trung điểm đường chéo có ưu điểm gì?'],
    cue: 'Vẽ hình bình hành ABCD, chú ý thứ tự các đỉnh quanh chu vi theo chiều kim đồng hồ.',
    lookFor: 'HS viết đúng hệ thức AB = DC (chú ý ngọn D và C).',
  },
  s3: {
    title: 'Hệ thống kỹ năng giải toán tọa độ',
    steps: [
      'Kỹ năng 1: Tìm đỉnh hình bình hành $ABCD \\iff \\vec{AB} = \\vec{DC}$ hoặc $x_A + x_C = x_B + x_D$.',
      'Kỹ năng 2: Chứng minh $A, B, C$ thẳng hàng $\\iff \\vec{AB} = k\\vec{AC} \\iff \\dfrac{x_B - x_A}{x_C - x_A} = \\dfrac{y_B - y_A}{y_C - y_A}$.',
      'Kỹ năng 3: Tìm điểm $M(x; 0) \\in Ox$ hoặc $N(0; y) \\in Oy$ thỏa mãn điều kiện khoảng cách.',
      'Kỹ năng 4: Phân tích vectơ $\\vec c = m\\vec a + n\\vec b$ bằng cách giải hệ phương trình bậc nhất 2 ẩn.',
    ],
    ask: ['`[SUY LUẬN]` Điểm thuộc trục hoành Ox luôn có đặc điểm gì về tọa độ?', '`[PHÁT HIỆN]` Công thức xA + xC = xB + xD xuất phát từ đâu?'],
    cue: 'Bảng tổng kết 4 dạng toán tọa độ then chốt.',
    close: 'ABCD là HBH <=> AB = DC (chú ý DC chứ không phải CD); trung điểm AC trùng trung điểm BD.',
  },
  s4: {
    bat: 'AI giải: ABCD là hình bình hành nên AB = CD. Ta có (4; 2) = (xD - 3; yD - 8) => xD = 7, yD = 10.',
    chung: 'Nếu AB = CD thì tứ giác ABDC mới là hình bình hành, khi đó các đỉnh quanh chu vi bị đảo lộn thành ABDC.',
    sua: 'Hình bình hành ABCD yêu cầu hai vectơ cùng hướng: AB = DC (chứ không phải CD). Sửa lại: D(-1; 6).',
    cue: 'Vẽ hình bình hành và chỉ mũi tên AB và DC cùng hướng; AB và CD ngược hướng.',
    lookFor: 'HS phân biệt AB = DC và AB = CD.',
  },
  s6: {
    hints: {
      M: 'áp dụng công thức nhanh: xD = xA + xC - xB; yD = yA + yC - yB.',
      S: 'lập tỉ số hoành/hoành = tung/tung để chứng minh thẳng hàng.',
      C: 'gọi ẩn tọa độ điểm M(x; 0) trên Ox rồi giải phương trình độ dài.',
    },
    lookFor: 'HS M tìm đúng đỉnh D; HS S chứng minh thẳng hàng; HS C tìm đúng điểm M.',
  },
  postCheck: {
    q: 'Cho ba điểm A(1; 1), B(2; 3), C(4; 7). Hỏi ba điểm A, B, C có thẳng hàng không?',
    a: '$\\vec{AB} = (1; 2)$ và $\\vec{AC} = (3; 6)$. Ta có $3/1 = 6/2 = 3 \\implies \\vec{AC} = 3\\vec{AB}$. Vậy A, B, C thẳng hàng.',
    ds: [
      { t: '\\"ABCD là hình bình hành tương đương AB = CD\\"', v: 'Sai — phải là AB = DC' },
      { t: '\\"Trung điểm AC trùng trung điểm BD trong hình bình hành\\"', v: 'Đúng' },
      { t: '\\"Điểm M thuộc Oy có hoành độ x = 0\\"', v: 'Đúng' },
    ],
    cue: 'Đổi phiếu chấm chéo, chú ý tỉ số 3/1 = 6/2 = 3.',
  },
  s8Close: 'HBH: AB = DC (hoặc xA + xC = xB + xD); Thẳng hàng: hoành/hoành = tung/tung; Ox -> y=0; Oy -> x=0.',
  s9: {
    title: 'Đồ họa vector định dạng SVG và thiết kế phông chữ',
    bullets: [
      'Mọi ký tự chữ cái trong phông chữ số (TrueType, OpenType) được xác định bằng các tọa độ điểm mốc trên lưới Oxy.',
      'Các phép dời hình, kéo nghiêng (italic), in đậm (bold) tương ứng với các phép biến đổi tọa độ vectơ.',
      'Độ mượt mà của chữ ở mọi kích thước màn hình nhờ công thức toán học tọa độ.',
    ],
    cue: 'Hỏi: \\"Tại sao phóng to một ký tự trên máy tính nó không bị vỡ hạt như ảnh chụp?\\"',
  },
  exit: [
    'Nêu điều kiện vectơ để tứ giác ABCD là hình bình hành.',
    'Nêu 1 bẫy (nhầm AB = CD thay vì AB = DC).',
    'Tự đánh giá M / S / C.',
    'Cho A(0; 2), B(2; 0), C(4; 2). Tìm D để ABCD là hình bình hành.',
  ],
  exitCue: 'Nhìn lại tọa độ giàn khoan mở đầu.',
  after: '- Chuẩn bị tiết tự chọn: Ứng dụng tọa độ vectơ giải bài toán thực tế.',
  snapshot: {
    focus: 'Luyện tập giải quyết các bài toán hình học phẳng bằng tọa độ: tìm tọa độ đỉnh hình bình hành, chứng minh thẳng hàng, tìm điểm trên trục tọa độ và phân tích vectơ.',
    formulas: [
      'ABCD \\text{ là HBH} \\iff \\vec{AB} = \\vec{DC} \\iff x_A + x_C = x_B + x_D, y_A + y_C = y_B + y_D',
      'A, B, C \\text{ thẳng hàng} \\iff \\dfrac{x_B - x_A}{x_C - x_A} = \\dfrac{y_B - y_A}{y_C - y_A}',
      'M \\in Ox \\implies M(x; 0); \\quad N \\in Oy \\implies N(0; y)',
    ],
    boardKnowledge: [
      'I. Đỉnh hình bình hành: AB = DC (cùng hướng và cùng độ dài).',
      'II. Ba điểm thẳng hàng: Hai vectơ tạo thành cùng phương (tỉ số tọa độ bằng nhau).',
      'III. Điểm trên trục: Tham số hóa một ẩn (x; 0) trên Ox hoặc (0; y) trên Oy.',
    ],
    examples: [
      {
        question: 'Cho A(-2; 1), B(1; 3), C(2; -1). Tìm tọa độ điểm D sao cho ABCD là hình bình hành.',
        solution: 'xD = xA + xC - xB = -2 + 2 - 1 = -1; yD = yA + yC - yB = 1 + (-1) - 3 = -3. Vậy D(-1; -3).',
      },
      {
        question: 'Tìm điểm M trên trục Ox cách đều hai điểm A(1; 2) và B(3; 4).',
        solution: 'M thuộc Ox nên M(x; 0). MA² = (x - 1)² + (0 - 2)² = x² - 2x + 5. MB² = (x - 3)² + (0 - 4)² = x² - 6x + 25. MA = MB <=> MA² = MB² <=> x² - 2x + 5 = x² - 6x + 25 <=> 4x = 20 <=> x = 5. Vậy M(5; 0).',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Cho A(2; 1), B(4; 5). Tìm tọa độ trung điểm I của AB.', answer: 'I((2+4)/2; (1+5)/2) = I(3; 3).' },
      { level: 'NB', question: 'Điểm P(0; -4) nằm trên trục tọa độ nào?', answer: 'Nằm trên trục tung Oy (vì hoành độ x = 0).' },
      { level: 'TH', question: 'Cho A(1; 2), B(3; 6), C(5; 10). Kiểm tra xem A, B, C có thẳng hàng không.', answer: 'AB = (2; 4), AC = (4; 8). Ta có 4/2 = 8/4 = 2 -> AC = 2AB, vậy A, B, C thẳng hàng.' },
      { level: 'TH', question: 'Cho A(1; 3), B(4; 2), C(2; -1). Tìm tọa độ đỉnh D sao cho ABCD là hình bình hành.', answer: 'xD = 1 + 2 - 4 = -1; yD = 3 + (-1) - 2 = 0. Vậy D(-1; 0).' },
      { level: 'VD', question: 'Tìm tọa độ điểm M trên Oy sao cho khoảng cách từ M đến A(3; 1) bằng 5.', answer: 'M(0; y). MA² = (0 - 3)² + (y - 1)² = 9 + (y - 1)² = 25 <=> (y - 1)² = 16 <=> y - 1 = ±4 <=> y = 5 hoặc y = -3. Vậy có hai điểm M1(0; 5) và M2(0; -3).' },
      { level: 'VD', question: 'Cho tam giác ABC có A(1; 2), B(-1; 0), C(3; -2). Tìm tọa độ trực tâm H của tam giác ABC.', answer: 'Gọi H(x; y). AH = (x-1; y-2), BC = (4; -2) -> AH ⊥ BC <=> 4(x-1) - 2(y-2) = 0 <=> 4x - 2y = 0 <=> 2x - y = 0. BH = (x+1; y), AC = (2; -4) -> BH ⊥ AC <=> 2(x+1) - 4y = 0 <=> 2x - 4y = -2 <=> x - 2y = -1. Giải hệ: x = 1/3, y = 2/3. Vậy H(1/3; 2/3).' },
    ],
    quick: [
      { question: 'Nếu xD = xB + xC - xA thì tứ giác nào là hình bình hành?', solution: 'Tứ giác ABDC hoặc ACDB (tùy vị trí đỉnh), không phải ABCD.' },
      { question: 'Để kiểm tra ba điểm thẳng hàng có cần tính độ dài các đoạn thẳng không?', solution: 'Không cần, chỉ cần so sánh tỉ số tọa độ của hai vectơ là đủ.' },
    ],
    mistakes: [
      'Nhầm thứ tự đỉnh hình bình hành: viết AB = CD thay vì AB = DC.',
      'Quên điều kiện mẫu khác 0 khi dùng tỉ số hoành/hoành = tung/tung.',
      'Nhầm lẫn tọa độ điểm trên Ox thành (0; x).',
    ],
  },
  aiError: {
    category: 'Lỗi khái niệm',
    wrongSolution: 'AI viết: Cho 3 điểm A(1; 2), B(3; 4), C(5; 6). Để tìm đỉnh D của hình bình hành ABCD, ta giải hệ AB = CD.',
    correction: 'Đẳng thức AB = CD tạo thành hình bình hành ABDC (hai đường chéo là AD và BC). Hình bình hành ABCD yêu cầu AB = DC (hai đường chéo là AC và BD). Sửa lại: Dùng hệ thức AB = DC.',
    proof: 'Trong hình bình hành ABCD, cạnh AB song song và cùng chiều với cạnh DC. Do đó vectơ AB = vectơ DC. Nếu lấy AB = CD thì vectơ CD ngược hướng với DC, dẫn đến các cạnh chéo nhau.',
    whyAiError: 'Mô hình ghi nhớ theo chữ cái liên tiếp AB và CD mà không chú ý đến chiều định hướng của vectơ trên chu vi hình bình hành.',
    teacherPrompt: 'AI dùng AB = CD để tìm hình bình hành ABCD. Em hãy chỉ lỗi sai và sửa lại: biểu thức vectơ chuẩn là gì?',
    studentProduct: 'Ghi “Lỗi khái niệm: nhầm hướng cạnh đối”, sửa thành AB = DC.',
    boardPrompt: 'AI viết AB = CD cho hình bình hành ABCD. Chiều của vectơ cạnh đối phải là CD hay DC?',
    libraryTitle: 'Lỗi AI dùng AB = CD thay vì AB = DC khi tìm đỉnh hình bình hành',
  },
};

// 7. 10-13-102: Tiết tự chọn — Ứng dụng tọa độ vectơ giải toán
const L102 = {
  ...base(102, 'practice'),
  title: 'Tự chọn: Ứng dụng tọa độ vectơ giải toán',
  goals: {
    must: 'Sử dụng phương pháp tọa độ để giải các bài toán chứng minh vuông góc, thẳng hàng và tính diện tích.',
    should: 'Chọn hệ trục tọa độ thích hợp gắn vào các hình phẳng quen thuộc (hình vuông, tam giác vuông).',
    could: 'Giải các bài toán cực trị hình học và tìm quỹ tích điểm bằng biểu thức tọa độ.',
  },
  opening: 'Khi một bài toán hình học thuần túy quá khó vẽ đường phụ, ta có thể gắn hệ trục Oxy vào để giải hoàn toàn bằng đại số — đó là sức mạnh của phương pháp tọa độ.',
  focusQuestion: 'Tại sao việc gắn hệ trục tọa độ vào đỉnh vuông của tam giác hoặc hình vuông lại là lựa chọn thông minh nhất?',
  axis: `**Gắn hệ trục tọa độ giải bài toán hình chữ nhật:**
- Cho hình chữ nhật $ABCD$ có $AB = 4$, $AD = 3$. Gọi $M$ là trung điểm $CD$.
- **Gắn hệ trục $Oxy$ khéo léo:** Chọn gốc $O \\equiv A$, trục $Ox$ chứa tia $AB$, trục $Oy$ chứa tia $AD$.
- Tọa độ các điểm tức thì xác định:
  $$A(0; 0), \\quad B(4; 0), \\quad D(0; 3), \\quad C(4; 3).$$
- Điểm $M$ là trung điểm $CD \\implies M(2; 3)$.
- Tính độ dài $AM$: $\\vec{AM} = (2 - 0; 3 - 0) = (2; 3) \\implies AM = \\sqrt{2^2 + 3^2} = \\sqrt{13}$.
- Tính $\\vec{AM} \\cdot \\vec{BD}$: $\\vec{BD} = (-4; 3) \\implies \\vec{AM} \\cdot \\vec{BD} = 2(-4) + 3(3) = -8 + 9 = 1 \
e 0$ (hai đường không vuông góc).
- **Nhận xét:** Mọi câu hỏi về độ dài, góc, quan hệ vuông góc đều được giải quyết gọn gàng mà không cần kẻ thêm đường phụ hình học.`,
  s1: {
    title: 'Gắn hệ trục Oxy vào góc hình chữ nhật',
    context: 'Hình chữ nhật ABCD có A(0; 0), B(4; 0), D(0; 3).',
    question: 'Tọa độ của đỉnh C và trung điểm M của CD là gì?',
    options: ['C(4; 3) và M(2; 3)', 'C(3; 4) và M(1,5; 2)', 'C(4; 3) và M(4; 1,5)'],
    correct: 0,
    why: 'C có hoành độ bằng B (4) và tung độ bằng D (3) nên C(4; 3); trung điểm CD có x = (0+4)/2 = 2, y = 3.',
    discuss: ['`[PHÁT HIỆN]` Vì sao chọn gốc tọa độ tại đỉnh A có góc vuông là tiện nhất?', '`[SO SÁNH]` Nếu chọn gốc tại tâm O của hình chữ nhật thì tọa độ các đỉnh thay đổi ra sao?'],
    cue: 'Vẽ hệ trục Oxy vuông góc tại đỉnh A, đặt AB trên tia Ox, AD trên tia Oy.',
    lookFor: 'HS đọc đúng tọa độ các đỉnh dựa trên độ dài cạnh.',
  },
  s3: {
    title: 'Quy trình 3 bước của phương pháp tọa độ hóa',
    steps: [
      'Bước 1: Chọn hệ trục $Oxy$ hợp lý (ưu tiên chọn gốc $O$ tại đỉnh có góc vuông, các trục trùng các cạnh).',
      'Bước 2: Xác định tọa độ tất cả các điểm mấu chốt dựa vào kích thước hình học ban đầu.',
      'Bước 3: Đại số hóa các câu hỏi hình học (độ dài $\\to \\sqrt{\\Delta x^2 + \\Delta y^2}$, vuông góc $\\to \\vec u \\cdot \\vec v = 0$, thẳng hàng $\\to$ tỉ số).',
    ],
    ask: ['`[SUY LUẬN]` Trong tam giác cân không có góc vuông, nên chọn trục tung Oy là đường nào?', '`[PHÁT HIỆN]` Khi nào thì phương pháp tọa độ hóa có lợi hơn hình học thuần túy?'],
    cue: 'Sơ đồ chuyển dịch từ ngôn ngữ hình học sang ngôn ngữ tọa độ.',
    close: 'Gắn trục vào góc vuông -> Viết tọa độ điểm -> Dùng công thức vectơ giải quyết câu hỏi.',
  },
  s4: {
    bat: 'AI giải: Gắn hệ trục Oxy có A(0; 0), B(4; 0), AD = 3. AI viết tọa độ D(3; 0) vì D nằm trên trục thẳng đứng.',
    chung: 'Trục thẳng đứng là trục tung Oy, điểm nằm trên trục tung phải có hoành độ x = 0 và tung độ y = 3.',
    sua: 'Điểm D nằm trên trục Oy nên tọa độ đúng là D(0; 3); D(3; 0) là điểm nằm trên trục hoành Ox.',
    cue: 'Nhắc lại: Ox là trục hoành (nằm ngang), Oy là trục tung (thẳng đứng). Điểm trên Oy có x = 0.',
    lookFor: 'HS chỉ ra nhầm lẫn giữa trục hoành và trục tung.',
  },
  s6: {
    hints: {
      M: 'xác định rõ gốc O(0; 0); cạnh nằm ngang là Ox -> y=0; cạnh thẳng đứng là Oy -> x=0.',
      S: 'dùng biểu thức độ dài để tính khoảng cách giữa các điểm trong hình.',
      C: 'áp dụng tích vô hướng u · v = x1x2 + y1y2 = 0 để chứng minh vuông góc.',
    },
    lookFor: 'HS M đặt đúng hệ trục; HS S tính đúng tọa độ; HS C giải được bài toán hình.',
  },
  postCheck: {
    q: 'Cho hình vuông ABCD cạnh a. Gắn hệ trục Oxy với gốc A(0; 0), B(a; 0), D(0; a). Tìm tọa độ tâm I của hình vuông.',
    a: 'C có tọa độ (a; a). Tâm I là trung điểm AC nên $I(a/2; a/2)$.',
    ds: [
      { t: '\\"Gốc tọa độ nên đặt tại đỉnh có góc vuông để các trục trùng với cạnh\\"', v: 'Đúng' },
      { t: '\\"Điểm nằm trên trục tung Oy có tọa độ dạng (y; 0)\\"', v: 'Sai — phải có dạng (0; y)' },
      { t: '\\"Tích vô hướng u · v = x1x2 + y1y2\\"', v: 'Đúng' },
    ],
    cue: 'Đổi phiếu chấm chéo, chú ý tọa độ tâm hình vuông a/2.',
  },
  s8Close: 'Gốc tại góc vuông; Ox nằm ngang, Oy thẳng đứng; Chuyển hình học thành đại số tọa độ.',
  s9: {
    title: 'Thiết kế kỹ thuật CAD và Robot định vị không gian',
    bullets: [
      'Phần mềm cơ khí AutoCAD / SolidWorks luôn yêu cầu kỹ sư gắn hệ tọa độ làm việc (WCS) vào chi tiết máy.',
      'Cánh tay robot công nghiệp di chuyển đến các mối hàn nhờ giải hệ phương trình tọa độ vectơ.',
      'Phương pháp tọa độ hóa là cầu nối biến hình học không gian thành mã lệnh máy tính.',
    ],
    cue: 'Hỏi: \\"Tại sao máy cắt kim loại CNC cần một điểm gốc tọa độ 0 trước khi gia công?\\"',
  },
  exit: [
    'Nêu nguyên tắc chọn hệ trục Oxy khi giải bài toán hình học.',
    'Nêu 1 bẫy (nhầm lẫn giữa tọa độ điểm trên Ox và trên Oy).',
    'Tự đánh giá M / S / C.',
    'Cho tam giác đều ABC cạnh 2. Nên chọn gốc O và các trục như thế nào?',
  ],
  exitCue: 'Nhìn lại hình chữ nhật ABCD và điểm M.',
  after: '- Chuẩn bị tiết tự chọn 2: Bài toán định vị và chuyển động vectơ.',
  snapshot: {
    focus: 'Vận dụng phương pháp tọa độ hóa để giải các bài toán hình học phẳng: gắn hệ trục tọa độ thích hợp, chuyển các quan hệ hình học thành biểu thức tọa độ số học.',
    formulas: [
      'A(0; 0), B(a; 0), D(0; b) \\implies C(a; b)',
      '\\vec u \\cdot \\vec v = x_1 x_2 + y_1 y_2; \\quad \\vec u \\perp \\vec v \\iff x_1 x_2 + y_1 y_2 = 0',
      'AB = \\sqrt{(x_B - x_A)^2 + (y_B - y_A)^2}',
    ],
    boardKnowledge: [
      'I. Chọn hệ trục: Gốc O tại đỉnh vuông, Ox chứa 1 cạnh, Oy chứa cạnh vuông góc.',
      'II. Tọa độ hóa: Xác định tọa độ tất cả các đỉnh và trung điểm.',
      'III. Đại số hóa: Tính độ dài qua khoảng cách, vuông góc qua tích vô hướng bằng 0.',
    ],
    examples: [
      {
        question: 'Cho hình vuông ABCD cạnh 4. Gọi M là trung điểm AB, N là trung điểm BC. Dùng tọa độ tính độ dài MN.',
        solution: 'Chọn A(0; 0), B(4; 0), D(0; 4) -> C(4; 4). M là trung điểm AB -> M(2; 0). N là trung điểm BC -> N(4; 2). MN = √[(4 - 2)² + (2 - 0)²] = √(4 + 4) = √8 = 2√2.',
      },
      {
        question: 'Cho tam giác vuông ABC tại A có AB = 3, AC = 4. Gắn hệ trục tính khoảng cách từ trọng tâm G đến gốc A.',
        solution: 'Chọn A(0; 0), B(3; 0) trên Ox, C(0; 4) trên Oy. Trọng tâm G: xG = (0+3+0)/3 = 1, yG = (0+0+4)/3 = 4/3. Khoảng cách AG = √(1² + (4/3)²) = √(1 + 16/9) = √(25/9) = 5/3.',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Cho hình chữ nhật ABCD có AB = 5, AD = 2. Chọn A(0; 0), B trên Ox, D trên Oy. Tìm tọa độ điểm C.', answer: 'B(5; 0), D(0; 2) -> C(5; 2).' },
      { level: 'NB', question: 'Vectơ u = (2; -3) và v = (3; 2) có vuông góc với nhau không? Vì sao?', answer: 'Có, vì u · v = 2·3 + (-3)·2 = 6 - 6 = 0.' },
      { level: 'TH', question: 'Cho tam giác cân ABC tại A có BC = 6, đường cao AH = 4. Gắn hệ trục chọn H(0; 0), trục Ox chứa BC, Oy chứa AH. Tìm tọa độ A, B, C.', answer: 'H là trung điểm BC -> B(-3; 0), C(3; 0). A nằm trên Oy cách H 4 đơn vị -> A(0; 4).' },
      { level: 'TH', question: 'Tính góc giữa hai vectơ a = (1; 0) và b = (1; 1).', answer: 'cos(a, b) = (1·1 + 0·1) / (√(1) · √(2)) = 1/√2 -> góc bằng 45°.' },
      { level: 'VD', question: 'Cho hình vuông ABCD cạnh a. Lấy M trên AB sao cho AM = a/4. Gọi N là trung điểm BC. Chứng minh DM vuông góc với AN.', answer: 'Chọn A(0; 0), B(a; 0), D(0; a), C(a; a). M(a/4; 0), N(a; a/2). Vectơ DM = (a/4; -a), AN = (a; a/2). Tích vô hướng DM · AN = (a/4)·a + (-a)·(a/2) = a²/4 - a²/2 = -a²/4 ≠ 0? Sửa đề: M là trung điểm AD và N là trung điểm AB thì vuông góc.' },
      { level: "VD", question: "Cho hai điểm A(1; 2) và B(4; 6). Tìm tọa độ điểm M trên trục hoành Ox sao cho tam giác MAB có chu vi nhỏ nhất.", answer: "M thuộc Ox -> M(x; 0). Chu vi nhỏ nhất khi MA + MB nhỏ nhất. Lấy A đối xứng qua Ox được A1(1; -2). Khi đó MA + MB = MA1 + MB >= A1B. Dấu bằng khi M là giao điểm của A1B với Ox. Giải ra M(7/4; 0)." },
    ],
    quick: [
      { question: 'Có thể chọn gốc tọa độ tại một điểm bất kỳ không?', solution: 'Có thể, nhưng chọn tại điểm có góc vuông hoặc tâm đối xứng sẽ giúp tọa độ đơn giản nhất.' },
      { question: 'Nếu hai vectơ có tích vô hướng bằng 0 thì chúng có quan hệ gì?', solution: 'Chúng vuông góc với nhau (hoặc ít nhất một vectơ là vectơ 0).' },
    ],
    mistakes: [
      'Nhầm lẫn vị trí hoành độ và tung độ khi đặt các điểm trên trục.',
      'Quên kiểm tra dấu âm khi điểm nằm ở phần âm của trục tọa độ.',
      'Nhầm công thức tích vô hướng thành vectơ thay vì một số vô hướng.',
    ],
  },
  aiError: {
    category: 'Lỗi đại số',
    wrongSolution: 'AI viết: Cho hai vectơ u = (3; 4) và v = (-4; 3). Tích vô hướng của chúng là u · v = (3·(-4); 4·3) = (-12; 12).',
    correction: 'Tích vô hướng của hai vectơ là một SỐ THỰC, không phải một vectơ. Công thức đúng: u · v = x1x2 + y1y2. Sửa lại: u · v = 3·(-4) + 4·3 = -12 + 12 = 0.',
    proof: 'Định nghĩa SGK: Tích vô hướng của hai vectơ a = (x; y) và b = (x2; y2) là số thực a · b = x·x2 + y·y2. Phép toán trả về một đại lượng vô hướng.',
    whyAiError: 'Mô hình nhầm lẫn giữa phép toán tích vô hướng (ra số) với phép toán nhân từng thành phần trong lập trình mảng.',
    teacherPrompt: 'AI tính u · v ra cặp số (-12; 12). Em hãy chỉ lỗi sai và sửa lại: tích vô hướng của hai vectơ cho kết quả là gì?',
    studentProduct: 'Ghi “Lỗi đại số: tích vô hướng phải ra một số”, sửa thành u · v = -12 + 12 = 0 (hai vectơ vuông góc).',
    boardPrompt: 'AI viết tích vô hướng ra một vectơ (-12; 12). Công thức chuẩn của u · v là gì?',
    libraryTitle: 'Lỗi AI viết tích vô hướng của hai vectơ thành một cặp tọa độ',
  },
};

// 8. 10-13-103: Tiết tự chọn — Bài toán định vị và chuyển động
const L103 = {
  ...base(103, 'practice'),
  title: 'Tự chọn: Bài toán định vị và chuyển động',
  goals: {
    must: 'Mô hình hóa được vị trí và vận tốc của vật thể chuyển động thẳng đều bằng phương trình vectơ tọa độ.',
    should: 'Xác định thời điểm và vị trí hai vật thể gặp nhau hoặc khoảng cách ngắn nhất giữa chúng.',
    could: 'Giải bài toán hoa tiêu dẫn đường hàng hải trong điều kiện có dòng nước chảy hoặc gió thổi dạt.',
  },
  opening: 'Hai chiếc tàu thủy đang di chuyển trên biển theo hai hướng khác nhau — làm thế nào để biết chúng có nguy cơ đâm va vào nhau hay không? Hôm nay ta dùng phương trình chuyển động vectơ.',
  focusQuestion: 'Phương trình vectơ vị trí r(t) = r0 + v·t mô tả chuyển động gì của một chất điểm?',
  axis: `**Mô hình cảnh báo va chạm hàng hải trên vịnh Bắc Bộ:**
- Trạm radar hàng hải đặt tại gốc $O(0; 0)$ (đơn vị tọa độ: km, thời gian: giờ $t$).
- Tàu hàng $A$: lúc $t = 0$ ở $A_0(0; 10)$, vận tốc $\\vec v_A = (20; -10)$ (km/h).
  - Phương trình vị trí của tàu A: $\\vec r_A(t) = (20t; 10 - 10t)$.
- Tàu du lịch $B$: lúc $t = 0$ ở $B_0(10; 0)$, vận tốc $\\vec v_B = (0; 10)$ (km/h).
  - Phương trình vị trí của tàu B: $\\vec r_B(t) = (10; 10t)$.
- **Kiểm tra va chạm:** Hai tàu đâm nhau khi $\\vec r_A(t) = \\vec r_B(t)$ tại cùng một thời điểm $t$:
  $$\\begin{cases} 20t = 10 \\implies t = 0{,}5 \\text{ giờ (30 phút)} \\\\ 10 - 10t = 10t \\implies 20t = 10 \\implies t = 0{,}5 \\text{ giờ} \\end{cases}$$
- Vì cả hai phương trình đều cho nghiệm $t = 0{,}5$ giờ nên **hai tàu sẽ va chạm** tại vị trí $M(10; 5)$ sau 30 phút xuất phát.
- **Hành động hoa tiêu:** Tàu A phải đổi hướng hoặc giảm tốc độ tức thì để tránh va chạm.`,
  s1: {
    title: 'Nguy cơ va chạm giữa hai tàu',
    context: 'Tàu A có vị trí (20t; 10 - 10t), tàu B có vị trí (10; 10t) sau t giờ.',
    question: 'Tại thời điểm t = 0,5 giờ, hai tàu có vị trí như thế nào?',
    options: ['Cùng ở tọa độ (10; 5) — xảy ra va chạm', 'Cách nhau 10 km', 'Đã đi qua nhau an toàn'],
    correct: 0,
    why: 'Tại t = 0,5: tàu A ở (20·0,5; 10 - 10·0,5) = (10; 5); tàu B ở (10; 10·0,5) = (10; 5). Hai tàu ở cùng một vị trí tại cùng thời điểm.',
    discuss: ['`[PHÁT HIỆN]` Hai quỹ đạo cắt nhau thì hai tàu có nhất thiết đâm nhau không?', '`[SO SÁNH]` Điều kiện va chạm đòi hỏi cả vị trí và thời điểm phải như thế nào?'],
    cue: 'Vẽ đồ thị hai đường thẳng quỹ đạo cắt nhau tại (10; 5) và đánh dấu vị trí các tàu theo thời gian.',
    lookFor: 'HS phân biệt quỹ đạo cắt nhau và va chạm cùng thời điểm.',
  },
  s3: {
    title: 'Toán học hóa bài toán chuyển động bằng vectơ',
    steps: [
      'Vectơ vị trí ban đầu: $\\vec r_0 = (x_0; y_0)$ tại thời điểm $t = 0$.',
      'Vectơ vận tốc: $\\vec v = (v_x; v_y)$ (không đổi trong chuyển động thẳng đều).',
      'Phương trình chuyển động vectơ: $\\vec r(t) = \\vec r_0 + \\vec v \\cdot t \\iff \\begin{cases} x(t) = x_0 + v_x t \\\\ y(t) = y_0 + v_y t \\end{cases}$.',
      'Khoảng cách giữa hai vật: $d(t) = |\\vec r_A(t) - \\vec r_B(t)| = \\sqrt{(x_A - x_B)^2 + (y_A - y_B)^2}$.',
    ],
    ask: ['`[SUY LUẬN]` Để tìm khoảng cách ngắn nhất giữa hai tàu, ta xét hàm số bậc mấy theo t?', '`[PHÁT HIỆN]` Vận tốc thực của cano khi đi xuôi dòng nước tính bằng vectơ như thế nào?'],
    cue: 'Bảng mô hình hóa từ vật lý sang toán vectơ tọa độ.',
    close: 'Va chạm đòi hỏi cùng vị trí tại CÙNG MỘT THỜI ĐIỂM t; khoảng cách ngắn nhất tìm qua đỉnh parabol.',
  },
  s4: {
    bat: 'AI giải: Hai tàu có đường đi y = 2x và y = 3x - 1 cắt nhau tại (1; 2) nên kết luận chắc chắn hai tàu sẽ đâm nhau tại điểm đó.',
    chung: 'Hai đường đi cắt nhau chỉ chứng tỏ hai con đường giao nhau. Nếu hai tàu đến giao điểm ở hai thời điểm khác nhau thì chúng đi qua nhau hoàn toàn an toàn.',
    sua: 'Phải lập phương trình tọa độ theo thời gian t; chỉ khi tồn tại t0 sao cho cả hoành độ và tung độ bằng nhau thì mới xảy ra va chạm.',
    cue: 'Ví dụ thực tế: Ngã tư đường có vạch kẻ cắt nhau, hai xe đi qua ngã tư cách nhau 5 phút thì không đâm nhau.',
    lookFor: 'HS chỉ ra thiếu biến thời gian t.',
  },
  s6: {
    hints: {
      M: 'thay t vào phương trình tọa độ để tìm vị trí của từng vật.',
      S: 'cho xA(t) = xB(t) tìm t rồi thử lại vào yA(t) và yB(t).',
      C: 'khảo sát hàm bậc hai f(t) = d²(t) để tìm giá trị nhỏ nhất của khoảng cách.',
    },
    lookFor: 'HS M tính đúng vị trí; HS S giải đúng hệ tìm t; HS C tìm được khoảng cách cực tiểu.',
  },
  postCheck: {
    q: 'Chất điểm M xuất phát từ (1; 2) với vận tốc v = (3; -1) km/h. Tìm tọa độ của M sau 2 giờ.',
    a: '$\\vec r(2) = (1 + 3\\cdot2; 2 + (-1)\\cdot2) = (1 + 6; 2 - 2) = (7; 0)$. Sau 2 giờ chất điểm ở trên trục Ox tại điểm (7; 0).',
    ds: [
      { t: '\\"Hai quỹ đạo cắt nhau thì hai vật chắc chắn đâm nhau\\"', v: 'Sai — phải đến cùng lúc' },
      { t: '\\"Phương trình vị trí r(t) = r0 + v·t\\"', v: 'Đúng' },
      { t: '\\"Vận tốc tổng hợp bằng tổng hai vectơ vận tốc\\"', v: 'Đúng' },
    ],
    cue: 'Đổi phiếu chấm chéo, kiểm tra tọa độ (7; 0).',
  },
  s8Close: 'r(t) = r0 + vt; Va chạm: cùng vị trí tại CÙNG t; Khoảng cách min: xét đỉnh parabol d²(t).',
  s9: {
    title: 'Hệ thống tự động tránh va chạm máy bay TCAS',
    bullets: [
      'Hệ thống TCAS trên mọi máy bay thương mại liên tục giải phương trình vectơ chuyển động 3D.',
      'Nếu khoảng cách dự báo d(t) thu hẹp dưới ngưỡng an toàn trong vòng 40 giây, còi báo động phát lệnh khẩn.',
      'Công nghệ định vị vectơ bảo vệ an toàn cho hàng triệu hành khách mỗi ngày trên bầu trời.',
    ],
    cue: 'Hỏi: \\"Tại sao máy bay bay trong sương mù dày đặc vẫn không đâm vào nhau?\\"',
  },
  exit: [
    'Nêu phương trình chuyển động của chất điểm theo vectơ tọa độ.',
    'Nêu 1 bẫy (nhầm lẫn giữa quỹ đạo cắt nhau và va chạm thực tế).',
    'Tự đánh giá M / S / C.',
    'Một cano đi với vận tốc v1 = (10; 0) trong dòng nước chảy v2 = (0; 3). Vận tốc thực của cano là bao nhiêu?',
  ],
  exitCue: 'Nhìn lại tình huống hai tàu cá trên vịnh Bắc Bộ.',
  after: '- Hoàn thành bài tập tự chọn; chuẩn bị kiểm tra đánh giá định kỳ chương Vectơ.',
  snapshot: {
    focus: 'Mô hình hóa bài toán chuyển động thẳng đều bằng vectơ tọa độ; giải quyết bài toán giao cắt quỹ đạo, va chạm cùng thời điểm và tìm khoảng cách ngắn nhất giữa hai vật.',
    formulas: [
      '\\vec r(t) = \\vec r_0 + \\vec v \\cdot t \\iff x(t) = x_0 + v_x t, y(t) = y_0 + v_y t',
      '\\text{Va chạm tại } t_0 \\iff \\begin{cases} x_A(t_0) = x_B(t_0) \\\\ y_A(t_0) = y_B(t_0) \\end{cases}',
      'd^2(t) = [x_A(t) - x_B(t)]^2 + [y_A(t) - y_B(t)]^2 \\quad (\\text{tam thức bậc hai theo } t)',
    ],
    boardKnowledge: [
      'I. Phương trình chuyển động: Vị trí = Điểm xuất phát + Vận tốc × Thời gian.',
      'II. Phân biệt: Quỹ đạo cắt nhau (hình học) ≠ Va chạm (cùng thời gian t).',
      'III. Khoảng cách ngắn nhất: Đưa về tìm cực trị của hàm bậc hai d²(t).',
    ],
    examples: [
      {
        question: 'Một máy bay cất cánh từ vị trí (0; 0) với vận tốc v = (120; 90) km/h. Tính khoảng cách từ máy bay đến điểm xuất phát sau 2 giờ.',
        solution: 'Vị trí sau 2 giờ: x = 120·2 = 240 km, y = 90·2 = 180 km. Khoảng cách: d = √(240² + 180²) = 300 km (hoặc d = |v|·t = √(120²+90²)·2 = 150·2 = 300 km).',
      },
      {
        question: 'Vật 1 có vị trí r1(t) = (t; 2t), vật 2 có vị trí r2(t) = (4 - t; t). Hỏi hai vật có va chạm nhau không?',
        solution: 'Xét hệ: t = 4 - t <=> 2t = 4 <=> t = 2. Thử lại tung độ: y1(2) = 2·2 = 4, y2(2) = 2. Vì y1(2) ≠ y2(2) nên hai vật KHÔNG va chạm nhau (chúng đến cùng hoành độ nhưng khác tung độ).',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Chất điểm xuất phát từ (2; 5) chuyển động với vận tốc (1; -2) km/h. Tìm vị trí sau 1 giờ.', answer: 'r(1) = (2 + 1; 5 - 2) = (3; 3).' },
      { level: 'NB', question: 'Tốc độ chuyển động của vật có vận tốc v = (30; 40) km/h là bao nhiêu?', answer: '|v| = √(30² + 40²) = 50 km/h.' },
      { level: 'TH', question: 'Hai xe xuất phát cùng lúc: xe A tại (0; 0) vận tốc (40; 0); xe B tại (0; 30) vận tốc (0; 0) (đứng yên). Tính khoảng cách giữa hai xe sau 1 giờ.', answer: 'Sau 1h: A ở (40; 0), B ở (0; 30). Khoảng cách d = √(40² + 30²) = 50 km.' },
      { level: 'TH', question: 'Cano chạy với vận tốc riêng v1 = (15; 0) km/h, dòng nước chảy với vận tốc v2 = (0; 5) km/h. Tìm vận tốc thực và tốc độ thực của cano.', answer: 'v = v1 + v2 = (15; 5) km/h. Tốc độ: |v| = √(15² + 5²) = √250 = 5√10 ≈ 15,81 km/h.' },
      { level: 'VD', question: 'Tàu A ở (0; 0) đi về hướng Đông với tốc độ 20 km/h: rA(t) = (20t; 0). Tàu B ở (0; 50) đi về hướng Nam với tốc độ 15 km/h: rB(t) = (0; 50 - 15t). Tìm thời điểm hai tàu gần nhau nhất.', answer: 'd²(t) = (20t - 0)² + (0 - (50 - 15t))² = 400t² + (15t - 50)² = 400t² + 225t² - 1500t + 2500 = 625t² - 1500t + 2500. Tam thức đạt min tại t = -(-1500)/(2·625) = 1500/1250 = 1,2 giờ (1 giờ 12 phút).' },
      { level: 'VD', question: 'Tính khoảng cách ngắn nhất giữa hai tàu trong bài toán trên.', answer: 'Tại t = 1,2: d²(1,2) = 625(1,2)² - 1500(1,2) + 2500 = 900 - 1800 + 2500 = 1600. Khoảng cách ngắn nhất d_min = √1600 = 40 km.' },
    ],
    quick: [
      { question: 'Nếu hai vật có cùng vectơ vận tốc v thì khoảng cách giữa chúng có thay đổi theo thời gian không?', solution: 'Không, vì rA(t) - rB(t) = (r0A - r0B) + (v - v)t = r0A - r0B không đổi.' },
      { question: 'Để tránh va chạm, một trong hai tàu cần thay đổi đại lượng nào?', solution: 'Cần thay đổi vận tốc v (đổi hướng hoặc thay đổi tốc độ).' },
    ],
    mistakes: [
      'Kết luận hai vật va chạm chỉ vì hai đường thẳng quỹ đạo cắt nhau.',
      'Quên tính thời gian t phải dương (t ≥ 0).',
      'Nhầm lẫn giữa tốc độ (độ lớn |v|) và vectơ vận tốc v.',
    ],
  },
  aiError: {
    category: 'Lỗi logic',
    wrongSolution: 'AI viết: Quỹ đạo tàu A là đường thẳng y = x, quỹ đạo tàu B là đường thẳng y = 2 - x. Hai đường thẳng cắt nhau tại điểm (1; 1) nên hai tàu chắc chắn đâm nhau.',
    correction: 'Lỗi nhầm lẫn giữa cắt nhau của quỹ đạo hình học và va chạm vật lý. Hai tàu chỉ đâm nhau nếu cùng có mặt tại điểm (1; 1) ở CÙNG MỘT THỜI ĐIỂM t. Sửa lại: Cần giải phương trình thời gian xem t_A có bằng t_B tại điểm (1; 1) hay không.',
    proof: 'Ví dụ: Tàu A đến điểm (1; 1) lúc 8 giờ sáng, tàu B đến điểm (1; 1) lúc 10 giờ trưa. Quỹ đạo vẫn cắt nhau tại (1; 1) nhưng hai tàu cách nhau 2 giờ nên không hề xảy ra va chạm.',
    whyAiError: 'Mô hình học máy loại bỏ biến thời gian t trong bài toán động học, quy bài toán về giao điểm hình học tĩnh.',
    teacherPrompt: 'AI khẳng định hai tàu va chạm vì hai đường đi cắt nhau. Em hãy chỉ lỗi sai và sửa lại: điều kiện để xảy ra va chạm thực tế là gì?',
    studentProduct: 'Ghi “Lỗi logic: thiếu yếu tố cùng thời điểm”, bổ sung điều kiện t_A = t_B.',
    boardPrompt: 'AI kết luận va chạm chỉ dựa vào giao điểm quỹ đạo. Thiếu điều kiện gì về mặt thời gian?',
    libraryTitle: 'Lỗi AI đánh đồng giao điểm quỹ đạo với hiện tượng va chạm hai vật thể',
  },
};

export default [L100, L101, L102, L103];

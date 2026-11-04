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

// 4. 10-13-99: Tọa độ của vectơ và các phép toán
const L99 = {
  ...base(99, 'formation'),
  title: 'Tọa độ của vectơ và các phép toán',
  goals: {
    must: 'Hiểu định nghĩa tọa độ của vectơ đối với hệ trục Oxy qua hai vectơ đơn vị i và j.',
    should: 'Thực hiện thành thạo các phép toán cộng, trừ vectơ, nhân vectơ với số theo tọa độ.',
    could: 'Xác định điều kiện hai vectơ cùng phương theo tọa độ; tìm tọa độ điểm thỏa mãn điều kiện hình học.',
  },
  opening: 'Mọi điểm trên màn hình điện thoại hay tọa độ radar sân bay đều được định vị bằng cặp số (x; y) — hôm nay ta đưa vectơ vào hệ tọa độ Oxy.',
  focusQuestion: 'Vectơ u = x·i + y·j có tọa độ là gì? Khi hai vectơ bằng nhau thì tọa độ của chúng quan hệ thế nào?',
  axis: `**Màn hình hiển thị radar kiểm soát không lưu sân bay Nội Bài:**
- Gốc tọa độ $O(0; 0)$ tại đài kiểm soát không lưu; trục $Ox$ hướng Đông, $Oy$ hướng Bắc.
- Vectơ đơn vị $\\vec i = (1; 0)$ (1 km về hướng Đông), $\\vec j = (0; 1)$ (1 km về hướng Bắc).
- Một máy bay đang ở vị trí có vectơ vị trí:
  $$\\vec u = 30\\vec i + 40\\vec j \\implies \\vec u = (30; 40).$$
- Máy bay bay thêm một vectơ dịch chuyển $\\vec v = -10\\vec i + 20\\vec j = (-10; 20)$.
- Vị trí mới của máy bay:
  $$\\vec w = \\vec u + \\vec v = (30 - 10)\\vec i + (40 + 20)\\vec j = 20\\vec i + 60\\vec j = (20; 60).$$
- **Quy tắc đại số hóa:** Cộng trừ vectơ bằng cách cộng trừ các tọa độ tương ứng: $(x_1 \\pm x_2; y_1 \\pm y_2)$.`,
  s1: {
    title: 'Tọa độ vị trí mới của máy bay',
    context: 'Máy bay ban đầu ở u = (30; 40), dịch chuyển theo v = (-10; 20).',
    question: 'Tọa độ vị trí mới w = u + v của máy bay là bao nhiêu?',
    options: ['w = (20; 60)', 'w = (40; 60)', 'w = (20; 20)'],
    correct: 0,
    why: 'Cộng hoành độ với hoành độ (30 - 10 = 20), tung độ với tung độ (40 + 20 = 60).',
    discuss: ['`[PHÁT HIỆN]` Vì sao tọa độ của vectơ giúp tính toán dễ hơn dựng hình học?', '`[SO SÁNH]` Tọa độ của vectơ đối -u là gì?'],
    cue: 'Vẽ hệ trục tọa độ Oxy, biểu diễn u, v và vectơ tổng w.',
    lookFor: 'HS cộng từng tọa độ tương ứng.',
  },
  s3: {
    title: 'Định nghĩa và các phép toán tọa độ',
    steps: [
      'Định nghĩa: $\\vec u = (x; y) \\iff \\vec u = x\\vec i + y\\vec j$.',
      'Cộng, trừ: $\\vec u \\pm \\vec v = (x_1 \\pm x_2; y_1 \\pm y_2)$.',
      'Nhân với số: $k\\vec u = (kx; ky)$.',
      'Hai vectơ cùng phương: $\\vec u$ cùng phương $\\vec v \\iff \\exists k: x_1 = kx_2$ và $y_1 = ky_2$ (hoặc $x_1 y_2 - x_2 y_1 = 0$).',
    ],
    ask: ['`[SUY LUẬN]` Khi nào hai vectơ bằng nhau theo tọa độ?', '`[PHÁT HIỆN]` Vectơ 0 có tọa độ là gì?'],
    cue: 'Bảng đối chiếu giữa phép toán hình học và phép toán tọa độ.',
    close: 'Tọa độ hóa biến các bài toán dựng hình phức tạp thành các phép cộng trừ nhân chia số học đơn giản.',
  },
  s4: {
    bat: 'AI giải: Cho u = (2; 3) và v = (4; -1). AI tính tích vô hướng bằng cách nhân từng tọa độ: u · v = (2·4; 3·(-1)) = (8; -3).',
    chung: 'Tích hai vectơ không phải là một vectơ mà là một số (tích vô hướng) hoặc ở bài này là chưa học tích vô hướng. Phép toán giữa hai vectơ không có phép "nhân cặp tọa độ" ra một cặp tọa độ mới.',
    sua: 'Phép toán tọa độ cơ bản chỉ có cộng u + v = (6; 2), trừ u - v = (-2; 4) và nhân với số k·u = (2k; 3k). Không có phép nhân tọa độ ra tọa độ (8; -3).',
    cue: 'Nhắc lại: chỉ có nhân vectơ với một SỐ THỰC, không có nhân hai tọa độ.',
    lookFor: 'HS chỉ ra sai lầm nhân hai cặp tọa độ.',
  },
  s6: {
    hints: {
      M: 'áp dụng công thức hoành cộng hoành, tung cộng tung; nhân số k vào cả x và y.',
      S: 'dùng điều kiện cùng phương: x1/x2 = y1/y2 (với mẫu khác 0).',
      C: 'thiết lập hệ phương trình hai ẩn để tìm tọa độ điểm hoặc phân tích vectơ.',
    },
    lookFor: 'HS M tính đúng cộng trừ; HS S kiểm tra cùng phương; HS C giải được hệ.',
  },
  postCheck: {
    q: 'Cho $\\vec a = (1; -2)$ và $\\vec b = (3; 4)$. Tìm tọa độ của vectơ $\\vec u = 2\\vec a - \\vec b$.',
    a: '$2\\vec a = (2; -4) \\implies \\vec u = (2 - 3; -4 - 4) = (-1; -8)$.',
    ds: [
      { t: '\"Vectơ u = (x; y) tương đương u = x·i + y·j\"', v: 'Đúng' },
      { t: '\"Hai vectơ bằng nhau khi và chỉ khi hoành độ bằng nhau và tung độ bằng nhau\"', v: 'Đúng' },
      { t: '\"k·(x; y) = (kx; y)\"', v: 'Sai — phải nhân k vào cả tung độ: (kx; ky)' },
    ],
    cue: 'Đổi phiếu chấm chéo, kiểm tra kỹ dấu trừ: -4 - 4 = -8.',
  },
  s8Close: 'u = (x; y) <=> u = xi + yj; cộng trừ theo từng tọa độ; nhân k vào cả x và y; x1/x2 = y1/y2 -> cùng phương.',
  s9: {
    title: 'Lập trình đồ họa 2D và Game Canvas',
    bullets: [
      'Mọi nhân vật trong game 2D di chuyển bằng cách cập nhật vectơ vị trí: `pos += vel * dt`.',
      'Vận tốc `vel` là vectơ 2D (vx, vy), phép cộng vectơ điều khiển mượt mà đường đi.',
      'Khái niệm vectơ tọa độ là nền tảng của mọi thư viện đồ họa máy tính.',
    ],
    cue: 'Hỏi: \"Khi nhấn phím mũi tên chéo (vừa lên vừa phải), nhân vật game di chuyển theo vectơ nào?\"',
  },
  exit: [
    'Nêu định nghĩa tọa độ của vectơ u đối với hệ trục Oxy.',
    'Nêu 1 bẫy (chỉ nhân k vào hoành độ mà quên nhân vào tung độ).',
    'Tự đánh giá M / S / C.',
    'Tìm tọa độ của vectơ u = 5j - 2i.',
  ],
  exitCue: 'Nhìn lại vị trí radar máy bay mở đầu.',
  after: '- Chuẩn bị bài tiếp theo: Biểu thức tọa độ của độ dài và tích vô hướng.',
  snapshot: {
    focus: 'Hình thành định nghĩa tọa độ vectơ qua hai vectơ đơn vị i, j; các phép toán cộng, trừ vectơ, nhân vectơ với số; điều kiện hai vectơ cùng phương theo tọa độ.',
    formulas: [
      '\\vec u = (x; y) \\iff \\vec u = x\\vec i + y\\vec j',
      '\\vec u \\pm \\vec v = (x_1 \\pm x_2; y_1 \\pm y_2); \\quad k\\vec u = (kx; ky)',
      '\\vec u = \\vec v \\iff x_1 = x_2 \\text{ và } y_1 = y_2',
      '\\vec u \\parallel \\vec v \\iff x_1 y_2 - x_2 y_1 = 0 \\quad (\\exists k: \\vec u = k\\vec v)',
    ],
    boardKnowledge: [
      'I. Định nghĩa: u = (x; y) nghĩa là u phân tích được duy nhất thành x·i + y·j.',
      'II. Phép toán: Cộng, trừ, nhân số thực hiện độc lập trên từng tọa độ.',
      'III. Cùng phương: Tỉ số các tọa độ tương ứng bằng nhau.',
    ],
    examples: [
      {
        question: 'Cho a = (2; -3), b = (-1; 4). Tìm tọa độ của vectơ u = 3a + 2b.',
        solution: '3a = (6; -9), 2b = (-2; 8) -> u = (6 + (-2); -9 + 8) = (4; -1).',
      },
      {
        question: 'Tìm m để hai vectơ u = (2; m) và v = (4; 6) cùng phương.',
        solution: 'Hai vectơ cùng phương khi 2/4 = m/6 <=> 1/2 = m/6 <=> m = 3.',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Biết u = 3i - 4j. Tìm tọa độ của vectơ u.', answer: 'u = (3; -4).' },
      { level: 'NB', question: 'Cho a = (1; 2) và b = (3; -1). Tính tọa độ của a + b.', answer: 'a + b = (1 + 3; 2 + (-1)) = (4; 1).' },
      { level: 'TH', question: 'Cho u = (2; -5). Tìm tọa độ của vectơ -3u.', answer: '-3u = (-3·2; -3·(-5)) = (-6; 15).' },
      { level: 'TH', question: 'Hai vectơ a = (x; 4) và b = (3; 6) cùng phương khi x bằng bao nhiêu?', answer: 'x/3 = 4/6 = 2/3 <=> x = 2.' },
      { level: 'VD', question: 'Cho 3 vectơ a = (1; 2), b = (-3; 1), c = (5; 4). Phân tích vectơ c theo a và b: c = ma + nb.', answer: 'Ta có hệ: m - 3n = 5 và 2m + n = 4. Giải hệ: từ pt2 có n = 4 - 2m thay vào pt1: m - 3(4 - 2m) = 5 <=> 7m = 17 <=> m = 17/7; n = -6/7. Vậy c = (17/7)a - (6/7)b.' },
      { level: 'VD', question: 'Cho A(1; 2), B(3; 5), C(-1; 4). Tìm tọa độ điểm D sao cho ABCD là hình bình hành.', answer: 'ABCD là HBH <=> AB = DC. AB = (3-1; 5-2) = (2; 3). Gọi D(xD; yD) -> DC = (-1 - xD; 4 - yD). Do đó: -1 - xD = 2 => xD = -3; 4 - yD = 3 => yD = 1. Vậy D(-3; 1).' },
    ],
    quick: [
      { question: 'Vectơ có tọa độ (0; 0) là vectơ gì?', solution: 'Là vectơ không (vectơ 0).' },
      { question: 'Nếu u = (1; 2) thì 0·u có tọa độ là bao nhiêu?', solution: 'Bằng (0; 0).' },
    ],
    mistakes: [
      'Ghi nhầm thứ tự i và j: viết u = 3j - 2i thành u = (3; -2) thay vì (-2; 3).',
      'Chỉ nhân hệ số k vào hoành độ mà quên nhân vào tung độ.',
      'Lấy tọa độ điểm trừ nhầm: tính AB bằng A trừ B thay vì B trừ A.',
    ],
  },
  aiError: {
    category: 'Lỗi quy tắc',
    wrongSolution: 'AI viết: Cho vectơ u = 4j - 3i. Do đó tọa độ của vectơ u là u = (4; -3).',
    correction: 'Hoành độ là hệ số của vectơ đơn vị i, tung độ là hệ số của vectơ đơn vị j. Biểu thức u = -3i + 4j nên tọa độ đúng phải là u = (-3; 4).',
    proof: 'Định nghĩa: vectơ u = (x; y) tương đương u = x·i + y·j. Hệ số của i đứng trước (hoành độ), hệ số của j đứng sau (tung độ). AI đã nhầm theo thứ tự xuất hiện trong đề bài.',
    whyAiError: 'Mô hình đọc chuỗi ký tự theo thứ tự xuất hiện thay vì phân tích đúng vai trò của các vectơ đơn vị cơ sở.',
    teacherPrompt: 'AI kết luận u = (4; -3) từ u = 4j - 3i. Em hãy chỉ lỗi quy tắc và sửa lại tọa độ chuẩn xác của u.',
    studentProduct: 'Ghi “Lỗi quy tắc: hoành độ phải đi với i”, đổi thứ tự thành u = (-3; 4).',
    boardPrompt: 'AI viết u = (4; -3) khi u = 4j - 3i. Vectơ đơn vị i gắn với trục nào?',
    libraryTitle: 'Lỗi AI nhầm thứ tự hoành độ và tung độ khi đổi vị trí i và j',
  },
};

export default [L99];

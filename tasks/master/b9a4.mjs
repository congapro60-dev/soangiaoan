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

// Bài 4: 10-12-92 — Tổng và hiệu của hai vectơ (Tiết 4: Luyện tập)
const L92 = {
  ...base('10-12-92', 92, 'practice'),
  title: 'Tổng và hiệu của hai vectơ',
  goals: {
    must: 'Sử dụng thành thạo quy tắc ba điểm và quy tắc hình bình hành để tính tổng và hiệu hai vectơ.',
    should: 'Chứng minh các đẳng thức vectơ cơ bản; áp dụng quy tắc trung điểm và trọng tâm tam giác.',
    could: 'Tính độ dài của vectơ tổng và hiệu trong các hình học cụ thể (hình vuông, tam giác đều).',
  },
  opening: 'Một chiếc cano chuyển động trên sông chịu đồng thời lực đẩy của động cơ và lực cản của dòng nước — hôm nay ta luyện tập tổng hợp lực bằng toán vectơ.',
  focusQuestion: 'Độ dài của tổng hai vectơ |a + b| có luôn bằng tổng hai độ dài |a| + |b| không? Khi nào dấu bằng xảy ra?',
  axis: `**Tình huống: Tổng hợp lực kéo vật thể trên mặt phẳng của hai tàu kéo:**
- Hai tàu kéo $A$ và $B$ cùng kéo một sà lan tại điểm $O$ với các lực $\\vec F_1 = \\vec{OA}$ và $\\vec F_2 = \\vec{OB}$.
- Góc giữa hai lực: $\\widehat{AOB} = 90^\\circ$. Độ lớn: $|\\vec F_1| = 3000$ N, $|\\vec F_2| = 4000$ N.
- Lực tổng hợp: $\\vec F = \\vec F_1 + \\vec F_2 = \\vec{OC}$ (theo quy tắc hình bình hành, ở đây $OACB$ là hình chữ nhật).
- Độ lớn lực tổng hợp:
  $$|\\vec F| = |\\vec{OC}| = \\sqrt{|\\vec F_1|^2 + |\\vec F_2|^2} = \\sqrt{3000^2 + 4000^2} = 5000 \\text{ N}.$$
- **So sánh then chốt:** $|\\vec F_1 + \\vec F_2| = 5000$ N, trong khi $|\\vec F_1| + |\\vec F_2| = 3000 + 4000 = 7000$ N.
- Bất đẳng thức tam giác: $|\\vec a + \\vec b| \\le |\\vec a| + |\\vec b|$; dấu bằng chỉ xảy ra khi hai vectơ cùng hướng.`,
  s1: {
    title: 'Độ lớn lực kéo tổng hợp',
    context: 'Hai lực vuông góc F1 = 3000 N và F2 = 4000 N cùng tác dụng vào sà lan tại điểm O.',
    question: 'Độ lớn của lực tổng hợp F tác dụng lên sà lan là bao nhiêu?',
    options: ['7000 N (3000 + 4000)', '5000 N (Định lý Pythagore)', '1000 N (4000 - 3000)'],
    correct: 1,
    why: 'Theo quy tắc hình bình hành, độ dài vectơ đường chéo hình chữ nhật là √(3000² + 4000²) = 5000 N.',
    discuss: ['`[PHÁT HIỆN]` Vì sao không được cộng trực tiếp hai độ dài 3000 + 4000?', '`[SO SÁNH]` Khi nào thì độ lớn lực tổng hợp đúng bằng 7000 N?'],
    cue: 'Vẽ hình bình hành OACB có góc vuông; F là đường chéo OC.',
    lookFor: 'HS phân biệt cộng vectơ với cộng độ dài đại số.',
  },
  s3: {
    title: 'Các quy tắc vectơ cốt lõi',
    steps: [
      'Quy tắc ba điểm: $\\vec{AB} + \\vec{BC} = \\vec{AC}$ (đuôi nối ngọn).',
      'Quy tắc trừ ba điểm: $\\vec{OB} - \\vec{OA} = \\vec{AB}$ (chung gốc, ngọn trước trừ ngọn sau).',
      'Quy tắc hình bình hành: nếu $ABCD$ là hình bình hành thì $\\vec{AB} + \\vec{AD} = \\vec{AC}$.',
      'Tính chất trung điểm: $M$ là trung điểm $AB \\iff \\vec{MA} + \\vec{MB} = \\vec 0 \\iff \\vec{OA} + \\vec{OB} = 2\\vec{OM}$.',
    ],
    ask: ['`[SUY LUẬN]` Để tính độ dài $|\\vec a - \\vec b|$, ta đưa về độ dài đoạn thẳng nào?', '`[PHÁT HIỆN]` Tại sao $\\vec{AB} - \\vec{AC} = \\vec{CB}$ chứ không phải $\\vec{BC}$?'],
    cue: 'Vẽ hình minh họa quy tắc 3 điểm, hình bình hành và quy tắc trừ.',
    close: 'Muốn tính độ dài vectơ tổng/hiệu: trước hết phải thu gọn thành MỘT vectơ đơn qua các quy tắc.',
  },
  s4: {
    bat: 'AI giải: Cho tam giác vuông ABC tại A có AB = 3, AC = 4. Tính |AB + AC|: AI viết |AB + AC| = |AB| + |AC| = 3 + 4 = 7.',
    chung: 'Tổng độ dài hai vectơ chỉ bằng tổng các độ dài khi hai vectơ cùng hướng. Ở đây AB và AC vuông góc nhau.',
    sua: 'Dựng hình chữ nhật ABDC: AB + AC = AD. Khi đó |AB + AC| = |AD| = √(3² + 4²) = 5.',
    cue: 'Yêu cầu HS vẽ tam giác ABC vuông tại A và dựng vectơ tổng AB + AC.',
    lookFor: 'HS nhận ra phải dựng vectơ tổng trước rồi mới tính độ dài.',
  },
  s6: {
    hints: {
      M: 'áp dụng quy tắc 3 điểm nối đuôi; quy tắc trừ chung gốc: OB - OA = AB.',
      S: 'dựng hình bình hành hoặc dùng công thức trung điểm để gộp hai vectơ thành một.',
      C: 'tính bình phương vô hướng hoặc dùng định lý cosin trong tam giác để tính độ dài.',
    },
    lookFor: 'HS M áp dụng đúng quy tắc 3 điểm; HS S dựng đúng hình; HS C tính đúng độ dài.',
  },
  postCheck: {
    q: 'Cho hình vuông ABCD cạnh a. Tính độ dài của vectơ $\\vec u = \\vec{AB} + \\vec{AD}$.',
    a: 'Theo quy tắc hình bình hành: $\\vec{AB} + \\vec{AD} = \\vec{AC}$. Độ dài: $|\\vec u| = |\\vec{AC}| = a\\sqrt{2}$.',
    ds: [
      { t: '\"|a + b| luôn bằng |a| + |b|\"', v: 'Sai — chỉ bằng khi hai vectơ cùng hướng' },
      { t: '\"Quy tắc trừ: OB - OA = AB\"', v: 'Đúng' },
      { t: '\"Nếu M là trung điểm AB thì MA + MB = 0\"', v: 'Đúng' },
    ],
    cue: 'Đổi phiếu chấm chéo, chú ý công thức đường chéo hình vuông a√2.',
  },
  s8Close: 'Gộp vectơ trước khi tính độ dài; nối đuôi thì cộng, chung gốc thì trừ/hình bình hành.',
  s9: {
    title: 'Ứng dụng vectơ trong vật lý và định vị GPS',
    bullets: [
      'Tổng hợp lực, vận tốc và gia tốc trong cơ học cổ điển hoàn toàn dựa trên phép cộng vectơ.',
      'Hệ thống định vị toàn cầu GPS dùng giao thoa tín hiệu vectơ khoảng cách từ 4 vệ tinh.',
      'Lập trình game và đồ họa 3D mô phỏng chuyển động nhân vật qua phép cộng trừ vectơ.',
    ],
    cue: 'Hỏi: \"Máy bay bay trong gió ngược chịu lực tổng hợp như thế nào?\"',
  },
  exit: [
    'Phát biểu quy tắc ba điểm và quy tắc hình bình hành.',
    'Nêu 1 bẫy (|a + b| = |a| + |b|; nhầm thứ tự điểm trong phép trừ).',
    'Tự đánh giá M / S / C.',
    'Cho tam giác đều ABC cạnh 2. Tính |AB - AC|.',
  ],
  exitCue: 'Nhìn lại hình chữ nhật tổng hợp lực mở đầu.',
  after: '- HS làm bài tập SGK về tổng và hiệu vectơ; chuẩn bị bài tích của vectơ với một số.',
  snapshot: {
    focus: 'Luyện tập thành thạo các quy tắc cộng, trừ vectơ; quy tắc trung điểm, trọng tâm; tính độ dài vectơ tổng và hiệu trong các hình học quen thuộc.',
    formulas: [
      '\\vec{AB} + \\vec{BC} = \\vec{AC}',
      '\\vec{OB} - \\vec{OA} = \\vec{AB}',
      'ABCD \\text{ là HBH} \\implies \\vec{AB} + \\vec{AD} = \\vec{AC}',
      'M \\text{ là trung điểm } AB \\implies \\vec{OA} + \\vec{OB} = 2\\vec{OM}',
      '|\\vec a + \\vec b| \\le |\\vec a| + |\\vec b|',
    ],
    boardKnowledge: [
      'I. Quy tắc ba điểm: Nối đuôi thì cộng; Chung gốc thì trừ (ngọn sau trừ ngọn trước).',
      'II. Quy tắc hình bình hành: AB + AD = AC (đường chéo xuất phát từ đỉnh chung).',
      'III. Tính độ dài: Luôn thu gọn thành một vectơ duy nhất trước khi lấy độ dài.',
    ],
    examples: [
      {
        question: 'Cho tam giác đều ABC cạnh a. Tính độ dài của vectơ u = AB - AC.',
        solution: 'Theo quy tắc trừ: u = AB - AC = CB. Độ dài |u| = |CB| = a.',
      },
      {
        question: 'Cho hình chữ nhật ABCD có AB = 3, AD = 4. Tính độ dài vectơ v = AB + AD.',
        solution: 'Theo quy tắc hình bình hành: v = AB + AD = AC. Tam giác ABC vuông tại B nên AC = √(AB² + BC²) = √(3² + 4²) = 5. Vậy |v| = 5.',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Thu gọn biểu thức vectơ: AB + BC + CD.', answer: 'AB + BC + CD = (AB + BC) + CD = AC + CD = AD.' },
      { level: 'NB', question: 'Cho 3 điểm phân biệt A, B, C. Vectơ CA - CB bằng vectơ nào?', answer: 'CA - CB = BA.' },
      { level: 'TH', question: 'Cho hình thoi ABCD tâm O. Tính tổng OA + OB + OC + OD.', answer: 'Vì O là trung điểm AC và BD nên OA + OC = 0 và OB + OD = 0. Tổng = 0.' },
      { level: 'TH', question: 'Cho tam giác vuông ABC tại A có AB = 6, AC = 8. Tính độ dài vectơ AB + AC.', answer: 'Dựng HBH ABDC (hình chữ nhật) -> AB + AC = AD. AD = BC = √(6² + 8²) = 10.' },
      { level: 'VD', question: 'Cho tam giác đều ABC cạnh a, gọi M là trung điểm BC. Tính độ dài vectơ AB + AC.', answer: 'M là trung điểm BC -> AB + AC = 2AM. AM là đường cao tam giác đều cạnh a -> AM = a√3/2. Vậy |AB + AC| = 2 · (a√3/2) = a√3.' },
      { level: 'VD', question: 'Cho 4 điểm A, B, C, D bất kỳ. Chứng minh đẳng thức: AB + CD = AD + CB.', answer: 'VT - VP = (AB - AD) + (CD - CB) = DB + DB? Sửa: VT = AB + CD = (AD + DB) + (CB + BD) = AD + CB + (DB + BD) = AD + CB + 0 = VP (đpcm).' },
    ],
    quick: [
      { question: 'Có bao giờ độ dài vectơ tổng |a + b| nhỏ hơn |a| không?', solution: 'Có thể, ví dụ hai vectơ ngược hướng: a có độ lớn 5, b có độ lớn 3 ngược hướng thì |a + b| = 2 < 5.' },
      { question: 'Quy tắc trừ áp dụng khi hai vectơ có đặc điểm gì?', solution: 'Áp dụng khi hai vectơ có chung điểm gốc: OA - OB = BA.' },
    ],
    mistakes: [
      'Tự ý cộng hai độ dài đại số khi tính độ dài vectơ tổng: |a + b| = |a| + |b|.',
      'Nhầm thứ tự điểm trong quy tắc trừ: viết AB - AC = BC thay vì CB.',
      'Quên dấu vectơ mũi tên dẫn đến nhầm lẫn giữa đoạn thẳng và vectơ.',
    ],
  },
  aiError: {
    category: 'Lỗi khái niệm',
    wrongSolution: 'AI viết: Cho tam giác vuông ABC tại A có AB = 3, AC = 4. Ta có |AB + AC| = |AB| + |AC| = 3 + 4 = 7.',
    correction: 'Không được cộng trực tiếp độ dài của hai vectơ không cùng hướng. Sửa lại: Dựng điểm D sao cho ABDC là hình chữ nhật, khi đó AB + AC = AD nên |AB + AC| = AD = √(3² + 4²) = 5.',
    proof: 'Bất đẳng thức tam giác: |u + v| ≤ |u| + |v|. Dấu bằng chỉ xảy ra khi u và v cùng hướng. Ở đây AB vuông góc AC nên |AB + AC| < |AB| + |AC|.',
    whyAiError: 'Mô hình nhầm phép cộng vectơ với phép cộng số học của các độ dài hình học thông thường.',
    teacherPrompt: 'AI tính |AB + AC| = 3 + 4 = 7 trong tam giác vuông. Em hãy chỉ lỗi sai và sửa lại: cách tính độ dài vectơ tổng đúng là gì?',
    studentProduct: 'Ghi “Lỗi khái niệm: cộng độ dài thay vì cộng vectơ”, vẽ hình chữ nhật ABDC và sửa thành |AB + AC| = 5.',
    boardPrompt: 'AI viết |AB + AC| = |AB| + |AC| = 7. Phép cộng vectơ tuân theo quy tắc hình học nào?',
    libraryTitle: 'Lỗi AI cộng trực tiếp độ dài khi tính độ dài vectơ tổng',
  },
};

// Bài 5: 10-12-93 — Tích của một vectơ với một số (Tiết 1)
const L93 = {
  ...base('10-12-93', 93, 'formation'),
  title: 'Tích của một vectơ với một số',
  goals: {
    must: 'Hiểu định nghĩa tích của một số thực k với một vectơ; xác định hướng và độ dài của k·a.',
    should: 'Nắm vững các tính chất phân phối, kết hợp; điều kiện hai vectơ cùng phương (a = k·b).',
    could: 'Vận dụng điều kiện ba điểm thẳng hàng và biểu diễn một vectơ theo hai vectơ không cùng phương.',
  },
  opening: 'Khi phóng to hay thu nhỏ một hình vẽ trong phần mềm thiết kế, các vectơ chỉ phương được nhân với một hệ số k — hôm nay ta tìm hiểu phép toán này.',
  focusQuestion: 'Khi nhân vectơ a với số k < 0, hướng và độ dài của vectơ mới thay đổi như thế nào?',
  axis: `**Tình huống: Điều khiển chuyển động drone trên đường thẳng bay:**
- Drone chuyển động với vận tốc ban đầu $\\vec v$.
- Tăng tốc gấp đôi cùng chiều bay: vectơ vận tốc mới là $\\vec v_1 = 2\\vec v$.
  - Hướng: cùng hướng với $\\vec v$ (vì $k = 2 > 0$). Độ lớn: $|\\vec v_1| = 2|\\vec v|$.
- Đảo chiều quay đầu với tốc độ gấp 1,5 lần: vectơ vận tốc mới là $\\vec v_2 = -1{,}5\\vec v$.
  - Hướng: ngược hướng với $\\vec v$ (vì $k = -1{,}5 < 0$). Độ lớn: $|\\vec v_2| = |-1{,}5||\\vec v| = 1{,}5|\\vec v|$.
- **Định nghĩa tổng quát:** Cho số thực $k$ và vectơ $\\vec a \\ne \\vec 0$:
  - $k\\vec a$ là một vectơ cùng hướng với $\\vec a$ nếu $k > 0$, ngược hướng với $\\vec a$ nếu $k < 0$.
  - Độ dài: $|k\\vec a| = |k| \\cdot |\\vec a|$.
- **Quy ước:** $0 \\cdot \\vec a = \\vec 0$ và $k \\cdot \\vec 0 = \\vec 0$.`,
  s1: {
    title: 'Vận tốc mới của drone',
    context: 'Drone bay với vận tốc v. Khi đảo ngược chiều bay và tăng tốc độ lên 3 lần, vectơ vận tốc mới là u = -3v.',
    question: 'Khẳng định nào sau đây về hướng và độ lớn của u là đúng?',
    options: ['u cùng hướng với v và |u| = 3|v|', 'u ngược hướng với v và |u| = 3|v|', 'u ngược hướng với v và |u| = -3|v|'],
    correct: 1,
    why: 'Vì k = -3 < 0 nên u ngược hướng với v; độ dài |u| = |-3||v| = 3|v| (độ dài luôn dương).',
    discuss: ['`[PHÁT HIỆN]` Vì sao độ dài |u| không thể bằng -3|v|?', '`[SO SÁNH]` Nếu k = 0 thì vectơ kết quả là gì?'],
    cue: 'Nhấn mạnh: độ dài có dấu giá trị tuyệt đối |k|; dấu của k chỉ quyết định HƯỚNG.',
    lookFor: 'HS phân biệt dấu của k (hướng) và độ lớn |k| (độ dài).',
  },
  s3: {
    title: 'Định nghĩa và tính chất của phép nhân vectơ với số',
    steps: [
      'Định nghĩa: $k\\vec a$ cùng hướng $\\vec a$ nếu $k > 0$, ngược hướng nếu $k < 0$; $|k\\vec a| = |k| \\cdot |\\vec a|$.',
      'Tính chất kết hợp: $k(m\\vec a) = (km)\\vec a$.',
      'Tính chất phân phối: $(k + m)\\vec a = k\\vec a + m\\vec a$ và $k(\\vec a + \\vec b) = k\\vec a + k\\vec b$.',
      'Điều kiện cùng phương: $\\vec a$ và $\\vec b$ (với $\\vec b \\ne \\vec 0$) cùng phương $\\iff \\exists k \\in \\mathbb{R}: \\vec a = k\\vec b$.',
    ],
    ask: ['`[SUY LUẬN]` Làm thế nào để chứng minh ba điểm A, B, C thẳng hàng bằng vectơ?', '`[PHÁT HIỆN]` Hai vectơ đối nhau liên hệ thế nào qua phép nhân số?'],
    cue: 'Vẽ trục số và các vectơ 2a, -3a, 1/2a.',
    close: 'k quyết định hướng qua dấu (+ là cùng, - là ngược) và quyết định độ co giãn qua |k|.',
  },
  s4: {
    bat: 'AI giải: Cho vectơ a có độ dài bằng 4. Khi đó độ dài của vectơ -2a là |-2a| = -2 · 4 = -8.',
    chung: 'Độ dài của một vectơ luôn là số không âm. Theo định nghĩa: |k·a| = |k| · |a|.',
    sua: '|-2a| = |-2| · |a| = 2 · 4 = 8; độ dài không bao giờ mang giá trị âm.',
    cue: 'Yêu cầu HS viết lại công thức độ dài có dấu giá trị tuyệt đối.',
    lookFor: 'HS chỉ ra sai sót dấu âm và sửa thành 8.',
  },
  s6: {
    hints: {
      M: 'áp dụng định nghĩa |k·a| = |k|·|a|; k > 0 cùng hướng, k < 0 ngược hướng.',
      S: 'dùng tính chất phân phối để rút gọn biểu thức vectơ chứa số.',
      C: 'để chứng minh A, B, C thẳng hàng: chỉ ra AB = k·AC.',
    },
    lookFor: 'HS M xác định đúng hướng và độ dài; HS S rút gọn đúng; HS C chứng minh thẳng hàng.',
  },
  postCheck: {
    q: 'Cho vectơ $\\vec a \\ne \\vec 0$. Tìm số $k$ sao cho vectơ $k\\vec a$ ngược hướng với $\\vec a$ và có độ dài gấp 4 lần $|\\vec a|$.',
    a: 'Vì ngược hướng nên $k < 0$. Vì độ dài gấp 4 lần nên $|k| = 4$. Do đó $k = -4$.',
    ds: [
      { t: '\"|k·a| = k·|a| với mọi k thực\"', v: 'Sai — phải là |k|·|a|' },
      { t: '\"Nếu k < 0 thì k·a ngược hướng với a\"', v: 'Đúng' },
      { t: '\"A, B, C thẳng hàng khi và chỉ khi tồn tại k sao cho AB = k·AC\"', v: 'Đúng' },
    ],
    cue: 'Đổi phiếu chấm chéo, chú ý k = -4 chứ không phải 4.',
  },
  s8Close: '|k·a| = |k|·|a| ≥ 0; k > 0 cùng hướng, k < 0 ngược hướng; a = k·b -> cùng phương.',
  s9: {
    title: 'Ứng dụng trong đồ họa máy tính và xử lý ảnh',
    bullets: [
      'Phép thu phóng (scaling) ảnh vector trong Adobe Illustrator dựa trên phép nhân vectơ với tỉ lệ k.',
      'Nếu k > 1 ảnh phóng to; 0 < k < 1 ảnh thu nhỏ; k < 0 tạo phép đối xứng qua tâm và đảo chiều.',
      'Định dạng ảnh vector SVG không bị vỡ hạt khi phóng to nhờ tính chất toán học này.',
    ],
    cue: 'Hỏi: \"Tại sao ảnh vector SVG phóng to vô hạn không vỡ hình như ảnh JPEG?\"',
  },
  exit: [
    'Nêu định nghĩa hướng và độ dài của vectơ k·a.',
    'Nêu 1 bẫy (|k·a| = k·|a| mang dấu âm khi k < 0).',
    'Tự đánh giá M / S / C.',
    'Nếu AB = -2CD thì hai đoạn thẳng AB và CD song song hay chéo nhau?',
  ],
  exitCue: 'Nhìn lại tình huống drone tăng tốc và quay đầu.',
  after: '- HS hoàn thành bài tập SGK về tích vectơ với một số; chuẩn bị bài phân tích vectơ theo hai vectơ không cùng phương.',
  snapshot: {
    focus: 'Hình thành định nghĩa tích vectơ với một số; các tính chất phân phối, kết hợp; điều kiện hai vectơ cùng phương và ứng dụng chứng minh ba điểm thẳng hàng.',
    formulas: [
      '|k\\vec a| = |k| \\cdot |\\vec a|',
      'k > 0 \\implies k\\vec a \\uparrow\\uparrow \\vec a; \\quad k < 0 \\implies k\\vec a \\uparrow\\downarrow \\vec a',
      'k(\\vec a + \\vec b) = k\\vec a + k\\vec b; \\quad (k+m)\\vec a = k\\vec a + m\\vec a',
      '\\vec a \\parallel \\vec b \\iff \\exists k \\in \\mathbb{R}: \\vec a = k\\vec b \\; (\\vec b \\ne \\vec 0)',
    ],
    boardKnowledge: [
      'I. Định nghĩa: k·a có độ dài |k|·|a|; cùng hướng nếu k > 0, ngược hướng nếu k < 0.',
      'II. Tính chất: Phân phối đối với phép cộng vectơ và phép cộng số.',
      'III. Điều kiện cùng phương: a = k·b; Ba điểm A, B, C thẳng hàng <=> AB = k·AC.',
    ],
    examples: [
      {
        question: 'Cho tam giác ABC có M là trung điểm AB. Biểu diễn vectơ CM theo hai vectơ CA và CB.',
        solution: 'Theo tính chất trung điểm: CA + CB = 2CM -> CM = (1/2)CA + (1/2)CB.',
      },
      {
        question: 'Cho vectơ a có độ dài bằng 6. Xác định hướng và độ dài của vectơ b = -(1/3)a.',
        solution: 'Vì k = -1/3 < 0 nên b ngược hướng với a. Độ dài: |b| = |-1/3| · |a| = (1/3) · 6 = 2.',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Cho vectơ a khác 0. Vectơ -5a có cùng hướng hay ngược hướng với a?', answer: 'Ngược hướng vì hệ số k = -5 < 0.' },
      { level: 'NB', question: 'Biết |a| = 7. Tính độ dài của vectơ u = -3a.', answer: '|u| = |-3| · |a| = 3 · 7 = 21.' },
      { level: 'TH', question: 'Cho đoạn thẳng AB có I là trung điểm. Rút gọn biểu thức 2IA + 2IB.', answer: '2IA + 2IB = 2(IA + IB) = 2 · 0 = 0.' },
      { level: 'TH', question: 'Cho tam giác ABC có G là trọng tâm. Khẳng định GA + GB + GC = 0 đúng hay sai?', answer: 'Đúng, đây là tính chất trọng tâm tam giác.' },
      { level: 'VD', question: 'Cho tam giác ABC. Gọi M trên cạnh BC sao cho BM = 2MC. Biểu diễn vectơ AM theo AB và AC.', answer: 'Ta có BM = 2/3 BC = 2/3 (AC - AB). Do đó AM = AB + BM = AB + 2/3 AC - 2/3 AB = 1/3 AB + 2/3 AC.' },
      { level: 'VD', question: 'Cho 3 điểm A, B, C phân biệt thỏa mãn AB = -3AC. Hỏi ba điểm A, B, C có thẳng hàng không và điểm nào nằm giữa hai điểm còn lại?', answer: 'Vì AB = -3AC nên hai vectơ AB và AC cùng phương -> A, B, C thẳng hàng. Vì k = -3 < 0 nên AB và AC ngược hướng, do đó điểm A nằm giữa B và C.' },
    ],
    quick: [
      { question: 'Vectơ 0 nhân với số 100 bằng bao nhiêu?', solution: 'Bằng vectơ 0 (100 · 0 = 0).' },
      { question: 'Nếu a = 2b thì hai vectơ a và b có độ dài liên hệ như thế nào?', solution: '|a| = |2b| = 2|b|, độ dài của a gấp đôi độ dài của b.' },
    ],
    mistakes: [
      'Bỏ quên dấu giá trị tuyệt đối: viết |k·a| = k·|a| dẫn đến độ dài bị âm khi k < 0.',
      'Nhầm số 0 với vectơ 0 (viết k·a = 0 thay vì vectơ 0).',
      'Nhầm lẫn hướng: cho rằng số âm thì độ dài giảm đi.',
    ],
  },
  aiError: {
    category: 'Lỗi đại số',
    wrongSolution: 'AI viết: Cho vectơ a có độ dài bằng 5. Độ dài của vectơ u = -4a là |u| = -4 · 5 = -20.',
    correction: 'Độ dài của một vectơ luôn không âm. Công thức đúng: |k·a| = |k| · |a|. Sửa lại: |u| = |-4| · 5 = 4 · 5 = 20.',
    proof: 'Độ dài vectơ đại diện cho khoảng cách hình học, luôn là số thực không âm. Dấu trừ của k = -4 chỉ xác định hướng ngược lại, không làm độ dài âm.',
    whyAiError: 'Mô hình nhân số vô hướng với độ dài mà không lấy giá trị tuyệt đối của hệ số k.',
    teacherPrompt: 'AI tính độ dài |u| = -4 · 5 = -20. Em hãy chỉ lỗi sai và sửa lại: độ dài vectơ có âm được không?',
    studentProduct: 'Ghi “Lỗi đại số: độ dài phải không âm”, sửa thành |u| = |-4| · 5 = 20.',
    boardPrompt: 'AI tính độ dài ra số âm -20. Công thức độ dài |k·a| cần dấu gì ở hệ số k?',
    libraryTitle: 'Lỗi AI tính độ dài vectơ ra số âm khi nhân với số âm',
  },
};

export default [L92, L93];

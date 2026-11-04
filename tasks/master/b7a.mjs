const base = {
  grade: 12, week: 6, date: '2026-11-04',
  timeMap: [
    ['HĐ 1 Khởi động — tình huống trục thực nghiệm', 'P0–P3', 'S0 0–180 + S1 180–300'],
    ['HĐ 2 Mục tiêu / chọn tuyến', 'P3–P5', 'S2 300–420'],
    ['HĐ 3 Hình thành hoặc chữa mẫu', 'P5–P16', 'S3 420–780'],
    ['HĐ 4 AI Error + chốt bẫy', 'P16–P19', 'S4 1080–1320'],
    ['HĐ 5 Phân luồng M/S/C', 'P20–P22', 'S5 1320–1500'],
    ['HĐ 6 Luyện tập + post-check', 'P22–P34', 'S6 1620–2040 + S7 1620–2040'],
    ['HĐ 7 Kiểm tra nhanh', 'P34–P36', 'S8 2040–2160'],
    ['HĐ 8 Vận dụng thực tế', 'P36–P39', 'S9 2160–2340'],
    ['HĐ 9 Exit Ticket & tự đánh giá', 'P39–P40', 'S10 2340–2400'],
  ],
};

const L34 = {
  ...base,
  key: '12-6-34', period: 34, lessonType: 'formation',
  title: 'Khảo sát hàm phân thức bậc nhất trên bậc nhất',
  opening: 'Nồng độ thuốc trong máu theo thời gian thường có dạng phân thức bậc nhất trên bậc nhất — hôm nay lớp mình khảo sát dạng hàm này.',
  focusQuestion: 'Vì sao hàm $y = \\dfrac{ax+b}{cx+d}$ chỉ có hai dạng biến thiên (luôn tăng hoặc luôn giảm)?',
  axis: `**Tình huống: Nồng độ thuốc (mg/L) trong máu sau $t$ giờ: $C(t) = \\dfrac{2t + 1}{t + 3}$, $t \\ge 0$.**

- **Tập xác định:** $D = \\mathbb{R} \\setminus \\{-3\\}$; với bài thực tế chỉ xét $t \\ge 0$.
- **Đạo hàm:** $C\'(t) = \\dfrac{2(t+3) - (2t+1)\\cdot1}{(t+3)^2} = \\dfrac{5}{(t+3)^2} > 0$ → hàm **luôn tăng** trên từng khoảng xác định.
- **Tiệm cận đứng:** $t = -3$. **Tiệm cận ngang:** $y = 2$ (tỉ số hệ số bậc cao nhất).
- **Kiểm chứng tay:** $C(0) = \\tfrac13 \\approx 0{,}33$; $C(1) = \\tfrac34 = 0{,}75$; $C(7) = \\tfrac{15}{10} = 1{,}5$; $C(97) = \\tfrac{195}{100} = 1{,}95$ → tiến dần 2 mg/L.
- **Tâm đối xứng:** giao hai tiệm cận $(-3; 2)$.

**Bẫy của bài:** tính đạo hàm sai dấu ($ad - bc$); nhầm tâm đối xứng với gốc tọa độ; quên tập xác định.`,
  goals: {
    must: 'Tính đạo hàm, xác định chiều biến thiên và hai tiệm cận của hàm bậc nhất/bậc nhất.',
    should: 'Lập bảng biến thiên, xác định tâm đối xứng và vẽ đồ thị.',
    could: 'Mô hình hóa nồng độ thuốc và biện luận theo tham số.',
  },
  s1: {
    title: 'Nồng độ thuốc theo thời gian',
    context: 'C(t) = (2t+1)/(t+3). Cần biết nồng độ tăng hay giảm và tiến về đâu.',
    question: 'Đạo hàm của $C(t) = \\dfrac{2t+1}{t+3}$ bằng bao nhiêu?',
    options: ['5/(t+3)²', '−5/(t+3)²', '2/(t+3)²'],
    correct: 0,
    why: 'Quy tắc thương: (2(t+3) − (2t+1)·1)/(t+3)² = 5/(t+3)².',
    discuss: ['`[PHÁT HIỆN]` Vì sao đạo hàm luôn dương?', '`[SO SÁNH]` Tiệm cận ngang và đứng ở đâu?'],
    cue: 'Viết công thức đạo hàm tổng quát (ad − bc)/(cx+d)² và thay số.',
    lookFor: 'HS tính đúng tử số ad − bc.',
  },
  s3: {
    title: 'Bốn bước khảo sát hàm bậc nhất/bậc nhất',
    steps: [
      'Tập xác định: $cx + d \\ne 0 \\Rightarrow x \\ne -\\tfrac{d}{c}$.',
      'Đạo hàm: $y\' = \\dfrac{ad - bc}{(cx+d)^2}$ — dấu không đổi trên từng khoảng.',
      'Tiệm cận: đứng $x = -\\tfrac{d}{c}$; ngang $y = \\tfrac{a}{c}$.',
      'Bảng biến thiên + tâm đối xứng $\\left(-\\tfrac{d}{c}; \\tfrac{a}{c}\\right)$ + vẽ.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao đạo hàm không đổi dấu?', '`[PHÁT HIỆN]` Nếu $ad - bc < 0$ thì hàm thế nào?'],
    cue: 'Khung 4 bước; nhắc: "(cx+d)² luôn dương nên dấu do ad − bc".',
    close: 'Hàm bậc nhất/bậc nhất chỉ có hai kiểu: tăng đều hoặc giảm đều trên từng khoảng.',
  },
  s4: { bat: 'AI kết luận hàm nghịch biến vì "mẫu tăng nên phân số giảm".', chung: 'Phải xét đạo hàm: $C\'(t) = 5/(t+3)^2 > 0$ nên hàm **đồng biến**, dù mẫu tăng (tử cũng tăng nhanh hơn).', sua: 'Đồng biến trên $(-3; +\\infty)$ và $(-\\infty; -3)$.', cue: 'Cho HS tính C(0), C(7), C(97) để thấy tăng dần.', lookFor: 'HS dùng đạo hàm thay vì cảm giác.' },
  s6: { hints: { M: 'tính ad − bc rồi xét dấu.', S: 'lập bảng biến thiên và tìm tâm đối xứng.', C: 'biện luận theo tham số a, b, c, d.' }, lookFor: 'HS M đúng dấu; HS S đủ bước; HS C biện luận được.' },
  postCheck: {
    q: 'Khảo sát chiều biến thiên và tiệm cận của $y = \\dfrac{-x+2}{x-1}$.',
    a: '$y\' = \\dfrac{(-1)\\cdot1 - 2\\cdot1}{(x-1)^2} = \\dfrac{-3}{(x-1)^2} < 0$ ⇒ nghịch biến trên từng khoảng. Tiệm cận đứng $x = 1$; ngang $y = -1$; tâm đối xứng $(1; -1)$.',
    ds: [{ t: '"Đạo hàm của (ax+b)/(cx+d) là (ad − bc)/(cx+d)²"', v: 'Đúng' }, { t: '"Tiệm cận ngang là y = a/c"', v: 'Đúng' }, { t: '"Hàm luôn tăng vì tử và mẫu đều tăng"', v: 'Sai' }],
    cue: 'Chiếu 2 bảng biến thiên, cùng sửa dấu.',
  },
  s8Close: 'Tập xác định — đạo hàm (ad−bc) — hai tiệm cận — bảng.',
  s9: {
    title: 'Đọc nồng độ thuốc',
    bullets: ['Nồng độ tăng từ 0,33 mg/L (t = 0) và tiến dần 2 mg/L — không vượt 2.', 'Sau 7 giờ đạt 1,5 mg/L; sau 97 giờ gần 1,95 mg/L.', 'Đường tiệm cận ngang là giới hạn sinh học của mô hình — hữu ích cho bác sĩ.'],
    cue: 'Hỏi: "Vì sao mô hình không thể vượt 2 mg/L?" → do tiệm cận ngang.',
  },
  exit: ['Nêu 4 bước khảo sát hàm bậc nhất/bậc nhất.', 'Nêu 1 bẫy (sai dấu ad − bc; nhầm tâm đối xứng).', 'Tự đánh giá M / S / C.', 'Khảo sát C(t) = (2t+1)/(t+3): chiều biến thiên và hai tiệm cận?'],
  exitCue: 'Mở lại khung 4 bước ở S3.',
  after: '- HS làm bài tập SGK; chuẩn bị tiết luyện tiếp hàm phân thức.',
  snapshot: {
    focus: 'Khảo sát hàm bậc nhất/bậc nhất trên trục nồng độ thuốc C(t) = (2t+1)/(t+3): C′(t) = 5/(t+3)² > 0 (đồng biến), tiệm cận đứng t = −3, ngang y = 2, tâm đối xứng (−3; 2); C(0) = 1/3, C(97) = 1,95',
    formulas: ['y = \\dfrac{ax+b}{cx+d}', 'y\' = \\dfrac{ad - bc}{(cx+d)^2}', '\\text{TCĐ } x = -\\dfrac{d}{c}; \\quad \\text{TCN } y = \\dfrac{a}{c}'],
    examples: [
      { question: 'Khảo sát hàm C(t) = (2t + 1)/(t + 3): tìm đạo hàm, chiều biến thiên, tiệm cận.', answer: 'Tập xác định t ≠ −3. C′(t) = (2(t+3) − (2t+1))/(t+3)² = 5/(t+3)² > 0 ⇒ đồng biến trên mỗi khoảng. Tiệm cận đứng t = −3; tiệm cận ngang y = 2; tâm đối xứng (−3; 2).' },
      { question: 'Tính C(0), C(7) và nhận xét xu hướng.', answer: 'C(0) = 1/3 ≈ 0,33; C(7) = 15/10 = 1,5. Nồng độ tăng dần và tiến về 2 mg/L (tiệm cận ngang).' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu tập xác định của y = (ax+b)/(cx+d).', answer: 'x ≠ −d/c.' },
      { level: 'NB', question: 'Nêu công thức đạo hàm của (ax+b)/(cx+d).', answer: 'y′ = (ad − bc)/(cx + d)².' },
      { level: 'TH', question: 'Khảo sát chiều biến thiên của y = (2x + 1)/(x + 3).', answer: 'y′ = (2·3 − 1·1)/(x+3)² = 5/(x+3)² > 0 ⇒ đồng biến trên (−∞;−3) và (−3;+∞).' },
      { level: 'TH', question: 'Tìm tiệm cận của y = (2x + 1)/(x + 3).', answer: 'Tiệm cận đứng x = −3; tiệm cận ngang y = 2.' },
      { level: 'VD', question: 'Khảo sát y = (−x + 2)/(x − 1).', answer: 'y′ = (−3)/(x−1)² < 0 ⇒ nghịch biến; TCĐ x = 1; TCN y = −1; tâm đối xứng (1; −1).' },
      { level: 'VD', question: 'Tìm m để hàm y = (mx + 1)/(x − 2) đồng biến trên từng khoảng xác định.', answer: 'y′ = (m·(−2) − 1·1)/(x−2)² = (−2m − 1)/(x−2)². Đồng biến ⇔ −2m − 1 > 0 ⇔ m < −1/2.' },
    ],
    quick: [
      { question: 'Vì sao hàm bậc nhất/bậc nhất không có cực trị?', solution: 'Vì đạo hàm không đổi dấu (tử ad − bc là hằng số, mẫu luôn dương) nên không có điểm mà y′ đổi dấu.' },
      { question: 'Tâm đối xứng của đồ thị hàm phân thức là giao của hai đường nào?', solution: 'Giao của tiệm cận đứng và tiệm cận ngang.' },
    ],
    mistakes: ['Tính đạo hàm sai dấu (dùng bc − ad).', 'Nhầm tâm đối xứng với gốc tọa độ.', 'Bỏ tập xác định khi kết luận biến thiên.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Bốn bước khảo sát', 'a. Tập xác định x ≠ −d/c.', 'b. y′ = (ad − bc)/(cx+d)².', 'c. Tiệm cận đứng x = −d/c; ngang y = a/c.', 'd. Bảng biến thiên, tâm đối xứng, vẽ.', '2. Áp dụng C(t) = (2t+1)/(t+3)', 'a. y′ = 5/(t+3)² > 0 ⇒ đồng biến.', 'b. TCĐ t = −3; TCN y = 2; tâm (−3; 2).', 'c. C(0) = 1/3; C(97) = 1,95.'],
  },
  aiError: {
    category: 'Lỗi đại số', wrongSolution: 'AI kết luận: "Hàm C(t) = (2t+1)/(t+3) nghịch biến vì khi t tăng thì mẫu t + 3 tăng, làm phân số giảm."',
    correction: 'Phải xét đạo hàm: C′(t) = 5/(t+3)² > 0 nên hàm đồng biến trên mỗi khoảng xác định.',
    proof: 'Kiểm bằng giá trị: C(0) = 0,33; C(7) = 1,5; C(97) = 1,95 — tăng dần. Nếu nghịch biến thì các giá trị phải giảm.',
    whyAiError: 'Mô hình suy luận theo trực giác "mẫu tăng thì phân số giảm", bỏ qua việc tử cũng tăng.',
    teacherPrompt: 'Em tính C(0), C(7), C(97) và đạo hàm để sửa lại kết luận của AI.',
    studentProduct: 'Thẻ Đ/S + ba giá trị tăng dần và đạo hàm dương, kết luận đồng biến.',
    boardPrompt: 'AI nói nghịch biến. Tính C(0) và C(97).',
    libraryTitle: 'Lỗi AI suy biến thiên từ trực giác mẫu tăng',
  },
};

const L35 = {
  ...base,
  key: '12-6-35', period: 35, lessonType: 'formation',
  title: 'Khảo sát hàm phân thức bậc nhất trên bậc nhất — tiếp',
  opening: 'Tiết này lớp mình luyện sâu: tiệm cận, đơn điệu, giao trục và bài toán tham số.',
  focusQuestion: 'Tham số ảnh hưởng thế nào đến chiều biến thiên của hàm phân thức?',
  axis: `**Tình huống: Hiệu suất lọc nước của một thiết bị: $E(x) = \\dfrac{-x + 2}{x - 1}$ (%), $x$ là số giờ vận hành.**

- **Tập xác định:** $x \\ne 1$.
- **Đạo hàm:** $E\'(x) = \\dfrac{(-1)\\cdot1 - 2\\cdot1}{(x-1)^2} = \\dfrac{-3}{(x-1)^2} < 0$ → **nghịch biến**.
- **Tiệm cận:** đứng $x = 1$; ngang $y = -1$.
- **Giao trục:** $E(0) = \\dfrac{2}{-1} = -2$ (trục tung); $E(x) = 0 \\Leftrightarrow x = 2$ (trục hoành).
- **Kiểm chứng tay:** $E(0) = -2$; $E(2) = 0$; $E(3) = \\dfrac{-1}{2} = -0{,}5$; $E(11) = \\dfrac{-9}{10} = -0{,}9$ → tiến về $-1$.
- **Tâm đối xứng:** $(1; -1)$.

**Bẫy của bài:** nhầm dấu đạo hàm khi $a < 0$; tính giao trục sai dấu; kết luận hàm nghịch biến trên toàn $\\mathbb{R}$ (sai — chỉ trên từng khoảng).`,
  goals: {
    must: 'Xác định chiều biến thiên và tiệm cận của hàm có $a < 0$.',
    should: 'Tìm giao trục, tâm đối xứng và vẽ đồ thị đúng.',
    could: 'Giải bài toán tham số: tìm $m$ để hàm đồng biến/nghịch biến; phản biện kết luận sai khoảng.',
  },
  s1: {
    title: 'Hiệu suất giảm dần',
    context: 'E(x) = (−x+2)/(x−1). Cần biết xu hướng và giới hạn.',
    question: 'Đạo hàm $E\'(x)$ bằng bao nhiêu?',
    options: ['−3/(x−1)²', '3/(x−1)²', '−1/(x−1)²'],
    correct: 0,
    why: '(ad − bc) = (−1)·1 − 2·1 = −3 nên E′ = −3/(x−1)².',
    discuss: ['`[PHÁT HIỆN]` Đồ thị cắt trục hoành tại đâu?', '`[SO SÁNH]` Tiệm cận ngang bằng bao nhiêu?'],
    cue: 'Nhắc công thức ad − bc và cho HS tính riêng tử trước.',
    lookFor: 'HS tính đúng tử số trước khi viết phân thức.',
  },
  s3: {
    title: 'Bốn bước và ba điểm đặc biệt',
    steps: [
      'Đạo hàm $E\' = \\dfrac{ad - bc}{(cx+d)^2}$; xét dấu.',
      'Tiệm cận đứng $x = -\\tfrac{d}{c}$; ngang $y = \\tfrac{a}{c}$.',
      'Giao trục: $E(0) = \\tfrac{b}{d}$; $E(x) = 0 \\Leftrightarrow x = -\\tfrac{b}{a}$.',
      'Tâm đối xứng là giao hai tiệm cận; vẽ qua các điểm đặc biệt.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao hàm nghịch biến nhưng vẫn có nhánh tăng ở bên trái tiệm cận?', '`[PHÁT HIỆN]` Tâm đối xứng ở đâu?'],
    cue: 'Khung 4 bước + bảng 3 điểm đặc biệt.',
    close: 'Chỉ cần đạo hàm, hai tiệm cận và hai giao trục là vẽ đủ đồ thị.',
  },
  s4: { bat: 'AI kết luận hàm nghịch biến trên $\\mathbb{R}$ vì $E\' < 0$ với mọi $x \\ne 1$.', chung: 'Sai phạm vi: hàm chỉ nghịch biến trên từng khoảng $(-\\infty; 1)$ và $(1; +\\infty)$, không trên toàn $\\mathbb{R}$ (tập xác định không gồm 1).', sua: 'Nghịch biến trên mỗi khoảng xác định.', cue: 'Cho HS so sánh E(0) = −2 và E(2) = 0: 0 < 2 mà E(0) < E(2) — nếu nghịch biến trên ℝ thì phải ngược lại.', lookFor: 'HS phát hiện mâu thuẫn bằng hai giá trị hai bên tiệm cận.' },
  s6: { hints: { M: 'tính ad − bc và hai tiệm cận.', S: 'tìm giao trục và tâm đối xứng.', C: 'giải bài tham số về dấu của ad − bc.' }, lookFor: 'HS M đúng dấu; HS S đủ điểm; HS C giải được m.' },
  postCheck: {
    q: 'Tìm $m$ để $y = \\dfrac{mx + 1}{x - 2}$ nghịch biến trên từng khoảng xác định.',
    a: '$y\' = \\dfrac{-2m - 1}{(x-2)^2}$; nghịch biến ⇔ $-2m - 1 < 0 \\Leftrightarrow m > -\\tfrac12$.',
    ds: [{ t: '"E′(x) = −3/(x−1)²"', v: 'Đúng' }, { t: '"Hàm nghịch biến trên ℝ"', v: 'Sai — chỉ trên từng khoảng' }, { t: '"Giao trục hoành tại x = 2"', v: 'Đúng' }],
    cue: 'Chấm chéo bảng biến thiên.',
  },
  s8Close: 'Dấu ad − bc quyết định — phạm vi là từng khoảng.',
  s9: {
    title: 'Đánh giá thiết bị lọc',
    bullets: ['Hiệu suất giảm dần từ 0% (t = 2) và tiến về −1% — mô hình cho thấy thiết bị không còn hiệu quả sau vài giờ.', 'Điểm cắt trục hoành x = 2 là thời điểm hiệu suất bằng 0 — mốc cần thay lõi lọc.', 'Tiệm cận ngang y = −1 là giới hạn dưới của mô hình.'],
    cue: 'Hỏi: "Nên thay lõi lọc trước hay sau mốc x = 2? Vì sao?"',
  },
  exit: ['Nêu 4 bước khảo sát và ba điểm đặc biệt.', 'Nêu 1 bẫy (kết luận nghịch biến trên ℝ).', 'Tự đánh giá M / S / C.', 'Khảo sát E(x) = (−x+2)/(x−1): chiều biến thiên, tiệm cận, giao trục?'],
  exitCue: 'Mở lại khung 4 bước ở S3.',
  after: '- HS làm bài tập SGK về hàm phân thức; chuẩn bị tiết hàm bậc hai/bậc nhất.',
  snapshot: {
    focus: 'Khảo sát hàm bậc nhất/bậc nhất với a < 0 trên trục hiệu suất lọc E(x) = (−x+2)/(x−1): E′ = −3/(x−1)² < 0 (nghịch biến trên từng khoảng), TCĐ x = 1, TCN y = −1, giao trục (0;−2) và (2;0), tâm đối xứng (1;−1)',
    formulas: ['y = \\dfrac{-x+2}{x-1}', 'y\' = \\dfrac{-3}{(x-1)^2}', '\\text{Giao trục: } y(0) = \\dfrac{b}{d}; \\ y = 0 \\Leftrightarrow x = -\\dfrac{b}{a}'],
    examples: [
      { question: 'Khảo sát E(x) = (−x + 2)/(x − 1): chiều biến thiên, tiệm cận, giao trục.', answer: 'Tập xác định x ≠ 1. E′ = (−1·1 − 2·1)/(x−1)² = −3/(x−1)² < 0 ⇒ nghịch biến trên mỗi khoảng. TCĐ x = 1; TCN y = −1. Giao trục tung (0; −2); giao trục hoành (2; 0). Tâm đối xứng (1; −1).' },
      { question: 'Tìm m để y = (mx+1)/(x−2) đồng biến trên từng khoảng xác định.', answer: 'y′ = (−2m − 1)/(x−2)². Đồng biến ⇔ −2m − 1 > 0 ⇔ m < −1/2.' },
    ],
    exercises: [
      { level: 'NB', question: 'Tìm tiệm cận của y = (−x+2)/(x−1).', answer: 'TCĐ x = 1; TCN y = −1.' },
      { level: 'NB', question: 'Nêu dấu đạo hàm của y = (ax+b)/(cx+d) theo ad − bc.', answer: 'ad − bc > 0: đồng biến; ad − bc < 0: nghịch biến (trên từng khoảng xác định).' },
      { level: 'TH', question: 'Tìm giao điểm với các trục của y = (−x+2)/(x−1).', answer: 'Trục tung: (0; −2); trục hoành: (2; 0).' },
      { level: 'TH', question: 'Tìm tâm đối xứng của đồ thị y = (−x+2)/(x−1).', answer: 'Giao hai tiệm cận: (1; −1).' },
      { level: 'VD', question: 'Tìm m để y = (mx+1)/(x−2) nghịch biến trên từng khoảng xác định.', answer: '−2m − 1 < 0 ⇔ m > −1/2.' },
      { level: 'VD', question: 'Phản biện: "Vì E′ < 0 với mọi x ≠ 1 nên E nghịch biến trên ℝ".', answer: 'Sai. Tập xác định không gồm x = 1, và trên hai khoảng riêng biệt hàm nghịch biến nhưng không so sánh được giá trị hai bên (ví dụ E(0) = −2 < E(2) = 0).' },
    ],
    quick: [
      { question: 'Vì sao không thể nói hàm nghịch biến trên ℝ?', solution: 'Vì tập xác định bị khuyết điểm x = 1; tính đơn điệu chỉ xét trên từng khoảng liên tục.' },
      { question: 'Giao trục hoành của (−x+2)/(x−1) ở đâu?', solution: 'Giải −x + 2 = 0 (với x ≠ 1) được x = 2.' },
    ],
    mistakes: ['Kết luận đơn điệu trên toàn ℝ.', 'Tính giao trục sai dấu.', 'Bỏ qua tập xác định khi vẽ.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Khảo sát E(x) = (−x+2)/(x−1)', 'a. y′ = −3/(x−1)² < 0.', 'b. TCĐ x = 1; TCN y = −1.', 'c. Giao trục: (0;−2) và (2;0).', 'd. Tâm đối xứng (1;−1).', '2. Bài tham số', 'a. y = (mx+1)/(x−2) nghịch biến ⇔ −2m − 1 < 0 ⇔ m > −1/2.'],
  },
  aiError: {
    category: 'Lỗi khái niệm', wrongSolution: 'AI kết luận: "Vì E′(x) = −3/(x−1)² < 0 với mọi x ≠ 1 nên hàm số nghịch biến trên toàn bộ ℝ."',
    correction: 'Hàm chỉ nghịch biến trên từng khoảng (−∞; 1) và (1; +∞); không xác định tại x = 1 nên không thể nói nghịch biến trên ℝ.',
    proof: 'Phản ví dụ: E(0) = −2 và E(2) = 0, mà 0 < 2 nhưng E(0) < E(2). Nếu nghịch biến trên ℝ thì x₁ < x₂ phải cho E(x₁) > E(x₂) — mâu thuẫn.',
    whyAiError: 'Mô hình bỏ qua tập xác định khi phát biểu tính đơn điệu.',
    teacherPrompt: 'Em so sánh E(0) và E(2) để thấy mâu thuẫn, rồi sửa lại phạm vi đơn điệu của AI.',
    studentProduct: 'Thẻ Đ/S + phản ví dụ E(0) < E(2) và phát biểu đúng "trên từng khoảng".',
    boardPrompt: 'AI nói nghịch biến trên ℝ. So E(0) với E(2).',
    libraryTitle: 'Lỗi AI bỏ tập xác định khi phát biểu đơn điệu',
  },
};

const L36 = {
  ...base,
  key: '12-6-36', period: 36, lessonType: 'formation',
  title: 'Khảo sát hàm phân thức bậc hai trên bậc nhất',
  opening: 'Chi phí trung bình thường có dạng bậc hai trên bậc nhất — đồ thị có tiệm cận xiên và hai cực trị. Hôm nay lớp mình khảo sát.',
  focusQuestion: 'Vì sao hàm bậc hai/bậc nhất luôn có tiệm cận xiên và có thể có hai cực trị?',
  axis: `**Tình huống: Chi phí trung bình mỗi sản phẩm: $y = \\dfrac{x^2 - 2x + 3}{x - 1}$ (triệu đồng), $x$ là số nghìn sản phẩm.**

- **Chia đa thức:** $y = x - 1 + \\dfrac{2}{x - 1}$.
- **Tiệm cận:** đứng $x = 1$; **xiên** $y = x - 1$.
- **Đạo hàm:** $y\' = 1 - \\dfrac{2}{(x-1)^2} = \\dfrac{(x-1)^2 - 2}{(x-1)^2}$; $y\' = 0 \\Leftrightarrow x = 1 \\pm \\sqrt2$.
  - $x = 1 + \\sqrt2 \\approx 2{,}41$: $y = \\sqrt2 + \\sqrt2 = 2\\sqrt2 \\approx 2{,}83$ → **cực tiểu**.
  - $x = 1 - \\sqrt2 \\approx -0{,}41$: $y = -2\\sqrt2 \\approx -2{,}83$ → **cực đại**.
- **Kiểm chứng tay:** $y(2) = (4 - 4 + 3)/1 = 3$; $y(3) = (9 - 6 + 3)/2 = 3$; $y(11) = (121 - 22 + 3)/10 = 10{,}2$ — tiến sát đường $y = x - 1$ (cho $10$).

**Bẫy của bài:** quên tiệm cận xiên (chỉ tìm đứng/ngang); tính sai đạo hàm; nhầm cực đại/cực tiểu do dấu $y\'$.`,
  goals: {
    must: 'Chia đa thức, tìm tiệm cận xiên và tiệm cận đứng.',
    should: 'Tính đạo hàm, tìm hai cực trị và lập bảng biến thiên.',
    could: 'Biện luận theo tham số; giải thích ý nghĩa chi phí trung bình dài hạn.',
  },
  s1: {
    title: 'Chi phí trung bình',
    context: 'y = (x² − 2x + 3)/(x − 1). Cần biết hình dạng và điểm thấp nhất.',
    question: 'Tiệm cận xiên của hàm này là đường nào?',
    options: ['y = x', 'y = x − 1', 'y = x + 1'],
    correct: 1,
    why: 'Chia: y = x − 1 + 2/(x−1); phần dư 2/(x−1) → 0 nên tiệm cận xiên là y = x − 1.',
    discuss: ['`[PHÁT HIỆN]` Đạo hàm bằng 0 tại đâu?', '`[SO SÁNH]` Vì sao có hai cực trị?'],
    cue: 'Thực hiện phép chia ngay trên bảng; HS đối chiếu thương và dư.',
    lookFor: 'HS viết đúng dạng thương + dư.',
  },
  s3: {
    title: 'Quy trình khảo sát bậc hai/bậc nhất',
    steps: [
      'Tập xác định: mẫu $\\ne 0$.',
      'Chia đa thức: $y = (mx + n) + \\dfrac{R}{cx+d}$ → tiệm cận xiên $y = mx + n$ (nếu $R \\ne 0$).',
      'Đạo hàm, giải $y\' = 0$ → hai cực trị (nếu có).',
      'Bảng biến thiên, giao trục, vẽ đồ thị (đối xứng qua giao hai tiệm cận).',
    ],
    ask: ['`[SUY LUẬN]` Vì sao tiệm cận xiên là phần đa thức sau khi chia?', '`[PHÁT HIỆN]` Cực tiểu có tọa độ bao nhiêu?'],
    cue: 'Khung 4 bước; nhấn: "bậc hai/bậc nhất → luôn có tiệm cận xiên".',
    close: 'Chia đa thức cho tiệm cận xiên; đạo hàm cho hai cực trị.',
  },
  s4: { bat: 'AI kết luận hàm chỉ có một cực trị vì $y\' = 0$ "chỉ có một nghiệm".', chung: '$y\' = 0 \\Leftrightarrow (x-1)^2 = 2 \\Leftrightarrow x = 1 \\pm \\sqrt2$ — hai nghiệm, nên có hai cực trị.', sua: 'Hai cực trị tại $x = 1 \\pm \\sqrt2$, giá trị $\\pm 2\\sqrt2$.', cue: 'Cho HS giải phương trình bậc hai $(x-1)^2 = 2$ cẩn thận.', lookFor: 'HS nhớ hai nghiệm khi bình phương bằng số dương.' },
  s6: { hints: { M: 'chia đa thức trước, rồi đạo hàm.', S: 'tìm hai cực trị và lập bảng.', C: 'biện luận theo tham số và giải thích ý nghĩa.' }, lookFor: 'HS M đúng tiệm cận xiên; HS S đủ cực trị; HS C biện luận được.' },
  postCheck: {
    q: 'Tìm tiệm cận và cực trị của $y = \\dfrac{x^2 + x - 1}{x + 2}$.',
    a: 'Chia: $y = x - 1 + \\dfrac{1}{x+2}$ ⇒ tiệm cận xiên $y = x - 1$; tiệm cận đứng $x = -2$. $y\' = 1 - \\dfrac{1}{(x+2)^2} = 0 \\Leftrightarrow (x+2)^2 = 1 \\Leftrightarrow x = -1$ hoặc $x = -3$.',
    ds: [{ t: '"Bậc hai/bậc nhất luôn có tiệm cận xiên"', v: 'Đúng (khi phần dư khác 0)' }, { t: '"y′ = 0 có thể có hai nghiệm"', v: 'Đúng' }, { t: '"Hàm này có tiệm cận ngang"', v: 'Sai' }],
    cue: 'Chấm chéo phép chia và đạo hàm.',
  },
  s8Close: 'Chia → tiệm cận xiên; đạo hàm → hai cực trị.',
  s9: {
    title: 'Tối ưu chi phí trung bình',
    bullets: ['Cực tiểu tại $x = 1 + \\sqrt2 \\approx 2{,}41$ nghìn sản phẩm với chi phí $2\\sqrt2 \\approx 2{,}83$ triệu.', 'Sản lượng rất lớn: chi phí trung bình tiến sát $x - 1$ (tăng dần) — không nên sản xuất quá nhiều.', 'Mô hình cho thấy có mức sản lượng tối ưu hữu hạn.'],
    cue: 'Hỏi: "Vì sao chi phí trung bình lại tăng khi sản lượng quá lớn?"',
  },
  exit: ['Nêu quy trình khảo sát bậc hai/bậc nhất.', 'Nêu 1 bẫy (quên tiệm cận xiên; mất một cực trị).', 'Tự đánh giá M / S / C.', 'Tìm tiệm cận xiên của (x²−2x+3)/(x−1) và hai cực trị.'],
  exitCue: 'Mở lại khung 4 bước ở S3.',
  after: '- HS làm bài tập SGK; chuẩn bị tiết luyện tiếp hàm bậc hai/bậc nhất.',
  snapshot: {
    focus: 'Khảo sát hàm bậc hai/bậc nhất trên trục chi phí trung bình y = (x²−2x+3)/(x−1) = x − 1 + 2/(x−1): tiệm cận xiên y = x − 1, tiệm cận đứng x = 1, hai cực trị tại x = 1 ± √2 với giá trị ±2√2',
    formulas: ['y = \\dfrac{x^2 - 2x + 3}{x - 1} = x - 1 + \\dfrac{2}{x-1}', 'y\' = 1 - \\dfrac{2}{(x-1)^2}', 'x = 1 \\pm \\sqrt2, \\ y = \\pm 2\\sqrt2'],
    examples: [
      { question: 'Chia đa thức và tìm tiệm cận của y = (x² − 2x + 3)/(x − 1).', answer: 'y = x − 1 + 2/(x−1) ⇒ tiệm cận xiên y = x − 1; tiệm cận đứng x = 1 (phần dư khác 0).' },
      { question: 'Tìm cực trị của y = (x² − 2x + 3)/(x − 1).', answer: 'y′ = 1 − 2/(x−1)² = ((x−1)² − 2)/(x−1)²; y′ = 0 ⇔ x = 1 ± √2. Tại x = 1 + √2: y = 2√2 ≈ 2,83 (cực tiểu); tại x = 1 − √2: y = −2√2 (cực đại).' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu cách tìm tiệm cận xiên của hàm bậc hai/bậc nhất.', answer: 'Chia tử cho mẫu để được dạng mx + n + R/(cx+d); tiệm cận xiên là y = mx + n.' },
      { level: 'NB', question: 'Tìm tiệm cận đứng của y = (x²−2x+3)/(x−1).', answer: 'x = 1.' },
      { level: 'TH', question: 'Tính y′ của y = (x²−2x+3)/(x−1).', answer: 'y′ = 1 − 2/(x−1)².' },
      { level: 'TH', question: 'Tìm cực trị của y = (x²−2x+3)/(x−1).', answer: 'x = 1 ± √2; cực tiểu tại 1 + √2 (y = 2√2), cực đại tại 1 − √2 (y = −2√2).' },
      { level: 'VD', question: 'Khảo sát tiệm cận và cực trị của y = (x² + x − 1)/(x + 2).', answer: 'y = x − 1 + 1/(x+2) ⇒ tiệm cận xiên y = x − 1; đứng x = −2. y′ = 1 − 1/(x+2)² = 0 ⇔ x = −1 hoặc x = −3.' },
      { level: 'VD', question: 'Giải thích vì sao hàm bậc hai/bậc nhất không có tiệm cận ngang.', answer: 'Vì bậc tử lớn hơn bậc mẫu đúng 1 bậc; khi x → ∞, y tiến theo đường thẳng mx + n chứ không tiến tới hằng số.' },
    ],
    quick: [
      { question: 'Vì sao phải chia đa thức trước khi khảo sát?', solution: 'Để tách phần đa thức (cho tiệm cận xiên) và phần dư tiến về 0; nhờ đó biết hình dạng đồ thị ở xa gốc.' },
      { question: 'Hàm này có bao nhiêu cực trị?', solution: 'Hai, tại x = 1 ± √2, vì y′ = 0 có hai nghiệm phân biệt.' },
    ],
    mistakes: ['Quên tìm tiệm cận xiên.', 'Mất một cực trị khi giải (x−1)² = 2.', 'Nhầm cực đại với cực tiểu.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Quy trình', 'a. Tập xác định.', 'b. Chia đa thức → tiệm cận xiên.', 'c. Đạo hàm → cực trị.', 'd. Bảng biến thiên, vẽ.', '2. Áp dụng', 'a. y = x − 1 + 2/(x−1).', 'b. Tiệm cận xiên y = x − 1; đứng x = 1.', 'c. Cực trị tại x = 1 ± √2 với y = ±2√2.'],
  },
  aiError: {
    category: 'Lỗi đại số', wrongSolution: 'AI giải: "y′ = 1 − 2/(x−1)² = 0 ⇒ (x−1)² = 2 ⇒ x = 1 + √2. Vậy hàm có một cực trị."',
    correction: 'Phương trình (x−1)² = 2 có hai nghiệm: x = 1 + √2 và x = 1 − √2. Hàm có hai cực trị với giá trị 2√2 và −2√2.',
    proof: 'Khai căn phải kèm ±: x − 1 = ±√2. Kiểm: tại x = 1 − √2 ≈ −0,41, y′ = 1 − 2/(−√2)² = 1 − 1 = 0 ✓ nên đây cũng là điểm tới hạn.',
    whyAiError: 'Mô hình chỉ lấy nghiệm dương khi khai căn bậc hai.',
    teacherPrompt: 'Em giải lại phương trình bậc hai (x−1)² = 2 và sửa lại số cực trị của AI.',
    studentProduct: 'Thẻ Đ/S + hai nghiệm 1 ± √2 và kết luận hai cực trị.',
    boardPrompt: 'AI ra một cực trị. (x−1)² = 2 có mấy nghiệm?',
    libraryTitle: 'Lỗi AI mất nghiệm âm khi khai căn',
  },
};

const L37 = {
  ...base,
  key: '12-6-37', period: 37, lessonType: 'formation',
  title: 'Khảo sát hàm phân thức bậc hai trên bậc nhất — tiếp',
  opening: 'Tiết này lớp mình luyện đồ thị, cực trị và bài toán tham số của hàm bậc hai/bậc nhất.',
  focusQuestion: 'Tham số trong hàm bậc hai/bậc nhất làm thay đổi tiệm cận hay cực trị trước?',
  axis: `**Tình huống: Hai mô hình chi phí cần so sánh: $y_1 = \\dfrac{x^2 + x - 1}{x + 2}$ và $y_2 = \\dfrac{x^2 - 2x + 3}{x - 1}$.**

| Hàm | Tiệm cận xiên | Tiệm cận đứng | Cực trị |
|---|---|---|---|
| $y_1$ | $y = x - 1$ | $x = -2$ | $x = -1$; $x = -3$ |
| $y_2$ | $y = x - 1$ | $x = 1$ | $x = 1 \\pm \\sqrt2$ |

- **Kiểm chứng tay $y_1$:** chia $x^2 + x - 1 = (x+2)(x-1) + 1$ ⇒ $y_1 = x - 1 + \\dfrac{1}{x+2}$; $y_1\' = 1 - \\dfrac{1}{(x+2)^2} = 0 \\Leftrightarrow (x+2)^2 = 1 \\Leftrightarrow x = -1$ hoặc $x = -3$.
- $y_1(-1) = -1 - 1 + 1 = -1$ (cực tiểu); $y_1(-3) = -3 - 1 - 1 = -5$ (cực đại).

**Bẫy của bài:** nhầm dấu cực trị; quên rằng tiệm cận xiên có thể trùng nhau ở hai hàm khác nhau; tính sai khi chia đa thức.`,
  goals: {
    must: 'Khảo sát đủ các bước cho một hàm bậc hai/bậc nhất.',
    should: 'So sánh hai hàm cùng tiệm cận xiên nhưng khác cực trị.',
    could: 'Biện luận tham số và phản biện kết luận dựa trên đồ thị.',
  },
  s1: {
    title: 'Hai mô hình, một tiệm cận xiên',
    context: 'y₁ và y₂ đều có tiệm cận xiên y = x − 1 nhưng khác tiệm cận đứng và cực trị.',
    question: 'Với $y_1 = \\dfrac{x^2+x-1}{x+2}$, $y_1\' = 0$ tại đâu?',
    options: ['x = −1 và x = −3', 'x = 1 và x = 3', 'x = −2'],
    correct: 0,
    why: 'y₁′ = 1 − 1/(x+2)² = 0 ⇔ (x+2)² = 1 ⇔ x = −1 hoặc x = −3.',
    discuss: ['`[PHÁT HIỆN]` Đâu là cực đại?', '`[SO SÁNH]` Hai hàm khác nhau ở điểm nào?'],
    cue: 'Cho HS chia đa thức trước, rồi mới đạo hàm.',
    lookFor: 'HS giải đúng phương trình bình phương bằng 1.',
  },
  s3: {
    title: 'So sánh và biện luận',
    steps: [
      'Chia đa thức cho từng hàm để có tiệm cận xiên.',
      'Đạo hàm, giải $y\' = 0$, lập bảng dấu để xác định cực đại/tiểu.',
      'So sánh: cùng tiệm cận xiên nhưng khác vị trí tiệm cận đứng và cực trị.',
      'Bài tham số: xét dấu của biểu thức đạo hàm theo tham số.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao hai hàm có cùng tiệm cận xiên?', '`[PHÁT HIỆN]` Cực đại của y₁ ở đâu và giá trị bao nhiêu?'],
    cue: 'Khung 4 bước; nhắc: "cùng tiệm cận xiên không có nghĩa cùng đồ thị".',
    close: 'Tiệm cận xiên do phần đa thức; cực trị do phần dư quyết định.',
  },
  s4: { bat: 'AI kết luận hai hàm có cùng đồ thị vì cùng tiệm cận xiên $y = x - 1$.', chung: 'Cùng tiệm cận xiên nhưng khác tiệm cận đứng ($x = -2$ so với $x = 1$) và khác cực trị.', sua: 'Hai đồ thị khác nhau; chỉ tiệm cận xiên trùng.', cue: 'Cho HS tính y₁(0) và y₂(0): −1/2 so với −3 — khác nhau.', lookFor: 'HS so sánh giá trị cụ thể.' },
  s6: { hints: { M: 'chia đa thức rồi đạo hàm.', S: 'lập bảng dấu để phân biệt cực đại/tiểu.', C: 'biện luận tham số ở biểu thức đạo hàm.' }, lookFor: 'HS M đúng tiệm cận; HS S đúng cực trị; HS C biện luận rõ.' },
  postCheck: {
    q: 'Khảo sát cực trị của $y = \\dfrac{x^2 + x - 1}{x + 2}$.',
    a: '$y = x - 1 + 1/(x+2)$; $y\' = 1 - 1/(x+2)^2 = 0$ tại $x = -1$ (cực tiểu, $y = -1$) và $x = -3$ (cực đại, $y = -5$).',
    ds: [{ t: '"Cùng tiệm cận xiên ⇒ cùng đồ thị"', v: 'Sai' }, { t: '"y₁ có cực đại tại x = −3"', v: 'Đúng' }, { t: '"Tiệm cận đứng của y₁ là x = −2"', v: 'Đúng' }],
    cue: 'Chấm chéo bảng so sánh hai hàm.',
  },
  s8Close: 'Tiệm cận xiên theo phần đa thức; cực trị theo phần dư.',
  s9: {
    title: 'Chọn mô hình chi phí tốt hơn',
    bullets: ['Cả hai mô hình đều tăng tuyến tính dài hạn theo y = x − 1.', 'y₁ có cực tiểu tại x = −1 (không có ý nghĩa với x > 0); y₂ có cực tiểu tại x ≈ 2,41 — có ý nghĩa thực tế.', 'Vì vậy với sản lượng dương, mô hình y₂ phù hợp hơn để tìm điểm tối ưu.'],
    cue: 'Hỏi: "Mô hình nào cho điểm tối ưu trong miền sản lượng dương?"',
  },
  exit: ['Nêu hai bước chính khi so sánh hai hàm phân thức.', 'Nêu 1 bẫy (nhầm cực đại/tiểu; kết luận theo tiệm cận).', 'Tự đánh giá M / S / C.', 'Tìm cực trị của (x²+x−1)/(x+2).'],
  exitCue: 'Mở lại bảng so sánh ở mục II.',
  after: '- HS hoàn thành bài tập; chuẩn bị tiết luyện tập khảo sát tổng hợp.',
  snapshot: {
    focus: 'Luyện khảo sát hàm bậc hai/bậc nhất và so sánh hai mô hình: y₁ = (x²+x−1)/(x+2) = x − 1 + 1/(x+2) (TCĐ x = −2; cực đại x = −3, y = −5; cực tiểu x = −1, y = −1) và y₂ = (x²−2x+3)/(x−1) (TCĐ x = 1; cực trị x = 1 ± √2)',
    formulas: ['y_1 = x - 1 + \\dfrac{1}{x+2}', 'y_1\' = 1 - \\dfrac{1}{(x+2)^2}', '(x+2)^2 = 1 \\Leftrightarrow x = -1 \\ \\text{hoặc} \\ x = -3'],
    examples: [
      { question: 'Khảo sát cực trị và tiệm cận của y₁ = (x² + x − 1)/(x + 2).', answer: 'Chia: y₁ = x − 1 + 1/(x+2) ⇒ tiệm cận xiên y = x − 1; tiệm cận đứng x = −2. y₁′ = 1 − 1/(x+2)² = 0 ⇔ x = −1 hoặc x = −3. y₁(−1) = −1 (cực tiểu), y₁(−3) = −5 (cực đại).' },
      { question: 'Hai hàm y₁ và y₂ cùng tiệm cận xiên y = x − 1. Chúng có cùng đồ thị không? Vì sao?', answer: 'Không. Tiệm cận đứng khác nhau (x = −2 so với x = 1) và cực trị khác nhau; ví dụ y₁(0) = −1/2 còn y₂(0) = −3.' },
    ],
    exercises: [
      { level: 'NB', question: 'Tìm tiệm cận xiên và đứng của y = (x²+x−1)/(x+2).', answer: 'Chia: y = x − 1 + 1/(x+2) ⇒ tiệm cận xiên y = x − 1; tiệm cận đứng x = −2.' },
      { level: 'NB', question: 'Nêu điều kiện để hàm bậc hai/bậc nhất có hai cực trị.', answer: 'Phương trình y′ = 0 có hai nghiệm phân biệt (thường dạng 1 − R/(cx+d)² = 0 với R > 0).' },
      { level: 'TH', question: 'Tìm cực trị của y = (x²+x−1)/(x+2).', answer: 'Cực đại (−3; −5); cực tiểu (−1; −1).' },
      { level: 'TH', question: 'Tính y(0) của hai hàm y₁, y₂ để so sánh.', answer: 'y₁(0) = −1/2 = −0,5; y₂(0) = 3/(−1) = −3.' },
      { level: 'VD', question: 'Tìm m để hàm y = (x² + mx + 1)/(x − 1) có hai cực trị.', answer: 'Chia: y = x + (m+1) + (m+2)/(x−1). y′ = 1 − (m+2)/(x−1)²; y′ = 0 ⇔ (x−1)² = m+2. Có hai nghiệm ⇔ m + 2 > 0 ⇔ m > −2.' },
      { level: 'VD', question: 'Phản biện: "Hai hàm có cùng tiệm cận xiên thì có cùng hình dạng".', answer: 'Sai. Tiệm cận xiên chỉ mô tả hành vi ở xa gốc; gần tiệm cận đứng và vùng cực trị hai đồ thị khác nhau hoàn toàn (ví dụ y₁(0) = −0,5 và y₂(0) = −3).' },
    ],
    quick: [
      { question: 'Vì sao y₁ có cực đại tại x = −3 nhưng giá trị −5 lại nhỏ hơn cực tiểu −1?', solution: 'Vì "cực đại/cực tiểu" là tính chất địa phương (so với lân cận), không phải so sánh toàn cục; −5 là giá trị lớn nhất trong lân cận bên trái của nó.' },
      { question: 'Tiệm cận xiên của hai hàm có giống nhau không?', solution: 'Có, cùng là y = x − 1, vì phần đa thức sau khi chia giống nhau.' },
    ],
    mistakes: ['Nhầm cực đại/cực tiểu.', 'Kết luận hai hàm cùng đồ thị vì cùng tiệm cận.', 'Chia đa thức sai dấu.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Hai hàm so sánh', 'a. y₁ = x − 1 + 1/(x+2): TCĐ x = −2; cực đại (−3;−5); cực tiểu (−1;−1).', 'b. y₂ = x − 1 + 2/(x−1): TCĐ x = 1; cực trị x = 1 ± √2.', '2. Bài tham số', 'a. (x−1)² = m + 2 có hai nghiệm ⇔ m > −2.'],
  },
  aiError: {
    category: 'Lỗi khái niệm', wrongSolution: 'AI kết luận: "Vì y₁ và y₂ cùng có tiệm cận xiên y = x − 1 nên hai đồ thị chỉ khác nhau ở vị trí, hình dạng hoàn toàn giống nhau; có thể dùng chung một bảng biến thiên."',
    correction: 'Hai hàm khác tiệm cận đứng và khác cực trị nên bảng biến thiên khác nhau. Chỉ tiệm cận xiên trùng.',
    proof: 'So sánh giá trị tại x = 0: y₁(0) = −0,5; y₂(0) = −3. Nếu cùng hình dạng thì giá trị phải trùng (hoặc sai khác không đổi), nhưng ở đây khác biệt và còn khác cả vị trí tiệm cận đứng (x = −2 so với x = 1).',
    whyAiError: 'Mô hình đồng nhất "cùng tiệm cận" với "cùng hàm", bỏ qua phần dư quyết định hình dạng gần tiệm cận đứng.',
    teacherPrompt: 'Em so sánh y₁(0) với y₂(0) và vị trí tiệm cận đứng, rồi sửa lại kết luận của AI.',
    studentProduct: 'Thẻ Đ/S + hai giá trị tại x = 0 và hai tiệm cận đứng khác nhau.',
    boardPrompt: 'AI nói hai đồ thị giống nhau. Tính y₁(0) và y₂(0).',
    libraryTitle: 'Lỗi AI đồng nhất cùng tiệm cận với cùng hàm số',
  },
};

export default [L34, L35, L36, L37];

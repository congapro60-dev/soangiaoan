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

const L38 = {
  ...base,
  key: '12-6-38', period: 38, lessonType: 'practice',
  title: 'Luyện tập khảo sát tổng hợp',
  opening: 'Hôm nay lớp mình tổng hợp: một bài bậc ba, một bài phân thức, cùng quy trình khảo sát.',
  focusQuestion: 'Sự khác nhau cốt lõi giữa khảo sát hàm đa thức và hàm phân thức là gì?',
  axis: `**Tình huống: Hai mô hình chi phí của xưởng — một đa thức bậc ba, một phân thức.**

| Hàm | Đặc điểm | Cực trị | Tiệm cận |
|---|---|---|---|
| $y_1 = x^3 - 3x + 1$ | đa thức, xác định mọi $x$ | $(-1; 3)$; $(1; -1)$ | không |
| $y_2 = \\dfrac{x^2 - 2x + 3}{x - 1}$ | phân thức | $x = 1 \\pm \\sqrt2$ | đứng $x = 1$; xiên $y = x - 1$ |

- **Kiểm chứng tay $y_1$:** $y_1\' = 3x^2 - 3$; cực đại $(-1; 3)$, cực tiểu $(1; -1)$; điểm uốn $(0; 1)$.
- **Kiểm chứng tay $y_2$:** $y_2 = x - 1 + \\dfrac{2}{x-1}$; cực tiểu tại $1 + \\sqrt2 \\approx 2{,}41$ với $y = 2\\sqrt2 \\approx 2{,}83$.
- **Khác biệt cốt lõi:** đa thức xác định trên $\\mathbb{R}$ và không có tiệm cận; phân thức có tập xác định bị khuyết và có tiệm cận.

**Bẫy của bài:** áp quy trình đa thức cho phân thức (bỏ tiệm cận); quên tập xác định.`,
  goals: {
    must: 'Khảo sát một hàm đa thức và một hàm phân thức theo đúng quy trình riêng.',
    should: 'So sánh hai quy trình và chỉ ra bước khác nhau.',
    could: 'Chọn mô hình phù hợp cho bài toán thực tế; phản biện lời giải áp sai quy trình.',
  },
  s1: {
    title: 'Hai mô hình, hai quy trình',
    context: 'y₁ bậc ba; y₂ phân thức. Cần khảo sát đúng quy trình từng loại.',
    question: 'Bước nào chỉ có ở khảo sát hàm phân thức?',
    options: ['Tính đạo hàm', 'Tìm tiệm cận và tập xác định bị khuyết', 'Lập bảng biến thiên'],
    correct: 1,
    why: 'Đa thức xác định trên ℝ và không có tiệm cận; phân thức cần tìm tiệm cận đứng/xiên và loại điểm mẫu bằng 0.',
    discuss: ['`[PHÁT HIỆN]` y₁ có điểm uốn ở đâu?', '`[SO SÁNH]` y₂ có tiệm cận gì?'],
    cue: 'Bảng so sánh hai quy trình, HS đánh dấu bước khác nhau.',
    lookFor: 'HS phân biệt quy trình theo loại hàm.',
  },
  s3: {
    title: 'Hai quy trình song song',
    steps: [
      'Đa thức: tập xác định $\\mathbb{R}$; $y\'$, $y\'\'$; giới hạn hai đầu; bảng; vẽ.',
      'Phân thức: tập xác định khuyết; chia đa thức; tiệm cận; $y\'$; bảng; vẽ.',
      'Kiểm chung: cả hai đều phải kiểm cực trị bằng dấu đạo hàm.',
      'Kiểm riêng: đa thức kiểm điểm uốn; phân thức kiểm tiệm cận.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao phân thức cần chia đa thức còn đa thức thì không?', '`[PHÁT HIỆN]` Cực trị của y₂ ở đâu?'],
    cue: 'Khung hai cột song song; HS điền theo từng bước.',
    close: 'Cùng mục tiêu (hiểu hình dạng), khác công cụ (tiệm cận chỉ có ở phân thức).',
  },
  s4: { bat: 'AI khảo sát $y_2$ như hàm đa thức: kết luận "không có tiệm cận và xác định trên ℝ".', chung: 'Sai: $y_2$ xác định khi $x \\ne 1$; có tiệm cận đứng $x = 1$ và tiệm cận xiên $y = x - 1$.', sua: 'Áp quy trình phân thức: chia đa thức, tìm hai tiệm cận, rồi mới đạo hàm.', cue: 'Cho HS thay x = 1 vào y₂ để thấy không xác định.', lookFor: 'HS kiểm tập xác định trước.' },
  s6: { hints: { M: 'xác định loại hàm trước, rồi chọn quy trình.', S: 'làm cả hai bài, mỗi bài một phép kiểm.', C: 'so sánh hai quy trình và chọn mô hình phù hợp.' }, lookFor: 'HS M chọn đúng quy trình; HS S đủ bước; HS C so sánh rõ.' },
  postCheck: {
    q: 'Nêu các bước khảo sát $y = \\dfrac{x^2 - 2x + 3}{x - 1}$ (chỉ liệt kê, không tính chi tiết).',
    a: 'Tập xác định x ≠ 1; chia đa thức được y = x − 1 + 2/(x−1); tiệm cận đứng x = 1, xiên y = x − 1; đạo hàm y′ = 1 − 2/(x−1)²; giải y′ = 0 được x = 1 ± √2; lập bảng biến thiên; vẽ.',
    ds: [{ t: '"Hàm phân thức xác định trên ℝ"', v: 'Sai' }, { t: '"Đa thức không có tiệm cận"', v: 'Đúng' }, { t: '"Cả hai loại đều cần xét dấu đạo hàm"', v: 'Đúng' }],
    cue: 'Chấm chéo hai quy trình.',
  },
  s8Close: 'Đa thức: đạo hàm cấp 1–2. Phân thức: tiệm cận + đạo hàm.',
  s9: {
    title: 'Chọn mô hình cho xưởng',
    bullets: ['Mô hình đa thức phù hợp khi chi phí có hai điểm gấp khúc (tăng–giảm–tăng).', 'Mô hình phân thức phù hợp khi có mức sản lượng tối ưu và chi phí dài hạn tăng tuyến tính.', 'Chọn mô hình theo dữ liệu thực tế, không theo độ quen tay.'],
    cue: 'Hỏi: "Dữ liệu thực tế nào giúp phân biệt hai mô hình?" — dựa vào tiệm cận và điểm uốn.',
  },
  exit: ['Nêu hai bước khác nhau giữa hai quy trình.', 'Nêu 1 bẫy (áp quy trình đa thức cho phân thức).', 'Tự đánh giá M / S / C.', 'Nêu các bước khảo sát (x²−2x+3)/(x−1).'],
  exitCue: 'Mở lại bảng hai quy trình ở S3.',
  after: '- HS hoàn thành phiếu luyện khảo sát tổng hợp; chuẩn bị tiết tích vô hướng.',
  snapshot: {
    focus: 'Luyện khảo sát tổng hợp hai loại hàm: đa thức bậc ba y = x³ − 3x + 1 (cực đại (−1;3), cực tiểu (1;−1), điểm uốn (0;1), không tiệm cận) và phân thức y = (x²−2x+3)/(x−1) (TCĐ x = 1, TCX y = x − 1, cực trị x = 1 ± √2)',
    formulas: ['y_1 = x^3 - 3x + 1', 'y_2 = x - 1 + \\dfrac{2}{x-1}', '\\text{Đa thức: } y\', y\'\'; \\quad \\text{Phân thức: tiệm cận } + y\''],
    examples: [
      { question: 'So sánh quy trình khảo sát y₁ = x³ − 3x + 1 và y₂ = (x²−2x+3)/(x−1).', answer: 'y₁: tập xác định ℝ, y′ = 3x² − 3 (cực đại (−1;3), cực tiểu (1;−1)), y″ = 6x (điểm uốn (0;1)), không tiệm cận. y₂: tập xác định x ≠ 1, chia được x − 1 + 2/(x−1) (TCĐ x = 1, TCX y = x − 1), y′ = 1 − 2/(x−1)² (cực trị x = 1 ± √2).' },
      { question: 'Vì sao không thể khảo sát hàm phân thức bằng đúng quy trình đa thức?', answer: 'Vì phân thức có tập xác định bị khuyết (mẫu bằng 0) và có tiệm cận; bỏ qua hai yếu tố này sẽ vẽ sai hình dạng đồ thị gần điểm khuyết và ở xa gốc.' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu điểm khác nhau cơ bản giữa khảo sát đa thức và phân thức.', answer: 'Phân thức cần tìm tập xác định khuyết và tiệm cận; đa thức xác định trên ℝ và không có tiệm cận (trừ trường hợp đặc biệt).' },
      { level: 'NB', question: 'Tìm cực trị của y = x³ − 3x + 1.', answer: 'Cực đại (−1; 3); cực tiểu (1; −1).' },
      { level: 'TH', question: 'Tìm tiệm cận của y = (x² − 2x + 3)/(x − 1).', answer: 'Tiệm cận đứng x = 1; tiệm cận xiên y = x − 1.' },
      { level: 'TH', question: 'Tìm nghiệm của y′ = 0 với y = (x² − 2x + 3)/(x − 1).', answer: 'y′ = 1 − 2/(x−1)² = 0 ⇔ (x−1)² = 2 ⇔ x = 1 ± √2.' },
      { level: 'VD', question: 'Biện luận số nghiệm của (x² − 2x + 3)/(x − 1) = m theo m.', answer: 'Phương trình tương đương x² − 2x + 3 = m(x − 1) ⇔ x² − (m+2)x + (m+3) = 0 (x ≠ 1). Số nghiệm phụ thuộc biệt số Δ = (m+2)² − 4(m+3) = m² − 8. Có hai nghiệm khi m² > 8, một nghiệm khi m = ±2√2, vô nghiệm khi |m| < 2√2 — kèm điều kiện loại x = 1.' },
      { level: 'VD', question: 'Phản biện lời giải khảo sát hàm phân thức mà không tìm tiệm cận.', answer: 'Thiếu tiệm cận thì không biết hình dạng đồ thị ở xa gốc và gần điểm khuyết; bảng biến thiên cũng thiếu nhánh. Phải tìm tiệm cận đứng (mẫu = 0) và tiệm cận xiên (chia đa thức) trước khi vẽ.' },
    ],
    quick: [
      { question: 'Vì sao hàm phân thức cần xét giới hạn tại điểm mẫu bằng 0?', solution: 'Vì tại đó hàm không xác định và thường có tiệm cận đứng, quyết định hình dạng nhánh đồ thị.' },
      { question: 'Hàm đa thức bậc ba có tiệm cận không?', solution: 'Không, vì xác định trên ℝ và khi x → ±∞ thì y → ±∞ theo đa thức, không tiến sát đường thẳng nào.' },
    ],
    mistakes: ['Áp quy trình đa thức cho phân thức.', 'Bỏ tiệm cận xiên.', 'Quên loại điểm mẫu bằng 0 khi biện luận.'],
    boardKnowledge: ['II. NỘI DUNG', '1. So sánh quy trình', 'a. Đa thức: ℝ; y′; y″; giới hạn; bảng; vẽ.', 'b. Phân thức: tập xác định khuyết; chia đa thức; tiệm cận; y′; bảng; vẽ.', '2. Kết quả mẫu', 'a. y₁: cực đại (−1;3), cực tiểu (1;−1), điểm uốn (0;1).', 'b. y₂: TCĐ x = 1, TCX y = x − 1, cực trị x = 1 ± √2.'],
  },
  aiError: {
    category: 'Lỗi khái niệm', wrongSolution: 'AI khảo sát: "y = (x² − 2x + 3)/(x − 1) xác định trên ℝ, y′ = 1 − 2/(x−1)², cực trị tại x = 1 ± √2. Đồ thị không có tiệm cận."',
    correction: 'Sai hai chỗ: hàm không xác định tại x = 1 (tập xác định ℝ \\ {1}) và có tiệm cận đứng x = 1, tiệm cận xiên y = x − 1.',
    proof: 'Thay x = 1: mẫu bằng 0 nên hàm không xác định. Chia đa thức: y = x − 1 + 2/(x−1); khi x → 1 thì phần dư → ±∞ (tiệm cận đứng), khi x → ∞ thì phần dư → 0 (tiệm cận xiên y = x − 1).',
    whyAiError: 'Mô hình tái sử dụng quy trình đa thức cho hàm phân thức, bỏ qua mẫu số và phép chia đa thức.',
    teacherPrompt: 'Em kiểm x = 1 có thuộc tập xác định không, rồi chia đa thức để sửa lại phần tiệm cận.',
    studentProduct: 'Thẻ Đ/S + chỉ ra mẫu bằng 0 tại x = 1 và hai tiệm cận.',
    boardPrompt: 'AI nói hàm xác định trên ℝ và không có tiệm cận. Thay x = 1.',
    libraryTitle: 'Lỗi AI áp quy trình đa thức cho hàm phân thức',
  },
};

const L39 = {
  ...base,
  key: '12-6-39', period: 39, lessonType: 'formation',
  title: 'Biểu thức tọa độ của tích vô hướng',
  opening: 'Cần biết hai hướng vận chuyển trong kho có vuông góc hay không — tích vô hướng trả lời bằng một con số.',
  focusQuestion: 'Vì sao một con số (tích vô hướng) lại cho biết góc giữa hai vectơ?',
  axis: `**Tình huống: Hai hướng vận chuyển trong kho: $\\vec a = (1; 2; 3)$ và $\\vec b = (2; -1; 1)$.**

- **Tích vô hướng:** $\\vec a \\cdot \\vec b = 1\\cdot2 + 2\\cdot(-1) + 3\\cdot1 = 2 - 2 + 3 = 3$.
- **Độ dài:** $|\\vec a| = \\sqrt{1+4+9} = \\sqrt{14}$; $|\\vec b| = \\sqrt{4+1+1} = \\sqrt6$.
- **Góc:** $\\cos(\\vec a, \\vec b) = \\dfrac{3}{\\sqrt{14}\\cdot\\sqrt6} = \\dfrac{3}{2\\sqrt{21}} = \\dfrac{\\sqrt{21}}{14} \\approx 0{,}327$ → góc $\\approx 70{,}9^\\circ$.
- **Kiểm chứng tay:** $\\sqrt{14} \\approx 3{,}742$; $\\sqrt6 \\approx 2{,}449$; tích $\\approx 9{,}165$; $3/9{,}165 \\approx 0{,}327$ ✓.
- **Vuông góc khi nào:** $\\vec a \\cdot \\vec b = 0$. Ví dụ $\\vec b\' = (2; 1; m)$ vuông góc $\\vec a$ khi $2 + 2 + 3m = 0 \\Leftrightarrow m = -\\tfrac43$.

**Bẫy của bài:** quên cộng cả ba tích; nhầm tích vô hướng với tích độ dài; kết luận vuông góc khi tích gần 0.`,
  goals: {
    must: 'Tính tích vô hướng theo tọa độ và nhận biết điều kiện vuông góc.',
    should: 'Tính góc giữa hai vectơ qua cosin và xử lý bài toán tìm tham số vuông góc.',
    could: 'Mô hình hóa kiểm tra vuông góc trong không gian thực tế; phản biện kết luận góc.',
  },
  s1: {
    title: 'Hai hướng vận chuyển',
    context: 'a = (1;2;3), b = (2;−1;1). Cần biết góc giữa hai hướng.',
    question: '$\\vec a \\cdot \\vec b$ bằng bao nhiêu?',
    options: ['3', '6', '−3'],
    correct: 0,
    why: '1·2 + 2·(−1) + 3·1 = 2 − 2 + 3 = 3.',
    discuss: ['`[PHÁT HIỆN]` Hai hướng có vuông góc không?', '`[SO SÁNH]` Nếu tích bằng 0 thì góc bằng bao nhiêu?'],
    cue: 'Viết công thức tổng quát a·b = a₁b₁ + a₂b₂ + a₃b₃ rồi thay số.',
    lookFor: 'HS cộng đủ ba số hạng.',
  },
  s3: {
    title: 'Ba công thức của tích vô hướng',
    steps: [
      'Tích vô hướng theo tọa độ: $\\vec a\\cdot\\vec b = a_1b_1 + a_2b_2 + a_3b_3$.',
      'Độ dài: $|\\vec a| = \\sqrt{\\vec a\\cdot\\vec a}$.',
      'Góc: $\\cos\\alpha = \\dfrac{\\vec a\\cdot\\vec b}{|\\vec a||\\vec b|}$; vuông góc ⇔ $\\vec a\\cdot\\vec b = 0$.',
      'Kiểm: nếu $\\vec a\\cdot\\vec b > 0$ thì góc nhọn; $< 0$ thì góc tù.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao tích vô hướng dương cho góc nhọn?', '`[PHÁT HIỆN]` Với b′ = (2;1;m), m bằng bao nhiêu để vuông góc?'],
    cue: 'Khung 4 công thức; nhắc: "vuông góc ⇔ tích = 0".',
    close: 'Tích vô hướng mã hóa góc: dấu cho biết nhọn/tù, độ lớn cho biết mức độ.',
  },
  s4: { bat: 'AI tính $\\vec a\\cdot\\vec b = 1\\cdot2 + 2\\cdot1 + 3\\cdot1 = 7$ (dùng b₂ = 1 thay vì −1).', chung: 'b₂ = −1 nên tích là 2 − 2 + 3 = 3, không phải 7.', sua: 'Đọc lại tọa độ và thay đúng dấu.', cue: 'Cho HS viết lại tọa độ b theo hàng trước khi nhân.', lookFor: 'HS kiểm dấu từng tọa độ.' },
  s6: { hints: { M: 'viết ba số hạng rồi cộng.', S: 'tính cos và kiểm dấu để xác định góc nhọn/tù.', C: 'giải bài tham số vuông góc.' }, lookFor: 'HS M đúng tích; HS S đúng góc; HS C tìm đúng m.' },
  postCheck: {
    q: 'Cho $\\vec a = (1; 2; 3)$, $\\vec b = (2; 1; m)$. Tìm $m$ để $\\vec a \\perp \\vec b$.',
    a: '$\\vec a\\cdot\\vec b = 2 + 2 + 3m = 0 \\Leftrightarrow m = -\\tfrac43$.',
    ds: [{ t: '"a·b = a₁b₁ + a₂b₂ + a₃b₃"', v: 'Đúng' }, { t: '"Vuông góc ⇔ tích vô hướng bằng 0"', v: 'Đúng' }, { t: '"Tích vô hướng âm ⇒ góc nhọn"', v: 'Sai — góc tù' }],
    cue: 'Chấm chéo theo ba công thức.',
  },
  s8Close: 'Tích theo tọa độ — độ dài — cos — vuông góc khi tích bằng 0.',
  s9: {
    title: 'Kiểm tra vuông góc trong kho',
    bullets: ['Hai hướng a và b lệch nhau khoảng 70,9° — không vuông góc, cần điều chỉnh giá kệ.', 'Muốn vuông góc, chọn b′ = (2;1;−4/3) — kiểm tích bằng 0.', 'Dùng tích vô hướng để kiểm nhanh thay vì đo góc trực tiếp.'],
    cue: 'Hỏi: "Nếu tích vô hướng rất nhỏ nhưng khác 0 thì sao?" → góc gần 90° nhưng chưa vuông.',
  },
  exit: ['Nêu công thức tích vô hướng và cos góc.', 'Nêu 1 bẫy (bỏ sót tọa độ; nhầm dấu).', 'Tự đánh giá M / S / C.', 'Cho a = (1;2;3), b = (2;−1;1): tính a·b và cos góc.'],
  exitCue: 'Mở lại ba công thức ở S3.',
  after: '- HS làm bài tập SGK về tích vô hướng; chuẩn bị tiết luyện tập.',
  snapshot: {
    focus: 'Hình thành biểu thức tọa độ của tích vô hướng trên hai hướng vận chuyển trong kho a = (1;2;3), b = (2;−1;1): a·b = 3, |a| = √14, |b| = √6, góc ≈ 70,9°; điều kiện vuông góc a·b = 0',
    formulas: ['\\vec a\\cdot\\vec b = a_1b_1 + a_2b_2 + a_3b_3', '|\\vec a| = \\sqrt{\\vec a\\cdot\\vec a}', '\\cos\\alpha = \\dfrac{\\vec a\\cdot\\vec b}{|\\vec a||\\vec b|}'],
    examples: [
      { question: 'Cho a = (1; 2; 3) và b = (2; −1; 1). Tính tích vô hướng và góc giữa hai vectơ.', answer: 'a·b = 2 − 2 + 3 = 3. |a| = √14, |b| = √6. cos α = 3/(√14·√6) = √21/14 ≈ 0,327 ⇒ α ≈ 70,9°.' },
      { question: 'Tìm m để b = (2; 1; m) vuông góc với a = (1; 2; 3).', answer: 'a·b = 2 + 2 + 3m = 0 ⇒ m = −4/3.' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu công thức tích vô hướng theo tọa độ.', answer: 'a·b = a₁b₁ + a₂b₂ + a₃b₃.' },
      { level: 'NB', question: 'Khi nào hai vectơ vuông góc?', answer: 'Khi tích vô hướng của chúng bằng 0.' },
      { level: 'TH', question: 'Tính a·b với a = (1; 2; 3), b = (2; −1; 1).', answer: '2 − 2 + 3 = 3.' },
      { level: 'TH', question: 'Tính cos góc giữa a = (1;2;3) và b = (2;−1;1).', answer: 'cos α = 3/(√14·√6) = √21/14 ≈ 0,327.' },
      { level: 'VD', question: 'Tìm m để (1; 2; 3) vuông góc với (2; m; 1).', answer: '2 + 2m + 3 = 0 ⇒ m = −5/2.' },
      { level: 'VD', question: 'Cho a = (1; 1; 0), b = (1; 0; 1). Tính góc giữa hai vectơ.', answer: 'a·b = 1; |a| = |b| = √2 ⇒ cos α = 1/2 ⇒ α = 60°.' },
    ],
    quick: [
      { question: 'Vì sao góc nhọn cho tích vô hướng dương?', solution: 'Vì a·b = |a||b|cos α và cos α > 0 khi α < 90°.' },
      { question: 'Tích vô hướng bằng 0 nghĩa là gì về hình học?', solution: 'Hai vectơ vuông góc (hoặc một vectơ bằng 0).' },
    ],
    mistakes: ['Bỏ sót một tọa độ khi tính tổng.', 'Nhầm dấu tọa độ âm.', 'Kết luận vuông góc khi tích chỉ nhỏ nhưng khác 0.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Ba công thức', 'a. a·b = a₁b₁ + a₂b₂ + a₃b₃.', 'b. |a| = √(a·a).', 'c. cos α = (a·b)/(|a||b|).', '2. Vuông góc', 'a. a ⊥ b ⇔ a·b = 0.', '3. Áp dụng', 'a. a = (1;2;3), b = (2;−1;1): a·b = 3; α ≈ 70,9°.', 'b. b′ = (2;1;−4/3) vuông góc a.'],
  },
  aiError: {
    category: 'Lỗi đại số', wrongSolution: 'AI tính: "a·b = 1·2 + 2·1 + 3·1 = 7 với a = (1; 2; 3), b = (2; −1; 1). Suy ra góc giữa hai vectơ là góc nhọn lớn (khoảng 40°)."',
    correction: 'b₂ = −1 nên a·b = 2 − 2 + 3 = 3. Từ đó cos α = 3/(√14·√6) ≈ 0,327 ⇒ α ≈ 70,9° (không phải 40°).',
    proof: 'Kiểm từng số hạng: 1·2 = 2; 2·(−1) = −2; 3·1 = 3; tổng = 3. Nếu dùng b₂ = 1 thì tổng là 7 — sai vì tọa độ thứ hai của b là −1.',
    whyAiError: 'Mô hình đánh rơi dấu âm của tọa độ khi thay số vào công thức tích vô hướng.',
    teacherPrompt: 'Em viết lại tọa độ b theo từng hàng rồi sửa phép thay số của AI.',
    studentProduct: 'Thẻ Đ/S + ba số hạng 2; −2; 3 và kết quả a·b = 3.',
    boardPrompt: 'AI ra a·b = 7. Tọa độ thứ hai của b là bao nhiêu?',
    libraryTitle: 'Lỗi AI bỏ dấu âm trong tích vô hướng',
  },
};

const L40 = {
  ...base,
  key: '12-6-40', period: 40, lessonType: 'practice',
  title: 'Luyện tập tích vô hướng tọa độ',
  opening: 'Hôm nay lớp mình luyện góc, vuông góc và bài toán tham số trong Oxyz.',
  focusQuestion: 'Làm thế nào kiểm tra một tam giác vuông chỉ bằng tọa độ?',
  axis: `**Tình huống: Ba trụ đỡ trong kho tại $A(1; 0; 0)$, $B(0; 1; 0)$, $C(0; 0; 1)$ — cần kiểm tra góc và khoảng cách.**

- **Vectơ:** $\\vec{AB} = (-1; 1; 0)$, $\\vec{AC} = (-1; 0; 1)$.
- **Tích vô hướng:** $\\vec{AB}\\cdot\\vec{AC} = 1 + 0 + 0 = 1$.
- **Độ dài:** $|\\vec{AB}| = |\\vec{AC}| = \\sqrt2$.
- **Góc:** $\\cos A = \\dfrac{1}{2} \\Rightarrow \\widehat{A} = 60^\\circ$.
- **Cạnh BC:** $|\\vec{BC}| = |(0;-1;1)| = \\sqrt2$ → tam giác đều cạnh $\\sqrt2$.
- **Kiểm chứng tay:** $AB = AC = BC = \\sqrt2$ nên tam giác đều, mọi góc $60^\\circ$ ✓.

**Bẫy của bài:** tính vectơ sai chiều (A − B thay vì B − A) — không ảnh hưởng góc nhưng ảnh hưởng dấu tích; nhầm góc 60° với 120°.`,
  goals: {
    must: 'Tính tích vô hướng, độ dài và góc trong tam giác từ tọa độ.',
    should: 'Nhận dạng tam giác (vuông, đều, cân) bằng tích vô hướng và độ dài.',
    could: 'Giải bài toán tham số về vuông góc; phản biện kết luận góc.',
  },
  s1: {
    title: 'Ba trụ đỡ',
    context: 'A(1;0;0), B(0;1;0), C(0;0;1). Cần biết góc A.',
    question: '$\\vec{AB}\\cdot\\vec{AC}$ bằng bao nhiêu?',
    options: ['1', '0', '−1'],
    correct: 0,
    why: 'AB = (−1;1;0), AC = (−1;0;1) ⇒ tích = 1 + 0 + 0 = 1.',
    discuss: ['`[PHÁT HIỆN]` Ba cạnh có bằng nhau không?', '`[SO SÁNH]` Góc A là 60° hay 120°?'],
    cue: 'Cho HS tính ba cạnh trước, rồi mới tính góc.',
    lookFor: 'HS tính đúng vectơ AB, AC.',
  },
  s3: {
    title: 'Ba kỹ năng luyện tập',
    steps: [
      'Tính góc: $\\cos\\alpha = \\dfrac{\\vec u\\cdot\\vec v}{|\\vec u||\\vec v|}$ — kiểm dấu để biết nhọn/tù.',
      'Kiểm vuông góc: tích vô hướng bằng 0 tại một đỉnh.',
      'Nhận dạng tam giác: so ba cạnh; nếu hai cạnh bằng nhau và góc xen giữa 60° thì đều.',
      'Bài tham số: lập phương trình tích vô hướng = 0 và giải.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao tam giác này đều?', '`[PHÁT HIỆN]` Nếu đổi C thành (0;0;2) thì góc A thay đổi thế nào?'],
    cue: 'Khung 4 kỹ năng; HS tự chọn bài theo mức.',
    close: 'Tích vô hướng cho góc; độ dài cho hình dạng; kết hợp cả hai để nhận dạng tam giác.',
  },
  s4: { bat: 'AI kết luận tam giác ABC vuông tại A vì "tích vô hướng dương nên có góc vuông".', chung: 'Vuông góc khi tích bằng 0, không phải dương. Ở đây tích bằng 1 nên góc A = 60°, tam giác đều.', sua: 'Ba cạnh bằng √2 ⇒ tam giác đều, không vuông.', cue: 'Cho HS tính BC để thấy ba cạnh bằng nhau.', lookFor: 'HS phân biệt tích dương với vuông góc.' },
  s6: { hints: { M: 'tính vectơ rồi tích vô hướng.', S: 'so ba cạnh để nhận dạng tam giác.', C: 'giải bài tham số vuông góc.' }, lookFor: 'HS M đúng tích; HS S nhận dạng đúng; HS C giải được m.' },
  postCheck: {
    q: 'Cho A(0;0;0), B(1;1;0), C(1;0;1). Tam giác ABC có vuông không?',
    a: 'AB = (1;1;0), AC = (1;0;1), tích = 1 ≠ 0; BC = (0;−1;1). Kiểm tại B: BA·BC = (−1;−1;0)·(0;−1;1) = 1 ≠ 0. Tại C: CA·CB = (−1;0;−1)·(0;1;−1) = 1 ≠ 0. Không vuông; các cạnh AB = AC = BC = √2 nên tam giác đều.',
    ds: [{ t: '"Tích vô hướng dương ⇒ vuông góc"', v: 'Sai' }, { t: '"Ba cạnh bằng nhau ⇒ tam giác đều"', v: 'Đúng' }, { t: '"Vuông góc ⇔ tích vô hướng = 0"', v: 'Đúng' }],
    cue: 'Chấm chéo theo 4 kỹ năng.',
  },
  s8Close: 'Tích vô hướng → góc; độ dài → hình dạng.',
  s9: {
    title: 'Kiểm tra kết cấu ba trụ',
    bullets: ['Ba trụ tạo tam giác đều cạnh √2 ≈ 1,41 m — kết cấu đối xứng, chịu lực đều.', 'Nếu một góc phải vuông (theo thiết kế), phải điều chỉnh tọa độ để tích vô hướng bằng 0.', 'Kiểm bằng tọa độ nhanh và chính xác hơn đo góc thực địa.'],
    cue: 'Hỏi: "Muốn góc A vuông thì cần đổi tọa độ nào?"',
  },
  exit: ['Nêu công thức tính góc từ tích vô hướng.', 'Nêu 1 bẫy (nhầm tích dương với vuông góc).', 'Tự đánh giá M / S / C.', 'Tam giác A(1;0;0), B(0;1;0), C(0;0;1) có góc A bằng bao nhiêu?'],
  exitCue: 'Mở lại bảng ba kỹ năng ở S3.',
  after: '- HS hoàn thành phiếu luyện tích vô hướng; chuẩn bị tiết tự chọn.',
  snapshot: {
    focus: 'Luyện tích vô hướng tọa độ trên tam giác ba trụ A(1;0;0), B(0;1;0), C(0;0;1): AB·AC = 1, ba cạnh bằng √2, góc A = 60° (tam giác đều); rèn nhận dạng tam giác và bài toán tham số vuông góc',
    formulas: ['\\cos\\alpha = \\dfrac{\\vec u\\cdot\\vec v}{|\\vec u||\\vec v|}', '\\vec u \\perp \\vec v \\Leftrightarrow \\vec u\\cdot\\vec v = 0', 'AB = AC = BC = \\sqrt2 \\Rightarrow \\text{tam giác đều}'],
    examples: [
      { question: 'Cho A(1;0;0), B(0;1;0), C(0;0;1). Tính góc A và nhận dạng tam giác.', answer: 'AB = (−1;1;0), AC = (−1;0;1); AB·AC = 1; |AB| = |AC| = √2 ⇒ cos A = 1/2 ⇒ A = 60°. BC = (0;−1;1) có độ dài √2 nên tam giác đều.' },
      { question: 'Tìm m để tam giác với A(0;0;0), B(1;1;0), C(1;0;m) vuông tại A.', answer: 'AB·AC = (1;1;0)·(1;0;m) = 1 ≠ 0 với mọi m ⇒ không thể vuông tại A. Muốn vuông tại A phải đổi tọa độ B hoặc C.' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu công thức cos góc giữa hai vectơ.', answer: 'cos α = (u·v)/(|u||v|).' },
      { level: 'NB', question: 'Tam giác vuông tại A khi nào?', answer: 'Khi AB·AC = 0.' },
      { level: 'TH', question: 'Tính góc A của tam giác A(1;0;0), B(0;1;0), C(0;0;1).', answer: 'AB·AC = 1; |AB| = |AC| = √2 ⇒ cos A = 1/2 ⇒ A = 60°.' },
      { level: 'TH', question: 'Tính độ dài BC trong tam giác trên.', answer: 'BC = (0;−1;1) ⇒ |BC| = √2.' },
      { level: 'VD', question: 'Tìm m để (1; 2; 3) vuông góc với (2; 1; m).', answer: '2 + 2 + 3m = 0 ⇒ m = −4/3.' },
      { level: 'VD', question: 'Phản biện: "Tích vô hướng dương nghĩa là hai vectơ vuông góc".', answer: 'Sai. Vuông góc khi tích bằng 0. Tích dương nghĩa là góc nhọn (cos > 0), ví dụ tam giác đều có góc 60° và tích dương.' },
    ],
    quick: [
      { question: 'Vì sao tam giác trên là tam giác đều?', solution: 'Vì ba cạnh đều bằng √2 (AB = AC = BC).' },
      { question: 'Tích vô hướng âm cho biết gì?', solution: 'Góc giữa hai vectơ là góc tù (cos α < 0).' },
    ],
    mistakes: ['Kết luận vuông góc khi tích dương.', 'Tính sai vectơ (đảo chiều).', 'Nhầm góc 60° với 120°.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Ba kỹ năng', 'a. Tính góc qua cos.', 'b. Kiểm vuông góc qua tích = 0.', 'c. Nhận dạng tam giác qua độ dài.', '2. Áp dụng', 'a. A(1;0;0), B(0;1;0), C(0;0;1): AB·AC = 1; A = 60°; tam giác đều cạnh √2.'],
  },
  aiError: {
    category: 'Lỗi khái niệm', wrongSolution: 'AI kết luận: "Tam giác ABC với A(1;0;0), B(0;1;0), C(0;0;1) vuông tại A vì AB·AC = 1 > 0, chứng tỏ hai cạnh vuông góc."',
    correction: 'Vuông góc khi tích vô hướng bằng 0, không phải dương. Ở đây AB·AC = 1 nên cos A = 1/2, góc A = 60°; tam giác đều cạnh √2.',
    proof: 'Tính BC = √2, AB = AC = √2 ⇒ ba cạnh bằng nhau ⇒ tam giác đều, mọi góc 60°. Nếu vuông tại A thì BC² = AB² + AC² = 4, tức BC = 2 ≠ √2.',
    whyAiError: 'Mô hình nhầm điều kiện vuông góc (tích = 0) với điều kiện tích dương.',
    teacherPrompt: 'Em kiểm định lý Pythagore cho tam giác này rồi sửa lại kết luận của AI.',
    studentProduct: 'Thẻ Đ/S + BC = √2 và phép kiểm Pythagore (BC² = 2 ≠ 4), kết luận tam giác đều.',
    boardPrompt: 'AI nói vuông vì tích dương. Kiểm BC² với AB² + AC².',
    libraryTitle: 'Lỗi AI nhầm tích vô hướng dương với vuông góc',
  },
};

const L41 = {
  ...base,
  key: '12-6-41', period: 41, lessonType: 'practice', selfChoice: true,
  title: 'Tự chọn — khảo sát và tích vô hướng',
  opening: 'Tiết tự chọn cuối tuần: em chọn mạch khảo sát hàm hoặc mạch tọa độ — mục tiêu chung là trình bày đủ bước và kiểm.',
  focusQuestion: 'Hai mạch khác nhau nhưng đều cần điều gì để kết luận đáng tin?',
  axis: `**Tình huống: Hai đề bài của tuần — học sinh chọn một.**

| Mạch | Nội dung | Kết quả chuẩn |
|---|---|---|
| A — Khảo sát | $y = \\dfrac{x^2 - 2x + 3}{x - 1}$ | TCĐ $x = 1$; TCX $y = x - 1$; cực trị $x = 1 \\pm \\sqrt2$ |
| B — Tích vô hướng | $\\vec a = (1; 2; 3)$, $\\vec b = (2; 1; m)$ | $\\vec a \\perp \\vec b \\Leftrightarrow m = -\\tfrac43$ |

- **Mạch A kiểm chứng:** $y(0) = -3$; $y(2) = 3$; $y(11) = 10{,}2$ — tiến sát $y = x - 1$.
- **Mạch B kiểm chứng:** $\\vec a\\cdot\\vec b = 2 + 2 + 3m$; bằng 0 khi $m = -\\tfrac43$; thử lại: $2 + 2 - 4 = 0$ ✓.

**Bẫy của bài:** chọn mạch nhưng bỏ phép kiểm; lẫn công thức giữa hai mạch.`,
  goals: {
    must: 'Hoàn thành một mạch với kết quả đúng và một phép kiểm.',
    should: 'Trình bày trọn vẹn cả hai mạch.',
    could: 'Tự đặt tiêu chí đánh giá và phản biện bài của bạn.',
  },
  s1: {
    title: 'Chọn mạch và cam kết',
    context: 'Mạch A: khảo sát hàm phân thức. Mạch B: tích vô hướng và tham số vuông góc.',
    question: 'Với $\\vec a = (1;2;3)$, $\\vec b = (2;1;m)$, giá trị nào của $m$ làm hai vectơ vuông góc?',
    options: ['m = −4/3', 'm = 4/3', 'm = −4'],
    correct: 0,
    why: 'Tích = 2 + 2 + 3m = 0 ⇒ m = −4/3. Kiểm: 2 + 2 + 3·(−4/3) = 4 − 4 = 0 ✓.',
    discuss: ['`[PHÁT HIỆN]` Mạch A có tiệm cận xiên là gì?', '`[SO SÁNH]` Hai mạch cần phép kiểm gì?'],
    cue: 'Treo hai cột A/B; HS chọn và ghi cam kết.',
    lookFor: 'HS chọn mạch và nêu phép kiểm.',
  },
  s3: {
    title: 'Chữa mẫu hai mạch',
    steps: [
      'Mạch A: chia đa thức → tiệm cận xiên; đạo hàm → cực trị; kiểm bằng giá trị lớn.',
      'Mạch B: tính tích vô hướng → giải phương trình = 0 → kiểm lại bằng phép thay.',
      'Mỗi mạch cần một phép kiểm độc lập với cách giải.',
      'Ghi kết luận có đơn vị/ngữ cảnh nếu bài cho tình huống thực tế.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao phép kiểm phải độc lập?', '`[PHÁT HIỆN]` Cực tiểu của mạch A ở đâu?'],
    cue: 'Khung hai cột; nhắc bước kiểm ở cuối mỗi cột.',
    close: 'Chọn mạch nào cũng phải kết thúc bằng phép kiểm.',
  },
  s4: { bat: 'AI kết luận $m = 4/3$ vì "đổi vế 3m = 4 nên m = 4/3".', chung: 'Phương trình là $2 + 2 + 3m = 0 \\Rightarrow 3m = -4 \\Rightarrow m = -4/3$.', sua: 'Giữ dấu âm khi chuyển vế.', cue: 'Cho HS thay $m = 4/3$ lại: $4 + 4 = 8 \\ne 0$.', lookFor: 'HS kiểm bằng phép thay.' },
  s6: { hints: { M: 'làm mạch B trước vì ngắn, nhớ dấu khi chuyển vế.', S: 'làm cả hai mạch, mỗi mạch một phép kiểm.', C: 'tự đặt tiêu chí và phản biện bài bạn.' }, lookFor: 'HS M đúng dấu; HS S đủ hai mạch; HS C có tiêu chí.' },
  postCheck: {
    q: 'Với mạch A, tìm tiệm cận và cực trị của $y = \\dfrac{x^2 - 2x + 3}{x - 1}$.',
    a: 'Chia: $y = x - 1 + 2/(x-1)$ ⇒ TCĐ $x = 1$; TCX $y = x - 1$. $y\' = 1 - 2/(x-1)^2 = 0$ ⇒ $x = 1 \\pm \\sqrt2$; cực tiểu tại $1 + \\sqrt2$, cực đại tại $1 - \\sqrt2$.',
    ds: [{ t: '"m = −4/3 cho a ⊥ b"', v: 'Đúng' }, { t: '"Chuyển vế không đổi dấu"', v: 'Sai' }, { t: '"Mỗi mạch cần một phép kiểm"', v: 'Đúng' }],
    cue: 'Chấm chéo giữa hai nhóm.',
  },
  s8Close: 'Dữ kiện → công cụ → kiểm, cho cả hai mạch.',
  s9: {
    title: 'Trình bày và phản biện',
    bullets: ['Nhóm A trình bày đồ thị hàm phân thức và ý nghĩa chi phí.', 'Nhóm B trình bày điều kiện vuông góc và ứng dụng kiểm kết cấu.', 'Lớp chấm theo 3 tiêu chí: đúng công cụ — đủ bước — có phép kiểm.'],
    cue: 'Mỗi nhóm 2 phút, lớp đặt câu hỏi phản biện.',
  },
  exit: ['Nêu quy trình chung hai mạch.', 'Nêu 1 bẫy (mất dấu khi chuyển vế; bỏ phép kiểm).', 'Tự đánh giá M / S / C.', 'Tìm m để (1;2;3) vuông góc (2;1;m).'],
  exitCue: 'Mở lại bảng hai mạch ở mục II.',
  after: '- HS hoàn thành phiếu tự chọn; chuẩn bị nội dung tuần tiếp theo.',
  snapshot: {
    focus: 'Tự chọn một trong hai mạch: khảo sát hàm phân thức y = (x²−2x+3)/(x−1) (TCĐ x = 1, TCX y = x − 1, cực trị x = 1 ± √2) hoặc tích vô hướng với điều kiện vuông góc (a = (1;2;3), b = (2;1;m) ⇒ m = −4/3); mỗi mạch đều có phép kiểm',
    formulas: ['y = x - 1 + \\dfrac{2}{x-1}', '\\vec a\\cdot\\vec b = 2 + 2 + 3m', '\\vec a \\perp \\vec b \\Leftrightarrow m = -\\dfrac43'],
    examples: [
      { question: 'Mạch A: tìm tiệm cận và cực trị của y = (x² − 2x + 3)/(x − 1).', answer: 'y = x − 1 + 2/(x−1) ⇒ TCĐ x = 1, TCX y = x − 1. y′ = 1 − 2/(x−1)² = 0 ⇒ x = 1 ± √2 (cực tiểu tại 1 + √2 với y = 2√2; cực đại tại 1 − √2).' },
      { question: 'Mạch B: tìm m để a = (1;2;3) vuông góc với b = (2;1;m) và kiểm lại.', answer: 'a·b = 2 + 2 + 3m = 0 ⇒ m = −4/3. Kiểm: 4 + 3·(−4/3) = 4 − 4 = 0 ✓.' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu điều kiện vuông góc của hai vectơ theo tọa độ.', answer: 'a₁b₁ + a₂b₂ + a₃b₃ = 0.' },
      { level: 'NB', question: 'Nêu cách tìm tiệm cận xiên của hàm bậc hai/bậc nhất.', answer: 'Chia tử cho mẫu, lấy phần đa thức bậc nhất làm tiệm cận xiên.' },
      { level: 'TH', question: 'Tìm m để (1;2;3) vuông góc (2;1;m).', answer: '2 + 2 + 3m = 0 ⇒ m = −4/3.' },
      { level: 'TH', question: 'Tìm tiệm cận của y = (x² − 2x + 3)/(x − 1).', answer: 'TCĐ x = 1; TCX y = x − 1.' },
      { level: 'VD', question: 'Tìm cực trị của y = (x² − 2x + 3)/(x − 1).', answer: 'x = 1 ± √2; cực tiểu (1+√2; 2√2), cực đại (1−√2; −2√2).' },
      { level: 'VD', question: 'Nêu 3 tiêu chí chấm bài trình bày của nhóm bạn.', answer: 'Ví dụ: (1) chọn đúng công cụ theo dữ kiện; (2) trình bày đủ bước, có lập luận; (3) có phép kiểm độc lập và kết luận rõ ràng.' },
    ],
    quick: [
      { question: 'Vì sao phải kiểm lại m sau khi giải?', solution: 'Vì lỗi dấu khi chuyển vế rất phổ biến; thay lại vào tích vô hướng là phép kiểm nhanh và chắc chắn.' },
      { question: 'Hàm phân thức có tiệm cận ngang không?', solution: 'Không, vì bậc tử lớn hơn bậc mẫu; chỉ có tiệm cận đứng và xiên.' },
    ],
    mistakes: ['Sai dấu khi chuyển vế.', 'Bỏ tiệm cận xiên.', 'Không có phép kiểm.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Mạch A', 'a. y = x − 1 + 2/(x−1).', 'b. TCĐ x = 1; TCX y = x − 1.', 'c. Cực trị x = 1 ± √2.', '2. Mạch B', 'a. a·b = 2 + 2 + 3m.', 'b. Vuông góc ⇔ m = −4/3.'],
  },
  aiError: {
    category: 'Lỗi đại số', wrongSolution: 'AI giải: "a·b = 2 + 2 + 3m = 8 + 3m. Cho bằng 0 được m = −8/3."',
    correction: '2 + 2 = 4 (không phải 8), nên 4 + 3m = 0 ⇒ m = −4/3.',
    proof: 'Kiểm với m = −4/3: 2 + 2 + 3·(−4/3) = 4 − 4 = 0 ✓. Với m = −8/3: 4 + 3·(−8/3) = 4 − 8 = −4 ≠ 0.',
    whyAiError: 'Mô hình cộng sai hai số hạng đầu (2 + 2 = 8) trước khi giải phương trình.',
    teacherPrompt: 'Em cộng lại 2 + 2 và thay cả hai giá trị m để sửa lỗi của AI.',
    studentProduct: 'Thẻ Đ/S + phép thử hai giá trị m, kết luận m = −4/3.',
    boardPrompt: 'AI ra m = −8/3. Thay lại vào tích.',
    libraryTitle: 'Lỗi AI cộng sai số hạng khi giải phương trình vuông góc',
  },
};

export default [L38, L39, L40, L41];

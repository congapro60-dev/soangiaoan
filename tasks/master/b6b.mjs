const base = {
  grade: 12, week: 5, date: '2026-11-04',
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

const L30 = {
  ...base,
  key: '12-5-30', period: 30, lessonType: 'practice',
  title: 'Luyện tập hệ trục tọa độ Oxyz',
  opening: 'Kho hàng có ba chiều: dài, rộng, cao — hôm nay lớp mình gắn hệ trục Oxyz để định vị mọi kệ hàng.',
  focusQuestion: 'Một điểm trong không gian cần bao nhiêu số để xác định, và mỗi số nói điều gì?',
  axis: `**Tình huống: Kho hàng 3 chiều — mỗi kệ được định vị bằng tọa độ (x; y; z) tính bằng mét.**

| Điểm | Tọa độ | Ý nghĩa |
|---|---|---|
| Kệ A | $(1; 2; 3)$ | cách gốc 1 m theo trục x, 2 m theo y, cao 3 m |
| Kệ B | $(3; 0; 1)$ | nằm trên mặt phẳng y = 0, cao 1 m |

- **Trung điểm AB:** $\\left(\\dfrac{1+3}{2}; \\dfrac{2+0}{2}; \\dfrac{3+1}{2}\\right) = (2; 1; 2)$.
- **Khoảng cách AB:** $\\sqrt{(3-1)^2 + (0-2)^2 + (1-3)^2} = \\sqrt{4+4+4} = 2\\sqrt3 \\approx 3{,}46$ m.
- **Hình chiếu của A lên mặt phẳng Oxy:** $(1; 2; 0)$ — cao độ bằng 0.
- **Trọng tâm tam giác** $A(1;0;0)$, $B(0;2;0)$, $C(0;0;3)$: $G\\left(\\tfrac13; \\tfrac23; 1\\right)$.

**Bẫy của bài:** nhầm thứ tự trục; quên rằng hình chiếu lên mặt phẳng Oxy là "đặt z = 0"; cộng sai khi tính trung điểm (phải chia 2).`,
  goals: {
    must: 'Đọc và viết đúng tọa độ điểm trong Oxyz; tính trung điểm và khoảng cách.',
    should: 'Tìm hình chiếu trên các mặt phẳng tọa độ và trọng tâm tam giác.',
    could: 'Mô hình hóa vị trí kệ hàng thực tế và tính khoảng cách an toàn giữa các kệ.',
  },
  s1: {
    title: 'Định vị kệ hàng',
    context: 'Kệ A(1;2;3), kệ B(3;0;1). Cần biết trung điểm và khoảng cách.',
    question: 'Trung điểm của AB có tọa độ nào?',
    options: ['(4; 2; 4)', '(2; 1; 2)', '(1; 1; 1)'],
    correct: 1,
    why: 'Trung điểm = trung bình cộng từng tọa độ: ((1+3)/2; (2+0)/2; (3+1)/2) = (2;1;2).',
    discuss: ['`[PHÁT HIỆN]` Điểm nào nằm trên mặt phẳng Oxy?', '`[SO SÁNH]` Khoảng cách AB tính thế nào?'],
    cue: 'Vẽ hệ trục 3D đơn giản; cho HS đánh dấu A và B theo từng bước: đi x, đi y, lên z.',
    lookFor: 'HS đọc đúng thứ tự (x; y; z).',
  },
  s3: {
    title: 'Bốn công thức cơ bản',
    steps: [
      'Tọa độ điểm: $M(x; y; z)$ — ba số theo thứ tự hoành, tung, cao.',
      'Trung điểm: $I\\left(\\dfrac{x_A+x_B}{2}; \\dfrac{y_A+y_B}{2}; \\dfrac{z_A+z_B}{2}\\right)$.',
      'Khoảng cách: $AB = \\sqrt{(x_B-x_A)^2 + (y_B-y_A)^2 + (z_B-z_A)^2}$.',
      'Hình chiếu: lên $(Oxy)$ giữ $x, y$ và đặt $z = 0$; lên $(Oxz)$ đặt $y = 0$; lên $(Oyz)$ đặt $x = 0$.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao hình chiếu lên Oxy có z = 0?', '`[PHÁT HIỆN]` Trọng tâm tam giác tính thế nào?'],
    cue: 'Khung 4 công thức; HS ghi kèm ví dụ số.',
    close: 'Ba tọa độ ứng với ba chiều; mọi công thức đều áp dụng độc lập theo từng tọa độ.',
  },
  s4: { bat: 'AI tính khoảng cách AB = √((3−1) + (0−2) + (1−3)) = √(−2) — bỏ bình phương.', chung: 'Công thức có bình phương: AB² = 4 + 4 + 4 = 12 ⇒ AB = 2√3 ≈ 3,46 m.', sua: 'Bình phương từng hiệu rồi mới cộng.', cue: 'Cho HS nhận xét kết quả √(−2) là vô nghĩa — dấu hiệu bỏ bình phương.', lookFor: 'HS phát hiện kết quả vô lý.' },
  s6: { hints: { M: 'áp công thức trung điểm và khoảng cách theo từng tọa độ.', S: 'tìm hình chiếu bằng cách đặt một tọa độ bằng 0.', C: 'tính trọng tâm và mô hình hóa vị trí kệ.' }, lookFor: 'HS M đúng công thức; HS S đúng hình chiếu; HS C mô hình đúng.' },
  postCheck: {
    q: 'Cho A(1; −2; 3). Tìm hình chiếu của A lên (Oxy) và (Oyz).',
    a: 'Lên (Oxy): (1; −2; 0). Lên (Oyz): (0; −2; 3).',
    ds: [{ t: '"Trung điểm AB là (x_A + x_B; y_A + y_B; z_A + z_B)"', v: 'Sai — phải chia 2' }, { t: '"Khoảng cách dùng tổng bình phương các hiệu"', v: 'Đúng' }, { t: '"Hình chiếu lên Oxy có z = 0"', v: 'Đúng' }],
    cue: 'Chấm chéo theo 4 công thức.',
  },
  s8Close: 'Ba tọa độ — trung bình cho trung điểm — bình phương cho khoảng cách.',
  s9: {
    title: 'Kiểm tra khoảng cách an toàn',
    bullets: ['Khoảng cách hai kệ A, B là 2√3 ≈ 3,46 m — đủ lối đi nếu tiêu chuẩn ≥ 3 m.', 'Nếu kệ C ở (3; 2; 1): khoảng cách BC = √(0 + 4 + 0) = 2 m — dưới tiêu chuẩn, cần điều chỉnh.', 'Hình chiếu lên mặt sàn giúp vẽ sơ đồ 2D để kiểm tra nhanh.'],
    cue: 'Hỏi: "Vì sao khoảng cách 3D khác khoảng cách trên sơ đồ 2D?"',
  },
  exit: ['Nêu công thức trung điểm và khoảng cách trong Oxyz.', 'Nêu 1 bẫy (quên chia 2; quên bình phương).', 'Tự đánh giá M / S / C.', 'Trung điểm của A(1;2;3) và B(3;0;1) là gì?'],
  exitCue: 'Mở lại 4 công thức ở S3.',
  after: '- HS làm bài tập SGK về tọa độ điểm; chuẩn bị tiết biểu thức tọa độ vectơ.',
  snapshot: {
    focus: 'Luyện tập hệ trục tọa độ Oxyz trên mô hình kho hàng: A(1;2;3), B(3;0;1) với trung điểm (2;1;2), AB = 2√3 ≈ 3,46 m; hình chiếu lên các mặt phẳng tọa độ và trọng tâm tam giác',
    formulas: ['I\\left(\\dfrac{x_A+x_B}{2}; \\dfrac{y_A+y_B}{2}; \\dfrac{z_A+z_B}{2}\\right)', 'AB = \\sqrt{(x_B-x_A)^2 + (y_B-y_A)^2 + (z_B-z_A)^2}', 'G\\left(\\dfrac{x_A+x_B+x_C}{3}; \\dfrac{y_A+y_B+y_C}{3}; \\dfrac{z_A+z_B+z_C}{3}\\right)'],
    examples: [
      { question: 'Kho có kệ A(1; 2; 3) và B(3; 0; 1). Tìm trung điểm và khoảng cách AB.', answer: 'Trung điểm I = ((1+3)/2; (2+0)/2; (3+1)/2) = (2; 1; 2). AB = √((3−1)² + (0−2)² + (1−3)²) = √(4+4+4) = 2√3 ≈ 3,46 m.' },
      { question: 'Tìm hình chiếu của A(1; 2; 3) lên các mặt phẳng (Oxy), (Oxz), (Oyz).', answer: 'Lên (Oxy): (1; 2; 0). Lên (Oxz): (1; 0; 3). Lên (Oyz): (0; 2; 3).' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu công thức tọa độ trung điểm của AB.', answer: 'I = ((x_A + x_B)/2; (y_A + y_B)/2; (z_A + z_B)/2).' },
      { level: 'NB', question: 'Điểm M(2; −1; 4) có hình chiếu lên (Oxy) là điểm nào?', answer: '(2; −1; 0).' },
      { level: 'TH', question: 'Tính khoảng cách giữa A(1; 2; 3) và B(3; 0; 1).', answer: 'AB = √(4 + 4 + 4) = 2√3 ≈ 3,46.' },
      { level: 'TH', question: 'Tìm trọng tâm tam giác A(1;0;0), B(0;2;0), C(0;0;3).', answer: 'G((1+0+0)/3; (0+2+0)/3; (0+0+3)/3) = (1/3; 2/3; 1).' },
      { level: 'VD', question: 'Tìm điểm M trên trục Oz cách đều A(1;0;0) và B(0;1;0).', answer: 'M(0;0;z): MA² = 1 + z², MB² = 1 + z² ⇒ luôn bằng nhau với mọi z. Vậy mọi điểm trên Oz đều cách đều A và B.' },
      { level: 'VD', question: 'Ba kệ có tọa độ A(0;0;0), B(3;0;0), C(0;4;0). Tính khoảng cách BC và nhận xét tam giác ABC.', answer: 'BC = √(9 + 16) = 5. Tam giác vuông tại A với AB = 3, AC = 4, BC = 5.' },
    ],
    quick: [
      { question: 'Vì sao hình chiếu lên (Oxy) có z = 0?', solution: 'Vì mặt phẳng (Oxy) gồm các điểm có cao độ bằng 0; chiếu vuông góc xuống đó là bỏ thành phần z.' },
      { question: 'Trung điểm của A và B khác trọng tâm tam giác ở đâu?', solution: 'Trung điểm chia 2 (hai điểm), trọng tâm chia 3 (ba đỉnh).' },
    ],
    mistakes: ['Quên chia 2 khi tính trung điểm.', 'Quên bình phương khi tính khoảng cách.', 'Nhầm thứ tự tọa độ (x; y; z).'],
    boardKnowledge: ['II. NỘI DUNG', '1. Bốn công thức', 'a. Trung điểm: trung bình cộng từng tọa độ.', 'b. Khoảng cách: căn của tổng bình phương các hiệu.', 'c. Hình chiếu: đặt tọa độ vuông góc bằng 0.', 'd. Trọng tâm: trung bình cộng ba đỉnh.', '2. Áp dụng kho hàng', 'a. A(1;2;3), B(3;0;1): trung điểm (2;1;2).', 'b. AB = 2√3 ≈ 3,46 m.'],
  },
  aiError: {
    category: 'Lỗi đại số', wrongSolution: 'AI tính: "AB = √((3 − 1) + (0 − 2) + (1 − 3)) = √(2 − 2 − 2) = √(−2), vậy AB ≈ 1,41."',
    correction: 'Công thức khoảng cách dùng bình phương từng hiệu: AB² = 2² + (−2)² + (−2)² = 12 ⇒ AB = 2√3 ≈ 3,46.',
    proof: 'Kết quả √(−2) không tồn tại trong ℝ — dấu hiệu chắc chắn của việc bỏ bình phương. Kiểm bằng tọa độ: hiệu các tọa độ là 2, −2, −2 nên tổng bình phương là 4 + 4 + 4 = 12.',
    whyAiError: 'Mô hình rút gọn công thức khoảng cách thành tổng các hiệu, bỏ phép bình phương.',
    teacherPrompt: 'Em kiểm kết quả √(−2) của AI: căn của số âm có tồn tại không? Sửa lại công thức.',
    studentProduct: 'Thẻ Đ/S + chỉ ra căn âm vô lý và tính lại AB = 2√3.',
    boardPrompt: 'AI ra AB = √(−2). Sai ở bước nào?',
    libraryTitle: 'Lỗi AI bỏ bình phương trong công thức khoảng cách',
  },
};

const L31 = {
  ...base,
  key: '12-5-31', period: 31, lessonType: 'formation',
  title: 'Biểu thức tọa độ và phép toán vectơ',
  opening: 'Kho hàng cần tính vectơ dịch chuyển giữa các kệ — hôm nay lớp mình học các phép toán vectơ bằng tọa độ.',
  focusQuestion: 'Vì sao mọi phép toán vectơ đều thực hiện được theo từng tọa độ độc lập?',
  axis: `**Tình huống: Hai vectơ dịch chuyển trong kho: $\\vec a = (1; -2; 3)$ và $\\vec b = (2; 1; -1)$.**

| Phép toán | Kết quả |
|---|---|
| $\\vec a + \\vec b$ | $(3; -1; 2)$ |
| $\\vec a - \\vec b$ | $(-1; -3; 4)$ |
| $2\\vec a$ | $(2; -4; 6)$ |
| $2\\vec a - \\vec b$ | $(0; -5; 7)$ |
| $\\lvert\\vec a\\rvert$ | $\\sqrt{1+4+9} = \\sqrt{14} \\approx 3{,}74$ |
| $\\lvert\\vec b\\rvert$ | $\\sqrt{4+1+1} = \\sqrt6 \\approx 2{,}45$ |

- **Kiểm chứng tay:** $\\vec a + \\vec b = (1+2; -2+1; 3-1) = (3; -1; 2)$ ✓; $2\\vec a - \\vec b = (2; -4; 6) - (2; 1, -1) = (0; -5; 7)$ ✓.
- **Vectơ đơn vị của $\\vec a$:** $\\dfrac{1}{\\sqrt{14}}(1; -2; 3) \\approx (0{,}27; -0{,}53; 0{,}80)$.

**Bẫy của bài:** trừ sai dấu; nhân vô hướng vào chỉ một tọa độ; tính độ dài quên bình phương.`,
  goals: {
    must: 'Thực hiện cộng, trừ, nhân vô hướng vectơ và tính độ dài.',
    should: 'Tính biểu thức tổ hợp (ví dụ $2\\vec a - \\vec b$) và vectơ đơn vị.',
    could: 'Tìm vectơ $\\vec x$ thỏa phương trình vectơ; mô hình hóa dịch chuyển trong kho.',
  },
  s1: {
    title: 'Cộng trừ vectơ trong kho',
    context: 'a = (1; −2; 3), b = (2; 1; −1). Cần tính tổng và hiệu.',
    question: '$\\vec a + \\vec b$ bằng bao nhiêu?',
    options: ['(3; −1; 2)', '(−1; −3; 4)', '(2; −2; −3)'],
    correct: 0,
    why: 'Cộng theo từng tọa độ: (1+2; −2+1; 3+(−1)) = (3; −1; 2).',
    discuss: ['`[PHÁT HIỆN]` $\\vec a - \\vec b$ bằng bao nhiêu?', '`[SO SÁNH]` Độ dài của a và b khác nhau thế nào?'],
    cue: 'Nhấn: mỗi phép toán làm độc lập trên ba tọa độ, không trộn lẫn.',
    lookFor: 'HS cộng/trừ đúng theo từng thành phần.',
  },
  s3: {
    title: 'Bốn phép toán và độ dài',
    steps: [
      'Cộng/trừ: $(a_1 \\pm b_1; a_2 \\pm b_2; a_3 \\pm b_3)$.',
      'Nhân vô hướng: $k\\vec a = (ka_1; ka_2; ka_3)$ — nhân vào cả ba tọa độ.',
      'Độ dài: $|\\vec a| = \\sqrt{a_1^2 + a_2^2 + a_3^2}$.',
      'Vectơ đơn vị: $\\dfrac{\\vec a}{|\\vec a|}$ — cùng hướng, độ dài 1.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao vectơ đơn vị có độ dài 1?', '`[PHÁT HIỆN]` $3\\vec a - 2\\vec b$ bằng bao nhiêu?'],
    cue: 'Khung 4 phép toán; HS ghi công thức kèm ví dụ số.',
    close: 'Vectơ tính theo từng tọa độ; độ dài là căn tổng bình phương.',
  },
  s4: { bat: 'AI tính $2\\vec a - \\vec b = (2; -4; 6) - (2; 1; -1) = (0; -3; 5)$.', chung: 'Sai ở tọa độ thứ hai và thứ ba: $-4 - 1 = -5$; $6 - (-1) = 7$. Kết quả đúng $(0; -5; 7)$.', sua: 'Trừ đúng dấu từng tọa độ.', cue: 'Cho HS viết phép trừ thành cộng số đối để tránh sai dấu.', lookFor: 'HS kiểm lại từng tọa độ riêng.' },
  s6: { hints: { M: 'làm từng tọa độ một, viết dọc để tránh lẫn.', S: 'kiểm bằng cách thay lại: (2a − b) + b phải bằng 2a.', C: 'giải phương trình vectơ tìm x.' }, lookFor: 'HS M đúng phép tính; HS S có phép kiểm; HS C giải được phương trình.' },
  postCheck: {
    q: 'Cho $\\vec a = (1; -2; 3)$, $\\vec b = (2; 1; -1)$. Tìm $\\vec x$ sao cho $\\vec a + \\vec x = \\vec b$.',
    a: '$\\vec x = \\vec b - \\vec a = (2-1; 1-(-2); -1-3) = (1; 3; -4)$.',
    ds: [{ t: '"2a nhân 2 vào tọa độ đầu"', v: 'Sai — nhân cả ba' }, { t: '"|a| = √14"', v: 'Đúng' }, { t: '"a − b = (−1; −3; 4)"', v: 'Đúng' }],
    cue: 'Chấm chéo, kiểm bằng phép thay ngược.',
  },
  s8Close: 'Từng tọa độ — đúng dấu — kiểm ngược.',
  s9: {
    title: 'Tính vectơ dịch chuyển',
    bullets: ['Dịch chuyển từ kệ A tới kệ B: vectơ AB = B − A.', 'Độ dài vectơ = quãng đường thẳng giữa hai kệ.', 'Vectơ đơn vị cho biết hướng đi — dùng cho robot vận chuyển.'],
    cue: 'Hỏi: "Nếu robot đi theo vectơ đơn vị nhân 0,5 m mỗi bước thì cần bao nhiêu bước?"',
  },
  exit: ['Nêu công thức cộng, trừ, nhân vô hướng vectơ.', 'Nêu 1 bẫy (sai dấu; nhân một tọa độ).', 'Tự đánh giá M / S / C.', 'Cho a = (1;−2;3), b = (2;1;−1): tính a + b và |a|.'],
  exitCue: 'Mở lại bảng phép toán ở mục II.',
  after: '- HS làm bài tập SGK về biểu thức tọa độ vectơ; chuẩn bị tiết luyện tập.',
  snapshot: {
    focus: 'Hình thành biểu thức tọa độ của phép toán vectơ trong Oxyz: a = (1;−2;3), b = (2;1;−1) với a+b = (3;−1;2), a−b = (−1;−3;4), 2a−b = (0;−5;7), |a| = √14; nhân vô hướng và vectơ đơn vị',
    formulas: ['\\vec a \\pm \\vec b = (a_1 \\pm b_1; a_2 \\pm b_2; a_3 \\pm b_3)', 'k\\vec a = (ka_1; ka_2; ka_3)', '|\\vec a| = \\sqrt{a_1^2 + a_2^2 + a_3^2}'],
    examples: [
      { question: 'Cho a = (1; −2; 3), b = (2; 1; −1). Tính a + b, a − b và 2a − b.', answer: 'a + b = (3; −1; 2). a − b = (1−2; −2−1; 3+1) = (−1; −3; 4). 2a = (2; −4; 6) nên 2a − b = (0; −5; 7).' },
      { question: 'Tính độ dài của a và b; tìm vectơ đơn vị của a.', answer: '|a| = √(1+4+9) = √14; |b| = √(4+1+1) = √6. Vectơ đơn vị của a là (1; −2; 3)/√14.' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu công thức cộng hai vectơ theo tọa độ.', answer: 'a + b = (a₁ + b₁; a₂ + b₂; a₃ + b₃).' },
      { level: 'NB', question: 'Nêu công thức độ dài vectơ a = (a₁; a₂; a₃).', answer: '|a| = √(a₁² + a₂² + a₃²).' },
      { level: 'TH', question: 'Cho a = (1; −2; 3), b = (2; 1; −1). Tính a + b và a − b.', answer: 'a + b = (3; −1; 2); a − b = (−1; −3; 4).' },
      { level: 'TH', question: 'Tính |a| với a = (1; −2; 3).', answer: '√14 ≈ 3,74.' },
      { level: 'VD', question: 'Tìm x biết a + x = b với a = (1; −2; 3), b = (2; 1; −1).', answer: 'x = b − a = (1; 3; −4).' },
      { level: 'VD', question: 'Tìm vectơ đơn vị cùng hướng với a = (1; −2; 3).', answer: 'a/|a| = (1; −2; 3)/√14 ≈ (0,27; −0,53; 0,80).' },
    ],
    quick: [
      { question: 'Vì sao nhân vô hướng phải nhân cả ba tọa độ?', solution: 'Vì vectơ có ba thành phần; nhân chỉ một thành phần sẽ đổi hướng vectơ, không còn là phép nhân vô hướng.' },
      { question: 'Vectơ đơn vị có độ dài bao nhiêu?', solution: 'Bằng 1, vì chia vectơ cho độ dài của chính nó.' },
    ],
    mistakes: ['Trừ sai dấu tọa độ.', 'Nhân vô hướng chỉ vào một tọa độ.', 'Tính độ dài mà quên bình phương.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Phép toán', 'a. Cộng/trừ theo từng tọa độ.', 'b. Nhân vô hướng vào cả ba tọa độ.', 'c. Độ dài = căn tổng bình phương.', 'd. Vectơ đơn vị = a/|a|.', '2. Ví dụ chuẩn', 'a. a = (1;−2;3), b = (2;1;−1).', 'b. a + b = (3;−1;2); a − b = (−1;−3;4); 2a − b = (0;−5;7).', 'c. |a| = √14; |b| = √6.'],
  },
  aiError: {
    category: 'Lỗi đại số', wrongSolution: 'AI tính: "2a − b với a = (1; −2; 3), b = (2; 1; −1): 2a = (2; −4; 6); trừ b được (2 − 2; −4 − 1; 6 − 1) = (0; −5; 5)."',
    correction: 'Tọa độ thứ ba sai: 6 − (−1) = 7, không phải 6 − 1 = 5. Kết quả đúng là (0; −5; 7).',
    proof: 'Kiểm ngược: (2a − b) + b phải bằng 2a. Với (0; −5; 5) + (2; 1; −1) = (2; −4; 4) ≠ (2; −4; 6). Với (0; −5; 7): tổng = (2; −4; 6) ✓.',
    whyAiError: 'Mô hình đánh rơi dấu âm của tọa độ b₃ = −1 khi thực hiện phép trừ.',
    teacherPrompt: 'Em kiểm bằng phép cộng ngược (2a − b) + b rồi sửa lại tọa độ thứ ba.',
    studentProduct: 'Thẻ Đ/S + phép kiểm ngược và kết quả (0; −5; 7).',
    boardPrompt: 'AI ra (0; −5; 5). Cộng lại với b xem có bằng 2a?',
    libraryTitle: 'Lỗi AI rơi dấu âm khi trừ vectơ',
  },
};

const L32 = {
  ...base,
  key: '12-5-32', period: 32, lessonType: 'practice',
  title: 'Luyện tập biểu thức tọa độ vectơ',
  opening: 'Hôm nay lớp mình phối hợp tọa độ điểm, vectơ, độ dài và điều kiện thẳng hàng.',
  focusQuestion: 'Làm thế nào kiểm tra ba điểm thẳng hàng chỉ bằng tọa độ?',
  axis: `**Tình huống: Ba vị trí trong kho cần kiểm tra có nằm trên một đường thẳng (để lắp ray vận chuyển).**

| Bộ điểm | Vectơ | Kết luận |
|---|---|---|
| $A(1;0;0)$, $B(2;1;1)$, $C(3;2;2)$ | $\\vec{AB} = (1;1;1)$, $\\vec{AC} = (2;2;2)$ | thẳng hàng ($\\vec{AC} = 2\\vec{AB}$) |
| $A(1;0;0)$, $B(0;1;0)$, $C(0;0;1)$ | $\\vec{AB} = (-1;1;0)$, $\\vec{AC} = (-1;0;1)$ | không thẳng hàng |

- **Kiểm chứng tay:** $\\vec{AC} = 2\\vec{AB}$ ⇒ $A, B, C$ thẳng hàng, $B$ nằm giữa $A$ và $C$ (vì $0 < 2$).
- **Hình bình hành $ABCD$** với $A(1;0;0)$, $B(0;1;0)$, $C(0;0;1)$: $D = A + C - B = (1; -1; 1)$; kiểm $\\vec{AB} = (-1;1;0)$ và $\\vec{DC} = C - D = (-1;1;0)$ ✓.

**Bẫy của bài:** kết luận thẳng hàng khi hai vectơ cùng phương nhưng ngược chiều mà không kiểm điểm chung; nhầm công thức hình bình hành.`,
  goals: {
    must: 'Tính vectơ giữa hai điểm và kiểm điều kiện cùng phương.',
    should: 'Chứng minh ba điểm thẳng hàng và tìm đỉnh thứ tư của hình bình hành.',
    could: 'Xử lý bài toán tham số (tìm m để ba điểm thẳng hàng).',
  },
  s1: {
    title: 'Ba kệ có thẳng hàng?',
    context: 'A(1;0;0), B(2;1;1), C(3;2;2) — cần biết có lắp được một ray thẳng.',
    question: 'Làm sao kiểm tra ba điểm thẳng hàng?',
    options: ['So sánh độ dài AB và BC', 'Kiểm hai vectơ AB và AC cùng phương', 'Tính trung điểm AB'],
    correct: 1,
    why: 'Ba điểm thẳng hàng khi AB và AC cùng phương (tỉ lệ tọa độ bằng nhau).',
    discuss: ['`[PHÁT HIỆN]` AB và AC có tỉ lệ bao nhiêu?', '`[SO SÁNH]` Nếu AC = −2AB thì kết luận gì?'],
    cue: 'Viết tỉ lệ tọa độ thành ba phân số bằng nhau; HS kiểm từng cặp.',
    lookFor: 'HS kiểm cùng phương bằng tỉ lệ.',
  },
  s3: {
    title: 'Cùng phương, thẳng hàng, hình bình hành',
    steps: [
      'Vectơ $\\vec{AB} = (x_B - x_A; y_B - y_A; z_B - z_A)$.',
      'Cùng phương: $\\vec{AB} = k\\vec{AC}$ (tỉ lệ tọa độ bằng nhau, có điểm chung A).',
      'Thẳng hàng: cùng phương + có điểm chung (luôn đúng khi cùng gốc A).',
      'Hình bình hành $ABCD$: $\\vec{AB} = \\vec{DC}$ ⇔ $D = A + C - B$.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao cần điều kiện điểm chung?', '`[PHÁT HIỆN]` Với A, B, C ở trên, B có nằm giữa không?'],
    cue: 'Khung 4 bước; nhắc: "cùng phương + chung điểm = thẳng hàng".',
    close: 'Thẳng hàng là cùng phương có điểm chung; hình bình hành dùng vectơ bằng nhau.',
  },
  s4: { bat: 'AI kết luận ba điểm A(1;0;0), B(0;1;0), C(0;0;1) thẳng hàng vì "AB và AC đều có độ dài √2".', chung: 'Bằng độ dài không suy ra cùng phương: AB = (−1;1;0), AC = (−1;0;1) không tỉ lệ.', sua: 'Tỉ lệ: (−1)/(−1) = 1 nhưng 1/0 không xác định ⇒ không cùng phương ⇒ không thẳng hàng.', cue: 'Cho HS thử tìm k: (−1;1;0) = k(−1;0;1) → từ tọa độ 2: 1 = 0 (vô lý).', lookFor: 'HS kiểm bằng tỉ lệ, không bằng độ dài.' },
  s6: { hints: { M: 'tính AB và AC rồi so tỉ lệ.', S: 'dùng công thức D = A + C − B cho hình bình hành.', C: 'giải bài tham số tìm m để thẳng hàng.' }, lookFor: 'HS M đúng tỉ lệ; HS S đúng đỉnh D; HS C giải được tham số.' },
  postCheck: {
    q: 'Cho A(1;0;0), B(0;1;0), C(0;0;1). Tìm D để ABCD là hình bình hành.',
    a: 'D = A + C − B = (1+0−0; 0+0−1; 0+1−0) = (1; −1; 1). Kiểm: AB = (−1;1;0); DC = C − D = (−1;1;0) ✓.',
    ds: [{ t: '"Cùng độ dài ⇒ thẳng hàng"', v: 'Sai' }, { t: '"AC = 2AB ⇒ A, B, C thẳng hàng"', v: 'Đúng' }, { t: '"D = A + C − B cho hình bình hành ABCD"', v: 'Đúng' }],
    cue: 'Chấm chéo, kiểm bằng vectơ bằng nhau.',
  },
  s8Close: 'Cùng phương + chung điểm = thẳng hàng.',
  s9: {
    title: 'Lắp ray vận chuyển',
    bullets: ['A, B, C thẳng hàng nên lắp được một ray thẳng qua ba kệ — tiết kiệm vật liệu.', 'Nếu ba điểm không thẳng hàng phải dùng hai đoạn ray nối tiếp, tốn thêm khớp nối.', 'Kiểm tra bằng tỉ lệ tọa độ nhanh hơn đo thực tế.'],
    cue: 'Hỏi: "Nếu B không nằm giữa A và C thì ray có cần đổi hướng không?"',
  },
  exit: ['Nêu điều kiện thẳng hàng bằng vectơ.', 'Nêu 1 bẫy (dùng độ dài thay vì tỉ lệ).', 'Tự đánh giá M / S / C.', 'A(1;0;0), B(2;1;1), C(3;2;2) có thẳng hàng không? Vì sao?'],
  exitCue: 'Mở lại bảng hai bộ điểm ở mục II.',
  after: '- HS hoàn thành phiếu luyện vectơ; chuẩn bị tiết tự chọn.',
  snapshot: {
    focus: 'Luyện biểu thức tọa độ vectơ: kiểm ba điểm thẳng hàng qua tỉ lệ (A(1;0;0), B(2;1;1), C(3;2;2) thẳng hàng vì AC = 2AB), tìm đỉnh thứ tư hình bình hành D = A + C − B, tính độ dài và trung điểm',
    formulas: ['\\vec{AB} = (x_B - x_A; y_B - y_A; z_B - z_A)', 'A, B, C \\text{ thẳng hàng} \\Leftrightarrow \\vec{AB} = k\\vec{AC}', 'ABCD \\text{ là hình bình hành} \\Leftrightarrow \\vec{AB} = \\vec{DC} \\Leftrightarrow D = A + C - B'],
    examples: [
      { question: 'Kiểm tra A(1;0;0), B(2;1;1), C(3;2;2) có thẳng hàng không.', answer: 'AB = (1;1;1); AC = (2;2;2) = 2·AB. Hai vectơ cùng phương và có điểm chung A nên A, B, C thẳng hàng, B nằm giữa A và C.' },
      { question: 'Cho A(1;0;0), B(0;1;0), C(0;0;1). Tìm D để ABCD là hình bình hành.', answer: 'D = A + C − B = (1; −1; 1). Kiểm: AB = (−1;1;0) và DC = C − D = (−1;1;0) bằng nhau ✓.' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu công thức tính vectơ AB từ tọa độ hai điểm.', answer: 'AB = (x_B − x_A; y_B − y_A; z_B − z_A).' },
      { level: 'NB', question: 'Điều kiện để ba điểm A, B, C thẳng hàng là gì?', answer: 'AB và AC cùng phương (tồn tại k sao cho AB = k·AC).' },
      { level: 'TH', question: 'Cho A(1;0;0), B(2;1;1), C(3;2;2). Kiểm tra thẳng hàng.', answer: 'AB = (1;1;1); AC = (2;2;2) = 2AB ⇒ thẳng hàng.' },
      { level: 'TH', question: 'Cho A(1;0;0), B(0;1;0). Tìm M là trung điểm AB.', answer: 'M = (1/2; 1/2; 0).' },
      { level: 'VD', question: 'Tìm m để A(1;0;0), B(2;1;1), C(3;2;m) thẳng hàng.', answer: 'AB = (1;1;1); AC = (2;2;m). Cần AC = 2AB ⇒ m = 2.' },
      { level: 'VD', question: 'Phản biện kết luận: "AB và CD cùng độ dài nên AB // CD".', answer: 'Sai. Cùng độ dài không suy ra cùng phương: ví dụ AB = (1;0;0) và CD = (0;1;0) đều dài 1 nhưng vuông góc. Cần kiểm tỉ lệ tọa độ để kết luận song song.' },
    ],
    quick: [
      { question: 'Vì sao cùng phương chưa đủ để thẳng hàng?', solution: 'Vì hai vectơ cùng phương có thể nằm trên hai đường song song khác nhau; cần thêm điểm chung (cùng gốc A).' },
      { question: 'Công thức tìm D trong hình bình hành ABCD?', solution: 'D = A + C − B, suy từ AB = DC.' },
    ],
    mistakes: ['Dùng độ dài để kết luận cùng phương.', 'Nhầm công thức đỉnh hình bình hành.', 'Tính vectơ AB = A − B thay vì B − A.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Vectơ và cùng phương', 'a. AB = (x_B − x_A; y_B − y_A; z_B − z_A).', 'b. Cùng phương: AB = k·AC.', 'c. Thẳng hàng: cùng phương + chung điểm.', '2. Hình bình hành', 'a. AB = DC ⇔ D = A + C − B.', '3. Ví dụ', 'a. A(1;0;0), B(2;1;1), C(3;2;2): thẳng hàng (AC = 2AB).', 'b. A(1;0;0), B(0;1;0), C(0;0;1): D = (1;−1;1).'],
  },
  aiError: {
    category: 'Lỗi khái niệm', wrongSolution: 'AI kết luận: "A(1; 0; 0), B(0; 1; 0), C(0; 0; 1) thẳng hàng vì AB = AC = √2."',
    correction: 'Bằng độ dài không suy ra cùng phương. AB = (−1; 1; 0), AC = (−1; 0; 1) không tỉ lệ nên ba điểm không thẳng hàng.',
    proof: 'Nếu cùng phương phải có k với (−1;1;0) = k(−1;0;1). Từ tọa độ thứ hai: 1 = 0·k ⇒ vô lý. Vậy không tồn tại k, ba điểm không thẳng hàng.',
    whyAiError: 'Mô hình dùng đại lượng vô hướng (độ dài) để suy ra quan hệ phương của vectơ.',
    teacherPrompt: 'Em lập tỉ lệ tọa độ của AB và AC để kiểm, rồi sửa lại kết luận của AI.',
    studentProduct: 'Thẻ Đ/S + phép thử tìm k cho thấy vô nghiệm, kết luận không thẳng hàng.',
    boardPrompt: 'AI nói thẳng hàng vì AB = AC. Kiểm tỉ lệ tọa độ.',
    libraryTitle: 'Lỗi AI nhầm cùng độ dài với cùng phương',
  },
};

const L33 = {
  ...base,
  key: '12-5-33', period: 33, lessonType: 'practice', selfChoice: true,
  title: 'Tự chọn — hệ trục tọa độ và khảo sát hàm số',
  opening: 'Tiết tự chọn: em chọn một mạch tọa độ hoặc một mạch khảo sát hàm — mục tiêu chung là trình bày đủ bước và kiểm.',
  focusQuestion: 'Hai mạch khác nhau nhưng cùng yêu cầu điều gì ở người giải?',
  axis: `**Tình huống: Hai "đề bài" của tuần — học sinh chọn một.**

| Mạch | Nội dung | Kỹ năng trọng tâm |
|---|---|---|
| A — Tọa độ | $A(1;2;3)$, $B(3;0;1)$, $C(2;1;2)$ | vectơ, độ dài, thẳng hàng |
| B — Khảo sát | $y = x^3 - 3x + 1$ | cực trị, điểm uốn, biện luận |

- **Mạch A kiểm chứng:** $\\vec{AB} = (2; -2; -2)$, $\\vec{AC} = (1; -1; -1)$ ⇒ $\\vec{AB} = 2\\vec{AC}$ → thẳng hàng; $AB = \\sqrt{12} = 2\\sqrt3$.
- **Mạch B kiểm chứng:** cực đại $(-1; 3)$, cực tiểu $(1; -1)$; ba nghiệm khi $-1 < m < 3$.

**Bẫy của bài:** chọn mạch xong nhưng thiếu bước kiểm; lẫn công thức giữa hai mạch.`,
  goals: {
    must: 'Hoàn thành một mạch với đủ bước cơ bản.',
    should: 'Trình bày trọn vẹn cả hai mạch, mỗi mạch một phép kiểm.',
    could: 'Tự đặt tiêu chí đánh giá bài làm và phản biện bài của bạn.',
  },
  s1: {
    title: 'Chọn mạch và cam kết',
    context: 'Mạch A: tọa độ. Mạch B: khảo sát hàm bậc ba.',
    question: 'Với A(1;2;3), B(3;0;1), C(2;1;2), ba điểm có thẳng hàng không?',
    options: ['Có, vì AB = 2AC', 'Không, vì độ dài khác nhau', 'Không kiểm được'],
    correct: 0,
    why: 'AB = (2;−2;−2) = 2·(1;−1;−1) = 2AC nên cùng phương, có điểm chung A ⇒ thẳng hàng.',
    discuss: ['`[PHÁT HIỆN]` Với mạch B, cực đại ở đâu?', '`[SO SÁNH]` Hai mạch cần phép kiểm gì?'],
    cue: 'Treo hai cột A/B; HS chọn và ghi cam kết.',
    lookFor: 'HS chọn mạch và nêu phép kiểm sẽ dùng.',
  },
  s3: {
    title: 'Chữa mẫu hai mạch',
    steps: [
      'Mạch A: tính $\\vec{AB}, \\vec{AC}$ → so tỉ lệ → kết luận thẳng hàng; tính $AB = 2\\sqrt3$.',
      'Mạch B: $y\' = 3x^2 - 3$ → cực trị; $y\'\' = 6x$ → điểm uốn; biện luận theo $m$.',
      'Phép kiểm mạch A: thay tỉ lệ vào tọa độ từng thành phần.',
      'Phép kiểm mạch B: thử một giá trị $m$ cụ thể và đếm giao điểm trên đồ thị.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao mỗi mạch cần phép kiểm riêng?', '`[PHÁT HIỆN]` Nếu AB = −2AC thì kết luận gì?'],
    cue: 'Khung 2 cột, mỗi cột 3 bước + 1 phép kiểm.',
    close: 'Dù chọn mạch nào, quy trình vẫn là: dữ kiện → công cụ → kiểm.',
  },
  s4: { bat: 'AI kết luận A, B, C thẳng hàng vì "AB và AC cùng phương" nhưng tính AC = (−1;1;1) sai dấu.', chung: 'AC = C − A = (1; −1; −1), không phải (−1;1;1). Sai dấu dẫn tới kết luận sai dù ý tưởng đúng.', sua: 'AC = (1;−1;−1) = ½AB ⇒ thẳng hàng.', cue: 'Cho HS tính lại C − A theo từng tọa độ.', lookFor: 'HS kiểm dấu khi trừ tọa độ.' },
  s6: { hints: { M: 'làm mạch A trước, chú ý dấu khi trừ tọa độ.', S: 'làm cả hai mạch, mỗi mạch một phép kiểm.', C: 'tự đặt tiêu chí chấm bài và phản biện.' }, lookFor: 'HS M đúng dấu; HS S đủ hai mạch; HS C có tiêu chí rõ.' },
  postCheck: {
    q: 'Với mạch B, tìm $m$ để $x^3 - 3x + 1 = m$ có 3 nghiệm.',
    a: 'Cực đại 3 tại $x = -1$, cực tiểu $-1$ tại $x = 1$ ⇒ $3$ nghiệm khi $-1 < m < 3$.',
    ds: [{ t: '"AB = −2AC thì không thẳng hàng"', v: 'Sai — vẫn cùng phương' }, { t: '"Hai mạch đều cần phép kiểm"', v: 'Đúng' }, { t: '"AC = (−1;1;1) với A(1;2;3), C(2;1;2)"', v: 'Sai — phải là (1;−1;−1)' }],
    cue: 'Chấm chéo giữa hai nhóm mạch.',
  },
  s8Close: 'Dữ kiện → công cụ → kiểm, cho cả hai mạch.',
  s9: {
    title: 'Trình bày và phản biện',
    bullets: ['Nhóm mạch A trình bày cách kiểm thẳng hàng bằng tỉ lệ tọa độ.', 'Nhóm mạch B trình bày cách biện luận số nghiệm từ đồ thị.', 'Cả lớp chấm theo 3 tiêu chí: đúng công cụ — đủ bước — có phép kiểm.'],
    cue: 'Mỗi nhóm 2 phút; lớp phản biện bằng câu hỏi, không bằng nhận xét cảm tính.',
  },
  exit: ['Nêu quy trình chung cho cả hai mạch.', 'Nêu 1 bẫy (sai dấu khi trừ tọa độ; bỏ phép kiểm).', 'Tự đánh giá M / S / C.', 'A(1;2;3), B(3;0;1), C(2;1;2) có thẳng hàng không? Vì sao?'],
  exitCue: 'Mở lại bảng hai mạch ở mục II.',
  after: '- HS hoàn thành phiếu tự chọn; chuẩn bị nội dung tuần 6 (hàm phân thức và tích vô hướng).',
  snapshot: {
    focus: 'Tự chọn một trong hai mạch: tọa độ Oxyz (A(1;2;3), B(3;0;1), C(2;1;2) thẳng hàng vì AB = 2AC; AB = 2√3) hoặc khảo sát hàm bậc ba y = x³ − 3x + 1 (cực đại (−1;3), cực tiểu (1;−1); 3 nghiệm khi −1 < m < 3); mỗi mạch đều có phép kiểm',
    formulas: ['\\vec{AB} = k\\vec{AC} \\Rightarrow A, B, C \\text{ thẳng hàng}', 'y\' = 3x^2 - 3, \\ y\'\' = 6x', '\\text{Số nghiệm} = \\text{số giao điểm với } y = m'],
    examples: [
      { question: 'Mạch A: kiểm tra A(1;2;3), B(3;0;1), C(2;1;2) có thẳng hàng không và tính AB.', answer: 'AB = (2; −2; −2); AC = (1; −1; −1) = ½AB ⇒ cùng phương, có điểm chung A ⇒ thẳng hàng. AB = √(4+4+4) = 2√3 ≈ 3,46.' },
      { question: 'Mạch B: tìm cực trị của y = x³ − 3x + 1 và biện luận số nghiệm của y = m.', answer: 'y′ = 3x² − 3 = 0 tại x = ±1: cực đại (−1; 3), cực tiểu (1; −1). Phương trình y = m có 3 nghiệm khi −1 < m < 3, 2 nghiệm khi m = −1 hoặc m = 3, 1 nghiệm ngoài khoảng đó.' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu điều kiện thẳng hàng của ba điểm theo vectơ.', answer: 'AB và AC cùng phương (AB = k·AC).' },
      { level: 'NB', question: 'Nêu công thức tìm cực trị của hàm bậc ba.', answer: 'Tính y′, giải y′ = 0, xét dấu y′ để xác định cực đại/cực tiểu.' },
      { level: 'TH', question: 'Cho A(1;2;3), B(3;0;1). Tính AB và độ dài AB.', answer: 'AB = (2; −2; −2); |AB| = √12 = 2√3 ≈ 3,46.' },
      { level: 'TH', question: 'Tìm cực trị của y = x³ − 3x + 1.', answer: 'Cực đại (−1; 3), cực tiểu (1; −1).' },
      { level: 'VD', question: 'Tìm m để x³ − 3x + 1 = m có đúng 1 nghiệm.', answer: 'm < −1 hoặc m > 3.' },
      { level: 'VD', question: 'Đặt 3 tiêu chí để chấm bài trình bày của nhóm bạn.', answer: 'Ví dụ: (1) dùng đúng công cụ theo dữ kiện; (2) trình bày đủ bước, không nhảy bước; (3) có phép kiểm độc lập và kết luận rõ ràng. Có thể thêm tiêu chí đơn vị và cách trình bày.' },
    ],
    quick: [
      { question: 'Vì sao AB = −2AC vẫn cho ba điểm thẳng hàng?', solution: 'Vì −2 là một số thực khác 0, hai vectơ vẫn cùng phương; dấu chỉ cho biết B và C nằm về hai phía của A.' },
      { question: 'Phép kiểm nhanh cho mạch khảo sát là gì?', solution: 'Thử một giá trị m cụ thể, đếm số giao điểm trên đồ thị và so với kết luận biện luận.' },
    ],
    mistakes: ['Trừ tọa độ sai dấu.', 'Bỏ phép kiểm sau khi có kết quả.', 'Biện luận thiếu khoảng ngoài cực trị.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Mạch A — tọa độ', 'a. AB = (2;−2;−2); AC = (1;−1;−1) ⇒ thẳng hàng.', 'b. |AB| = 2√3.', '2. Mạch B — khảo sát', 'a. Cực đại (−1;3); cực tiểu (1;−1).', 'b. 3 nghiệm khi −1 < m < 3.'],
  },
  aiError: {
    category: 'Lỗi đại số', wrongSolution: 'AI tính: "AC = C − A với A(1; 2; 3), C(2; 1; 2) nên AC = (−1; 1; 1). Vì AB = (2; −2; −2) = −2·AC nên A, B, C thẳng hàng và B, C nằm cùng phía A."',
    correction: 'AC = C − A = (2−1; 1−2; 2−3) = (1; −1; −1). Khi đó AB = 2·AC (không phải −2), nên B và C nằm cùng phía A.',
    proof: 'Kiểm từng tọa độ: 2 − 1 = 1 (không phải −1); 1 − 2 = −1; 2 − 3 = −1. Dấu của cả ba tọa độ đều bị đảo trong kết quả của AI.',
    whyAiError: 'Mô hình trừ ngược thứ tự (A − C) thay vì (C − A), làm đảo dấu toàn bộ vectơ.',
    teacherPrompt: 'Em tính C − A theo từng tọa độ rồi sửa lại dấu và kết luận vị trí của B, C.',
    studentProduct: 'Thẻ Đ/S + phép trừ đúng ba tọa độ và kết luận AB = 2AC (cùng phía).',
    boardPrompt: 'AI ra AC = (−1;1;1). Tính 2 − 1 bằng bao nhiêu?',
    libraryTitle: 'Lỗi AI trừ ngược thứ tự khi tính vectơ',
  },
};

export default [L30, L31, L32, L33];

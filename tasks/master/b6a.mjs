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

const L26 = {
  ...base,
  key: '12-5-26', period: 26, lessonType: 'formation',
  title: 'Tiệm cận xiên',
  opening: 'Xưởng in có chi phí trung bình giảm dần theo số lượng — đường chi phí tiến sát một đường thẳng. Đó là tiệm cận xiên.',
  focusQuestion: 'Khi nào một đồ thị tiến sát một đường thẳng nghiêng thay vì đường ngang?',
  axis: `**Tình huống: Chi phí sản xuất $x$ nghìn sản phẩm của xưởng in: $C(x) = \\dfrac{x^2 + 2x + 3}{x + 1}$ (triệu đồng).**

- **Chia đa thức:** $C(x) = x + 1 + \\dfrac{2}{x + 1}$.
- Khi $x \\to +\\infty$: $C(x) - (x + 1) = \\dfrac{2}{x+1} \\to 0$ → **tiệm cận xiên $y = x + 1$**.
- **Kiểm chứng tay:** $C(9) = 9 + 1 + \\dfrac{2}{10} = 10{,}2$; đường $y = x+1$ cho $10$ → chênh 0,2. $C(99) = 100 + 0{,}02 = 100{,}02$ → chênh 0,02.
- **Tiệm cận đứng:** $x = -1$ (mẫu bằng 0, tử khác 0).
- **Vì sao không có tiệm cận ngang:** bậc tử (2) lớn hơn bậc mẫu (1) đúng 1 bậc → có tiệm cận xiên, không có ngang.

**Bẫy của bài:** nhầm $y = x + 1$ với $y = x$; chỉ lấy phần đa thức mà quên điều kiện phần dư → 0; nhầm bậc bằng nhau (tiệm cận ngang) với hơn 1 bậc (xiên).`,
  goals: {
    must: 'Nhận biết khi nào đồ thị có tiệm cận xiên và tìm nó bằng chia đa thức.',
    should: 'Tìm tiệm cận xiên của hàm phân thức và kiểm bằng giới hạn hiệu $f(x) - (ax+b)$.',
    could: 'Chứng minh bằng định nghĩa giới hạn; phân biệt ba loại tiệm cận theo bậc.',
  },
  s1: {
    title: 'Đường chi phí tiến sát đường thẳng',
    context: 'C(x) = (x² + 2x + 3)/(x + 1). Khi x rất lớn, chi phí gần với đường nào?',
    question: 'Để tìm tiệm cận xiên, bước đầu tiên nên làm gì?',
    options: ['Tính đạo hàm', 'Chia tử cho mẫu để tách phần đa thức và phần dư', 'Tính giới hạn tại x = −1'],
    correct: 1,
    why: 'Chia đa thức cho ta dạng f(x) = ax + b + r(x) với r(x) → 0, từ đó đọc được tiệm cận xiên.',
    discuss: ['`[PHÁT HIỆN]` Vì sao phần dư phải tiến về 0?', '`[SO SÁNH]` Hàm này có tiệm cận ngang không?'],
    cue: 'Nhắc lại phép chia đa thức bằng sơ đồ; viết f = thương + dư/mẫu.',
    lookFor: 'HS nêu được ý tưởng tách phần dư.',
  },
  s3: {
    title: 'Phương pháp tìm tiệm cận xiên',
    steps: [
      'Chia tử cho mẫu: $f(x) = ax + b + \\dfrac{R(x)}{Q(x)}$ với $\\deg R < \\deg Q$.',
      'Nếu $\\dfrac{R(x)}{Q(x)} \\to 0$ khi $x \\to \\pm\\infty$ thì $y = ax + b$ là tiệm cận xiên.',
      'Kiểm bằng định nghĩa: $\\lim\\limits_{x\\to\\infty} [f(x) - (ax+b)] = 0$.',
      'Phân biệt theo bậc: bậc tử = bậc mẫu → tiệm cận ngang; hơn đúng 1 bậc → xiên; hơn từ 2 bậc → không có tiệm cận xiên.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao hơn 2 bậc thì không có tiệm cận xiên?', '`[PHÁT HIỆN]` Hàm C(x) có tiệm cận đứng ở đâu?'],
    cue: 'Khung 4 bước; nhắc HS yếu ghi rõ "thương" và "dư".',
    close: 'Tiệm cận xiên = phần đa thức bậc nhất còn lại sau khi tách phần dư tiến về 0.',
  },
  s4: { bat: 'AI kết luận tiệm cận xiên của $C(x)$ là $y = x$ vì "bỏ phần $+1$ cho đơn giản".', chung: 'Phần đa thức sau khi chia là $x + 1$; bỏ $+1$ là sai. Kiểm: $C(x) - x = 1 + \\dfrac{2}{x+1} \\to 1 \\ne 0$.', sua: '$y = x + 1$; kiểm $C(x) - (x+1) = \\dfrac{2}{x+1} \\to 0$.', cue: 'Cho HS tính hiệu với $y = x$ để thấy tiến về 1 chứ không về 0.', lookFor: 'HS kiểm bằng giới hạn hiệu.' },
  s6: { hints: { M: 'chia đa thức rồi đọc thương bậc nhất.', S: 'kiểm bằng giới hạn hiệu f(x) − (ax+b).', C: 'phân biệt ba loại tiệm cận theo bậc và chứng minh bằng định nghĩa.' }, lookFor: 'HS M chia đúng; HS S kiểm đúng; HS C phân loại đúng.' },
  postCheck: {
    q: 'Tìm tiệm cận xiên của $f(x) = \\dfrac{x^2 + 1}{x}$.',
    a: '$f(x) = x + \\dfrac{1}{x}$ nên tiệm cận xiên là $y = x$ (vì $\\tfrac1x \\to 0$); tiệm cận đứng $x = 0$.',
    ds: [{ t: '"Bậc tử bằng bậc mẫu thì có tiệm cận xiên"', v: 'Sai — đó là tiệm cận ngang' }, { t: '"f(x) − (ax+b) → 0 là định nghĩa tiệm cận xiên"', v: 'Đúng' }, { t: '"Hàm (x²+1)/x có tiệm cận ngang"', v: 'Sai' }],
    cue: 'Chiếu 2 bài, kiểm bằng giới hạn hiệu.',
  },
  s8Close: 'Chia đa thức — phần dư → 0 — tiệm cận xiên là thương bậc nhất.',
  s9: {
    title: 'Đọc chi phí dài hạn',
    bullets: ['Chi phí trung bình mỗi sản phẩm tiến dần về đường y = x + 1 (triệu đồng cho x nghìn sản phẩm).', 'Ở x = 9: chi phí 10,2 so với đường 10 — chênh 0,2; ở x = 99: chênh 0,02.', 'Nhờ tiệm cận, nhà quản lý dự báo chi phí dài hạn mà không cần tính từng mức sản lượng.'],
    cue: 'Hỏi: "Nếu bỏ qua tiệm cận, dự báo chi phí ở x = 1000 sai bao nhiêu?" → chênh 2/1001 ≈ 0,002 triệu.',
  },
  exit: ['Nêu quy trình tìm tiệm cận xiên.', 'Nêu 1 bẫy (bỏ phần hằng số; nhầm với tiệm cận ngang).', 'Tự đánh giá M / S / C.', 'Tìm tiệm cận xiên của (x² + 2x + 3)/(x + 1).'],
  exitCue: 'Mở lại khung 4 bước ở S3.',
  after: '- HS làm bài tập SGK về tiệm cận xiên; chuẩn bị tiết luyện tập tiệm cận.',
  snapshot: {
    focus: 'Hình thành khái niệm và phương pháp tìm tiệm cận xiên trên trục chi phí sản xuất C(x) = (x² + 2x + 3)/(x + 1) = x + 1 + 2/(x+1) → tiệm cận xiên y = x + 1, tiệm cận đứng x = −1; phân biệt theo bậc tử/mẫu',
    formulas: ['f(x) = ax + b + \\dfrac{R(x)}{Q(x)}, \\ \\dfrac{R}{Q} \\to 0 \\Rightarrow y = ax + b \\ \\text{là tiệm cận xiên}', '\\lim_{x\\to\\infty} [f(x) - (ax+b)] = 0', '\\deg P = \\deg Q + 1 \\Rightarrow \\text{tiệm cận xiên}'],
    examples: [
      { question: 'Tìm tiệm cận xiên của C(x) = (x² + 2x + 3)/(x + 1).', answer: 'Chia: C(x) = x + 1 + 2/(x+1). Vì 2/(x+1) → 0 khi x → ∞ nên tiệm cận xiên là y = x + 1. Kiểm: C(x) − (x+1) = 2/(x+1) → 0 ✓. Tiệm cận đứng x = −1.' },
      { question: 'Hàm f(x) = (2x² + x + 1)/(x − 1) có tiệm cận xiên không? Tìm nếu có.', answer: 'Chia: f(x) = 2x + 3 + 4/(x−1). Có tiệm cận xiên y = 2x + 3 (bậc tử hơn bậc mẫu đúng 1), tiệm cận đứng x = 1.' },
    ],
    exercises: [
      { level: 'NB', question: 'Khi nào đồ thị hàm phân thức có tiệm cận xiên?', answer: 'Khi bậc của tử lớn hơn bậc của mẫu đúng 1 bậc (sau khi đã rút gọn).' },
      { level: 'NB', question: 'Nêu định nghĩa tiệm cận xiên y = ax + b.', answer: 'Đường y = ax + b là tiệm cận xiên nếu lim [f(x) − (ax + b)] = 0 khi x → +∞ (hoặc −∞).' },
      { level: 'TH', question: 'Tìm tiệm cận xiên của f(x) = (x² + 1)/x.', answer: 'f(x) = x + 1/x ⇒ tiệm cận xiên y = x; tiệm cận đứng x = 0.' },
      { level: 'TH', question: 'Tìm tiệm cận xiên của f(x) = (2x² + x + 1)/(x − 1).', answer: 'f(x) = 2x + 3 + 4/(x−1) ⇒ tiệm cận xiên y = 2x + 3.' },
      { level: 'VD', question: 'Hàm f(x) = (x³ + 1)/(x² + 1) có tiệm cận xiên không? Nếu có, tìm.', answer: 'Chia: x³ + 1 = x(x² + 1) − x + 1 ⇒ f(x) = x + (1 − x)/(x²+1). Phần dư → 0 nên tiệm cận xiên y = x.' },
      { level: 'VD', question: 'Giải thích vì sao hàm f(x) = (x³ + x)/(x) không có tiệm cận xiên mà chỉ là đường thẳng.', answer: 'Rút gọn f(x) = x² + 1 (với x ≠ 0) — đây là parabol, không phải phân thức có bậc tử hơn mẫu đúng 1. Không tồn tại đường thẳng mà hiệu tiến về 0.' },
    ],
    quick: [
      { question: 'Vì sao phần dư phải tiến về 0?', solution: 'Vì tiệm cận xiên đòi hỏi f(x) − (ax+b) → 0; nếu phần dư tiến về số khác 0 thì đường ax+b không phải tiệm cận.' },
      { question: 'Hàm (x² + 2x + 3)/(x + 1) có tiệm cận ngang không?', solution: 'Không, vì bậc tử lớn hơn bậc mẫu nên không có tiệm cận ngang (chỉ có xiên và đứng).' },
    ],
    mistakes: ['Bỏ phần hằng số của thương khi viết tiệm cận xiên.', 'Nhầm tiệm cận xiên với tiệm cận ngang khi bậc bằng nhau.', 'Không kiểm bằng giới hạn hiệu.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Định nghĩa', 'a. y = ax + b là tiệm cận xiên nếu lim [f(x) − (ax+b)] = 0.', '2. Phương pháp', 'a. Chia tử cho mẫu: f = thương + dư/mẫu.', 'b. Nếu dư/mẫu → 0 thì thương bậc nhất là tiệm cận xiên.', '3. Áp dụng', 'a. C(x) = x + 1 + 2/(x+1) ⇒ tiệm cận xiên y = x + 1.', 'b. Tiệm cận đứng x = −1.', 'c. Bậc tử hơn mẫu 1 bậc ⇒ xiên; bằng nhau ⇒ ngang.'],
  },
  aiError: {
    category: 'Lỗi đại số', wrongSolution: 'AI kết luận: "C(x) = (x² + 2x + 3)/(x+1) ≈ x nên tiệm cận xiên là y = x." (bỏ phần hằng số +1 của thương).',
    correction: 'Thương đầy đủ là x + 1; tiệm cận xiên là y = x + 1.',
    proof: 'Kiểm bằng định nghĩa: C(x) − x = 1 + 2/(x+1) → 1 ≠ 0, nên y = x không phải tiệm cận. Còn C(x) − (x+1) = 2/(x+1) → 0, nên y = x + 1 đúng.',
    whyAiError: 'Mô hình chỉ giữ số hạng bậc cao nhất của thương, bỏ hằng số — lỗi rút gọn quá mức khi chia đa thức.',
    teacherPrompt: 'Em tính C(x) − x và C(x) − (x+1) để kiểm, rồi sửa lại tiệm cận xiên của AI.',
    studentProduct: 'Thẻ Đ/S + hai giới hạn hiệu chứng minh y = x + 1.',
    boardPrompt: 'AI nói tiệm cận xiên là y = x. Tính C(x) − x.',
    libraryTitle: 'Lỗi AI bỏ hằng số khi tìm tiệm cận xiên',
  },
};

const L27 = {
  ...base,
  key: '12-5-27', period: 27, lessonType: 'practice',
  title: 'Luyện tập tiệm cận',
  opening: 'Hôm nay lớp mình tìm đủ ba loại tiệm cận của hàm phân thức: đứng, ngang, xiên.',
  focusQuestion: 'Làm thế nào quét nhanh cả ba loại tiệm cận mà không bỏ sót?',
  axis: `**Tình huống: Ba hàm chi phí của ba dây chuyền, cần xác định đủ tiệm cận để dự báo dài hạn.**

| Hàm | Tiệm cận đứng | Ngang | Xiên |
|---|---|---|---|
| $f_1 = \\dfrac{3x-1}{x+2}$ | $x = -2$ | $y = 3$ | không |
| $f_2 = \\dfrac{2x^2+3x-1}{x+1}$ | $x = -1$ | không | $y = 2x + 1$ |
| $f_3 = \\dfrac{x^2+1}{x}$ | $x = 0$ | không | $y = x$ |

- **Kiểm chứng tay:**
  - $f_1$: $\\lim\\limits_{x\\to\\infty} \\dfrac{3x-1}{x+2} = 3$; mẫu = 0 tại $x = -2$, tử $= -7 \\ne 0$.
  - $f_2$: chia $2x^2+3x-1 = (x+1)(2x+1) - 2$ ⇒ $f_2 = 2x+1 - \\dfrac{2}{x+1}$.
  - $f_3$: $f_3 = x + \\dfrac1x$.

**Bẫy của bài:** quên xét mẫu bằng 0; nhầm bậc bằng nhau với hơn 1 bậc; kết luận "không có tiệm cận ngang" thành "không có tiệm cận".`,
  goals: {
    must: 'Tìm tiệm cận đứng và ngang của hàm phân thức bậc nhất/bậc nhất.',
    should: 'Tìm đủ ba loại tiệm cận cho hàm bậc hai/bậc nhất và kiểm bằng giới hạn.',
    could: 'Lập quy trình quét nhanh theo bậc; phản biện kết luận thiếu loại tiệm cận.',
  },
  s1: {
    title: 'Quét ba dây chuyền',
    context: 'Ba hàm f₁, f₂, f₃ như bảng; cần xác định đủ tiệm cận.',
    question: 'Với $f_1 = \\dfrac{3x-1}{x+2}$, tiệm cận ngang là gì?',
    options: ['y = 3', 'y = 1', 'Không có'],
    correct: 0,
    why: 'Bậc tử bằng bậc mẫu nên tiệm cận ngang là tỉ số hệ số bậc cao nhất: 3/1 = 3.',
    discuss: ['`[PHÁT HIỆN]` Tiệm cận đứng của f₁?', '`[SO SÁNH]` Vì sao f₂ không có tiệm cận ngang?'],
    cue: 'Bảng 3 cột: đứng — ngang — xiên; HS điền dần theo từng hàm.',
    lookFor: 'HS xét bậc trước khi kết luận.',
  },
  s3: {
    title: 'Quy trình quét ba loại tiệm cận',
    steps: [
      'Tiệm cận đứng: giải mẫu = 0, kiểm tử tại đó khác 0 (sau khi rút gọn).',
      'So bậc: bằng nhau → tiệm cận ngang (tỉ số hệ số); tử hơn mẫu 1 bậc → tiệm cận xiên; hơn từ 2 bậc → không có tiệm cận ngang/xiên.',
      'Tìm tiệm cận xiên bằng chia đa thức và kiểm giới hạn hiệu.',
      'Kiểm tổng thể: vẽ nhanh đồ thị hoặc tính vài giá trị lớn để xác nhận.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao phải kiểm tử khác 0 tại nghiệm mẫu?', '`[PHÁT HIỆN]` f₃ có tiệm cận ngang không?'],
    cue: 'Khung 4 bước; nhắc "rút gọn trước khi xét tiệm cận đứng".',
    close: 'Bậc quyết định loại tiệm cận; mẫu quyết định tiệm cận đứng.',
  },
  s4: { bat: 'AI kết luận $f_2 = \\dfrac{2x^2+3x-1}{x+1}$ có tiệm cận ngang $y = 2$.', chung: 'Bậc tử (2) lớn hơn bậc mẫu (1) nên **không** có tiệm cận ngang; có tiệm cận xiên $y = 2x+1$.', sua: 'Xét lại bậc → tiệm cận xiên $y = 2x + 1$, tiệm cận đứng $x = -1$.', cue: 'Cho HS tính f₂(100) ≈ 201,98 để thấy không tiến về 2.', lookFor: 'HS phân biệt ngang với xiên bằng bậc.' },
  s6: { hints: { M: 'tìm tiệm cận đứng và ngang trước.', S: 'dùng phép chia để tìm xiên.', C: 'lập quy trình quét và kiểm bằng giá trị lớn.' }, lookFor: 'HS M đúng hai loại; HS S đúng xiên; HS C quy trình rõ.' },
  postCheck: {
    q: 'Tìm đủ tiệm cận của $f(x) = \\dfrac{x^2 + 3x + 3}{x + 1}$.',
    a: 'Chia: $f = x + 2 + \\dfrac{1}{x+1}$ ⇒ tiệm cận xiên $y = x + 2$; tiệm cận đứng $x = -1$; không có tiệm cận ngang.',
    ds: [{ t: '"f₂ có tiệm cận ngang y = 2"', v: 'Sai' }, { t: '"Bậc tử hơn mẫu 1 bậc ⇒ tiệm cận xiên"', v: 'Đúng' }, { t: '"Tiệm cận đứng cần mẫu = 0 và tử ≠ 0"', v: 'Đúng' }],
    cue: 'Chấm chéo bảng ba hàm.',
  },
  s8Close: 'Đứng theo mẫu — ngang/xiên theo bậc.',
  s9: {
    title: 'Dự báo chi phí dài hạn',
    bullets: ['Dây chuyền 1: chi phí tiến về 3 triệu/sản phẩm — ổn định.', 'Dây chuyền 2: chi phí tăng theo 2x + 1 — không có mức ổn định.', 'Dây chuyền 3: chi phí tiến về x — tăng tuyến tính, cần tối ưu quy mô.'],
    cue: 'Hỏi: "Dây chuyền nào phù hợp sản xuất lớn, dài hạn?"',
  },
  exit: ['Nêu quy trình quét ba loại tiệm cận.', 'Nêu 1 bẫy (bỏ tiệm cận đứng; nhầm ngang với xiên).', 'Tự đánh giá M / S / C.', 'Tìm đủ tiệm cận của (2x²+3x−1)/(x+1).'],
  exitCue: 'Mở lại bảng ba hàm ở mục II.',
  after: '- HS hoàn thành phiếu luyện tiệm cận; chuẩn bị tiết khảo sát hàm bậc ba.',
  snapshot: {
    focus: 'Luyện tập tìm đủ ba loại tiệm cận trên ba hàm chi phí: (3x−1)/(x+2) (đứng x = −2, ngang y = 3), (2x²+3x−1)/(x+1) (đứng x = −1, xiên y = 2x + 1), (x²+1)/x (đứng x = 0, xiên y = x); quy trình quét theo mẫu và bậc',
    formulas: ['\\text{Tiệm cận đứng: mẫu} = 0, \\text{ tử} \\ne 0', '\\deg P = \\deg Q \\Rightarrow y = \\dfrac{a_n}{b_m}', '\\deg P = \\deg Q + 1 \\Rightarrow \\text{chia đa thức để tìm xiên}'],
    examples: [
      { question: 'Tìm đủ tiệm cận của f(x) = (3x − 1)/(x + 2).', answer: 'Mẫu = 0 tại x = −2, tử = −7 ≠ 0 ⇒ tiệm cận đứng x = −2. Bậc tử bằng bậc mẫu ⇒ tiệm cận ngang y = 3/1 = 3. Không có tiệm cận xiên.' },
      { question: 'Tìm đủ tiệm cận của f(x) = (2x² + 3x − 1)/(x + 1).', answer: 'Chia: 2x² + 3x − 1 = (x+1)(2x+1) − 2 ⇒ f = 2x + 1 − 2/(x+1). Tiệm cận xiên y = 2x + 1; tiệm cận đứng x = −1; không có tiệm cận ngang (bậc tử hơn mẫu 1 bậc).' },
    ],
    exercises: [
      { level: 'NB', question: 'Tìm tiệm cận đứng và ngang của f(x) = (2x + 1)/(x − 3).', answer: 'Tiệm cận đứng x = 3; tiệm cận ngang y = 2.' },
      { level: 'NB', question: 'Khi nào hàm phân thức không có tiệm cận ngang?', answer: 'Khi bậc tử lớn hơn bậc mẫu (khi đó có thể có tiệm cận xiên nếu hơn đúng 1 bậc).' },
      { level: 'TH', question: 'Tìm tiệm cận xiên của f(x) = (x² + 2x + 1)/(x).', answer: 'f = x + 2 + 1/x ⇒ tiệm cận xiên y = x + 2; tiệm cận đứng x = 0.' },
      { level: 'TH', question: 'Tìm đủ tiệm cận của f(x) = (x² + 3x + 3)/(x + 1).', answer: 'f = x + 2 + 1/(x+1) ⇒ xiên y = x + 2; đứng x = −1; không ngang.' },
      { level: 'VD', question: 'Biện luận theo m số tiệm cận của f(x) = (mx + 1)/(x − 1).', answer: 'Với m ≠ 0: có tiệm cận đứng x = 1 và tiệm cận ngang y = m (2 tiệm cận). Với m = 0: f = 1/(x−1) chỉ có tiệm cận đứng x = 1 và ngang y = 0 — vẫn 2 tiệm cận nhưng khác dạng; nếu m = 0 thì y = 0 là tiệm cận ngang.' },
      { level: 'VD', question: 'Phản biện: "Hàm không có tiệm cận ngang thì không có tiệm cận nào".', answer: 'Sai. Ví dụ (x²+1)/x không có tiệm cận ngang nhưng có tiệm cận đứng x = 0 và tiệm cận xiên y = x. Ba loại tiệm cận độc lập nhau.' },
    ],
    quick: [
      { question: 'Vì sao phải rút gọn trước khi xét tiệm cận đứng?', solution: 'Vì nhân tử chung có thể triệt tiêu, khi đó mẫu bằng 0 nhưng không tạo tiệm cận đứng (đó là điểm khuyết).' },
      { question: 'Tiệm cận ngang của (3x−1)/(x+2) là bao nhiêu?', solution: 'y = 3, vì bậc bằng nhau và tỉ số hệ số bậc cao nhất là 3/1.' },
    ],
    mistakes: ['Bỏ qua tiệm cận đứng khi mẫu bằng 0.', 'Nhầm tiệm cận ngang với xiên.', 'Không rút gọn trước khi xét tiệm cận.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Ba loại tiệm cận', 'a. Đứng: mẫu = 0, tử ≠ 0.', 'b. Ngang: bậc tử = bậc mẫu.', 'c. Xiên: bậc tử = bậc mẫu + 1.', '2. Ba hàm luyện tập', 'a. (3x−1)/(x+2): x = −2; y = 3.', 'b. (2x²+3x−1)/(x+1): x = −1; y = 2x + 1.', 'c. (x²+1)/x: x = 0; y = x.'],
  },
  aiError: {
    category: 'Lỗi khái niệm', wrongSolution: 'AI kết luận: "f(x) = (2x² + 3x − 1)/(x + 1) có tiệm cận ngang y = 2 vì hệ số bậc cao nhất của tử là 2 và của mẫu là 1."',
    correction: 'Bậc tử (2) lớn hơn bậc mẫu (1) nên không có tiệm cận ngang. Hàm có tiệm cận xiên y = 2x + 1 (và tiệm cận đứng x = −1).',
    proof: 'Tính f(100) = (20000 + 300 − 1)/101 ≈ 201,0 — không tiến về 2. Chia đa thức: f = 2x + 1 − 2/(x+1), nên đường tiệm cận là y = 2x + 1.',
    whyAiError: 'Mô hình áp công thức tỉ số hệ số bậc cao nhất mà không kiểm điều kiện bậc bằng nhau.',
    teacherPrompt: 'Em so bậc tử và mẫu, tính f(100) rồi sửa lại kết luận tiệm cận của AI.',
    studentProduct: 'Thẻ Đ/S + phép chia đa thức và giá trị f(100) bác bỏ tiệm cận ngang.',
    boardPrompt: 'AI nói tiệm cận ngang y = 2. Tính f(100).',
    libraryTitle: 'Lỗi AI áp công thức tiệm cận ngang khi bậc khác nhau',
  },
};

const L28 = {
  ...base,
  key: '12-5-28', period: 28, lessonType: 'formation',
  title: 'Sơ đồ khảo sát và vẽ đồ thị hàm số bậc ba',
  opening: 'Xưởng cần mô hình hóa lợi nhuận theo sản lượng — hàm bậc ba cho ta một đường cong có hai điểm gấp khúc. Hôm nay lớp mình học quy trình 6 bước.',
  focusQuestion: 'Sáu bước khảo sát giúp ta biết được những gì mà chỉ nhìn công thức không thấy?',
  axis: `**Tình huống: Lợi nhuận (triệu đồng) theo sản lượng $x$ (nghìn sản phẩm): $y = x^3 - 3x + 1$.**

- **Tập xác định:** $D = \\mathbb{R}$.
- **Đạo hàm:** $y' = 3x^2 - 3 = 3(x-1)(x+1)$; $y' = 0 \\Leftrightarrow x = \\pm1$.
  - $y(-1) = -1 + 3 + 1 = 3$ → **cực đại** $(-1; 3)$.
  - $y(1) = 1 - 3 + 1 = -1$ → **cực tiểu** $(1; -1)$.
- **Đạo hàm bậc hai:** $y'' = 6x$; $y'' = 0 \\Leftrightarrow x = 0$, $y(0) = 1$ → **điểm uốn** $(0; 1)$.
- **Giới hạn:** $\\lim\\limits_{x\\to+\\infty} y = +\\infty$; $\\lim\\limits_{x\\to-\\infty} y = -\\infty$ → không có tiệm cận.
- **Giao trục tung:** $(0; 1)$. **Giao trục hoành:** không có nghiệm nguyên đẹp; ước lượng ba nghiệm quanh $-2$, $0{,}3$, $1{,}5$ (dùng bảng giá trị).

**Bẫy của bài:** nhầm dấu cực trị (hệ số $a > 0$: cực đại bên trái, cực tiểu bên phải); quên điểm uốn; vẽ đồ thị không qua các điểm đã tìm.`,
  goals: {
    must: 'Thực hiện đúng 6 bước khảo sát và xác định cực trị của hàm bậc ba.',
    should: 'Lập bảng biến thiên, tìm điểm uốn và vẽ đồ thị qua các điểm đặc biệt.',
    could: 'Dùng đồ thị biện luận số nghiệm phương trình $y = m$; phản biện đồ thị sai dấu.',
  },
  s1: {
    title: 'Đường cong lợi nhuận',
    context: 'y = x³ − 3x + 1. Cần biết hình dạng để chọn mức sản lượng.',
    question: 'Đạo hàm y′ = 3x² − 3 triệt tiêu tại đâu?',
    options: ['x = 0', 'x = ±1', 'x = ±3'],
    correct: 1,
    why: '3x² − 3 = 0 ⇔ x² = 1 ⇔ x = ±1.',
    discuss: ['`[PHÁT HIỆN]` Tại x = −1 và x = 1, đâu là cực đại?', '`[SO SÁNH]` Hàm bậc ba luôn có bao nhiêu điểm uốn?'],
    cue: 'Cho HS bấm máy tính vài giá trị để thấy dấu của y′ đổi.',
    lookFor: 'HS xác định đúng dấu y′ hai bên nghiệm.',
  },
  s3: {
    title: 'Sáu bước khảo sát',
    steps: [
      'Tập xác định.',
      'Tính $y\'$, tìm nghiệm và xét dấu → cực trị.',
      'Tính giới hạn ở hai đầu (và tiệm cận nếu có).',
      'Lập bảng biến thiên.',
      'Tính $y\'\'$, tìm điểm uốn; tìm giao với các trục.',
      'Vẽ đồ thị qua các điểm đặc biệt (cực trị, điểm uốn, giao trục).',
    ],
    ask: ['`[SUY LUẬN]` Vì sao cần điểm uốn khi vẽ?', '`[PHÁT HIỆN]` Đồ thị đi qua những điểm nào?'],
    cue: 'Khung 6 bước đánh số; HS đối chiếu từng bước với bài mẫu.',
    close: 'Sáu bước cho ta "bản đồ" đầy đủ: chiều biến thiên, cực trị, độ cong, vị trí.',
  },
  s4: { bat: 'AI kết luận $(-1;3)$ là cực tiểu và $(1;-1)$ là cực đại.', chung: 'Với $a = 1 > 0$, nhánh trái đi lên rồi xuống nên $(-1;3)$ là cực **đại**; $(1;-1)$ là cực **tiểu**.', sua: 'Cực đại $(-1;3)$, cực tiểu $(1;-1)$.', cue: 'Cho HS xét dấu y′: dương ngoài khoảng (−1;1), âm trong — kết luận.', lookFor: 'HS dùng bảng dấu thay vì ghi nhớ.' },
  s6: { hints: { M: 'làm đủ 6 bước, ghi rõ dấu y′.', S: 'thêm điểm uốn và giao trục khi vẽ.', C: 'biện luận số nghiệm theo m từ đồ thị.' }, lookFor: 'HS M làm đúng thứ tự; HS S vẽ đúng; HS C biện luận được.' },
  postCheck: {
    q: 'Khảo sát nhanh $y = -x^3 + 3x^2 - 2$: tìm cực trị.',
    a: '$y\' = -3x^2 + 6x = -3x(x-2)$; $y\' = 0$ tại $x = 0$ ($y = -2$, cực tiểu) và $x = 2$ ($y = 2$, cực đại).',
    ds: [{ t: '"Hàm bậc ba luôn có 2 cực trị"', v: 'Sai — có thể có 1 hoặc 0' }, { t: '"y″ = 0 cho điểm uốn"', v: 'Đúng (nếu y″ đổi dấu)' }, { t: '"a > 0 thì cực đại bên trái"', v: 'Đúng với hàm bậc ba có 2 cực trị' }],
    cue: 'Chiếu 2 bảng biến thiên, cùng sửa dấu.',
  },
  s8Close: 'Sáu bước: xác định — đạo hàm — giới hạn — bảng — uốn/giao — vẽ.',
  s9: {
    title: 'Chọn mức sản lượng theo đồ thị',
    bullets: ['Cực đại tại x = −1 không có nghĩa thực tế (sản lượng âm) — chỉ là đặc điểm toán học.', 'Trong miền x ≥ 0, lợi nhuận giảm từ x = 0 đến x = 1 rồi tăng lại.', 'Đồ thị cho biết vùng sản lượng có lợi nhuận dương: khoảng giữa hai nghiệm dương.'],
    cue: 'Nhấn: đồ thị giúp đọc nhanh khoảng có lợi, nhưng phải lọc theo miền thực tế.',
  },
  exit: ['Nêu 6 bước khảo sát hàm bậc ba.', 'Nêu 1 bẫy (nhầm dấu cực trị; bỏ điểm uốn).', 'Tự đánh giá M / S / C.', 'Cho y = x³ − 3x + 1: cực đại, cực tiểu ở đâu?'],
  exitCue: 'Mở lại khung 6 bước ở S3.',
  after: '- HS làm bài tập SGK về khảo sát hàm bậc ba; chuẩn bị tiết luyện tập.',
  snapshot: {
    focus: 'Hình thành quy trình 6 bước khảo sát và vẽ đồ thị hàm bậc ba trên trục lợi nhuận y = x³ − 3x + 1: cực đại (−1; 3), cực tiểu (1; −1), điểm uốn (0; 1), không tiệm cận; đọc hình dạng để chọn sản lượng',
    formulas: ['y = x^3 - 3x + 1', 'y\' = 3x^2 - 3 = 3(x-1)(x+1)', 'y\'\' = 6x'],
    examples: [
      { question: 'Khảo sát hàm y = x³ − 3x + 1: tìm cực trị và điểm uốn.', answer: 'y′ = 3x² − 3 = 0 tại x = ±1. y′ > 0 ngoài (−1;1), < 0 trong (−1;1) ⇒ cực đại tại (−1; 3), cực tiểu tại (1; −1). y″ = 6x = 0 tại x = 0, y = 1 ⇒ điểm uốn (0; 1).' },
      { question: 'Với đồ thị trên, phương trình x³ − 3x + 1 = m có ba nghiệm phân biệt khi nào?', answer: 'Đường ngang y = m cắt đồ thị tại ba điểm khi m nằm giữa giá trị cực tiểu và cực đại: −1 < m < 3.' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu 6 bước khảo sát hàm số bậc ba.', answer: 'Tập xác định; đạo hàm và cực trị; giới hạn; bảng biến thiên; điểm uốn và giao trục; vẽ đồ thị.' },
      { level: 'NB', question: 'Cho y = x³ − 3x + 1, tính y′ và nghiệm của y′ = 0.', answer: 'y′ = 3x² − 3; y′ = 0 ⇔ x = ±1.' },
      { level: 'TH', question: 'Tìm cực trị của y = x³ − 3x + 1.', answer: 'Cực đại (−1; 3); cực tiểu (1; −1).' },
      { level: 'TH', question: 'Tìm điểm uốn của y = x³ − 3x + 1.', answer: 'y″ = 6x = 0 ⇒ x = 0, y = 1; điểm uốn (0; 1).' },
      { level: 'VD', question: 'Khảo sát cực trị của y = −x³ + 3x² − 2.', answer: 'y′ = −3x² + 6x = −3x(x−2); cực tiểu tại x = 0 (y = −2), cực đại tại x = 2 (y = 2).' },
      { level: 'VD', question: 'Biện luận theo m số nghiệm của x³ − 3x + 1 = m.', answer: 'Dựa vào cực trị: m < −1 hoặc m > 3 → 1 nghiệm; m = −1 hoặc m = 3 → 2 nghiệm; −1 < m < 3 → 3 nghiệm.' },
    ],
    quick: [
      { question: 'Vì sao cần điểm uốn khi vẽ đồ thị bậc ba?', solution: 'Vì điểm uốn cho biết chỗ đồ thị đổi chiều cong (lồi sang lõm) — giúp vẽ đúng hình dạng chữ S.' },
      { question: 'Hàm bậc ba luôn có hai cực trị?', solution: 'Không. Nếu y′ vô nghiệm hoặc có nghiệm kép thì hàm không có cực trị (ví dụ y = x³).' },
    ],
    mistakes: ['Nhầm dấu cực đại/cực tiểu.', 'Bỏ bước điểm uốn.', 'Vẽ đồ thị không qua các điểm đã tìm.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Sáu bước khảo sát', 'a. Tập xác định.', 'b. y′ và cực trị.', 'c. Giới hạn.', 'd. Bảng biến thiên.', 'e. y″ (điểm uốn) và giao trục.', 'f. Vẽ đồ thị.', '2. Áp dụng y = x³ − 3x + 1', 'a. Cực đại (−1; 3); cực tiểu (1; −1).', 'b. Điểm uốn (0; 1).', 'c. Ba nghiệm khi −1 < m < 3.'],
  },
  aiError: {
    category: 'Lỗi khái niệm', wrongSolution: 'AI kết luận: "y = x³ − 3x + 1 có cực tiểu tại (−1; 3) và cực đại tại (1; −1) vì y′ đổi dấu tại hai điểm này."',
    correction: 'Với hệ số a = 1 > 0: y′ > 0 trên (−∞;−1), < 0 trên (−1;1) nên (−1;3) là cực ĐẠI; (1;−1) là cực TIỂU.',
    proof: 'Lập bảng dấu y′ = 3(x−1)(x+1): dương khi x < −1, âm khi −1 < x < 1, dương khi x > 1. Đổi từ + sang − tại x = −1 ⇒ cực đại; đổi từ − sang + tại x = 1 ⇒ cực tiểu.',
    whyAiError: 'Mô hình gán nhãn cực trị theo vị trí trái/phải thay vì xét chiều đổi dấu của đạo hàm.',
    teacherPrompt: 'Em lập bảng dấu y′ rồi sửa lại nhãn cực đại/cực tiểu của AI.',
    studentProduct: 'Thẻ Đ/S + bảng dấu y′ và kết luận cực đại (−1;3), cực tiểu (1;−1).',
    boardPrompt: 'AI đổi nhãn cực trị. Bảng dấu y′ nói gì?',
    libraryTitle: 'Lỗi AI đảo nhãn cực đại và cực tiểu',
  },
};

const L29 = {
  ...base,
  key: '12-5-29', period: 29, lessonType: 'practice',
  title: 'Luyện tập khảo sát hàm số bậc ba',
  opening: 'Hôm nay lớp mình luyện khảo sát, vẽ đồ thị và biện luận số nghiệm theo tham số.',
  focusQuestion: 'Làm thế nào đọc số nghiệm của phương trình từ đồ thị mà không giải phương trình?',
  axis: `**Tình huống: Ba bài luyện trên mô hình lợi nhuận bậc ba, mỗi bài một kỹ năng.**

| Bài | Hàm | Trọng tâm |
|---|---|---|
| 1 | $y = x^3 - 3x + 1$ | khảo sát + vẽ |
| 2 | $y = -x^3 + 3x^2 - 2$ | cực trị khi $a < 0$ |
| 3 | $y = x^3 - 3x + 1 = m$ | biện luận số nghiệm |

- **Kiểm chứng tay:**
  - Bài 2: $y\' = -3x^2 + 6x = -3x(x-2)$; $y(0) = -2$ (cực tiểu), $y(2) = -8 + 12 - 2 = 2$ (cực đại).
  - Bài 3: đường $y = m$ cắt đồ thị 3 lần khi $-1 < m < 3$.

**Bẫy của bài:** nhầm cực trị khi $a < 0$; biện luận quên giá trị biên $m = -1, 3$ cho 2 nghiệm.`,
  goals: {
    must: 'Khảo sát và tìm cực trị của hàm bậc ba với cả $a > 0$ và $a < 0$.',
    should: 'Vẽ đồ thị đúng qua các điểm đặc biệt và biện luận số nghiệm theo $m$.',
    could: 'Xử lý bài toán tham số phức tạp hơn (tiếp xúc, điều kiện có đúng 2 nghiệm).',
  },
  s1: {
    title: 'Ba bài, ba kỹ năng',
    context: 'Ba bài như bảng; mục tiêu chung: từ công thức đến hình và ngược lại.',
    question: 'Với $y = -x^3 + 3x^2 - 2$, $y\' = 0$ tại đâu?',
    options: ['x = 0 và x = 2', 'x = 0 và x = −2', 'x = 2 và x = −2'],
    correct: 0,
    why: 'y′ = −3x² + 6x = −3x(x − 2) = 0 ⇔ x = 0 hoặc x = 2.',
    discuss: ['`[PHÁT HIỆN]` Đâu là cực tiểu?', '`[SO SÁNH]` Vì sao biên m = −1, 3 cho 2 nghiệm?'],
    cue: 'Nhắc quy tắc: a < 0 thì nhánh phải đi xuống — cực đại bên phải.',
    lookFor: 'HS xác định dấu y′ đúng khi a < 0.',
  },
  s3: {
    title: 'Chữa mẫu và kỹ thuật biện luận',
    steps: [
      'Bài 1: khảo sát đủ 6 bước, vẽ qua $(-1;3)$, $(1;-1)$, $(0;1)$.',
      'Bài 2: $y\' = -3x(x-2)$; cực tiểu $(0;-2)$, cực đại $(2;2)$.',
      'Bài 3: vẽ đường $y = m$; đếm giao điểm theo vị trí so với hai giá trị cực trị.',
      'Kết luận biện luận: $m < -1$ hoặc $m > 3$: 1 nghiệm; $m = -1$ hoặc $m = 3$: 2 nghiệm; $-1 < m < 3$: 3 nghiệm.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao tại m = −1 chỉ có 2 nghiệm?', '`[PHÁT HIỆN]` Nếu m = 1 thì có mấy nghiệm?'],
    cue: 'Khung biện luận: vẽ đường ngang → đếm giao → xét biên.',
    close: 'Số nghiệm = số giao điểm; biên cực trị là chỗ "chạm" nên số nghiệm giảm một.',
  },
  s4: { bat: 'AI biện luận: "m < 3 thì có 3 nghiệm" (bỏ trường hợp m ≤ −1).', chung: 'Với $m = -2$ đường ngang nằm dưới cực tiểu nên chỉ 1 nghiệm; phải tách khoảng.', sua: '1 nghiệm khi $m < -1$ hoặc $m > 3$; 2 nghiệm khi $m \\in \\{-1; 3\\}$; 3 nghiệm khi $-1 < m < 3$.', cue: 'Cho HS thử m = −2 và m = 1 bằng đồ thị.', lookFor: 'HS đếm giao điểm thay vì đoán.' },
  s6: { hints: { M: 'khảo sát theo 6 bước, chú ý dấu a.', S: 'vẽ đồ thị rồi biện luận bằng đường ngang.', C: 'xét thêm điều kiện có đúng 2 nghiệm (tiếp xúc).' }, lookFor: 'HS M đúng cực trị; HS S biện luận đúng; HS C xử lý được tiếp xúc.' },
  postCheck: {
    q: 'Biện luận số nghiệm của $-x^3 + 3x^2 - 2 = m$.',
    a: 'Cực tiểu $y = -2$ tại $x = 0$, cực đại $y = 2$ tại $x = 2$. Vậy: $m < -2$ hoặc $m > 2$: 1 nghiệm; $m = -2$ hoặc $m = 2$: 2 nghiệm; $-2 < m < 2$: 3 nghiệm.',
    ds: [{ t: '"a < 0 thì cực đại bên trái"', v: 'Sai' }, { t: '"Số nghiệm = số giao với đường y = m"', v: 'Đúng' }, { t: '"Tại m bằng giá trị cực trị luôn có 2 nghiệm"', v: 'Đúng (với hàm bậc ba có 2 cực trị)' }],
    cue: 'Chấm chéo phần biện luận.',
  },
  s8Close: 'Vẽ đúng — đếm giao — tách khoảng theo cực trị.',
  s9: {
    title: 'Ra quyết định từ đồ thị',
    bullets: ['Nếu mục tiêu lợi nhuận m = 2: có 3 mức sản lượng cho cùng lợi nhuận (nghiệm của phương trình).', 'Nếu cần lợi nhuận m = 4: chỉ một mức sản lượng (ngoài khoảng cực trị).', 'Đồ thị giúp chọn mức sản lượng thay vì giải phương trình bậc ba.'],
    cue: 'Hỏi: "Vì sao cùng một lợi nhuận lại có nhiều mức sản lượng?"',
  },
  exit: ['Nêu cách biện luận số nghiệm từ đồ thị.', 'Nêu 1 bẫy (bỏ khoảng m < −1; quên biên).', 'Tự đánh giá M / S / C.', 'Biện luận số nghiệm của x³ − 3x + 1 = m.'],
  exitCue: 'Mở lại bảng ba bài ở mục II.',
  after: '- HS hoàn thành phiếu luyện khảo sát; chuẩn bị tiết hệ trục tọa độ Oxyz.',
  snapshot: {
    focus: 'Luyện khảo sát hàm bậc ba và biện luận số nghiệm: y = x³ − 3x + 1 (cực đại (−1;3), cực tiểu (1;−1)), y = −x³ + 3x² − 2 (cực tiểu (0;−2), cực đại (2;2)), biện luận x³ − 3x + 1 = m (3 nghiệm khi −1 < m < 3)',
    formulas: ['y = x^3 - 3x + 1', 'y = -x^3 + 3x^2 - 2', '\\text{Số nghiệm} = \\text{số giao điểm với } y = m'],
    examples: [
      { question: 'Tìm cực trị của y = −x³ + 3x² − 2.', answer: 'y′ = −3x² + 6x = −3x(x − 2); y′ = 0 tại x = 0 và x = 2. y(0) = −2 (cực tiểu vì y′ đổi − sang +), y(2) = 2 (cực đại).' },
      { question: 'Biện luận theo m số nghiệm của x³ − 3x + 1 = m.', answer: 'Cực đại 3 tại x = −1, cực tiểu −1 tại x = 1. Suy ra: m < −1 hoặc m > 3 → 1 nghiệm; m = −1 hoặc m = 3 → 2 nghiệm; −1 < m < 3 → 3 nghiệm.' },
    ],
    exercises: [
      { level: 'NB', question: 'Tìm nghiệm của y′ = 0 với y = x³ − 3x + 1.', answer: 'y′ = 3x² − 3 = 0 ⇔ x = ±1.' },
      { level: 'NB', question: 'Tìm nghiệm của y′ = 0 với y = −x³ + 3x² − 2.', answer: 'y′ = −3x² + 6x = −3x(x−2) = 0 ⇔ x = 0 hoặc x = 2.' },
      { level: 'TH', question: 'Tìm cực trị của y = −x³ + 3x² − 2.', answer: 'Cực tiểu (0; −2); cực đại (2; 2).' },
      { level: 'TH', question: 'Với y = x³ − 3x + 1, tìm m để phương trình y = m có 3 nghiệm.', answer: '−1 < m < 3.' },
      { level: 'VD', question: 'Tìm m để x³ − 3x + 1 = m có đúng 2 nghiệm.', answer: 'm = −1 hoặc m = 3 (đường ngang tiếp xúc đồ thị tại một cực trị).' },
      { level: 'VD', question: 'Phản biện: "Hàm bậc ba luôn có 3 nghiệm".', answer: 'Sai. Ví dụ x³ − 3x + 1 = 4 (m = 4 > 3) chỉ có 1 nghiệm; và x³ = 0 chỉ có 1 nghiệm bội ba. Số nghiệm phụ thuộc vị trí đường y = m so với cực trị.' },
    ],
    quick: [
      { question: 'Vì sao m = 3 cho đúng 2 nghiệm?', solution: 'Vì đường y = 3 tiếp xúc đồ thị tại điểm cực đại (−1; 3), tạo một nghiệm kép cộng một nghiệm đơn.' },
      { question: 'Khi a < 0, cực đại nằm bên nào?', solution: 'Bên phải (nếu có hai cực trị), vì nhánh phải đi xuống nên đổi từ tăng sang giảm tại điểm đó.' },
    ],
    mistakes: ['Nhầm cực trị khi a < 0.', 'Biện luận thiếu khoảng bên trái cực tiểu.', 'Quên giá trị biên cho 2 nghiệm.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Hai hàm luyện tập', 'a. x³ − 3x + 1: cực đại (−1;3), cực tiểu (1;−1).', 'b. −x³ + 3x² − 2: cực tiểu (0;−2), cực đại (2;2).', '2. Biện luận số nghiệm', 'a. 1 nghiệm: m < −1 hoặc m > 3.', 'b. 2 nghiệm: m = −1 hoặc m = 3.', 'c. 3 nghiệm: −1 < m < 3.'],
  },
  aiError: {
    category: 'Lỗi logic', wrongSolution: 'AI biện luận: "Phương trình x³ − 3x + 1 = m có 3 nghiệm khi m < 3, vì cực đại bằng 3 nên m dưới 3 là cắt ba lần."',
    correction: 'Phải chặn cả hai phía: 3 nghiệm chỉ khi −1 < m < 3 (giữa cực tiểu và cực đại). Với m < −1 đường ngang nằm dưới cực tiểu nên chỉ 1 nghiệm.',
    proof: 'Thử m = −2: phương trình x³ − 3x + 3 = 0. Hàm có cực tiểu −1 > −2 nên đồ thị luôn nằm trên đường y = −2 tại mọi cực trị, chỉ cắt một lần ở nhánh trái. Kiểm bằng bảng giá trị: y(−2) = −8 + 6 + 1 = −1 > −2, nghĩa là đồ thị đã vượt lên trên.',
    whyAiError: 'Mô hình chỉ dùng một cực trị (cực đại) làm ngưỡng, bỏ qua cực tiểu.',
    teacherPrompt: 'Em thử m = −2 và đếm số giao điểm để sửa lại miền biện luận của AI.',
    studentProduct: 'Thẻ Đ/S + thử m = −2 (1 nghiệm) và kết luận miền đúng −1 < m < 3.',
    boardPrompt: 'AI nói m < 3 có 3 nghiệm. Thử m = −2.',
    libraryTitle: 'Lỗi AI biện luận chỉ dùng một cực trị',
  },
};

export default [L26, L27, L28, L29];

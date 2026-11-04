const base = {
  grade: 11, week: 6, date: '2026-11-04',
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
  key: '11-6-38', period: 38, lessonType: 'formation',
  title: 'Dãy số',
  opening: 'Hội trường xếp ghế theo hàng: hàng sau hơn hàng trước 2 ghế — hôm nay lớp mình mô tả quy luật đó bằng dãy số.',
  focusQuestion: 'Có bao nhiêu cách mô tả một quy luật lặp lại bằng toán học?',
  axis: `**Tình huống: Hội trường xếp ghế theo hàng — hàng 1 có 7 ghế, mỗi hàng sau thêm 2 ghế.**

- **Cách 1 — công thức tổng quát:** $u_n = 2n + 5$ (ghế của hàng $n$).
  - $u_1 = 7$; $u_2 = 9$; $u_3 = 11$; $u_5 = 15$; $u_{10} = 25$.
- **Cách 2 — công thức truy hồi:** $u_1 = 7$; $u_{n+1} = u_n + 2$.
- **Cách 3 — liệt kê:** $7, 9, 11, 13, \\ldots$
- **Kiểm chứng tay:** $u_5 = 2\\cdot5 + 5 = 15$ ✓; $u_{10} = 25$ ✓; tổng 10 hàng $= \\dfrac{(7+25)\\cdot10}{2} = 160$ ghế.
- **Dãy khác:** số người đăng ký giảm dần $v_n = \\dfrac{100}{n}$ → $100; 50; 33{,}3; 25; \\ldots$

**Bẫy của bài:** nhầm "số hạng thứ $n$" với "giá trị $n$"; quên rằng dãy là hàm số xác định trên $\\mathbb{N}^*$.`,
  goals: {
    must: 'Nhận biết dãy số, viết số hạng tổng quát và tính số hạng thứ $k$.',
    should: 'Chuyển đổi giữa ba cách cho dãy (công thức, truy hồi, liệt kê) và tính tổng đơn giản.',
    could: 'Mô hình hóa một quy luật thực tế thành dãy; phản biện cách cho dãy thiếu xác định.',
  },
  s1: {
    title: 'Quy luật xếp ghế',
    context: 'Hàng 1 có 7 ghế, mỗi hàng sau thêm 2 ghế.',
    question: 'Số ghế ở hàng thứ 5 là bao nhiêu?',
    options: ['13', '15', '17'],
    correct: 1,
    why: 'u_n = 2n + 5 ⇒ u5 = 15. Có thể kiểm bằng liệt kê: 7, 9, 11, 13, 15.',
    discuss: ['`[PHÁT HIỆN]` Viết công thức truy hồi cho dãy này?', '`[SO SÁNH]` Cách công thức và cách truy hồi khác nhau ở đâu?'],
    cue: 'Cho HS đếm ghế bằng tay 5 hàng trước, rồi so với công thức.',
    lookFor: 'HS phân biệt số hạng thứ n với giá trị n.',
  },
  s3: {
    title: 'Ba cách cho một dãy số',
    steps: [
      'Công thức số hạng tổng quát: $u_n = 2n + 5$ — tính trực tiếp số hạng bất kỳ.',
      'Công thức truy hồi: $u_1 = 7$, $u_{n+1} = u_n + 2$ — tính lần lượt từ số hạng trước.',
      'Liệt kê: chỉ dùng được khi dãy hữu hạn hoặc có quy luật rõ.',
      'Dãy số là hàm số trên $\\mathbb{N}^*$: $u: \\mathbb{N}^* \\to \\mathbb{R}$, $n \\mapsto u_n$.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao dãy số được coi là hàm số?', '`[PHÁT HIỆN]` Với $u_1 = 2$, $u_{n+1} = 3u_n - 1$, tính $u_3$?'],
    cue: 'Bảng 3 cột: công thức — truy hồi — liệt kê, cùng một dãy.',
    close: 'Một quy luật, ba cách mô tả; chọn cách nào tùy câu hỏi cần trả lời.',
  },
  s4: { bat: 'AI tính $u_5$ của $u_n = 2n + 5$ bằng cách thay $n = 5$ vào $u_n$ rồi lấy $u_5 = 2\\cdot10 + 5 = 25$.', chung: 'Nhầm: $n = 5$ nên $u_5 = 2\\cdot5 + 5 = 15$.', sua: '$u_5 = 15$; $u_{10} = 25$.', cue: 'Cho HS viết rõ "n = 5 thay vào biểu thức" trước khi tính.', lookFor: 'HS thay đúng vị trí.' },
  s6: { hints: { M: 'thay n vào công thức, tính từng bước.', S: 'chuyển đổi giữa công thức và truy hồi.', C: 'mô hình hóa quy luật thực tế thành dãy và tính tổng.' }, lookFor: 'HS M tính đúng; HS S chuyển đổi được; HS C mô hình đúng.' },
  postCheck: {
    q: 'Cho $u_1 = 2$, $u_{n+1} = 3u_n - 1$. Tính $u_2, u_3, u_4$.',
    a: '$u_2 = 3\\cdot2 - 1 = 5$; $u_3 = 3\\cdot5 - 1 = 14$; $u_4 = 3\\cdot14 - 1 = 41$.',
    ds: [{ t: '"u_n = 2n + 5 thì u_5 = 15"', v: 'Đúng' }, { t: '"Dãy số là hàm số trên ℕ*"', v: 'Đúng' }, { t: '"Công thức truy hồi cho phép tính trực tiếp u_100"', v: 'Sai — phải tính lần lượt' }],
    cue: 'Chiếu 2 bài, kiểm từng bước truy hồi.',
  },
  s8Close: 'Công thức — truy hồi — liệt kê; thay đúng vị trí n.',
  s9: {
    title: 'Tính tổng số ghế hội trường',
    bullets: ['10 hàng: tổng = (7 + 25)·10/2 = 160 ghế.', '20 hàng: u20 = 45, tổng = (7 + 45)·20/2 = 520 ghế.', 'Nếu mỗi hàng thêm 3 ghế: u_n = 3n + 4 → u20 = 64, tổng = (7 + 64)·20/2 = 710 ghế.'],
    cue: 'Hỏi: "Nếu hội trường cần 600 chỗ thì cần bao nhiêu hàng?" → giải bất phương trình với tổng.',
  },
  exit: ['Nêu ba cách cho một dãy số.', 'Nêu 1 bẫy (thay sai vị trí n; nhầm truy hồi với công thức).', 'Tự đánh giá M / S / C.', 'Với u_n = 2n + 5, tính u_5 và u_10.'],
  exitCue: 'Mở lại ba cách cho dãy ở S3.',
  after: '- HS làm bài tập SGK về dãy số; chuẩn bị tiết dãy số tăng, giảm, bị chặn.',
  snapshot: {
    focus: 'Hình thành khái niệm dãy số và ba cách cho dãy trên trục xếp ghế hội trường (u_n = 2n + 5: u1 = 7, u5 = 15, u10 = 25; truy hồi u1 = 7, u_{n+1} = u_n + 2); dãy là hàm số trên ℕ*',
    formulas: ['u_n = 2n + 5', 'u_1 = 7, \\ u_{n+1} = u_n + 2', 'u: \\mathbb{N}^* \\to \\mathbb{R}, \\ n \\mapsto u_n'],
    examples: [
      { question: 'Hội trường có hàng 1 là 7 ghế, mỗi hàng sau thêm 2 ghế. Viết công thức số hạng tổng quát và công thức truy hồi; tính u5, u10.', answer: 'Công thức: u_n = 2n + 5. Truy hồi: u1 = 7, u_{n+1} = u_n + 2. u5 = 2·5 + 5 = 15; u10 = 25.' },
      { question: 'Tính tổng số ghế của 10 hàng đầu tiên.', answer: 'u1 = 7, u10 = 25; tổng = (7 + 25)·10/2 = 160 ghế.' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu định nghĩa dãy số và tập xác định của nó.', answer: 'Dãy số là hàm số xác định trên ℕ*: u: ℕ* → ℝ, n ↦ u_n.' },
      { level: 'NB', question: 'Với u_n = 2n + 5, tính u1 và u5.', answer: 'u1 = 7; u5 = 15.' },
      { level: 'TH', question: 'Cho u1 = 2, u_{n+1} = 3u_n − 1. Tính u2, u3, u4.', answer: 'u2 = 5; u3 = 14; u4 = 41.' },
      { level: 'TH', question: 'Cho u_n = n² − 1. Tính u10.', answer: 'u10 = 100 − 1 = 99.' },
      { level: 'VD', question: 'Viết công thức truy hồi cho dãy u_n = 2n + 5.', answer: 'u1 = 7 và u_{n+1} = u_n + 2 (vì u_{n+1} − u_n = 2(n+1) + 5 − (2n+5) = 2).' },
      { level: 'VD', question: 'Một bãi đỗ xe có 12 chỗ ở hàng đầu, mỗi hàng sau nhiều hơn 4 chỗ. Viết dãy số và tính số chỗ hàng thứ 8.', answer: 'u_n = 4n + 8 (vì u1 = 12). u8 = 4·8 + 8 = 40 chỗ. Kiểm: 12; 16; 20; 24; 28; 32; 36; 40.' },
    ],
    quick: [
      { question: 'Vì sao dãy số được coi là hàm số?', solution: 'Vì mỗi số nguyên dương n ứng với đúng một giá trị u_n, đúng định nghĩa hàm số trên ℕ*.' },
      { question: 'Công thức truy hồi khác công thức tổng quát ở đâu?', solution: 'Truy hồi tính số hạng sau từ số hạng trước (phải tính lần lượt); tổng quát tính trực tiếp từ n.' },
    ],
    mistakes: ['Thay sai vị trí n khi tính số hạng.', 'Nhầm công thức truy hồi với công thức tổng quát.', 'Quên tập xác định ℕ*.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Định nghĩa', 'a. Dãy số là hàm số trên ℕ*: u(n) = u_n.', '2. Ba cách cho dãy', 'a. Công thức tổng quát: u_n = 2n + 5.', 'b. Truy hồi: u1 = 7, u_{n+1} = u_n + 2.', 'c. Liệt kê: 7, 9, 11, …', '3. Áp dụng', 'a. u5 = 15; u10 = 25.', 'b. Tổng 10 hàng = (7 + 25)·10/2 = 160 ghế.'],
  },
  aiError: {
    category: 'Lỗi đại số', wrongSolution: 'AI tính: "Dãy u_n = 2n + 5. Số hạng thứ 5: u_5 = 2·(5 + 5) = 20."',
    correction: 'Thay n = 5 vào biểu thức: u_5 = 2·5 + 5 = 15 (không phải 20).',
    proof: 'Liệt kê trực tiếp: u1 = 7, u2 = 9, u3 = 11, u4 = 13, u5 = 15. Vậy 20 là kết quả của phép thay sai.',
    whyAiError: 'Mô hình nhầm vị trí thay thế, cộng 5 vào chỉ số thay vì cộng vào giá trị biểu thức.',
    teacherPrompt: 'Em liệt kê 5 số hạng đầu rồi sửa lại phép thay n của AI.',
    studentProduct: 'Thẻ Đ/S + liệt kê 7; 9; 11; 13; 15 và kết luận u5 = 15.',
    boardPrompt: 'AI ra u5 = 20. Liệt kê 5 số hạng đầu để kiểm.',
    libraryTitle: 'Lỗi AI thay sai vị trí chỉ số trong công thức dãy số',
  },
};

const L39 = {
  ...base,
  key: '11-6-39', period: 39, lessonType: 'formation',
  title: 'Dãy số tăng, giảm, bị chặn',
  opening: 'Hàng ghế tăng dần, số người đăng ký giảm dần — hôm nay lớp mình học cách chứng minh tăng/giảm và tìm chặn.',
  focusQuestion: 'Muốn biết một dãy tăng hay giảm, nên xét hiệu hay xét tỉ số?',
  axis: `**Tình huống: Ba dãy số từ bài toán hội trường và đăng ký.**

| Dãy | Công thức | Tính chất | Chặn |
|---|---|---|---|
| Số ghế | $u_n = 2n + 5$ | tăng | không bị chặn trên |
| Số người đăng ký | $v_n = \\dfrac{1}{n}$ | giảm | $0 < v_n \\le 1$ |
| Tỉ lệ lấp chỗ | $w_n = \\dfrac{n}{n+1}$ | tăng | $w_n < 1$, chặn dưới $\\tfrac12$ |

- **Kiểm chứng tay:**
  - $u_{n+1} - u_n = 2 > 0$ → tăng.
  - $v_{n+1} - v_n = \\dfrac{1}{n+1} - \\dfrac{1}{n} = -\\dfrac{1}{n(n+1)} < 0$ → giảm.
  - $w_{n+1} - w_n = \\dfrac{1}{(n+1)(n+2)} > 0$ → tăng; $w_n = 1 - \\dfrac{1}{n+1} < 1$.
- **Dãy không đơn điệu:** $x_n = (-1)^n$ nhận $-1; 1; -1; 1; \\ldots$ nhưng bị chặn trong $[-1; 1]$.

**Bẫy của bài:** kết luận tăng/giảm từ vài số hạng đầu; nhầm "bị chặn" với "có giới hạn"; chia tỉ số khi dãy đổi dấu.`,
  goals: {
    must: 'Xét tính tăng/giảm bằng hiệu $u_{n+1} - u_n$ và nhận biết dãy bị chặn.',
    should: 'Chứng minh tăng/giảm bằng biến đổi đại số, tìm chặn trên/dưới.',
    could: 'Chọn giữa xét hiệu và xét tỉ số; phản biện kết luận dựa trên vài số hạng đầu.',
  },
  s1: {
    title: 'Ba dãy, ba tính chất',
    context: 'u_n = 2n+5; v_n = 1/n; w_n = n/(n+1).',
    question: 'Dãy $v_n = 1/n$ tăng hay giảm?',
    options: ['Tăng vì n tăng', 'Giảm vì mẫu tăng', 'Không đơn điệu'],
    correct: 1,
    why: 'n tăng thì 1/n giảm: 1; 0,5; 0,333… Kiểm bằng hiệu: v_{n+1} − v_n < 0.',
    discuss: ['`[PHÁT HIỆN]` Vì sao w_n = n/(n+1) lại tăng?', '`[SO SÁNH]` Dãy (−1)^n có đơn điệu không?'],
    cue: 'Viết 4 số hạng đầu của mỗi dãy để HS so sánh trực quan.',
    lookFor: 'HS phân biệt "n tăng" với "dãy tăng".',
  },
  s3: {
    title: 'Hai phương pháp và khái niệm bị chặn',
    steps: [
      'Xét hiệu: $u_{n+1} - u_n > 0$ ⇒ tăng; $< 0$ ⇒ giảm.',
      'Xét tỉ số (khi $u_n > 0$): $\\dfrac{u_{n+1}}{u_n} > 1$ ⇒ tăng; $< 1$ ⇒ giảm.',
      'Bị chặn trên: tồn tại $M$ sao cho $u_n \\le M$ với mọi $n$; bị chặn dưới: tồn tại $m$ sao cho $u_n \\ge m$.',
      'Bị chặn = vừa bị chặn trên vừa bị chặn dưới.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao xét tỉ số cần điều kiện $u_n > 0$?', '`[PHÁT HIỆN]` Dãy $1/n$ bị chặn bởi hai số nào?'],
    cue: 'Khung: hiệu — tỉ số — chặn trên — chặn dưới.',
    close: 'Đơn điệu chứng minh bằng hiệu/tỉ số; bị chặn chứng minh bằng bất đẳng thức với mọi n.',
  },
  s4: { bat: 'AI kết luận dãy $w_n = \\dfrac{n}{n+1}$ bị chặn trên bởi 1 nhưng "không bị chặn dưới" vì $w_n$ "có thể âm".', chung: '$w_n = \\dfrac{n}{n+1} > 0$ và $w_n \\ge \\dfrac12$ với mọi $n \\ge 1$ — bị chặn dưới.', sua: 'Bị chặn: $\\tfrac12 \\le w_n < 1$.', cue: 'Cho HS tính w1 = 1/2 để thấy chặn dưới.', lookFor: 'HS kiểm bằng số hạng đầu.' },
  s6: { hints: { M: 'tính hiệu u_{n+1} − u_n rồi xét dấu.', S: 'chứng minh chặn bằng bất đẳng thức đúng với mọi n.', C: 'so sánh hai phương pháp và chọn phương pháp hợp lý.' }, lookFor: 'HS M xét đúng dấu; HS S chứng minh chặn; HS C chọn được phương pháp.' },
  postCheck: {
    q: 'Xét tính tăng/giảm và chặn của $u_n = \\dfrac{n}{n+1}$.',
    a: '$u_{n+1} - u_n = \\dfrac{1}{(n+1)(n+2)} > 0$ ⇒ tăng. $u_n = 1 - \\dfrac{1}{n+1}$ nên $\\tfrac12 \\le u_n < 1$ ⇒ bị chặn.',
    ds: [{ t: '"1/n là dãy tăng"', v: 'Sai — giảm' }, { t: '"Dãy bị chặn thì luôn đơn điệu"', v: 'Sai — ví dụ (−1)^n' }, { t: '"n/(n+1) bị chặn trên bởi 1"', v: 'Đúng' }],
    cue: 'Chiếu 2 bài, kiểm dấu hiệu.',
  },
  s8Close: 'Hiệu để xét đơn điệu; bất đẳng thức để xét chặn.',
  s9: {
    title: 'Ý nghĩa thực tế của chặn',
    bullets: ['Tỉ lệ lấp chỗ w_n luôn dưới 100% — mô hình phù hợp (không vượt sức chứa).', 'Số người đăng ký v_n giảm nhưng luôn dương — không âm vô lý.', 'Nếu một mô hình cho giá trị vượt chặn thực tế thì mô hình sai, cần xem lại công thức.'],
    cue: 'Hỏi: "Mô hình nào cho kết quả vô lý? Vì sao?"',
  },
  exit: ['Nêu hai phương pháp xét đơn điệu.', 'Nêu 1 bẫy (kết luận từ vài số hạng; nhầm bị chặn với có giới hạn).', 'Tự đánh giá M / S / C.', 'Dãy n/(n+1) tăng hay giảm và bị chặn bởi khoảng nào?'],
  exitCue: 'Mở lại bảng ba dãy ở mục II.',
  after: '- HS làm bài tập SGK về dãy tăng, giảm, bị chặn; chuẩn bị tiết củng cố.',
  snapshot: {
    focus: 'Hình thành khái niệm dãy tăng, giảm, bị chặn qua ba dãy thực nghiệm: u_n = 2n + 5 (tăng), v_n = 1/n (giảm, 0 < v_n ≤ 1), w_n = n/(n+1) (tăng, 1/2 ≤ w_n < 1); dãy (−1)^n không đơn điệu nhưng bị chặn',
    formulas: ['u_{n+1} - u_n > 0 \\Rightarrow \\text{tăng}; \\quad < 0 \\Rightarrow \\text{giảm}', '\\dfrac{u_{n+1}}{u_n} > 1 \\Rightarrow \\text{tăng (khi } u_n > 0)', 'u_n \\le M \\ \\forall n \\Rightarrow \\text{bị chặn trên}; \\quad u_n \\ge m \\Rightarrow \\text{bị chặn dưới}'],
    examples: [
      { question: 'Xét tính tăng/giảm của u_n = 2n + 5 và v_n = 1/n.', answer: 'u_{n+1} − u_n = 2(n+1) + 5 − (2n + 5) = 2 > 0 ⇒ u_n tăng. v_{n+1} − v_n = 1/(n+1) − 1/n = −1/(n(n+1)) < 0 ⇒ v_n giảm.' },
      { question: 'Chứng minh w_n = n/(n+1) tăng và bị chặn bởi 1.', answer: 'w_{n+1} − w_n = 1/((n+1)(n+2)) > 0 ⇒ tăng. Mặt khác w_n = 1 − 1/(n+1) < 1 và w_n ≥ 1/2 (khi n = 1) nên 1/2 ≤ w_n < 1.' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu hai phương pháp xét tính tăng, giảm của dãy số.', answer: 'Xét hiệu u_{n+1} − u_n hoặc xét tỉ số u_{n+1}/u_n (khi u_n > 0).' },
      { level: 'NB', question: 'Dãy u_n = 2n − 1 tăng hay giảm?', answer: 'Tăng vì u_{n+1} − u_n = 2 > 0.' },
      { level: 'TH', question: 'Xét tính tăng/giảm của u_n = 1/n.', answer: 'Giảm vì u_{n+1} − u_n = −1/(n(n+1)) < 0.' },
      { level: 'TH', question: 'Dãy u_n = n² có bị chặn trên không?', answer: 'Không. Với mọi M > 0, chọn n > √M thì u_n > M, nên dãy không bị chặn trên.' },
      { level: 'VD', question: 'Chứng minh w_n = n/(n+1) bị chặn bởi 1/2 và 1.', answer: 'w_n = 1 − 1/(n+1) < 1 với mọi n; và w_n ≥ 1/2 vì 1/(n+1) ≤ 1/2 khi n ≥ 1. Vậy 1/2 ≤ w_n < 1.' },
      { level: 'VD', question: 'Dãy (−1)^n có đơn điệu không? Có bị chặn không?', answer: 'Không đơn điệu vì luân phiên −1; 1; −1; 1… Nhưng bị chặn: −1 ≤ (−1)^n ≤ 1 với mọi n.' },
    ],
    quick: [
      { question: 'Vì sao xét tỉ số cần u_n > 0?', solution: 'Vì nhân/chia bất đẳng thức với số âm làm đổi chiều; nếu dãy đổi dấu, kết luận từ tỉ số không còn đúng.' },
      { question: 'Dãy 1/n bị chặn bởi hai số nào?', solution: 'Bị chặn dưới bởi 0 (v_n > 0) và chặn trên bởi 1 (v_1 = 1).' },
    ],
    mistakes: ['Kết luận đơn điệu chỉ từ vài số hạng đầu.', 'Nhầm "bị chặn" với "có giới hạn".', 'Dùng tỉ số khi dãy đổi dấu.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Đơn điệu', 'a. u_{n+1} − u_n > 0 ⇒ tăng; < 0 ⇒ giảm.', 'b. Tỉ số > 1 ⇒ tăng (khi u_n > 0).', '2. Bị chặn', 'a. Chặn trên: u_n ≤ M với mọi n.', 'b. Chặn dưới: u_n ≥ m với mọi n.', 'c. Bị chặn = có cả chặn trên và dưới.', '3. Ba dãy thực nghiệm', 'a. 2n + 5: tăng, không chặn trên.', 'b. 1/n: giảm, 0 < v_n ≤ 1.', 'c. n/(n+1): tăng, 1/2 ≤ w_n < 1.'],
  },
  aiError: {
    category: 'Lỗi khái niệm', wrongSolution: 'AI nhận xét: "Dãy w_n = n/(n+1) chỉ bị chặn trên bởi 1, không bị chặn dưới vì khi n rất lớn thì w_n tiến về 1, còn khi n nhỏ thì w_n có thể âm."',
    correction: 'w_n = n/(n+1) > 0 với mọi n ≥ 1, và w_n ≥ 1/2. Vậy dãy bị chặn: 1/2 ≤ w_n < 1.',
    proof: 'Tính trực tiếp w_1 = 1/2 — đây là giá trị nhỏ nhất. Với mọi n ≥ 1, n/(n+1) ≥ 1/2 vì 2n ≥ n + 1 ⇔ n ≥ 1. Không có giá trị âm nào.',
    whyAiError: 'Mô hình suy đoán chặn dưới từ hành vi tiệm cận thay vì kiểm giá trị nhỏ nhất trên tập xác định.',
    teacherPrompt: 'Em tính w_1 và giải bất phương trình n/(n+1) ≥ 1/2 rồi sửa lại kết luận của AI.',
    studentProduct: 'Thẻ Đ/S + chứng minh n/(n+1) ≥ 1/2 với n ≥ 1, kết luận bị chặn bởi 1/2 và 1.',
    boardPrompt: 'AI nói w_n có thể âm. Tính w_1.',
    libraryTitle: 'Lỗi AI suy chặn dưới từ giới hạn thay vì từ giá trị nhỏ nhất',
  },
};

const L40 = {
  ...base,
  key: '11-6-40', period: 40, lessonType: 'practice',
  title: 'Củng cố dãy số và tính đơn điệu',
  opening: 'Hôm nay lớp mình luyện phân mức: tính số hạng, xét đơn điệu, tìm chặn — mỗi mức một kỹ năng.',
  focusQuestion: 'Một dãy số có thể tăng mà vẫn bị chặn, hoặc giảm mà không bị chặn dưới — vì sao?',
  axis: `**Tình huống: Bốn dãy số của bài toán hội trường và tài chính, cần phân loại nhanh.**

| Dãy | Đơn điệu | Chặn |
|---|---|---|
| $u_n = 3n - 2$ | tăng | không chặn trên |
| $v_n = \\dfrac{2}{n}$ | giảm | $0 < v_n \\le 2$ |
| $w_n = \\dfrac{n}{2n+1}$ | tăng | $\\tfrac13 \\le w_n < \\tfrac12$ |
| $x_n = (-1)^n n$ | không đơn điệu | không bị chặn |

- **Kiểm chứng tay:** $w_{n+1} - w_n = \\dfrac{1}{(2n+1)(2n+3)} > 0$; $w_1 = \\tfrac13$; $\\lim w_n = \\tfrac12$ nên $w_n < \\tfrac12$.
- $x_n = (-1)^n n$: $-1; 2; -3; 4; \\ldots$ — không đơn điệu, $|x_n| = n$ tăng không giới hạn.

**Bẫy của bài:** nhầm tăng với bị chặn; tính $w_1$ sai; cho rằng dãy không đơn điệu thì không bị chặn.`,
  goals: {
    must: 'Tính số hạng và xét đơn điệu bằng hiệu.',
    should: 'Xác định chặn trên/dưới của dãy phân thức đơn giản.',
    could: 'Phân loại bốn dãy theo bảng; phản biện kết luận "không đơn điệu ⇒ không bị chặn".',
  },
  s1: {
    title: 'Phân loại bốn dãy',
    context: 'Bốn dãy như bảng; cần phân loại nhanh theo đơn điệu và chặn.',
    question: 'Dãy $x_n = (-1)^n n$ có bị chặn không?',
    options: ['Có, bị chặn bởi ±1', 'Không, vì |x_n| = n tăng không giới hạn', 'Có, bị chặn bởi 0 và 1'],
    correct: 1,
    why: '|x_n| = n → ∞ nên dãy không bị chặn (dù đổi dấu).',
    discuss: ['`[PHÁT HIỆN]` Dãy w_n bị chặn bởi hai số nào?', '`[SO SÁNH]` Tăng và bị chặn trên có mâu thuẫn không?'],
    cue: 'Viết 4 số hạng đầu của x_n để thấy độ lớn tăng dần.',
    lookFor: 'HS phân biệt đổi dấu với bị chặn.',
  },
  s3: {
    title: 'Ba kỹ năng phân mức',
    steps: [
      'Mức 1 — tính số hạng: thay $n$, hoặc dùng truy hồi lần lượt.',
      'Mức 2 — xét đơn điệu: tính hiệu (hoặc tỉ số) và xét dấu.',
      'Mức 3 — tìm chặn: dùng bất đẳng thức đúng với mọi $n$ hoặc tìm giá trị nhỏ/lớn nhất.',
      'Kiểm chéo: thử $n = 1, 2, 3$ để phát hiện sai sót.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao phải kiểm với n = 1?', '`[PHÁT HIỆN]` Dãy w_n có giá trị lớn nhất không?'],
    cue: 'Khung 3 mức; HS tự chọn mức theo bài.',
    close: 'Ba kỹ năng độc lập: tính giá trị — xét dấu hiệu — tìm chặn.',
  },
  s4: { bat: 'AI kết luận: "v_n = 2/n giảm nên không bị chặn dưới".', chung: 'Giảm nhưng luôn dương: v_n > 0 với mọi n, nên bị chặn dưới bởi 0.', sua: 'Bị chặn: $0 < v_n \\le 2$.', cue: 'Cho HS tính v_100 = 0,02 để thấy vẫn dương.', lookFor: 'HS phân biệt giảm với "xuống âm vô hạn".' },
  s6: { hints: { M: 'tính hiệu rồi xét dấu, kiểm n = 1.', S: 'chứng minh chặn bằng bất đẳng thức.', C: 'phân loại cả bốn dãy và giải thích.' }, lookFor: 'HS M đúng dấu; HS S đúng chặn; HS C phân loại đủ.' },
  postCheck: {
    q: 'Xét đơn điệu và chặn của $w_n = \\dfrac{n}{2n+1}$.',
    a: '$w_{n+1} - w_n = \\dfrac{1}{(2n+1)(2n+3)} > 0$ ⇒ tăng; $w_1 = \\tfrac13$ và $w_n < \\tfrac12$ ⇒ $\\tfrac13 \\le w_n < \\tfrac12$.',
    ds: [{ t: '"Dãy giảm thì luôn có chặn dưới"', v: 'Đúng nếu dãy bị chặn dưới — không tự động; ví dụ x_n = −n giảm và không bị chặn dưới' }, { t: '"Không đơn điệu ⇒ không bị chặn"', v: 'Sai' }, { t: '"w_n tăng và bị chặn trên bởi 1/2"', v: 'Đúng' }],
    cue: 'Chấm chéo theo bảng phân loại.',
  },
  s8Close: 'Đơn điệu và bị chặn là hai tính chất độc lập.',
  s9: {
    title: 'Chọn mô hình phù hợp',
    bullets: ['Mô hình số ghế 3n − 2: tăng, không chặn — phù hợp khi hội trường mở rộng.', 'Mô hình tỉ lệ lấp chỗ n/(2n+1): tăng nhưng luôn dưới 50% — cảnh báo nếu thực tế cần trên 50%.', 'Mô hình dao động (−1)^n n không dùng được cho đại lượng thực tế vì không có giới hạn.'],
    cue: 'Hỏi: "Mô hình nào không thể dùng cho đại lượng thực tế, vì sao?"',
  },
  exit: ['Nêu ba mức kỹ năng của tiết luyện.', 'Nêu 1 bẫy (nhầm tăng với bị chặn).', 'Tự đánh giá M / S / C.', 'Dãy 2/n tăng hay giảm và bị chặn thế nào?'],
  exitCue: 'Mở lại bảng bốn dãy ở mục II.',
  after: '- HS hoàn thành phiếu luyện; chuẩn bị tiết phối hợp tổng hợp.',
  snapshot: {
    focus: 'Củng cố dãy số và tính đơn điệu qua bốn dãy: 3n − 2 (tăng, không chặn trên), 2/n (giảm, 0 < v_n ≤ 2), n/(2n+1) (tăng, 1/3 ≤ w_n < 1/2), (−1)^n·n (không đơn điệu, không bị chặn); phân biệt đơn điệu với bị chặn',
    formulas: ['u_{n+1} - u_n', '\\dfrac{n}{2n+1} = \\dfrac12 - \\dfrac{1}{2(2n+1)}', 'u_n \\le M \\ \\forall n; \\quad u_n \\ge m \\ \\forall n'],
    examples: [
      { question: 'Xét đơn điệu và chặn của w_n = n/(2n+1).', answer: 'w_{n+1} − w_n = 1/((2n+1)(2n+3)) > 0 ⇒ tăng. w_n = 1/2 − 1/(2(2n+1)) nên w_n < 1/2; w_1 = 1/3 ⇒ 1/3 ≤ w_n < 1/2.' },
      { question: 'Dãy x_n = (−1)^n·n có bị chặn không?', answer: 'Không. |x_n| = n tăng không giới hạn, nên với mọi M > 0 đều có n > M thỏa |x_n| > M.' },
    ],
    exercises: [
      { level: 'NB', question: 'Xét tính tăng/giảm của u_n = 3n − 2.', answer: 'Tăng vì u_{n+1} − u_n = 3 > 0.' },
      { level: 'NB', question: 'Dãy v_n = 2/n bị chặn bởi hai số nào?', answer: '0 < v_n ≤ 2 (chặn dưới 0, chặn trên 2).' },
      { level: 'TH', question: 'Xét tính tăng/giảm của w_n = n/(2n+1).', answer: 'Tăng vì w_{n+1} − w_n = 1/((2n+1)(2n+3)) > 0.' },
      { level: 'TH', question: 'Dãy x_n = (−1)^n·n có đơn điệu không?', answer: 'Không: các số hạng −1; 2; −3; 4… luân phiên dấu và tăng độ lớn.' },
      { level: 'VD', question: 'Chứng minh w_n = n/(2n+1) < 1/2 với mọi n.', answer: 'w_n < 1/2 ⇔ 2n < 2n + 1 ⇔ 0 < 1 (luôn đúng). Vậy w_n < 1/2 với mọi n.' },
      { level: 'VD', question: 'Phản biện: "Dãy không đơn điệu thì không bị chặn".', answer: 'Sai. Ví dụ (−1)^n không đơn điệu nhưng bị chặn trong [−1;1]. Đơn điệu và bị chặn là hai tính chất độc lập.' },
    ],
    quick: [
      { question: 'Dãy giảm có luôn bị chặn dưới không?', solution: 'Không. Ví dụ u_n = −n giảm nhưng không bị chặn dưới.' },
      { question: 'Dãy tăng có luôn bị chặn trên không?', solution: 'Không. Ví dụ u_n = n tăng nhưng không bị chặn trên.' },
    ],
    mistakes: ['Cho rằng tăng thì bị chặn trên.', 'Cho rằng không đơn điệu thì không bị chặn.', 'Tính w_1 sai khi tìm chặn dưới.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Ba mức kỹ năng', 'a. Tính số hạng.', 'b. Xét đơn điệu bằng hiệu.', 'c. Tìm chặn bằng bất đẳng thức.', '2. Bốn dãy', 'a. 3n − 2: tăng, không chặn trên.', 'b. 2/n: giảm, 0 < v_n ≤ 2.', 'c. n/(2n+1): tăng, 1/3 ≤ w_n < 1/2.', 'd. (−1)^n·n: không đơn điệu, không bị chặn.'],
  },
  aiError: {
    category: 'Lỗi khái niệm', wrongSolution: 'AI kết luận: "Dãy v_n = 2/n là dãy giảm nên không bị chặn dưới; khi n rất lớn thì v_n tiến về 0 và có thể nhận giá trị âm."',
    correction: '2/n > 0 với mọi n ≥ 1 nên dãy bị chặn dưới bởi 0; đồng thời v_n ≤ 2 nên bị chặn trên bởi 2. Dãy bị chặn: 0 < v_n ≤ 2.',
    proof: 'Với mọi n nguyên dương, 2/n > 0 (thương hai số dương). Kiểm n = 100: v = 0,02 > 0. Không tồn tại n để v_n âm.',
    whyAiError: 'Mô hình suy đoán dấu từ xu hướng tiến về 0 thay vì kiểm bất đẳng thức với mọi n.',
    teacherPrompt: 'Em chứng minh 2/n > 0 với mọi n rồi sửa lại kết luận của AI về chặn dưới.',
    studentProduct: 'Thẻ Đ/S + bất đẳng thức 2/n > 0 và kết luận 0 < v_n ≤ 2.',
    boardPrompt: 'AI nói 2/n có thể âm. Thử n = 100.',
    libraryTitle: 'Lỗi AI suy dấu từ giới hạn thay vì từ công thức',
  },
};

const L41 = {
  ...base,
  key: '11-6-41', period: 41, lessonType: 'practice',
  title: 'Phối hợp giá trị lượng giác, phương trình lượng giác và dãy số',
  opening: 'Tiết tổng hợp: ba mạch kiến thức của chương I và chương dãy số cùng xuất hiện trong một bài kiểm tra.',
  focusQuestion: 'Ba mạch kiến thức khác nhau có điểm chung nào trong cách kiểm tra kết quả?',
  axis: `**Tình huống: Một bài đo đạc — góc quay của kim, số ghế theo hàng, và nhiệt độ điều hoà — cần ba công cụ khác nhau.**

| Phần | Dữ kiện | Công cụ | Kết quả |
|---|---|---|---|
| Giá trị lượng giác | $\\cos\\dfrac{2\\pi}{3}$ | đường tròn lượng giác | $-\\tfrac12$ |
| Phương trình | $2\\sin x - 1 = 0$ | công thức nghiệm | $\\tfrac{\\pi}{6} + 2k\\pi$; $\\tfrac{5\\pi}{6} + 2k\\pi$ |
| Dãy số | $u_n = 3n + 1$ | công thức tổng quát | $u_{10} = 31$, dãy tăng |

- **Kiểm chứng tay:** $\\cos\\tfrac{2\\pi}{3} = -\\tfrac12$ ✓ (góc 120° ở phần tư II). $2\\sin x = 1 \\Rightarrow \\sin x = \\tfrac12$ ✓. $u_{10} = 3\\cdot10 + 1 = 31$ ✓.
- **Điểm chung:** mỗi mạch đều cần (1) xác định dữ kiện, (2) chọn công cụ, (3) kiểm bằng giá trị cụ thể.

**Bẫy của bài:** lẫn công thức giữa các mạch; kiểm bằng cách lặp lại chính bước vừa làm.`,
  goals: {
    must: 'Giải một bài ở mỗi mạch với mức cơ bản.',
    should: 'Giải đúng cả ba mạch, mỗi mạch có phép kiểm độc lập.',
    could: 'Liên hệ ba mạch trong một bài toán thực tế; phản biện lời giải lẫn công thức.',
  },
  s1: {
    title: 'Ba mạch, một bài',
    context: 'Ba phần như bảng: giá trị lượng giác, phương trình, dãy số.',
    question: 'Giá trị $\\cos\\dfrac{2\\pi}{3}$ bằng bao nhiêu?',
    options: ['1/2', '−1/2', '−√3/2'],
    correct: 1,
    why: 'Góc 2π/3 = 120° thuộc phần tư II, cos âm và bằng −cos(π/3) = −1/2.',
    discuss: ['`[PHÁT HIỆN]` Vì sao không dùng −√3/2?', '`[SO SÁNH]` Ba mạch khác nhau ở bước nào?'],
    cue: 'Vẽ đường tròn lượng giác, đánh dấu 120° và 150° để phân biệt.',
    lookFor: 'HS phân biệt góc 120° và 150°.',
  },
  s3: {
    title: 'Ba mạch và một quy trình',
    steps: [
      'Giá trị lượng giác: xác định phần tư → dấu → giá trị tuyệt đối theo góc tham chiếu.',
      'Phương trình: đưa về dạng cơ bản → kiểm điều kiện → áp công thức nghiệm → lọc.',
      'Dãy số: xác định công thức → thay $n$ → kiểm bằng liệt kê vài số hạng.',
      'Mọi mạch đều kết thúc bằng một phép kiểm độc lập với cách giải.',
    ],
    ask: ['`[SUY LUẬN]` Phép kiểm độc lập cho dãy số là gì?', '`[PHÁT HIỆN]` Nếu quên phần tư, em có thể sai dấu ở đâu?'],
    cue: 'Khung 3 cột: mạch — bước — phép kiểm.',
    close: 'Ba mạch khác công cụ nhưng cùng quy trình: dữ kiện → công cụ → kiểm.',
  },
  s4: { bat: 'AI tính $\\cos\\dfrac{2\\pi}{3} = \\dfrac12$ vì "cos đối xứng, lấy giá trị dương".', chung: 'Góc 120° ở phần tư II nên cos âm: $\\cos\\tfrac{2\\pi}{3} = -\\tfrac12$.', sua: 'Xác định phần tư II → cos âm → giá trị $-\\tfrac12$.', cue: 'Cho HS vẽ và chỉ vị trí 120° trên đường tròn.', lookFor: 'HS dùng phần tư để xác định dấu.' },
  s6: { hints: { M: 'dùng đường tròn cho giá trị, công thức cho phương trình, thay n cho dãy.', S: 'mỗi mạch một phép kiểm độc lập.', C: 'liên hệ ba mạch trong bài thực tế.' }, lookFor: 'HS M đúng cả ba; HS S có 3 phép kiểm; HS C liên hệ hợp lý.' },
  postCheck: {
    q: 'Tính $\\cos\\dfrac{5\\pi}{6}$, giải $2\\cos x + 1 = 0$, và cho biết $u_n = 3n + 1$ tăng hay giảm.',
    a: '$\\cos\\tfrac{5\\pi}{6} = -\\tfrac{\\sqrt3}{2}$; $\\cos x = -\\tfrac12 \\Rightarrow x = \\pm\\tfrac{2\\pi}{3} + 2k\\pi$; dãy tăng vì $u_{n+1} − u_n = 3 > 0$.',
    ds: [{ t: '"cos(2π/3) = 1/2"', v: 'Sai — phần tư II nên âm' }, { t: '"2cos x + 1 = 0 ⇒ cos x = −1/2"', v: 'Đúng' }, { t: '"u_n = 3n + 1 tăng"', v: 'Đúng' }],
    cue: 'Chấm chéo theo ba mạch.',
  },
  s8Close: 'Dữ kiện → công cụ → kiểm, cho cả ba mạch.',
  s9: {
    title: 'Bài đo đạc tổng hợp',
    bullets: ['Kim quay ở góc 120°: cos âm −1/2 — dùng để tính hình chiếu.', 'Nhiệt độ dao động theo cos: giải phương trình để tìm thời điểm.', 'Số ghế tăng đều: dùng dãy số để tính tổng chỗ.'],
    cue: 'Hỏi: "Nếu một mạch bị tính sai, kết quả cuối sai thế nào?"',
  },
  exit: ['Nêu quy trình chung 3 bước.', 'Nêu 1 bẫy (lẫn công thức giữa các mạch).', 'Tự đánh giá M / S / C.', 'Tính cos(2π/3) và giải 2sin x − 1 = 0.'],
  exitCue: 'Mở lại bảng ba mạch ở mục II.',
  after: '- HS hoàn thành bài kiểm tra tổng hợp; chuẩn bị nội dung tuần tiếp theo.',
  snapshot: {
    focus: 'Phối hợp ba mạch kiến thức trong một bài đo đạc: giá trị lượng giác (cos(2π/3) = −1/2, cos(5π/6) = −√3/2), phương trình lượng giác (2sin x − 1 = 0 → π/6 + 2kπ; 5π/6 + 2kπ), dãy số (u_n = 3n + 1, u10 = 31, tăng); rèn quy trình dữ kiện → công cụ → kiểm',
    formulas: ['\\cos\\dfrac{2\\pi}{3} = -\\dfrac12', '2\\sin x - 1 = 0 \\Leftrightarrow x = \\dfrac{\\pi}{6} + 2k\\pi \\ \\text{hoặc} \\ \\dfrac{5\\pi}{6} + 2k\\pi', 'u_n = 3n + 1, \\ u_{n+1} - u_n = 3 > 0'],
    examples: [
      { question: 'Tính cos(2π/3) và giải thích dấu.', answer: 'Góc 2π/3 = 120° thuộc phần tư II nên cos âm; góc tham chiếu π/3 cho cos = 1/2, nên cos(2π/3) = −1/2.' },
      { question: 'Giải 2sin x − 1 = 0 và tính u10 của dãy u_n = 3n + 1.', answer: 'sin x = 1/2 ⇒ x = π/6 + 2kπ hoặc 5π/6 + 2kπ. Với n = 10: u10 = 3·10 + 1 = 31.' },
    ],
    exercises: [
      { level: 'NB', question: 'Tính cos(2π/3) và cos(5π/6).', answer: 'cos(2π/3) = −1/2; cos(5π/6) = −√3/2.' },
      { level: 'NB', question: 'Giải 2sin x − 1 = 0.', answer: 'sin x = 1/2 ⇒ x = π/6 + 2kπ hoặc 5π/6 + 2kπ.' },
      { level: 'TH', question: 'Giải 2cos x + 1 = 0.', answer: 'cos x = −1/2 ⇒ x = ±2π/3 + 2kπ.' },
      { level: 'TH', question: 'Cho u_n = 3n + 1, tính u1, u5, u10 và nhận xét đơn điệu.', answer: 'u1 = 4; u5 = 16; u10 = 31; dãy tăng vì hiệu bằng 3 > 0.' },
      { level: 'VD', question: 'Giải 2sin x − 1 = 0 trong [0; 2π].', answer: 'x = π/6 và x = 5π/6 — hai nghiệm.' },
      { level: 'VD', question: 'Nêu một lỗi thường gặp khi làm bài tổng hợp ba mạch và cách tránh.', answer: 'Lỗi: dùng công thức nghiệm của sin cho cos (hoặc ngược lại), hoặc quên phần tư khi xét dấu. Cách tránh: viết rõ tên công thức và vẽ đường tròn trước khi tính.' },
    ],
    quick: [
      { question: 'Vì sao cos(2π/3) âm?', solution: 'Vì 120° thuộc phần tư II, ở đó cos âm.' },
      { question: 'Dãy u_n = 3n + 1 bị chặn trên không?', solution: 'Không, vì u_n tăng không giới hạn khi n tăng.' },
    ],
    mistakes: ['Lấy cos(2π/3) = 1/2 (quên dấu phần tư II).', 'Dùng công thức nghiệm sin cho phương trình cos.', 'Quên thay đúng n khi tính số hạng.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Ba mạch', 'a. Giá trị lượng giác: phần tư → dấu → giá trị.', 'b. Phương trình: dạng cơ bản → điều kiện → nghiệm → lọc.', 'c. Dãy số: công thức → thay n → kiểm.', '2. Kết quả chuẩn', 'a. cos(2π/3) = −1/2; cos(5π/6) = −√3/2.', 'b. 2sin x − 1 = 0 ⇒ π/6; 5π/6 (trong một vòng).', 'c. u_n = 3n + 1: u10 = 31, tăng.'],
  },
  aiError: {
    category: 'Lỗi khái niệm', wrongSolution: 'AI tính: "cos(2π/3) = cos(120°) = 1/2 vì cos là hàm chẵn nên luôn dương ở hai phía trục tung."',
    correction: 'cos là hàm chẵn theo nghĩa cos(−x) = cos x, không phải luôn dương. Góc 120° thuộc phần tư II nên cos(2π/3) = −1/2.',
    proof: 'Dùng công thức: cos(2π/3) = cos(π − π/3) = −cos(π/3) = −1/2. Kiểm bằng đường tròn lượng giác: hoành độ của điểm 120° nằm bên trái trục tung.',
    whyAiError: 'Mô hình nhầm tính chẵn của hàm cos với việc cos luôn dương, và bỏ qua dấu theo góc phần tư.',
    teacherPrompt: 'Em xác định phần tư của 2π/3 và dùng cos(π − x) = −cos x để sửa lại kết quả của AI.',
    studentProduct: 'Thẻ Đ/S + hai căn cứ: phần tư II và công thức cos(π − x) = −cos x.',
    boardPrompt: 'AI nói cos(2π/3) = 1/2 vì "cos chẵn". Sai ở đâu?',
    libraryTitle: 'Lỗi AI nhầm tính chẵn của cos với dấu dương',
  },
};

export default [L38, L39, L40, L41];

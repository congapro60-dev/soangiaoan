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

const L34 = {
  ...base,
  key: '11-6-34', period: 34, lessonType: 'formation',
  title: 'Giải phương trình lượng giác tan x = m, cot x = m',
  opening: 'Độ dốc mái nhà được tính bằng tang của góc nghiêng — hôm nay lớp mình giải phương trình tan và cot, kèm điều kiện xác định.',
  focusQuestion: 'Vì sao tan và cot lại có điều kiện xác định, trong khi sin và cos thì không?',
  axis: `**Tình huống: Mái nhà có độ dốc $i = \\tan\\alpha$. Tiêu chuẩn thiết kế yêu cầu $i = 0{,}5$ (khoảng 26,6°).**

- **Phương trình:** $\\tan\\alpha = 0{,}5 \\Leftrightarrow \\alpha = \\arctan 0{,}5 + k\\pi$, với $\\alpha \\ne \\tfrac{\\pi}{2} + k\\pi$.
- Trong khoảng $(0; \\tfrac{\\pi}{2})$: $\\alpha \\approx 26{,}57^\\circ$ — phù hợp tiêu chuẩn mái dốc.
- **Kiểm chứng tay:** $\\tan 26{,}57^\\circ \\approx 0{,}5$ ✓ (dùng máy tính: arctan 0,5 ≈ 26,5651°).
- **Mái quá dốc $i = 2$:** $\\alpha = \\arctan 2 \\approx 63{,}43^\\circ$ — vượt tiêu chuẩn an toàn.
- **Chu kỳ của tan/cot là $k\\pi$** (không phải $2k\\pi$) vì tan và cot tuần hoàn chu kỳ $\\pi$.

**Bẫy của bài:** quên điều kiện $\\cos x \\ne 0$ (với tan) và $\\sin x \\ne 0$ (với cot); dùng chu kỳ $2k\\pi$; quên rằng tan nhận **mọi** giá trị thực nên không có điều kiện $|m| \\le 1$.`,
  goals: {
    must: 'Viết nghiệm $\\tan x = m$ và $\\cot x = m$ đúng chu kỳ $k\\pi$, kèm điều kiện xác định.',
    should: 'Giải phương trình có hệ số góc (tan 2x, cot 3x) và lọc nghiệm theo khoảng.',
    could: 'Mô hình hóa bài độ dốc mái và biện luận nghiệm theo điều kiện thực tế.',
  },
  s1: {
    title: 'Độ dốc mái nhà',
    context: 'Tiêu chuẩn i = tan α = 0,5. Hỏi góc nghiêng α bằng bao nhiêu?',
    question: 'Phương trình tan α = 0,5 có điều kiện gì?',
    options: ['|0,5| ≤ 1 nên luôn có nghiệm, không cần điều kiện', 'Cần α ≠ π/2 + kπ', 'Cần α ≠ kπ'],
    correct: 1,
    why: 'tan xác định khi cos α ≠ 0, tức α ≠ π/2 + kπ. Tan nhận mọi giá trị thực nên không cần |m| ≤ 1.',
    discuss: ['`[PHÁT HIỆN]` Vì sao tan không có điều kiện |m| ≤ 1?', '`[SO SÁNH]` Chu kỳ của tan khác sin ở đâu?'],
    cue: 'Vẽ đồ thị tan với các đường tiệm cận đứng — chỉ rõ chỗ không xác định.',
    lookFor: 'HS nêu điều kiện xác định trước khi giải.',
  },
  s3: {
    title: 'Công thức nghiệm tan, cot',
    steps: [
      '$\\tan x = m \\Leftrightarrow x = \\arctan m + k\\pi$, điều kiện $x \\ne \\tfrac{\\pi}{2} + k\\pi$.',
      '$\\cot x = m \\Leftrightarrow x = \\operatorname{arccot} m + k\\pi$, điều kiện $x \\ne k\\pi$.',
      'Trường hợp đặc biệt: $\\tan x = 0 \\Leftrightarrow x = k\\pi$; $\\cot x = 0 \\Leftrightarrow x = \\tfrac{\\pi}{2} + k\\pi$.',
      'Lọc nghiệm theo khoảng, chú ý loại các giá trị vi phạm điều kiện xác định.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao chu kỳ là kπ mà không phải 2kπ?', '`[PHÁT HIỆN]` $\\cot x = 0$ có nghiệm tại đâu?'],
    cue: 'Khung 3 dòng: điều kiện — công thức — lọc. Nhắc: tan/cot luôn có nghiệm với mọi m.',
    close: 'Tan và cot tuần hoàn chu kỳ π nên chỉ cần cộng kπ; điều kiện xác định là phần không thể bỏ.',
  },
  s4: { bat: 'AI giải tan x = 0,5 ra x = arctan0,5 + 2kπ và bỏ điều kiện xác định.', chung: 'Chu kỳ của tan là kπ, không phải 2kπ; và phải loại x = π/2 + kπ.', sua: 'x = arctan 0,5 + kπ, x ≠ π/2 + kπ.', cue: 'Cho HS so đồ thị tan (chu kỳ π) với sin (chu kỳ 2π).', lookFor: 'HS phân biệt chu kỳ của bốn hàm.' },
  s6: { hints: { M: 'ghi điều kiện xác định trước, rồi viết nghiệm với kπ.', S: 'xử lý hệ số góc (tan 2x) bằng cách chia cả chu kỳ.', C: 'mô hình độ dốc và biện luận theo tiêu chuẩn.' }, lookFor: 'HS M đúng chu kỳ; HS S đúng hệ số; HS C gắn được với thực tế.' },
  postCheck: {
    q: 'Giải $\\tan 2x = 1$.',
    a: '$2x = \\tfrac{\\pi}{4} + k\\pi \\Rightarrow x = \\tfrac{\\pi}{8} + \\tfrac{k\\pi}{2}$, với điều kiện $x \\ne \\tfrac{\\pi}{4} + \\tfrac{k\\pi}{2}$.',
    ds: [{ t: '"tan x = m cần |m| ≤ 1"', v: 'Sai — tan nhận mọi giá trị thực' }, { t: '"Chu kỳ nghiệm của tan là kπ"', v: 'Đúng' }, { t: '"cot x xác định khi sin x ≠ 0"', v: 'Đúng' }],
    cue: 'Chiếu 2 bài, kiểm điều kiện xác định.',
  },
  s8Close: 'Tan/cot: mọi m — chu kỳ kπ — nhớ điều kiện xác định.',
  s9: {
    title: 'Kiểm tra thiết kế mái',
    bullets: ['i = 0,5 → α ≈ 26,57°: đạt tiêu chuẩn mái dốc thông dụng.', 'i = 2 → α ≈ 63,43°: quá dốc, cần gia cố kết cấu.', 'i âm nghĩa là mái dốc ngược — không áp dụng cho nhà ở; phương trình vẫn có nghiệm nhưng cần loại theo ngữ cảnh.'],
    cue: 'Hỏi: "Vì sao toán cho nghiệm nhưng kỹ thuật vẫn có thể loại?" — nghiệm phải thỏa điều kiện thực tế.',
  },
  exit: ['Nêu công thức nghiệm tan x = m và điều kiện.', 'Nêu 1 bẫy (dùng 2kπ; bỏ điều kiện xác định).', 'Tự đánh giá M / S / C.', 'Giải tan α = 0,5 và cho biết góc trong (0; π/2).'],
  exitCue: 'Mở lại khung 3 dòng ở S3.',
  after: '- HS làm bài tập SGK về tan, cot; chuẩn bị tiết luyện tập phương trình lượng giác.',
  snapshot: {
    focus: 'Hình thành công thức nghiệm tan x = m, cot x = m trên trục độ dốc mái nhà (tan α = 0,5 → α = arctan 0,5 + kπ ≈ 26,57° trong (0; π/2)); nhấn chu kỳ kπ, điều kiện xác định cos ≠ 0 / sin ≠ 0 và việc tan nhận mọi giá trị thực',
    formulas: ['\\tan x = m \\Leftrightarrow x = \\arctan m + k\\pi \\ (x \\ne \\tfrac{\\pi}{2} + k\\pi)', '\\cot x = m \\Leftrightarrow x = \\operatorname{arccot} m + k\\pi \\ (x \\ne k\\pi)', '\\tan x = 0 \\Leftrightarrow x = k\\pi', '\\cot x = 0 \\Leftrightarrow x = \\tfrac{\\pi}{2} + k\\pi'],
    examples: [
      { question: 'Mái nhà có độ dốc i = tan α = 0,5. Tìm α và cho biết giá trị trong khoảng (0; π/2).', answer: 'α = arctan 0,5 + kπ, điều kiện α ≠ π/2 + kπ. Trong (0; π/2): α = arctan 0,5 ≈ 26,57°.' },
      { question: 'Giải cot x = √3.', answer: 'x = π/6 + kπ (vì cot(π/6) = √3), điều kiện x ≠ kπ.' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu điều kiện xác định của tan x và cot x.', answer: 'tan x xác định khi cos x ≠ 0, tức x ≠ π/2 + kπ; cot x xác định khi sin x ≠ 0, tức x ≠ kπ.' },
      { level: 'NB', question: 'Giải tan x = 1.', answer: 'x = π/4 + kπ, điều kiện x ≠ π/2 + kπ.' },
      { level: 'TH', question: 'Giải tan(2x) = −1.', answer: '2x = −π/4 + kπ ⇒ x = −π/8 + kπ/2, điều kiện x ≠ π/4 + kπ/2.' },
      { level: 'TH', question: 'Giải cot(3x) = 0.', answer: '3x = π/2 + kπ ⇒ x = π/6 + kπ/3, điều kiện x ≠ kπ/3.' },
      { level: 'VD', question: 'Mái nhà có tan α = 2. Tính α và nhận xét so với tiêu chuẩn i = 0,5.', answer: 'α = arctan 2 + kπ ≈ 63,43° + kπ. Trong (0; π/2) góc ≈ 63,43°, lớn hơn nhiều so với 26,57° của tiêu chuẩn — mái quá dốc.' },
      { level: 'VD', question: 'Giải tan x = 0 và cho biết số nghiệm trong [0; 2π).', answer: 'x = kπ; trong [0; 2π) có x = 0 và x = π — 2 nghiệm (x = 2π không thuộc khoảng nửa mở).' },
    ],
    quick: [
      { question: 'Vì sao tan x = m luôn có nghiệm với mọi m?', solution: 'Vì tập giá trị của tan là toàn bộ ℝ (khác sin, cos bị chặn trong [−1; 1]).' },
      { question: 'Chu kỳ nghiệm của cot là bao nhiêu?', solution: 'kπ, vì cot tuần hoàn chu kỳ π.' },
    ],
    mistakes: ['Dùng 2kπ cho tan/cot.', 'Bỏ điều kiện xác định khi kết luận nghiệm.', 'Áp điều kiện |m| ≤ 1 cho tan/cot.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Tan và cot', 'a. tan x = m ⇔ x = arctan m + kπ, x ≠ π/2 + kπ.', 'b. cot x = m ⇔ x = arccot m + kπ, x ≠ kπ.', 'c. Đặc biệt: tan x = 0 ⇔ x = kπ; cot x = 0 ⇔ x = π/2 + kπ.', '2. Lưu ý', 'a. Chu kỳ π, không phải 2π.', 'b. Tan nhận mọi giá trị thực, không có điều kiện |m| ≤ 1.', '3. Áp dụng độ dốc mái', 'a. i = 0,5 ⇒ α ≈ 26,57°.', 'b. i = 2 ⇒ α ≈ 63,43° (quá dốc).'],
  },
  aiError: {
    category: 'Lỗi khái niệm', wrongSolution: 'AI giải: "tan x = 0,5 ⇒ x = arctan(0,5) + 2kπ ≈ 26,57° + 2kπ. Không cần điều kiện gì thêm vì tan xác định với mọi x."',
    correction: 'Chu kỳ nghiệm của tan là kπ (không phải 2kπ), và tan chỉ xác định khi x ≠ π/2 + kπ.',
    proof: 'tan(x + π) = tan x với mọi x, nên nếu x là nghiệm thì x + π cũng là nghiệm — chu kỳ phải là kπ. Ngoài ra tại x = π/2 hàm tan không xác định (tiệm cận đứng), nên phải loại khỏi tập nghiệm.',
    whyAiError: 'Mô hình dùng chung chu kỳ 2kπ của sin/cos cho cả tan/cot và bỏ qua miền xác định.',
    teacherPrompt: 'Em kiểm tra x = arctan0,5 + π có phải nghiệm không, rồi sửa lại chu kỳ và điều kiện xác định.',
    studentProduct: 'Thẻ Đ/S + chỉ ra chu kỳ đúng là kπ và điều kiện x ≠ π/2 + kπ.',
    boardPrompt: 'AI dùng 2kπ cho tan và nói "xác định với mọi x". Sai ở đâu?',
    libraryTitle: 'Lỗi AI dùng chu kỳ 2kπ cho phương trình tan',
  },
};

const L35 = {
  ...base,
  key: '11-6-35', period: 35, lessonType: 'practice',
  title: 'Luyện tập phương trình lượng giác',
  opening: 'Hôm nay lớp mình trộn bốn dạng sin, cos, tan, cot và luyện lọc nghiệm trên khoảng.',
  focusQuestion: 'Làm thế nào nhận ra dạng phương trình chỉ trong vài giây?',
  axis: `**Tình huống: Bảng kiểm tra nhanh bốn dạng phương trình lượng giác dùng cho phòng điều khiển.**

| Dạng | Công thức | Chu kỳ | Điều kiện |
|---|---|---|---|
| $\\sin x = m$ | $\\alpha + 2k\\pi$; $\\pi - \\alpha + 2k\\pi$ | $2k\\pi$ | $|m| \\le 1$ |
| $\\cos x = m$ | $\\pm\\alpha + 2k\\pi$ | $2k\\pi$ | $|m| \\le 1$ |
| $\\tan x = m$ | $\\arctan m + k\\pi$ | $k\\pi$ | $x \\ne \\tfrac{\\pi}{2} + k\\pi$ |
| $\\cot x = m$ | $\\operatorname{arccot} m + k\\pi$ | $k\\pi$ | $x \\ne k\\pi$ |

- **Kiểm chứng tay:** $2\\sin x - \\sqrt3 = 0 \\Rightarrow \\sin x = \\tfrac{\\sqrt3}{2} \\Rightarrow x = \\tfrac{\\pi}{3} + 2k\\pi$ hoặc $\\tfrac{2\\pi}{3} + 2k\\pi$.
- $\\tan 2x = 1 \\Rightarrow x = \\tfrac{\\pi}{8} + \\tfrac{k\\pi}{2}$.
- $\\cot\\dfrac{x}{2} = -1 \\Rightarrow \\dfrac{x}{2} = -\\tfrac{\\pi}{4} + k\\pi \\Rightarrow x = -\\tfrac{\\pi}{2} + 2k\\pi$.

**Bẫy của bài:** nhầm chu kỳ; quên điều kiện xác định; quên hệ số khi biến là $2x$, $x/2$.`,
  goals: {
    must: 'Nhận dạng và giải đúng phương trình lượng giác cơ bản ở dạng đơn giản.',
    should: 'Biến đổi phương trình về dạng cơ bản, xử lý hệ số của biến và lọc nghiệm.',
    could: 'Lập bảng tra bốn dạng; phản biện lời giải sai chu kỳ hoặc sai điều kiện.',
  },
  s1: {
    title: 'Bảng bốn dạng',
    context: 'Bốn dạng phương trình với công thức, chu kỳ và điều kiện như bảng.',
    question: 'Phương trình $2\\sin x - \\sqrt3 = 0$ thuộc dạng nào và nghiệm là gì?',
    options: ['sin x = √3/2 → x = π/3 + 2kπ hoặc 2π/3 + 2kπ', 'sin x = √3 → vô nghiệm', 'tan x = √3 → x = π/3 + kπ'],
    correct: 0,
    why: 'Chuyển vế: sin x = √3/2 (thỏa |m| ≤ 1) rồi dùng công thức sin.',
    discuss: ['`[PHÁT HIỆN]` Vì sao không phải vô nghiệm?', '`[SO SÁNH]` Dạng nào có điều kiện xác định?'],
    cue: 'Treo bảng bốn dạng; HS chỉ dòng tương ứng trước khi giải.',
    lookFor: 'HS biến đổi về dạng cơ bản trước khi tra công thức.',
  },
  s3: {
    title: 'Quy trình 4 bước cho mọi dạng',
    steps: [
      'Biến đổi về dạng cơ bản: $\\sin x = m$, $\\cos x = m$, $\\tan x = m$, $\\cot x = m$.',
      'Kiểm điều kiện: $|m| \\le 1$ với sin/cos; điều kiện xác định với tan/cot.',
      'Áp công thức nghiệm đúng chu kỳ, chú ý hệ số của biến.',
      'Lọc nghiệm theo khoảng và kiểm một giá trị cụ thể.',
    ],
    ask: ['`[SUY LUẬN]` Với $\\tan 2x$, chu kỳ của $x$ là bao nhiêu?', '`[PHÁT HIỆN]` $\\cot(x/2) = -1$ cho nghiệm nào?'],
    cue: 'Khung 4 bước; nhắc HS yếu luôn viết hệ số biến ra trước khi chia.',
    close: 'Mọi phương trình lượng giác đều quy về bốn dạng cơ bản — khác nhau ở chu kỳ và điều kiện.',
  },
  s4: { bat: 'AI giải $\\tan 2x = 1$ ra $x = \\tfrac{\\pi}{4} + k\\pi$ (quên chia chu kỳ và hệ số).', chung: '$2x = \\tfrac{\\pi}{4} + k\\pi \\Rightarrow x = \\tfrac{\\pi}{8} + \\tfrac{k\\pi}{2}$; kiểm $x = \\tfrac{\\pi}{8}$: $\\tan\\tfrac{\\pi}{4} = 1$ ✓.', sua: '$x = \\tfrac{\\pi}{8} + \\tfrac{k\\pi}{2}$.', cue: 'Cho HS thay $x = \\pi/8$ và $x = \\pi/8 + \\pi/2$ để thấy cả hai đều đúng.', lookFor: 'HS kiểm bằng cách thay giá trị cụ thể.' },
  s6: { hints: { M: 'đưa về dạng cơ bản, rồi tra bảng.', S: 'xử lý hệ số của biến, nhớ chia chu kỳ.', C: 'lọc nghiệm và kiểm bằng máy tính.' }, lookFor: 'HS M đúng dạng; HS S đúng hệ số; HS C lọc đúng.' },
  postCheck: {
    q: 'Giải $\\cot\\dfrac{x}{2} = -1$.',
    a: '$\\dfrac{x}{2} = -\\tfrac{\\pi}{4} + k\\pi \\Rightarrow x = -\\tfrac{\\pi}{2} + 2k\\pi$, điều kiện $x \\ne 2k\\pi$ (tương đương $\\tfrac{x}{2} \\ne k\\pi$).',
    ds: [{ t: '"tan 2x = 1 ⇒ x = π/4 + kπ"', v: 'Sai — phải chia hệ số' }, { t: '"cot x = m có chu kỳ kπ"', v: 'Đúng' }, { t: '"sin x = √3/2 có 2 họ nghiệm"', v: 'Đúng' }],
    cue: 'Chấm chéo theo bảng 4 dạng.',
  },
  s8Close: 'Về dạng cơ bản — kiểm điều kiện — đúng chu kỳ — lọc nghiệm.',
  s9: {
    title: 'Bảng tra dùng trong phòng điều khiển',
    bullets: ['sin/cos: chỉ giải được khi |m| ≤ 1 — ngoài ra ghi "vô nghiệm".', 'tan/cot: luôn giải được nhưng phải loại điểm không xác định.', 'Mọi kết quả phải kiểm bằng cách thay một giá trị cụ thể.'],
    cue: 'Hỏi: "Nếu bảng tra ghi thiếu điều kiện xác định thì hậu quả gì?"',
  },
  exit: ['Nêu 4 bước giải phương trình lượng giác.', 'Nêu 1 bẫy (sai chu kỳ; quên điều kiện).', 'Tự đánh giá M / S / C.', 'Giải tan 2x = 1.'],
  exitCue: 'Mở lại bảng bốn dạng ở mục II.',
  after: '- HS hoàn thành phiếu luyện; chuẩn bị tiết ôn tập chương I.',
  snapshot: {
    focus: 'Luyện tập bốn dạng phương trình lượng giác (sin, cos, tan, cot) theo bảng tra: 2sin x − √3 = 0 (x = π/3 + 2kπ; 2π/3 + 2kπ), tan 2x = 1 (x = π/8 + kπ/2), cot(x/2) = −1 (x = −π/2 + 2kπ); rèn nhận dạng, chu kỳ và điều kiện xác định',
    formulas: ['\\sin x = m \\Leftrightarrow x = \\alpha + 2k\\pi \\ \\text{hoặc} \\ \\pi - \\alpha + 2k\\pi', '\\cos x = m \\Leftrightarrow x = \\pm\\alpha + 2k\\pi', '\\tan x = m \\Leftrightarrow x = \\arctan m + k\\pi', '\\cot x = m \\Leftrightarrow x = \\operatorname{arccot} m + k\\pi'],
    examples: [
      { question: 'Giải phương trình 2sin x − √3 = 0.', answer: 'sin x = √3/2 = sin(π/3) ⇒ x = π/3 + 2kπ hoặc x = 2π/3 + 2kπ.' },
      { question: 'Giải phương trình tan 2x = 1 và kiểm với x = π/8.', answer: '2x = π/4 + kπ ⇒ x = π/8 + kπ/2. Kiểm: tan(2·π/8) = tan(π/4) = 1 ✓.' },
    ],
    exercises: [
      { level: 'NB', question: 'Giải sin x = √3/2.', answer: 'x = π/3 + 2kπ hoặc x = 2π/3 + 2kπ.' },
      { level: 'NB', question: 'Giải tan x = √3.', answer: 'x = π/3 + kπ, điều kiện x ≠ π/2 + kπ.' },
      { level: 'TH', question: 'Giải cos(2x − π/4) = −1/2.', answer: '2x − π/4 = ±2π/3 + 2kπ ⇒ 2x = π/4 ± 2π/3 + 2kπ ⇒ x = π/8 ± π/3 + kπ.' },
      { level: 'TH', question: 'Giải cot(x/2) = −1.', answer: 'x/2 = −π/4 + kπ ⇒ x = −π/2 + 2kπ.' },
      { level: 'VD', question: 'Giải 2cos²x − 1 = 0.', answer: 'cos²x = 1/2 ⇒ cos x = ±√2/2. Với cos x = √2/2: x = ±π/4 + 2kπ; với cos x = −√2/2: x = ±3π/4 + 2kπ. Gộp: x = π/4 + kπ/2.' },
      { level: 'VD', question: 'Tìm nghiệm của tan x = 1 trong [0; π).', answer: 'x = π/4 + kπ; trong [0; π) chỉ có x = π/4 (k = 0).' },
    ],
    quick: [
      { question: 'Vì sao tan 2x = 1 phải chia chu kỳ?', solution: 'Vì sau khi có 2x = π/4 + kπ, chia hai vế cho 2 thì chu kỳ thành kπ/2.' },
      { question: 'Dạng nào cần điều kiện xác định?', solution: 'tan (cos x ≠ 0) và cot (sin x ≠ 0).' },
    ],
    mistakes: ['Không chia chu kỳ khi chia hệ số của biến.', 'Bỏ điều kiện xác định của tan/cot.', 'Nhầm √3/2 với √3 khi chuyển vế.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Bảng bốn dạng', 'a. sin: hai họ, chu kỳ 2kπ, |m| ≤ 1.', 'b. cos: ±α, chu kỳ 2kπ, |m| ≤ 1.', 'c. tan: arctan m + kπ, điều kiện cos ≠ 0.', 'd. cot: arccot m + kπ, điều kiện sin ≠ 0.', '2. Quy trình 4 bước', 'a. Về dạng cơ bản → kiểm điều kiện → áp công thức → lọc nghiệm.'],
  },
  aiError: {
    category: 'Lỗi đại số', wrongSolution: 'AI giải: "tan 2x = 1 ⇒ 2x = π/4 + kπ ⇒ x = π/4 + kπ. Vậy nghiệm là x = π/4 + kπ."',
    correction: 'Phải chia cả hai vế cho 2: x = π/8 + kπ/2.',
    proof: 'Thay x = π/8: tan(π/4) = 1 ✓. Nhưng thay x = π/4 (nghiệm của AI): tan(π/2) không xác định — nghiệm AI đưa ra thậm chí không thuộc miền xác định.',
    whyAiError: 'Mô hình bỏ bước chia hệ số cho toàn bộ biểu thức nghiệm (cả phần chứa k).',
    teacherPrompt: 'Em thay x = π/4 vào phương trình để kiểm, rồi sửa lại bước chia hệ số.',
    studentProduct: 'Thẻ Đ/S + chỉ ra tan(π/2) không xác định và nghiệm đúng x = π/8 + kπ/2.',
    boardPrompt: 'AI ra x = π/4 + kπ. Thay x = π/4 thì tan bằng bao nhiêu?',
    libraryTitle: 'Lỗi AI không chia nghiệm khi có hệ số của biến',
  },
};

const L36 = {
  ...base,
  key: '11-6-36', period: 36, lessonType: 'practice',
  title: 'Ôn tập chương I — giá trị và hàm số lượng giác',
  opening: 'Hôm nay lớp mình hệ thống dấu, chu kỳ, tập xác định và tập giá trị của bốn hàm lượng giác.',
  focusQuestion: 'Chỉ cần biết góc ở phần tư nào, ta suy ra được những gì?',
  axis: `**Tình huống: Bảng điều khiển vòng quay — kim quay chỉ góc $x$, cần đọc nhanh dấu và giá trị.**

| Góc | Phần tư | Dấu sin | Dấu cos | Dấu tan |
|---|---|---|---|---|
| $200^\\circ$ | III | − | − | + |
| $-30^\\circ$ | IV | − | + | − |
| $3\\pi/4$ | II | + | − | − |

- **Kiểm chứng tay:** $\\sin200^\\circ = -\\sin20^\\circ < 0$; $\\cos(-30^\\circ) = \\cos30^\\circ = \\tfrac{\\sqrt3}{2} > 0$; $\\tan\\tfrac{3\\pi}{4} = -1 < 0$.
- **Chu kỳ:** $y = \\sin 2x$ có chu kỳ $\\pi$; $y = \\cos\\dfrac{x}{2}$ có chu kỳ $4\\pi$.
- **Tập giá trị:** $y = 3\\cos x + 1$ có tập giá trị $[-2; 4]$.
- **Tập xác định:** $y = \\tan x$ xác định khi $x \\ne \\tfrac{\\pi}{2} + k\\pi$.

**Bẫy của bài:** nhầm chu kỳ khi có hệ số; quên tập giá trị bị dịch chuyển khi cộng hằng số.`,
  goals: {
    must: 'Xác định dấu của sin, cos, tan theo phần tư và nhớ chu kỳ cơ bản.',
    should: 'Tính chu kỳ, tập xác định, tập giá trị của hàm có hệ số và phép dịch.',
    could: 'Hệ thống bảng tra bằng sơ đồ; phản biện kết luận sai tập giá trị.',
  },
  s1: {
    title: 'Đọc nhanh bảng góc',
    context: 'Ba góc 200°, −30°, 3π/4 cần xác định dấu sin, cos, tan.',
    question: 'Góc 200° thuộc phần tư nào và sin có dấu gì?',
    options: ['Phần tư II, sin dương', 'Phần tư III, sin âm', 'Phần tư IV, sin âm'],
    correct: 1,
    why: '200° nằm giữa 180° và 270° nên thuộc phần tư III; ở đó sin âm, cos âm, tan dương.',
    discuss: ['`[PHÁT HIỆN]` Chu kỳ của y = sin 2x là bao nhiêu?', '`[SO SÁNH]` Tập giá trị của 3cos x + 1 khác cos x thế nào?'],
    cue: 'Vẽ đường tròn với bốn phần tư và bảng dấu; HS điền theo nhóm.',
    lookFor: 'HS dùng phần tư để suy dấu, không học thuộc rời rạc.',
  },
  s3: {
    title: 'Hệ thống hoá bốn thuộc tính',
    steps: [
      'Dấu theo phần tư: I (+,+,+), II (+,−,−), III (−,−,+), IV (−,+,−).',
      'Chu kỳ: $y = \\sin(ax)$ có chu kỳ $\\tfrac{2\\pi}{|a|}$; tan/cot có chu kỳ $\\tfrac{\\pi}{|a|}$.',
      'Tập xác định: sin, cos xác định mọi $x$; tan loại $\\tfrac{\\pi}{2} + k\\pi$; cot loại $k\\pi$.',
      'Tập giá trị: sin, cos trong $[-1; 1]$; nhân $A$ và cộng $B$ thì thành $[B - |A|; B + |A|]$.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao chu kỳ của sin 2x là π?', '`[PHÁT HIỆN]` Tập xác định của cot 2x?'],
    cue: 'Bảng 4 cột: dấu — chu kỳ — xác định — giá trị; HS điền dần.',
    close: 'Bốn thuộc tính của hàm lượng giác được suy từ đường tròn và hệ số.',
  },
  s4: { bat: 'AI kết luận tập giá trị của $y = 3\\cos x + 1$ là $[-3; 3]$.', chung: 'Nhân 3 cho $[-3;3]$ rồi cộng 1 thành $[-2;4]$; AI quên phép dịch.', sua: 'Tập giá trị $[-2; 4]$.', cue: 'Cho HS tính giá trị tại cos = 1 và cos = −1 để thấy hai đầu mút.', lookFor: 'HS kiểm bằng hai giá trị biên.' },
  s6: { hints: { M: 'dùng bảng dấu theo phần tư.', S: 'tính chu kỳ bằng 2π/|a|, kiểm tập giá trị bằng hai đầu mút.', C: 'lập sơ đồ tra cứu cho cả bốn hàm.' }, lookFor: 'HS M đúng dấu; HS S đúng chu kỳ và tập giá trị; HS C có sơ đồ.' },
  postCheck: {
    q: 'Tìm chu kỳ và tập giá trị của $y = 2\\sin x - 3$.',
    a: 'Chu kỳ $2\\pi$; tập giá trị $[-3 - 2; -3 + 2] = [-5; -1]$.',
    ds: [{ t: '"Chu kỳ của sin 2x là 2π"', v: 'Sai — là π' }, { t: '"Tập giá trị của 3cos x + 1 là [−2; 4]"', v: 'Đúng' }, { t: '"tan x xác định với mọi x"', v: 'Sai' }],
    cue: 'Chấm chéo bảng tra.',
  },
  s8Close: 'Dấu theo phần tư — chu kỳ theo hệ số — giá trị theo biên độ và dịch.',
  s9: {
    title: 'Bảng tra cho phòng điều khiển',
    bullets: ['Kim quay chỉ 200°: sin âm, cos âm, tan dương — suy ngay từ phần tư III.', 'Hàm y = 3cos x + 1 dao động từ −2 đến 4 — dùng để đặt ngưỡng cảnh báo.', 'tan x không xác định tại 90°, 270° — phải loại khỏi bảng tra.'],
    cue: 'Hỏi: "Nếu đặt ngưỡng cảnh báo ngoài [−2;4] thì sao?" → không bao giờ kích hoạt.',
  },
  exit: ['Nêu bảng dấu sin, cos, tan theo phần tư.', 'Nêu 1 bẫy (nhầm chu kỳ; quên dịch tập giá trị).', 'Tự đánh giá M / S / C.', 'Tập giá trị của y = 3cos x + 1 là gì?'],
  exitCue: 'Mở lại bảng 4 thuộc tính ở S3.',
  after: '- HS hoàn thành phiếu ôn tập chương I; chuẩn bị tiết ôn tập phương trình lượng giác.',
  snapshot: {
    focus: 'Ôn tập giá trị và hàm số lượng giác: dấu theo phần tư (sin200° < 0, cos(−30°) > 0, tan(3π/4) = −1), chu kỳ (sin 2x có chu kỳ π), tập xác định (tan loại π/2 + kπ), tập giá trị (3cos x + 1 ∈ [−2;4])',
    formulas: ['\\text{Chu kỳ } y = \\sin(ax) \\text{ là } \\dfrac{2\\pi}{|a|}', '\\text{Chu kỳ } y = \\tan(ax) \\text{ là } \\dfrac{\\pi}{|a|}', '-1 \\le \\sin x, \\cos x \\le 1', '\\text{Tập giá trị } A\\cos x + B = [B - |A|; B + |A|]'],
    examples: [
      { question: 'Xác định dấu của sin 200°, cos(−30°), tan(3π/4).', answer: '200° thuộc phần tư III nên sin âm, cos âm, tan dương. −30° thuộc phần tư IV nên cos dương (cos30° = √3/2). 3π/4 thuộc phần tư II nên tan âm (tan(3π/4) = −1).' },
      { question: 'Tìm chu kỳ và tập giá trị của y = 3cos x + 1.', answer: 'Chu kỳ 2π (hệ số của x là 1). Tập giá trị: cos x ∈ [−1;1] ⇒ 3cos x ∈ [−3;3] ⇒ 3cos x + 1 ∈ [−2;4].' },
    ],
    exercises: [
      { level: 'NB', question: 'Xác định dấu của sin 200° và cos 200°.', answer: 'Cả hai đều âm (phần tư III).' },
      { level: 'NB', question: 'Chu kỳ của y = sin 2x là bao nhiêu?', answer: '2π/2 = π.' },
      { level: 'TH', question: 'Tìm tập xác định của y = tan x.', answer: 'ℝ \\ {π/2 + kπ, k ∈ ℤ}.' },
      { level: 'TH', question: 'Tìm tập giá trị của y = 3cos x + 1.', answer: '[−2; 4].' },
      { level: 'VD', question: 'Tìm chu kỳ của y = tan 2x và tập xác định của nó.', answer: 'Chu kỳ π/2. Tập xác định: 2x ≠ π/2 + kπ ⇒ x ≠ π/4 + kπ/2.' },
      { level: 'VD', question: 'Phản biện kết luận "tập giá trị của 2sin x − 3 là [−3; 3]".', answer: 'Sai. sin x ∈ [−1;1] ⇒ 2sin x ∈ [−2;2] ⇒ 2sin x − 3 ∈ [−5; −1]. Kết luận [−3;3] bỏ qua cả biên độ và phép dịch.' },
    ],
    quick: [
      { question: 'Vì sao hàm tan không xác định tại 90°?', solution: 'Vì tan = sin/cos và cos90° = 0, phép chia không xác định.' },
      { question: 'Tập giá trị của sin và cos là gì?', solution: '[−1; 1] — với mọi góc, giá trị sin và cos luôn nằm trong đoạn này.' },
    ],
    mistakes: ['Nhầm chu kỳ khi hàm có hệ số.', 'Quên phép dịch khi tính tập giá trị.', 'Cho rằng tan xác định với mọi x.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Dấu theo phần tư', 'a. I (+,+,+); II (+,−,−); III (−,−,+); IV (−,+,−).', '2. Chu kỳ', 'a. sin, cos: 2π/|a|.', 'b. tan, cot: π/|a|.', '3. Tập xác định', 'a. sin, cos: ℝ.', 'b. tan: loại π/2 + kπ; cot: loại kπ.', '4. Tập giá trị', 'a. sin, cos: [−1;1].', 'b. A·cos x + B: [B − |A|; B + |A|].'],
  },
  aiError: {
    category: 'Lỗi khái niệm', wrongSolution: 'AI kết luận: "Hàm số y = 3cos x + 1 có tập giá trị là [−3; 3] vì cos x nhận giá trị từ −1 đến 1 nên nhân 3 được −3 đến 3."',
    correction: 'Phải cộng thêm 1: 3cos x ∈ [−3;3] nên 3cos x + 1 ∈ [−2;4].',
    proof: 'Tính hai đầu mút: khi cos x = 1, y = 4; khi cos x = −1, y = −2. Vậy tập giá trị là [−2;4], không phải [−3;3].',
    whyAiError: 'Mô hình chỉ xử lý phép nhân hệ số mà bỏ qua phép cộng hằng số (phép dịch đồ thị).',
    teacherPrompt: 'Em tính y tại cos x = 1 và cos x = −1 rồi sửa lại tập giá trị của AI.',
    studentProduct: 'Thẻ Đ/S + hai giá trị biên 4 và −2, kết luận [−2;4].',
    boardPrompt: 'AI nói tập giá trị [−3;3]. Tính y khi cos x = 1.',
    libraryTitle: 'Lỗi AI quên phép dịch khi tìm tập giá trị hàm lượng giác',
  },
};

const L37 = {
  ...base,
  key: '11-6-37', period: 37, lessonType: 'practice',
  title: 'Ôn tập chương I — phương trình lượng giác',
  opening: 'Tiết ôn tập: lớp mình hệ thống cách đưa phương trình phức tạp về dạng cơ bản rồi lọc nghiệm.',
  focusQuestion: 'Những phép biến đổi nào an toàn và phép nào có thể làm mất nghiệm?',
  axis: `**Tình huống: Ba phương trình "trông khác nhau" nhưng đều quy về dạng cơ bản.**

| Phương trình | Biến đổi | Nghiệm |
|---|---|---|
| $2\\cos^2x - 1 = 0$ | $\\cos x = \\pm\\tfrac{\\sqrt2}{2}$ | $x = \\tfrac{\\pi}{4} + \\tfrac{k\\pi}{2}$ |
| $\\sin x + \\sqrt3\\cos x = 0$ | $\\tan x = -\\sqrt3$ | $x = -\\tfrac{\\pi}{3} + k\\pi$ |
| $\\cos 2x + 3\\cos x - 1 = 0$ | $2\\cos^2x + 3\\cos x - 2 = 0$ → $\\cos x = \\tfrac12$ | $x = \\pm\\tfrac{\\pi}{3} + 2k\\pi$ |

- **Kiểm chứng tay:** $2\\cos^2\\tfrac{\\pi}{4} - 1 = 2\\cdot\\tfrac12 - 1 = 0$ ✓. $\\sin(-\\tfrac{\\pi}{3}) + \\sqrt3\\cos(-\\tfrac{\\pi}{3}) = -\\tfrac{\\sqrt3}{2} + \\sqrt3\\cdot\\tfrac12 = 0$ ✓.
- **Phép biến đổi an toàn:** nhân/cộng hai vế với cùng một số khác 0; dùng công thức nhân đôi.
- **Phép nguy hiểm:** chia hai vế cho $\\cos x$ (hoặc $\\sin x$) mà không xét trường hợp bằng 0.

**Bẫy của bài:** chia ẩn mà không xét trường hợp 0; bỏ nghiệm khi khai căn $\\cos^2x = a$.`,
  goals: {
    must: 'Giải phương trình đưa về dạng cơ bản bằng công thức nhân đôi đơn giản.',
    should: 'Xử lý phương trình bậc hai theo một hàm lượng giác và lọc nghiệm.',
    could: 'Phân tích phép biến đổi an toàn/nguy hiểm; phản biện lời giải làm mất nghiệm.',
  },
  s1: {
    title: 'Ba phương trình, một đích',
    context: 'Ba phương trình như bảng; mục tiêu chung: đưa về sin/cos/tan cơ bản.',
    question: 'Khi giải $\\cos^2x = \\tfrac12$, vì sao phải lấy cả $\\pm$?',
    options: ['Vì cos luôn dương', 'Vì bình phương làm mất dấu, hai giá trị ±√2/2 đều cho bình phương 1/2', 'Không cần ±'],
    correct: 1,
    why: 'Bình phương là phép không ngược một-một; cả hai dấu đều thỏa.',
    discuss: ['`[PHÁT HIỆN]` Chia hai vế cho cos x có thể mất nghiệm nào?', '`[SO SÁNH]` Nghiệm của hai phương trình đầu khác nhau ở chu kỳ nào?'],
    cue: 'Nhắc quy tắc: khai căn bình phương luôn kèm ±; chia cho biểu thức chứa ẩn phải xét trường hợp bằng 0.',
    lookFor: 'HS nêu ± trước khi giải tiếp.',
  },
  s3: {
    title: 'Ba kỹ thuật biến đổi',
    steps: [
      'Dùng công thức nhân đôi để hạ bậc: $\\cos2x = 2\\cos^2x - 1$.',
      'Đưa về phương trình bậc hai theo một hàm: đặt $t = \\cos x$ (nhớ $-1 \\le t \\le 1$), giải rồi loại nghiệm ngoài đoạn.',
      'Chia hai vế cho $\\cos x$: chỉ làm khi đã chứng minh $\\cos x \\ne 0$ (xét riêng trường hợp $\\cos x = 0$).',
      'Lọc nghiệm và kiểm bằng một giá trị cụ thể.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao phải kiểm điều kiện $-1 \\le t \\le 1$ khi đặt ẩn?', '`[PHÁT HIỆN]` $\\sin x + \\sqrt3\\cos x = 0$ chia cho cos x được gì?'],
    cue: 'Khung 4 bước; cảnh báo "chia là mất nghiệm nếu không xét 0".',
    close: 'Biến đổi phải giữ nguyên tập nghiệm — mọi phép chia đều cần kiểm trường hợp 0.',
  },
  s4: { bat: 'AI chia hai vế của $\\sin x + \\sqrt3\\cos x = 0$ cho $\\cos x$ mà không xét $\\cos x = 0$, rồi kết luận chỉ có một họ nghiệm.', chung: 'Cần xét $\\cos x = 0$: khi đó $\\sin x = \\pm1$ và phương trình thành $\\pm1 = 0$ (vô nghiệm) — nên phép chia an toàn ở bài này, nhưng phải ghi lý do.', sua: 'Ghi rõ "xét cos x = 0: vô nghiệm; do đó chia được", rồi $\\tan x = -\\sqrt3$ ⇒ $x = -\\tfrac{\\pi}{3} + k\\pi$.', cue: 'Cho HS thử cos x = 0 vào phương trình để thấy vô nghiệm.', lookFor: 'HS viết bước xét trường hợp 0, không chỉ kết luận.' },
  s6: { hints: { M: 'hạ bậc bằng công thức nhân đôi, nhớ ±.', S: 'đặt t = cos x, nhớ −1 ≤ t ≤ 1.', C: 'phân tích phép chia an toàn/nguy hiểm.' }, lookFor: 'HS M đúng ±; HS S loại nghiệm ngoài đoạn; HS C nêu đúng điều kiện chia.' },
  postCheck: {
    q: 'Giải $2\\cos^2x - 1 = 0$.',
    a: '$\\cos^2x = 1/2$ ⇒ $\\cos x = \\pm\\sqrt2/2$ ⇒ $x = \\pm\\pi/4 + 2k\\pi$ hoặc $x = \\pm3\\pi/4 + 2k\\pi$; gộp lại $x = \\pi/4 + k\\pi/2$.',
    ds: [{ t: '"cos²x = 1/2 chỉ cho cos x = √2/2"', v: 'Sai — còn −√2/2' }, { t: '"Chia cho cos x luôn an toàn"', v: 'Sai — phải xét cos x = 0' }, { t: '"Nghiệm gộp của 2cos²x − 1 = 0 là π/4 + kπ/2"', v: 'Đúng' }],
    cue: 'Chấm chéo, kiểm bằng một giá trị cụ thể.',
  },
  s8Close: 'Hạ bậc — đặt ẩn có điều kiện — chia phải xét 0.',
  s9: {
    title: 'Ghi nhớ ba kỹ thuật',
    bullets: ['Công thức nhân đôi giúp hạ bậc nhanh: cos2x = 2cos²x − 1.', 'Đặt ẩn phụ phải kèm điều kiện −1 ≤ t ≤ 1.', 'Mọi phép chia cho biểu thức chứa ẩn đều cần câu "xét trường hợp bằng 0".'],
    cue: 'Hỏi: "Ba kỹ thuật này dùng cho bài nào trong đề thi?"',
  },
  exit: ['Nêu ba kỹ thuật biến đổi.', 'Nêu 1 bẫy (bỏ ±; chia mất nghiệm).', 'Tự đánh giá M / S / C.', 'Giải 2cos²x − 1 = 0.'],
  exitCue: 'Mở lại bảng ba phương trình ở mục II.',
  after: '- HS hoàn thành đề ôn chương I; chuẩn bị bài dãy số.',
  snapshot: {
    focus: 'Ôn tập phương trình lượng giác qua ba dạng: 2cos²x − 1 = 0 (x = π/4 + kπ/2), sin x + √3cos x = 0 (tan x = −√3 ⇒ x = −π/3 + kπ), cos2x + 3cos x − 1 = 0 (cos x = 1/2 ⇒ x = ±π/3 + 2kπ); rèn công thức nhân đôi, đặt ẩn có điều kiện và xét trường hợp 0 khi chia',
    formulas: ['\\cos 2x = 2\\cos^2 x - 1', 'a\\sin x + b\\cos x = 0 \\Leftrightarrow \\tan x = -\\dfrac{b}{a} \\ (\\text{xét } \\cos x = 0)', '\\cos x = t, \\ t \\in [-1;1]'],
    examples: [
      { question: 'Giải phương trình 2cos²x − 1 = 0.', answer: 'cos²x = 1/2 ⇒ cos x = ±√2/2. Với cos x = √2/2: x = ±π/4 + 2kπ; với cos x = −√2/2: x = ±3π/4 + 2kπ. Gộp: x = π/4 + kπ/2.' },
      { question: 'Giải phương trình sin x + √3cos x = 0 và giải thích bước chia.', answer: 'Xét cos x = 0: khi đó sin x = ±1, phương trình thành ±1 = 0 (vô nghiệm) ⇒ cos x ≠ 0. Chia hai vế cho cos x: tan x + √3 = 0 ⇒ tan x = −√3 ⇒ x = −π/3 + kπ.' },
    ],
    exercises: [
      { level: 'NB', question: 'Viết công thức nhân đôi của cos 2x theo cos x.', answer: 'cos 2x = 2cos²x − 1.' },
      { level: 'NB', question: 'Giải cos x = 1/2.', answer: 'x = ±π/3 + 2kπ.' },
      { level: 'TH', question: 'Giải 2cos²x − 1 = 0.', answer: 'cos x = ±√2/2 ⇒ x = π/4 + kπ/2 (gộp bốn họ).' },
      { level: 'TH', question: 'Giải sin x + √3cos x = 0.', answer: 'Xét cos x = 0 vô nghiệm; chia cho cos x được tan x = −√3 ⇒ x = −π/3 + kπ.' },
      { level: 'VD', question: 'Giải cos 2x + 3cos x − 1 = 0.', answer: '2cos²x − 1 + 3cos x − 1 = 0 ⇒ 2t² + 3t − 2 = 0 (t = cos x) ⇒ t = 1/2 hoặc t = −2 (loại). Vậy cos x = 1/2 ⇒ x = ±π/3 + 2kπ.' },
      { level: 'VD', question: 'Phản biện lời giải chia hai vế cho sin x mà không xét sin x = 0.', answer: 'Nếu sin x = 0 thì phương trình có thể có nghiệm bị bỏ. Phải xét riêng: thay sin x = 0 vào phương trình, nếu thỏa thì đó là nghiệm; nếu không thỏa mới được chia. Thiếu bước này là làm mất nghiệm.' },
    ],
    quick: [
      { question: 'Vì sao cos²x = 1/2 cho hai khả năng?', solution: 'Vì bình phương của √2/2 và −√2/2 đều bằng 1/2; khai căn phải kèm ±.' },
      { question: 'Khi đặt t = cos x, điều kiện của t là gì?', solution: '−1 ≤ t ≤ 1; nghiệm ngoài đoạn này phải loại.' },
    ],
    mistakes: ['Bỏ dấu ± khi khai căn bình phương.', 'Chia cho sin x hoặc cos x mà không xét trường hợp bằng 0.', 'Quên điều kiện −1 ≤ t ≤ 1 khi đặt ẩn.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Ba kỹ thuật', 'a. Công thức nhân đôi hạ bậc.', 'b. Đặt ẩn phụ với điều kiện [−1;1].', 'c. Chia cho biểu thức chứa ẩn: xét trường hợp 0 trước.', '2. Ba ví dụ', 'a. 2cos²x − 1 = 0 ⇒ x = π/4 + kπ/2.', 'b. sin x + √3cos x = 0 ⇒ x = −π/3 + kπ.', 'c. cos2x + 3cos x − 1 = 0 ⇒ x = ±π/3 + 2kπ.'],
  },
  aiError: {
    category: 'Thiếu điều kiện', wrongSolution: 'AI giải: "sin x + √3cos x = 0. Chia hai vế cho cos x: tan x + √3 = 0 ⇒ tan x = −√3 ⇒ x = −π/3 + kπ. Kết luận: tập nghiệm là x = −π/3 + kπ."',
    correction: 'Kết quả cuối đúng nhưng thiếu bước kiểm: phải xét cos x = 0 trước khi chia. Khi cos x = 0 thì sin x = ±1 và phương trình thành ±1 = 0 (vô nghiệm), do đó cos x ≠ 0 và phép chia hợp lệ.',
    proof: 'Nếu không xét, lời giải có thể bỏ nghiệm trong trường hợp tổng quát. Ở bài này kiểm tra cho thấy trường hợp cos x = 0 không cho nghiệm, nên việc chia an toàn — nhưng phải ghi lý do để lập luận đầy đủ.',
    whyAiError: 'Mô hình bỏ bước kiểm điều kiện chia, chỉ quan tâm kết quả cuối trùng đáp án.',
    teacherPrompt: 'Em xét trường hợp cos x = 0 rồi sửa lại lời giải AI cho đầy đủ điều kiện.',
    studentProduct: 'Thẻ Đ/S + bổ sung dòng "xét cos x = 0: vô nghiệm" trước phép chia.',
    boardPrompt: 'AI chia cho cos x ngay. Cần kiểm gì trước?',
    libraryTitle: 'Lỗi AI chia cho biểu thức chứa ẩn mà không xét trường hợp 0',
  },
};

export default [L34, L35, L36, L37];

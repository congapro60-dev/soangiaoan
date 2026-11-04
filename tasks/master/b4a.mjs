const base = {
  grade: 11, week: 5, date: '2026-11-04',
  timeMap: [
    ['HĐ 1 Khởi động — tình huống trục thực nghiệm', 'P0–P3', 'S0 0–180 + S1 180–300'],
    ['HĐ 2 Mục tiêu M/S/C', 'P3–P5', 'S2 300–420'],
    ['HĐ 3 Hình thành kiến thức + làm mẫu', 'P5–P16', 'S3 420–780'],
    ['HĐ 4 AI Error + chốt quy tắc', 'P16–P19', 'S4 1080–1320'],
    ['HĐ 5 Phân luồng M/S/C', 'P20–P22', 'S5 1320–1500'],
    ['HĐ 6 Luyện tập + post-check', 'P22–P34', 'S6 1620–2040 + S7 1620–2040'],
    ['HĐ 7 Kiểm tra nhanh', 'P34–P36', 'S8 2040–2160'],
    ['HĐ 8 Vận dụng thực tế', 'P36–P39', 'S9 2160–2340'],
    ['HĐ 9 Exit Ticket & tự đánh giá', 'P39–P40', 'S10 2340–2400'],
  ],
};

const L26 = {
  ...base,
  key: '11-5-26', period: 26, lessonType: 'formation',
  title: 'Giải phương trình lượng giác sin x = m',
  opening: 'Hôm nay lớp mình tính thời điểm cabin đu quay đạt độ cao cho trước — bài toán dẫn thẳng tới phương trình sin x = m.',
  focusQuestion: 'Vì sao phương trình sin x = m lại có vô số nghiệm và làm sao viết gọn tất cả nghiệm?',
  axis: `**Tình huống: Vòng đu quay Sun Wheel, cabin ở độ cao $h(\\theta) = 10 + 8\\sin\\theta$ (mét), $\\theta$ là góc quay tính bằng radian.**

- Cabin ở độ cao **14 m** khi $10 + 8\\sin\\theta = 14 \\Leftrightarrow \\sin\\theta = \\tfrac12$.
- Nghiệm: $\\theta = \\tfrac{\\pi}{6} + 2k\\pi$ hoặc $\\theta = \\tfrac{5\\pi}{6} + 2k\\pi$, $k \\in \\mathbb{Z}$.
- **Kiểm chứng tay:** $\\sin\\tfrac{\\pi}{6} = \\tfrac12$ ✓; $\\sin\\tfrac{5\\pi}{6} = \\sin(\\pi - \\tfrac{\\pi}{6}) = \\tfrac12$ ✓.
- **Độ cao 18 m** (đỉnh): $\\sin\\theta = 1 \\Leftrightarrow \\theta = \\tfrac{\\pi}{2} + 2k\\pi$.
- **Độ cao 26 m:** $\\sin\\theta = 2$ → **vô nghiệm** vì $-1 \\le \\sin\\theta \\le 1$.

**Bẫy của bài:** quên điều kiện $|m| \\le 1$; quên nhánh thứ hai $\\pi - \\alpha$; quên chu kỳ $2k\\pi$.`,
  goals: {
    must: 'Nhận biết điều kiện có nghiệm $|m| \\le 1$ và viết nghiệm cơ bản của $\\sin x = m$.',
    should: 'Viết đủ hai họ nghiệm, xử lý trường hợp đặc biệt $m = \\pm1, 0$, và lọc nghiệm trên khoảng cho trước.',
    could: 'Mô hình hóa bài toán độ cao/thời điểm thành $\\sin x = m$ và biện luận số nghiệm theo $m$.',
  },
  s1: {
    title: 'Cabin ở độ cao 14 m',
    context: 'h(θ) = 10 + 8sin θ. Hỏi khi nào cabin ở 14 m?',
    question: 'Phương trình 10 + 8sin θ = 14 dẫn tới phương trình lượng giác nào?',
    options: ['sin θ = 4', 'sin θ = 1/2', 'sin θ = 3'],
    correct: 1,
    why: '8sin θ = 4 nên sin θ = 1/2 — đúng điều kiện |m| ≤ 1.',
    discuss: ['`[PHÁT HIỆN]` Vì sao có hai vị trí cùng độ cao 14 m?', '`[SO SÁNH]` Độ cao 26 m có đạt được không?'],
    cue: 'Vẽ vòng tròn lượng giác, kẻ đường nằm ngang y = 1/2 — hai giao điểm chính là hai họ nghiệm.',
    lookFor: 'HS thấy hai nhánh nghiệm từ hai giao điểm.',
  },
  s3: {
    title: 'Công thức nghiệm sin x = m',
    steps: [
      'Điều kiện có nghiệm: $|m| \\le 1$. Nếu $|m| > 1$ thì phương trình vô nghiệm.',
      'Với $|m| \\le 1$, đặt $\\sin\\alpha = m$: $\\sin x = m \\Leftrightarrow x = \\alpha + 2k\\pi$ hoặc $x = \\pi - \\alpha + 2k\\pi$.',
      'Trường hợp đặc biệt: $\\sin x = 1 \\Leftrightarrow x = \\tfrac{\\pi}{2} + 2k\\pi$; $\\sin x = -1 \\Leftrightarrow x = -\\tfrac{\\pi}{2} + 2k\\pi$; $\\sin x = 0 \\Leftrightarrow x = k\\pi$.',
      'Lọc nghiệm: giải bất phương trình theo $k$ để chọn nghiệm trong khoảng bài cho.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao nhánh thứ hai là $\\pi - \\alpha$?', '`[PHÁT HIỆN]` Với $\\sin x = \\tfrac12$, nghiệm gần 0 nhất là bao nhiêu?'],
    cue: 'Khung 3 dòng: điều kiện — công thức — lọc nghiệm. Nhắc HS yếu viết "hoặc" giữa hai họ.',
    close: 'Một giá trị sin ứng với hai điểm trên đường tròn lượng giác — nên luôn có hai họ nghiệm.',
  },
  s4: { bat: 'AI chỉ viết một họ nghiệm $x = \\tfrac{\\pi}{6} + 2k\\pi$ cho $\\sin x = \\tfrac12$.', chung: 'Còn họ thứ hai $x = \\tfrac{5\\pi}{6} + 2k\\pi$; thiếu nhánh này là mất nửa tập nghiệm.', sua: '$x = \\tfrac{\\pi}{6} + 2k\\pi$ hoặc $x = \\tfrac{5\\pi}{6} + 2k\\pi$.', cue: 'Cho HS chỉ hai giao điểm trên đường tròn lượng giác để thấy hai họ.', lookFor: 'HS giải thích bằng hình tròn lượng giác.' },
  s6: { hints: { M: 'kiểm |m| ≤ 1 trước, rồi viết hai họ nghiệm.', S: 'xử lý trường hợp đặc biệt và lọc nghiệm trên khoảng.', C: 'mô hình hóa bài độ cao, biện luận theo m.' }, lookFor: 'HS M đủ hai họ; HS S lọc đúng; HS C lập luận được số nghiệm.' },
  postCheck: {
    q: 'Giải $\\sin x = -\\tfrac{\\sqrt3}{2}$.',
    a: '$x = -\\tfrac{\\pi}{3} + 2k\\pi$ hoặc $x = \\pi + \\tfrac{\\pi}{3} + 2k\\pi = \\tfrac{4\\pi}{3} + 2k\\pi$.',
    ds: [{ t: '"sin x = 2 có nghiệm"', v: 'Sai — |m| > 1' }, { t: '"sin x = 0 ⇔ x = kπ"', v: 'Đúng' }, { t: '"sin x = m luôn có đúng một họ nghiệm"', v: 'Sai — thường có hai họ' }],
    cue: 'Chiếu 2 bài, cùng kiểm bằng đường tròn lượng giác.',
  },
  s8Close: 'Điều kiện |m| ≤ 1 — hai họ nghiệm — lọc theo khoảng.',
  s9: {
    title: 'Tính thời điểm cabin đạt độ cao',
    bullets: ['Ở 14 m: góc $\\tfrac{\\pi}{6}$ và $\\tfrac{5\\pi}{6}$ (cộng $2k\\pi$) — hai vị trí đối xứng.', 'Ở 18 m: chỉ một vị trí đỉnh $\\tfrac{\\pi}{2}$ (cộng $2k\\pi$).', 'Ở 26 m: không đạt được vì sin θ = 2 vô nghiệm — đây là giới hạn vật lý của vòng quay.'],
    cue: 'Nhấn: toán cho biết giới hạn thực tế trước khi ta thử vận hành.',
  },
  exit: ['Nêu điều kiện có nghiệm của sin x = m.', 'Nêu 1 bẫy (quên nhánh π − α; quên chu kỳ).', 'Tự đánh giá M / S / C.', 'Giải sin θ = 1/2.'],
  exitCue: 'Mở lại công thức và hình tròn lượng giác ở S3.',
  after: '- HS làm bài tập SGK về phương trình sin; chuẩn bị tiết phương trình cos.',
  snapshot: {
    focus: 'Hình thành công thức nghiệm của phương trình sin x = m trên trục thực nghiệm vòng đu quay h(θ) = 10 + 8sin θ: ở 14 m được sin θ = 1/2 → θ = π/6 + 2kπ hoặc 5π/6 + 2kπ; nhận diện điều kiện |m| ≤ 1 (26 m vô nghiệm)',
    formulas: ['\\sin x = m \\ (|m| \\le 1) \\Leftrightarrow x = \\alpha + 2k\\pi \\ \\text{hoặc} \\ x = \\pi - \\alpha + 2k\\pi', '\\sin x = 1 \\Leftrightarrow x = \\tfrac{\\pi}{2} + 2k\\pi', '\\sin x = -1 \\Leftrightarrow x = -\\tfrac{\\pi}{2} + 2k\\pi', '\\sin x = 0 \\Leftrightarrow x = k\\pi'],
    examples: [
      { question: 'Cabin đu quay ở độ cao h(θ) = 10 + 8sin θ (m). Tìm θ để cabin ở độ cao 14 m.', answer: '10 + 8sin θ = 14 ⇔ sin θ = 1/2. Vì sin(π/6) = 1/2 nên θ = π/6 + 2kπ hoặc θ = π − π/6 + 2kπ = 5π/6 + 2kπ, k ∈ ℤ.' },
      { question: 'Với cùng mô hình, cabin có đạt độ cao 26 m không? Giải thích.', answer: 'Cần sin θ = (26 − 10)/8 = 2, nhưng −1 ≤ sin θ ≤ 1 nên phương trình vô nghiệm. Độ cao lớn nhất của cabin là 10 + 8 = 18 m.' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu điều kiện của m để phương trình sin x = m có nghiệm.', answer: '−1 ≤ m ≤ 1 (hay |m| ≤ 1).' },
      { level: 'NB', question: 'Giải phương trình sin x = 1/2.', answer: 'x = π/6 + 2kπ hoặc x = 5π/6 + 2kπ, k ∈ ℤ.' },
      { level: 'TH', question: 'Giải phương trình sin x = −1.', answer: 'x = −π/2 + 2kπ, k ∈ ℤ.' },
      { level: 'TH', question: 'Giải phương trình sin(2x) = sin(π/5).', answer: '2x = π/5 + 2kπ hoặc 2x = π − π/5 + 2kπ = 4π/5 + 2kπ ⇒ x = π/10 + kπ hoặc x = 2π/5 + kπ.' },
      { level: 'VD', question: 'Cabin ở độ cao 10 + 8sin θ = 14. Tìm tất cả góc θ và giải thích vì sao có hai vị trí.', answer: 'sin θ = 1/2 ⇒ θ = π/6 + 2kπ hoặc 5π/6 + 2kπ. Hai góc đối xứng qua đường kính thẳng đứng nên cùng độ cao 14 m.' },
      { level: 'VD', question: 'Tìm nghiệm của sin x = √3/2 trong khoảng [0; 2π].', answer: 'x = π/3 và x = 2π/3 (ứng với k = 0 của hai họ nghiệm).' },
    ],
    quick: [
      { question: 'Vì sao sin x = 2 vô nghiệm?', solution: 'Vì tập giá trị của sin là [−1; 1], không có góc nào có sin bằng 2.' },
      { question: 'Vì sao phương trình sin x = 1/2 có hai họ nghiệm?', solution: 'Vì đường thẳng y = 1/2 cắt đường tròn lượng giác tại hai điểm đối xứng qua trục tung, ứng với α và π − α.' },
    ],
    mistakes: ['Quên điều kiện |m| ≤ 1.', 'Chỉ viết một họ nghiệm, bỏ nhánh π − α.', 'Nhầm chu kỳ: dùng kπ thay vì 2kπ cho phương trình sin.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Điều kiện có nghiệm', 'a. |m| ≤ 1 thì có nghiệm; |m| > 1 vô nghiệm.', '2. Công thức nghiệm', 'a. sin x = m = sin α ⇔ x = α + 2kπ hoặc x = π − α + 2kπ.', 'b. Trường hợp đặc biệt: sin x = 1; −1; 0.', '3. Áp dụng đu quay', 'a. h = 10 + 8sin θ; h = 14 ⇒ sin θ = 1/2.', 'b. θ = π/6 + 2kπ hoặc 5π/6 + 2kπ.', 'c. h = 26 ⇒ sin θ = 2: vô nghiệm; độ cao tối đa 18 m.'],
  },
  aiError: {
    category: 'Thiếu điều kiện', wrongSolution: 'AI giải: "Phương trình sin x = 1/2 có nghiệm x = π/6 + 2kπ, k ∈ ℤ. Vậy tập nghiệm là S = {π/6 + 2kπ}."',
    correction: 'Thiếu họ nghiệm thứ hai: sin x = 1/2 ⇔ x = π/6 + 2kπ hoặc x = 5π/6 + 2kπ.',
    proof: 'Trên đường tròn lượng giác, đường thẳng y = 1/2 cắt đường tròn tại hai điểm: góc π/6 và góc 5π/6. Kiểm: sin(5π/6) = 1/2 ✓, nên 5π/6 + 2kπ cũng là nghiệm.',
    whyAiError: 'Mô hình chỉ lấy nghiệm từ hàm ngược (arcsin) mà bỏ qua tính tuần hoàn và tính đối xứng của hàm sin.',
    teacherPrompt: 'Em vẽ đường tròn lượng giác và kiểm xem AI bỏ sót nghiệm nào, rồi sửa lại tập nghiệm.',
    studentProduct: 'Thẻ Đ/S + vẽ hai giao điểm và bổ sung họ 5π/6 + 2kπ.',
    boardPrompt: 'AI chỉ ra một họ nghiệm cho sin x = 1/2. Còn họ nào?',
    libraryTitle: 'Lỗi AI bỏ họ nghiệm thứ hai của phương trình sin',
  },
};

const L27 = {
  ...base,
  key: '11-5-27', period: 27, lessonType: 'formation',
  title: 'Giải phương trình lượng giác cos x = m',
  opening: 'Hệ thống điều hoà của phòng học chạy theo chu kỳ cos — hôm nay lớp mình tìm thời điểm nhiệt độ đạt mức mong muốn.',
  focusQuestion: 'Vì sao công thức nghiệm của cos lại đối xứng ($\\pm\\alpha$) trong khi sin thì không?',
  axis: `**Tình huống: Nhiệt độ phòng học được điều hoà theo $T(t) = 26 + 4\\cos\\dfrac{\\pi t}{12}$ (°C), $t$ là giờ tính từ 0h.**

- **Đạt 28°C:** $26 + 4\\cos\\dfrac{\\pi t}{12} = 28 \\Leftrightarrow \\cos\\dfrac{\\pi t}{12} = \\tfrac12$.
  - $\\dfrac{\\pi t}{12} = \\pm\\dfrac{\\pi}{3} + 2k\\pi \\Rightarrow t = \\pm 4 + 24k$.
  - Trong $[0; 24]$: $t = 4$ giờ và $t = 20$ giờ.
- **Đạt 22°C:** $\\cos\\dfrac{\\pi t}{12} = -1 \\Rightarrow \\dfrac{\\pi t}{12} = \\pi + 2k\\pi \\Rightarrow t = 12 + 24k$ → $t = 12$ giờ.
- **Kiểm chứng tay:** $\\cos\\tfrac{\\pi}{3} = \\tfrac12$ ✓; $\\cos\\pi = -1$ ✓; $T(4) = 26 + 4\\cdot\\tfrac12 = 28$ ✓.
- **Đạt 31°C:** $\\cos = 1{,}25$ → **vô nghiệm** (nhiệt độ tối đa là 30°C).

**Bẫy của bài:** quên dấu $\\pm$; quên điều kiện $|m| \\le 1$; nhầm chu kỳ $k\\pi$.`,
  goals: {
    must: 'Viết đúng nghiệm $x = \\pm\\alpha + 2k\\pi$ và xử lý trường hợp đặc biệt $m = \\pm1$.',
    should: 'Lọc nghiệm theo khoảng thời gian thực tế (0–24 giờ) và giải thích ý nghĩa hai thời điểm.',
    could: 'Biện luận số nghiệm theo $m$ trong một chu kỳ; mô hình hóa bài điều hoà nhiệt độ.',
  },
  s1: {
    title: 'Nhiệt độ đạt 28°C lúc nào?',
    context: 'T(t) = 26 + 4cos(πt/12). Hỏi thời điểm T = 28°C trong ngày.',
    question: 'Phương trình 26 + 4cos(πt/12) = 28 dẫn tới điều gì?',
    options: ['cos(πt/12) = 2', 'cos(πt/12) = 1/2', 'cos(πt/12) = −1/2'],
    correct: 1,
    why: '4cos = 2 nên cos = 1/2 — thỏa |m| ≤ 1 nên có nghiệm.',
    discuss: ['`[PHÁT HIỆN]` Vì sao có hai thời điểm trong ngày?', '`[SO SÁNH]` 31°C có đạt được không?'],
    cue: 'Vẽ đồ thị cos trong 24 giờ; kẻ đường y = 1/2 để thấy hai giao điểm.',
    lookFor: 'HS thấy tính đối xứng của hai nghiệm.',
  },
  s3: {
    title: 'Công thức nghiệm cos x = m',
    steps: [
      'Điều kiện có nghiệm: $|m| \\le 1$.',
      'Với $\\cos\\alpha = m$: $\\cos x = m \\Leftrightarrow x = \\pm\\alpha + 2k\\pi$.',
      'Trường hợp đặc biệt: $\\cos x = 1 \\Leftrightarrow x = 2k\\pi$; $\\cos x = -1 \\Leftrightarrow x = \\pi + 2k\\pi$; $\\cos x = 0 \\Leftrightarrow x = \\tfrac{\\pi}{2} + k\\pi$.',
      'Lọc nghiệm theo khoảng thực tế (ví dụ $0 \\le t \\le 24$).',
    ],
    ask: ['`[SUY LUẬN]` Vì sao cos có dấu ± còn sin thì dùng π − α?', '`[PHÁT HIỆN]` Với T(t) = 28, t = 4 và t = 20 — hai thời điểm này có ý nghĩa gì?'],
    cue: 'Khung: điều kiện — ±α — lọc. Nhắc: cos đối xứng qua trục hoành nên có ±.',
    close: 'cos đối xứng qua trục ngang → hai nghiệm ±α; sin đối xứng qua trục dọc → α và π − α.',
  },
  s4: { bat: 'AI viết $t = 4 + 24k$ rồi kết luận chỉ có 4 giờ trong ngày.', chung: 'Thiếu nhánh $t = -4 + 24k$; với $k = 1$ được $t = 20$ giờ — vẫn trong ngày.', sua: '$t = \\pm4 + 24k$; trong $[0;24]$ có $t = 4$ và $t = 20$.', cue: 'Cho HS thử k = 0, 1 vào cả hai nhánh để thấy 20 giờ.', lookFor: 'HS kiểm từng giá trị k thay vì chỉ lấy k = 0.' },
  s6: { hints: { M: 'kiểm |m| ≤ 1 rồi viết ±α.', S: 'xử lý trường hợp đặc biệt, lọc theo khoảng.', C: 'biện luận số nghiệm trong một chu kỳ theo m.' }, lookFor: 'HS M viết đúng ±; HS S lọc đúng; HS C biện luận rõ.' },
  postCheck: {
    q: 'Giải $\\cos x = -\\tfrac{\\sqrt2}{2}$.',
    a: '$\\cos x = \\cos\\tfrac{3\\pi}{4} \\Rightarrow x = \\pm\\tfrac{3\\pi}{4} + 2k\\pi$.',
    ds: [{ t: '"cos x = 3/2 có nghiệm"', v: 'Sai — |m| > 1' }, { t: '"cos x = 1 ⇔ x = 2kπ"', v: 'Đúng' }, { t: '"cos x = m có nghiệm x = ±α + kπ"', v: 'Sai — phải là 2kπ' }],
    cue: 'Chiếu 2 bài, kiểm bằng đồ thị cos.',
  },
  s8Close: 'Điều kiện |m| ≤ 1 — nghiệm ±α + 2kπ — lọc theo khoảng.',
  s9: {
    title: 'Lập lịch điều hoà nhiệt độ',
    bullets: ['28°C lúc 4 giờ và 20 giờ — hai thời điểm đối xứng quanh 12 giờ.', '22°C lúc 12 giờ — mức thấp nhất trong ngày.', '30°C là cực đại tại t = 0 (24 giờ) và t = 24 — không thể đạt 31°C.'],
    cue: 'Hỏi: "Nếu muốn phòng mát trước 8 giờ, nên đặt nhiệt độ mục tiêu nào?" — dùng đồ thị để chọn.',
  },
  exit: ['Nêu công thức nghiệm cos x = m.', 'Nêu 1 bẫy (quên ±; |m| > 1).', 'Tự đánh giá M / S / C.', 'Giải cos(πt/12) = 1/2 trong [0; 24].'],
  exitCue: 'Mở lại đồ thị và công thức ở S3.',
  after: '- HS làm bài tập SGK về phương trình cos; chuẩn bị tiết đường thẳng song song mặt phẳng.',
  snapshot: {
    focus: 'Hình thành công thức nghiệm cos x = m trên trục thực nghiệm điều hoà nhiệt độ T(t) = 26 + 4cos(πt/12): đạt 28°C khi cos = 1/2 → t = 4 và t = 20 giờ; đạt 22°C tại t = 12 giờ; 31°C vô nghiệm; rèn điều kiện |m| ≤ 1 và dấu ±',
    formulas: ['\\cos x = m \\ (|m| \\le 1) \\Leftrightarrow x = \\pm\\alpha + 2k\\pi', '\\cos x = 1 \\Leftrightarrow x = 2k\\pi', '\\cos x = -1 \\Leftrightarrow x = \\pi + 2k\\pi', '\\cos x = 0 \\Leftrightarrow x = \\tfrac{\\pi}{2} + k\\pi'],
    examples: [
      { question: 'Nhiệt độ phòng T(t) = 26 + 4cos(πt/12) (°C). Tìm các thời điểm trong ngày (0 ≤ t ≤ 24) nhiệt độ đạt 28°C.', answer: '26 + 4cos(πt/12) = 28 ⇔ cos(πt/12) = 1/2 ⇔ πt/12 = ±π/3 + 2kπ ⇒ t = ±4 + 24k. Trong [0;24]: k = 0 cho t = 4; k = 1 cho t = 20 (nhánh −4 + 24 = 20). Vậy 4 giờ và 20 giờ.' },
      { question: 'Với mô hình trên, phòng có đạt 31°C không? Nhiệt độ thấp nhất là bao nhiêu?', answer: 'Cần cos(πt/12) = (31 − 26)/4 = 1,25 > 1 nên vô nghiệm. Nhiệt độ biến thiên từ 26 − 4 = 22°C đến 26 + 4 = 30°C.' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu điều kiện của m để cos x = m có nghiệm.', answer: '−1 ≤ m ≤ 1.' },
      { level: 'NB', question: 'Giải phương trình cos x = 1/2.', answer: 'x = ±π/3 + 2kπ, k ∈ ℤ.' },
      { level: 'TH', question: 'Giải phương trình cos x = −1.', answer: 'x = π + 2kπ, k ∈ ℤ.' },
      { level: 'TH', question: 'Giải phương trình cos(3x) = cos(π/4).', answer: '3x = ±π/4 + 2kπ ⇒ x = ±π/12 + 2kπ/3.' },
      { level: 'VD', question: 'Với T(t) = 26 + 4cos(πt/12), tìm t ∈ [0; 24] để T = 22°C.', answer: 'cos(πt/12) = −1 ⇔ πt/12 = π + 2kπ ⇒ t = 12 + 24k; trong [0;24] được t = 12 giờ.' },
      { level: 'VD', question: 'Tìm nghiệm của cos x = −√2/2 trong khoảng [0; π].', answer: 'x = 3π/4 (nhánh −3π/4 + 2π = 5π/4 không thuộc [0; π]).' },
    ],
    quick: [
      { question: 'Vì sao nghiệm của cos x = m có dấu ±?', solution: 'Vì hai điểm trên đường tròn lượng giác có cùng cosin đối xứng qua trục hoành, ứng với α và −α.' },
      { question: 'Chu kỳ của phương trình cos x = m là bao nhiêu?', solution: '2kπ (không phải kπ) — trừ trường hợp đặc biệt cos x = 0 dùng kπ.' },
    ],
    mistakes: ['Quên dấu ± trong nghiệm.', 'Quên điều kiện |m| ≤ 1.', 'Dùng kπ thay vì 2kπ (trừ trường hợp cos x = 0).'],
    boardKnowledge: ['II. NỘI DUNG', '1. Công thức nghiệm cos x = m', 'a. Điều kiện |m| ≤ 1.', 'b. cos x = cos α ⇔ x = ±α + 2kπ.', 'c. Đặc biệt: cos x = 1 (2kπ); −1 (π + 2kπ); 0 (π/2 + kπ).', '2. Áp dụng điều hoà nhiệt độ', 'a. T(t) = 26 + 4cos(πt/12).', 'b. T = 28 ⇒ t = 4 và t = 20 giờ.', 'c. T = 22 ⇒ t = 12 giờ; T = 31 vô nghiệm (tối đa 30°C).'],
  },
  aiError: {
    category: 'Thiếu điều kiện', wrongSolution: 'AI giải: "26 + 4cos(πt/12) = 28 ⇒ cos(πt/12) = 1/2 ⇒ πt/12 = π/3 + 2kπ ⇒ t = 4 + 24k. Trong ngày chỉ có một thời điểm t = 4 giờ."',
    correction: 'Thiếu nhánh âm: πt/12 = ±π/3 + 2kπ ⇒ t = ±4 + 24k. Với k = 0, 1 nhánh âm cho t = 20 giờ; vậy có hai thời điểm 4 giờ và 20 giờ.',
    proof: 'Kiểm trực tiếp: T(20) = 26 + 4cos(20π/12) = 26 + 4cos(5π/3) = 26 + 4·(1/2) = 28 ✓. Vậy 20 giờ chắc chắn là nghiệm bị bỏ sót.',
    whyAiError: 'Mô hình chỉ lấy nghiệm dương của hàm ngược arccos, bỏ qua tính đối xứng ±α của phương trình cos.',
    teacherPrompt: 'Em thay t = 20 vào T(t) để kiểm, rồi sửa lại tập nghiệm của AI.',
    studentProduct: 'Thẻ Đ/S + phép thử T(20) = 28 và bổ sung nhánh t = 20 giờ.',
    boardPrompt: 'AI nói chỉ có t = 4 giờ. Thử t = 20 giờ được bao nhiêu?',
    libraryTitle: 'Lỗi AI bỏ nhánh âm của phương trình cos',
  },
};

const L28 = {
  ...base,
  key: '11-5-28', period: 28, lessonType: 'formation',
  title: 'Đường thẳng song song với mặt phẳng — định nghĩa',
  opening: 'Thanh ngang của khung kệ sách và mặt sàn — hôm nay lớp mình phân loại chính xác ba vị trí tương đối của đường thẳng và mặt phẳng.',
  focusQuestion: 'Làm thế nào phân biệt "nằm trong", "cắt" và "song song" chỉ bằng số điểm chung?',
  axis: `**Tình huống: Kệ sách thư viện — thanh ngang $d$ và mặt kệ $(P)$.**

| Vị trí | Số điểm chung | Ví dụ trên kệ |
|---|---|---|
| $d \\subset (P)$ | vô số | thanh dán sát mặt kệ |
| $d$ cắt $(P)$ | đúng 1 | chân kệ xiên đâm qua mặt kệ |
| $d \\parallel (P)$ | 0 | thanh treo song song, cách mặt kệ 20 cm |

- **Kiểm chứng bằng mô hình hộp $ABCD.A′B′C′D′$** (dùng suốt tiết):
  - $AB \\subset (ABCD)$.
  - $AA′$ cắt $(ABCD)$ tại $A$.
  - $A′B′ \\parallel (ABCD)$ vì $A′B′$ không có điểm chung với $(ABCD)$.

**Bẫy của bài:** thấy đường thẳng "không cắt trong hình vẽ" đã kết luận song song — phải chứng minh **không có điểm chung**; và nhầm $d \\parallel (P)$ với $d \\parallel d′$ cho mọi $d′ \\subset (P)$.`,
  goals: {
    must: 'Nêu đúng ba vị trí tương đối và đếm số điểm chung trong mô hình hộp.',
    should: 'Phân biệt $d \\subset (P)$ với $d \\parallel (P)$ và giải thích bằng định nghĩa (không có điểm chung).',
    could: 'Tìm trong thực tế ba ví dụ cho ba vị trí; phản biện kết luận song song dựa trên hình vẽ.',
  },
  s1: {
    title: 'Thanh ngang và mặt kệ',
    context: 'Ba thanh kim loại: dán sát mặt kệ, xiên qua mặt kệ, treo song song cách 20 cm.',
    question: 'Đường thẳng song song với mặt phẳng khi nào?',
    options: ['Khi không nhìn thấy điểm cắt trên hình', 'Khi không có điểm chung với mặt phẳng', 'Khi nằm trong mặt phẳng'],
    correct: 1,
    why: 'Định nghĩa dựa trên tập điểm chung, không dựa trên hình vẽ.',
    discuss: ['`[PHÁT HIỆN]` $AB$ và $(ABCD)$ có bao nhiêu điểm chung?', '`[SO SÁNH]` $A′B′$ và $(ABCD)$ khác $AB$ ở đâu?'],
    cue: 'Cầm hai vật thật (bút và mặt bàn) minh họa ba vị trí.',
    lookFor: 'HS nói "không có điểm chung" thay vì "không cắt".',
  },
  s3: {
    title: 'Ba vị trí tương đối',
    steps: [
      '$d \\subset (P)$: mọi điểm của $d$ đều thuộc $(P)$ — vô số điểm chung.',
      '$d$ cắt $(P)$: có đúng một điểm chung (giao điểm).',
      '$d \\parallel (P)$: không có điểm chung.',
      'Ký hiệu và cách đọc: $d \\parallel (P)$ đọc là "d song song với (P)".',
    ],
    ask: ['`[SUY LUẬN]` Vì sao không thể có đúng hai điểm chung?', '`[PHÁT HIỆN]` Trong hộp $ABCD.A′B′C′D′$, kể một đường song song $(ABCD)$ khác $A′B′$.'],
    cue: 'Bảng 3 dòng: vị trí — số điểm chung — ví dụ. HS điền ví dụ.',
    close: 'Chỉ có ba khả năng: 0, 1 hoặc vô số điểm chung.',
  },
  s4: { bat: 'AI kết luận $A′C \\parallel (ABCD)$ vì "trong hình vẽ $A′C$ không cắt mặt đáy".', chung: '$A′C$ cắt $(ABCD)$ tại $C$ — nhìn hình không thấy vì $C$ nằm ở góc bị che.', sua: '$A′C$ cắt $(ABCD)$ tại $C$; đường song song phải là $A′B′$, $B′C′$, $C′D′$, $D′A′$…', cue: 'Cho HS chỉ ra điểm $C$ thuộc cả $A′C$ và $(ABCD)$.', lookFor: 'HS tìm điểm chung thay vì dựa vào hình.' },
  s6: { hints: { M: 'đếm điểm chung của đường và mặt.', S: 'phân biệt "nằm trong" với "song song".', C: 'tìm ví dụ thực tế cho cả ba vị trí.' }, lookFor: 'HS M đếm đúng; HS S phân biệt đúng; HS C có ví dụ hợp lý.' },
  postCheck: {
    q: 'Trong hộp $ABCD.A′B′C′D′$, xác định vị trí của $A′B′$ và $B′C′$ với $(ABCD)$.',
    a: 'Cả hai đều song song với $(ABCD)$: chúng nằm trong mặt $(A′B′C′D′)$ song song với $(ABCD)$ nên không có điểm chung với $(ABCD)$.',
    ds: [{ t: '"d // (P) khi d không cắt (P) trên hình vẽ"', v: 'Sai — phải không có điểm chung' }, { t: '"d ⊂ (P) là trường hợp riêng của d cắt (P)"', v: 'Sai — vô số điểm chung' }, { t: '"Có đúng 3 vị trí tương đối"', v: 'Đúng' }],
    cue: 'Mời 2 HS chỉ trên mô hình hộp.',
  },
  s8Close: 'Ba vị trí = 0, 1, vô số điểm chung.',
  s9: {
    title: 'Nhận diện trong lớp học',
    bullets: ['Mép bảng (dán tường) ⊂ mặt tường.', 'Chân bàn xiên cắt mặt sàn tại một điểm.', 'Thanh treo đèn song song với mặt sàn — không có điểm chung.'],
    cue: 'Yêu cầu HS chỉ 3 ví dụ trong lớp và gọi tên vị trí.',
  },
  exit: ['Nêu ba vị trí tương đối của đường thẳng và mặt phẳng.', 'Nêu 1 bẫy (kết luận song song theo hình vẽ).', 'Tự đánh giá M / S / C.', 'Trong hộp ABCD.A′B′C′D′, A′B′ có quan hệ gì với (ABCD)?'],
  exitCue: 'Mở lại bảng ba vị trí ở S3.',
  after: '- HS làm bài tập SGK về vị trí tương đối; chuẩn bị tiết điều kiện song song.',
  snapshot: {
    focus: 'Hình thành định nghĩa ba vị trí tương đối của đường thẳng và mặt phẳng trên mô hình kệ sách và hộp ABCD.A′B′C′D′: d ⊂ (P) (vô số điểm chung), d cắt (P) (1 điểm), d // (P) (0 điểm); phân biệt bằng số điểm chung, không dựa vào hình vẽ',
    formulas: ['d \\subset (P) \\Leftrightarrow \\text{vô số điểm chung}', 'd \\cap (P) = \\{M\\} \\Leftrightarrow \\text{đúng 1 điểm chung}', 'd \\parallel (P) \\Leftrightarrow \\text{không có điểm chung}'],
    examples: [
      { question: 'Trong hộp ABCD.A′B′C′D′, xác định vị trí tương đối của AB, AA′, A′B′ với mặt phẳng (ABCD).', answer: 'AB ⊂ (ABCD) vì cả hai đầu A, B thuộc mặt đáy. AA′ cắt (ABCD) tại A. A′B′ // (ABCD) vì A′B′ nằm trong mặt (A′B′C′D′) song song với (ABCD), không có điểm chung.' },
      { question: 'Giải thích vì sao một đường thẳng và một mặt phẳng không thể có đúng hai điểm chung.', answer: 'Nếu đường thẳng có hai điểm chung với mặt phẳng thì toàn bộ đường thẳng nằm trong mặt phẳng (vì mặt phẳng chứa đường thẳng qua hai điểm đó). Khi đó số điểm chung là vô số.' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu ba vị trí tương đối của đường thẳng d và mặt phẳng (P).', answer: 'd ⊂ (P); d cắt (P) tại một điểm; d // (P).' },
      { level: 'NB', question: 'Đường thẳng song song với mặt phẳng khi nào?', answer: 'Khi chúng không có điểm chung.' },
      { level: 'TH', question: 'Trong hộp ABCD.A′B′C′D′, đường AD′ có cắt (ABCD) không? Vì sao?', answer: 'Có, tại D: D thuộc cả AD′ và (ABCD). Vậy AD′ cắt (ABCD) tại D.' },
      { level: 'TH', question: 'Kể hai đường thẳng song song với (ABCD) trong hộp.', answer: 'A′B′ và B′C′ (cùng nằm trong (A′B′C′D′) song song với (ABCD)); còn có C′D′, D′A′.' },
      { level: 'VD', question: 'Một bạn nói: "Trong hình vẽ, d không cắt (P) nên d // (P)". Hãy phản biện.', answer: 'Hình vẽ chỉ là hình biểu diễn, có thể che khuất giao điểm. Muốn kết luận song song phải chứng minh không có điểm chung (thường qua định lí: d // d′ và d′ ⊂ (P)).' },
      { level: 'VD', question: 'Nêu ba ví dụ thực tế (trong lớp) cho ba vị trí tương đối.', answer: 'Mép bảng dán trên tường → đường nằm trong mặt phẳng; chân bàn xiên → cắt mặt sàn; thanh treo đèn → song song mặt sàn.' },
    ],
    quick: [
      { question: 'Vì sao "nằm trong" không phải là trường hợp của "song song"?', solution: 'Vì d ⊂ (P) có vô số điểm chung, còn song song là không có điểm chung — hai quan hệ khác nhau.' },
      { question: 'Có bao nhiêu vị trí tương đối của đường thẳng và mặt phẳng?', solution: 'Ba: nằm trong, cắt tại một điểm, song song.' },
    ],
    mistakes: ['Kết luận song song dựa vào hình vẽ.', 'Nhầm d ⊂ (P) với d // (P).', 'Cho rằng có thể có đúng hai điểm chung.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Ba vị trí tương đối', 'a. d ⊂ (P): vô số điểm chung.', 'b. d ∩ (P) = {M}: đúng một điểm chung.', 'c. d // (P): không có điểm chung.', '2. Mô hình hộp ABCD.A′B′C′D′', 'a. AB ⊂ (ABCD).', 'b. AA′ cắt (ABCD) tại A.', 'c. A′B′ // (ABCD).', '3. Lưu ý', 'a. Không kết luận song song từ hình vẽ.', 'b. Chỉ có ba khả năng về số điểm chung.'],
  },
  aiError: {
    category: 'Lỗi khái niệm', wrongSolution: 'AI kết luận: "Trong hình hộp ABCD.A′B′C′D′, đường chéo A′C không cắt mặt phẳng (ABCD) trên hình vẽ nên A′C song song với (ABCD)."',
    correction: 'A′C cắt (ABCD) tại C, vì C thuộc cả đường A′C và mặt phẳng (ABCD). Do đó A′C không song song với (ABCD).',
    proof: 'Điểm C nằm trên A′C (là đầu mút) và nằm trong (ABCD) (là một đỉnh của đáy). Vậy giao điểm tồn tại, chỉ bị che khuất trong hình biểu diễn.',
    whyAiError: 'Mô hình suy luận từ hình biểu diễn 2D thay vì kiểm tra điểm chung trong không gian.',
    teacherPrompt: 'Em tìm một điểm chung giữa A′C và (ABCD) rồi sửa lại kết luận của AI.',
    studentProduct: 'Thẻ Đ/S + chỉ ra C là điểm chung, kết luận A′C cắt (ABCD).',
    boardPrompt: 'AI nói A′C // (ABCD) vì "không thấy cắt". Điểm nào phản bác?',
    libraryTitle: 'Lỗi AI kết luận song song từ hình biểu diễn',
  },
};

const L29 = {
  ...base,
  key: '11-5-29', period: 29, lessonType: 'formation',
  title: 'Đường thẳng song song với mặt phẳng — điều kiện',
  opening: 'Muốn chứng minh một thanh kệ song song với mặt kệ mà không đo khoảng cách, ta dùng một thanh khác làm "nhân chứng".',
  focusQuestion: 'Vì sao chỉ cần tìm một đường thẳng song song nằm trong mặt phẳng là đủ để kết luận?',
  axis: `**Tình huống: Chứng minh thanh $AB$ song song với mặt kệ $(P)$ nhờ một thanh $CD$ đã biết nằm trong $(P)$.**

- **Định lí (điều kiện đủ):** nếu $d \\not\\subset (P)$ và $d \\parallel d′$ với $d′ \\subset (P)$ thì $d \\parallel (P)$.
- **Áp dụng hộp $ABCD.A′B′C′D′$:**
  - $AB \\parallel A′B′$ và $A′B′ \\subset (A′B′C′D′)$; $AB \\not\\subset (A′B′C′D′)$ → $AB \\parallel (A′B′C′D′)$.
  - $AD \\parallel BC$ và $BC \\subset (SBC)$? (không dùng) — thay bằng: $AD \\parallel B′C′$ và $B′C′ \\subset (A′B′C′D′)$ → $AD \\parallel (A′B′C′D′)$.
- **Kiểm chứng tay:** $AB$ và $A′B′$ cùng phương, cùng độ dài 1 cạnh hộp; $A′B′$ nằm trong mặt trên nên $AB$ không thể cắt mặt trên.

**Bẫy của bài:** quên điều kiện $d \\not\\subset (P)$ (nếu $d \\subset (P)$ thì không thể song song); chọn $d′$ không nằm trong $(P)$.`,
  goals: {
    must: 'Phát biểu định lí điều kiện và áp dụng cho một cặp đường – mặt đơn giản.',
    should: 'Trình bày chứng minh 3 bước: chỉ ra $d \\parallel d′$, $d′ \\subset (P)$, $d \\not\\subset (P)$.',
    could: 'Chứng minh trong hình chóp/hộp phức tạp hơn; phản biện chứng minh thiếu điều kiện.',
  },
  s1: {
    title: 'Cần một "nhân chứng" trong mặt phẳng',
    context: 'Thanh AB cần chứng minh song song mặt kệ (P); trong (P) có thanh CD song song AB.',
    question: 'Để kết luận $AB \\parallel (P)$, cần thêm điều kiện nào?',
    options: ['AB phải nằm trong (P)', 'AB không nằm trong (P) và AB // CD với CD ⊂ (P)', 'Chỉ cần AB // CD'],
    correct: 1,
    why: 'Định lí yêu cầu đủ hai điều: đường nằm ngoài mặt phẳng và có đường song song nằm trong mặt phẳng.',
    discuss: ['`[PHÁT HIỆN]` Nếu AB nằm trong (P) thì kết luận gì?', '`[SO SÁNH]` Vì sao cần điều kiện "không nằm trong"?'],
    cue: 'Viết định lí thành 3 dòng đánh số; HS đối chiếu từng dòng với hình.',
    lookFor: 'HS nhắc đủ hai điều kiện.',
  },
  s3: {
    title: 'Định lí và quy trình 3 bước',
    steps: [
      'Tìm đường $d′ \\subset (P)$ sao cho $d \\parallel d′$.',
      'Kiểm tra $d \\not\\subset (P)$.',
      'Kết luận $d \\parallel (P)$ theo định lí.',
      'Ghi rõ căn cứ từng bước (song song do hình bình hành/hộp, thuộc mặt do giả thiết).',
    ],
    ask: ['`[SUY LUẬN]` Vì sao $AB \\parallel A′B′$ trong hộp?', '`[PHÁT HIỆN]` Nếu chọn $d′ = A′D′$ thì có kết luận được $AB \\parallel (A′B′C′D′)$ không?'],
    cue: 'Khung 3 bước; nhắc HS yếu luôn viết dòng "d ⊄ (P)" trước khi kết luận.',
    close: 'Muốn chứng minh song song, hãy tìm một "nhân chứng" nằm trong mặt phẳng.',
  },
  s4: { bat: 'AI kết luận $AB \\parallel (A′B′C′D′)$ nhưng chỉ nêu $AB \\parallel A′B′$, thiếu $A′B′ \\subset (A′B′C′D′)$ và $AB \\not\\subset$ mặt đó.', chung: 'Thiếu căn cứ thì lập luận chưa hợp lệ, dù kết quả đúng.', sua: 'Bổ sung đủ 3 dòng: $AB \\parallel A′B′$; $A′B′ \\subset (A′B′C′D′)$; $AB \\not\\subset (A′B′C′D′)$ → kết luận.', cue: 'Cho HS chấm chéo theo 3 dòng, thiếu dòng nào trừ điểm dòng đó.', lookFor: 'HS kiểm đủ 3 điều kiện.' },
  s6: { hints: { M: 'chỉ ra đường song song nằm trong mặt phẳng trước.', S: 'viết đủ 3 dòng chứng minh.', C: 'làm bài trong hình chóp, chú ý đường trung bình.' }, lookFor: 'HS M tìm được nhân chứng; HS S đủ 3 dòng; HS C dùng được tính chất đường trung bình.' },
  postCheck: {
    q: 'Trong hộp $ABCD.A′B′C′D′$, chứng minh $AD \\parallel (A′B′C′D′)$.',
    a: 'Có $AD \\parallel A′D′$ (cạnh tương ứng của hộp), $A′D′ \\subset (A′B′C′D′)$, và $AD \\not\\subset (A′B′C′D′)$. Theo định lí, $AD \\parallel (A′B′C′D′)$.',
    ds: [{ t: '"Chỉ cần d // d′ là đủ"', v: 'Sai — cần d′ ⊂ (P) và d ⊄ (P)' }, { t: '"Nếu d ⊂ (P) thì d không thể song song (P)"', v: 'Đúng' }, { t: '"Định lí cho điều kiện đủ, không cần thiết"', v: 'Đúng' }],
    cue: 'Chiếu 2 bài chứng minh, chấm theo 3 dòng.',
  },
  s8Close: 'Ba dòng: song song — nằm trong — không nằm trong.',
  s9: {
    title: 'Ứng dụng vào kệ sách thật',
    bullets: ['Thanh AB // thanh CD (đã gắn trong mặt kệ) và AB không nằm trong mặt kệ → AB // (P).', 'Vì AB // (P) nên AB không bao giờ chạm mặt kệ, dù kéo dài — đảm bảo an toàn khi lắp.', 'Sai điều kiện "không nằm trong": thanh dán sát mặt kệ sẽ nằm trong (P) chứ không song song.'],
    cue: 'Liên hệ tiêu chuẩn lắp đặt: song song nghĩa là khoảng cách không đổi.',
  },
  exit: ['Phát biểu định lí điều kiện song song.', 'Nêu 1 bẫy (thiếu d ⊄ (P); chọn d′ không nằm trong (P)).', 'Tự đánh giá M / S / C.', 'Trong hộp, AB // A′B′ và A′B′ ⊂ (A′B′C′D′). Kết luận gì?'],
  exitCue: 'Mở lại khung 3 bước ở S3.',
  after: '- HS làm bài tập SGK về chứng minh song song; chuẩn bị tiết tính chất.',
  snapshot: {
    focus: 'Hình thành định lí điều kiện đường thẳng song song mặt phẳng (d ⊄ (P), d // d′, d′ ⊂ (P) ⇒ d // (P)) và quy trình chứng minh 3 bước, áp dụng trên hộp ABCD.A′B′C′D′ (AB // A′B′ ⊂ (A′B′C′D′) ⇒ AB // (A′B′C′D′))',
    formulas: ['d \\not\\subset (P), \\ d \\parallel d′, \\ d′ \\subset (P) \\Rightarrow d \\parallel (P)', '\\text{Quy trình: tìm } d′ \\to \\text{kiểm } d \\not\\subset (P) \\to \\text{kết luận}'],
    examples: [
      { question: 'Trong hộp ABCD.A′B′C′D′, chứng minh AB song song với (A′B′C′D′).', answer: 'AB // A′B′ (hai cạnh tương ứng của hình hộp). A′B′ ⊂ (A′B′C′D′). AB ⊄ (A′B′C′D′) vì A, B thuộc mặt đáy. Theo định lí, AB // (A′B′C′D′).' },
      { question: 'Vì sao cần điều kiện d ⊄ (P) trong định lí? Cho ví dụ.', answer: 'Nếu d ⊂ (P) thì d có vô số điểm chung với (P) nên không thể song song. Ví dụ AB // CD và CD ⊂ (ABCD), nhưng AB ⊂ (ABCD) nên AB không song song (ABCD).' },
    ],
    exercises: [
      { level: 'NB', question: 'Phát biểu định lí điều kiện để d // (P).', answer: 'Nếu d không nằm trong (P) và d song song với một đường d′ nằm trong (P) thì d song song với (P).' },
      { level: 'NB', question: 'Nêu ba bước chứng minh d // (P).', answer: 'Tìm d′ ⊂ (P) với d // d′; kiểm d ⊄ (P); kết luận d // (P).' },
      { level: 'TH', question: 'Trong hộp, chứng minh A′B′ // (ABCD).', answer: 'A′B′ // AB, AB ⊂ (ABCD), A′B′ ⊄ (ABCD) → A′B′ // (ABCD).' },
      { level: 'TH', question: 'Trong hộp, chứng minh B′C′ // (ABCD).', answer: 'B′C′ // BC, BC ⊂ (ABCD), B′C′ ⊄ (ABCD) → B′C′ // (ABCD).' },
      { level: 'VD', question: 'Cho hình chóp S.ABCD có M, N là trung điểm SA, SB. Chứng minh MN // (ABCD).', answer: 'MN là đường trung bình của tam giác SAB nên MN // AB. Mà AB ⊂ (ABCD) và MN ⊄ (ABCD) (M, N không thuộc mặt đáy). Vậy MN // (ABCD).' },
      { level: 'VD', question: 'Phản biện chứng minh chỉ ghi "MN // AB nên MN // (ABCD)".', answer: 'Thiếu hai căn cứ: AB phải nằm trong (ABCD) và MN phải không nằm trong (ABCD). Nếu thiếu, lập luận không hợp lệ dù kết quả đúng.' },
    ],
    quick: [
      { question: 'Vì sao cần d ⊄ (P)?', solution: 'Vì nếu d nằm trong (P) thì d có vô số điểm chung, không thể song song.' },
      { question: 'Trong hình chóp, đường trung bình của tam giác bên thường song song với mặt đáy — vì sao?', solution: 'Đường trung bình song song với cạnh đáy, mà cạnh đáy nằm trong mặt đáy; đường trung bình không nằm trong mặt đáy nên song song với mặt đáy.' },
    ],
    mistakes: ['Bỏ điều kiện d ⊄ (P).', 'Chọn d′ không nằm trong (P).', 'Kết luận song song mà không nêu căn cứ song song của d và d′.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Định lí điều kiện', 'a. d ⊄ (P), d // d′, d′ ⊂ (P) ⇒ d // (P).', 'b. Đây là điều kiện đủ, dùng để chứng minh.', '2. Quy trình 3 bước', 'a. Tìm d′ ⊂ (P) sao cho d // d′.', 'b. Kiểm d ⊄ (P).', 'c. Kết luận d // (P).', '3. Áp dụng', 'a. Hộp: AB // A′B′ ⊂ (A′B′C′D′) ⇒ AB // (A′B′C′D′).', 'b. Hình chóp: đường trung bình MN // AB ⊂ (ABCD) ⇒ MN // (ABCD).'],
  },
  aiError: {
    category: 'Thiếu điều kiện', wrongSolution: 'AI chứng minh: "Vì MN // AB nên MN // (ABCD)." (không nêu AB ⊂ (ABCD) và MN ⊄ (ABCD) — trong đó M, N là trung điểm SA, SB của hình chóp S.ABCD).',
    correction: 'Phải ghi đủ: MN // AB (đường trung bình tam giác SAB); AB ⊂ (ABCD); MN ⊄ (ABCD). Khi đó mới kết luận MN // (ABCD) theo định lí.',
    proof: 'Nếu chỉ có MN // AB thì chưa đủ: AB có thể không nằm trong (ABCD) (khi đó không kết luận được), hoặc MN có thể nằm trong (ABCD) (khi đó MN cắt mặt phẳng tại vô số điểm). Đủ ba điều kiện mới suy ra được.',
    whyAiError: 'Mô hình rút gọn chứng minh, bỏ các tiền đề kiểm tra được coi là "hiển nhiên" — nhưng chính các tiền đề đó làm lập luận hợp lệ.',
    teacherPrompt: 'Em liệt kê đủ ba điều kiện của định lí rồi sửa lại chứng minh của AI.',
    studentProduct: 'Thẻ Đ/S + viết lại chứng minh 3 dòng có căn cứ cho từng dòng.',
    boardPrompt: 'AI chỉ ghi "MN // AB nên MN // (ABCD)". Thiếu gì?',
    libraryTitle: 'Lỗi AI rút gọn chứng minh song song, bỏ tiền đề',
  },
};

export default [L26, L27, L28, L29];

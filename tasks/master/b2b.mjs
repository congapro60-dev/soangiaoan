const base = {
  grade: 10, week: 5, date: '2026-11-04',
  timeMap: [
    ['HĐ 1 Khởi động — nhắc tình huống thực nghiệm', 'P0–P3', 'S0 0–180 + S1 180–300'],
    ['HĐ 2 Chọn tuyến ôn theo nhu cầu', 'P3–P5', 'S2 300–480'],
    ['HĐ 3 Chữa mẫu 1 bài + chốt công cụ', 'P5–P16', 'S3 480–960'],
    ['HĐ 4 AI Error + chốt bẫy', 'P16–P19', 'S4 960–1140 + S5 1140–1200'],
    ['HĐ 5 Luyện tập cá nhân theo 3 tuyến', 'P20–P27', 'S6 1200–1620'],
    ['HĐ 6 Post-check & ĐGTX', 'P27–P30', 'S7 1620–1800'],
    ['HĐ 7 Kiểm tra nhanh', 'P30–P35', 'S8 1800–2100'],
    ['HĐ 8 Vận dụng thực tế', 'P35–P38', 'S9 2100–2280'],
    ['HĐ 9 Exit Ticket & dặn dò', 'P38–P40', 'S10 2280–2400'],
  ],
};

const L35 = {
  ...base,
  key: '10-5-35', period: 35, lessonType: 'practice',
  title: 'Luyện tập công thức diện tích tam giác',
  opening: 'Hôm nay lớp mình tính diện tích ba mảnh vườn của trường để mua hạt giống đúng lượng.',
  focusQuestion: 'Với mỗi mảnh vườn, dữ kiện nào quyết định việc chọn công thức?',
  axis: `**Tình huống: Ba mảnh vườn của trường cần tính diện tích (m²) để mua hạt giống.**

| Mảnh | Dữ kiện | Tính | Kết quả |
|---|---|---|---|
| Vườn rau | $a = 12$ m, $h_a = 5$ m | $\\tfrac12 a h_a$ | $30$ m² |
| Vườn hoa | $b = 10$ m, $c = 6$ m, $A = 30^\\circ$ | $\\tfrac12 bc\\sin A$ | $15$ m² |
| Sân cỏ | $a = 6$, $b = 8$, $c = 10$, $R = 5$ | $\\dfrac{abc}{4R}$ | $24$ m² |

**Kiểm chứng tay:**
- Vườn rau: $\\tfrac12\\cdot12\\cdot5 = 30$ ✓
- Vườn hoa: $\\tfrac12\\cdot10\\cdot6\\cdot0{,}5 = 15$ ✓
- Sân cỏ: $480/20 = 24$ ✓ (và $\\tfrac12\\cdot6\\cdot8 = 24$ vì tam giác vuông)

**Bẫy của bài:** quên $\\tfrac12$; dùng $\\cos$; dùng $\\dfrac{abc}{4R}$ khi chưa biết $R$; đơn vị m² thay vì m.`,
  goals: {
    must: 'Áp dụng đúng $S = \\tfrac12 a h_a$ và $S = \\tfrac12 ab\\sin C$ cho dữ kiện cho trước.',
    should: 'Chọn công thức theo dữ kiện, tính đúng cả ba mảnh vườn và kiểm tra chéo kết quả.',
    could: 'Giải bài toán ngược tìm $R$, tìm chiều cao; phản biện lời giải sai công thức hoặc sai đơn vị.',
  },
  s1: {
    title: 'Ba mảnh vườn, ba bộ dữ kiện',
    context: 'Vườn rau biết đáy và chiều cao; vườn hoa biết hai cạnh và góc xen giữa; sân cỏ biết ba cạnh và bán kính ngoại tiếp R = 5 m.',
    question: 'Mảnh nào dùng được ngay công thức S = abc/(4R)?',
    options: ['Vườn rau', 'Vườn hoa', 'Sân cỏ'],
    correct: 2,
    why: 'Chỉ sân cỏ có đủ ba cạnh và bán kính ngoại tiếp; hai mảnh còn lại thiếu R.',
    discuss: ['`[SO SÁNH]` Vườn rau và vườn hoa đều ra 30 và 15 m² — bộ dữ kiện khác nhau có ảnh hưởng kết quả không?', '`[PHÁT HIỆN]` Đơn vị của diện tích là gì?'],
    cue: 'Ghi 3 công thức + 3 bộ dữ kiện thành 2 cột, yêu cầu HS nối trước khi tính.',
    lookFor: 'HS nối đúng dữ kiện với công thức, không tính mò.',
  },
  s3: {
    title: 'Chữa mẫu và chốt cách chọn công thức',
    steps: [
      'Vườn rau: $S = \\tfrac12\\cdot12\\cdot5 = 30$ m².',
      'Vườn hoa: $S = \\tfrac12\\cdot10\\cdot6\\cdot\\sin30^\\circ = 15$ m².',
      'Sân cỏ: $S = \\dfrac{6\\cdot8\\cdot10}{4\\cdot5} = 24$ m², kiểm chéo $\\tfrac12\\cdot6\\cdot8 = 24$ m² (tam giác vuông).',
      'Luôn ghi đơn vị m² và kiểm tra bằng một cách thứ hai nếu có thể.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao sân cỏ kiểm chéo được bằng ½·6·8?', '`[PHÁT HIỆN]` Nếu R sai (ví dụ R = 4) thì diện tích sai bao nhiêu?'],
    cue: 'Khung: "dữ kiện → công thức → thay số → đơn vị". Nhắc HS yếu bước đơn vị.',
    close: 'Cùng một đại lượng diện tích nhưng ba con đường tính — chọn đường ngắn nhất với dữ kiện đang có.',
  },
  s4: { bat: 'AI tính diện tích tam giác vuông bằng ½·a·b·cos C với C = 90°, ra 0 m².', chung: 'Tam giác có hai cạnh góc vuông 6 và 8 thì diện tích phải là 24 m², không thể bằng 0.', sua: 'Dùng $S = \\tfrac12 ab\\sin C$: $\\sin90^\\circ = 1$ nên $S = 24$ m².', cue: 'Cho HS vẽ tam giác vuông 6–8–10 và ước lượng diện tích bằng ô vuông để thấy 0 là vô lý.', lookFor: 'HS dùng hình học để bác bỏ kết quả, không chỉ so công thức.' },
  s6: { hints: { M: 'khoanh dữ kiện rồi mới chọn công thức; nhớ ½ và đơn vị.', S: 'tính xong kiểm chéo bằng cách thứ hai nếu được.', C: 'bài ngược: từ S suy ra R hoặc chiều cao, chú ý điều kiện dương.' }, lookFor: 'HS M làm đúng 2 bài đầu; HS S kiểm chéo; HS C giải được bài ngược.' },
  postCheck: {
    q: 'Mảnh vườn có $a = 13$, $b = 14$, $c = 15$ và diện tích $S = 84$ m². Tính bán kính đường tròn ngoại tiếp $R$.',
    a: 'Từ $S = \\dfrac{abc}{4R}$ suy ra $R = \\dfrac{abc}{4S} = \\dfrac{13\\cdot14\\cdot15}{4\\cdot84} = \\dfrac{2730}{336} = 8{,}125$ m.',
    ds: [{ t: '"S = ½ab cos C"', v: 'Sai' }, { t: '"Thiếu ½ thì diện tích gấp đôi"', v: 'Đúng' }, { t: '"Diện tích luôn nhỏ hơn hoặc bằng ½ tích hai cạnh kề"', v: 'Đúng — vì sin C ≤ 1' }],
    cue: 'Chiếu 2 phiếu và kiểm bằng công thức ngược.',
  },
  s8Close: 'Dữ kiện → công thức → ½ và đơn vị.',
  s9: {
    title: 'Mua hạt giống',
    bullets: ['Tổng diện tích ba mảnh: 30 + 15 + 24 = 69 m².', 'Nếu 1 m² cần 20 g hạt: 69 × 20 = 1380 g = 1,38 kg.', 'Sai đơn vị (m thay vì m²) sẽ khiến lượng hạt sai hoàn toàn — kiểm đơn vị là bước bắt buộc.'],
    cue: 'Hỏi HS: nếu quên ½ ở vườn hoa thì lượng hạt sai bao nhiêu? → gấp đôi mảnh đó (30 m² thay vì 15 m²).',
  },
  exit: ['Nêu ba công thức diện tích tam giác.', 'Nêu 1 bẫy (quên ½; dùng cos; sai đơn vị).', 'Tự đánh giá M / S / C.', 'Tính diện tích sân cỏ (6, 8, 10, R = 5).'],
  exitCue: 'Mở lại bảng ba mảnh vườn ở mục II.',
  after: '- HS hoàn thành bài tập SGK/SBT về diện tích tam giác; chuẩn bị tiết ôn tập chương III.',
  snapshot: {
    focus: 'Luyện tập chọn và vận dụng công thức diện tích tam giác trên trục thực nghiệm ba mảnh vườn của trường: ½ah_a = 30 m², ½bc·sin A = 15 m², abc/(4R) = 24 m²; rèn kiểm tra chéo và đơn vị m²',
    formulas: ['S = \\dfrac12 a h_a', 'S = \\dfrac12 ab\\sin C', 'S = \\dfrac{abc}{4R}', 'S \\le \\dfrac12 bc \\ (\\text{vì } \\sin A \\le 1)'],
    examples: [
      { question: 'Vườn rau có đáy a = 12 m, chiều cao h_a = 5 m. Tính diện tích và nêu đơn vị.', answer: 'S = ½·12·5 = 30 m². Đơn vị diện tích là bình phương đơn vị độ dài (m²), không phải m.' },
      { question: 'Vườn hoa có b = 10 m, c = 6 m, góc xen giữa A = 30°. Tính diện tích.', answer: 'S = ½·b·c·sin A = ½·10·6·sin30° = 30·0,5 = 15 m².' },
    ],
    exercises: [
      { level: 'NB', question: 'Tính diện tích tam giác có đáy a = 8 cm và chiều cao h_a = 3 cm.', answer: 'S = ½·8·3 = 12 cm².' },
      { level: 'NB', question: 'Biết hai cạnh a, b và góc xen giữa C, viết công thức diện tích.', answer: 'S = ½·a·b·sin C.' },
      { level: 'TH', question: 'Tính diện tích tam giác có a = 7 cm, b = 9 cm, góc xen giữa C = 90°.', answer: 'S = ½·7·9·sin90° = 31,5 cm².' },
      { level: 'TH', question: 'Tam giác có a = 6 cm, b = 8 cm, c = 10 cm, bán kính ngoại tiếp R = 5 cm. Tính diện tích bằng công thức abc/(4R) và kiểm tra lại.', answer: 'S = (6·8·10)/(4·5) = 24 cm². Kiểm tra: 6² + 8² = 10² nên tam giác vuông, S = ½·6·8 = 24 cm² ✓.' },
      { level: 'VD', question: 'Cho b = √37, c = 5 và cos A = 3/5. Tính diện tích tam giác.', answer: 'Từ cos A = 3/5 suy ra sin A = 4/5 (A nhọn). S = ½·b·c·sin A = ½·√37·5·(4/5) = 2√37 ≈ 12,17 (đơn vị diện tích).' },
      { level: 'VD', question: 'Mảnh vườn có a = 13 m, b = 14 m, c = 15 m và diện tích 84 m². Tính bán kính đường tròn ngoại tiếp.', answer: 'R = abc/(4S) = (13·14·15)/(4·84) = 2730/336 = 8,125 m.' },
    ],
    quick: [
      { question: 'Quên hệ số ½ trong S = ½bc·sin A thì diện tích sai thế nào?', solution: 'Diện tích bị gấp đôi; với tam giác 6–8–10 sẽ ra 48 m² thay vì 24 m².' },
      { question: 'Diện tích tam giác có vượt quá ½ tích hai cạnh kề không? Vì sao?', solution: 'Không, vì S = ½bc·sin A và sin A ≤ 1 nên S ≤ ½bc; dấu bằng khi A = 90°.' },
    ],
    mistakes: ['Quên hệ số ½.', 'Dùng cos thay vì sin của góc xen giữa.', 'Dùng abc/(4R) khi chưa biết R.', 'Ghi đơn vị m thay vì m².'],
    boardKnowledge: ['II. NỘI DUNG', '1. Ba công thức diện tích', 'a. S = ½·a·h_a.', 'b. S = ½·a·b·sin C.', 'c. S = abc/(4R).', '2. Trục thực nghiệm ba mảnh vườn', 'a. Vườn rau: ½·12·5 = 30 m².', 'b. Vườn hoa: ½·10·6·sin30° = 15 m².', 'c. Sân cỏ: 6·8·10/(4·5) = 24 m².', '3. Kiểm tra', 'a. Ước lượng: S ≤ ½ tích hai cạnh kề.', 'b. Kiểm chéo bằng công thức khác khi có đủ dữ kiện.'],
  },
  aiError: {
    category: 'Lỗi khái niệm', wrongSolution: 'AI giải: "Tam giác vuông có hai cạnh góc vuông a = 6, b = 8 và góc xen giữa C = 90°. Áp dụng S = ½·a·b·cos C = ½·6·8·cos90° = 24·0 = 0. Vậy diện tích tam giác bằng 0."',
    correction: 'Công thức đúng là S = ½·a·b·sin C. Với C = 90°: S = ½·6·8·sin90° = 24 (đơn vị diện tích).',
    proof: 'Tam giác vuông có hai cạnh góc vuông 6 và 8 thì chiếm một nửa hình chữ nhật 6×8, diện tích 24 — không thể bằng 0. Kết quả 0 chỉ ra công thức bị dùng sai hàm lượng giác.',
    whyAiError: 'Mô hình chọn nhầm cos thay vì sin trong công thức diện tích, rồi không kiểm tra tính hợp lý của kết quả bằng hình học.',
    teacherPrompt: 'Em kiểm tra kết quả 0 m² của AI bằng cách vẽ tam giác 6–8–10. Sai ở đâu và sửa công thức thế nào?',
    studentProduct: 'Thẻ Đ/S + sửa công thức thành sin và tính lại 24 (đơn vị diện tích).',
    boardPrompt: 'AI ra diện tích 0 cho tam giác 6–8–10. Vô lý ở đâu?',
    libraryTitle: 'Lỗi AI dùng cos khiến diện tích tam giác vuông bằng 0',
  },
};

const L36 = {
  ...base,
  key: '10-5-36', period: 36, lessonType: 'practice',
  title: 'Ôn tập chương III — hệ thức lượng trong tam giác',
  opening: 'Hôm nay lớp mình hệ thống lại "bộ đồ nghề" đo đạc tam giác để chuẩn bị đo sân trường.',
  focusQuestion: 'Với một tam giác, dữ kiện nào dẫn tới định lý côsin, định lý sin, hay công thức diện tích?',
  axis: `**Tình huống: Đo đạc sân trường — tam giác $ABC$ với các khoảng cách đo được.**

- **Ví dụ 1 (đo hai cạnh và góc xen giữa):** $b = 5$ m, $c = 7$ m, $A = 60^\\circ$.
  - $a^2 = 25 + 49 - 2\\cdot5\\cdot7\\cdot\\cos60^\\circ = 74 - 35 = 39 \\Rightarrow a = \\sqrt{39} \\approx 6{,}24$ m.
  - $S = \\tfrac12\\cdot5\\cdot7\\cdot\\sin60^\\circ = \\tfrac{35\\sqrt3}{4} \\approx 15{,}16$ m².
- **Ví dụ 2 (đo một cạnh và góc đối diện):** $a = 8$ m, $A = 30^\\circ$ → $2R = \\dfrac{a}{\\sin A} = \\dfrac{8}{0{,}5} = 16 \\Rightarrow R = 8$ m.
- **Kiểm chứng tay trường hợp góc tù:** $b = 6$, $c = 8$, $A = 120^\\circ$: $a^2 = 36 + 64 - 96\\cdot(-\\tfrac12) = 148 \\Rightarrow a = 2\\sqrt{37} \\approx 12{,}17$.
- **Nhận xét kiểm tra:** cạnh đối diện góc tù phải là cạnh lớn nhất ($a \\approx 12{,}17 > 8$).

**Bẫy của bài:** nhầm dấu $\\cos$ khi góc tù; dùng định lý sin khi thiếu cặp cạnh–góc đối diện; nhầm $R$ với $2R$.`,
  goals: {
    must: 'Viết đúng định lý côsin, định lý sin và công thức diện tích; áp dụng cho dữ kiện đơn giản.',
    should: 'Chọn đúng định lý theo dữ kiện, tính $a$, $S$, $R$ chính xác và kiểm tra bằng bất đẳng thức cạnh–góc.',
    could: 'Giải bài toán đo đạc thực tế (tàu, sân trường) và phản biện lời giải sai dấu côsin.',
  },
  s1: {
    title: 'Chọn đúng "đồ nghề" đo tam giác',
    context: 'Đo sân trường: biết hai cạnh và góc xen giữa; hoặc biết một cạnh và góc đối diện; hoặc biết ba cạnh.',
    question: 'Biết b = 5, c = 7 và góc xen giữa A = 60°. Muốn tìm cạnh a, dùng công cụ nào?',
    options: ['Định lý sin', 'Định lý côsin', 'Công thức diện tích'],
    correct: 1,
    why: 'Định lý côsin liên hệ ba cạnh với góc xen giữa; định lý sin cần một cặp cạnh–góc đối diện.',
    discuss: ['`[SO SÁNH]` Khi nào mới dùng được định lý sin?', '`[PHÁT HIỆN]` Vì sao cạnh đối diện góc tù luôn lớn nhất?'],
    cue: 'Treo bảng "dữ kiện → công cụ" với 3 dòng; HS chỉ vào dòng phù hợp.',
    lookFor: 'HS nêu được điều kiện dùng định lý sin (có cặp cạnh–góc đối diện).',
  },
  s3: {
    title: 'Hệ thống ba công cụ và làm mẫu',
    steps: [
      'Định lý côsin: $a^2 = b^2 + c^2 - 2bc\\cos A$ — dùng khi biết hai cạnh và góc xen giữa (hoặc ba cạnh).',
      'Định lý sin: $\\dfrac{a}{\\sin A} = \\dfrac{b}{\\sin B} = \\dfrac{c}{\\sin C} = 2R$ — dùng khi có một cặp cạnh–góc đối diện.',
      'Diện tích: $S = \\tfrac12 ab\\sin C = \\dfrac{abc}{4R}$ — chọn theo dữ kiện.',
      'Áp dụng mẫu: $b = 5$, $c = 7$, $A = 60^\\circ$ → $a = \\sqrt{39} \\approx 6{,}24$; $S \\approx 15{,}16$.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao $2R$ mà không phải $R$ trong định lý sin?', '`[PHÁT HIỆN]` Với $A = 120^\\circ$, dấu của $\\cos A$ là gì?'],
    cue: 'Nhắc: "góc tù → cos âm → dấu trừ thành cộng". Viết sẵn $\\cos120^\\circ = -\\tfrac12$.',
    close: 'Dữ kiện quyết định công cụ; góc tù làm đổi dấu và làm cạnh đối diện dài nhất.',
  },
  s4: { bat: 'AI thay $\\cos120^\\circ = \\tfrac12$ (dấu sai) nên ra $a \\approx 7{,}21$.', chung: 'Với $b = 6$, $c = 8$, $A = 120^\\circ$ thì $a$ phải là cạnh lớn nhất; kết quả 7,21 < 8 mâu thuẫn.', sua: '$\\cos120^\\circ = -\\tfrac12$ → $a^2 = 36 + 64 + 48 = 148 \\Rightarrow a = 2\\sqrt{37} \\approx 12{,}17$.', cue: 'Cho HS vẽ tam giác có góc 120° để thấy cạnh đối diện dài nhất.', lookFor: 'HS kiểm bằng quan hệ cạnh–góc thay vì chỉ tính lại.' },
  s6: { hints: { M: 'khoanh dữ kiện: có góc xen giữa chưa? có cặp cạnh–góc đối diện chưa?', S: 'tính xong kiểm bằng quan hệ cạnh lớn ↔ góc lớn.', C: 'bài thực tế: vẽ hình, xác định góc xen giữa, rồi chọn định lý.' }, lookFor: 'HS M chọn đúng định lý; HS S kiểm bằng bất đẳng thức cạnh–góc; HS C mô hình hóa được.' },
  postCheck: {
    q: 'Cho $a = 6$, $B = 45^\\circ$, $C = 75^\\circ$. Tính góc $A$ và bán kính $R$.',
    a: '$A = 180^\\circ - 120^\\circ = 60^\\circ$; $2R = \\dfrac{a}{\\sin A} = \\dfrac{6}{\\sqrt3/2} = 4\\sqrt3 \\Rightarrow R = 2\\sqrt3 \\approx 3{,}46$.',
    ds: [{ t: '"Định lý sin dùng được khi chỉ biết ba cạnh"', v: 'Sai' }, { t: '"Góc tù có cos âm"', v: 'Đúng' }, { t: '"Cạnh đối diện góc lớn nhất là cạnh lớn nhất"', v: 'Đúng' }],
    cue: 'Mời 2 HS trình bày, cả lớp kiểm bằng quan hệ cạnh–góc.',
  },
  s8Close: 'Dữ kiện → công cụ; góc tù → dấu trừ thành cộng.',
  s9: {
    title: 'Đo khoảng cách trên sân trường',
    bullets: ['Hai vị trí A, B cách nhau 40 m; A, C cách nhau 70 m; góc BAC = 60°.', 'Khoảng cách BC: $BC^2 = 1600 + 4900 - 2800 = 3700 \\Rightarrow BC = 10\\sqrt{37} \\approx 60{,}83$ m.', 'Diện tích tam giác ABC: $S = \\tfrac12\\cdot40\\cdot70\\cdot\\sin60^\\circ = 700\\sqrt3 \\approx 1212{,}4$ m².'],
    cue: 'Hỏi: "Nếu đo sai góc 10° thì khoảng cách BC lệch bao nhiêu?" — cho HS thấy tầm quan trọng của số đo góc.',
  },
  exit: ['Viết định lý côsin và định lý sin.', 'Nêu 1 bẫy (dấu cos góc tù; nhầm R với 2R).', 'Tự đánh giá M / S / C.', 'Với b = 5, c = 7, A = 60°, tính a.'],
  exitCue: 'Mở lại bảng "dữ kiện → công cụ" ở S1.',
  after: '- HS hoàn thành đề ôn chương III; chuẩn bị tiết ôn tập bài toán thực tiễn.',
  snapshot: {
    focus: 'Ôn tập lựa chọn công cụ hệ thức lượng trong tam giác trên trục đo đạc sân trường: định lý côsin (b = 5, c = 7, A = 60° → a = √39 ≈ 6,24), định lý sin (a = 8, A = 30° → R = 8), diện tích (S = 35√3/4 ≈ 15,16 m²); kiểm tra bằng quan hệ cạnh–góc',
    formulas: ['a^2 = b^2 + c^2 - 2bc\\cos A', '\\dfrac{a}{\\sin A} = \\dfrac{b}{\\sin B} = \\dfrac{c}{\\sin C} = 2R', 'S = \\dfrac12 bc\\sin A = \\dfrac{abc}{4R}'],
    examples: [
      { question: 'Sân trường có tam giác ABC với b = 5 m, c = 7 m, góc xen giữa A = 60°. Tính cạnh a và diện tích.', answer: 'Định lý côsin: a² = 25 + 49 − 2·5·7·cos60° = 74 − 35 = 39 ⇒ a = √39 ≈ 6,24 m. Diện tích: S = ½·5·7·sin60° = 35√3/4 ≈ 15,16 m².' },
      { question: 'Biết a = 8 m và góc đối diện A = 30°. Tính bán kính đường tròn ngoại tiếp và giải thích vì sao chọn định lý sin.', answer: '2R = a/sin A = 8/0,5 = 16 ⇒ R = 8 m. Chọn định lý sin vì có một cặp cạnh–góc đối diện (a và A).' },
    ],
    exercises: [
      { level: 'NB', question: 'Viết định lý côsin để tính cạnh a khi biết b, c và góc A.', answer: 'a² = b² + c² − 2bc·cos A.' },
      { level: 'NB', question: 'Biết b, c và góc xen giữa A, nêu hai công thức để tính a và S.', answer: 'a² = b² + c² − 2bc·cos A và S = ½·b·c·sin A.' },
      { level: 'TH', question: 'Cho b = 3, c = 4 và A = 90°. Tính a và S.', answer: 'a² = 9 + 16 − 0 = 25 ⇒ a = 5. S = ½·3·4·sin90° = 6.' },
      { level: 'TH', question: 'Cho a = 6, B = 45°, C = 75°. Tính góc A và bán kính R.', answer: 'A = 180° − 120° = 60°. 2R = a/sin A = 6/(√3/2) = 4√3 ⇒ R = 2√3 ≈ 3,46.' },
      { level: 'VD', question: 'Cho b = 6, c = 8, A = 120°. Tính a, S và chiều cao h_a.', answer: 'a² = 36 + 64 − 96·(−½) = 148 ⇒ a = 2√37 ≈ 12,17. S = ½·6·8·sin120° = 24·(√3/2) = 12√3 ≈ 20,78. h_a = 2S/a = 24√3/(2√37) = 12√3/√37 ≈ 3,42.' },
      { level: 'VD', question: 'Hai vị trí A, B cách nhau 40 km; A, C cách nhau 70 km; góc BAC = 60°. Tính BC và diện tích tam giác ABC.', answer: 'BC² = 40² + 70² − 2·40·70·cos60° = 1600 + 4900 − 2800 = 3700 ⇒ BC = 10√37 ≈ 60,83 km. S = ½·40·70·sin60° = 700√3 ≈ 1212,4 km².' },
    ],
    quick: [
      { question: 'Khi nào dùng được định lý sin?', solution: 'Khi biết một cặp cạnh–góc đối diện (a và A, hoặc b và B, hoặc c và C); nếu chỉ biết ba cạnh thì phải dùng định lý côsin trước.' },
      { question: 'Vì sao cosin của góc tù âm?', solution: 'Vì với góc tù, hình chiếu của cạnh kề lên phương cạnh kia nằm ngược chiều, nên cos A < 0 (ví dụ cos120° = −½).' },
    ],
    mistakes: ['Nhầm dấu cosin khi góc tù (lấy cos120° = +½).', 'Dùng định lý sin khi chưa có cặp cạnh–góc đối diện.', 'Nhầm R với 2R khi tính từ a/sin A.', 'Quên kiểm tra bằng quan hệ cạnh–góc.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Ba công cụ', 'a. Định lý côsin: a² = b² + c² − 2bc·cos A.', 'b. Định lý sin: a/sin A = b/sin B = c/sin C = 2R.', 'c. Diện tích: S = ½bc·sin A = abc/(4R).', '2. Chọn công cụ theo dữ kiện', 'a. Hai cạnh + góc xen giữa → côsin (tìm cạnh thứ ba) và ½bc sin A (tìm diện tích).', 'b. Một cặp cạnh–góc đối diện → định lý sin, tìm R hoặc góc/cạnh còn lại.', '3. Kiểm tra kết quả', 'a. Cạnh đối diện góc lớn hơn thì lớn hơn.', 'b. Góc tù ⇒ cos âm; cạnh đối diện góc tù là cạnh lớn nhất.'],
  },
  aiError: {
    category: 'Lỗi đại số', wrongSolution: 'AI giải: "Cho b = 6, c = 8, A = 120°. Áp dụng định lý côsin: a² = 6² + 8² − 2·6·8·cos120° = 36 + 64 − 96·(1/2) = 52, suy ra a = 2√13 ≈ 7,21."',
    correction: 'cos120° = −1/2, nên a² = 36 + 64 − 96·(−1/2) = 100 + 48 = 148 và a = 2√37 ≈ 12,17.',
    proof: 'Trong tam giác, cạnh đối diện góc lớn nhất là cạnh lớn nhất. Góc A = 120° là góc tù lớn nhất nên a > c = 8; kết quả 7,21 < 8 mâu thuẫn. Ngoài ra cos120° = −cos60° = −1/2.',
    whyAiError: 'Mô hình tra giá trị lượng giác của góc 120° theo góc tham chiếu 60° nhưng bỏ dấu âm của góc phần tư thứ hai.',
    teacherPrompt: 'Em kiểm tra kết quả a ≈ 7,21 của AI bằng quan hệ cạnh–góc trong tam giác có góc 120°, rồi sửa lại phép thay số.',
    studentProduct: 'Thẻ Đ/S + sửa dấu cosin và tính lại a = 2√37 ≈ 12,17, nêu phép kiểm "a phải lớn nhất".',
    boardPrompt: 'AI ra a = 7,21 khi góc A = 120°. Điều gì vô lý?',
    libraryTitle: 'Lỗi AI bỏ dấu âm của côsin góc tù',
  },
};

const L37 = {
  ...base,
  key: '10-5-37', period: 37, lessonType: 'practice',
  title: 'Tự chọn — luyện tập bất phương trình hai ẩn',
  opening: 'Hôm nay lớp mình tự chọn tuyến luyện: vẽ miền nghiệm hay kiểm tra nghiệm — mục tiêu chung là đọc đúng "bản đồ phương án".',
  focusQuestion: 'Làm thế nào kiểm tra một hình vẽ miền nghiệm là đúng hay sai?',
  axis: `**Tình huống: Quầy sách của lớp bán sách 30 nghìn/cuốn ($x$) và vở 20 nghìn/cuốn ($y$) với quỹ 120 nghìn.**

- Ràng buộc: $30x + 20y \\le 120 \\Leftrightarrow 3x + 2y \\le 12$; $x, y \\in \\mathbb{N}$.
- **Miền nghiệm:** tam giác với các đỉnh $(0;0)$, $(4;0)$, $(0;6)$ — kiểm: $3\\cdot4 = 12$ ✓; $2\\cdot6 = 12$ ✓.
- **Bài kiểm dấu ngặt:** $2x - y > 1$ → đường biên nét đứt; thử $O(0;0)$: $0 > 1$ **sai** → chọn phía không chứa gốc; $(1;0)$: $2 > 1$ ✓; $(0;2)$: $-2 > 1$ **sai** → không thuộc miền.

**Bẫy của bài:** coi điểm trên đường biên là thuộc miền của bất đẳng thức ngặt; vẽ nét liền cho dấu $>$.`,
  goals: {
    must: 'Vẽ miền nghiệm của bất phương trình đơn giản và kiểm tra một điểm có thuộc miền hay không.',
    should: 'Xử lý đúng dấu ngặt (nét đứt, không lấy biên) và mô hình hóa ràng buộc ngân sách thành hệ.',
    could: 'Phản biện một hình tô sai phía bằng phản ví dụ; thiết kế hệ có miền tam giác theo yêu cầu.',
  },
  s1: {
    title: 'Bản đồ phương án của quầy sách',
    context: 'Quầy sách: 30 nghìn/cuốn sách (x), 20 nghìn/cuốn vở (y), quỹ 120 nghìn.',
    question: 'Ràng buộc ngân sách viết gọn là gì?',
    options: ['3x + 2y ≥ 12', '3x + 2y ≤ 12', '3x + 2y = 12'],
    correct: 1,
    why: 'Chia 30x + 20y ≤ 120 cho 10 được 3x + 2y ≤ 12; dấu ≤ giữ nguyên vì chia số dương.',
    discuss: ['`[PHÁT HIỆN]` Điểm (4; 0) và (0; 6) nằm ở đâu trên hình?', '`[SO SÁNH]` Mua 2 sách 3 vở hết bao nhiêu?'],
    cue: 'Viết 30x + 20y ≤ 120 rồi khoanh "chia 10" — nhắc chia cả hai vế.',
    lookFor: 'HS rút gọn đúng và giữ dấu.',
  },
  s3: {
    title: 'Hai kỹ năng: vẽ miền và kiểm điểm',
    steps: [
      'Với $3x + 2y \\le 12$: biên qua $(4;0)$, $(0;6)$, nét liền, miền chứa gốc.',
      'Với $2x - y > 1$: biên nét đứt; thử $O(0;0)$ sai → chọn phía không chứa gốc.',
      'Kiểm một điểm: thay vào bất phương trình; dấu ngặt thì điểm trên biên **không** thuộc miền.',
      'Với hệ: lấy giao các miền, đánh dấu đỉnh và kiểm từng đỉnh.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao điểm trên biên không thuộc miền của ">"?', '`[PHÁT HIỆN]` Điểm (3; 2) có thuộc miền 3x + 2y ≤ 12?'],
    cue: 'Khung: "biên → thử → tô"; thêm dòng "dấu ngặt ⇒ biên không tính".',
    close: 'Kiểm miền bằng điểm thử; dấu ngặt loại biên.',
  },
  s4: { bat: 'AI kết luận (1;1) thuộc miền $2x - y > 1$ vì $2 - 1 = 1$ "thỏa mãn".', chung: '$1 > 1$ là **sai**; điểm (1;1) nằm trên đường biên nên bị loại bởi dấu ngặt.', sua: 'Kết luận đúng: (1;1) **không** thuộc miền; điểm thuộc miền là (2;0) vì $4 > 1$.', cue: 'Cho HS yếu đọc to "một lớn hơn một" để tự thấy sai.', lookFor: 'HS phân biệt ≥ và > khi kết luận.' },
  s6: { hints: { M: 'vẽ biên qua hai điểm chặn trục; thử O(0;0).', S: 'kiểm lại bằng một điểm ở phía đối diện; chú ý dấu ngặt.', C: 'tự thiết kế hệ có miền tam giác rồi nhờ bạn kiểm.' }, lookFor: 'HS M vẽ đúng; HS S phát hiện lỗi biên; HS C thiết kế được hệ hợp lệ.' },
  postCheck: {
    q: 'Biểu diễn hệ $x \\ge 0$, $y \\ge 0$, $x + y \\le 4$ và nêu các đỉnh.',
    a: 'Miền là tam giác với đỉnh $(0;0)$, $(4;0)$, $(0;4)$; cả ba điểm đều thỏa mọi điều kiện.',
    ds: [{ t: '"Điểm trên biên của x + y < 4 vẫn thuộc miền"', v: 'Sai' }, { t: '"Chia hai vế cho số dương thì dấu không đổi"', v: 'Đúng' }, { t: '"Miền nghiệm hệ là giao các miền"', v: 'Đúng' }],
    cue: 'Chiếu 2 hình của HS, cùng kiểm bằng điểm thử.',
  },
  s8Close: 'Thử điểm; dấu ngặt loại biên.',
  s9: {
    title: 'Tư vấn mua sách cho lớp',
    bullets: ['Mua 4 sách: hết 120 nghìn (đúng quỹ), không còn tiền mua vở.', 'Mua 2 sách + 3 vở: 60 + 60 = 120 nghìn (đúng quỹ).', 'Mua 1 sách + 4 vở: 30 + 80 = 110 nghìn (dư 10 nghìn) — vẫn trong miền.'],
    cue: 'Hỏi: "Phương án nào tối đa số lượng cuốn?" → (2;3) được 5 cuốn; (4;0) được 4; (1;4) được 5.',
  },
  exit: ['Nêu 3 bước biểu diễn miền nghiệm.', 'Nêu 1 bẫy (dấu ngặt vẫn lấy biên; tô sai phía).', 'Tự đánh giá M / S / C.', 'Rút gọn và nêu các đỉnh miền của 30x + 20y ≤ 120, x, y ≥ 0.'],
  exitCue: 'Mở lại ràng buộc ở mục II và hình tam giác.',
  after: '- HS hoàn thành phiếu tự chọn; chuẩn bị tiết tự chọn hệ thức lượng và diện tích.',
  snapshot: {
    focus: 'Luyện tập biểu diễn miền nghiệm và kiểm tra nghiệm của bất phương trình hai ẩn trên trục quầy sách của lớp (30x + 20y ≤ 120 ⇔ 3x + 2y ≤ 12, miền tam giác (0;0), (4;0), (0;6)); xử lý dấu ngặt 2x − y > 1 (nét đứt, loại biên)',
    formulas: ['30x + 20y \\le 120 \\Leftrightarrow 3x + 2y \\le 12', 'ax + by = c \\ \\text{là biên}; \\ >, < \\Rightarrow \\text{nét đứt}', 'S = S_1 \\cap S_2 \\cap S_3'],
    examples: [
      { question: 'Biểu diễn miền nghiệm của 2x − y > 1.', answer: 'Đường biên 2x − y = 1 vẽ nét đứt (dấu >). Thử O(0; 0): 0 > 1 sai → chọn nửa mặt phẳng không chứa gốc. Kiểm (1; 0): 2 > 1 đúng (thuộc miền); (0; 2): −2 > 1 sai (không thuộc).' },
      { question: 'Quầy sách có 120 nghìn, sách 30 nghìn/cuốn (x), vở 20 nghìn/cuốn (y). Viết ràng buộc, rút gọn và nêu các đỉnh miền nghiệm.', answer: 'Ràng buộc: x ≥ 0, y ≥ 0, 30x + 20y ≤ 120 ⇔ 3x + 2y ≤ 12. Miền là tam giác với (0; 0), (4; 0) (3·4 = 12), (0; 6) (2·6 = 12).' },
    ],
    exercises: [
      { level: 'NB', question: 'Vẽ miền nghiệm của x + y ≤ 2.', answer: 'Đường biên x + y = 2 nét liền; thử O(0; 0): 0 ≤ 2 đúng → tô phía chứa gốc; đỉnh (0; 0), (2; 0), (0; 2).' },
      { level: 'NB', question: 'Vì sao đường biên của 2x − y > 1 phải vẽ nét đứt?', answer: 'Vì dấu > không lấy đường biên: các điểm trên 2x − y = 1 cho vế trái bằng 1, không thỏa 1 > 1.' },
      { level: 'TH', question: 'Điểm (0; 2) có thuộc miền nghiệm của 2x − y > 1 không?', answer: 'Không: 2·0 − 2 = −2 > 1 là sai.' },
      { level: 'TH', question: 'Một bạn vẽ nét liền cho 2x − y > 1. Hãy sửa và giải thích.', answer: 'Đổi sang nét đứt vì dấu > loại biên; nếu vẽ liền thì đã đưa cả các điểm có 2x − y = 1 vào miền, sai với bất đẳng thức ngặt.' },
      { level: 'VD', question: 'Thiết kế một hệ ba ràng buộc có miền nghiệm là tam giác và nêu các đỉnh.', answer: 'Ví dụ x ≥ 0, y ≥ 0, x + y ≤ 4: miền tam giác với đỉnh (0; 0), (4; 0), (0; 4). Có thể thay bằng 3x + 2y ≤ 12 để được (0; 0), (4; 0), (0; 6).' },
      { level: 'VD', question: 'Viết phản biện cho một hình tô sai phía nghiệm.', answer: 'Lấy một điểm nằm trong vùng được tô nhưng ngoài miền đúng, thay vào bất phương trình; nếu cho mệnh đề sai thì vùng tô sai phía. Ví dụ với 3x + 2y ≤ 12, điểm (0; 8) cho 16 > 12.' },
    ],
    quick: [
      { question: 'Chia hai vế của 30x + 20y ≤ 120 cho 10 được gì?', solution: '3x + 2y ≤ 12 (chia số dương nên dấu không đổi).' },
      { question: 'Điểm trên đường biên có thuộc miền của bất đẳng thức ngặt không?', solution: 'Không. Với > hoặc <, điểm trên biên cho hai vế bằng nhau nên không thỏa.' },
    ],
    mistakes: ['Vẽ nét liền cho dấu > hoặc <.', 'Coi điểm trên đường biên là thuộc miền của bất đẳng thức ngặt.', 'Tô phía chứa điểm thử dù điểm thử cho mệnh đề sai.', 'Chia hai vế cho số âm mà quên đổi dấu.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Ràng buộc quầy sách', 'a. 30x + 20y ≤ 120 ⇔ 3x + 2y ≤ 12; x, y ∈ ℕ.', 'b. Miền tam giác: (0; 0), (4; 0), (0; 6).', '2. Dấu ngặt', 'a. Biên nét đứt; điểm trên biên không thuộc miền.', 'b. 2x − y > 1: (1; 0) thuộc; (0; 2) và (1; 1) không thuộc.', '3. Kiểm tra miền', 'a. Dùng điểm thử để chọn phía.', 'b. Dùng phản ví dụ trong vùng tô để bác bỏ hình sai.'],
  },
  aiError: {
    category: 'Lỗi logic', wrongSolution: 'AI kết luận: "Xét bất phương trình 2x − y > 1. Thay điểm (1; 1): 2·1 − 1 = 1. Vì 1 ≥ 1 nên (1; 1) thỏa mãn bất phương trình, do đó (1; 1) thuộc miền nghiệm."',
    correction: 'Bất phương trình là 2x − y > 1 (dấu ngặt). Với (1; 1): 2 − 1 = 1, mà 1 > 1 là SAI. Do đó (1; 1) không thuộc miền nghiệm; nó nằm trên đường biên bị loại.',
    proof: 'Điểm thuộc miền nghiệm phải làm mệnh đề đúng. Ở đây vế trái bằng đúng vế phải nên mệnh đề ">" sai; điểm thuộc miền là (2; 0) vì 4 > 1 đúng.',
    whyAiError: 'Mô hình đọc dấu ">" thành "≥" khi so sánh, nên đưa cả đường biên vào miền nghiệm.',
    teacherPrompt: 'Em kiểm tra điểm (1; 1) với dấu >: mệnh đề 1 > 1 đúng hay sai? Hãy sửa lại kết luận và nêu một điểm thực sự thuộc miền.',
    studentProduct: 'Thẻ Đ/S + chỉ ra dấu ngặt bị đọc thành ≥, nêu điểm đúng thuộc miền (2; 0).',
    boardPrompt: 'AI nói (1; 1) thuộc miền 2x − y > 1. Kiểm tra dấu.',
    libraryTitle: 'Lỗi AI đọc dấu ngặt thành dấu không ngặt khi xét miền nghiệm',
  },
};

const L38 = {
  ...base,
  key: '10-5-38', period: 38, lessonType: 'practice',
  title: 'Tự chọn — luyện tập hệ thức lượng và diện tích',
  opening: 'Hôm nay lớp mình luyện đo mảnh vườn tam giác: từ hai cạnh và góc xen giữa suy ra cạnh thứ ba và diện tích.',
  focusQuestion: 'Vì sao cùng hai cạnh nhưng đổi góc xen giữa lại đổi cả cạnh thứ ba và diện tích?',
  axis: `**Tình huống: Mảnh vườn tam giác của trường, đo được hai cạnh $b = 6$ m, $c = 8$ m; góc xen giữa thay đổi theo từng đợt đo.**

| Góc $A$ | $a^2 = 36 + 64 - 96\\cos A$ | $a$ | $S = \\tfrac12\\cdot6\\cdot8\\sin A$ |
|---|---|---|---|
| $30^\\circ$ | $100 - 48\\sqrt3 \\approx 16{,}86$ | $\\approx 4{,}11$ m | $12$ m² |
| $60^\\circ$ | $100 - 48 = 52$ | $2\\sqrt{13} \\approx 7{,}21$ m | $12\\sqrt3 \\approx 20{,}78$ m² |
| $90^\\circ$ | $100$ | $10$ m | $24$ m² |

**Kiểm chứng tay:** $\\cos30^\\circ = \\tfrac{\\sqrt3}{2}$ nên $96\\cos30^\\circ = 48\\sqrt3 \\approx 83{,}14$; $100 - 83{,}14 = 16{,}86$ ✓.
**Bẫy của bài:** quên $\\tfrac12$; dùng $\\cos$ cho diện tích; kết luận diện tích vượt quá $\\tfrac12 bc = 24$ m².`,
  goals: {
    must: 'Áp dụng định lý côsin và công thức $S = \\tfrac12 bc\\sin A$ cho hai cạnh và góc xen giữa.',
    should: 'So sánh ba trường hợp góc và giải thích quy luật: góc tăng đến 90° thì $a$ và $S$ tăng.',
    could: 'Kiểm chứng lời giải bằng cận hình học ($S \\le \\tfrac12 bc$) và lập bảng kiểm 4 tiêu chí cho một lời giải.',
  },
  s1: {
    title: 'Cùng hai cạnh, khác góc',
    context: 'Mảnh vườn có b = 6 m, c = 8 m; ba lần đo cho góc xen giữa 30°, 60°, 90°.',
    question: 'Khi góc xen giữa tăng từ 30° lên 90°, diện tích thay đổi thế nào?',
    options: ['Giảm', 'Không đổi', 'Tăng'],
    correct: 2,
    why: 'S = ½bc·sin A; sin A tăng từ 0,5 đến 1 nên diện tích tăng từ 12 lên 24 m².',
    discuss: ['`[SO SÁNH]` Cạnh a thay đổi thế nào?', '`[PHÁT HIỆN]` Diện tích lớn nhất đạt được khi nào?'],
    cue: 'Vẽ ba tam giác trên cùng hai cạnh b, c với góc mở dần — HS thấy diện tích nở ra.',
    lookFor: 'HS gắn diện tích với sin của góc.',
  },
  s3: {
    title: 'Tính theo bảng và kiểm bằng cận',
    steps: [
      'Tính $a^2 = b^2 + c^2 - 2bc\\cos A$ cho từng góc.',
      'Tính $S = \\tfrac12 bc\\sin A$ cho từng góc.',
      'Kiểm bằng cận: $S \\le \\tfrac12 bc = 24$ m², dấu bằng khi $A = 90^\\circ$.',
      'Kiểm bằng bất đẳng thức tam giác: $a < b + c = 14$ và $a > |b - c| = 2$.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao $S$ lớn nhất khi góc vuông?', '`[PHÁT HIỆN]` Với $A = 30^\\circ$, $a \\approx 4{,}11$ có thỏa bất đẳng thức tam giác không?'],
    cue: 'Khung: "côsin tìm cạnh → sin tìm diện tích → kiểm bằng cận".',
    close: 'Cùng hai cạnh, góc càng mở (đến 90°) thì cạnh đối diện và diện tích càng lớn.',
  },
  s4: { bat: 'AI dùng $S = bc\\sin A$ (thiếu ½) nên ra 41,57 m² cho góc 60°.', chung: 'Với $b = 6$, $c = 8$ thì $\\tfrac12 bc = 24$ m²; diện tích tam giác không thể vượt 24 m².', sua: '$S = \\tfrac12\\cdot6\\cdot8\\cdot\\sin60^\\circ = 12\\sqrt3 \\approx 20{,}78$ m².', cue: 'Cho HS so sánh 41,57 với hình chữ nhật 6×8 = 48 và nửa của nó là 24.', lookFor: 'HS dùng cận hình học để bác bỏ, không chỉ nhớ công thức.' },
  s6: { hints: { M: 'viết công thức rồi thay số, giữ nguyên √ khi chưa cần số thập phân.', S: 'kiểm bằng bất đẳng thức tam giác và cận diện tích.', C: 'lập bảng kiểm 4 tiêu chí cho lời giải của bạn.' }, lookFor: 'HS M thay đúng; HS S kiểm được cận; HS C đánh giá lời giải theo tiêu chí.' },
  postCheck: {
    q: 'Với $b = 6$, $c = 8$, $A = 60^\\circ$, tính $a$ và $S$ rồi kiểm bằng cận.',
    a: '$a^2 = 36 + 64 - 48 = 52 \\Rightarrow a = 2\\sqrt{13} \\approx 7{,}21$ m; $S = 12\\sqrt3 \\approx 20{,}78$ m² $\\le 24$ m² ✓.',
    ds: [{ t: '"S = bc·sin A"', v: 'Sai — thiếu ½' }, { t: '"S ≤ ½bc"', v: 'Đúng' }, { t: '"Góc xen giữa 90° cho diện tích lớn nhất với b, c cố định"', v: 'Đúng' }],
    cue: 'Chiếu 2 phiếu, cùng kiểm bằng cận 24 m².',
  },
  s8Close: 'Côsin tìm cạnh; sin tìm diện tích; cận ½bc để kiểm.',
  s9: {
    title: 'Chọn số đo nào để tính diện tích chính xác',
    bullets: ['Nếu chỉ cần diện tích, đo góc 90° cho kết quả đơn giản nhất (24 m²) và không phụ thuộc bảng sin.', 'Nếu đo góc 30°, diện tích chỉ 12 m² — sai số góc ảnh hưởng mạnh vì sin thay đổi nhanh ở góc nhỏ.', 'Kết luận: chọn vị trí đo để góc xen giữa gần 90° giúp giảm sai số.'],
    cue: 'Liên hệ kỹ năng đo đạc thực địa: chọn góc đo tốt quan trọng như chọn công thức.',
  },
  exit: ['Viết định lý côsin và công thức diện tích theo hai cạnh + góc xen giữa.', 'Nêu 1 bẫy (thiếu ½; vượt cận ½bc).', 'Tự đánh giá M / S / C.', 'Với b = 6, c = 8, A = 60°, tính a và S.'],
  exitCue: 'Mở lại bảng ba góc ở mục II.',
  after: '- HS hoàn thành phiếu tự chọn; chuẩn bị nội dung tuần 6 (hệ bất phương trình và ứng dụng).',
  snapshot: {
    focus: 'Luyện tập định lý côsin và công thức diện tích trên trục mảnh vườn tam giác b = 6 m, c = 8 m với góc xen giữa 30°, 60°, 90° (a ≈ 4,11 / 7,21 / 10 m; S = 12 / 20,78 / 24 m²); kiểm chứng bằng cận S ≤ ½bc và bất đẳng thức tam giác',
    formulas: ['a^2 = b^2 + c^2 - 2bc\\cos A', 'S = \\dfrac12 bc\\sin A', 'S \\le \\dfrac12 bc \\ (\\text{dấu bằng khi } A = 90^\\circ)'],
    examples: [
      { question: 'Mảnh vườn có b = 6 m, c = 8 m, góc xen giữa A = 30°. Tính a và diện tích.', answer: 'a² = 36 + 64 − 96·cos30° = 100 − 48√3 ≈ 16,86 ⇒ a ≈ 4,11 m. S = ½·6·8·sin30° = 24·0,5 = 12 m².' },
      { question: 'Cùng mảnh vườn đó nhưng góc xen giữa A = 60°. Tính a và diện tích; so sánh với trường hợp 30°.', answer: 'a² = 100 − 96·0,5 = 52 ⇒ a = 2√13 ≈ 7,21 m. S = ½·6·8·sin60° = 12√3 ≈ 20,78 m². So với A = 30°: cạnh a tăng từ 4,11 lên 7,21 m và diện tích tăng từ 12 lên 20,78 m².' },
    ],
    exercises: [
      { level: 'NB', question: 'Viết định lý côsin cho cạnh a.', answer: 'a² = b² + c² − 2bc·cos A.' },
      { level: 'NB', question: 'Biết hai cạnh và góc xen giữa, chọn công thức diện tích nào?', answer: 'S = ½·b·c·sin A (dùng sin của góc xen giữa).' },
      { level: 'TH', question: 'Cho b = 6, c = 8, A = 30°. Tính a và S.', answer: 'a² = 100 − 48√3 ≈ 16,86 ⇒ a ≈ 4,11; S = ½·6·8·sin30° = 12.' },
      { level: 'TH', question: 'Một bạn viết S = b·c·sin A. Hãy kiểm tra và sửa.', answer: 'Thiếu hệ số ½. Với b = 6, c = 8, A = 60°: cách của bạn cho 24√3 ≈ 41,57 m², vượt cận ½bc = 24 m² nên vô lý; đúng là 12√3 ≈ 20,78 m².' },
      { level: 'VD', question: 'Lập bảng kiểm 4 tiêu chí cho một lời giải tính a và S từ b, c, A.', answer: 'Bốn tiêu chí: (1) ghi đúng dữ kiện và đơn vị; (2) chọn đúng định lý côsin và công thức diện tích; (3) biến đổi, thay số chính xác; (4) có phép kiểm (bất đẳng thức tam giác, cận S ≤ ½bc) và đơn vị m².' },
      { level: 'VD', question: 'Một kết quả diện tích lớn hơn ½bc. Hãy phản biện.', answer: 'Vì S = ½bc·sin A ≤ ½bc (do sin A ≤ 1), mọi kết quả vượt ½bc đều sai. Ví dụ với b = 6, c = 8, mọi diện tích phải ≤ 24 m²; con số 30 m² chắc chắn mắc lỗi thiếu ½ hoặc dùng sai hàm.' },
    ],
    quick: [
      { question: 'Với b, c cố định, diện tích tam giác lớn nhất khi nào?', solution: 'Khi góc xen giữa A = 90°, vì sin A đạt giá trị lớn nhất bằng 1; khi đó S = ½bc.' },
      { question: 'Vì sao phải kiểm bằng bất đẳng thức tam giác?', solution: 'Vì kết quả a phải thỏa |b − c| < a < b + c; nếu vi phạm thì phép tính hoặc dữ kiện đã sai (ví dụ a = 1 với b = 6, c = 8 là bất khả).' },
    ],
    mistakes: ['Quên hệ số ½ trong công thức diện tích.', 'Dùng cos thay vì sin.', 'Không kiểm bằng cận S ≤ ½bc và bất đẳng thức tam giác.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Bảng ba trường hợp (b = 6, c = 8)', 'a. A = 30°: a ≈ 4,11 m; S = 12 m².', 'b. A = 60°: a = 2√13 ≈ 7,21 m; S = 12√3 ≈ 20,78 m².', 'c. A = 90°: a = 10 m; S = 24 m².', '2. Hai phép kiểm bắt buộc', 'a. Bất đẳng thức tam giác: |b − c| < a < b + c.', 'b. Cận diện tích: S ≤ ½bc, dấu bằng khi A = 90°.'],
  },
  aiError: {
    category: 'Lỗi đại số', wrongSolution: 'AI giải: "Mảnh vườn có b = 6 m, c = 8 m, góc xen giữa A = 60°. Diện tích: S = b·c·sin A = 6·8·sin60° = 48·(√3/2) ≈ 41,57 m²."',
    correction: 'Công thức đúng có hệ số ½: S = ½·b·c·sin A = ½·6·8·sin60° = 12√3 ≈ 20,78 m².',
    proof: 'Với hai cạnh b, c cố định, tam giác có diện tích lớn nhất khi vuông tại góc xen giữa: S = ½bc = 24 m². Kết quả 41,57 m² vượt quá cận này nên chắc chắn sai — nguyên nhân là thiếu hệ số ½.',
    whyAiError: 'Mô hình bỏ sót hệ số ½ khi tái tạo công thức diện tích từ ngữ nghĩa "nửa tích hai cạnh nhân sin góc xen giữa".',
    teacherPrompt: 'Kết quả 41,57 m² của AI có vượt quá diện tích tối đa của tam giác có hai cạnh 6 m và 8 m không? Hãy sửa lại công thức.',
    studentProduct: 'Thẻ Đ/S + sửa công thức có ½ và nêu cận ½bc = 24 m² làm bằng chứng.',
    boardPrompt: 'AI ra 41,57 m² cho tam giác 6–8. Cận hình học nào bác bỏ?',
    libraryTitle: 'Lỗi AI quên hệ số ½ trong công thức diện tích tam giác',
  },
};

export default [L35, L36, L37, L38];

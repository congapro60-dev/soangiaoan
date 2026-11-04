const base = {
  grade: 10, week: 6, date: '2026-11-04',
  timeMap: [
    ['HĐ 1 Khởi động — tình huống trục thực nghiệm', 'P0–P3', 'S0 0–180 + S1 180–300'],
    ['HĐ 2 Chọn tuyến / mục tiêu M-S-C', 'P3–P5', 'S2 300–420'],
    ['HĐ 3 Hình thành hoặc chữa mẫu', 'P5–P16', 'S3 420–780'],
    ['HĐ 4 AI Error + chốt bẫy', 'P16–P19', 'S4 1080–1320'],
    ['HĐ 5 Phân luồng M/S/C', 'P20–P22', 'S5 1320–1500'],
    ['HĐ 6 Luyện tập cá nhân + post-check', 'P22–P34', 'S6 1620–2040 + S7 1620–2040'],
    ['HĐ 7 Kiểm tra nhanh', 'P34–P36', 'S8 2040–2160'],
    ['HĐ 8 Vận dụng thực tế', 'P36–P39', 'S9 2160–2340'],
    ['HĐ 9 Exit Ticket & tự đánh giá', 'P39–P40', 'S10 2340–2400'],
  ],
};

const L43 = {
  ...base,
  key: '10-6-43', period: 43, lessonType: 'practice',
  title: 'Ôn tập chương III — bài toán thực tiễn',
  opening: 'Hôm nay lớp mình giải hai bài thực tiễn: đo mảnh đất tam giác và chia suất quà cho các lớp.',
  focusQuestion: 'Một kết luận thực tiễn đạt chuẩn cần thêm gì ngoài con số?',
  axis: `**Tình huống: Hai bài thực tiễn của trường trong ngày hội.**

| Bài | Dữ kiện | Kết quả | Điều phải ghi kèm |
|---|---|---|---|
| Mảnh đất tam giác | hai cạnh $10$ m, $12$ m, góc xen giữa $30^\\circ$ | $S = \\tfrac12\\cdot10\\cdot12\\cdot\\tfrac12 = 30$ m² | đơn vị, giả định góc đo được |
| Chia suất quà | $x + y \\le 20$, $x \\ge 5$, $y \\ge 0$ | $(5; 10)$ hợp lệ ($15 \\le 20$) | ý nghĩa biến, điều kiện nguyên |

- **Kiểm chứng tay:** $10\\cdot12 = 120$; $\\tfrac12\\cdot120\\cdot0{,}5 = 30$ ✓. Hệ: $5 + 10 = 15 \\le 20$ ✓, $x = 5 \\ge 5$ ✓.
- **Kết luận thực tiễn đạt chuẩn:** số + đơn vị + giả định/nguồn số liệu + phạm vi áp dụng.

**Bẫy của bài:** kết luận "30" mà không có m²; dùng số liệu không ghi nguồn; quên điều kiện nguyên.`,
  goals: {
    must: 'Tính đúng diện tích/kiểm phương án và ghi kèm đơn vị.',
    should: 'Trình bày kết luận thực tiễn đủ 4 phần: số, đơn vị, giả định, phạm vi.',
    could: 'So sánh hai phương án theo tiêu chí tự đề xuất; phản biện kết luận thiếu giả định.',
  },
  s1: {
    title: 'Hai bài thực tiễn',
    context: 'Mảnh đất tam giác 10 m, 12 m, góc 30°; chia 20 suất quà, ít nhất 5 suất loại A.',
    question: 'Kết luận "diện tích mảnh đất là 30" thiếu gì?',
    options: ['Thiếu đơn vị m²', 'Thiếu số thập phân', 'Không thiếu gì'],
    correct: 0,
    why: 'Diện tích phải có đơn vị m²; con số trần không có nghĩa trong thực tiễn.',
    discuss: ['`[PHÁT HIỆN]` Cần ghi giả định gì khi đo góc 30°?', '`[SO SÁNH]` Phương án (5;10) và (20;0): phương án nào thỏa hệ?'],
    cue: 'Treo 4 thành phần của kết luận thực tiễn ngay từ đầu tiết.',
    lookFor: 'HS nhắc tới đơn vị trước khi tính xong.',
  },
  s3: {
    title: 'Bốn thành phần của kết luận thực tiễn',
    steps: [
      'Số liệu: tính đúng và ghi đơn vị (m², suất, giờ…).',
      'Giả định: nêu rõ số đo/nguồn (ví dụ góc đo bằng thước đo góc, sai số ±1°).',
      'Phạm vi: kết luận áp dụng cho đối tượng nào (mảnh đất này, lớp này).',
      'Kiểm: so sánh với cận hợp lý (diện tích dương, không vượt ½bc; phương án thỏa hệ).',
    ],
    ask: ['`[SUY LUẬN]` Vì sao phải ghi phạm vi áp dụng?', '`[PHÁT HIỆN]` Nếu góc đo sai 5° thì diện tích lệch bao nhiêu?'],
    cue: 'Khung 4 dòng: số — đơn vị — giả định — phạm vi; HS tự chấm bài theo khung.',
    close: 'Con số chỉ trở thành kết luận khi có đơn vị, giả định và phạm vi.',
  },
  s4: { bat: 'AI kết luận diện tích 60 m² vì quên hệ số ½.', chung: 'Với hai cạnh 10 và 12, diện tích tối đa là ½·10·12 = 60 m² (khi góc vuông); góc 30° chỉ cho 30 m².', sua: 'S = ½·10·12·sin30° = 30 m².', cue: 'Cho HS so 60 với cận ½bc để thấy đó là giá trị lớn nhất, không phải giá trị bài cho.', lookFor: 'HS dùng cận hình học để bác bỏ.' },
  s6: { hints: { M: 'ghi đơn vị ngay khi thay số.', S: 'kiểm bằng cận hoặc thay điểm vào hệ.', C: 'so sánh hai phương án theo tiêu chí tự chọn và nêu giả định.' }, lookFor: 'HS M đúng số + đơn vị; HS S có phép kiểm; HS C có tiêu chí rõ.' },
  postCheck: {
    q: 'Mảnh đất tam giác có $a = 8$, $b = 10$, góc xen giữa $C = 60^\\circ$. Tính diện tích và ghi kết luận đủ 4 phần.',
    a: '$S = \\tfrac12\\cdot8\\cdot10\\cdot\\sin60^\\circ = 40\\cdot\\tfrac{\\sqrt3}{2} = 20\\sqrt3 \\approx 34{,}64$ m²; giả định góc đo ±1°; áp dụng cho mảnh đất này; kiểm $S \\le \\tfrac12\\cdot8\\cdot10 = 40$ m² ✓.',
    ds: [{ t: '"Kết luận chỉ cần con số"', v: 'Sai' }, { t: '"Diện tích tam giác không vượt ½bc"', v: 'Đúng' }, { t: '"Phải ghi giả định khi đo góc"', v: 'Đúng' }],
    cue: 'Chấm 2 bài theo khung 4 dòng.',
  },
  s8Close: 'Số + đơn vị + giả định + phạm vi.',
  s9: {
    title: 'Trình bày trước lớp',
    bullets: ['Mảnh đất: 30 m² (góc 30°), đủ hạt giống cho 30 m² theo định mức 20 g/m² → 600 g.', 'Suất quà: (5; 10) là phương án hợp lệ; nếu ưu tiên số suất thì (20; 0) cũng hợp lệ.', 'Ghi rõ: số liệu đo trong buổi khảo sát, sai số ±1°, chỉ áp dụng cho mảnh đất đã đo.'],
    cue: 'Mời 1 nhóm trình bày 60 giây, cả lớp chấm theo 4 thành phần.',
  },
  exit: ['Nêu 4 thành phần của kết luận thực tiễn.', 'Nêu 1 bẫy (thiếu đơn vị; quên ½; thiếu giả định).', 'Tự đánh giá M / S / C.', 'Diện tích mảnh đất 10 m, 12 m, góc 30° bằng bao nhiêu?'],
  exitCue: 'Mở lại bảng hai bài thực tiễn ở mục II.',
  after: '- HS hoàn thành phiếu bài toán thực tiễn; chuẩn bị tiết ôn tập phản biện.',
  snapshot: {
    focus: 'Ôn tập mô hình hóa bài toán thực tiễn trên hai tình huống của trường: mảnh đất tam giác 10 m, 12 m, góc 30° (S = 30 m²) và chia 20 suất quà với x + y ≤ 20, x ≥ 5, y ≥ 0 (phương án (5;10) hợp lệ); rèn kết luận đủ 4 phần: số, đơn vị, giả định, phạm vi',
    formulas: ['\\text{Dữ kiện} \\to \\text{mô hình} \\to \\text{tính} \\to \\text{kiểm} \\to \\text{kết luận có đơn vị}', 'S = \\dfrac12 ab\\sin C', 'S = S_1 \\cap S_2 \\cap S_3'],
    examples: [
      { question: 'Mảnh đất hình tam giác có hai cạnh 10 m, 12 m và góc xen giữa 30°. Tính diện tích và ghi kết luận đủ 4 phần.', answer: 'S = ½·10·12·sin30° = 30 m². Kết luận: 30 m² (đơn vị), giả định góc đo ±1°, áp dụng cho mảnh đất đã đo, kiểm S ≤ ½·10·12 = 60 m² ✓.' },
      { question: 'Nhóm cần chọn x, y sao cho x + y ≤ 20, x ≥ 5, y ≥ 0. Nêu ý nghĩa miền nghiệm và một phương án hợp lệ.', answer: 'Miền nghiệm là tập các cách chia thỏa tổng 20 suất và tối thiểu 5 suất loại A. Phương án (5; 10): 5 + 10 = 15 ≤ 20 và x = 5 ≥ 5 — hợp lệ; còn dư 5 suất.' },
    ],
    exercises: [
      { level: 'NB', question: 'Ngoài con số, kết luận thực tiễn phải ghi thêm gì?', answer: 'Đơn vị đo, giả định/nguồn số liệu và phạm vi áp dụng.' },
      { level: 'NB', question: 'Kiểm tra phương án (5; 10) với hệ x + y ≤ 20, x ≥ 5, y ≥ 0.', answer: '5 + 10 = 15 ≤ 20; 5 ≥ 5; 10 ≥ 0 — hợp lệ.' },
      { level: 'TH', question: 'Tính diện tích mảnh đất tam giác có a = 8, b = 10, góc xen giữa C = 60°.', answer: 'S = ½·8·10·sin60° = 40·(√3/2) = 20√3 ≈ 34,64 m².' },
      { level: 'TH', question: 'Nêu một giả định cần ghi khi đo góc ngoài thực địa.', answer: 'Ghi dụng cụ đo, sai số (ví dụ ±1°), điều kiện đo (trời không mưa, mặt đất bằng) vì sai số góc làm diện tích thay đổi.' },
      { level: 'VD', question: 'So sánh hai phương án trong miền nghiệm bằng một tiêu chí do nhóm đề xuất.', answer: 'Ví dụ tiêu chí "tổng số suất": (20; 0) được 20 suất, (5; 10) được 15 suất → (20; 0) tốt hơn theo tiêu chí này, nhưng vi phạm cam kết phân bổ hai loại nếu lớp cần cả A và B.' },
      { level: 'VD', question: 'Phản biện một kết luận dùng số liệu nhưng không ghi nguồn/giả định.', answer: 'Kết luận không kiểm chứng được: người đọc không biết số đo từ đâu, sai số bao nhiêu, áp dụng cho đối tượng nào. Phải bổ sung nguồn đo, sai số và phạm vi trước khi dùng để ra quyết định.' },
    ],
    quick: [
      { question: 'Vì sao diện tích 60 m² là cận trên của mảnh đất 10 m × 12 m?', solution: 'Vì S = ½·10·12·sin C ≤ ½·10·12 = 60 m², dấu bằng khi góc xen giữa 90°.' },
      { question: 'Nếu bỏ điều kiện x ≥ 5 thì phương án (0; 20) có hợp lệ không?', solution: 'Theo hệ mới thì hợp lệ (0 + 20 = 20), nhưng vi phạm cam kết ít nhất 5 suất loại A của lớp.' },
    ],
    mistakes: ['Kết luận thiếu đơn vị.', 'Quên hệ số ½ hoặc dùng cos.', 'Không ghi giả định/nguồn số liệu và phạm vi áp dụng.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Bốn thành phần kết luận thực tiễn', 'a. Số liệu đúng.', 'b. Đơn vị đo.', 'c. Giả định/nguồn số liệu.', 'd. Phạm vi áp dụng.', '2. Hai bài thực tiễn', 'a. Mảnh đất 10 m, 12 m, 30°: S = 30 m².', 'b. Chia 20 suất: (5;10) hợp lệ; miền x + y ≤ 20, x ≥ 5, y ≥ 0.', '3. Phép kiểm', 'a. S ≤ ½bc.', 'b. Thay điểm vào cả ba điều kiện.'],
  },
  aiError: {
    category: 'Lỗi đại số', wrongSolution: 'AI kết luận: "Mảnh đất có hai cạnh 10 m và 12 m, góc xen giữa 30°. Diện tích = 10·12·sin30° = 60 m²."',
    correction: 'Thiếu hệ số ½: S = ½·10·12·sin30° = 30 m².',
    proof: 'Với hai cạnh 10 m và 12 m, diện tích lớn nhất chỉ đạt 60 m² khi góc xen giữa bằng 90° (sin = 1). Với góc 30°, diện tích chỉ bằng một nửa cận trên, tức 30 m².',
    whyAiError: 'Mô hình bỏ hệ số ½ khi tái tạo công thức diện tích, dẫn tới luôn gấp đôi kết quả đúng.',
    teacherPrompt: 'Em so sánh kết quả 60 m² của AI với cận ½·10·12 rồi sửa lại phép tính.',
    studentProduct: 'Thẻ Đ/S + nêu cận 60 m² chỉ đạt khi góc vuông, sửa lại S = 30 m².',
    boardPrompt: 'AI ra 60 m² cho góc 30°. Vì sao đó là cận trên chứ không phải kết quả?',
    libraryTitle: 'Lỗi AI quên ½ khiến diện tích thực tiễn gấp đôi',
  },
};

const L44 = {
  ...base,
  key: '10-6-44', period: 44, lessonType: 'practice',
  title: 'Ôn tập chương III — phản biện và kiểm tra tổng hợp',
  opening: 'Hôm nay lớp mình làm "thanh tra toán học": tìm lỗi trong lời giải của người khác và kiểm tra bằng hai cách độc lập.',
  focusQuestion: 'Làm thế nào phản biện một lời giải mà không chỉ nói "sai"?',
  axis: `**Tình huống: Ba lời giải mẫu của chương III được chiếu lên để lớp "soi lỗi".**

| Lời giải | Nội dung | Lỗi |
|---|---|---|
| A | $S = ab\\sin C$ với $a = 6$, $b = 8$, $C = 30^\\circ$ → $S = 24$ | thiếu $\\tfrac12$ → đúng là 12 |
| B | Hệ $x + y \\le 4$, $x \\ge 0$, $y \\ge 0$: kết luận điểm $(2; 3)$ thuộc miền | $2 + 3 = 5 > 4$ → sai |
| C | $a^2 = b^2 + c^2 + 2bc\\cos A$ | sai dấu → $a^2 = b^2 + c^2 - 2bc\\cos A$ |

- **Kiểm chứng tay:** A: $\\tfrac12\\cdot6\\cdot8\\cdot0{,}5 = 12$; B: $(2;3)$ cho $5 > 4$; C: với $A = 90^\\circ$ hai công thức trùng nhưng với $60^\\circ$ khác ($52$ vs $148$).
- **Quy trình phản biện 4 bước:** khoanh dòng đáng ngờ → nêu định nghĩa/điều kiện liên quan → thử một giá trị cụ thể → đề xuất sửa.

**Bẫy của bài:** sửa kết quả mà không chỉ ra nguyên nhân; phản biện bằng cảm giác thay vì bằng phép thử.`,
  goals: {
    must: 'Chỉ ra lỗi cụ thể trong một lời giải và nêu phép thử làm bằng chứng.',
    should: 'Thực hiện quy trình phản biện 4 bước và kiểm một kết quả bằng hai cách độc lập.',
    could: 'Viết phản biện tôn trọng, có cấu trúc; đặt câu hỏi mở kiểm tra hiểu sâu công thức.',
  },
  s1: {
    title: 'Ba lời giải cần soi',
    context: 'Ba lời giải A, B, C như bảng; lớp chia nhóm, mỗi nhóm soi một lời giải.',
    question: 'Bước đầu tiên khi gặp một lời giải đáng ngờ là gì?',
    options: ['Sửa ngay kết quả', 'Khoanh dòng đáng ngờ và nêu điều kiện/định nghĩa liên quan', 'Bỏ qua vì đã có đáp án'],
    correct: 1,
    why: 'Phải xác định chính xác dòng sai và căn cứ lý thuyết trước khi sửa; nếu không sẽ sửa mò.',
    discuss: ['`[PHÁT HIỆN]` Lời giải A sai ở đâu?', '`[SO SÁNH]` Hai cách kiểm độc lập cho một kết quả diện tích là gì?'],
    cue: 'Treo quy trình 4 bước; mỗi nhóm chỉ được nói sau khi đã khoanh dòng.',
    lookFor: 'HS chỉ đúng dòng thay vì phủ nhận cả bài.',
  },
  s3: {
    title: 'Quy trình phản biện 4 bước',
    steps: [
      'Khoanh dòng đáng ngờ (công thức, phép biến đổi, kết luận).',
      'Nêu định nghĩa/điều kiện liên quan (ví dụ $S = \\tfrac12 ab\\sin C$; nghiệm hệ phải thỏa mọi điều kiện).',
      'Thử một giá trị cụ thể hoặc trường hợp biên để kiểm.',
      'Đề xuất sửa và nêu phép kiểm thứ hai độc lập.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao cần phép kiểm thứ hai độc lập?', '`[PHÁT HIỆN]` Trường hợp biên nào giúp phát hiện lỗi dấu nhanh nhất?'],
    cue: 'Khung 4 bước viết to; nhắc "không sửa trước khi chỉ đúng dòng".',
    close: 'Phản biện = chỉ đúng dòng + căn cứ + phép thử + đề xuất sửa.',
  },
  s4: { bat: 'AI sửa kết quả từ 24 thành 12 nhưng không nêu nguyên nhân, và vẫn giữ công thức thiếu ½.', chung: 'Sửa số mà giữ công thức sai thì lần sau lại sai; phải sửa công thức thành $\\tfrac12 ab\\sin C$.', sua: 'Sửa công thức, ghi rõ hệ số ½, rồi tính lại $S = 12$.', cue: 'Hỏi: "Nếu chỉ sửa số, em có chắc lần sau đúng không?"', lookFor: 'HS phân biệt sửa kết quả với sửa nguyên nhân.' },
  s6: { hints: { M: 'khoanh dòng rồi mới sửa.', S: 'dùng phép thử cụ thể làm bằng chứng.', C: 'viết phản biện tôn trọng, đủ 4 bước.' }, lookFor: 'HS M chỉ đúng dòng; HS S có bằng chứng; HS C phản biện có cấu trúc.' },
  postCheck: {
    q: 'Nêu phép kiểm cho điểm ứng viên của miền nghiệm.',
    a: 'Thay điểm vào tất cả các bất phương trình; nếu có một điều kiện sai thì điểm nằm ngoài miền. Ví dụ (2;3) với x + y ≤ 4: 5 > 4 → loại.',
    ds: [{ t: '"Sửa kết quả là đủ, không cần sửa công thức"', v: 'Sai' }, { t: '"Phản biện cần dẫn định nghĩa/điều kiện"', v: 'Đúng' }, { t: '"Hai phép kiểm độc lập giúp tăng độ tin cậy"', v: 'Đúng' }],
    cue: 'Chiếu 2 phản biện của HS, cùng chấm theo 4 bước.',
  },
  s8Close: 'Đúng dòng — đúng căn cứ — có phép thử — sửa gốc.',
  s9: {
    title: 'Viết phản biện cho bạn học',
    bullets: ['Mẫu: "Ở dòng 2, công thức diện tích cần hệ số ½; thử với C = 90° thì công thức của bạn cho 48 m² trong khi tam giác 6×8 vuông chỉ có 24 m²."', 'Luôn kết thúc bằng đề xuất sửa cụ thể và phép kiểm.', 'Giữ giọng tôn trọng: phê bình lời giải, không phê bình người.'],
    cue: 'Mời 2 HS đọc phản biện; lớp nhận xét giọng điệu và căn cứ.',
  },
  exit: ['Nêu 4 bước phản biện.', 'Nêu 1 bẫy (sửa số mà không sửa công thức; phản biện bằng cảm giác).', 'Tự đánh giá M / S / C.', 'Lời giải S = ab·sin C sai ở đâu và sửa thế nào?'],
  exitCue: 'Mở lại bảng ba lời giải ở mục II.',
  after: '- HS hoàn thành phiếu phản biện; chuẩn bị tiết tự chọn luyện tập hệ bất phương trình.',
  snapshot: {
    focus: 'Ôn tập phản biện và kiểm tra tổng hợp chương III qua ba lời giải mẫu: S = ab·sin C (thiếu ½, đúng là 12), điểm (2;3) với x + y ≤ 4 (5 > 4, ngoài miền), a² = b² + c² + 2bc·cos A (sai dấu); rèn quy trình phản biện 4 bước',
    formulas: ['\\text{Kết luận đúng} \\Leftrightarrow \\text{dữ kiện đúng} + \\text{biến đổi hợp lệ} + \\text{điều kiện được kiểm}', 'S = \\dfrac12 ab\\sin C', 'S = S_1 \\cap S_2 \\cap S_3'],
    examples: [
      { question: 'GV chiếu lời giải S = ab·sin C với a = 6, b = 8, C = 30° cho kết quả 24. HS cần làm gì trước khi sửa?', answer: 'Khoanh dòng công thức, nêu công thức đúng S = ½ab·sin C, thử trường hợp C = 90° (công thức sai cho 48 m² trong khi tam giác vuông 6×8 chỉ 24 m²), rồi mới sửa và tính lại S = 12.' },
      { question: 'Nêu hai cách kiểm độc lập cho một kết quả diện tích.', answer: 'Cách 1: tính lại bằng công thức khác (ví dụ S = abc/(4R) hoặc ½ah). Cách 2: ước lượng bằng cận S ≤ ½bc và so sánh với hình học (tam giác vuông bằng nửa hình chữ nhật).' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu bốn tiêu chí của một lời giải đạt.', answer: 'Dữ kiện đúng; chọn đúng công thức/định lý; biến đổi và thay số chính xác; có phép kiểm và kết luận có đơn vị.' },
      { level: 'NB', question: 'Khi gặp kết quả diện tích âm, cần kiểm tra gì?', answer: 'Kiểm công thức (thiếu ½, dùng cos, sai dấu), đơn vị và dữ kiện đầu vào; diện tích luôn dương nên kết quả âm chắc chắn sai.' },
      { level: 'TH', question: 'Sửa lời giải S = ab·sin C với a = 6, b = 8, C = 30°.', answer: 'Công thức đúng: S = ½ab·sin C = ½·6·8·0,5 = 12 (không phải 24).' },
      { level: 'TH', question: 'Nêu phép kiểm cho điểm (2; 3) với hệ x + y ≤ 4, x ≥ 0, y ≥ 0.', answer: '2 + 3 = 5 > 4 nên (2;3) không thuộc miền; điểm thuộc miền là (2; 2) vì 4 ≤ 4.' },
      { level: 'VD', question: 'Viết phản biện tôn trọng cho lời giải dùng a² = b² + c² + 2bc·cos A.', answer: '"Ở dòng công thức, dấu của số hạng 2bc·cos A cần là dấu trừ. Kiểm với A = 60°, b = 6, c = 8: công thức đúng cho a² = 52, công thức trong bài cho 148. Mình đề xuất sửa dấu và giữ lại các bước sau."' },
      { level: 'VD', question: 'Tạo một câu hỏi mở để kiểm tra hiểu sâu công thức diện tích.', answer: 'Ví dụ: "Vì sao với hai cạnh cố định, diện tích lớn nhất khi góc xen giữa bằng 90°? Nếu góc là 0° thì diện tích bằng bao nhiêu và hình học khi đó ra sao?" — câu hỏi buộc HS giải thích bản chất chứ không chỉ thay số.' },
    ],
    quick: [
      { question: 'Vì sao phải sửa công thức chứ không chỉ sửa kết quả?', solution: 'Vì công thức sai sẽ tiếp tục cho kết quả sai ở bài khác; sửa số chỉ che lỗi hiện tại.' },
      { question: 'Hai phép kiểm độc lập cho diện tích 24 m² là gì?', solution: 'Tính bằng ½·6·8 (tam giác vuông) và bằng abc/(4R) với R = 5; cả hai đều cho 24.' },
    ],
    mistakes: ['Sửa kết quả mà không chỉ ra dòng sai và nguyên nhân.', 'Phản biện bằng cảm giác, không có phép thử.', 'Chỉ dùng một phép kiểm duy nhất.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Quy trình phản biện 4 bước', 'a. Khoanh dòng đáng ngờ.', 'b. Nêu định nghĩa/điều kiện liên quan.', 'c. Thử giá trị cụ thể hoặc trường hợp biên.', 'd. Đề xuất sửa + phép kiểm thứ hai.', '2. Ba lỗi mẫu', 'a. S = ab·sin C thiếu ½ (đúng: 12).', 'b. Nhận (2;3) vào miền x + y ≤ 4 (sai: 5 > 4).', 'c. a² = b² + c² + 2bc·cos A (sai dấu).'],
  },
  aiError: {
    category: 'Lỗi khái niệm', wrongSolution: 'AI nhận xét: "Lời giải S = ab·sin C cho kết quả 24 là sai, phải là 12. Chỉ cần sửa số 24 thành 12, công thức giữ nguyên vì đã dùng đúng sin của góc xen giữa."',
    correction: 'Công thức thiếu hệ số ½: đúng là S = ½·a·b·sin C. Nếu giữ nguyên công thức, mọi bài sau đều sai gấp đôi.',
    proof: 'Với a = 6, b = 8, C = 90°: công thức đúng cho S = 24 m² (nửa hình chữ nhật 48), công thức AI giữ cho 48 m² — vượt cận ½ab. Vậy lỗi nằm ở công thức, không ở con số.',
    whyAiError: 'Mô hình ưu tiên khớp đáp án cuối thay vì truy nguyên quy tắc, nên chỉnh số mà bỏ qua lỗi công thức.',
    teacherPrompt: 'Em thử công thức AI giữ lại với C = 90° rồi sửa lại công thức cho đúng, không chỉ sửa số.',
    studentProduct: 'Thẻ Đ/S + nêu phản ví dụ C = 90° (48 m² > 24 m²) và sửa công thức thành ½ab·sin C.',
    boardPrompt: 'AI chỉ sửa 24 → 12, giữ công thức. Thử C = 90° xem còn đúng không.',
    libraryTitle: 'Lỗi AI sửa kết quả mà không sửa công thức gốc',
  },
};

const L45 = {
  ...base,
  key: '10-6-45', period: 45, lessonType: 'practice',
  title: 'Tự chọn — luyện tập hệ bất phương trình và mô hình',
  opening: 'Hôm nay lớp mình tự chọn một mô hình gần gũi và trình bày đủ: biến — ràng buộc — miền — tiêu chí.',
  focusQuestion: 'Khi tự xây mô hình, em kiểm tra tính hợp lý của nó bằng cách nào?',
  axis: `**Tình huống: Lớp tự chọn mô hình cho "ngày hội đọc sách": $x$ giờ chuẩn bị sách, $y$ giờ trang trí, tổng không quá 8 giờ, phải có ít nhất 2 giờ chuẩn bị sách.**

$$\\begin{cases} x + y \\le 8 \\\\ x \\ge 2 \\\\ y \\ge 0 \\end{cases}$$

- **Miền khả thi:** tam giác với $(2;0)$, $(8;0)$, $(2;6)$.
- **Tiêu chí tự chọn:** $P = x + 2y$ (mức "sẵn sàng").
- **Kiểm chứng tay:** $P(2;0) = 2$; $P(8;0) = 8$; $P(2;6) = 2 + 12 = 14$ → lớn nhất tại $(2;6)$.
- **Giới hạn của mô hình:** chưa tính số người tham gia; chưa tính thời gian nghỉ; giả định giờ công chia được nguyên.

**Bẫy của bài:** nêu mô hình mà không nêu giả định; đổi tiêu chí nhưng tưởng miền thay đổi.`,
  goals: {
    must: 'Viết hệ ràng buộc có điều kiện không âm và tìm miền khả thi.',
    should: 'Chọn một tiêu chí, tính tại các đỉnh và trình bày phương án tối ưu có lý do.',
    could: 'Nêu giới hạn của mô hình và phản biện một giả định có thể gây thiếu công bằng.',
  },
  s1: {
    title: 'Mô hình của lớp',
    context: 'Ngày hội đọc sách: tối đa 8 giờ, ít nhất 2 giờ chuẩn bị sách.',
    question: 'Khi đổi tiêu chí từ P = x + 2y sang P = 2x + y, yếu tố nào thay đổi?',
    options: ['Miền khả thi', 'Phương án được ưu tiên', 'Cả hai'],
    correct: 1,
    why: 'Miền khả thi do ràng buộc quyết định, không phụ thuộc tiêu chí; chỉ phương án ưu tiên thay đổi.',
    discuss: ['`[PHÁT HIỆN]` Phương án nào tốt nhất với P = x + 2y?', '`[SO SÁNH]` Với P = 2x + y thì phương án nào tốt nhất?'],
    cue: 'Viết hai tiêu chí cạnh nhau; HS tính nhanh tại (2;6) và (8;0).',
    lookFor: 'HS phân biệt miền khả thi với tiêu chí.',
  },
  s3: {
    title: 'Từ ràng buộc đến quyết định',
    steps: [
      'Đặt biến và điều kiện: $x, y \\ge 0$, $x \\ge 2$, $x + y \\le 8$.',
      'Liệt kê đỉnh miền khả thi: $(2;0)$, $(8;0)$, $(2;6)$.',
      'Chọn tiêu chí, lập bảng giá trị tại đỉnh, chọn phương án tốt nhất.',
      'Nêu giới hạn mô hình: giả định chia giờ nguyên, bỏ qua nghỉ ngơi, chưa tính nhân lực.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao cần nêu giới hạn mô hình?', '`[PHÁT HIỆN]` Với P = 2x + y, đỉnh nào tốt nhất?'],
    cue: 'Khung 4 bước; nhắc bước 4 (giới hạn) thường bị bỏ.',
    close: 'Mô hình tốt = ràng buộc rõ + tiêu chí rõ + giới hạn được nêu.',
  },
  s4: { bat: 'AI nói đổi tiêu chí sẽ làm miền khả thi thay đổi nên phải vẽ lại.', chung: 'Miền khả thi chỉ phụ thuộc ràng buộc; tiêu chí chỉ quyết định phương án được chọn.', sua: 'Giữ nguyên miền $(2;0)$, $(8;0)$, $(2;6)$; tính lại P theo tiêu chí mới.', cue: 'Cho HS tính P = 2x + y tại ba đỉnh để thấy kết quả khác nhưng miền không đổi.', lookFor: 'HS phân biệt ràng buộc với mục tiêu.' },
  s6: { hints: { M: 'viết ràng buộc và đỉnh trước, tiêu chí sau.', S: 'lập bảng P tại đỉnh rồi so sánh.', C: 'nêu 2 giới hạn của mô hình và đề xuất cách khắc phục.' }, lookFor: 'HS M đúng hệ; HS S chọn đúng; HS C nêu được giới hạn.' },
  postCheck: {
    q: 'Với hệ $x + y \\le 8$, $x \\ge 2$, $y \\ge 0$ và $P = x + 2y$, phương án nào tốt nhất và vì sao?',
    a: 'Đỉnh: (2;0) P = 2; (8;0) P = 8; (2;6) P = 14 → tốt nhất tại (2;6). Lý do: mỗi giờ trang trí đóng góp 2 điểm, nên dồn giờ cho y có lợi hơn.',
    ds: [{ t: '"Đổi tiêu chí làm đổi miền khả thi"', v: 'Sai' }, { t: '"Cực trị tuyến tính đạt tại đỉnh"', v: 'Đúng' }, { t: '"Mô hình cần nêu giả định"', v: 'Đúng' }],
    cue: 'Mời 2 HS trình bày bảng P và giới hạn mô hình.',
  },
  s8Close: 'Ràng buộc → miền; tiêu chí → quyết định; giả định → độ tin cậy.',
  s9: {
    title: 'Trình bày mô hình và giới hạn',
    bullets: ['Mô hình: 8 giờ, ít nhất 2 giờ sách; phương án tốt nhất (2;6) theo P = x + 2y.', 'Giới hạn 1: chưa tính số người nên giờ công có thể bị chia nhỏ không đều.', 'Giới hạn 2: chưa tính thời gian nghỉ và dọn dẹp — thực tế cần trừ 30 phút.'],
    cue: 'Hỏi: "Nếu trừ 30 phút nghỉ, mô hình đổi thế nào?" → x + y ≤ 7,5.',
  },
  exit: ['Nêu 4 bước của một mô hình đạt.', 'Nêu 1 bẫy (bỏ giả định; nhầm miền với tiêu chí).', 'Tự đánh giá M / S / C.', 'Với x + y ≤ 8, x ≥ 2, P = x + 2y, phương án tốt nhất là gì?'],
  exitCue: 'Mở lại bảng đỉnh ở mục II.',
  after: '- HS hoàn thành phiếu tự chọn; chuẩn bị tiết tự chọn tổng hợp chương III.',
  snapshot: {
    focus: 'Tự chọn mô hình hóa "ngày hội đọc sách": x + y ≤ 8, x ≥ 2, y ≥ 0 (miền (2;0), (8;0), (2;6)); chọn tiêu chí P = x + 2y (tối ưu tại (2;6) với P = 14); nêu giới hạn mô hình và phản biện giả định',
    formulas: ['\\text{Biến} \\to \\text{ràng buộc} \\to \\text{miền khả thi} \\to \\text{tiêu chí}', 'S = S_1 \\cap S_2 \\cap S_3', 'P = ux + vy'],
    examples: [
      { question: 'Chọn một tình huống gần gũi, ghi rõ dữ liệu giả định và hai ràng buộc.', answer: 'Ví dụ ngày hội đọc sách: x giờ chuẩn bị sách, y giờ trang trí; ràng buộc x + y ≤ 8 và x ≥ 2; giả định chia giờ nguyên, mỗi giờ công có người phụ trách.' },
      { question: 'Đổi tiêu chí nhưng giữ nguyên miền khả thi. Điều gì thay đổi?', answer: 'Miền khả thi không đổi (do ràng buộc quyết định); chỉ phương án được ưu tiên thay đổi: với P = x + 2y chọn (2;6), với P = 2x + y chọn (8;0) với giá trị 16.' },
    ],
    exercises: [
      { level: 'NB', question: 'Viết một hệ có x, y ≥ 0 và x + y ≤ 8.', answer: 'x ≥ 0, y ≥ 0, x + y ≤ 8 — miền là tam giác với (0;0), (8;0), (0;8).' },
      { level: 'NB', question: 'Nêu một phương án hợp lệ cho hệ x + y ≤ 8, x ≥ 2, y ≥ 0.', answer: 'Ví dụ (3; 4): 7 ≤ 8 và 3 ≥ 2.' },
      { level: 'TH', question: 'Thêm điều kiện x ≥ 2 vào hệ x, y ≥ 0, x + y ≤ 8 và tìm ba điểm hợp lệ.', answer: 'Ví dụ (2; 0), (5; 2), (2; 6) — cả ba thỏa x + y ≤ 8 và x ≥ 2.' },
      { level: 'TH', question: 'So sánh P = x + 2y tại (2; 6) và (8; 0).', answer: 'P(2;6) = 2 + 12 = 14; P(8;0) = 8. Theo tiêu chí này (2;6) tốt hơn.' },
      { level: 'VD', question: 'Thiết kế bảng tiêu chí để nhóm khác đánh giá một mô hình.', answer: 'Bốn tiêu chí: (1) biến rõ nghĩa và có đơn vị; (2) ràng buộc đúng lời văn; (3) miền khả thi và đỉnh được kiểm; (4) có nêu giả định và giới hạn, kết luận có lý do.' },
      { level: 'VD', question: 'Phản biện một giả định có thể làm mô hình thiếu công bằng.', answer: 'Giả định "mọi thành viên đóng góp giờ công như nhau" bỏ qua việc có bạn bận việc gia đình; mô hình sẽ phân công không công bằng. Cách sửa: thêm ràng buộc giới hạn giờ tối đa mỗi nhóm hoặc ghi rõ giả định để lớp thương lượng.' },
    ],
    quick: [
      { question: 'Đổi tiêu chí có làm đổi miền khả thi không?', solution: 'Không. Miền khả thi do ràng buộc quyết định; tiêu chí chỉ chọn phương án trong miền.' },
      { question: 'Vì sao phải nêu giới hạn của mô hình?', solution: 'Vì mô hình bỏ qua nhiều yếu tố thực tế (nhân lực, thời gian nghỉ, sai số đo); nêu giới hạn giúp người đọc biết phạm vi tin cậy của kết luận.' },
    ],
    mistakes: ['Chỉ nêu mô hình mà không nêu giả định.', 'Nhầm miền khả thi với tiêu chí.', 'Không kiểm đỉnh trước khi kết luận.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Bốn bước mô hình', 'a. Đặt biến + điều kiện.', 'b. Viết ràng buộc.', 'c. Tìm miền và đỉnh.', 'd. Chọn tiêu chí, tính tại đỉnh, nêu giới hạn.', '2. Ví dụ ngày hội đọc sách', 'a. Hệ: x + y ≤ 8, x ≥ 2, y ≥ 0.', 'b. Đỉnh: (2;0) P = 2; (8;0) P = 8; (2;6) P = 14.', '3. Giới hạn mô hình', 'a. Chưa tính nhân lực và thời gian nghỉ.', 'b. Giả định chia giờ nguyên.'],
  },
  aiError: {
    category: 'Lỗi khái niệm', wrongSolution: 'AI kết luận: "Muốn tối ưu theo tiêu chí mới P = 2x + y, cần vẽ lại miền khả thi vì tiêu chí thay đổi sẽ làm các ràng buộc thay đổi theo."',
    correction: 'Miền khả thi chỉ phụ thuộc các ràng buộc (x + y ≤ 8, x ≥ 2, y ≥ 0), không phụ thuộc tiêu chí. Đổi tiêu chí chỉ làm thay đổi phương án được ưu tiên.',
    proof: 'Với cả hai tiêu chí, miền vẫn là tam giác (2;0), (8;0), (2;6). Chỉ giá trị P thay đổi: P = x + 2y chọn (2;6) với 14; P = 2x + y chọn (8;0) với 16.',
    whyAiError: 'Mô hình gộp khái niệm "hàm mục tiêu" với "miền ràng buộc", dẫn tới việc vẽ lại miền mỗi khi đổi tiêu chí.',
    teacherPrompt: 'Em tính P = 2x + y tại ba đỉnh của miền cũ rồi sửa lại kết luận của AI về việc phải vẽ lại miền.',
    studentProduct: 'Thẻ Đ/S + nêu miền không đổi, bảng P theo tiêu chí mới, kết luận (8;0).',
    boardPrompt: 'AI nói đổi tiêu chí phải vẽ lại miền. Đúng hay sai?',
    libraryTitle: 'Lỗi AI nhầm tiêu chí với ràng buộc miền khả thi',
  },
};

const L46 = {
  ...base,
  key: '10-6-46', period: 46, lessonType: 'practice',
  title: 'Tự chọn — luyện tập tổng hợp chương III',
  opening: 'Tiết cuối chương: lớp mình tự chọn nhánh tam giác hoặc nhánh miền nghiệm, giải trọn và tự kiểm.',
  focusQuestion: 'Làm thế nào tự kiểm một bài chương III mà không cần đáp án?',
  axis: `**Tình huống: Hai nhánh bài tập của chương III, cùng một quy trình nhận dạng → chọn chiến lược → giải → kiểm → phản tư.**

**Nhánh A — tam giác:** $b = 6$, $c = 8$, $A = 60^\\circ$.
- $a^2 = 36 + 64 - 48 = 52 \\Rightarrow a = 2\\sqrt{13} \\approx 7{,}21$.
- $S = \\tfrac12\\cdot6\\cdot8\\cdot\\sin60^\\circ = 12\\sqrt3 \\approx 20{,}78$.
- Kiểm: $|8 - 6| = 2 < 7{,}21 < 14$ ✓; $S \\le \\tfrac12\\cdot6\\cdot8 = 24$ ✓.

**Nhánh B — miền nghiệm:** $x \\ge 0$, $y \\ge 0$, $x + y \\le 2$.
- Điểm nguyên: $(0;0)$, $(1;0)$, $(2;0)$, $(0;1)$, $(1;1)$, $(0;2)$.
- Đỉnh: $(0;0)$, $(2;0)$, $(0;2)$.

**Nhánh C — ngược:** $a = 13$, $b = 14$, $c = 15$, $S = 84$ → $R = \\dfrac{13\\cdot14\\cdot15}{4\\cdot84} = 8{,}125$.

**Bẫy của bài:** không kiểm sau khi giải; quên điều kiện nguyên; nhầm $R$ với $2R$.`,
  goals: {
    must: 'Chọn một nhánh và giải trọn vẹn với phép kiểm.',
    should: 'Giải cả nhánh tam giác và nhánh miền nghiệm, kiểm bằng hai cách độc lập.',
    could: 'Giải bài ngược tìm $R$; tự đặt tiêu chí đánh giá bài làm của mình.',
  },
  s1: {
    title: 'Chọn nhánh và cam kết',
    context: 'Ba nhánh A (tam giác), B (miền nghiệm), C (bài ngược tìm R).',
    question: 'Sau khi tính được a = 2√13, phép kiểm nào phù hợp nhất?',
    options: ['Không cần kiểm vì đã dùng đúng định lý', 'Kiểm bằng bất đẳng thức tam giác |b − c| < a < b + c', 'Kiểm bằng cách tính lại lần hai'],
    correct: 1,
    why: 'Bất đẳng thức tam giác là phép kiểm độc lập với công thức đã dùng; tính lại lần hai dễ lặp cùng một lỗi.',
    discuss: ['`[PHÁT HIỆN]` Điểm nguyên nào nằm trên biên của x + y ≤ 2?', '`[SO SÁNH]` Kiểm bằng cận S ≤ ½bc khác gì kiểm bằng bất đẳng thức tam giác?'],
    cue: 'Treo quy trình 5 bước; HS chọn nhánh và ghi cam kết.',
    lookFor: 'HS chọn phép kiểm độc lập với công thức.',
  },
  s3: {
    title: 'Quy trình 5 bước và chữa mẫu',
    steps: [
      'Nhận dạng: dữ kiện thuộc dạng nào (góc xen giữa, cặp cạnh–góc đối diện, hệ bất phương trình).',
      'Chọn chiến lược và viết công thức cụ thể.',
      'Giải, giữ căn thức khi có thể.',
      'Kiểm bằng phép độc lập: bất đẳng thức tam giác, cận diện tích, thay điểm vào hệ.',
      'Phản tư: nêu một điều dễ sai và cách tránh.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao giữ $2\\sqrt{13}$ thay vì làm tròn ngay?', '`[PHÁT HIỆN]` Với $R = 8{,}125$, kiểm bằng công thức nào?'],
    cue: 'Khung 5 bước; nhắc bước 4 và 5 là phần lớn HS bỏ qua.',
    close: 'Giải đúng chỉ là nửa bài; kiểm và phản tư mới khép kín quy trình.',
  },
  s4: { bat: 'AI kết luận $R = 16{,}25$ vì dùng $a/\\sin A = R$ thay vì $2R$.', chung: 'Định lý sin cho $a/\\sin A = 2R$; với $a = 13, b = 14, c = 15, S = 84$ thì $R = 8{,}125$, không phải $16{,}25$.', sua: 'Chia đôi kết quả: $R = 8{,}125$ m; kiểm bằng $S = abc/(4R) = 2730/32{,}5 = 84$ ✓.', cue: 'Cho HS kiểm ngược bằng công thức diện tích để thấy R = 8,125 mới đúng.', lookFor: 'HS dùng phép kiểm ngược thay vì tin kết quả.' },
  s6: { hints: { M: 'làm nhánh B trước vì ngắn; nhớ liệt kê điểm nguyên.', S: 'làm nhánh A, kiểm bằng bất đẳng thức tam giác và cận S.', C: 'làm nhánh C và kiểm ngược bằng S = abc/(4R).' }, lookFor: 'HS M đủ điểm nguyên; HS S có 2 phép kiểm; HS C kiểm ngược đúng.' },
  postCheck: {
    q: 'Với $a = 13$, $b = 14$, $c = 15$ và $S = 84$, tính $R$ và kiểm lại.',
    a: '$R = abc/(4S) = 2730/336 = 8{,}125$. Kiểm ngược: $abc/(4R) = 2730/32{,}5 = 84 = S$ ✓.',
    ds: [{ t: '"a/sin A = R"', v: 'Sai — phải bằng 2R' }, { t: '"S ≤ ½bc"', v: 'Đúng' }, { t: '"Điểm nguyên phải thỏa mọi điều kiện"', v: 'Đúng' }],
    cue: 'Chấm chéo bài theo 5 bước.',
  },
  s8Close: 'Nhận dạng → chiến lược → giải → kiểm → phản tư.',
  s9: {
    title: 'Tự đánh giá và chọn bài tiếp theo',
    bullets: ['Nhánh A cho $a \\approx 7{,}21$, $S \\approx 20{,}78$ — kiểm bằng hai cận.', 'Nhánh B có 6 điểm nguyên, 3 đỉnh.', 'Nhánh C cho $R = 8{,}125$ — kiểm ngược bằng diện tích khớp 84.'],
    cue: 'Hỏi: "Nhánh nào em thấy dễ sai nhất và vì sao?" — chuẩn bị cho phần tự đánh giá.',
  },
  exit: ['Nêu 5 bước của quy trình tổng hợp.', 'Nêu 1 bẫy (nhầm R với 2R; bỏ điểm nguyên; không kiểm).', 'Tự đánh giá M / S / C.', 'Tam giác 13, 14, 15 có S = 84: bán kính ngoại tiếp bằng bao nhiêu?'],
  exitCue: 'Mở lại ba nhánh ở mục II.',
  after: '- HS hoàn thành bài kiểm tra chương III; chuẩn bị nội dung chương tiếp theo.',
  snapshot: {
    focus: 'Luyện tập tổng hợp chương III theo quy trình 5 bước trên ba nhánh: tam giác b = 6, c = 8, A = 60° (a = 2√13 ≈ 7,21; S = 12√3 ≈ 20,78), miền nghiệm x + y ≤ 2 (6 điểm nguyên, 3 đỉnh), bài ngược a = 13, b = 14, c = 15, S = 84 → R = 8,125',
    formulas: ['a^2 = b^2 + c^2 - 2bc\\cos A', 'S = \\dfrac12 bc\\sin A \\quad; \\quad S = \\dfrac{abc}{4R}', 'S = S_1 \\cap S_2 \\cap S_3'],
    examples: [
      { question: 'Nhánh tam giác: b = 6, c = 8, A = 60°. Tính a và S, nêu vì sao chọn định lý côsin và công thức diện tích.', answer: 'Có hai cạnh và góc xen giữa nên dùng côsin: a² = 36 + 64 − 48 = 52 ⇒ a = 2√13 ≈ 7,21. Diện tích S = ½·6·8·sin60° = 12√3 ≈ 20,78. Kiểm: 2 < 7,21 < 14 và S ≤ 24.' },
      { question: 'Nhánh miền nghiệm: với x ≥ 0, y ≥ 0, x + y ≤ 2, liệt kê điểm nguyên và ba đỉnh.', answer: 'Điểm nguyên: (0;0), (1;0), (2;0), (0;1), (1;1), (0;2) — cả 6 điểm thỏa mọi điều kiện. Ba đỉnh: (0;0), (2;0), (0;2).' },
    ],
    exercises: [
      { level: 'NB', question: 'Với tam giác b = 3, c = 4, A = 90°, viết công thức tính a và S.', answer: 'a² = b² + c² − 2bc·cos A (với A = 90° thì cos = 0 nên a² = 25); S = ½·b·c·sin A = 6.' },
      { level: 'NB', question: 'Với hệ x ≥ 0, y ≥ 0, x + y ≤ 2, điểm (1; 1) có là nghiệm không?', answer: 'Có: 1 ≥ 0, 1 ≥ 0, 1 + 1 = 2 ≤ 2 (nằm trên biên).' },
      { level: 'TH', question: 'Cho tam giác b = 6, c = 8, A = 60°. Tính a và S.', answer: 'a² = 52 ⇒ a = 2√13 ≈ 7,21; S = ½·6·8·sin60° = 12√3 ≈ 20,78.' },
      { level: 'TH', question: 'Tìm các đỉnh miền nghiệm x + y ≤ 4, x ≥ 1, y ≥ 0.', answer: '(1;0), (4;0), (1;3) — kiểm: 1 + 3 = 4 ≤ 4.' },
      { level: 'VD', question: 'Với x + y ≤ 12, x ≥ 4, y ≥ 0 và P = 2x + 3y, so sánh P tại (4;8) và (12;0).', answer: 'P(4;8) = 8 + 24 = 32; P(12;0) = 24. Theo P, (4;8) tốt hơn.' },
      { level: 'VD', question: 'Cho tam giác a = 13, b = 14, c = 15 và S = 84. Tính bán kính ngoại tiếp R rồi kiểm tra bằng công thức diện tích.', answer: 'R = abc/(4S) = (13·14·15)/(4·84) = 2730/336 = 8,125. Kiểm ngược: abc/(4R) = 2730/32,5 = 84 = S ✓.' },
    ],
    quick: [
      { question: 'Vì sao không nên làm tròn a = 2√13 ngay từ đầu?', solution: 'Vì các bước sau (diện tích, kiểm bất đẳng thức) có thể tích luỹ sai số; giữ căn đến kết luận rồi mới làm tròn.' },
      { question: 'Nêu một phép kiểm cho kết quả R.', solution: 'Thay R vào S = abc/(4R) và so với diện tích đã biết; nếu khớp thì R đúng.' },
    ],
    mistakes: ['Nhầm a/sin A = R thay vì 2R.', 'Bỏ sót điểm nguyên trong miền nghiệm.', 'Không có phép kiểm sau khi giải.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Quy trình 5 bước', 'a. Nhận dạng dữ kiện.', 'b. Chọn chiến lược, viết công thức.', 'c. Giải, giữ căn thức.', 'd. Kiểm bằng phép độc lập.', 'e. Phản tư điều dễ sai.', '2. Ba nhánh bài tập', 'a. b = 6, c = 8, A = 60°: a = 2√13 ≈ 7,21; S = 12√3 ≈ 20,78.', 'b. x + y ≤ 2: 6 điểm nguyên; đỉnh (0;0), (2;0), (0;2).', 'c. 13-14-15, S = 84: R = 8,125.'],
  },
  aiError: {
    category: 'Lỗi khái niệm', wrongSolution: 'AI giải: "Tam giác có a = 13, b = 14, c = 15 và diện tích S = 84. Áp dụng định lý sin: a/sin A = R, và vì S = ½bc·sin A nên sin A = 2S/(bc) = 168/210 = 0,8. Suy ra R = a/sin A = 13/0,8 = 16,25."',
    correction: 'Định lý sin cho a/sin A = 2R, nên R = a/(2·sin A) = 13/1,6 = 8,125.',
    proof: 'Kiểm ngược: với R = 8,125 thì abc/(4R) = 2730/32,5 = 84 = S ✓. Với R = 16,25 thì abc/(4R) = 42, khác xa diện tích đã cho — chứng tỏ kết quả 16,25 sai.',
    whyAiError: 'Mô hình bỏ hệ số 2 trong hệ thức a/sin A = 2R, nhầm đường kính với bán kính.',
    teacherPrompt: 'Em kiểm kết quả R = 16,25 bằng công thức S = abc/(4R) rồi sửa lại cho đúng.',
    studentProduct: 'Thẻ Đ/S + phép kiểm ngược cho thấy R = 8,125 mới khớp S = 84.',
    boardPrompt: 'AI ra R = 16,25. Thay vào abc/(4R) được bao nhiêu?',
    libraryTitle: 'Lỗi AI nhầm 2R với R trong định lý sin',
  },
};

export default [L43, L44, L45, L46];

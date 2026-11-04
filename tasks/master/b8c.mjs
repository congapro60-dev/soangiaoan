import fs from 'node:fs';

const files = ['banToan-w5-w6', 'banToan-w11-batch2'].map((f) => `src/data/liveLessonPackages/${f}.snapshot.json`);
const specs = {};
for (const f of files) {
  const s = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const sp of s.lessonSpecs) specs[sp.key] = sp;
}
const snap = (key) => {
  const sp = specs[key];
  return {
    focus: sp.focus,
    formulas: sp.formulas,
    examples: sp.examples,
    exercises: sp.exercises,
    quick: sp.quick,
    mistakes: sp.mistakes,
    boardKnowledge: sp.boardKnowledge,
  };
};

const base = (key, period, lessonType = 'formation', timelineKey) => ({
  key, grade: Number(key.split('-')[0]), week: 11, period, lessonType, timelineKey,
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

const L1 = {
  ...base('12-11-80', 80),
  title: 'Phương sai và độ lệch chuẩn',
  goals: {
    must: 'Hiểu ý nghĩa phương sai và độ lệch chuẩn; tính s² và s từ bảng số liệu ghép nhóm nhỏ.',
    should: 'Sử dụng thành thạo công thức rút gọn s² = x̄² - (x̄)²; phân biệt ý nghĩa trực quan của s so với s².',
    could: 'So sánh độ ổn định giữa hai tập dữ liệu cùng số trung bình; phản biện lỗi viết s = ±√(s²).',
  },
  opening: 'Hai xạ thủ An và Bình có cùng điểm trung bình 9 điểm, nhưng phong độ có như nhau? Hôm nay lớp mình dùng phương sai và độ lệch chuẩn để trả lời.',
  focusQuestion: 'Vì sao độ lệch chuẩn s = √(s²) không bao giờ nhận giá trị âm?',
  axis: `**Tình huống: Đánh giá độ ổn định kết quả 20 phát bắn của hai xạ thủ An và Bình.**

| Nhóm điểm | Giá trị đại diện $c_i$ | Tần số An $n_i$ | Tần số Bình $n_i'$ |
|---|:---:|:---:|:---:|
| $[6; 8)$ | $7$ | $2$ | $7$ |
| $[8; 10)$ | $9$ | $16$ | $6$ |
| $[10; 12)$ | $11$ | $2$ | $7$ |
| **Tổng** | — | **$n = 20$** | **$n = 20$** |

- **Điểm trung bình:**
  - $\\bar x_A = (2\\cdot7 + 16\\cdot9 + 2\\cdot11)/20 = 180/20 = 9{,}0$ điểm.
  - $\\bar x_B = (7\\cdot7 + 6\\cdot9 + 7\\cdot11)/20 = 180/20 = 9{,}0$ điểm.
- **Phương sai và độ lệch chuẩn:**
  - Xạ thủ An: $s_A^2 = [2(7-9)^2 + 16(9-9)^2 + 2(11-9)^2]/20 = 16/20 = 0{,}8$ $\\implies s_A = \\sqrt{0{,}8} \\approx 0{,}89$ điểm.
  - Xạ thủ Bình: $s_B^2 = [7(7-9)^2 + 6(9-9)^2 + 7(11-9)^2]/20 = 56/20 = 2{,}8$ $\\implies s_B = \\sqrt{2{,}8} \\approx 1{,}67$ điểm.
- **Kết luận:** $\\bar x_A = \\bar x_B = 9{,}0$ nhưng $s_A < s_B$ ($0{,}89 < 1{,}67$) nên xạ thủ An có phong độ ổn định hơn hẳn xạ thủ Bình.

**Bẫy của bài:** viết $s = \\pm\\sqrt{s^2}$; quên nhân tần số $n_i$ khi tính tổng bình phương độ lệch; làm tròn số trung bình quá sớm.`,
  s1: {
    title: 'Cùng điểm trung bình, ai bắn ổn định hơn?',
    context: 'Hai xạ thủ An và Bình đều bắn 20 phát, cùng đạt điểm trung bình 9,0. An có 16 phát ở mức 9 điểm; Bình chia đều 7 phát 7 điểm và 7 phát 11 điểm.',
    question: 'Theo em, xạ thủ nào có phong độ thi đấu ổn định hơn?',
    options: ['Xạ thủ An (điểm tập trung quanh 9)', 'Xạ thủ Bình (nhiều điểm cao 11)', 'Hai xạ thủ ổn định như nhau'],
    correct: 0,
    why: 'An có 16/20 phát bắn rơi vào điểm 9, độ phân tán quanh số trung bình nhỏ hơn hẳn.',
    discuss: ['`[PHÁT HIỆN]` Cùng điểm trung bình vì sao độ ổn định lại khác nhau?', '`[SO SÁNH]` Số đo nào lượng hoá được độ phân tán này?'],
    cue: 'Nhắc lại: số trung bình chỉ đo xu thế trung tâm; muốn biết mức độ phân tán cần phương sai và độ lệch chuẩn.',
    lookFor: 'HS nhận ra độ chụm quanh giá trị trung tâm.',
  },
  s3: {
    title: 'Công thức phương sai và độ lệch chuẩn',
    steps: [
      'Bước 1: Tính số trung bình $\\bar x = \\dfrac{1}{n}\\sum n_i c_i$.',
      'Bước 2: Phương sai theo định nghĩa $s^2 = \\dfrac{1}{n}\\sum n_i (c_i - \\bar x)^2$.',
      'Bước 3: Công thức rút gọn $s^2 = \\dfrac{1}{n}\\sum n_i c_i^2 - \\bar x^2$.',
      'Bước 4: Độ lệch chuẩn $s = \\sqrt{s^2} \\ge 0$ (luôn lấy căn bậc hai số học).',
    ],
    ask: ['`[SUY LUẬN]` Vì sao phải bình phương $(c_i - \\bar x)$?', '`[PHÁT HIỆN]` Vì sao $s$ cùng đơn vị với dữ liệu gốc còn $s^2$ thì không?'],
    cue: 'Khung 4 bước; nhấn mạnh s ≥ 0 và công thức rút gọn nhanh hơn khi tính tay.',
    close: 'Phương sai bình phương độ lệch; độ lệch chuẩn đưa về cùng đơn vị; s càng nhỏ dữ liệu càng đồng đều.',
  },
  s4: {
    bat: 'AI giải: s² = 9 nên độ lệch chuẩn s = ±3.',
    chung: 'Theo định nghĩa, độ lệch chuẩn s = √(s²) là căn bậc hai số học của một số không âm, nên s ≥ 0.',
    sua: 's = √9 = 3 (chỉ nhận giá trị không âm); khoảng cách và độ phân tán không thể mang giá trị âm.',
    cue: 'Cho HS nhắc lại định nghĩa căn bậc hai số học ở lớp 9: √a ≥ 0.',
    lookFor: 'HS chỉ ra căn bậc hai số học luôn không âm.',
  },
  s6: {
    hints: {
      M: 'tính x̄ trước, rồi dùng công thức rút gọn s² = (1/n)Σ n_i c_i² - x̄²; lấy căn ra s.',
      S: 'lập bảng cột phụ c_i, c_i², n_i c_i, n_i c_i²; kiểm tra tổng tần số n.',
      C: 'so sánh hai mẫu: mẫu nào có s nhỏ hơn thì đồng đều hơn; giải thích ý nghĩa thực tế.',
    },
    lookFor: 'HS M tính đúng s; HS S lập đúng bảng phụ; HS C so sánh và kết luận chính xác.',
  },
  postCheck: {
    q: 'Cho mẫu ghép nhóm có $n = 10$, $\\sum n_i c_i^2 = 250$ và $\\bar x = 4$. Tính $s^2$ và $s$.',
    a: '$s^2 = 250/10 - 4^2 = 25 - 16 = 9$; $s = \\sqrt{9} = 3$.',
    ds: [
      { t: '"Độ lệch chuẩn s có thể nhận giá trị âm"', v: 'Sai — s luôn ≥ 0' },
      { t: '"Công thức rút gọn: s² = (1/n)Σ n_i c_i² - x̄²"', v: 'Đúng' },
      { t: '"Hai mẫu cùng trung bình thì độ lệch chuẩn phải bằng nhau"', v: 'Sai — có thể khác nhau hoàn toàn' },
    ],
    cue: 'Đổi phiếu chấm chéo, chú ý không ghi s = ±3.',
  },
  s8Close: 's² = (1/n)Σ n_i c_i² - x̄²; s = √(s²) ≥ 0; s nhỏ ⟹ dữ liệu đồng đều.',
  s9: {
    title: 'Đánh giá xạ thủ cho đội tuyển bắn súng',
    bullets: [
      'An có s = 0,89 điểm; Bình có s = 1,67 điểm — An ổn định gần gấp đôi Bình.',
      'Trong thi đấu đỉnh cao, sự ổn định quyết định thành tích chung cuộc.',
      'Khuyến nghị Ban huấn luyện: chọn An đi thi đấu chính thức; Bình cần rèn thêm tâm lý vững vàng.',
    ],
    cue: 'Hỏi: "Nếu đi thi đấu loại trực tiếp, HLV nên chọn ai và tại sao?"',
  },
  exit: [
    'Nêu công thức tính phương sai và độ lệch chuẩn của mẫu ghép nhóm.',
    'Nêu 1 bẫy (viết s = ±3; quên nhân tần số n_i).',
    'Tự đánh giá M / S / C.',
    'Hai xạ thủ An và Bình: ai bắn ổn định hơn và số đo nào chứng minh?',
  ],
  exitCue: 'Mở lại bảng so sánh An và Bình ở mục II.',
  after: '- HS làm bài tập SGK về phương sai, độ lệch chuẩn; chuẩn bị bài kiểm tra cuối chương.',
  snapshot: snap('12-11-80'),
  aiError: {
    category: 'Lỗi đại số',
    wrongSolution: 'AI viết: s² = 9 nên độ lệch chuẩn s = ±3.',
    correction: 's = √(s²) là căn bậc hai số học nên chỉ nhận giá trị không âm: s = 3.',
    proof: 'Theo định nghĩa s = √(s²) và căn bậc hai số học của một số không âm luôn không âm, nên không thể có hai giá trị ±3.',
    whyAiError: 'Mô hình nhầm lẫn giữa nghiệm của phương trình đại số x² = 9 (có hai nghiệm ±3) với giá trị căn bậc hai số học s = √9.',
    teacherPrompt: 'Bài giải AI sai ở đâu? Hãy chỉ lỗi và sửa lại: vì sao độ lệch chuẩn không thể âm?',
    studentProduct: 'Khoanh dòng sai, ghi “lỗi đại số”, sửa thành s = 3 và nêu định nghĩa căn bậc hai số học.',
    boardPrompt: 'AI viết s = ±3. Căn bậc hai số học s = √(s²) nhận giá trị gì?',
    libraryTitle: 'Lỗi AI viết độ lệch chuẩn nhận hai giá trị âm dương',
  },
};

export default [L1];

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
  ...base('10-11-79', 79),
  title: 'Số gần đúng và sai số',
  goals: {
    must: 'Phân biệt số đúng và số gần đúng; tính sai số tuyệt đối của một phép đo đơn giản.',
    should: 'Tính sai số tương đối và quy tròn số gần đúng đúng hàng theo độ chính xác d.',
    could: 'So sánh độ chính xác giữa các phép đo khác đơn vị; phản biện kết luận quy tròn sai hàng.',
  },
  opening: 'Đo chiều dài bàn bằng thước cuộn, ta chỉ có số gần đúng — hôm nay lớp mình học cách nói chính xác về "sai bao nhiêu".',
  focusQuestion: 'Vì sao không thể nói "chiều dài đúng là 1,205 m" mà phải nói kèm độ chính xác?',
  axis: `**Tình huống: Đo đạc thực tế của nhóm kỹ thuật — mọi số đo đều là số gần đúng.**

| Số đo | Giá trị | Độ chính xác |
|---|---|---|
| Chiều dài mép bàn | $1{,}205$ m | $d = 0{,}001$ m |
| Chiều cao Fansipan | $3\\,147{,}3$ m | $d = 0{,}2$ m |

- **Kiểm chứng tay:** quy tròn $3\\,147{,}3$ với $d = 0{,}2$: chữ số khác 0 đầu tiên của $d$ ở hàng phần mười → quy tròn đến hàng **đơn vị** → $3\\,147$ m.
- Với $d = 0{,}001$: quy tròn đến hàng phần nghìn → $1{,}205$ m (đã đúng hàng).
- **Sai số tuyệt đối:** $\\Delta_a = |\\bar a - a|$; **sai số tương đối:** $\\delta_a = \\dfrac{\\Delta_a}{|a|}$.

**Bẫy của bài:** quy tròn đến chính hàng của chữ số khác 0 trong $d$ (phải lùi một hàng); nhầm sai số tuyệt đối với tương đối.`,
  s1: {
    title: 'Số đo nào đáng tin?',
    context: 'Hai số đo: 1,205 m (d = 0,001 m) và 3 147,3 m (d = 0,2 m).',
    question: 'Với $d = 0{,}2$, phải quy tròn số $3\\,147{,}3$ đến hàng nào?',
    options: ['Hàng phần mười', 'Hàng đơn vị', 'Hàng chục'],
    correct: 1,
    why: 'Chữ số khác 0 đầu tiên của d = 0,2 ở hàng phần mười, nên quy tròn đến hàng liền trước: hàng đơn vị → 3 147 m.',
    discuss: ['`[PHÁT HIỆN]` Vì sao không giữ chữ số hàng phần mười?', '`[SO SÁNH]` Nếu d = 0,02 thì quy tròn đến hàng nào?'],
    cue: 'Viết quy tắc thành 2 bước: tìm hàng của chữ số khác 0 đầu tiên trong d → lùi một hàng.',
    lookFor: 'HS lùi đúng một hàng so với d.',
  },
  s3: {
    title: 'Ba khái niệm và quy tắc quy tròn',
    steps: [
      'Số đúng $\\bar a$ và số gần đúng $a$; sai số tuyệt đối $\\Delta_a = |\\bar a - a| \\le d$.',
      'Sai số tương đối $\\delta_a = \\dfrac{\\Delta_a}{|a|}$ — dùng để so sánh độ chính xác giữa các phép đo khác đơn vị.',
      'Quy tròn theo độ chính xác $d$: xác định hàng của chữ số khác 0 đầu tiên trong $d$, rồi quy tròn đến hàng liền trước.',
      'Kiểm: sau khi quy tròn, sai số không vượt quá $d$.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao phải lùi một hàng so với d?', '`[PHÁT HIỆN]` Số 1,205 với d = 0,001 quy tròn đến hàng nào?'],
    cue: 'Khung 2 bước quy tròn; cho HS làm 3 ví dụ nhanh với d khác nhau.',
    close: 'Số gần đúng chỉ có nghĩa khi đi kèm độ chính xác; quy tròn theo d luôn lùi một hàng.',
  },
  s4: { bat: 'AI quy tròn đến đúng hàng của chữ số khác 0 trong d (hàng phần mười) nên giữ 3 147,3.', chung: 'd = 0,2 có chữ số khác 0 ở hàng phần mười, nên hàng quy tròn là hàng liền trước: hàng đơn vị.', sua: '3 147,3 ≈ 3 147 m; kiểm: mọi giá trị trong [3 146,8; 3 147,8] đều quy tròn về 3 147, sai số không vượt 0,5 < 1 hàng quy tròn.', cue: 'Cho HS đọc lại quy tắc trong SGK rồi đối chiếu từng bước.', lookFor: 'HS nhận ra hàng quy tròn lùi một hàng so với d.' },
  s6: { hints: { M: 'tìm hàng của chữ số khác 0 đầu tiên trong d, lùi một hàng.', S: 'tính sai số tuyệt đối và tương đối, chú ý đơn vị.', C: 'phân tích vì sao cùng sai số tuyệt đối nhưng sai số tương đối khác nhau.' }, lookFor: 'HS M quy tròn đúng; HS S tính đúng hai loại sai số; HS C so sánh được độ chính xác.' },
  postCheck: {
    q: 'Cho $a = 15$ với độ chính xác $d = 0{,}2$. Viết khoảng chặn của số đúng $\\bar a$.',
    a: '$15 - 0{,}2 \\le \\bar a \\le 15 + 0{,}2$, tức $14{,}8 \\le \\bar a \\le 15{,}2$.',
    ds: [{ t: '"Quy tròn theo d thì lấy đúng hàng của chữ số khác 0 trong d"', v: 'Sai — phải lùi một hàng' }, { t: '"Sai số tương đối = Δ_a / |a|"', v: 'Đúng' }, { t: '"Số gần đúng luôn kèm độ chính xác"', v: 'Đúng' }],
    cue: 'Chấm chéo 2 phiếu, cùng kiểm khoảng chặn.',
  },
  s8Close: 'Số đúng — số gần đúng — d — quy tròn lùi một hàng.',
  s9: {
    title: 'Báo cáo số đo cho nhóm kỹ thuật',
    bullets: ['Mép bàn: 1,205 m ± 0,001 m — sai số tương đối ≈ 0,08%.', 'Fansipan: 3 147 m ± 0,2 m — sai số tương đối ≈ 0,006%.', 'Cùng sai số tuyệt đối nhỏ nhưng sai số tương đối khác nhau vì độ lớn số đo khác nhau.'],
    cue: 'Hỏi: "Vì sao cùng đo bằng thước mà sai số tương đối lại khác?"',
  },
  exit: ['Nêu khái niệm sai số tuyệt đối và tương đối.', 'Nêu 1 bẫy (quy tròn đúng hàng của d).', 'Tự đánh giá M / S / C.', 'Quy tròn 3 147,3 với d = 0,2 được bao nhiêu?'],
  exitCue: 'Mở lại khung 2 bước ở S3.',
  after: '- HS làm bài tập SGK về số gần đúng; chuẩn bị bài mẫu số liệu ghép nhóm.',
  snapshot: snap('10-11-79'),
  aiError: {
    whyAiError: 'Mô hình hiểu "độ chính xác d" là hàng cần giữ thay vì hàng sai số cho phép, nên không lùi một hàng khi quy tròn.',
    boardPrompt: 'AI quy tròn 3 147,3 đến hàng phần mười với d = 0,2. Quy tắc nói gì?',
    libraryTitle: 'Lỗi AI quy tròn sai hàng theo độ chính xác',
  },
};

const L2 = {
  ...base('10-11-80', 80),
  title: 'Các số đặc trưng đo xu thế trung tâm — Tiết 1: Số trung bình và Trung vị',
  goals: {
    must: 'Tính số trung bình từ bảng tần số và tìm trung vị của mẫu nhỏ.',
    should: 'Xử lý đúng n chẵn/lẻ khi tìm trung vị; giải thích khi nào trung bình bị ngoại lai bóp méo.',
    could: 'So sánh trung bình và trung vị trên dữ liệu thực tế; phản biện báo cáo chỉ dùng một số đo.',
  },
  opening: 'Bảng lương công ty Alpha có một Giám đốc lương 130 triệu — hôm nay lớp mình xem con số nào phản ánh trung thực thu nhập.',
  focusQuestion: 'Khi nào số trung bình "nói dối" và trung vị nói thật?',
  axis: `**Tình huống: Bảng lương tháng của công ty Công nghệ Alpha (10 người).**

| Vị trí | Số người | Lương (triệu/tháng) |
|---|:---:|:---:|
| Giám đốc sáng lập | 1 | 130 |
| Trưởng phòng kỹ thuật | 1 | 25 |
| Nhân viên lập trình | 8 | 10 |

- **Kiểm chứng tay:** tổng quỹ lương $= 130 + 25 + 8\\cdot10 = 235$ triệu; $\\bar x = 235/10 = 23{,}5$ triệu.
- **Trung vị:** sắp xếp $10; 10; \\ldots; 10; 25; 130$ (8 số 10) → $n = 10$ chẵn nên $M_e = (x_5 + x_6)/2 = 10$ triệu.
- **Nhận xét:** trung bình 23,5 triệu cao hơn gấp đôi lương của 8/10 người; trung vị 10 triệu phản ánh đúng mức phổ biến.

**Bẫy của bài:** chia cho số dòng bảng (4) thay vì tổng tần số (10); quên sắp xếp trước khi tìm trung vị.`,
  s1: {
    title: 'Con số nào phản ánh trung thực?',
    context: 'Một Giám đốc 130 triệu, một Trưởng phòng 25 triệu, tám nhân viên 10 triệu.',
    question: 'Số trung bình lương của công ty là bao nhiêu?',
    options: ['10 triệu', '23,5 triệu', '55 triệu'],
    correct: 1,
    why: 'Tổng 235 triệu chia cho 10 người = 23,5 triệu.',
    discuss: ['`[PHÁT HIỆN]` Vì sao trung bình cao hơn lương 8/10 người?', '`[SO SÁNH]` Trung vị bằng bao nhiêu?'],
    cue: 'Viết bảng tần số 3 dòng; nhắc "mẫu số là tổng số người, không phải số dòng".',
    lookFor: 'HS dùng n = 10 chứ không phải 3 hay 4.',
  },
  s3: {
    title: 'Hai số đo và khi nào dùng',
    steps: [
      'Số trung bình: $\\bar x = \\dfrac{1}{n}\\sum x_i$ hoặc $\\dfrac{1}{n}\\sum m_i x_i$ với bảng tần số.',
      'Trung vị: sắp xếp không giảm; $n$ lẻ → $M_e = x_{(n+1)/2}$; $n$ chẵn → trung bình hai số giữa.',
      '$\\bar x$ nhạy với giá trị ngoại lai; $M_e$ bền vững hơn.',
      'Chọn số đo theo mục đích: mô tả "mức phổ biến" → trung vị; mô tả "tổng chia đều" → trung bình.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao trung vị không bị 130 triệu kéo lệch?', '`[PHÁT HIỆN]` Nếu thêm một nhân viên lương 10 triệu thì trung bình đổi thế nào?'],
    cue: 'Khung 3 dòng: công thức — cách tìm — khi nào dùng.',
    close: 'Trung bình san đều mọi người; trung vị chỉ quan tâm vị trí giữa.',
  },
  s4: { bat: 'AI chia cho 4 (số dòng bảng) nên ra 37,25 cm cho bài chiều cao cây.', chung: 'Mẫu số phải là tổng tần số: 4 + 3 + 2 + 1 = 10, nên $\\bar x = 149/10 = 14{,}9$ cm.', sua: 'Dùng n = tổng tần số, không phải số nhóm.', cue: 'Cho HS cộng tần số trước khi chia.', lookFor: 'HS kiểm n trước khi tính.' },
  s6: { hints: { M: 'cộng tần số để có n rồi chia.', S: 'sắp xếp trước khi tìm trung vị, chú ý n chẵn/lẻ.', C: 'so sánh trung bình và trung vị khi có ngoại lai.' }, lookFor: 'HS M đúng n; HS S đúng trung vị; HS C giải thích được.' },
  postCheck: {
    q: 'Tìm trung vị của mẫu: 12, 7, 3, 15, 8, 9, 21.',
    a: 'Sắp xếp: 3, 7, 8, 9, 12, 15, 21 (n = 7 lẻ) → $M_e = x_4 = 9$.',
    ds: [{ t: '"Mẫu số của x̄ là số dòng bảng tần số"', v: 'Sai — là tổng tần số' }, { t: '"Trung vị cần sắp xếp mẫu trước"', v: 'Đúng' }, { t: '"Trung bình bền vững hơn trung vị khi có ngoại lai"', v: 'Sai' }],
    cue: 'Chấm chéo, kiểm bằng cách sắp xếp lại.',
  },
  s8Close: 'n = tổng tần số; trung vị cần sắp xếp.',
  s9: {
    title: 'Báo cáo thu nhập cho công ty Alpha',
    bullets: ['Trung bình 23,5 triệu nhưng 8/10 người nhận 10 triệu — trung bình bị 130 triệu kéo lên.', 'Trung vị 10 triệu phản ánh đúng mức lương phổ biến.', 'Khuyến nghị: báo cáo cả hai con số kèm giải thích, không chỉ dùng trung bình.'],
    cue: 'Hỏi: "Nếu phải chọn một con số để tuyển dụng, em chọn con số nào và vì sao?"',
  },
  exit: ['Nêu công thức trung bình và cách tìm trung vị.', 'Nêu 1 bẫy (chia cho số dòng; quên sắp xếp).', 'Tự đánh giá M / S / C.', 'Bảng lương Alpha: trung bình và trung vị bằng bao nhiêu?'],
  exitCue: 'Mở lại bảng lương ở mục II.',
  after: '- HS làm bài tập SGK; chuẩn bị tiết tứ phân vị và mốt.',
  snapshot: snap('10-11-80'),
  aiError: {
    teacherPrompt: 'Hãy chỉ lỗi và sửa lại lời giải: em chia cho số nào mới đúng?',
    whyAiError: 'Mô hình dùng số nhóm (số dòng bảng) làm mẫu số thay vì tổng tần số, dẫn tới trung bình bị phóng đại.',
    boardPrompt: 'AI chia cho 4. Bảng có bao nhiêu số liệu thật?',
    libraryTitle: 'Lỗi AI chia cho số nhóm thay vì tổng tần số',
  },
};

export default [L1, L2];

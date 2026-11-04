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
  ...base('11-11-75', 75),
  title: 'Mẫu số liệu ghép nhóm',
  goals: {
    must: 'Hiểu khái niệm mẫu số liệu ghép nhóm, nửa khoảng [a; b); tính giá trị đại diện và độ dài nhóm.',
    should: 'Lập bảng ghép nhóm từ dãy số liệu thô; xác định đúng nhóm cho giá trị nằm ở đầu mút.',
    could: 'Giải thích vì sao phải giữ nhóm có tần số 0; phản biện bảng ghép nhóm bị hở hoặc chồng lấn.',
  },
  opening: 'Thời gian dùng Internet của 40 học sinh trải dài từ 42 đến 235 phút — hôm nay lớp mình học cách nhóm dữ liệu để nhìn rõ bức tranh chung.',
  focusQuestion: 'Vì sao một học sinh dùng đúng 90 phút Internet lại thuộc nhóm [90; 120) mà không thuộc [60; 90)?',
  axis: `**Tình huống: Khảo sát thời gian sử dụng Internet hằng ngày của 40 học sinh lớp 11A (đơn vị: phút).**

- Giá trị nhỏ nhất: $x_{\\min} = 42$ phút; giá trị lớn nhất: $x_{\\max} = 235$ phút.
- Khoảng biến thiên: $R = 235 - 42 = 193$ phút (rất rộng, lập bảng đơn lẻ sẽ dài 40 dòng).
- Chia 6 nhóm có độ dài $h = 40$ phút bắt đầu từ 30 phút:

| Nhóm thời gian (phút) | Giá trị đại diện $c_i$ | Tần số $m_i$ |
|---|:---:|:---:|
| $[30; 70)$ | $50$ | $10$ |
| $[70; 110)$ | $90$ | $15$ |
| $[110; 150)$ | $130$ | $11$ |
| $[150; 190)$ | $170$ | $3$ |
| $[190; 230)$ | $210$ | $0$ |
| $[230; 270)$ | $250$ | $1$ |
| **Tổng** | — | **$n = 40$** |

- **Quy tắc mút:** $[a_i; a_{i+1})$ lấy dấu $\\ge$ ở mút trái, $<$ ở mút phải. Giá trị 90 nằm trong $[90; 110)$ chứ không thuộc $[70; 90)$.
- **Nhóm tần số 0:** nhóm $[190; 230)$ có tần số 0 vẫn phải giữ để bảng liên tiếp, không tạo hổng.

**Bẫy của bài:** nhầm nửa khoảng $[a; b)$ thành đoạn $[a; b]$ nên xếp giá trị ở mút phải vào nhóm trước; tự tiện xoá nhóm có tần số bằng 0.`,
  s1: {
    title: 'Học sinh 90 phút ở nhóm nào?',
    context: 'Khảo sát 40 học sinh; bạn Nam dùng đúng 90 phút Internet mỗi ngày.',
    question: 'Bạn Nam thuộc nhóm nào trong hai nhóm: $[70; 90)$ hay $[90; 110)$?',
    options: ['Nhóm [70; 90)', 'Nhóm [90; 110)', 'Thuộc cả hai nhóm'],
    correct: 1,
    why: 'Quy ước nửa khoảng [a; b) lấy ≥ ở mút trái và < ở mút phải, nên 90 thuộc [90; 110).',
    discuss: ['`[PHÁT HIỆN]` Vì sao không lấy dấu bằng ở cả hai đầu mút?', '`[SO SÁNH]` Nếu dùng đúng 70 phút thì ở nhóm nào?'],
    cue: 'Vẽ trục số và kí hiệu nửa khoảng [a; b): mút trái ngoặc vuông [, mút phải ngoặc tròn ).',
    lookFor: 'HS nhớ quy tắc ngoặc vuông lấy bằng, ngoặc tròn không lấy bằng.',
  },
  s3: {
    title: 'Quy trình ghép nhóm 3 bước',
    steps: [
      'Bước 1: Tìm khoảng biến thiên $R = x_{\\max} - x_{\\min}$.',
      'Bước 2: Chọn số nhóm $k$ và độ dài nhóm $h \\ge R/k$; chọn điểm bắt đầu $a_1 \\le x_{\\min}$.',
      'Bước 3: Lập các nửa khoảng liên tiếp $[a_i; a_{i+1})$, đếm tần số $m_i$; kiểm tra $\\sum m_i = n$.',
      'Bước 4: Tính giá trị đại diện $c_i = (a_i + a_{i+1})/2$.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao nhóm tần số 0 vẫn phải ghi vào bảng?', '`[PHÁT HIỆN]` Điều gì xảy ra nếu các nhóm bị hở?'],
    cue: 'Khung 3 bước ghép nhóm; nhấn mạnh quy tắc bao phủ và liên tiếp.',
    close: 'Mỗi dữ liệu thuộc duy nhất một nhóm; tổng tần số luôn bằng cỡ mẫu n; không bỏ nhóm tần số 0.',
  },
  s4: {
    bat: 'AI xếp học sinh dùng 90 phút vào nhóm [60; 90) vì thấy số 90 ở cuối nhóm.',
    chung: 'Kí hiệu [a; b) nghĩa là a ≤ x < b, nên 90 < 90 là sai; 90 không thể thuộc [60; 90).',
    sua: 'Xếp vào nhóm [90; 120) vì 90 ≤ 90 < 120 thỏa quy ước mút trái.',
    cue: 'Cho HS viết định nghĩa nửa khoảng [a; b) dưới dạng bất đẳng thức kép.',
    lookFor: 'HS chỉ ra dấu < ở mút phải.',
  },
  s6: {
    hints: {
      M: 'độ dài nhóm = mút phải trừ mút trái; giá trị đại diện = trung bình cộng hai mút.',
      S: 'nhớ quy tắc nửa khoảng [a; b): x = a thuộc nhóm, x = b không thuộc nhóm.',
      C: 'kiểm tra tính liên tiếp và tổng tần số phải bằng n; không được bỏ nhóm tần số 0.',
    },
    lookFor: 'HS M tính đúng c; HS S xếp đúng mút; HS C giải thích được nhóm rỗng.',
  },
  postCheck: {
    q: 'Cho nhóm $[20; 30)$. Nêu giá trị đại diện và cho biết giá trị 30 có thuộc nhóm này không.',
    a: '$c = (20 + 30)/2 = 25$; giá trị 30 KHÔNG thuộc nhóm vì mút phải là ngoặc tròn ($<$).',
    ds: [
      { t: '"Nhóm [a; b) lấy dấu bằng ở cả hai đầu mút"', v: 'Sai — chỉ lấy dấu bằng ở mút trái' },
      { t: '"Giá trị đại diện là trung điểm của hai đầu mút"', v: 'Đúng' },
      { t: '"Nhóm có tần số 0 có thể xoá bỏ khỏi bảng"', v: 'Sai — phải giữ để bảng liên tiếp' },
    ],
    cue: 'Đổi phiếu chấm chéo, kiểm tra kĩ phần ngoặc tròn.',
  },
  s8Close: '[a; b) lấy mút trái, bỏ mút phải; c = (a+b)/2; giữ nguyên nhóm tần số 0.',
  s9: {
    title: 'Báo cáo thời gian Internet cho Đoàn trường',
    bullets: [
      'Nhóm [70; 110) phút có tần số đông nhất (15/40 HS, chiếm 37,5%).',
      'Có 1 HS dùng tới hơn 230 phút/ngày — cần lưu ý hỗ trợ cá nhân.',
      'Nhóm [190; 230) dù tần số 0 vẫn phải giữ trên biểu đồ để không làm sai lệch trục thời gian.',
    ],
    cue: 'Hỏi: "Nếu bỏ nhóm 0 thì biểu đồ trông sẽ bị méo như thế nào?"',
  },
  exit: [
    'Nêu quy ước dấu ở hai đầu mút của nửa khoảng [a; b).',
    'Nêu 1 bẫy (xếp giá trị mút phải vào nhóm; xoá nhóm tần số 0).',
    'Tự đánh giá M / S / C.',
    'Học sinh dùng 90 phút Internet thuộc nhóm [70; 90) hay [90; 110)?',
  ],
  exitCue: 'Mở lại sơ đồ trục số ở S1.',
  after: '- HS làm bài tập SGK về bảng ghép nhóm; chuẩn bị tiết số đặc trưng đo xu thế trung tâm.',
  snapshot: snap('11-11-75'),
  aiError: {
    category: 'Lỗi khái niệm',
    wrongSolution: 'AI viết: Học sinh dùng Internet 90 phút thuộc nhóm [60; 90) vì 90 nằm ở cuối nhóm này.',
    correction: 'Nhóm [60; 90) lấy dấu < ở mút phải nên không chứa 90; học sinh đó thuộc nhóm [90; 120) vì mút trái lấy dấu ≥.',
    proof: 'Kí hiệu nửa khoảng: [a; b) nghĩa là a ≤ x < b. Với x = 90 và nhóm [60; 90) thì 90 < 90 là sai, nên 90 không thuộc nhóm này.',
    whyAiError: 'Mô hình nhầm nửa khoảng [a; b) thành đoạn [a; b] lấy dấu bằng ở cả hai đầu mút.',
    teacherPrompt: 'Lời giải AI sai ở quy tắc nào? Hãy chỉ lỗi và sửa lại: xếp 90 phút vào đúng nhóm.',
    studentProduct: 'Khoanh dòng sai, ghi “lỗi khái niệm”, viết 90 ≥ 90 nên thuộc [90; 120) làm bằng chứng.',
    boardPrompt: 'AI xếp 90 vào [60; 90). Kí hiệu [a; b) quy ước gì ở mút phải?',
    libraryTitle: 'Lỗi AI nhầm quy ước mút của nửa khoảng ghép nhóm',
  },
};

export default [L1];

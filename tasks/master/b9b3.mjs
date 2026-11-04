const base = (key, period, lessonType = 'formation') => ({
  key, grade: 11, week: 12, period, lessonType, timelineKey: 'default',
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

// Bài 9: 11-12-86 — Hai mặt phẳng song song (Tiết 4: Hình lăng trụ và hình hộp)
const L86 = {
  ...base('11-12-86', 86, 'formation'),
  title: 'Hai mặt phẳng song song',
  goals: {
    must: 'Hiểu định nghĩa hình lăng trụ, hình hộp; nhận biết các đáy, mặt bên, cạnh bên.',
    should: 'Nắm vững các tính chất: hai đáy song song và bằng nhau, các mặt bên là hình bình hành, các cạnh bên song song và bằng nhau.',
    could: 'Chứng minh các mặt phẳng song song và các đường chéo cắt nhau tại trung điểm mỗi đường trong hình hộp.',
  },
  opening: 'Các thùng hàng container, viên gạch xây dựng hay khối rubik đều mang hình dáng hình lăng trụ và hình hộp — hôm nay ta khám phá cấu trúc hình học của chúng.',
  focusQuestion: 'Trong một hình hộp, bốn đường chéo có mối liên hệ đặc biệt nào với nhau?',
  axis: `**Tình huống: Thiết kế kết cấu chịu lực của khối container vận tải tiêu chuẩn quốc tế (ISO container):**
- Thùng container là một hình hộp chữ nhật $ABCD.A'B'C'D'$:
  - Hai mặt đáy: $(ABCD) \\parallel (A'B'C'D')$ và $ABCD = A'B'C'D'$.
  - Bốn mặt bên: $(ABB'A')$, $(BCC'B')$, $(CDD'C')$, $(DAA'D')$ đều là các hình bình hành (đặc biệt là hình chữ nhật).
  - Bốn cạnh bên: $AA' \\parallel BB' \\parallel CC' \\parallel DD'$ và $AA' = BB' = CC' = DD'$.
- **Đặc tính hình học của hình hộp:**
  - Hình hộp là hình lăng trụ có đáy là hình bình hành.
  - Sáu mặt của hình hộp đều là hình bình hành.
  - Hai mặt đối diện song song và bằng nhau.
  - Bốn đường chéo $AC', BD', CA', DB'$ đồng quy tại một điểm $O$, và $O$ là trung điểm của mỗi đường chéo (tâm đối xứng của hình hộp).
- **Ứng dụng kết cấu:** nhờ 4 đường chéo đồng quy tại tâm đối xứng, ứng suất nén và kéo khi xếp chồng các container được triệt tiêu cân bằng.`,
  s1: {
    title: 'Giao điểm các đường chéo hình hộp',
    context: 'Xét hình hộp ABCD.A\'B\'C\'D\'. Lấy hai đường chéo bất kỳ là AC\' và BD\'.',
    question: 'Hai đường chéo AC\' và BD\' có cắt nhau không? Nếu có, cắt nhau tại đâu?',
    options: ['Cắt nhau tại trung điểm của mỗi đường', 'Chéo nhau trong không gian', 'Song song với nhau'],
    correct: 0,
    why: 'Tứ giác ADC\'B\' (hoặc BDD\'B\') là hình bình hành nên hai đường chéo cắt nhau tại trung điểm mỗi đường.',
    discuss: ['`[PHÁT HIỆN]` Vì sao tứ giác BDD\'B\' là hình bình hành?', '`[SO SÁNH]` Hình lăng trụ tam giác có đường chéo của khối lăng trụ không?'],
    cue: 'Vẽ thiết diện chéo BDD\'B\': BB\' // DD\' và BB\' = DD\' nên BDD\'B\' là HBH.',
    lookFor: 'HS nhận ra thiết diện chéo là hình bình hành.',
  },
  s3: {
    title: 'Định nghĩa và tính chất của lăng trụ và hình hộp',
    steps: [
      'Định nghĩa lăng trụ: hai đáy là đa giác bằng nhau nằm trên hai mp song song; các mặt bên là hình bình hành; các cạnh bên song song và bằng nhau.',
      'Định nghĩa hình hộp: là hình lăng trụ có đáy là hình bình hành (cả 6 mặt đều là HBH).',
      'Tính chất 1: Hai mặt đối diện của hình hộp song song và bằng nhau.',
      'Tính chất 2: Bốn đường chéo của hình hộp cắt nhau tại trung điểm của mỗi đường.',
    ],
    ask: ['`[SUY LUẬN]` Hình lăng trụ tứ giác có nhất thiết là hình hộp không?', '`[PHÁT HIỆN]` Các mặt bên của lăng trụ có thể là hình thoi được không?'],
    cue: 'Mô hình 3D hình lăng trụ tam giác và hình hộp chữ nhật.',
    close: 'Lăng trụ: 2 đáy // và bằng nhau, cạnh bên // và bằng nhau; Hình hộp: 6 mặt đều là HBH, 4 đường chéo đồng quy tại trung điểm.',
  },
  s4: {
    bat: 'AI giải: Hình lăng trụ tứ giác luôn có 6 mặt là hình bình hành nên mọi hình lăng trụ tứ giác đều là hình hộp.',
    chung: 'Hình lăng trụ tứ giác chỉ yêu cầu 4 mặt bên là hình bình hành, hai mặt đáy có thể là tứ giác lồi bất kỳ (ví dụ hình thang, tứ giác thường).',
    sua: 'Chỉ khi hai đáy là hình bình hành thì lăng trụ tứ giác mới là hình hộp. Lăng trụ có đáy là hình thang không phải hình hộp.',
    cue: 'Yêu cầu HS vẽ một lăng trụ có đáy là hình thang: đáy không phải HBH nên không phải hình hộp.',
    lookFor: 'HS phân biệt lăng trụ tứ giác tổng quát và hình hộp.',
  },
  s6: {
    hints: {
      M: 'đếm số đỉnh, số cạnh, số mặt: lăng trụ n-giác có 2n đỉnh, 3n cạnh, n+2 mặt.',
      S: 'dùng tính chất cạnh bên // và bằng nhau để chứng minh các mặt bên là hình bình hành.',
      C: 'dùng thiết diện chéo là hình bình hành để chứng minh các đường chéo đồng quy tại trung điểm.',
    },
    lookFor: 'HS M đếm đúng số yếu tố; HS S chỉ ra đúng mặt //; HS C chứng minh được đồng quy.',
  },
  postCheck: {
    q: 'Một hình lăng trụ tam giác có bao nhiêu mặt, bao nhiêu đỉnh và bao nhiêu cạnh?',
    a: 'Đáy tam giác (n = 3): có $n + 2 = 5$ mặt (2 đáy + 3 mặt bên); $2n = 6$ đỉnh; $3n = 9$ cạnh.',
    ds: [
      { t: '\"Các mặt bên của hình lăng trụ luôn là hình bình hành\"', v: 'Đúng' },
      { t: '\"Mọi hình lăng trụ tứ giác đều là hình hộp\"', v: 'Sai — đáy phải là hình bình hành' },
      { t: '\"Bốn đường chéo của hình hộp cắt nhau tại trung điểm của mỗi đường\"', v: 'Đúng' },
    ],
    cue: 'Đổi phiếu chấm chéo, chú ý phân biệt lăng trụ tứ giác và hình hộp.',
  },
  s8Close: 'Lăng trụ: 2 đáy //, cạnh bên // và bằng nhau; Hình hộp: đáy là HBH, 4 đường chéo đồng quy tại tâm.',
  s9: {
    title: 'Kiến trúc khối hộp và kết cấu xây dựng',
    bullets: [
      'Hầu hết các tòa nhà hiện đại được thiết kế theo dạng khối hộp nhờ khả năng phân bổ tải trọng đồng đều.',
      'Hệ giằng chéo trong khung nhà thép tương ứng với các đường chéo của hình hộp, tăng cường độ cứng vững chống động đất.',
      'Đóng gói và logistics tối ưu không gian vận tải dựa trên hình hộp chữ nhật chuẩn.',
    ],
    cue: 'Hỏi: \"Tại sao gạch xây nhà và các thùng carton đều được sản xuất dưới dạng hình hộp chữ nhật?\"',
  },
  exit: [
    'Nêu định nghĩa hình lăng trụ và hình hộp.',
    'Nêu 1 bẫy (nhầm lăng trụ tứ giác bất kỳ là hình hộp).',
    'Tự đánh giá M / S / C.',
    'Hình hộp có bao nhiêu mặt, bao nhiêu cạnh và bao nhiêu đường chéo?',
  ],
  exitCue: 'Nhìn lại mô hình container tiêu chuẩn.',
  after: '- HS hoàn thành bài tập về hình lăng trụ và hình hộp; chuẩn bị tiết luyện tập tổng hợp hai mặt phẳng song song.',
  snapshot: {
    focus: 'Hình thành định nghĩa, tính chất của hình lăng trụ và hình hộp; tính chất hai đáy, cạnh bên, mặt bên và các đường chéo đồng quy của hình hộp.',
    formulas: [
      '\\text{Lăng trụ } n\\text{-giác}: 2n \\text{ đỉnh}, 3n \\text{ cạnh}, (n+2) \\text{ mặt}',
      '(A_1A_2\\dots A_n) \\parallel (A\'_1A\'_2\\dots A\'_n); \\quad A_1A\'_1 \\parallel A_2A\'_2 \\parallel \\dots \\text{ và bằng nhau}',
      '\\text{Hình hộp: 6 mặt là hình bình hành}; \\quad AC\' \\cap BD\' \\cap CA\' \\cap DB\' = \\{O\\}',
      'O \\text{ là trung điểm của mỗi đường chéo}',
    ],
    boardKnowledge: [
      'I. Hình lăng trụ: Hai đáy là đa giác bằng nhau nằm trên 2 mp song song; Các mặt bên là hình bình hành.',
      'II. Cạnh bên: Song song và bằng nhau.',
      'III. Hình hộp: Lăng trụ có đáy là hình bình hành; 4 đường chéo cắt nhau tại trung điểm mỗi đường.',
    ],
    examples: [
      {
        question: 'Cho hình hộp ABCD.A\'B\'C\'D\'. Chứng minh rằng mặt phẳng (BDA\') song song với mặt phẳng (B\'D\'C).',
        solution: 'Ta có BD // B\'D\' (do BDD\'B\' là HBH) -> BD // (B\'D\'C). Lại có BA\' // CD\' (do ADC\'B\' là HBH có AB // C\'D\' và AA\' // DD\') -> BA\' // (B\'D\'C). Hai đường thẳng cắt nhau BD và BA\' cùng song song (B\'D\'C) nên (BDA\') // (B\'D\'C).',
      },
      {
        question: 'Một hình lăng trụ ngũ giác có bao nhiêu đỉnh, bao nhiêu cạnh và bao nhiêu mặt?',
        solution: 'n = 5. Số đỉnh: 2 · 5 = 10 đỉnh. Số cạnh: 3 · 5 = 15 cạnh (5 cạnh đáy dưới, 5 cạnh đáy trên, 5 cạnh bên). Số mặt: 5 + 2 = 7 mặt (2 đáy + 5 mặt bên).',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Các mặt bên của một hình lăng trụ là hình gì?', answer: 'Là các hình bình hành.' },
      { level: 'NB', question: 'Hình hộp có bao nhiêu đường chéo?', answer: 'Có 4 đường chéo (nối các cặp đỉnh đối diện).' },
      { level: 'TH', question: 'Cho hình hộp ABCD.A\'B\'C\'D\'. Tìm giao tuyến của hai mặt phẳng (ACC\'A\') và (BDD\'B\').', answer: 'Gọi O = AC ∩ BD và O\' = A\'C\' ∩ B\'D\'. Giao tuyến là đường thẳng OO\' (nối tâm hai đáy).' },
      { level: 'TH', question: 'Chứng minh rằng trong hình hộp ABCD.A\'B\'C\'D\', đoạn thẳng nối trung điểm của AB và C\'D\' đi qua tâm O của hình hộp.', answer: 'Gọi M, N lần lượt là trung điểm AB và C\'D\'. Tứ giác AMC\'N có AM // C\'N (cùng // CD) và AM = C\'N = 1/2 CD nên AMC\'N là HBH. Hai đường chéo MN và AC\' cắt nhau tại trung điểm mỗi đường, mà trung điểm AC\' chính là tâm O.' },
      { level: 'VD', question: 'Cho hình lăng trụ tam giác ABC.A\'B\'C\'. Gọi M, M\' lần lượt là trung điểm của BC và B\'C\'. Chứng minh rằng mặt phẳng (AMM\'A\') là một hình bình hành.', answer: 'Ta có MM\' // BB\' và MM\' = BB\' (do BCC\'B\' là HBH). Lại có AA\' // BB\' và AA\' = BB\' -> MM\' // AA\' và MM\' = AA\'. Do đó AMM\'A\' là hình bình hành.' },
      { level: 'VD', question: 'Cho hình hộp ABCD.A\'B\'C\'D\'. Gọi I là tâm hình bình hành ABB\'A\', K là tâm CDD\'C\'. Chứng minh IK song song với các đáy của hình hộp.', answer: 'Ta có I là trung điểm A\'B và K là trung điểm D\'C. Trong tam giác A\'BD\' và các tứ giác liên quan, IK // AD // BC mà AD nằm trong đáy (ABCD) nên IK // (ABCD) và IK // (A\'B\'C\'D\').' },
    ],
    quick: [
      { question: 'Hình chóp cụt có phải là hình lăng trụ không?', solution: 'Không, vì hình chóp cụt có các cạnh bên kéo dài đồng quy tại đỉnh chóp, không song song với nhau như hình lăng trụ.' },
      { question: 'Hai mặt đáy của hình lăng trụ có thể nằm trên hai mặt phẳng cắt nhau không?', solution: 'Không, hai đáy bắt buộc phải nằm trên hai mặt phẳng song song.' },
    ],
    mistakes: [
      'Cho rằng mọi hình lăng trụ tứ giác đều là hình hộp (quên điều kiện đáy phải là hình bình hành).',
      'Nhầm đường chéo của mặt bên với đường chéo của hình hộp.',
      'Nghĩ rằng các cạnh bên của hình lăng trụ có thể có độ dài khác nhau.',
    ],
  },
  aiError: {
    category: 'Lỗi khái niệm',
    wrongSolution: 'AI viết: Cho lăng trụ tứ giác ABCD.A\'B\'C\'D\'. Vì là lăng trụ tứ giác nên 4 đường chéo AC\', BD\', CA\', DB\' cắt nhau tại trung điểm của mỗi đường.',
    correction: 'Tính chất 4 đường chéo cắt nhau tại trung điểm mỗi đường chỉ đúng với HÌNH HỘP (khi đáy là hình bình hành). Lăng trụ tứ giác có đáy là hình thang thì các đường chéo không cắt nhau tại trung điểm.',
    proof: 'Để AC\' và BD\' cắt nhau tại trung điểm thì tứ giác BDD\'B\' phải là hình bình hành, điều này đòi hỏi BD // B\'D\' và BD = B\'D\', tức là hai đáy phải là hình bình hành. Nếu đáy là tứ giác thường thì điều này không thỏa.',
    whyAiError: 'Mô hình đánh đồng khái niệm “lăng trụ tứ giác” với “hình hộp”, bỏ qua điều kiện đáy là hình bình hành.',
    teacherPrompt: 'AI áp dụng tính chất đường chéo hình hộp cho lăng trụ tứ giác bất kỳ. Em hãy chỉ lỗi sai và sửa lại: khi nào thì tính chất này mới đúng?',
    studentProduct: 'Ghi “Lỗi khái niệm: lăng trụ tứ giác chưa chắc là hình hộp”, bổ sung điều kiện đáy phải là hình bình hành.',
    boardPrompt: 'AI khẳng định lăng trụ tứ giác có 4 đường chéo cắt nhau tại trung điểm. Khẳng định này đúng cho hình gì?',
    libraryTitle: 'Lỗi AI đánh đồng lăng trụ tứ giác bất kỳ với hình hộp',
  },
};

// Bài 10: 11-12-87 — Hai mặt phẳng song song (Tiết 5: Luyện tập tổng hợp)
const L87 = {
  ...base('11-12-87', 87, 'practice'),
  title: 'Hai mặt phẳng song song',
  goals: {
    must: 'Chứng minh thành thạo hai mặt phẳng song song bằng định lý hai đường thẳng cắt nhau.',
    should: 'Xác định thiết diện của hình chóp, hình lăng trụ, hình hộp cắt bởi mặt phẳng song song với một mặt phẳng cho trước.',
    could: 'Vận dụng định lý Thales trong không gian để tính tỉ số đoạn thẳng và diện tích thiết diện.',
  },
  opening: 'Cắt một khối đá hoa cương hay thanh gỗ xây dựng bằng một mặt phẳng song song với đáy tạo ra các mặt cắt chuẩn xác — hôm nay ta luyện tập xác định thiết diện và quan hệ song song.',
  focusQuestion: 'Khi một mặt phẳng cắt hai mặt phẳng song song thì hai giao tuyến có quan hệ gì với nhau?',
  axis: `**Tình huống: Cắt gọt thanh dầm bê tông hình hộp để tạo vách ngăn kiến trúc:**
- Cho hình hộp chữ nhật $ABCD.A'B'C'D'$.
- Mặt phẳng $(\\alpha)$ đi qua điểm $M$ trên cạnh $AB$ ($AM = \\dfrac{1}{3}AB$) và song song với mặt phẳng $(ACC'A')$.
- **Xác định thiết diện:**
  - $(\\alpha) \\parallel (ACC'A')$ và $(ABCD) \\cap (ACC'A') = AC \\implies (\\alpha) \\cap (ABCD) = MN \\parallel AC$ ($N \\in BC$, $BN = \\dfrac{2}{3}BC$).
  - $(\\alpha) \\cap (ABB'A') = MM' \\parallel AA'$ ($M' \\in A'B'$, $A'M' = \\dfrac{1}{3}A'B'$).
  - $(\\alpha) \\cap (A'B'C'D') = M'N' \\parallel A'C'$ ($N' \\in B'C'$).
  - $(\\alpha) \\cap (BCC'B') = NN' \\parallel BB'$.
- Thiết diện thu được là hình chữ nhật $MNN'M'$ song song với mặt chéo $ACC'A'$.
- **Định lý giao tuyến then chốt:**
  $$\\begin{cases} (\\alpha) \\parallel (\\beta) \\\\ (\\gamma) \\cap (\\alpha) = a \\\\ (\\gamma) \\cap (\\beta) = b \\end{cases} \\implies a \\parallel b.$$
- Áp dụng: các cạnh đối diện của thiết diện luôn song song từng đôi một.`,
  s1: {
    title: 'Giao tuyến của mặt phẳng thứ ba',
    context: 'Hai mặt phẳng (α) và (β) song song với nhau. Mặt phẳng (γ) cắt (α) theo giao tuyến a và cắt (β) theo giao tuyến b.',
    question: 'Vị trí tương đối giữa hai đường thẳng giao tuyến a và b là gì?',
    options: ['Song song với nhau (a // b)', 'Cắt nhau tại một điểm', 'Chéo nhau trong không gian'],
    correct: 0,
    why: 'Định lý giao tuyến: Hai mặt phẳng song song bị cắt bởi mặt phẳng thứ ba thì hai giao tuyến song song với nhau.',
    discuss: ['`[PHÁT HIỆN]` Nếu a và b cắt nhau thì mâu thuẫn với điều gì?', '`[SO SÁNH]` Nếu mặt phẳng (γ) chỉ cắt (α) mà không cắt (β) thì có thể xảy ra không?'],
    cue: 'Vẽ mặt phẳng sàn nhà và trần nhà song song; mặt phẳng tường cắt trần và sàn theo 2 đường giao tuyến song song.',
    lookFor: 'HS nhận diện đúng định lý giao tuyến song song.',
  },
  s3: {
    title: 'Hệ thống phương pháp chứng minh và dựng thiết diện',
    steps: [
      'Phương pháp chứng minh $(\\alpha) \\parallel (\\beta)$: tìm trong $(\\alpha)$ hai đường cắt nhau cùng song song $(\\beta)$.',
      'Định lý giao tuyến: $(\\alpha) \\parallel (\\beta) \\implies$ giao tuyến với mặt phẳng thứ ba song song với nhau.',
      'Định lý Thales: ba mặt phẳng đôi một song song chắn trên hai cát tuyến bất kỳ các đoạn thẳng tương ứng tỉ lệ.',
      'Quy tắc dựng thiết diện song song: kẻ các đoạn giao tuyến song song với giao tuyến của mặt phẳng cho trước.',
    ],
    ask: ['`[SUY LUẬN]` Để dựng thiết diện qua 1 điểm song song với 1 mặt phẳng, bước đầu tiên là gì?', '`[PHÁT HIỆN]` Thiết diện cắt bởi mp song song với đáy lăng trụ là hình gì?'],
    cue: 'Bảng quy trình 3 bước dựng thiết diện song song.',
    close: 'Giao tuyến với các mặt song song thì song song; dùng quan hệ song song để tìm các đỉnh của thiết diện.',
  },
  s4: {
    bat: 'AI giải: Chứng minh (P) // (Q): AI tìm thấy a ⊂ (P) có a // (Q) và b ⊂ (P) có b // (Q), kết luận ngay (P) // (Q) mà không kiểm tra a và b có cắt nhau không.',
    chung: 'Nếu a // b thì dù a // (Q) và b // (Q) ta vẫn không thể kết luận (P) // (Q) (mặt phẳng (P) có thể cắt (Q) theo giao tuyến song song với a và b).',
    sua: 'Phải chỉ ra a và b là hai đường thẳng CẮT NHAU tại một điểm thuộc (P).',
    cue: 'Vẽ phản ví dụ: hai mặt phẳng cắt nhau nhưng cùng song song với một đường thẳng d.',
    lookFor: 'HS nhấn mạnh điều kiện hai đường thẳng phải cắt nhau.',
  },
  s6: {
    hints: {
      M: 'chỉ ra hai đường thẳng cắt nhau trong mp này lần lượt song song mp kia.',
      S: 'dùng định lý giao tuyến để kẻ các cạnh thiết diện song song với các đường có sẵn.',
      C: 'áp dụng định lý Thales để tính tỉ số các đoạn thẳng và tỉ số diện tích thiết diện.',
    },
    lookFor: 'HS M chứng minh đủ điều kiện; HS S dựng đúng thiết diện; HS C tính đúng tỉ số.',
  },
  postCheck: {
    q: 'Cho hình chóp S.ABCD có đáy ABCD là hình bình hành. Mặt phẳng (α) đi qua trung điểm M của SA và song song với đáy. Thiết diện là hình gì?',
    a: 'Thiết diện cắt qua 4 cạnh bên tạo thành hình bình hành MNPQ có các cạnh song song và bằng một nửa các cạnh đáy ABCD.',
    ds: [
      { t: '\"Chỉ cần hai đường thẳng trong (P) song song với (Q) là đủ kết luận (P) // (Q)\"', v: 'Sai — hai đường phải cắt nhau' },
      { t: '\"Giao tuyến của hai mp song song với mặt phẳng thứ ba thì song song với nhau\"', v: 'Đúng' },
      { t: '\"Thiết diện cắt bởi mp song song với đáy lăng trụ là đa giác bằng đáy\"', v: 'Đúng' },
    ],
    cue: 'Đổi phiếu chấm chéo, chú ý điều kiện hai đường cắt nhau.',
  },
  s8Close: 'Chứng minh mp // mp: 2 đường cắt nhau //; Định lý giao tuyến: a // b; Thiết diện: kẻ song song.',
  s9: {
    title: 'Thiết kế kiến trúc tầng sàn nhà cao tầng',
    bullets: [
      'Các sàn nhà trong tòa nhà chọc trời là các mặt phẳng song song nhiều tầng.',
      'Cột trụ và giếng thang máy cắt qua các sàn nhà theo các tiết diện song song và đồng dạng hoàn hảo.',
      'Định lý Thales không gian đảm bảo độ cao các tầng được phân bổ chuẩn xác theo bản vẽ kết cấu.',
    ],
    cue: 'Hỏi: \"Các kỹ sư xây dựng dùng định lý nào để kiểm tra độ song song của các tầng nhà?\"',
  },
  exit: [
    'Nêu điều kiện cần và đủ để hai mặt phẳng song song.',
    'Nêu 1 bẫy (thiếu điều kiện hai đường thẳng phải cắt nhau).',
    'Tự đánh giá M / S / C.',
    'Nếu (α) // (β) và đường thẳng a nằm trong (α) thì vị trí của a đối với (β) là gì?',
  ],
  exitCue: 'Nhìn lại hình ảnh cắt khối bê tông ở trục thực nghiệm.',
  after: '- HS hoàn thành bài tập tổng kết chương Quan hệ song song trong không gian; chuẩn bị ôn tập kiểm tra giữa kỳ.',
  snapshot: {
    focus: 'Luyện tập tổng hợp chứng minh hai mặt phẳng song song; ứng dụng định lý giao tuyến và định lý Thales trong không gian; kỹ năng dựng thiết diện song song.',
    formulas: [
      '\\begin{cases} a, b \\subset (\\alpha), a \\cap b = \\{I\\} \\\\ a \\parallel (\\beta), b \\parallel (\\beta) \\end{cases} \\implies (\\alpha) \\parallel (\\beta)',
      '\\begin{cases} (\\alpha) \\parallel (\\beta) \\\\ (\\gamma) \\cap (\\alpha) = a, (\\gamma) \\cap (\\beta) = b \\end{cases} \\implies a \\parallel b',
      '\\dfrac{A_1B_1}{A_2B_2} = \\dfrac{B_1C_1}{B_2C_2} = \\dfrac{A_1C_1}{A_2C_2} \\quad (\\text{Định lý Thales})',
    ],
    boardKnowledge: [
      'I. Chứng minh (α) // (β): Tìm 2 đường cắt nhau trong (α) cùng song song với (β).',
      'II. Tính chất: Cắt bởi mặt thứ ba -> 2 giao tuyến song song; Chắn các cát tuyến -> các đoạn tỉ lệ.',
      'III. Dựng thiết diện: Kẻ đường thẳng qua điểm cho trước song song với các giao tuyến chuẩn.',
    ],
    examples: [
      {
        question: 'Cho hình chóp S.ABC. Mặt phẳng (P) song song với đáy (ABC) cắt các cạnh SA, SB, SC lần lượt tại A\', B\', C\'. Chứng minh tam giác A\'B\'C\' đồng dạng với tam giác ABC.',
        solution: 'Vì (P) // (ABC) nên (SAB) cắt (P) và (ABC) theo A\'B\' // AB. Tương tự B\'C\' // BC và A\'C\' // AC. Do đó các góc tương ứng bằng nhau, tam giác A\'B\'C\' đồng dạng tam giác ABC.',
      },
      {
        question: 'Cho hai hình bình hành ABCD và ABEF không cùng nằm trong một mặt phẳng. Chứng minh mặt phẳng (ADF) song song với mặt phẳng (BCE).',
        solution: 'Ta có AD // BC (ABCD là HBH) -> AD // (BCE). AF // BE (ABEF là HBH) -> AF // (BCE). Lại có AD và AF cắt nhau tại A thuộc (ADF). Vậy (ADF) // (BCE).',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Cho (α) // (β) và d ⊂ (α). Đường thẳng d có song song với (β) không?', answer: 'Có, theo định nghĩa đường thẳng song song với mặt phẳng.' },
      { level: 'NB', question: 'Phát biểu định lý về giao tuyến của hai mặt phẳng song song với mặt phẳng thứ ba.', answer: 'Nếu hai mặt phẳng song song cùng cắt mặt phẳng thứ ba thì hai giao tuyến của chúng song song với nhau.' },
      { level: 'TH', question: 'Cho hình chóp S.ABCD có đáy là hình bình hành. Gọi M, N lần lượt là trung điểm của SA và SB. Chứng minh (MND) không thể song song với đáy (ABCD).', answer: 'Vì điểm D vừa thuộc mặt phẳng (MND) vừa thuộc đáy (ABCD), hai mặt phẳng có điểm chung D nên không thể song song.' },
      { level: 'TH', question: 'Cho tứ diện ABCD. Gọi G1, G2, G3 lần lượt là trọng tâm của các tam giác ABC, ACD, ADB. Chứng minh mặt phẳng (G1G2G3) song song với mặt phẳng (BCD).', answer: 'Gọi M, N, P là trung điểm BC, CD, DB. Ta có AG1/AM = AG2/AN = AG3/AP = 2/3. Theo định lý Thales đảo trong tam giác AMN có G1G2 // MN ⊂ (BCD) -> G1G2 // (BCD). Tương tự G2G3 // (BCD). Do đó (G1G2G3) // (BCD).' },
      { level: 'VD', question: 'Cho hình hộp ABCD.A\'B\'C\'D\'. Mặt phẳng (P) đi qua C\' và song song với mặt phẳng (A\'BD). Xác định thiết diện của hình hộp cắt bởi (P).', answer: 'Ta có (A\'BD) // (B\'D\'C). Mặt phẳng (P) đi qua C\' và song song (A\'BD) chính là mặt phẳng (B\'D\'C). Thiết diện là tam giác B\'D\'C.' },
      { level: 'VD', question: 'Ba mặt phẳng đôi một song song cắt cát tuyến d1 tại A, B, C và cắt d2 tại A\', B\', C\'. Biết AB = 4, BC = 6, A\'C\' = 15. Tính độ dài A\'B\' và B\'C\'.', answer: 'Theo định lý Thales: A\'B\' / AB = B\'C\' / BC = A\'C\' / AC. Ta có AC = AB + BC = 10. Tỉ số k = 15/10 = 1,5. Vậy A\'B\' = 4 · 1,5 = 6; B\'C\' = 6 · 1,5 = 9.' },
    ],
    quick: [
      { question: 'Hai mặt phẳng cùng song song với một đường thẳng thì có song song với nhau không?', solution: 'Chưa chắc, chúng có thể cắt nhau theo một giao tuyến song song với đường thẳng đó (như hình mái nhà).' },
      { question: 'Nếu hai mặt phẳng song song thì mọi đường thẳng trong mặt này có song song với mọi đường thẳng trong mặt kia không?', solution: 'Không, chúng có thể chéo nhau (miễn là không cắt nhau).' },
    ],
    mistakes: [
      'Thiếu điều kiện hai đường thẳng phải cắt nhau khi áp dụng định lý chứng minh hai mp song song.',
      'Nhầm rằng hai mặt phẳng song song thì mọi đường thẳng nằm trong đó đều song song với nhau.',
      'Quên kiểm tra tính đồng phẳng khi xác định giao tuyến.',
    ],
  },
  aiError: {
    category: 'Lỗi điều kiện',
    wrongSolution: 'AI viết: Trong mặt phẳng (P) có đường thẳng a // (Q) và đường thẳng b // (Q). Suy ra mặt phẳng (P) song song với mặt phẳng (Q).',
    correction: 'Định lý yêu cầu hai đường thẳng a và b phải CẮT NHAU. Nếu a và b song song nhau thì (P) vẫn có thể cắt (Q). Sửa lại: Cần bổ sung giả thiết a ∩ b = {I}.',
    proof: 'Phản ví dụ: Lấy hai mặt phẳng (P) và (Q) cắt nhau theo giao tuyến d. Trong (P) lấy hai đường thẳng phân biệt a và b cùng song song với d. Khi đó a // (Q) và b // (Q) nhưng (P) không song song với (Q).',
    whyAiError: 'Mô hình ghi nhớ không trọn vẹn định lý, bỏ sót điều kiện sống còn “hai đường thẳng cắt nhau”.',
    teacherPrompt: 'AI kết luận (P) // (Q) khi chỉ có a // (Q) và b // (Q). Em hãy chỉ lỗi sai và sửa lại: cần bổ sung điều kiện gì cho a và b?',
    studentProduct: 'Ghi “Lỗi điều kiện: thiếu a cắt b”, vẽ hình hai mặt phẳng mái nhà làm phản ví dụ.',
    boardPrompt: 'AI quên điều kiện a và b cắt nhau. Nếu a // b thì (P) và (Q) có thể có vị trí gì?',
    libraryTitle: 'Lỗi AI thiếu điều kiện hai đường thẳng cắt nhau khi chứng minh hai mp song song',
  },
};

export default [L86, L87];

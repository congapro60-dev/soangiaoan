const base = {
  grade: 11, week: 5, date: '2026-11-04',
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

const L30 = {
  ...base,
  key: '11-5-30', period: 30, lessonType: 'formation',
  title: 'Đường thẳng song song với mặt phẳng — tính chất',
  opening: 'Mái nhà cắt tường theo một đường — làm sao biết đường đó song song với xà ngang? Đó là nội dung tính chất hôm nay.',
  focusQuestion: 'Khi một đường đã song song mặt phẳng, nó quan hệ thế nào với giao tuyến của mặt phẳng cắt qua nó?',
  axis: `**Tình huống: Mái nhà nghiêng cắt bức tường theo giao tuyến $b$; xà ngang $d$ đã biết song song với mặt tường $(P)$.**

- **Tính chất:** nếu $d \\parallel (P)$, mặt phẳng $(Q)$ chứa $d$ và cắt $(P)$ theo giao tuyến $b$, thì $b \\parallel d$.
- **Áp dụng hộp $ABCD.A′B′C′D′$:** $A′B′ \\parallel (ABCD)$; $(ABB′A′)$ chứa $A′B′$ và cắt $(ABCD)$ theo $AB$ → $AB \\parallel A′B′$ ✓ (phù hợp hình hộp).
- **Áp dụng hình chóp $S.ABCD$:** $MN \\parallel (ABCD)$ ($M, N$ là trung điểm $SA, SB$); $(SAB)$ chứa $MN$ và cắt $(ABCD)$ theo $AB$ → $MN \\parallel AB$ ✓ (đúng đường trung bình).
- **Hệ quả dùng nhiều:** nếu hai mặt phẳng cắt nhau cùng song song với một đường thẳng thì giao tuyến của chúng song song với đường thẳng đó.

**Bẫy của bài:** kết luận giao tuyến song song với **mọi** đường trong $(P)$; nhầm đường $d$ với đường nằm trong $(P)$.`,
  goals: {
    must: 'Phát biểu tính chất và nhận ra giao tuyến song song với đường đã cho.',
    should: 'Áp dụng tính chất để chứng minh hai đường song song trong hộp/hình chóp.',
    could: 'Dùng hệ quả để tìm giao tuyến song song cho trước; phản biện lập luận sai phạm vi.',
  },
  s1: {
    title: 'Mái nhà cắt tường',
    context: 'Xà ngang d song song mặt tường (P); mặt mái (Q) chứa d và cắt (P) theo giao tuyến b.',
    question: 'Giao tuyến b có quan hệ gì với d?',
    options: ['b cắt d', 'b song song d', 'b trùng d'],
    correct: 1,
    why: 'Theo tính chất: d // (P), (Q) ⊃ d, (Q) ∩ (P) = b ⇒ b // d.',
    discuss: ['`[PHÁT HIỆN]` Vì sao b không thể cắt d?', '`[SO SÁNH]` b có song song với mọi đường trong (P) không?'],
    cue: 'Vẽ hình mái nhà, tô hai mặt phẳng khác màu, giao tuyến bằng nét đậm.',
    lookFor: 'HS nói đúng phạm vi: b chỉ song song với d (và các đường song song d).',
  },
  s3: {
    title: 'Tính chất và cách áp dụng',
    steps: [
      'Xác định $d \\parallel (P)$ (đã chứng minh ở bài trước).',
      'Chọn mặt phẳng $(Q)$ chứa $d$ và cắt $(P)$ theo giao tuyến $b$.',
      'Kết luận $b \\parallel d$.',
      'Kiểm tra: $b$ và $d$ đồng phẳng (cùng trong $(Q)$) và không có điểm chung → song song.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao b và d đồng phẳng?', '`[PHÁT HIỆN]` Nếu (Q) song song (P) thì có giao tuyến không?'],
    cue: 'Khung 3 bước: đã có d // (P) → chọn (Q) → kết luận giao tuyến.',
    close: 'Đường đã song song mặt phẳng sẽ song song với giao tuyến của mọi mặt phẳng cắt qua nó.',
  },
  s4: { bat: 'AI kết luận: "Vì d // (P) nên d song song với mọi đường thẳng nằm trong (P)".', chung: 'Sai: trong (P) có những đường cắt phương của d (ví dụ đường vuông góc với d trong (P)).', sua: 'd chỉ song song với các đường trong (P) cùng phương với d, đặc biệt là giao tuyến b.', cue: 'Vẽ trong (P) một đường cắt d để phản ví dụ.', lookFor: 'HS nêu được phản ví dụ trong mặt phẳng.' },
  s6: { hints: { M: 'xác định (Q) chứa d rồi tìm giao tuyến với (P).', S: 'viết đủ: d // (P), (Q) ⊃ d, (Q) ∩ (P) = b.', C: 'dùng hệ quả cho hai mặt phẳng cắt nhau.' }, lookFor: 'HS M tìm đúng giao tuyến; HS S đủ căn cứ; HS C dùng hệ quả đúng.' },
  postCheck: {
    q: 'Trong hộp, biết $A′B′ \\parallel (ABCD)$ và $(ABB′A′)$ cắt $(ABCD)$ theo $AB$. Kết luận gì?',
    a: '$AB \\parallel A′B′$ theo tính chất (giao tuyến song song với đường đã cho).',
    ds: [{ t: '"Giao tuyến song song với mọi đường trong mặt phẳng"', v: 'Sai' }, { t: '"b // d vì b, d đồng phẳng trong (Q) và không có điểm chung"', v: 'Đúng' }, { t: '"Nếu (Q) // (P) thì không có giao tuyến"', v: 'Đúng' }],
    cue: 'Chiếu 2 hình, kiểm căn cứ.',
  },
  s8Close: 'd // (P) + (Q) ⊃ d ⇒ giao tuyến // d.',
  s9: {
    title: 'Đọc kết cấu mái nhà',
    bullets: ['Xà ngang song song mặt tường ⇒ mọi mặt cắt qua xà đều cho giao tuyến song song xà.', 'Nhờ đó thợ có thể kiểm tra song song bằng cách đo một giao tuyến thay vì đo toàn bộ mái.', 'Sai lầm thường gặp: cho rằng giao tuyến song song với mọi mép tường — chỉ đúng với các mép cùng phương xà.'],
    cue: 'Liên hệ: kiểm tra song song trong xây dựng dùng giao tuyến làm chuẩn.',
  },
  exit: ['Phát biểu tính chất giao tuyến song song.', 'Nêu 1 bẫy (phạm vi song song quá rộng).', 'Tự đánh giá M / S / C.', 'Trong hộp, A′B′ // (ABCD); (ABB′A′) cắt (ABCD) theo AB. Kết luận?'],
  exitCue: 'Mở lại khung 3 bước ở S3.',
  after: '- HS làm bài tập SGK về tính chất; chuẩn bị tiết luyện tập đường thẳng song song mặt phẳng.',
  snapshot: {
    focus: 'Hình thành tính chất: nếu d // (P), (Q) chứa d và cắt (P) theo giao tuyến b thì b // d; áp dụng trên hộp ABCD.A′B′C′D′ (AB // A′B′) và hình chóp S.ABCD (MN // AB); nhận diện lỗi mở rộng phạm vi song song',
    formulas: ['d \\parallel (P), \\ (Q) \\supset d, \\ (Q) \\cap (P) = b \\Rightarrow b \\parallel d', '\\text{Hệ quả: hai mặt phẳng cắt nhau cùng song song } d \\Rightarrow \\text{giao tuyến} \\parallel d'],
    examples: [
      { question: 'Trong hộp ABCD.A′B′C′D′, biết A′B′ // (ABCD). Mặt phẳng (ABB′A′) cắt (ABCD) theo AB. Kết luận về AB và A′B′.', answer: 'Theo tính chất, giao tuyến AB song song với đường đã cho A′B′. Kiểm: AB và A′B′ cùng nằm trong (ABB′A′) và không có điểm chung nên AB // A′B′ (đúng tính chất hình hộp).' },
      { question: 'Vì sao không thể nói "d // (P) nên d song song với mọi đường trong (P)"?', answer: 'Trong (P) có vô số đường khác phương d; ví dụ đường vuông góc với d trong (P) sẽ cắt phương của d. Chỉ các đường cùng phương d (như giao tuyến b) mới song song với d.' },
    ],
    exercises: [
      { level: 'NB', question: 'Phát biểu tính chất về giao tuyến khi d // (P).', answer: 'Nếu d // (P), mặt phẳng (Q) chứa d và cắt (P) theo giao tuyến b thì b // d.' },
      { level: 'NB', question: 'Nêu hai điều kiện cần kiểm trước khi kết luận b // d.', answer: '(Q) phải chứa d; (Q) phải cắt (P) theo giao tuyến b (tức b = (Q) ∩ (P)).' },
      { level: 'TH', question: 'Cho hình chóp S.ABCD, M, N là trung điểm SA, SB. Biết MN // (ABCD) và (SAB) cắt (ABCD) theo AB, kết luận gì?', answer: 'MN // AB theo tính chất — phù hợp với việc MN là đường trung bình của tam giác SAB.' },
      { level: 'TH', question: 'Trong hộp, biết AD // (BCC′B′) và (ADD′A′) cắt (BCC′B′) theo ... hãy cho biết có giao tuyến không.', answer: 'Hai mặt (ADD′A′) và (BCC′B′) song song nhau nên không có giao tuyến; do đó không áp dụng được tính chất này (phải chọn mặt phẳng cắt (P)).' },
      { level: 'VD', question: 'Cho hình chóp S.ABCD có đáy ABCD là hình bình hành, M là trung điểm SA. Mặt phẳng (MBC) cắt (SAD) theo giao tuyến d. Chứng minh d // BC.', answer: 'Có BC // AD và AD ⊂ (SAD), BC ⊄ (SAD) ⇒ BC // (SAD). Mặt (MBC) chứa BC và cắt (SAD) theo d. Theo tính chất, d // BC.' },
      { level: 'VD', question: 'Phản biện lập luận: "d // (P) nên giao tuyến b // mọi đường trong (P)".', answer: 'Sai phạm vi. Chỉ các đường trong (P) cùng phương với d mới song song với b; đường khác phương sẽ cắt b. Ví dụ trong (P) lấy đường vuông góc với b — đường đó cắt b tại một điểm.' },
    ],
    quick: [
      { question: 'Vì sao b và d đồng phẳng?', solution: 'Vì cả hai đều nằm trong (Q): d theo giả thiết, b là giao tuyến của (Q) với (P).' },
      { question: 'Nếu (Q) song song (P) thì có áp dụng được tính chất không?', solution: 'Không, vì không có giao tuyến b. Tính chất chỉ áp dụng khi (Q) cắt (P).' },
    ],
    mistakes: ['Cho rằng giao tuyến song song với mọi đường trong mặt phẳng.', 'Áp dụng tính chất khi (Q) song song (P) (không có giao tuyến).', 'Nhầm d với một đường nằm trong (P).'],
    boardKnowledge: ['II. NỘI DUNG', '1. Tính chất', 'a. d // (P), (Q) ⊃ d, (Q) ∩ (P) = b ⇒ b // d.', 'b. b và d đồng phẳng trong (Q) và không có điểm chung.', '2. Hệ quả', 'a. Hai mặt phẳng cắt nhau cùng song song d ⇒ giao tuyến // d.', '3. Áp dụng', 'a. Hộp: A′B′ // (ABCD) ⇒ AB // A′B′.', 'b. Hình chóp: MN // (ABCD) ⇒ MN // AB.'],
  },
  aiError: {
    category: 'Lỗi khái niệm', wrongSolution: 'AI kết luận: "Vì A′B′ // (ABCD) nên A′B′ song song với mọi đường thẳng nằm trong (ABCD), chẳng hạn AC và BD."',
    correction: 'A′B′ chỉ song song với các đường trong (ABCD) cùng phương với nó, như AB và CD. Các đường AC, BD khác phương nên không song song với A′B′.',
    proof: 'AB // A′B′ (đúng), nhưng AC là đường chéo đáy, phương khác AB. Hai đường thẳng khác phương trong cùng mặt phẳng thì cắt nhau (hoặc chéo nếu khác mặt phẳng); A′B′ và AC là hai đường chéo nhau, không song song.',
    whyAiError: 'Mô hình mở rộng quan hệ song song từ một đường sang toàn bộ mặt phẳng chứa nó.',
    teacherPrompt: 'Em kiểm tra A′B′ với AC: chúng có cùng phương không? Từ đó sửa lại phát biểu của AI.',
    studentProduct: 'Thẻ Đ/S + chỉ ra A′B′ // AB nhưng A′B′ chéo AC, sửa phạm vi kết luận.',
    boardPrompt: 'AI nói A′B′ song song mọi đường trong (ABCD). Thử với AC.',
    libraryTitle: 'Lỗi AI mở rộng phạm vi quan hệ song song',
  },
};

const L31 = {
  ...base,
  key: '11-5-31', period: 31, lessonType: 'practice',
  title: 'Luyện tập đường thẳng song song với mặt phẳng',
  opening: 'Hôm nay lớp mình luyện trọn bộ ba kỹ năng: nhận diện vị trí, chứng minh song song, và dùng giao tuyến.',
  focusQuestion: 'Khi nào dùng định lí điều kiện, khi nào dùng tính chất giao tuyến?',
  axis: `**Tình huống: Ba bài tập trên cùng mô hình hộp $ABCD.A′B′C′D′$ và hình chóp $S.ABCD$ — như ba "ca" kiểm tra kết cấu.**

| Ca | Dữ kiện | Công cụ |
|---|---|---|
| 1 | $AB$ và $(A′B′C′D′)$ | định lí điều kiện ($AB \\parallel A′B′$) |
| 2 | $A′B′ \\parallel (ABCD)$, $(ABB′A′)$ cắt $(ABCD)$ theo $AB$ | tính chất giao tuyến |
| 3 | $M, N$ trung điểm $SA, SB$ | đường trung bình + định lí điều kiện |

- **Kiểm chứng tay:** ca 1: $AB \\parallel A′B′$ và $A′B′ \\subset (A′B′C′D′)$ → $AB \\parallel$ mặt trên. Ca 2: giao tuyến $AB \\parallel A′B′$ (khớp). Ca 3: $MN \\parallel AB \\subset (ABCD)$ → $MN \\parallel (ABCD)$.
- **Quy tắc chọn công cụ:** cần **chứng minh** song song → định lí điều kiện; đã **biết** song song và cần tìm quan hệ với giao tuyến → tính chất.

**Bẫy của bài:** dùng tính chất khi chưa biết song song; quên kiểm $d \\not\\subset (P)$.`,
  goals: {
    must: 'Nhận diện vị trí và áp dụng định lí điều kiện cho một cặp đường – mặt.',
    should: 'Chọn đúng công cụ cho từng ca và trình bày chứng minh đủ căn cứ.',
    could: 'Chứng minh trong hình chóp có đường trung bình; phản biện lập luận dùng sai công cụ.',
  },
  s1: {
    title: 'Ba ca kiểm tra',
    context: 'Ba bài tập như bảng; mỗi nhóm chọn một ca.',
    question: 'Cần chứng minh $MN \\parallel (ABCD)$ (M, N trung điểm SA, SB). Dùng công cụ nào?',
    options: ['Tính chất giao tuyến', 'Định lí điều kiện (tìm đường song song nằm trong mặt phẳng)', 'Không cần chứng minh'],
    correct: 1,
    why: 'Ta chưa biết MN // (ABCD) nên phải chứng minh bằng định lí, dùng AB nằm trong (ABCD).',
    discuss: ['`[PHÁT HIỆN]` Ca nào dùng tính chất giao tuyến?', '`[SO SÁNH]` Hai công cụ khác nhau ở điểm xuất phát nào?'],
    cue: 'Treo bảng "đã biết // chưa?" — nếu chưa → định lí; nếu rồi → tính chất.',
    lookFor: 'HS phân biệt được chiều suy luận.',
  },
  s3: {
    title: 'Chữa mẫu và quy tắc chọn công cụ',
    steps: [
      'Ca 1: $AB \\parallel A′B′$, $A′B′ \\subset (A′B′C′D′)$, $AB \\not\\subset$ → $AB \\parallel (A′B′C′D′)$.',
      'Ca 2: đã biết $A′B′ \\parallel (ABCD)$; $(ABB′A′)$ chứa $A′B′$, cắt $(ABCD)$ theo $AB$ → $AB \\parallel A′B′$.',
      'Ca 3: $MN$ là đường trung bình nên $MN \\parallel AB$; $AB \\subset (ABCD)$; $MN \\not\\subset (ABCD)$ → $MN \\parallel (ABCD)$.',
      'Kiểm chéo: kết quả ca 2 khớp với tính chất hình hộp (AB // A′B′).',
    ],
    ask: ['`[SUY LUẬN]` Vì sao ca 3 cần thêm bước kiểm MN ⊄ (ABCD)?', '`[PHÁT HIỆN]` Nếu M, N không là trung điểm thì kết luận còn đúng không?'],
    cue: 'Khung: "đã biết // chưa → chọn công cụ → 3 dòng căn cứ".',
    close: 'Hai công cụ bổ sung nhau: một để chứng minh, một để khai thác.',
  },
  s4: { bat: 'AI dùng tính chất giao tuyến để "chứng minh" $MN \\parallel (ABCD)$ dù chưa biết MN // (ABCD).', chung: 'Tính chất chỉ dùng khi đã biết song song; ở đây phải chứng minh bằng định lí với $AB \\subset (ABCD)$.', sua: 'Dùng định lí: $MN \\parallel AB$, $AB \\subset (ABCD)$, $MN \\not\\subset (ABCD)$ → $MN \\parallel (ABCD)$.', cue: 'Hỏi: "Tính chất cho điều gì? Nó có tạo ra giả thiết không?"', lookFor: 'HS phân biệt giả thiết và kết luận của mỗi định lí.' },
  s6: { hints: { M: 'xác định đường song song nằm trong mặt phẳng.', S: 'ghi đủ 3 dòng căn cứ cho mỗi ca.', C: 'làm ca 3 và giải thích vai trò đường trung bình.' }, lookFor: 'HS M đúng ca 1; HS S đủ căn cứ; HS C giải thích được ca 3.' },
  postCheck: {
    q: 'Trong hộp, chứng minh $AD \\parallel (BCC′B′)$.',
    a: '$AD \\parallel BC$ (cạnh đáy hình hộp), $BC \\subset (BCC′B′)$, $AD \\not\\subset (BCC′B′)$ → $AD \\parallel (BCC′B′)$.',
    ds: [{ t: '"Tính chất giao tuyến dùng để chứng minh song song"', v: 'Sai — đó là định lí điều kiện' }, { t: '"MN // AB vì MN là đường trung bình"', v: 'Đúng' }, { t: '"Cần kiểm d ⊄ (P) trước khi kết luận"', v: 'Đúng' }],
    cue: 'Chấm chéo theo 3 dòng.',
  },
  s8Close: 'Chưa biết // → định lí; đã biết // → tính chất.',
  s9: {
    title: 'Báo cáo kiểm tra kết cấu',
    bullets: ['Ca 1: mặt trên song song cạnh đáy tương ứng → kiểm bằng định lí.', 'Ca 2: giao tuyến song song xà → kiểm bằng tính chất.', 'Ca 3: đường trung bình song song mặt đáy → ứng dụng trong thiết kế giàn treo.'],
    cue: 'Mỗi nhóm trình bày 60 giây theo mẫu: dữ kiện — công cụ — 3 dòng — kết luận.',
  },
  exit: ['Nêu quy tắc chọn công cụ.', 'Nêu 1 bẫy (dùng tính chất khi chưa biết //).', 'Tự đánh giá M / S / C.', 'Chứng minh MN // (ABCD) với M, N trung điểm SA, SB.'],
  exitCue: 'Mở lại bảng ba ca ở mục II.',
  after: '- HS hoàn thành phiếu luyện; chuẩn bị tiết củng cố phương trình lượng giác.',
  snapshot: {
    focus: 'Luyện tập ba kỹ năng về đường thẳng song song mặt phẳng trên hộp ABCD.A′B′C′D′ và hình chóp S.ABCD: nhận diện vị trí, chứng minh bằng định lí điều kiện (AB // (A′B′C′D′), MN // (ABCD)), khai thác tính chất giao tuyến; quy tắc chọn công cụ theo "đã biết song song chưa"',
    formulas: ['d \\not\\subset (P), d \\parallel d′, d′ \\subset (P) \\Rightarrow d \\parallel (P)', 'd \\parallel (P), (Q) \\supset d, (Q) \\cap (P) = b \\Rightarrow b \\parallel d', '\\text{Đường trung bình tam giác} \\parallel \\text{cạnh đáy}'],
    examples: [
      { question: 'Trong hộp ABCD.A′B′C′D′, chứng minh AB // (A′B′C′D′).', answer: 'AB // A′B′ (cạnh tương ứng hình hộp); A′B′ ⊂ (A′B′C′D′); AB ⊄ (A′B′C′D′). Theo định lí, AB // (A′B′C′D′).' },
      { question: 'Cho hình chóp S.ABCD, M, N là trung điểm SA, SB. Chứng minh MN // (ABCD).', answer: 'MN là đường trung bình tam giác SAB nên MN // AB. Có AB ⊂ (ABCD) và MN ⊄ (ABCD) (M, N không thuộc mặt đáy). Vậy MN // (ABCD).' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu định lí điều kiện để d // (P).', answer: 'd ⊄ (P), d // d′, d′ ⊂ (P) ⇒ d // (P).' },
      { level: 'NB', question: 'Nêu tính chất giao tuyến khi d // (P).', answer: 'Nếu (Q) chứa d và cắt (P) theo b thì b // d.' },
      { level: 'TH', question: 'Trong hộp, chứng minh A′D′ // (ABCD).', answer: 'A′D′ // AD, AD ⊂ (ABCD), A′D′ ⊄ (ABCD) ⇒ A′D′ // (ABCD).' },
      { level: 'TH', question: 'Trong hộp, biết A′B′ // (ABCD) và (BCC′B′) cắt (ABCD) theo BC. Kết luận gì?', answer: 'Chưa kết luận được vì (BCC′B′) không chứa A′B′. Phải chọn mặt phẳng chứa A′B′, ví dụ (ABB′A′), khi đó giao tuyến AB // A′B′.' },
      { level: 'VD', question: 'Cho hình chóp S.ABCD đáy là hình bình hành, M trung điểm SA. (MBC) cắt (SAD) theo d. Chứng minh d // BC.', answer: 'BC // AD ⊂ (SAD) và BC ⊄ (SAD) ⇒ BC // (SAD). (MBC) chứa BC, cắt (SAD) theo d ⇒ d // BC.' },
      { level: 'VD', question: 'Phản biện: "Muốn chứng minh d // (P) chỉ cần tìm một đường trong (P) không cắt d".', answer: 'Sai. Hai đường không cắt nhau trong không gian vẫn có thể chéo nhau. Phải chứng minh d // d′ (cùng phương, đồng phẳng) với d′ ⊂ (P), hoặc chứng minh d không có điểm chung với (P) bằng lập luận.' },
    ],
    quick: [
      { question: 'Khi nào dùng tính chất giao tuyến?', solution: 'Khi đã biết d // (P) và cần tìm quan hệ giữa d với giao tuyến của một mặt phẳng chứa d.' },
      { question: 'Vì sao MN // AB trong hình chóp với M, N trung điểm SA, SB?', solution: 'Vì MN là đường trung bình của tam giác SAB, nên song song với cạnh đáy AB.' },
    ],
    mistakes: ['Dùng tính chất giao tuyến khi chưa chứng minh song song.', 'Chọn mặt phẳng (Q) không chứa d.', 'Bỏ điều kiện d ⊄ (P).'],
    boardKnowledge: ['II. NỘI DUNG', '1. Hai công cụ', 'a. Định lí điều kiện: d ⊄ (P), d // d′, d′ ⊂ (P) ⇒ d // (P).', 'b. Tính chất: d // (P), (Q) ⊃ d, (Q) ∩ (P) = b ⇒ b // d.', '2. Quy tắc chọn', 'a. Chưa biết song song → dùng định lí.', 'b. Đã biết song song → dùng tính chất.', '3. Ba ca luyện tập', 'a. AB // (A′B′C′D′).', 'b. AB // A′B′ qua giao tuyến.', 'c. MN // (ABCD) qua đường trung bình.'],
  },
  aiError: {
    category: 'Lỗi logic', wrongSolution: 'AI chứng minh: "Vì MN // (ABCD) và (SAB) cắt (ABCD) theo AB nên MN // AB" — nhưng ở bước đầu AI chưa hề chứng minh MN // (ABCD), chỉ giả định điều cần chứng minh.',
    correction: 'Phải chứng minh MN // (ABCD) trước bằng định lí: MN // AB (đường trung bình), AB ⊂ (ABCD), MN ⊄ (ABCD). Sau đó mới dùng tính chất nếu cần.',
    proof: 'Lập luận của AI dùng chính kết luận làm tiền đề (vòng tròn). Kiểm chứng: MN // AB đúng vì MN là đường trung bình tam giác SAB — đây là căn cứ hợp lệ duy nhất, không phải "MN // (ABCD)".',
    whyAiError: 'Mô hình trộn giả thiết với kết luận khi tái sử dụng định lí, tạo lập luận vòng.',
    teacherPrompt: 'Em chỉ ra chỗ AI dùng kết luận làm giả thiết, rồi sửa lại chứng minh đúng thứ tự.',
    studentProduct: 'Thẻ Đ/S + chứng minh lại: MN // AB → AB ⊂ (ABCD) → MN ⊄ (ABCD) → kết luận.',
    boardPrompt: 'AI viết "vì MN // (ABCD)" khi chưa chứng minh. Đó là lỗi gì?',
    libraryTitle: 'Lỗi AI lập luận vòng khi chứng minh song song',
  },
};

const L32 = {
  ...base,
  key: '11-5-32', period: 32, lessonType: 'practice',
  title: 'Củng cố phương trình lượng giác cơ bản và điều kiện nghiệm',
  opening: 'Hôm nay lớp mình hệ thống lại sin và cos: điều kiện có nghiệm, hai họ nghiệm, và cách lọc nghiệm trên khoảng.',
  focusQuestion: 'Điều gì quyết định số nghiệm trong một khoảng cho trước?',
  axis: `**Tình huống: Bảng điều khiển đu quay và điều hoà nhiệt độ — hai mô hình đã học cần tra cứu nhanh.**

| Phương trình | Nghiệm tổng quát | Nghiệm trong khoảng |
|---|---|---|
| $\\sin\\theta = \\tfrac12$ | $\\tfrac{\\pi}{6} + 2k\\pi$; $\\tfrac{5\\pi}{6} + 2k\\pi$ | $[0; 2\\pi]$: $\\tfrac{\\pi}{6}$; $\\tfrac{5\\pi}{6}$ |
| $\\cos\\dfrac{\\pi t}{12} = \\tfrac12$ | $t = \\pm 4 + 24k$ | $[0; 24]$: $4$; $20$ |
| $\\sin\\theta = \\sqrt{2}$ | vô nghiệm | — |

- **Kiểm chứng tay:** $\\sin\\tfrac{\\pi}{6} = 0{,}5$ ✓; $\\cos\\tfrac{4\\pi}{12} = \\cos\\tfrac{\\pi}{3} = 0{,}5$ ✓; $\\sqrt2 \\approx 1{,}414 > 1$ → vô nghiệm.
- **Quy trình lọc nghiệm:** viết nghiệm tổng quát → giải bất phương trình theo $k$ → liệt kê $k$ nguyên → kết luận.

**Bẫy của bài:** quên nhánh; quên chu kỳ $2k\\pi$; cho nghiệm ngoài khoảng.`,
  goals: {
    must: 'Giải đúng phương trình sin/cos cơ bản và kiểm điều kiện có nghiệm.',
    should: 'Lọc nghiệm trên khoảng cho trước bằng cách xét $k$ nguyên.',
    could: 'Đếm số nghiệm theo $m$ trong một chu kỳ; phản biện tập nghiệm thiếu nhánh.',
  },
  s1: {
    title: 'Tra cứu nhanh hai mô hình',
    context: 'Cần tìm nhanh nghiệm của sin θ = 1/2 và cos(πt/12) = 1/2.',
    question: 'Phương trình nào vô nghiệm?',
    options: ['sin θ = 1/2', 'cos(πt/12) = 1/2', 'sin θ = √2'],
    correct: 2,
    why: '√2 ≈ 1,414 > 1 nên vô nghiệm; hai phương trình còn lại có |m| ≤ 1.',
    discuss: ['`[PHÁT HIỆN]` Trong [0; 2π], sin θ = 1/2 có mấy nghiệm?', '`[SO SÁNH]` cos có dấu ±, sin có nhánh π − α — vì sao?'],
    cue: 'Treo bảng "|m| ≤ 1?" và hai công thức nghiệm cạnh nhau.',
    lookFor: 'HS kiểm điều kiện trước khi giải.',
  },
  s3: {
    title: 'Hai công thức và quy trình lọc nghiệm',
    steps: [
      '$\\sin x = m$: $x = \\alpha + 2k\\pi$ hoặc $x = \\pi - \\alpha + 2k\\pi$ (với $\\sin\\alpha = m$).',
      '$\\cos x = m$: $x = \\pm\\alpha + 2k\\pi$ (với $\\cos\\alpha = m$).',
      'Trường hợp đặc biệt: $m = 0, \\pm1$ dùng công thức gọn.',
      'Lọc nghiệm: thay $k = 0, \\pm1, \\pm2$… hoặc giải bất phương trình theo $k$.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao phải thử nhiều giá trị k?', '`[PHÁT HIỆN]` Trong [0; 2π], cos x = 1/2 có mấy nghiệm?'],
    cue: 'Khung: điều kiện — công thức — lọc theo k.',
    close: 'Nghiệm tổng quát vô hạn; khoảng cho trước biến nó thành hữu hạn.',
  },
  s4: { bat: 'AI kết luận sin θ = 1/2 có nghiệm duy nhất trong [0; 2π] là π/6.', chung: 'Còn nghiệm 5π/6 trong khoảng đó.', sua: 'Hai nghiệm: π/6 và 5π/6.', cue: 'Cho HS vẽ đường tròn lượng giác trong [0; 2π].', lookFor: 'HS đếm nghiệm bằng hình.' },
  s6: { hints: { M: 'kiểm |m| ≤ 1 rồi viết nghiệm tổng quát.', S: 'lọc nghiệm bằng cách thử k.', C: 'đếm số nghiệm theo m trong một chu kỳ.' }, lookFor: 'HS M viết đúng; HS S lọc đúng; HS C biện luận số nghiệm.' },
  postCheck: {
    q: 'Giải $\\cos x = \\tfrac12$ trong $[-\\pi; \\pi]$.',
    a: '$x = \\pm\\tfrac{\\pi}{3}$ (hai nghiệm).',
    ds: [{ t: '"sin x = √2 có nghiệm"', v: 'Sai' }, { t: '"cos x = m có nghiệm ±α + 2kπ"', v: 'Đúng' }, { t: '"Nghiệm trong khoảng luôn hữu hạn"', v: 'Đúng — khoảng bị chặn' }],
    cue: 'Chấm chéo, kiểm bằng đường tròn.',
  },
  s8Close: 'Điều kiện — công thức — lọc k.',
  s9: {
    title: 'Bảng tra nhanh cho phòng điều khiển',
    bullets: ['sin θ = 1/2 → θ = π/6; 5π/6 (trong một vòng).', 'cos(πt/12) = 1/2 → t = 4; 20 (trong ngày).', 'sin θ = √2 → không có — bảng phải ghi "vô nghiệm" thay vì bỏ trống.'],
    cue: 'Nhấn: bảng tra phải ghi cả trường hợp vô nghiệm để tránh hiểu nhầm.',
  },
  exit: ['Nêu điều kiện có nghiệm của sin và cos.', 'Nêu 1 bẫy (quên nhánh; quên chu kỳ).', 'Tự đánh giá M / S / C.', 'Trong [0; 24], cos(πt/12) = 1/2 có mấy nghiệm?'],
  exitCue: 'Mở lại bảng tra ở mục II.',
  after: '- HS hoàn thành phiếu củng cố; chuẩn bị tiết phối hợp lượng giác và hình học.',
  snapshot: {
    focus: 'Củng cố phương trình lượng giác cơ bản và điều kiện nghiệm trên hai mô hình đã học: sin θ = 1/2 (π/6; 5π/6), cos(πt/12) = 1/2 (t = 4; 20 trong ngày), sin θ = √2 vô nghiệm; rèn quy trình lọc nghiệm theo k',
    formulas: ['\\sin x = m \\Leftrightarrow x = \\alpha + 2k\\pi \\ \\text{hoặc} \\ x = \\pi - \\alpha + 2k\\pi', '\\cos x = m \\Leftrightarrow x = \\pm\\alpha + 2k\\pi', '|m| \\le 1 \\ \\text{là điều kiện có nghiệm}'],
    examples: [
      { question: 'Giải sin θ = 1/2 và liệt kê nghiệm trong [0; 2π].', answer: 'θ = π/6 + 2kπ hoặc θ = 5π/6 + 2kπ. Trong [0; 2π]: k = 0 cho θ = π/6 và 5π/6; k = 1 vượt quá 2π. Vậy hai nghiệm.' },
      { question: 'Giải cos(πt/12) = 1/2 trong [0; 24].', answer: 'πt/12 = ±π/3 + 2kπ ⇒ t = ±4 + 24k. Trong [0;24]: t = 4 (k = 0, nhánh +) và t = 20 (k = 1, nhánh − vì −4 + 24 = 20).' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu điều kiện có nghiệm của sin x = m và cos x = m.', answer: 'Cả hai đều cần |m| ≤ 1.' },
      { level: 'NB', question: 'Viết nghiệm tổng quát của cos x = 1/2.', answer: 'x = ±π/3 + 2kπ.' },
      { level: 'TH', question: 'Giải sin 2x = −1/2.', answer: '2x = −π/6 + 2kπ hoặc 2x = π + π/6 + 2kπ = 7π/6 + 2kπ ⇒ x = −π/12 + kπ hoặc x = 7π/12 + kπ.' },
      { level: 'TH', question: 'Tìm nghiệm của sin x = √2/2 trong [0; 2π].', answer: 'x = π/4 và x = 3π/4.' },
      { level: 'VD', question: 'Giải 2sin x − 1 = 0 và cho biết số nghiệm trong [0; 2π].', answer: 'sin x = 1/2 ⇒ x = π/6 + 2kπ hoặc 5π/6 + 2kπ; trong [0;2π] có 2 nghiệm: π/6 và 5π/6.' },
      { level: 'VD', question: 'Biện luận số nghiệm của sin x = m trong [0; 2π] theo m.', answer: 'Nếu |m| > 1: 0 nghiệm. Nếu |m| = 1: 1 nghiệm (x = π/2 hoặc 3π/2). Nếu 0 < |m| < 1: 2 nghiệm. Nếu m = 0: 3 nghiệm (0; π; 2π).' },
    ],
    quick: [
      { question: 'Vì sao phải thử k = 1 khi lọc nghiệm trong [0; 24]?', solution: 'Vì nhánh âm −4 + 24k chỉ vào khoảng khi k = 1, cho t = 20; nếu chỉ lấy k = 0 sẽ mất nghiệm.' },
      { question: 'sin x = 0 có bao nhiêu nghiệm trong [0; 2π]?', solution: '3 nghiệm: 0; π; 2π (vì x = kπ và hai đầu mút đều thuộc khoảng đóng).' },
    ],
    mistakes: ['Quên nhánh thứ hai của sin.', 'Dùng kπ thay vì 2kπ.', 'Chỉ thử k = 0 khi lọc nghiệm.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Điều kiện có nghiệm', 'a. |m| ≤ 1 với cả sin và cos.', '2. Công thức nghiệm', 'a. sin: α + 2kπ hoặc π − α + 2kπ.', 'b. cos: ±α + 2kπ.', '3. Lọc nghiệm', 'a. Thay k nguyên hoặc giải bất phương trình theo k.', 'b. Kiểm hai đầu mút của khoảng đóng.'],
  },
  aiError: {
    category: 'Thiếu điều kiện', wrongSolution: 'AI kết luận: "Trong khoảng [0; 2π], phương trình sin θ = 1/2 chỉ có một nghiệm θ = π/6."',
    correction: 'Có hai nghiệm: θ = π/6 và θ = 5π/6 (ứng với hai họ nghiệm, k = 0).',
    proof: 'Thay θ = 5π/6: sin(5π/6) = sin(π − π/6) = 1/2 ✓ và 5π/6 ∈ [0; 2π]. Vậy nghiệm bị bỏ sót tồn tại.',
    whyAiError: 'Mô hình chỉ lấy nghiệm chính từ hàm ngược, không xét nhánh π − α khi lọc trên khoảng.',
    teacherPrompt: 'Em thử θ = 5π/6 vào phương trình rồi sửa lại số nghiệm của AI.',
    studentProduct: 'Thẻ Đ/S + phép thử sin(5π/6) = 1/2 và kết luận 2 nghiệm.',
    boardPrompt: 'AI nói chỉ có π/6. Thử 5π/6.',
    libraryTitle: 'Lỗi AI bỏ nghiệm thứ hai khi lọc trên khoảng',
  },
};

const L33 = {
  ...base,
  key: '11-5-33', period: 33, lessonType: 'practice',
  title: 'Luyện tập phối hợp phương trình lượng giác và vị trí tương đối',
  opening: 'Tiết phối hợp: nửa lớp giải phương trình lượng giác, nửa lớp xử lý vị trí đường – mặt, sau đó đổi vai.',
  focusQuestion: 'Hai mạch kiến thức khác nhau có dùng chung một quy trình giải quyết vấn đề nào?',
  axis: `**Tình huống: Một bài kiểm tra tổng hợp gồm hai phần, cùng áp dụng quy trình "dữ kiện → công cụ → kiểm".**

| Phần | Câu hỏi | Công cụ | Kiểm |
|---|---|---|---|
| Lượng giác | $\\sin 2x = \\tfrac12$ | công thức nghiệm sin | thử $x = \\tfrac{\\pi}{12}$ |
| Hình học | $A′B′$ với $(ABCD)$ trong hộp | định lí điều kiện | tìm điểm chung (không có) |

- **Kiểm chứng tay:** $\\sin 2x = \\tfrac12 \\Rightarrow 2x = \\tfrac{\\pi}{6} + 2k\\pi$ hoặc $\\tfrac{5\\pi}{6} + 2k\\pi$ → $x = \\tfrac{\\pi}{12} + k\\pi$ hoặc $\\tfrac{5\\pi}{12} + k\\pi$. Thử $x = \\tfrac{\\pi}{12}$: $\\sin\\tfrac{\\pi}{6} = \\tfrac12$ ✓.
- **Hình học:** $A′B′ \\parallel AB$, $AB \\subset (ABCD)$, $A′B′ \\not\\subset (ABCD)$ → $A′B′ \\parallel (ABCD)$.
- **Quy trình chung:** xác định dữ kiện → chọn công cụ → thực hiện → kiểm bằng phép độc lập.

**Bẫy của bài:** chuyển mạch mà quên điều kiện (|m| ≤ 1; d ⊄ (P)); kiểm bằng cách lặp lại chính bước vừa làm.`,
  goals: {
    must: 'Giải một phương trình lượng giác và một bài vị trí tương đối ở mức cơ bản.',
    should: 'Giải đúng cả hai mạch và có phép kiểm độc lập cho mỗi bài.',
    could: 'Chỉ ra lỗi khi chuyển mạch; đề xuất quy trình chung cho bài tổng hợp.',
  },
  s1: {
    title: 'Hai phần của bài tổng hợp',
    context: 'Phần A: sin 2x = 1/2. Phần B: vị trí của A′B′ với (ABCD).',
    question: 'Với sin 2x = 1/2, nghiệm tổng quát là gì?',
    options: ['x = π/12 + kπ hoặc x = 5π/12 + kπ', 'x = π/6 + 2kπ', 'x = π/12 + 2kπ'],
    correct: 0,
    why: '2x = π/6 + 2kπ hoặc 5π/6 + 2kπ nên chia hai vế cho 2: x = π/12 + kπ hoặc 5π/12 + kπ.',
    discuss: ['`[PHÁT HIỆN]` Vì sao chu kỳ thành kπ chứ không phải 2kπ?', '`[SO SÁNH]` Phần B dùng công cụ gì?'],
    cue: 'Nhắc: chia hai vế cho 2 thì chu kỳ cũng chia đôi.',
    lookFor: 'HS xử lý đúng chu kỳ khi hệ số khác 1.',
  },
  s3: {
    title: 'Chữa mẫu hai mạch',
    steps: [
      'Phần A: $2x = \\tfrac{\\pi}{6} + 2k\\pi$ hoặc $\\tfrac{5\\pi}{6} + 2k\\pi$ → $x = \\tfrac{\\pi}{12} + k\\pi$ hoặc $\\tfrac{5\\pi}{12} + k\\pi$.',
      'Kiểm: $x = \\tfrac{\\pi}{12}$ cho $\\sin\\tfrac{\\pi}{6} = \\tfrac12$ ✓.',
      'Phần B: $A′B′ \\parallel AB \\subset (ABCD)$, $A′B′ \\not\\subset (ABCD)$ → $A′B′ \\parallel (ABCD)$.',
      'Kiểm: tìm điểm chung giữa $A′B′$ và $(ABCD)$ — không có (vì $A′B′$ nằm trong mặt trên).',
    ],
    ask: ['`[SUY LUẬN]` Vì sao phép kiểm phải độc lập với cách giải?', '`[PHÁT HIỆN]` Nếu quên điều kiện |m| ≤ 1 thì sai ở đâu?'],
    cue: 'Khung chung 4 bước cho cả hai mạch.',
    close: 'Hai mạch khác nội dung nhưng cùng một quy trình: dữ kiện → công cụ → thực hiện → kiểm.',
  },
  s4: { bat: 'AI giải sin 2x = 1/2 ra x = π/12 + 2kπ (giữ nguyên chu kỳ 2kπ sau khi chia 2).', chung: 'Chia hai vế cho 2 thì 2kπ thành kπ; kết quả đúng là x = π/12 + kπ hoặc 5π/12 + kπ.', sua: 'Viết lại với chu kỳ kπ và kiểm với k = 1.', cue: 'Cho HS thử x = π/12 + π = 13π/12: sin(13π/6) = sin(π/6 + 2π) = 1/2 ✓ — nghiệm bị bỏ.', lookFor: 'HS kiểm bằng một nghiệm thuộc chu kỳ mới.' },
  s6: { hints: { M: 'làm phần A trước, nhớ chia cả chu kỳ.', S: 'làm cả hai phần, mỗi phần một phép kiểm.', C: 'chỉ ra lỗi thường gặp khi chuyển mạch.' }, lookFor: 'HS M đúng chu kỳ; HS S có 2 phép kiểm; HS C nêu được lỗi chuyển mạch.' },
  postCheck: {
    q: 'Giải $\\cos 3x = \\tfrac12$.',
    a: '$3x = \\pm\\tfrac{\\pi}{3} + 2k\\pi \\Rightarrow x = \\pm\\tfrac{\\pi}{9} + \\tfrac{2k\\pi}{3}$.',
    ds: [{ t: '"sin 2x = 1/2 có chu kỳ 2kπ"', v: 'Sai — sau khi chia 2 là kπ' }, { t: '"A′B′ // (ABCD) vì A′B′ // AB ⊂ (ABCD) và A′B′ ⊄ (ABCD)"', v: 'Đúng' }, { t: '"Phép kiểm nên lặp lại đúng cách giải"', v: 'Sai — cần độc lập' }],
    cue: 'Chấm chéo giữa hai nửa lớp.',
  },
  s8Close: 'Dữ kiện → công cụ → thực hiện → kiểm độc lập.',
  s9: {
    title: 'Rút kinh nghiệm chuyển mạch',
    bullets: ['Lượng giác: chia hệ số thì chia cả chu kỳ.', 'Hình học: luôn kiểm d ⊄ (P) trước khi kết luận.', 'Bài tổng hợp: mỗi phần cần phép kiểm riêng, không dùng kết quả phần này để kiểm phần kia.'],
    cue: 'Hỏi: "Lỗi nào em dễ mắc nhất khi làm bài tổng hợp?" — ghi lên bảng.',
  },
  exit: ['Nêu quy trình 4 bước chung.', 'Nêu 1 bẫy (quên chia chu kỳ; bỏ d ⊄ (P)).', 'Tự đánh giá M / S / C.', 'Giải sin 2x = 1/2.'],
  exitCue: 'Mở lại bảng hai phần ở mục II.',
  after: '- HS hoàn thành phiếu tổng hợp; chuẩn bị nội dung tuần 6 (tan, cot và dãy số).',
  snapshot: {
    focus: 'Luyện phối hợp phương trình lượng giác và vị trí tương đối: sin 2x = 1/2 → x = π/12 + kπ hoặc 5π/12 + kπ (chú ý chia chu kỳ), A′B′ // (ABCD) qua định lí điều kiện; rèn quy trình chung dữ kiện → công cụ → thực hiện → kiểm độc lập',
    formulas: ['\\sin 2x = \\tfrac12 \\Leftrightarrow x = \\tfrac{\\pi}{12} + k\\pi \\ \\text{hoặc} \\ x = \\tfrac{5\\pi}{12} + k\\pi', 'd \\not\\subset (P), d \\parallel d′, d′ \\subset (P) \\Rightarrow d \\parallel (P)'],
    examples: [
      { question: 'Giải phương trình sin 2x = 1/2.', answer: '2x = π/6 + 2kπ hoặc 2x = 5π/6 + 2kπ ⇒ x = π/12 + kπ hoặc x = 5π/12 + kπ (chu kỳ chia đôi khi chia hai vế cho 2). Kiểm: x = π/12 cho sin(π/6) = 1/2 ✓.' },
      { question: 'Trong hộp ABCD.A′B′C′D′, xác định vị trí của A′B′ và (ABCD) kèm căn cứ.', answer: 'A′B′ // AB (cạnh tương ứng hình hộp), AB ⊂ (ABCD), A′B′ ⊄ (ABCD) ⇒ A′B′ // (ABCD). Kiểm: A′B′ và (ABCD) không có điểm chung.' },
    ],
    exercises: [
      { level: 'NB', question: 'Giải cos 2x = 1/2.', answer: '2x = ±π/3 + 2kπ ⇒ x = ±π/6 + kπ.' },
      { level: 'NB', question: 'Nêu định lí điều kiện để d // (P).', answer: 'd ⊄ (P), d // d′, d′ ⊂ (P) ⇒ d // (P).' },
      { level: 'TH', question: 'Giải sin 2x = 1/2.', answer: 'x = π/12 + kπ hoặc x = 5π/12 + kπ.' },
      { level: 'TH', question: 'Trong hộp, chứng minh BC // (ADD′A′).', answer: 'BC // AD, AD ⊂ (ADD′A′), BC ⊄ (ADD′A′) ⇒ BC // (ADD′A′).' },
      { level: 'VD', question: 'Giải cos 3x = 1/2 và cho biết số nghiệm trong [0; π].', answer: 'x = ±π/9 + 2kπ/3. Trong [0; π]: x = π/9; 5π/9; 7π/9 (và π/9 + 2π/3 = 7π/9; −π/9 + 2π/3 = 5π/9) → 3 nghiệm.' },
      { level: 'VD', question: 'Nêu một lỗi thường gặp khi chuyển từ mạch lượng giác sang mạch hình học và cách tránh.', answer: 'Lỗi: bê nguyên điều kiện |m| ≤ 1 sang hình học hoặc quên kiểm d ⊄ (P) vì đang quen thao tác đại số. Cách tránh: viết lại quy trình 4 bước cho từng phần và kiểm từng điều kiện riêng.' },
    ],
    quick: [
      { question: 'Vì sao chu kỳ của sin 2x = 1/2 là kπ?', solution: 'Vì 2x có chu kỳ 2kπ; chia hai vế cho 2 thì chu kỳ của x là kπ.' },
      { question: 'A′B′ và (ABCD) có điểm chung nào?', solution: 'Không có — A′B′ nằm trong mặt trên (A′B′C′D′) song song với mặt đáy.' },
    ],
    mistakes: ['Quên chia chu kỳ khi chia hai vế cho hệ số.', 'Bỏ điều kiện |m| ≤ 1.', 'Quên kiểm d ⊄ (P) khi chuyển sang hình học.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Mạch lượng giác', 'a. sin 2x = 1/2 ⇒ x = π/12 + kπ hoặc 5π/12 + kπ.', 'b. cos 2x = 1/2 ⇒ x = ±π/6 + kπ.', '2. Mạch hình học', 'a. A′B′ // AB ⊂ (ABCD) ⇒ A′B′ // (ABCD).', '3. Quy trình chung', 'a. Dữ kiện → công cụ → thực hiện → kiểm độc lập.'],
  },
  aiError: {
    category: 'Lỗi đại số', wrongSolution: 'AI giải: "sin 2x = 1/2 ⇒ 2x = π/6 + 2kπ ⇒ x = π/12 + 2kπ. Vậy nghiệm là x = π/12 + 2kπ."',
    correction: 'Khi chia hai vế cho 2, chu kỳ cũng phải chia: x = π/12 + kπ (và nhánh còn lại x = 5π/12 + kπ).',
    proof: 'Thử x = π/12 + π = 13π/12: sin(2·13π/12) = sin(13π/6) = sin(π/6 + 2π) = 1/2 ✓ — nghiệm này thuộc chu kỳ kπ nhưng bị công thức AI loại bỏ.',
    whyAiError: 'Mô hình chia đúng hệ số của biến nhưng giữ nguyên chu kỳ, bỏ qua việc chu kỳ phụ thuộc hệ số.',
    teacherPrompt: 'Em thử x = 13π/12 vào phương trình rồi sửa lại chu kỳ trong công thức nghiệm của AI.',
    studentProduct: 'Thẻ Đ/S + phép thử x = 13π/12 và công thức đúng với chu kỳ kπ.',
    boardPrompt: 'AI ra x = π/12 + 2kπ. Thử x = 13π/12.',
    libraryTitle: 'Lỗi AI không chia chu kỳ khi chia hệ số',
  },
};

export default [L30, L31, L32, L33];

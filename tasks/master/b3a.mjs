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

const L39 = {
  ...base,
  key: '10-6-39', period: 39, lessonType: 'formation',
  title: 'Biểu diễn miền nghiệm của hệ bất phương trình',
  opening: 'Lớp mình có 6 giờ để chuẩn bị gian hàng hội trường — vẽ "bản đồ thời gian" xem những cách chia nào khả thi.',
  focusQuestion: 'Khi nhiều ràng buộc cùng lúc, phần còn lại trên mặt phẳng là gì và vì sao phải lấy giao?',
  axis: `**Tình huống: Lớp chuẩn bị gian hàng hội trường trong tối đa 6 giờ, chia cho trang trí ($x$ giờ) và nấu ăn ($y$ giờ).**

$$\\begin{cases} x + y \\le 6 & \\text{(tổng thời gian)} \\\\ x \\ge 1 & \\text{(phải trang trí ít nhất 1 giờ)} \\\\ y \\ge 0 \\end{cases}$$

- **Ba đường biên:** $x + y = 6$; $x = 1$; $y = 0$.
- **Miền nghiệm:** tam giác với $A(1; 0)$; $B(6; 0)$; $C(1; 5)$ (vì $1 + 5 = 6$).
- **Kiểm chứng tay:** $A$: $1 + 0 = 1 \\le 6$ ✓, $x = 1 \\ge 1$ ✓. $B$: $6 \\le 6$ ✓. $C$: $1 + 5 = 6 \\le 6$ ✓.
- **Điểm ngoài miền:** $(0; 3)$ vi phạm $x \\ge 1$; $(5; 3)$ vi phạm $x + y \\le 6$ ($8 > 6$).

**Bẫy của bài:** tô phần giao của hai điều kiện mà quên điều kiện thứ ba; nhầm hợp với giao.`,
  goals: {
    must: 'Vẽ ba đường biên, xác định phần giao và chỉ ra các đỉnh của miền nghiệm.',
    should: 'Kiểm tra từng đỉnh bằng cả ba điều kiện; loại điểm ngoài miền bằng phép thay cụ thể.',
    could: 'Thiết kế hệ có miền cho trước; phản biện hình vẽ thiếu một điều kiện.',
  },
  s1: {
    title: 'Sáu giờ cho gian hàng',
    context: 'Tổng thời gian ≤ 6 giờ; trang trí x giờ (ít nhất 1 giờ); nấu ăn y giờ (không âm).',
    question: 'Điểm (0; 3) có nằm trong miền nghiệm của hệ không?',
    options: ['Có, vì 0 + 3 = 3 ≤ 6', 'Không, vì x = 0 vi phạm x ≥ 1', 'Có, vì y = 3 ≥ 0'],
    correct: 1,
    why: 'Phải thỏa đồng thời mọi điều kiện; (0;3) vi phạm x ≥ 1 dù thỏa hai điều kiện còn lại.',
    discuss: ['`[PHÁT HIỆN]` Vì sao phải lấy giao chứ không lấy hợp?', '`[SO SÁNH]` Điểm (5;3) sai ở điều kiện nào?'],
    cue: 'Vẽ ba nửa mặt phẳng ba màu khác nhau; phần tô đậm là chỗ ba màu chồng nhau.',
    lookFor: 'HS kiểm đủ ba điều kiện trước khi kết luận.',
  },
  s3: {
    title: 'Ba bước vẽ miền nghiệm hệ',
    steps: [
      'Vẽ từng đường biên: $x + y = 6$ qua $(6;0)$, $(0;6)$; $x = 1$; $y = 0$.',
      'Xác định nửa mặt phẳng của từng điều kiện bằng điểm thử.',
      'Lấy phần giao — tam giác $A(1;0)$, $B(6;0)$, $C(1;5)$.',
      'Kiểm từng đỉnh bằng cả ba điều kiện trước khi kết luận.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao đỉnh $C$ có tọa độ $(1;5)$?', '`[PHÁT HIỆN]` Nếu bỏ $x \\ge 1$ thì miền thay đổi thế nào?'],
    cue: 'Khung: "vẽ biên → lấy giao → thử đỉnh". Nhắc đỉnh = giao hai biên, phải kiểm điều kiện còn lại.',
    close: 'Miền nghiệm hệ là phần giao; mọi điểm trong miền phải thỏa đồng thời mọi điều kiện.',
  },
  s4: { bat: 'AI chỉ tô phần giao của x + y ≤ 6 và y ≥ 0, bỏ điều kiện x ≥ 1.', chung: 'Điểm (0; 2) nằm trong vùng AI tô nhưng vi phạm x ≥ 1.', sua: 'Cắt thêm nửa mặt phẳng x ≥ 1: miền đúng là tam giác (1;0), (6;0), (1;5).', cue: 'Cho HS yếu thay (0;2) vào hệ để thấy mâu thuẫn ngay.', lookFor: 'HS chỉ ra điều kiện bị bỏ và vùng bị tô thừa.' },
  s6: { hints: { M: 'vẽ biên rồi tô phần chồng nhau.', S: 'tìm đỉnh bằng giao hai biên, kiểm điều kiện còn lại.', C: 'tự đặt hệ có miền tam giác và nhờ bạn kiểm.' }, lookFor: 'HS M nêu đúng phép giao; HS S tìm đủ đỉnh; HS C thiết kế hệ hợp lệ.' },
  postCheck: {
    q: 'Tìm các đỉnh của miền nghiệm x ≥ 0, y ≥ 0, x + y ≤ 3.',
    a: 'Tam giác với các đỉnh (0;0), (3;0), (0;3); mỗi đỉnh thỏa cả ba điều kiện.',
    ds: [{ t: '"Điểm thỏa 2/3 điều kiện là nghiệm hệ"', v: 'Sai' }, { t: '"Miền nghiệm hệ là giao các miền"', v: 'Đúng' }, { t: '"Đỉnh là giao hai đường biên"', v: 'Đúng' }],
    cue: 'Chiếu 2 hình của HS, cùng kiểm đỉnh.',
  },
  s8Close: 'Đồng thời = giao; đỉnh phải kiểm đủ điều kiện.',
  s9: {
    title: 'Chọn cách chia 6 giờ',
    bullets: ['Ưu tiên nấu ăn: $(1; 5)$ — 1 giờ trang trí, 5 giờ nấu, đúng 6 giờ.', 'Cân bằng: $(3; 3)$ — 6 giờ, thỏa mọi điều kiện.', 'Ưu tiên trang trí: $(6; 0)$ — 6 giờ trang trí, không nấu.'],
    cue: 'Hỏi: "Ba phương án trên đều trong miền — chọn cái nào là quyết định của lớp, không phải của toán."',
  },
  exit: ['Miền nghiệm hệ xác định bằng phép giao hay hợp?', 'Nêu 1 bẫy (bỏ điều kiện; nhầm hợp với giao).', 'Tự đánh giá M / S / C.', 'Nêu ba đỉnh miền nghiệm của hệ x + y ≤ 6, x ≥ 1, y ≥ 0.'],
  exitCue: 'Mở lại tam giác ở S3.',
  after: '- HS làm bài tập SGK về miền nghiệm của hệ; chuẩn bị tiết ứng dụng hệ bất phương trình.',
  snapshot: {
    focus: 'Biểu diễn miền nghiệm của hệ bất phương trình bằng phần giao các nửa mặt phẳng, trên trục thực nghiệm chia 6 giờ chuẩn bị gian hàng: x + y ≤ 6, x ≥ 1, y ≥ 0 (tam giác (1;0), (6;0), (1;5)); kiểm tra đỉnh và loại điểm ngoài miền',
    formulas: ['S = S_1 \\cap S_2 \\cap S_3', '\\text{Đỉnh} = \\text{giao hai đường biên} \\cap \\text{thỏa điều kiện còn lại}', '\\text{Mọi điểm trong miền thỏa đồng thời mọi bất phương trình}'],
    examples: [
      { question: 'Biểu diễn miền nghiệm của hệ x + y ≤ 6, x ≥ 1, y ≥ 0 và xác định các đỉnh.', answer: 'Vẽ ba đường biên: x + y = 6 qua (6;0), (0;6); x = 1; y = 0. Lấy phần giao: tam giác A(1;0), B(6;0), C(1;5). Kiểm: A cho 1 ≤ 6; B cho 6 ≤ 6; C cho 6 ≤ 6 — cả ba thỏa mọi điều kiện.' },
      { question: 'Một nhóm tô thêm phần có x < 1 vào miền nghiệm. GV nên hỏi gì để nhóm tự sửa?', answer: 'Hỏi: "Lấy một điểm trong phần tô thêm, ví dụ (0;2), thay vào x ≥ 1 được gì?" Vì 0 ≥ 1 sai nên phần đó phải bỏ; miền đúng chỉ gồm các điểm có x ≥ 1.' },
    ],
    exercises: [
      { level: 'NB', question: 'Sau khi vẽ các nửa mặt phẳng, thao tác cuối cùng để được miền nghiệm hệ là gì?', answer: 'Lấy phần giao của các nửa mặt phẳng, rồi kiểm tra lại các đỉnh/điểm đại diện.' },
      { level: 'NB', question: 'Điểm (2; 1) có thỏa hệ x ≥ 1, y ≥ 0, x + y ≤ 4 không?', answer: 'Có: 2 ≥ 1, 1 ≥ 0, 2 + 1 = 3 ≤ 4.' },
      { level: 'TH', question: 'Tìm các đỉnh miền nghiệm của hệ x ≥ 0, y ≥ 0, x + y ≤ 3.', answer: 'Tam giác với đỉnh (0;0), (3;0), (0;3).' },
      { level: 'TH', question: 'Điểm (0; 2) có thuộc miền nghiệm của hệ x ≥ 1, y ≥ 0, x + y ≤ 6 không?', answer: 'Không: 0 ≥ 1 sai, dù 2 ≥ 0 và 0 + 2 = 2 ≤ 6 đúng.' },
      { level: 'VD', question: 'Nêu một điểm chắc chắn không thuộc miền và chỉ rõ điều kiện nào bị vi phạm.', answer: 'Ví dụ (5; 3) với hệ x + y ≤ 6, x ≥ 1, y ≥ 0: 5 + 3 = 8 > 6 nên vi phạm điều kiện tổng thời gian (dù x ≥ 1 và y ≥ 0 đúng).' },
      { level: 'VD', question: 'Một hình vẽ chỉ tô giao của hai điều kiện và quên điều kiện thứ ba. Hãy phản biện.', answer: 'Chọn một điểm trong vùng tô nhưng vi phạm điều kiện thứ ba; ví dụ với hệ x + y ≤ 6, x ≥ 1, y ≥ 0, điểm (0;2) nằm trong giao của hai điều kiện sau nhưng vi phạm x ≥ 1 — nên vùng tô phải cắt bớt.' },
    ],
    quick: [
      { question: 'Vì sao miền nghiệm hệ là giao mà không phải hợp?', solution: 'Vì nghiệm hệ phải thỏa đồng thời mọi bất phương trình; hợp sẽ chứa cả điểm chỉ thỏa một điều kiện.' },
      { question: 'Đỉnh (1; 5) được xác định từ giao hai đường nào?', solution: 'x = 1 và x + y = 6 (thay x = 1 được y = 5).' },
    ],
    mistakes: ['Chỉ tô giao của một vài điều kiện, bỏ điều kiện còn lại.', 'Nhầm hợp với giao.', 'Kết luận đỉnh mà không kiểm điều kiện thứ ba.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Miền nghiệm của hệ', 'a. Là giao các miền nghiệm thành phần.', 'b. Mọi điểm trong miền thỏa đồng thời mọi bất phương trình.', '2. Ba bước biểu diễn', 'a. Vẽ từng đường biên và nửa mặt phẳng.', 'b. Lấy phần giao.', 'c. Kiểm tra các đỉnh.', '3. Áp dụng: 6 giờ chuẩn bị gian hàng', 'a. Hệ: x + y ≤ 6, x ≥ 1, y ≥ 0.', 'b. Đỉnh: (1;0), (6;0), (1;5).'],
  },
  aiError: {
    category: 'Thiếu điều kiện', wrongSolution: 'AI vẽ miền nghiệm của hệ x + y ≤ 6, x ≥ 1, y ≥ 0 bằng cách lấy giao của x + y ≤ 6 và y ≥ 0, rồi kết luận: "Miền nghiệm là tam giác (0;0), (6;0), (0;6). Điều kiện x ≥ 1 chỉ là ghi chú nên không ảnh hưởng hình vẽ."',
    correction: 'x ≥ 1 là điều kiện bắt buộc. Miền nghiệm đúng là tam giác (1;0), (6;0), (1;5) — đã cắt bỏ phần có x < 1.',
    proof: 'Điểm (0;2) nằm trong tam giác AI vẽ nhưng cho 0 ≥ 1 sai, nên không thể là nghiệm hệ. Ngoài ra đỉnh (0;6) cũng vi phạm x ≥ 1.',
    whyAiError: 'Mô hình coi các ràng buộc dạng bất đẳng thức đơn giản (x ≥ 1) là "ghi chú" và chỉ xử lý các ràng buộc có hai biến.',
    teacherPrompt: 'Em kiểm tra hai đỉnh (0;0) và (0;6) trong hình AI vẽ: chúng có thỏa hệ không? Hãy sửa lại miền nghiệm.',
    studentProduct: 'Thẻ Đ/S + chỉ ra (0;6) vi phạm x ≥ 1 và vẽ lại tam giác (1;0), (6;0), (1;5).',
    boardPrompt: 'AI vẽ tam giác (0;0), (6;0), (0;6). Đỉnh nào vi phạm?',
    libraryTitle: 'Lỗi AI bỏ ràng buộc một biến khi vẽ miền nghiệm hệ',
  },
};

const L40 = {
  ...base,
  key: '10-6-40', period: 40, lessonType: 'practice',
  title: 'Ứng dụng hệ bất phương trình',
  opening: 'Nhóm tình nguyện cần chọn số gói quà mỗi loại — hôm nay lớp mình dùng hệ bất phương trình để chọn phương án tốt nhất.',
  focusQuestion: 'Làm thế nào biến một tình huống thực tế thành hệ ràng buộc rồi chọn phương án tốt nhất?',
  axis: `**Tình huống: Nhóm tình nguyện chuẩn bị quà Tết, chọn $x$ gói loại A và $y$ gói loại B.**

$$\\begin{cases} x + y \\le 12 & \\text{(tổng số gói mang theo)} \\\\ x \\ge 4 & \\text{(lớp đã đăng ký ít nhất 4 gói A)} \\\\ y \\ge 0 \\end{cases}$$

- **Miền khả thi:** tam giác với $(4;0)$, $(12;0)$, $(4;8)$.
- **Tiêu chí chọn:** $P = 2x + 3y$ (điểm hỗ trợ mỗi gói).
- **Kiểm chứng tay:** $(4;0)$: $P = 8$; $(12;0)$: $P = 24$; $(4;8)$: $P = 8 + 24 = 32$ → **lớn nhất tại $(4;8)$**.
- Kiểm điều kiện: $(4;8)$ cho $x + y = 12 \\le 12$ ✓, $x = 4 \\ge 4$ ✓.

**Bẫy của bài:** chỉ xét một đỉnh; bỏ điều kiện $x \\ge 4$; quên rằng $x, y$ là số gói nên phải nguyên.`,
  goals: {
    must: 'Viết hệ ràng buộc từ lời văn và chỉ ra miền khả thi cùng các đỉnh.',
    should: 'Tính giá trị tiêu chí tại các đỉnh và chọn phương án tốt nhất kèm lý do.',
    could: 'Đề xuất tiêu chí khác và so sánh kết quả; phản biện kết luận chỉ xét một phương án.',
  },
  s1: {
    title: 'Chọn gói quà nào?',
    context: 'Tối đa 12 gói; ít nhất 4 gói loại A; mỗi gói A được 2 điểm, mỗi gói B được 3 điểm hỗ trợ.',
    question: 'Đại lượng nào là "biến quyết định" trong mô hình?',
    options: ['Số điểm hỗ trợ P', 'Số gói A và số gói B (x, y)', 'Tổng số gói 12'],
    correct: 1,
    why: 'x, y là đại lượng nhóm được chọn; P là tiêu chí đánh giá, 12 là ràng buộc.',
    discuss: ['`[PHÁT HIỆN]` Vì sao x + y ≤ 12 chứ không phải = 12?', '`[SO SÁNH]` Phương án (4;8) và (12;0): phương án nào được nhiều điểm hơn?'],
    cue: 'Ghi 3 dòng: biến — ràng buộc — tiêu chí; HS chỉ vào dòng tương ứng.',
    lookFor: 'HS phân biệt biến với tiêu chí.',
  },
  s3: {
    title: 'Mô hình hóa và chọn theo tiêu chí',
    steps: [
      'Đặt biến: $x$ = số gói A, $y$ = số gói B; $x, y \\in \\mathbb{N}$.',
      'Viết ràng buộc: $x + y \\le 12$, $x \\ge 4$, $y \\ge 0$.',
      'Tìm miền khả thi và các đỉnh: $(4;0)$, $(12;0)$, $(4;8)$.',
      'Tính $P = 2x + 3y$ tại từng đỉnh, chọn giá trị lớn nhất và kiểm lại điều kiện.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao chỉ cần xét các đỉnh?', '`[PHÁT HIỆN]` Nếu tiêu chí là $P = x + y$ thì phương án nào tốt nhất?'],
    cue: 'Khung 4 bước: biến → ràng buộc → miền → tiêu chí. Nhắc kiểm điều kiện nguyên.',
    close: 'Với tiêu chí tuyến tính, giá trị lớn nhất đạt tại một đỉnh của miền khả thi.',
  },
  s4: { bat: 'AI kết luận $(12;0)$ tốt nhất vì có $x$ lớn nhất, bỏ qua tiêu chí $P = 2x+3y$.', chung: 'Tính: $(12;0)$ cho $P = 24$, còn $(4;8)$ cho $P = 32$ — lớn hơn.', sua: 'So sánh $P$ tại cả ba đỉnh rồi mới kết luận: $(4;8)$ tốt nhất.', cue: 'Cho HS lập bảng 3 đỉnh × 1 tiêu chí để thấy ngay.', lookFor: 'HS so sánh theo tiêu chí, không theo cảm giác "nhiều A hơn".' },
  s6: { hints: { M: 'viết ràng buộc rồi tìm đỉnh.', S: 'lập bảng P tại từng đỉnh và so sánh.', C: 'đổi tiêu chí và so sánh kết quả, giải thích vì sao đổi.' }, lookFor: 'HS M viết đúng hệ; HS S chọn đúng đỉnh; HS C so sánh được hai tiêu chí.' },
  postCheck: {
    q: 'Với hệ $x + y \\le 10$, $x \\ge 2$, $y \\ge 0$ và $P = 2x + 3y$, phương án nào tốt nhất?',
    a: 'Đỉnh: $(2;0)$, $(10;0)$, $(2;8)$. $P$ lần lượt: 4; 20; 28 → tốt nhất tại $(2;8)$ với $P = 28$.',
    ds: [{ t: '"Chỉ cần xét một phương án là đủ"', v: 'Sai' }, { t: '"Với tiêu chí tuyến tính, cực trị đạt tại đỉnh"', v: 'Đúng' }, { t: '"Nghiệm hệ phải thỏa mọi ràng buộc"', v: 'Đúng' }],
    cue: 'Mời 2 HS trình bày bảng P.',
  },
  s8Close: 'Biến → ràng buộc → miền → tiêu chí.',
  s9: {
    title: 'Chốt phương án cho nhóm tình nguyện',
    bullets: ['Nếu ưu tiên điểm hỗ trợ: chọn $(4; 8)$ với $P = 32$.', 'Nếu ưu tiên số gói: chọn $(12; 0)$ hoặc $(4; 8)$ — cùng 12 gói.', 'Phải ghi rõ giả định: mỗi gói A/B đóng gói được nguyên chiếc, không chia nhỏ.'],
    cue: 'Hỏi: "Nếu chỉ được chọn 1 loại thì nên chọn loại nào?" → so sánh $P$ mỗi gói (A: 2, B: 3).',
  },
  exit: ['Nêu 4 bước mô hình hóa bằng hệ bất phương trình.', 'Nêu 1 bẫy (chỉ xét một đỉnh; bỏ ràng buộc).', 'Tự đánh giá M / S / C.', 'Với x + y ≤ 12, x ≥ 4, P = 2x + 3y, phương án nào tốt nhất?'],
  exitCue: 'Mở lại bảng đỉnh và giá trị P ở mục II.',
  after: '- HS hoàn thành bài tập ứng dụng; chuẩn bị tiết luyện tập hệ bất phương trình.',
  snapshot: {
    focus: 'Mô hình hóa tình huống chọn gói quà tình nguyện thành hệ bất phương trình (x + y ≤ 12, x ≥ 4, y ≥ 0), xác định miền khả thi (đỉnh (4;0), (12;0), (4;8)) và chọn phương án theo tiêu chí P = 2x + 3y (lớn nhất 32 tại (4;8))',
    formulas: ['\\text{Biến} \\to \\text{ràng buộc} \\to \\text{miền khả thi} \\to \\text{tiêu chí}', '\\begin{cases}x + y \\le 12 \\\\ x \\ge 4 \\\\ y \\ge 0\\end{cases}', 'P = 2x + 3y'],
    examples: [
      { question: 'Nhóm chọn x gói loại A và y gói loại B, mang tối đa 12 gói, cần ít nhất 4 gói A. Viết hệ ràng buộc.', answer: 'x + y ≤ 12 (tổng số gói), x ≥ 4 (đã đăng ký), y ≥ 0; thêm x, y ∈ ℕ vì là số gói.' },
      { question: 'Với tiêu chí P = 2x + 3y, so sánh các đỉnh (4;0), (12;0), (4;8) và chọn phương án tốt nhất.', answer: 'P(4;0) = 8; P(12;0) = 24; P(4;8) = 8 + 24 = 32. Phương án (4;8) cho P lớn nhất và thỏa x + y = 12 ≤ 12, x = 4 ≥ 4.' },
    ],
    exercises: [
      { level: 'NB', question: 'Trong mô hình, x và y được gọi là gì?', answer: 'Biến quyết định — các đại lượng cần chọn.' },
      { level: 'NB', question: 'Viết ràng buộc "tổng không quá 12".', answer: 'x + y ≤ 12.' },
      { level: 'TH', question: 'Tìm miền khả thi của x + y ≤ 10, x ≥ 2, y ≥ 0 và nêu các đỉnh.', answer: 'Tam giác với đỉnh (2;0), (10;0), (2;8).' },
      { level: 'TH', question: 'Tính P = 2x + 3y tại (2;8) và (10;0). Phương án nào tốt hơn theo P?', answer: 'P(2;8) = 4 + 24 = 28; P(10;0) = 20. Theo P, (2;8) tốt hơn.' },
      { level: 'VD', question: 'Nêu một giả định cần ghi khi coi x, y là số thực thay vì số nguyên.', answer: 'Giả định cho phép chia nhỏ đơn vị (ví dụ nửa gói). Nếu gói không chia được thì buộc thêm x, y ∈ ℕ, khi đó một số điểm trong miền không còn khả thi.' },
      { level: 'VD', question: 'Phản biện kết luận: "Giá trị P lớn nhất luôn nằm ở giao của hai đường biên bất kỳ".', answer: 'Không luôn đúng: phải xét các đỉnh thuộc miền khả thi (giao hai biên và thỏa điều kiện còn lại) cùng điều kiện nguyên. Ví dụ giao của x = 4 với y = 0 là (4;0) nhưng P chỉ 8, không phải lớn nhất.' },
    ],
    quick: [
      { question: 'Vì sao chỉ cần tính P tại các đỉnh?', solution: 'Vì P là hàm tuyến tính trên miền đa giác lồi; giá trị lớn nhất/nhỏ nhất đạt tại một đỉnh.' },
      { question: 'Nếu bỏ điều kiện x ≥ 4 thì phương án tốt nhất thay đổi thế nào?', solution: 'Miền mở rộng thành tam giác (0;0), (12;0), (0;12); P lớn nhất tại (0;12) với P = 36 — nhưng vi phạm cam kết 4 gói A.' },
    ],
    mistakes: ['Chỉ xét một phương án mà không so sánh các đỉnh.', 'Bỏ ràng buộc tối thiểu (x ≥ 4).', 'Quên điều kiện nguyên của x, y.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Quy trình mô hình hóa', 'a. Đặt biến kèm đơn vị và điều kiện.', 'b. Viết ràng buộc từ lời văn.', 'c. Tìm miền khả thi, liệt kê đỉnh.', 'd. Tính tiêu chí tại đỉnh và chọn.', '2. Áp dụng gói quà tình nguyện', 'a. Hệ: x + y ≤ 12, x ≥ 4, y ≥ 0; x, y ∈ ℕ.', 'b. Đỉnh: (4;0) P = 8; (12;0) P = 24; (4;8) P = 32.', 'c. Kết luận: chọn (4;8) nếu ưu tiên điểm hỗ trợ.'],
  },
  aiError: {
    category: 'Thiếu điều kiện', wrongSolution: 'AI kết luận: "Vì x ≥ 4 nên cần nhiều gói A nhất có thể. Phương án (12; 0) là tốt nhất vì dùng hết 12 gói và có số gói A lớn nhất."',
    correction: 'Tiêu chí là P = 2x + 3y, không phải "nhiều A nhất". P(12;0) = 24, còn P(4;8) = 32, nên (4;8) mới là phương án tốt nhất.',
    proof: 'Lập bảng: (4;0) → 8; (12;0) → 24; (4;8) → 32. Giá trị lớn nhất là 32 tại (4;8), thỏa x + y = 12 và x = 4 ≥ 4.',
    whyAiError: 'Mô hình tối ưu theo một biến thay vì theo tiêu chí đã nêu, bỏ qua đóng góp của y vào P.',
    teacherPrompt: 'Em lập bảng P tại ba đỉnh rồi sửa lại kết luận của AI.',
    studentProduct: 'Thẻ Đ/S + bảng 3 đỉnh với P tương ứng và kết luận (4;8).',
    boardPrompt: 'AI chọn (12;0) vì "nhiều A nhất". Tiêu chí là gì?',
    libraryTitle: 'Lỗi AI tối ưu theo một biến thay vì theo tiêu chí',
  },
};

const L41 = {
  ...base,
  key: '10-6-41', period: 41, lessonType: 'practice',
  title: 'Luyện tập hệ bất phương trình',
  opening: 'Hôm nay lớp mình luyện "đọc bản đồ" miền nghiệm và giải thích vì sao loại vùng ngoài.',
  focusQuestion: 'Một lời giải hệ bất phương trình đạt chuẩn cần đủ những thành phần nào?',
  axis: `**Tình huống: Xếp lịch trực gian hàng — tổng tối đa 5 ca, không âm, và phải có ít nhất 1 ca buổi sáng ($y$).**

$$\\begin{cases} x + y \\le 5 \\\\ x \\ge 0 \\\\ y \\ge 1 \\end{cases}$$

- **Miền nghiệm:** tam giác với $(0;1)$, $(0;5)$, $(4;1)$ — kiểm: $0 + 5 = 5$ ✓; $4 + 1 = 5$ ✓.
- **Kiểm chứng tay:** $(2;2)$: $4 \\le 5$ ✓, $y = 2 \\ge 1$ ✓ → thuộc miền. $(5;1)$: $6 > 5$ → ngoài miền. $(0;0)$: $y = 0 < 1$ → ngoài miền.
- **Lời giải đạt chuẩn gồm 4 phần:** hệ → hình/miền giao → điểm kiểm → kết luận loại vùng ngoài.

**Bẫy của bài:** trình bày hình mà không ghi hệ; kiểm điểm nhưng không kiểm đủ ba điều kiện.`,
  goals: {
    must: 'Giải hệ đơn giản, xác định miền và các đỉnh.',
    should: 'Kiểm tra điểm/đỉnh bằng cả ba điều kiện và giải thích vì sao loại vùng ngoài.',
    could: 'Chỉ ra lỗ hổng trong bài trình bày của bạn; thiết kế hệ có miền tứ giác.',
  },
  s1: {
    title: 'Lịch trực gian hàng',
    context: 'Tối đa 5 ca; x ca chiều, y ca sáng; phải có ít nhất 1 ca sáng.',
    question: 'Điểm (0; 0) có thuộc miền nghiệm không?',
    options: ['Có, vì 0 + 0 = 0 ≤ 5', 'Không, vì y = 0 vi phạm y ≥ 1', 'Có, vì x = 0 ≥ 0'],
    correct: 1,
    why: 'Phải thỏa đồng thời; (0;0) vi phạm y ≥ 1.',
    discuss: ['`[PHÁT HIỆN]` Điểm (4;1) nằm ở đâu?', '`[SO SÁNH]` Vì sao (5;1) ngoài miền?'],
    cue: 'Yêu cầu HS luôn đọc đủ ba điều kiện trước khi trả lời.',
    lookFor: 'HS kiểm đủ điều kiện.',
  },
  s3: {
    title: 'Bốn phần của một lời giải đạt',
    steps: [
      'Ghi hệ bất phương trình rõ ràng.',
      'Vẽ các đường biên và tô miền giao.',
      'Chọn một điểm trong miền và một điểm ngoài miền để kiểm.',
      'Kết luận, giải thích vì sao loại vùng ngoài (chỉ rõ điều kiện bị vi phạm).',
    ],
    ask: ['`[SUY LUẬN]` Vì sao phải kiểm cả điểm ngoài miền?', '`[PHÁT HIỆN]` Đỉnh (0;5) được xác định từ giao hai đường nào?'],
    cue: 'Treo 4 tiêu chí; HS tự chấm bài mình theo 4 tiêu chí.',
    close: 'Lời giải đạt = hệ + hình + kiểm + kết luận có lý do.',
  },
  s4: { bat: 'AI kết luận $(5;1)$ thuộc miền vì "5 + 1 = 6 gần 5".', chung: '$6 > 5$ nên vi phạm điều kiện đầu; "gần đúng" không phải thỏa bất phương trình.', sua: '$(5;1)$ ngoài miền; điểm thuộc miền là $(4;1)$ vì $4 + 1 = 5 \\le 5$.', cue: 'Nhắc: bất phương trình không có khái niệm "gần đúng".', lookFor: 'HS chỉ ra lỗi so sánh lỏng.' },
  s6: { hints: { M: 'vẽ biên, tô giao, kiểm một điểm.', S: 'kiểm cả điểm trong và ngoài miền.', C: 'tìm lỗ hổng trong bài của bạn theo 4 tiêu chí.' }, lookFor: 'HS M đủ 3 bước; HS S kiểm hai phía; HS C chỉ đúng lỗ hổng.' },
  postCheck: {
    q: 'Tìm miền và đỉnh của hệ $x + y \\le 5$, $x \\ge 0$, $y \\ge 1$.',
    a: 'Tam giác với $(0;1)$, $(0;5)$, $(4;1)$. Điểm $(2;2)$ thuộc miền; $(5;1)$ và $(0;0)$ không.',
    ds: [{ t: '"Chỉ cần vẽ hình, không cần ghi hệ"', v: 'Sai' }, { t: '"Phải kiểm cả điểm ngoài miền để chắc chắn"', v: 'Đúng' }, { t: '"Đỉnh (4;1) là giao của x + y = 5 và y = 1"', v: 'Đúng' }],
    cue: 'Chiếu 2 bài, chấm theo 4 tiêu chí.',
  },
  s8Close: 'Hệ + hình + kiểm + kết luận.',
  s9: {
    title: 'Xếp lịch trực hợp lý',
    bullets: ['Nếu thiếu người sáng: $(4;1)$ — 4 ca chiều, 1 ca sáng.', 'Nếu cân bằng: $(2;3)$ — 5 ca, thỏa mọi điều kiện.', 'Nếu chỉ có người sáng: $(0;5)$ — 5 ca sáng, không ca chiều.'],
    cue: 'Hỏi: "Phương án nào dùng đủ 5 ca?" → (0;5) và (4;1) và (2;3).',
  },
  exit: ['Nêu 4 phần của lời giải đạt.', 'Nêu 1 bẫy (bỏ hình; không kiểm đủ điều kiện).', 'Tự đánh giá M / S / C.', 'Nêu ba đỉnh của miền x + y ≤ 5, x ≥ 0, y ≥ 1.'],
  exitCue: 'Mở lại tam giác ở mục II.',
  after: '- HS hoàn thành phiếu luyện hệ; chuẩn bị tiết ôn tập chương III.',
  snapshot: {
    focus: 'Luyện giải hệ bất phương trình và kiểm tra miền nghiệm trên trục xếp lịch trực gian hàng (x + y ≤ 5, x ≥ 0, y ≥ 1; tam giác (0;1), (0;5), (4;1)); rèn 4 thành phần của một lời giải đạt: hệ, hình, kiểm, kết luận',
    formulas: ['S = S_1 \\cap S_2 \\cap S_3', '\\text{Kiểm điểm bằng cách thay vào từng điều kiện}', '\\text{Lời giải đạt} = \\text{hệ} + \\text{hình} + \\text{kiểm} + \\text{kết luận}'],
    examples: [
      { question: 'Giải hệ x + y ≤ 5, x ≥ 0, y ≥ 1 và nêu các đỉnh.', answer: 'Miền là tam giác giới hạn bởi x + y = 5, x = 0, y = 1 với các đỉnh (0;1), (0;5), (4;1). Kiểm (4;1): 5 ≤ 5, 4 ≥ 0, 1 ≥ 1.' },
      { question: 'Một HS trình bày hình vẽ nhưng không ghi hệ. Em hỏi gì để bạn bổ sung?', answer: 'Hỏi: "Ba đường biên này ứng với ba bất phương trình nào? Điều kiện nào quyết định miền nằm phía nào?" — buộc bạn ghi hệ và nêu điểm kiểm.' },
    ],
    exercises: [
      { level: 'NB', question: 'Tìm miền nghiệm của x ≥ 0, y ≥ 0, x + y ≤ 1.', answer: 'Tam giác với (0;0), (1;0), (0;1).' },
      { level: 'NB', question: 'Sau khi tìm giao điểm các đường biên, phải làm gì tiếp?', answer: 'Kiểm giao điểm đó có thỏa mọi điều kiện còn lại không, rồi mới kết luận là đỉnh của miền.' },
      { level: 'TH', question: 'Biểu diễn hệ x ≥ 1, y ≥ 2, x + y ≤ 6 và nêu các đỉnh.', answer: 'Tam giác với (1;2), (1;5), (4;2): kiểm 1 + 5 = 6, 4 + 2 = 6.' },
      { level: 'TH', question: 'Điểm (5; 1) có thuộc miền x + y ≤ 5, x ≥ 0, y ≥ 1 không?', answer: 'Không: 5 + 1 = 6 > 5.' },
      { level: 'VD', question: 'Tạo một hệ có miền nghiệm là hình tứ giác và giải thích cách kiểm các đỉnh.', answer: 'Ví dụ x ≥ 0, y ≥ 0, x + y ≤ 6, x + 3y ≤ 9: các đỉnh (0;0), (6;0), (4;2), (0;3). Kiểm từng đỉnh bằng cách thay vào cả bốn điều kiện.' },
      { level: 'VD', question: 'Viết phản hồi cho một HS chỉ ghi hình mà không ghi hệ.', answer: 'Phản hồi: "Hình đúng nhưng thiếu hệ nên người đọc không biết ràng buộc nào tạo ra miền. Em bổ sung hệ, một điểm kiểm trong miền và một điểm ngoài miền kèm điều kiện bị vi phạm."' },
    ],
    quick: [
      { question: 'Vì sao cần kiểm một điểm ngoài miền?', solution: 'Để chắc chắn đã chọn đúng phía; nếu điểm ngoài lại thỏa mọi điều kiện thì hình vẽ sai.' },
      { question: 'Đỉnh (0;5) là giao của hai đường nào?', solution: 'x = 0 và x + y = 5.' },
    ],
    mistakes: ['Chỉ vẽ hình mà không ghi hệ bất phương trình.', 'Kết luận đỉnh mà không kiểm điều kiện còn lại.', 'Dùng "gần đúng" để nhận một điểm vào miền.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Bốn phần của lời giải đạt', 'a. Ghi hệ rõ ràng.', 'b. Vẽ biên và tô miền giao.', 'c. Kiểm một điểm trong và một điểm ngoài.', 'd. Kết luận kèm lý do loại vùng ngoài.', '2. Áp dụng lịch trực', 'a. Hệ: x + y ≤ 5, x ≥ 0, y ≥ 1.', 'b. Đỉnh: (0;1), (0;5), (4;1).'],
  },
  aiError: {
    category: 'Lỗi logic', wrongSolution: 'AI kết luận: "Điểm (5; 1) có 5 + 1 = 6, chỉ hơi vượt mức 5 nên vẫn được coi là thuộc miền nghiệm của hệ x + y ≤ 5, x ≥ 0, y ≥ 1."',
    correction: '(5; 1) cho 6 > 5 nên vi phạm điều kiện x + y ≤ 5; bất phương trình không có khái niệm "gần đúng", do đó điểm này nằm ngoài miền.',
    proof: 'Điểm thuộc miền phải cho mọi bất phương trình đúng. 6 ≤ 5 là sai. Điểm sát biên nhất còn thuộc miền là (4; 1) vì 4 + 1 = 5 ≤ 5.',
    whyAiError: 'Mô hình nới lỏng phép so sánh khi giá trị "gần" ngưỡng, biến bất đẳng thức thành ước lượng.',
    teacherPrompt: 'Em kiểm điểm (5; 1) với điều kiện x + y ≤ 5 và sửa lại kết luận của AI.',
    studentProduct: 'Thẻ Đ/S + nêu phép so sánh 6 > 5 và điểm đúng sát biên (4; 1).',
    boardPrompt: 'AI nhận (5; 1) vì "6 gần 5". Sai ở đâu?',
    libraryTitle: 'Lỗi AI nới lỏng bất đẳng thức thành "gần đúng"',
  },
};

const L42 = {
  ...base,
  key: '10-6-42', period: 42, lessonType: 'practice',
  title: 'Ôn tập chương III — nhận diện dạng và công thức',
  opening: 'Hôm nay lớp mình lập "sơ đồ chọn chiến lược": nhìn dữ kiện là biết dùng công cụ nào.',
  focusQuestion: 'Có sơ đồ quyết định nào giúp chọn đúng công cụ chỉ từ dữ kiện?',
  axis: `**Tình huống: Hai bài toán của chương III được đặt cạnh nhau để so sánh cách chọn công cụ.**

| Bài | Dữ kiện | Công cụ |
|---|---|---|
| Sân hình tam giác | hai cạnh $6$ m, $8$ m, góc xen giữa $90^\\circ$ | định lý côsin (tìm cạnh thứ ba) + $S = \\tfrac12 ab\\sin C$ |
| Chia suất học bổng | $x \\ge 0$, $y \\ge 0$, $x + y \\le 4$ | đường biên + điểm thử + phần giao |

- **Kiểm chứng tay:** tam giác $6$–$8$–$90^\\circ$: cạnh huyền $\\sqrt{36 + 64} = 10$; $S = \\tfrac12\\cdot6\\cdot8 = 24$ m².
- Hệ $x + y \\le 4$: đỉnh $(0;0)$, $(4;0)$, $(0;4)$.
- **Sơ đồ 3 câu hỏi:** (1) Có góc xen giữa hai cạnh? → côsin + diện tích sin. (2) Có cặp cạnh–góc đối diện? → định lý sin. (3) Có nhiều điều kiện đồng thời? → hệ bất phương trình, lấy giao.

**Bẫy của bài:** chọn đúng công thức nhưng không kiểm điều kiện; nêu tên công thức mà không viết công thức.`,
  goals: {
    must: 'Nhận diện dạng bài và viết đúng công thức tương ứng.',
    should: 'Lập bảng "dữ kiện → công cụ" và giải một bài mỗi dạng, có phép kiểm.',
    could: 'Thiết kế sơ đồ quyết định cho bạn khác; phản biện lời giải nêu tên công thức mà không nêu nội dung.',
  },
  s1: {
    title: 'Nhìn dữ kiện, chọn công cụ',
    context: 'Bài 1: tam giác có hai cạnh và góc xen giữa. Bài 2: hệ ba bất phương trình.',
    question: 'Biết hai cạnh và góc xen giữa, công cụ nào cho cạnh thứ ba?',
    options: ['Định lý sin', 'Định lý côsin', 'Công thức diện tích'],
    correct: 1,
    why: 'Định lý côsin liên hệ ba cạnh với góc xen giữa: a² = b² + c² − 2bc·cos A.',
    discuss: ['`[PHÁT HIỆN]` Với hệ bất phương trình, phép kiểm bắt buộc là gì?', '`[SO SÁNH]` Hai dạng bài khác nhau ở điểm nào?'],
    cue: 'Treo bảng 3 câu hỏi quyết định ngay từ đầu tiết.',
    lookFor: 'HS trả lời bằng câu hỏi dữ kiện, không đoán.',
  },
  s3: {
    title: 'Sơ đồ chọn chiến lược',
    steps: [
      'Câu hỏi 1: có hai cạnh + góc xen giữa? → định lý côsin, diện tích $\\tfrac12 ab\\sin C$.',
      'Câu hỏi 2: có một cặp cạnh–góc đối diện? → định lý sin, tìm $R$ hoặc cạnh/góc còn lại.',
      'Câu hỏi 3: có nhiều điều kiện đồng thời? → hệ bất phương trình, lấy phần giao.',
      'Luôn kèm phép kiểm: bất đẳng thức tam giác, cận $S \\le \\tfrac12 bc$, hoặc thay điểm vào hệ.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao mỗi dạng cần một phép kiểm khác nhau?', '`[PHÁT HIỆN]` Bài nào dễ nhầm nhất khi chọn công cụ?'],
    cue: 'Khung 3 câu hỏi viết to; HS làm bài nào thì chỉ vào câu hỏi tương ứng.',
    close: 'Ba câu hỏi dữ kiện quyết định ba công cụ; phép kiểm là bắt buộc.',
  },
  s4: { bat: 'AI chọn đúng tên "định lý côsin" nhưng viết công thức $a^2 = b^2 + c^2 + 2bc\\cos A$.', chung: 'Dấu phải là trừ: $a^2 = b^2 + c^2 - 2bc\\cos A$; với $A = 90^\\circ$ công thức AI cho $a^2 = 100 + 0$ đúng nhưng với $A = 60^\\circ$ sẽ sai ($100 + 48$ thay vì $52$).', sua: 'Viết lại đúng dấu trừ và kiểm với tam giác $6, 8, 60^\\circ$: $a^2 = 52$.', cue: 'Cho HS thử $A = 60^\\circ$ ở cả hai công thức để thấy chênh lệch.', lookFor: 'HS kiểm công thức bằng một trường hợp cụ thể.' },
  s6: { hints: { M: 'hỏi 3 câu quyết định trước khi viết công thức.', S: 'làm xong kiểm bằng cận hoặc thay điểm.', C: 'vẽ sơ đồ quyết định dạng cây cho bạn khác dùng.' }, lookFor: 'HS M chọn đúng; HS S có phép kiểm; HS C có sơ đồ rõ ràng.' },
  postCheck: {
    q: 'Tam giác có hai cạnh $6$, $8$ và góc xen giữa $90^\\circ$: tính cạnh thứ ba và diện tích.',
    a: '$a^2 = 36 + 64 - 0 = 100 \\Rightarrow a = 10$; $S = \\tfrac12\\cdot6\\cdot8\\cdot\\sin90^\\circ = 24$ m².',
    ds: [{ t: '"Định lý sin dùng được khi biết ba cạnh"', v: 'Sai' }, { t: '"Diện tích dùng sin góc xen giữa"', v: 'Đúng' }, { t: '"Miền nghiệm hệ là phần giao"', v: 'Đúng' }],
    cue: 'Chiếu 2 bài làm, kiểm theo sơ đồ 3 câu hỏi.',
  },
  s8Close: 'Ba câu hỏi → ba công cụ; luôn kèm phép kiểm.',
  s9: {
    title: 'Áp dụng sơ đồ vào bài tổng hợp',
    bullets: ['Bài sân trường: dùng côsin tìm cạnh, sin tính diện tích, kiểm bằng cận ½bc.', 'Bài chia suất: lập hệ, vẽ miền, kiểm đỉnh.', 'Cùng một đề có thể có hai nhánh — chọn nhánh theo dữ kiện, không theo cảm giác.'],
    cue: 'Hỏi: "Nếu đề cho ba cạnh mà không cho góc, em làm gì?" → côsin để tìm góc trước.',
  },
  exit: ['Nêu 3 câu hỏi quyết định công cụ.', 'Nêu 1 bẫy (viết sai dấu côsin; nêu tên mà không viết công thức).', 'Tự đánh giá M / S / C.', 'Tam giác 6, 8, góc 90°: cạnh huyền và diện tích?'],
  exitCue: 'Mở lại sơ đồ 3 câu hỏi ở S3.',
  after: '- HS hoàn thành đề ôn chương III; chuẩn bị tiết ôn tập bài toán thực tiễn.',
  snapshot: {
    focus: 'Ôn tập nhận diện dạng và chọn công cụ chương III qua sơ đồ 3 câu hỏi: tam giác 6–8–90° (cạnh huyền 10, S = 24 m²) và hệ x ≥ 0, y ≥ 0, x + y ≤ 4; rèn phép kiểm bắt buộc cho từng dạng',
    formulas: ['a^2 = b^2 + c^2 - 2bc\\cos A', 'S = \\dfrac12 bc\\sin A', 'S = S_1 \\cap S_2 \\cap S_3'],
    examples: [
      { question: 'Lập bảng "dữ kiện → công cụ" cho một bài tam giác (hai cạnh 6, 8 và góc xen giữa 90°) và một hệ bất phương trình (x ≥ 0, y ≥ 0, x + y ≤ 4).', answer: 'Tam giác: có hai cạnh và góc xen giữa → định lý côsin tìm cạnh thứ ba (a = 10) và S = ½ab·sin C = 24 m². Hệ: nhiều điều kiện đồng thời → vẽ ba đường biên, thử điểm, lấy giao; đỉnh (0;0), (4;0), (0;4).' },
      { question: 'Một HS chọn đúng công thức nhưng không kiểm điều kiện. Em đặt câu hỏi nào?', answer: 'Hỏi: "Dữ kiện em dùng có đúng vai trò không (góc xen giữa hay góc đối diện)? Em đã kiểm kết quả bằng bất đẳng thức tam giác / điểm thử chưa?"' },
    ],
    exercises: [
      { level: 'NB', question: 'Chọn công thức tính cạnh thứ ba khi biết hai cạnh và góc xen giữa.', answer: 'Định lý côsin: a² = b² + c² − 2bc·cos A.' },
      { level: 'NB', question: 'Nêu phép kiểm bắt buộc khi giải hệ bất phương trình.', answer: 'Thay một điểm trong miền và một điểm ngoài miền vào tất cả các điều kiện.' },
      { level: 'TH', question: 'Tam giác vuông có hai cạnh góc vuông 6 và 8: tính cạnh huyền và diện tích.', answer: 'Cạnh huyền 10 (vì 36 + 64 = 100); S = ½·6·8 = 24.' },
      { level: 'TH', question: 'Biểu diễn hệ x ≥ 0, y ≥ 0, x + y ≤ 4 và nêu các đỉnh.', answer: 'Tam giác với (0;0), (4;0), (0;4).' },
      { level: 'VD', question: 'Tạo một sơ đồ quyết định giúp HS khác chọn công cụ đúng.', answer: 'Sơ đồ 3 câu hỏi: (1) có hai cạnh + góc xen giữa? → côsin/diện tích sin; (2) có cặp cạnh–góc đối diện? → định lý sin; (3) có nhiều điều kiện đồng thời? → hệ bất phương trình. Kèm bước 4: kiểm kết quả.' },
      { level: 'VD', question: 'Phản biện lời giải chỉ nêu "dùng công thức diện tích" mà không viết công thức cụ thể.', answer: 'Lời giải chưa đủ để kiểm chứng: có ba công thức diện tích khác nhau. Phải ghi rõ S = ½ah_a, S = ½ab·sin C hay S = abc/(4R), cùng dữ kiện tương ứng, thì mới đánh giá được đúng/sai.' },
    ],
    quick: [
      { question: 'Khi nào dùng định lý sin?', solution: 'Khi biết một cặp cạnh–góc đối diện (a và A, b và B, hoặc c và C).' },
      { question: 'Vì sao phải kiểm kết quả sau khi tính?', solution: 'Vì sai dấu, sai đơn vị hoặc dùng sai công cụ vẫn cho ra một con số; phép kiểm (bất đẳng thức tam giác, cận diện tích, điểm thử) phát hiện điều đó.' },
    ],
    mistakes: ['Viết sai dấu trong định lý côsin (+2bc·cos A).', 'Nêu tên công thức mà không viết nội dung.', 'Không kiểm kết quả sau khi tính.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Sơ đồ 3 câu hỏi', 'a. Hai cạnh + góc xen giữa → côsin + diện tích sin.', 'b. Cặp cạnh–góc đối diện → định lý sin.', 'c. Nhiều điều kiện đồng thời → hệ bất phương trình.', '2. Phép kiểm', 'a. Tam giác: bất đẳng thức tam giác, S ≤ ½bc.', 'b. Hệ: thay điểm trong và ngoài miền.', '3. Ví dụ chuẩn', 'a. 6–8–90°: cạnh huyền 10; S = 24 m².', 'b. x + y ≤ 4: đỉnh (0;0), (4;0), (0;4).'],
  },
  aiError: {
    category: 'Lỗi đại số', wrongSolution: 'AI trình bày: "Áp dụng định lý côsin: a² = b² + c² + 2bc·cos A. Với b = 6, c = 8, A = 60°: a² = 36 + 64 + 48 = 148, suy ra a ≈ 12,17."',
    correction: 'Công thức đúng là a² = b² + c² − 2bc·cos A, nên a² = 36 + 64 − 48 = 52 và a = 2√13 ≈ 7,21.',
    proof: 'Với A = 60° (góc nhọn), cạnh a phải nhỏ hơn cạnh lớn nhất trong hai cạnh kề khi góc đối diện nhỏ hơn góc đối diện của chúng. Kiểm bằng giá trị: 148 > 100 = b² + c², tức a > 10 — lớn hơn cả trường hợp góc vuông, vô lý vì 60° < 90°.',
    whyAiError: 'Mô hình ghi nhớ công thức ở dạng tổng thay vì hiệu, dẫn tới đảo dấu số hạng −2bc·cos A.',
    teacherPrompt: 'Em kiểm công thức của AI bằng trường hợp A = 90° và A = 60° rồi sửa lại dấu cho đúng.',
    studentProduct: 'Thẻ Đ/S + nêu a² = 52 (không phải 148) và giải thích vì sao a > 10 là vô lý khi A = 60°.',
    boardPrompt: 'AI dùng dấu + trong định lý côsin. Thử A = 60° thì a vượt 10 — vì sao vô lý?',
    libraryTitle: 'Lỗi AI đảo dấu trong định lý côsin',
  },
};

export default [L39, L40, L41, L42];

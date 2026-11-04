const base = {
  grade: 10, week: 5, date: '2026-11-04',
  timeMap: [
    ['HĐ 1 Khởi động — tình huống thực tế của trục dữ liệu', 'P0–P3', 'S0 0–180 + S1 180–300'],
    ['HĐ 2 Xác định mục tiêu M/S/C', 'P3–P5', 'S2 300–480'],
    ['HĐ 3 Hình thành kiến thức + làm mẫu', 'P5–P16', 'S3 480–960'],
    ['HĐ 4 AI Error + chốt quy tắc', 'P16–P19', 'S4 960–1140 + S5 1140–1200'],
    ['HĐ 5 Luyện tập phân hoá 3 luồng', 'P20–P27', 'S6 1200–1620'],
    ['HĐ 6 Post-check & ĐGTX', 'P27–P30', 'S7 1620–1800'],
    ['HĐ 7 Kiểm tra nhanh', 'P30–P35', 'S8 1800–2100'],
    ['HĐ 8 Ứng dụng thực tế', 'P35–P38', 'S9 2100–2280'],
    ['HĐ 9 Exit Ticket & tổng kết', 'P38–P40', 'S10 2280–2400'],
  ],
};

const L31 = {
  ...base,
  key: '10-5-31', period: 31, lessonType: 'formation',
  title: 'Bất phương trình bậc nhất hai ẩn',
  opening: 'Hôm nay lớp mình giúp xe bánh mì "Bánh Mì 0đ" lập kế hoạch mua nguyên liệu trong 150 nghìn đồng.',
  focusQuestion: 'Làm thế nào để một bất đẳng thức giữa hai đại lượng lại mô tả được một quyết định mua sắm?',
  axis: `**Tình huống: Xe bánh mì "Bánh Mì 0đ" đi hội chợ trường với ngân sách 150 nghìn đồng.**

- Mỗi chiếc bánh mì giá **15 nghìn**, mỗi chai nước giá **10 nghìn**.
- Gọi $x$ là số bánh mì, $y$ là số chai nước mua trong buổi.
- Điều kiện ngân sách: $15x + 10y \\le 150$, rút gọn $3x + 2y \\le 30$; thêm $x, y \\in \\mathbb{N}$.

**Kiểm chứng tay (dùng suốt tiết):**

| Phương án | Chi phí | Kết luận |
|---|---|---|
| $(4; 9)$ | $15\\cdot4 + 10\\cdot9 = 150$ | Đúng bằng ngân sách → **là nghiệm** |
| $(2; 12)$ | $30 + 120 = 150$ | **là nghiệm** |
| $(6; 7)$ | $90 + 70 = 160 > 150$ | **không là nghiệm** |
| $(5; 8)$ | $75 + 80 = 155 > 150$ | **không là nghiệm** |

**Bẫy của bài:** đọc "không vượt quá" thành dấu $=$; và quên rằng $x, y$ phải là số nguyên không âm.`,
  goals: {
    must: 'Viết được mô hình $15x + 10y \\le 150$ từ lời văn và kiểm tra một cặp số có là nghiệm hay không.',
    should: 'Rút gọn mô hình, nêu ý nghĩa từng biến và điều kiện $x, y \\in \\mathbb{N}$; giải thích vì sao dùng dấu $\\le$.',
    could: 'Mô hình hóa một tình huống ngân sách mới (3 loại hàng) và phản biện mô hình dùng dấu $=$.',
  },
  s1: {
    title: 'Xe bánh mì và 150 nghìn đồng',
    context: 'Xe bánh mì có 150 nghìn, bánh 15 nghìn/chiếc, nước 10 nghìn/chai. Cần mua cả hai loại, không vượt ngân sách.',
    question: 'Điều kiện "không vượt quá 150 nghìn" được viết đúng là biểu thức nào?',
    options: ['15x + 10y = 150', '15x + 10y ≤ 150', '15x + 10y ≥ 150'],
    correct: 1,
    why: 'Có thể tiêu ít hơn 150 nghìn nên phải dùng dấu ≤; dấu = chỉ nhận đúng mức 150 và bỏ sót các phương án hợp lệ.',
    discuss: ['`[PHÁT HIỆN]` Vì sao $x, y$ không thể là số âm hoặc số thập phân?', '`[SO SÁNH]` Hai phương án $(4;9)$ và $(6;7)$: phương án nào mua được?'],
    cue: 'Viết lên bảng 3 dòng: "bánh 15x", "nước 10y", "tổng ≤ 150". Nhắc HS: số lượng luôn là số tự nhiên.',
    lookFor: 'HS nêu được biến, đơn vị nghìn đồng và dấu ≤ trước khi tính.',
  },
  s3: {
    title: 'Từ lời văn đến bất phương trình và khái niệm nghiệm',
    steps: [
      'Đặt biến kèm đơn vị: $x$ = số bánh mì (chiếc), $y$ = số chai nước (chai).',
      'Dịch lời văn: $15x + 10y \\le 150$; chia hai vế cho 5 được $3x + 2y \\le 30$.',
      'Thêm điều kiện thực tế: $x \\ge 0$, $y \\ge 0$ và $x, y \\in \\mathbb{N}$.',
      'Kiểm tra nghiệm: thay cặp số, so sánh tổng với vế phải — mệnh đề đúng thì là nghiệm.',
    ],
    ask: ['`[SUY LUẬN]` Rút gọn bằng cách nào mà không đổi miền nghiệm?', '`[PHÁT HIỆN]` Cặp $(4;9)$ và $(6;7)$ khác nhau ở bước nào?'],
    cue: 'Khung 3 bước: "đặt biến → viết tổng → so với ngân sách". Nhắc: chia cả hai vế cho cùng một số dương thì dấu không đổi.',
    close: 'Bất phương trình bậc nhất hai ẩn $ax + by \\le c$ mô tả một nửa mặt phẳng; nghiệm là cặp số cho mệnh đề đúng.',
  },
  s4: { bat: 'AI kết luận ngược dấu sau khi tính đúng tổng tiền.', chung: 'Thay $x = 6, y = 7$: $15\\cdot6 + 10\\cdot7 = 160 > 150$, nên $160 \\le 150$ là mệnh đề **sai**.', sua: '$(6;7)$ **không** là nghiệm; phép tính đúng nhưng kết luận bị đảo chiều.', cue: 'Cho HS yếu đọc to phép so sánh "160 lớn hơn 150" rồi mới đọc kết luận.', lookFor: 'HS chỉ ra lỗi ở bước so sánh, không phải ở phép nhân.' },
  s6: { hints: { M: 'thay số vào $15x + 10y$ rồi so sánh với 150.', S: 'rút gọn về $3x + 2y \\le 30$ trước khi kết luận.', C: 'giải thích bằng ngữ cảnh: dấu ≤ cho phép tiêu ít hơn ngân sách.' }, lookFor: 'HS M thay đúng; HS S kiểm tra lại sau khi rút gọn; HS C gắn kết luận với tình huống.' },
  postCheck: {
    q: 'Với ngân sách 150 nghìn, cặp $(3; 10)$ có phải là phương án mua được không?',
    a: '$15\\cdot3 + 10\\cdot10 = 145 \\le 150$ → **có**, còn dư 5 nghìn.',
    ds: [{ t: '"$15x + 10y = 150$ là mô hình đúng cho mọi trường hợp"', v: 'Sai — bỏ sót phương án tiêu ít hơn' }, { t: '"$(0;0)$ là nghiệm của mô hình"', v: 'Đúng — mua 0 chiếc, 0 chai vẫn không vượt ngân sách' }, { t: '"Nghiệm của bất phương trình phải là số nguyên"', v: 'Sai — bất phương trình cho nghiệm thực; điều kiện nguyên đến từ bối cảnh' }],
    cue: 'Chọn 2 phiếu, cùng sửa theo khung 3 bước ở S3.',
  },
  s8Close: 'Ba từ khoá: đặt biến — viết tổng — so sánh.',
  s9: {
    title: 'Chốt kế hoạch mua cho xe bánh mì',
    bullets: ['Nếu ưu tiên bánh: mua 8 bánh, 3 nước → $120 + 30 = 150$ nghìn (đúng ngân sách).', 'Nếu ưu tiên nước: mua 3 bánh, 10 nước → $45 + 100 = 145$ nghìn (dư 5 nghìn).', 'Mọi phương án phải thỏa $3x + 2y \\le 30$ và $x, y \\in \\mathbb{N}$ — đó là "miền khả thi" của buổi bán.'],
    cue: 'Nhấn: toán không chọn thay mình, nhưng loại bỏ các phương án không mua được.',
  },
  exit: ['Viết dạng tổng quát của bất phương trình bậc nhất hai ẩn.', 'Nêu một bẫy (đọc "không vượt quá" thành dấu =; quên điều kiện nguyên).', 'Tự đánh giá M / S / C.', 'Mô hình của xe bánh mì là gì và $(6;7)$ có mua được không?'],
  exitCue: 'Mở lại khung 3 bước ở S3 và bảng kiểm chứng ở mục II.',
  after: '- HS làm bài tập SGK về bất phương trình bậc nhất hai ẩn; chuẩn bị tiết biểu diễn miền nghiệm.',
  snapshot: {
    focus: 'Mô hình hóa điều kiện ngân sách của xe bánh mì "Bánh Mì 0đ" (bánh 15 nghìn/chiếc, nước 10 nghìn/chai, ngân sách 150 nghìn) thành bất phương trình bậc nhất hai ẩn 15x + 10y ≤ 150 ⇔ 3x + 2y ≤ 30; xác định ý nghĩa biến, điều kiện x, y nguyên không âm và kiểm tra một cặp số có là nghiệm',
    formulas: ['ax + by \\le c \\quad (a, b \\text{ không đồng thời bằng } 0)', '(x_0; y_0) \\text{ là nghiệm nếu thay vào được mệnh đề đúng}', '15x + 10y \\le 150', '3x + 2y \\le 30'],
    examples: [
      { question: 'Xe bánh mì có 150 nghìn đồng, mua bánh giá 15 nghìn/chiếc (x chiếc) và nước 10 nghìn/chai (y chai). Lập mô hình ràng buộc ngân sách, rút gọn và nêu điều kiện của x, y.', answer: 'Mô hình: 15x + 10y ≤ 150. Chia hai vế cho 5: 3x + 2y ≤ 30. Vì x, y là số lượng nên x, y ∈ ℕ (nguyên không âm).' },
      { question: 'Với mô hình 15x + 10y ≤ 150, các cặp (4; 9), (2; 12), (6; 7) có phải là nghiệm không?', answer: '(4; 9): 60 + 90 = 150 ≤ 150 → nghiệm. (2; 12): 30 + 120 = 150 ≤ 150 → nghiệm. (6; 7): 90 + 70 = 160 > 150 → không là nghiệm.' },
    ],
    exercises: [
      { level: 'NB', question: 'Nêu dạng tổng quát của bất phương trình bậc nhất hai ẩn x, y và điều kiện của hệ số.', answer: 'ax + by ≤ c (hoặc <, ≥, >) với a, b không đồng thời bằng 0.' },
      { level: 'NB', question: 'Cặp (x₀; y₀) được gọi là nghiệm của bất phương trình khi nào?', answer: 'Khi thay x₀, y₀ vào bất phương trình ta được một mệnh đề đúng.' },
      { level: 'TH', question: 'Cặp (2; 12) có thỏa mô hình 15x + 10y ≤ 150 không?', answer: '15·2 + 10·12 = 150 ≤ 150 đúng → (2; 12) là nghiệm (dùng đúng toàn bộ ngân sách).' },
      { level: 'TH', question: 'Cặp (5; 8) có thỏa mô hình 15x + 10y ≤ 150 không?', answer: '15·5 + 10·8 = 155 > 150 → không phải nghiệm (vượt ngân sách 5 nghìn).' },
      { level: 'VD', question: 'Vì sao mô hình ngân sách phải dùng dấu ≤ mà không dùng dấu =?', answer: 'Vì chỉ cần tổng tiền không vượt quá 150 nghìn; dùng dấu = sẽ loại bỏ mọi phương án tiêu ít hơn (ví dụ (3; 10) hết 145 nghìn) — những phương án hoàn toàn hợp lệ.' },
      { level: 'VD', question: 'Vì sao x, y trong mô hình buộc phải là số nguyên không âm? Nếu bỏ điều kiện này thì mô hình sai ở đâu?', answer: 'Vì x, y là số chiếc bánh và số chai nước — không thể âm hay lẻ thập phân. Bỏ điều kiện sẽ chấp nhận các nghiệm vô nghĩa như (2,5; 3) dù bất phương trình vẫn đúng.' },
    ],
    quick: [
      { question: 'Vì sao (6; 7) không phải nghiệm của 15x + 10y ≤ 150?', solution: 'Vì 15·6 + 10·7 = 160 > 150; mệnh đề 160 ≤ 150 sai.' },
      { question: 'Rút gọn mô hình 15x + 10y ≤ 150.', solution: 'Chia cả hai vế cho 5 (số dương, dấu không đổi): 3x + 2y ≤ 30.' },
    ],
    mistakes: ['Đọc "không vượt quá" thành dấu = khi lập mô hình.', 'Quên điều kiện x, y nguyên không âm.', 'Tính đúng tổng tiền nhưng so sánh sai chiều (160 > 150 lại kết luận là nghiệm).'],
    boardKnowledge: ['II. NỘI DUNG', '1. Khái niệm', 'a. Bất phương trình bậc nhất hai ẩn: ax + by ≤ c (hoặc <, ≥, >), a, b không đồng thời bằng 0.', 'b. (x₀; y₀) là nghiệm nếu thay vào được mệnh đề đúng.', '2. Mô hình ngân sách xe bánh mì', 'a. x = số bánh (15 nghìn/chiếc), y = số nước (10 nghìn/chai), ngân sách 150 nghìn.', 'b. 15x + 10y ≤ 150 ⇔ 3x + 2y ≤ 30; x, y ∈ ℕ.', '3. Kiểm tra nghiệm', 'a. Thay cặp số, tính vế trái, so sánh với vế phải.', 'b. (4; 9) và (2; 12) là nghiệm; (6; 7), (5; 8) không là nghiệm.'],
  },
  aiError: {
    category: 'Lỗi logic', wrongSolution: 'AI viết: "Thay x = 6, y = 7 vào 15x + 10y ≤ 150: 15·6 + 10·7 = 160. Vì 160 > 150 nên (6; 7) là nghiệm của bất phương trình."',
    correction: '160 > 150 nên mệnh đề 160 ≤ 150 là SAI; do đó (6; 7) không phải là nghiệm của 15x + 10y ≤ 150.',
    proof: 'Nghiệm của bất phương trình là cặp số làm mệnh đề đúng. Ở đây vế trái 160, vế phải 150, quan hệ đúng là 160 > 150 — ngược với yêu cầu ≤, nên kết luận phải là "không là nghiệm".',
    whyAiError: 'Mô hình tính đúng phép nhân nhưng bỏ qua phép so sánh cuối, rồi suy ra kết luận theo hướng "đã thay số xong là nghiệm" — lỗi logic điển hình khi thiếu bước kiểm tra dấu.',
    teacherPrompt: 'Dòng nào trong lời giải AI sai? Em phân loại lỗi, chỉ ra bằng chứng vì sao (6; 7) không phải nghiệm rồi sửa lại kết luận.',
    studentProduct: 'Khoanh dòng sai, ghi "lỗi logic", sửa kết luận và nêu phép so sánh 160 > 150 làm bằng chứng.',
    boardPrompt: 'Kiểm lỗi: phép tính đúng · kết luận đảo chiều dấu.',
    libraryTitle: 'Bất phương trình ngân sách: đảo chiều kết luận sau phép thay',
  },
};

const L32 = {
  ...base,
  key: '10-5-32', period: 32, lessonType: 'formation',
  title: 'Biểu diễn miền nghiệm của bất phương trình',
  opening: 'Xe bánh mì đã có mô hình 3x + 2y ≤ 30 — hôm nay lớp mình "nhìn thấy" tất cả phương án mua được trên một mặt phẳng.',
  focusQuestion: 'Làm thế nào để nhìn thấy tất cả các phương án thỏa một bất phương trình?',
  axis: `**Tình huống: Vẽ "bản đồ phương án" cho xe bánh mì với mô hình $3x + 2y \\le 30$.**

- **Đường biên:** $3x + 2y = 30$ đi qua $(10; 0)$ và $(0; 15)$.
- **Điểm thử $O(0;0)$:** $3\\cdot0 + 2\\cdot0 = 0 \\le 30$ **đúng** → miền nghiệm là nửa mặt phẳng **chứa gốc tọa độ** (phía dưới đường biên).
- **Vì dấu $\\le$** nên đường biên vẽ **nét liền** (lấy cả biên).
- **Kiểm chứng tay:** $(4; 9)$: $12 + 18 = 30 \\le 30$ → nằm **trên** biên, vẫn thuộc miền. $(8; 6)$: $24 + 12 = 36 > 30$ → nằm **ngoài** miền.

| Điểm | Giá trị $3x + 2y$ | Thuộc miền? |
|---|---|---|
| $(0; 0)$ | 0 | Có |
| $(4; 9)$ | 30 | Có (trên biên) |
| $(8; 6)$ | 36 | Không |

**Bẫy của bài:** dùng dấu $\\le$ nhưng vẽ nét đứt; tô nhầm phía (chọn phía chứa điểm thử sai).`,
  goals: {
    must: 'Vẽ đúng đường biên (nét liền/nét đứt theo dấu) và xác định miền nghiệm bằng một điểm thử.',
    should: 'Thực hiện trọn 3 bước cho bất phương trình có dấu ngặt và dấu không ngặt; kiểm tra lại bằng một điểm ngoài miền.',
    could: 'Tạo bất phương trình theo yêu cầu miền (chứa/không chứa điểm cho trước) và phản biện hình vẽ sai phía.',
  },
  s1: {
    title: 'Bản đồ phương án mua hàng',
    context: 'Mô hình 3x + 2y ≤ 30. GV chiếu mặt phẳng tọa độ trống và hỏi HS cần vẽ gì trước.',
    question: 'Bước đầu tiên để biểu diễn miền nghiệm của 3x + 2y ≤ 30 là gì?',
    options: ['Tô ngay nửa mặt phẳng phía trên', 'Vẽ đường biên 3x + 2y = 30', 'Tính trung bình của x và y'],
    correct: 1,
    why: 'Phải có đường biên thì mới xác định được hai nửa mặt phẳng; sau đó mới dùng điểm thử để chọn phía.',
    discuss: ['`[PHÁT HIỆN]` Đường biên đi qua hai điểm nào?', '`[SO SÁNH]` Nếu dấu là "<" thay vì "≤" thì hình vẽ khác ở đâu?'],
    cue: 'Chỉ vào hai trục: "cho x = 0 tìm y, cho y = 0 tìm x" — hai điểm là đủ để vẽ đường thẳng.',
    lookFor: 'HS nêu được 2 điểm thuộc đường biên và nhắc tới điểm thử.',
  },
  s3: {
    title: 'Ba bước biểu diễn miền nghiệm',
    steps: [
      'Vẽ đường biên $ax + by = c$: nét liền nếu dấu $\\le, \\ge$; nét đứt nếu dấu $<, >$.',
      'Chọn một điểm thử không thuộc đường biên (thường là $O(0;0)$) và thay vào bất phương trình.',
      'Nếu mệnh đề đúng → chọn nửa mặt phẳng chứa điểm thử; nếu sai → chọn nửa còn lại; tô/đánh dấu miền.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao dấu $<$ phải vẽ nét đứt?', '`[PHÁT HIỆN]` Với $3x - 2y > 6$, thử $O(0;0)$ được gì và chọn phía nào?'],
    cue: 'Khung 3 ô: "biên → thử → tô". Nhắc: điểm thử sai thì tô phía **đối diện** điểm thử.',
    close: 'Miền nghiệm là một nửa mặt phẳng (kể cả biên với $\\le, \\ge$); điểm thử quyết định phía.',
  },
  s4: { bat: 'AI vẽ nét đứt cho dấu ≤ và tô phía trên đường biên.', chung: 'Thử $O(0;0)$: $0 \\le 30$ đúng nên miền phải chứa gốc; $O$ nằm phía dưới đường biên. AI tô phía trên nên chứa điểm $(0;16)$: $0 + 32 = 32 > 30$ — điểm này không thỏa.', sua: 'Vẽ nét liền và tô nửa mặt phẳng chứa gốc tọa độ.', cue: 'Cho HS yếu kiểm tra một điểm ở phía AI tô để thấy mâu thuẫn.', lookFor: 'HS dùng điểm thử để bác bỏ hình vẽ, không chỉ nói "sai".' },
  s6: { hints: { M: 'vẽ biên bằng hai điểm chặn trục, rồi thử O(0;0).', S: 'kiểm tra lại bằng một điểm ở phía đối diện để chắc chắn.', C: 'thiết kế bất phương trình từ miền cho trước, nhớ chọn dấu đúng.' }, lookFor: 'HS M vẽ đúng nét; HS S phát hiện lỗi nhờ điểm ngoài miền; HS C giải thích được quan hệ dấu ↔ nét vẽ.' },
  postCheck: {
    q: 'Biểu diễn miền nghiệm của $-x + y \\ge 2$: nét vẽ và phía chọn?',
    a: 'Đường $-x + y = 2$ nét **liền** (dấu ≥); thử $O(0;0)$: $0 \\ge 2$ sai → chọn phía **không** chứa gốc; kiểm $(0;3)$: $3 \\ge 2$ đúng.',
    ds: [{ t: '"Dấu < luôn vẽ nét liền"', v: 'Sai' }, { t: '"Điểm thử sai thì chọn phía đối diện"', v: 'Đúng' }, { t: '"Điểm trên đường biên thuộc miền nghiệm của ≤"', v: 'Đúng' }],
    cue: 'Chiếu 2 hình vẽ của HS và cùng kiểm bằng điểm thử.',
  },
  s8Close: 'Biên → thử → tô; dấu quyết định nét.',
  s9: {
    title: 'Đọc bản đồ phương án để tư vấn',
    bullets: ['Mọi điểm trong miền là một phương án mua được; càng gần biên càng dùng gần hết 150 nghìn.', '(8; 6) nằm ngoài miền (36 > 30) — không mua được.', '(4; 9) nằm trên biên — mua đúng 150 nghìn, không dư.'],
    cue: 'Hỏi HS: "Muốn mua nhiều bánh nhất có thể thì đi dọc biên tới đâu?" → (10; 0).',
  },
  exit: ['Nêu 3 bước biểu diễn miền nghiệm.', 'Nêu 1 bẫy (nét đứt cho ≤; tô sai phía).', 'Tự đánh giá M / S / C.', 'Với 3x + 2y ≤ 30, điểm (8; 6) có thuộc miền không? Vì sao?'],
  exitCue: 'Mở lại khung "biên → thử → tô" ở S3.',
  after: '- HS làm bài tập SGK về biểu diễn miền nghiệm; chuẩn bị tiết hệ bất phương trình.',
  snapshot: {
    focus: 'Biểu diễn miền nghiệm của bất phương trình bậc nhất hai ẩn bằng đường biên và điểm thử, trên trục thực nghiệm mô hình xe bánh mì 3x + 2y ≤ 30 (biên qua (10; 0), (0; 15), miền chứa gốc tọa độ); phân biệt nét liền/nét đứt theo dấu',
    formulas: ['ax + by = c \\ \\text{là đường biên}', '\\le, \\ge \\Rightarrow \\text{nét liền}; \\quad <, > \\Rightarrow \\text{nét đứt}', '3x + 2y = 30 \\ \\text{qua } (10;0), (0;15)'],
    examples: [
      { question: 'Biểu diễn miền nghiệm của 3x + 2y ≤ 30 (mô hình xe bánh mì).', answer: 'Đường biên 3x + 2y = 30 qua (10; 0) và (0; 15), vẽ nét liền vì dấu ≤. Thử O(0; 0): 0 ≤ 30 đúng → tô nửa mặt phẳng chứa gốc (phía dưới đường biên). Kiểm: (4; 9) cho 30 ≤ 30 (trên biên, thuộc miền); (8; 6) cho 36 > 30 (ngoài miền).' },
      { question: 'Biểu diễn miền nghiệm của 3x − 2y > 6 và giải thích vì sao chọn phía không chứa gốc tọa độ.', answer: 'Đường biên 3x − 2y = 6 vẽ nét đứt vì dấu >. Thử O(0; 0): 0 > 6 sai → chọn nửa mặt phẳng không chứa gốc. Kiểm (3; 0): 9 > 6 đúng; kiểm (0; −4): 8 > 6 đúng.' },
    ],
    exercises: [
      { level: 'NB', question: 'Với 2x + y < 1, đường biên vẽ nét liền hay nét đứt?', answer: 'Nét đứt, vì dấu < không lấy đường biên.' },
      { level: 'NB', question: 'Nêu ba bước biểu diễn miền nghiệm của bất phương trình bậc nhất hai ẩn.', answer: 'Vẽ đường biên (nét liền/đứt theo dấu); chọn điểm thử và thay vào; chọn nửa mặt phẳng theo kết quả rồi tô.' },
      { level: 'TH', question: 'Biểu diễn miền nghiệm của −x + y ≥ 2.', answer: 'Đường −x + y = 2 nét liền; thử O(0; 0): 0 ≥ 2 sai → chọn phía không chứa gốc; điểm (0; 3) thỏa nên thuộc miền.' },
      { level: 'TH', question: 'Điểm (2; 1) có thuộc miền nghiệm của x + y ≤ 3 không?', answer: 'Có: 2 + 1 = 3 ≤ 3 đúng; điểm nằm ngay trên đường biên (vẫn thuộc vì dấu ≤).' },
      { level: 'VD', question: 'Tạo một bất phương trình có miền nghiệm chứa gốc tọa độ nhưng không chứa điểm (2; 2).', answer: 'Ví dụ x + y ≤ 1: gốc cho 0 ≤ 1 đúng; (2; 2) cho 4 ≤ 1 sai. (Chỉ cần chọn hằng số nhỏ hơn 4 và không âm.)' },
      { level: 'VD', question: 'Một bạn vẽ nét đứt cho x − y ≤ 0. Hãy sửa và giải thích.', answer: 'Phải vẽ nét liền vì dấu ≤ lấy cả đường biên x − y = 0; các điểm trên đường (ví dụ (1; 1), (0; 0)) đều là nghiệm.' },
    ],
    quick: [
      { question: 'Vì sao dấu < phải vẽ nét đứt?', solution: 'Vì các điểm trên đường biên cho vế trái bằng vế phải, không thỏa bất đẳng thức ngặt — nên biên không thuộc miền.' },
      { question: 'Khi điểm thử O(0;0) cho mệnh đề sai thì chọn phía nào?', solution: 'Chọn nửa mặt phẳng đối diện với O (không chứa gốc tọa độ).' },
    ],
    mistakes: ['Vẽ nét đứt cho dấu ≤ hoặc ≥.', 'Tô phía chứa điểm thử dù điểm thử cho mệnh đề sai.', 'Quên kiểm tra lại bằng một điểm ngoài miền.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Đường biên', 'a. ax + by = c là đường biên; nét liền với ≤, ≥; nét đứt với <, >.', 'b. Với 3x + 2y = 30: cho x = 0 → y = 15; cho y = 0 → x = 10.', '2. Ba bước biểu diễn miền nghiệm', 'a. Vẽ đường biên.', 'b. Thử một điểm (thường O(0;0)).', 'c. Chọn nửa mặt phẳng: đúng → phía điểm thử; sai → phía đối diện.', '3. Áp dụng mô hình xe bánh mì', 'a. 3x + 2y ≤ 30: nét liền, miền chứa gốc.', 'b. (4; 9) trên biên thuộc miền; (8; 6) cho 36 > 30 nên ngoài miền.'],
  },
  aiError: {
    category: 'Lỗi khái niệm', wrongSolution: 'AI trình bày: "Miền nghiệm của 3x + 2y ≤ 30 là nửa mặt phẳng phía trên đường thẳng 3x + 2y = 30. Vì bất phương trình có dấu ≤ nên ta vẽ đường biên bằng nét đứt để thể hiện rằng biên không được tính."',
    correction: 'Dấu ≤ lấy cả đường biên nên phải vẽ nét LIỀN. Thử O(0; 0): 0 ≤ 30 đúng nên miền là nửa mặt phẳng CHỨA gốc tọa độ (phía dưới đường biên), không phải phía trên.',
    proof: 'Lấy điểm (0; 16) ở phía trên đường biên: 3·0 + 2·16 = 32 > 30 nên điểm này không thỏa bất phương trình → phía trên không thể là miền nghiệm. Ngược lại O(0;0) và (4; 9) đều thỏa.',
    whyAiError: 'Mô hình gắn nhầm quy ước nét vẽ với dấu bất đẳng thức và không dùng điểm thử để kiểm chứng phía miền.',
    teacherPrompt: 'Em đồng ý hay phản đối hình vẽ của AI? Dùng một điểm cụ thể để chứng minh AI chọn sai phía rồi sửa lại hình cho đúng.',
    studentProduct: 'Thẻ Đ/S + vẽ lại đúng: nét liền, tô phía chứa gốc, kèm phép thử O(0;0) và phản ví dụ (0;16).',
    boardPrompt: 'AI tô phía trên và vẽ nét đứt. Điểm nào bác bỏ ngay?',
    libraryTitle: 'Lỗi AI chọn sai phía miền nghiệm và sai nét vẽ',
  },
};

const L33 = {
  ...base,
  key: '10-5-33', period: 33, lessonType: 'formation',
  title: 'Hệ bất phương trình bậc nhất hai ẩn',
  opening: 'Xe bánh mì không chỉ bị giới hạn ngân sách — còn phải mua đủ số lượng tối thiểu để mở hàng.',
  focusQuestion: 'Khi nhiều điều kiện phải thỏa cùng lúc, miền phương án còn lại là gì?',
  axis: `**Tình huống: Xe bánh mì phải thỏa đồng thời ngân sách và yêu cầu mở hàng.**

$$\\begin{cases} 3x + 2y \\le 30 & \\text{(ngân sách 150 nghìn)} \\\\ x \\ge 4 & \\text{(ít nhất 4 bánh)} \\\\ y \\ge 2 & \\text{(ít nhất 2 nước)} \\end{cases}$$

- **Miền nghiệm = phần giao** của ba nửa mặt phẳng.
- **Ba đỉnh:** $A(4; 2)$; $B(4; 9)$ vì $3\\cdot4 + 2\\cdot9 = 30$; $C\\left(\\tfrac{26}{3}; 2\\right)$ vì $3x + 2\\cdot2 = 30 \\Rightarrow x = \\tfrac{26}{3} \\approx 8{,}67$.
- **Kiểm chứng tay:** $B(4;9)$: $12 + 18 = 30$ đúng biên; $C$: $26 + 4 = 30$ đúng biên; $A$: $12 + 4 = 16 < 30$ nằm trong.
- **Nghiệm nguyên:** $y = 2$ cho $3x \\le 26 \\Rightarrow x \\le 8$; nên các cặp nguyên nhiều bánh nhất là $(8; 2)$ — kiểm $24 + 4 = 28 \\le 30$.

**Bẫy của bài:** chỉ lấy miền của bất phương trình "mạnh nhất" và bỏ các điều kiện còn lại.`,
  goals: {
    must: 'Xác định miền nghiệm của hệ là phần giao và kiểm tra một điểm có thuộc miền hay không.',
    should: 'Tìm các đỉnh của miền nghiệm bằng cách giải từng cặp đường biên rồi lọc theo điều kiện.',
    could: 'Tìm phương án nguyên tối ưu theo một tiêu chí (nhiều bánh nhất / nhiều nước nhất) và phản biện kết luận "thỏa 3/4 điều kiện là nghiệm".',
  },
  s1: {
    title: 'Ba điều kiện cùng lúc',
    context: 'Xe bánh mì: ngân sách 3x + 2y ≤ 30, phải có ít nhất 4 bánh (x ≥ 4) và ít nhất 2 nước (y ≥ 2).',
    question: 'Nghiệm của hệ bất phương trình là gì?',
    options: ['Hợp các miền nghiệm thành phần', 'Phần giao các miền nghiệm thành phần', 'Miền của bất phương trình có hệ số lớn nhất'],
    correct: 1,
    why: 'Nghiệm hệ phải thỏa đồng thời mọi bất phương trình, nên là giao của các miền.',
    discuss: ['`[PHÁT HIỆN]` Điểm (0; 0) có thuộc miền hệ không? Vì sao?', '`[SO SÁNH]` Hợp và giao khác nhau thế nào trong bài này?'],
    cue: 'Vẽ ba nửa mặt phẳng bằng ba màu, phần tô đậm là chỗ ba màu chồng lên nhau.',
    lookFor: 'HS nói được "thỏa đồng thời" và chỉ vào phần chồng màu.',
  },
  s3: {
    title: 'Tìm miền nghiệm và các đỉnh',
    steps: [
      'Vẽ ba đường biên: $3x + 2y = 30$; $x = 4$; $y = 2$.',
      'Xác định nửa mặt phẳng cho từng điều kiện bằng điểm thử (ví dụ $O(0;0)$).',
      'Lấy phần giao — với bài này là tam giác $A(4;2)$, $B(4;9)$, $C\\left(\\tfrac{26}{3};2\\right)$.',
      'Kiểm tra đỉnh bằng cách thay vào cả ba điều kiện; lọc nghiệm nguyên nếu bài yêu cầu số lượng.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao đỉnh $B$ có $x = 4$ và $y = 9$?', '`[PHÁT HIỆN]` Điểm $(5; 1)$ có thuộc miền không?'],
    cue: 'Khung 3 bước: "vẽ biên → lấy giao → thử đỉnh". Nhắc: đỉnh là giao của hai đường biên, phải kiểm với đường thứ ba.',
    close: 'Miền nghiệm hệ là phần giao; đỉnh là giao điểm các đường biên nằm trong miền.',
  },
  s4: { bat: 'AI chỉ lấy miền của 3x + 2y ≤ 30 và bỏ hai điều kiện x ≥ 4, y ≥ 2.', chung: 'Điểm (0; 0) nằm trong miền AI vẽ nhưng vi phạm cả x ≥ 4 và y ≥ 2.', sua: 'Phải cắt thêm bởi x ≥ 4 và y ≥ 2; miền đúng là tam giác (4;2), (4;9), (26/3;2).', cue: 'Cho HS yếu thay (0;0) vào hệ để thấy mâu thuẫn ngay.', lookFor: 'HS chỉ ra điều kiện bị bỏ sót và vùng bị tô thừa.' },
  s6: { hints: { M: 'vẽ từng biên rồi tô phần chồng lên nhau.', S: 'giải từng cặp đường biên để tìm đỉnh, lọc theo điều kiện còn lại.', C: 'tối ưu theo tiêu chí trên các đỉnh, nhớ điều kiện nguyên.' }, lookFor: 'HS M nêu đúng phép giao; HS S tìm đủ đỉnh; HS C chọn được phương án tối ưu có lý do.' },
  postCheck: {
    q: 'Tìm các đỉnh miền nghiệm của hệ x + y ≤ 5, x + 2y ≤ 6, x ≥ 0, y ≥ 0.',
    a: 'Giao các biên: (0;0); (5;0); (4;1) (do x + y = 5 và x + 2y = 6); (0;3). Kiểm cả 4 điểm đều thỏa mọi điều kiện.',
    ds: [{ t: '"Điểm thỏa 3 trong 4 bất phương trình là nghiệm hệ"', v: 'Sai' }, { t: '"Miền nghiệm hệ là giao các miền thành phần"', v: 'Đúng' }, { t: '"Đỉnh miền hệ luôn là giao của đúng hai đường biên"', v: 'Đúng' }],
    cue: 'Mời 2 HS lên bảng giải cặp phương trình tìm đỉnh (4;1).',
  },
  s8Close: 'Đồng thời = giao; đỉnh = giao hai biên + kiểm biên còn lại.',
  s9: {
    title: 'Chọn phương án mở hàng',
    bullets: ['Muốn nhiều bánh nhất: $(8; 2)$ — 24 + 4 = 28 ≤ 30 (dư 5 nghìn).', 'Muốn nhiều nước nhất: $(4; 9)$ — 12 + 18 = 30 (đúng ngân sách).', 'Muốn cân bằng: $(6; 6)$ — 18 + 12 = 30; kiểm x ≥ 4, y ≥ 2 đều đúng.'],
    cue: 'Hỏi: "Ba phương án trên đều nằm trong miền — chọn cái nào là quyết định kinh doanh, không phải toán."',
  },
  exit: ['Miền nghiệm của hệ được xác định bằng phép toán nào?', 'Nêu 1 bẫy (bỏ điều kiện; nhầm hợp với giao).', 'Tự đánh giá M / S / C.', 'Nêu ba đỉnh miền nghiệm của hệ xe bánh mì.'],
  exitCue: 'Mở lại hình tam giác ở S3 và danh sách đỉnh.',
  after: '- HS làm bài tập SGK về hệ bất phương trình; chuẩn bị tiết biểu diễn miền nghiệm của hệ.',
  snapshot: {
    focus: 'Xác định miền nghiệm của hệ bất phương trình bậc nhất hai ẩn trên trục thực nghiệm xe bánh mì: 3x + 2y ≤ 30, x ≥ 4, y ≥ 2; miền là tam giác với các đỉnh (4;2), (4;9), (26/3;2); kiểm tra điểm thuộc miền và lọc nghiệm nguyên',
    formulas: ['\\begin{cases}3x + 2y \\le 30 \\\\ x \\ge 4 \\\\ y \\ge 2\\end{cases}', 'S = S_1 \\cap S_2 \\cap S_3', '\\text{Đỉnh} = \\text{giao hai đường biên} \\cap \\text{thỏa các điều kiện còn lại}'],
    examples: [
      { question: 'Biểu diễn miền nghiệm của hệ 3x + 2y ≤ 30, x ≥ 4, y ≥ 2 và xác định các đỉnh.', answer: 'Vẽ ba đường biên 3x + 2y = 30, x = 4, y = 2. Lấy phần giao: tam giác với A(4; 2) (giao x = 4, y = 2), B(4; 9) (giao x = 4 với 3x + 2y = 30), C(26/3; 2) (giao y = 2 với 3x + 2y = 30). Kiểm: A cho 16 ≤ 30; B cho 30 ≤ 30; C cho 30 ≤ 30 — cả ba thỏa mọi điều kiện.' },
      { question: 'Với hệ trên, tìm cặp nghiệm nguyên có số bánh nhiều nhất.', answer: 'Từ y = 2: 3x + 4 ≤ 30 ⇒ x ≤ 26/3 ≈ 8,67 nên x ≤ 8. Cặp (8; 2) cho 24 + 4 = 28 ≤ 30 và thỏa x ≥ 4, y ≥ 2 — đây là phương án nguyên nhiều bánh nhất.' },
    ],
    exercises: [
      { level: 'NB', question: 'Miền nghiệm của hệ bất phương trình được tạo bởi phép toán tập hợp nào?', answer: 'Phép giao của các miền nghiệm thành phần.' },
      { level: 'NB', question: 'Điểm (1; 1) có thỏa hệ x ≥ 0, y ≥ 0, x + y ≤ 3 không?', answer: 'Có: 1 ≥ 0, 1 ≥ 0, 1 + 1 = 2 ≤ 3 — cả ba điều kiện đúng.' },
      { level: 'TH', question: 'Tìm miền nghiệm của hệ x ≥ 0, y ≥ 0, x + y ≤ 2.', answer: 'Tam giác với các đỉnh (0; 0), (2; 0), (0; 2) — giới hạn bởi hai trục tọa độ và đường x + y = 2.' },
      { level: 'TH', question: 'Điểm (2; 3) có thuộc miền nghiệm của hệ x + y ≤ 4, x ≥ 0, y ≥ 0 không?', answer: 'Không: 2 + 3 = 5 > 4 nên vi phạm điều kiện đầu.' },
      { level: 'VD', question: 'Tìm các đỉnh miền nghiệm của hệ x + y ≤ 5, x + 2y ≤ 6, x ≥ 0, y ≥ 0.', answer: 'Các đỉnh: (0; 0); (5; 0); (4; 1) (giao x + y = 5 với x + 2y = 6); (0; 3). Kiểm cả bốn điểm đều thỏa mọi điều kiện.' },
      { level: 'VD', question: 'Phản biện nhận định: "Một điểm thỏa ba trong bốn bất phương trình là nghiệm của hệ".', answer: 'Sai. Nghiệm hệ phải thỏa đồng thời cả bốn. Ví dụ điểm (5; 1) thỏa x ≥ 0, y ≥ 0, x + y ≤ 6 nhưng vi phạm x + 2y ≤ 6 (5 + 2 = 7 > 6) nên không là nghiệm.' },
    ],
    quick: [
      { question: 'Vì sao không thể chỉ lấy miền của 3x + 2y ≤ 30 làm miền nghiệm hệ?', solution: 'Vì còn hai điều kiện x ≥ 4 và y ≥ 2; điểm (0;0) thuộc miền của bất phương trình đầu nhưng vi phạm cả hai điều kiện còn lại.' },
      { question: 'Đỉnh (4; 9) được xác định từ giao của hai đường nào?', solution: 'x = 4 và 3x + 2y = 30 (thay x = 4 được 12 + 2y = 30 ⇒ y = 9).' },
    ],
    mistakes: ['Chỉ lấy miền của một bất phương trình mạnh nhất, bỏ các điều kiện còn lại.', 'Nhầm hợp với giao khi xác định miền nghiệm hệ.', 'Tìm đỉnh bằng giao hai đường biên nhưng quên kiểm điều kiện còn lại.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Khái niệm hệ bất phương trình bậc nhất hai ẩn', 'a. Nghiệm hệ là cặp số thỏa đồng thời mọi bất phương trình.', 'b. Miền nghiệm hệ = giao các miền nghiệm thành phần.', '2. Xác định miền nghiệm', 'a. Vẽ từng đường biên và nửa mặt phẳng tương ứng.', 'b. Lấy phần giao; đánh dấu các đỉnh.', 'c. Đỉnh = giao hai đường biên nằm trong và thỏa điều kiện còn lại.', '3. Áp dụng xe bánh mì', 'a. Hệ: 3x + 2y ≤ 30, x ≥ 4, y ≥ 2.', 'b. Đỉnh: (4; 2), (4; 9), (26/3; 2).', 'c. Nghiệm nguyên nhiều bánh nhất: (8; 2).'],
  },
  aiError: {
    category: 'Thiếu điều kiện', wrongSolution: 'AI kết luận: "Miền nghiệm của hệ là toàn bộ nửa mặt phẳng phía dưới đường 3x + 2y = 30, vì đây là điều kiện chặt nhất. Các điều kiện x ≥ 4 và y ≥ 2 chỉ là ghi chú thêm nên không làm thay đổi miền nghiệm."',
    correction: 'Mọi điều kiện trong hệ đều bắt buộc. Miền nghiệm là giao của ba nửa mặt phẳng: tam giác với các đỉnh (4; 2), (4; 9) và (26/3; 2).',
    proof: 'Điểm (0; 0) thuộc nửa mặt phẳng AI chọn nhưng vi phạm x ≥ 4 và y ≥ 2, nên không thể là nghiệm hệ. Ngược lại các đỉnh (4; 2), (4; 9), (26/3; 2) thỏa cả ba điều kiện.',
    whyAiError: 'Mô hình đánh giá điều kiện theo mức "chặt" thay vì tính đồng thời, dẫn tới loại bỏ các ràng buộc không phải bất đẳng thức phức tạp.',
    teacherPrompt: 'Em kiểm tra điểm (0; 0) trong miền AI vẽ: nó có thỏa hệ không? Từ đó kết luận và sửa lại miền nghiệm cho đúng.',
    studentProduct: 'Thẻ Đ/S + chỉ ra (0;0) vi phạm hai điều kiện, vẽ lại miền tam giác kèm ba đỉnh.',
    boardPrompt: 'AI bỏ hai điều kiện x ≥ 4, y ≥ 2. Điểm nào chứng minh ngay?',
    libraryTitle: 'Lỗi AI bỏ ràng buộc trong hệ bất phương trình',
  },
};

const L34 = {
  ...base,
  key: '10-5-34', period: 34, lessonType: 'formation',
  title: 'Công thức diện tích tam giác',
  opening: 'Trường có một mảnh vườn hình tam giác cần trồng rau — lớp mình phải tính diện tích để mua hạt giống.',
  focusQuestion: 'Với mỗi bộ dữ kiện khác nhau của tam giác, ta chọn công thức diện tích nào?',
  axis: `**Tình huống: Ba mảnh vườn tam giác của trường cần tính diện tích để mua hạt giống.**

| Mảnh | Dữ kiện | Công thức phù hợp |
|---|---|---|
| Vườn rau | đáy $a = 6$ m, chiều cao $h_a = 4$ m | $S = \\tfrac12 a h_a$ |
| Vườn hoa | $b = 6$ m, $c = 8$ m, góc xen giữa $A = 30^\\circ$ | $S = \\tfrac12 bc\\sin A$ |
| Sân cỏ | $a = 6$, $b = 8$, $c = 10$ m, $R = 5$ m | $S = \\dfrac{abc}{4R}$ |

**Kiểm chứng tay:**
- Vườn rau: $S = \\tfrac12\\cdot6\\cdot4 = 12$ m².
- Vườn hoa: $S = \\tfrac12\\cdot6\\cdot8\\cdot\\sin30^\\circ = \\tfrac12\\cdot48\\cdot\\tfrac12 = 12$ m².
- Sân cỏ: $S = \\dfrac{6\\cdot8\\cdot10}{4\\cdot5} = \\dfrac{480}{20} = 24$ m² (kiểm: tam giác vuông $6$–$8$–$10$ có $S = \\tfrac12\\cdot6\\cdot8 = 24$ ✓).

**Bẫy của bài:** dùng $\\cos$ thay vì $\\sin$; quên hệ số $\\tfrac12$; dùng $S = \\dfrac{abc}{4R}$ khi chưa biết $R$.`,
  goals: {
    must: 'Viết đúng ba công thức diện tích và áp dụng $S = \\tfrac12 a h_a$ cho dữ kiện đáy – chiều cao.',
    should: 'Chọn đúng công thức theo bộ dữ kiện và tính chính xác $S = \\tfrac12 bc\\sin A$, $S = \\dfrac{abc}{4R}$.',
    could: 'Giải thích vì sao $\\sin$ chứ không phải $\\cos$; so sánh hai tam giác cùng diện tích; phản biện lời giải sai công thức.',
  },
  s1: {
    title: 'Ba mảnh vườn, ba bộ dữ kiện',
    context: 'Vườn rau biết đáy và chiều cao; vườn hoa biết hai cạnh và góc xen giữa; sân cỏ biết ba cạnh và bán kính ngoại tiếp.',
    question: 'Với vườn hoa (biết b = 6, c = 8, góc xen giữa A = 30°), nên dùng công thức nào?',
    options: ['S = ½·b·c·cos A', 'S = ½·b·c·sin A', 'S = abc/(4R)'],
    correct: 1,
    why: 'Công thức dùng sin của góc xen giữa; cos cho hình chiếu, không cho diện tích. Công thức abc/(4R) cần bán kính ngoại tiếp — chưa có.',
    discuss: ['`[PHÁT HIỆN]` Vì sao không có công thức diện tích nào dùng cosin của góc xen giữa?', '`[SO SÁNH]` Hai mảnh vườn rau và hoa cùng diện tích 12 m² — điều đó có hợp lý?'],
    cue: 'Viết 3 công thức lên bảng và khoanh dữ kiện đã cho ở mỗi mảnh; dữ kiện nào khớp công thức nào.',
    lookFor: 'HS ghép đúng bộ dữ kiện với công thức trước khi tính.',
  },
  s3: {
    title: 'Ba công thức và cách chọn',
    steps: [
      'Biết đáy và chiều cao tương ứng: $S = \\tfrac12 a h_a$.',
      'Biết hai cạnh và góc xen giữa: $S = \\tfrac12 ab\\sin C$ (hoặc $\\tfrac12 bc\\sin A$).',
      'Biết ba cạnh và bán kính đường tròn ngoại tiếp: $S = \\dfrac{abc}{4R}$.',
      'Áp dụng cho từng mảnh vườn, ghi đơn vị m² và kiểm tra bằng một cách thứ hai khi có thể.',
    ],
    ask: ['`[SUY LUẬN]` Vì sao $\\sin$ xuất hiện trong công thức diện tích?', '`[PHÁT HIỆN]` Nếu góc xen giữa tăng từ 30° lên 90° thì diện tích thay đổi thế nào?'],
    cue: 'Nhắc: "chiều cao = cạnh kề × sin góc" — đó là lý do công thức có sin.',
    close: 'Chọn công thức theo dữ kiện; sin của góc xen giữa là "chiều cao ẩn" của tam giác.',
  },
  s4: { bat: 'AI dùng S = ½·a·b·cos C thay vì sin C.', chung: 'Với $C = 30^\\circ$, $\\cos 30^\\circ = \\tfrac{\\sqrt3}{2} \\ne \\sin30^\\circ = \\tfrac12$ nên kết quả sai; nếu $C = 90^\\circ$ thì cos = 0 và AI cho diện tích bằng 0 — vô lý.', sua: 'Dùng $S = \\tfrac12 ab\\sin C$; với $a = 6, b = 8, C = 30^\\circ$ được $S = 12$ m².', cue: 'Cho HS thử $C = 90^\\circ$ vào công thức AI để thấy ngay điều vô lý.', lookFor: 'HS phản bác bằng trường hợp biên (góc vuông) chứ không chỉ nói "sai công thức".' },
  s6: { hints: { M: 'khoanh dữ kiện đã cho rồi mới chọn công thức.', S: 'kiểm tra đơn vị và dùng cách thứ hai nếu tính được.', C: 'giải thích bằng chiều cao: c·sinA chính là chiều cao kẻ từ B.' }, lookFor: 'HS M chọn đúng công thức; HS S kiểm chéo; HS C giải thích được bản chất.' },
  postCheck: {
    q: 'Tính diện tích tam giác có $a = 5$, $b = 7$, góc xen giữa $C = 60^\\circ$.',
    a: '$S = \\tfrac12\\cdot5\\cdot7\\cdot\\sin60^\\circ = \\tfrac{35\\sqrt3}{4} \\approx 15{,}16$ (đơn vị diện tích).',
    ds: [{ t: '"S = ½ab cos C"', v: 'Sai' }, { t: '"S = abc/(4R) dùng được khi biết ba cạnh và R"', v: 'Đúng' }, { t: '"Với a, b cố định, S lớn nhất khi C = 90°"', v: 'Đúng — vì sin C ≤ 1' }],
    cue: 'Chọn 2 phiếu và cùng kiểm bằng cách tính chiều cao.',
  },
  s8Close: 'Dữ kiện quyết định công thức; sin, không phải cos.',
  s9: {
    title: 'Mua hạt giống cho ba mảnh vườn',
    bullets: ['Vườn rau 12 m², vườn hoa 12 m², sân cỏ 24 m² — tổng 48 m².', 'Nếu mỗi m² cần 20 g hạt thì cần 48 × 20 = 960 g = 0,96 kg.', 'Kiểm tra lại sân cỏ bằng công thức Heron hoặc nhận xét tam giác vuông — kết quả phải khớp 24 m².'],
    cue: 'Nhấn: một bài toán thực tế cần cả chọn công thức đúng và kiểm tra chéo kết quả.',
  },
  exit: ['Viết ba công thức diện tích tam giác.', 'Nêu 1 bẫy (dùng cos; quên ½; dùng abc/4R khi chưa biết R).', 'Tự đánh giá M / S / C.', 'Tính diện tích vườn hoa: b = 6, c = 8, A = 30°.'],
  exitCue: 'Mở lại bảng ba mảnh vườn ở mục II.',
  after: '- HS làm bài tập SGK về diện tích tam giác; chuẩn bị tiết luyện tập.',
  snapshot: {
    focus: 'Hình thành và lựa chọn công thức diện tích tam giác trên trục thực nghiệm ba mảnh vườn của trường: S = ½ah_a (12 m²), S = ½bc·sin A (12 m²), S = abc/(4R) (24 m²); rèn kỹ năng chọn công thức theo bộ dữ kiện',
    formulas: ['S = \\dfrac12 a h_a', 'S = \\dfrac12 ab\\sin C', 'S = \\dfrac{abc}{4R}'],
    examples: [
      { question: 'Vườn hoa hình tam giác có b = 6 m, c = 8 m, góc xen giữa A = 30°. Tính diện tích.', answer: 'Dùng S = ½bc·sin A (biết hai cạnh và góc xen giữa): S = ½·6·8·sin30° = 24·0,5 = 12 m².' },
      { question: 'Sân cỏ hình tam giác có ba cạnh 6 m, 8 m, 10 m nội tiếp đường tròn bán kính R = 5 m. Tính diện tích và kiểm tra bằng cách khác.', answer: 'S = abc/(4R) = (6·8·10)/(4·5) = 480/20 = 24 m². Kiểm tra: 6² + 8² = 100 = 10² nên tam giác vuông tại góc giữa hai cạnh 6 và 8, do đó S = ½·6·8 = 24 m² ✓.' },
    ],
    exercises: [
      { level: 'NB', question: 'Viết công thức diện tích tam giác khi biết đáy a và chiều cao h_a.', answer: 'S = ½·a·h_a.' },
      { level: 'NB', question: 'Tính diện tích tam giác có a = 5 và h_a = 4.', answer: 'S = ½·5·4 = 10 (đơn vị diện tích).' },
      { level: 'TH', question: 'Tính diện tích tam giác có a = 5, b = 7, góc xen giữa C = 60°.', answer: 'S = ½·5·7·sin60° = 17,5·(√3/2) = 35√3/4 ≈ 15,16 (đơn vị diện tích).' },
      { level: 'TH', question: 'Hai cạnh a, b giữ nguyên, góc xen giữa tăng từ 30° lên 90°. Diện tích thay đổi thế nào?', answer: 'Diện tích tăng: S = ½ab·sin C, mà sin30° = 0,5 < sin90° = 1 nên diện tích tăng gấp đôi.' },
      { level: 'VD', question: 'Một bạn dùng S = ½ab·cos C để tính diện tích. Hãy phản biện.', answer: 'Sai: công thức dùng sin của góc xen giữa. Với C = 90° công thức của bạn cho S = 0 trong khi tam giác vuông có diện tích ½ab — phản ví dụ quyết định.' },
      { level: 'VD', question: 'Nêu hai tam giác khác nhau nhưng có cùng diện tích và giải thích.', answer: 'Chọn cùng đáy a và cùng chiều cao h_a nhưng đỉnh thứ ba trượt trên đường thẳng song song với đáy: S = ½ah_a không đổi dù hình dạng và các góc thay đổi.' },
    ],
    quick: [
      { question: 'Vì sao công thức diện tích dùng sin mà không dùng cos của góc xen giữa?', solution: 'Vì c·sin A chính là chiều cao kẻ từ B xuống cạnh b; cos A cho hình chiếu của cạnh lên phương đáy, không phải chiều cao.' },
      { question: 'Cần dữ kiện gì để dùng S = abc/(4R)?', solution: 'Ba cạnh a, b, c và bán kính R của đường tròn ngoại tiếp tam giác.' },
    ],
    mistakes: ['Dùng cos thay vì sin trong công thức diện tích.', 'Quên hệ số ½.', 'Áp dụng S = abc/(4R) khi chưa biết bán kính ngoại tiếp R.'],
    boardKnowledge: ['II. NỘI DUNG', '1. Ba công thức diện tích tam giác', 'a. S = ½·a·h_a (biết đáy và chiều cao).', 'b. S = ½·a·b·sin C (biết hai cạnh và góc xen giữa).', 'c. S = abc/(4R) (biết ba cạnh và bán kính ngoại tiếp).', '2. Cách chọn công thức', 'a. Khoanh dữ kiện đã cho → ghép với công thức tương ứng.', 'b. Nếu biết nhiều bộ dữ kiện, chọn cách ít bước và kiểm tra chéo.', '3. Áp dụng ba mảnh vườn', 'a. Vườn rau: ½·6·4 = 12 m².', 'b. Vườn hoa: ½·6·8·sin30° = 12 m².', 'c. Sân cỏ: 6·8·10/(4·5) = 24 m².'],
  },
  aiError: {
    category: 'Lỗi khái niệm', wrongSolution: 'AI tính: "Diện tích vườn hoa có b = 6 m, c = 8 m, góc xen giữa A = 30°: S = ½·b·c·cos A = ½·6·8·cos30° = 24·(√3/2) ≈ 20,78 m²."',
    correction: 'Công thức đúng dùng sin của góc xen giữa: S = ½·b·c·sin A = ½·6·8·sin30° = 12 m².',
    proof: 'Chiều cao kẻ từ C xuống cạnh b bằng c·sin A, nên S = ½·b·c·sin A. Kiểm tra bằng trường hợp biên A = 90°: sin = 1 cho S = ½bc = 24 m², còn công thức AI cho cos90° = 0 → S = 0, mâu thuẫn với hình học.',
    whyAiError: 'Mô hình nhầm cặp hàm lượng giác trong công thức diện tích, có thể do liên tưởng tới công thức hình chiếu/côsin.',
    teacherPrompt: 'Em kiểm tra công thức AI bằng trường hợp A = 90°: kết quả 0 m² có hợp lý không? Sửa lại cho đúng.',
    studentProduct: 'Thẻ Đ/S + viết công thức đúng và tính lại S = 12 m², kèm lập luận "chiều cao = cạnh kề × sin góc".',
    boardPrompt: 'AI dùng cos để tính diện tích. Thử A = 90° thì sao?',
    libraryTitle: 'Lỗi AI dùng côsin thay vì sin trong công thức diện tích tam giác',
  },
};

export default [L31, L32, L33, L34];

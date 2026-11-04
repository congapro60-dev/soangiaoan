const base = (period, lessonType = 'formation') => ({
  key: `10-13-${period}`,
  grade: 10,
  week: 13,
  period,
  lessonType,
  timelineKey: 'default',
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

// 2. 10-13-97: Báo cáo dự án thống kê (Tiết 2)
const L97 = {
  ...base(97, 'practice'),
  title: 'Báo cáo dự án thống kê thực nghiệm 2',
  goals: {
    must: 'Phản biện và bảo vệ được kết quả tính toán thống kê trước các câu hỏi chất vấn của nhóm bạn.',
    should: 'So sánh kết quả giữa hai nhóm khảo sát cùng đề tài; giải thích sự khác biệt dựa trên cỡ mẫu.',
    could: 'Đánh giá độ tin cậy của mô hình thống kê và hoàn thiện báo cáo khoa học nộp hội đồng.',
  },
  opening: 'Tiết 2 phiên bảo vệ dự án: các nhóm đổi chéo phiếu phản biện số liệu và đánh giá độ chính xác.',
  focusQuestion: 'Tại sao hai nhóm khảo sát cùng một vấn đề lại có thể thu được số trung bình khác nhau?',
  axis: `**Đối chiếu kết quả khảo sát chi tiêu ăn trưa (nghìn đồng) của hai nhóm nghiên cứu:**
- Nhóm A (khảo sát 50 học sinh lớp 10 chọn ngẫu nhiên): x̄_A = 35k, s_A = 5k.
- Nhóm B (khảo sát 30 học sinh tại căng-tin trường): x̄_B = 42k, s_B = 8k.
- **Phân tích sai số:** Nhóm B lấy mẫu bị lệch (chỉ khảo sát tại căng-tin nơi giá đắt hơn), trong khi nhóm A lấy mẫu ngẫu nhiên toàn trường.
- **Kết luận phản biện:** Phương pháp chọn mẫu quyết định tính đại diện của dữ liệu; mẫu ngẫu nhiên đáng tin cậy hơn.`,
  s1: {
    title: 'Vì sao kết quả hai nhóm lệch nhau?',
    context: 'Nhóm A khảo sát ngẫu nhiên được x̄ = 35k; Nhóm B khảo sát tại căng-tin được x̄ = 42k.',
    question: 'Nguyên nhân chính dẫn đến sự chênh lệch này là gì?',
    options: ['Nhóm B chọn mẫu bị thiên vị (chỉ chọn người ăn căng-tin)', 'Nhóm A tính sai số trung bình', 'Hai nhóm dùng công thức khác nhau'],
    correct: 0,
    why: 'Mẫu của nhóm B bị thiên lệch chọn lọc (selection bias) vì học sinh mang cơm nhà không xuất hiện tại căng-tin.',
    discuss: ['`[PHÁT HIỆN]` Làm thế nào để chọn mẫu hoàn toàn ngẫu nhiên?', '`[SO SÁNH]` Kích thước mẫu n = 50 so với n = 30 mẫu nào tin cậy hơn?'],
    cue: 'Phân tích khái niệm mẫu đại diện ngẫu nhiên và mẫu thiên lệch.',
    lookFor: 'HS chỉ ra lỗi thiên lệch chọn mẫu.',
  },
  s3: {
    title: 'Quy trình thẩm định và phản biện số liệu',
    steps: [
      'Bước 1: Kiểm tra tính ngẫu nhiên và kích thước của mẫu khảo sát (n ≥ 30).',
      'Bước 2: Kiểm tra tính đúng đắn của các phép tính x̄, Me, s² trên bảng số liệu gốc.',
      'Bước 3: Thẩm định đồ thị và phát hiện các bóp méo thị giác (như cắt ngắn trục tung).',
      'Bước 4: Đánh giá tính khả thi và căn cứ khoa học của các kiến nghị thực tế.',
    ],
    ask: ['`[SUY LUẬN]` Tại sao cắt ngắn trục tung đồ thị lại làm sai lệch cảm nhận?', '`[PHÁT HIỆN]` Khi nào thì kết quả khảo sát đủ tin cậy để công bố?'],
    cue: 'Bảng tiêu chí chấm điểm phản biện chéo giữa các nhóm.',
    close: 'Phản biện khoa học đòi hỏi soi chiếu phương pháp chọn mẫu trước khi nhìn vào con số.',
  },
  s4: {
    bat: 'AI giải: Nhóm B khảo sát 30 bạn ở căng-tin có x̄ = 42k nên suy ra toàn bộ học sinh trường chi tiêu trung bình 42k cho bữa trưa.',
    chung: 'Suy diễn cho toàn trường từ mẫu chỉ lấy tại căng-tin là ngụy biện khái quát hóa vội vã; mẫu không đại diện.',
    sua: 'Chỉ kết luận được đối với học sinh ăn tại căng-tin; muốn kết luận toàn trường phải lấy mẫu ngẫu nhiên ở mọi lớp.',
    cue: 'Hỏi HS: \"Còn những bạn mang cơm ở nhà thì sao?\"',
    lookFor: 'HS chỉ ra mẫu không có tính đại diện.',
  },
  s6: {
    hints: {
      M: 'đối chiếu kết quả tính x̄ và s của hai nhóm; chỉ ra nhóm có s nhỏ hơn.',
      S: 'nhận diện lỗi thiên lệch chọn mẫu trong các tình huống thực tế.',
      C: 'thiết kế lại phương pháp chọn mẫu phân tầng theo từng khối lớp.',
    },
    lookFor: 'HS M tính đúng; HS S phát hiện lỗi chọn mẫu; HS C thiết kế được mẫu ngẫu nhiên.',
  },
  postCheck: {
    q: 'Một cuộc khảo sát trực tuyến trên Facebook có x̄ = 8,5 điểm. Kết quả này có đại diện cho toàn dân không?',
    a: 'Không, vì chỉ người có tài khoản Facebook và quan tâm đến chủ đề mới tham gia, mẫu bị thiên lệch nặng.',
    ds: [
      { t: '\"Cỡ mẫu càng lớn thì luôn luôn càng chính xác, không cần ngẫu nhiên\"', v: 'Sai — mẫu lớn mà thiên vị vẫn sai' },
      { t: '\"Phương pháp chọn mẫu quan trọng hơn số lượng mẫu\"', v: 'Đúng' },
      { t: '\"Hai mẫu ngẫu nhiên từ cùng một quần thể có thể cho số trung bình hơi khác nhau\"', v: 'Đúng' },
    ],
    cue: 'Đổi phiếu chấm chéo, chú ý khái niệm chọn mẫu ngẫu nhiên.',
  },
  s8Close: 'Mẫu phải ngẫu nhiên và đủ lớn; kiểm chứng tính toán; phản biện sắc bén bằng số liệu.',
  s9: {
    title: 'Thăm dò dư luận và bầu cử trong khoa học dữ liệu',
    bullets: [
      'Năm 1936, tạp chí Literary Digest khảo sát 2 triệu người nhưng đoán sai kết quả bầu cử Mỹ vì mẫu thiên lệch.',
      'Gallup chỉ khảo sát 50.000 người nhưng chọn mẫu khoa học và đoán trúng chính xác.',
      'Bài học kinh điển: Chất lượng mẫu quyết định tất cả, không phải kích thước thô.',
    ],
    cue: 'Hỏi: \"Tại sao 50.000 mẫu ngẫu nhiên lại thắng 2 triệu mẫu thiên lệch?\"',
  },
  exit: [
    'Nêu lỗi sai phổ biến nhất khi thu thập dữ liệu dự án.',
    'Nêu 1 bẫy (khái quát hóa toàn trường từ mẫu thiên vị một nhóm).',
    'Tự đánh giá M / S / C.',
    'Để khảo sát chiều cao học sinh trường ta, em sẽ chọn mẫu như thế nào?',
  ],
  exitCue: 'Nhìn lại sự đối chiếu giữa Nhóm A và Nhóm B.',
  after: '- Hoàn thiện hồ sơ dự án; chuẩn bị học tiếp nội dung Tích của một vectơ với một số.',
  snapshot: {
    focus: 'Phản biện số liệu, thẩm định phương pháp thu thập mẫu, đánh giá độ tin cậy và hoàn thiện báo cáo khoa học của dự án thống kê mô tả.',
    formulas: [
      '\\text{Sai số chọn mẫu} \\propto \\dfrac{1}{\\sqrt{n}}',
      '\\bar x = \\dfrac{1}{n}\\sum x_i; \\quad s = \\sqrt{\\dfrac{1}{n}\\sum (x_i - \\bar x)^2}',
    ],
    boardKnowledge: [
      'I. Tiêu chuẩn mẫu: Ngẫu nhiên, độc lập, kích thước đủ lớn, không thiên vị.',
      'II. Phản biện: Kiểm tra nguồn số liệu, kiểm tra công thức tính, kiểm tra suy diễn kết luận.',
    ],
    examples: [
      {
        question: 'Một nhóm muốn khảo sát chiều cao HS lớp 10 nhưng chỉ đo đội tuyển bóng rổ. Nhận xét về mẫu số liệu.',
        solution: 'Mẫu bị thiên lệch nghiêm trọng vì VĐV bóng rổ có chiều cao vượt trội, x̄ thu được sẽ cao hơn thực tế toàn khối rất nhiều.',
      },
      {
        question: 'So sánh hai mẫu: Mẫu 1 có n = 40, s = 2; Mẫu 2 có n = 100, s = 5. Mẫu nào có dữ liệu phân tán hơn?',
        solution: 'Mẫu 2 có độ lệch chuẩn s = 5 lớn hơn s = 2 của Mẫu 1 nên dữ liệu của Mẫu 2 phân tán rộng hơn.',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Mẫu số liệu thế nào được gọi là mẫu đại diện ngẫu nhiên?', answer: 'Là mẫu mà mọi cá thể trong quần thể đều có cơ hội được chọn ngang nhau.' },
      { level: 'NB', question: 'Nêu công thức tính số trung bình của dãy x1, x2, ..., xn.', answer: 'x̄ = (x1 + x2 + ... + xn)/n.' },
      { level: 'TH', question: 'Tại sao khi vẽ biểu đồ cột không nên cắt ngắn trục tung (trục tung không bắt đầu từ 0)?', answer: 'Vì làm phóng đại sự khác biệt giữa các cột, gây cảm nhận sai lệch cho người xem.' },
      { level: 'TH', question: 'Cho dãy số liệu: 10, 10, 10, 10. Tính phương sai s² và giải thích ý nghĩa.', answer: 's² = 0 vì tất cả các giá trị đều bằng nhau, không có sự phân tán.' },
      { level: 'VD', question: 'Thiết kế phương án lấy mẫu 60 học sinh toàn trường gồm 3 khối 10, 11, 12 theo tỉ lệ sĩ số.', answer: 'Lấy mẫu phân tầng: nếu tỉ số học sinh 3 khối là 1:1:1 thì mỗi khối chọn ngẫu nhiên đúng 20 học sinh theo danh sách sổ điểm.' },
      { level: 'VD', question: 'Một bài báo giật tít: \"90% người được hỏi ủng hộ tăng tiền học phí\", biết người được hỏi là 10 phụ huynh trong ban đại diện. Hãy viết đoạn phản biện.', answer: 'Cỡ mẫu n = 10 quá nhỏ và đối tượng ban đại diện không đại diện cho số đông phụ huynh; kết luận 90% không có giá trị thống kê cho toàn trường.' },
    ],
    quick: [
      { question: 'Một cuộc khảo sát chọn mẫu có thể có sai số bằng 0 tuyệt đối không?', solution: 'Không, trong thực tế luôn tồn tại sai số lấy mẫu ngẫu nhiên.' },
      { question: 'Có nên tự ý xóa bỏ các số liệu quá khác biệt mà không kiểm tra không?', solution: 'Không, phải xác minh xem đó là số liệu thật hay do nhầm lẫn trước khi xử lý.' },
    ],
    mistakes: [
      'Đánh đồng kết quả khảo sát trên mẫu nhỏ với toàn bộ cộng đồng.',
      'Sử dụng biểu đồ bóp méo trực quan để dẫn dắt kết luận sai lệch.',
      'Không đối chiếu lại dữ liệu gốc khi có nghi ngờ tính toán.',
    ],
  },
  aiError: {
    category: 'Lỗi logic',
    wrongSolution: 'AI kết luận: Khảo sát 15 học sinh giỏi thấy điểm trung bình môn Toán là 9,2 nên chất lượng học môn Toán của toàn trường đạt mức 9,2.',
    correction: 'Lỗi ngụy biện tổng quát hóa vội vã. Mẫu chỉ gồm 15 học sinh giỏi không có tính đại diện cho toàn trường. Sửa lại: Kết luận chỉ áp dụng cho nhóm học sinh giỏi được khảo sát.',
    proof: 'Một suy diễn thống kê từ mẫu ra quần thể chỉ hợp lệ khi mẫu được chọn ngẫu nhiên từ toàn bộ quần thể. Lấy mẫu có chọn lọc từ nhóm xuất sắc nhất tạo ra sai số hệ thống cực lớn.',
    whyAiError: 'Mô hình học máy nhầm lẫn giữa tập con được chọn lọc và tập tổng thể.',
    teacherPrompt: 'AI suy diễn từ 15 học sinh giỏi ra điểm trung bình toàn trường. Em hãy chỉ lỗi logic và sửa lại phạm vi kết luận đúng.',
    studentProduct: 'Ghi “Lỗi logic: mẫu thiên vị không đại diện”, thu hẹp kết luận về đúng nhóm khảo sát.',
    boardPrompt: 'AI lấy mẫu 15 học sinh giỏi để đánh giá toàn trường. Quy tắc chọn mẫu vi phạm điều gì?',
    libraryTitle: 'Lỗi AI khái quát hóa vội vã từ mẫu thiên lệch sang toàn thể',
  },
};

// 3. 10-13-98: Luyện tập tích của vectơ với một số
const L98 = {
  ...base(98, 'practice'),
  title: 'Luyện tập tích của một vectơ với một số',
  goals: {
    must: 'Tính thành thạo tích của số thực k với vectơ; xác định đúng hướng và độ dài.',
    should: 'Biểu diễn một vectơ theo hai vectơ không cùng phương; chứng minh ba điểm thẳng hàng.',
    could: 'Tìm tập hợp điểm thỏa mãn đẳng thức vectơ chứa tích vô hướng và tích số; giải bài toán cực trị hình học.',
  },
  opening: 'Hôm nay ta luyện tập các dạng toán cốt lõi: phân tích vectơ, chứng minh ba điểm thẳng hàng và bài toán điểm di động.',
  focusQuestion: 'Điều kiện cần và đủ để ba điểm phân biệt A, B, C thẳng hàng bằng ngôn ngữ vectơ là gì?',
  axis: `**Mô hình cân bằng đòn bẩy Archimedes bằng toán vectơ:**
- Điểm tựa $O$, hai vật nặng đặt tại $A$ và $B$ có khối lượng $m_1 = 2$ kg và $m_2 = 3$ kg.
- Điều kiện cân bằng đòn bẩy: $m_1 \\vec{OA} + m_2 \\vec{OB} = \\vec 0 \\iff 2\\vec{OA} + 3\\vec{OB} = \\vec 0$.
- Suy ra: $\\vec{OA} = -\\dfrac{3}{2}\\vec{OB}$.
- Hai vectơ $\\vec{OA}$ và $\\vec{OB}$ ngược hướng, suy ra điểm tựa $O$ nằm giữa $A$ và $B$.
- Tỉ số khoảng cách: $OA = \\dfrac{3}{2}OB \\iff \\dfrac{OA}{OB} = \\dfrac{3}{2}$ (cánh tay đòn tỉ lệ nghịch với khối lượng).`,
  s1: {
    title: 'Điểm tựa nằm ở đâu?',
    context: 'Biết đẳng thức vectơ 2OA + 3OB = 0 giữa điểm tựa O và hai vị trí tải A, B.',
    question: 'Vị trí của điểm tựa O so với hai điểm A và B là gì?',
    options: ['O nằm giữa A và B', 'O nằm ngoài đoạn AB về phía A', 'O nằm ngoài đoạn AB về phía B'],
    correct: 0,
    why: 'Từ 2OA + 3OB = 0 => OA = -(3/2)OB; hai vectơ ngược hướng nên O nằm giữa A và B.',
    discuss: ['`[PHÁT HIỆN]` Nếu đổi thành 2OA - 3OB = 0 thì O nằm ở đâu?', '`[SO SÁNH]` Tỉ lệ đoạn thẳng OA/OB bằng bao nhiêu?'],
    cue: 'Vẽ đoạn thẳng AB và biểu diễn vectơ OA, OB ngược hướng qua O.',
    lookFor: 'HS nhận diện dấu âm thể hiện điểm nằm giữa.',
  },
  s3: {
    title: 'Hai bài toán then chốt của tích vectơ với số',
    steps: [
      'Bài toán 1: Phân tích vectơ $\\vec x$ theo hai vectơ không cùng phương $\\vec a$ và $\\vec b$: luôn tồn tại duy nhất cặp số $(m; n)$ sao cho $\\vec x = m\\vec a + n\\vec b$.',
      'Bài toán 2: Chứng minh 3 điểm $A, B, C$ thẳng hàng: chứng minh $\\vec{AB} = k\\vec{AC}$ ($k \\ne 0$).',
      'Kỹ thuật phân tích: Chèn điểm theo quy tắc ba điểm hoặc quy tắc trừ rồi biến đổi về các vectơ đích.',
      'Công thức tâm tỉ cự: $a\\vec{MA} + b\\vec{MB} + c\\vec{MC} = \\vec 0$ xác định điểm $M$ duy nhất khi $a+b+c \\ne 0$.',
    ],
    ask: ['`[SUY LUẬN]` Để chứng minh AB // CD dùng điều kiện nào?', '`[PHÁT HIỆN]` Nếu m + n = 1 trong công thức OM = mOA + nOB thì M nằm ở đâu?'],
    cue: 'Vẽ tam giác ABC và biểu diễn vectơ AM theo AB, AC.',
    close: 'Mọi vectơ trong mặt phẳng đều biểu diễn được duy nhất qua hai vectơ không cùng phương.',
  },
  s4: {
    bat: 'AI giải: Cho 2OA + 3OB = 0. AI suy ra 2|OA| + 3|OB| = 0 nên OA = OB = 0, điểm O trùng A và B.',
    chung: 'AI đã tự ý lấy độ dài từng số hạng trong đẳng thức vectơ mà quên rằng tổng hai vectơ đối nhau bằng 0 thì độ dài của chúng không thể cộng số học như vậy.',
    sua: 'Từ 2OA + 3OB = 0 => 2OA = -3OB => 2|OA| = |-3||OB| = 3|OB| => 2OA = 3OB (với OA, OB là độ dài). O nằm giữa A và B.',
    cue: 'Nhắc lại: đẳng thức u + v = 0 tương đương u = -v, không tương đương |u| + |v| = 0.',
    lookFor: 'HS chỉ ra sai lầm lấy độ dài từng số hạng.',
  },
  s6: {
    hints: {
      M: 'chuyển vế đẳng thức k·u = v rồi lấy độ dài hai vế có dấu giá trị tuyệt đối.',
      S: 'chèn điểm gốc O vào các vectơ để đưa về cùng một gốc tọa độ.',
      C: 'đặt ẩn k trong điều kiện AB = k·AC để giải hệ phương trình xác định thẳng hàng.',
    },
    lookFor: 'HS M chuyển vế đúng; HS S chèn điểm đúng; HS C giải đúng k.',
  },
  postCheck: {
    q: 'Cho tam giác ABC. Gọi M là trung điểm AB, N trên AC sao cho AN = (1/3)AC. Biểu diễn MN theo AB và AC.',
    a: '$\\vec{MN} = \\vec{AN} - \\vec{AM} = \\dfrac{1}{3}\\vec{AC} - \\dfrac{1}{2}\\vec{AB} = -\\dfrac{1}{2}\\vec{AB} + \\dfrac{1}{3}\\vec{AC}$.',
    ds: [
      { t: '\"A, B, C thẳng hàng khi và chỉ khi AB cùng phương với AC\"', v: 'Đúng' },
      { t: '\"Nếu u = -2v thì |u| = -2|v|\"', v: 'Sai — độ dài luôn không âm: |u| = 2|v|' },
      { t: '\"Mọi vectơ trong mp đều phân tích được duy nhất qua 2 vectơ không cùng phương\"', v: 'Đúng' },
    ],
    cue: 'Đổi phiếu chấm chéo, chú ý dấu trừ của vectơ AM.',
  },
  s8Close: 'Chèn điểm phân tích vectơ; AB = k·AC -> thẳng hàng; |k·a| = |k|·|a| ≥ 0.',
  s9: {
    title: 'Hệ tọa độ tỉ cự trong đồ họa 3D (Barycentric Coordinates)',
    bullets: [
      'Trong engine game (Unreal, Unity), vị trí mọi điểm trên mặt phẳng tam giác biểu diễn qua P = uA + vB + wC với u+v+w=1.',
      'Thuật toán đổ bóng và tô màu mượt mà (Gouraud shading) dựa trên nội suy tọa độ tỉ cự.',
      'Toán vectơ lớp 10 chính là ngôn ngữ dựng hình của công nghiệp game toàn cầu.',
    ],
    cue: 'Hỏi: \"Các phần mềm 3D xác định điểm va chạm của viên đạn trên bề mặt tam giác như thế nào?\"',
  },
  exit: [
    'Nêu điều kiện để 3 điểm A, B, C thẳng hàng bằng vectơ.',
    'Nêu 1 bẫy (lấy độ dài từng số hạng của tổng vectơ bằng 0).',
    'Tự đánh giá M / S / C.',
    'Nếu MA + 2MB = 0 thì điểm M nằm ở vị trí nào trên đoạn AB?',
  ],
  exitCue: 'Nhìn lại hình ảnh đòn bẩy Archimedes mở đầu.',
  after: '- Chuẩn bị bài tiếp theo: Vectơ trong mặt phẳng tọa độ Oxy.',
  snapshot: {
    focus: 'Luyện tập kỹ năng phân tích một vectơ theo hai vectơ không cùng phương; chứng minh ba điểm thẳng hàng; ứng dụng hệ thức vectơ trong bài toán đòn bẩy và hình học.',
    formulas: [
      '\\vec x = m\\vec a + n\\vec b \\quad (\\vec a, \\vec b \\text{ không cùng phương, duy nhất } m, n)',
      'A, B, C \\text{ thẳng hàng } \\iff \\exists k \\ne 0: \\vec{AB} = k\\vec{AC}',
      'I \\text{ là trung điểm } AB \\iff \\vec{IA} + \\vec{IB} = \\vec 0 \\iff \\vec{OA} + \\vec{OB} = 2\\vec{OI}',
      'G \\text{ là trọng tâm } \\Delta ABC \\iff \\vec{GA} + \\vec{GB} + \\vec{GC} = \\vec 0 \\iff \\vec{OA} + \\vec{OB} + \\vec{OC} = 3\\vec{OG}',
    ],
    boardKnowledge: [
      'I. Phân tích vectơ: Dùng quy tắc 3 điểm chèn đỉnh để đưa về hai vectơ cơ sở.',
      'II. Ba điểm thẳng hàng: Đưa về dạng AB = k·AC.',
      'III. Điểm chia đoạn thẳng: k1·MA + k2·MB = 0 xác định vị trí M.',
    ],
    examples: [
      {
        question: 'Cho tam giác ABC có trọng tâm G. Gọi M là trung điểm BC. Biểu diễn AG theo AB và AC.',
        solution: 'Ta có AM = (1/2)(AB + AC). Theo tính chất trọng tâm: AG = (2/3)AM = (2/3)·(1/2)(AB + AC) = (1/3)AB + (1/3)AC.',
      },
      {
        question: 'Cho tam giác ABC. Lấy điểm M sao cho AM = 3MB và điểm N sao cho AN = 3/4 AC. Chứng minh MN // BC.',
        solution: 'Ta có AM = (3/4)AB và AN = (3/4)AC. Do đó MN = AN - AM = (3/4)AC - (3/4)AB = (3/4)(AC - AB) = (3/4)BC. Vì MN = (3/4)BC nên MN // BC.',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Biết AB = 4AC. Hỏi hai vectơ AB và AC cùng hướng hay ngược hướng? Tỉ số độ dài AB/AC bằng bao nhiêu?', answer: 'Cùng hướng vì k = 4 > 0; tỉ số độ dài AB/AC = 4.' },
      { level: 'NB', question: 'Cho tam giác ABC có G là trọng tâm. Vectơ GA + GB + GC bằng vectơ nào?', answer: 'Bằng vectơ 0.' },
      { level: 'TH', question: 'Cho hình bình hành ABCD. Biểu diễn vectơ AC theo hai vectơ AB và AD.', answer: 'AC = AB + AD (theo quy tắc hình bình hành).' },
      { level: 'TH', question: 'Cho đoạn thẳng AB và điểm M thỏa mãn MA - 3MB = 0. Tính tỉ số MA/MB và cho biết M nằm trong hay nằm ngoài đoạn AB.', answer: 'MA = 3MB -> MA/MB = 3. Vì k = 3 > 0 nên MA và MB cùng hướng, do đó M nằm ngoài đoạn AB về phía B.' },
      { level: 'VD', question: 'Cho tam giác ABC. Gọi I là trung điểm BC, J là điểm thỏa mãn 2JA + 3JC = 0. Chứng minh IJ cắt AB.', answer: 'Biểu diễn IJ theo AB và AC: IJ = AJ - AI = (3/5)AC - (1/2)(AB + AC) = -1/2 AB + 1/10 AC. Vectơ IJ không cùng phương với AB nên đường thẳng IJ cắt AB.' },
      { level: 'VD', question: 'Cho tam giác ABC. Tìm tập hợp các điểm M thỏa mãn |MA + MB + MC| = |MA - MB|.', answer: 'Gọi G là trọng tâm tam giác ABC -> MA + MB + MC = 3MG. Ta có |MA - MB| = |BA| = AB. Đẳng thức tương đương |3MG| = AB <=> MG = AB/3. Tập hợp các điểm M là đường tròn tâm G bán kính R = AB/3.' },
    ],
    quick: [
      { question: 'Có bao giờ hai vectơ không cùng phương mà có thể triệt tiêu tổng bằng 0 với các hệ số dương không?', solution: 'Không, nếu a, b không cùng phương thì ma + nb = 0 bắt buộc m = n = 0.' },
      { question: 'Để chứng minh 3 điểm thẳng hàng cần tìm bao nhiêu vectơ?', solution: 'Cần tìm 2 vectơ tạo bởi 3 điểm đó và chứng minh chúng cùng phương.' },
    ],
    mistakes: [
      'Chuyển vế không đổi dấu trong đẳng thức vectơ.',
      'Nhầm lẫn giữa cùng hướng (k > 0) và ngược hướng (k < 0).',
      'Quên điều kiện hai vectơ cơ sở phải không cùng phương khi phân tích.',
    ],
  },
  aiError: {
    category: 'Lỗi đại số',
    wrongSolution: 'AI viết: Cho đẳng thức 3MA + 2MB = 0. Lấy độ dài hai vế: 3|MA| + 2|MB| = 0 suy ra MA = MB = 0, điểm M trùng cả A và B.',
    correction: 'Không được lấy độ dài từng số hạng của tổng hai vectơ. Sửa lại: 3MA = -2MB => 3|MA| = |-2||MB| = 2|MB| => MA/MB = 2/3. Điểm M chia trong đoạn AB theo tỉ số 2/3.',
    proof: 'Độ dài của tổng không bằng tổng các độ dài: |u + v| ≤ |u| + |v|. Đẳng thức u + v = 0 nghĩa là u = -v, suy ra |u| = |-v| = |v|, không có nghĩa là |u| + |v| = 0.',
    whyAiError: 'Mô hình tự ý phân phối phép lấy độ dài qua dấu cộng vectơ như một phép toán số học thông thường.',
    teacherPrompt: 'AI tính ra MA = MB = 0 từ 3MA + 2MB = 0. Em hãy chỉ lỗi sai và sửa lại: vị trí đúng của điểm M là ở đâu?',
    studentProduct: 'Ghi “Lỗi đại số: không phân phối độ dài vào tổng”, sửa thành MA/MB = 2/3 và M nằm giữa A, B.',
    boardPrompt: 'AI lấy độ dài từng số hạng khiến MA = MB = 0. Phép biến đổi đúng từ u + v = 0 là gì?',
    libraryTitle: 'Lỗi AI lấy độ dài từng số hạng trong đẳng thức tổng vectơ bằng 0',
  },
};

export default [L97, L98];

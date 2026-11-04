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

// 1. 10-13-96: Báo cáo dự án thống kê (Tiết 1)
const L96 = {
  ...base(96, 'practice'),
  title: 'Báo cáo dự án thống kê thực nghiệm 1',
  goals: {
    must: 'Trình bày được kết quả thu thập số liệu và bảng tần số của dự án điều tra thực tế.',
    should: 'Tính đúng số trung bình, trung vị, khoảng biến thiên và độ lệch chuẩn của số liệu dự án.',
    could: 'Phân tích các yếu tố gây sai số trong quá trình đo đạc; đề xuất giải pháp cải tiến.',
  },
  opening: 'Hôm nay các nhóm báo cáo sản phẩm dự án thống kê mô tả khảo sát thực tế tại trường học.',
  focusQuestion: 'Khi báo cáo số liệu thực nghiệm, làm thế nào để số liệu vừa trung thực vừa có sức thuyết phục?',
  axis: `**Dự án Thống kê: Khảo sát thói quen đọc sách của 100 học sinh khối 10:**
- Số giờ đọc sách mỗi tuần: Min = 0 giờ, Max = 14 giờ.
- Bảng tần số: [0; 2) có 15 HS; [2; 5) có 45 HS; [5; 8) có 25 HS; [8; 12) có 12 HS; [12; 15) có 3 HS.
- Trung bình: 4,5 giờ/tuần; Trung vị: 4,0 giờ/tuần; Độ lệch chuẩn s = 2,8 giờ.
- Kết luận dự án: Đa số học sinh đọc từ 2 đến 5 giờ/tuần; cần phát động phong trào đọc sách cuối tuần.`,
  s1: {
    title: 'Đánh giá thói quen đọc sách',
    context: 'Dự án thu thập số liệu từ 100 học sinh với trung bình 4,5 giờ/tuần và độ lệch chuẩn 2,8 giờ.',
    question: 'Chỉ số độ lệch chuẩn s = 2,8 giờ cho ta biết điều gì?',
    options: ['Thời gian đọc sách của học sinh có độ phân tán tương đối rộng', 'Tất cả học sinh đều đọc 2,8 giờ', 'Dữ liệu bị sai số'],
    correct: 0,
    why: 'Độ lệch chuẩn s đo mức độ phân tán quanh số trung bình; s = 2,8 giờ so với x̄ = 4,5 giờ cho thấy mức độ đọc sách giữa các bạn chênh lệch khá lớn.',
    discuss: ['`[PHÁT HIỆN]` Vì sao nhóm [2; 5) giờ có tần số đông nhất?', '`[SO SÁNH]` Dự án nên khuyến nghị gì cho nhà trường?'],
    cue: 'Chiếu biểu đồ cột tần số đọc sách của 100 học sinh.',
    lookFor: 'HS giải thích được ý nghĩa độ phân tán trong bối cảnh thực tế.',
  },
  s3: {
    title: 'Tiêu chuẩn một báo cáo thống kê khoa học',
    steps: [
      '1. Thu thập & làm sạch dữ liệu: loại bỏ các phiếu trả lời không hợp lệ.',
      '2. Bảng phân bố tần số & đồ thị: trực quan hóa phân bố dữ liệu.',
      '3. Bộ số đặc trưng: tính x̄, Me, Mo, R, s và phát hiện ngoại lai.',
      '4. Kết luận & kiến nghị: đưa ra khuyến nghị thực tiễn dựa trên bằng chứng số liệu.',
    ],
    ask: ['`[SUY LUẬN]` Tại sao không nên bỏ qua các giá trị ngoại lai khi thu thập?', '`[PHÁT HIỆN]` Biểu đồ nào phù hợp nhất cho dữ liệu ghép nhóm?'],
    cue: 'Bảng kiểm rubric đánh giá báo cáo dự án.',
    close: 'Số liệu trung thực là danh dự của người làm khoa học; kết luận phải bám sát bằng chứng thống kê.',
  },
  s4: {
    bat: 'AI báo cáo: Nhóm khảo sát 100 bạn thấy có 1 bạn đọc 50 giờ/tuần nên kết luận trung bình học sinh đọc 8 giờ/tuần.',
    chung: 'Giá trị 50 giờ/tuần là ngoại lai bất thường (có thể do ghi nhầm hoặc nói quá), làm kéo lệch số trung bình.',
    sua: 'Phải kiểm tra lại tính xác thực của giá trị 50 giờ, dùng trung vị hoặc loại bỏ ngoại lai để báo cáo x̄ = 4,5 giờ.',
    cue: 'Hỏi HS: \"Một tuần có 168 giờ, đọc 50 giờ có khả thi không?\"',
    lookFor: 'HS phát hiện giá trị ngoại lai làm bóp méo kết quả dự án.',
  },
  s6: {
    hints: {
      M: 'đọc đúng bảng tần số và tính x̄ theo công thức tổng tần số nhân giá trị chia n.',
      S: 'nhận diện ngoại lai qua ngưỡng 1,5ΔQ; chọn số trung vị thay thế.',
      C: 'phân tích nguyên nhân sai số ngẫu nhiên và sai số hệ thống trong phiếu hỏi.',
    },
    lookFor: 'HS M tính đúng x̄; HS S lập luận ngoại lai; HS C đề xuất giải pháp.',
  },
  postCheck: {
    q: 'Một dự án điều tra có x̄ = 10 và s = 0,5. Em có nhận xét gì về độ đồng đều của dữ liệu?',
    a: 'Độ lệch chuẩn s = 0,5 rất nhỏ so với x̄ = 10, chứng tỏ dữ liệu rất đồng đều và tập trung quanh giá trị 10.',
    ds: [
      { t: '\"Báo cáo thống kê chỉ cần nêu số trung bình là đủ\"', v: 'Sai — cần cả độ phân tán' },
      { t: '\"Giá trị bất thường cần được xác minh trước khi đưa vào tính toán\"', v: 'Đúng' },
      { t: '\"Độ lệch chuẩn càng nhỏ thì dữ liệu càng đồng đều\"', v: 'Đúng' },
    ],
    cue: 'Đổi phiếu chấm chéo, chú ý nhận xét độ đồng đều.',
  },
  s8Close: 'Báo cáo dự án: Dữ liệu sạch -> Đồ thị trực quan -> Bộ số đặc trưng -> Kiến nghị xác đáng.',
  s9: {
    title: 'Thống kê thực nghiệm trong nghiên cứu xã hội học',
    bullets: [
      'Các viện nghiên cứu chính sách dựa vào dữ liệu khảo sát thực nghiệm để ban hành luật.',
      'Tính minh bạch của dữ liệu mẫu quyết định uy tín của công trình nghiên cứu.',
      'Kỹ năng thống kê thực hành là hành trang cốt lõi của công dân số.',
    ],
    cue: 'Hỏi: \"Tại sao các cuộc khảo sát ý kiến công chúng cần chọn mẫu ngẫu nhiên đại diện?\"',
  },
  exit: [
    'Nêu 3 bước chính khi thực hiện một dự án thống kê.',
    'Nêu 1 bẫy (không kiểm tra ngoại lai dẫn đến kết luận sai).',
    'Tự đánh giá M / S / C.',
    'Khi số liệu có ngoại lai lớn, nên dùng số đo nào làm đại diện?',
  ],
  exitCue: 'Nhìn lại bảng kết quả khảo sát 100 học sinh.',
  after: '- Chuẩn bị tiết 2: Phản biện và bảo vệ kết quả dự án trước hội đồng lớp.',
  snapshot: {
    focus: 'Báo cáo kết quả dự án thống kê mô tả; xử lý số liệu thực nghiệm, tính toán các số đặc trưng và đánh giá độ tin cậy của kết luận.',
    formulas: [
      '\\bar x = \\dfrac{1}{n}\\sum m_i c_i',
      's^2 = \\dfrac{1}{n}\\sum m_i (c_i - \\bar x)^2; \\quad s = \\sqrt{s^2}',
      '\\Delta_Q = Q_3 - Q_1; \\quad \\text{Ngoại lai: } x \\notin [Q_1 - 1{,}5\\Delta_Q; Q_3 + 1{,}5\\Delta_Q]',
    ],
    boardKnowledge: [
      'I. Cấu trúc báo cáo: Mục tiêu -> Phương pháp mẫu -> Kết quả thống kê -> Kiến nghị.',
      'II. Đánh giá: Độ chuẩn xác tính toán, khả năng phát hiện ngoại lai, tính thuyết phục của đồ thị.',
    ],
    examples: [
      {
        question: 'Dự án đo chiều cao 50 cây giống: x̄ = 25 cm, s = 2 cm. Đánh giá chất lượng lô cây giống.',
        solution: 'Độ lệch chuẩn s = 2 cm là khá nhỏ (s/x̄ = 8%), chứng tỏ lô cây giống phát triển rất đồng đều, đạt tiêu chuẩn xuất vườn.',
      },
      {
        question: 'Trong mẫu khảo sát chi tiêu có Q1 = 50k, Q3 = 100k. Một bạn chi tiêu 250k có phải ngoại lai không?',
        solution: 'ΔQ = 100 - 50 = 50k. Ngưỡng trên: Q3 + 1,5ΔQ = 100 + 1,5·50 = 175k. Vì 250k > 175k nên đây là giá trị ngoại lai.',
      },
    ],
    exercises: [
      { level: 'NB', question: 'Mẫu số liệu có cỡ mẫu n = 100, tổng các giá trị là 450. Tính số trung bình.', answer: 'x̄ = 450/100 = 4,5.' },
      { level: 'NB', question: 'Để trực quan hóa cơ cấu phần trăm các nhóm số liệu, nên dùng biểu đồ nào?', answer: 'Nên dùng biểu đồ hình quạt tròn (hoặc biểu đồ cột).' },
      { level: 'TH', question: 'Tính phương sai s² biết n = 20, tổng bình phương độ lệch là 80.', answer: 's² = 80/20 = 4 (độ lệch chuẩn s = 2).' },
      { level: 'TH', question: 'Dự án có x̄ = 15, trung vị Me = 11. Nhận xét về độ lệch của phân bố dữ liệu.', answer: 'Vì x̄ > Me khá nhiều nên dữ liệu bị lệch phải (có một số giá trị rất lớn kéo x̄ lên).' },
      { level: 'VD', question: 'Hai nhóm dự án cùng khảo sát một vấn đề: Nhóm 1 có s = 1,2; Nhóm 2 có s = 3,5. Nhóm nào có dữ liệu thu thập đồng đều hơn?', answer: 'Nhóm 1 có s nhỏ hơn hẳn nên dữ liệu đồng đều và tập trung hơn nhóm 2.' },
      { level: 'VD', question: 'Đề xuất 2 biện pháp giảm thiểu sai số trong phiếu hỏi khảo sát dự án.', answer: '1. Thiết kế câu hỏi trắc nghiệm rõ ràng, tránh câu hỏi mơ hồ; 2. Tăng kích thước mẫu và chọn mẫu ngẫu nhiên đại diện.' },
    ],
    quick: [
      { question: 'Có thể kết luận toàn trường chỉ dựa trên khảo sát 5 học sinh không?', solution: 'Không, cỡ mẫu 5 quá nhỏ, không đại diện được cho toàn trường.' },
      { question: 'Độ lệch chuẩn có đơn vị đo giống đơn vị của số liệu không?', solution: 'Có, độ lệch chuẩn s cùng đơn vị đo với dữ liệu gốc.' },
    ],
    mistakes: [
      'Chỉ nêu số trung bình mà không báo cáo độ lệch chuẩn s.',
      'Không kiểm tra giá trị ngoại lai trước khi kết luận dự án.',
      'Vẽ biểu đồ sai tỉ lệ trục tọa độ.',
    ],
  },
  aiError: {
    category: 'Lỗi khái niệm',
    wrongSolution: 'AI báo cáo: Mẫu khảo sát có điểm trung bình 8,0 và độ lệch chuẩn s = 4,0 nên tất cả học sinh đều đạt điểm giỏi trong khoảng 8 ± 4.',
    correction: 'Độ lệch chuẩn s = 4,0 không có nghĩa là mọi học sinh nằm trong khoảng đó. s đo mức độ phân tán trung bình; với s = 4,0 thì điểm số dao động rất mạnh, có nhiều học sinh điểm thấp.',
    proof: 'Theo quy tắc thực nghiệm, khoảng [x̄ - s; x̄ + s] chỉ chứa khoảng 68% số liệu nếu phân bố chuẩn. Điểm dao động từ 4 đến 12 (thậm chí dưới 4) nên không thể kết luận "tất cả đều giỏi".',
    whyAiError: 'Mô hình nhầm độ lệch chuẩn với khoảng biến thiên tuyệt đối chứa 100% dữ liệu.',
    teacherPrompt: 'AI kết luận "tất cả học sinh đều giỏi" khi s = 4,0. Em hãy chỉ lỗi sai và sửa lại: độ lệch chuẩn s = 4,0 thể hiện điều gì về kết quả học tập?',
    studentProduct: 'Ghi “Lỗi khái niệm: nhầm độ lệch chuẩn với biên độ toàn thể”, sửa thành “học sinh phân hóa rất mạnh”.',
    boardPrompt: 'AI diễn giải s = 4,0 là mọi học sinh đều đạt quanh 8 điểm. Ý nghĩa thực sự của s lớn là gì?',
    libraryTitle: 'Lỗi AI diễn giải sai ý nghĩa thực tế của độ lệch chuẩn trong báo cáo dự án',
  },
};

export default [L96];

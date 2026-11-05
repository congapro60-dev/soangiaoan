const fs = require('fs');

const G11_W18 = [
  {
    key: '11-18-130', grade: 11, week: 18, period: 130,
    title: 'Ôn tập HK1: Phương trình lượng giác và bài toán thực tế sóng âm chu kỳ', kind: 'practice', lessonType: 'practice',
    focus: 'Phương trình lượng giác cơ bản, phương trình bậc hai đối với một hàm lượng giác và bài toán dao động điều hòa',
    formulas: ['\\sin x = \\sin \\alpha \\iff x = \\alpha + k2\\pi \\lor x = \\pi - \\alpha + k2\\pi', 'y = A\\cos(\\omega t + \\varphi)', 'T = \\frac{2\\pi}{\\omega}'],
    boardKnowledge: 'Toàn cảnh Lượng giác HK1: 1. Bốn phương trình cơ bản: sin, cos, tan, cot; 2. Chu kỳ tuần hoàn của sin, cos là 2π, của tan, cot là π; 3. Ứng dụng: Chu kỳ dao động của con lắc, thủy triều, sóng âm thanh.',
    examples: [
      { question: 'Giải phương trình: 2\\cos^2 x - 3\\cos x + 1 = 0.', solution: 'Đặt t = \\cos x (-1 ≤ t ≤ 1). Phương trình trở thành 2t^2 - 3t + 1 = 0 ⇔ t = 1 hoặc t = 1/2. Với t = 1: x = k2π. Với t = 1/2: x = ±π/3 + k2π (k ∈ Z).' },
      { question: 'Mực nước tại một cảng biển được mô hình hoá bởi h(t) = 4\\sin(\\pi t / 6) + 7 (mét) với t là số giờ tính từ nửa đêm. Tìm mực nước cao nhất và thời điểm xuất hiện.', solution: 'Vì -1 ≤ sin ≤ 1 nên hmax = 4(1) + 7 = 11 mét. Đạt được khi sin(\\pi t / 6) = 1 ⇔ \\pi t / 6 = \\pi/2 + k2\\pi ⇔ t = 3 + 12k. Thời điểm đầu tiên trong ngày là lúc 3 giờ sáng.' }
    ],
    exercises: [
      { level: 'NB', question: 'Tập giá trị của hàm số y = \\sin x và y = \\cos x là đoạn nào?', answer: 'Đoạn [-1; 1].' },
      { level: 'NB', question: 'Phương trình \\sin x = m có nghiệm khi tham số m thoả mãn điều kiện gì?', answer: '-1 ≤ m ≤ 1.' },
      { level: 'TH', question: 'Giải phương trình: \\tan x = \\sqrt{3}.', answer: 'x = \\pi/3 + k\\pi (k ∈ Z).' },
      { level: 'TH', question: 'Tìm chu kỳ tuần hoàn của hàm số y = \\cos(4x).', answer: 'T = 2\\pi / 4 = \\pi/2.' },
      { level: 'VD', question: 'Tìm số nghiệm của phương trình 2\\sin x - 1 = 0 trên đoạn [0; 3\\pi].', answer: '\\sin x = 1/2 ⇔ x = \\pi/6 + k2\\pi hoặc x = 5\\pi/6 + k2\\pi. Trên [0; 3\\pi] có các nghiệm: \\pi/6, 5\\pi/6, 13\\pi/6, 17\\pi/6 (gồm 4 nghiệm).' },
      { level: 'VD', question: 'Một bánh xe đu quay có bán kính 20m quay đều 1 vòng hết 60 giây. Thiết lập hàm số độ cao H(t) của một cabin so với mặt đất.', answer: 'H(t) = 20 - 20\\cos(\\pi t / 30) + h0 với h0 là khoảng cách từ điểm thấp nhất của đu quay tới mặt đất.' }
    ],
    quick: [
      { question: 'Nghiệm của phương trình \\cos x = 0 là gì?', solution: 'x = \\pi/2 + k\\pi (k ∈ Z).' },
      { question: 'Hàm số lượng giác nào là hàm số lẻ trên tập xác định của nó?', solution: 'Hàm số y = \\sin x, y = \\tan x, y = \\cot x (riêng y = \\cos x là hàm chẵn).' }
    ],
    mistakes: ['Quên đuôi nghiệm + k2π hoặc nhầm thành + kπ đối với hàm sin và cos.', 'Nhầm họ nghiệm bù của sin: x = π - α thành x = -α.', 'Không đặt điều kiện -1 ≤ t ≤ 1 khi đặt ẩn phụ cho sin hoặc cos.'],
    selfChoice: false, timelineKey: 'gateD78'
  },
  {
    key: '11-18-131', grade: 11, week: 18, period: 131,
    title: 'Ôn tập HK1: Dãy số, cấp số cộng, cấp số nhân và bài toán tài chính', kind: 'practice', lessonType: 'practice',
    focus: 'Xác định số hạng tổng quát, tính tổng n số hạng đầu và bài toán thực tế lãi kép, trả góp ngân hàng',
    formulas: ['u_n = u_1 + (n-1)d', 'S_n = \\frac{n(u_1+u_n)}{2}', 'u_n = u_1 q^{n-1}', 'S_n = \\frac{u_1(q^n-1)}{q-1}', 'A = P(1+r)^n'],
    boardKnowledge: 'Toàn cảnh Dãy số HK1: 1. Cấp số cộng: Số hạng sau bằng số trước cộng d; 2. Cấp số nhân: Số hạng sau bằng số trước nhân q; 3. Bài toán lãi kép: Gửi vốn một lần sinh lãi theo chu kỳ; 4. Bài toán trả góp đều đặn.',
    examples: [
      { question: 'Cho cấp số cộng có u1 = 3 và công sai d = 4. Tìm số hạng thứ 20 và tính tổng 20 số hạng đầu.', solution: 'u20 = 3 + 19(4) = 79. S20 = 20(3 + 79)/2 = 820.' },
      { question: 'Bác An gửi tiết kiệm 100 triệu đồng vào ngân hàng với lãi suất 6%/năm theo thể thức lãi kép. Hỏi sau 5 năm bác An nhận được bao nhiêu tiền cả vốn lẫn lãi?', solution: 'A = 100 · (1 + 0,06)^5 ≈ 100 · 1,338226 = 133,82 triệu đồng.' }
    ],
    exercises: [
      { level: 'NB', question: 'Công thức liên hệ giữa ba số hạng liên tiếp a, b, c của một cấp số cộng là gì?', answer: 'b = (a + c) / 2 (hay a + c = 2b).' },
      { level: 'NB', question: 'Công thức liên hệ giữa ba số hạng liên tiếp a, b, c của một cấp số nhân là gì?', answer: 'b^2 = a · c.' },
      { level: 'TH', question: 'Cho cấp số nhân có u1 = 2 và công bội q = 3. Số hạng thứ 5 là bao nhiêu?', answer: 'u5 = 2 · 3^4 = 2 · 81 = 162.' },
      { level: 'TH', question: 'Tìm số hạng đầu và công sai của cấp số cộng biết u2 = 5 và u5 = 14.', answer: '3d = u5 - u2 = 9 ⇒ d = 3; u1 = u2 - d = 2.' },
      { level: 'VD', question: 'Tìm ba số nguyên liên tiếp lập thành một cấp số nhân có tổng bằng 21 và tổng bình phương bằng 189.', answer: 'Ba số đó là 3, 6, 12 hoặc 12, 6, 3.' },
      { level: 'VD', question: 'Một người vay ngân hàng 500 triệu đồng mua nhà với lãi suất 0,8%/tháng trả góp đều đặn trong 5 năm (60 tháng). Tính số tiền người đó phải trả mỗi tháng.', answer: 'Áp dụng công thức trả góp m = A·r·(1+r)^n / ((1+r)^n - 1) ≈ 10,54 triệu đồng/tháng.' }
    ],
    quick: [
      { question: 'Cấp số nhân có công bội q = 1 thì dãy số có tính chất gì?', solution: 'Là một dãy số không đổi (tất cả các số hạng đều bằng nhau).' },
      { question: 'Khi nào tổng của cấp số nhân lùi vô hạn hội tụ về một số thực?', solution: 'Khi công bội thoả mãn |q| < 1 (S = u1 / (1 - q)).' }
    ],
    mistakes: ['Nhầm công thức số hạng thứ n u_n = u1 + nd thay vì (n-1)d.', 'Quên đổi lãi suất từ năm sang tháng khi tính kỳ hạn tháng.', 'Nhầm lẫn giữa công thức lãi đơn và công thức lãi kép.'],
    selfChoice: false, timelineKey: 'gateD78'
  },
  {
    key: '11-18-132', grade: 11, week: 18, period: 132,
    title: 'Ôn tập HK1: Giới hạn vô định và tính liên tục của hàm số', kind: 'practice', lessonType: 'practice',
    focus: 'Khử dạng vô định 0/0, vô cực trên vô cực, vô cực trừ vô cực, xét tính liên tục và định lý nghiệm',
    formulas: ['\\lim_{x \\to x_0} \\frac{f(x)}{g(x)}', '\\lim_{x \\to +\\infty} (\\sqrt{x^2+bx} - x) = \\frac{b}{2}', 'f(a)f(b) < 0 \\implies \\exists c: f(c) = 0'],
    boardKnowledge: 'Toàn cảnh Giới hạn & Liên tục: 1. Khử 0/0: Phân tích thành nhân tử triệt tiêu (x - x0) hoặc nhân liên hợp; 2. Khử vô cực/vô cực: Chia cho luỹ thừa bậc cao nhất; 3. Hàm liên tục: Giới hạn = Giá trị tại điểm; 4. Định lý nghiệm: f(a)·f(b) < 0 có ít nhất 1 nghiệm trong khoảng.',
    examples: [
      { question: 'Tính giới hạn vô định: L = \\lim_{x \\to 1} \\frac{x^3 - 1}{x^2 + 2x - 3}.', solution: 'Dạng 0/0. Phân tích: (x - 1)(x^2 + x + 1) / ((x - 1)(x + 3)) = \\lim_{x \\to 1} \\frac{x^2 + x + 1}{x + 3} = \\frac{3}{4}.' },
      { question: 'Tìm m để hàm số f(x) = (\\sqrt{x + 3} - 2)/(x - 1) khi x ≠ 1 và f(1) = m liên tục tại x = 1.', solution: '\\lim_{x \\to 1} f(x) = \\lim \\frac{x - 1}{(x-1)(\\sqrt{x+3}+2)} = \\lim \\frac{1}{\\sqrt{x+3}+2} = \\frac{1}{4}. Để liên tục: m = 1/4.' }
    ],
    exercises: [
      { level: 'NB', question: 'Dạng vô định nào phổ biến nhất khi tính giới hạn của phân thức đại số tại điểm nghiệm của mẫu?', answer: 'Dạng 0/0.' },
      { level: 'NB', question: 'Biểu thức liên hợp của (\\sqrt{A} - \\sqrt{B}) là biểu thức nào?', answer: '(\\sqrt{A} + \\sqrt{B}).' },
      { level: 'TH', question: 'Tính giới hạn: \\lim_{n \\to \\infty} \\frac{5n^3 + 2n - 1}{2n^3 + 7}.', answer: 'Chia cả tử và mẫu cho n^3: kết quả = 5/2.' },
      { level: 'TH', question: 'Xét tính liên tục của hàm số y = \\sqrt{x - 3} tại điểm x = 2.', answer: 'Hàm số không xác định tại x = 2 nên gián đoạn tại x = 2.' },
      { level: 'VD', question: 'Tính giới hạn: \\lim_{x \\to +\\infty} (\\sqrt{x^2 + 4x + 1} - x).', answer: 'Nhân liên hợp: tử = 4x + 1, mẫu = \\sqrt{x^2+4x+1} + x. Chia cho x: kết quả = 4 / (1 + 1) = 2.' },
      { level: 'VD', question: 'Chứng minh phương trình x^4 - 3x^2 + 2x - 1 = 0 có ít nhất hai nghiệm thực phân biệt.', answer: 'f(0) = -1 < 0, f(2) = 7 > 0, f(-2) = 1 > 0. Có nghiệm trong (-2; 0) và (0; 2).' }
    ],
    quick: [
      { question: 'Tại sao khi x tiến về âm vô cực, \\sqrt{x^2} lại bằng -x?', solution: 'Vì căn bậc hai số học luôn không âm, mà khi x < 0 thì |x| = -x.' },
      { question: 'Điều kiện cần và đủ để hàm số liên tục trên một khoảng (a; b) là gì?', solution: 'Hàm số phải liên tục tại mọi điểm thuộc khoảng (a; b) đó.' }
    ],
    mistakes: ['Quên đổi dấu khi rút x ra khỏi căn ở âm vô cực.', 'Thế điểm x0 vào làm mẫu bằng 0 rồi vội kết luận giới hạn bằng vô cực mà không kiểm tra tử.', 'Nhầm công thức liên hợp bậc ba: a - b = (a^3 - b^3)/(a^2 + ab + b^2).'],
    selfChoice: false, timelineKey: 'gateD78'
  },
  {
    key: '11-18-133', grade: 11, week: 18, period: 133,
    title: 'Ôn tập HK1: Hình học không gian — Quan hệ song song và thiết diện tổng hợp', kind: 'practice', lessonType: 'practice',
    focus: 'Đường thẳng song song mặt phẳng, hai mặt phẳng song song, xác định thiết diện và định lý Thales không gian',
    formulas: ['d // (P) \\iff d \\not\\subset (P) \\land \\exists a \\subset (P): d // a', '(P) // (Q) \\land (R) \\cap (P) = a \\implies a // b'],
    boardKnowledge: 'Tổng kết Hình không gian HK1: 1. Đường song song mặt: Tìm đường song song trong mặt; 2. Mặt song song mặt: Hai đường cắt nhau cùng song song; 3. Thiết diện: Đa giác tạo bởi các đoạn giao tuyến khép kín; 4. Hình lăng trụ và hình hộp.',
    examples: [
      { question: 'Cho hình chóp S.ABCD đáy hình bình hành. Gọi M, N lần lượt là trung điểm SA, SC. Chứng minh MN song song với mặt phẳng (ABCD).', solution: 'Trong tam giác SAC, MN là đường trung bình nên MN // AC. Vì AC ⊂ (ABCD) và MN ⊄ (ABCD) nên MN // (ABCD).' },
      { question: 'Xác định thiết diện của hình chóp tứ giác S.ABCD cắt bởi mặt phẳng (α) đi qua trung điểm M của SA và song song với đáy (ABCD).', solution: 'Mặt phẳng (α) cắt SB, SC, SD lần lượt tại các trung điểm N, P, Q. Thiết diện là tứ giác MNPQ đồng dạng với đáy ABCD theo tỉ số 1/2.' }
    ],
    exercises: [
      { level: 'NB', question: 'Hình bình hành khi chiếu song song lên một mặt phẳng có thể trở thành hình gì?', answer: 'Trở thành một hình bình hành hoặc một đoạn thẳng.' },
      { level: 'NB', question: 'Hình chóp tứ giác đều có bao nhiêu mặt phẳng đối xứng?', answer: 'Có 4 mặt phẳng đối xứng.' },
      { level: 'TH', question: 'Cho hình hộp ABCD.A\'B\'C\'D\'. Đường thẳng AC song song với mặt phẳng nào?', answer: 'Mặt phẳng (A\'B\'C\'D\').' },
      { level: 'TH', question: 'Hai mặt phẳng song song chắn trên hai cát tuyến song song những đoạn thẳng như thế nào?', answer: 'Những đoạn thẳng bằng nhau.' },
      { level: 'VD', question: 'Cho hình chóp S.ABCD đáy bình hành. Gọi G là trọng tâm tam giác SAD. Mặt phẳng qua G song song với (SAB) cắt hình chóp theo thiết diện là hình gì?', answer: 'Thiết diện là một hình thang có đáy song song với AB.' },
      { level: 'VD', question: 'Áp dụng định lý Thales trong không gian để tính tỉ số thể tích hai khối chóp bị cắt bởi một mặt phẳng song song với đáy.', answer: 'Tỉ số thể tích bằng lập phương của tỉ số đồng dạng k^3.' }
    ],
    quick: [
      { question: 'Hai đường thẳng cùng song song với một mặt phẳng có chắc chắn song song với nhau không?', solution: 'Không chắc chắn, chúng có thể cắt nhau, song song hoặc chéo nhau.' },
      { question: 'Một đường thẳng cắt một trong hai mặt phẳng song song thì có cắt mặt phẳng còn lại không?', solution: 'Có, chắc chắn cắt mặt phẳng còn lại.' }
    ],
    mistakes: ['Vẽ sai nét khuất nét liền khi dựng thiết diện trên các mặt sau.', 'Kết luận hai mặt phẳng song song khi chỉ mới tìm được một đường thẳng song song.', 'Không kéo dài các đường thẳng đồng phẳng để tìm giao điểm ngoại cảnh.'],
    selfChoice: false, timelineKey: 'gateD78'
  },
  {
    key: '11-18-134', grade: 11, week: 18, period: 134,
    title: 'Kiểm tra cuối HK1: Đề minh họa HK1 Phần trắc nghiệm nhiều lựa chọn', kind: 'practice', lessonType: 'practice',
    focus: 'Khảo sát 12 câu trắc nghiệm 4 phương án: Phân bổ thời gian, kỹ năng Casio và chống sai sót',
    formulas: ['\\text{Điểm trắc nghiệm: 12 câu } \\times 0,25đ = 3,0đ'],
    boardKnowledge: 'Chiến thuật Phần I (3 điểm - 12 câu): Thời gian làm bài lý tưởng 15 phút. 1. Câu hỏi nhận biết (1-4): 30s/câu; 2. Câu thông hiểu (5-8): Casio kiểm tra nghiệm và giới hạn; 3. Câu vận dụng (9-12): 2 phút/câu; 4. Tô ngay vào phiếu thi.',
    examples: [
      { question: 'Tập xác định của hàm số y = \\tan x là gì?', solution: 'D = R \\ {\\pi/2 + k\\pi, k ∈ Z}.' },
      { question: 'Tính giới hạn dãy số: \\lim (2n + 1)/(3n - 2) bằng bao nhiêu?', solution: 'Bằng 2/3.' }
    ],
    exercises: [
      { level: 'NB', question: 'Công thức tính số hạng thứ n của cấp số cộng u1 và công sai d là gì?', answer: 'un = u1 + (n - 1)d.' },
      { level: 'NB', question: 'Góc giữa hai đường thẳng trong không gian có thể nhận giá trị từ bao nhiêu độ đến bao nhiêu độ?', answer: 'Từ 0° đến 90°.' },
      { level: 'TH', question: 'Bấm máy tính tìm giá trị của biểu thức P = \\log_2 8 + \\log_3 9.', answer: '3 + 2 = 5.' },
      { level: 'TH', question: 'Tìm nghiệm của phương trình 2^x = 16.', answer: 'x = 4.' },
      { level: 'VD', question: 'Kỹ thuật dùng phím CALC giải nhanh phương trình lượng giác bằng cách thế các giá trị nghiệm ở phương án.', answer: 'Nhập vế trái trừ vế phải, bấm CALC các giá trị phương án, nếu bằng 0 là nghiệm.' },
      { level: 'VD', question: 'Chiến thuật làm bài: Xử lý các câu hỏi lý thuyết hình học không gian bằng mô hình phòng học thực tế.', answer: 'Dùng các cạnh tường, góc nhà và sàn phòng học để kiểm chứng quan hệ song song.' }
    ],
    quick: [
      { question: 'Tại sao cần kiểm tra chế độ Radian khi làm bài thi lượng giác trên máy tính?', solution: 'Vì hầu hết các góc trong đề thi toán lớp 11 đều được cho dưới đơn vị Radian.' },
      { question: 'Khi gặp một câu hỏi trắc nghiệm tính toán quá dài, phương án tối ưu là gì?', solution: 'Tạm đánh dấu đề thi, làm các câu khác trước rồi quay lại giải quyết sau.' }
    ],
    mistakes: ['Tô nhầm dòng câu hỏi trên phiếu trắc nghiệm.', 'Để máy tính ở chế độ DEG khi giải phương trình lượng giác chứa pi.', 'Bỏ sót điều kiện xác định của hàm số tan và cot.'],
    selfChoice: false, timelineKey: 'gateD78'
  },
  {
    key: '11-18-135', grade: 11, week: 18, period: 135,
    title: 'Kiểm tra cuối HK1: Đề minh họa HK1 Phần đúng sai và trả lời ngắn', kind: 'practice', lessonType: 'practice',
    focus: 'Khảo sát 4 câu Đúng/Sai (16 ý phân hóa) và 6 câu trả lời ngắn: Chiến thuật kiểm soát độ chính xác tuyệt đối',
    formulas: ['\\text{Đúng/Sai: 1 ý: 0,1đ; 2 ý: 0,25đ; 3 ý: 0,5đ; 4 ý: 1,0đ}'],
    boardKnowledge: 'Chiến thuật Phần II & III: 1. Đúng/Sai: Phân tích tính liên kết chuỗi mệnh đề a -> b -> c -> d; 2. Trả lời ngắn: Điền số nguyên hoặc số thập phân theo đúng quy định, không kèm chữ hoặc đơn vị.',
    examples: [
      { question: 'Cho cấp số cộng (un) có u1 = 1, d = 2. Xét tính Đúng/Sai: a) u2 = 3; b) u5 = 9; c) S10 = 100; d) Số 2025 là số hạng của dãy.', solution: 'a) 1+2=3 ĐÚNG; b) 1+4(2)=9 ĐÚNG; c) 10(2+9*2)/2=100 ĐÚNG; d) un lẻ, 2025 lẻ: 1+(n-1)2=2025 ⇒ n=1013 ∈ N* ĐÚNG.' },
      { question: 'Câu trả lời ngắn: Tính giới hạn L = \\lim_{x \\to 3} (x^2 - 9)/(x - 3). Điền kết quả vào phiếu trả lời.', solution: 'L = \\lim (x + 3) = 6. Điền số 6.' }
    ],
    exercises: [
      { level: 'NB', question: 'Phần trả lời ngắn trong đề thi Toán gồm bao nhiêu câu hỏi?', answer: 'Gồm 6 câu hỏi (mỗi câu 0,5 điểm, tổng 3 điểm).' },
      { level: 'NB', question: 'Có được điền phân số chưa tối giản vào ô trả lời ngắn không?', answer: 'Nên rút gọn phân số về tối giản hoặc đổi thành số thập phân theo quy định hướng dẫn của đề.' },
      { level: 'TH', question: 'Xét tính Đúng/Sai: "Hàm số y = x^3 - 3x liên tục trên toàn bộ tập số thực R".', answer: 'ĐÚNG.' },
      { level: 'TH', question: 'Điền đáp số câu trả lời ngắn: Cho hình chóp S.ABCD đáy là hình bình hành. Có bao nhiêu cặp cạnh đối diện của đáy song song với nhau?', answer: '2.' },
      { level: 'VD', question: 'Chiến thuật giải câu hỏi tài chính lãi kép trong phần Đúng/Sai.', answer: 'Ý a tính tiền sau 1 năm, ý b lập công thức n năm, ý c giải bất phương trình tìm số năm, ý d so sánh hai ngân hàng.' },
      { level: 'VD', question: 'Kỹ năng rà soát phiếu trả lời: Kiểm tra kỹ định dạng số âm và số thập phân trong phần trả lời ngắn.', answer: 'Tô đúng cột dấu trừ nếu âm, tô đúng vị trí dấu chấm hoặc dấu phẩy phân cách phần thập phân.' }
    ],
    quick: [
      { question: 'Tại sao phần Đúng/Sai đòi hỏi phải giải quyết trọn vẹn cả 4 ý?', solution: 'Vì điểm số tăng vọt khi đúng cả 4 ý (từ 0,5 lên 1,0 điểm).' },
      { question: 'Có bao giờ được để trống ô trả lời ngắn không?', solution: 'Nếu không giải được vẫn nên ước lượng một con số hợp lý dựa vào dữ kiện bài toán.' }
    ],
    mistakes: ['Tô lệch cột Đúng/Sai trên phiếu trả lời phần II.', 'Ghi thêm chữ hoặc ký hiệu đơn vị vào ô trả lời ngắn phần III.', 'Làm tròn số sai yêu cầu đề bài.'],
    selfChoice: false, timelineKey: 'gateD78'
  },
  {
    key: '11-18-136', grade: 11, week: 18, period: 136,
    title: 'Tự chọn: Chữa đề kiểm tra cuối HK1 và phân tích bẫy đề thi', kind: 'practice', lessonType: 'practice',
    focus: 'Phân tích các bẫy trắc nghiệm phổ biến: Giới hạn âm vô cực, nghiệm ngoại lai lượng giác và thiết diện hình chóp',
    formulas: ['\\text{Bẫy đề thi: Chú ý dấu âm của căn thức, chu kỳ lượng giác, mặt phẳng cắt}'],
    boardKnowledge: 'Danh mục bẫy kinh điển Toán 11 HK1: 1. Đưa x ra khỏi căn tại âm vô cực quên dấu trừ; 2. Giải phương trình lượng giác quên họ nghiệm bù; 3. Tính tổng cấp số nhân quên mũ n; 4. Tìm giao tuyến hai mặt phẳng nhầm đường không cắt nhau.',
    examples: [
      { question: 'Bẫy tính giới hạn \\lim_{x \\to -\\infty} \\sqrt{x^2 + 1}: Học sinh viết x\\sqrt{1 + 1/x^2} = -\\infty.', solution: 'Sai lầm: Căn bậc hai luôn dương, kết quả đúng phải là +\\infty (vì \\sqrt{x^2} = -x > 0 khi x < 0).' },
      { question: 'Bẫy phương trình \\sin x = 0: Học sinh viết nghiệm x = k2\\pi.', solution: 'Sai lầm: Nghiệm đúng là x = k\\pi (k ∈ Z), viết k2\\pi làm mất một nửa số điểm biểu diễn trên đường tròn.' }
    ],
    exercises: [
      { level: 'NB', question: 'Tại sao việc phân tích bẫy đề thi giúp học sinh nâng cao điểm số nhanh chóng?', answer: 'Giúp chuyển hóa các lỗi sai vô thức thành sự cảnh giác có chủ đích trong phòng thi.' },
      { level: 'NB', question: 'Khi x tiến về âm vô cực thì biểu thức \\sqrt{4x^2} bằng bao nhiêu?', answer: 'Bằng -2x (vì x âm nên |2x| = -2x).' },
      { level: 'TH', question: 'Chỉ ra lỗi sai: "Hai đường thẳng cùng song song với mặt phẳng thứ ba thì song song với nhau".', answer: 'Sai, vì hai đường thẳng đó có thể cắt nhau hoặc chéo nhau.' },
      { level: 'TH', question: 'Chỉ ra lỗi sai trong công thức tổng cấp số nhân: Sn = u1(1 - q^(n-1))/(1 - q).', answer: 'Sai số mũ: công thức đúng là q^n chứ không phải q^(n-1).' },
      { level: 'VD', question: 'Phân tích vì sao học sinh hay mất điểm ở câu hỏi hình không gian tìm thiết diện qua trọng tâm.', answer: 'Thường do kẻ đường thẳng song song nhưng nhầm mặt phẳng hoặc không chứng minh tỉ số song song.' },
      { level: 'VD', question: 'Lập bảng đối chiếu các cặp công thức dễ gây nhầm lẫn trong chương trình Toán 11 HK1.', answer: 'Đối chiếu cấp số cộng và cấp số nhân; đối chiếu công thức sin và cos; đối chiếu giới hạn tại điểm và ở vô cực.' }
    ],
    quick: [
      { question: 'Cách đơn giản nhất để kiểm tra lại một giới hạn nghi ngờ bị bẫy dấu âm là gì?', solution: 'Bấm máy tính Casio CALC x = -10^6 để xem giá trị kết quả dương hay âm.' },
      { question: 'Làm thế nào để tránh nhầm lẫn giữa chu kỳ của hàm sin và hàm tan?', solution: 'Ghi nhớ sin/cos đi hết 1 vòng tròn 2π, tan/cot đối xứng qua tâm nên chỉ cần nửa vòng π.' }
    ],
    mistakes: ['Không kiểm tra lại kết quả Casio với suy luận tự luận.', 'Quên chia cho n trong công thức tính số hạng của dãy.', 'Chủ quan với các câu hỏi lý thuyết mệnh đề đúng sai.'],
    selfChoice: true, timelineKey: 'gateD78'
  },
  {
    key: '11-18-137', grade: 11, week: 18, period: 137,
    title: 'Tự chọn: Tổng kết kiến thức trọng tâm Toán 11 học kỳ 1', kind: 'practice', lessonType: 'practice',
    focus: 'Hệ thống hóa toàn bộ kiến thức Toán 11 HK1, sơ đồ liên kết giữa Giải tích và Hình học không gian',
    formulas: ['\\text{Mindmap 11 HK1: Lượng giác - Dãy số - Giới hạn - Quan hệ song song - Mẫu ghép nhóm}'],
    boardKnowledge: 'Toàn cảnh Toán 11 HK1: 1. Hàm số & PT lượng giác; 2. Dãy số, CSC, CSN; 3. Giới hạn & Hàm liên tục; 4. Hình không gian quan hệ song song; 5. Các số đặc trưng đo xu thế trung tâm mẫu ghép nhóm.',
    examples: [
      { question: 'Mối liên hệ giữa Giới hạn dãy số và Đạo hàm (học ở HK2) là gì?', solution: 'Giới hạn là nền tảng trực tiếp để định nghĩa khái niệm đạo hàm của hàm số tại một điểm.' },
      { question: 'Quan hệ song song ở HK1 chuẩn bị gì cho HK2?', solution: 'Là tiền đề bắt buộc để học quan hệ vuông góc (đường vuông góc mặt, hai mặt vuông góc) và tính khoảng cách, góc trong không gian.' }
    ],
    exercises: [
      { level: 'NB', question: 'Nêu 5 chuyên đề trọng tâm của môn Toán 11 trong học kỳ 1.', answer: '1. Hàm số lượng giác; 2. Dãy số - CSC - CSN; 3. Giới hạn - Hàm liên tục; 4. Hình không gian quan hệ song song; 5. Thống kê ghép nhóm.' },
      { level: 'NB', question: 'Tứ phân vị của mẫu số liệu ghép nhóm gồm những giá trị nào?', answer: 'Q1 (tứ phân vị thứ nhất), Q2 (trung vị), Q3 (tứ phân vị thứ ba).' },
      { level: 'TH', question: 'Nêu công thức tính số trung bình của mẫu số liệu ghép nhóm.', answer: 'x̄ = (1/n) ∑ mi ci (tổng tích tần số nhân giá trị đại diện chia cỡ mẫu).' },
      { level: 'TH', question: 'Nêu định lý giao tuyến của ba mặt phẳng.', answer: 'Ba mặt phẳng cắt nhau từng đôi một thì ba giao tuyến hoặc đôi một song song hoặc đồng quy tại một điểm.' },
      { level: 'VD', question: 'Xây dựng kế hoạch ôn tập chuyển tiếp từ học kỳ 1 sang học kỳ 2 môn Toán 11.', answer: 'Ôn tập chắc giới hạn để học đạo hàm; củng cố hình không gian để học quan hệ vuông góc và góc khoảng cách.' },
      { level: 'VD', question: 'Vận dụng kiến thức dãy số cấp số nhân vào việc lập kế hoạch tiết kiệm tài chính cá nhân.', answer: 'Mô hình hóa số tiền tiết kiệm hàng tháng theo cấp số nhân để dự báo tài chính tương lai.' }
    ],
    quick: [
      { question: 'Tại sao việc hiểu bản chất giới hạn lại quyết định việc học tốt giải tích lớp 12?', solution: 'Vì toàn bộ giải tích lớp 12 (đạo hàm, tích phân, tiệm cận) đều xây dựng trên khái niệm giới hạn.' },
      { question: 'Hình học không gian lớp 11 khác biệt căn bản gì so với hình học phẳng lớp 10?', solution: 'Mở rộng thêm chiều không gian thứ ba, xuất hiện quan hệ chéo nhau giữa hai đường thẳng.' }
    ],
    mistakes: ['Bỏ quên việc ôn tập các công thức lượng giác cơ bản khi sang học kỳ 2.', 'Chưa nắm vững cách xác định thiết diện hình không gian.', 'Học đối phó thi cử mà không xây dựng nền tảng cho lớp 12.'],
    selfChoice: true, timelineKey: 'gateD78'
  }
];

fs.writeFileSync('tasks/g11_w18_specs.json', JSON.stringify(G11_W18, null, 2));
console.log('G11 W18 written:', G11_W18.length);

const fs = require('fs');

const G10_W18 = [
  {
    key: '10-18-136', grade: 10, week: 18, period: 136,
    title: 'Ôn tập HK1: Phương pháp giải hệ phương trình và toán thực tế', kind: 'practice', lessonType: 'practice',
    focus: 'Hệ phương trình bậc nhất ba ẩn, hệ gồm phương trình bậc nhất và bậc hai, bài toán kinh tế và cân bằng hoá học',
    formulas: ['\\begin{cases} a_1 x + b_1 y + c_1 z = d_1 \\\\ a_2 x + b_2 y + c_2 z = d_2 \\\\ a_3 x + b_3 y + c_3 z = d_3 \\end{cases}', '\\text{Phương pháp thế, cộng đại số}'],
    boardKnowledge: 'Toàn cảnh Hệ phương trình: 1. Hệ bậc nhất ba ẩn: Dùng phương pháp khử Gauss hoặc máy tính Casio Menu 9-1-3; 2. Hệ bậc nhất và bậc hai: Rút ẩn bậc nhất thế vào bậc hai; 3. Ứng dụng: Cân bằng phản ứng, phân bổ nguồn vốn.',
    examples: [
      { question: 'Giải hệ phương trình ba ẩn: x + y + z = 6; 2x - y + z = 3; x + 2y - z = 2.', solution: 'Bấm Casio Menu 9-1-3 hoặc cộng khử ẩn: Ra nghiệm duy nhất (x; y; z) = (1; 2; 3).' },
      { question: 'Giải hệ gồm một phương trình bậc nhất và một bậc hai: x + y = 5 và x^2 + y^2 = 13.', solution: 'Thế y = 5 - x vào phương trình hai: x^2 + (5 - x)^2 = 13 ⇔ 2x^2 - 10x + 12 = 0 ⇔ x = 2 hoặc x = 3. Nghiệm hệ là (2; 3) và (3; 2).' }
    ],
    exercises: [
      { level: 'NB', question: 'Hệ phương trình bậc nhất ba ẩn dạng tam giác có thể giải nhanh bằng phương pháp nào?', answer: 'Phương pháp thế ngược từ phương trình cuối lên phương trình đầu.' },
      { level: 'NB', question: 'Số nghiệm tối đa của một hệ phương trình bậc nhất ba ẩn có thể là bao nhiêu?', answer: 'Có thể vô nghiệm, nghiệm duy nhất, hoặc vô số nghiệm.' },
      { level: 'TH', question: 'Giải hệ phương trình: x + y = 7 và x·y = 12.', answer: 'x và y là nghiệm của t^2 - 7t + 12 = 0 ⇒ nghiệm là (3; 4) và (4; 3).' },
      { level: 'TH', question: 'Cân bằng phương trình hoá học Fe + O2 -> Fe3O4 bằng cách lập hệ ba ẩn số tỉ lệ.', answer: 'Hệ số tương ứng là 3Fe + 2O2 -> Fe3O4 (tỉ lệ 3 : 2 : 1).' },
      { level: 'VD', question: 'Một trang trại nuôi bò, dê và ngựa tổng cộng 100 con. Số dê gấp đôi số bò, số ngựa bằng một nửa tổng số bò và dê. Tìm số con mỗi loại.', answer: 'Gọi x, y, z là số bò, dê, ngựa: x + y + z = 100; y = 2x; z = (x+y)/2. Giải ra: 20 bò, 40 dê, 40 ngựa (loại do tổng 100: x=22,22 -> chỉnh tỉ lệ nguyên: 20 bò, 40 dê, 30 ngựa).' },
      { level: 'VD', question: 'Một cửa hàng bán ba loại sản phẩm A, B, C thu về 30 triệu đồng với các số lượng bán khác nhau. Lập hệ giải số lượng bán tối ưu.', answer: 'Thiết lập hệ phương trình doanh thu và chi phí, khử Gauss tìm nghiệm nguyên dương.' }
    ],
    quick: [
      { question: 'Khi nào một hệ phương trình bậc nhất ba ẩn có vô số nghiệm?', solution: 'Khi định thức các hệ số triệt tiêu và các phương trình phụ thuộc tuyến tính lẫn nhau.' },
      { question: 'Ưu điểm lớn nhất của phương pháp thế trong hệ phi tuyến là gì?', solution: 'Giúp hạ bậc và giảm số lượng ẩn số của hệ phương trình.' }
    ],
    mistakes: ['Bấm nhầm thứ tự các hệ số a, b, c, d vào máy tính bỏ túi.', 'Quên thử lại nghiệm khi dùng phép biến đổi hệ quả trong hệ phi tuyến.', 'Nhầm lẫn giữa hệ phương trình tương đương và hệ phương trình hệ quả.'],
    selfChoice: false, timelineKey: 'gateD78'
  },
  {
    key: '10-18-137', grade: 10, week: 18, period: 137,
    title: 'Ôn tập HK1: Tọa độ vectơ và bài toán hình học phẳng Oxy', kind: 'practice', lessonType: 'practice',
    focus: 'Tọa độ điểm, vectơ, trọng tâm, trực tâm, tâm đường tròn ngoại tiếp tam giác và bài toán đối xứng trong Oxy',
    formulas: ['\\vec{u} = (x_2 - x_1; y_2 - y_1)', 'I = \\left(\\frac{x_A+x_B}{2}; \\frac{y_A+y_B}{2}\\right)', 'G = \\left(\\frac{x_A+x_B+x_C}{3}; \\frac{y_A+y_B+y_C}{3}\\right)'],
    boardKnowledge: 'Toàn cảnh Tọa độ Oxy: 1. Biểu diễn vectơ; 2. Tọa độ trung điểm, trọng tâm; 3. Hai vectơ cùng phương, vuông góc; 4. Tìm tọa độ điểm thoả mãn tính chất hình bình hành, trực tâm, tâm ngoại tiếp.',
    examples: [
      { question: 'Cho A(1; 3), B(-2; 5), C(4; 1). Tìm tọa độ đỉnh D sao cho tứ giác ABCD là hình bình hành.', solution: 'ABCD là hình bình hành ⇔ \\vec{AB} = \\vec{DC}. \\vec{AB} = (-3; 2). D(xD; yD) ⇒ (4 - xD; 1 - yD) = (-3; 2) ⇒ D(7; -1).' },
      { question: 'Cho tam giác ABC có A(2; 1), B(-1; -2), C(5; 6). Tìm tọa độ trọng tâm G của tam giác ABC.', solution: 'xG = (2 - 1 + 5)/3 = 2; yG = (1 - 2 + 6)/3 = 5/3. Vậy G(2; 5/3).' }
    ],
    exercises: [
      { level: 'NB', question: 'Công thức tọa độ của vectơ tổng \\vec{u} + \\vec{v} được tính như thế nào?', answer: '(x1 + x2; y1 + y2).' },
      { level: 'NB', question: 'Vectơ \\vec{i} và \\vec{j} trong hệ trục Oxy có độ dài bằng bao nhiêu?', answer: 'Cả hai đều có độ dài bằng 1 (vectơ đơn vị).' },
      { level: 'TH', question: 'Cho A(1; 2) và B(5; 8). Tìm tọa độ trung điểm I của đoạn thẳng AB.', answer: 'I(3; 5).' },
      { level: 'TH', question: 'Tìm tọa độ điểm M đối xứng với điểm A(3; -4) qua trục tung Oy.', answer: 'M(-3; -4) (đổi dấu hoành độ, giữ nguyên tung độ).' },
      { level: 'VD', question: 'Cho tam giác ABC có A(1; 1), B(4; 2), C(2; 4). Tìm tọa độ trực tâm H của tam giác ABC.', answer: 'Lập hệ điều kiện AH ⊥ BC và BH ⊥ AC thông qua tích vô hướng bằng 0: giải ra H(3; 3).' },
      { level: 'VD', question: 'Tìm tọa độ điểm M trên trục hoành Ox sao cho tam giác MAB cân tại M với A(1; 2) và B(3; 4).', answer: 'M(x; 0). MA^2 = MB^2 ⇔ (x - 1)^2 + 4 = (x - 3)^2 + 16 ⇔ -2x + 5 = -6x + 25 ⇔ 4x = 20 ⇔ x = 5. Vậy M(5; 0).' }
    ],
    quick: [
      { question: 'Tứ giác ABCD là hình bình hành tương đương đẳng thức vectơ nào?', solution: '\\vec{AB} = \\vec{DC} (chú ý đúng thứ tự đỉnh C và D).' },
      { question: 'Điểm M thuộc trục hoành Ox thì tung độ y bằng bao nhiêu?', solution: 'y = 0.' }
    ],
    mistakes: ['Viết nhầm đẳng thức hình bình hành \\vec{AB} = \\vec{CD} làm sai dấu tọa độ đỉnh D.', 'Cộng tọa độ 3 đỉnh chia 2 thay vì chia 3 khi tính trọng tâm.', 'Nhầm lẫn giữa trục hoành Ox (y=0) và trục tung Oy (x=0).'],
    selfChoice: false, timelineKey: 'gateD78'
  },
  {
    key: '10-18-138', grade: 10, week: 18, period: 138,
    title: 'Ôn tập HK1: Thống kê mô tả và phân tích số liệu thực tế', kind: 'practice', lessonType: 'practice',
    focus: 'Số trung bình, trung vị, tứ phân vị, phương sai, độ lệch chuẩn mẫu không ghép nhóm và ứng dụng thực tiễn',
    formulas: ['\\Delta_Q = Q_3 - Q_1', 's^2 = \\frac{1}{n}\\sum (x_i - \\bar{x})^2', 's = \\sqrt{s^2}'],
    boardKnowledge: 'Toàn cảnh Thống kê 10: 1. Đo xu thế trung tâm: Trung bình x̄, Trung vị Me, Mốt Mo, Tứ phân vị Q1, Q2, Q3; 2. Đo mức độ phân tán: Khoảng biến thiên R, Khoảng tứ phân vị ΔQ, Phương sai s², Độ lệch chuẩn s.',
    examples: [
      { question: 'Cho mẫu số liệu điểm số: 5, 6, 7, 7, 8, 9, 10. Tìm số trung bình và khoảng biến thiên.', solution: 'x̄ = (5+6+7+7+8+9+10)/7 = 52/7 ≈ 7,43. Khoảng biến thiên R = 10 - 5 = 5.' },
      { question: 'Tìm tứ phân vị Q1, Q2, Q3 của mẫu số liệu: 3, 5, 7, 8, 9, 11, 13, 15.', solution: 'n = 8. Q2 = (8+9)/2 = 8,5; Nửa dưới {3, 5, 7, 8} có Q1 = (5+7)/2 = 6; Nửa trên {9, 11, 13, 15} có Q3 = (11+13)/2 = 12.' }
    ],
    exercises: [
      { level: 'NB', question: 'Mốt của mẫu số liệu thống kê là gì?', answer: 'Là giá trị có tần số xuất hiện nhiều nhất trong mẫu số liệu.' },
      { level: 'NB', question: 'Khoảng biến thiên của mẫu số liệu được định nghĩa như thế nào?', answer: 'Là hiệu số giữa giá trị lớn nhất và giá trị nhỏ nhất: R = xmax - xmin.' },
      { level: 'TH', question: 'Tính trung vị của mẫu số liệu: 12, 15, 11, 19, 14.', answer: 'Sắp xếp: 11, 12, 14, 15, 19. Số ở chính giữa là 14 ⇒ Me = 14.' },
      { level: 'TH', question: 'Tính khoảng tứ phân vị ΔQ của mẫu có Q1 = 15 và Q3 = 28.', answer: 'ΔQ = Q3 - Q1 = 28 - 15 = 13.' },
      { level: 'VD', question: 'So sánh mức độ đồng đều về năng suất lúa giữa hai giống lúa A và B có cùng năng suất trung bình nhưng sA = 0,5 tấn/ha và sB = 1,2 tấn/ha.', answer: 'Giống lúa A có năng suất ổn định, đồng đều hơn giống lúa B vì có độ lệch chuẩn nhỏ hơn.' },
      { level: 'VD', question: 'Xác định các giá trị bất thường (ngoại lai) của mẫu số liệu lương nhân viên.', answer: 'Tính Q1, Q3, ΔQ rồi kiểm tra các số liệu nằm ngoài khoảng [Q1 - 1,5ΔQ; Q3 + 1,5ΔQ].' }
    ],
    quick: [
      { question: 'Khi nào số trung vị phản ánh đại diện mẫu số liệu tốt hơn số trung bình?', solution: 'Khi mẫu số liệu có chứa các giá trị ngoại lai quá lớn hoặc quá bé.' },
      { question: 'Độ lệch chuẩn s có bao giờ nhận giá trị âm không?', solution: 'Không bao giờ, vì s là căn bậc hai số học của phương sai nên luôn s ≥ 0.' }
    ],
    mistakes: ['Không sắp xếp số liệu theo thứ tự trước khi tìm trung vị và tứ phân vị.', 'Chia nhầm cho n - 1 thay vì n trong công thức phương sai tổng thể.', 'Nhầm lẫn giữa khoảng tứ phân vị ΔQ và tứ phân vị thứ hai Q2.'],
    selfChoice: false, timelineKey: 'gateD78'
  },
  {
    key: '10-18-139', grade: 10, week: 18, period: 139,
    title: 'Ôn tập HK1: Tổng hợp kiến thức Hình học và Hệ thức lượng', kind: 'practice', lessonType: 'practice',
    focus: 'Phối hợp vectơ, tích vô hướng, hệ thức lượng, giải tam giác và ứng dụng bài toán thực tiễn tổng hợp',
    formulas: ['a^2 = b^2 + c^2 - 2bc\\cos A', '\\frac{a}{\\sin A} = 2R', 'S = \\frac{1}{2}bc\\sin A = pr'],
    boardKnowledge: 'Tổng kết Hình học HK1: 1. Định lý côsin tính cạnh và góc; 2. Định lý sin tính bán kính đường tròn ngoại tiếp R; 3. Các công thức diện tích tam giác; 4. Tích vô hướng và ứng dụng chứng minh tính vuông góc.',
    examples: [
      { question: 'Tam giác ABC có b = 6, c = 8, góc A = 60°. Tính độ dài cạnh a và diện tích tam giác.', solution: 'a^2 = 36 + 64 - 2(6)(8) cos 60° = 100 - 48 = 52 ⇒ a = \\sqrt{52} = 2\\sqrt{13}. S = 1/2 (6)(8) sin 60° = 12\\sqrt{3}.' },
      { question: 'Cho tam giác ABC có độ dài ba cạnh là 5, 12, 13. Tính bán kính đường tròn nội tiếp r.', solution: '5^2 + 12^2 = 169 = 13^2 nên tam giác vuông tại đỉnh đối diện cạnh 13. Diện tích S = 1/2 · 5 · 12 = 30. Nửa chu vi p = 15 ⇒ r = S/p = 30/15 = 2.' }
    ],
    exercises: [
      { level: 'NB', question: 'Nếu a^2 = b^2 + c^2 thì tam giác ABC là tam giác gì?', answer: 'Là tam giác vuông tại đỉnh A theo định lý Pythagore đảo.' },
      { level: 'NB', question: 'Công thức tính bán kính đường tròn nội tiếp r của tam giác qua diện tích S và nửa chu vi p là gì?', answer: 'r = S / p.' },
      { level: 'TH', question: 'Cho tam giác ABC có a = 10, góc A = 30°. Tính bán kính đường tròn ngoại tiếp R.', answer: '2R = a / sin A = 10 / sin 30° = 20 ⇒ R = 10.' },
      { level: 'TH', question: 'Tính góc giữa hai vectơ \\vec{a} và \\vec{b} biết \\vec{a}\\cdot\\vec{b} = -|\\vec{a}||\\vec{b}|.', answer: 'cos = -1 ⇒ góc bằng 180° (hai vectơ ngược hướng).' },
      { level: 'VD', question: 'Cho tam giác ABC có trọng tâm G. Chứng minh với mọi điểm M ta có: MA^2 + MB^2 + MC^2 = 3MG^2 + GA^2 + GB^2 + GC^2.', answer: 'Khai triển \\vec{MA} = \\vec{MG} + \\vec{GA} rồi bình phương vô hướng và rút gọn tổng các vectơ bằng \\vec{0}.' },
      { level: 'VD', question: 'Bài toán hoa tiêu: Một con tàu rời cảng đi theo hướng đông bắc một góc 45° với vận tốc 20 hải lý/giờ. Sau 2 giờ tàu chuyển hướng đông 60° đi tiếp 3 giờ. Tính khoảng cách từ tàu đến cảng.', answer: 'Vẽ sơ đồ hai chặng hành trình, áp dụng định lý côsin cho tam giác vị trí để tính khoảng cách.' }
    ],
    quick: [
      { question: 'Định lý côsin suy biến thành định lý Pythagore khi nào?', solution: 'Khi góc xen giữa bằng 90° (vì cos 90° = 0).' },
      { question: 'Có thể tính diện tích tam giác khi chỉ biết độ dài ba cạnh bằng công thức nào?', solution: 'Công thức Heron.' }
    ],
    mistakes: ['Nhầm công thức tính cạnh trong định lý côsin thành dấu cộng ở số hạng 2bc cos A.', 'Quên đổi đơn vị góc sang radian hoặc degree tương ứng trên máy tính.', 'Áp dụng sai định lý sin khi lấy a / cos A thay vì a / sin A.'],
    selfChoice: false, timelineKey: 'gateD78'
  },
  {
    key: '10-18-140', grade: 10, week: 18, period: 140,
    title: 'Kiểm tra cuối HK1: Đề minh họa HK1 Phần trắc nghiệm nhiều lựa chọn', kind: 'practice', lessonType: 'practice',
    focus: 'Khảo sát năng lực qua 12 câu trắc nghiệm 4 phương án: Quản lý thời gian, rà soát đáp án và kỹ năng Casio',
    formulas: ['\\text{Điểm trắc nghiệm: 12 câu } \\times 0,25đ = 3,0đ'],
    boardKnowledge: 'Chiến thuật Phần I (3 điểm): 1. Câu nhận biết (1-4): chọn đáp án trong 20 giây; 2. Câu thông hiểu (5-8): vẽ hình phác hoặc Casio CALC; 3. Câu vận dụng (9-12): giải ngắn gọn 2 phút/câu; 4. Tô phiếu cẩn thận.',
    examples: [
      { question: 'Mệnh đề phủ định của "Mọi số thực x đều có x^2 ≥ 0" là gì?', solution: 'Mệnh đề phủ định là "Tồn tại số thực x sao cho x^2 < 0".' },
      { question: 'Tìm tập xác định của hàm số y = 1/\\sqrt{x - 2}: Điều kiện x - 2 > 0 ⇔ x > 2.', solution: 'D = (2; +∞).' }
    ],
    exercises: [
      { level: 'NB', question: 'Mỗi câu hỏi trong phần trắc nghiệm nhiều lựa chọn có mấy phương án lựa chọn?', answer: 'Gồm 4 lựa chọn (A, B, C, D) với duy nhất một lựa chọn chính xác.' },
      { level: 'NB', question: 'Tổng điểm tối đa của 12 câu trắc nghiệm phần I là bao nhiêu điểm?', answer: '3,0 điểm (0,25 điểm cho mỗi câu).' },
      { level: 'TH', question: 'Kiểm tra nhanh điểm A(1; -2) có thuộc miền nghiệm của bất phương trình 2x - y + 1 > 0 không.', answer: '2(1) - (-2) + 1 = 5 > 0 (thoả mãn: điểm A thuộc miền nghiệm).' },
      { level: 'TH', question: 'Tìm tọa độ đỉnh của parabol y = x^2 - 4x + 3.', answer: 'x = -b/(2a) = 2; y = 4 - 8 + 3 = -1 ⇒ đỉnh I(2; -1).' },
      { level: 'VD', question: 'Kỹ thuật dùng phím CALC loại trừ 3 phương án sai trong câu hỏi tìm m để phương trình có nghiệm.', answer: 'Thế giá trị m đặc biệt từ các đáp án vào phương trình rồi kiểm tra số nghiệm.' },
      { level: 'VD', question: 'Chiến lược phân bổ 15 phút đầu giờ: Xử lý dứt điểm 12 câu hỏi trắc nghiệm nhiều lựa chọn.', answer: 'Đọc kỹ từ khoá đề bài, giải quyết tuần tự và tô ngay đáp án vào phiếu trắc nghiệm.' }
    ],
    quick: [
      { question: 'Tại sao không nên để trống bất kỳ câu trắc nghiệm nhiều lựa chọn nào?', solution: 'Vì mỗi câu đều có 25% cơ hội trúng ngẫu nhiên nếu không biết cách giải.' },
      { question: 'Khi đề hỏi mệnh đề nào SAI, ta nên lưu ý điều gì?', solution: 'Gạch chân từ SAI để không khoanh nhầm mệnh đề ĐÚNG đầu tiên nhìn thấy.' }
    ],
    mistakes: ['Tô lệch dòng số thứ tự câu hỏi trên phiếu trả lời.', 'Bỏ qua điều kiện mẫu thức khác không khi tìm tập xác định.', 'Đọc lướt bỏ sót từ phủ định trong câu hỏi.'],
    selfChoice: false, timelineKey: 'gateD78'
  },
  {
    key: '10-18-141', grade: 10, week: 18, period: 141,
    title: 'Kiểm tra cuối HK1: Đề minh họa HK1 Phần đúng sai và tự luận', kind: 'practice', lessonType: 'practice',
    focus: 'Khảo sát năng lực qua 4 câu Đúng/Sai (16 ý phân hóa) và các bài toán tự luận vận dụng thực tiễn',
    formulas: ['\\text{Đúng/Sai: 1 ý: 0,1đ; 2 ý: 0,25đ; 3 ý: 0,5đ; 4 ý: 1,0đ}'],
    boardKnowledge: 'Chiến thuật Phần II & Tự luận: 1. Phần Đúng/Sai: Phân tích kỹ từng khẳng định nhỏ; 2. Phần Tự luận/Trả lời ngắn: Trình bày logic, đủ các bước lập luận, không viết tắt, kết luận có đơn vị.',
    examples: [
      { question: 'Cho tam giác ABC có a = 7, b = 8, c = 9. Xét tính Đúng/Sai: a) Nửa chu vi p = 12; b) Diện tích S = 12\\sqrt{5}; c) Bán kính R = 21\\sqrt{5}/10; d) Tam giác ABC có góc tù.', solution: 'p = 12 (ĐÚNG); S = 12\\sqrt{5} (ĐÚNG); R = 21\\sqrt{5}/10 (ĐÚNG); d) cos A > 0, cos B > 0, cos C > 0 ⇒ tam giác nhọn (SAI).' },
      { question: 'Tự luận: Giải phương trình \\sqrt{3x^2 - 9x + 1} = x - 2.', solution: 'Điều kiện x ≥ 2. Bình phương: 3x^2 - 9x + 1 = x^2 - 4x + 4 ⇔ 2x^2 - 5x - 3 = 0 ⇔ x = 3 hoặc x = -1/2. Đối chiếu điều kiện loại x = -1/2, nhận x = 3.' }
    ],
    exercises: [
      { level: 'NB', question: 'Trong câu hỏi trắc nghiệm Đúng/Sai, nếu làm đúng cả 4 ý thì đạt được bao nhiêu điểm?', answer: '1,0 điểm trọn vẹn.' },
      { level: 'NB', question: 'Lời giải tự luận Toán cần đảm bảo những yêu cầu cốt lõi nào?', answer: 'Đầy đủ điều kiện xác định, lập luận logic, các phép biến đổi chuẩn xác và kết luận nghiệm rõ ràng.' },
      { level: 'TH', question: 'Xét tính Đúng/Sai: "Hàm số y = ax^2 + bx + c có trục đối xứng là đường thẳng x = -b/(2a)".', answer: 'ĐÚNG.' },
      { level: 'TH', question: 'Tự luận ngắn: Tìm tọa độ vectơ \\vec{AB} biết A(-1; 4) và B(3; -2).', answer: '\\vec{AB} = (3 - (-1); -2 - 4) = (4; -6).' },
      { level: 'VD', question: 'Chiến thuật phân tích chuỗi liên đới 4 ý trong một câu hỏi Đúng/Sai về tam thức bậc hai.', answer: 'Ý a tính nghiệm, ý b xét dấu, ý c tìm m để luôn dương, ý d áp dụng bài toán thực tế.' },
      { level: 'VD', question: 'Trình bày bài toán thực tế tối ưu hóa chi phí sản xuất bằng phương pháp lập mô hình hàm bậc hai.', answer: 'Chọn ẩn x, lập hàm chi phí C(x), tìm đỉnh parabol để xác định giá trị nhỏ nhất của chi phí.' }
    ],
    quick: [
      { question: 'Tại sao cần kiểm tra lại điều kiện nghiệm ở bước kết luận bài toán tự luận?', solution: 'Để loại bỏ các nghiệm ngoại lai sinh ra trong quá trình biến đổi hệ quả.' },
      { question: 'Nếu chỉ chắc chắn 3 ý trong câu Đúng/Sai thì ý thứ 4 nên làm gì?', solution: 'Vẫn đưa ra phán đoán logic để hoàn thành, tuyệt đối không bỏ trống.' }
    ],
    mistakes: ['Quên ghi kết luận nghiệm ở cuối bài toán tự luận.', 'Tô nhầm ô Đúng thành ô Sai trên phiếu trả lời phần II.', 'Thiếu điều kiện có nghĩa của căn thức hoặc phân thức.'],
    selfChoice: false, timelineKey: 'gateD78'
  },
  {
    key: '10-18-142', grade: 10, week: 18, period: 142,
    title: 'Tự chọn: Chữa đề và khắc phục sai sót thường gặp HK1', kind: 'practice', lessonType: 'practice',
    focus: 'Phân tích các lỗi sai kinh điển trong đề thi học kỳ 1: Điều kiện ẩn, phép bình phương, chia mẫu và đọc đồ thị',
    formulas: ['\\text{Sổ tay sai sót: Ghi nhận lỗi sai - Nguyên nhân - Cách khắc phục}'],
    boardKnowledge: 'Danh mục sai sót điển hình HK1: 1. Bình phương không đặt điều kiện vế phải; 2. Bỏ qua trường hợp a = 0 khi chứa tham số; 3. Lấy nhầm góc tù thành nhọn khi cos âm; 4. Nhầm công thức trọng tâm và trung điểm.',
    examples: [
      { question: 'Lỗi sai khi giải \\sqrt{x - 1} = x - 3: Học sinh bình phương ra x = 2 và x = 5 rồi nhận cả hai nghiệm.', solution: 'Sai lầm do thiếu x - 3 ≥ 0 ⇔ x ≥ 3. Nghiệm x = 2 bị loại, chỉ nhận x = 5.' },
      { question: 'Lỗi sai khi tính cos góc A: cos A = -0,5 học sinh suy ra A = 60°.', solution: 'Sai lầm: cos mang giá trị âm thì góc phải là góc tù: A = 180° - 60° = 120°.' }
    ],
    exercises: [
      { level: 'NB', question: 'Tại sao việc lập sổ tay ghi nhận lỗi sai lại quan trọng trong học tập môn Toán?', answer: 'Giúp học sinh nhận diện các bẫy đề thi và không lặp lại lỗi sai tương tự trong các kỳ thi chính thức.' },
      { level: 'NB', question: 'Khi giải phương trình quy về bậc hai, bước nào giúp đảm bảo không nhận nghiệm ngoại lai?', answer: 'Bước đặt điều kiện tương đương hoặc bước thử lại nghiệm vào phương trình gốc.' },
      { level: 'TH', question: 'Chỉ ra lỗi sai trong biến đổi: x^2 > 4 ⇔ x > 2.', answer: 'Thiếu trường hợp số âm: nghiệm đúng là x > 2 hoặc x < -2.' },
      { level: 'TH', question: 'Chỉ ra lỗi sai: Điểm M đối xứng A(2; 3) qua gốc O là M(2; -3).', answer: 'Sai, đối xứng qua gốc O phải đổi dấu cả hai tọa độ: M(-2; -3).' },
      { level: 'VD', question: 'Phân tích nguyên nhân học sinh mất điểm ở câu hỏi tìm m để tam thức f(x) > 0 với mọi x.', answer: 'Học sinh thường quên xét trường hợp hệ số a = 0 và nhầm lẫn điều kiện Δ < 0 thành Δ > 0.' },
      { level: 'VD', question: 'Xây dựng checklist 5 bước tự kiểm tra bài thi Toán trước khi nộp bài.', answer: '1. Kiểm tra thông tin báo danh; 2. Soát điều kiện xác định; 3. Kiểm tra dấu âm và dấu ngoặc; 4. Thử lại nghiệm bằng Casio; 5. Soát dòng tô phiếu.' }
    ],
    quick: [
      { question: 'Làm thế nào để tránh sai sót tính toán số học trong phòng thi?', solution: 'Luôn dùng máy tính bỏ túi bấm kiểm tra lại các phép tính cộng trừ nhân chia cơ bản.' },
      { question: 'Khi nhận kết quả nghiệm lẻ phức tạp, ta nên làm gì?', solution: 'Rà soát lại từng bước biến đổi đại số trước đó để phát hiện chỗ nhầm dấu.' }
    ],
    mistakes: ['Không đọc lại bài làm trước khi nộp.', 'Xem nhẹ các câu hỏi dễ dẫn đến mất điểm đáng tiếc.', 'Chủ quan không thử lại nghiệm bằng máy tính cầm tay.'],
    selfChoice: true, timelineKey: 'gateD78'
  },
  {
    key: '10-18-143', grade: 10, week: 18, period: 143,
    title: 'Tự chọn: Tổng kết phương pháp học tập môn Toán học kỳ 1', kind: 'practice', lessonType: 'practice',
    focus: 'Hệ thống hóa bản đồ tư duy toán 10 học kỳ 1, định hướng phương pháp học tập chủ động và chuẩn bị học kỳ 2',
    formulas: ['\\text{Mindmap HK1: Mệnh đề - BPT bậc nhất - Hàm bậc hai - Hệ thức lượng - Vectơ - Thống kê}'],
    boardKnowledge: 'Bản đồ kiến thức HK1 Toán 10: 1. Đại số: Tập hợp, BPT, Hàm bậc hai, Phương trình căn thức; 2. Hình học: Hệ thức lượng tam giác, Tọa độ vectơ, Tích vô hướng; 3. Thống kê: Các số đặc trưng đo xu thế trung tâm và phân tán.',
    examples: [
      { question: 'Mối liên hệ giữa vectơ và hình học phẳng Oxy là gì?', solution: 'Vectơ là công cụ đại số hóa hình học phẳng, giúp chuyển các bài toán chứng minh hình học thành các phép toán đại số tọa độ.' },
      { question: 'Kiến thức học kỳ 1 làm nền tảng cho học kỳ 2 như thế nào?', solution: 'Vectơ làm nền tảng cho phương pháp tọa độ trong mặt phẳng (đường thẳng, đường tròn, ba đường conic); Tam thức bậc hai làm nền tảng cho giải bất phương trình và bài toán quy hoạch tuyến tính.' }
    ],
    exercises: [
      { level: 'NB', question: 'Chương trình Toán 10 học kỳ 1 gồm mấy mạch kiến thức chính theo chương trình GDPT 2018?', answer: 'Gồm 3 mạch chính: Đại số & Một số yếu tố giải tích, Hình học & Đo lường, Thống kê & Xác suất.' },
      { level: 'NB', question: 'Phương pháp vẽ sơ đồ tư duy (Mindmap) đem lại lợi ích gì trong việc ôn tập môn Toán?', answer: 'Giúp liên kết các khái niệm toán học thành mạng lưới logic trực quan và ghi nhớ sâu sắc.' },
      { level: 'TH', question: 'Nêu tên 3 định lý quan trọng nhất trong phần Hệ thức lượng tam giác lớp 10.', answer: 'Định lý côsin, định lý sin và định lý diện tích Heron.' },
      { level: 'TH', question: 'Nêu sự khác biệt giữa mẫu số liệu không ghép nhóm (lớp 10) và mẫu ghép nhóm (lớp 11, 12).', answer: 'Mẫu lớp 10 xử lý từng số liệu rời rạc cụ thể, còn mẫu ghép nhóm gom số liệu vào các nửa khoảng.' },
      { level: 'VD', question: 'Lập kế hoạch tự học môn Toán trong kỳ nghỉ giữa hai học kỳ để củng cố các mảng kiến thức yếu.', answer: 'Xác định mảng yếu qua kết quả bài thi HK1, làm lại các bài toán sai sót và đọc trước chương trình HK2.' },
      { level: 'VD', question: 'Vận dụng tư duy mô hình hóa toán học giải quyết một vấn đề thực tiễn trong cuộc sống hàng ngày.', answer: 'Mô hình hóa chi phí tiêu dùng, đường đi ngắn nhất hoặc tính toán kích thước xây dựng.' }
    ],
    quick: [
      { question: 'Chìa khóa để học giỏi môn Toán ở bậc THPT là gì?', solution: 'Hiểu sâu bản chất khái niệm, rèn luyện kỹ năng biến đổi chính xác và liên hệ thực tiễn.' },
      { question: 'Tại sao việc nắm chắc vectơ ở lớp 10 lại quyết định thành công học hình học ở lớp 12?', solution: 'Vì hệ tọa độ không gian Oxyz lớp 12 hoàn toàn phát triển trên nền tảng vectơ lớp 10.' }
    ],
    mistakes: ['Học vẹt công thức mà không hiểu bản chất và điều kiện áp dụng.', 'Bỏ rơi kiến thức hình học vectơ vì cho rằng khó hiểu.', 'Không duy trì thói quen ôn luyện đều đặn giữa hai học kỳ.'],
    selfChoice: true, timelineKey: 'gateD78'
  }
];

fs.writeFileSync('tasks/g10_w18_specs.json', JSON.stringify(G10_W18, null, 2));
console.log('G10 W18 written:', G10_W18.length);

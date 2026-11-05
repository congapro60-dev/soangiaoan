const fs = require('fs');

const G12_W18 = [
  {
    key: '12-18-130', grade: 12, week: 18, period: 130,
    title: 'Ôn tập HK1: Ứng dụng đạo hàm — Cực trị, tiệm cận và đồ thị', kind: 'practice', lessonType: 'practice',
    focus: 'Khảo sát hàm số, tính đơn điệu, cực trị, GTLN-GTNN, tiệm cận (đứng, ngang, xiên) và bài toán tương giao đồ thị',
    formulas: ["y' = 0 \\implies x_{ct}", "\\lim_{x \\to x_0} y = \\pm\\infty \\implies x = x_0 (TCĐ)", "\\lim_{x \\to \\pm\\infty} y = y_0 (TCN)", "\\lim_{x \\to \\pm\\infty} [y - (ax+b)] = 0 (TCX)"],
    boardKnowledge: "Toàn cảnh Ứng dụng Đạo hàm: 1. Đơn điệu: dấu y'; 2. Cực trị: y' đổi dấu; 3. Tiệm cận: đứng (nghiệm mẫu), ngang (bậc tử ≤ bậc mẫu), xiên (bậc tử = bậc mẫu + 1); 4. Tương giao: số nghiệm phương trình hoành độ giao điểm.",
    examples: [
      { question: 'Tìm các đường tiệm cận của đồ thị hàm số y = (2x^2 + x - 1)/(x - 1).', solution: 'Chia đa thức: y = 2x + 3 + 2/(x - 1). TCĐ là x = 1 (mẫu bằng 0, tử khác 0); TCX là y = 2x + 3.' },
      { question: 'Tìm giá trị lớn nhất và nhỏ nhất của hàm số y = x^3 - 3x^2 + 2 trên đoạn [0; 3].', solution: "y' = 3x^2 - 6x = 0 ⇔ x = 0 hoặc x = 2 (đều thuộc đoạn). y(0) = 2; y(2) = 8 - 12 + 2 = -2; y(3) = 27 - 27 + 2 = 2. Vậy Max = 2, Min = -2." }
    ],
    exercises: [
      { level: 'NB', question: 'Điều kiện để đường thẳng x = x0 là tiệm cận đứng của đồ thị hàm số y = f(x) là gì?', answer: 'Ít nhất một trong các giới hạn một bên khi x tiến về x0 bằng vô cực (+∞ hoặc -∞).' },
      { level: 'NB', question: 'Hàm số bậc ba y = ax^3 + bx^2 + cx + d có thể có tối đa bao nhiêu điểm cực trị?', answer: 'Tối đa 2 điểm cực trị (khi phương trình đạo hàm có 2 nghiệm phân biệt).' },
      { level: 'TH', question: 'Tìm tiệm cận ngang của đồ thị hàm số y = (3x - 5)/(x + 2).', answer: 'y = 3.' },
      { level: 'TH', question: 'Tìm các khoảng đồng biến của hàm số y = -x^3 + 3x.', answer: "y' = -3x^2 + 3 > 0 ⇔ -1 < x < 1. Hàm số đồng biến trên khoảng (-1; 1)." },
      { level: 'VD', question: 'Tìm m để đường thẳng y = m cắt đồ thị hàm số y = x^4 - 2x^2 tại 4 điểm phân biệt.', answer: 'Lập BBT: y có cực đại y(0)=0 và cực tiểu y(±1)=-1. Cắt tại 4 điểm khi -1 < m < 0.' },
      { level: 'VD', question: 'Một hộp sữa hình trụ có thể tích V cố định. Tìm tỉ số giữa chiều cao h và bán kính đáy r để diện tích vỏ hộp là nhỏ nhất.', answer: 'h = 2r (chiều cao bằng đường kính đáy), tỉ số h/r = 2.' }
    ],
    quick: [
      { question: 'Khi nào đồ thị hàm phân thức hữu tỉ có đường tiệm cận xiên?', solution: 'Khi bậc của đa thức tử số lớn hơn bậc của đa thức mẫu số đúng một bậc.' },
      { question: 'Tại điểm cực trị thì đạo hàm cấp một luôn luôn bằng 0 có đúng không?', solution: 'Chưa đủ, đạo hàm có thể bằng 0 hoặc không xác định, miễn là y đổi dấu khi qua điểm đó.' }
    ],
    mistakes: ['Kết luận đồng biến trên tập hợp chứa dấu hợp ∪ thay vì từng khoảng rời nhau.', 'Quên kiểm tra điều kiện nghiệm của mẫu có làm triệt tiêu tử số hay không khi tìm tiệm cận đứng.', 'Nhầm lẫn giữa điểm cực trị của hàm số (x) và giá trị cực trị (y).'],
    selfChoice: false, timelineKey: 'gateD78'
  },
  {
    key: '12-18-131', grade: 12, week: 18, period: 131,
    title: 'Ôn tập HK1: Vectơ và hệ tọa độ Oxyz trong không gian', kind: 'practice', lessonType: 'practice',
    focus: 'Tọa độ điểm, vectơ, tích có hướng, tích vô hướng, phương trình mặt phẳng, phương trình mặt cầu cơ bản',
    formulas: ['[\\vec{u}, \\vec{v}] = (y_1 z_2 - z_1 y_2; z_1 x_2 - x_1 z_2; x_1 y_2 - y_1 x_2)', '(x-a)^2 + (y-b)^2 + (z-c)^2 = R^2', '\\vec{n} = [\\vec{AB}, \\vec{AC}]'],
    boardKnowledge: 'Toàn cảnh Hình học Oxyz: 1. Vectơ và các phép toán 3 chiều; 2. Tích có hướng: vectơ vuông góc với cả hai vectơ thành phần, tính diện tích tam giác và thể tích tứ diện; 3. Mặt cầu: tâm I(a; b; c) và bán kính R.',
    examples: [
      { question: 'Cho A(1; 0; 0), B(0; 2; 0), C(0; 0; 3). Viết phương trình mặt phẳng (ABC) theo đoạn chắn.', solution: 'Phương trình mặt phẳng đoạn chắn: x/1 + y/2 + z/3 = 1 ⇔ 6x + 3y + 2z - 6 = 0.' },
      { question: 'Tìm tâm và bán kính của mặt cầu (S): x^2 + y^2 + z^2 - 2x + 4y - 6z - 2 = 0.', solution: 'Tâm I(1; -2; 3). Bán kính R = \\sqrt{1^2 + (-2)^2 + 3^2 - (-2)} = \\sqrt{1 + 4 + 9 + 2} = \\sqrt{16} = 4.' }
    ],
    exercises: [
      { level: 'NB', question: 'Phương trình mặt cầu tâm I(a; b; c) bán kính R có dạng tổng quát là gì?', answer: '(x - a)^2 + (y - b)^2 + (z - c)^2 = R^2.' },
      { level: 'NB', question: 'Tích có hướng của hai vectơ cùng phương trong không gian bằng bao nhiêu?', answer: 'Bằng vectơ-không \\vec{0} = (0; 0; 0).' },
      { level: 'TH', question: 'Cho \\vec{a} = (1; 2; 3) và \\vec{b} = (2; -1; 1). Tính tích có hướng [\\vec{a}, \\vec{b}].', answer: '(2(1) - 3(-1); 3(2) - 1(1); 1(-1) - 2(2)) = (5; 5; -5).' },
      { level: 'TH', question: 'Viết phương trình mặt cầu có tâm I(2; -1; 3) và đi qua điểm A(2; 1; 2).', answer: 'R^2 = IA^2 = 0 + 4 + 1 = 5 ⇒ (x - 2)^2 + (y + 1)^2 + (z - 3)^2 = 5.' },
      { level: 'VD', question: 'Cho ba điểm A(1; 1; 0), B(0; 2; 1), C(1; 0; 2). Tính diện tích tam giác ABC.', answer: '\\vec{AB} = (-1; 1; 1), \\vec{AC} = (0; -1; 2). [\\vec{AB}, \\vec{AC}] = (3; 2; 1). S = 1/2 |[\\vec{AB}, \\vec{AC}]| = \\sqrt{14}/2.' },
      { level: 'VD', question: 'Một chiếc máy bay không người lái định vị tại tọa độ M(100; 200; 300) (mét). Tính khoảng cách từ máy bay đến trạm radar mặt đất đặt tại gốc O.', answer: 'OM = \\sqrt{100^2 + 200^2 + 300^2} = \\sqrt{140000} = 100\\sqrt{14} ≈ 374,17 mét.' }
    ],
    quick: [
      { question: 'Mặt phẳng đi qua ba điểm trên ba trục tọa độ A(a;0;0), B(0;b;0), C(0;0;c) gọi là phương trình gì?', solution: 'Phương trình mặt phẳng theo đoạn chắn: x/a + y/b + z/c = 1.' },
      { question: 'Điều kiện để phương trình x^2 + y^2 + z^2 - 2ax - 2by - 2cz + d = 0 là phương trình mặt cầu là gì?', solution: 'a^2 + b^2 + c^2 - d > 0.' }
    ],
    mistakes: ['Nhầm công thức tích có hướng ở tọa độ y (quên dấu trừ ở định thức cấp hai).', 'Nhầm bán kính mặt cầu R thành R^2 trong phương trình chính tắc.', 'Quên đổi dấu khi xác định tọa độ tâm I từ phương trình khai triển.'],
    selfChoice: false, timelineKey: 'gateD78'
  },
  {
    key: '12-18-132', grade: 12, week: 18, period: 132,
    title: 'Ôn tập HK1: Thống kê ghép nhóm — Phân tích độ phân tán và rủi ro', kind: 'practice', lessonType: 'practice',
    focus: 'Khoảng biến thiên, khoảng tứ phân vị, phương sai, độ lệch chuẩn mẫu ghép nhóm và bài toán quản trị rủi ro',
    formulas: ['s^2 = \\frac{1}{n}\\sum m_i c_i^2 - \\bar{x}^2', 's = \\sqrt{s^2}', '\\Delta_Q = Q_3 - Q_1', 'R = x_{\\max} - x_{\\min}'],
    boardKnowledge: 'Tổng kết Thống kê ghép nhóm 12: 1. Đo mức độ phân tán: R, ΔQ, s², s; 2. Ý nghĩa thực tiễn: Độ lệch chuẩn càng nhỏ thì số liệu càng đồng đều, độ ổn định càng cao, mức độ rủi ro đầu tư càng thấp.',
    examples: [
      { question: 'Cho bảng tần số ghép nhóm thời gian làm bài của 40 học sinh có x̄ = 15 phút và s = 2,5 phút. Giải thích ý nghĩa của độ lệch chuẩn s = 2,5 phút.', solution: 'Độ lệch chuẩn 2,5 phút đo mức độ phân tán của thời gian làm bài xung quanh thời gian trung bình 15 phút. Khoảng 68% học sinh có thời gian làm bài dao động trong khoảng [12,5; 17,5] phút.' },
      { question: 'Hai danh mục đầu tư X và Y có cùng mức lợi nhuận kỳ vọng là 12%/năm, nhưng độ lệch chuẩn của X là 3% và của Y là 8%. Nhà đầu tư thận trọng nên chọn danh mục nào?', solution: 'Nên chọn danh mục X vì có độ lệch chuẩn nhỏ hơn, nghĩa là mức độ biến động lợi nhuận ít hơn, rủi ro thấp hơn.' }
    ],
    exercises: [
      { level: 'NB', question: 'Khoảng tứ phân vị của mẫu số liệu ghép nhóm được tính bằng công thức nào?', answer: 'ΔQ = Q3 - Q1.' },
      { level: 'NB', question: 'Phương sai của mẫu số liệu có thể nhận giá trị âm không?', answer: 'Không bao giờ âm (s² ≥ 0).' },
      { level: 'TH', question: 'Nếu nhân tất cả các giá trị của một mẫu số liệu ghép nhóm với số dương 3 thì độ lệch chuẩn thay đổi như thế nào?', answer: 'Độ lệch chuẩn mới gấp 3 lần độ lệch chuẩn ban đầu.' },
      { level: 'TH', question: 'Mẫu số liệu có phương sai s² = 0 khi nào?', answer: 'Khi tất cả các số liệu trong mẫu đều bằng nhau (không có sự phân tán).' },
      { level: 'VD', question: 'Tính phương sai và độ lệch chuẩn của bảng tần số ghép nhóm cân nặng 50 học sinh.', answer: 'Lập bảng tính cột ci, mi ci, mi ci^2, tính trung bình x̄ rồi suy ra s^2 và s.' },
      { level: 'VD', question: 'Đánh giá mức độ ổn định của dây chuyền đóng gói sữa tự động thông qua độ lệch chuẩn khối lượng tịnh của 100 hộp sữa mẫu.', answer: 'So sánh s với tiêu chuẩn cho phép của nhà máy (ví dụ s ≤ 0,5 gam đạt chuẩn chất lượng).' }
    ],
    quick: [
      { question: 'Tại sao trong kinh tế và tài chính người ta dùng độ lệch chuẩn để đo lường rủi ro?', solution: 'Vì độ lệch chuẩn phản ánh biên độ dao động và tính khó dự đoán của lợi nhuận tài sản.' },
      { question: 'Đại lượng nào trong thống kê không bị ảnh hưởng bởi giá trị ngoại lai?', solution: 'Khoảng tứ phân vị ΔQ và số trung vị Me.' }
    ],
    mistakes: ['Quên trừ đi x̄^2 khi tính phương sai bằng công thức rút gọn.', 'Nhầm lẫn giữa tần số của nhóm mi và giá trị đại diện ci.', 'Nhầm đơn vị đo của phương sai (bình phương đơn vị) với độ lệch chuẩn (cùng đơn vị với số liệu gốc).'],
    selfChoice: false, timelineKey: 'gateD78'
  },
  {
    key: '12-18-133', grade: 12, week: 18, period: 133,
    title: 'Ôn tập HK1: Nguyên hàm, tích phân và bài toán chuyển động thực tế', kind: 'practice', lessonType: 'practice',
    focus: 'Phương pháp đổi biến số, từng phần, công thức Newton-Leibniz, bài toán quãng đường, vận tốc và gia tốc chuyển động',
    formulas: ['s(t) = \\int v(t)dt', 'v(t) = \\int a(t)dt', '\\int_a^b v(t)dt = s(b) - s(a)', '\\int_a^b u dv = [uv]_a^b - \\int_a^b v du'],
    boardKnowledge: 'Toàn cảnh Nguyên hàm - Tích phân & Vật lý: 1. Định lý: Đạo hàm của quãng đường ra vận tốc, đạo hàm của vận tốc ra gia tốc; 2. Ngược lại: Tích phân của gia tốc ra vận tốc, tích phân của vận tốc ra quãng đường; 3. Kỹ thuật tính: Đổi biến và Từng phần.',
    examples: [
      { question: 'Một ô tô đang chạy với vận tốc 15 m/s thì người lái xe đạp phanh. Từ thời điểm đó, ô tô chuyển động chậm dần đều với gia tốc a(t) = -3 (m/s²). Tính quãng đường ô tô đi được từ lúc phanh đến khi dừng hẳn.', solution: 'v(t) = 15 - 3t. Xe dừng hẳn khi v(t) = 0 ⇔ 15 - 3t = 0 ⇔ t = 5 giây. Quãng đường s = \\int_0^5 (15 - 3t) dt = [15t - 1,5t^2]_0^5 = 75 - 37,5 = 37,5 mét.' },
      { question: 'Tính tích phân từng phần: I = \\int_0^1 (x + 1) e^x dx.', solution: 'u = x + 1, dv = e^x dx ⇒ du = dx, v = e^x. I = [(x+1)e^x]_0^1 - \\int_0^1 e^x dx = (2e - 1) - (e - 1) = e.' }
    ],
    exercises: [
      { level: 'NB', question: 'Vận tốc tức thời v(t) của một chất điểm chuyển động là đạo hàm của hàm số nào?', answer: 'Là đạo hàm của phương trình chuyển động quãng đường s(t).' },
      { level: 'NB', question: 'Nguyên hàm của hàm số e^(2x) là gì?', answer: '1/2 e^(2x) + C.' },
      { level: 'TH', question: 'Một vật chuyển động với vận tốc v(t) = 3t^2 + 1 (m/s). Tính quãng đường đi được trong 2 giây đầu tiên.', answer: 's = \\int_0^2 (3t^2 + 1) dt = [t^3 + t]_0^2 = 8 + 2 = 10 mét.' },
      { level: 'TH', question: 'Tính nguyên hàm: \\int \\sin(3x) dx.', answer: '-1/3 \\cos(3x) + C.' },
      { level: 'VD', question: 'Một quả tên lửa được phóng thẳng đứng với gia tốc a(t) = 6t (m/s²). Biết vận tốc ban đầu v(0) = 10 m/s. Tính độ cao của tên lửa sau 4 giây.', answer: 'v(t) = 3t^2 + 10. Độ cao h = \\int_0^4 (3t^2 + 10) dt = [t^3 + 10t]_0^4 = 64 + 40 = 104 mét.' },
      { level: 'VD', question: 'Tính tích phân: J = \\int_1^e x \\ln x dx bằng phương pháp từng phần.', answer: 'u = ln x, dv = x dx ⇒ du = dx/x, v = x^2/2. J = [x^2/2 ln x]_1^e - 1/2 \\int_1^e x dx = e^2/2 - [x^2/4]_1^e = e^2/2 - (e^2/4 - 1/4) = (e^2 + 1)/4.' }
    ],
    quick: [
      { question: 'Ý nghĩa hình học của tích phân \\int_a^b v(t) dt khi v(t) ≥ 0 là gì?', solution: 'Là quãng đường chất điểm di chuyển từ thời điểm t = a đến thời điểm t = b.' },
      { question: 'Nguyên hàm của hàm số lẻ f(x) có tính chất gì?', solution: 'F(x) là một hàm số chẵn (với hằng số C thích hợp).' }
    ],
    mistakes: ['Quên hệ số 1/a khi lấy nguyên hàm của hàm hợp bậc nhất như sin(ax) hoặc e^(ax).', 'Quên tìm thời điểm dừng xe v(t) = 0 trong bài toán quãng đường phanh xe.', 'Nhầm lẫn giữa vận tốc v(t) và gia tốc a(t).'],
    selfChoice: false, timelineKey: 'gateD78'
  },
  {
    key: '12-18-134', grade: 12, week: 18, period: 134,
    title: 'Ôn tập HK1: Ứng dụng hình học của tích phân — Diện tích và thể tích', kind: 'practice', lessonType: 'practice',
    focus: 'Tính diện tích hình phẳng giới hạn bởi các đường cong và thể tích khối tròn xoay quanh trục Ox',
    formulas: ['S = \\int_a^b |f(x) - g(x)| dx', 'V = \\pi \\int_a^b f^2(x) dx', 'V = \\pi \\int_a^b |f^2(x) - g^2(x)| dx'],
    boardKnowledge: 'Toàn cảnh Ứng dụng Hình học Tích phân: 1. Diện tích hình phẳng: Luôn có giá trị tuyệt đối |f(x) - g(x)|, giải phương trình tìm cận giao điểm nếu đề chưa cho; 2. Thể tích khối tròn xoay quanh Ox: Bắt buộc có nhân tử π ở đằng trước và bình phương hàm f^2(x).',
    examples: [
      { question: 'Tính diện tích hình phẳng giới hạn bởi parabol y = x^2 - 2x và trục hoành Ox.', solution: 'Phương trình hoành độ giao điểm: x^2 - 2x = 0 ⇔ x = 0 hoặc x = 2. S = \\int_0^2 |x^2 - 2x| dx = -[x^3/3 - x^2]_0^2 = -(8/3 - 4) = 4/3.' },
      { question: 'Tính thể tích khối tròn xoay sinh ra khi quay hình phẳng giới hạn bởi y = \\sqrt{x}, y = 0, x = 4 quanh trục Ox.', solution: 'V = \\pi \\int_0^4 (\\sqrt{x})^2 dx = \\pi \\int_0^4 x dx = \\pi [x^2/2]_0^4 = 8\\pi.' }
    ],
    exercises: [
      { level: 'NB', question: 'Trong công thức tính thể tích khối tròn xoay quanh trục Ox, nhân tử hằng số nào luôn xuất hiện?', answer: 'Hằng số π (pi).' },
      { level: 'NB', question: 'Diện tích hình phẳng giới hạn bởi đồ thị y = f(x) liên tục, trục Ox và hai đường thẳng x = a, x = b được tính bởi tích phân nào?', answer: 'S = \\int_a^b |f(x)| dx.' },
      { level: 'TH', question: 'Tính diện tích hình phẳng giới hạn bởi y = x^3, y = 0, x = 1, x = 2.', answer: 'S = \\int_1^2 x^3 dx = [x^4/4]_1^2 = 4 - 1/4 = 15/4.' },
      { level: 'TH', question: 'Tính thể tích khối tròn xoay khi quay hình phẳng giới hạn bởi y = 2, y = 0, x = 0, x = 3 quanh Ox.', answer: 'Khối trụ bán kính r = 2, cao h = 3: V = \\pi \\int_0^3 4 dx = 12\\pi.' },
      { level: 'VD', question: 'Tính diện tích hình phẳng giới hạn bởi hai parabol y = x^2 và y = 2 - x^2.', answer: 'Giao điểm x^2 = 2 - x^2 ⇔ x = ±1. S = \\int_{-1}^1 (2 - 2x^2) dx = [2x - 2x^3/3]_{-1}^1 = 8/3.' },
      { level: 'VD', question: 'Một cái thùng rượu gỗ có mặt cắt là đường elip quay quanh trục Ox. Thiết lập tích phân tính dung tích của thùng rượu.', answer: 'Lập phương trình nửa elip y = b\\sqrt{1 - x^2/a^2}, áp dụng V = \\pi \\int_{-h/2}^{h/2} y^2 dx để tính thể tích.' }
    ],
    quick: [
      { question: 'Tại sao khi tính diện tích hình phẳng không có giá trị tuyệt đối có thể dẫn đến kết quả bằng 0?', solution: 'Vì tích phân đại số của hàm số lẻ trên đoạn đối xứng sẽ triệt tiêu các phần diện tích đối dấu.' },
      { question: 'Thể tích khối nón có thể suy ra từ công thức tích phân khối tròn xoay nào?', solution: 'Quay đường thẳng y = (r/h)x quanh trục Ox từ x = 0 đến x = h.' }
    ],
    mistakes: ['Quên nhân tử π trong công thức tính thể tích khối tròn xoay.', 'Quên bình phương hàm số f(x) khi tính thể tích V = π ∫ f²(x)dx.', 'Không lấy giá trị tuyệt đối dẫn tới diện tích bị âm hoặc triệt tiêu bằng 0.'],
    selfChoice: false, timelineKey: 'gateD78'
  },
  {
    key: '12-18-135', grade: 12, week: 18, period: 135,
    title: 'Kiểm tra cuối HK1: Đề khảo sát chất lượng HK1 Phần trắc nghiệm nhiều lựa chọn', kind: 'practice', lessonType: 'practice',
    focus: 'Khảo sát 12 câu trắc nghiệm nhiều lựa chọn chuẩn hóa: Chiến thuật bấm Casio tốc độ cao và rà soát bẫy',
    formulas: ['\\text{Điểm trắc nghiệm: 12 câu } \\times 0,25đ = 3,0đ'],
    boardKnowledge: 'Chiến thuật Phần I Toán 12 (12 câu - 3 điểm): 1. Nhận diện hàm số & BBT: 30s/câu; 2. Đạo hàm & tích phân cơ bản: bấm máy tính kiểm tra ngay; 3. Tọa độ Oxyz: dùng công thức tính nhanh; 4. Hoàn thành trong 15-18 phút.',
    examples: [
      { question: 'Đồ thị hàm số nào có tiệm cận đứng x = 1 và tiệm cận ngang y = 2?', solution: 'Hàm số dạng y = (2x + 1)/(x - 1).' },
      { question: 'Tìm nguyên hàm của hàm số f(x) = 3x^2 + 2x: F(x) = x^3 + x^2 + C.', solution: 'F(x) = x^3 + x^2 + C.' }
    ],
    exercises: [
      { level: 'NB', question: 'Trong hệ tọa độ Oxyz, vectơ đơn vị của trục tung Oy là vectơ nào?', answer: '\\vec{j} = (0; 1; 0).' },
      { level: 'NB', question: 'Tích phân \\int_a^a f(x) dx có giá trị bằng bao nhiêu?', answer: 'Bằng 0.' },
      { level: 'TH', question: 'Bấm máy tính tính tích phân \\int_0^1 e^{2x} dx.', answer: '(e^2 - 1)/2 ≈ 3,1945.' },
      { level: 'TH', question: 'Tìm tọa độ tâm I của mặt cầu (x - 1)^2 + (y + 2)^2 + (z - 5)^2 = 9.', answer: 'I(1; -2; 5).' },
      { level: 'VD', question: 'Kỹ thuật dùng phím d/dx kết hợp CALC trên Casio để giải nhanh câu hỏi tìm nguyên hàm chứa tham số.', answer: 'Nhập d/dx(F(x)) - f(x) tại một giá trị x ngẫu nhiên, kết quả bằng 0 là hàm nguyên hàm đúng.' },
      { level: 'VD', question: 'Chiến thuật quản lý rủi ro trong phòng thi: Nhận diện câu hỏi dễ nhưng dễ sập bẫy dấu âm.', answer: 'Đặc biệt cẩn thận với tọa độ điểm đối xứng và dấu của hệ số trong tiệm cận.' }
    ],
    quick: [
      { question: 'Tại sao nên làm xong 12 câu trắc nghiệm nhiều lựa chọn đầu tiên thật nhanh?', solution: 'Để dành tối đa thời gian cho 4 câu Đúng/Sai và 6 câu trả lời ngắn đòi hỏi tư duy sâu ở phần sau.' },
      { question: 'Phím Solver trên Casio có nên dùng cho mọi phương trình không?', solution: 'Không nên, Solver tốn nhiều thời gian dò nghiệm, chỉ dùng khi phương trình phức tạp không thể nhẩm nhanh.' }
    ],
    mistakes: ['Tô nhầm dòng trên phiếu trả lời trắc nghiệm.', 'Quên dấu âm khi tìm tiệm cận đứng của hàm phân thức.', 'Bấm nhầm chế độ DEG thay vì RAD khi tính tích phân hàm lượng giác.'],
    selfChoice: false, timelineKey: 'gateD78'
  },
  {
    key: '12-18-136', grade: 12, week: 18, period: 136,
    title: 'Kiểm tra cuối HK1: Đề khảo sát chất lượng HK1 Phần đúng sai và trả lời ngắn', kind: 'practice', lessonType: 'practice',
    focus: 'Khảo sát 4 câu Đúng/Sai (16 ý phân hóa) và 6 câu trả lời ngắn: Tối ưu điểm số phân loại giỏi và xuất sắc',
    formulas: ['\\text{Đúng/Sai: 1 ý: 0,1đ; 2 ý: 0,25đ; 3 ý: 0,5đ; 4 ý: 1,0đ}'],
    boardKnowledge: 'Chiến thuật Phần II & III Toán 12: 1. Phần Đúng/Sai (4 điểm): Các ý thường thiết kế bậc thang, tận dụng kết quả ý trước giải ý sau; 2. Phần Trả lời ngắn (3 điểm): Độ chính xác tuyệt đối, làm tròn đúng yêu cầu (hàng phần mười hay phần trăm).',
    examples: [
      { question: 'Cho hàm số y = (x^2 - 2x + 2)/(x - 1). Xét tính Đúng/Sai: a) Tập xác định D = R \\ {1}; b) Đồ thị có tiệm cận đứng x = 1; c) Đồ thị có tiệm cận xiên y = x - 1; d) Điểm cực đại là (0; -2).', solution: 'Chia đa thức y = x - 1 + 1/(x - 1). a) ĐÚNG; b) ĐÚNG; c) ĐÚNG; d) y\' = 1 - 1/(x-1)^2 = 0 ⇔ x = 0 hoặc x = 2. Tại x = 0: y = -2 là cực đại ĐÚNG.' },
      { question: 'Câu trả lời ngắn: Một vật thể chuyển động có vận tốc v(t) = 6t - 2 (m/s). Tính quãng đường vật đi được trong khoảng thời gian từ t = 1 đến t = 4 giây.', solution: 's = \\int_1^4 (6t - 2) dt = [3t^2 - 2t]_1^4 = (48 - 8) - (3 - 2) = 40 - 1 = 39 mét. Điền số 39.' }
    ],
    exercises: [
      { level: 'NB', question: 'Mỗi câu trả lời ngắn làm đúng được bao nhiêu điểm trong cấu trúc đề thi mới?', answer: 'Được 0,5 điểm cho mỗi câu trả lời đúng.' },
      { level: 'NB', question: 'Trong phần trả lời ngắn, nếu đề bài không yêu cầu làm tròn thì kết quả thường là số gì?', answer: 'Là số nguyên hoặc số thập phân hữu hạn chính xác.' },
      { level: 'TH', question: 'Xét tính Đúng/Sai: "Đồ thị hàm số y = (2x - 1)/(x + 1) có tâm đối xứng là giao điểm của hai đường tiệm cận".', answer: 'ĐÚNG.' },
      { level: 'TH', question: 'Điền đáp số câu trả lời ngắn: Cho hai vectơ \\vec{a} = (1; 2; 3) và \\vec{b} = (2; -1; 0). Tính tích vô hướng \\vec{a}\\cdot\\vec{b}.', answer: '0.' },
      { level: 'VD', question: 'Chiến lược giải câu hỏi ứng dụng tích phân tính thể tích thùng chứa trong phần Đúng/Sai.', answer: 'Ý a tìm phương trình parabol đường sinh, ý b xác định cận quay, ý c lập tích phân thể tích V, ý d tính chi phí vật liệu.' },
      { level: 'VD', question: 'Kỹ thuật xử lý câu hỏi tối ưu hóa kinh tế trong phần trả lời ngắn: Doanh thu cực đại.', answer: 'Lập hàm doanh thu R(x) = x · p(x), tìm đỉnh parabol hoặc tính R\'(x) = 0 để tìm mức giá tối ưu rồi điền số vào phiếu.' }
    ],
    quick: [
      { question: 'Khi tô phiếu trả lời phần Trả lời ngắn, cần kiểm tra gì trước khi nộp bài?', solution: 'Kiểm tra dấu trừ (nếu âm) và vị trí chữ số thập phân tương ứng với từng cột.' },
      { question: 'Tại sao không nên đoán bừa đáp số ở phần trả lời ngắn?', solution: 'Vì xác suất đoán trúng số nguyên hoặc thập phân tự do gần như bằng 0, phải tính toán thực sự.' }
    ],
    mistakes: ['Tô nhầm ô Đúng/Sai trên phiếu thi phần II.', 'Ghi thêm chữ cái hoặc đơn vị tính (mét, đồng) vào khung trả lời ngắn.', 'Làm tròn sai quy cách đề bài (ví dụ đề yêu cầu hàng phần mười lại làm tròn hàng đơn vị).'],
    selfChoice: false, timelineKey: 'gateD78'
  },
  {
    key: '12-18-137', grade: 12, week: 18, period: 137,
    title: 'Tự chọn: Chữa đề thi HK1, tổng kết học kỳ 1 và định hướng HK2', kind: 'practice', lessonType: 'practice',
    focus: 'Phân tích ma trận đề thi HK1, tổng kết kiến thức trọng tâm học kỳ 1 và định hướng chiến lược ôn thi tốt nghiệp THPT',
    formulas: ['\\text{Chiến lược 12: Nắm chắc 7 điểm cơ bản -> Luyện 2 điểm phân hóa -> Bứt phá 1 điểm điểm 10}'],
    boardKnowledge: 'Toàn cảnh Toán 12 HK1: 1. Ứng dụng đạo hàm khảo sát hàm số; 2. Vectơ và tọa độ Oxyz; 3. Thống kê ghép nhóm; 4. Nguyên hàm và tích phân; 5. Định hướng HK2: Ứng dụng tích phân nâng cao, Phương trình đường thẳng và mặt phẳng Oxyz, Xác suất có điều kiện.',
    examples: [
      { question: 'Chuyên đề nào chiếm tỉ trọng điểm số lớn nhất trong đề thi tốt nghiệp THPT?', solution: 'Chuyên đề Ứng dụng đạo hàm khảo sát hàm số (thường chiếm khoảng 10-12 câu trên tổng số câu hỏi của đề thi).' },
      { question: 'Kiến thức Nguyên hàm - Tích phân học kỳ 1 sẽ được phát triển như thế nào trong học kỳ 2?', solution: 'Tiếp tục phát triển sâu hơn về các bài toán ứng dụng thực tế phức tạp và phối hợp với hình học không gian Oxyz.' }
    ],
    exercises: [
      { level: 'NB', question: 'Đề thi tốt nghiệp THPT môn Toán theo cấu trúc mới gồm tổng cộng bao nhiêu câu hỏi?', answer: 'Gồm 22 câu hỏi (12 câu trắc nghiệm 4 lựa chọn, 4 câu Đúng/Sai, 6 câu Trả lời ngắn).' },
      { level: 'NB', question: 'Tổng điểm toàn bài thi Toán là bao nhiêu và thời gian làm bài là bao nhiêu phút?', answer: '10 điểm trong thời gian 90 phút.' },
      { level: 'TH', question: 'Nêu tên 3 chuyên đề cốt lõi đã học trọn vẹn trong học kỳ 1 môn Toán 12.', answer: 'Ứng dụng đạo hàm, Hệ tọa độ Oxyz, và Nguyên hàm - Tích phân.' },
      { level: 'TH', question: 'Học kỳ 2 môn Toán 12 sẽ học thêm hai chuyên đề mới nào theo chương trình GDPT 2018?', answer: 'Phương trình mặt phẳng, đường thẳng trong không gian Oxyz và Xác suất có điều kiện.' },
      { level: 'VD', question: 'Xây dựng lộ trình ôn tập giai đoạn nước rút sau khi kết thúc học kỳ 1 để chuẩn bị cho kỳ thi tốt nghiệp.', answer: 'Giai đoạn 1: Luyện đề tổng hợp HK1; Giai đoạn 2: Hoàn thành sớm chương trình HK2; Giai đoạn 3: Luyện đề thi thử chuẩn cấu trúc Bộ.' },
      { level: 'VD', question: 'Phương pháp rèn luyện tốc độ làm 12 câu phần I dưới 15 phút với độ chính xác tuyệt đối 100%.', answer: 'Luyện phản xạ nhận dạng câu hỏi qua từ khoá, dùng mẹo Casio bấm máy tính và rèn thói quen gạch chân dữ kiện.' }
    ],
    quick: [
      { question: 'Yếu tố tâm lý nào quan trọng nhất khi làm bài thi trắc nghiệm Toán 12?', solution: 'Bình tĩnh, tự tin, không hoảng loạn khi gặp câu khó và không chủ quan ở câu dễ.' },
      { question: 'Tại sao việc hoàn thành sớm chương trình học kỳ 1 giúp học sinh lớp 12 tạo ưu thế vượt trội?', solution: 'Giúp có thêm nhiều thời gian luyện đề tổng hợp và củng cố các lỗ hổng kiến thức.' }
    ],
    mistakes: ['Chỉ tập trung luyện các câu hỏi quá khó mà bỏ rơi rèn luyện các câu hỏi cơ bản.', 'Không bấm giờ khi tự luyện đề ở nhà.', 'Không chữa chi tiết các câu làm sai sau mỗi lần thi thử.'],
    selfChoice: true, timelineKey: 'gateD78'
  }
];

fs.writeFileSync('tasks/g12_w18_specs.json', JSON.stringify(G12_W18, null, 2));
console.log('G12 W18 written:', G12_W18.length);

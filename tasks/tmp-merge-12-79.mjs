// Gộp spec 12-11-79 + aiError 12-11-79 + file giáo án vào snapshot batch2 (chưa fingerprint).
// Sau khi chạy: node tasks/tmp-hash-batch2.mjs.
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json';
const j = JSON.parse(readFileSync(P, 'utf8'));
if (j.lessonSpecs.some((s) => s.key === '12-11-79')) {
  j.lessonSpecs = j.lessonSpecs.filter((s) => s.key !== '12-11-79');
  delete j.aiErrors['12-11-79'];
}

const spec = {
  key: '12-11-79',
  grade: 12,
  week: 11,
  period: 79,
  kind: 'practice',
  lessonType: 'practice',
  selfChoice: false,
  title: 'Các số đặc trưng đo mức độ phân tán',
  focus:
    'Luyện tập tính R, ΔQ, s², s của mẫu số liệu ghép nhóm qua 4 bước Polya; công thức rút gọn s² = x̄²(trung bình bình phương) − (x̄)² và quy tắc vàng kiểm soát sai số làm tròn (giữ phân số tối giản, Casio STO A); so sánh độ phân tán hai mẫu thực tiễn PM2.5; phân biệt σx và sx trên Casio; tính chất biến đổi tuyến tính y = ax + b',
  formulas: [
    's^2 = \\dfrac{1}{n}\\sum_{i=1}^{k} n_i c_i^2 - (\\overline{x})^2 = \\overline{x^2} - (\\overline{x})^2',
    'c_i = \\dfrac{a_i + a_{i+1}}{2}; \\quad \\overline{x} = \\dfrac{1}{n}\\sum_{i=1}^{k} n_i c_i',
    'Q_p = a_m + \\dfrac{\\frac{p \\cdot n}{4} - cf_{m-1}}{n_m} \\cdot h \\; (p \\in \\{1, 3\\}); \\quad \\Delta_Q = Q_3 - Q_1',
    'Với y = ax + b: \\; s_y = |a| s_x; \\; s_y^2 = a^2 s_x^2; \\; \\Delta_{Q(y)} = |a| \\Delta_{Q(x)}; \\; R_y = |a| R_x — tịnh tiến cộng hằng số không làm đổi độ phân tán',
  ],
  examples: [
    {
      question:
        'Bài toán chữa chung (Polya): Bảng phân bố ghép nhóm thời gian hoàn thành một sản phẩm may của 40 công nhân: [10;20): 8; [20;30): 16; [30;40): 12; [40;50): 4. Tính khoảng tứ phân vị ΔQ, phương sai s² và độ lệch chuẩn s. Phân tích sai số nếu làm tròn x̄ sớm.',
      solution:
        'Bảng tổng hợp: n_i c_i = 120, 400, 420, 180 → Σ = 1120; n_i c_i² = 1800, 10000, 14700, 8100 → Σ = 34600; cf: 8, 24, 36, 40. a) n/4 = 10 ∈ (8; 24] → Q1 thuộc [20;30): Q1 = 20 + (10 − 8)/16 · 10 = 21,25; 3n/4 = 30 ∈ (24; 36] → Q3 thuộc [30;40): Q3 = 30 + (30 − 24)/12 · 10 = 35; ΔQ = 35 − 21,25 = 13,75. b) x̄ = 1120/40 = 28; s² = 34600/40 − 28² = 865 − 784 = 81; s = √81 = 9 (phút). Lưu ý gốc: không làm tròn sớm ở bước trung gian. (Nguyên bản HĐ3.1 Bước 3 giáo án.)',
    },
    {
      question:
        'Bài toán thực tiễn PM2.5 (chữa chung — Công dân toàn cầu): Nồng độ bụi mịn PM2.5 trong 60 ngày tại hai đô thị (WHO ≤ 45 μg/m³). TP A: [20;30): 6; [30;40): 18; [40;50): 20; [50;60): 14; [60;70): 2. TP B: [20;30): 12; [30;40): 8; [40;50): 15; [50;60): 10; [60;70): 15. c_i = 25, 35, 45, 55, 65. Tính x̄, s², s của từng thành phố và so sánh độ phân tán.',
      solution:
        'TP A: Σn_ic_i = 2580 → x̄_A = 43; Σn_ic_i² = 117100 → s²_A = 117100/60 − 43² = 102,67; s_A ≈ 10,13 μg/m³. TP B: Σn_ic_i = 2780 → x̄_B = 139/3 ≈ 46,33; Σn_ic_i² = 141300 → s²_B = 2355 − (139/3)² = 208,22; s_B ≈ 14,43 μg/m³. Kết luận: s_A < s_B → không khí TP A đồng đều, kiểm soát rủi ro tốt hơn; TP B tiềm ẩn đợt bùng phát ô nhiễm cực đoan. ⚠ Số tự kiểm — thầy chốt 28/10 (gốc ghi x̄ = 45; s_A ≈ 8,12; s_B ≈ 15,46 không khớp bảng). (Đề + kết luận nguyên bản HĐ3.2 giáo án.)',
    },
  ],
  exercises: [
    {
      level: 'NB',
      question:
        'PHT số 1 — Mức Trung bình (Phiếu Xanh): Thời gian hoàn thành một sản phẩm may (phút) của 40 công nhân: [10;20): 8; [20;30): 16; [30;40): 12; [40;50): 4 (cf cho sẵn: 8, 24, 36, 40). Nhiệm vụ 1 — điền giá trị đại diện c_i. Nhiệm vụ 2 — tính R và ΔQ. Nhiệm vụ 3 — tính x̄, s², s.',
      answer:
        'c_i = 15, 25, 35, 45. R = 50 − 10 = 40. Q1 = 21,25; Q3 = 35; ΔQ = 13,75. x̄ = 1120/40 = 28; s² = 34600/40 − 28² = 81; s = 9. (Nguyên bản chữa chung HĐ3.1 Bước 3 — PHT Mức TB trùng bài chữa chung.)',
    },
    {
      level: 'TH',
      question:
        'PHT số 1 — Mức Khá (Phiếu Vàng): Lượng điện tiêu thụ trong tháng (kWh) của 30 hộ gia đình: [100;150): 7; [150;200): 15; [200;250): 8. Nhiệm vụ 1 — xác định c_i và tính x̄ theo hai định dạng (phân số tối giản / làm tròn 1 chữ số). Nhiệm vụ 2 — tính s² theo 2 cách (giữ phân số / dùng x̄ làm tròn), tính sai lệch Δ = |s²_cách1 − s²_cách2| và rút nhận xét.',
      answer:
        'c_i = 125, 175, 225. x̄ = 5300/30 = 530/3 ≈ 176,67 (làm tròn: 176,7). Cách 1: s² = 973750/30 − (530/3)² = 32458,33 − 31211,11 = 1247,22. Cách 2: s² = 32458,33 − 176,7² = 32458,33 − 31222,89 = 1235,44. Δ ≈ 11,78 — làm tròn x̄ sớm làm s² lệch gần 12 đơn vị, khẳng định quy tắc giữ phân số tối giản. ⚠ Đáp án tự tính (thầy chốt 28/10 — gốc chỉ có khung điền; minh họa AI-error S4 dùng chính số này).',
    },
    {
      level: 'TH',
      question:
        'Tính chất biến đổi tuyến tính (Sáng tạo — Pha 4 khái quát): Với phép biến đổi y = ax + b, hãy nêu/công thức hóa tác động của a và b lên R, ΔQ, s², s của mẫu số liệu ghép nhóm.',
      answer:
        'R_y = |a|R_x; ΔQ(y) = |a|ΔQ(x); s²_y = a²s²_x; s_y = |a|s_x — hệ số a co giãn độ phân tán (tịnh tiến b không đổi độ phân tán). Áp dụng: câu 2 kiểm nhanh (k = 2 → s′² = 4s²) và câu 3 (cộng 10 → Δ′Q = ΔQ; s′ = s). (Nguyên bản Pha 4 khái quát tính chất + bảng tính chất mở rộng giáo án.)',
    },
    {
      level: 'VD',
      question:
        'PHT số 1 — Mức Giỏi (Phiếu Cam): Bảng nhiệt độ cao nhất trong ngày (°C) tại một trạm khí tượng trong tháng 6: [26;28): 4; [28;30): x; [30;32): 12; [32;34): 6; c_i = 27, 29, 31, 33. Biết phương sai s² = 3,5. Lập phương trình theo ẩn số tần số x và tìm số ngày x của nhóm [28;30).',
      answer:
        'n = 22 + x; Σn_ic_i = 29x + 678; Σn_ic_i² = 841x + 20982 (⚠ tự kiểm — gốc 20980 sai cộng: 4·729 + 12·961 + 6·1089 = 2916 + 11532 + 6534 = 20982). Phương trình: (841x + 20982)/(22 + x) − ((29x + 678)/(22 + x))² = 3,5. Nghiệm nguyên gần nhất: x = 9 → s² ≈ 3,49 ≈ 3,5 (gốc chọn x = 8 dựa trên tổng sai — thầy chốt 28/10).',
    },
    {
      level: 'VD',
      question:
        'PHT số 2 — Thành phố A (dãy bàn chẵn): Tính x̄, s², s của nồng độ bụi mịn PM2.5 trong 60 ngày: [20;30): 6; [30;40): 18; [40;50): 20; [50;60): 14; [60;70): 2; c_i = 25, 35, 45, 55, 65.',
      answer:
        'Σn_ic_i = 150 + 630 + 900 + 770 + 130 = 2580 → x̄_A = 2580/60 = 43. Σn_ic_i² = 3750 + 22050 + 40500 + 42350 + 8450 = 117100 → s²_A = 117100/60 − 43² = 102,67; s_A ≈ 10,13 μg/m³. ⚠ Số tự kiểm — thầy chốt 28/10 (gốc 45/65,93/8,12 không khớp bảng).',
    },
    {
      level: 'VD',
      question:
        'PHT số 2 — Thành phố B (dãy bàn lẻ) + Ra quyết định: Tính x̄, s², s của TP B: [20;30): 12; [30;40): 8; [40;50): 15; [50;60): 10; [60;70): 15. So sánh với TP A: người mắc bệnh hen suyễn nên sống ở thành phố nào hơn? Vì sao?',
      answer:
        'Σn_ic_i = 300 + 280 + 675 + 550 + 975 = 2780 → x̄_B = 2780/60 = 139/3 ≈ 46,33. Σn_ic_i² = 7500 + 9800 + 30375 + 30250 + 63375 = 141300 → s²_B = 2355 − (139/3)² = 208,22; s_B ≈ 14,43 μg/m³. Kết luận: s_A (10,13) < s_B (14,43) → nên chọn TP A vì chất lượng không khí ổn định quanh mức an toàn; TP B có độ phân tán lớn hơn, tiềm ẩn đợt bùng phát ô nhiễm cực đoan. ⚠ Số tự kiểm — thầy chốt 28/10 (kết luận giữ nguyên bản).',
    },
  ],
  quick: [
    {
      question:
        'Kiểm nhanh Câu 1 [NB] (Pha 4): Cho mẫu số liệu ghép nhóm có các nhóm [0;4), [4;8), [8;12), [12;16). Khoảng biến thiên R bằng: A. 12 · B. 16 · C. 8 · D. 4.',
      solution:
        'Đáp án B — R = 16 − 0 = 16 (đầu mút phải nhóm cuối trừ đầu mút trái nhóm đầu). (Nguyên bản bảng đáp án Pha 4 giáo án.)',
    },
    {
      question:
        'Kiểm nhanh Câu 2 [TH] (Pha 4): Nếu nhân tất cả các giá trị trong mẫu số liệu với số dương k = 2 thì phương sai mới s′² thay đổi như thế nào so với s²? A. Tăng 2 lần · B. Tăng 4 lần · C. Không đổi · D. Tăng √2 lần.',
      solution:
        'Đáp án B — s′² = k²s² = 2²s² = 4s². (Nguyên bản bảng đáp án Pha 4 giáo án.)',
    },
    {
      question:
        'Kiểm nhanh Câu 3 [VD] (Pha 4): Một mẫu số liệu có độ lệch chuẩn s = 5. Nếu cộng thêm 10 đơn vị vào tất cả các giá trị của mẫu thì khoảng tứ phân vị mới Δ′Q và độ lệch chuẩn mới s′ bằng bao nhiêu? A. Δ′Q = ΔQ + 10; s′ = 15 · B. Δ′Q = ΔQ; s′ = 15 · C. Δ′Q = ΔQ; s′ = 5 · D. Δ′Q = ΔQ + 10; s′ = 5.',
      solution:
        'Đáp án C — tịnh tiến cộng hằng số không làm thay đổi độ phân tán. Khái quát: với y = ax + b thì s_y = |a|s_x; ΔQ(y) = |a|ΔQ(x). (Nguyên bản bảng đáp án Pha 4 giáo án.)',
    },
  ],
  mistakes: [
    'Làm tròn số trung bình x̄ quá sớm (1 chữ số) dẫn đến sai số dây chuyền ở s² — bẫy AI-error S4 (~25% HS theo căn cứ điều chỉnh); quy tắc vàng: giữ phân số tối giản, Casio STO A.',
    'Nhầm σx (chia n — đối chiếu SGK) với sx (chia n−1 — mẫu hiệu chỉnh) khi bấm Casio — 30% HS theo căn cứ điều chỉnh; câu hỏi phản biện S9.',
    'Lấy nhầm mút nhóm hoặc trừ ngược chiều khi tính R — tiền lệ tiết 1 (R = a(m+1) − a1, đầu mút phải nhóm cuối trừ đầu mút trái nhóm đầu).',
    'Quên nhân độ dài nhóm h khi nội suy tứ phân vị — lỗi BLOCKER bài 12-11-78 (gốc (75−45)/35·2 ≈ 11,71); mỗi bước nội suy phải nhân h.',
  ],
  timelineKey: 'gateD1279',
  boardKnowledge: [
    'PHA 2: CÔNG THỨC BIẾN ĐỔI CỦA PHƯƠNG SAI',
    'a. Biến đổi: Σ n_i(c_i − x̄)² = Σ n_i c_i² − 2x̄Σ n_i c_i + x̄²Σ n_i = Σ n_i c_i² − n(x̄)² → s² = (1/n)Σ n_i c_i² − (x̄)² = x̄²(trung bình bình phương) − (x̄)².',
    'b. Quy tắc vàng kiểm soát sai số: (1) Nguyên tắc phân số — không làm tròn x̄ ở bước trung gian, giữ phân số tối giản; (2) Kĩ năng Casio — tính x̄ xong STO → A, rồi (tổng n_ic_i²)/n − A².',
    'c. Giá trị đại diện: c_i = (a_i + a_(i+1))/2 (Hình 1 gốc — mô tả bằng lời: trục dữ liệu a0 … ak với các vạch Q1, Q2, Q3; mũi tên xanh R = ak − a0 bao toàn trục "dễ bị ảnh hưởng bởi giá trị đột biến"; mũi tên đỏ ΔQ = Q3 − Q1 trên đoạn 50% giữa).',
    '2. QUY TRÌNH POLYA 4 BƯỚC CHO THỐNG KÊ GHÉP NHÓM',
    'a. Hiểu bài (số nhóm, cỡ mẫu n, h); Tìm hướng giải (cf → mốc n/4, 3n/4 → nội suy Q1, Q3; bảng n_ic_i, n_ic_i² → x̄, s²); Trình bày; Nhìn lại (Casio đối chiếu σx, kiểm soát sai số).',
    '3. PHÂN BIỆT CASIO: σx chia cho n — đối chiếu SGK; sx chia cho n−1 — độ lệch chuẩn mẫu hiệu chỉnh dùng cho mẫu nhỏ.',
    '4. TÍNH CHẤT BIẾN ĐỔI TUYẾN TÍNH y = ax + b: R_y = |a|R_x; ΔQ(y) = |a|ΔQ(x); s²_y = a²s²_x; s_y = |a|s_x — tịnh tiến cộng hằng số không làm đổi độ phân tán.',
    '5. THÔNG ĐIỆP CỐT LÕI: số trung bình cho biết mức độ đại diện trung tâm; phương sai và độ lệch chuẩn đo lường mức độ rủi ro, sai số và tính ổn định (tài chính — chọn cổ phiếu có s nhỏ hơn; môi trường — chọn thành phố có s nhỏ hơn).',
  ],
};

const aiError = {
  key: '12-11-79',
  mode: 'micro',
  category: 'Lỗi đại số',
  wrongSolution: 'AI trình bày: lấy x̄ ≈ 176,7 (làm tròn 1 chữ số) rồi s² ≈ 1235,4.',
  correction:
    'Giữ x̄ = 530/3 dưới dạng phân số tối giản: s² = 973750/30 − (530/3)² = 32458,33 − 31211,11 = 1247,22; làm tròn x̄ ≈ 176,7 làm s² = 32458,33 − 31222,89 = 1235,44 — lệch ≈ 11,8 đơn vị ("lệch gần 10 đơn vị" theo tinh thần gốc). Kỹ thuật: tính x̄ xong bấm STO → A, dùng (tổng n_ic_i²)/n − A².',
  proof:
    'Sai số làm tròn ε trên x̄ được bình phương khuếch đại: (x̄ ± ε)² = x̄² ± 2ε·x̄ + ε² — với x̄ ≈ 176,67 và ε ≈ 0,033 (176,7 thay 530/3) sai số thêm ≈ 2·0,033·176,7 ≈ 11,7, đúng bằng độ lệch quan sát 1247,22 − 1235,44. Căn cứ điều chỉnh gốc: gần 25% HS mắc lỗi này. [Gộp whyAiError: AI làm tròn số trung bình quá sớm — đúng lỗi gốc "quên quy tắc vàng: giữ dạng phân số tối giản" và kĩ năng STO A; khớp cảnh báo Danielson 1f "Vinh danh lỗi sai giấu tên".] [Gộp boardPrompt — bảng lớn AI-error, nội dung công khai trên bảng thật: ghi quy tắc vàng "Không làm tròn x̄ ở bước trung gian — giữ phân số tối giản; Casio: STO A" đặt cạnh bài làm sai — KHÔNG viết lời giải PHT số 1/2.]',
  teacherPrompt:
    'Quan sát bài làm trên màn hình: bạn lấy x̄ ≈ 176,7 rồi tính s² ≈ 1235,4. Kết quả này lệch bao nhiêu so với cách giữ phân số? Vì sao sai số khuếch đại?',
  studentProduct:
    'Thẻ chọn ĐỒNG Ý/KHÔNG trên máy + 1 dòng chỉ ra sai số (nêu lệch ≈ 11,8 đơn vị hoặc nêu nguyên tắc giữ phân số tối giản / STO A).',
};

j.lessonSpecs.push(spec);
j.aiErrors['12-11-79'] = aiError;
j.source.files['tasks/giaoan-goc-12-11-79.md'] = '';
writeFileSync(P, JSON.stringify(j, null, 2) + '\n', 'utf8');
console.log('MERGED specs=' + j.lessonSpecs.length + ' aiErrors=' + Object.keys(j.aiErrors).length + ' files=' + Object.keys(j.source.files).length);

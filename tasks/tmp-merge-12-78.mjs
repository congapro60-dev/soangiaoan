// Gộp spec 12-11-78 + aiError 12-11-78 + file giáo án vào snapshot batch2 (chưa fingerprint).
// Sau khi chạy: node tasks/tmp-hash-batch2.mjs.
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json';
const j = JSON.parse(readFileSync(P, 'utf8'));
if (j.lessonSpecs.some((s) => s.key === '12-11-78')) {
  j.lessonSpecs = j.lessonSpecs.filter((s) => s.key !== '12-11-78');
  delete j.aiErrors['12-11-78'];
}

const spec = {
  key: '12-11-78',
  grade: 12,
  week: 11,
  period: 78,
  kind: 'formation',
  lessonType: 'formation',
  selfChoice: false,
  title: 'Khoảng biến thiên và khoảng tứ phân vị',
  focus:
    'Khoảng biến thiên R = a(m+1) − a1 của mẫu số liệu ghép nhóm qua xấp xỉ hai đầu mút; mốc n/4 và 3n/4 để tìm nhóm chứa tứ phân vị; công thức nội suy Q1, Q3 và khoảng tứ phân vị ΔQ = Q3 − Q1; so sánh độ phân tán và tính bền vững của ΔQ so với R khi có giá trị ngoại lai; phản biện kết luận đảo chiều phép trừ (bẫy "R = 35 − 10 = 25")',
  formulas: [
    'R = a_{m+1} - a_1 \\quad (a_1 \\text{ là đầu mút trái nhóm đầu}, \\; a_{m+1} \\text{ là đầu mút phải nhóm cuối})',
    'Q_1 = a_p + \\dfrac{\\frac{n}{4} - C}{n_p} \\cdot h \\quad ([a_p; a_{p+1}) \\text{ là nhóm chứa } Q_1)',
    'Q_3 = a_k + \\dfrac{\\frac{3n}{4} - C\'}{n_k} \\cdot h\' \\quad ; \\quad \\Delta_Q = Q_3 - Q_1',
    'Quy trình 3 bước: (1) lập cột tần số tích lũy cf; (2) xác định mốc kn/4 để tìm nhóm chứa tứ phân vị; (3) áp dụng công thức nội suy tương ứng',
  ],
  examples: [
    {
      question:
        'Bài toán chữa chung (HĐ3): Bảng ghép nhóm thời gian dùng Internet mỗi ngày của 50 HS (SGK tr. 82): [0;60): 6; [60;120): 14; [120;180): 18; [180;240): 12 (phút). Trong mẫu ghép nhóm này, giá trị nhỏ nhất chắc chắn không nhỏ hơn bao nhiêu, giá trị lớn nhất chắc chắn không vượt quá bao nhiêu? Từ đó phát biểu công thức khoảng biến thiên R cho mẫu gồm m nhóm.',
      solution:
        'Giá trị nhỏ nhất chắc chắn không nhỏ hơn 0 (đầu mút trái nhóm đầu) và giá trị lớn nhất chắc chắn không vượt quá 240 (đầu mút phải nhóm cuối). Xấp xỉ: min ≈ 0, max ≈ 240. Với mẫu gồm m nhóm [a1; a2), …, [am; a(m+1)): R = a(m+1) − a1. Ở đây R = 240 − 0 = 240 phút. (Nguyên bản HĐ3 Bước 1–2 + mục I ghi bảng giáo án.)',
    },
    {
      question:
        'Chữa chung kiểm nhanh (HĐ5): Mẫu ghép nhóm điểm đánh giá năng lực của 60 thí sinh (SGK tr. 85): [0;20): 4; [20;40): 10; [40;60): 22; [60;80): 16; [80;100): 8. Tính R, xác định nhóm chứa Q1, tính Q1, Q3 và khoảng tứ phân vị ΔQ.',
      solution:
        '[NB] R = 100 − 0 = 100. n = 60 ⇒ n/4 = 15; tần số tích lũy: cf1 = 4; cf2 = 14; cf3 = 36. Do 14 < 15 ≤ 36 nên nhóm chứa Q1 là [40; 60). [TH] Q1 = 40 + (15 − 14)/22 · 20 ≈ 40,91. 3n/4 = 45; do 36 < 45 ≤ 52 nên nhóm chứa Q3 là [60; 80): Q3 = 60 + (45 − 36)/16 · 20 = 71,25. ΔQ = 71,25 − 40,91 = 30,34. (Nguyên bản mục "Đáp án Kiểm tra nhanh" giáo án.)',
    },
  ],
  exercises: [
    {
      level: 'NB',
      question:
        'PHT số 1 — NHÁNH 1 (Phiếu Xanh lá): Thời gian tự học (phút/ngày) của 40 học sinh: [0;30): 8; [30;60): 16; [60;90): 12; [90;120): 4 (cột tần số tích lũy cf cho sẵn: 8, 24, 36, 40). Nhiệm vụ 1 — Tính khoảng biến thiên R. Nhiệm vụ 2 — Tìm nhóm chứa Q1 (mốc n/4 = 10) và tính Q1 (điền vào công thức cho sẵn). Nhiệm vụ 3 — Tìm nhóm chứa Q3 (mốc 3n/4 = 30) và tính ΔQ.',
      answer:
        'R = 120 − 0 = 120. Nhóm chứa Q1: [30; 60) → Q1 = 30 + (10 − 8)/16 · 30 = 33,75. Nhóm chứa Q3: [60; 90) → Q3 = 60 + (30 − 24)/12 · 30 = 75. ΔQ = 75 − 33,75 = 41,25. (Nguyên bản Đáp án Phiếu số 1 — Mức NB giáo án.)',
    },
    {
      level: 'TH',
      question:
        'PHT số 1 — NHÁNH 2 (Phiếu Vàng): Thời gian hoàn thành một bài trắc nghiệm (phút) của 50 thí sinh: [10;15): 6; [15;20): 12; [20;25): 18; [25;30): 10; [30;35): 4. Nhiệm vụ 1 — Lập dòng tần số tích lũy. Nhiệm vụ 2 — Tính R và nêu ý nghĩa. Nhiệm vụ 3 — Tính Q1, Q3 và ΔQ.',
      answer:
        'cf: 6, 18, 36, 46, 50. R = a6 − a1 = 35 − 10 = 25 (phút) — đo độ phân tán giữa thời gian làm bài lớn nhất và nhỏ nhất. n/4 = 12,5 → nhóm [15;20): Q1 = 15 + (12,5 − 6)/12 · 5 ≈ 17,71. 3n/4 = 37,5 → nhóm [25;30): Q3 = 25 + (37,5 − 36)/10 · 5 = 25,75. ΔQ = 25,75 − 17,71 = 8,04. (Nguyên bản NHÁNH 2 + Đáp án Mức TH giáo án.)',
    },
    {
      level: 'VD',
      question:
        'PHT số 1 — NHÁNH 3 (Phiếu Cam) Nhiệm vụ 1 + 2: Hai xí nghiệp may A và B thống kê thu nhập hàng tháng (triệu đồng) của 100 công nhân mỗi đơn vị — A: [6;8): 15; [8;10): 30; [10;12): 35; [12;14): 15; [14;16): 5. B: [6;8): 25; [8;10): 15; [10;12): 20; [12;14): 25; [14;16): 15. So sánh khoảng biến thiên RA và RB. Tính ΔQ(A) và ΔQ(B).',
      answer:
        'RA = 16 − 6 = 10; RB = 16 − 6 = 10 — bằng nhau, R chưa giúp phân biệt độ đồng đều. A: cf = 15, 45, 80, 95, 100; n/4 = 25 → [8;10): Q1(A) = 8 + (25−15)/30 · 2 ≈ 8,67; 3n/4 = 75 → [10;12): Q3(A) = 10 + (75−45)/35 · 2 = 13,43; ΔQ(A) = 13,43 − 8,67 = 4,76. B: cf = 25, 40, 60, 85, 100; n/4 = 25 → [6;8): Q1(B) = 6 + (25−0)/25 · 2 = 8,00; 3n/4 = 75 → [12;14): Q3(B) = 12 + (75−60)/25 · 2 = 13,20; ΔQ(B) = 5,20. ⚠ Số tự kiểm — thầy chốt 28/10: giáo án gốc sai Q3(A) ≈ 11,71 (quên nhân h = 2) và tóm tắt Δ_Q(A) = 2,86; Δ_Q(B) = 5,67.',
    },
    {
      level: 'VD',
      question:
        'PHT số 1 — NHÁNH 3 (Phiếu Cam) Nhiệm vụ 3: Dựa trên ΔQ, xí nghiệp nào có mức thu nhập đồng đều hơn cho số đông công nhân? Vì sao chỉ dựa vào R thì không thấy được điều này?',
      answer:
        'Do ΔQ(A) = 4,76 < ΔQ(B) = 5,20 nên mức lương của 50% công nhân ở nhóm giữa của Xí nghiệp A tập trung và đồng đều hơn. Đại lượng R chỉ phụ thuộc 2 mút ngoài cùng nên bị ảnh hưởng bởi giá trị biên, không phản ánh cấu trúc phân bố bên trong. (Nguyên bản NHÁNH 3 Nhiệm vụ 3 — kết luận giữ nguyên, số theo thầy chốt.)',
    },
    {
      level: 'TH',
      question:
        'Nhiệm vụ neo (HĐ5, HS xong sớm): Tự lập bảng tần số 4 nhóm sao cho khi nhân đôi tần số tất cả các nhóm thì giá trị của R và ΔQ không thay đổi.',
      answer:
        'Ví dụ: [0;10): 5; [10;20): 10; [20;30): 10; [30;40): 5 (n = 40) — R = 40; n/4 = 10 ∈ (5; 15] → nhóm [10;20): Q1 = 10 + (10−5)/10 · 10 = 15; nhân đôi (n = 80, tần số 10/20/20/10): R = 40; n/4 = 20 ∈ (10; 30] → vẫn nhóm [10;20): Q1 = 10 + (20−10)/20 · 10 = 15. Lý do: công thức R chỉ phụ thuộc đầu mút; mốc n/4 và 3n/4 tăng cùng tỉ lệ với cf nên nhóm chứa và giá trị nội suy không đổi. (Đề nguyên bản HĐ5 nhiệm vụ neo; đáp án theo hướng tự thiết lập.)',
    },
    {
      level: 'NB',
      question:
        '[SÁNG TẠO] (HĐ4 Bước 4, HS giỏi): Nếu tăng tất cả các giá trị trong mẫu lên 2 đơn vị, hoặc nhân đôi tất cả các giá trị thì R và ΔQ thay đổi như thế nào?',
      answer:
        'Cộng thêm 2 đơn vị (tịnh tiến): cả hai đầu mút cùng tăng 2 nên R và ΔQ không đổi. Nhân đôi (co giãn): cả hai đầu mút nhân đôi nên R và ΔQ đều nhân đôi. (Đề nguyên bản HĐ4 Bước 4; đáp án suy từ công thức R = a(m+1) − a1 và ΔQ = Q3 − Q1.)',
    },
  ],
  quick: [
    {
      question:
        'Kiểm nhanh [NB] (HĐ5): Cho mẫu ghép nhóm điểm đánh giá năng lực của 60 thí sinh (SGK tr. 85): [0;20): 4; [20;40): 10; [40;60): 22; [60;80): 16; [80;100): 8. Xác định khoảng biến thiên R và nhóm chứa Q1.',
      solution:
        'R = 100 − 0 = 100. n = 60 ⇒ n/4 = 15; cf: 4, 14, 36, 52, 60. Do 14 < 15 ≤ 36 nên nhóm chứa Q1 là [40; 60). (Nguyên bản mục "Đáp án Kiểm tra nhanh" giáo án.)',
    },
    {
      question:
        'Kiểm nhanh [TH] (HĐ5): Tính khoảng tứ phân vị ΔQ của mẫu số liệu ở câu trên.',
      solution:
        'Q1 = 40 + (15 − 14)/22 · 20 ≈ 40,91. 3n/4 = 45; do 36 < 45 ≤ 52 nên nhóm chứa Q3 là [60; 80): Q3 = 60 + (45 − 36)/16 · 20 = 71,25. ΔQ = 71,25 − 40,91 = 30,34. (Nguyên bản giáo án.)',
    },
    {
      question:
        'Kiểm nhanh [VDC] (HĐ5): Nếu bổ sung thêm 2 thí sinh có điểm cực thấp trong khoảng [0;20), giá trị nào trong hai đại lượng R và ΔQ sẽ ít bị biến động hơn? Vì sao?',
      solution:
        'ΔQ hầu như không bị ảnh hưởng vì mốc vị trí n/4 thay đổi không đáng kể trong nhóm chứa, trong khi R rất dễ bị phụ thuộc vào sự xuất hiện của giá trị ngoại lai. Ứng dụng: ΔQ là thước đo ổn định và đáng tin cậy hơn R trong quản lý chất lượng công nghiệp. (Nguyên bản giáo án.)',
    },
  ],
  mistakes: [
    'Lấy nhầm mút nhóm hoặc đảo chiều phép trừ khi tính R — bẫy AI-error S4 ("R = 35 − 10 = 25"); R luôn là đầu mút phải nhóm cuối trừ đầu mút trái nhóm đầu (a(m+1) − a1).',
    'Nhầm C là tần số tích lũy của CHÍNH nhóm chứa tứ phân vị thay vì nhóm TRƯỚC ĐÓ ("lỗi sai chí mạng" S7) — 30% HS nhầm theo căn cứ điều chỉnh; bảng phụ tô màu phân biệt C và n_p.',
    'Quên nhân độ dài nhóm h khi nội suy — gốc mức VD ghi (75−45)/35·2 ≈ 11,71 thay vì 13,43 (thầy chốt sửa 28/10): mỗi bước nội suy phải nhân h = a(k+1) − a(k).',
    'Dùng R để kết luận độ đồng đều khi mẫu có giá trị ngoại lai — R chỉ phụ thuộc 2 mút, bị kéo bởi ngoại lai; so sánh số đông phải dùng ΔQ (hệ quả quản đốc sợi dệt HĐ5).',
  ],
  timelineKey: 'gateD1278',
  boardKnowledge: [
    '1. KHOẢNG BIẾN THIÊN (RANGE)',
    'a. Định nghĩa: cho mẫu gồm m nhóm [a1; a2), …, [am; a(m+1)) — khoảng biến thiên R = a(m+1) − a1 (đầu mút phải nhóm cuối trừ đầu mút trái nhóm đầu).',
    'b. Ý nghĩa: đo độ phân tán của mẫu; R càng lớn độ phân tán càng lớn; hạn chế — chỉ phụ thuộc 2 giá trị biên, dễ bị giá trị ngoại lai kéo.',
    '2. KHOẢNG TỨ PHÂN VỊ (ΔQ)',
    'a. Q1 = a_p + ((n/4 − C)/n_p)·h — nhóm [a_p; a_(p+1)) chứa Q1 là nhóm đầu tiên có tần số tích lũy ≥ n/4 (C là tần số tích lũy của nhóm TRƯỚC đó; h = a_(p+1) − a_p).',
    'b. Q3 = a_k + ((3n/4 − C′)/n_k)·h′ — nhóm chứa Q3 là nhóm đầu tiên có cf ≥ 3n/4.',
    'c. ΔQ = Q3 − Q1 — đo độ phân tán của nửa giữa mẫu; loại bỏ 25% giá trị nhỏ nhất và 25% lớn nhất nên không bị ảnh hưởng bởi giá trị ngoại lai.',
    'd. Quy trình 3 bước: (1) lập cột cf; (2) xác định mốc kn/4 tìm nhóm chứa; (3) áp dụng công thức nội suy.',
    '3. SO SÁNH (Hình TikZ gốc — mô tả bằng lời: trục dữ liệu với a1, a(m+1) hai đầu; đoạn tô xanh giữa Q1 và Q3 chứa 50% số liệu quan sát trung tâm, M_e ở giữa; mũi tên ΔQ trên đoạn xanh, mũi tên R dưới toàn trục): ΔQ khắc phục nhược điểm của R khi mẫu có số liệu bất thường.',
    '4. SÁNG TẠO: cộng thêm 2 đơn vị vào mọi giá trị → R, ΔQ không đổi (tịnh tiến); nhân đôi mọi giá trị → R, ΔQ nhân đôi (co giãn).',
    '5. ỨNG DỤNG — quản lý chất lượng công nghiệp: ΔQ là thước đo ổn định và đáng tin cậy hơn R; hệ quả quản đốc sợi dệt — vài sợi lỗi đẩy R tăng vọt trong khi 50% sợi cốt lõi vẫn đạt chuẩn.',
  ],
};

const aiError = {
  key: '12-11-78',
  mode: 'micro',
  category: 'Lỗi đại số',
  wrongSolution: 'AI kết luận: khoảng biến thiên của mẫu này là R = 35 − 10 = 25 triệu vì lấy mút trái trừ mút phải.',
  correction:
    'Khoảng biến thiên của mẫu ghép nhóm là hiệu giữa đầu mút phải của nhóm CUỐI và đầu mút trái của nhóm ĐẦU: hai nhóm dữ kiện là [5; 10) và [35; 40) nên R = 40 − 5 = 35 (triệu đồng) — không phải 35 − 10 = 25 (lấy nhầm mút trái nhóm cao nhất và đảo chiều phép trừ).',
  proof:
    'Theo định nghĩa: mẫu gồm m nhóm [a1; a2), …, [am; a(m+1)) thì R = a(m+1) − a1 — giá trị nhỏ nhất xấp xỉ đầu mút trái nhóm đầu (5) và giá trị lớn nhất xấp xỉ đầu mút phải nhóm cuối (40). Bài làm sai lấy 35 (đầu mút trái nhóm [35; 40) — vẫn có HS nằm trong nhóm đó) rồi trừ 10 (đầu mút phải nhóm [5; 10)) — vừa chọn sai mút vừa trừ ngược chiều. [Gộp whyAiError: AI đảo chiều phép trừ và lấy nhầm mút nhóm — đúng lỗi giáo án nhấn mạnh ở HĐ3 Bước 4: "Dự kiến khó khăn: HS lấy nhầm tần số trừ nhau hoặc lấy nhầm mút nhóm → GV nhấn mạnh vị trí a(m+1) và a1".] [Gộp boardPrompt — bảng lớn AI-error, nội dung công khai trên bảng thật: ghi định nghĩa R = a(m+1) − a1 với hai nhóm dữ kiện [5; 10) và [35; 40) đặt cạnh bài làm sai; nhấn mạnh vị trí a1 và a(m+1) — KHÔNG viết lời giải PHT số 1.]',
  teacherPrompt:
    'Một học sinh phát biểu: "Khoảng biến thiên của mẫu này là R = 35 − 10 = 25 triệu vì lấy mút trái trừ mút phải." Em đồng ý không? Bằng chứng nào?',
  studentProduct:
    'Thẻ chọn ĐỒNG Ý/KHÔNG trên máy + 1 dòng phản biện kèm bằng chứng (chỉ ra R = đầu mút phải nhóm cuối trừ đầu mút trái nhóm đầu = 40 − 5 = 35).',
};

j.lessonSpecs.push(spec);
j.aiErrors['12-11-78'] = aiError;
j.source.files['tasks/giaoan-goc-12-11-78.md'] = '';
writeFileSync(P, JSON.stringify(j, null, 2) + '\n', 'utf8');
console.log('MERGED specs=' + j.lessonSpecs.length + ' aiErrors=' + Object.keys(j.aiErrors).length + ' files=' + Object.keys(j.source.files).length);

// Gộp spec 12-11-77 + aiError 12-11-77 + file giáo án vào snapshot batch2 (chưa fingerprint).
// Sau khi chạy: node tasks/tmp-hash-batch2.mjs.
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json';
const j = JSON.parse(readFileSync(P, 'utf8'));
if (j.lessonSpecs.some((s) => s.key === '12-11-77')) {
  j.lessonSpecs = j.lessonSpecs.filter((s) => s.key !== '12-11-77');
  delete j.aiErrors['12-11-77'];
}

const spec77 = {
  key: '12-11-77',
  grade: 12,
  week: 11,
  period: 77,
  kind: 'practice',
  lessonType: 'practice',
  selfChoice: false,
  title: 'Nguyên hàm',
  focus:
    'Bảng nguyên hàm của các hàm số sơ cấp (lũy thừa x^α với α ≠ −1, 1/x, hàm mũ e^x và a^x, lượng giác sin x, cos x) qua phép suy luận ngược từ đạo hàm; quy trình 2 bước xác định hàm số qua điều kiện ban đầu F(x₀) = y₀; phản biện kết luận thiếu trị tuyệt đối ln|x| (bẫy "bạn Nam")',
  formulas: [
    '\\int x^\\alpha dx = \\dfrac{x^{\\alpha+1}}{\\alpha+1} + C \\quad (\\alpha \\neq -1)',
    '\\int \\dfrac{1}{x} dx = \\ln \\mid x \\mid + C \\quad (x \\neq 0)',
    '\\int e^x dx = e^x + C; \\quad \\int a^x dx = \\dfrac{a^x}{\\ln a} + C \\; (0 < a \\neq 1); \\quad \\int \\cos x\\, dx = \\sin x + C; \\quad \\int \\sin x\\, dx = -\\cos x + C',
    'Quy trình 2 bước: \\int f(x)dx = F(x) + C; thay x = x_0 giải F(x_0) + C = y_0 \\Rightarrow C = y_0 - F(x_0) — điều kiện F(x_0) = y_0 ghim duy nhất một đường cong trong họ các đường cong tịnh tiến song song theo phương Oy',
  ],
  examples: [
    {
      question:
        'Bài toán đoàn tàu (chữa chung): Một đoàn tàu rời ga chuyển động thẳng với vận tốc tức thời $v(t) = 3t^2 + 2t$ (m/s). Tìm quy luật quãng đường $s(t)$ biết $s(0) = 0$. Họ nguyên hàm của vận tốc là gì và dữ kiện $s(0) = 0$ có vai trò gì?',
      solution:
        'Họ nguyên hàm: $s(t) = \\int (3t^2 + 2t)dt = t^3 + t^2 + C$ — một tập hợp vô số hàm số phụ thuộc hằng số $C$. Dữ kiện thực tế $s(0) = 0$: thay $t = 0$ vào công thức để giải tìm giá trị cụ thể của $C$, giúp xác định duy nhất một quy luật chuyển động thực tế. Ở đây $s(0) = 0^3 + 0^2 + C = 0 \\Rightarrow C = 0$, vậy $s(t) = t^3 + t^2$. (Nguyên bản Pha 1.1 + Pha 3 Bước 1 giáo án.)',
    },
    {
      question:
        'Bài toán đường cong (PHT số 2 — mức Giỏi, GV tự thiết kế): Tìm phương trình đường cong $y = F(x)$ đi qua $M(1; 2)$ biết hệ số góc tiếp tuyến tại mọi điểm $x > 0$ là $f(x) = 3x^2 + \\dfrac{2}{x}$.',
      solution:
        'Bước 1 — họ nguyên hàm: $F(x) = \\int (3x^2 + \\frac{2}{x})dx = x^3 + 2\\ln x + C$ (do $x > 0$). Bước 2 — điều kiện: $F(1) = 1^3 + 2\\ln 1 + C = 2 \\Rightarrow 1 + C = 2 \\Rightarrow C = 1$. Phương trình đường cong là $y = x^3 + 2\\ln x + 1$. (Nguyên bản mục "Đáp án PHT số 2" giáo án.)',
    },
  ],
  exercises: [
    {
      level: 'NB',
      question:
        'PHT số 1 — Nhiệm vụ A (Mức TB): Áp dụng trực tiếp bảng nguyên hàm, tìm họ nguyên hàm của: a) $f(x) = x^4 + 3x^2$; b) $g(x) = e^x - \\cos x$.',
      answer:
        'a) $\\int (x^4 + 3x^2)dx = \\frac{x^5}{5} + x^3 + C$ (nguyên bản mục "Đáp án PHT số 1" — Mức TB). b) $\\int (e^x - \\cos x)dx = e^x - \\sin x + C$ (áp dụng trực tiếp bảng công thức $e^x$, $\\cos x$ — nguyên bản quy tắc tuyến tính).',
    },
    {
      level: 'TH',
      question:
        'PHT số 1 — Nhiệm vụ B (Mức Khá): Biến đổi đưa về lũy thừa hoặc tách tổng để tính: a) $f(x) = \\sqrt{x} + \\dfrac{1}{x^2}$; b) $g(x) = 2\\sin x + 3^x$.',
      answer:
        'a) $\\sqrt{x} = x^{1/2}$, $\\frac{1}{x^2} = x^{-2}$ nên $\\int (\\sqrt{x} + \\frac{1}{x^2})dx = \\frac{2}{3}x^{3/2} - \\frac{1}{x} + C$ (nguyên bản mục "Đáp án PHT số 1" — Mức Khá). b) $\\int (2\\sin x + 3^x)dx = -2\\cos x + \\frac{3^x}{\\ln 3} + C$ (áp dụng bảng công thức $\\sin x$, $a^x$).',
    },
    {
      level: 'TH',
      question:
        'PHT số 1 — Nhiệm vụ C (Mức Giỏi) a): Tìm họ nguyên hàm và chỉ rõ tập xác định của $f(x) = 3\\sin x - 2e^x + \\dfrac{5}{x}$.',
      answer:
        '$\\int (3\\sin x - 2e^x + \\frac{5}{x})dx = -3\\cos x - 2e^x + 5\\ln \\mid x \\mid + C$, xác định với $x \\neq 0$. (Nguyên bản mục "Đáp án PHT số 1" — Mức Giỏi.)',
    },
    {
      level: 'VD',
      question:
        'PHT số 1 — Nhiệm vụ C (Mức Giỏi) b): Chứng minh $\\int \\dfrac{1}{2x+1} dx = \\dfrac{1}{2}\\ln \\mid 2x+1 \\mid + C$.',
      answer:
        'Với $2x + 1 \\neq 0$: đạo hàm của $\\frac{1}{2}\\ln \\mid 2x+1 \\mid$ là $\\frac{1}{2} \\cdot \\frac{2}{2x+1} = \\frac{1}{2x+1}$ — đúng định nghĩa nguyên hàm (điều kiện $2x+1 \\neq 0$ cho phép dùng $\\ln \\mid \\cdot \\mid$). (Nguyên bản phụ lục PHT số 1 — Nhiệm vụ C b.)',
    },
    {
      level: 'VD',
      question:
        'PHT số 2 — Mức TB (SGK tr. 12): Tìm nguyên hàm $F(x)$ của hàm số $f(x) = 4x^3 - 2x + 1$, biết $F(1) = 5$. (Gợi ý bước đệm: Bước 1 tính họ $F(x)$; Bước 2 thay $x = 1$ cho kết quả bằng 5 để tìm $C$.)',
      answer:
        '$F(x) = \\int (4x^3 - 2x + 1)dx = x^4 - x^2 + x + C$; $F(1) = 1 - 1 + 1 + C = 5 \\Rightarrow C = 4$. Vậy $F(x) = x^4 - x^2 + x + 4$. (Nguyên bản mục "Đáp án PHT số 2" giáo án.)',
    },
    {
      level: 'VD',
      question:
        'PHT số 2 — Mức Khá: Tìm nguyên hàm $F(x)$ của hàm số $f(x) = 2\\cos x - 3e^x$, biết $F(0) = 1$. (Chú ý: tính chính xác $\\cos 0$ và $e^0$.)',
      answer:
        '$F(x) = \\int (2\\cos x - 3e^x)dx = 2\\sin x - 3e^x + C$; $F(0) = 2\\sin 0 - 3e^0 + C = -3 + C = 1 \\Rightarrow C = 4$. Vậy $F(x) = 2\\sin x - 3e^x + 4$. (Nguyên bản mục "Đáp án PHT số 2" giáo án.)',
    },
  ],
  quick: [
    {
      question:
        'Mini-check [TH] (Pha 2 Bước 3): Tìm $\\int \\sin x\\, dx$ và $\\int e^{2x}\\, dx$.',
      solution:
        '$\\int \\sin x\\, dx = -\\cos x + C$ và $\\int e^{2x}\\, dx = \\frac{e^{2x}}{2} + C$ (do $(e^{2x})\' = 2e^{2x}$). Vinh danh lỗi sai gốc: khoảng 25% lớp viết $\\int \\sin x\\, dx = \\cos x + C$ — quên dấu trừ; nguyên hàm là phép toán ngược, đạo hàm của $\\cos x$ là $-\\sin x$ nên nguyên hàm của $\\sin x$ bắt buộc mang dấu trừ. (Nguyên văn đề + đáp án Pha 2 Bước 3 giáo án.)',
    },
    {
      question:
        'Mini-quiz câu 1 [NB] (Pha 4.1): Tìm họ nguyên hàm của hàm số $f(x) = 5^x + \\cos x$.',
      solution:
        '$\\int (5^x + \\cos x)dx = \\frac{5^x}{\\ln 5} + \\sin x + C$. (Nguyên bản mục "ĐÁP ÁN MINI-QUIZ" giáo án.)',
    },
    {
      question:
        'Mini-quiz câu 2 [TH] + câu 3 [VDC] (Pha 4.1): (2) Tìm hàm số $f(x)$ biết $f\'(x) = 6x^2 - 4x$ và $f(2) = 10$. (3) Một quả bóng được ném thẳng đứng lên từ mặt đất với vận tốc ban đầu $v_0 = 20$ m/s. Bỏ qua sức cản không khí, gia tốc trọng trường là $a(t) = -9{,}8$ m/s$^2$. Tính độ cao cực đại quả bóng đạt được.',
      solution:
        '(2) $f(x) = \\int (6x^2 - 4x)dx = 2x^3 - 2x^2 + C$; $f(2) = 2 \\cdot 8 - 2 \\cdot 4 + C = 10 \\Rightarrow C = 2$, vậy $f(x) = 2x^3 - 2x^2 + 2$. (3) $v(t) = \\int (-9{,}8)dt = -9{,}8t + C_1$; $v(0) = 20 \\Rightarrow C_1 = 20$. $h(t) = \\int v(t)dt = -4{,}9t^2 + 20t + C_2$; $h(0) = 0 \\Rightarrow C_2 = 0$. Đạt đỉnh khi $v(t) = 0 \\Leftrightarrow t = \\frac{20}{9{,}8} \\approx 2{,}04$ s; $h_{\\max} = h(2{,}04) \\approx 20{,}41$ m. (Nguyên bản mục "ĐÁP ÁN MINI-QUIZ" giáo án.)',
    },
  ],
  mistakes: [
    'Quên viết hằng số + C khi kết luận họ nguyên hàm — ~30% HS mắc theo căn cứ điều chỉnh từ tiết trước; đầu mỗi hoạt động đổi bảng kiểm chéo việc ghi C.',
    'Nhầm tính chất ∫[f(x)·g(x)]dx với phép nhân ∫f·∫g — KHÔNG có nguyên hàm của một tích bằng tích các nguyên hàm (~40% HS nhầm; ∫x·e^x dx cần phương pháp mới ở tiết sau).',
    'Quên trị tuyệt đối: ∫ (1/x) dx = ln|x| + C, không được viết ln x + C — bẫy AI-error S4 ("bạn Nam").',
    'Nhầm dấu nguyên hàm lượng giác: (sin x)′ = cos x nhưng ∫ sin x dx = −cos x + C — bẫy vinh danh lỗi sai S7; bổ sung bước đệm √x = x^{1/2} khi cộng thêm 1 đơn vị.',
  ],
  timelineKey: 'gateD77',
  boardKnowledge: [
    'I. BẢNG NGUYÊN HÀM CỦA MỘT SỐ HÀM SỐ SƠ CẤP',
    '1. Hàm số lũy thừa và hàm phân thức: ∫ 0 dx = C; ∫ 1 dx = x + C; ∫ x^α dx = x^(α+1)/(α+1) + C (α ≠ −1); ∫ (1/x) dx = ln|x| + C (x ≠ 0).',
    '2. Hàm số mũ: ∫ e^x dx = e^x + C; ∫ a^x dx = a^x/ln a + C (0 < a ≠ 1).',
    '3. Hàm số lượng giác: ∫ cos x dx = sin x + C; ∫ sin x dx = −cos x + C; ∫ 1/cos²x dx = tan x + C; ∫ 1/sin²x dx = −cot x + C.',
    '4. ⚠ Lỗi phổ biến cần tránh: nhầm dấu — (sin x)′ = cos x nhưng ∫ sin x dx = −cos x + C; quên trị tuyệt đối — ∫ (1/x) dx = ln|x| + C, không được viết ln x + C.',
    'II. BÀI TOÁN TÌM NGUYÊN HÀM THỎA MÃN ĐIỀU KIỆN BAN ĐẦU',
    'a. Quy trình chuẩn 2 bước: Bước 1 — tìm họ nguyên hàm tổng quát ∫ f(x)dx = F(x) + C; Bước 2 — thay x = x₀, giải phương trình F(x₀) + C = y₀ ⇒ C = y₀ − F(x₀); kết luận hàm số cụ thể.',
    'b. Ý nghĩa hình học (Hình 2 gốc — mô tả bằng lời: các parabol y = x² − 1 (C = −1), y = x² + 1 (C = 1), y = x² + 2 màu đỏ với điểm M₀(1; 3) nét đứt): các đường cong nguyên hàm tịnh tiến song song theo phương Oy; điều kiện F(x₀) = y₀ ghim chặt một đường cong duy nhất.',
    'c. Mở rộng [SÁNG TẠO]: nếu ∫ f(x)dx = F(x) + C thì ∫ f(ax+b)dx = (1/a)F(ax+b) + C (a ≠ 0) — đạo hàm hàm hợp xuất hiện thêm nhân tử a.',
    'III. ỨNG DỤNG — Kinh tế học: tổng chi phí C(x) = ∫ C′(x)dx, trong đó hằng số C đại diện cho định phí ban đầu; bỏ quên C đồng nghĩa với bỏ qua trạng thái ban đầu, khiến toàn bộ mô hình dự báo sai lệch.',
  ],
};

const aiError77 = {
  key: '12-11-77',
  mode: 'micro',
  category: 'Thiếu điều kiện',
  wrongSolution: 'AI trình bày: ∫ (1/x) dx = ln x + C.',
  correction:
    'Tập xác định của 1/x là ℝ∖{0} nên nguyên hàm phải là ln|x| + C (x ≠ 0) — biểu thức trong dấu logarit luôn dương trên cả hai nhánh; chỉ viết ln x là mất nguyên hàm trên khoảng (−∞; 0).',
  proof:
    'Đạo hàm của ln|x| là 1/x với mọi x ≠ 0: với x > 0 thì (ln x)′ = 1/x; với x < 0 thì (ln(−x))′ = (−1)/(−x) = 1/x — hai nhánh đều thỏa, trong khi (ln x)′ = 1/x chỉ đúng trên (0; +∞) (Hình 1 gốc: đồ thị f(x) = 1/x và F(x) = ln x + C chỉ vẽ trên (0; +∞)). [Gộp whyAiError: AI quên trị tuyệt đối — đúng lỗi giáo án nhấn mạnh ở mục "⚠ Lỗi phổ biến cần tránh" ("∫ (1/x) dx = ln|x| + C, không được viết ln x + C") và ở bẫy [PHẢN BIỆN] Bước 2; nhóm Giỏi PHT số 1 yêu cầu "chỉ rõ tập xác định".] [Gộp boardPrompt — bảng lớn AI-error, nội dung công khai trên bảng thật: công thức đúng ∫ (1/x) dx = ln|x| + C (x ≠ 0) đặt cạnh bài làm sai; phác 2 nhánh theo Hình 1 gốc — KHÔNG viết lời giải PHT số 1/2.]',
  teacherPrompt:
    'Bạn Nam viết ∫ (1/x) dx = ln x + C. Theo em khẳng định này đúng hoàn toàn chưa? Tại sao?',
  studentProduct:
    'Thẻ chọn ĐÚNG/SAI trên máy + 1 dòng phản biện (chỉ ra thiếu trị tuyệt đối |x| hoặc nêu miền xác định: sai khi x < 0).',
};

j.lessonSpecs.push(spec77);
j.aiErrors['12-11-77'] = aiError77;
j.source.files['tasks/giaoan-goc-12-11-77.md'] = '';
writeFileSync(P, JSON.stringify(j, null, 2) + '\n', 'utf8');
console.log(
  'MERGED specs=' + j.lessonSpecs.length + ' aiErrors=' + Object.keys(j.aiErrors).length + ' files=' + Object.keys(j.source.files).length,
);

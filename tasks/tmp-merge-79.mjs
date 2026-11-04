// Gộp spec 11-11-79 + aiError 11-11-79 + file giáo án vào snapshot batch2 (chưa fingerprint).
// Sau khi chạy: node tasks/tmp-hash-batch2.mjs để tính lại files + fingerprint.
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json';
const j = JSON.parse(readFileSync(P, 'utf8'));
if (j.lessonSpecs.some((s) => s.key === '11-11-79')) {
  j.lessonSpecs = j.lessonSpecs.filter((s) => s.key !== '11-11-79');
  delete j.aiErrors['11-11-79'];
}

const spec79 = {
  key: '11-11-79',
  grade: 11,
  week: 11,
  period: 79,
  kind: 'practice',
  lessonType: 'practice',
  selfChoice: false,
  title: 'Hai mặt phẳng song song',
  focus:
    'Luyện tập kĩ thuật chứng minh hai mặt phẳng song song qua quy trình 3 bước (hai đường thẳng cắt nhau trong một mặt phẳng, từng đường song song với mặt phẳng kia) qua đường trung bình tam giác và hình bình hành; dựng thiết diện qua điểm cho trước song song với một mặt phẳng bên; phản biện kết luận bỏ điều kiện cắt nhau',
  formulas: [
    'a \\subset (P),\\; b \\subset (P),\\; a \\cap b = \\{I\\},\\; a \\parallel (Q),\\; b \\parallel (Q) \\implies (P) \\parallel (Q)',
    '(\\alpha) \\parallel (Q);\\quad (\\beta) \\cap (\\alpha) = d_1;\\quad (\\beta) \\cap (Q) = d_2 \\implies d_1 \\parallel d_2',
    'Quy tắc dựng giao tuyến: mặt phẳng cắt đi qua điểm nào và song song với đường nào thì kẻ đường thẳng qua điểm đó song song với đường đã cho',
    'Sơ đồ tư duy: Đường ∥ Đường ⟹ Đường ∥ Mặt ⟹ Mặt ∥ Mặt ⟹ ứng dụng xác định thiết diện',
  ],
  examples: [
    {
      question:
        'Bài toán chữa chung (Polya): Cho hình chóp $S.ABCD$ có đáy $ABCD$ là hình bình hành tâm $O$. Gọi $M, N, P$ lần lượt là trung điểm của $SA, SB, SC$. a) Chứng minh $(MNP) \\parallel (ABCD)$. b) Gọi $Q$ là trung điểm của $SD$. Chứng minh bốn điểm $M, N, P, Q$ đồng phẳng và tứ giác $MNPQ$ là hình bình hành. (Hình 1 gốc — mô tả bằng lời: hình chóp $S.ABCD$, nét đứt $AD, DC, SD$ và $MQ, QP$, nét liền $AB, BC, SA, SB, SC$, tứ giác $MNPQ$ tô đỏ nhạt.)',
      solution:
        'a) Trong $\\triangle SAB$, $MN$ là đường trung bình nên $MN \\parallel AB$; mà $AB \\subset (ABCD)$ nên $MN \\parallel (ABCD)$ (1). Trong $\\triangle SBC$, $NP$ là đường trung bình nên $NP \\parallel BC$; mà $BC \\subset (ABCD)$ nên $NP \\parallel (ABCD)$ (2). Mặt khác $MN, NP \\subset (MNP)$ và $MN \\cap NP = \\{N\\}$ (3). Từ (1), (2), (3): $(MNP) \\parallel (ABCD)$. b) $MN \\parallel AB$ và $MN = \\frac{1}{2}AB$; tương tự $PQ \\parallel CD$ và $PQ = \\frac{1}{2}CD$. Vì $ABCD$ hình bình hành nên $AB \\parallel CD$ và $AB = CD$, do đó $MN \\parallel PQ$ và $MN = PQ$ — tứ giác $MNPQ$ là hình bình hành, suy ra 4 điểm $M, N, P, Q$ đồng phẳng. (Nguyên bản mục III.1 giáo án.)',
    },
    {
      question:
        'Bài toán dựng thiết diện: Cho hình chóp $S.ABCD$ đáy $ABCD$ là hình bình hành. Điểm $M$ nằm trên đoạn $AB$ ($M$ không trùng $A, B$). Mặt phẳng $(\\alpha)$ đi qua $M$ và song song với mặt phẳng $(SBC)$. Tìm thiết diện của hình chóp cắt bởi $(\\alpha)$ và chứng minh hình dạng. (Hình 2 gốc — mô tả bằng lời: thiết diện $MNPQ$ tô xanh nhạt với $M \\in AB$, $N \\in CD$, $Q \\in SA$, $P \\in SD$; nét đứt $AD, DC, SD$ và $QP, PN$; nét liền $MN, MQ$.)',
      solution:
        'Bước 1 — giao tuyến với đáy: qua $M$ kẻ $MN \\parallel BC$ cắt $CD$ tại $N$ (đoạn giao tuyến thứ nhất $MN$). Bước 2 — giao tuyến với các mặt bên: qua $M$ kẻ $MQ \\parallel SB$ cắt $SA$ tại $Q$; qua $N$ kẻ $NP \\parallel SC$ cắt $SD$ tại $P$. Bước 3 — đoạn nối cuối: $QP = (\\alpha) \\cap (SAD)$; thiết diện là tứ giác $MNPQ$. Chứng minh: $(\\alpha) \\parallel (SBC)$, mà $(SAD) \\cap (SBC) = d_S$ (đường qua $S$ song song với $AD, BC$), suy ra $QP \\parallel d_S \\parallel BC$. Vì $QP \\parallel MN$ (cùng song song với $BC$) và $MQ \\not\\parallel NP$ (do $SB, SC$ cắt nhau tại $S$) nên $MNPQ$ là hình thang. (Nguyên bản mục III.2 + PHT số 2 giáo án.)',
    },
  ],
  exercises: [
    {
      level: 'NB',
      question:
        'Cho hình chóp $S.ABCD$, đáy $ABCD$ là hình bình hành. Gọi $M, N, P$ lần lượt là trung điểm của $SA, SB, SC$. Chứng minh $(MNP) \\parallel (ABCD)$. Điền vào chỗ trống: 1. $MN$ là đường trung bình $\\triangle SAB \\Rightarrow MN \\parallel \\dots \\subset (ABCD)$. 2. $NP$ là đường trung bình $\\triangle SBC \\Rightarrow NP \\parallel \\dots \\subset (ABCD)$. 3. Vì $MN \\cap NP = \\{\\dots\\}$ nên $(MNP) \\parallel (ABCD)$.',
      answer:
        '1. $MN \\parallel AB$; 2. $NP \\parallel BC$; 3. $MN \\cap NP = \\{N\\}$. (Đáp án PHT số 1 mức TB — nguyên bản khung điền khuyết phụ lục giáo án.)',
    },
    {
      level: 'TH',
      question:
        'Cho giả thiết như trên (gọi thêm $Q$ là trung điểm của $SD$). a) Chứng minh tứ giác $MNPQ$ là hình bình hành.',
      answer:
        '$MN \\parallel AB$ và $MN = \\frac{1}{2}AB$; $PQ \\parallel CD$ và $PQ = \\frac{1}{2}CD$; vì $ABCD$ hình bình hành nên $AB \\parallel CD$ và $AB = CD$, do đó $MN \\parallel PQ$ và $MN = PQ$ → tứ giác $MNPQ$ là hình bình hành. (Khớp mục III.1 giáo án.)',
    },
    {
      level: 'TH',
      question:
        'Cho giả thiết như trên. b) Chứng minh bốn điểm $M, N, P, Q$ đồng phẳng.',
      answer:
        '$MNPQ$ là hình bình hành (câu a) nên bốn điểm $M, N, P, Q$ đồng phẳng. (Khớp mục III.1 giáo án — kết luận hình bình hành kéo theo đồng phẳng.)',
    },
    {
      level: 'TH',
      question:
        'Cho giả thiết như trên. c) Khẳng định $(SAB) \\parallel (SCD)$ là đúng hay sai? Tại sao?',
      answer:
        'SAI — vì $AB \\parallel CD$ nên hai đường $AB \\subset (SAB)$ và $CD \\subset (SCD)$ không cắt nhau, thiếu giả thiết $a \\cap b = \\{I\\}$ của định lí điều kiện. (Đáp án tự lập luận, thầy đã duyệt 27/10.)',
    },
    {
      level: 'VD',
      question:
        'Cho hình chóp $S.ABCD$, đáy $ABCD$ là hình bình hành tâm $O$. Gọi $G$ là trọng tâm $\\triangle SAB$, điểm $K \\in SC$ sao cho $SK = \\frac{2}{3}SC$. Chứng minh rằng đường thẳng $GK$ song song với mặt phẳng $(SBD)$ hoặc $(ABCD)$ (chọn mặt phẳng thích hợp và chứng minh).',
      answer:
        'Chọn $(ABCD)$: gọi $I$ là trung điểm $AB$, xét trung tuyến $SI$ của $\\triangle SAB$ — $G$ thuộc $SI$ với $SG = \\frac{2}{3}SI$. Trong $\\triangle SIC$ có $\\frac{SG}{SI} = \\frac{SK}{SC} = \\frac{2}{3}$ nên theo Thales đảo $GK \\parallel IC$. Mà $I \\in AB \\subset (ABCD)$ và $C \\in (ABCD)$ nên $IC \\subset (ABCD)$, suy ra $GK \\parallel (ABCD)$. (Đề nguyên bản PHT số 1 mức Giỏi — giáo án không kèm đáp án tường minh; đáp án theo hướng tự lập luận đã duyệt, trình bày theo mẫu 3 bước.)',
    },
    {
      level: 'VD',
      question:
        'Bài toán dựng thiết diện (PHT số 2 — phần A): Cho hình chóp $S.ABCD$ đáy $ABCD$ là hình bình hành. Điểm $M$ nằm trên đoạn $AB$ ($M$ không trùng $A, B$). Mặt phẳng $(\\alpha)$ đi qua $M$ và song song với mặt phẳng $(SBC)$. Tìm thiết diện của hình chóp cắt bởi $(\\alpha)$ và chứng minh hình dạng. (Hình 2 gốc — mô tả bằng lời: thiết diện $MNPQ$ với $M \\in AB$, $N \\in CD$, $Q \\in SA$, $P \\in SD$.)',
      answer:
        'Bước 1 — qua $M$ kẻ $MN \\parallel BC$ cắt $CD$ tại $N$ (giao tuyến với đáy). Bước 2 — qua $M$ kẻ $MQ \\parallel SB$ cắt $SA$ tại $Q$; qua $N$ kẻ $NP \\parallel SC$ cắt $SD$ tại $P$. Bước 3 — nối $QP = (\\alpha) \\cap (SAD)$; thiết diện là tứ giác $MNPQ$. Chứng minh: $(\\alpha) \\parallel (SBC)$, mà $(SAD) \\cap (SBC) = d_S$ (đường qua $S$ song song với $AD, BC$) nên $QP \\parallel d_S \\parallel BC$; vì $QP \\parallel MN$ và $MQ \\not\\parallel NP$ (do $SB, SC$ cắt nhau tại $S$) nên $MNPQ$ là hình thang. (Nguyên bản mục III.2 + PHT số 2 giáo án.)',
    },
  ],
  quick: [
    {
      question:
        'Kiểm nhanh câu 1 [NB]: Cho hai mặt phẳng phân biệt $(P)$ và $(Q)$. Điều kiện nào sau đây ĐỦ để kết luận $(P) \\parallel (Q)$? A. $(P)$ và $(Q)$ cùng song song với một đường thẳng $d$ · B. $(P)$ chứa hai đường thẳng cùng song song với $(Q)$ · C. $(P)$ chứa hai đường thẳng cắt nhau cùng song song với $(Q)$ · D. Có vô số đường thẳng nằm trong $(P)$ song song với $(Q)$.',
      solution:
        'Đáp án C — bắt buộc 2 đường phải cắt nhau (định lí điều kiện đủ 4 giả thiết). (Nguồn: bảng đáp án mục IV giáo án.)',
    },
    {
      question:
        "Kiểm nhanh câu 2 [TH]: Cho hình chóp $S.ABCD$ đáy hình bình hành. Mặt phẳng $(\\alpha) \\parallel (ABCD)$ cắt các cạnh $SA, SB, SC, SD$ lần lượt tại $A', B', C', D'$. Tứ giác $A'B'C'D'$ là hình gì? A. Hình thang vuông · B. Hình bình hành · C. Hình thoi · D. Tứ giác không có cạnh song song.",
      solution:
        'Đáp án B — các cạnh đối song song từng đôi (giao tuyến song song với hai đường đáy cắt nhau). (Nguồn: bảng đáp án mục IV giáo án.)',
    },
    {
      question:
        'Kiểm nhanh câu 3 [VDC — HS Giỏi]: Cho tứ diện $ABCD$. Mặt phẳng $(\\beta)$ song song với cả 2 cạnh đối $AB$ và $CD$. Thiết diện thu được luôn là hình gì? (trả lời dạng chữ).',
      solution:
        'Hình bình hành — thiết diện song song lần lượt với $AB$ và $CD$. (Nguồn: bảng đáp án mục IV giáo án.)',
    },
  ],
  mistakes: [
    'Quên ghi điều kiện "hai đường thẳng cắt nhau tại một điểm" khi kết luận hai mặt phẳng song song — bẫy AI-error S4 (38% HS mắc theo căn cứ điều chỉnh từ tiết trước).',
    'Kết luận (MNPQ) ∥ (ABCD) từ hai đường MN ∥ AB, PQ ∥ CD — hai đường đó song song nhau (MN ∥ PQ) nên không phải cặp đường cắt nhau.',
    'Nhầm thiết diện MNPQ (qua M song song (SBC)) là hình bình hành — thực tế MQ ∥ SB, NP ∥ SC mà SB, SC cắt nhau tại S nên MQ ∦ NP, thiết diện là hình thang.',
    'Vẽ nét đứt/nét liền chưa đúng quy ước hình chiếu song song — quan sát mô hình 3D trước khi vẽ (căn cứ điều chỉnh gốc).',
  ],
  timelineKey: 'gateD79',
  boardKnowledge: [
    'II. QUY TRÌNH KIẾN THỨC VÀ KĨ NĂNG CỐT LÕI',
    '1. Quy trình 3 bước chứng minh (P) ∥ (Q)',
    'a. Bước 1 — chọn hai đường thẳng cắt nhau a, b ⊂ (P); Bước 2 — chứng minh a ∥ (Q) và b ∥ (Q) (đường trung bình, tỉ số Thales hoặc hình bình hành); Bước 3 — khẳng định đủ 4 điều kiện và kết luận (P) ∥ (Q).',
    'b. Định lí điều kiện: a ⊂ (P), b ⊂ (P), a ∩ b = {I}, a ∥ (Q), b ∥ (Q) ⟹ (P) ∥ (Q) — kiểm tra a ∩ b = {I} là bắt buộc.',
    '2. Định lí giao tuyến',
    'a. (α) ∥ (Q); (β) ∩ (α) = d₁; (β) ∩ (Q) = d₂ ⟹ d₁ ∥ d₂ (Hình Pha 1 gốc — mô tả bằng lời: hai mặt phẳng (P) trên và (Q) dưới; trong (P) hai đường đỏ a, b cắt nhau tại I; trong (Q) hai đường nét đứt xanh a′, b′ lần lượt song song a, b).',
    'b. Quy tắc dựng giao tuyến: mặt phẳng cắt đi qua điểm nào và song song với đường nào thì kẻ đường thẳng qua điểm đó song song với đường đã cho.',
    '3. Phương pháp dựng thiết diện qua M song song với mặt phẳng (Q)',
    'a. Tìm các mặt của hình chóp chứa các đường thẳng thuộc (Q); qua các điểm đã có, kẻ đoạn giao tuyến song song với các cạnh tương ứng; nối các giao điểm thu được đa giác thiết diện khép kín.',
    'b. Dạng 79: qua M ∈ AB — MN ∥ BC (N ∈ CD), MQ ∥ SB (Q ∈ SA), NP ∥ SC (P ∈ SD), nối QP = (α) ∩ (SAD) (Hình 2 gốc — thiết diện MNPQ).',
    '4. Sơ đồ tư duy toàn tiết: Đường ∥ Đường ⟹ Đường ∥ Mặt ⟹ Mặt ∥ Mặt ⟹ ứng dụng xác định thiết diện.',
    '5. Ứng dụng — giàn giáo xây dựng: hai thanh dầm chữ X bắt chéo song song sàn = hai đường cắt nhau cùng song song mặt phẳng sàn → đủ điều kiện (P) ∥ (Q); thanh song song chỉ cho một đường — chưa kết luận được.',
  ],
};

const aiError79 = {
  key: '11-11-79',
  mode: 'micro',
  category: 'Thiếu điều kiện',
  wrongSolution: 'AI trình bày: MN ∥ AB ⊂ (ABCD), PQ ∥ CD ⊂ (ABCD) ⇒ (MNPQ) ∥ (ABCD).',
  correction:
    'MN và PQ lần lượt song song với hai đường nằm trong (ABCD) nhưng MN ∥ PQ — hai đường không cắt nhau nên chưa đủ điều kiện; định lí điều kiện phải đủ 4 giả thiết: a ⊂ (P), b ⊂ (P), a ∩ b = {I}, a ∥ (Q), b ∥ (Q) ⇒ (P) ∥ (Q) — thiếu dòng a ∩ b = {I} là mất định lý.',
  proof:
    'Trong hình chóp với M, N, P, Q là các trung điểm: MN ∥ AB và PQ ∥ CD, mà ABCD hình bình hành nên AB ∥ CD, suy ra MN ∥ PQ — hai đường không có điểm chung, không thể là cặp đường thẳng cắt nhau trong một mặt phẳng để áp định lí. [Gộp whyAiError: AI bỏ điều kiện cắt nhau — đúng lỗi giáo án nhấn mạnh ở "căn cứ điều chỉnh từ tiết trước": 38% HS khi làm kiểm tra nhanh quên ghi điều kiện "hai đường thẳng cắt nhau tại một điểm" (thiết kế bài phản biện bắt lỗi ngụy biện logic ngay ở phần khởi động và hoạt động 1).] [Gộp boardPrompt — bảng lớn AI-error, nội dung công khai trên bảng thật: đóng khung định lí điều kiện đủ 4 giả thiết a ⊂ (P), b ⊂ (P), a ∩ b = {I}, a ∥ (Q), b ∥ (Q) ⇒ (P) ∥ (Q) đặt cạnh bài làm sai; nhấn mạnh "kiểm tra giao điểm a ∩ b = {I} là bắt buộc" — KHÔNG viết lời giải PHT số 1/2.]',
  teacherPrompt:
    'Ta có MN ∥ AB ⊂ (ABCD), PQ ∥ CD ⊂ (ABCD) ⇒ (MNPQ) ∥ (ABCD). Nhận xét đúng hay sai? Vì sao?',
  studentProduct:
    'Thẻ chọn ĐÚNG/SAI trên máy + 1 dòng nhận xét (chỉ ra MN ∥ PQ nên không cắt nhau — thiếu a ∩ b = {I} — hoặc nêu điều kiện đủ của định lí).',
};

j.lessonSpecs.push(spec79);
j.aiErrors['11-11-79'] = aiError79;
j.source.files['tasks/giaoan-goc-11-11-79.md'] = '';
writeFileSync(P, JSON.stringify(j, null, 2) + '\n', 'utf8');
console.log(
  'MERGED specs=' + j.lessonSpecs.length + ' aiErrors=' + Object.keys(j.aiErrors).length + ' files=' + Object.keys(j.source.files).length,
);

import fs from 'node:fs';

const SNAP_BATCH2 = 'src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json';
const data = JSON.parse(fs.readFileSync(SNAP_BATCH2, 'utf8'));

const updates = {
  '11-11-76': {
    whyAiError: 'Mô hình cộng các đầu mút, chia số nhóm rồi lại chia n — bỏ qua hoàn toàn vai trò của tần số và trung điểm.',
    boardPrompt: 'AI tính (2+4+6+8)/4 = 5 rồi chia 40. Công thức tính số trung bình ghép nhóm cần gì?',
    libraryTitle: 'Lỗi AI tính trung bình bằng cách cộng đầu mút bỏ qua tần số',
    teacherPrompt: 'Bạn Nam tính x̄ = (2 + 4 + 6 + 8)/4 = 5 rồi chia cho 40. Hãy chỉ lỗi và sửa lại phép tính đúng theo tần số và giá trị đại diện.',
    proof: 'c₁ = 1, c₂ = 3, c₃ = 5, c₄ = 7; Σ mᵢ cᵢ = 6 + 42 + 75 + 35 = 158; x̄ = 158/40 = 3,95 giờ — nằm giữa [2;4), hợp lý theo phân bố 6/14/15/5. Cách Nam: (2+4+6+8)/4 = 5 là trung bình các MÚT khoảng (không có ý nghĩa giá trị đại diện), lấy 5/40 = 0,125 giờ ≈ 7,5 phút — lệch hoàn toàn với dữ liệu.',
  },
  '11-11-78': {
    whyAiError: 'Mô hình bỏ qua điều kiện đồng phẳng, ngộ nhận hai đường thẳng không cắt nhau trong không gian luôn song song.',
    boardPrompt: 'AI kết luận a ∥ b khi chỉ có (α) ∥ (β). Định lý giao tuyến cần mặt phẳng thứ ba nào?',
    libraryTitle: 'Lỗi AI thiếu điều kiện mặt phẳng thứ ba khi suy ra hai đường song song',
    teacherPrompt: 'Nếu a ⊂ (α), b ⊂ (β) và (α) ∥ (β) thì a có luôn song song với b không? Hãy chỉ lỗi thiếu điều kiện và sửa lại định lý cho đúng.',
    proof: 'Phản ví dụ gốc: hai đường thẳng chéo nhau nằm trên trần và sàn nhà (trần ∥ sàn nhưng hai đường không song song). Định lý 1 phải đủ 3 giả thiết: (α) ∥ (β); (γ) ∩ (α) = a; (γ) ∩ (β) = b ⇒ a ∥ b — thiếu dòng giữa là mất định lý.',
  },
  '11-11-79': {
    whyAiError: 'Mô hình bỏ điều kiện hai đường thẳng phải cắt nhau, dẫn tới dùng hai đường song song để kết luận hai mặt phẳng song song.',
    boardPrompt: 'MN ∥ AB và PQ ∥ CD nhưng MN ∥ PQ. Cặp đường trong định lí có được song song nhau không?',
    libraryTitle: 'Lỗi AI dùng hai đường song song thay vì cắt nhau để chứng minh hai mặt phẳng song song',
    teacherPrompt: 'Ta có MN ∥ AB ⊂ (ABCD), PQ ∥ CD ⊂ (ABCD) ⇒ (MNPQ) ∥ (ABCD). Hãy chỉ lỗi và sửa lại: vì sao cần hai đường thẳng cắt nhau?',
    proof: 'Trong hình chóp với M, N, P, Q là các trung điểm: MN ∥ AB và PQ ∥ CD, mà ABCD hình bình hành nên AB ∥ CD, suy ra MN ∥ PQ — hai đường không có điểm chung, không thể là cặp đường thẳng cắt nhau trong một mặt phẳng để áp định lí.',
  },
  '12-11-77': {
    whyAiError: 'Mô hình quên dấu giá trị tuyệt đối, làm mất nhánh nguyên hàm trên khoảng âm (−∞; 0).',
    boardPrompt: 'AI viết ∫ (1/x) dx = ln x + C. Trên khoảng x < 0 thì hàm ln x có xác định không?',
    libraryTitle: 'Lỗi AI quên dấu giá trị tuyệt đối khi tìm nguyên hàm của 1/x',
    teacherPrompt: 'Bạn Nam viết ∫ (1/x) dx = ln x + C. Hãy chỉ lỗi và sửa lại công thức đúng trên toàn tập xác định ℝ∖{0}.',
    proof: 'Đạo hàm của ln|x| là 1/x với mọi x ≠ 0: với x > 0 thì (ln x)′ = 1/x; với x < 0 thì (ln(−x))′ = (−1)/(−x) = 1/x — hai nhánh đều thỏa, trong khi (ln x)′ = 1/x chỉ đúng trên (0; +∞).',
  },
  '12-11-78': {
    whyAiError: 'Mô hình đảo chiều phép trừ và lấy nhầm mút trái nhóm cuối thay vì mút phải.',
    boardPrompt: 'AI tính R = 35 − 10 = 25. Định nghĩa khoảng biến thiên ghép nhóm lấy mút nào trừ mút nào?',
    libraryTitle: 'Lỗi AI đảo chiều phép trừ và chọn sai đầu mút khi tính khoảng biến thiên',
    teacherPrompt: 'Một học sinh phát biểu: "Khoảng biến thiên của mẫu này là R = 35 − 10 = 25 triệu." Hãy chỉ lỗi và sửa lại phép tính R đúng theo hai đầu mút của mẫu.',
    proof: 'Theo định nghĩa: mẫu gồm m nhóm [a1; a2), …, [am; a(m+1)) thì R = a(m+1) − a1 — giá trị nhỏ nhất xấp xỉ đầu mút trái nhóm đầu (5) và giá trị lớn nhất xấp xỉ đầu mút phải nhóm cuối (40). Bài làm sai lấy 35 (đầu mút trái nhóm [35; 40) — vẫn có HS nằm trong nhóm đó) rồi trừ 10 (đầu mút phải nhóm [5; 10)) — vừa chọn sai mút vừa trừ ngược chiều.',
  },
  '12-11-79': {
    whyAiError: 'Mô hình làm tròn x̄ quá sớm ở bước trung gian khiến sai số bình phương khuếch đại lên gấp nhiều lần.',
    boardPrompt: 'Làm tròn x̄ ≈ 176,7 làm s² lệch gần 12 đơn vị. Quy tắc giữ số khi tính phương sai là gì?',
    libraryTitle: 'Lỗi AI làm tròn số trung bình quá sớm gây sai số dây chuyền ở phương sai',
    teacherPrompt: 'Bạn lấy x̄ ≈ 176,7 rồi tính s² ≈ 1235,4. Hãy chỉ lỗi làm tròn sớm và sửa lại cách tính giữ phân số tối giản để tránh sai số khuếch đại.',
    proof: 'Sai số làm tròn ε trên x̄ được bình phương khuếch đại: (x̄ ± ε)² = x̄² ± 2ε·x̄ + ε² — với x̄ ≈ 176,67 và ε ≈ 0,033 (176,7 thay 530/3) sai số thêm ≈ 2·0,033·176,7 ≈ 11,7, đúng bằng độ lệch quan sát 1247,22 − 1235,44. Căn cứ điều chỉnh gốc: gần 25% HS mắc lỗi này.',
  },
};

for (const [k, u] of Object.entries(updates)) {
  if (data.aiErrors[k]) {
    Object.assign(data.aiErrors[k], u);
    console.log(`Đã cập nhật AI Error cho ${k}`);
  }
}

fs.writeFileSync(SNAP_BATCH2, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('Xong: Cập nhật snapshot banToan-w11-batch2.snapshot.json');

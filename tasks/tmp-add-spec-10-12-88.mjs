import fs from 'fs';

const SNAPSHOT_PATH = 'src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json';
const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));

const newSpec10_12_88 = {
  "key": "10-12-88",
  "grade": 10,
  "week": 12,
  "period": 88,
  "kind": "formation",
  "lessonType": "formation",
  "selfChoice": false,
  "title": "Các số đặc trưng đo xu thế trung tâm",
  "focus": "Hình thành thuật toán xác định Tứ phân vị (Q1, Q2, Q3) và Mốt (Mo) của mẫu số liệu không ghép nhóm; hiểu bản chất phân vị 25%-50%-75%; nhận diện bẫy chưa sắp xếp dãy số và bẫy n lẻ / n chẵn",
  "formulas": [
    "Q_2 = Me \\quad (\\text{Trung vị của toàn bộ mẫu số liệu})",
    "Q_1: \\text{Trung vị của nửa mẫu số liệu bên trái } Q_2 \\text{ (không tính } Q_2 \\text{ khi } n \\text{ lẻ})",
    "Q_3: \\text{Trung vị của nửa mẫu số liệu bên phải } Q_2 \\text{ (không tính } Q_2 \\text{ khi } n \\text{ lẻ})",
    "M_o: \\text{Giá trị xuất hiện với tần số lớn nhất trong mẫu số liệu}"
  ],
  "examples": [
    {
      "question": "Số giờ làm thêm (OT) trong tháng của 11 nhân viên dự án công ty Alpha: 12, 5, 20, 8, 15, 12, 0, 18, 12, 10, 16 (giờ). Hãy tìm các tứ phân vị Q1, Q2, Q3 và mốt Mo của mẫu số liệu.",
      "solution": "Sắp xếp theo thứ tự không giảm: 0, 5, 8, 10, 12, 12, 12, 15, 16, 18, 20. Cỡ mẫu n = 11 (lẻ) nên Q2 = x₆ = 12. Nửa dưới gồm 5 số liệu: 0, 5, 8, 10, 12 → Q1 = 8. Nửa trên gồm 5 số liệu: 12, 15, 16, 18, 20 → Q3 = 16. Giá trị 12 xuất hiện 3 lần (nhiều nhất) nên Mo = 12. Ý nghĩa: 25% nhân viên làm thêm ≤ 8 giờ; 25% nhân viên làm thêm ≥ 16 giờ."
    },
    {
      "question": "Điểm kiểm tra của một nhóm 8 học sinh: 5, 6, 6, 7, 8, 8, 9, 10. Tìm các tứ phân vị và mốt.",
      "solution": "Dãy đã sắp xếp, n = 8 (chẵn) nên Q2 = (x₄ + x₅)/2 = (7 + 8)/2 = 7,5. Nửa dưới gồm 4 số: 5, 6, 6, 7 → Q1 = (6 + 6)/2 = 6. Nửa trên gồm 4 số: 8, 8, 9, 10 → Q3 = (8 + 9)/2 = 8,5. Hai giá trị 6 và 8 cùng xuất hiện 2 lần (nhiều nhất) nên mẫu có 2 mốt: Mo = 6 và Mo = 8."
    }
  ],
  "exercises": [
    {
      "level": "NB",
      "question": "Tìm các tứ phân vị Q1, Q2, Q3 của mẫu số liệu đã sắp xếp: 2, 4, 6, 8, 10, 12, 14.",
      "answer": "n = 7 lẻ; Q2 = x₄ = 8. Nửa dưới: 2, 4, 6 → Q1 = 4. Nửa trên: 10, 12, 14 → Q3 = 12."
    },
    {
      "level": "NB",
      "question": "Cho mẫu số liệu số con trong 10 hộ gia đình: 1, 2, 2, 2, 3, 2, 1, 4, 2, 3. Xác định mốt Mo của mẫu số liệu.",
      "answer": "Số 2 xuất hiện 5 lần (nhiều nhất) nên mốt Mo = 2 con."
    },
    {
      "level": "TH",
      "question": "Thời gian chờ xe buýt (phút) của 9 hành khách: 15, 4, 9, 18, 3, 7, 11, 14, 6. Tìm Q1, Q2, Q3.",
      "answer": "Sắp xếp lại: 3, 4, 6, 7, 9, 11, 14, 15, 18. n = 9 lẻ; Q2 = 9. Nửa dưới: 3, 4, 6, 7 → Q1 = (4 + 6)/2 = 5. Nửa trên: 11, 14, 15, 18 → Q3 = (14 + 15)/2 = 14,5."
    },
    {
      "level": "TH",
      "question": "Cho dãy số liệu điểm thi: 4, 5, 6, 7, 7, 8, 9, 9, 10, 10. Tìm các tứ phân vị và giải thích ý nghĩa của Q1.",
      "answer": "n = 10 chẵn; Q2 = (7 + 8)/2 = 7,5. Nửa dưới: 4, 5, 6, 7, 7 → Q1 = 6. Nửa trên: 8, 9, 9, 10, 10 → Q3 = 9. Ý nghĩa: Có khoảng 25% số học sinh có điểm thi ≤ 6."
    },
    {
      "level": "VD",
      "question": "Số lượng giày thể thao nam bán ra trong tuần tại một cửa hàng: Size 38: 4 đôi, Size 39: 12 đôi, Size 40: 35 đôi, Size 41: 18 đôi, Size 42: 6 đôi. a) Xác định mốt Mo và tính số trung bình x̄. b) Khi nhập hàng đợt tới, cửa hàng nên ưu tiên nhập cỡ giày nào?",
      "answer": "a) Size 40 có tần số lớn nhất (35 đôi) nên Mo = 40. x̄ = (38×4 + 39×12 + 40×35 + 41×18 + 42×6)/75 = 3010/75 ≈ 40,13. b) Cửa hàng nên nhập nhiều nhất cỡ giày 40 vì mốt phản ánh nhu cầu số đông khách hàng, không thể nhập cỡ giày lẻ 40,13 theo số trung bình."
    },
    {
      "level": "VD",
      "question": "Một mẫu gồm 8 số nguyên dương đã sắp xếp: 1, 3, 4, x, y, 9, 10, 12. Biết Q1 = 3,5; Q2 = 6,5; Q3 = 9,5. Tìm hai số nguyên x và y.",
      "answer": "Q1 = (3 + 4)/2 = 3,5 (đúng). Q3 = (9 + 10)/2 = 9,5 (đúng). Q2 = (x + y)/2 = 6,5 ⇔ x + y = 13. Vì dãy đã sắp xếp nên 4 ≤ x ≤ y ≤ 9. Các cặp nguyên (x, y) thỏa mãn là (4, 9), (5, 8), (6, 7)."
    }
  ],
  "quick": [
    {
      "question": "Bạn Bình tìm tứ phân vị của dãy 7, 2, 9, 4, 8, 3, 5 và ghi ngay Q2 = 4 (số đứng giữa). Bạn Bình sai ở bước nào?",
      "solution": "Bạn Bình chưa sắp xếp mẫu số liệu theo thứ tự không giảm; phải xếp lại: 2, 3, 4, 5, 7, 8, 9 rồi mới lấy Q2 = 5."
    },
    {
      "question": "Một mẫu số liệu gồm 5 giá trị: 12, 14, 15, 18, 20. Có bạn cho rằng mốt Mo = 20 vì là số lớn nhất. Nhận xét đúng hay sai?",
      "solution": "Sai. Mốt là giá trị có tần số xuất hiện nhiều nhất, không phải giá trị lớn nhất. Dãy này mỗi số xuất hiện 1 lần nên không có mốt."
    }
  ],
  "mistakes": [
    "Lấy trung vị và tứ phân vị khi CHƯA sắp xếp dãy số liệu.",
    "Nhầm lẫn giữa mốt (giá trị có tần số lớn nhất) với giá trị lớn nhất của mẫu số liệu.",
    "Tính cả Q2 vào nửa dưới và nửa trên khi cỡ mẫu n là số lẻ.",
    "Cho rằng mẫu số liệu luôn luôn phải có duy nhất một mốt (thực tế có thể có nhiều mốt hoặc không có mốt)."
  ],
  "boardKnowledge": [
    "II. NỘI DUNG",
    "1. Tứ phân vị (Q1, Q2, Q3)",
    "a. Ý nghĩa: Chia mẫu số liệu đã sắp xếp thành 4 phần bằng nhau (mỗi phần chứa xấp xỉ 25% số liệu).",
    "b. Quy tắc tính:",
    "   - Bước 1: Sắp xếp mẫu số liệu theo thứ tự không giảm.",
    "   - Bước 2: Tìm Q2 = Me (Trung vị của toàn bộ mẫu).",
    "   - Bước 3: Tìm Q1 là trung vị của nửa dưới; Q3 là trung vị của nửa trên.",
    "   - Lưu ý then chốt: Nếu n lẻ, không tính Q2 vào cả hai nửa mẫu; nếu n chẵn, chia đôi chính giữa.",
    "2. Mốt (Mo)",
    "a. Định nghĩa: Giá trị có tần số xuất hiện lớn nhất trong mẫu số liệu.",
    "b. Đặc điểm: Phù hợp nhất cho dữ liệu định danh hoặc nhu cầu sản xuất/tiêu dùng thực tế (cỡ áo, cỡ giày, màu sắc ưa chuộng).",
    "c. Mẫu có thể có 1 mốt, nhiều mốt, hoặc không có mốt.",
    "3. Ví dụ dẫn dắt",
    "a. Dãy OT Alpha (11 số): Sắp xếp 0, 5, 8, 10, 12, 12, 12, 15, 16, 18, 20 → Q1 = 8, Q2 = 12, Q3 = 16, Mo = 12.",
    "b. Mẫu 8 số chẵn: 5, 6, 6, 7, 8, 8, 9, 10 → Q1 = 6, Q2 = 7,5, Q3 = 8,5; Mo = 6 và 8."
  ]
};

const newAiError10_12_88 = {
  "key": "10-12-88",
  "category": "Lỗi khái niệm",
  "wrongSolution": "Cho mẫu số liệu: 7, 2, 9, 4, 8, 3, 5. AI giải: Cỡ mẫu n = 7, số chính giữa ở vị trí thứ tư là 4 nên Q2 = 4. Nửa dưới là 7, 2, 9 nên Q1 = 2. Nửa trên là 8, 3, 5 nên Q3 = 3.",
  "correction": "Phải sắp xếp dãy số liệu trước: 2, 3, 4, 5, 7, 8, 9. Khi đó Q2 = 5; nửa dưới 2, 3, 4 cho Q1 = 3; nửa trên 7, 8, 9 cho Q3 = 8.",
  "proof": "Tứ phân vị là các điểm phân vị trên trục số tăng dần. Nếu không sắp xếp, khái niệm 'nửa dưới' và 'nửa trên' không có nghĩa hình học và dẫn đến Q3 = 3 < Q1 = 2 (hoàn toàn vô lý vì Q1 ≤ Q2 ≤ Q3).",
  "whyAiError": "Mô hình ngôn ngữ xác định chỉ mục (index) chính giữa dựa trên thứ tự văn bản thô mà bỏ qua bước tiền xử lý sắp xếp số học.",
  "teacherPrompt": "Em đồng ý hay phản đối lời giải của AI? Hãy chỉ ra lỗ hổng lớn nhất và sửa lại cho đúng.",
  "studentProduct": "Thẻ Đ/S trên máy + chỉ rõ bước sắp xếp bị thiếu và tính lại bộ (Q1 = 3, Q2 = 5, Q3 = 8).",
  "boardPrompt": "AI tính: Q1 = 2, Q2 = 4, Q3 = 3 (Q3 nhỏ hơn Q1!). Phát hiện bẫy gì?",
  "libraryTitle": "Lỗi AI tìm tứ phân vị khi chưa sắp xếp dãy số liệu"
};

// Check if key already exists, replace or append
const existingIdx = snapshot.lessonSpecs.findIndex(s => s.key === newSpec10_12_88.key);
if (existingIdx >= 0) {
  snapshot.lessonSpecs[existingIdx] = newSpec10_12_88;
  console.log(`Replaced existing spec for ${newSpec10_12_88.key}`);
} else {
  snapshot.lessonSpecs.push(newSpec10_12_88);
  console.log(`Appended new spec for ${newSpec10_12_88.key}`);
}
snapshot.aiErrors[newSpec10_12_88.key] = newAiError10_12_88;

fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), 'utf8');
console.log('UPDATED SNAPSHOT SAVED SUCCESSFULLY. TOTAL SPECS:', snapshot.lessonSpecs.length);

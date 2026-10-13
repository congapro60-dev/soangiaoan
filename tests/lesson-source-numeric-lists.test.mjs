import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceNumericDrift} from '../lib/lesson/pedagogy.js';

const task = (prompt, labels = []) => ({prompt, inputSchema: {options: labels.map(label => ({label}))}});

test('four or more integer list items compare across spacing, signs and TeX wrappers', () => {
  assert.equal(sourceNumericDrift(task('Dãy số', ['4, 7, 10, 13']), 'Bốn số hạng đầu 4,7,10,13.'), false);
  assert.equal(sourceNumericDrift(task('Dãy số', ['4,7,10,13']), 'Bốn số hạng đầu 4, 7, 10, 13.'), false);
  assert.equal(sourceNumericDrift(task('Dãy số', ['−1, −2, −3, −4']), 'Các số -1,-2,-3,-4'), false);
  assert.equal(sourceNumericDrift(task('Dãy số', ['$\\{4, 7, 10, 13\\}$']), '$\\{4,7,10,13\\}$'), false);
});

test('integer-list recognition preserves decimal commas, thousands and literal rational/TeX semantics', () => {
  assert.equal(sourceNumericDrift(task('1,5'), '1.5'), false);
  assert.equal(sourceNumericDrift(task('1,5'), '1 và 5'), true);
  assert.equal(sourceNumericDrift(task('4,7'), '4 và 7'), true);
  assert.equal(sourceNumericDrift(task('4, 7, 10, 13.5'), '4,7,10,13'), true);
  assert.equal(sourceNumericDrift(task('1,5; 2,5; 3,5; 4,5'), '1.5; 2.5; 3.5; 4.5'), false);
  assert.equal(sourceNumericDrift(task('1,000,000,000'), '1'), true);
  assert.equal(sourceNumericDrift(task('1, 000, 000, 000'), '1,000,000,000'), false);
  assert.equal(sourceNumericDrift(task('$\\frac{1}{2}$'), '1/2'), false);
  assert.equal(sourceNumericDrift(task('$\\frac{1}{2}$'), '0,5'), true);
});

test('historical genuine list no longer drifts; absent distractor numbers still do', () => {
  const quote = "Nguồn kiểm tra luồng AI — nội dung Toán, không chứa dữ liệu học sinh.\nToán 11, Dãy số. Phạm vi: phân biệt chỉ số n với giá trị số hạng u_n; nhận biết dãy hữu hạn và vô hạn; chuyển đổi giữa liệt kê, công thức tổng quát, truy hồi và lời mô tả.\nVí dụ tự soạn: hội trường có 25 hàng, hàng đầu 18 ghế, mỗi hàng sau thêm 2 ghế. Miền chỉ số 1 ≤ n ≤ 25. Công thức u_n=18+2(n-1)=2n+16; truy hồi u_1=18, u_(n+1)=u_n+2 với 1 ≤ n < 25. Bốn số hạng đầu: 18,20,22,24. Nếu mở rộng quy luật cho mọi n thuộc N* thì nhận được dãy vô hạn, khác mô hình 25 hàng thực tế.\nCâu độc lập mới: hình que tính cần 4 que ở hình 1, thêm 3 que mỗi hình. w_n=3n+1; w_1=4; w_(n+1)=w_n+3; bốn số hạng đầu 4,7,10,13.\nYêu cầu: bản nháp tiết 40 phút, hai mục tiêu tự đặt không gán mã chuẩn chính thức khi chưa đối soát; 3 mức câu hỏi; kiểm tra lại và vé ra cửa cá nhân; gợi ý chỉ nêu cách làm, không ghi đáp án. Giáo viên duyệt mục tiêu, đáp án, nguồn và thời lượng trước dùng.";
  const prompt = 'Mô hình que tính có 4 que ở hình 1, mỗi hình tiếp theo thêm 3 que. Bốn số hạng đầu tiên của dãy số que tính (w_n) là dãy nào?';
  assert.equal(sourceNumericDrift(task(prompt, ['4, 7, 10, 13']), quote), false);
  assert.equal(sourceNumericDrift(task(prompt, ['4, 7, 10, 13', '4, 8, 12, 16', '1, 4, 7, 10', '3, 6, 9, 12']), quote), true);
  assert.equal(sourceNumericDrift(task('Dãy số', ['4, 7, 10, 999']), '4,7,10,13'), true);
});

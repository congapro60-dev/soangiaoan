import { describe, expect, it } from 'vitest';
import { namesSpecificProblem } from './topicHygiene';

describe('namesSpecificProblem', () => {
  it('bắt mọi kiểu tham chiếu số bài/câu cụ thể', () => {
    for (const bad of [
      'Bài 2', 'Bài số 2', 'Câu 3', 'Câu hỏi 4', 'BT2', 'BT 5', 'phần 2', 'mục 3', 'ý 1', 'đề 2',
      'Giải đúng và trọn vẹn Bài 2', 'Bài 2 và Bài 4a thiếu nêu mặt phẳng',
      'ý a', 'câu b', '2a', '4b', 'Câu 2a',
    ]) {
      expect(namesSpecificProblem(bad), bad).toBe(true);
    }
  });

  it('KHÔNG bắt nhầm chủ đề Toán chung có chứa số/chữ "bài"', () => {
    for (const ok of [
      'Vectơ và các phép toán', 'Hàm số bậc hai', 'Phương trình bậc 2 ẩn', 'Hệ thức lượng trong tam giác',
      'Tập hợp số tự nhiên N', 'Xác suất cổ điển', 'Vẽ đồ thị hàm bậc hai và giải quyết bài toán thực tiễn',
      'Biến đổi lượng giác cơ bản', 'Bài toán thực tiễn', 'Số gần đúng và sai số', '',
    ]) {
      expect(namesSpecificProblem(ok), ok).toBe(false);
    }
  });
});

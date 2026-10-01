import { describe, expect, it } from 'vitest';
import { formatStudentVnd, rowCostVnd, studentAiFeatureLabel, summarizeStudentAiCost, type StudentAiCostRow } from './studentAiCost';

const row = (over: Partial<StudentAiCostRow> = {}): StudentAiCostRow => ({
  id: 'u1',
  at: '2026-10-01T04:00:00.000Z',
  day: '2026-10-01',
  model: 'gemini-3.8-flash',
  feature: 'autoGrade',
  inputTokens: 1_000_000,
  outputTokens: 0,
  thoughtsTokens: 0,
  cachedTokens: 0,
  ...over,
});

describe('chi phí AI của học sinh', () => {
  it('quy tiền từ token theo bảng giá × tỷ giá, không phụ thuộc lượt có bị trừ ví hay không', () => {
    // 1 triệu token vào × $0,75 × 26.000 = 19.500đ
    expect(rowCostVnd(row(), 26_000)).toBe(19_500);
    // token suy nghĩ tính theo giá đầu ra: 1 triệu × $3,75 × 26.000 = 97.500đ
    expect(rowCostVnd(row({ inputTokens: 0, thoughtsTokens: 1_000_000 }), 26_000)).toBe(97_500);
    // lượt đã ghi tỷ giá riêng thì dùng tỷ giá đó
    expect(rowCostVnd(row({ usdVnd: 25_000 }), 26_000)).toBe(18_750);
  });

  it('lượt sinh ảnh tính theo số ảnh; model chưa có giá thì 0 (không đoán)', () => {
    expect(rowCostVnd(row({ model: 'imagen-4.0-generate-001', inputTokens: 0, images: 2 }), 26_000)).toBe(2_080); // 2 × $0,04 × 26.000
    expect(rowCostVnd(row({ model: 'mo-hinh-la' }), 26_000)).toBe(0);
  });

  it('gom hôm nay / 7 ngày gần nhất / tất cả, đúng ranh giới ngày', () => {
    const rows = [
      row({ id: 'a', day: '2026-10-01', at: '2026-10-01T03:00:00.000Z' }),
      row({ id: 'b', day: '2026-09-25', at: '2026-09-25T03:00:00.000Z', inputTokens: 500_000 }), // đúng 6 ngày trước: còn trong 7 ngày
      row({ id: 'c', day: '2026-09-24', at: '2026-09-24T03:00:00.000Z' }), // 7 ngày trước: ra khỏi cửa sổ
    ];
    const view = summarizeStudentAiCost(rows, '2026-10-01', 26_000);
    expect(view.totals.today).toEqual({ calls: 1, tokens: 1_000_000, vnd: 19_500 });
    expect(view.totals.week).toEqual({ calls: 2, tokens: 1_500_000, vnd: 29_250 });
    expect(view.totals.all).toEqual({ calls: 3, tokens: 2_500_000, vnd: 48_750 });
  });

  it('danh sách gần đây: mới nhất trước, cắt theo giới hạn, token ra gồm cả token suy nghĩ', () => {
    const rows = [
      row({ id: 'cu', at: '2026-09-30T01:00:00.000Z', day: '2026-09-30' }),
      row({ id: 'moi', at: '2026-10-01T05:00:00.000Z', outputTokens: 300, thoughtsTokens: 200, inputTokens: 1_000 }),
      row({ id: 'giua', at: '2026-10-01T02:00:00.000Z' }),
    ];
    const view = summarizeStudentAiCost(rows, '2026-10-01', 26_000, { recentLimit: 2 });
    expect(view.recent.map(item => item.id)).toEqual(['moi', 'giua']);
    expect(view.recent[0]).toMatchObject({ inputTokens: 1_000, outputTokens: 500, tokens: 1_500 });
  });

  it('không có lượt nào: mọi số 0, danh sách rỗng', () => {
    const view = summarizeStudentAiCost([], '2026-10-01', 26_000);
    expect(view.totals.all).toEqual({ calls: 0, tokens: 0, vnd: 0 });
    expect(view.recent).toEqual([]);
    expect(view.truncated).toBe(false);
  });

  it('tên hoạt động tiếng Việt; hoạt động lạ gọi chung là hỗ trợ học tập', () => {
    expect(studentAiFeatureLabel('autoGrade')).toBe('AI chấm bài nộp');
    expect(studentAiFeatureLabel('practice')).toBe('AI soạn bài luyện thêm cho em');
    expect(studentAiFeatureLabel('submitPractice')).toBe('AI chấm bài luyện thêm');
    expect(studentAiFeatureLabel('khong-biet')).toBe('AI hỗ trợ học tập');
  });

  it('định dạng tiền: dưới 1đ ghi "<1đ" nếu đã có lượt dùng, chưa dùng thì 0đ', () => {
    expect(formatStudentVnd(1_250)).toBe((1_250).toLocaleString('vi-VN') + 'đ');
    expect(formatStudentVnd(0, true)).toBe('<1đ');
    expect(formatStudentVnd(0, false)).toBe('0đ');
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GRADING_BUDGET_MS, STALE_GRADING_MS, maxDuration } from '../grade-homework';
import { STALE_GRADING_MS as CLIENT_STALE_GRADING_MS } from '../../src/lib/classroom/submissionSelection';

/**
 * Các hằng số thời gian của hàm chấm bài suy ra từ MỘT trần (`maxDuration`). Đổi trần mà quên một hằng số là
 * hoặc bài nộp kẹt "Đang chấm" (khoá chết quá muộn), hoặc worker còn sống bị giành khoá giữa chừng (khoá chết quá sớm),
 * hoặc hàm bị Vercel giết giữa chừng (ngân sách một bài vượt trần). Mỗi lần đều đã/đang là sự cố thật của lớp.
 */
describe('hàm chấm bài · các hằng số thời gian khớp nhau', () => {
  it('maxDuration khai ở vercel.json khớp hằng số trong mã', () => {
    const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8')) as {
      functions: Record<string, { maxDuration: number }>;
    };
    expect(config.functions['api/grade-homework.ts'].maxDuration).toBe(maxDuration);
  });

  it('khoá "đang chấm" chỉ bị coi là chết SAU khi hàm chắc chắn đã bị giết', () => {
    expect(STALE_GRADING_MS).toBeGreaterThan(maxDuration * 1000);
  });

  it('bản sao ngưỡng khoá chết ở trình duyệt bằng đúng bản ở máy chủ', () => {
    expect(CLIENT_STALE_GRADING_MS).toBe(STALE_GRADING_MS);
  });

  it('ngân sách một bài còn chừa chỗ cho việc trước khi khoá (tải ảnh ~12s) và sau khi chấm (ghi Firestore)', () => {
    expect(GRADING_BUDGET_MS).toBeLessThanOrEqual(maxDuration * 1000 - 30_000);
  });
});

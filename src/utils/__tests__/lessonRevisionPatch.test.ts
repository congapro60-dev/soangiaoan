import { describe, expect, it } from 'vitest';
import { applyLessonRevisionPatchResponse, buildLessonRevisionPatchPrompt } from '../lessonRevisionPatch';

const originalLesson = [
  '# Giáo án: Hàm số bậc hai',
  '',
  '## Hoạt động 1: Khởi động',
  'Giáo viên nêu tình huống thực tế về quỹ đạo bóng.',
  'Học sinh dự đoán dạng đồ thị và thảo luận nhanh theo cặp.',
  '',
  '## Hoạt động 2: Hình thành kiến thức',
  'Giáo viên hướng dẫn học sinh nhận diện đỉnh, trục đối xứng và bề lõm của parabol.',
  'Học sinh ghi nhận công thức tổng quát và điều kiện vận dụng.',
  '',
  '## Hoạt động 3: Luyện tập',
  'Học sinh giải ba bài tập theo mức độ tăng dần.',
  'Giáo viên quan sát, hỗ trợ nhóm còn nhầm lẫn về dấu của hệ số a.',
  '',
  '## Hoạt động 4: Vận dụng',
  'Học sinh mô hình hóa một tình huống tối ưu diện tích bằng hàm bậc hai.',
  'Các nhóm trình bày cách chọn biến và miền giá trị.',
  '',
  '## Hoạt động 5: Củng cố',
  'Giáo viên dùng phiếu thoát để kiểm tra một hiểu lầm phổ biến.',
  'Học sinh tự đánh giá mức độ tự tin trước khi kết thúc tiết học.',
].join('\n');

describe('lesson revision patch integration', () => {
  it('PATCH_SECTION modifies only activity 1 and preserves activities 2-5 byte-for-byte', () => {
    const replacementActivity1 = [
      'Giáo viên nêu tình huống thực tế về quỹ đạo bóng.',
      'Học sinh dự đoán dạng đồ thị và thảo luận nhanh theo cặp.',
      'GV bổ sung câu hỏi: Dấu của hệ số a làm parabol thay đổi như thế nào?',
    ].join('\n');

    const outcome = applyLessonRevisionPatchResponse(originalLesson, `
      <PATCH_SECTION>
        <HEADING>## Hoạt động 1: Khởi động</HEADING>
        <CONTENT>${replacementActivity1}</CONTENT>
      </PATCH_SECTION>
      Đã sửa riêng hoạt động khởi động.
    `);

    expect(outcome.status).toBe('applied');
    expect(outcome.appliedCount).toBe(1);
    expect(outcome.content).toContain('GV bổ sung câu hỏi');

    const untouchedTail = originalLesson.slice(originalLesson.indexOf('## Hoạt động 2: Hình thành kiến thức'));
    expect(outcome.content.slice(outcome.content.indexOf('## Hoạt động 2: Hình thành kiến thức'))).toBe(untouchedTail);
  });

  it('rejects legacy UPDATE_EDITOR full rewrites and leaves content unchanged with warning message', () => {
    const outcome = applyLessonRevisionPatchResponse(originalLesson, `
      <UPDATE_EDITOR>
      ## Hoạt động 1: Khởi động
      Nội dung mới.

      ## Hoạt động 2: Hình thành kiến thức
      *(giữ nguyên)*
      </UPDATE_EDITOR>
    `);

    expect(outcome.status).toBe('blocked');
    expect(outcome.content).toBe(originalLesson);
    expect(outcome.message).toContain('ghi đè toàn bộ');
    expect(outcome.warnings.join(' ')).toContain('ghi đè toàn bộ');
  });

  it('rejects PATCH_SECTION containing keep-original placeholders and leaves content unchanged', () => {
    const outcome = applyLessonRevisionPatchResponse(originalLesson, `
      <PATCH_SECTION>
        <HEADING>## Hoạt động 1: Khởi động</HEADING>
        <CONTENT>
        Thêm một câu hỏi mở đầu mới.
        *(giữ nguyên)*
        </CONTENT>
      </PATCH_SECTION>
    `);

    expect(outcome.status).toBe('blocked');
    expect(outcome.content).toBe(originalLesson);
    expect(outcome.message).toContain('placeholder');
  });

  it('builds a revision prompt that forbids full rewrite and requires patch tags', () => {
    const prompt = buildLessonRevisionPatchPrompt('sửa HĐ1', originalLesson);

    expect(prompt).toContain('PATCH_SECTION');
    expect(prompt).toContain('PATCH');
    expect(prompt).toContain('Tuyệt đối KHÔNG dùng <UPDATE_EDITOR>');
    expect(prompt).toContain(originalLesson);
  });
});

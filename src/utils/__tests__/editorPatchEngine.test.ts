import { describe, expect, it } from 'vitest';
import { applyEditorPatches, containsDangerousPlaceholder, stripEditorPatchTags } from '../editorPatchEngine';

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

describe('editorPatchEngine', () => {
  it('updates one lesson activity while preserving the other four activities exactly', () => {
    const updatedActivity1 = [
      'Giáo viên nêu tình huống thực tế về quỹ đạo bóng.',
      'Học sinh dự đoán dạng đồ thị và thảo luận nhanh theo cặp.',
      'Câu hỏi định hướng: Khi hệ số a thay đổi dấu, đồ thị sẽ mở lên hay mở xuống?',
    ].join('\n');

    const result = applyEditorPatches(originalLesson, `
      <PATCH_SECTION>
        <HEADING>## Hoạt động 1: Khởi động</HEADING>
        <CONTENT>${updatedActivity1}</CONTENT>
      </PATCH_SECTION>
      Đã bổ sung câu hỏi định hướng cho hoạt động khởi động.
    `);

    expect(result.appliedCount).toBe(1);
    expect(result.rejected).toHaveLength(0);
    expect(result.patched).toContain('Câu hỏi định hướng: Khi hệ số a thay đổi dấu');

    const untouchedTail = originalLesson.slice(originalLesson.indexOf('## Hoạt động 2: Hình thành kiến thức'));
    expect(result.patched.slice(result.patched.indexOf('## Hoạt động 2: Hình thành kiến thức'))).toBe(untouchedTail);
  });

  it('does not count unmatched headings as successfully applied patches', () => {
    const result = applyEditorPatches(originalLesson, `
      <PATCH_SECTION>
        <HEADING>## Hoạt động không tồn tại</HEADING>
        <CONTENT>Nội dung mới</CONTENT>
      </PATCH_SECTION>
    `);

    expect(result.appliedCount).toBe(0);
    expect(result.attemptedCount).toBe(1);
    expect(result.patched).toBe(originalLesson);
    expect(result.rejected[0]?.reason).toContain('Không tìm thấy heading');
  });

  it('blocks placeholder-based section rewrites that could erase remaining lesson content', () => {
    const result = applyEditorPatches(originalLesson, `
      <PATCH_SECTION>
        <HEADING>## Hoạt động 2: Hình thành kiến thức</HEADING>
        <CONTENT>
        Bổ sung một câu hỏi mới.
        *(Giữ nguyên như bản gốc)*
        </CONTENT>
      </PATCH_SECTION>
    `);

    expect(result.appliedCount).toBe(0);
    expect(result.patched).toBe(originalLesson);
    expect(result.warnings[0]).toContain('placeholder');
  });

  it('blocks legacy full editor rewrites and strips unsafe tags from chat feedback', () => {
    const aiResponse = `
      <UPDATE_EDITOR>
      ## Hoạt động 1: Khởi động
      Nội dung mới
      ## Hoạt động 2: Hình thành kiến thức
      *(Giữ nguyên như bản gốc)*
      </UPDATE_EDITOR>
      Tôi đã cập nhật giáo án.
    `;
    const result = applyEditorPatches(originalLesson, aiResponse);

    expect(result.appliedCount).toBe(0);
    expect(result.attemptedCount).toBe(1);
    expect(result.patched).toBe(originalLesson);
    expect(result.rejected[0]?.type).toBe('full-rewrite');
    expect(stripEditorPatchTags(aiResponse)).toBe('Tôi đã cập nhật giáo án.');
  });

  it('detects common truncation placeholders', () => {
    expect(containsDangerousPlaceholder('[Nội dung cũ giữ nguyên]')).toBe(true);
    expect(containsDangerousPlaceholder('...')).toBe(true);
    expect(containsDangerousPlaceholder('Nội dung đầy đủ không rút gọn.')).toBe(false);
  });
});

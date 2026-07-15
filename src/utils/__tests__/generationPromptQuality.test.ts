import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const readSource = (path: string) => readFileSync(join(root, path), 'utf8');

describe('generation prompt/export quality safeguards', () => {
  it('does not ask exam generation AI to emit raw HTML layout or centered HTML wrappers', () => {
    const source = readSource('src/utils/examUtils.ts');

    expect(source).not.toContain('có thể dùng HTML');
    expect(source).not.toContain('<div class="options-grid cols-4">');
    expect(source).not.toContain('<span class="option-label">');
    expect(source).toContain('TUYỆT ĐỐI KHÔNG dùng thẻ HTML');
    expect(source).toContain('**--- HẾT ---**');
  });

  it('uses a two-pass teaching-slide pipeline (outline + per-section detail) with real LaTeX instead of a single generic call', () => {
    const source = readSource('src/utils/exportUtils.ts');

    expect(source).not.toContain('phong cách TED Talk');
    expect(source).not.toContain('Tối đa 10 slides');
    // Kiến trúc 2 lượt: dàn ý (outline) trước, rồi soạn chi tiết từng phần — tránh trần
    // output token của 1 lệnh gọi duy nhất bó slide count xuống còn 9-10 (đã quan sát thực tế).
    expect(source).toContain('buildSlideOutlinePrompt');
    expect(source).toContain('buildSlideSectionPrompt');
    expect(source).toContain('14-22 slide');
    expect(source).toContain('bám sát ĐÚNG cấu trúc hoạt động thật của giáo án');
    expect(source).toContain('worked example');
    expect(source.toLowerCase()).toContain('sai lầm thường gặp');
    // Slide từ giáo án giờ CHO PHÉP công thức LaTeX thật (render ảnh khi xuất PPTX) —
    // trước đây prompt cấm LaTeX khiến công thức bị rút gọn sai/thiếu.
    expect(source).toContain('ĐƯỢC PHÉP và BẮT BUỘC giữ nguyên LaTeX chuẩn');
  });

  it('uses bounded page load waiting for lesson PDF export instead of networkidle0', () => {
    const source = readSource('api/export-lesson.ts');

    expect(source).not.toContain("waitUntil: 'networkidle0'");
    expect(source).toContain("waitUntil: 'load'");
  });

  it('does not seed adaptive generation with placeholder answer choices', () => {
    const source = readSource('src/lib/adaptive/adaptiveFromLessonPlan.ts');

    expect(source).not.toContain('A. Đáp án đúng');
    expect(source).not.toContain('Phương án nhiễu');
    expect(source).not.toContain('A. Phương án 1');
    expect(source).not.toContain('"A."');
    expect(source).toContain('A. 4');
    expect(source).toContain('B. -4');
  });
});

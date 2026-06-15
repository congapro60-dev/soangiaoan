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

  it('uses a teaching-slide prompt with enough slides and concrete classroom content instead of a generic TED prompt', () => {
    const source = readSource('src/utils/exportUtils.ts');

    expect(source).not.toContain('phong cách TED Talk');
    expect(source).not.toContain('Tối đa 10 slides');
    expect(source).toContain('12–18 slides');
    expect(source).toContain('dữ kiện, công thức, ví dụ và hoạt động học sinh');
    expect(source).toContain('worked example');
    expect(source).toContain('sai lầm thường gặp');
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

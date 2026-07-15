import { describe, expect, it } from 'vitest';
import { preprocessExamMarkdown, preprocessOptionGridsForWord } from '../examMarkdown';

describe('preprocessExamMarkdown', () => {
  it('sanitizes centered HTML wrappers around the exam end marker', () => {
    const output = preprocessExamMarkdown('<div style="text-align:center">**--- HẾT ---**</div>');

    expect(output).toBe('**--- HẾT ---**');
    expect(output).not.toContain('<div');
    expect(output).not.toContain('</div>');
  });
});

describe('preprocessOptionGridsForWord', () => {
  it('gộp 4 phương án NGẮN dạng list "- A. x" (đã qua forceOptionLinesToMarkdownList) thành bảng 4 cột', () => {
    const listified = '- A. 1\n- B. 2\n- C. 3\n- D. 4';
    const output = preprocessOptionGridsForWord(listified);

    expect(output).toBe('| A. 1 | B. 2 | C. 3 | D. 4 |\n| --- | --- | --- | --- |');
  });

  it('gộp 4 phương án dạng list in đậm "- **A.** x" thành bảng', () => {
    const listified = '- **A.** Hà Nội\n- **B.** Huế\n- **C.** Đà Nẵng\n- **D.** Hải Phòng';
    const output = preprocessOptionGridsForWord(listified);

    expect(output).toContain('| A. Hà Nội | B. Huế | C. Đà Nẵng | D. Hải Phòng |');
    expect(output).toContain('| --- | --- | --- | --- |');
  });

  it('gộp phương án dạng gốc chưa listify "A. x" (không có dấu -)', () => {
    const raw = 'A. Đúng\nB. Sai\nC. Không xác định\nD. Cả A và B';
    const output = preprocessOptionGridsForWord(raw);

    expect(output).toContain('A. Đúng');
    expect(output).toContain('| --- | --- | --- | --- |');
  });

  it('dùng bảng 2 cột khi phương án dài (>32 ký tự)', () => {
    const listified = [
      '- A. Đây là một đáp án khá dài để kiểm tra ngưỡng chia cột',
      '- B. Đáp án B cũng dài tương tự như đáp án A ở trên',
      '- C. Đáp án C ngắn',
      '- D. Đáp án D ngắn',
    ].join('\n');
    const output = preprocessOptionGridsForWord(listified);

    expect(output).toContain('| --- | --- |');
    expect(output).not.toContain('| --- | --- | --- | --- |');
  });

  it('KHÔNG đụng vào phương án có công thức display ($$) — giữ nguyên dạng list', () => {
    const listified = '- A. $$x^2$$\n- B. $$y^2$$\n- C. $$z^2$$\n- D. $$t^2$$';
    const output = preprocessOptionGridsForWord(listified);

    expect(output).toBe(listified);
  });

  it('KHÔNG đụng vào phương án có ảnh Markdown', () => {
    const listified = '- A. ![hình](x.png)\n- B. text\n- C. text\n- D. text';
    const output = preprocessOptionGridsForWord(listified);

    expect(output).toBe(listified);
  });

  it('KHÔNG chuyển khi ít hơn 4 phương án liên tiếp', () => {
    const onlyThree = '- A. 1\n- B. 2\n- C. 3';
    expect(preprocessOptionGridsForWord(onlyThree)).toBe(onlyThree);
  });

  it('giữ nguyên công thức inline ($...$) trong bảng — vẫn cho phép gộp', () => {
    const listified = '- A. $x=1$\n- B. $x=2$\n- C. $x=3$\n- D. $x=4$';
    const output = preprocessOptionGridsForWord(listified);

    expect(output).toContain('$x=1$');
    expect(output).toContain('| --- | --- | --- | --- |');
  });
});

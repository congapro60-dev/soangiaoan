import { describe, expect, it } from 'vitest';
import { assertClean, repairMathDeep, repairMathString, sanitizeDisplayText, stripInlineMarkdown, toPlainText } from './mathText';

/**
 * Golden strings — LẤY TỪ CHUỖI LỖI THẬT trong QA đợt 9 (BAOCAO_QA_BaiHocPhanHoa_2026-07-07.md).
 * Quy tắc (tasks/lessons.md): QA bắt được chuỗi lỗi mới → THÊM vào đây, không chỉ vá regex.
 */

describe('sanitizeDisplayText — F2: không phá vùng $...$ có sẵn', () => {
  it('chuỗi chuẩn "$a^2 = b^2 + c^2$ (hay $c^2 = a^2 - b^2$)" giữ nguyên, KHÔNG sinh thêm $', () => {
    const input = '$a^2 = b^2 + c^2$ (hay $c^2 = a^2 - b^2$)';
    const out = sanitizeDisplayText(input);
    expect(out).toBe(input);
    expect((out.match(/\$/g) || []).length).toBe(4);
  });

  it('không còn tái hiện lỗi tách đôi vùng math ($a^2 = $b^2 +$ c^2$)', () => {
    const out = sanitizeDisplayText('$a^2 = b^2 + c^2$');
    expect(out).toBe('$a^2 = b^2 + c^2$');
    expect(assertClean(out)).toBe(true);
  });

  it('giữ nguyên delimiter display math $$...$$, không bọc thành nhiều dấu $', () => {
    expect(sanitizeDisplayText('$$\\frac{x}{2}$$')).toBe('$$\\displaystyle \\frac{x}{2}$$');
  });
});

describe('sanitizeDisplayText — F1: option thiếu $ mở, LaTeX + unicode trộn lẫn', () => {
  it('"M\\left(...\\right)$" ($ lẻ cuối) → bọc lại thành 1 vùng math cân đối', () => {
    const input = 'M\\left(\\pm\\frac{25}{12};\\frac{\\sqrt{119}}{4}\\right)$';
    const out = sanitizeDisplayText(input);
    expect((out.match(/\$/g) || []).length % 2).toBe(0);
    expect(assertClean(out)).toBe(true);
    // Không còn lệnh LaTeX trần ngoài $...$
    const textParts = out.split('$').filter((_, i) => i % 2 === 0).join('');
    expect(textParts).not.toMatch(/\\(left|right|frac|sqrt)/);
  });

  it('bản trộn unicode như quan sát production "M\\left(± 25/12 ; \\frac{√119}{4}\\right)$" cũng được vá', () => {
    const input = 'M\\left(± 25/12 ; \\frac{√119}{4}\\right)$';
    const out = sanitizeDisplayText(input);
    expect(assertClean(out)).toBe(true);
  });

  it('giữ tiền tố nhãn "B." ngoài vùng math khi bọc', () => {
    const out = sanitizeDisplayText('B. \\frac{x^2}{16}-\\frac{y^2}{9}=1');
    expect(out.startsWith('B. $')).toBe(true);
    expect(assertClean(out)).toBe(true);
  });
});

describe('sanitizeDisplayText — F2: caret trần sát dấu =', () => {
  it('"a^2 =b^2 +c^2" (caret trần, có cái sát =) → toàn bộ thành unicode, không sót', () => {
    const out = sanitizeDisplayText('a^2 =b^2 +c^2');
    expect(out).not.toMatch(/\^/);
    expect(out).toContain('a²');
    expect(out).toContain('b²');
    expect(out).toContain('c²');
  });

  it('"a2=25>b^2 = 16" (hint Luyện tập thật) hết caret thô', () => {
    const out = sanitizeDisplayText('a2=25>b^2 = 16');
    expect(out).not.toMatch(/[a-zA-Z]\^\d/);
  });

  it('caret NẰM TRONG $...$ không bị đổi unicode (MathJax tự render)', () => {
    const out = sanitizeDisplayText('Elip $\\frac{x^2}{25}+\\frac{y^2}{9}=1$ có a=5');
    expect(out).toContain('x^2');
    expect(assertClean(out)).toBe(true);
  });
});

describe('stripInlineMarkdown + sanitize — E7 regression', () => {
  it('"- **A.** $\\frac{x^2}{16}$" → sạch markdown, math nguyên vẹn', () => {
    const out = sanitizeDisplayText(stripInlineMarkdown('- **A.** $\\frac{x^2}{16}$'));
    expect(out).not.toContain('**');
    expect(out).not.toMatch(/^\s*-/);
    expect(out).toContain('\\frac{x^2}{16}');
    expect(assertClean(out)).toBe(true);
  });
});

describe('toPlainText — F9: tiêu đề builder', () => {
  it('"…Elip với hệ thức $a^2 = b^2 + c^2$" → không còn $, caret thành unicode', () => {
    const out = toPlainText('Định nghĩa Elip với hệ thức $a^2 = b^2 + c^2$');
    expect(out).not.toContain('$');
    expect(out).toContain('a² = b² + c²');
  });

  it('"…tâm sai $e$ và \\frac{c}{a}" đọc được', () => {
    const out = toPlainText('Ý nghĩa tâm sai $e = \\frac{c}{a}$ của Elip');
    expect(out).not.toContain('$');
    expect(out).toContain('c/a');
  });
});

describe('repairMathString / repairMathDeep — D1#4: sạch từ nguồn', () => {
  it('cân $ lẻ nhưng KHÔNG đổi caret (giữ dữ liệu gốc)', () => {
    const out = repairMathString('M\\left(\\frac{1}{2}\\right)$');
    expect((out.match(/\$/g) || []).length % 2).toBe(0);
    expect(out).toContain('\\frac{1}{2}');
  });

  it('repairMathDeep bỏ qua tikzCode/srcDoc/id/URL', () => {
    const lesson = {
      id: 'adaptive-1',
      title: 'Elip $a^2=b^2+c^2$',
      tikzCode: '\\begin{tikzpicture}\\draw (0,0) circle (1);\\end{tikzpicture}',
      sim: { srcDoc: '<html><body>x^2</body></html>' },
      videoUrl: 'https://youtube.com/results?search_query=elip',
      prompt: 'Tính c biết \\frac{c}{a} = 0.5$',
    };
    const out = repairMathDeep(lesson);
    expect(out.tikzCode).toBe(lesson.tikzCode);
    expect(out.sim.srcDoc).toBe(lesson.sim.srcDoc);
    expect(out.videoUrl).toBe(lesson.videoUrl);
    expect(out.title).toBe(lesson.title); // đã cân sẵn → giữ nguyên
    expect((out.prompt.match(/\$/g) || []).length % 2).toBe(0);
  });
});

describe('an toàn tổng quát', () => {
  it('chuỗi thuần tiếng Việt không đổi', () => {
    const input = 'Ghi lại dự đoán rồi đối chiếu khi học — chưa chắc cũng không sao.';
    expect(sanitizeDisplayText(input)).toBe(input);
  });

  it('chuỗi rỗng/undefined trả rỗng', () => {
    expect(sanitizeDisplayText(undefined)).toBe('');
    expect(sanitizeDisplayText('   ')).toBe('');
  });
});

describe('sanitizeDisplayText — production-like hình học không có delimiter', () => {
  it('tách các dòng công thức trần thành từng vùng math để kết luận dài không tràn một dòng', () => {
    const input = [
      'ax+by\\le c\\quad(\\text{hoặc }<,\\ge,>)\\quad a,b\\ \\text{không đồng thời bằng }0',
      '(x_0;y_0)\\ \\text{là nghiệm nếu thay vào làm bất phương trình đúng}',
      '15x+10y\\le150',
      '3x+2y\\le30',
    ].join('\n');

    const out = sanitizeDisplayText(input);
    const lines = out.split('\n').map(line => line.trim()).filter(Boolean);

    expect(lines).toHaveLength(4);
    expect(lines.every(line => line.startsWith('$') && line.endsWith('$'))).toBe(true);
    expect(lines[2]).toBe('$15x+10y\\le150$');
    expect(lines[3]).toBe('$3x+2y\\le30$');
    expect(assertClean(out)).toBe(true);
  });

  it('giữ trọn luỹ thừa trước lệnh LaTeX trong công thức trần', () => {
    const out = sanitizeDisplayText(String.raw`a^2=b^2+c^2-2bc\cos A`);

    expect(out).toBe(String.raw`$a^2=b^2+c^2-2bc\cos A$`);
    expect(assertClean(out)).toBe(true);
  });

  it('bọc từng đoạn công thức và giữ liên từ tiếng Việt ngoài vùng math', () => {
    const input = 'D \\in (CDE) và AB \\in (SAB) => DE \\cap AB = {F} => F là điểm chung của (CDE) và (SAB)';

    const out = sanitizeDisplayText(input);

    expect(out).toContain('$D \\in (CDE)$');
    expect(out).toContain('$AB \\in (SAB)$');
    expect(out).toContain('$DE \\cap AB = {F}$');
    expect(out).toContain('F là điểm chung');
    expect(assertClean(out)).toBe(true);
  });

  it('giữ delimiter LaTeX hiện có và chỉ đổi => bên trong vùng math', () => {
    const input = 'Kết luận \\(a => b\\) và \\[\\frac{1}{2}\\]';

    expect(sanitizeDisplayText(input)).toBe('Kết luận $a \\Rightarrow b$ và $$\\displaystyle \\frac{1}{2}$$');
  });

  it('giữ lệnh LaTeX không hỗ trợ ở fallback text mà không chèn HTML', () => {
    const out = sanitizeDisplayText('Ký hiệu \\unknown{x} vẫn giữ nội dung');

    expect(out).toContain('\\unknown{x}');
    expect(out).not.toContain('<');
  });

  it('đưa => vào một đoạn math riêng và đổi thành \\Rightarrow', () => {
    const out = sanitizeDisplayText('DE \\in (CDE) và AB \\in (SAB) => DE \\cap AB = {F} => F là điểm chung');

    expect(out).toContain('$\\Rightarrow$');
    expect(out).not.toContain('=>');
    expect(out).toContain('$DE \\in (CDE)$ và $AB \\in (SAB)$');
    expect(out).toContain('$DE \\cap AB = {F}$');
    expect(out).toContain('F là điểm chung');
  });

  it('không nuốt phần văn bản tiếng Việt trước công thức có lệnh LaTeX', () => {
    const out = sanitizeDisplayText('Vì ta có \\frac{x}{y} = 1 nên kết luận đúng.');

    expect(out).toContain('Vì ta có ');
    expect(out).toContain('$\\frac{x}{y} = 1$');
    expect(out).toContain(' nên kết luận đúng.');
    expect(out).not.toContain('$Vì');
  });

  it('nhận diện đủ nhóm lệnh hình học và đại số dùng trong lớp học', () => {
    const input = 'D \\notin A \\subset B \\supset C \\cap D \\cup E \\Rightarrow F \\Leftrightarrow G \\to H \\le I \\ge J \\ne K \\frac{x}{y} + \\sqrt{x} + \\underline{x} + \\text{và} + \\mathrm{AB} + \\mathbf{x}';
    const out = sanitizeDisplayText(input);

    expect(out.startsWith('$')).toBe(true);
    expect(out.endsWith('$')).toBe(true);
    for (const command of ['\\notin', '\\subset', '\\supset', '\\cap', '\\cup', '\\Rightarrow', '\\Leftrightarrow', '\\to', '\\le', '\\ge', '\\ne', '\\frac', '\\sqrt', '\\underline', '\\text', '\\mathrm', '\\mathbf']) {
      expect(out).toContain(command);
    }
    expect(assertClean(out)).toBe(true);
    expect(out).not.toContain('<');
  });

  it('khôi phục toán tử dạng chữ từ dữ liệu chấm cũ nhưng không đổi câu tiếng Việt', () => {
    const input = 'D in SA, SA subset (SAB) => D in (SAB); E in SB, SB subset (SAB) => E in (SAB); Suy ra DE subset (SAB).';

    const out = sanitizeDisplayText(input);

    expect(out).toContain('$D \\in SA, SA \\subset (SAB)$');
    expect(out).toContain('D \\in (SAB)');
    expect(out).toContain('E \\in SB, SB \\subset (SAB)');
    expect(out).toContain('E \\in (SAB)');
    expect(out).toContain('DE \\subset (SAB)');
    expect(out).toContain('$\\Rightarrow$');
    expect(sanitizeDisplayText('Học sinh in bài rồi.')).toBe('Học sinh in bài rồi.');
  });
});

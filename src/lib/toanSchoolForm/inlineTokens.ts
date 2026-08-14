// Bộ tách markup inline DÙNG CHUNG cho hai đường xuất form Toán (.docx và HTML→PDF).
//
// AI sinh markdown nên nội dung ô bảng lẫn `**đậm**`, `*nghiêng*`, `$công thức$` và `<br/>`
// (ô bảng markdown không xuống dòng được nên đó là cách duy nhất). Nếu mỗi đường xuất tự
// tách lấy thì chắc chắn sẽ lệch nhau — đúng loại lỗi mà người dùng đã báo: Word in ra
// `<br/>` thành chữ trong khi bản xem trên web vẫn xuống dòng bình thường.

export type InlineToken =
  | { kind: 'text'; text: string; bold: boolean; italic: boolean }
  | { kind: 'break' }
  | { kind: 'math'; latex: string; display: boolean; bold: boolean };

// Placeholder đủ đặc trưng để không đụng số/chữ thường trong văn bản.
const MATH_MARK = /@@MATH([0-9]+)@@/g;

// `*nghiêng*` — CHỈ nhận khi dấu * ôm sát chữ và nằm ở biên từ, để không ăn nhầm phép nhân
// kiểu "3*4" hay dấu * dùng làm chú thích. Chuỗi `**đậm**` được tách trước nên không lọt vào.
const ITALIC_RE = /(^|[\s(["'«])\*(\S(?:[^*\n]*\S)?)\*(?=$|[\s).,;:!?\]"'»])/g;

const pushPlain = (out: InlineToken[], text: string, bold: boolean): void => {
  text.split('\n').forEach((line, li) => {
    if (li > 0) out.push({ kind: 'break' });
    if (line === '') return;
    let cursor = 0;
    ITALIC_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = ITALIC_RE.exec(line)) !== null) {
      const before = line.slice(cursor, m.index) + m[1];
      if (before) out.push({ kind: 'text', text: before, bold, italic: false });
      out.push({ kind: 'text', text: m[2], bold, italic: true });
      cursor = m.index + m[0].length;
    }
    const tail = line.slice(cursor);
    if (tail) out.push({ kind: 'text', text: tail, bold, italic: false });
  });
};

/**
 * Tách một đoạn văn bản thành chuỗi token phẳng. `bold` trên token là đậm DO MARKUP;
 * bên gọi tự OR thêm đậm theo ngữ cảnh (tiêu đề, dải màu, ô header bảng).
 */
export const tokenizeInline = (input: string): InlineToken[] => {
  const slots: { latex: string; display: boolean }[] = [];
  const stashed = (input || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\$\$([^$]+)\$\$/g, (_, e: string) => { slots.push({ latex: e, display: true }); return `@@MATH${slots.length - 1}@@`; })
    .replace(/\$([^$\n]+)\$/g, (_, e: string) => { slots.push({ latex: e, display: false }); return `@@MATH${slots.length - 1}@@`; });

  const out: InlineToken[] = [];
  stashed.split(/\*\*/).forEach((seg, i) => {
    const bold = i % 2 === 1;
    let last = 0;
    MATH_MARK.lastIndex = 0;
    let mm: RegExpExecArray | null;
    while ((mm = MATH_MARK.exec(seg)) !== null) {
      if (mm.index > last) pushPlain(out, seg.slice(last, mm.index), bold);
      const slot = slots[Number(mm[1])];
      if (slot) out.push({ kind: 'math', latex: slot.latex.trim(), display: slot.display, bold });
      last = mm.index + mm[0].length;
    }
    if (last < seg.length) pushPlain(out, seg.slice(last), bold);
  });
  return out;
};

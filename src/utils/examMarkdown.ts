const fencedSvgPattern = /```(?:xml|svg)\s*\n([\s\S]*?<svg[\s\S]*?<\/svg>[\s\S]*?)\n```/gi;

const OPTION_LABEL = '(?:\\*\\*)?[A-D]\\.(?:\\*\\*)?';

const splitInlineMultipleChoiceOptions = (value: string): string => value
  // Normalize the common bad output: "A. ... B. ... C. ... D. ..." on one line.
  // Keep it conservative: only split when all four labels are present in order.
  .replace(
    new RegExp(`(^|\\n)(${OPTION_LABEL}\\s+)([^\\n]+?)\\s+(${OPTION_LABEL}\\s+)([^\\n]+?)\\s+(${OPTION_LABEL}\\s+)([^\\n]+?)\\s+(${OPTION_LABEL}\\s+)([^\\n]+)`, 'g'),
    (_match, prefix, aLabel, aText, bLabel, bText, cLabel, cText, dLabel, dText) =>
      `${prefix}${aLabel}${String(aText).trim()}\n${bLabel}${String(bText).trim()}\n${cLabel}${String(cText).trim()}\n${dLabel}${String(dText).trim()}`
  );

const forceOptionLinesToMarkdownList = (value: string): string => value.replace(
  /(^|\n)(?!\s*-\s*)((?:\*\*)?\s*[A-D]\.(?:\*\*)?\s+)/g,
  (_match, prefix, label) => `${prefix}- ${String(label).replace(/\s+/g, ' ')}`
);

/**
 * Normalize AI-generated exam Markdown before preview/export.
 * Handles common Gemini variants: \(...\), \[...\], align/equation environments,
 * one-line A/B/C/D options, and Unicode normalization for Vietnamese text.
 */
// ── Word export: gộp 4 phương án A/B/C/D liền nhau thành bảng lưới (grid) ──────────
// preprocessExamMarkdown() ở trên đã ép mọi dòng "A. ..." thành list "- A. ..." (kể cả
// "- **A.** ..." nếu gốc in đậm). Regex dưới khớp CẢ 3 dạng: "A. x" gốc, "- A. x" sau khi
// listify, "- **A.** x" list+bold — để chạy đúng trên nội dung THẬT đi vào export Word.
const OPTION_LINE_PREFIX = '(?:-\\s*)?(?:\\*\\*)?';
const OPTION_LINE_SUFFIX = '(?:\\*\\*)?';
const optionLine = (letter: string) => `${OPTION_LINE_PREFIX}(${letter}\\.)${OPTION_LINE_SUFFIX}[ \\t]+([^\\n]+)`;
const FOUR_OPTIONS_RE = new RegExp(
  `^${optionLine('A')}\\n+${optionLine('B')}\\n+${optionLine('C')}\\n+${optionLine('D')}(?=\\n|$)`,
  'gm'
);

const escapeTableCell = (str: string): string => str.replace(/\|/g, '\\|');

/**
 * Gộp 4 phương án A/B/C/D liền nhau thành bảng Markdown 2 hoặc 4 cột thay vì 4 dòng rời —
 * đây là nguyên nhân chính khiến bản Word xuất ra "xấu": trước đây hàm này tồn tại nhưng
 * KHÔNG được gọi ở đường xuất Word thật (chỉ có ở một API endpoint không dùng tới), nên đề
 * thi luôn xuất ra 4 dòng bullet rời rạc. Bỏ qua khi có display math ($$) hoặc ảnh — layout
 * hẹp không đủ chỗ cho công thức lớn, giữ nguyên dạng list cho những trường hợp đó.
 */
export const preprocessOptionGridsForWord = (markdown: string): string => {
  if (!markdown) return '';
  return markdown.replace(FOUR_OPTIONS_RE, (match, aLabel, aText, bLabel, bText, cLabel, cText, dLabel, dText) => {
    const a = `${aLabel} ${aText}`.trim();
    const b = `${bLabel} ${bText}`.trim();
    const c = `${cLabel} ${cText}`.trim();
    const d = `${dLabel} ${dText}`.trim();
    const maxLen = Math.max(a.length, b.length, c.length, d.length);
    const hasMathOrMedia = /\$\$/.test(match) || /\\\[/.test(match) || /!\[/.test(match) || /<img/i.test(match);

    if (hasMathOrMedia || maxLen > 70) return match;

    if (maxLen > 32) {
      return `| ${escapeTableCell(a)} | ${escapeTableCell(b)} |\n| --- | --- |\n| ${escapeTableCell(c)} | ${escapeTableCell(d)} |`;
    }
    return `| ${escapeTableCell(a)} | ${escapeTableCell(b)} | ${escapeTableCell(c)} | ${escapeTableCell(d)} |\n| --- | --- | --- | --- |`;
  });
};

export const preprocessExamMarkdown = (input: string): string => {
  if (!input) return '';

  const normalized = input
    .normalize('NFC')
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, math) => `\n$$\n${String(math).trim()}\n$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, math) => `$${String(math).trim()}$`)
    .replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, (_match, math) => `\n$$\n${String(math).trim()}\n$$\n`)
    .replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, (_match, inner) => `\n${String(inner).trim()}\n`)
    .replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, (_match, inner) => ` ${String(inner).trim()} `)
    .replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, (_match, math) => `\n$$\n\\begin{aligned}\n${String(math).trim()}\n\\end{aligned}\n$$\n`)
    .replace(fencedSvgPattern, (_match, svg) => `\n\n\`\`\`xml\n${String(svg).trim()}\n\`\`\`\n\n`);

  return forceOptionLinesToMarkdownList(splitInlineMultipleChoiceOptions(normalized)).trim();
};

import { downloadBlob, safeFilename } from './fileUtils';

const SVG_PLACEHOLDER = '% [Hình vẽ minh họa SVG đã được loại bỏ, vui lòng chèn ảnh hoặc mã TikZ tại đây]';

const escapeLatexText = (value: string): string => value
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'");

const convertMarkdownOutsideMath = (input: string): string => {
  const mathBlocks: string[] = [];
  const tokenized = input.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*(?:\n(?!\n)[^$\n]*)*\$/g, match => {
    const token = `@@MATH_BLOCK_${mathBlocks.length}@@`;
    mathBlocks.push(match);
    return token;
  });

  const converted = tokenized
    .replace(/\*\*([^*\n][\s\S]*?[^*\n])\*\*/g, (_match, text) => `\\textbf{${String(text).trim()}}`)
    .replace(/(?<!\*)\*([^*\n][^*\n]*?[^*\n])\*(?!\*)/g, (_match, text) => `\\textit{${String(text).trim()}}`)
    .replace(/^#{1,2}\s+(.+)$/gm, (_match, title) => `\\section*{${String(title).trim()}}`)
    .replace(/^#{3,4}\s+(.+)$/gm, (_match, title) => `\\subsection*{${String(title).trim()}}`)
    .replace(/^\s*-\s+/gm, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '\\hrule\n\\vspace{0.5em}');

  return converted.replace(/@@MATH_BLOCK_(\d+)@@/g, (_match, index) => mathBlocks[Number(index)] ?? '');
};

export const markdownToExamLatex = (rawMarkdown: string): string => {
  const withoutHtml = escapeLatexText(rawMarkdown || '')
    .normalize('NFC')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, `\n${SVG_PLACEHOLDER}\n`)
    .replace(/<div\b[^>]*>/gi, '')
    .replace(/<\/div>/gi, '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, math) => `\n$$\n${String(math).trim()}\n$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, math) => `$${String(math).trim()}$`);

  const body = convertMarkdownOutsideMath(withoutHtml)
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T5]{fontenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb,geometry,longtable,booktabs,array}
\\geometry{a4paper,margin=2cm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0.45em}

\\begin{document}
${body}
\\end{document}
`;
};

export const exportLaTeX = (rawMarkdown: string, filename = 'De_thi_kiem_tra'): string => {
  const latex = markdownToExamLatex(rawMarkdown);
  const blob = new Blob([latex], { type: 'text/x-tex;charset=utf-8' });
  downloadBlob(blob, `${safeFilename(filename, 'De_thi_kiem_tra')}.tex`);
  return latex;
};

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

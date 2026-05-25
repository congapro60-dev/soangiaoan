import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { marked, Token, Tokens } from 'marked';
import { downloadBlob, safeFilename } from './fileUtils';

const FONT = 'Times New Roman';
const BODY_SIZE = 26; // 13pt, docx uses half-points
const SMALL_SIZE = 24; // 12pt
const TITLE_SIZE = 28; // 14pt

interface RunStyle {
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

const stripHtml = (value: string): string => value.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

const dataUrlToUint8Array = (dataUrl: string): Uint8Array | null => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const imageTypeFromDataUrl = (dataUrl: string): 'png' | 'jpg' | 'gif' | 'bmp' | undefined => {
  if (dataUrl.startsWith('data:image/png')) return 'png';
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'jpg';
  if (dataUrl.startsWith('data:image/gif')) return 'gif';
  if (dataUrl.startsWith('data:image/bmp')) return 'bmp';
  return undefined;
};

const buildImageParagraph = (src: string): Paragraph | null => {
  const bytes = dataUrlToUint8Array(src);
  const type = imageTypeFromDataUrl(src);
  if (!bytes || !type) return null;

  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 120 },
    children: [
      new ImageRun({
        data: bytes,
        type,
        transformation: {
          width: 360,
          height: 220,
        },
      } as any),
    ],
  });
};

const extractImageParagraphsFromHtml = (html: string): Paragraph[] => {
  const paragraphs: Paragraph[] = [];
  const imageRegex = /<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = imageRegex.exec(html)) !== null) {
    const paragraph = buildImageParagraph(match[1]);
    if (paragraph) paragraphs.push(paragraph);
  }

  const svgRegex = /<svg[\s\S]*?<\/svg>/gi;
  while ((match = svgRegex.exec(html)) !== null) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [
          new TextRun({
            text: '[Hình SVG/vector được giữ trong bản PDF/HTML; Word cần chèn lại từ preview nếu cần chỉnh sửa.]',
            italics: true,
            font: FONT,
            size: SMALL_SIZE,
          }),
        ],
      })
    );
  }

  return paragraphs;
};

const flattenInline = (tokens: any[] | undefined, style: RunStyle = {}): TextRun[] => {
  if (!tokens?.length) return [];
  const runs: TextRun[] = [];

  tokens.forEach(token => {
    if (!token) return;
    switch (token.type) {
      case 'strong':
        runs.push(...flattenInline(token.tokens, { ...style, bold: true }));
        break;
      case 'em':
        runs.push(...flattenInline(token.tokens, { ...style, italic: true }));
        break;
      case 'codespan':
        runs.push(new TextRun({ text: token.text || '', font: 'Courier New', size: SMALL_SIZE }));
        break;
      case 'link':
      case 'del':
        runs.push(...flattenInline(token.tokens, style));
        break;
      case 'br':
        runs.push(new TextRun({ break: 1 }));
        break;
      case 'html': {
        const raw = token.raw || token.text || '';
        if (/^<br\s*\/?\s*>$/i.test(raw.trim())) {
          runs.push(new TextRun({ break: 1 }));
        } else if (!/<img\b|<svg\b/i.test(raw)) {
          const text = stripHtml(raw);
          if (text) runs.push(new TextRun({ text, font: FONT, size: BODY_SIZE, bold: style.bold, italics: style.italic }));
        }
        break;
      }
      case 'text':
      case 'escape':
      default: {
        if (token.tokens?.length) {
          runs.push(...flattenInline(token.tokens, style));
        } else {
          const text = token.text ?? token.raw ?? '';
          if (text) {
            runs.push(new TextRun({ text, font: FONT, size: BODY_SIZE, bold: style.bold, italics: style.italic }));
          }
        }
      }
    }
  });

  return runs;
};

const buildCellParagraphs = (cell: Tokens.TableCell): Paragraph[] => {
  const runs = flattenInline((cell as any).tokens || [{ type: 'text', text: cell.text || '' }]);
  return [new Paragraph({ children: runs.length ? runs : [new TextRun({ text: '', font: FONT, size: SMALL_SIZE })] })];
};

const buildTable = (tableToken: Tokens.Table): Table => {
  const columnCount = tableToken.header.length || 1;
  const cellWidth = Math.floor(100 / columnCount);

  const headerRow = new TableRow({
    tableHeader: true,
    children: tableToken.header.map((header: any) => new TableCell({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: flattenInline(header.tokens || [{ type: 'text', text: header.text || '' }]).map(run => run),
      })],
      shading: { fill: 'F8FAFC', type: 'clear' },
      margins: { top: 90, bottom: 90, left: 90, right: 90 },
      width: { size: cellWidth, type: WidthType.PERCENTAGE },
    })),
  });

  const bodyRows = tableToken.rows.map((row: any[]) => new TableRow({
    cantSplit: true,
    children: row.map((cell: any) => new TableCell({
      children: buildCellParagraphs(cell),
      margins: { top: 90, bottom: 90, left: 90, right: 90 },
      width: { size: cellWidth, type: WidthType.PERCENTAGE },
    })),
  }));

  return new Table({
    rows: [headerRow, ...bodyRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    },
  });
};

const paragraphFromText = (text: string, options: { bold?: boolean; center?: boolean; italic?: boolean } = {}) => new Paragraph({
  alignment: options.center ? AlignmentType.CENTER : AlignmentType.LEFT,
  spacing: { before: 60, after: 60, line: 300 },
  keepLines: /^\s*(Câu\s+\d+|[A-D]\.)/i.test(text),
  children: [
    new TextRun({
      text,
      font: FONT,
      size: BODY_SIZE,
      bold: options.bold,
      italics: options.italic,
    }),
  ],
});

const processTokens = (tokens: Token[], output: any[]) => {
  tokens.forEach(token => {
    switch (token.type) {
      case 'heading': {
        const heading = token as Tokens.Heading;
        output.push(new Paragraph({
          alignment: heading.depth <= 2 ? AlignmentType.CENTER : AlignmentType.LEFT,
          heading: heading.depth === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
          spacing: { before: 100, after: 80 },
          keepNext: true,
          children: flattenInline(heading.tokens || [{ type: 'text', text: heading.text }]).map(run => run),
        }));
        break;
      }
      case 'paragraph': {
        const paragraph = token as Tokens.Paragraph;
        const raw = (paragraph as any).raw || paragraph.text || '';
        const imageParagraphs = extractImageParagraphsFromHtml(raw);
        if (imageParagraphs.length) {
          const text = stripHtml(raw.replace(/<img\b[^>]*>/gi, '').replace(/<svg[\s\S]*?<\/svg>/gi, ''));
          if (text) output.push(paragraphFromText(text));
          output.push(...imageParagraphs);
        } else {
          output.push(new Paragraph({
            spacing: { before: 60, after: 60, line: 300 },
            keepLines: /^\s*(Câu\s+\d+|[A-D]\.)/i.test(paragraph.text),
            children: flattenInline(paragraph.tokens || [{ type: 'text', text: paragraph.text }]),
          }));
        }
        break;
      }
      case 'list': {
        const list = token as Tokens.List;
        list.items.forEach((item: any) => {
          output.push(new Paragraph({
            spacing: { before: 40, after: 40, line: 300 },
            bullet: list.ordered ? undefined : { level: 0 },
            numbering: list.ordered ? { reference: 'exam-numbering', level: 0 } : undefined,
            children: flattenInline(item.tokens?.[0]?.tokens || [{ type: 'text', text: item.text || '' }]),
          }));
        });
        break;
      }
      case 'table':
        output.push(buildTable(token as Tokens.Table));
        break;
      case 'html': {
        const html = (token as any).raw || (token as any).text || '';
        const imageParagraphs = extractImageParagraphsFromHtml(html);
        if (imageParagraphs.length) output.push(...imageParagraphs);
        else {
          const text = stripHtml(html);
          if (text) output.push(paragraphFromText(text));
        }
        break;
      }
      case 'code': {
        const code = token as Tokens.Code;
        output.push(paragraphFromText(code.text || '', { italic: true }));
        break;
      }
      case 'hr':
      case 'space':
        break;
      default: {
        const raw = (token as any).raw || '';
        if (raw.trim()) output.push(paragraphFromText(stripHtml(raw)));
      }
    }
  });
};

export const exportExamToDocx = async (
  markdown: string,
  title = 'De_thi_kiem_tra'
): Promise<void> => {
  const children: any[] = [];
  const tokens = marked.lexer(markdown.normalize('NFC'));
  processTokens(tokens, children);

  const doc = new Document({
    creator: 'SmartPlan AI',
    title,
    numbering: {
      config: [
        {
          reference: 'exam-numbering',
          levels: [{
            level: 0,
            format: 'decimal',
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 360, hanging: 260 } } },
          }],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: FONT, size: BODY_SIZE },
          paragraph: { spacing: { line: 300, before: 40, after: 40 } },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { font: FONT, size: TITLE_SIZE, bold: true },
          paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 } },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { font: FONT, size: BODY_SIZE, bold: true },
          paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 } },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
            margin: { top: 1134, right: 1021, bottom: 1134, left: 1701 },
          },
        },
        children: children.length ? children : [paragraphFromText(markdown)],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${safeFilename(title || 'De_thi_kiem_tra')}.docx`);
};

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  BorderStyle,
  AlignmentType,
} from 'docx';
import { marked, Token, Tokens } from 'marked';
import { LessonPlan } from '../types';
import { downloadBlob } from './fileUtils';

type HeadingLevelValue = (typeof HeadingLevel)[keyof typeof HeadingLevel];

interface RunStyle {
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

const FONT = 'Times New Roman';
const SIZE_14PT = 28; // docx size = half-points

// Recursively flatten inline tokens into TextRun[], preserving bold/italic context.
const flattenInline = (tokens: any[] | undefined, style: RunStyle = {}): TextRun[] => {
  if (!tokens || tokens.length === 0) return [];
  const runs: TextRun[] = [];
  for (const t of tokens) {
    if (!t) continue;
    switch (t.type) {
      case 'strong':
        runs.push(...flattenInline(t.tokens, { ...style, bold: true }));
        break;
      case 'em':
        runs.push(...flattenInline(t.tokens, { ...style, italic: true }));
        break;
      case 'codespan':
        runs.push(
          new TextRun({
            text: t.text || '',
            bold: style.bold,
            italics: style.italic,
            font: 'Courier New',
            size: SIZE_14PT,
          })
        );
        break;
      case 'del':
        runs.push(...flattenInline(t.tokens, style));
        break;
      case 'link':
        runs.push(...flattenInline(t.tokens, style));
        break;
      case 'br':
        runs.push(new TextRun({ break: 1 }));
        break;
      case 'html': {
        // marked emits inline <br/> as html token. Treat as line break.
        const raw = (t.raw || t.text || '').trim().toLowerCase();
        if (/^<br\s*\/?>$/.test(raw)) {
          runs.push(new TextRun({ break: 1 }));
        } else {
          // Strip tags as last resort
          const stripped = (t.text || t.raw || '').replace(/<[^>]+>/g, '');
          if (stripped) {
            runs.push(
              new TextRun({
                text: stripped,
                bold: style.bold,
                italics: style.italic,
                font: FONT,
                size: SIZE_14PT,
              })
            );
          }
        }
        break;
      }
      case 'text':
      case 'escape':
      default: {
        // 'text' tokens may have nested tokens (when text contains inline emphasis)
        if (t.tokens && t.tokens.length > 0) {
          runs.push(...flattenInline(t.tokens, style));
        } else {
          const text = t.text ?? t.raw ?? '';
          if (text) {
            runs.push(
              new TextRun({
                text,
                bold: style.bold,
                italics: style.italic,
                font: FONT,
                size: SIZE_14PT,
              })
            );
          }
        }
      }
    }
  }
  return runs;
};

// Build paragraphs for a single table cell. <br/> splits paragraphs; otherwise all inline tokens go in ONE paragraph.
const buildCellParagraphs = (cell: Tokens.TableCell): Paragraph[] => {
  const inlineTokens: any[] = (cell as any).tokens || [];
  const groups: any[][] = [[]];
  for (const tok of inlineTokens) {
    const raw = ((tok.raw || tok.text || '') as string).trim().toLowerCase();
    const isBr = tok.type === 'br' || (tok.type === 'html' && /^<br\s*\/?>$/.test(raw));
    if (isBr) {
      groups.push([]);
    } else {
      groups[groups.length - 1].push(tok);
    }
  }

  const paragraphs: Paragraph[] = [];
  for (const group of groups) {
    const runs = flattenInline(group);
    if (runs.length === 0) continue;
    paragraphs.push(new Paragraph({ children: runs }));
  }
  if (paragraphs.length === 0) {
    paragraphs.push(new Paragraph({ children: [] }));
  }
  return paragraphs;
};

const getCellWidth = (idx: number, total: number): number => {
  if (total === 3) {
    if (idx === 0) return 30; // GV
    if (idx === 1) return 30; // HS
    return 40; // Ghi bảng
  }
  if (total === 0) return 100;
  return Math.floor(100 / total);
};

const headingLevelFor = (depth: number): HeadingLevelValue => {
  switch (depth) {
    case 1:
      return HeadingLevel.HEADING_1;
    case 3:
      return HeadingLevel.HEADING_3;
    case 4:
      return HeadingLevel.HEADING_4;
    case 5:
      return HeadingLevel.HEADING_5;
    case 6:
      return HeadingLevel.HEADING_6;
    default:
      return HeadingLevel.HEADING_2;
  }
};

const processTokens = (tokens: Token[], context: any[]) => {
  for (const token of tokens) {
    switch (token.type) {
      case 'heading': {
        const h = token as Tokens.Heading;
        context.push(
          new Paragraph({
            children: flattenInline(h.tokens || [{ type: 'text', text: h.text }]),
            heading: headingLevelFor(h.depth),
            spacing: { before: 200, after: 120 },
          })
        );
        break;
      }

      case 'paragraph': {
        const p = token as Tokens.Paragraph;
        context.push(
          new Paragraph({
            children: flattenInline(p.tokens || [{ type: 'text', text: p.text }]),
            spacing: { before: 120, after: 120 },
          })
        );
        break;
      }

      case 'list': {
        const list = token as Tokens.List;
        list.items.forEach((item: any) => {
          // List item content is a sequence of block tokens; first is usually a 'text' token containing inline tokens.
          const inline =
            item.tokens?.[0]?.tokens || [{ type: 'text', text: item.text || '' }];
          context.push(
            new Paragraph({
              children: flattenInline(inline),
              bullet: { level: 0 },
              spacing: { before: 60, after: 60 },
            })
          );
        });
        break;
      }

      case 'blockquote': {
        const bq = token as Tokens.Blockquote;
        // Render contents as italic paragraphs
        const inner: any[] = [];
        processTokens(bq.tokens || [], inner);
        inner.forEach((p) => context.push(p));
        break;
      }

      case 'table': {
        const tableTok = token as Tokens.Table;
        const colCount = tableTok.header.length;
        const rows: TableRow[] = [];

        // Header
        rows.push(
          new TableRow({
            tableHeader: true,
            children: tableTok.header.map((th: any, idx: number) => {
              const runs = flattenInline(th.tokens || [{ type: 'text', text: th.text || '' }]);
              return new TableCell({
                children: [new Paragraph({ children: runs })],
                shading: { fill: 'E2E8F0', type: 'clear' },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                width: { size: getCellWidth(idx, colCount), type: WidthType.PERCENTAGE },
              });
            }),
          })
        );

        // Body
        tableTok.rows.forEach((row: any) => {
          rows.push(
            new TableRow({
              children: row.map((td: any, idx: number) => {
                return new TableCell({
                  children: buildCellParagraphs(td),
                  margins: { top: 100, bottom: 100, left: 100, right: 100 },
                  width: { size: getCellWidth(idx, colCount), type: WidthType.PERCENTAGE },
                });
              }),
            })
          );
        });

        context.push(
          new Table({
            rows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: '718096' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: '718096' },
              left: { style: BorderStyle.SINGLE, size: 1, color: '718096' },
              right: { style: BorderStyle.SINGLE, size: 1, color: '718096' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '718096' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '718096' },
            },
          })
        );
        break;
      }

      case 'code': {
        const c = token as Tokens.Code;
        context.push(
          new Paragraph({
            children: [
              new TextRun({ text: c.text || '', font: 'Courier New', size: SIZE_14PT }),
            ],
            spacing: { before: 80, after: 80 },
          })
        );
        break;
      }

      case 'space':
      case 'hr':
        break;

      default: {
        const anyTok: any = token;
        if (anyTok.raw) {
          context.push(
            new Paragraph({
              children: [new TextRun({ text: anyTok.raw, size: SIZE_14PT, font: FONT })],
            })
          );
        }
      }
    }
  }
};

export const exportToWordA4 = async (
  currentPlan: Partial<LessonPlan>,
  showToast: (msg: string, type?: any) => void
) => {
  if (!currentPlan.content) {
    showToast('Không có nội dung giáo án để xuất', 'warning');
    return;
  }

  showToast('Đang tạo file Word chuẩn A4...', 'info');

  try {
    const tokens = marked.lexer(currentPlan.content);
    const docElements: any[] = [];

    if (currentPlan.title) {
      docElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: currentPlan.title.toUpperCase(),
              bold: true,
              font: FONT,
              size: 32, // 16pt for title
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 240 },
        })
      );
    }

    processTokens(tokens, docElements);

    const doc = new Document({
      creator: 'SmartPlan AI',
      title: currentPlan.title || 'Giao an',
      styles: {
        default: {
          document: {
            run: { size: SIZE_14PT, font: FONT },
            paragraph: { spacing: { line: 360 } }, // 1.5 line spacing
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }, // 2cm margins on A4
            },
          },
          children: docElements,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, `${currentPlan.title || 'giao-an'}_A4.docx`);
    showToast('Đã tải xuống file Word chuẩn A4 thành công!', 'success');
  } catch (err) {
    console.error('Lỗi xuất Word A4:', err);
    const msg = err instanceof Error ? err.message : String(err);
    showToast(`Có lỗi khi tạo file Word A4: ${msg}`, 'error');
  }
};

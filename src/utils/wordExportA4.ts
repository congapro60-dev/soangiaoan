import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, BorderStyle } from 'docx';
import { marked, Token } from 'marked';
import { LessonPlan } from '../types';
import { downloadBlob } from './fileUtils';

export const exportToWordA4 = async (currentPlan: Partial<LessonPlan>, showToast: (msg: string, type?: any) => void) => {
  if (!currentPlan.content) return;
  
  showToast('Đang tạo file Word chuẩn A4...', 'info');

  try {
    const tokens = marked.lexer(currentPlan.content);
    const docElements: any[] = [];

    // Lấy tên tiêu đề nếu có
    if (currentPlan.title) {
        docElements.push(new Paragraph({
            text: currentPlan.title.toUpperCase(),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 240 },
            alignment: "center"
        }));
    }

    const processInlineTokens = (inlineTokens: any[]): TextRun[] => {
      if (!inlineTokens) return [];
      const runs: TextRun[] = [];
      inlineTokens.forEach(t => {
        if (t.type === 'strong') {
          runs.push(new TextRun({ text: t.text, bold: true, size: 28, font: "Times New Roman" })); // 28 = 14pt
        } else if (t.type === 'em') {
          runs.push(new TextRun({ text: t.text, italics: true, size: 28, font: "Times New Roman" }));
        } else if (t.type === 'text' || t.type === 'escape') {
          runs.push(new TextRun({ text: t.text || t.raw, size: 28, font: "Times New Roman" }));
        } else if (t.type === 'codespan') {
           runs.push(new TextRun({ text: t.text, font: "Courier New", size: 28, bold: true }));
        } else {
           runs.push(new TextRun({ text: t.raw || '', size: 28, font: "Times New Roman" }));
        }
      });
      return runs;
    };

    const processTokens = (tokens: Token[], context: any[]) => {
      tokens.forEach(token => {
        switch (token.type) {
          case 'heading':
            let headingLevel = HeadingLevel.HEADING_2;
            if (token.depth === 1) headingLevel = HeadingLevel.HEADING_1;
            if (token.depth === 3) headingLevel = HeadingLevel.HEADING_3;
            if (token.depth === 4) headingLevel = HeadingLevel.HEADING_4;
            
            context.push(new Paragraph({
              children: processInlineTokens((token as any).tokens || [{ type: 'text', text: token.text }]),
              heading: headingLevel,
              spacing: { before: 200, after: 120 }
            }));
            break;
            
          case 'paragraph':
            context.push(new Paragraph({
              children: processInlineTokens((token as any).tokens || [{ type: 'text', text: token.text }]),
              spacing: { before: 120, after: 120 }
            }));
            break;
            
          case 'list':
            (token as any).items.forEach((item: any) => {
               context.push(new Paragraph({
                  children: processInlineTokens(item.tokens?.[0]?.tokens || [{ type: 'text', text: item.text }]),
                  bullet: { level: 0 },
                  spacing: { before: 60, after: 60 }
               }));
            });
            break;
            
          case 'table':
             const tableRows: TableRow[] = [];
             const theader = token as marked.Tokens.Table;
             
             // Header row
             const headerCells = theader.header.map((th: any, idx: number) => {
                 let widthSize = 33;
                 if (theader.header.length === 3) {
                     if (idx === 0) widthSize = 30; // GV
                     else if (idx === 1) widthSize = 30; // HS
                     else widthSize = 40; // Ghi bang
                 }
                 return new TableCell({
                     children: [new Paragraph({ children: processInlineTokens(th.tokens || [{ type: 'text', text: th.text }]) })],
                     shading: { fill: "E2E8F0", type: "clear" },
                     margins: { top: 100, bottom: 100, left: 100, right: 100 },
                     width: { size: widthSize, type: WidthType.PERCENTAGE }
                 });
             });
             tableRows.push(new TableRow({ children: headerCells, tableHeader: true }));
             
             // Body rows
             theader.rows.forEach((row: any) => {
                 const rowCells = row.map((td: any, idx: number) => {
                     let widthSize = 33;
                     if (theader.header.length === 3) {
                         if (idx === 0) widthSize = 30;
                         else if (idx === 1) widthSize = 30;
                         else widthSize = 40;
                     }

                     const cellParagraphs: Paragraph[] = [];
                     const textContent = td.text || "";
                     
                     // Bẻ dòng thủ công cho thẻ <br/> trong markdown
                     const lines = textContent.split(/<br\s*\/?>/ig);
                     lines.forEach((line: string) => {
                        if (line.trim()) {
                           cellParagraphs.push(new Paragraph({
                               children: [new TextRun({ text: line.trim().replace(/\\|/g, '|').replace(/\\\\/g, '\\'), size: 28, font: "Times New Roman" })]
                           }));
                        }
                     });
                     
                     if (cellParagraphs.length === 0) {
                         cellParagraphs.push(new Paragraph({ children: [] }));
                     }
                     
                     return new TableCell({
                         children: cellParagraphs,
                         margins: { top: 100, bottom: 100, left: 100, right: 100 },
                         width: { size: widthSize, type: WidthType.PERCENTAGE }
                     });
                 });
                 tableRows.push(new TableRow({ children: rowCells }));
             });
             
             context.push(new Table({
                 rows: tableRows,
                 width: { size: 100, type: WidthType.PERCENTAGE },
                 borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: "718096" },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "718096" },
                    left: { style: BorderStyle.SINGLE, size: 1, color: "718096" },
                    right: { style: BorderStyle.SINGLE, size: 1, color: "718096" },
                    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "718096" },
                    insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "718096" }
                 }
             }));
             break;
             
          case 'space':
          case 'hr':
             break;
          default:
             if (token.raw) {
                context.push(new Paragraph({
                  children: [new TextRun({ text: token.raw, size: 28, font: "Times New Roman" })]
                }));
             }
        }
      });
    };

    processTokens(tokens, docElements);

    const doc = new Document({
      creator: "SmartPlan AI",
      title: currentPlan.title || "Giao an",
      styles: {
          default: {
              document: {
                  run: { size: 28, font: "Times New Roman" },
                  paragraph: { spacing: { line: 360 } } // 1.5 line spacing
              }
          }
      },
      sections: [{
        properties: {
          page: {
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } // 2cm = ~1134 twips (A4)
          }
        },
        children: docElements
      }]
    });

    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, `${currentPlan.title || 'giao-an'}_A4.docx`);
    showToast('Đã tải xuống file Word chuẩn A4 thành công!', 'success');
  } catch (err) {
    console.error("Lỗi xuất Word A4:", err);
    showToast('Có lỗi xảy ra khi tạo file Word A4', 'error');
  }
};

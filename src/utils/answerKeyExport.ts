import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  PageOrientation,
  ShadingType,
} from 'docx';
import { ExamQuestion } from '../types';
import { downloadBlob } from './fileUtils';

const FONT = 'Times New Roman';
const PT14 = 28; // half-points
const PT16 = 32;
const PT12 = 24;

export interface AnswerKeyOptions {
  title: string;
  subject?: string;
  schoolName: string;
  filename: string;
}

const borderSet = {
  top:              { style: BorderStyle.SINGLE, size: 1, color: '555555' },
  bottom:           { style: BorderStyle.SINGLE, size: 1, color: '555555' },
  left:             { style: BorderStyle.SINGLE, size: 1, color: '555555' },
  right:            { style: BorderStyle.SINGLE, size: 1, color: '555555' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '555555' },
  insideVertical:   { style: BorderStyle.SINGLE, size: 1, color: '555555' },
};

const cell = (text: string, bold = false, shaded = false, pct = 25): TableCell =>
  new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, font: FONT, size: PT12 })],
        alignment: AlignmentType.CENTER,
      }),
    ],
    shading: shaded ? { type: ShadingType.SOLID, fill: 'D9E1F2' } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    width: { size: pct, type: WidthType.PERCENTAGE },
  });

// Build MCQ answer table: 2-column layout
const buildMcqTable = (questions: ExamQuestion[]): Table => {
  const headers = new TableRow({
    tableHeader: true,
    children: [
      cell('Câu', true, true, 12),
      cell('Đáp án', true, true, 13),
      cell('Câu', true, true, 12),
      cell('Đáp án', true, true, 13),
    ],
  });

  const rows: TableRow[] = [headers];
  for (let i = 0; i < questions.length; i += 2) {
    const q1 = questions[i];
    const q2 = questions[i + 1];
    rows.push(
      new TableRow({
        children: [
          cell(String(i + 1), false, false, 12),
          cell(q1.correctAnswer || '___', true, false, 13),
          cell(q2 ? String(i + 2) : '', false, false, 12),
          cell(q2 ? (q2.correctAnswer || '___') : '', true, false, 13),
        ],
      })
    );
  }

  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: borderSet });
};

// Build True/False answer table: Câu | a | b | c | d
const buildTrueFalseTable = (questions: ExamQuestion[]): Table => {
  const headers = new TableRow({
    tableHeader: true,
    children: [
      cell('Câu', true, true, 20),
      cell('a', true, true, 20),
      cell('b', true, true, 20),
      cell('c', true, true, 20),
      cell('d', true, true, 20),
    ],
  });

  const rows: TableRow[] = [headers];
  questions.forEach((q, i) => {
    const parts = (q.correctAnswer || '').split(',').map(s => s.trim());
    rows.push(
      new TableRow({
        children: [
          cell(String(i + 1), false, false, 20),
          cell(parts[0] || '___', true, false, 20),
          cell(parts[1] || '___', true, false, 20),
          cell(parts[2] || '___', true, false, 20),
          cell(parts[3] || '___', true, false, 20),
        ],
      })
    );
  });

  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: borderSet });
};

// Build Short Answer table: Câu | Đáp án | Điểm
const buildShortAnswerTable = (questions: ExamQuestion[]): Table => {
  const headers = new TableRow({
    tableHeader: true,
    children: [
      cell('Câu', true, true, 15),
      cell('Đáp án', true, true, 60),
      cell('Điểm', true, true, 25),
    ],
  });

  const rows: TableRow[] = [headers];
  questions.forEach((q, i) => {
    rows.push(
      new TableRow({
        children: [
          cell(String(i + 1), false, false, 15),
          cell(q.correctAnswer || '___', true, false, 60),
          cell(String(q.points), false, false, 25),
        ],
      })
    );
  });

  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: borderSet });
};

const heading = (text: string): Paragraph =>
  new Paragraph({
    children: [new TextRun({ text, bold: true, font: FONT, size: PT14 })],
    spacing: { before: 240, after: 120 },
  });

const spacer = (): Paragraph =>
  new Paragraph({ children: [], spacing: { before: 80, after: 80 } });

export const exportAnswerKeyWord = async (
  questions: ExamQuestion[],
  options: AnswerKeyOptions
): Promise<void> => {
  const { title, subject, schoolName, filename } = options;

  const mcqs  = questions.filter(q => q.type === 'multiple_choice');
  const tfqs  = questions.filter(q => q.type === 'true_false');
  const saqs  = questions.filter(q => q.type === 'short_answer');
  const essays = questions.filter(q => q.type === 'essay');

  const children: any[] = [];

  // Title
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM', bold: true, font: FONT, size: PT16 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
    })
  );

  // Subtitle
  if (title) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: title, font: FONT, size: PT14 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
      })
    );
  }
  if (subject || schoolName) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: [schoolName, subject ? `Môn: ${subject}` : ''].filter(Boolean).join(' — '),
            font: FONT,
            size: PT12,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 120 },
      })
    );
  }

  // Separator
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '─'.repeat(60), font: FONT, size: PT12 })],
      spacing: { before: 120, after: 120 },
    })
  );

  // Phần I — MCQ
  if (mcqs.length > 0) {
    children.push(heading(`PHẦN I. TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN (${mcqs.length} câu)`));
    children.push(buildMcqTable(mcqs));
    children.push(spacer());
  }

  // Phần II — True/False
  if (tfqs.length > 0) {
    children.push(heading(`PHẦN II. TRẮC NGHIỆM ĐÚNG SAI (${tfqs.length} câu)`));
    children.push(buildTrueFalseTable(tfqs));
    children.push(spacer());
  }

  // Phần III — Short Answer
  if (saqs.length > 0) {
    children.push(heading(`PHẦN III. TRẢ LỜI NGẮN (${saqs.length} câu)`));
    children.push(buildShortAnswerTable(saqs));
    children.push(spacer());
  }

  // Phần IV — Essay
  if (essays.length > 0) {
    children.push(heading('PHẦN IV. TỰ LUẬN'));
    essays.forEach((q, i) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Câu ${i + 1} (${q.points} điểm): `, bold: true, font: FONT, size: PT14 }),
            new TextRun({ text: q.content.slice(0, 80) + (q.content.length > 80 ? '...' : ''), font: FONT, size: PT12 }),
          ],
          spacing: { before: 120, after: 80 },
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Lời giải / Hướng dẫn chấm:', italics: true, font: FONT, size: PT12 })],
          spacing: { before: 40, after: 40 },
        })
      );
      // Empty box for teacher notes — 4 blank lines
      for (let j = 0; j < 4; j++) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: '', font: FONT, size: PT14 })],
            border: j === 3 ? { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' } } : undefined,
            spacing: { before: 0, after: 0 },
          })
        );
      }
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Thang điểm: ', bold: true, font: FONT, size: PT12 }),
            new TextRun({ text: `${q.points} điểm`, font: FONT, size: PT12 }),
          ],
          spacing: { before: 80, after: 120 },
        })
      );
    });
  }

  const doc = new Document({
    creator: 'SmartPlan AI',
    title: 'Đáp án và Hướng dẫn chấm',
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
            margin: { top: 1134, right: 1021, bottom: 1134, left: 1701 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, filename);
};
